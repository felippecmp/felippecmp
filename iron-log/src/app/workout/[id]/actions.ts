"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  computeProgressionState,
  EMPTY_STATE,
  type ProgressionStateRow,
  type ProgressionStatus,
  type WorkingSet,
} from "@/lib/progression";

export type SimpleResult = { ok: true } | { ok: false; error: string };

export type PRDetection = {
  exerciseId: string;
  exerciseName: string;
  kind: "weight" | "reps_at_top";
  newWeight: number;
  newReps: number;
  priorWeight: number;
  priorReps: number;
};

export type FinishSessionResult =
  | { ok: true; prs: PRDetection[] }
  | { ok: false; error: string };

export type LogSetInput = {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number | null;
  isWarmup: boolean;
  /** Optional machine annotation copied from the slot at log time so the
      historical set preserves which machine was used. */
  machine?: string | null;
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
      is_warmup: input.isWarmup,
      machine: input.machine ?? null,
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

export type FinishSessionInput = {
  overallFeeling: number | null;
  notes: string | null;
};

/**
 * Marks a workout session as finished, computing duration from started_at,
 * storing the optional RIR/feeling and notes, updating progression_state
 * for each exercise performed, and returning any PRs hit so the client
 * can celebrate before navigating home.
 */
export async function finishSession(
  sessionId: string,
  input: FinishSessionInput
): Promise<FinishSessionResult> {
  const supabase = await createClient();

  const { data: session, error: fetchErr } = await supabase
    .from("workout_sessions")
    .select("id, started_at, finished_at, template_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!session) return { ok: false, error: "Sessão não encontrada." };
  if (session.finished_at)
    return { ok: false, error: "Sessão já finalizada." };

  if (
    input.overallFeeling !== null &&
    (input.overallFeeling < 1 || input.overallFeeling > 5)
  ) {
    return { ok: false, error: "Feeling inválido." };
  }

  const startedAt = new Date(session.started_at);
  const now = new Date();
  const durationMinutes = Math.max(
    1,
    Math.round((now.getTime() - startedAt.getTime()) / 60000)
  );

  const { error } = await supabase
    .from("workout_sessions")
    .update({
      finished_at: now.toISOString(),
      duration_minutes: durationMinutes,
      overall_feeling: input.overallFeeling,
      notes: input.notes,
    })
    .eq("id", sessionId);

  if (error) return { ok: false, error: error.message };

  // Detect PRs before progression update — both read from workout_sets but
  // PR detection wants the raw history while progression mutates state.
  let prs: PRDetection[] = [];
  try {
    prs = await detectPRs(sessionId);
  } catch {
    // PRs are nice-to-have. Never block finalize on a detection failure.
  }

  // Progression state updates — a failure here must not block finalize,
  // since the session is already marked finished. We swallow errors and
  // let the next session render still work with stale state.
  try {
    await updateProgressionForSession(sessionId, session.template_id, now);
  } catch {
    // intentionally swallowed
  }

  revalidatePath("/");
  revalidatePath("/treinar");
  revalidatePath("/progresso");
  return { ok: true, prs };
}

type SessionMaxRow = {
  exercise_id: string | null;
  weight_kg: number | string;
  reps: number;
  exercises:
    | { name: string }
    | { name: string }[]
    | null;
};

/**
 * For each exercise lifted in the just-finished session, compare its top
 * working set to all prior working sets of the same exercise. We only
 * surface PRs when there's prior history (first-time exercises don't
 * count — too noisy).
 *
 * Two PR kinds:
 *  - "weight": top weight beat the all-time top weight
 *  - "reps_at_top": same top weight as before, but more reps on the top set
 */
async function detectPRs(sessionId: string): Promise<PRDetection[]> {
  const supabase = await createClient();

  const { data: sessionSets } = await supabase
    .from("workout_sets")
    .select("exercise_id, weight_kg, reps, exercises(name)")
    .eq("session_id", sessionId)
    .eq("is_warmup", false);

  if (!sessionSets || sessionSets.length === 0) return [];

  // Reduce this session to its top set per exercise.
  type SessionMax = {
    exerciseId: string;
    exerciseName: string;
    maxWeight: number;
    topReps: number;
  };
  const byExercise = new Map<string, SessionMax>();
  for (const raw of sessionSets as SessionMaxRow[]) {
    if (!raw.exercise_id) continue;
    const w = Number(raw.weight_kg);
    const r = raw.reps;
    const name = Array.isArray(raw.exercises)
      ? raw.exercises[0]?.name ?? "Exercício"
      : raw.exercises?.name ?? "Exercício";
    const cur = byExercise.get(raw.exercise_id);
    if (!cur) {
      byExercise.set(raw.exercise_id, {
        exerciseId: raw.exercise_id,
        exerciseName: name,
        maxWeight: w,
        topReps: r,
      });
      continue;
    }
    if (w > cur.maxWeight) {
      cur.maxWeight = w;
      cur.topReps = r;
    } else if (w === cur.maxWeight && r > cur.topReps) {
      cur.topReps = r;
    }
  }

  const prs: PRDetection[] = [];
  for (const sm of byExercise.values()) {
    const { data: priorSets } = await supabase
      .from("workout_sets")
      .select("weight_kg, reps")
      .eq("exercise_id", sm.exerciseId)
      .eq("is_warmup", false)
      .neq("session_id", sessionId);

    if (!priorSets || priorSets.length === 0) continue; // no history → not a PR

    let priorMaxWeight = 0;
    let priorTopReps = 0;
    for (const p of priorSets) {
      const pw = Number(p.weight_kg);
      const pr = p.reps;
      if (pw > priorMaxWeight) {
        priorMaxWeight = pw;
        priorTopReps = pr;
      } else if (pw === priorMaxWeight && pr > priorTopReps) {
        priorTopReps = pr;
      }
    }

    if (sm.maxWeight > priorMaxWeight) {
      prs.push({
        exerciseId: sm.exerciseId,
        exerciseName: sm.exerciseName,
        kind: "weight",
        newWeight: sm.maxWeight,
        newReps: sm.topReps,
        priorWeight: priorMaxWeight,
        priorReps: priorTopReps,
      });
    } else if (
      sm.maxWeight === priorMaxWeight &&
      sm.topReps > priorTopReps
    ) {
      prs.push({
        exerciseId: sm.exerciseId,
        exerciseName: sm.exerciseName,
        kind: "reps_at_top",
        newWeight: sm.maxWeight,
        newReps: sm.topReps,
        priorWeight: priorMaxWeight,
        priorReps: priorTopReps,
      });
    }
  }

  return prs;
}

type ProgressionRowRaw = {
  id: string;
  exercise_id: string | null;
  current_weight_kg: number | string | null;
  current_status: ProgressionStatus | null;
  last_top_set_reps: number | null;
  streak_at_top_range: number | null;
  stall_count: number | null;
  sessions_at_current_weight: number | null;
  last_session_date: string | null;
};

/**
 * Recompute progression_state for every exercise that had working sets in
 * the just-finished session. We do this in one action, sequentially, because:
 *  - Only a handful of exercises per session (≤ ~10)
 *  - Ordering doesn't matter
 *  - No RPC/view to do it in pure SQL yet
 */
async function updateProgressionForSession(
  sessionId: string,
  templateId: string | null,
  finishedAt: Date
) {
  if (!templateId) return;
  const supabase = await createClient();

  const [{ data: setsRows }, { data: teRows }] = await Promise.all([
    supabase
      .from("workout_sets")
      .select("exercise_id, weight_kg, reps, rir")
      .eq("session_id", sessionId)
      .eq("is_warmup", false),
    supabase
      .from("template_exercises")
      .select(
        "exercise_id, target_sets, rep_range_low, rep_range_high, exercises(load_increment)"
      )
      .eq("template_id", templateId),
  ]);

  const byExercise = new Map<string, WorkingSet[]>();
  for (const s of setsRows ?? []) {
    if (!s.exercise_id) continue;
    const arr = byExercise.get(s.exercise_id) ?? [];
    arr.push({
      weight_kg: Number(s.weight_kg),
      reps: s.reps,
      rir: s.rir,
    });
    byExercise.set(s.exercise_id, arr);
  }

  if (byExercise.size === 0) return;

  const sessionDate = finishedAt.toISOString().slice(0, 10);

  for (const [exerciseId, workingSets] of byExercise.entries()) {
    const te = (teRows ?? []).find((r) => r.exercise_id === exerciseId);
    if (!te) continue;

    const exercisesJoin = Array.isArray(te.exercises)
      ? te.exercises[0]
      : te.exercises;
    const loadIncrement = exercisesJoin
      ? Number((exercisesJoin as { load_increment: number }).load_increment) ||
        2.5
      : 2.5;

    // Fetch prior state (single-user mode: we don't filter by user_id because
    // the existing records have user_id = null; RLS still scopes correctly).
    const { data: priorRaw } = await supabase
      .from("progression_state")
      .select(
        "id, exercise_id, current_weight_kg, current_status, last_top_set_reps, streak_at_top_range, stall_count, sessions_at_current_weight, last_session_date"
      )
      .eq("exercise_id", exerciseId)
      .maybeSingle();

    const prior = priorRaw as ProgressionRowRaw | null;
    const currentState: ProgressionStateRow = prior
      ? {
          current_weight_kg:
            prior.current_weight_kg !== null
              ? Number(prior.current_weight_kg)
              : null,
          current_status: (prior.current_status ?? "building") as ProgressionStatus,
          last_top_set_reps: prior.last_top_set_reps,
          streak_at_top_range: prior.streak_at_top_range ?? 0,
          stall_count: prior.stall_count ?? 0,
          sessions_at_current_weight: prior.sessions_at_current_weight ?? 0,
          last_session_date: prior.last_session_date,
        }
      : EMPTY_STATE;

    const newState = computeProgressionState({
      exercise: { load_increment: loadIncrement },
      templateExercise: {
        target_sets: te.target_sets,
        rep_range_low: te.rep_range_low,
        rep_range_high: te.rep_range_high,
      },
      workingSets,
      currentState,
      sessionDate,
    });

    const payload = {
      exercise_id: exerciseId,
      current_weight_kg: newState.current_weight_kg,
      current_status: newState.current_status,
      last_top_set_reps: newState.last_top_set_reps,
      streak_at_top_range: newState.streak_at_top_range,
      stall_count: newState.stall_count,
      sessions_at_current_weight: newState.sessions_at_current_weight,
      last_session_date: newState.last_session_date,
      updated_at: new Date().toISOString(),
    };

    if (prior) {
      await supabase
        .from("progression_state")
        .update(payload)
        .eq("id", prior.id);
    } else {
      await supabase.from("progression_state").insert(payload);
    }
  }
}

