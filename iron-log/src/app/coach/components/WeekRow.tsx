"use client";

import { PHASE_LABEL, type MesocycleWeekRow, type Phase } from "@/lib/coach/mesocycle";
import { WeekTargetsEditor } from "./WeekTargetsEditor";

const PHASE_DOT: Record<Phase, string> = {
  accumulation: "bg-[var(--text-soft)]",
  intensification: "bg-[var(--text)]",
  realization: "bg-[var(--accent)]",
  deload: "bg-transparent border border-dashed border-[var(--text-dim)]",
};

/**
 * One row in the mesocycle week list. Collapsed by default; expand to
 * reveal the per-muscle targets editor.
 */
export function WeekRow({
  week,
  isCurrent,
  expanded,
  onToggle,
}: {
  week: MesocycleWeekRow;
  isCurrent: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const targets = week.volume_targets ?? {};
  const muscleCount = Object.keys(targets).filter(
    (k) => (targets[k] ?? 0) > 0
  ).length;
  const totalSets = Object.values(targets).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors ${
          isCurrent ? "bg-[var(--bg-hover)]/50" : ""
        }`}
      >
        <span
          className={`shrink-0 w-2.5 h-2.5 rounded-full ${PHASE_DOT[week.phase]}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-dim)] tnum">
              S{week.week_number}
            </span>
            <span className="text-sm font-medium">
              {PHASE_LABEL[week.phase]}
            </span>
            {isCurrent && (
              <span className="text-[9px] uppercase tracking-wider text-[var(--accent)] font-semibold">
                atual
              </span>
            )}
            {week.user_overrode && (
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-dim)]">
                editado
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--text-muted)] tnum mt-0.5">
            {totalSets} sets · {muscleCount} músculos
            {week.intensity_target && (
              <>
                <span className="text-[var(--text-faint)]"> · </span>
                {week.intensity_target}
              </>
            )}
          </div>
        </div>
      </button>

      {expanded && <WeekTargetsEditor week={week} />}
    </li>
  );
}
