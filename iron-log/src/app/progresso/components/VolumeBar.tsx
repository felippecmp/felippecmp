import { muscleLabel } from "@/lib/muscles";
import { bandCssVar, targetFor, volumeBand } from "@/lib/stats";

export type VolumeEntry = {
  muscle: string;
  sets: number;
  totalVolume: number;
};

/**
 * One muscle-volume row in the "Volume · últimos 7 dias" list.
 * Shows a horizontal progress bar with the user's target as a vertical tick,
 * colored by zone (under/on/high/excessive).
 */
export function VolumeBar({
  row,
  maxScale,
  userTargets,
}: {
  row: VolumeEntry;
  maxScale: number;
  userTargets: Record<string, number> | null;
}) {
  const target = targetFor(row.muscle, userTargets);
  const band = volumeBand(row.sets, target);
  const color = bandCssVar(band);
  const width = Math.min(100, (row.sets / maxScale) * 100);
  const targetPct = target > 0 ? Math.min(100, (target / maxScale) * 100) : 0;

  return (
    <li className="px-4 py-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-medium">{muscleLabel(row.muscle)}</span>
        <span className="text-xs text-[var(--text-muted)] tnum">
          {row.sets}
          {target > 0 && (
            <span className="text-[var(--text-dim)]"> / {target}</span>
          )}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-[var(--bg-raised)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${width}%`, background: color }}
        />
        {target > 0 && (
          <div
            className="absolute inset-y-0 w-px bg-[var(--text-dim)]"
            style={{ left: `${targetPct}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </li>
  );
}
