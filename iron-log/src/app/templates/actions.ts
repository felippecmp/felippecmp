"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/settings";

export type ActionResult = { ok: true } | { ok: false; error: string };

function str(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function int(v: FormDataEntryValue | null, fallback: number): number {
  if (typeof v !== "string") return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function createTemplate(formData: FormData): Promise<ActionResult> {
  const name = str(formData.get("name"));
  const session_type = str(formData.get("session_type"));

  if (!name) return { ok: false, error: "Informe o nome." };
  if (session_type !== "upper" && session_type !== "lower") {
    return { ok: false, error: "Tipo inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .insert({ name, session_type, is_active: true, sort_order: 0 })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/templates");
  revalidatePath("/treinar");
  redirect(`/templates/${data.id}`);
}

export async function updateTemplate(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const name = str(formData.get("name"));
  if (!name) return { ok: false, error: "Informe o nome." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_templates")
    .update({ name })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  revalidatePath("/treinar");
  return { ok: true };
}

export async function archiveTemplate(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_templates")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/templates");
  revalidatePath("/treinar");
  redirect("/templates");
}

export async function addExerciseToTemplate(
  templateId: string,
  exerciseId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const settings = await getUserSettings();

  const { data: existing } = await supabase
    .from("template_exercises")
    .select("slot_order")
    .eq("template_id", templateId)
    .order("slot_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSlot = (existing?.slot_order ?? -1) + 1;

  const { error } = await supabase.from("template_exercises").insert({
    template_id: templateId,
    exercise_id: exerciseId,
    slot_order: nextSlot,
    target_sets: settings.default_target_sets,
    rep_range_low: settings.default_rep_range_low,
    rep_range_high: settings.default_rep_range_high,
    rest_seconds: settings.default_rest_seconds,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/templates/${templateId}`);
  revalidatePath("/treinar");
  return { ok: true };
}

export async function updateTemplateExercise(
  id: string,
  templateId: string,
  formData: FormData
): Promise<ActionResult> {
  const target_sets = Math.max(1, int(formData.get("target_sets"), 2));
  const rep_range_low = Math.max(1, int(formData.get("rep_range_low"), 4));
  const rep_range_high = Math.max(
    rep_range_low,
    int(formData.get("rep_range_high"), 8)
  );
  const rest_seconds = Math.max(0, int(formData.get("rest_seconds"), 180));

  const supabase = await createClient();
  const { error } = await supabase
    .from("template_exercises")
    .update({ target_sets, rep_range_low, rep_range_high, rest_seconds })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/templates/${templateId}`);
  return { ok: true };
}

export async function removeTemplateExercise(
  id: string,
  templateId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("template_exercises").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/templates/${templateId}`);
  revalidatePath("/treinar");
  return { ok: true };
}

export async function reorderTemplateExercise(
  id: string,
  templateId: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: all, error: fetchErr } = await supabase
    .from("template_exercises")
    .select("id, slot_order")
    .eq("template_id", templateId)
    .order("slot_order", { ascending: true });

  if (fetchErr || !all) return { ok: false, error: fetchErr?.message ?? "Erro" };

  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return { ok: false, error: "Não encontrado" };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return { ok: true };

  const a = all[idx];
  const b = all[swapIdx];

  // Swap via temporary negative to avoid unique constraint collisions if any
  await supabase
    .from("template_exercises")
    .update({ slot_order: -1 })
    .eq("id", a.id);
  await supabase
    .from("template_exercises")
    .update({ slot_order: a.slot_order })
    .eq("id", b.id);
  await supabase
    .from("template_exercises")
    .update({ slot_order: b.slot_order })
    .eq("id", a.id);

  revalidatePath(`/templates/${templateId}`);
  return { ok: true };
}
