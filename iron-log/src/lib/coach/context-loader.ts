/**
 * Server-side fetcher that builds a CoachContext from scratch — used by
 * /coach to render the deterministic insights panel without depending on
 * any data the calling page already happens to have.
 *
 * /progresso used to inline this logic, but that meant CoachInsights
 * couldn't move out of /progresso without dragging the data fetches with
 * it. Now both pages can call buildInsights(loadCoachContext()) without
 * coordinating their queries.
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/settings";
import { type CoachContext } from "./insights";
import { getActiveMesocycle } from "./mesocycle-server";

type SetRow = {
  exercise_id: string | null;
  weight_kg: number | string;
  reps: number;
  rir: number | null;
  performed_at: string;
  exercises:
    | { primary_muscle: string }
    | { primary_muscle: string }[]
    | null;
};

type SessionRow = {
  id: string;
  started_at: string;
  overall_feeling: number | null;
};

type ProgressionRow = {
  exercise_id: string | null;
  current_weight_kg: number | string | null;
  current_status: string | null;
  sessions_at_current_weight: number | null;
  exercises:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

function pickJoined<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function loadCoachContext(): Promise<CoachContext> {
  const supabase = await createClient();
  const settings = await getUserSettings();
  const activeMeso = await getActiveMesocycle();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [setsRes, sessionsRes, progressionRes] = await Promise.all([
    supabase
      .from("workout_sets")
      .select(
        "exercise_id, weight_kg, reps, rir, performed_at, exercises(primary_muscle)"
      )
      .eq("is_warmup", false)
      .gte("performed_at", fourteenDaysAgo.toISOString())
      .order("performed_at", { ascending: false }),
    supabase
      .from("workout_sessions")
      .select("id, started_at, overall_feeling")
      .not("finished_at", "is", null)
      .gte("started_at", thirtyDaysAgo.toISOString())
      .order("started_at", { ascending: false }),
    supabase
      .from("progression_state")
      .select(
        "exercise_id, current_weight_kg, current_status, sessions_at_current_weight, exercises(id, name)"
      )
      .eq("current_status", "stalled"),
  ]);

  const sets = (setsRes.data ?? []) as SetRow[];
  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const progression = (progressionRes.data ?? []) as ProgressionRow[];

  // Effective targets = active week > settings overrides > defaults
  const userTargets: Record<string, number> | null = (() => {
    const week = activeMeso?.currentWeek?.volume_targets;
    if (week && settings.volume_targets) {
      return { ...settings.volume_targets, ...week };
    }
    return week ?? settings.volume_targets;
  })();

  // Volume per muscle: last 7d and prior 7d
  const volume7d: Record<string, number> = {};
  const volumePrev7d: Record<string, number> = {};
  for (const s of sets) {
    const ex = pickJoined(s.exercises);
    if (!ex) continue;
    const t = new Date(s.performed_at);
    if (t >= sevenDaysAgo) {
      volume7d[ex.primary_muscle] = (volume7d[ex.primary_muscle] ?? 0) + 1;
    } else if (t >= fourteenDaysAgo) {
      volumePrev7d[ex.primary_muscle] =
        (volumePrev7d[ex.primary_muscle] ?? 0) + 1;
    }
  }

  // Recent feelings (newest first, 30d window)
  const recentFeelings = sessions
    .filter((s) => s.overall_feeling !== null)
    .map((s) => ({ feeling: s.overall_feeling as number, at: s.started_at }));

  // Recent RIRs from working sets, newest first
  const recentRirs = sets
    .filter((s) => s.rir !== null)
    .slice(0, 30)
    .map((s) => ({ rir: s.rir as number, at: s.performed_at }));

  // Stalled exercises
  const stalledExercises = progression
    .map((r) => {
      const ex = pickJoined(r.exercises);
      if (!r.exercise_id || !ex) return null;
      return {
        exerciseId: r.exercise_id,
        exerciseName: ex.name,
        sessionsAtCurrentWeight: r.sessions_at_current_weight ?? 0,
        currentWeightKg:
          r.current_weight_kg !== null ? Number(r.current_weight_kg) : null,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  // Session counts last 7d / prior 7d
  const sessionsLast7d = sessions.filter(
    (s) => new Date(s.started_at) >= sevenDaysAgo
  ).length;
  const sessionsPrev7d = sessions.filter((s) => {
    const t = new Date(s.started_at);
    return t >= fourteenDaysAgo && t < sevenDaysAgo;
  }).length;

  return {
    volume7d,
    volumePrev7d,
    userTargets,
    recentFeelings,
    recentRirs,
    stalledExercises,
    sessionsLast7d,
    sessionsPrev7d,
  };
}
