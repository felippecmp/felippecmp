"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { DayPeek, type DayPeekData } from "@/components/DayPeek";
import { StreakCalendar } from "@/components/StreakCalendar";
import { WeekStrip } from "@/components/WeekStrip";

/**
 * Client wrapper around the Home weekstrip + streak pill + their two sheet
 * flows (StreakCalendar, DayPeek). Lives on the home page so the server
 * keeps owning data fetching, while the click → sheet state lives here.
 */
export function HomeStreakAndWeek({
  todayKey,
  activeDayKeys,
  current,
  best,
  weekDayInfo,
  hasFirstRunData,
}: {
  todayKey: string;
  activeDayKeys: string[]; // serialized for the server→client boundary
  current: number;
  best: number;
  /** Map serialized to entries: each visible week day's peek data. */
  weekDayInfo: Array<[string, DayPeekData]>;
  hasFirstRunData: boolean;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [peekDay, setPeekDay] = useState<DayPeekData | null>(null);

  // Rebuild the Set on the client (Sets don't cross the SC/CC boundary).
  const activeSet = new Set(activeDayKeys);
  const dayInfoMap = new Map(weekDayInfo);

  return (
    <>
      {/* Streak pill — sits above the weekstrip when there's an active streak.
          Tapping it opens the month calendar. Hidden during first-run so the
          empty-state intro doesn't fight with a "0 dias" pill. */}
      {hasFirstRunData && current > 0 && (
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
          style={{
            background: "color-mix(in oklab, var(--accent) 15%, transparent)",
            border: "1px solid color-mix(in oklab, var(--accent) 35%, transparent)",
          }}
          aria-label={`Streak de ${current} dias — abrir calendário`}
        >
          <Flame size={14} strokeWidth={2} className="text-[var(--accent)]" />
          <span className="text-[13px] font-extrabold tnum text-[var(--accent)]">
            {current}
          </span>
          <span className="text-[11px] font-semibold text-[var(--accent)]/80">
            {current === 1 ? "dia" : "dias"}
          </span>
        </button>
      )}

      {hasFirstRunData && (
        <WeekStrip
          activeDayKeys={activeSet}
          onDayClick={(k) => {
            const data = dayInfoMap.get(k);
            if (data) setPeekDay(data);
          }}
        />
      )}

      <StreakCalendar
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        activeDayKeys={activeSet}
        current={current}
        best={best}
        todayKey={todayKey}
      />
      <DayPeek day={peekDay} onClose={() => setPeekDay(null)} />
    </>
  );
}
