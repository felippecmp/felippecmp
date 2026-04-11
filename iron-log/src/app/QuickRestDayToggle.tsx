"use client";

import { useTransition } from "react";
import { Bed, Check } from "lucide-react";
import { markRestDay, unmarkRestDay } from "./descanso/actions";

type Props = {
  isRestDay: boolean;
  todayKey: string;
};

/**
 * Marks today as a rest day so the heatmap completion ceiling drops
 * from 4 (weight + strength + cardio + steps) to 3 (no strength), and
 * the Beast Mode crimson glow can still trigger on rest days when the
 * three remaining goals are hit.
 */
export function QuickRestDayToggle({ isRestDay, todayKey }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isRestDay) {
        await unmarkRestDay(todayKey);
      } else {
        const form = new FormData();
        form.append("rest_date", todayKey);
        await markRestDay(form);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isRestDay}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left disabled:opacity-60 ${
        isRestDay
          ? "border-[var(--text-muted)] bg-[var(--bg-card)]"
          : "border-dashed border-[var(--border-strong)] bg-transparent hover:border-[var(--text-muted)] hover:bg-[var(--bg-card)]/40"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
          {isRestDay ? "Hoje é descanso" : "Marcar como descanso"}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {isRestDay
            ? "Meta do dia: peso + cardio + passos"
            : "Sem treino de força — meta cai pra 3"}
        </p>
      </div>
      {isRestDay ? (
        <Check
          size={14}
          strokeWidth={2.5}
          className="text-[var(--accent)]"
        />
      ) : (
        <Bed
          size={14}
          strokeWidth={1.75}
          className="text-[var(--text-dim)]"
        />
      )}
    </button>
  );
}
