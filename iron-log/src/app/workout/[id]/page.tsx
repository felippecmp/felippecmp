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
import { AbandonSessionButton } from "./AbandonSessionButton";
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
      "id, started_at, finished_at, template_id, avg_heart_rate, max_heart_rate, device_calories, device_duration_seconds, heart_rate_samples, device_start_time, workout_templates(id, name, session_type)"
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
  // ad-hoc-exercise sets) in parallel.
  const [settings, catalogResult, currentSetsResult] = await Promise.all([
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
  ]);

  const catalog = (catalogResult.data ?? []) as CatalogExerciseRow[];
  const catalogById = new Map(catalog.map((e) => [e.id, e]));
  const currentSets = (currentSetsResult.data ?? []) as CurrentSetRow[];

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
  const totalLogged = currentSets.filter((s) => !s.is_warmup).length;

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

  return (
    <div className="px-6 pt-10">
      <Link
        href="/treinar"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Treinar
      </Link>

      <header className="mb-8">
        <p className="label mb-2 uppercase">
          {template?.session_type ?? "Sessão"}
        </p>
        <h1 className="display text-4xl leading-none">
          {template?.name ?? "Sessão"}
        </h1>
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-muted)] tnum">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} strokeWidth={1.75} />
            {isFinished ? "Finalizado" : "Iniciado"}{" "}
            {formatTime(session.started_at)}
          </span>
          <span className="text-[var(--text-faint)]">·</span>
          <span>{exercises.length} exercícios</span>
          <span className="text-[var(--text-faint)]">·</span>
          <span>{totalLogged} sets</span>
        </div>

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
      </header>

      <WorkoutSession
        sessionId={session.id}
        exercises={exercises}
        catalog={catalogForClient}
        sessionType={template?.session_type ?? "upper"}
        disabled={isFinished}
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
          <SessionHrChart samples={hrSamples} markers={setMarkers} />
        </div>
      )}

      {!isFinished && (
        <div className="space-y-3 mt-8 pt-6 border-t border-[var(--border)]">
          <FinishSessionButton
            sessionId={session.id}
            totalLogged={totalLogged}
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
