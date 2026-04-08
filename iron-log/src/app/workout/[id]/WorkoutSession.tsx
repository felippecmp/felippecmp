"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, Timer, Trash2, X } from "lucide-react";
import { muscleLabel } from "@/lib/muscles";
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
  existingSets: ExistingSet[];
};

type RowState = {
  // Stable client key (so React reconciliation doesn't blow away in-progress edits)
  key: string;
  // Server id once saved; null for unsaved new rows
  id: string | null;
  weight: string;
  reps: string;
  rir: number | null;
  saving: boolean;
  error: string | null;
};

function initialRows(exercise: ExerciseBlockData): RowState[] {
  const rows: RowState[] = [...exercise.existingSets]
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s) => ({
      key: `saved-${s.id}`,
      id: s.id,
      weight: String(s.weightKg),
      reps: String(s.reps),
      rir: s.rir,
      saving: false,
      error: null,
    }));

  const missing = Math.max(0, exercise.targetSets - rows.length);
  for (let i = 0; i < missing; i++) {
    rows.push({
      key: `empty-${i}`,
      id: null,
      weight: "",
      reps: "",
      rir: null,
      saving: false,
      error: null,
    });
  }
  return rows;
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
  exercises,
  disabled = false,
}: {
  sessionId: string;
  exercises: ExerciseBlockData[];
  disabled?: boolean;
}) {
  const [rest, setRest] = useState<RestState | null>(null);
  const restTokenRef = useRef(0);

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

  return (
    <>
      <ul className="space-y-3 mb-8">
        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={ex.templateExerciseId}
            number={idx + 1}
            sessionId={sessionId}
            exercise={ex}
            disabled={disabled}
            onSetLogged={() => startRest(ex.restSeconds, ex.exerciseName)}
          />
        ))}
      </ul>
      <RestTimer rest={rest} onDismiss={dismissRest} />
    </>
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
  onSetLogged,
}: {
  number: number;
  sessionId: string;
  exercise: ExerciseBlockData;
  disabled: boolean;
  onSetLogged: () => void;
}) {
  const [rows, setRows] = useState<RowState[]>(() => initialRows(exercise));
  const [nextExtraId, setNextExtraId] = useState(0);

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

    if (row.id) {
      const result = await updateSet(row.id, {
        weightKg: weight,
        reps,
        rir: row.rir,
      });
      patchRow(row.key, {
        saving: false,
        error: result.ok ? null : result.error,
      });
    } else {
      const result = await logSet({
        sessionId,
        exerciseId: exercise.exerciseId,
        setNumber: rowIndex + 1,
        weightKg: weight,
        reps,
        rir: row.rir,
      });
      if (result.ok) {
        patchRow(row.key, { id: result.id, saving: false, error: null });
        onSetLogged();
      } else {
        patchRow(row.key, { saving: false, error: result.error });
      }
    }
  }

  async function handleRemove(row: RowState) {
    if (row.id) {
      patchRow(row.key, { saving: true, error: null });
      const result = await deleteSet(row.id);
      if (!result.ok) {
        patchRow(row.key, { saving: false, error: result.error });
        return;
      }
    }
    setRows((prev) => prev.filter((r) => r.key !== row.key));
  }

  function handleAddExtra() {
    const id = nextExtraId;
    setNextExtraId(id + 1);
    setRows((prev) => [
      ...prev,
      {
        key: `extra-${id}`,
        id: null,
        weight: "",
        reps: "",
        rir: null,
        saving: false,
        error: null,
      },
    ]);
  }

  const reference = exercise.previousSets;

  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-7 h-7 rounded-lg border border-[var(--border)] text-[var(--text-dim)] flex items-center justify-center text-xs tnum font-semibold">
            {number}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-[15px] leading-tight truncate">
              {exercise.exerciseName}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 tnum">
              {muscleLabel(exercise.primaryMuscle)} · {exercise.targetSets} sets ·{" "}
              {exercise.repRangeLow}-{exercise.repRangeHigh} reps
            </div>
            <p className="text-[11px] text-[var(--text-dim)] mt-2 tnum">
              {reference.length > 0 ? (
                <>
                  <span className="uppercase tracking-wider mr-1">Último:</span>
                  {reference
                    .map(
                      (s) =>
                        `${s.weightKg}×${s.reps}${
                          s.rir != null ? ` @${s.rir}` : ""
                        }`
                    )
                    .join(" · ")}
                </>
              ) : (
                "Sem histórico"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--bg-raised)] divide-y divide-[var(--border)]">
        {rows.map((row, idx) => (
          <SetRowInput
            key={row.key}
            row={row}
            index={idx}
            disabled={disabled}
            onChange={(patch) => patchRow(row.key, patch)}
            onSave={() => handleSave(row, idx)}
            onRemove={() => handleRemove(row)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddExtra}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-1.5 py-3 text-xs text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 transition-colors border-t border-[var(--border)]"
      >
        <Plus size={12} strokeWidth={2} />
        Set extra
      </button>
    </li>
  );
}

function SetRowInput({
  row,
  index,
  disabled,
  onChange,
  onSave,
  onRemove,
}: {
  row: RowState;
  index: number;
  disabled: boolean;
  onChange: (patch: Partial<RowState>) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const saved = row.id !== null && !row.saving;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 w-6 text-[10px] text-[var(--text-dim)] tnum font-semibold tracking-wider">
          {(index + 1).toString().padStart(2, "0")}
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
          aria-label={saved ? "Atualizar set" : "Salvar set"}
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
            saved
              ? "border border-[var(--status-ready)]/50 text-[var(--status-ready)] bg-transparent"
              : "bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
          }`}
        >
          {row.saving ? (
            <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
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
                  ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
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
