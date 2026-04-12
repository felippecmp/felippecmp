import { muscleLabel } from "@/lib/muscles";

const MUSCLE_COLORS: Record<string, string> = {
  chest: "#ef4444",
  lats: "#3b82f6",
  traps: "#8b5cf6",
  front_delts: "#f97316",
  side_delts: "#eab308",
  rear_delts: "#a3e635",
  biceps: "#ec4899",
  triceps: "#14b8a6",
  forearms: "#6366f1",
  abs: "#f59e0b",
  quads: "#22c55e",
  hamstrings: "#06b6d4",
  glutes: "#d946ef",
  adductors: "#64748b",
  abductors: "#78716c",
  calves: "#0ea5e9",
  lower_back: "#84cc16",
};

function getColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] ?? "#71717a";
}

export type DonutEntry = { muscle: string; sets: number };

export function DonutChart({ data }: { data: DonutEntry[] }) {
  const total = data.reduce((s, d) => s + d.sets, 0);
  if (total === 0) return null;

  const R = 40;
  const STROKE = 10;
  const C = 2 * Math.PI * R;

  // Build arcs
  let offset = 0;
  const arcs = data.map((d) => {
    const pct = d.sets / total;
    const dash = C * pct;
    const gap = C - dash;
    const rotation = (offset / total) * 360 - 90; // start from 12 o'clock
    offset += d.sets;
    return { ...d, dash, gap, rotation, color: getColor(d.muscle), pct };
  });

  return (
    <div className="flex items-center gap-5">
      {/* SVG donut */}
      <div className="shrink-0 relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background ring */}
          <circle
            cx="50" cy="50" r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          {arcs.map((arc) => (
            <circle
              key={arc.muscle}
              cx="50" cy="50" r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeLinecap="round"
              transform={`rotate(${arc.rotation} 50 50)`}
              className="transition-all duration-500"
            />
          ))}
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="display text-2xl tnum leading-none">{total}</span>
          <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">sets</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-3 gap-y-1">
        {arcs.map((arc) => (
          <div key={arc.muscle} className="flex items-center gap-1.5 min-w-0">
            <span
              className="shrink-0 w-2.5 h-2.5 rounded-full"
              style={{ background: arc.color }}
            />
            <span className="text-[11px] text-[var(--text-soft)] truncate">
              {muscleLabel(arc.muscle)}
            </span>
            <span className="text-[11px] tnum text-[var(--text-muted)] ml-auto shrink-0">
              {arc.sets}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
