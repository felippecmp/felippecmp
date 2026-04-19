import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Flame, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  EMPTY_STATE,
  evaluateProgression,
  type ProgressionStateRow,
  type ProgressionStatus,
} from "@/lib/progression";
import { getUserSettings } from "@/lib/settings";
import { muscleLabel } from "@/lib/muscles";
import { PHASE_LABEL } from "@/lib/coach/mesocycle";
import { getActiveMesocycle } from "@/lib/coach/mesocycle-server";
import { userDayKey } from "@/lib/timezone";
import { AbandonSessionButton } from "./AbandonSessionButton";
import { ElapsedTimer } from "./ElapsedTimer";
import { FinishSessionButton } from "./FinishSessionButton";
import { FitUploadButton } from "./FitUploadButton";
import {
  SessionHrChart,
  type HrSample,
  type SetMarker,
} from "./SessionHrChart";
import {
  WorkoutSession,
  type CatalogExercise,
  type ExerciseBlockData,
  type ReferenceSet,
} from "./WorkoutSession";

export const dynamic = "force-dynamic";

type ExerciseJoin = {
  id: string;
  name: string;
  primary_muscle: string;
  load_increment: number | string | null;
};

type TemplateExerciseJoin = {
  id: string;
  slot_order: number;
  target_sets: number;
  rep_range_low: number;
  rep_range_high: number;
  rest_seconds: number;
  exercise_id: string | null;
  exercises: ExerciseJoin | ExerciseJoin[] | null;
};

type ProgressionStateRaw = {
  exercise_id: string | null;
  current_weight_kg: number | string | null;
  current_status: ProgressionStatus | null;
  last_top_set_reps: number | null;
  streak_at_top_range: number | null;
  stall_count: number | null;
  sessions_at_current_weight: number | null;
  last_session_date: string | null;
};

type CurrentSetRow = {
  id: string;
  exercise_id: string | null;
  set_number: number;
  weight_kg: number | string;
  reps: number;
  rir: number | null;
  is_warmup: boolean | null;
  performed_at: string;
};

type CatalogExerciseRow = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string | null;
  session_type: "upper" | "lower";
  load_increment: number | string | null;
};

type ReferenceRow = {
  exercise_id: string | null;
  session_id: string;
  set_number: number;
  weight_kg: number | string;
  reps: number;
  rir: number | null;
  workout_sessions:
    | { started_at: string }
    | { started_at: string }[]
    | null;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pickJoined<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select(
      "id, started_at, finished_at, template_id, avg_heart_rate, max_heart_rate, device_calories, device_duration_seconds, heart_rate_samples, device_start_time, overall_feeling, notes, workout_templates(id, name, session_type)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!session) notFound();

  const template = pickJoined(session.workout_templates);

  const teResult = session.template_id
    ? await supabase
        .from("template_exercises")
        .select(
          "id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, exercise_id, exercises(id, name, primary_muscle, load_increment)"
        )
        .eq("template_id", session.template_id)
        .order("slot_order", { ascending: true })
    : null;

  const teList = (teResult?.data ?? []) as TemplateExerciseJoin[];
  const templateExerciseIds = teList
    .map((te) => te.exercise_id)
    .filter((v): v is string => typeof v === "string");

  // Pull user defaults + the full active exercise catalog (for the ad-hoc
  // picker) + every set logged for this session (including warmups and
  // ad-hoc-exercise sets) + active mesocycle in parallel.
  const [settings, catalogResult, currentSetsResult, activeMeso] =
    await Promise.all([
      getUserSettings(),
      supabase
        .from("exercises")
        .select(
          "id, name, primary_muscle, equipment, session_type, load_increment"
        )
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("workout_sets")
        .select(
          "id, exercise_id, set_number, weight_kg, reps, rir, is_warmup, performed_at"
        )
        .eq("session_id", session.id)
        .order("set_number", { ascending: true }),
      getActiveMesocycle(),
    ]);

  const catalog = (catalogResult.data ?? []) as CatalogExerciseRow[];
  const catalogById = new Map(catalog.map((e) => [e.id, e]));
  const currentSets = (currentSetsResult.data ?? []) as CurrentSetRow[];

  // Weekly volume per muscle for the active block context strip.
  // Only computed when there's an active mesocycle (otherwise empty).
  type WeeklyMuscleVolume = { muscle: string; done: number; target: number };
  const weeklyVolume: WeeklyMuscleVolume[] = [];
  const currentPhase = activeMeso?.currentWeek ?? null;
  const phaseRirTarget = currentPhase?.intensity_target ?? null;

  if (activeMeso && currentPhase) {
    // Always use rolling 7-day window for volume tracking, never calendar
    // week boundaries. The user trains on varying schedules; a fixed Mon-Sun
    // window would show misleading numbers. week_starts_on is only used to
    // determine WHICH PHASE (and thus which targets) applies.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data: weekSetsRaw } = await supabase
      .from("workout_sets")
      .select("exercise_id, exercises(primary_muscle)")
      .eq("is_warmup", false)
      .gte("performed_at", sevenDaysAgo.toISOString());

    type WeekSetRow = {
      exercise_id: string | null;
      exercises:
        | { primary_muscle: string }
        | { primary_muscle: string }[]
        | null;
    };
    const weekSets = (weekSetsRaw ?? []) as WeekSetRow[];
    const weekTargets = currentPhase.volume_targets ?? {};

    // Count done sets per muscle in the rolling 7d window.
    const doneByMuscle: Record<string, number> = {};
    for (const s of weekSets) {
      const ex = pickJoined(s.exercises);
      if (!ex) continue;
      doneByMuscle[ex.primary_muscle] =
        (doneByMuscle[ex.primary_muscle] ?? 0) + 1;
    }

    // Build the list for muscles this template works (via the exercises in the session).
    const sessionMuscles = new Set<string>();
    for (const te of teList) {
      const ex = pickJoined(te.exercises);
      if (ex) sessionMuscles.add(ex.primary_muscle);
    }
    for (const muscle of sessionMuscles) {
      const target = weekTargets[muscle] ?? 0;
      if (target === 0) continue;
      weeklyVolume.push({
        muscle,
        done: doneByMuscle[muscle] ?? 0,
        target,
      });
    }
    weeklyVolume.sort((a, b) => a.done / a.target - b.done / b.target);
  }

  // Ad-hoc exercise ids = sets logged against exercises not in the template.
  const templateIdSet = new Set(templateExerciseIds);
  const adhocExerciseIds = Array.from(
    new Set(
      currentSets
        .map((s) => s.exercise_id)
        .filter((v): v is string => !!v && !templateIdSet.has(v))
    )
  );

  // Anything we need history + progression for.
  const allExerciseIds = Array.from(
    new Set([...templateExerciseIds, ...adhocExerciseIds])
  );

  const refResult =
    allExerciseIds.length > 0
      ? await supabase
          .from("workout_sets")
          .select(
            "exercise_id, session_id, set_number, weight_kg, reps, rir, performed_at, workout_sessions(started_at)"
          )
          .in("exercise_id", allExerciseIds)
          .eq("is_warmup", false)
          .neq("session_id", session.id)
          .order("performed_at", { ascending: false })
          .limit(200)
      : null;

  const refRows = (refResult?.data ?? []) as ReferenceRow[];

  const progressionResult =
    allExerciseIds.length > 0
      ? await supabase
          .from("progression_state")
          .select(
            "exercise_id, current_weight_kg, current_status, last_top_set_reps, streak_at_top_range, stall_count, sessions_at_current_weight, last_session_date"
          )
          .in("exercise_id", allExerciseIds)
      : null;

  const progressionRows = (progressionResult?.data ?? []) as ProgressionStateRaw[];
  const progressionByExercise = new Map<string, ProgressionStateRow>();
  for (const p of progressionRows) {
    if (!p.exercise_id) continue;
    progressionByExercise.set(p.exercise_id, {
      current_weight_kg:
        p.current_weight_kg !== null ? Number(p.current_weight_kg) : null,
      current_status: (p.current_status ?? "building") as ProgressionStatus,
      last_top_set_reps: p.last_top_set_reps,
      streak_at_top_range: p.streak_at_top_range ?? 0,
      stall_count: p.stall_count ?? 0,
      sessions_at_current_weight: p.sessions_at_current_weight ?? 0,
      last_session_date: p.last_session_date,
    });
  }

  // For each exercise, find the most recent other session that included it.
  const latestSessionByExercise = new Map<
    string,
    { sessionId: string; startedAt: string }
  >();
  for (const r of refRows) {
    if (!r.exercise_id) continue;
    const joined = pickJoined(r.workout_sessions);
    const startedAt = joined?.started_at;
    if (!startedAt) continue;
    const current = latestSessionByExercise.get(r.exercise_id);
    if (!current || new Date(startedAt) > new Date(current.startedAt)) {
      latestSessionByExercise.set(r.exercise_id, {
        sessionId: r.session_id,
        startedAt,
      });
    }
  }

  // Collect sets of the latest other session per exercise, keeping set_number
  // so we can sort them into natural order before passing to the client.
  const refGroups = new Map<
    string,
    Array<{ setNumber: number; set: ReferenceSet }>
  >();
  for (const r of refRows) {
    if (!r.exercise_id) continue;
    const latest = latestSessionByExercise.get(r.exercise_id);
    if (!latest || r.session_id !== latest.sessionId) continue;
    const arr = refGroups.get(r.exercise_id) ?? [];
    arr.push({
      setNumber: r.set_number,
      set: {
        weightKg: Number(r.weight_kg),
        reps: r.reps,
        rir: r.rir,
      },
    });
    refGroups.set(r.exercise_id, arr);
  }
  const referenceByExercise = new Map<string, ReferenceSet[]>();
  for (const [key, arr] of refGroups.entries()) {
    arr.sort((a, b) => a.setNumber - b.setNumber);
    referenceByExercise.set(
      key,
      arr.map((x) => x.set)
    );
  }

  const exercises: ExerciseBlockData[] = [];
  for (const te of teList) {
    if (!te.exercise_id) continue;
    const ex = pickJoined(te.exercises);
    if (!ex) continue;
    const existing = currentSets
      .filter((s) => s.exercise_id === te.exercise_id)
      .map((s) => ({
        id: s.id,
        setNumber: s.set_number,
        weightKg: Number(s.weight_kg),
        reps: s.reps,
        rir: s.rir,
        isWarmup: Boolean(s.is_warmup),
      }));

    const state =
      progressionByExercise.get(te.exercise_id) ?? EMPTY_STATE;
    const loadIncrement =
      ex.load_increment !== null && ex.load_increment !== undefined
        ? Number(ex.load_increment) || 2.5
        : 2.5;
    const suggestion = evaluateProgression({
      exercise: { load_increment: loadIncrement },
      templateExercise: {
        target_sets: te.target_sets,
        rep_range_low: te.rep_range_low,
        rep_range_high: te.rep_range_high,
      },
      currentState: state,
    });

    exercises.push({
      templateExerciseId: te.id,
      exerciseId: te.exercise_id,
      exerciseName: ex.name,
      primaryMuscle: ex.primary_muscle,
      targetSets: te.target_sets,
      repRangeLow: te.rep_range_low,
      repRangeHigh: te.rep_range_high,
      restSeconds: te.rest_seconds,
      previousSets: referenceByExercise.get(te.exercise_id) ?? [],
      previousSetsAt:
        latestSessionByExercise.get(te.exercise_id)?.startedAt ?? null,
      existingSets: existing,
      suggestion,
      isAdhoc: false,
    });
  }

  // Ad-hoc blocks: exercises logged in this session but not present in the
  // template. They inherit rep-range / rest defaults from user_settings and
  // still get a progression suggestion from the stored state.
  for (const adhocId of adhocExerciseIds) {
    const ex = catalogById.get(adhocId);
    if (!ex) continue;
    const existing = currentSets
      .filter((s) => s.exercise_id === adhocId)
      .map((s) => ({
        id: s.id,
        setNumber: s.set_number,
        weightKg: Number(s.weight_kg),
        reps: s.reps,
        rir: s.rir,
        isWarmup: Boolean(s.is_warmup),
      }));
    const state = progressionByExercise.get(adhocId) ?? EMPTY_STATE;
    const loadIncrement =
      ex.load_increment !== null && ex.load_increment !== undefined
        ? Number(ex.load_increment) || 2.5
        : 2.5;
    const suggestion = evaluateProgression({
      exercise: { load_increment: loadIncrement },
      templateExercise: {
        target_sets: settings.default_target_sets,
        rep_range_low: settings.default_rep_range_low,
        rep_range_high: settings.default_rep_range_high,
      },
      currentState: state,
    });
    exercises.push({
      templateExerciseId: `adhoc-${adhocId}`,
      exerciseId: adhocId,
      exerciseName: ex.name,
      primaryMuscle: ex.primary_muscle,
      targetSets: settings.default_target_sets,
      repRangeLow: settings.default_rep_range_low,
      repRangeHigh: settings.default_rep_range_high,
      restSeconds: settings.default_rest_seconds,
      previousSets: referenceByExercise.get(adhocId) ?? [],
      previousSetsAt: latestSessionByExercise.get(adhocId)?.startedAt ?? null,
      existingSets: existing,
      suggestion,
      isAdhoc: true,
    });
  }

  // Build the picker catalog payload (strip load_increment since the client
  // doesn't need it for display).
  const catalogForClient: CatalogExercise[] = catalog.map((e) => ({
    id: e.id,
    name: e.name,
    primaryMuscle: e.primary_muscle,
    equipment: e.equipment,
    sessionType: e.session_type,
  }));

  const isFinished = Boolean(session.finished_at);
  // The "N sets" counter in the header refers to working sets only —
  // warmups don't count toward the session's volume.
  const workingSets = currentSets.filter((s) => !s.is_warmup);
  const totalLogged = workingSets.length;
  const totalVolumeKg = workingSets.reduce(
    (sum, s) => sum + Number(s.weight_kg) * (s.reps ?? 0),
    0
  );

  // Raw HR samples + set markers for the SessionHrChart. Both live in
  // the same "seconds since device_start_time" coordinate space so the
  // vertical markers fall on the same X axis as the curve.
  const hrSamples: HrSample[] = Array.isArray(session.heart_rate_samples)
    ? (session.heart_rate_samples as HrSample[]).filter(
        (s) =>
          s &&
          typeof s.t === "number" &&
          typeof s.hr === "number" &&
          s.hr > 0
      )
    : [];

  const exerciseNameById = new Map<string, string>();
  for (const ex of exercises) {
    exerciseNameById.set(ex.exerciseId, ex.exerciseName);
  }

  const deviceStartMs =
    session.device_start_time !== null &&
    session.device_start_time !== undefined
      ? new Date(session.device_start_time as string).getTime()
      : null;

  const setMarkers: SetMarker[] =
    hrSamples.length > 0 && deviceStartMs !== null
      ? currentSets
          .map((s) => {
            const performed = new Date(
              (s as { performed_at?: string }).performed_at ??
                session.started_at
            ).getTime();
            if (!Number.isFinite(performed)) return null;
            return {
              t: Math.round((performed - deviceStartMs) / 1000),
              label:
                (s.exercise_id && exerciseNameById.get(s.exercise_id)) ??
                `Set ${s.set_number}`,
              isWarmup: Boolean(s.is_warmup),
            } satisfies SetMarker;
          })
          .filter((m): m is SetMarker => m !== null)
      : [];

  // Progress: how many exercises have at least one working set logged
  const exercisesWithSets = new Set(
    currentSets.filter((s) => !s.is_warmup).map((s) => s.exercise_id)
  ).size;
  const totalTarget = exercises.reduce((sum, ex) => sum + ex.targetSets, 0);
  const progressPct =
    totalTarget > 0 ? Math.min(100, Math.round((totalLogged / totalTarget) * 100)) : 0;

  return (
    <div className="px-6 pt-10">
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/treinar"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
          Treinar
        </Link>
        <div className="flex items-center gap-2">
          {!isFinished && <ElapsedTimer startedAt={session.started_at} />}
          {!isFinished && (
            <FinishSessionButton
              sessionId={session.id}
              totalLogged={totalLogged}
              totalTarget={totalTarget}
              totalVolumeKg={totalVolumeKg}
              startedAt={session.started_at}
              compact
            />
          )}
        </div>
      </div>

      <header className="mb-6">
        <p className="tlog-eyebrow mb-2 text-[var(--text-muted)]">
          {isFinished ? "Treino completo" : (template?.session_type ?? "Sessão")}
        </p>
        {isFinished ? (
          <h1
            className="font-extrabold leading-[0.95]"
            style={{
              fontSize: 44,
              letterSpacing: "-0.04em",
            }}
          >
            {template?.name ?? "Sessão"}
            <br />
            <span style={{ color: "var(--accent)" }}>finalizado.</span>
          </h1>
        ) : (
          <h1 className="display text-4xl leading-none">
            {template?.name ?? "Sessão"}
          </h1>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-muted)] tnum">
          {isFinished && (
            <>
              <span className="inline-flex items-center gap-1">
                <Clock size={12} strokeWidth={1.75} />
                Finalizado {formatTime(session.started_at)}
              </span>
              <span className="text-[var(--text-faint)]">·</span>
            </>
          )}
          <span>{exercisesWithSets}/{exercises.length} exercícios</span>
          <span className="text-[var(--text-faint)]">·</span>
          <span>{totalLogged}/{totalTarget} sets</span>
          {isFinished && totalVolumeKg > 0 && (
            <>
              <span className="text-[var(--text-faint)]">·</span>
              <span>{(totalVolumeKg / 1000).toFixed(1)}t</span>
            </>
          )}
        </div>

        {/* Session progress bar */}
        {!isFinished && totalTarget > 0 && (
          <div className="mt-3">
            <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--status-ready)] transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* HR / calories pills from FIT upload */}
        {(session.avg_heart_rate ||
          session.max_heart_rate ||
          session.device_calories) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {session.avg_heart_rate && (
              <span className="inline-flex items-center gap-1 text-[11px] tnum px-2 py-1 rounded-md border border-[var(--border)] text-[var(--text-soft)]">
                <Heart
                  size={10}
                  strokeWidth={1.75}
                  className="text-[var(--status-stalled)]"
                />
                avg {session.avg_heart_rate}
              </span>
            )}
            {session.max_heart_rate && (
              <span className="inline-flex items-center gap-1 text-[11px] tnum px-2 py-1 rounded-md border border-[var(--border)] text-[var(--text-soft)]">
                <Heart
                  size={10}
                  strokeWidth={1.75}
                  className="text-[var(--status-stalled)]"
                />
                max {session.max_heart_rate}
              </span>
            )}
            {session.device_calories && (
              <span className="inline-flex items-center gap-1 text-[11px] tnum px-2 py-1 rounded-md border border-[var(--border)] text-[var(--text-soft)]">
                <Flame
                  size={10}
                  strokeWidth={1.75}
                  className="text-[var(--status-ready)]"
                />
                {session.device_calories} kcal
              </span>
            )}
          </div>
        )}

        {/* Feeling + notes from finalization */}
        {isFinished && session.overall_feeling && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="tnum px-2 py-0.5 rounded-md border border-[var(--border)] text-[var(--text-soft)]">
              feeling {session.overall_feeling}/5
            </span>
            {session.notes && (
              <span className="text-[var(--text-dim)] truncate italic">
                {session.notes}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Periodization context — connects /coach's plan to the actual training */}
      {activeMeso && currentPhase && (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--bg-card)] px-4 py-3 mb-4">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold">
              {activeMeso.mesocycle.name}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] tnum">
              sem {activeMeso.currentWeekNumber}/{activeMeso.mesocycle.total_weeks}
            </span>
          </div>
          <div className="flex items-baseline gap-2 text-xs text-[var(--text-soft)]">
            <span className="font-medium">
              {PHASE_LABEL[currentPhase.phase]}
            </span>
            {phaseRirTarget && (
              <>
                <span className="text-[var(--text-faint)]">·</span>
                <span className="tnum">{phaseRirTarget}</span>
              </>
            )}
          </div>
          {weeklyVolume.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-wrap gap-x-3 gap-y-1 text-[10px] tnum">
              {weeklyVolume.map((v) => {
                const pct = v.target > 0 ? v.done / v.target : 0;
                const color =
                  pct >= 1
                    ? "text-[var(--status-ready)]"
                    : pct >= 0.5
                      ? "text-[var(--text-soft)]"
                      : "text-[var(--text-muted)]";
                return (
                  <span key={v.muscle} className={color}>
                    {muscleLabel(v.muscle)} {v.done}/{v.target}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      <WorkoutSession
        sessionId={session.id}
        exercises={exercises}
        catalog={catalogForClient}
        sessionType={template?.session_type ?? "upper"}
        disabled={isFinished}
        phaseRirTarget={phaseRirTarget}
      />

      {exercises.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-8 text-center mb-6 mt-4">
          <p className="text-sm font-semibold mb-1">Nenhum exercício ainda</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[280px] mx-auto">
            Template vazio ou nenhum set logado. Use o botão abaixo pra
            adicionar um exercício ad-hoc.
          </p>
        </div>
      )}

      {/* HR curve from the uploaded FIT file, if present */}
      {hrSamples.length > 1 && (
        <div className="mb-6">
          <SessionHrChart
            samples={hrSamples}
            markers={setMarkers}
            maxHr={settings.max_hr}
          />
        </div>
      )}

      {!isFinished && (
        <div className="space-y-3 mt-8 pt-6 border-t border-[var(--border)]">
          <FinishSessionButton
            sessionId={session.id}
            totalLogged={totalLogged}
            totalTarget={totalTarget}
            totalVolumeKg={totalVolumeKg}
            startedAt={session.started_at}
          />
          <AbandonSessionButton sessionId={session.id} />
        </div>
      )}

      {/* FIT upload — available both during and after the session. Most
          common flow: finish session, sync Coros, come back and attach. */}
      <div className="mt-6 pt-6 border-t border-[var(--border)]">
        <FitUploadButton
          sessionId={session.id}
          hasExisting={Boolean(session.avg_heart_rate)}
        />
        <p className="text-[11px] text-[var(--text-dim)] mt-2 text-center leading-relaxed">
          Aceita .FIT do Coros / Garmin. Extrai HR médio, HR máx, calorias
          e duração. Apenas os aggregates são salvos.
        </p>
      </div>
    </div>
  );
}
