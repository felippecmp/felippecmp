"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { logBodyWeight } from "./peso/actions";

type Props = {
  todayWeight: {
    id: string;
    weightKg: number;
    recordedAt: string;
  } | null;
  latestWeight: {
    weightKg: number;
    recordedAt: string;
  } | null;
};

export function QuickWeightAdd({ todayWeight, latestWeight }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // If today is already logged, render a read-only strip linking to /peso.
  if (todayWeight && !editing) {
    return (
      <Link
        href="/peso"
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Peso hoje
          </p>
          <div className="flex items-baseline gap-1">
            <span className="display-sm text-xl tnum">
              {todayWeight.weightKg.toFixed(1)}
            </span>
            <span className="text-xs text-[var(--text-dim)]">kg</span>
          </div>
        </div>
        <ArrowRight
          size={14}
          strokeWidth={1.75}
          className="text-[var(--text-dim)]"
        />
      </Link>
    );
  }

  if (editing) {
    return (
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await logBodyWeight(formData);
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
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                Peso hoje
              </span>
              <div className="flex items-baseline gap-1">
                <input
                  name="weight_kg"
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  autoFocus
                  placeholder={
                    latestWeight ? latestWeight.weightKg.toFixed(1) : "74.2"
                  }
                  className="flex-1 bg-transparent border-0 border-b border-[var(--border)] focus:border-[var(--text-muted)] focus:outline-none display-sm text-xl tnum py-1 min-w-0"
                />
                <span className="text-xs text-[var(--text-dim)]">kg</span>
              </div>
            </label>
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

  // No entry for today yet: inline quick-add prompt.
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-transparent hover:border-[var(--text-muted)] hover:bg-[var(--bg-card)]/40 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
          Registrar peso
        </p>
        {latestWeight ? (
          <p className="text-xs text-[var(--text-soft)] tnum">
            Último: {latestWeight.weightKg.toFixed(1)} kg ·{" "}
            {formatDate(latestWeight.recordedAt)}
          </p>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            Sem registros ainda
          </p>
        )}
      </div>
      <ArrowRight
        size={14}
        strokeWidth={1.75}
        className="text-[var(--text-dim)]"
      />
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
