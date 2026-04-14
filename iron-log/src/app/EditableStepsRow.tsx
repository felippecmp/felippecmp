"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, TrendingUp, X } from "lucide-react";
import { useToast } from "@/components/Toast";
import { logDailySteps } from "./passos/actions";

export function EditableStepsRow({
  steps,
  stepDate,
}: {
  steps: number;
  stepDate: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await logDailySteps(formData);
      if (result.ok) {
        setEditing(false);
        toast("Passos atualizados");
      } else {
        setError(result.error);
      }
    });
  }

  if (editing) {
    const inputId = `steps-edit-${stepDate}`;
    const errorId = `${inputId}-error`;
    return (
      <li className="px-4 py-3.5">
        <form
          action={handleSubmit}
          className="flex items-center gap-2"
          aria-busy={isPending}
        >
          <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--status-building) 15%, transparent)" }}>
            <TrendingUp size={12} strokeWidth={1.75} className="text-[var(--status-building)]" />
          </div>
          <div className="flex-1 min-w-0">
            <label htmlFor={inputId} className="sr-only">
              Passos do dia
            </label>
            <input
              id={inputId}
              name="steps"
              type="number"
              min="0"
              required
              autoFocus
              defaultValue={steps}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={`w-full bg-transparent border-0 border-b focus:outline-none text-sm tnum py-1 ${
                error
                  ? "border-[var(--danger)]"
                  : "border-[var(--border)] focus:border-[var(--accent)]"
              }`}
            />
            <input type="hidden" name="step_date" value={stepDate} />
          </div>
          <button
            type="button"
            onClick={() => { setEditing(false); setError(null); }}
            disabled={isPending}
            aria-label="Cancelar edição"
            className="shrink-0 w-11 h-11 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition-transform disabled:opacity-60"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
          <button
            type="submit"
            disabled={isPending}
            aria-label={isPending ? "Salvando" : "Salvar passos"}
            className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {isPending ? (
              <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
            ) : (
              <Check size={14} strokeWidth={2.5} />
            )}
          </button>
        </form>
        {error && (
          <p
            id={errorId}
            className="text-[10px] text-[var(--danger)] mt-1 ml-10"
            role="alert"
          >
            {error}
          </p>
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] transition-colors text-left"
      >
        <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--status-building) 15%, transparent)" }}>
          <TrendingUp size={12} strokeWidth={1.75} className="text-[var(--status-building)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            <span className="tnum tabular-nums">
              {steps.toLocaleString("pt-BR")}
            </span>{" "}
            passos
            {steps >= 8000 && (
              <span className="text-[10px] ml-1.5 text-[var(--status-ready)] font-semibold">
                meta ✓
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-[var(--text-dim)]">editar</span>
      </button>
    </li>
  );
}
