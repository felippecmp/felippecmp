"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { MUSCLES } from "@/lib/muscles";
import type { MesocycleWeekRow } from "@/lib/coach/mesocycle";
import { updateMesocycleWeek } from "../actions";

/**
 * Inline grid editor for the volume targets of a single mesocycle week.
 * Renders 15 small number inputs (one per muscle) and a save button. Marks
 * `user_overrode = true` on save so the coach knows the user touched it.
 */
export function WeekTargetsEditor({ week }: { week: MesocycleWeekRow }) {
  const [targets, setTargets] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const m of MUSCLES) {
      out[m.value] = String(week.volume_targets?.[m.value] ?? 0);
    }
    return out;
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    const out: Record<string, number> = {};
    for (const m of MUSCLES) {
      const n = parseInt(targets[m.value] ?? "0", 10);
      if (Number.isFinite(n) && n >= 0 && n <= 30 && n > 0) {
        out[m.value] = n;
      }
    }
    startTransition(async () => {
      const result = await updateMesocycleWeek(week.id, {
        volume_targets: out,
      });
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="px-4 pb-4 pt-1 bg-[var(--bg-raised)]/50 border-t border-[var(--border)]">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2 mt-2">
        Targets de volume (sets/semana)
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {MUSCLES.map((m) => (
          <label
            key={m.value}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1"
          >
            <span className="block text-[9px] uppercase tracking-wider text-[var(--text-muted)] truncate leading-tight">
              {m.label}
            </span>
            <input
              type="number"
              min="0"
              max="30"
              value={targets[m.value] ?? ""}
              onChange={(e) =>
                setTargets((prev) => ({ ...prev, [m.value]: e.target.value }))
              }
              disabled={isPending}
              className="w-full bg-transparent border-0 focus:outline-none text-sm tnum tabular-nums py-0.5 disabled:opacity-60"
            />
          </label>
        ))}
      </div>
      {error && (
        <p className="text-[10px] text-[var(--danger)] mt-2">{error}</p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-3 w-full text-xs bg-accent text-accent-fg py-2 rounded-lg font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
      >
        {saved ? (
          <>
            <Check size={12} strokeWidth={2.5} />
            Salvo
          </>
        ) : isPending ? (
          "Salvando…"
        ) : (
          "Salvar semana"
        )}
      </button>
    </div>
  );
}
