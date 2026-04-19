"use client";

import { Check } from "lucide-react";
import { userDayKey } from "@/lib/timezone";

/**
 * Current-week strip — Sunday through Saturday (pt-BR convention), one dot
 * per day. States:
 *   - today         → coral tinted pill + filled coral dot
 *   - past & active → cream-tinted filled dot with check
 *   - past & empty  → hollow dot (surf3 bg, subtle border)
 *   - future        → hollow dot, dim letter
 *
 * When `onDayClick` is provided, each cell becomes a button — used by the
 * v2 DayPeek sheet flow to open a day's detail.
 *
 * Ported from the Claude Design "Training Log" handoff
 * (docs/design-handoff/components/home-variants.jsx → HomeHub).
 */
const DOW_PT = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export function WeekStrip({
  activeDayKeys,
  today = new Date(),
  onDayClick,
}: {
  activeDayKeys: Set<string>;
  today?: Date;
  /** When set, each day cell becomes a button; the handler receives the YYYY-MM-DD key. */
  onDayClick?: (dayKey: string) => void;
}) {
  const todayKey = userDayKey(today);

  // Anchor on user-TZ midnight, walk back to the most recent Sunday.
  const [ty, tm, td] = todayKey.split("-").map((v) => parseInt(v, 10));
  const todayUtc = new Date(Date.UTC(ty, tm - 1, td, 12, 0, 0));
  const dow = todayUtc.getUTCDay(); // 0=Sun … 6=Sat
  const sunday = new Date(todayUtc);
  sunday.setUTCDate(sunday.getUTCDate() - dow);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setUTCDate(sunday.getUTCDate() + i);
    const key = userDayKey(d);
    const isToday = key === todayKey;
    const isPast = key < todayKey;
    const isActive = activeDayKeys.has(key);
    return { key, letter: DOW_PT[i], isToday, isPast, isActive };
  });

  return (
    <div className="mb-4 flex gap-1.5 rounded-2xl bg-[var(--bg-card)] p-2.5 border border-[var(--border)]">
      {days.map((d) => {
        const wrapperBg = d.isToday
          ? "bg-[color-mix(in_oklab,var(--accent)_15%,transparent)]"
          : "";
        const letterColor = d.isToday
          ? "text-[var(--accent)]"
          : "text-[var(--text-muted)]";
        const dotClass = d.isToday
          ? "bg-[var(--accent)] border-transparent"
          : d.isActive
            ? "bg-[var(--status-ready)] border-transparent"
            : "bg-[var(--bg-hover)] border border-[var(--border-strong)]";
        const cellInner = (
          <>
            <span
              className={`text-[10px] font-bold tracking-[0.05em] tnum ${letterColor}`}
            >
              {d.letter}
            </span>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full ${dotClass}`}
            >
              {d.isActive && !d.isToday && (
                <Check
                  size={12}
                  strokeWidth={3}
                  className="text-[var(--bg)]"
                />
              )}
            </div>
          </>
        );
        const wrapperClass = `flex flex-1 flex-col items-center gap-1.5 rounded-xl py-1.5 ${wrapperBg}`;
        if (onDayClick) {
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onDayClick(d.key)}
              aria-label={d.isToday ? "Hoje — abrir detalhe" : "Abrir detalhe do dia"}
              className={`${wrapperClass} active:scale-95 transition-transform`}
            >
              {cellInner}
            </button>
          );
        }
        return (
          <div
            key={d.key}
            className={wrapperClass}
            aria-label={d.isToday ? "Hoje" : undefined}
          >
            {cellInner}
          </div>
        );
      })}
    </div>
  );
}
