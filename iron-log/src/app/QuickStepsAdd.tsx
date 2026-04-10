"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { logDailySteps } from "./passos/actions";

type Props = {
  todaySteps: { id: string; steps: number; stepDate: string } | null;
};

export function QuickStepsAdd({ todaySteps }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (todaySteps && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Passos hoje
          </p>
          <div className="flex items-baseline gap-1">
            <span className="display-sm text-xl tnum">
              {todaySteps.steps.toLocaleString("pt-BR")}
            </span>
            <span className="text-xs text-[var(--text-dim)]">passos</span>
          </div>
        </div>
        <ArrowRight
          size={14}
          strokeWidth={1.75}
          className="text-[var(--text-dim)]"
        />
      </button>
    );
  }

  if (editing) {
    return (
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await logDailySteps(formData);
            if (result.ok) {
              setEditing(false);
            } else {
              setError(result.error);
            }
          });
        }}
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Passos
                </span>
                <input
                  name="steps"
                  type="number"
                  min="0"
                  required
                  autoFocus
                  defaultValue={todaySteps?.steps ?? ""}
                  placeholder="8500"
                  className="w-full bg-transparent border-0 border-b border-[var(--border)] focus:border-[var(--text-muted)] focus:outline-none display-sm text-xl tnum py-1"
                />
              </label>
              <label className="shrink-0 w-28">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Dia
                </span>
                <input
                  name="step_date"
                  type="date"
                  defaultValue={
                    todaySteps?.stepDate ?? new Date().toISOString().slice(0, 10)
                  }
                  className="w-full bg-transparent border-0 border-b border-[var(--border)] focus:border-[var(--text-muted)] focus:outline-none text-sm tnum py-1"
                />
              </label>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={isPending}
            className="shrink-0 w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-60"
            aria-label="Cancelar"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 w-9 h-9 rounded-lg bg-accent text-accent-fg flex items-center justify-center disabled:opacity-60"
            aria-label="Salvar"
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
        </div>
        {error && (
          <p className="text-[10px] text-[var(--danger)] mt-2">{error}</p>
        )}
      </form>
    );
  }

  // No entry yet — prompt
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-transparent hover:border-[var(--text-muted)] hover:bg-[var(--bg-card)]/40 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
          Registrar passos
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Hoje ou ontem — escolha o dia no form
        </p>
      </div>
      <ArrowRight
        size={14}
        strokeWidth={1.75}
        className="text-[var(--text-dim)]"
      />
    </button>
  );
}
