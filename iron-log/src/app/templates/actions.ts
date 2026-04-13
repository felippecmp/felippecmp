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

/**
 * Duplicates an existing template: creates a new workout_templates row
 * with "Cópia de X" as the default name, then bulk-inserts the source
 * template's template_exercises under the new id, preserving slot order
 * and all per-slot config (target_sets, rep_range_low/high, rest_seconds).
 *
 * Redirects to the new template's editor on success so the user can
 * immediately rename it and tweak which exercises to swap.
 */
/**
 * Swap the global sort_order of two templates. Used by the reorder arrows
 * on /templates to let the user define the rotation sequence for linear mode.
 */
export async function reorderTemplate(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: all, error: fetchErr } = await supabase
    .from("workout_templates")
    .select("id, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (fetchErr || !all) return { ok: false, error: fetchErr?.message ?? "Erro" };

  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return { ok: false, error: "Não encontrado" };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return { ok: true };

  const a = all[idx];
  const b = all[swapIdx];

  await supabase
    .from("workout_templates")
    .update({ sort_order: -1 })
    .eq("id", a.id);
  await supabase
    .from("workout_templates")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);
  await supabase
    .from("workout_templates")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);

  revalidatePath("/templates");
  revalidatePath("/treinar");
  return { ok: true };
}

export async function duplicateTemplate(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: source, error: sourceErr } = await supabase
    .from("workout_templates")
    .select("id, name, session_type, sort_order")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (sourceErr) return { ok: false, error: sourceErr.message };
  if (!source) return { ok: false, error: "Template não encontrado." };

  const { data: sourceExercises, error: teErr } = await supabase
    .from("template_exercises")
    .select(
      "exercise_id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds"
    )
    .eq("template_id", id)
    .order("slot_order", { ascending: true });

  if (teErr) return { ok: false, error: teErr.message };

  const { data: newTemplate, error: insertErr } = await supabase
    .from("workout_templates")
    .insert({
      name: `Cópia de ${source.name}`,
      session_type: source.session_type,
      sort_order: (source.sort_order ?? 0) + 1,
      is_active: true,
    })
    .select("id")
    .single();

  if (insertErr) return { ok: false, error: insertErr.message };

  if (sourceExercises && sourceExercises.length > 0) {
    const { error: copyErr } = await supabase.from("template_exercises").insert(
      sourceExercises.map((te) => ({
        template_id: newTemplate.id,
        exercise_id: te.exercise_id,
        slot_order: te.slot_order,
        target_sets: te.target_sets,
        rep_range_low: te.rep_range_low,
        rep_range_high: te.rep_range_high,
        rest_seconds: te.rest_seconds,
      }))
    );
    if (copyErr) {
      // Best effort: leave the empty new template in place and surface the
      // error so the user knows the exercises didn't copy.
      return { ok: false, error: copyErr.message };
    }
  }

  revalidatePath("/templates");
  revalidatePath("/treinar");
  redirect(`/templates/${newTemplate.id}`);
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

export async function restoreTemplate(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_templates")
    .update({ is_active: true })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/templates");
  revalidatePath("/treinar");
  return { ok: true };
}

export async function deleteTemplatePermanently(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Delete template exercises first (FK constraint)
  await supabase
    .from("template_exercises")
    .delete()
    .eq("template_id", id);

  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/templates");
  return { ok: true };
}

export type CreateExerciseInput = {
  name: string;
  sessionType: "upper" | "lower";
  movementPattern: string;
  primaryMuscle: string;
  equipment: string | null;
  loadIncrement: number;
};

/**
 * Create a brand-new exercise AND immediately add it to the given template,
 * in a single round-trip from the template editor's picker. Avoids the
 * "leave, create in /exercicios/novo, come back" detour.
 */
export async function createExerciseFromTemplate(
  templateId: string,
  input: CreateExerciseInput
): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nome é obrigatório." };
  if (input.sessionType !== "upper" && input.sessionType !== "lower") {
    return { ok: false, error: "Tipo de sessão inválido." };
  }
  if (!input.movementPattern) {
    return { ok: false, error: "Padrão de movimento obrigatório." };
  }
  if (!input.primaryMuscle) {
    return { ok: false, error: "Músculo primário obrigatório." };
  }
  const loadIncrement =
    Number.isFinite(input.loadIncrement) && input.loadIncrement > 0
      ? input.loadIncrement
      : 2.5;

  const supabase = await createClient();
  const settings = await getUserSettings();

  const { data: created, error: exErr } = await supabase
    .from("exercises")
    .insert({
      name,
      session_type: input.sessionType,
      movement_pattern: input.movementPattern,
      primary_muscle: input.primaryMuscle,
      equipment: input.equipment,
      load_increment: loadIncrement,
      is_active: true,
    })
    .select("id")
    .single();

  if (exErr) return { ok: false, error: exErr.message };

  const { data: existingSlot } = await supabase
    .from("template_exercises")
    .select("slot_order")
    .eq("template_id", templateId)
    .order("slot_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSlot = (existingSlot?.slot_order ?? -1) + 1;

  const { error: teErr } = await supabase.from("template_exercises").insert({
    template_id: templateId,
    exercise_id: created.id,
    slot_order: nextSlot,
    target_sets: settings.default_target_sets,
    rep_range_low: settings.default_rep_range_low,
    rep_range_high: settings.default_rep_range_high,
    rest_seconds: settings.default_rest_seconds,
  });

  if (teErr) return { ok: false, error: teErr.message };

  revalidatePath(`/templates/${templateId}`);
  revalidatePath("/templates");
  revalidatePath("/exercicios");
  revalidatePath("/treinar");
  return { ok: true };
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
