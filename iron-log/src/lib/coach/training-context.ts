/**
 * Aggregates the user's recent training data into a compact text summary
 * that fits in a Claude prompt. Covers:
 *  - Volume per muscle (last 7d + prior 7d)
 *  - Recent session history (last 10 sessions with feeling + duration)
 *  - Stalled exercises
 *  - RIR averages
 *  - User's baseline volume targets
 *  - Body weight — latest, trend, AND week-by-week averages (so the
 *    coach can detect plateaus and correlate them with training volume)
 *  - Cardio sessions bucketed per week (last 4 weeks)
 *  - Daily steps weekly averages
 *  - Weekly rollup of strength + cardio session counts and total working
 *    sets — this is the table the coach uses to correlate "peso estagnou
 *    porque cardio/treino caiu"
 *
 * The summary is designed to be ~1500 tokens, keeping API costs minimal
 * while giving Claude enough context to make informed decisions.
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/settings";
import { muscleLabel } from "@/lib/muscles";
import { WEEKLY_VOLUME_TARGET } from "@/lib/stats";

export type TrainingContextSummary = {
  text: string;
  hasEnoughData: boolean;
};

type SetRow = {
  exercise_id: string | null;
  weight_kg: number | string;
  reps: number;
  rir: number | null;
  performed_at: string;
  exercises:
    | { name: string; primary_muscle: string }
    | { name: string; primary_muscle: string }[]
    | null;
};

type SessionRow = {
  id: string;
  started_at: string;
  duration_minutes: number | null;
  overall_feeling: number | null;
  workout_templates:
    | { name: string }
    | { name: string }[]
    | null;
};

type ProgressionRow = {
  exercise_id: string | null;
  current_weight_kg: number | string | null;
  current_status: string | null;
  sessions_at_current_weight: number | null;
  exercises:
    | { name: string }
    | { name: string }[]
    | null;
};

type WeightRow = {
  weight_kg: number | string;
  recorded_at: string;
};

type CardioRow = {
  activity_type: string | null;
  started_at: string;
  duration_seconds: number | null;
  distance_km: number | string | null;
};

type StepsRow = {
  step_date: string;
  steps: number;
};

function pick<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function buildTrainingContext(): Promise<TrainingContextSummary> {
  const supabase = await createClient();
  const settings = await getUserSettings();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  // 28 days covers 4 weekly buckets for the rollup table. 60 days is
  // enough for 8 weekly body-weight averages when the user weighs in
  // at least weekly.
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [setsRes, sessionsRes, progressionRes, weightRes, templatesRes, cardioRes, stepsRes, setsAllRes] = await Promise.all([
    supabase
      .from("workout_sets")
      .select(
        "exercise_id, weight_kg, reps, rir, performed_at, exercises(name, primary_muscle)"
      )
      .eq("is_warmup", false)
      .gte("performed_at", fourteenDaysAgo.toISOString())
      .order("performed_at", { ascending: false }),
    supabase
      .from("workout_sessions")
      .select(
        "id, started_at, duration_minutes, overall_feeling, workout_templates(name)"
      )
      .not("finished_at", "is", null)
      .gte("started_at", sixtyDaysAgo.toISOString())
      .order("started_at", { ascending: false })
      .limit(60),
    supabase
      .from("progression_state")
      .select(
        "exercise_id, current_weight_kg, current_status, sessions_at_current_weight, exercises(name)"
      ),
    supabase
      .from("body_weight_entries")
      .select("weight_kg, recorded_at")
      .gte("recorded_at", sixtyDaysAgo.toISOString())
      .order("recorded_at", { ascending: false }),
    supabase
      .from("workout_templates")
      .select(
        "id, name, session_type, sort_order, template_exercises(exercises(name, primary_muscle))"
      )
      .eq("is_active", true)
      .eq("is_ai_generated", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("cardio_sessions")
      .select("activity_type, started_at, duration_seconds, distance_km")
      .gte("started_at", twentyEightDaysAgo.toISOString())
      .order("started_at", { ascending: false }),
    supabase
      .from("daily_steps")
      .select("step_date, steps")
      .gte("step_date", twentyEightDaysAgo.toISOString().slice(0, 10))
      .order("step_date", { ascending: false }),
    // 28d window of working sets — feeds the weekly rollup table. Separate
    // from `setsRes` (14d) which powers the per-muscle volume block.
    supabase
      .from("workout_sets")
      .select("performed_at")
      .eq("is_warmup", false)
      .gte("performed_at", twentyEightDaysAgo.toISOString()),
  ]);

  const sets = (setsRes.data ?? []) as SetRow[];
  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const progression = (progressionRes.data ?? []) as ProgressionRow[];
  const weights = (weightRes.data ?? []) as WeightRow[];
  const cardio = (cardioRes.data ?? []) as CardioRow[];
  const steps = (stepsRes.data ?? []) as StepsRow[];
  const sets28d = (setsAllRes.data ?? []) as Array<{ performed_at: string }>;

  const lines: string[] = [];

  if (sessions.length === 0) {
    lines.push(
      "## Nota: usuário começou recentemente, sem sessões finalizadas ainda. Planeje baseado nos targets globais abaixo."
    );
  } else if (sessions.length < 3) {
    lines.push(
      `## Nota: apenas ${sessions.length} sessão(ões) registrada(s). Dados limitados — planeje conservadoramente, começando perto do MEV.`
    );
  }

  // Volume per muscle: 7d and prior 7d
  const vol7d: Record<string, number> = {};
  const volPrev7d: Record<string, number> = {};
  for (const s of sets) {
    const ex = pick(s.exercises);
    if (!ex) continue;
    const t = new Date(s.performed_at);
    if (t >= sevenDaysAgo) {
      vol7d[ex.primary_muscle] = (vol7d[ex.primary_muscle] ?? 0) + 1;
    } else {
      volPrev7d[ex.primary_muscle] = (volPrev7d[ex.primary_muscle] ?? 0) + 1;
    }
  }

  lines.push("## Volume por músculo (sets diretos, janela 7d)");
  const allMuscles = new Set([
    ...Object.keys(vol7d),
    ...Object.keys(volPrev7d),
  ]);
  for (const m of allMuscles) {
    const curr = vol7d[m] ?? 0;
    const prev = volPrev7d[m] ?? 0;
    const target =
      settings.volume_targets?.[m] ?? WEEKLY_VOLUME_TARGET[m] ?? 0;
    lines.push(
      `- ${muscleLabel(m)}: ${curr} sets (7d anterior: ${prev}, target: ${target})`
    );
  }

  // Recent sessions
  lines.push("\n## Últimas sessões");
  for (const s of sessions.slice(0, 10)) {
    const tpl = pick(s.workout_templates)?.name ?? "—";
    const date = new Date(s.started_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
    const feeling =
      s.overall_feeling !== null ? `feeling ${s.overall_feeling}/5` : "";
    const dur = s.duration_minutes ? `${s.duration_minutes}min` : "";
    lines.push(`- ${date}: ${tpl} · ${dur} ${feeling}`.trim());
  }

  // RIR average
  const rirs = sets
    .filter((s) => s.rir !== null && new Date(s.performed_at) >= sevenDaysAgo)
    .map((s) => s.rir as number);
  if (rirs.length > 0) {
    const avgRir = (rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1);
    lines.push(`\nRIR médio últimos 7d: ${avgRir} (${rirs.length} sets)`);
  }

  // Stalled exercises
  const stalled = progression.filter(
    (p) => p.current_status === "stalled"
  );
  if (stalled.length > 0) {
    lines.push("\n## Exercícios travados");
    for (const p of stalled) {
      const name = pick(p.exercises)?.name ?? "?";
      const w =
        p.current_weight_kg !== null
          ? `${Number(p.current_weight_kg)}kg`
          : "—";
      lines.push(
        `- ${name}: ${p.sessions_at_current_weight ?? 0} sessões em ${w}`
      );
    }
  }

  // Weight trend — latest + week-by-week average over 8 weeks so the
  // coach can detect plateaus and correlate with training volume.
  if (weights.length >= 2) {
    const latest = Number(weights[0].weight_kg);
    const oldest = Number(weights[weights.length - 1].weight_kg);
    const delta = (latest - oldest).toFixed(1);
    lines.push(
      `\nPeso corporal: ${latest.toFixed(1)}kg (${delta}kg nos últimos ${weights.length} registros)`
    );

    // Bucket entries by ISO week-of-year so the coach can scan the
    // trajectory week by week. Format: "-7sem: 82.3kg, -6sem: 82.1kg..."
    const weeklyAvg: Map<string, { sum: number; count: number }> = new Map();
    for (const w of weights) {
      const wk = weekKey(new Date(w.recorded_at));
      const bucket = weeklyAvg.get(wk) ?? { sum: 0, count: 0 };
      bucket.sum += Number(w.weight_kg);
      bucket.count += 1;
      weeklyAvg.set(wk, bucket);
    }
    const current = weekKey(now);
    const weeklyLines: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const anchor = new Date(now);
      anchor.setDate(anchor.getDate() - i * 7);
      const wk = weekKey(anchor);
      const bucket = weeklyAvg.get(wk);
      if (!bucket) continue;
      const label = wk === current ? "atual" : `-${i}sem`;
      const avg = (bucket.sum / bucket.count).toFixed(1);
      weeklyLines.push(`${label}: ${avg}kg`);
    }
    if (weeklyLines.length >= 2) {
      lines.push(`Peso médio semanal: ${weeklyLines.join(" · ")}`);
    }
  }

  // Weekly correlation table — 4 buckets ending on today. This is the
  // grid the coach reads to answer "peso estagnou porque cardio/treino
  // caiu?" questions: strength sessions, cardio sessions, total working
  // sets and avg daily steps, per week, side-by-side with the weight
  // averages above.
  const buckets: Array<{
    label: string;
    strength: number;
    cardio: number;
    sets: number;
    stepsAvg: number | null;
  }> = [];
  for (let i = 3; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const startTs = start.setHours(0, 0, 0, 0);
    const endTs = end.setHours(23, 59, 59, 999);
    const strength = sessions.filter((s) => {
      const t = new Date(s.started_at).getTime();
      return t >= startTs && t <= endTs;
    }).length;
    const cardioN = cardio.filter((c) => {
      const t = new Date(c.started_at).getTime();
      return t >= startTs && t <= endTs;
    }).length;
    const setsN = sets28d.filter((s) => {
      const t = new Date(s.performed_at).getTime();
      return t >= startTs && t <= endTs;
    }).length;
    // Steps: avg daily across the 7-day window (ignore days with no entry)
    const startDay = new Date(startTs).toISOString().slice(0, 10);
    const endDay = new Date(endTs).toISOString().slice(0, 10);
    const daysInBucket = steps.filter(
      (s) => s.step_date >= startDay && s.step_date <= endDay
    );
    const stepsAvg =
      daysInBucket.length > 0
        ? Math.round(
            daysInBucket.reduce((a, b) => a + b.steps, 0) /
              daysInBucket.length
          )
        : null;
    buckets.push({
      label: i === 0 ? "atual" : `-${i}sem`,
      strength,
      cardio: cardioN,
      sets: setsN,
      stepsAvg,
    });
  }

  lines.push("\n## Rollup semanal (4 semanas)");
  lines.push(
    "label | strength | cardio | sets | passos médios/dia"
  );
  for (const b of buckets) {
    const steps = b.stepsAvg !== null ? `${b.stepsAvg}` : "—";
    lines.push(
      `${b.label} | ${b.strength} | ${b.cardio} | ${b.sets} | ${steps}`
    );
  }

  // Cardio detail — types + totals so the coach can reason about which
  // modality changed (corrida vs caminhada, etc.)
  if (cardio.length > 0) {
    const byType = new Map<string, { count: number; minutes: number; km: number }>();
    for (const c of cardio) {
      const t = (c.activity_type ?? "cardio").toLowerCase();
      const bucket = byType.get(t) ?? { count: 0, minutes: 0, km: 0 };
      bucket.count += 1;
      bucket.minutes += Math.round((c.duration_seconds ?? 0) / 60);
      bucket.km += c.distance_km !== null ? Number(c.distance_km) : 0;
      byType.set(t, bucket);
    }
    lines.push("\n## Cardio por modalidade (últimas 4 semanas)");
    for (const [t, b] of byType) {
      const km = b.km > 0 ? ` · ${b.km.toFixed(1)}km` : "";
      lines.push(`- ${t}: ${b.count}x · ${b.minutes}min${km}`);
    }
  }

  // Baseline targets
  lines.push("\n## Targets globais do user (baseline)");
  const targets = settings.volume_targets ?? WEEKLY_VOLUME_TARGET;
  const targetLines = Object.entries(targets)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${muscleLabel(k)}: ${v}`)
    .join(", ");
  lines.push(targetLines);

  // Templates with exercises — so the coach can analyze muscle distribution
  type TemplateRow = {
    id: string;
    name: string;
    session_type: string;
    sort_order: number;
    template_exercises:
      | Array<{
          exercises:
            | { name: string; primary_muscle: string }
            | { name: string; primary_muscle: string }[]
            | null;
        }>
      | null;
  };
  const tplRows = (templatesRes.data ?? []) as TemplateRow[];
  if (tplRows.length > 0) {
    lines.push(`\n## Templates ativos (${tplRows.length} templates = ~${tplRows.length}-${tplRows.length + 1} sessões/semana)`);
    for (const tpl of tplRows) {
      const exercises = (tpl.template_exercises ?? [])
        .map((te) => {
          const ex = pick(te.exercises);
          return ex ? `${ex.name} (${muscleLabel(ex.primary_muscle)})` : null;
        })
        .filter(Boolean);
      lines.push(`- ${tpl.name} (${tpl.session_type}): ${exercises.join(", ") || "vazio"}`);
    }
  }

  return { text: lines.join("\n"), hasEnoughData: true };
  // Note: we always return hasEnoughData = true. Even without sessions,
  // Claude can plan from the user's baseline targets. The context text
  // includes a note about limited data so the coach adjusts accordingly.
}

/**
 * ISO-8601 week key anchored in the user's timezone. Two dates in the
 * same week return the same key. Used to bucket weight entries and
 * session counts into weekly buckets for the coach context.
 */
function weekKey(d: Date): string {
  // Mutate a local copy, anchored at UTC noon Thursday of the same week
  // (ISO-8601 defines the week by Thursday). That gives us YYYY-Wxx.
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${t.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
