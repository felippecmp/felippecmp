"use server";

import { createClient } from "@/lib/supabase/server";

export type SimpleResult = { ok: true } | { ok: false; error: string };

export type LogSetInput = {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number | null;
};

export type LogSetResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Insert a new workout_set row. Returns the new id so the client can
 * switch the row from "new" to "saved" state without re-fetching.
 *
 * We intentionally do NOT call revalidatePath here: the client component
 * is the source of truth during an active workout, and a server refetch
 * while the user is typing would cause ugly reconciliation.
 */
export async function logSet(input: LogSetInput): Promise<LogSetResult> {
  const supabase = await createClient();

  const { data: session, error: sErr } = await supabase
    .from("workout_sessions")
    .select("id, finished_at")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (sErr) return { ok: false, error: sErr.message };
  if (!session) return { ok: false, error: "Sessão não encontrada." };
  if (session.finished_at) return { ok: false, error: "Sessão já finalizada." };

  const { data, error } = await supabase
    .from("workout_sets")
    .insert({
      session_id: input.sessionId,
      exercise_id: input.exerciseId,
      set_number: input.setNumber,
      weight_kg: input.weightKg,
      reps: input.reps,
      rir: input.rir,
      is_warmup: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export type UpdateSetInput = {
  weightKg: number;
  reps: number;
  rir: number | null;
};

export async function updateSet(
  setId: string,
  input: UpdateSetInput
): Promise<SimpleResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_sets")
    .update({
      weight_kg: input.weightKg,
      reps: input.reps,
      rir: input.rir,
    })
    .eq("id", setId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSet(setId: string): Promise<SimpleResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
