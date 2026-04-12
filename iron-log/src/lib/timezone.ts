/**
 * User timezone helpers — single source of truth for "what day is it" so the
 * server (likely UTC) doesn't roll over a day before the user's local clock
 * does. Without this, anything like "today's diary" computed on the server
 * would shift the whole timeline by 1 day during late-night usage.
 *
 * Single-user app: hardcoded to America/Sao_Paulo. If multi-user lands,
 * this becomes per-user from settings.
 */

export const USER_TIMEZONE = "America/Sao_Paulo";

/**
 * Format a Date as YYYY-MM-DD in the user's local timezone, regardless of
 * the server's TZ. en-CA gives the ISO YYYY-MM-DD format directly.
 */
export function userDayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: USER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Get today's YYYY-MM-DD in the user's local timezone.
 */
export function userToday(): string {
  return userDayKey(new Date());
}
