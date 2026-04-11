import { Bed, Check, Dumbbell, Footprints, Heart, Scale } from "lucide-react";

export type TodayChecklistProps = {
  hasWeight: boolean;
  hasStrength: boolean;
  hasCardio: boolean;
  hasSteps: boolean;
  isRestDay: boolean;
};

type Item = {
  key: string;
  label: string;
  done: boolean;
  Icon: typeof Check;
};

/**
 * Compact "what's left to glow today" row. Strength is dropped from the
 * checklist when the day is marked rest, so the max moves from 4 to 3 —
 * matching the heatmap completion logic.
 */
export function TodayChecklist({
  hasWeight,
  hasStrength,
  hasCardio,
  hasSteps,
  isRestDay,
}: TodayChecklistProps) {
  const items: Item[] = [
    { key: "weight", label: "peso", done: hasWeight, Icon: Scale },
    ...(isRestDay
      ? []
      : [
          {
            key: "strength",
            label: "força",
            done: hasStrength,
            Icon: Dumbbell,
          } as Item,
        ]),
    { key: "cardio", label: "cardio", done: hasCardio, Icon: Heart },
    { key: "steps", label: "passos", done: hasSteps, Icon: Footprints },
  ];

  const hit = items.filter((i) => i.done).length;
  const max = items.length;
  const allDone = hit === max;
  const remaining = items.filter((i) => !i.done);

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 ${
        allDone
          ? "border-[var(--accent)] bg-[var(--bg-card)]"
          : "border-[var(--border)] bg-[var(--bg-card)]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isRestDay && (
            <Bed
              size={12}
              strokeWidth={1.75}
              className="text-[var(--text-dim)]"
            />
          )}
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Hoje
          </p>
        </div>
        <p
          className={`text-xs tnum ${
            allDone ? "text-[var(--accent)] font-semibold" : "text-[var(--text-muted)]"
          }`}
        >
          {hit}/{max}
          {allDone && " — fechou"}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {items.map(({ key, label, done, Icon }) => (
          <span
            key={key}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] tracking-wider uppercase tnum transition-colors ${
              done
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                : "border-[var(--border)] text-[var(--text-dim)]"
            }`}
          >
            {done ? (
              <Check size={10} strokeWidth={2.75} />
            ) : (
              <Icon size={10} strokeWidth={1.75} />
            )}
            {label}
          </span>
        ))}
      </div>

      {!allDone && remaining.length > 0 && (
        <p className="text-[10px] text-[var(--text-dim)] mt-2 leading-relaxed">
          Falta{remaining.length === 1 ? "" : "m"}{" "}
          {remaining.map((r) => r.label).join(" e ")}.
        </p>
      )}
    </div>
  );
}
