import { Ring } from "@/components/Ring";

/**
 * Compact "Metas de hoje" header used above the TodayChecklist on Home.
 *
 * Ported from the v2 handoff (home-variants.jsx → "Today's Goals" Card).
 * The chip grid stays inside <TodayChecklist> because there each chip is
 * actually interactive (weight/steps inline form, strength/cardio link);
 * this component only owns the ring + count summary that v2 introduces.
 */
export function TodayGoalsRing({
  done,
  max,
}: {
  /** How many goals are checked off so far. */
  done: number;
  /** Total goals possible today (3 on rest days, 4 otherwise). */
  max: number;
}) {
  const value = max > 0 ? done / max : 0;
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div>
        <p className="text-[14px] font-bold leading-none">Metas de hoje</p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)] tnum">
          {done} de {max} concluídas
        </p>
      </div>
      <Ring
        value={value}
        size={42}
        stroke={4}
        color="var(--accent)"
        ariaLabel={`${done} de ${max} metas concluídas`}
      >
        <span
          className="text-[10px] font-extrabold tnum text-[var(--text-soft)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {done}/{max}
        </span>
      </Ring>
    </div>
  );
}
