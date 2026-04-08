import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [sessionsRes, setsRes] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, started_at, finished_at, duration_minutes")
      .not("finished_at", "is", null)
      .gte("started_at", ninetyDaysAgo.toISOString())
      .order("started_at", { ascending: false }),
    supabase
      .from("workout_sets")
      .select(
        "id, exercise_id, weight_kg, reps, rir, performed_at, exercises(id, name, primary_muscle)"
      )
      .eq("is_warmup", false)
      .gte("performed_at", thirtyDaysAgo.toISOString())
      .order("performed_at", { ascending: false }),
  ]);

  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const sets = (setsRes.data ?? []) as SetRow[];

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

  // --- Header stats ---
  const totalSessions30d = sessions.filter(
    (s) => new Date(s.started_at) >= thirtyDaysAgo
  ).length;
  const totalSets7d = last7dSets.length;
  const totalMinutes30d = sessions
    .filter((s) => new Date(s.started_at) >= thirtyDaysAgo)
    .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  const empty = sessions.length === 0;

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
          <section className="mb-8 grid grid-cols-3 gap-2">
            <TopStat label="Sessões 30d" value={totalSessions30d} />
            <TopStat label="Sets 7d" value={totalSets7d} />
            <TopStat
              label="Tempo 30d"
              value={Math.round(totalMinutes30d / 60)}
              suffix="h"
            />
          </section>

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
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <p className="label mb-2">{label}</p>
      <div className="display text-2xl tnum leading-none">
        {value}
        {suffix && (
          <span className="text-sm text-[var(--text-muted)] ml-0.5">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
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
