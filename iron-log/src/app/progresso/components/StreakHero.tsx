import { Flame } from "lucide-react";

export function StreakHero({
  current,
  best,
  todayActive,
}: {
  current: number;
  best: number;
  todayActive: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4">
      <div className="flex items-center gap-3">
        <Flame
          size={14}
          strokeWidth={1.75}
          className="text-[var(--status-ready)] shrink-0"
        />
        <p className="label">Streak</p>
        <div className="ml-auto flex items-baseline gap-3">
          <div className="flex items-baseline gap-1">
            <span className="display text-3xl tnum leading-none">
              {current}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              {current === 1 ? "dia" : "dias"}
            </span>
          </div>
          {best > 0 && best !== current && (
            <div className="flex items-baseline gap-1 pl-3 border-l border-[var(--border)]">
              <span className="text-base tnum text-[var(--text-soft)]">
                {best}
              </span>
              <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                melhor
              </span>
            </div>
          )}
        </div>
      </div>
      {current === 0 && (
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          Registre qualquer treino ou caminhada pra começar.
        </p>
      )}
      {current > 0 && !todayActive && (
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          Hoje ainda em aberto.
        </p>
      )}
    </div>
  );
}
