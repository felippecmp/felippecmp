import Link from "next/link";
import {
  ArrowRight,
  Flame,
  Play,
  Settings as SettingsIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/streak";
import { userDayKey } from "@/lib/timezone";
import { Sparkline } from "@/components/Sparkline";
import { DiaryRow, type DiaryEntry } from "./DiaryRow";
import { TodayChecklist } from "./TodayChecklist";
import { NotaDescansoRow } from "./NotaDescansoRow";
import { WeeklyRecap } from "./WeeklyRecap";

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

function greeting(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Always compute day buckets in the user's timezone (not the server's), so
// "today" doesn't roll over at midnight UTC while the user is still on
// their local previous day. See src/lib/timezone.ts.
const localDayKey = userDayKey;

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
  notes: string | null;
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

type DailyNoteRow = {
  id: string;
  note_date: string;
  body: string;
  updated_at: string;
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
    { data: templatesData },
    { data: restDayRows },
    { data: dailyNoteRows },
    { data: activeSessionData },
  ] = await Promise.all([
    supabase.from("exercises").select("*", { count: "exact", head: true }),
    supabase
      .from("workout_sessions")
      .select(
        "id, started_at, duration_minutes, avg_heart_rate, overall_feeling, notes, workout_templates(name)"
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
    supabase
      .from("workout_templates")
      .select("id, name, session_type, sort_order, template_exercises(count)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("rest_days")
      .select("rest_date")
      .order("rest_date", { ascending: false })
      .limit(60),
    supabase
      .from("daily_notes")
      .select("id, note_date, body, updated_at")
      .order("note_date", { ascending: false })
      .limit(60),
    supabase
      .from("workout_sessions")
      .select("id, started_at, template_id, workout_templates(name, session_type)")
      .is("finished_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { weekday, day, month } = formatHeaderDate(now);
  const greet = greeting(now.getHours());

  // Active session (workout in progress)
  const activeSession = activeSessionData
    ? {
        id: activeSessionData.id as string,
        startedAt: activeSessionData.started_at as string,
        templateName: (() => {
          const t = activeSessionData.workout_templates;
          if (!t) return "Sessão";
          return Array.isArray(t) ? t[0]?.name ?? "Sessão" : (t as { name: string }).name;
        })(),
      }
    : null;

  const strengthSessions = (strengthYear ?? []) as StrengthSessionRow[];
  const cardioSessions = (cardioYear ?? []) as CardioRow[];
  const weights = (weightRows ?? []) as WeightRow[];
  const stepsData = (stepsRows ?? []) as StepsRow[];
  const dailyNotes = (dailyNoteRows ?? []) as DailyNoteRow[];
  const todayNote = dailyNotes.find((n) => n.note_date === todayKey) ?? null;

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

  const restDays = (restDayRows ?? []) as Array<{ rest_date: string }>;
  const isRestDayToday = restDays.some((r) => r.rest_date === todayKey);

  // Today's checklist hits — same goal definitions as the heatmap on /progresso.
  const hasWeightToday = !!todayWeight;
  const hasStrengthToday = strengthSessions.some(
    (s) => localDayKey(new Date(s.started_at)) === todayKey
  );
  const hasCardioToday = cardioSessions.some(
    (c) => localDayKey(new Date(c.started_at)) === todayKey
  );
  const hasStepsToday = (todaySteps?.steps ?? 0) >= 8000;

  // --- Weekly recap (rolling 7 days, only rendered Sunday/Monday) ---
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // inclusive 7-day window
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recapDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon
  const showRecap = recapDayOfWeek === 0 || recapDayOfWeek === 1;

  let recapStrength = 0;
  let recapCardio = 0;
  let recapGlowDays = 0;
  let recapWeightDelta: number | null = null;

  if (showRecap) {
    const last7Strength = strengthSessions.filter(
      (s) => new Date(s.started_at) >= sevenDaysAgo
    );
    const last7Cardio = cardioSessions.filter(
      (c) => new Date(c.started_at) >= sevenDaysAgo
    );
    recapStrength = last7Strength.length;
    recapCardio = last7Cardio.length;

    // Glow day count: walk the 7 days and recompute the same checklist hit/max
    // logic that the heatmap uses. A "glow day" is hit === max.
    const strengthDayKeys = new Set(
      last7Strength.map((s) => localDayKey(new Date(s.started_at)))
    );
    const cardioDayKeys = new Set(
      last7Cardio.map((c) => localDayKey(new Date(c.started_at)))
    );
    const weightDayKeys = new Set(
      weights
        .filter((w) => new Date(w.recorded_at) >= sevenDaysAgo)
        .map((w) => localDayKey(new Date(w.recorded_at)))
    );
    const stepsDayMap = new Map<string, number>();
    for (const s of stepsData) {
      stepsDayMap.set(s.step_date, s.steps);
    }
    const restDayKeys = new Set(restDays.map((r) => r.rest_date));

    for (let i = 0; i < 7; i++) {
      const probe = new Date(sevenDaysAgo);
      probe.setDate(probe.getDate() + i);
      const k = localDayKey(probe);
      const isRest = restDayKeys.has(k);
      let hit = 0;
      if (weightDayKeys.has(k)) hit++;
      if (cardioDayKeys.has(k)) hit++;
      if ((stepsDayMap.get(k) ?? 0) >= 8000) hit++;
      if (!isRest && strengthDayKeys.has(k)) hit++;
      const max = isRest ? 3 : 4;
      if (hit >= max) recapGlowDays++;
    }

    // Weight delta: latest weight in window minus oldest weight in window.
    const weightsInWindow = weights
      .filter((w) => new Date(w.recorded_at) >= sevenDaysAgo)
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime()
      );
    if (weightsInWindow.length >= 2) {
      const first = Number(weightsInWindow[0].weight_kg);
      const last = Number(weightsInWindow[weightsInWindow.length - 1].weight_kg);
      recapWeightDelta = Math.round((last - first) * 10) / 10;
    }
  }

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
      notes: s.notes,
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
    // Dedupe: only the most recent weight entry per day shows in the diary.
    // (weights is already sorted by recorded_at desc.)
    ...(() => {
      const seen = new Set<string>();
      const out: DiaryEntry[] = [];
      for (const w of weights) {
        const dayK = localDayKey(new Date(w.recorded_at));
        if (seen.has(dayK)) continue;
        seen.add(dayK);
        out.push({
          kind: "weight",
          id: w.id,
          at: w.recorded_at,
          weightKg: Number(w.weight_kg),
        });
        if (out.length >= 20) break;
      }
      return out;
    })(),
    ...stepsData.slice(0, 20).map<DiaryEntry>((s) => ({
      kind: "steps",
      id: s.id,
      // step_date is YYYY-MM-DD; place at noon so it sorts mid-day.
      at: `${s.step_date}T12:00:00`,
      steps: s.steps,
    })),
    ...dailyNotes.slice(0, 20).map<DiaryEntry>((n) => ({
      kind: "note",
      id: n.id,
      // note_date is YYYY-MM-DD; place near end of day so it sorts last
      // within the day, after the workouts.
      at: `${n.note_date}T22:00:00`,
      body: n.body,
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

  // Quick next-template hint for the Home CTA. The full rotation logic
  // (auto vs linear, with full state) lives in /treinar — this is just a
  // preview using the same simple heuristic: opposite of last session
  // type, first by sort_order. With one template, picks that one.
  type TemplateLite = {
    id: string;
    name: string;
    session_type: "upper" | "lower";
    exercise_count: number;
  };
  const templates: TemplateLite[] = (templatesData ?? []).map((t) => {
    const count = Array.isArray(t.template_exercises)
      ? (t.template_exercises[0] as { count: number } | undefined)?.count ?? 0
      : 0;
    return {
      id: t.id,
      name: t.name,
      session_type: t.session_type,
      exercise_count: count,
    };
  });

  // Quick stats for the home header area
  const sessions7d = strengthSessions.filter(
    (s) => new Date(s.started_at) >= sevenDaysAgo
  ).length;
  const cardio7d = cardioSessions.filter(
    (c) => new Date(c.started_at) >= sevenDaysAgo
  ).length;

  const nextTemplate: TemplateLite | null = (() => {
    if (templates.length === 0) return null;
    // No history → first template
    if (strengthSessions.length === 0) return templates[0];
    // Last finished session's template name → look it up to get type
    const lastTplName = (() => {
      const t = strengthSessions[0]?.workout_templates;
      if (!t) return null;
      return Array.isArray(t) ? t[0]?.name ?? null : t.name;
    })();
    const lastTpl = templates.find((t) => t.name === lastTplName);
    const targetType: "upper" | "lower" =
      lastTpl?.session_type === "upper" ? "lower" : "upper";
    const ofType = templates.filter((t) => t.session_type === targetType);
    return ofType[0] ?? templates[0];
  })();

  // Sparkline data: daily counts for last 7 days
  const sparkStrength: number[] = [];
  const sparkCardio: number[] = [];
  const sparkWeight: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = localDayKey(d);
    sparkStrength.push(
      strengthSessions.filter((s) => localDayKey(new Date(s.started_at)) === k).length
    );
    sparkCardio.push(
      cardioSessions.filter((c) => localDayKey(new Date(c.started_at)) === k).length
    );
    const wt = weights.find((w) => localDayKey(new Date(w.recorded_at)) === k);
    sparkWeight.push(wt ? Number(wt.weight_kg) : 0);
  }
  // Fill weight gaps (carry forward)
  for (let i = 1; i < sparkWeight.length; i++) {
    if (sparkWeight[i] === 0 && sparkWeight[i - 1] > 0) sparkWeight[i] = sparkWeight[i - 1];
  }

  return (
    <div className="px-6 pt-10">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-1 tnum">
            {weekday}, {day} de {month}
          </p>
          <h1 className="display text-[32px] leading-none tracking-tighter">
            {greet}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {streak.current > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--status-ready)]/15">
              <Flame size={14} strokeWidth={2} className="text-[var(--status-ready)]" />
              <span className="text-sm font-bold tnum text-[var(--status-ready)]">{streak.current}</span>
            </div>
          )}
          <Link
            href="/settings"
            aria-label="Configurações"
            className="shrink-0 w-10 h-10 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
          >
            <SettingsIcon size={16} strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      {/* Active session — pulsing accent gradient, dominates the screen */}
      {activeSession && (
        <Link
          href={`/workout/${activeSession.id}`}
          className="block mb-6 rounded-2xl p-5 relative overflow-hidden active:scale-[0.98] transition-transform"
          style={{ background: `linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 70%, var(--bg)))` }}
        >
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-wider font-bold text-[var(--accent-fg)]/70 mb-2">
              Em andamento
            </p>
            <p className="display text-[28px] leading-none text-[var(--accent-fg)]">
              {activeSession.templateName}
            </p>
            <p className="text-sm text-[var(--accent-fg)]/60 tnum mt-2">
              Iniciado{" "}
              {new Date(activeSession.startedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <ArrowRight size={24} strokeWidth={2.5} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--accent-fg)]/40" />
        </Link>
      )}

      {/* Hero CTA — gradient button, big template name */}
      {!activeSession && !firstRun && nextTemplate && (
        <section className="mb-6">
          <div className="rounded-2xl bg-[var(--bg-card)] overflow-hidden">
            <div className="p-6 pb-5">
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-3">
                {nextTemplate.session_type === "upper" ? "Upper" : "Lower"} · {nextTemplate.exercise_count} exercícios
              </p>
              <h2 className="display text-[36px] leading-none tracking-tighter">
                {nextTemplate.name}
              </h2>
            </div>
            <Link
              href="/treinar"
              className="flex items-center justify-center gap-2 font-bold text-[15px] py-4 transition-all active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 75%, var(--bg)))`, color: "var(--accent-fg)" }}
            >
              <Play size={16} strokeWidth={2.5} fill="currentColor" />
              Iniciar treino
            </Link>
          </div>
        </section>
      )}

      {!activeSession && firstRun && (
        <section className="mb-6 rounded-2xl bg-[var(--bg-card)] p-6">
          <h2 className="display text-2xl mb-2">Ainda vazio</h2>
          <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
            Cadastre exercícios, monte um template e inicie.
          </p>
          <Link href="/exercicios" className="group inline-flex items-center gap-2 text-[var(--text)] font-semibold text-sm">
            Configurar exercícios
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </section>
      )}

      {!activeSession && !firstRun && !nextTemplate && (
        <section className="mb-6 rounded-2xl bg-[var(--bg-card)] p-6">
          <p className="text-sm text-[var(--text-muted)] mb-4">Crie seu primeiro template para começar.</p>
          <Link href="/templates/novo" className="block w-full text-center font-semibold py-3.5 rounded-xl" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
            Criar template
          </Link>
        </section>
      )}

      {/* Stats — big numbers with sparklines */}
      {!firstRun && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <Link href="/progresso" className="rounded-2xl bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-hover)] transition-colors">
            <div className="flex items-start justify-between">
              <p className="display text-[28px] tnum leading-none" style={{ color: "var(--status-ready)" }}>{sessions7d}</p>
              <Sparkline values={sparkStrength} color="var(--status-ready)" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-2">treinos</p>
          </Link>
          <Link href="/cardio" className="rounded-2xl bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-hover)] transition-colors">
            <div className="flex items-start justify-between">
              <p className="display text-[28px] tnum leading-none" style={{ color: "var(--status-stalled)" }}>{cardio7d}</p>
              <Sparkline values={sparkCardio} color="var(--status-stalled)" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-2">cardio</p>
          </Link>
          <Link href="/peso" className="rounded-2xl bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-hover)] transition-colors">
            <div className="flex items-start justify-between">
              <p className="display text-[28px] tnum leading-none" style={{ color: "var(--status-progressed)" }}>
                {latestWeight ? `${Number(latestWeight.weight_kg).toFixed(1)}` : "—"}
              </p>
              <Sparkline values={sparkWeight.some((v) => v > 0) ? sparkWeight : []} color="var(--status-progressed)" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-2">peso</p>
          </Link>
        </div>
      )}

      {/* Today's checklist */}
      {!firstRun && (
        <TodayChecklist
          hasWeight={hasWeightToday}
          hasStrength={hasStrengthToday}
          hasCardio={hasCardioToday}
          hasSteps={hasStepsToday}
          isRestDay={isRestDayToday}
          todayWeightKg={
            todayWeight ? Number(todayWeight.weight_kg) : null
          }
          todayStepsCount={todaySteps?.steps ?? null}
          latestWeightKg={
            latestWeight ? Number(latestWeight.weight_kg) : null
          }
          todayKey={todayKey}
        />
      )}

      {/* Nota + descanso */}
      {!firstRun && (
        <NotaDescansoRow
          todayNote={
            todayNote
              ? {
                  id: todayNote.id,
                  body: todayNote.body,
                  noteDate: todayNote.note_date,
                }
              : null
          }
          isRestDay={isRestDayToday}
          todayKey={todayKey}
        />
      )}

      {/* Weekly recap — Sunday + Monday only */}
      {showRecap && !firstRun && (
        <WeeklyRecap
          strengthSessions={recapStrength}
          cardioSessions={recapCardio}
          glowDays={recapGlowDays}
          weightDelta={recapWeightDelta}
        />
      )}

      {/* Diary timeline */}
      {dayKeys.length > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <p className="label">Diário</p>
            <Link
              href="/progresso"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Análise →
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

function formatDayLabel(key: string): string {
  // The key is YYYY-MM-DD in user TZ. Compare against today (also in user TZ)
  // by string comparison; for the relative label fall back to date math.
  const todayKey = userDayKey(new Date());
  if (key === todayKey) return "Hoje";

  // Parse the YYYY-MM-DD into a Date by anchoring at noon UTC, which keeps
  // the day-of-month stable regardless of which TZ formats it later.
  const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const today = new Date(
    Date.UTC(
      parseInt(todayKey.slice(0, 4), 10),
      parseInt(todayKey.slice(5, 7), 10) - 1,
      parseInt(todayKey.slice(8, 10), 10),
      12,
      0,
      0
    )
  );
  const diff = Math.round(
    (today.getTime() - date.getTime()) / 86400000
  );
  if (diff === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

