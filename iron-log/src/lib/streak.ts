/**
 * Streak computation.
 *
 * A "day ativo" is a calendar day (local time) that has at least one of:
 *  - a finished strength session
 *  - a cardio session
 *
 * Body weight entries do NOT count — per user decision — because weighing
 * yourself doesn't reflect training effort.
 *
 * The streak is a count of consecutive active days ending TODAY (or
 * yesterday, if today is a rest day you're planning to train tomorrow).
 * Missing two consecutive days breaks the streak.
 *
 * We also surface the best historical streak for context.
 */

export type StreakInput = {
  /** ISO timestamps of days considered active. Duplicates OK. */
  activeTimestamps: string[];
  /** Today's Date, provided explicitly so server renders are deterministic. */
  today: Date;
};

export type StreakResult = {
  current: number;
  best: number;
  /** True if today itself already counts as active. */
  todayActive: boolean;
  /** YYYY-MM-DD of the most recent active day, or null if none. */
  lastActiveDay: string | null;
};

// User-timezone day key — "today" must reflect the user's local clock,
// not the server's, so the streak doesn't reset at midnight UTC.
function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export function computeStreak(input: StreakInput): StreakResult {
  const activeDaySet = new Set<string>();
  for (const iso of input.activeTimestamps) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    activeDaySet.add(dayKey(d));
  }

  if (activeDaySet.size === 0) {
    return { current: 0, best: 0, todayActive: false, lastActiveDay: null };
  }

  // Anchor "today" in the user's TZ via dayKey, then walk back day-by-day
  // using a UTC noon date so DST doesn't shift us.
  const todayKey = dayKey(input.today);
  const [ty, tm, td] = todayKey.split("-").map((v) => parseInt(v, 10));
  const todayStart = new Date(Date.UTC(ty, tm - 1, td, 12, 0, 0));
  const todayActive = activeDaySet.has(todayKey);

  // Current streak: count back from today (or yesterday if today not active)
  // through consecutive active days. We allow "today not yet active, but
  // yesterday was" to still show the streak as N without today counted.
  let current = 0;
  const startOffset = todayActive ? 0 : -1;
  for (let i = startOffset; ; i--) {
    const probe = addDays(todayStart, i);
    if (activeDaySet.has(dayKey(probe))) {
      current++;
    } else {
      break;
    }
  }

  // If today isn't active, only honor the trailing streak if yesterday was.
  // Otherwise current would remain 0 (handled by the loop above starting at
  // -1 and breaking immediately).

  // Best streak: sort all active days ascending, walk forward, count runs.
  const sortedKeys = Array.from(activeDaySet).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sortedKeys) {
    const [y, m, d] = k.split("-").map((n) => parseInt(n, 10));
    const cur = new Date(y, m - 1, d);
    if (prev === null) {
      run = 1;
    } else {
      const diffMs = cur.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        run += 1;
      } else {
        run = 1;
      }
    }
    if (run > best) best = run;
    prev = cur;
  }

  const lastActiveDay = sortedKeys[sortedKeys.length - 1] ?? null;

  return {
    current,
    best,
    todayActive,
    lastActiveDay,
  };
}
