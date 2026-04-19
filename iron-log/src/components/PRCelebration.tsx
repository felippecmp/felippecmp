"use client";

import { useEffect } from "react";

/**
 * One-shot PR celebration overlay — confetti + center card with the PR
 * details. Auto-dismisses after ~3.2s (or earlier when the user taps).
 *
 * Ported from the v2 handoff (interactions.jsx → PRCelebration). Used by
 * the finish flow when a PR is detected; replaces the previous static
 * "1 PR no bolso" card with a celebratory moment.
 */
const CONFETTI_COLORS = [
  "var(--accent)",
  "var(--status-ready)",
  "var(--status-progressed)",
  "var(--tlog-violet)",
];

export function PRCelebration({
  show,
  exerciseName,
  diffLabel,
  onClose,
}: {
  show: boolean;
  /** Headline name, e.g. "Supino reto". */
  exerciseName: string;
  /** Delta label, e.g. "+5kg" or "+2 reps". */
  diffLabel: string;
  onClose: () => void;
}) {
  // Auto-dismiss after 3.2s. Caller can also force-close earlier.
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [show, onClose]);

  if (!show) return null;

  const pieces = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={`Personal record em ${exerciseName}: ${diffLabel}`}
      onClick={onClose}
      className="fixed inset-0 z-[300] flex items-start justify-center pt-24 overflow-hidden pointer-events-auto"
    >
      {/* Confetti — 24 pieces, staggered, fall from top with a tilt. */}
      {pieces.map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute"
          style={{
            top: 80,
            left: `${10 + (i * 73) % 80}%`,
            width: 8,
            height: 14,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: 2,
            transform: `rotate(${(i * 37) % 360}deg)`,
            opacity: 0,
            animation: `tlog-confetti-fall 2.8s cubic-bezier(0.2, 0.6, 0.5, 1) ${i * 0.04}s forwards`,
          }}
        />
      ))}

      <div
        className="relative max-w-[280px] rounded-2xl px-5 py-4 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        style={{
          background:
            "linear-gradient(135deg, var(--accent), var(--accent-hover))",
          color: "var(--accent-fg)",
          animation: "tlog-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <p className="text-[11px] font-extrabold tracking-[0.15em] opacity-75 uppercase">
          Personal Record
        </p>
        <p
          className="mt-1 text-[28px] font-extrabold leading-none"
          style={{ letterSpacing: "-0.03em" }}
        >
          {exerciseName}
        </p>
        <p className="mt-1.5 text-[14px] font-bold opacity-90 tnum">
          {diffLabel} no e1RM 🔥
        </p>
      </div>
    </div>
  );
}
