"use client";

import Link from "next/link";
import { ArrowRight, Footprints, Moon } from "lucide-react";
import { BottomSheet } from "./BottomSheet";

export type DayPeekData = {
  /** Display label, e.g. "QUI · 17 ABR". */
  label: string;
  /** Headline title — template name, "Cardio", "Descanso", "Vazio". */
  title: string;
  /** Optional subtitle line — duration, volume, distance, etc. */
  subtitle?: string;
  /** Optional list of exercises performed that day. */
  exercises?: Array<{ name: string; sets: number; reps?: number | null }>;
  /** When set, the sheet shows a "Continuar" CTA linking to the workout. */
  sessionHref?: string;
  /** Marker icon for non-strength days. */
  kind?: "strength" | "cardio" | "rest" | "empty";
};

/**
 * Day peek sheet — opens when the user taps a day on the weekstrip. Shows
 * what happened (or what's planned) on that day.
 *
 * Ported from the v2 handoff (interactions.jsx → DayPeek). Data shape is
 * normalized so the same component works for past sessions, today's plan,
 * and rest days.
 */
export function DayPeek({
  day,
  onClose,
}: {
  day: DayPeekData | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      open={day !== null}
      onClose={onClose}
      ariaLabel={day?.title ?? undefined}
    >
      {day && (
        <div className="px-5 py-3">
          <p className="tlog-eyebrow text-[var(--text-muted)]">{day.label}</p>
          <div className="mt-1 flex items-center gap-2">
            {day.kind === "rest" && (
              <Moon size={18} strokeWidth={2} className="text-[var(--text-muted)]" />
            )}
            {day.kind === "cardio" && (
              <Footprints
                size={18}
                strokeWidth={2}
                className="text-[var(--status-stalled)]"
              />
            )}
            <h2
              className="text-[22px] font-extrabold leading-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              {day.title}
            </h2>
          </div>
          {day.subtitle && (
            <p className="mt-1 text-xs text-[var(--text-soft)] tnum">
              {day.subtitle}
            </p>
          )}

          {day.exercises && day.exercises.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5">
              {day.exercises.map((e, i) => (
                <li
                  key={`${e.name}-${i}`}
                  className="flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5"
                >
                  <span className="w-5 text-[9.5px] font-bold text-[var(--text-muted)] tnum">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[13px] font-semibold leading-tight truncate">
                    {e.name}
                  </span>
                  {e.sets > 0 && (
                    <span className="text-[11px] text-[var(--text-muted)] tnum shrink-0">
                      {e.sets}
                      {e.reps ? `×${e.reps}` : " sets"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {day.sessionHref && (
            <Link
              href={day.sessionHref}
              onClick={onClose}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent text-accent-fg font-semibold text-sm py-3 hover:bg-accent-hover transition-colors"
            >
              Ver sessão
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          )}

          {day.kind === "empty" && !day.exercises?.length && (
            <p className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed">
              Nada registrado neste dia.
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
