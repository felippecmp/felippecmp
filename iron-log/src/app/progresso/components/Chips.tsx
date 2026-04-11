import { TrendingDown, TrendingUp } from "lucide-react";

/**
 * Small reusable display chips used across /progresso. Pure presentational —
 * no data fetching, no state. Each one renders a single tiny visual element.
 */

export function PercentChip({ pct }: { pct: number }) {
  // Positive trend for strength/sessions is green, negative is rose.
  const isUp = pct > 0;
  const isDown = pct < 0;
  const color = isUp
    ? "var(--status-ready)"
    : isDown
      ? "var(--status-stalled)"
      : "var(--text-dim)";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] tnum font-semibold tracking-wider"
      style={{ color }}
    >
      {Icon && <Icon size={10} strokeWidth={2} />}
      {isUp ? "+" : ""}
      {pct}%
    </span>
  );
}

export function DeltaChip({
  delta,
  label,
  inverted,
}: {
  delta: number | null;
  label: string;
  /**
   * When inverted is true, negative delta is "good" (e.g., weight loss).
   * When false, the chip is neutral (no positive/negative coloring).
   */
  inverted: boolean;
}) {
  if (delta === null) {
    return (
      <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
        <p className="mb-1">{label}</p>
        <span>—</span>
      </div>
    );
  }
  const sign = delta > 0 ? "+" : "";
  const color = inverted
    ? delta < 0
      ? "var(--status-ready)"
      : delta > 0
        ? "var(--status-stalled)"
        : "var(--text-dim)"
    : "var(--text-soft)";
  return (
    <div>
      <p className="label mb-1">{label}</p>
      <span
        className="inline-flex items-center gap-0.5 text-xs tnum tabular-nums"
        style={{ color }}
      >
        {sign}
        {delta.toFixed(1)}kg
      </span>
    </div>
  );
}

export function TargetChip({
  target,
  current,
}: {
  target: number;
  current: number;
}) {
  const distance = Math.abs(current - target);
  const reached = distance < 0.05;
  const direction = current > target ? "perder" : "ganhar";
  return (
    <div>
      <p className="label mb-1">Meta</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm tnum tabular-nums text-[var(--text-soft)]">
          {target.toFixed(1)}kg
        </span>
        {reached ? (
          <span className="text-[10px] tnum uppercase tracking-wider text-[var(--status-ready)]">
            atingida
          </span>
        ) : (
          <span className="text-[10px] tnum text-[var(--text-dim)]">
            {distance.toFixed(1)}kg pra {direction}
          </span>
        )}
      </div>
    </div>
  );
}

export function formatKg(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
