"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  CloudOff,
  Flame,
  Loader2,
  Plus,
  Timer,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { equipmentLabel, muscleLabel } from "@/lib/muscles";
import {
  statusCssVar,
  statusLabel,
  type ProgressionSuggestion,
} from "@/lib/progression";
import { useOnlineStatus } from "@/lib/use-online-status";
import { deleteSet, logSet, updateSet } from "./actions";

export type ReferenceSet = {
  weightKg: number;
  reps: number;
  rir: number | null;
};

export type ExistingSet = {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number | null;
  isWarmup: boolean;
};

export type ExerciseBlockData = {
  templateExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  targetSets: number;
  repRangeLow: number;
  repRangeHigh: number;
  restSeconds: number;
  previousSets: ReferenceSet[];
  /** ISO timestamp of the session previousSets came from, when known. */
  previousSetsAt: string | null;
  existingSets: ExistingSet[];
  suggestion: ProgressionSuggestion;
  /**
   * True when the block was added to this session ad-hoc (not part of the
   * template). Ad-hoc blocks can be removed from the session as long as no
   * sets have been logged against them yet.
   */
  isAdhoc: boolean;
};

export type CatalogExercise = {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string | null;
  sessionType: "upper" | "lower";
};

type RowState = {
  // Stable client key (so React reconciliation doesn't blow away in-progress edits)
  key: string;
  // Server id once saved; null for unsaved new rows
  id: string | null;
  weight: string;
  reps: string;
  rir: number | null;
  // Warmup sets are excluded from the progression engine and live in their
  // own section visually.
  isWarmup: boolean;
  saving: boolean;
  error: string | null;
  // True when a save attempt failed due to network — queued for auto-retry.
  pendingOffline: boolean;
};

type PersistedRow = Omit<RowState, "saving" | "error">;

function initialRows(exercise: ExerciseBlockData): RowState[] {
  // Put warmup sets first (in setNumber order) then working sets.
  const sorted = [...exercise.existingSets].sort((a, b) => {
    if (a.isWarmup !== b.isWarmup) return a.isWarmup ? -1 : 1;
    return a.setNumber - b.setNumber;
  });
  const rows: RowState[] = sorted.map((s) => ({
    key: `saved-${s.id}`,
    id: s.id,
    weight: String(s.weightKg),
    reps: String(s.reps),
    rir: s.rir,
    isWarmup: s.isWarmup,
    saving: false,
    error: null,
    pendingOffline: false,
  }));

  // Pre-fill empty working rows with the suggested weight AND smart reps
  // based on the progression status. The user just adjusts what changed.
  const seedWeight =
    exercise.suggestion.suggestedWeight !== null
      ? String(exercise.suggestion.suggestedWeight)
      : "";

  // Decide what reps to pre-fill based on whether the weight changed.
  // - Weight went UP → reset reps to rep_range_low (start of new weight)
  // - Same weight → use last session's reps (try to match or beat)
  // - Deload (weight DOWN) → use rep_range_high (comfortable)
  const prevTopWeight =
    exercise.previousSets.length > 0
      ? Math.max(...exercise.previousSets.map((s) => s.weightKg))
      : null;
  const suggestedWeight = exercise.suggestion.suggestedWeight;

  let seedReps: string[];
  if (
    suggestedWeight !== null &&
    prevTopWeight !== null &&
    suggestedWeight > prevTopWeight
  ) {
    // Weight went up → reset to bottom of rep range
    seedReps = Array(exercise.targetSets).fill(
      String(exercise.repRangeLow)
    );
  } else if (
    suggestedWeight !== null &&
    prevTopWeight !== null &&
    suggestedWeight < prevTopWeight
  ) {
    // Deload → start comfortable at top of range
    seedReps = Array(exercise.targetSets).fill(
      String(exercise.repRangeHigh)
    );
  } else {
    // Same weight → carry over last session's reps
    seedReps = exercise.previousSets.map((s) => String(s.reps));
  }

  const workingCount = rows.filter((r) => !r.isWarmup).length;
  const missing = Math.max(0, exercise.targetSets - workingCount);
  for (let i = 0; i < missing; i++) {
    rows.push({
      key: `empty-${i}`,
      id: null,
      weight: seedWeight,
      reps: seedReps[i] ?? "",
      rir: null,
      isWarmup: false,
      saving: false,
      error: null,
      pendingOffline: false,
    });
  }
  return rows;
}

function draftKey(sessionId: string, exerciseId: string): string {
  return `flog:draft:${sessionId}:${exerciseId}`;
}

function hydrateRowsFromDraft(key: string): RowState[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRow[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((r) => ({
      key: r.key,
      id: r.id,
      weight: r.weight,
      reps: r.reps,
      rir: r.rir,
      isWarmup: r.isWarmup ?? false,
      saving: false,
      error: null,
      pendingOffline: r.pendingOffline ?? false,
    }));
  } catch {
    return null;
  }
}

function persistRowsToDraft(key: string, rows: RowState[]): void {
  if (typeof window === "undefined") return;
  try {
    const toPersist: PersistedRow[] = rows.map((r) => ({
      key: r.key,
      id: r.id,
      weight: r.weight,
      reps: r.reps,
      rir: r.rir,
      isWarmup: r.isWarmup,
      pendingOffline: r.pendingOffline,
    }));
    localStorage.setItem(key, JSON.stringify(toPersist));
  } catch {
    // quota exceeded / private mode — ignore, offline is best-effort
  }
}

function parseWeight(s: string): number | null {
  if (s.trim() === "") return null;
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseReps(s: string): number | null {
  if (s.trim() === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type RestState = {
  // Incremented each time a rest starts; used to reset timer effects.
  token: number;
  exerciseName: string;
  totalSeconds: number;
  startedAt: number;
};

export function WorkoutSession({
  sessionId,
  exercises: initialExercises,
  catalog,
  sessionType,
  disabled = false,
  phaseRirTarget = null,
}: {
  sessionId: string;
  exercises: ExerciseBlockData[];
  catalog: CatalogExercise[];
  sessionType: "upper" | "lower";
  disabled?: boolean;
  /** RIR target from the active mesocycle phase, e.g. "RIR 3" */
  phaseRirTarget?: string | null;
}) {
  const [editMode, setEditMode] = useState(false);
  const effectiveDisabled = disabled && !editMode;
  const [rest, setRest] = useState<RestState | null>(null);
  const restTokenRef = useRef(0);
  const online = useOnlineStatus();
  const [exercises, setExercises] =
    useState<ExerciseBlockData[]>(initialExercises);
  const [pickerOpen, setPickerOpen] = useState(false);
  // When swapping, store the templateExerciseId being replaced.
  // The picker opens and on selection, the exercise is replaced in-place.
  const [swappingId, setSwappingId] = useState<string | null>(null);

  // If the server-side list changes (e.g., router refresh after finish),
  // re-sync local state. We intentionally don't merge — whatever the server
  // returned is canonical once we observe a change in its identity.
  const initialRef = useRef(initialExercises);
  useEffect(() => {
    if (initialRef.current !== initialExercises) {
      initialRef.current = initialExercises;
      setExercises(initialExercises);
    }
  }, [initialExercises]);

  function startRest(seconds: number, exerciseName: string) {
    if (seconds <= 0) return;
    restTokenRef.current += 1;
    setRest({
      token: restTokenRef.current,
      exerciseName,
      totalSeconds: seconds,
      // Only ever called from event handlers (onSetLogged), not during render.
      // eslint-disable-next-line react-hooks/purity
      startedAt: Date.now(),
    });
  }

  function dismissRest() {
    setRest(null);
  }

  function handlePickExercise(ex: CatalogExercise) {
    setPickerOpen(false);

    // Swap mode: replace the exercise block in-place
    if (swappingId) {
      setExercises((prev) =>
        prev.map((e) =>
          e.templateExerciseId === swappingId
            ? {
                ...e,
                exerciseId: ex.id,
                exerciseName: ex.name,
                primaryMuscle: ex.primaryMuscle,
                previousSets: [],
                previousSetsAt: null,
                existingSets: [],
                suggestion: {
                  suggestedWeight: null,
                  status: "building" as const,
                  message: `Trocado pra ${ex.name}. Escolha um peso e anote.`,
                  confidence: "low" as const,
                },
              }
            : e
        )
      );
      setSwappingId(null);
      return;
    }

    // Add mode: de-dup, if the exercise already exists don't add again.
    if (exercises.some((e) => e.exerciseId === ex.id)) return;

    const newBlock: ExerciseBlockData = {
      templateExerciseId: `adhoc-${ex.id}`,
      exerciseId: ex.id,
      exerciseName: ex.name,
      primaryMuscle: ex.primaryMuscle,
      // These defaults match what page.tsx would produce on refresh after
      // sets get logged — keeps the UX consistent across reloads.
      targetSets: 2,
      repRangeLow: 4,
      repRangeHigh: 8,
      restSeconds: 180,
      previousSets: [],
      previousSetsAt: null,
      existingSets: [],
      suggestion: {
        suggestedWeight: null,
        status: "building",
        message: "Exercício adicionado agora. Escolha um peso e anote.",
        confidence: "low",
      },
      isAdhoc: true,
    };
    setExercises((prev) => [...prev, newBlock]);
  }

  function handleRemoveBlock(templateExerciseId: string) {
    setExercises((prev) =>
      prev.filter((e) => e.templateExerciseId !== templateExerciseId)
    );
  }

  const usedIds = new Set(exercises.map((e) => e.exerciseId));
  const pickerOptions = catalog.filter((e) => !usedIds.has(e.id));

  return (
    <>
      {!online && <OfflineBanner />}

      {disabled && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              editMode
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {editMode ? "Sair da edição" : "Editar sessão"}
          </button>
        </div>
      )}

      <ul className="space-y-3 mb-4">
        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={ex.templateExerciseId}
            number={idx + 1}
            sessionId={sessionId}
            exercise={ex}
            disabled={effectiveDisabled}
            phaseRirTarget={phaseRirTarget}
            onSetLogged={() => startRest(ex.restSeconds, ex.exerciseName)}
            onRemoveBlock={() => handleRemoveBlock(ex.templateExerciseId)}
            onSwapExercise={
              !effectiveDisabled
                ? () => {
                    setSwappingId(ex.templateExerciseId);
                    setPickerOpen(true);
                  }
                : null
            }
          />
        ))}
      </ul>

      {!effectiveDisabled && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={pickerOptions.length === 0}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] disabled:opacity-50 py-3.5 rounded-xl text-sm font-medium transition-colors mb-8"
        >
          <Plus size={14} strokeWidth={1.75} />
          {pickerOptions.length === 0
            ? "Todos os exercícios já estão na sessão"
            : "Adicionar exercício ao treino"}
        </button>
      )}

      <RestTimer rest={rest} onDismiss={dismissRest} />

      {pickerOpen && (
        <AdhocExercisePicker
          exercises={pickerOptions}
          sessionType={sessionType}
          onPick={handlePickExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

function OfflineBanner() {
  return (
    <div className="mb-4 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] px-4 py-3 flex items-center gap-3">
      <WifiOff
        size={14}
        strokeWidth={1.75}
        className="shrink-0 text-[var(--status-stalled)]"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          Sem conexão
        </p>
        <p className="text-xs text-[var(--text-soft)] leading-snug">
          Sets salvos localmente serão sincronizados quando voltar.
        </p>
      </div>
    </div>
  );
}

function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function RestTimer({
  rest,
  onDismiss,
}: {
  rest: RestState | null;
  onDismiss: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rest]);

  useEffect(() => {
    if (!rest) {
      firedRef.current = null;
      return;
    }
    const elapsed = Math.floor((now - rest.startedAt) / 1000);
    const remaining = rest.totalSeconds - elapsed;
    if (remaining <= 0 && firedRef.current !== rest.token) {
      firedRef.current = rest.token;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([180, 80, 180]);
        } catch {
          // no-op on unsupported browsers
        }
      }
    }
  }, [now, rest]);

  if (!rest) return null;

  const elapsed = Math.floor((now - rest.startedAt) / 1000);
  const remaining = rest.totalSeconds - elapsed;
  const done = remaining <= 0;
  const progress = Math.min(
    100,
    Math.max(0, (Math.min(elapsed, rest.totalSeconds) / rest.totalSeconds) * 100)
  );

  return (
    <div
      className="fixed inset-x-0 z-40 px-4 pointer-events-none"
      style={{ bottom: "calc(68px + env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto max-w-xl mx-auto">
        <div
          className={`relative overflow-hidden rounded-xl border bg-[var(--bg-card)] shadow-lg flex items-center gap-3 px-4 py-3 ${
            done
              ? "border-[var(--status-ready)]/60"
              : "border-[var(--border-strong)]"
          }`}
        >
          <div
            className={`absolute inset-y-0 left-0 transition-all ${
              done
                ? "bg-[var(--status-ready)]/15"
                : "bg-[var(--text)]/5"
            }`}
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
          <Timer
            size={16}
            strokeWidth={1.75}
            className={`shrink-0 relative ${
              done ? "text-[var(--status-ready)]" : "text-[var(--text-soft)]"
            }`}
          />
          <div className="flex-1 min-w-0 relative">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              {done ? "Pronto" : "Descanso"}
            </p>
            <p className="text-xs text-[var(--text-soft)] truncate">
              {rest.exerciseName}
            </p>
          </div>
          <div
            className={`tnum display-sm text-xl shrink-0 relative ${
              done ? "text-[var(--status-ready)]" : ""
            }`}
          >
            {formatMMSS(Math.max(0, remaining))}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dispensar timer"
            className="relative shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({
  number,
  sessionId,
  exercise,
  disabled,
  phaseRirTarget,
  onSetLogged,
  onRemoveBlock,
  onSwapExercise,
}: {
  number: number;
  sessionId: string;
  exercise: ExerciseBlockData;
  disabled: boolean;
  phaseRirTarget?: string | null;
  onSetLogged: () => void;
  onRemoveBlock: (() => void) | null;
  onSwapExercise?: ((newExercise: CatalogExercise) => void) | null;
}) {
  const DRAFT_KEY = draftKey(sessionId, exercise.exerciseId);
  const [rows, setRows] = useState<RowState[]>(() => initialRows(exercise));
  const [nextExtraId, setNextExtraId] = useState(0);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage draft on mount (client-only). Runs after the
  // first render so SSR and first client render agree on initialRows — no
  // hydration warning. Only overrides if there's actually a draft.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const hydrated = hydrateRowsFromDraft(DRAFT_KEY);
    if (hydrated) {
      setRows(hydrated);
    }
  }, [DRAFT_KEY]);

  // Persist rows on change so refreshes / crashes don't lose user input.
  useEffect(() => {
    if (!hydratedRef.current) return;
    persistRowsToDraft(DRAFT_KEY, rows);
  }, [DRAFT_KEY, rows]);

  function patchRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleSave(row: RowState, rowIndex: number) {
    const weight = parseWeight(row.weight);
    const reps = parseReps(row.reps);

    if (weight === null) {
      patchRow(row.key, { error: "Peso inválido" });
      return;
    }
    if (reps === null) {
      patchRow(row.key, { error: "Reps inválidos" });
      return;
    }

    patchRow(row.key, { saving: true, error: null });

    try {
      if (row.id) {
        const result = await updateSet(row.id, {
          weightKg: weight,
          reps,
          rir: row.rir,
        });
        patchRow(row.key, {
          saving: false,
          error: result.ok ? null : result.error,
          pendingOffline: false,
        });
      } else {
        const result = await logSet({
          sessionId,
          exerciseId: exercise.exerciseId,
          setNumber: rowIndex + 1,
          weightKg: weight,
          reps,
          rir: row.rir,
          isWarmup: row.isWarmup,
        });
        if (result.ok) {
          patchRow(row.key, {
            id: result.id,
            saving: false,
            error: null,
            pendingOffline: false,
          });
          // Rest timer only auto-starts for working sets — warmup shouldn't
          // force a long rest.
          if (!row.isWarmup) onSetLogged();
        } else {
          patchRow(row.key, { saving: false, error: result.error });
        }
      }
    } catch {
      // Network failure (or dev-tools offline). Keep the row data in the
      // draft; it'll be retried on the next "online" event.
      const offline =
        typeof navigator !== "undefined" && !navigator.onLine;
      patchRow(row.key, {
        saving: false,
        pendingOffline: offline,
        error: offline ? null : "Falha ao salvar. Tente novamente.",
      });
    }
  }

  async function handleRemove(row: RowState) {
    // If the row was never saved on the server, just drop it locally.
    if (!row.id) {
      setRows((prev) => prev.filter((r) => r.key !== row.key));
      return;
    }

    patchRow(row.key, { saving: true, error: null });
    try {
      const result = await deleteSet(row.id);
      if (!result.ok) {
        patchRow(row.key, { saving: false, error: result.error });
        return;
      }
      setRows((prev) => prev.filter((r) => r.key !== row.key));
    } catch {
      // Offline delete: we don't queue deletes in this sprint — surface the
      // error so the user knows to retry once back online.
      patchRow(row.key, {
        saving: false,
        error: "Sem conexão, tente remover depois.",
      });
    }
  }

  function handleAddExtra() {
    const id = nextExtraId;
    setNextExtraId(id + 1);
    // Seed from the last saved working row, otherwise from the progression
    // suggestion. Falls back to an empty string.
    const lastSavedWorking = [...rows]
      .reverse()
      .find((r) => r.id !== null && !r.isWarmup);
    const seedWeight = lastSavedWorking
      ? lastSavedWorking.weight
      : exercise.suggestion.suggestedWeight !== null
        ? String(exercise.suggestion.suggestedWeight)
        : "";
    setRows((prev) => [
      ...prev,
      {
        key: `extra-${id}`,
        id: null,
        weight: seedWeight,
        reps: "",
        rir: null,
        isWarmup: false,
        saving: false,
        error: null,
        pendingOffline: false,
      },
    ]);
  }

  function handleDeload() {
    const w = exercise.suggestion.suggestedWeight;
    if (!w || w <= 0) return;
    // -10%, rounded to nearest 0.25 kg.
    const deloaded = Math.round(w * 0.9 * 4) / 4;
    setRows((prev) =>
      prev.map((r) => {
        // Only pre-fill unsaved working rows.
        if (r.id !== null || r.isWarmup) return r;
        return { ...r, weight: String(deloaded) };
      })
    );
  }

  function handleAddWarmup() {
    const id = nextExtraId;
    setNextExtraId(id + 1);
    // Warmup rows don't get pre-filled with the suggested working weight —
    // users typically ramp up from a lower percentage.
    setRows((prev) => {
      // Insert new warmup row after the existing warmup rows so it lands at
      // the bottom of the warmup section.
      const lastWarmupIdx = prev.reduce(
        (acc, r, idx) => (r.isWarmup ? idx : acc),
        -1
      );
      const insertAt = lastWarmupIdx + 1;
      const newRow: RowState = {
        key: `warmup-${id}`,
        id: null,
        weight: "",
        reps: "",
        rir: null,
        isWarmup: true,
        saving: false,
        error: null,
        pendingOffline: false,
      };
      return [...prev.slice(0, insertAt), newRow, ...prev.slice(insertAt)];
    });
  }

  // Auto-retry pending rows when the browser comes back online. We keep a
  // ref to the latest handler so the event listener isn't re-attached on
  // every rows change.
  const retryRef = useRef<() => void>(() => {});
  useEffect(() => {
    retryRef.current = () => {
      rows.forEach((row, idx) => {
        if (row.pendingOffline && !row.saving) {
          handleSave(row, idx);
        }
      });
    };
  });

  useEffect(() => {
    function onOnline() {
      retryRef.current();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // One-shot retry on mount if we ended up with pending rows while already
  // online (e.g., after a refresh while Wi-Fi came back).
  const didInitialRetry = useRef(false);
  useEffect(() => {
    if (didInitialRetry.current) return;
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    if (!rows.some((r) => r.pendingOffline && !r.saving)) return;
    didInitialRetry.current = true;
    retryRef.current();
  }, [rows]);

  const reference = exercise.previousSets;
  const suggestion = exercise.suggestion;

  // Allow removing/swapping while no sets have been logged.
  const hasAnySet = rows.some((r) => r.id !== null);
  const canRemove = !!onRemoveBlock && !hasAnySet && !disabled;
  const canSwap = !!onSwapExercise && !hasAnySet && !disabled;
  // Allow deleting an exercise entirely (even template ones) when no sets saved.
  const canDelete = !hasAnySet && !disabled;

  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-7 h-7 rounded-lg border border-[var(--border)] text-[var(--text-dim)] flex items-center justify-center text-xs tnum font-semibold">
            {number}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-[15px] leading-tight truncate flex-1 min-w-0">
                {exercise.exerciseName}
              </div>
              {exercise.isAdhoc && (
                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--border-strong)] text-[var(--text-muted)]">
                  ad-hoc
                </span>
              )}
              {canSwap && (
                <button
                  type="button"
                  onClick={() => onSwapExercise?.({} as CatalogExercise)}
                  aria-label="Trocar exercício"
                  title="Trocar exercício"
                  className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"
                >
                  <ArrowLeftRight size={12} strokeWidth={1.75} />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onRemoveBlock?.()}
                  aria-label="Remover exercício da sessão"
                  title="Remover exercício"
                  className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors"
                >
                  <X size={12} strokeWidth={1.75} />
                </button>
              )}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 tnum">
              {muscleLabel(exercise.primaryMuscle)} · {exercise.targetSets} sets ·{" "}
              {exercise.repRangeLow}-{exercise.repRangeHigh} reps
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <StatusBadge suggestion={suggestion} />
              {suggestion.suggestedWeight !== null && (
                <span className="text-[11px] text-[var(--text-soft)] tnum">
                  Hoje:{" "}
                  <strong className="text-[var(--text)]">
                    {suggestion.suggestedWeight}kg
                  </strong>
                </span>
              )}
              {suggestion.status === "stalled" &&
                suggestion.suggestedWeight !== null &&
                !disabled && (
                  <button
                    type="button"
                    onClick={handleDeload}
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border border-[var(--status-stalled)] text-[var(--status-stalled)] hover:bg-[var(--status-stalled)]/10 transition-colors"
                  >
                    Deload -10%
                  </button>
                )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
              {suggestion.message}
            </p>

            <p className="text-[11px] text-[var(--text-soft)] mt-2 tnum">
              {reference.length > 0 ? (
                <>
                  <span className="uppercase tracking-wider mr-1 text-[var(--text-dim)]">
                    Último:
                  </span>
                  {reference
                    .map(
                      (s) =>
                        `${s.weightKg}×${s.reps}${
                          s.rir != null ? ` @${s.rir}` : ""
                        }`
                    )
                    .join(" · ")}
                  {exercise.previousSetsAt && (
                    <span className="text-[var(--text-dim)]">
                      {" · "}
                      {formatRelativeDay(exercise.previousSetsAt)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[var(--text-dim)]">
                  Primeira vez nesse exercício
                </span>
              )}
            </p>

            {phaseRirTarget && (
              <p className="text-[10px] text-[var(--accent)] mt-1.5 uppercase tracking-wider tnum">
                Fase: {phaseRirTarget}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--bg-raised)] divide-y divide-[var(--border)]">
        {(() => {
          // Compute display labels as we iterate so warmup rows get "W1/W2"
          // and working rows get "01/02", independent of array position.
          let warmupN = 0;
          let workingN = 0;
          return rows.map((row, idx) => {
            const label = row.isWarmup
              ? `W${(++warmupN).toString()}`
              : (++workingN).toString().padStart(2, "0");
            return (
              <SetRowInput
                key={row.key}
                row={row}
                label={label}
                disabled={disabled}
                onChange={(patch) => patchRow(row.key, patch)}
                onSave={() => handleSave(row, idx)}
                onRemove={() => handleRemove(row)}
              />
            );
          });
        })()}
      </div>

      <div className="flex border-t border-[var(--border)] divide-x divide-[var(--border)]">
        <button
          type="button"
          onClick={handleAddWarmup}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text-soft)] disabled:opacity-40 transition-colors"
        >
          <Flame size={11} strokeWidth={1.75} />
          Aquecimento
        </button>
        <button
          type="button"
          onClick={handleAddExtra}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 transition-colors"
        >
          <Plus size={12} strokeWidth={2} />
          Set extra
        </button>
      </div>
    </li>
  );
}

function AdhocExercisePicker({
  exercises,
  sessionType,
  onPick,
  onClose,
}: {
  exercises: CatalogExercise[];
  sessionType: "upper" | "lower";
  onPick: (ex: CatalogExercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [showOtherType, setShowOtherType] = useState(false);

  const matchesType = (e: CatalogExercise) =>
    showOtherType ? true : e.sessionType === sessionType;
  const matchesQuery = (e: CatalogExercise) =>
    e.name.toLowerCase().includes(query.toLowerCase());

  const filtered = exercises.filter(
    (e) => matchesType(e) && matchesQuery(e)
  );

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      style={{ height: "100dvh" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[var(--bg-raised)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col"
      >
        <div className="px-6 pt-5 pb-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="display-sm text-xl">Adicionar exercício</h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Só pra este treino — não afeta o template.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-6 py-3 shrink-0 space-y-3">
          <input
            type="search"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)]"
          />
          <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={showOtherType}
              onChange={(e) => setShowOtherType(e.target.checked)}
              className="accent-[var(--text)]"
            />
            Mostrar também exercícios do outro tipo (
            {sessionType === "upper" ? "lower" : "upper"})
          </label>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 pb-8"
          style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
        >
          {filtered.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] text-sm py-10">
              Nenhum exercício encontrado.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onPick(e)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-[var(--bg-card)] transition-colors"
                  >
                    <div className="font-medium text-sm">{e.name}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {muscleLabel(e.primaryMuscle)}
                      {e.equipment && (
                        <>
                          {" · "}
                          {equipmentLabel(e.equipment)}
                        </>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ suggestion }: { suggestion: ProgressionSuggestion }) {
  const color = statusCssVar(suggestion.status);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border"
      style={{
        color,
        borderColor: color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      {statusLabel(suggestion.status)}
    </span>
  );
}

function SetRowInput({
  row,
  label,
  disabled,
  onChange,
  onSave,
  onRemove,
}: {
  row: RowState;
  label: string;
  disabled: boolean;
  onChange: (patch: Partial<RowState>) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const saved = row.id !== null && !row.saving;
  const pending = row.pendingOffline;
  const warmup = row.isWarmup;

  return (
    <div className={`px-4 py-3 ${warmup ? "bg-[var(--bg-card)]/40" : ""}`}>
      <div className="flex items-center gap-2">
        <span
          className={`shrink-0 w-6 text-[10px] tnum font-semibold tracking-wider ${
            warmup ? "text-[var(--text-dim)] italic" : "text-[var(--text-dim)]"
          }`}
        >
          {label}
        </span>
        <label className="flex-1 min-w-0">
          <input
            type="text"
            inputMode="decimal"
            placeholder="kg"
            value={row.weight}
            onChange={(e) => onChange({ weight: e.target.value, error: null })}
            disabled={row.saving || disabled}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm tnum text-right focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </label>
        <span className="text-[var(--text-dim)] text-xs">×</span>
        <label className="flex-1 min-w-0">
          <input
            type="text"
            inputMode="numeric"
            placeholder="reps"
            value={row.reps}
            onChange={(e) => onChange({ reps: e.target.value, error: null })}
            disabled={row.saving || disabled}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm tnum text-right focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </label>
        <button
          type="button"
          onClick={onSave}
          disabled={row.saving || disabled}
          aria-label={
            pending
              ? "Aguardando sincronização"
              : saved
                ? "Atualizar set"
                : "Salvar set"
          }
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
            pending
              ? "border border-[var(--status-stalled)]/60 text-[var(--status-stalled)] bg-transparent"
              : saved
                ? "border border-[var(--status-ready)]/50 text-[var(--status-ready)] bg-transparent"
                : "bg-accent text-accent-fg hover:bg-accent-hover"
          }`}
        >
          {row.saving ? (
            <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
          ) : pending ? (
            <CloudOff size={14} strokeWidth={2} />
          ) : (
            <Check size={14} strokeWidth={2.5} />
          )}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={row.saving || disabled}
          aria-label="Remover set"
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors disabled:opacity-30"
        >
          <Trash2 size={12} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mt-2 pl-8">
        <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider shrink-0 mr-1">
          RIR
        </span>
        {[0, 1, 2, 3].map((r) => {
          const active = row.rir === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() =>
                onChange({ rir: active ? null : r, error: null })
              }
              disabled={row.saving || disabled}
              className={`w-7 h-7 rounded-md border text-xs tnum font-semibold transition-colors ${
                active
                  ? "border-[var(--text)] bg-accent text-accent-fg"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
              } disabled:opacity-40`}
            >
              {r}
            </button>
          );
        })}
      </div>

      {row.error && (
        <p className="text-[10px] text-[var(--danger)] mt-1.5 pl-8">
          {row.error}
        </p>
      )}
    </div>
  );
}

function formatRelativeDay(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenMid = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const diffDays = Math.round(
    (todayMid.getTime() - thenMid.getTime()) / 86400000
  );
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays}d`;
  if (diffDays < 30) return `há ${Math.round(diffDays / 7)}sem`;
  return then.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
