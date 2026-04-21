"use server";

import { revalidatePath } from "next/cache";
import {
  createServiceClient,
  PROGRESS_PHOTOS_BUCKET,
} from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { userDayKey } from "@/lib/timezone";

export type UploadPhotoResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Upload a pre-resized photo (client hands us a ~200KB JPEG/WebP blob)
 * to the private progress-photos bucket and insert the DB row.
 * storage_path is `photos/YYYY-MM-DD/<uuid>.<ext>` so browsing the
 * bucket by-hand reveals the chronology.
 */
export async function uploadPhoto(formData: FormData): Promise<UploadPhotoResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Nenhum arquivo enviado." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Arquivo maior que 5MB — reduza a qualidade." };
  }

  const photoDate = String(formData.get("photo_date") ?? userDayKey());
  const weightRaw = formData.get("weight_kg");
  const weight = weightRaw ? Number(weightRaw) : null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const cropTop = Number(formData.get("crop_top") ?? 0);
  const cropBottom = Number(formData.get("crop_bottom") ?? 1);
  const cropLeft = Number(formData.get("crop_left") ?? 0);
  const cropRight = Number(formData.get("crop_right") ?? 1);
  const origWidthRaw = formData.get("orig_width");
  const origHeightRaw = formData.get("orig_height");
  const origWidth = origWidthRaw ? Math.round(Number(origWidthRaw)) : null;
  const origHeight = origHeightRaw ? Math.round(Number(origHeightRaw)) : null;

  const ext =
    file.type === "image/webp"
      ? "webp"
      : file.type === "image/png"
        ? "png"
        : "jpg";
  const key = crypto.randomUUID();
  const storagePath = `photos/${photoDate}/${key}.${ext}`;

  const svc = createServiceClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await svc.storage
    .from(PROGRESS_PHOTOS_BUCKET)
    .upload(storagePath, buf, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    return { ok: false, error: `Storage: ${upErr.message}` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_photos")
    .insert({
      photo_date: photoDate,
      storage_path: storagePath,
      weight_kg: weight,
      note,
      crop_top: Math.max(0, Math.min(1, cropTop)),
      crop_bottom: Math.max(0, Math.min(1, cropBottom)),
      crop_left: Math.max(0, Math.min(1, cropLeft)),
      crop_right: Math.max(0, Math.min(1, cropRight)),
      orig_width: origWidth,
      orig_height: origHeight,
    })
    .select("id")
    .single();

  if (error || !data) {
    // Roll back the storage upload so we don't leak orphan blobs.
    await svc.storage.from(PROGRESS_PHOTOS_BUCKET).remove([storagePath]);
    return { ok: false, error: error?.message ?? "Falha ao gravar." };
  }

  revalidatePath("/fotos");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

export type PhotoListItem = {
  id: string;
  photoDate: string;
  signedUrl: string;
  weightKg: number | null;
  note: string | null;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  /** Original image dimensions at upload time (after client resize).
      Used to compute the real crop aspect so the display scales
      uniformly instead of distorting. Null on legacy rows. */
  origWidth: number | null;
  origHeight: number | null;
  createdAt: string;
};

/**
 * List all progress photos, newest first, with a fresh 1h signed URL
 * per photo. Signed URLs expire; this action is called on every page
 * load by /fotos so the URLs stay valid.
 */
export async function listPhotos(): Promise<PhotoListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("progress_photos")
    .select(
      "id, photo_date, storage_path, weight_kg, note, crop_top, crop_bottom, crop_left, crop_right, orig_width, orig_height, created_at"
    )
    .order("photo_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const svc = createServiceClient();
  const paths = data.map((r) => r.storage_path as string);
  const { data: urls } = await svc.storage
    .from(PROGRESS_PHOTOS_BUCKET)
    .createSignedUrls(paths, 60 * 60);

  return data.map((r, i) => ({
    id: r.id as string,
    photoDate: r.photo_date as string,
    signedUrl: urls?.[i]?.signedUrl ?? "",
    weightKg: r.weight_kg !== null ? Number(r.weight_kg) : null,
    note: (r.note as string | null) ?? null,
    cropTop: Number(r.crop_top ?? 0),
    cropBottom: Number(r.crop_bottom ?? 1),
    cropLeft: Number(r.crop_left ?? 0),
    cropRight: Number(r.crop_right ?? 1),
    origWidth: r.orig_width !== null ? Number(r.orig_width) : null,
    origHeight: r.orig_height !== null ? Number(r.orig_height) : null,
    createdAt: r.created_at as string,
  }));
}

export type UpdatePhotoInput = {
  id: string;
  weightKg?: number | null;
  note?: string | null;
  cropTop?: number;
  cropBottom?: number;
  cropLeft?: number;
  cropRight?: number;
  photoDate?: string;
};

export async function updatePhoto(
  input: UpdatePhotoInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.weightKg !== undefined) patch.weight_kg = input.weightKg;
  if (input.note !== undefined) patch.note = input.note;
  if (input.cropTop !== undefined)
    patch.crop_top = Math.max(0, Math.min(1, input.cropTop));
  if (input.cropBottom !== undefined)
    patch.crop_bottom = Math.max(0, Math.min(1, input.cropBottom));
  if (input.cropLeft !== undefined)
    patch.crop_left = Math.max(0, Math.min(1, input.cropLeft));
  if (input.cropRight !== undefined)
    patch.crop_right = Math.max(0, Math.min(1, input.cropRight));
  if (input.photoDate !== undefined) patch.photo_date = input.photoDate;

  const { error } = await supabase
    .from("progress_photos")
    .update(patch)
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/fotos");
  revalidatePath("/");
  return { ok: true };
}

export async function deletePhoto(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: row, error: fetchErr } = await supabase
    .from("progress_photos")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (fetchErr || !row) {
    return { ok: false, error: fetchErr?.message ?? "Foto não encontrada." };
  }

  const svc = createServiceClient();
  await svc.storage
    .from(PROGRESS_PHOTOS_BUCKET)
    .remove([row.storage_path as string]);

  const { error } = await supabase.from("progress_photos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/fotos");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Has the user taken a progress photo today? Used by the TodayChecklist
 * goal chip on Home. Returns a lightweight bool so the home query stays
 * cheap — no storage round-trips, no signed URL generation.
 */
export async function hasPhotoToday(): Promise<boolean> {
  const supabase = await createClient();
  const today = userDayKey();
  const { data } = await supabase
    .from("progress_photos")
    .select("id")
    .eq("photo_date", today)
    .limit(1)
    .maybeSingle();
  return !!data;
}
