"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import {
  WorkoutRecap,
  type WorkoutRecapData,
} from "@/components/WorkoutRecap";

/**
 * Trigger card on Home that opens the <WorkoutRecap> sheet for the most
 * recent finished session. Renders a compact one-liner with template name,
 * duration, set count, and volume.
 *
 * Ported from the v2 handoff (home-variants.jsx → "Last workout recap
 * trigger" Card inside HomeHub).
 */
export function LastWorkoutCard({ data }: { data: WorkoutRecapData }) {
  const [open, setOpen] = useState(false);

  const summaryParts: string[] = [];
  if (data.durationMin !== null) summaryParts.push(`${data.durationMin}min`);
  summaryParts.push(`${data.setCount} ${data.setCount === 1 ? "série" : "séries"}`);
  if (data.volumeKg > 0) {
    const t = data.volumeKg / 1000;
    summaryParts.push(t >= 10 ? `${t.toFixed(1)}t` : `${t.toFixed(2)}t`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left active:scale-[0.99] hover:bg-[var(--bg-hover)] transition-all"
      >
        <div
          className="shrink-0 flex h-10 w-10 items-center justify-center rounded-[10px]"
          style={{
            background: "color-mix(in oklab, var(--accent) 15%, transparent)",
            border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
            color: "var(--accent)",
          }}
        >
          <Check size={18} strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="tlog-eyebrow text-[var(--text-muted)]">
            {data.dateLabel} · Último treino
          </p>
          <p className="mt-0.5 text-[14px] font-bold leading-tight truncate">
            {data.templateName}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)] tnum">
            {summaryParts.join(" · ")}
          </p>
        </div>
        <ChevronRight
          size={18}
          strokeWidth={1.75}
          className="shrink-0 text-[var(--text-muted)]"
        />
      </button>

      <WorkoutRecap data={open ? data : null} onClose={() => setOpen(false)} />
    </>
  );
}
