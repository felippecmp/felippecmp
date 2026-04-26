/**
 * Server-side helper: render a template (or any list of slot-shaped
 * rows) as a plain-text block the user can paste into Notes.
 *
 * Format is the parser's reverse, so a roundtrip Copy → fill → Paste
 * Just Works. Each slot becomes 3 lines + a blank line:
 *
 *   <Exercise name>
 *   <Machine, or "—" if none>
 *   <sets>x<reps>x__kg
 *
 * Where __kg is left blank for the user to fill in. When `lastWeightKg`
 * is provided we substitute it as a hint instead of leaving blank.
 */

export type TemplateTextSlot = {
  exerciseName: string;
  machine: string | null;
  targetSets: number;
  /** Single rep target — typically the high end of the rep range. */
  targetReps: number;
  lastWeightKg?: number | null;
};

export function renderTemplateText({
  templateName,
  date,
  slots,
}: {
  templateName: string;
  date: Date;
  slots: TemplateTextSlot[];
}): string {
  const dateLabel = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const header = `${templateName} — ${dateLabel}`;
  const blocks = slots.map((s) => {
    const machineLine = s.machine ?? "—";
    const weight =
      s.lastWeightKg != null && s.lastWeightKg > 0
        ? `${formatWeight(s.lastWeightKg)}kg`
        : "__kg";
    return [s.exerciseName, machineLine, `${s.targetSets}x${s.targetReps}x${weight}`].join("\n");
  });
  return [header, "", blocks.join("\n\n"), ""].join("\n");
}

function formatWeight(kg: number): string {
  const rounded = Math.round(kg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
