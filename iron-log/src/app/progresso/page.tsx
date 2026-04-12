import Link from "next/link";
import { ChevronRight, Footprints } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { muscleLabel } from "@/lib/muscles";
import {
  dateKey,
  epley1RM,
  lastNDays,
  targetFor,
} from "@/lib/stats";
import { computeStreak } from "@/lib/streak";
import { getUserSettings } from "@/lib/settings";
import { PHASE_LABEL } from "@/lib/coach/mesocycle";
import { getActiveMesocycle } from "@/lib/coach/mesocycle-server";
import { WeightTrendChart } from "./WeightTrendChart";
import { DeltaChip, formatKg, PercentChip, TargetChip } from "./components/Chips";
import { DonutChart, type DonutEntry } from "./components/DonutChart";
import { Heatmap } from "./components/Heatmap";
import { StreakHero } from "./components/StreakHero";
import { CardioStat, TopStat } from "./components/Stats";
import { VolumeBar, type VolumeEntry } from "./components/VolumeBar";
import { VolumeCalculator } from "./components/VolumeCalculator";
import { WeeklyBars, type WeekData } from "./components/WeeklyBars";

export const dynamic = "force-dynamic";

type ExerciseJoin = {
  id: string;
  name: string;
  primary_muscle: string;
};

type SetRow = {
  id: string;
  exercise_id: string | null;
  weight_kg: number | string;
  reps: number;
  rir: number | null;
  performed_at: string;
  exercises: ExerciseJoin | ExerciseJoin[] | null;
};

type SessionRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  duration_minutes: number | null;
};

type WeightRow = {
  id: string;
  weight_kg: number | string;
  recorded_at: string;
};

type CardioRow = {
  id: string;
  activity_type: string;
  started_at: string;
  duration_seconds: number;
  distance_km: number | string | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
};

type ExerciseActivity = {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  lastPerformedAt: string;
  maxWeight: number;
  topReps: number;
  topRepsAtMax: number;
  bestEstimated1RM: number;
};

function pickJoined<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function ProgressoPage() {
  const supabase = await createClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Broad fetches for streak (1 year), analytics window (90d/60d), weight
  // chart (90d), cardio (1 year for streak + 90d window for stats), and
  // user settings (for the optional body weight target).
  const settings = await getUserSettings();
  const activeMeso = await getActiveMesocycle();

  const [
    sessionsYearRes,
    setsRes,
    weightRes,
    cardioRes,
    stepsRes,
    restRes,
  ] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, started_at, finished_at, duration_minutes")
      .not("finished_at", "is", null)
      .gte("started_at", yearAgo.toISOString())
      .order("started_at", { ascending: false }),
    // Sets for the last 60 days (we need 30d + prev 30d for comparison).
    supabase
      .from("workout_sets")
      .select(
        "id, exercise_id, weight_kg, reps, rir, performed_at, exercises(id, name, primary_muscle)"
      )
      .eq("is_warmup", false)
      .gte("performed_at", sixtyDaysAgo.toISOString())
      .order("performed_at", { ascending: false }),
    supabase
      .from("body_weight_entries")
      .select("id, weight_kg, recorded_at")
      .gte("recorded_at", ninetyDaysAgo.toISOString())
      .order("recorded_at", { ascending: true }),
    supabase
      .from("cardio_sessions")
      .select(
        "id, activity_type, started_at, duration_seconds, distance_km, avg_heart_rate, max_heart_rate, calories"
      )
      .gte("started_at", yearAgo.toISOString())
      .order("started_at", { ascending: false }),
    supabase
      .from("daily_steps")
      .select("step_date, steps")
      .gte("step_date", ninetyDaysAgo.toISOString().slice(0, 10))
      .order("step_date", { ascending: false }),
    supabase
      .from("rest_days")
      .select("rest_date")
      .gte("rest_date", ninetyDaysAgo.toISOString().slice(0, 10))
      .order("rest_date", { ascending: false }),
  ]);

  const allSessions = (sessionsYearRes.data ?? []) as SessionRow[];
  const sessions = allSessions.filter(
    (s) => new Date(s.started_at) >= ninetyDaysAgo
  );
  const sets = (setsRes.data ?? []) as SetRow[];
  const weights = (weightRes.data ?? []) as WeightRow[];
  const allCardio = (cardioRes.data ?? []) as CardioRow[];
  const stepsData = (stepsRes.data ?? []) as Array<{
    step_date: string;
    steps: number;
  }>;
  const restDaysData = (restRes.data ?? []) as Array<{ rest_date: string }>;
  const restDaySet = new Set(restDaysData.map((r) => r.rest_date));
  const cardio30d = allCardio.filter(
    (c) => new Date(c.started_at) >= thirtyDaysAgo
  );
  const cardioPrev30d = allCardio.filter((c) => {
    const t = new Date(c.started_at);
    return t >= sixtyDaysAgo && t < thirtyDaysAgo;
  });

  // --- Volume 7d per primary muscle ---
  const last7dSets = sets.filter(
    (s) => new Date(s.performed_at) >= sevenDaysAgo
  );
  const volumeMap = new Map<string, VolumeEntry>();
  for (const s of last7dSets) {
    const ex = pickJoined(s.exercises);
    if (!ex) continue;
    const muscle = ex.primary_muscle;
    const entry = volumeMap.get(muscle) ?? {
      muscle,
      sets: 0,
      totalVolume: 0,
    };
    entry.sets += 1;
    entry.totalVolume += Number(s.weight_kg) * s.reps;
    volumeMap.set(muscle, entry);
  }
  const volumeRows = Array.from(volumeMap.values()).sort(
    (a, b) => b.sets - a.sets
  );
  // Effective targets = active week (if any) > settings overrides > defaults.
  // Merge so the week overrides the settings on a per-muscle basis.
  const userTargets: Record<string, number> | null = (() => {
    const week = activeMeso?.currentWeek?.volume_targets;
    if (week && settings.volume_targets) {
      return { ...settings.volume_targets, ...week };
    }
    return week ?? settings.volume_targets;
  })();
  const maxVolumeBarSets =
    volumeRows.reduce(
      (max, r) => Math.max(max, r.sets, targetFor(r.muscle, userTargets) * 1.5),
      6
    ) || 6;

  // --- Heatmap 90d ---
  const sessionsByDay = new Map<string, { count: number; minutes: number }>();
  for (const sess of sessions) {
    const k = dateKey(new Date(sess.started_at));
    const prev = sessionsByDay.get(k) ?? { count: 0, minutes: 0 };
    prev.count += 1;
    prev.minutes += sess.duration_minutes ?? 0;
    sessionsByDay.set(k, prev);
  }
  const days = lastNDays(90, now);

  // Beast Mode heatmap: compute per-day completion level (0-4).
  // Goals: weight logged, strength session, cardio/walk, steps >= 8000.
  const weightDays = new Set(
    weights.map((w) => dateKey(new Date(w.recorded_at)))
  );
  const strengthDays = new Set(
    sessions.map((s) => dateKey(new Date(s.started_at)))
  );
  const cardioDays = new Set(
    allCardio
      .filter((c) => new Date(c.started_at) >= ninetyDaysAgo)
      .map((c) => dateKey(new Date(c.started_at)))
  );
  const stepsDayMap = new Map<string, number>();
  for (const s of stepsData) {
    stepsDayMap.set(s.step_date, s.steps);
  }

  // Beast Mode heatmap: compute per-day { hit, max, isRest }.
  // Rest days drop the max from 4 to 3 (no strength expectation), so a
  // rest day still earns the crimson glow at 3/3.
  const completionByDay = new Map<
    string,
    { hit: number; max: number; isRest: boolean }
  >();
  for (const d of days) {
    const isRest = restDaySet.has(d.key);
    let hit = 0;
    if (weightDays.has(d.key)) hit++;
    if (cardioDays.has(d.key)) hit++;
    if ((stepsDayMap.get(d.key) ?? 0) >= 8000) hit++;
    if (!isRest && strengthDays.has(d.key)) hit++;
    const max = isRest ? 3 : 4;
    completionByDay.set(d.key, { hit, max, isRest });
  }

  // Pre-compute period-filtered sets (used by both activity map and stats).
  const sets30d = sets.filter(
    (s) => new Date(s.performed_at) >= thirtyDaysAgo
  );
  const setsPrev30d = sets.filter((s) => {
    const t = new Date(s.performed_at);
    return t >= sixtyDaysAgo && t < thirtyDaysAgo;
  });

  // --- Recent exercises within 30d ---
  const activityMap = new Map<string, ExerciseActivity>();
  for (const s of sets) {
    const ex = pickJoined(s.exercises);
    if (!ex) continue;
    const weight = Number(s.weight_kg);
    const reps = s.reps;
    const est = epley1RM(weight, reps);
    const entry = activityMap.get(ex.id) ?? {
      id: ex.id,
      name: ex.name,
      muscle: ex.primary_muscle,
      sets: 0,
      lastPerformedAt: s.performed_at,
      maxWeight: weight,
      topReps: reps,
      topRepsAtMax: reps,
      bestEstimated1RM: est,
    };
    entry.sets += 1;
    if (new Date(s.performed_at) > new Date(entry.lastPerformedAt)) {
      entry.lastPerformedAt = s.performed_at;
    }
    if (weight > entry.maxWeight) {
      entry.maxWeight = weight;
      entry.topRepsAtMax = reps;
    } else if (weight === entry.maxWeight && reps > entry.topRepsAtMax) {
      entry.topRepsAtMax = reps;
    }
    if (reps > entry.topReps) entry.topReps = reps;
    if (est > entry.bestEstimated1RM) entry.bestEstimated1RM = est;
    activityMap.set(ex.id, entry);
  }
  // Compute max weight in prev 30d per exercise for delta chips
  const prevActivityMap = new Map<string, { maxWeight: number }>();
  for (const s of setsPrev30d) {
    const ex = pickJoined(s.exercises);
    if (!ex) continue;
    const weight = Number(s.weight_kg);
    const entry = prevActivityMap.get(ex.id);
    if (!entry || weight > entry.maxWeight) {
      prevActivityMap.set(ex.id, { maxWeight: weight });
    }
  }

  const recentExercises = Array.from(activityMap.values())
    .sort(
      (a, b) =>
        new Date(b.lastPerformedAt).getTime() -
        new Date(a.lastPerformedAt).getTime()
    )
    .slice(0, 8)
    .map((ex) => {
      const prev = prevActivityMap.get(ex.id);
      const weightDelta =
        prev && prev.maxWeight > 0
          ? ex.maxWeight - prev.maxWeight
          : null;
      return { ...ex, weightDelta };
    });

  // --- Header stats + prev-period comparisons ---
  const sessions30d = sessions.filter(
    (s) => new Date(s.started_at) >= thirtyDaysAgo
  );
  const sessionsPrev30d = allSessions.filter((s) => {
    const t = new Date(s.started_at);
    return t >= sixtyDaysAgo && t < thirtyDaysAgo;
  });
  const totalSessions30d = sessions30d.length;
  const totalSessionsPrev30d = sessionsPrev30d.length;

  const totalSets7d = last7dSets.length;
  const setsPrev7d = sets.filter((s) => {
    const t = new Date(s.performed_at);
    return t >= fourteenDaysAgo && t < sevenDaysAgo;
  });
  const totalSetsPrev7d = setsPrev7d.length;

  const totalMinutes30d = sessions30d.reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0
  );
  const totalMinutesPrev30d = sessionsPrev30d.reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0
  );

  // Streak across the whole year-ish window — strength + cardio count.
  const streak = computeStreak({
    activeTimestamps: [
      ...allSessions.map((s) => s.started_at),
      ...allCardio.map((c) => c.started_at),
    ],
    today: now,
  });

  // --- Total volume mensal (kg × reps summed across all working sets) ---
  const totalVolume30d = sets30d.reduce(
    (sum, s) => sum + Number(s.weight_kg) * s.reps,
    0
  );
  const totalVolumePrev30d = setsPrev30d.reduce(
    (sum, s) => sum + Number(s.weight_kg) * s.reps,
    0
  );
  const volumeDeltaPct =
    totalVolumePrev30d > 0
      ? Math.round(
          ((totalVolume30d - totalVolumePrev30d) / totalVolumePrev30d) * 100
        )
      : null;

  // --- Cardio aggregates (30d current + prev) ---
  const cardioKm30d = cardio30d.reduce(
    (sum, c) => sum + (c.distance_km ? Number(c.distance_km) : 0),
    0
  );
  const cardioKmPrev30d = cardioPrev30d.reduce(
    (sum, c) => sum + (c.distance_km ? Number(c.distance_km) : 0),
    0
  );
  const cardioMinutes30d = Math.round(
    cardio30d.reduce((sum, c) => sum + c.duration_seconds, 0) / 60
  );
  const cardioMinutesPrev30d = Math.round(
    cardioPrev30d.reduce((sum, c) => sum + c.duration_seconds, 0) / 60
  );
  const cardioSessions30d = cardio30d.length;
  const cardioHrValues = cardio30d
    .map((c) => c.avg_heart_rate)
    .filter((v): v is number => typeof v === "number");
  const cardioAvgHr30d =
    cardioHrValues.length > 0
      ? Math.round(
          cardioHrValues.reduce((a, b) => a + b, 0) / cardioHrValues.length
        )
      : null;

  // --- Body weight trend ---
  const weightSeries = weights.map((w) => ({
    date: w.recorded_at,
    weightKg: Number(w.weight_kg),
  }));
  const latestWeight = weightSeries[weightSeries.length - 1] ?? null;
  const weight7dAgoRef = findClosestWeight(weightSeries, sevenDaysAgo);
  const weight30dAgoRef = findClosestWeight(weightSeries, thirtyDaysAgo);
  const weightDelta7d =
    latestWeight && weight7dAgoRef
      ? latestWeight.weightKg - weight7dAgoRef.weightKg
      : null;
  const weightDelta30d =
    latestWeight && weight30dAgoRef
      ? latestWeight.weightKg - weight30dAgoRef.weightKg
      : null;

  // --- Weekly frequency bars (4 weeks) ---
  const weeklyBarsData: WeekData[] = (() => {
    const weeks: WeekData[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 + now.getDay()) * 86400000);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      const wStrength = allSessions.filter((s) => {
        const t = new Date(s.started_at);
        return t >= weekStart && t < weekEnd;
      }).length;
      const wCardio = allCardio.filter((c) => {
        const t = new Date(c.started_at);
        return t >= weekStart && t < weekEnd;
      }).length;
      weeks.push({
        label: i === 0 ? "Atual" : `S-${i}`,
        strength: wStrength,
        cardio: wCardio,
      });
    }
    return weeks;
  })();

  // Volume calculator data — include ALL tracked muscles (even 0 sets)
  const volumeCalcData = (() => {
    const setsMap = new Map(volumeRows.map((r) => [r.muscle, r.sets]));
    const targets = userTargets ?? {};
    // Include muscles that either have sets or have a target
    const allMuscles = new Set([
      ...volumeRows.map((r) => r.muscle),
      ...Object.keys(targets).filter((m) => (targets[m] ?? 0) > 0),
    ]);
    return Array.from(allMuscles)
      .map((muscle) => ({
        muscle,
        sets: setsMap.get(muscle) ?? 0,
        target: targets[muscle] ?? 0,
      }))
      .sort((a, b) => b.sets - a.sets);
  })();

  // Donut data from volumeRows
  const donutData: DonutEntry[] = volumeRows.map((r) => ({
    muscle: r.muscle,
    sets: r.sets,
  }));

  const empty = sessions.length === 0 && weightSeries.length === 0;

  return (
    <div className="px-6 pt-10">
      <header className="mb-8">
        <h1 className="display text-4xl leading-none">Progresso</h1>
        {!empty && (
          <p className="text-sm text-[var(--text-muted)] mt-2 tnum">
            {totalSessions30d} treinos · {totalSets7d} sets esta semana
          </p>
        )}
      </header>

      {empty ? (
        <EmptyState />
      ) : (
        <>
          {/* Weekly frequency bars */}
          {weeklyBarsData.some((w) => w.strength + w.cardio > 0) && (
            <section className="mb-6">
              <div className="rounded-2xl bg-[var(--bg-card)] p-5">
                <div className="flex items-baseline justify-between mb-4">
                  <p className="label">Frequência · 4 semanas</p>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-dim)]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: "var(--status-ready)" }} />
                      Força
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: "var(--status-stalled)" }} />
                      Cardio
                    </span>
                  </div>
                </div>
                <WeeklyBars weeks={weeklyBarsData} />
              </div>
            </section>
          )}

          {/* Streak hero + comparison stats */}
          <section className="mb-6">
            <StreakHero
              current={streak.current}
              best={streak.best}
              todayActive={streak.todayActive}
            />
          </section>

          {/* Volume total mensal */}
          {totalVolume30d > 0 && (
            <section className="mb-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                <p className="label mb-2">Volume levantado · 30 dias</p>
                <div className="flex items-baseline gap-3">
                  <div className="display text-4xl tnum leading-none">
                    {(totalVolume30d / 1000).toFixed(1)}
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">
                    toneladas
                  </span>
                  {volumeDeltaPct !== null && (
                    <PercentChip pct={volumeDeltaPct} />
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="mb-10 grid grid-cols-3 gap-2">
            <TopStat
              label="Sessões 30d"
              value={totalSessions30d}
              prev={totalSessionsPrev30d}
            />
            <TopStat
              label="Sets 7d"
              value={totalSets7d}
              prev={totalSetsPrev7d}
            />
            {(() => {
              // Show minutes when both periods are under 2 hours, hours otherwise.
              const useMin =
                totalMinutes30d < 120 && totalMinutesPrev30d < 120;
              return (
                <TopStat
                  label="Tempo 30d"
                  value={
                    useMin
                      ? totalMinutes30d
                      : Math.round(totalMinutes30d / 60)
                  }
                  prev={
                    useMin
                      ? totalMinutesPrev30d
                      : Math.round(totalMinutesPrev30d / 60)
                  }
                  suffix={useMin ? "min" : "h"}
                />
              );
            })()}
          </section>

          {/* Cardio */}
          {allCardio.length > 0 && (
            <section className="mb-10">
              <div className="flex items-baseline justify-between mb-3">
                <p className="label">Cardio · últimos 30 dias</p>
                <Link
                  href="/cardio"
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  Histórico
                </Link>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                <div className="flex items-center gap-4 mb-4">
                  <Footprints
                    size={14}
                    strokeWidth={1.75}
                    className="text-[var(--text-soft)]"
                  />
                  <p className="text-xs text-[var(--text-muted)]">
                    {cardioSessions30d}{" "}
                    {cardioSessions30d === 1 ? "sessão" : "sessões"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <CardioStat
                    label="Distância"
                    value={cardioKm30d.toFixed(1)}
                    suffix="km"
                    delta={
                      cardioKmPrev30d > 0
                        ? Math.round(
                            ((cardioKm30d - cardioKmPrev30d) /
                              cardioKmPrev30d) *
                              100
                          )
                        : null
                    }
                  />
                  <CardioStat
                    label="Tempo"
                    value={
                      cardioMinutes30d >= 60
                        ? `${Math.floor(cardioMinutes30d / 60)}h${
                            cardioMinutes30d % 60 > 0
                              ? ` ${cardioMinutes30d % 60}`
                              : ""
                          }`
                        : String(cardioMinutes30d)
                    }
                    suffix={cardioMinutes30d >= 60 ? "" : "min"}
                    delta={
                      cardioMinutesPrev30d > 0
                        ? Math.round(
                            ((cardioMinutes30d - cardioMinutesPrev30d) /
                              cardioMinutesPrev30d) *
                              100
                          )
                        : null
                    }
                  />
                  <CardioStat
                    label="HR médio"
                    value={cardioAvgHr30d !== null ? String(cardioAvgHr30d) : "—"}
                    suffix=""
                    delta={null}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Peso corporal */}
          {weightSeries.length > 0 && (
            <section className="mb-10">
              <div className="flex items-baseline justify-between mb-3">
                <p className="label">Peso corporal · 90 dias</p>
                <Link
                  href="/peso"
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  Histórico
                </Link>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <div className="flex items-baseline gap-4 mb-4 flex-wrap">
                  <div>
                    <p className="label mb-1">Atual</p>
                    <div className="flex items-baseline gap-1">
                      <span className="display text-3xl tnum">
                        {latestWeight?.weightKg.toFixed(1)}
                      </span>
                      <span className="text-xs text-[var(--text-dim)]">
                        kg
                      </span>
                    </div>
                  </div>
                  <DeltaChip
                    delta={weightDelta7d}
                    label="7d"
                    inverted={false}
                  />
                  <DeltaChip
                    delta={weightDelta30d}
                    label="30d"
                    inverted={false}
                  />
                  {settings.target_weight_kg !== null && latestWeight && (
                    <TargetChip
                      target={settings.target_weight_kg}
                      current={latestWeight.weightKg}
                    />
                  )}
                </div>
                <WeightTrendChart
                  series={weightSeries}
                  target={settings.target_weight_kg}
                />
              </div>
            </section>
          )}

          {activeMeso && activeMeso.currentWeek && (
            <Link
              href="/coach"
              className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--bg-card)] px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold">
                bloco
              </span>
              <span className="text-sm font-medium truncate flex-1 min-w-0">
                {activeMeso.mesocycle.name}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] tnum shrink-0">
                {activeMeso.currentWeekNumber}/
                {activeMeso.mesocycle.total_weeks} ·{" "}
                {PHASE_LABEL[activeMeso.currentWeek.phase]}
              </span>
            </Link>
          )}

          {/* Donut chart — volume distribution */}
          {donutData.length > 0 && (
            <section className="mb-6">
              <div className="rounded-2xl bg-[var(--bg-card)] p-5">
                <p className="label mb-4">Distribuição · 7 dias</p>
                <DonutChart data={donutData} />
              </div>
            </section>
          )}

          {/* Volume Calculator — RP landmarks scale per muscle */}
          {volumeCalcData.length > 0 && (
            <section className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <p className="label">Volume por músculo · rolling 7d</p>
                <span className="text-[10px] text-[var(--text-dim)] tracking-wider tnum">
                  MV → MRV
                </span>
              </div>
              <div className="rounded-2xl bg-[var(--bg-card)] p-4">
                <VolumeCalculator data={volumeCalcData} />
              </div>
            </section>
          )}

          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-3">
              <p className="label">Volume · últimos 7 dias</p>
              <span className="text-[10px] text-[var(--text-dim)] tracking-wider">
                sets diretos
              </span>
            </div>
            {volumeRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-muted)]">
                Nenhum set nos últimos 7 dias.
              </div>
            ) : (
              <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)]">
                {volumeRows.map((row) => (
                  <VolumeBar
                    key={row.muscle}
                    row={row}
                    maxScale={maxVolumeBarSets}
                    userTargets={userTargets}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-3">
              <p className="label">Consistência · últimos 90 dias</p>
              <span className="text-[10px] text-[var(--text-dim)] tracking-wider tnum">
                {sessions.length} sessões
              </span>
            </div>
            <Heatmap
              days={days}
              sessionsByDay={sessionsByDay}
              completionByDay={completionByDay}
            />
          </section>

          {recentExercises.length > 0 && (
            <section className="mb-10">
              <div className="flex items-baseline justify-between mb-3">
                <p className="label">Exercícios recentes</p>
                <span className="text-[10px] text-[var(--text-dim)] tracking-wider">
                  30 dias
                </span>
              </div>
              <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
                {recentExercises.map((ex) => (
                  <li key={ex.id}>
                    <Link
                      href={`/progresso/exercicio/${ex.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[15px] leading-tight truncate">
                          {ex.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1 tnum flex items-center gap-2">
                          <span>{muscleLabel(ex.muscle)}</span>
                          <span className="text-[var(--text-faint)]">·</span>
                          <span>
                            {formatKg(ex.maxWeight)}kg × {ex.topRepsAtMax}
                          </span>
                          <span className="text-[var(--text-faint)]">·</span>
                          <span>e1RM {formatKg(ex.bestEstimated1RM)}</span>
                          {ex.weightDelta !== null && ex.weightDelta !== 0 && (
                            <>
                              <span className="text-[var(--text-faint)]">·</span>
                              <span
                                style={{
                                  color:
                                    ex.weightDelta > 0
                                      ? "var(--status-ready)"
                                      : "var(--status-stalled)",
                                }}
                              >
                                {ex.weightDelta > 0 ? "+" : ""}
                                {formatKg(ex.weightDelta)}kg
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        strokeWidth={1.75}
                        className="shrink-0 text-[var(--text-dim)]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
        Sem dados ainda
      </p>
      <h2 className="display-sm text-2xl mb-3">Nada pra medir</h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
        A partir da sua primeira sessão finalizada, esta tela passa a mostrar
        volume, força e consistência dos últimos 90 dias.
      </p>
    </div>
  );
}

function findClosestWeight(
  series: Array<{ date: string; weightKg: number }>,
  target: Date
): { date: string; weightKg: number } | null {
  if (series.length === 0) return null;
  const targetMs = target.getTime();
  let best: { date: string; weightKg: number } | null = null;
  let bestDiff = Infinity;
  for (const entry of series) {
    const diff = Math.abs(new Date(entry.date).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }
  return best;
}

