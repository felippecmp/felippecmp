/**
 * 90-day consistency heatmap. Each cell colored by minutes trained that day,
 * with the Beast Mode reward (crimson + glow) when the day's full meta count
 * is hit. Rest days have max 3 instead of 4 so 3/3 still triggers the glow.
 */

export function Heatmap({
  days,
  sessionsByDay,
  completionByDay,
}: {
  days: Array<{ key: string; date: Date }>;
  sessionsByDay: Map<string, { count: number; minutes: number }>;
  completionByDay: Map<string, { hit: number; max: number; isRest: boolean }>;
}) {
  const cells = days.map((d) => {
    const entry = sessionsByDay.get(d.key);
    const count = entry?.count ?? 0;
    const minutes = entry?.minutes ?? 0;
    const completion = completionByDay.get(d.key) ?? {
      hit: 0,
      max: 4,
      isRest: false,
    };
    let opacity = 0;
    if (count > 0) {
      opacity = Math.min(1, 0.35 + (minutes / 90) * 0.65);
    }
    return { ...d, count, minutes, opacity, completion };
  });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="grid grid-cols-[repeat(13,1fr)] gap-1">
        {cells.map((c) => {
          const { hit, max, isRest } = c.completion;
          const allComplete = max > 0 && hit >= max;
          const mostComplete = max > 1 && hit >= max - 1 && hit < max;
          const restMark = isRest && !allComplete && !mostComplete;
          return (
            <div
              key={c.key}
              title={`${c.key} — ${
                c.count > 0
                  ? `${c.count} sessão${c.count === 1 ? "" : "es"} · ${c.minutes}min`
                  : isRest
                    ? "descanso"
                    : "rest"
              } — ${hit}/${max} metas`}
              className={`aspect-square rounded-[3px] border border-[var(--border)] ${
                allComplete ? "beast-complete" : ""
              } ${mostComplete ? "beast-almost" : ""}`}
              style={{
                background:
                  allComplete || mostComplete
                    ? "var(--accent)"
                    : c.count > 0
                      ? `color-mix(in oklab, var(--status-ready) ${
                          c.opacity * 100
                        }%, transparent)`
                      : restMark
                        ? "var(--bg-raised)"
                        : "transparent",
                opacity: mostComplete && !allComplete ? 0.6 : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--text-dim)] tracking-wider uppercase flex-wrap">
        <span>Menos</span>
        <div className="flex gap-1">
          {[0, 0.35, 0.6, 0.85, 1].map((o, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[2px] border border-[var(--border)]"
              style={{
                background:
                  o > 0
                    ? `color-mix(in oklab, var(--status-ready) ${o * 100}%, transparent)`
                    : "transparent",
              }}
            />
          ))}
        </div>
        <span>Mais</span>
        <span className="text-[var(--text-faint)]">·</span>
        <div
          className="w-3 h-3 rounded-[2px] border border-[var(--border)]"
          style={{ background: "var(--accent)", opacity: 0.6 }}
        />
        <span>quase</span>
        <div
          className="w-3 h-3 rounded-[2px] border border-[var(--border)] beast-complete"
          style={{ background: "var(--accent)" }}
        />
        <span>completo</span>
        <span className="text-[var(--text-faint)]">·</span>
        <div
          className="w-3 h-3 rounded-[2px] border border-[var(--border)]"
          style={{ background: "var(--bg-raised)" }}
        />
        <span>descanso</span>
      </div>
    </div>
  );
}
