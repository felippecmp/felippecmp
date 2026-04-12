export type WeekData = {
  label: string;
  strength: number;
  cardio: number;
};

export function WeeklyBars({ weeks }: { weeks: WeekData[] }) {
  const maxTotal = Math.max(...weeks.map((w) => w.strength + w.cardio), 1);
  const barMax = Math.ceil(maxTotal * 1.2); // 20% headroom

  return (
    <div className="flex items-end gap-3 h-32">
      {weeks.map((w) => {
        const strengthH = (w.strength / barMax) * 100;
        const cardioH = (w.cardio / barMax) * 100;
        const total = w.strength + w.cardio;
        const isCurrentWeek = w.label === "Atual";

        return (
          <div key={w.label} className="flex-1 flex flex-col items-center gap-1.5">
            {/* Number on top */}
            <span className={`text-xs tnum font-semibold ${isCurrentWeek ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
              {total > 0 ? total : ""}
            </span>

            {/* Stacked bar */}
            <div className="w-full flex flex-col justify-end h-20 rounded-lg overflow-hidden bg-[var(--border)]/30">
              {w.cardio > 0 && (
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${cardioH}%`,
                    background: "var(--status-stalled)",
                    opacity: isCurrentWeek ? 1 : 0.5,
                  }}
                />
              )}
              {w.strength > 0 && (
                <div
                  className="w-full transition-all duration-500"
                  style={{
                    height: `${strengthH}%`,
                    background: "var(--status-ready)",
                    opacity: isCurrentWeek ? 1 : 0.5,
                    borderRadius: w.cardio > 0 ? "0" : "6px 6px 0 0",
                  }}
                />
              )}
            </div>

            {/* Week label */}
            <span className={`text-[10px] uppercase tracking-wider ${isCurrentWeek ? "text-[var(--text-soft)] font-semibold" : "text-[var(--text-dim)]"}`}>
              {w.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
