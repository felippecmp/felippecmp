"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ACTIVITY_TYPES = ["walking", "running", "cycling", "other"] as const;
export type CardioType = (typeof ACTIVITY_TYPES)[number];

function int(
  raw: FormDataEntryValue | null,
  fallback: number | null = null
): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function num(
  raw: FormDataEntryValue | null,
  fallback: number | null = null
): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function datetime(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  // HTML datetime-local gives "YYYY-MM-DDTHH:MM" without timezone. Interpret
  // as local and convert to ISO.
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function revalidateCardioSurfaces() {
  revalidatePath("/");
  revalidatePath("/cardio");
  revalidatePath("/progresso");
}

function parseMinutesInput(raw: FormDataEntryValue | null): number | null {
  // Accept either "45" (minutes) or "1:05" (hh:mm). Returns seconds.
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const mins = parseInt(colonMatch[2], 10);
    if (Number.isFinite(hours) && Number.isFinite(mins) && mins < 60) {
      return hours * 3600 + mins * 60;
    }
  }
  const asMinutes = Number(trimmed);
  if (Number.isFinite(asMinutes) && asMinutes > 0) {
    return Math.round(asMinutes * 60);
  }
  return null;
}

export async function createCardioSession(
  formData: FormData
): Promise<ActionResult> {
  const rawType = String(formData.get("activity_type") ?? "walking");
  const activityType: CardioType = ACTIVITY_TYPES.includes(
    rawType as CardioType
  )
    ? (rawType as CardioType)
    : "walking";

  const durationSeconds = parseMinutesInput(formData.get("duration_minutes"));
  if (durationSeconds === null || durationSeconds <= 0) {
    return { ok: false, error: "Duração inválida (use minutos, ex: 35)." };
  }

  const startedAt = datetime(formData.get("started_at")) ?? new Date().toISOString();
  const distanceKm = num(formData.get("distance_km"));
  const avgHr = int(formData.get("avg_heart_rate"));
  const maxHr = int(formData.get("max_heart_rate"));
  const calories = int(formData.get("calories"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("cardio_sessions").insert({
    activity_type: activityType,
    started_at: startedAt,
    duration_seconds: durationSeconds,
    distance_km: distanceKm,
    avg_heart_rate: avgHr,
    max_heart_rate: maxHr,
    calories,
    notes,
    device_source: "manual",
  });

  if (error) return { ok: false, error: error.message };
  revalidateCardioSurfaces();
  return { ok: true };
}

export async function updateCardioSession(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const rawType = String(formData.get("activity_type") ?? "walking");
  const activityType: CardioType = ACTIVITY_TYPES.includes(
    rawType as CardioType
  )
    ? (rawType as CardioType)
    : "walking";

  const durationSeconds = parseMinutesInput(formData.get("duration_minutes"));
  if (durationSeconds === null || durationSeconds <= 0) {
    return { ok: false, error: "Duração inválida." };
  }

  const startedAt = datetime(formData.get("started_at"));
  const distanceKm = num(formData.get("distance_km"));
  const avgHr = int(formData.get("avg_heart_rate"));
  const maxHr = int(formData.get("max_heart_rate"));
  const calories = int(formData.get("calories"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  const supabase = await createClient();
  const payload: Record<string, unknown> = {
    activity_type: activityType,
    duration_seconds: durationSeconds,
    distance_km: distanceKm,
    avg_heart_rate: avgHr,
    max_heart_rate: maxHr,
    calories,
    notes,
  };
  if (startedAt) payload.started_at = startedAt;

  const { error } = await supabase
    .from("cardio_sessions")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateCardioSurfaces();
  revalidatePath(`/cardio/${id}`);
  return { ok: true };
}

export async function deleteCardioSession(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("cardio_sessions").delete().eq("id", id);
  revalidateCardioSurfaces();
  redirect("/cardio");
}
