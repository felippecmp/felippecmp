import { TrendingDown, TrendingUp } from "lucide-react";

export type WeeklyRecapProps = {
  strengthSessions: number;
  cardioSessions: number;
  glowDays: number; // 0-7
  weightDelta: number | null; // kg, null if can't compute
};

/**
 * Sunday/Monday-only recap card showing the rolling 7-day window. Calling
 * code decides when to render it (page.tsx checks the day of week). Stats
 * come pre-aggregated; this component is pure render.
 */
export function WeeklyRecap({
  strengthSessions,
  cardioSessions,
  glowDays,
  weightDelta,
}: WeeklyRecapProps) {
  const totalSessions = strengthSessions + cardioSessions;
  const empty = totalSessions === 0 && glowDays === 0 && weightDelta === null;
  if (empty) return null;

  return (
    <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="flex items-baseline justify-between mb-3">
        <p className="label">Últimos 7 dias</p>
        <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
          recap
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RecapStat
          label="Sessões"
          value={String(totalSessions)}
          subtitle={
            strengthSessions > 0 && cardioSessions > 0
              ? `${strengthSessions} força · ${cardioSessions} cardio`
              : strengthSessions > 0
                ? "só força"
                : cardioSessions > 0
                  ? "só cardio"
                  : "—"
          }
        />
        <RecapStat
          label="Dias completos"
          value={`${glowDays}/7`}
          subtitle={glowDays >= 5 ? "consistência alta" : "tem espaço"}
        />
      </div>

      {weightDelta !== null && (
        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Peso corporal
          </p>
          <div className="flex items-center gap-1.5">
            {weightDelta > 0 ? (
              <TrendingUp
                size={12}
                strokeWidth={1.75}
                className="text-[var(--text-soft)]"
              />
            ) : weightDelta < 0 ? (
              <TrendingDown
                size={12}
                strokeWidth={1.75}
                className="text-[var(--text-soft)]"
              />
            ) : null}
            <span className="text-sm tnum tabular-nums">
              {weightDelta > 0 ? "+" : ""}
              {weightDelta.toFixed(1)} kg
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function RecapStat({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
        {label}
      </p>
      <div className="display-sm text-2xl tnum mb-0.5">{value}</div>
      <p className="text-[11px] text-[var(--text-dim)]">{subtitle}</p>
    </div>
  );
}
