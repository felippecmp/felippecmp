import { Bed, Dumbbell } from "lucide-react";
import { userDayKey } from "@/lib/timezone";

type TemplateLite = {
  id: string;
  name: string;
  sessionType: "upper" | "lower";
};

type Props = {
  templates: TemplateLite[];
  /** ISO timestamp of the most recent finished session, if any */
  lastSessionAt: string | null;
  /** Template name of the most recent finished session */
  lastTemplateName: string | null;
};

/**
 * Rotation cycle preview. Takes the templates in sort_order and builds
 * a continuous pattern with rest days between each Upper-Lower pair:
 *
 *   UA → LA → 🛌 → UB → LB → 🛌 → UA → LA → ...
 *
 * Then projects the next 14 days, starting from where the rotation
 * currently is (based on the last completed session). The cycle never
 * resets — it wraps around indefinitely.
 */
export function RotationPreview({
  templates,
  lastSessionAt,
  lastTemplateName,
}: Props) {
  if (templates.length === 0) return null;

  // Build the rotation pattern: group by pairs, insert rest between groups.
  // If templates are [UA, LA, UB, LB], the pattern is:
  //   UA, LA, rest, UB, LB, rest
  // If templates are [A, B, C], the pattern is: A, B, C, rest (single group)
  const pattern = buildPattern(templates);
  if (pattern.length === 0) return null;

  // Find where we are in the rotation based on the last session.
  const currentIdx = findCurrentIndex(pattern, lastTemplateName);

  // Project the next 14 days from today.
  const today = new Date();
  const todayKey = userDayKey(today);
  const projection = projectDays(pattern, currentIdx, 14);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <p className="label mb-3">Rotação</p>

      {/* The repeating pattern */}
      <div className="flex gap-1 flex-wrap mb-4">
        {pattern.map((slot, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider ${
              slot.type === "rest"
                ? "text-[var(--text-dim)] border border-dashed border-[var(--border)]"
                : "bg-[var(--bg-raised)] text-[var(--text-soft)]"
            }`}
          >
            {slot.type === "rest" ? (
              <Bed size={9} strokeWidth={1.75} />
            ) : (
              <Dumbbell size={9} strokeWidth={1.75} />
            )}
            {slot.type === "rest" ? "off" : slot.name}
          </span>
        ))}
        <span className="text-[10px] text-[var(--text-faint)] self-center ml-1">
          ↻ repete
        </span>
      </div>

      {/* 14-day projection */}
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
        Próximos 14 dias
      </p>
      <div className="grid grid-cols-7 gap-1">
        {projection.map((day, i) => {
          const isToday = day.dateKey === todayKey;
          return (
            <div
              key={i}
              className={`rounded-lg border px-1.5 py-2 text-center ${
                isToday
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--border)]"
              }`}
            >
              <p
                className={`text-[9px] uppercase tracking-wider mb-1 ${
                  isToday
                    ? "text-[var(--accent)] font-semibold"
                    : "text-[var(--text-dim)]"
                }`}
              >
                {day.weekday}
              </p>
              <p className="text-[10px] tnum text-[var(--text-muted)]">
                {day.dayNum}
              </p>
              {day.type === "rest" ? (
                <Bed
                  size={10}
                  strokeWidth={1.75}
                  className="mx-auto mt-1 text-[var(--text-faint)]"
                />
              ) : (
                <p
                  className={`text-[9px] font-medium mt-1 truncate ${
                    isToday ? "text-[var(--accent)]" : "text-[var(--text-soft)]"
                  }`}
                >
                  {day.shortName}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[var(--text-dim)] mt-3 leading-relaxed">
        Ciclo de {pattern.length} slots ({pattern.filter((s) => s.type === "template").length} treinos + {pattern.filter((s) => s.type === "rest").length} descansos).
        Nunca reseta — continua de onde parou.
      </p>
    </section>
  );
}

type PatternSlot =
  | { type: "template"; id: string; name: string; shortName: string }
  | { type: "rest" };

function buildPattern(templates: TemplateLite[]): PatternSlot[] {
  const pattern: PatternSlot[] = [];

  // Group templates into Upper-Lower pairs for rest insertion.
  // Walk through sort_order; after each type change (upper→lower or
  // lower→upper) that completes a pair, insert a rest day.
  let pairCount = 0;
  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    pattern.push({
      type: "template",
      id: t.id,
      name: t.name,
      shortName: abbreviate(t.name),
    });
    pairCount++;

    // Insert rest after every 2 templates (UL pair) or at the end
    if (pairCount === 2) {
      pattern.push({ type: "rest" });
      pairCount = 0;
    }
  }

  // If odd number of templates, add rest at the end
  if (pairCount > 0 && pattern[pattern.length - 1]?.type !== "rest") {
    pattern.push({ type: "rest" });
  }

  return pattern;
}

function abbreviate(name: string): string {
  // "Upper A" → "Up A", "Lower B" → "Lo B"
  return name
    .replace(/^Upper/i, "Up")
    .replace(/^Lower/i, "Lo")
    .slice(0, 5);
}

function findCurrentIndex(
  pattern: PatternSlot[],
  lastTemplateName: string | null
): number {
  if (!lastTemplateName) return 0;

  // Find the last template in the pattern and return the NEXT index.
  for (let i = pattern.length - 1; i >= 0; i--) {
    const slot = pattern[i];
    if (slot.type === "template" && slot.name === lastTemplateName) {
      return (i + 1) % pattern.length;
    }
  }
  return 0;
}

type ProjectedDay = {
  dateKey: string;
  weekday: string;
  dayNum: string;
  type: "template" | "rest";
  shortName?: string;
};

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function projectDays(
  pattern: PatternSlot[],
  startIdx: number,
  count: number
): ProjectedDay[] {
  const out: ProjectedDay[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const slot = pattern[(startIdx + i) % pattern.length];
    out.push({
      dateKey: userDayKey(d),
      weekday: WEEKDAYS_SHORT[d.getDay()],
      dayNum: d.getDate().toString(),
      type: slot.type,
      shortName: slot.type === "template" ? slot.shortName : undefined,
    });
  }

  return out;
}
