import { muscleLabel } from "@/lib/muscles";
import {
  VOLUME_LANDMARKS,
  classifyVolumeZone,
  type VolumeLandmark,
  type VolumeZone,
} from "@/lib/coach/volume-landmarks";

type MuscleVolume = {
  muscle: string;
  sets: number;
  target: number;
};

const ZONE_COLORS: Record<VolumeZone, string> = {
  below_mv: "var(--danger)",
  maintenance: "var(--status-stalled)",
  productive_low: "var(--status-building)",
  productive_high: "var(--status-ready)",
  above_mrv: "var(--danger)",
};

const ZONE_LABELS: Record<VolumeZone, string> = {
  below_mv: "Abaixo do MV",
  maintenance: "Manutenção",
  productive_low: "Produtivo",
  productive_high: "Ótimo",
  above_mrv: "Acima do MRV",
};

export function VolumeCalculator({
  data,
}: {
  data: MuscleVolume[];
}) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const landmark = VOLUME_LANDMARKS[row.muscle];
        if (!landmark) return null;
        return (
          <MuscleRow
            key={row.muscle}
            muscle={row.muscle}
            sets={row.sets}
            target={row.target}
            landmark={landmark}
          />
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 flex-wrap">
        <LegendDot color="var(--danger)" label="Abaixo MV" />
        <LegendDot color="var(--status-stalled)" label="Manutenção" />
        <LegendDot color="var(--status-building)" label="Produtivo" />
        <LegendDot color="var(--status-ready)" label="Ótimo" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)]">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

function MuscleRow({
  muscle,
  sets,
  target,
  landmark,
}: {
  muscle: string;
  sets: number;
  target: number;
  landmark: VolumeLandmark;
}) {
  const zone = classifyVolumeZone(sets, landmark);
  const color = ZONE_COLORS[zone];
  const zoneLabel = ZONE_LABELS[zone];

  // Scale: 0 → MRV+4 (so there's room to show "over")
  const scaleMax = landmark.mrv + 4;

  // Zone boundaries as percentages
  const mvPct = (landmark.mv / scaleMax) * 100;
  const mevPct = (landmark.mev / scaleMax) * 100;
  const mavLowPct = (landmark.mav[0] / scaleMax) * 100;
  const mavHighPct = (landmark.mav[1] / scaleMax) * 100;
  const mrvPct = (landmark.mrv / scaleMax) * 100;

  // Current position
  const currentPct = Math.min((sets / scaleMax) * 100, 100);

  // Target position
  const targetPct = target > 0 ? Math.min((target / scaleMax) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium">{muscleLabel(muscle)}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] tnum font-bold" style={{ color }}>
            {sets}
          </span>
          {target > 0 && (
            <span className="text-[10px] tnum text-[var(--text-dim)]">
              / {target}
            </span>
          )}
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color, background: `color-mix(in oklab, ${color} 15%, transparent)` }}>
            {zoneLabel}
          </span>
        </div>
      </div>

      {/* Scale bar with zone backgrounds */}
      <div className="relative h-3 rounded-full overflow-hidden bg-[var(--border)]">
        {/* MV zone (red) */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-full"
          style={{ width: `${mvPct}%`, background: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
        />
        {/* MV→MEV zone (maintenance) */}
        <div
          className="absolute inset-y-0"
          style={{ left: `${mvPct}%`, width: `${mevPct - mvPct}%`, background: "color-mix(in oklab, var(--status-stalled) 25%, transparent)" }}
        />
        {/* MEV→MAV high zone (productive) */}
        <div
          className="absolute inset-y-0"
          style={{ left: `${mevPct}%`, width: `${mavHighPct - mevPct}%`, background: "color-mix(in oklab, var(--status-ready) 20%, transparent)" }}
        />
        {/* MAV high→MRV zone (high but ok) */}
        <div
          className="absolute inset-y-0"
          style={{ left: `${mavHighPct}%`, width: `${mrvPct - mavHighPct}%`, background: "color-mix(in oklab, var(--status-stalled) 15%, transparent)" }}
        />

        {/* Target marker */}
        {targetPct > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--text-muted)]"
            style={{ left: `${targetPct}%` }}
          />
        )}

        {/* Current position dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-card)] shadow-sm transition-all duration-500"
          style={{ left: `calc(${currentPct}% - 6px)`, background: color }}
        />
      </div>

      {/* Scale labels */}
      <div className="relative h-3 mt-0.5 text-[8px] tnum text-[var(--text-dim)]">
        <span className="absolute" style={{ left: `${mvPct}%`, transform: "translateX(-50%)" }}>MV</span>
        <span className="absolute" style={{ left: `${mevPct}%`, transform: "translateX(-50%)" }}>MEV</span>
        {mavLowPct !== mevPct && (
          <span className="absolute" style={{ left: `${mavLowPct}%`, transform: "translateX(-50%)" }}>MAV</span>
        )}
        <span className="absolute" style={{ left: `${mrvPct}%`, transform: "translateX(-50%)" }}>MRV</span>
      </div>
    </div>
  );
}
