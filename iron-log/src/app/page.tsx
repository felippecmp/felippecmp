import Link from "next/link";
import {
  ArrowRight,
  Dumbbell,
  Flame,
  Footprints,
  Layers,
  Scale,
  Settings as SettingsIcon,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/streak";
import { QuickWeightAdd } from "./QuickWeightAdd";
import { QuickStepsAdd } from "./QuickStepsAdd";

export const dynamic = "force-dynamic";

const WEEKDAYS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

function formatHeaderDate(date: Date) {
  const weekday = WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = date.toLocaleDateString("pt-BR", { month: "long" });
  return { weekday, day, month };
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

type WeightRow = {
  id: string;
  weight_kg: number | string;
  recorded_at: string;
};

type StrengthSessionRow = {
  id: string;
  started_at: string;
  duration_minutes: number | null;
  avg_heart_rate: number | null;
  overall_feeling: number | null;
  workout_templates: { name: string } | { name: string }[] | null;
};

type CardioRow = {
  id: string;
  activity_type: string;
  started_at: string;
  duration_seconds: number;
  distance_km: number | string | null;
  avg_heart_rate: number | null;
};

type StepsRow = {
  id: string;
  step_date: string;
  steps: number;
};

type DiaryEntry =
  | {
      kind: "strength";
      id: string;
      at: string;
      templateName: string | null;
      durationMinutes: number | null;
      avgHr: number | null;
      feeling: number | null;
    }
  | {
      kind: "cardio";
      id: string;
      at: string;
      activityType: string;
      durationSeconds: number;
      distanceKm: number | null;
      avgHr: number | null;
    }
  | {
      kind: "weight";
      id: string;
      at: string;
      weightKg: number;
    }
  | {
      kind: "steps";
      id: string;
      at: string;
      steps: number;
    };

const FEELING_SHORT: Record<number, string> = {
  1: "fraco",
  2: "ok",
  3: "bom",
  4: "forte",
  5: "PR",
};

const CARDIO_TYPE_LABELS: Record<string, string> = {
  walking: "Caminhada",
  running: "Corrida",
  cycling: "Bike",
  other: "Cardio",
};

export default async function HomePage() {
  const supabase = await createClient();
  const now = new Date();
  const todayKey = localDayKey(now);

  const [
    ,
    { data: strengthYear },
    { data: cardioYear },
    { data: weightRows },
    { data: stepsRows },
  ] = await Promise.all([
    supabase.from("exercises").select("*", { count: "exact", head: true }),
    supabase
      .from("workout_sessions")
      .select(
        "id, started_at, duration_minutes, avg_heart_rate, overall_feeling, workout_templates(name)"
      )
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(200),
    supabase
      .from("cardio_sessions")
      .select(
        "id, activity_type, started_at, duration_seconds, distance_km, avg_heart_rate"
      )
      .order("started_at", { ascending: false })
      .limit(200),
    supabase
      .from("body_weight_entries")
      .select("id, weight_kg, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(60),
    supabase
      .from("daily_steps")
      .select("id, step_date, steps")
      .order("step_date", { ascending: false })
      .limit(60),
  ]);

  const { weekday, day, month } = formatHeaderDate(now);
  const strengthSessions = (strengthYear ?? []) as StrengthSessionRow[];
  const cardioSessions = (cardioYear ?? []) as CardioRow[];
  const weights = (weightRows ?? []) as WeightRow[];
  const stepsData = (stepsRows ?? []) as StepsRow[];

  // Streak = days with any strength OR cardio activity.
  const streak = computeStreak({
    activeTimestamps: [
      ...strengthSessions.map((s) => s.started_at),
      ...cardioSessions.map((c) => c.started_at),
    ],
    today: now,
  });

  // Body weight for today (if any) and latest overall
  const todayWeight = weights.find(
    (w) => localDayKey(new Date(w.recorded_at)) === todayKey
  );
  const latestWeight = weights[0];

  const todaySteps = stepsData.find((s) => s.step_date === todayKey);

  // Build unified diary entries sorted by timestamp desc, grouped by day.
  const diary: DiaryEntry[] = [
    ...strengthSessions.slice(0, 30).map<DiaryEntry>((s) => ({
      kind: "strength",
      id: s.id,
      at: s.started_at,
      templateName: Array.isArray(s.workout_templates)
        ? s.workout_templates[0]?.name ?? null
        : (s.workout_templates as { name: string } | null)?.name ?? null,
      durationMinutes: s.duration_minutes,
      avgHr: s.avg_heart_rate,
      feeling: s.overall_feeling,
    })),
    ...cardioSessions.slice(0, 30).map<DiaryEntry>((c) => ({
      kind: "cardio",
      id: c.id,
      at: c.started_at,
      activityType: c.activity_type,
      durationSeconds: c.duration_seconds,
      distanceKm: c.distance_km !== null ? Number(c.distance_km) : null,
      avgHr: c.avg_heart_rate,
    })),
    ...weights.slice(0, 20).map<DiaryEntry>((w) => ({
      kind: "weight",
      id: w.id,
      at: w.recorded_at,
      weightKg: Number(w.weight_kg),
    })),
    ...stepsData.slice(0, 20).map<DiaryEntry>((s) => ({
      kind: "steps",
      id: s.id,
      // step_date is YYYY-MM-DD; place at noon so it sorts mid-day.
      at: `${s.step_date}T12:00:00`,
      steps: s.steps,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // Group by day key for the diary render
  const days = new Map<string, DiaryEntry[]>();
  for (const entry of diary) {
    const key = localDayKey(new Date(entry.at));
    const arr = days.get(key) ?? [];
    arr.push(entry);
    days.set(key, arr);
  }
  const dayKeys = Array.from(days.keys()).slice(0, 14);

  const firstRun =
    strengthSessions.length === 0 &&
    cardioSessions.length === 0 &&
    weights.length === 0;

  return (
    <div className="px-6 pt-10">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="label mb-2">{weekday}</p>
          <h1 className="display text-[44px] leading-[1.05] tracking-tighter">
            Felippe&apos;s
            <br />
            Log
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-3 tnum">
            {day} de {month}
          </p>
        </div>
        <Link
          href="/settings"
          aria-label="Configurações"
          className="shrink-0 w-10 h-10 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] flex items-center justify-center transition-colors"
        >
          <SettingsIcon size={16} strokeWidth={1.75} />
        </Link>
      </header>

      {/* Streak line — discreet, above the CTA */}
      {streak.current > 0 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Flame
            size={12}
            strokeWidth={1.75}
            className="text-[var(--status-ready)]"
          />
          <span className="tnum">
            streak {streak.current} {streak.current === 1 ? "dia" : "dias"}
          </span>
          {streak.best > streak.current && (
            <span className="text-[var(--text-dim)] tnum">
              · melhor {streak.best}
            </span>
          )}
          {!streak.todayActive && (
            <span className="text-[var(--text-dim)]">
              · hoje ainda tá em aberto
            </span>
          )}
        </div>
      )}

      {/* Primary CTA card */}
      <section className="mb-6">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6">
          <p className="label mb-3">Próximo treino</p>
          {firstRun ? (
            <>
              <h2 className="display-sm text-2xl mb-1">Ainda vazio</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
                Para começar, cadastre seus exercícios, monte um template de
                rotina e inicie sua primeira sessão. Você também pode
                registrar um peso corporal ou uma caminhada.
              </p>
              <Link
                href="/exercicios"
                className="group inline-flex items-center gap-2 text-[var(--text)] font-semibold text-sm"
              >
                Configurar exercícios
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                A sugestão aparece dentro da tela de treinar.
              </p>
              <Link
                href="/treinar"
                className="block w-full text-center bg-accent text-accent-fg font-semibold py-3.5 rounded-xl hover:bg-accent-hover transition-colors"
              >
                Iniciar sessão
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Quick-adds row */}
      <section className="mb-6">
        <QuickWeightAdd
          todayWeight={
            todayWeight
              ? {
                  id: todayWeight.id,
                  weightKg: Number(todayWeight.weight_kg),
                  recordedAt: todayWeight.recorded_at,
                }
              : null
          }
          latestWeight={
            !todayWeight && latestWeight
              ? {
                  weightKg: Number(latestWeight.weight_kg),
                  recordedAt: latestWeight.recorded_at,
                }
              : null
          }
        />
        <div className="mt-3">
          <QuickStepsAdd
            todaySteps={
              todaySteps
                ? {
                    id: todaySteps.id,
                    steps: todaySteps.steps,
                    stepDate: todaySteps.step_date,
                  }
                : null
            }
          />
        </div>
      </section>

      <section className="mb-10 grid grid-cols-2 gap-3">
        <Link
          href="/cardio"
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm hover:border-[var(--border-strong)] transition-colors"
        >
          <Footprints
            size={14}
            strokeWidth={1.75}
            className="text-[var(--text-soft)]"
          />
          <span>Cardio</span>
          <ArrowRight
            size={12}
            strokeWidth={1.75}
            className="ml-auto text-[var(--text-dim)]"
          />
        </Link>
        <Link
          href="/templates"
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm hover:border-[var(--border-strong)] transition-colors"
        >
          <Layers
            size={14}
            strokeWidth={1.75}
            className="text-[var(--text-soft)]"
          />
          <span>Templates</span>
          <ArrowRight
            size={12}
            strokeWidth={1.75}
            className="ml-auto text-[var(--text-dim)]"
          />
        </Link>
      </section>

      {/* Diary timeline */}
      {dayKeys.length > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <p className="label">Diário</p>
            <Link
              href="/progresso"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Análise
            </Link>
          </div>

          <div className="space-y-5">
            {dayKeys.map((key) => {
              const entries = days.get(key) ?? [];
              return (
                <div key={key}>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] tnum mb-2">
                    {formatDayLabel(key)}
                  </p>
                  <ul className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
                    {entries.map((entry) => (
                      <DiaryRow key={`${entry.kind}-${entry.id}`} entry={entry} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function DiaryRow({ entry }: { entry: DiaryEntry }) {
  switch (entry.kind) {
    case "strength": {
      const Icon = Dumbbell;
      return (
        <li>
          <Link
            href={`/workout/${entry.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Icon
              size={14}
              strokeWidth={1.75}
              className="shrink-0 text-[var(--text-soft)]"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {entry.templateName ?? "Treino de força"}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5 tnum">
                {entry.durationMinutes
                  ? `${entry.durationMinutes} min`
                  : "—"}
                {entry.avgHr && (
                  <>
                    <span className="text-[var(--text-faint)]"> · </span>
                    HR {entry.avgHr}
                  </>
                )}
                {entry.feeling !== null && (
                  <>
                    <span className="text-[var(--text-faint)]"> · </span>
                    {FEELING_SHORT[entry.feeling] ?? entry.feeling}
                  </>
                )}
              </div>
            </div>
            <span className="text-[11px] tnum text-[var(--text-dim)] tabular-nums">
              {formatHM(entry.at)}
            </span>
          </Link>
        </li>
      );
    }
    case "cardio": {
      const Icon = Footprints;
      return (
        <li>
          <Link
            href={`/cardio/${entry.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Icon
              size={14}
              strokeWidth={1.75}
              className="shrink-0 text-[var(--text-soft)]"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {CARDIO_TYPE_LABELS[entry.activityType] ?? "Cardio"}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5 tnum">
                {Math.round(entry.durationSeconds / 60)} min
                {entry.distanceKm !== null && (
                  <>
                    <span className="text-[var(--text-faint)]"> · </span>
                    {entry.distanceKm.toFixed(2)} km
                  </>
                )}
                {entry.avgHr && (
                  <>
                    <span className="text-[var(--text-faint)]"> · </span>
                    HR {entry.avgHr}
                  </>
                )}
              </div>
            </div>
            <span className="text-[11px] tnum text-[var(--text-dim)] tabular-nums">
              {formatHM(entry.at)}
            </span>
          </Link>
        </li>
      );
    }
    case "weight": {
      return (
        <li>
          <Link
            href="/peso"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Scale
              size={14}
              strokeWidth={1.75}
              className="shrink-0 text-[var(--text-soft)]"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">
                Peso:{" "}
                <span className="tnum tabular-nums">
                  {entry.weightKg.toFixed(1)} kg
                </span>
              </div>
            </div>
            <span className="text-[11px] tnum text-[var(--text-dim)] tabular-nums">
              {formatHM(entry.at)}
            </span>
          </Link>
        </li>
      );
    }
    case "steps": {
      return (
        <li className="flex items-center gap-3 px-4 py-3">
          <TrendingUp
            size={14}
            strokeWidth={1.75}
            className="shrink-0 text-[var(--text-soft)]"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              <span className="tnum tabular-nums">
                {entry.steps.toLocaleString("pt-BR")}
              </span>{" "}
              passos
              {entry.steps >= 8000 && (
                <span className="text-[10px] ml-1.5 text-[var(--status-ready)]">
                  meta
                </span>
              )}
            </div>
          </div>
        </li>
      );
    }
  }
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatHM(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
