type Week = {
  label: string;
  strength: number;
  cardio: number;
};

type Props = {
  weeks: Week[];
  height?: number;
};

/**
 * Stacked bar chart: strength (cream) + cardio (coral) per week.
 * Current week shows solid colors; past weeks fade at 40%.
 * Handoff spec: /docs/design-handoff/components/shared-viz.jsx → FrequencyChart.
 */
export function FrequencyChart({ weeks, height = 80 }: Props) {
  const max = Math.max(...weeks.map((w) => w.strength + w.cardio), 6);

  return (
    <div
      className="flex gap-3 items-end pt-3"
      style={{ height: height + 28 }}
    >
      {weeks.map((w, i) => {
        const total = w.strength + w.cardio;
        const isCurrent = i === weeks.length - 1;
        const hCardio = (w.cardio / max) * height;
        const hStrength = (w.strength / max) * height;
        const strengthColor = isCurrent
          ? "var(--status-ready)"
          : "color-mix(in oklab, var(--status-ready) 40%, transparent)";
        const cardioColor = isCurrent
          ? "var(--accent)"
          : "color-mix(in oklab, var(--accent) 40%, transparent)";

        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-2"
          >
            <div
              className="text-sm font-bold tnum"
              style={{
                color: total
                  ? isCurrent
                    ? "var(--text)"
                    : "var(--text-soft)"
                  : "transparent",
              }}
            >
              {total || "\u00A0"}
            </div>
            <div
              className="w-full flex flex-col justify-end relative overflow-hidden"
              style={{
                height,
                maxWidth: 48,
                background: total ? "transparent" : "var(--bg-hover)",
                borderRadius: 10,
                border: total ? "none" : "1px dashed var(--border)",
              }}
            >
              {hCardio > 0 && (
                <div
                  style={{
                    height: hCardio,
                    background: cardioColor,
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                  }}
                />
              )}
              {hStrength > 0 && (
                <div
                  style={{
                    height: hStrength,
                    background: strengthColor,
                    borderTopLeftRadius: hCardio > 0 ? 0 : 8,
                    borderTopRightRadius: hCardio > 0 ? 0 : 8,
                  }}
                />
              )}
            </div>
            <div
              className="text-[11px] font-semibold tracking-[0.03em]"
              style={{
                color: isCurrent ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {w.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
