import Link from "next/link";
import {
  ChevronRight,
  Play,
  Settings as SettingsIcon,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/streak";
import { muscleLabel } from "@/lib/muscles";
import { userDayKey } from "@/lib/timezone";
import type { DayPeekData } from "@/components/DayPeek";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Ring } from "@/components/Ring";
import { Sparkline } from "@/components/Sparkline";
import { StreakHero } from "@/components/StreakHero";
import type { WorkoutRecapData } from "@/components/WorkoutRecap";
import { WeeklyBars } from "./progresso/components/WeeklyBars";
import { DiaryRow, type DiaryEntry } from "./DiaryRow";
import { HomeStreakAndWeek } from "./HomeStreakAndWeek";
import { LastWorkoutCard } from "./LastWorkoutCard";
import { TodayChecklist } from "./TodayChecklist";
import { NotaDescansoRow } from "./NotaDescansoRow";
import { WeeklyRecap } from "./WeeklyRecap";
import { WeeklySummary } from "./WeeklySummary";

// Default weekly training sessions goal used to fill the hero ring when the
// user has no per-user setting yet. Matches the planning doc's 3–5 sessions
// recommendation — 4 hits the midpoint.
const WEEKLY_SESSIONS_GOAL = 4;

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
  template_id: string | null;
  duration_minutes: number | null;
  avg_heart_rate: number | null;
  overall_feeling: number | null;
  notes: string | null;
  workout_templates: { name: string; session_type: string } | { name: string; session_type: string }[] | null;
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

  // 30 days ago (UTC) — used for the Volume · 30d dual card.
  const thirtyDaysAgoUtc = new Date(now);
  thirtyDaysAgoUtc.setDate(thirtyDaysAgoUtc.getDate() - 30);

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
    { data: teCountRaw },
    { data: volume30dRows },
  ] = await Promise.all([
    supabase.from("exercises").select("*", { count: "exact", head: true }),
    supabase
      .from("workout_sessions")
      .select(
        "id, started_at, template_id, duration_minutes, avg_heart_rate, overall_feeling, notes, workout_templates(name, session_type)"
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
      .select("id, name, session_type, sort_order")
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
    supabase
      .from("template_exercises")
      .select("template_id, exercises(primary_muscle)"),
    supabase
      .from("workout_sets")
      .select("weight_kg, reps, performed_at")
      .eq("is_warmup", false)
      .gte("performed_at", thirtyDaysAgoUtc.toISOString()),
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
  // Count exercises + collect distinct primary muscles per template in one pass.
  // Muscles power the Hub hero's chip row; order is first-seen in slot_order
  // (which is the select's implicit order when no ORDER BY is given, but we
  // dedupe with a Set so repeats don't show twice).
  const teCounts = new Map<string, number>();
  const teMuscles = new Map<string, string[]>();
  type TeRow = {
    template_id: string;
    exercises: { primary_muscle: string | null } | { primary_muscle: string | null }[] | null;
  };
  for (const row of (teCountRaw ?? []) as TeRow[]) {
    teCounts.set(row.template_id, (teCounts.get(row.template_id) ?? 0) + 1);
    const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    const muscle = ex?.primary_muscle ?? null;
    if (muscle) {
      const list = teMuscles.get(row.template_id) ?? [];
      if (!list.includes(muscle)) list.push(muscle);
      teMuscles.set(row.template_id, list);
    }
  }
  const templates: TemplateLite[] = (templatesData ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    session_type: t.session_type,
    exercise_count: teCounts.get(t.id) ?? 0,
  }));

  // Quick stats for the home header area
  const sessions7d = strengthSessions.filter(
    (s) => new Date(s.started_at) >= sevenDaysAgo
  ).length;

  // Use the same rotation logic as /treinar (auto mode: alternate
  // upper↔lower, rotate within type by sort_order).
  const nextTemplate: TemplateLite | null = (() => {
    if (templates.length === 0) return null;
    if (strengthSessions.length === 0) return templates[0];

    // Build recent sessions list with template_id + session_type
    const recent = strengthSessions.slice(0, 10).map((s) => {
      const joined = Array.isArray(s.workout_templates)
        ? s.workout_templates[0]
        : s.workout_templates;
      return {
        template_id: s.template_id,
        session_type: (joined as { session_type: string } | null)?.session_type ?? null,
      };
    });

    const lastType = recent[0]?.session_type ?? null;
    const targetType: "upper" | "lower" = lastType === "upper" ? "lower" : "upper";

    const ofType = templates.filter((t) => t.session_type === targetType);
    const pool = ofType.length > 0 ? ofType : templates;

    // Find the last session that used a template in this pool
    const lastSameType = recent.find(
      (s) => s.session_type === pool[0].session_type
    );
    if (!lastSameType?.template_id) return pool[0];

    const idx = pool.findIndex((t) => t.id === lastSameType.template_id);
    if (idx === -1) return pool[0];

    // Rotate to next in pool
    return pool[(idx + 1) % pool.length];
  })();

  // Weekstrip data — set of YYYY-MM-DD day keys with any strength session
  // or cardio session. Weekstrip uses this to fill the past dots with cream
  // checks. Same "active day" definition as the streak calc.
  const activeDayKeys = new Set<string>();
  for (const s of strengthSessions) {
    activeDayKeys.add(localDayKey(new Date(s.started_at)));
  }
  for (const c of cardioSessions) {
    activeDayKeys.add(localDayKey(new Date(c.started_at)));
  }

  // Per-visible-day metadata for the DayPeek sheets (PR 3 of v2). Builds
  // [dayKey → DayPeekData] for the 7 days in the current week (Sun..Sat).
  // Past with strength → templateName + duration; past with cardio →
  // distance/time; today with no activity yet → next planned template;
  // future → "Planejado". Only the visible week is materialized so the
  // payload stays small.
  const weekDayInfo: Array<[string, DayPeekData]> = (() => {
    const [ty, tm, td] = todayKey.split("-").map((v) => parseInt(v, 10));
    const todayUtc = new Date(Date.UTC(ty, tm - 1, td, 12, 0, 0));
    const sundayUtc = new Date(todayUtc);
    sundayUtc.setUTCDate(sundayUtc.getUTCDate() - todayUtc.getUTCDay());
    const restDayKeys = new Set(restDays.map((r) => r.rest_date));

    const out: Array<[string, DayPeekData]> = [];
    for (let i = 0; i < 7; i++) {
      const probe = new Date(sundayUtc);
      probe.setUTCDate(sundayUtc.getUTCDate() + i);
      const k = localDayKey(probe);
      const dayLabel = probe
        .toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
        })
        .toUpperCase()
        .replace(".", "");

      // Find the most recent strength/cardio session on this day.
      const strengthOnDay = strengthSessions.find(
        (s) => localDayKey(new Date(s.started_at)) === k
      );
      const cardioOnDay = cardioSessions.find(
        (c) => localDayKey(new Date(c.started_at)) === k
      );

      if (strengthOnDay) {
        const tpl = Array.isArray(strengthOnDay.workout_templates)
          ? strengthOnDay.workout_templates[0]
          : strengthOnDay.workout_templates;
        const tplName = (tpl as { name: string } | null)?.name ?? "Sessão";
        const subtitleParts: string[] = [];
        if (strengthOnDay.duration_minutes != null) {
          subtitleParts.push(`${strengthOnDay.duration_minutes}min`);
        }
        if (strengthOnDay.avg_heart_rate != null) {
          subtitleParts.push(`HR ${strengthOnDay.avg_heart_rate}`);
        }
        out.push([
          k,
          {
            label: dayLabel,
            title: tplName,
            subtitle: subtitleParts.join(" · ") || undefined,
            sessionHref: `/workout/${strengthOnDay.id}`,
            kind: "strength",
          },
        ]);
        continue;
      }

      if (cardioOnDay) {
        const km = cardioOnDay.distance_km
          ? Number(cardioOnDay.distance_km)
          : null;
        const min = Math.round(cardioOnDay.duration_seconds / 60);
        const subtitleParts: string[] = [];
        if (km !== null && km > 0) subtitleParts.push(`${km.toFixed(1)}km`);
        if (min > 0) subtitleParts.push(`${min}min`);
        out.push([
          k,
          {
            label: dayLabel,
            title: cardioOnDay.activity_type ?? "Cardio",
            subtitle: subtitleParts.join(" · ") || undefined,
            kind: "cardio",
          },
        ]);
        continue;
      }

      if (restDayKeys.has(k)) {
        out.push([
          k,
          {
            label: dayLabel,
            title: "Descanso",
            subtitle: "Recuperação",
            kind: "rest",
          },
        ]);
        continue;
      }

      // Today with nothing logged → show the next planned template.
      if (k === todayKey && nextTemplate) {
        out.push([
          k,
          {
            label: `${dayLabel} · HOJE`,
            title: nextTemplate.name,
            subtitle: `${nextTemplate.exercise_count} exercícios planejados`,
            kind: "strength",
          },
        ]);
        continue;
      }

      // Future or empty past.
      out.push([
        k,
        {
          label: dayLabel,
          title: k > todayKey ? "Planejado" : "Vazio",
          kind: "empty",
        },
      ]);
    }
    return out;
  })();

  // Daily volume series for the last 30 days — feeds the sparkline inside
  // the Volume card. Bucketed in user TZ so a set logged at 11pm doesn't
  // bleed into the next day. Reads from the raw query rows so we don't
  // depend on the vol30Sets cast that's declared later in the file.
  const volumeDailySeries: number[] = (() => {
    const buckets = new Map<string, number>();
    for (const s of (volume30dRows ?? []) as Array<{
      weight_kg: number | string;
      reps: number;
      performed_at: string;
    }>) {
      if (!s.performed_at) continue;
      const k = localDayKey(new Date(s.performed_at));
      buckets.set(k, (buckets.get(k) ?? 0) + Number(s.weight_kg) * (s.reps ?? 0));
    }
    const series: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const probe = new Date(now);
      probe.setDate(probe.getDate() - i);
      series.push(buckets.get(localDayKey(probe)) ?? 0);
    }
    return series;
  })();

  // Frequency · 4 weeks — strength + cardio session counts bucketed into
  // weeks ending on each Saturday. Mirrors the 4-week grouping used by
  // /progresso so the on-Home chart reads identically.
  const weeklyFreqData: Array<{ weekKey: string; strength: number; cardio: number }> = (() => {
    const weeks: Array<{ weekKey: string; strength: number; cardio: number }> = [];
    for (let w = 3; w >= 0; w--) {
      // Build [start..end) week range ending on (today - w*7 + 6) day.
      const end = new Date(now);
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const startTs = new Date(start).setHours(0, 0, 0, 0);
      const endTs = new Date(end).setHours(23, 59, 59, 999);
      const strength = strengthSessions.filter((s) => {
        const t = new Date(s.started_at).getTime();
        return t >= startTs && t <= endTs;
      }).length;
      const cardio = cardioSessions.filter((c) => {
        const t = new Date(c.started_at).getTime();
        return t >= startTs && t <= endTs;
      }).length;
      weeks.push({
        weekKey: `${localDayKey(start)}/${localDayKey(end)}`,
        strength,
        cardio,
      });
    }
    return weeks;
  })();

  // Last completed session — drives the WorkoutRecap modal triggered by
  // the LastWorkoutCard. We fetch its sets with primary_muscle joined so
  // the per-muscle bars in the recap don't need extra round-trips on tap.
  const lastSession = strengthSessions[0] ?? null;
  let lastSessionMuscleImpact: Array<{ muscle: string; sets: number }> = [];
  let lastSessionVolumeKg = 0;
  let lastSessionSetCount = 0;
  if (lastSession) {
    const { data: lastSetsRaw } = await supabase
      .from("workout_sets")
      .select("weight_kg, reps, exercises(primary_muscle)")
      .eq("session_id", lastSession.id)
      .eq("is_warmup", false);
    type SetWithMuscle = {
      weight_kg: number | string;
      reps: number;
      exercises:
        | { primary_muscle: string | null }
        | { primary_muscle: string | null }[]
        | null;
    };
    const rows = (lastSetsRaw ?? []) as SetWithMuscle[];
    lastSessionSetCount = rows.length;
    const muscleBuckets = new Map<string, number>();
    for (const s of rows) {
      lastSessionVolumeKg += Number(s.weight_kg) * (s.reps ?? 0);
      const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises;
      const m = ex?.primary_muscle ?? null;
      if (!m) continue;
      muscleBuckets.set(m, (muscleBuckets.get(m) ?? 0) + 1);
    }
    lastSessionMuscleImpact = Array.from(muscleBuckets.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([muscle, sets]) => ({ muscle: muscleLabel(muscle), sets }));
  }

  // Build the recap payload for the LastWorkoutCard. Null when there's no
  // finished session yet (first-run users) — the card just doesn't render.
  const lastWorkoutRecap: WorkoutRecapData | null = lastSession
    ? (() => {
        const tpl = Array.isArray(lastSession.workout_templates)
          ? lastSession.workout_templates[0]
          : lastSession.workout_templates;
        const tplName =
          (tpl as { name: string } | null)?.name ?? "Sessão anterior";
        const startedAt = new Date(lastSession.started_at);
        const dateLabel = startedAt
          .toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          })
          .toUpperCase()
          .replace(".", "");
        const intensity =
          lastSession.overall_feeling != null
            ? `${lastSession.overall_feeling}/5`
            : null;
        return {
          sessionId: lastSession.id,
          dateLabel,
          templateName: tplName,
          durationMin: lastSession.duration_minutes,
          setCount: lastSessionSetCount,
          volumeKg: lastSessionVolumeKg,
          intensityLabel: intensity,
          muscleImpact: lastSessionMuscleImpact,
        };
      })()
    : null;

  // Frequency 4-week data → WeekData[] for the existing WeeklyBars
  // component. Last bucket is "Atual"; the other three are "-Nsem".
  const weeklyBarsData = weeklyFreqData.map((w, i, arr) => ({
    label: i === arr.length - 1 ? "Atual" : `-${arr.length - 1 - i}sem`,
    strength: w.strength,
    cardio: w.cardio,
  }));

  // Volume · 30d — total kg lifted (sum of weight × reps across working sets
  // in the last 30 days). Displayed as tonnes with 1 decimal in the hero.
  const vol30Sets = (volume30dRows ?? []) as Array<{
    weight_kg: number | string;
    reps: number;
  }>;
  const volume30dKg = vol30Sets.reduce(
    (sum, s) => sum + Number(s.weight_kg) * (s.reps ?? 0),
    0
  );
  const volume30dTonnes = volume30dKg / 1000;

  // Hero ring fill — fraction of the weekly sessions goal completed this week.
  // Clamped 0-1 for the stroke math; the label shows the raw count.
  const heroRingValue = Math.min(1, sessions7d / WEEKLY_SESSIONS_GOAL);

  // Muscle chips for the next-template card. Up to 4 primary muscles from the
  // template's exercises, pt-BR labels. Empty array if the template has no
  // exercises yet (card degrades to plain count line).
  const nextTemplateMuscles: string[] = nextTemplate
    ? (teMuscles.get(nextTemplate.id) ?? []).slice(0, 4).map(muscleLabel)
    : [];

  return (
    <PullToRefresh>
    <div className="px-6 pt-10">
      {/* Top bar — date + greeting + settings. Streak lives in the dual
          row below, not repeated here, so the masthead stays clean. */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-1 tnum">
            {weekday}, {day} de {month}
          </p>
          <h1 className="tlog-title">{greet}</h1>
        </div>
        <Link
          href="/settings"
          aria-label="Configurações"
          className="shrink-0 w-9 h-9 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
        >
          <SettingsIcon size={17} strokeWidth={1.75} />
        </Link>
      </header>

      {/* Streak pill + weekstrip — handed off to a client wrapper so the
          calendar + day-peek sheets can own their open state. */}
      <HomeStreakAndWeek
        todayKey={todayKey}
        activeDayKeys={Array.from(activeDayKeys)}
        current={streak.current}
        best={streak.best}
        weekDayInfo={weekDayInfo}
        hasFirstRunData={!firstRun}
      />

      {/* Streak hero — full-width motivational card with 12-week heatmap +
          milestone progress. Hidden during first-run; tapping wires the
          same StreakCalendar that the pill opens (parent state is in
          HomeStreakAndWeek so we don't duplicate). */}
      {!firstRun && streak.best > 0 && (
        <StreakHero
          current={streak.current}
          best={streak.best}
          activeDayKeys={Array.from(activeDayKeys)}
          todayKey={todayKey}
        />
      )}

      {/* Hero — unified ring + próximo treino card. When there's an active
          session, swaps to an "Em andamento" state so the ring icon flips to
          a pulse/chevron and the CTA points at /workout/[id]. */}
      {activeSession && (
        <Link
          href={`/workout/${activeSession.id}`}
          className="group relative block mb-4 overflow-hidden rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] p-5 active:scale-[0.99] transition-transform"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--accent) 25%, transparent), transparent 70%)",
            }}
          />
          <div className="relative flex items-center gap-4">
            <Ring value={heroRingValue} size={78} stroke={5} color="var(--accent)">
              <Play size={22} strokeWidth={2.5} className="text-[var(--accent)]" fill="currentColor" />
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="tlog-eyebrow mb-1 text-[var(--text-muted)]">Em andamento</p>
              <h2 className="text-[24px] leading-none font-extrabold tracking-[-0.02em] truncate">
                {activeSession.templateName}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 tnum">
                Iniciado{" "}
                {new Date(activeSession.startedAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-[var(--text-muted)]" />
          </div>
        </Link>
      )}

      {!activeSession && !firstRun && nextTemplate && (
        <Link
          href="/treinar"
          className="group relative block mb-4 overflow-hidden rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] p-5 active:scale-[0.99] transition-transform"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)",
            }}
          />
          <div className="relative flex items-center gap-4">
            <Ring
              value={heroRingValue}
              size={78}
              stroke={5}
              color="var(--accent)"
              ariaLabel={`${sessions7d} de ${WEEKLY_SESSIONS_GOAL} treinos nesta semana`}
            >
              <Play size={22} strokeWidth={2.5} className="text-[var(--accent)]" fill="currentColor" />
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="tlog-eyebrow mb-1 text-[var(--text-muted)]">Próximo treino</p>
              <h2 className="text-[24px] leading-none font-extrabold tracking-[-0.02em] truncate">
                {nextTemplate.name}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 tnum">
                {nextTemplate.session_type === "upper" ? "Upper" : "Lower"} ·{" "}
                {nextTemplate.exercise_count} exercícios
              </p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-[var(--text-muted)]" />
          </div>
          {nextTemplateMuscles.length > 0 && (
            <ul className="relative mt-3.5 flex flex-wrap gap-1.5">
              {nextTemplateMuscles.map((m) => (
                <li
                  key={m}
                  className="rounded-md bg-[var(--bg-hover)] px-2 py-1 text-[10.5px] font-semibold text-[var(--text-soft)]"
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
        </Link>
      )}

      {!activeSession && firstRun && (
        <section className="mb-4 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] p-6">
          <h2 className="tlog-title mb-2">Ainda vazio</h2>
          <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
            Cadastre exercícios, monte um template e inicie.
          </p>
          <Link
            href="/exercicios"
            className="group inline-flex items-center gap-2 text-[var(--text)] font-semibold text-sm"
          >
            Configurar exercícios
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </section>
      )}

      {!activeSession && !firstRun && !nextTemplate && (
        <section className="mb-4 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] p-6">
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Crie seu primeiro template para começar.
          </p>
          <Link
            href="/templates/novo"
            className="block w-full text-center font-semibold py-3.5 rounded-xl"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Criar template
          </Link>
        </section>
      )}

      {/* Volume · 30d — single full-width card with sparkline. Streak
          migrated to the pill in the header per v2 layout. The sparkline
          is the per-day kg total over the last 30d so the trend reads
          even when individual days were rest. */}
      {!firstRun && (
        <Link
          href="/progresso"
          className="mb-4 block rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4 hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp
              size={14}
              strokeWidth={2}
              className="text-[var(--accent)]"
            />
            <span className="tlog-eyebrow text-[var(--text-muted)]">
              Volume · 30d
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className="tlog-hero tnum"
                  style={{ color: "var(--accent)" }}
                >
                  {volume30dTonnes >= 10
                    ? volume30dTonnes.toFixed(1)
                    : volume30dTonnes.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-[var(--text-muted)]">
                  toneladas
                </span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-[var(--text-muted)] tnum">
                {sessions7d} {sessions7d === 1 ? "treino" : "treinos"} · 7d
              </p>
            </div>
            {volumeDailySeries.some((v) => v > 0) && (
              <Sparkline
                values={volumeDailySeries}
                color="var(--accent)"
                width={96}
                height={36}
              />
            )}
          </div>
        </Link>
      )}

      {/* Last workout recap card → opens WorkoutRecap modal. */}
      {!firstRun && lastWorkoutRecap && (
        <LastWorkoutCard data={lastWorkoutRecap} />
      )}

      {/* Frequência · 4 semanas — moved from /progresso onto Home per the
          v2 handoff, so Hoje → Treino → Progresso closes the loop. */}
      {!firstRun && weeklyBarsData.some((w) => w.strength + w.cardio > 0) && (
        <section className="mb-4">
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="tlog-eyebrow text-[var(--text-muted)]">
                Frequência · 4 semanas
              </p>
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--status-ready)" }}
                  />
                  Força
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--status-stalled)" }}
                  />
                  Cardio
                </span>
              </div>
            </div>
            <WeeklyBars weeks={weeklyBarsData} />
          </div>
        </section>
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

      {/* AI Weekly Summary */}
      {!firstRun && <WeeklySummary />}

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
    </PullToRefresh>
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

