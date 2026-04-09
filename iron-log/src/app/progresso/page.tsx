import Link from "next/link";
import {
  ChevronRight,
  Flame,
  Footprints,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { muscleLabel } from "@/lib/muscles";
import {
  bandCssVar,
  dateKey,
  epley1RM,
  lastNDays,
  targetFor,
  volumeBand,
} from "@/lib/stats";
import { computeStreak } from "@/lib/streak";
import { getUserSettings } from "@/lib/settings";
import { WeightTrendChart } from "./WeightTrendChart";

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

type VolumeEntry = {
  muscle: string;
  sets: number;
  totalVolume: number;
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

  const [sessionsYearRes, setsRes, weightRes, cardioRes] = await Promise.all([
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
  ]);

  const allSessions = (sessionsYearRes.data ?? []) as SessionRow[];
  const sessions = allSessions.filter(
    (s) => new Date(s.started_at) >= ninetyDaysAgo
  );
  const sets = (setsRes.data ?? []) as SetRow[];
  const weights = (weightRes.data ?? []) as WeightRow[];
  const allCardio = (cardioRes.data ?? []) as CardioRow[];
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
  const maxVolumeBarSets =
    volumeRows.reduce(
      (max, r) => Math.max(max, r.sets, targetFor(r.muscle) * 1.5),
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
  const recentExercises = Array.from(activityMap.values())
    .sort(
      (a, b) =>
        new Date(b.lastPerformedAt).getTime() -
        new Date(a.lastPerformedAt).getTime()
    )
    .slice(0, 8);

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

  const empty = sessions.length === 0 && weightSeries.length === 0;

  return (
    <div className="px-6 pt-10">
      <header className="mb-8">
        <p className="label mb-2">Análise</p>
        <h1 className="display text-4xl leading-none">Progresso</h1>
      </header>

      {empty ? (
        <EmptyState />
      ) : (
        <>
          {/* Streak hero + comparison stats */}
          <section className="mb-6">
            <StreakHero
              current={streak.current}
              best={streak.best}
              todayActive={streak.todayActive}
            />
          </section>

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
            <TopStat
              label="Tempo 30d"
              value={Math.round(totalMinutes30d / 60)}
              prev={Math.round(totalMinutesPrev30d / 60)}
              suffix="h"
            />
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
            <Heatmap days={days} sessionsByDay={sessionsByDay} />
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

function TopStat({
  label,
  value,
  prev,
  suffix = "",
}: {
  label: string;
  value: number;
  prev?: number;
  suffix?: string;
}) {
  const delta =
    typeof prev === "number" && prev > 0 ? value - prev : null;
  const pct =
    delta !== null && prev && prev > 0 ? Math.round((delta / prev) * 100) : null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <p className="label mb-2">{label}</p>
      <div className="display text-2xl tnum leading-none mb-2">
        {value}
        {suffix && (
          <span className="text-sm text-[var(--text-muted)] ml-0.5">
            {suffix}
          </span>
        )}
      </div>
      {pct !== null && (
        <PercentChip pct={pct} />
      )}
    </div>
  );
}

function CardioStat({
  label,
  value,
  suffix,
  delta,
}: {
  label: string;
  value: string;
  suffix: string;
  delta: number | null;
}) {
  return (
    <div>
      <p className="label mb-1.5">{label}</p>
      <div className="display-sm text-2xl tnum leading-none">
        {value}
        {suffix && (
          <span className="text-xs text-[var(--text-muted)] ml-0.5">
            {suffix}
          </span>
        )}
      </div>
      {delta !== null && Number.isFinite(delta) && (
        <div className="mt-2">
          <PercentChip pct={delta} />
        </div>
      )}
    </div>
  );
}

function PercentChip({ pct }: { pct: number }) {
  // Positive trend for strength/sessions is green, negative is rose.
  const isUp = pct > 0;
  const isDown = pct < 0;
  const color = isUp
    ? "var(--status-ready)"
    : isDown
      ? "var(--status-stalled)"
      : "var(--text-dim)";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] tnum font-semibold tracking-wider"
      style={{ color }}
    >
      {Icon && <Icon size={10} strokeWidth={2} />}
      {isUp ? "+" : ""}
      {pct}%
    </span>
  );
}

function DeltaChip({
  delta,
  label,
  inverted,
}: {
  delta: number | null;
  label: string;
  /**
   * When inverted is true, negative delta is "good" (e.g., weight loss).
   * When false, positive delta is "good" (e.g., volume up). For body weight
   * this is user-dependent — default to neutral (false means neutral here)
   * since we don't know if the user is bulking or cutting.
   */
  inverted: boolean;
}) {
  if (delta === null) {
    return (
      <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
        <p className="mb-1">{label}</p>
        <span>—</span>
      </div>
    );
  }
  // Neutral color for weight since bulking vs cutting is context-dependent.
  // We indicate direction via the arrow only, without positive/negative mood.
  const sign = delta > 0 ? "+" : "";
  const color = inverted
    ? delta < 0
      ? "var(--status-ready)"
      : delta > 0
        ? "var(--status-stalled)"
        : "var(--text-dim)"
    : "var(--text-soft)";
  return (
    <div>
      <p className="label mb-1">{label}</p>
      <span
        className="inline-flex items-center gap-0.5 text-xs tnum tabular-nums"
        style={{ color }}
      >
        {sign}
        {delta.toFixed(1)}kg
      </span>
    </div>
  );
}

function TargetChip({
  target,
  current,
}: {
  target: number;
  current: number;
}) {
  const delta = current - target;
  const reached = Math.abs(delta) < 0.05;
  const sign = delta > 0 ? "+" : "";
  return (
    <div>
      <p className="label mb-1">Meta</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm tnum tabular-nums text-[var(--text-soft)]">
          {target.toFixed(1)}kg
        </span>
        {reached ? (
          <span className="text-[10px] tnum uppercase tracking-wider text-[var(--status-ready)]">
            atingida
          </span>
        ) : (
          <span className="text-[10px] tnum text-[var(--text-dim)]">
            ({sign}
            {delta.toFixed(1)})
          </span>
        )}
      </div>
    </div>
  );
}

function StreakHero({
  current,
  best,
  todayActive,
}: {
  current: number;
  best: number;
  todayActive: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="flex items-center gap-2 mb-2">
        <Flame
          size={14}
          strokeWidth={1.75}
          className="text-[var(--status-ready)]"
        />
        <p className="label">Streak</p>
      </div>
      <div className="flex items-baseline gap-4">
        <div>
          <div className="display text-5xl tnum leading-none">
            {current}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase mt-1.5">
            {current === 1 ? "dia" : "dias"} consecutivos
          </p>
        </div>
        {best > 0 && (
          <div className="pl-4 border-l border-[var(--border)]">
            <div className="display-sm text-2xl tnum leading-none text-[var(--text-soft)]">
              {best}
            </div>
            <p className="text-[10px] text-[var(--text-dim)] tracking-wider uppercase mt-1.5">
              melhor
            </p>
          </div>
        )}
      </div>
      {current > 0 && !todayActive && (
        <p className="text-[11px] text-[var(--text-muted)] mt-3">
          Hoje ainda não conta. Qualquer treino ou caminhada mantém o streak.
        </p>
      )}
      {current === 0 && (
        <p className="text-[11px] text-[var(--text-muted)] mt-3">
          Comece a registrar — qualquer treino ou caminhada conta como dia
          ativo.
        </p>
      )}
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

function VolumeBar({
  row,
  maxScale,
}: {
  row: VolumeEntry;
  maxScale: number;
}) {
  const target = targetFor(row.muscle);
  const band = volumeBand(row.sets, target);
  const color = bandCssVar(band);
  const width = Math.min(100, (row.sets / maxScale) * 100);
  const targetPct = target > 0 ? Math.min(100, (target / maxScale) * 100) : 0;

  return (
    <li className="px-4 py-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-medium">
          {muscleLabel(row.muscle)}
        </span>
        <span className="text-xs text-[var(--text-muted)] tnum">
          {row.sets}
          {target > 0 && (
            <span className="text-[var(--text-dim)]"> / {target}</span>
          )}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-[var(--bg-raised)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${width}%`, background: color }}
        />
        {target > 0 && (
          <div
            className="absolute inset-y-0 w-px bg-[var(--text-dim)]"
            style={{ left: `${targetPct}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </li>
  );
}

function Heatmap({
  days,
  sessionsByDay,
}: {
  days: Array<{ key: string; date: Date }>;
  sessionsByDay: Map<string, { count: number; minutes: number }>;
}) {
  // 13 columns × ~7 rows fits 90 days comfortably. Oldest on the left,
  // most recent bottom-right.
  const cells = days.map((d) => {
    const entry = sessionsByDay.get(d.key);
    const count = entry?.count ?? 0;
    const minutes = entry?.minutes ?? 0;
    let opacity = 0;
    if (count > 0) {
      // Scale by minutes (20min → 0.35, 60min → 0.85, 90+ → 1)
      opacity = Math.min(1, 0.35 + (minutes / 90) * 0.65);
    }
    return { ...d, count, minutes, opacity };
  });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="grid grid-cols-[repeat(13,1fr)] gap-1">
        {cells.map((c) => (
          <div
            key={c.key}
            title={`${c.key} — ${c.count} sessão${c.count === 1 ? "" : "es"}${
              c.minutes > 0 ? ` · ${c.minutes}min` : ""
            }`}
            className="aspect-square rounded-[3px] border border-[var(--border)]"
            style={{
              background:
                c.count > 0
                  ? `color-mix(in oklab, var(--status-ready) ${
                      c.opacity * 100
                    }%, transparent)`
                  : "transparent",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--text-dim)] tracking-wider uppercase">
        <span>Menos</span>
        <div className="flex gap-1">
          {[0, 0.35, 0.6, 0.85, 1].map((o, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[2px] border border-[var(--border)]"
              style={{
                background:
                  o > 0
                    ? `color-mix(in oklab, var(--status-ready) ${o * 100}%, transparent)`
                    : "transparent",
              }}
            />
          ))}
        </div>
        <span>Mais</span>
      </div>
    </div>
  );
}

function formatKg(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
