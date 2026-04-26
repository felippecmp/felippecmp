"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  parseTextualWorkout,
  type ParseResult,
} from "@/lib/template-text-parser";

export type PreviewResult =
  | { ok: true; preview: ParsePreview }
  | { ok: false; error: string };

export type ParsePreview = {
  templateNameHint: string | null;
  templateMatch: { id: string; name: string } | null;
  exercises: PreviewExercise[];
};

export type PreviewExercise = {
  exerciseName: string;
  /** When set, matched to an existing row by case-insensitive name. */
  exerciseId: string | null;
  /** True when a new exercises row will be created on commit. */
  willCreate: boolean;
  machine: string | null;
  sets: Array<{ reps: number; weightKg: number }>;
  warnings: string[];
};

/**
 * Parse the pasted text and resolve each exercise/template against
 * the catalog so the preview can show "X new" badges and the user
 * can review before committing.
 */
export async function previewPaste(text: string): Promise<PreviewResult> {
  if (!text || text.trim().length === 0) {
    return { ok: false, error: "Cole o treino primeiro." };
  }

  const parsed: ParseResult = parseTextualWorkout(text);
  if (parsed.exercises.length === 0) {
    return { ok: false, error: "Nenhum exercício encontrado no texto." };
  }

  const supabase = await createClient();

  // Template match by name. Case-insensitive — Supabase ilike with
  // exact match (no wildcards).
  let templateMatch: { id: string; name: string } | null = null;
  if (parsed.templateNameHint) {
    const { data: tpl } = await supabase
      .from("workout_templates")
      .select("id, name")
      .ilike("name", parsed.templateNameHint)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (tpl) {
      templateMatch = { id: tpl.id as string, name: tpl.name as string };
    }
  }

  // Resolve all exercises in one round-trip. ilike with name list.
  const names = parsed.exercises.map((e) => e.exerciseName);
  const { data: existing } = await supabase
    .from("exercises")
    .select("id, name")
    .in("name", names);

  const byNameLower = new Map<string, { id: string; name: string }>();
  for (const ex of (existing ?? []) as Array<{ id: string; name: string }>) {
    byNameLower.set(ex.name.toLowerCase(), { id: ex.id, name: ex.name });
  }

  const exercises: PreviewExercise[] = parsed.exercises.map((e) => {
    const match = byNameLower.get(e.exerciseName.toLowerCase());
    return {
      exerciseName: e.exerciseName,
      exerciseId: match?.id ?? null,
      willCreate: match === undefined,
      machine: e.machine,
      sets: e.sets,
      warnings: e.warnings,
    };
  });

  return {
    ok: true,
    preview: {
      templateNameHint: parsed.templateNameHint,
      templateMatch,
      exercises,
    },
  };
}

export type CommitResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string };

/**
 * Commit the previewed paste:
 *   1. Create new exercises for any rows that didn't match the catalog.
 *   2. Create a workout_session (linked to the matched template if any).
 *   3. Insert all sets with machine annotations preserved.
 *
 * Treated as one logical operation per call but we can't wrap in a
 * single transaction via supabase-js; failures partway through leave
 * a partial session. Acceptable trade-off — the user can edit / abandon
 * from the workout page.
 */
export async function commitPaste(
  preview: ParsePreview
): Promise<CommitResult> {
  const supabase = await createClient();

  // Step 1: create exercises that don't exist yet. Default values:
  // session_type = "upper" (placeholder; user can recategorize), default
  // primary_muscle = "chest". The user almost always re-edits these
  // afterwards if they care.
  const toCreate = preview.exercises.filter((e) => e.willCreate);
  const createdIdByName = new Map<string, string>();
  if (toCreate.length > 0) {
    const inserts = toCreate.map((e) => ({
      name: e.exerciseName,
      session_type: "upper",
      primary_muscle: "chest",
      is_active: true,
    }));
    const { data: newRows, error: cErr } = await supabase
      .from("exercises")
      .insert(inserts)
      .select("id, name");
    if (cErr) return { ok: false, error: `Criar exercícios: ${cErr.message}` };
    for (const r of (newRows ?? []) as Array<{ id: string; name: string }>) {
      createdIdByName.set(r.name.toLowerCase(), r.id);
    }
  }

  // Step 2: create the session.
  const { data: session, error: sErr } = await supabase
    .from("workout_sessions")
    .insert({
      template_id: preview.templateMatch?.id ?? null,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (sErr || !session) {
    return { ok: false, error: `Criar sessão: ${sErr?.message ?? "?"}` };
  }
  const sessionId = session.id as string;

  // Step 3: build a flat array of set inserts and bulk insert.
  const setInserts: Array<Record<string, unknown>> = [];
  for (const block of preview.exercises) {
    const exerciseId =
      block.exerciseId ??
      createdIdByName.get(block.exerciseName.toLowerCase()) ??
      null;
    if (!exerciseId) continue;
    block.sets.forEach((s, idx) => {
      setInserts.push({
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: idx + 1,
        weight_kg: s.weightKg,
        reps: s.reps,
        rir: null,
        is_warmup: false,
        machine: block.machine,
      });
    });
  }
  if (setInserts.length > 0) {
    const { error: setErr } = await supabase
      .from("workout_sets")
      .insert(setInserts);
    if (setErr) {
      return { ok: false, error: `Salvar sets: ${setErr.message}` };
    }
  }

  revalidatePath("/");
  revalidatePath("/treinar");
  revalidatePath("/progresso");
  revalidatePath(`/workout/${sessionId}`);
  return { ok: true, sessionId };
}
