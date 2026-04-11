import { PercentChip } from "./Chips";

/**
 * The two compact stat cards used in the /progresso top row and the cardio
 * card. Both show a label, a big number, an optional suffix, and an optional
 * percentage delta.
 */

export function TopStat({
  label,
  value,
  prev,
  suffix = "",
}: {
  label: string;
  value: number;
  prev?: number;
  suffix?: string;
}) {
  const delta = typeof prev === "number" && prev > 0 ? value - prev : null;
  const pct =
    delta !== null && prev && prev > 0 ? Math.round((delta / prev) * 100) : null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <p className="label mb-2">{label}</p>
      <div className="display text-2xl tnum leading-none mb-2">
        {value}
        {suffix && (
          <span className="text-sm text-[var(--text-muted)] ml-0.5">
            {suffix}
          </span>
        )}
      </div>
      {pct !== null && <PercentChip pct={pct} />}
    </div>
  );
}

export function CardioStat({
  label,
  value,
  suffix,
  delta,
}: {
  label: string;
  value: string;
  suffix: string;
  delta: number | null;
}) {
  return (
    <div>
      <p className="label mb-1.5">{label}</p>
      <div className="display-sm text-2xl tnum leading-none">
        {value}
        {suffix && (
          <span className="text-xs text-[var(--text-muted)] ml-0.5">
            {suffix}
          </span>
        )}
      </div>
      {delta !== null && Number.isFinite(delta) && (
        <div className="mt-2">
          <PercentChip pct={delta} />
        </div>
      )}
    </div>
  );
}
