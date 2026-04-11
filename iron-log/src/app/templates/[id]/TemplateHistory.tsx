import { Calendar, Clock, TrendingDown, TrendingUp } from "lucide-react";
import type { TemplateProgression } from "@/lib/template-progression";

type Props = {
  progression: TemplateProgression;
};

/**
 * Server-rendered "Histórico" panel for the template editor page. Shows
 * total sessions, last performed, 30d session/volume deltas vs the prior
 * 30d, and a top set per exercise from the 30d window.
 */
export function TemplateHistory({ progression }: Props) {
  const {
    totalSessions,
    lastSessionAt,
    sessions30d,
    sessionsPrev30d,
    volume30d,
    volumePrev30d,
    avgDuration30d,
    exerciseTops,
  } = progression;

  if (totalSessions === 0) {
    return (
      <section className="mt-10 pt-6 border-t border-[var(--border)]">
        <p className="label mb-3">Histórico</p>
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Nenhuma sessão ainda nesse template.
          </p>
          <p className="text-[11px] text-[var(--text-dim)] mt-1">
            Roda uma vez e os números aparecem aqui.
          </p>
        </div>
      </section>
    );
  }

  const sessionsDelta = sessions30d - sessionsPrev30d;
  const volumeDeltaPct =
    volumePrev30d > 0
      ? Math.round(((volume30d - volumePrev30d) / volumePrev30d) * 100)
      : null;

  return (
    <section className="mt-10 pt-6 border-t border-[var(--border)]">
      <p className="label mb-4">Histórico</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat
          label="Total"
          value={String(totalSessions)}
          unit={totalSessions === 1 ? "sessão" : "sessões"}
        />
        <Stat
          label="Última"
          value={lastSessionAt ? formatRelativeDay(lastSessionAt) : "—"}
          unit=""
          Icon={Calendar}
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="label">Últimos 30 dias</p>
          <span className="text-[10px] text-[var(--text-dim)] tnum">
            vs 30 anteriores
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Sessões
            </p>
            <div className="flex items-baseline gap-2">
              <span className="display-sm text-2xl tnum">{sessions30d}</span>
              <DeltaChip delta={sessionsDelta} suffix="" />
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Volume
            </p>
            <div className="flex items-baseline gap-2">
              <span className="display-sm text-2xl tnum">
                {formatVolume(volume30d)}
              </span>
              <DeltaChip
                delta={volumeDeltaPct}
                suffix="%"
                hideWhenZero
              />
            </div>
          </div>
        </div>

        {avgDuration30d !== null && (
          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-[11px] text-[var(--text-muted)] tnum">
            <Clock
              size={11}
              strokeWidth={1.75}
              className="text-[var(--text-dim)]"
            />
            duração média {avgDuration30d}min
          </div>
        )}
      </div>

      {exerciseTops.length > 0 && (
        <div>
          <p className="label mb-2">Top set por exercício (30d)</p>
          <ul className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)] overflow-hidden">
            {exerciseTops.map((row) => (
              <li
                key={row.exerciseId}
                className="flex items-baseline justify-between gap-3 px-4 py-2.5"
              >
                <span className="text-sm truncate">{row.exerciseName}</span>
                <span className="text-xs tnum text-[var(--text-muted)] shrink-0">
                  <span className="text-[var(--text)] font-semibold">
                    {formatKg(row.topWeight)} × {row.topReps}
                  </span>
                  <span className="text-[var(--text-faint)]">
                    {" "}
                    · {row.sets30d} sets
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  unit,
  Icon,
}: {
  label: string;
  value: string;
  unit: string;
  Icon?: typeof Calendar;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && (
          <Icon
            size={11}
            strokeWidth={1.75}
            className="text-[var(--text-dim)]"
          />
        )}
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="display-sm text-xl tnum">{value}</span>
        {unit && (
          <span className="text-xs text-[var(--text-dim)]">{unit}</span>
        )}
      </div>
    </div>
  );
}

function DeltaChip({
  delta,
  suffix,
  hideWhenZero = false,
}: {
  delta: number | null;
  suffix: string;
  hideWhenZero?: boolean;
}) {
  if (delta === null) return null;
  if (hideWhenZero && delta === 0) return null;
  const positive = delta > 0;
  const negative = delta < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] tnum tabular-nums ${
        positive
          ? "text-[var(--status-ready)]"
          : negative
            ? "text-[var(--status-stalled)]"
            : "text-[var(--text-dim)]"
      }`}
    >
      {Icon && <Icon size={10} strokeWidth={2} />}
      {positive ? "+" : ""}
      {delta}
      {suffix}
    </span>
  );
}

function formatVolume(kg: number): string {
  if (kg === 0) return "0";
  if (kg < 1000) return `${Math.round(kg)}kg`;
  const t = kg / 1000;
  return `${t.toFixed(1)}t`;
}

function formatKg(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded}kg`;
  return `${rounded.toFixed(1)}kg`;
}

function formatRelativeDay(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const todayMid = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const thenMid = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate()
  );
  const diffDays = Math.round(
    (todayMid.getTime() - thenMid.getTime()) / 86400000
  );
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays}d`;
  if (diffDays < 30) return `há ${Math.round(diffDays / 7)}sem`;
  return then.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
