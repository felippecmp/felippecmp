import { createClient } from "@/lib/supabase/server";

export type TemplateProgression = {
  totalSessions: number;
  firstSessionAt: string | null;
  lastSessionAt: string | null;
  sessions30d: number;
  sessionsPrev30d: number;
  volume30d: number;
  volumePrev30d: number;
  avgDuration30d: number | null;
  exerciseTops: Array<{
    exerciseId: string;
    exerciseName: string;
    topWeight: number;
    topReps: number;
    sets30d: number;
  }>;
};

type SessionRow = {
  id: string;
  started_at: string;
  duration_minutes: number | null;
};

type SetRow = {
  exercise_id: string | null;
  weight_kg: number | string;
  reps: number;
  performed_at: string;
  exercises:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

function pickExercise(
  raw: SetRow["exercises"]
): { id: string; name: string } | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

/**
 * Aggregate the history of every session that belongs to a template:
 *  - totals over all time
 *  - 30d window with delta vs the previous 30d
 *  - per-exercise top set in the 30d window
 *
 * Returns deltas as raw numbers; the UI computes the percentage and sign.
 */
export async function getTemplateProgression(
  templateId: string
): Promise<TemplateProgression> {
  const supabase = await createClient();
  const now = new Date();
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: sessionsRaw } = await supabase
    .from("workout_sessions")
    .select("id, started_at, duration_minutes")
    .eq("template_id", templateId)
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false });

  const sessions = (sessionsRaw ?? []) as SessionRow[];
  const totalSessions = sessions.length;
  const firstSessionAt =
    sessions.length > 0 ? sessions[sessions.length - 1].started_at : null;
  const lastSessionAt = sessions.length > 0 ? sessions[0].started_at : null;

  const sessions60d = sessions.filter(
    (s) => new Date(s.started_at) >= sixtyDaysAgo
  );
  const sessions30d = sessions60d.filter(
    (s) => new Date(s.started_at) >= thirtyDaysAgo
  );
  const sessionsPrev30d = sessions60d.filter((s) => {
    const t = new Date(s.started_at);
    return t >= sixtyDaysAgo && t < thirtyDaysAgo;
  });

  const session60dIds = sessions60d.map((s) => s.id);

  let sets60d: SetRow[] = [];
  if (session60dIds.length > 0) {
    const { data: setsRaw } = await supabase
      .from("workout_sets")
      .select(
        "exercise_id, weight_kg, reps, performed_at, exercises(id, name)"
      )
      .in("session_id", session60dIds)
      .eq("is_warmup", false);
    sets60d = (setsRaw ?? []) as SetRow[];
  }

  const sets30d = sets60d.filter(
    (s) => new Date(s.performed_at) >= thirtyDaysAgo
  );
  const setsPrev30d = sets60d.filter((s) => {
    const t = new Date(s.performed_at);
    return t >= sixtyDaysAgo && t < thirtyDaysAgo;
  });

  const sumVolume = (rows: SetRow[]) =>
    rows.reduce((acc, s) => acc + Number(s.weight_kg) * s.reps, 0);

  const volume30d = sumVolume(sets30d);
  const volumePrev30d = sumVolume(setsPrev30d);

  const totalDur30d = sessions30d.reduce(
    (acc, s) => acc + (s.duration_minutes ?? 0),
    0
  );
  const avgDuration30d =
    sessions30d.length > 0
      ? Math.round(totalDur30d / sessions30d.length)
      : null;

  // Per-exercise top set in the 30d window.
  type Top = {
    exerciseId: string;
    exerciseName: string;
    topWeight: number;
    topReps: number;
    sets: number;
  };
  const topByEx = new Map<string, Top>();
  for (const s of sets30d) {
    const ex = pickExercise(s.exercises);
    if (!ex) continue;
    const w = Number(s.weight_kg);
    const cur = topByEx.get(ex.id);
    if (!cur) {
      topByEx.set(ex.id, {
        exerciseId: ex.id,
        exerciseName: ex.name,
        topWeight: w,
        topReps: s.reps,
        sets: 1,
      });
      continue;
    }
    cur.sets++;
    if (w > cur.topWeight) {
      cur.topWeight = w;
      cur.topReps = s.reps;
    } else if (w === cur.topWeight && s.reps > cur.topReps) {
      cur.topReps = s.reps;
    }
  }

  const exerciseTops = Array.from(topByEx.values())
    .sort((a, b) => b.sets - a.sets)
    .map(({ sets, ...rest }) => ({ ...rest, sets30d: sets }));

  return {
    totalSessions,
    firstSessionAt,
    lastSessionAt,
    sessions30d: sessions30d.length,
    sessionsPrev30d: sessionsPrev30d.length,
    volume30d,
    volumePrev30d,
    avgDuration30d,
    exerciseTops,
  };
}
