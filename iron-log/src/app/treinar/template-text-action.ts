"use server";

import { createClient } from "@/lib/supabase/server";
import { renderTemplateText } from "@/lib/template-text";

export type TemplateTextResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Build the textual export of a template — exercise name + machine +
 * NxRx__kg per slot. Pulls the user's most-recent weight per exercise
 * to pre-fill the placeholder so the user only has to ADJUST during
 * the workout, not re-type from scratch.
 *
 * Pre-workout flow:
 *   /treinar → tap "Copiar como texto" → text on clipboard → paste
 *   into Notes → fill numbers during set → paste back into the import
 *   flow (PR 4) when done.
 */
export async function getTemplateText(
  templateId: string
): Promise<TemplateTextResult> {
  const supabase = await createClient();

  const { data: template, error: tErr } = await supabase
    .from("workout_templates")
    .select("id, name")
    .eq("id", templateId)
    .maybeSingle();

  if (tErr) return { ok: false, error: tErr.message };
  if (!template) return { ok: false, error: "Template não encontrado." };

  const { data: slots, error: sErr } = await supabase
    .from("template_exercises")
    .select(
      "slot_order, target_sets, rep_range_high, machine, exercise_id, exercises(name)"
    )
    .eq("template_id", templateId)
    .order("slot_order", { ascending: true });

  if (sErr) return { ok: false, error: sErr.message };

  type SlotRow = {
    slot_order: number;
    target_sets: number;
    rep_range_high: number;
    machine: string | null;
    exercise_id: string | null;
    exercises:
      | { name: string }
      | { name: string }[]
      | null;
  };
  const rows = (slots ?? []) as SlotRow[];

  // Pull the most-recent weight per exercise from completed sessions so
  // the placeholder is pre-filled. We fetch in a single query and bucket
  // client-side — keeps the round trip count down.
  const exIds = rows
    .map((r) => r.exercise_id)
    .filter((v): v is string => v !== null);
  const lastByExercise = new Map<string, number>();
  if (exIds.length > 0) {
    const { data: lastSets } = await supabase
      .from("workout_sets")
      .select("exercise_id, weight_kg, performed_at")
      .in("exercise_id", exIds)
      .eq("is_warmup", false)
      .order("performed_at", { ascending: false })
      .limit(500);
    for (const s of (lastSets ?? []) as Array<{
      exercise_id: string | null;
      weight_kg: number | string;
    }>) {
      if (!s.exercise_id) continue;
      if (!lastByExercise.has(s.exercise_id)) {
        lastByExercise.set(s.exercise_id, Number(s.weight_kg));
      }
    }
  }

  const text = renderTemplateText({
    templateName: template.name as string,
    date: new Date(),
    slots: rows.map((r) => {
      const ex = Array.isArray(r.exercises) ? r.exercises[0] : r.exercises;
      return {
        exerciseName: ex?.name ?? "?",
        machine: r.machine,
        targetSets: r.target_sets,
        targetReps: r.rep_range_high,
        lastWeightKg: r.exercise_id
          ? lastByExercise.get(r.exercise_id) ?? null
          : null,
      };
    }),
  });

  return { ok: true, text };
}
