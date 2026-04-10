/**
 * Double progression engine.
 *
 * Two pure entry points:
 *  - evaluateProgression(): from a stored state + the upcoming template's
 *    rep range & the exercise's load_increment, decide what to suggest for
 *    the NEXT session (weight, status badge, message).
 *  - computeProgressionState(): from a just-finished session's working sets,
 *    a prior state, and the template config used, produce the new state to
 *    persist.
 *
 * Status semantics:
 *  - building           → working inside the rep range, reps climbing
 *  - ready_to_progress  → all sets hit rep_range_high with RIR ≥ 1; load up next
 *  - just_progressed    → the most recent session used a heavier weight; reps
 *                         expected to dip, consolidate first
 *  - stalled            → 3+ sessions at same weight without adding reps
 */

export type ProgressionStatus =
  | "building"
  | "ready_to_progress"
  | "just_progressed"
  | "stalled";

export type ProgressionStateRow = {
  current_weight_kg: number | null;
  current_status: ProgressionStatus;
  last_top_set_reps: number | null;
  streak_at_top_range: number;
  stall_count: number;
  sessions_at_current_weight: number;
  last_session_date: string | null;
};

export type WorkingSet = {
  weight_kg: number;
  reps: number;
  rir: number | null;
};

export type TemplateExerciseConfig = {
  target_sets: number;
  rep_range_low: number;
  rep_range_high: number;
};

export type ExerciseConfig = {
  load_increment: number;
};

export type ProgressionSuggestion = {
  suggestedWeight: number | null;
  status: ProgressionStatus;
  message: string;
  confidence: "high" | "medium" | "low";
};

export const EMPTY_STATE: ProgressionStateRow = {
  current_weight_kg: null,
  current_status: "building",
  last_top_set_reps: null,
  streak_at_top_range: 0,
  stall_count: 0,
  sessions_at_current_weight: 0,
  last_session_date: null,
};

export function statusLabel(s: ProgressionStatus): string {
  switch (s) {
    case "building":
      return "Na luta";
    case "ready_to_progress":
      return "Sobe carga";
    case "just_progressed":
      return "Peso novo";
    case "stalled":
      return "Travou";
  }
}

export function statusCssVar(s: ProgressionStatus): string {
  switch (s) {
    case "building":
      return "var(--status-building)";
    case "ready_to_progress":
      return "var(--status-ready)";
    case "just_progressed":
      return "var(--status-progressed)";
    case "stalled":
      return "var(--status-stalled)";
  }
}

/**
 * Decide what to show in the upcoming session based on stored state +
 * the current template's config.
 */
export function evaluateProgression(input: {
  exercise: ExerciseConfig;
  templateExercise: TemplateExerciseConfig;
  currentState: ProgressionStateRow;
}): ProgressionSuggestion {
  const { exercise, templateExercise, currentState } = input;
  const { rep_range_high, rep_range_low } = templateExercise;

  if (currentState.current_weight_kg === null) {
    return {
      suggestedWeight: null,
      status: "building",
      message: `Primeiro dia. Acha um peso pra fazer ${rep_range_low}-${rep_range_high} com folga (RIR 2).`,
      confidence: "low",
    };
  }

  const base = currentState.current_weight_kg;

  if (currentState.current_status === "ready_to_progress") {
    const newWeight = roundWeight(base + exercise.load_increment);
    return {
      suggestedWeight: newWeight,
      status: "ready_to_progress",
      message: `Mandou bem. Hoje vai ${formatKg(newWeight)}kg. Mira ${rep_range_low}-${rep_range_low + 1} reps.`,
      confidence: "high",
    };
  }

  if (currentState.current_status === "stalled") {
    const deload = roundWeight(base * 0.9);
    return {
      suggestedWeight: base,
      status: "stalled",
      message: `${currentState.stall_count} sessões sem sair do lugar. Deload pra ${formatKg(deload)}kg ou troca o exercício.`,
      confidence: "high",
    };
  }

  if (currentState.current_status === "just_progressed") {
    return {
      suggestedWeight: base,
      status: "just_progressed",
      message: `${formatKg(base)}kg é peso novo. Foca em construir reps — último foi ${currentState.last_top_set_reps ?? "?"}.`,
      confidence: "medium",
    };
  }

  // building
  const lastTop = currentState.last_top_set_reps;
  return {
    suggestedWeight: base,
    status: "building",
    message:
      lastTop !== null
        ? `${formatKg(base)}kg, último top ${lastTop} reps. Meta: ${rep_range_high}. Puxa mais uma.`
        : `${formatKg(base)}kg, range ${rep_range_low}-${rep_range_high}. Bora construir.`,
    confidence: "medium",
  };
}

/**
 * Given the working sets of a just-finished session, produce the new stored
 * state. Called once per exercise that had at least one working set.
 */
export function computeProgressionState(input: {
  exercise: ExerciseConfig;
  templateExercise: TemplateExerciseConfig;
  workingSets: WorkingSet[];
  currentState: ProgressionStateRow;
  sessionDate: string;
}): ProgressionStateRow {
  const { templateExercise, workingSets, currentState, sessionDate } = input;
  if (workingSets.length === 0) return currentState;

  const { rep_range_high, target_sets } = templateExercise;

  const maxWeight = Math.max(...workingSets.map((s) => s.weight_kg));
  const topReps = Math.max(...workingSets.map((s) => s.reps));

  const enoughSets = workingSets.length >= target_sets;
  const allAtTop = workingSets.every((s) => s.reps >= rep_range_high);
  // Missing RIR is treated as "good enough" — don't block progress just because
  // the user forgot to tap the pill.
  const allWithGoodRIR = workingSets.every(
    (s) => s.rir === null || s.rir >= 1
  );

  const prior = currentState;
  const weightIncreased =
    prior.current_weight_kg !== null &&
    maxWeight > prior.current_weight_kg + 0.01;
  const weightSame =
    prior.current_weight_kg !== null &&
    Math.abs(maxWeight - prior.current_weight_kg) < 0.01;

  let status: ProgressionStatus;
  let streak = prior.streak_at_top_range;
  let stall = prior.stall_count;
  let sessionsAtWeight = prior.sessions_at_current_weight;

  if (weightIncreased) {
    // User bumped load this session → consolidate next time.
    status = "just_progressed";
    streak = 0;
    stall = 0;
    sessionsAtWeight = 1;
  } else if (enoughSets && allAtTop && allWithGoodRIR) {
    // Everything at top range with juice left → ready to bump next session.
    status = "ready_to_progress";
    streak = streak + 1;
    stall = 0;
    sessionsAtWeight = weightSame ? sessionsAtWeight + 1 : 1;
  } else {
    const addedReps =
      prior.last_top_set_reps !== null && topReps > prior.last_top_set_reps;

    if (weightSame && !addedReps) {
      stall = stall + 1;
    } else {
      stall = 0;
    }
    sessionsAtWeight = weightSame ? sessionsAtWeight + 1 : 1;
    status = stall >= 3 ? "stalled" : "building";
    streak = 0;
  }

  return {
    current_weight_kg: maxWeight,
    current_status: status,
    last_top_set_reps: topReps,
    streak_at_top_range: streak,
    stall_count: stall,
    sessions_at_current_weight: sessionsAtWeight,
    last_session_date: sessionDate,
  };
}

// -- formatting helpers ----------------------------------------------------

function roundWeight(w: number): number {
  // Round to the nearest 0.25 kg, which matches both barbell and dumbbell
  // increments used in the seed exercises (0.25, 1.0, 2.5, 5.0).
  return Math.round(w * 4) / 4;
}

function formatKg(w: number): string {
  // Trim trailing .0 but keep fractional digits when present.
  return Number.isInteger(w) ? String(w) : w.toFixed(2).replace(/\.?0+$/, "");
}
