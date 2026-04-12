/**
 * Analytics helpers.
 *
 * Weekly set-volume targets are direct working sets per primary muscle,
 * aligned with the planning doc's low-volume-high-intensity bias (5-6 direct
 * sets/week on primaries, less on accessories, zero for muscles that aren't
 * tracked as primary in any seeded exercise).
 */
export const WEEKLY_VOLUME_TARGET: Record<string, number> = {
  chest: 6,
  lats: 6,
  traps: 3,
  front_delts: 4,
  side_delts: 6,
  rear_delts: 3,
  biceps: 5,
  triceps: 5,
  forearms: 0,
  abs: 0,
  quads: 6,
  hamstrings: 5,
  glutes: 4,
  adductors: 3,
  abductors: 3,
  calves: 5,
  lower_back: 0,
};

export function targetFor(
  muscle: string,
  overrides?: Record<string, number> | null
): number {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, muscle)) {
    return overrides[muscle];
  }
  return WEEKLY_VOLUME_TARGET[muscle] ?? 0;
}

export type VolumeBand = "undershot" | "on_target" | "high" | "excessive";

/**
 * Categorize a weekly set count vs. its target band.
 *
 * Planning doc: ">10 = warning amarelo, >15 = vermelho".
 * For per-muscle nuance we scale the absolute cutoffs down to match the
 * target: "high" kicks in when you're comfortably above the target, and
 * "excessive" when you're at ~2.5x or hit the absolute ceiling.
 */
export function volumeBand(sets: number, target: number): VolumeBand {
  if (target <= 0) {
    // Untracked muscles: grade only by absolute count.
    if (sets >= 15) return "excessive";
    if (sets >= 10) return "high";
    return "on_target";
  }
  if (sets < Math.max(1, target * 0.5)) return "undershot";
  if (sets <= target * 1.5) return "on_target";
  if (sets <= target * 2.5 && sets < 15) return "high";
  return "excessive";
}

export function bandCssVar(band: VolumeBand): string {
  switch (band) {
    case "undershot":
      return "var(--status-building)";
    case "on_target":
      return "var(--status-ready)";
    case "high":
      return "var(--status-progressed)";
    case "excessive":
      return "var(--status-stalled)";
  }
}

/**
 * Epley 1RM estimate: weight × (1 + reps / 30).
 * For 1-rep sets, returns the weight directly.
 */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/**
 * Normalize a Date into a "YYYY-MM-DD" key for day-indexing in the user's
 * timezone. Used by the heatmap grid and the session-per-day map. Always
 * call this — never inline getFullYear/getMonth/getDate, or you'll roll over
 * a day too early when the server is in UTC and the user is in another TZ.
 */
export function dateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Build an array of the last N days as ["YYYY-MM-DD", Date] tuples, oldest
 * first. Used to lay out the heatmap grid with stable gaps. Days are anchored
 * at noon UTC so the formatted key resolves to the same calendar day in the
 * user's timezone regardless of DST.
 */
export function lastNDays(n: number, from: Date = new Date()): Array<{
  key: string;
  date: Date;
}> {
  const out: Array<{ key: string; date: Date }> = [];
  // Start from today's user-TZ key, then walk back N days using UTC math.
  const todayKey = dateKey(from);
  const [y, m, day] = todayKey.split("-").map((v) => parseInt(v, 10));
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1, day - i, 12, 0, 0));
    out.push({ key: dateKey(d), date: d });
  }
  return out;
}
