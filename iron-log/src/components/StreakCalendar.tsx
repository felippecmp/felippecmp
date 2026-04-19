"use client";

import { Flame } from "lucide-react";
import { BottomSheet } from "./BottomSheet";

const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

const MONTH_LABEL_PT: Record<number, string> = {
  0: "JANEIRO",
  1: "FEVEREIRO",
  2: "MARÇO",
  3: "ABRIL",
  4: "MAIO",
  5: "JUNHO",
  6: "JULHO",
  7: "AGOSTO",
  8: "SETEMBRO",
  9: "OUTUBRO",
  10: "NOVEMBRO",
  11: "DEZEMBRO",
};

/**
 * Streak calendar sheet — shows the current month grid with each day filled
 * by activity intensity. Tapping the streak pill on Home opens this.
 *
 * Ported from the v2 handoff (interactions.jsx → StreakCalendar). Restricted
 * to the current month for now; a month-switcher can come later.
 */
export function StreakCalendar({
  open,
  onClose,
  activeDayKeys,
  current,
  best,
  todayKey,
}: {
  open: boolean;
  onClose: () => void;
  /** Set of YYYY-MM-DD day keys with at least one strength/cardio session. */
  activeDayKeys: Set<string>;
  current: number;
  best: number;
  /** YYYY-MM-DD for "today" in the user's timezone. */
  todayKey: string;
}) {
  const [yStr, mStr] = todayKey.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;

  const firstOfMonth = new Date(year, month, 1);
  const offsetSlots = firstOfMonth.getDay(); // 0=Sun .. 6=Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDay = parseInt(todayKey.slice(8, 10), 10);

  // Active-day count for THIS month → "% do mês" stat. Counts only days
  // up to and including today so the % doesn't deflate by future days.
  let activeThisMonth = 0;
  for (let day = 1; day <= todayDay; day++) {
    const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (activeDayKeys.has(k)) activeThisMonth++;
  }
  const pctMonth = todayDay > 0 ? Math.round((activeThisMonth / todayDay) * 100) : 0;

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Calendário do streak">
      <div className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Flame size={20} strokeWidth={2} className="text-[var(--accent)]" />
          <div>
            <p className="tlog-eyebrow text-[var(--text-muted)]">
              Consistência · {MONTH_LABEL_PT[month]}
            </p>
            <p className="text-[22px] font-extrabold leading-tight" style={{ letterSpacing: "-0.02em" }}>
              <span className="text-[var(--accent)] tnum">{current} dias</span>{" "}
              em sequência
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {WEEKDAY_LETTERS.map((l, i) => (
            <div
              key={`hdr-${i}`}
              className="text-center text-[10px] font-bold tracking-[0.05em] text-[var(--text-muted)]"
            >
              {l}
            </div>
          ))}
          {Array.from({ length: offsetSlots }, (_, i) => (
            <div key={`pad-${i}`} aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = day === todayDay;
            const isActive = activeDayKeys.has(k);
            const isFuture = day > todayDay;
            // Intensity classes — today (full coral), active past (60% coral),
            // past missed (15% tint), future (surf).
            const bg = isToday
              ? "bg-[var(--accent)] text-[var(--bg)]"
              : isActive
                ? "text-[var(--text)]"
                : isFuture
                  ? "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                  : "text-[var(--text-muted)]";
            const style = isActive && !isToday
              ? { background: "color-mix(in oklab, var(--accent) 60%, transparent)" }
              : !isActive && !isToday && !isFuture
                ? { background: "color-mix(in oklab, var(--accent) 15%, transparent)" }
                : undefined;
            return (
              <div
                key={k}
                aria-label={isToday ? "Hoje" : k}
                className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold tnum ${bg} ${isToday ? "border-2 border-[var(--text)]" : "border border-[var(--border)]"}`}
                style={style}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <CalendarStat label="Atual" value={current} color="var(--accent)" />
          <CalendarStat label="Melhor" value={best} color="var(--status-progressed)" />
          <CalendarStat
            label="% do mês"
            value={pctMonth}
            color="var(--status-ready)"
            suffix="%"
          />
        </div>
      </div>
    </BottomSheet>
  );
}

function CalendarStat({
  label,
  value,
  color,
  suffix,
}: {
  label: string;
  value: number;
  color: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
      <p className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-1 text-[22px] font-extrabold tnum leading-none"
        style={{ color, letterSpacing: "-0.02em" }}
      >
        {value}
        {suffix}
      </p>
    </div>
  );
}
