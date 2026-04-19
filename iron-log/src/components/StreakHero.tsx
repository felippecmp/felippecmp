"use client";

import { Flame } from "lucide-react";
import { userDayKey } from "@/lib/timezone";

const MILESTONES = [7, 14, 30, 60, 100, 180, 365] as const;

/**
 * Full-width motivational streak card — big number, flame badge, 12-week
 * heatmap, next-milestone progress bar.
 *
 * Ported from the v2 handoff (home-variants.jsx → StreakHero). Feeds on
 * the same activeDayKeys we already compute for the WeekStrip; the
 * heatmap is simply the last 84 days bucketed into 12 columns × 7 rows.
 */
export function StreakHero({
  current,
  best,
  activeDayKeys,
  todayKey,
  onTap,
}: {
  current: number;
  best: number;
  activeDayKeys: string[];
  todayKey: string;
  onTap?: () => void;
}) {
  // Pick next milestone above the current streak; fall back to the last one
  // when the user has blown past every milestone we track.
  const next = MILESTONES.find((m) => m > current) ?? MILESTONES[MILESTONES.length - 1];
  const prev = [...MILESTONES].reverse().find((m) => m <= current) ?? 0;
  const span = next - prev || 1;
  const progressPct = Math.min(100, Math.max(0, ((current - prev) / span) * 100));
  const daysToNext = Math.max(0, next - current);

  // Build the 12×7 = 84-day heatmap. Anchor at todayKey, walk back 83 days.
  // gridAutoFlow: column means React fills column-by-column; we lay days out
  // from oldest (top-left) to today (bottom-right).
  const activeSet = new Set(activeDayKeys);
  const cells: { key: string; isActive: boolean; isToday: boolean }[] = [];
  const [ty, tm, td] = todayKey.split("-").map((v) => parseInt(v, 10));
  const todayUtc = new Date(Date.UTC(ty, tm - 1, td, 12, 0, 0));
  for (let i = 83; i >= 0; i--) {
    const probe = new Date(todayUtc);
    probe.setUTCDate(todayUtc.getUTCDate() - i);
    const k = userDayKey(probe);
    cells.push({ key: k, isActive: activeSet.has(k), isToday: k === todayKey });
  }

  const cardChrome = (
    <>
      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="tlog-eyebrow text-[var(--text-muted)] mb-1">
            Sequência atual
          </p>
          <div className="flex items-baseline gap-2 leading-none">
            <span
              className="tnum font-extrabold"
              style={{
                fontSize: 64,
                color: "var(--accent)",
                letterSpacing: "-0.04em",
                lineHeight: 0.9,
                textShadow: "0 0 28px color-mix(in oklab, var(--accent) 35%, transparent)",
              }}
            >
              {current}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-[var(--text)] leading-none">
                dias
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-muted)] tnum">
                melhor: <span className="text-[var(--text-soft)] font-bold">{best}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Flame badge — rosa gradient with pulsing radial glow. */}
        <div className="relative shrink-0 w-14 h-14">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--accent) 40%, transparent) 0%, transparent 70%)",
              animation: "tlog-pulse 2.4s ease-in-out infinite",
            }}
            aria-hidden="true"
          />
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-hover))",
              boxShadow: "0 6px 20px color-mix(in oklab, var(--accent) 40%, transparent)",
            }}
          >
            <Flame size={26} strokeWidth={2.25} className="text-white" />
          </div>
        </div>
      </div>

      {/* 12 weeks × 7 rows heatmap. column-flow lays days top→bottom per week. */}
      <div
        className="relative grid mb-3"
        style={{
          gridTemplateColumns: "repeat(12, 1fr)",
          gridAutoFlow: "column",
          gridTemplateRows: "repeat(7, 13px)",
          gap: 4,
        }}
      >
        {cells.map((c) => (
          <div
            key={c.key}
            className="rounded-[3px]"
            style={{
              background: c.isActive
                ? "var(--accent)"
                : "var(--bg-hover)",
              border: c.isToday
                ? "1.5px solid var(--text)"
                : c.isActive
                  ? "1px solid color-mix(in oklab, var(--accent) 50%, transparent)"
                  : "none",
              boxShadow: c.isToday
                ? "0 0 10px color-mix(in oklab, var(--accent) 50%, transparent)"
                : undefined,
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Next milestone progress bar. */}
      <div className="relative">
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="tlog-eyebrow text-[var(--text-muted)]">
            Próxima marca · {next} dias
          </p>
          <p className="text-[11px] font-bold text-[var(--text-muted)] tnum">
            {daysToNext === 0 ? "atingida" : `faltam ${daysToNext}`}
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progressPct}%`,
              background:
                "linear-gradient(90deg, var(--accent), var(--accent-hover))",
              transition: "width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          />
        </div>
      </div>
    </>
  );

  const wrapperClass =
    "relative mb-4 overflow-hidden rounded-[20px] border p-5 active:scale-[0.99] transition-transform";
  const wrapperStyle = {
    background:
      "radial-gradient(ellipse at 85% 0%, color-mix(in oklab, var(--accent) 22%, transparent) 0%, transparent 55%), var(--bg-card)",
    borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)",
  } as const;

  if (onTap) {
    return (
      <button
        type="button"
        onClick={onTap}
        className={`${wrapperClass} text-left w-full block`}
        style={wrapperStyle}
        aria-label="Abrir calendário do streak"
      >
        {cardChrome}
      </button>
    );
  }
  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {cardChrome}
    </div>
  );
}
