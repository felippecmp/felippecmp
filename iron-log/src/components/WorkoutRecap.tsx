"use client";

import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { BottomSheet } from "./BottomSheet";

export type WorkoutRecapData = {
  sessionId: string;
  /** Display label for the session date — e.g. "QUA · 16 ABR". */
  dateLabel: string;
  templateName: string;
  durationMin: number | null;
  setCount: number;
  /** Total volume in kg (sum of weight × reps across working sets). */
  volumeKg: number;
  /** Optional intensity label, e.g. "RPE 7" or feeling "4/5". */
  intensityLabel?: string | null;
  /** Per-muscle set counts logged in this session. */
  muscleImpact: Array<{ muscle: string; sets: number }>;
};

/**
 * Workout recap sheet — opens from the LastWorkoutCard on Home. Surfaces
 * the headline stats from the most recent finished session, plus a per-
 * muscle volume breakdown from THAT session's logged sets.
 *
 * Ported from the v2 handoff (interactions.jsx → WorkoutRecap). Trimmed:
 * we don't yet detect PRs at recap time (those are computed at finish);
 * instead we link to the session for the full breakdown.
 */
export function WorkoutRecap({
  data,
  onClose,
}: {
  data: WorkoutRecapData | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      open={data !== null}
      onClose={onClose}
      ariaLabel={data ? `Recap: ${data.templateName}` : undefined}
    >
      {data && (
        <div className="px-5 py-3">
          <p className="tlog-eyebrow text-[var(--text-muted)]">
            {data.dateLabel}
          </p>
          <h2
            className="mt-1 text-[24px] font-extrabold leading-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Último treino
          </h2>
          <p className="mt-1 text-[14px] text-[var(--text-soft)] font-semibold">
            {data.templateName}
          </p>

          {/* 4-stat grid — Duração / Séries / Volume / (Intensidade ou —). */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <RecapStat
              label="Duração"
              value={
                data.durationMin !== null
                  ? formatDuration(data.durationMin)
                  : "—"
              }
            />
            <RecapStat label="Séries" value={String(data.setCount)} />
            <RecapStat label="Volume" value={formatVolume(data.volumeKg)} />
            <RecapStat
              label="Intens."
              value={data.intensityLabel ?? "—"}
            />
          </div>

          {/* Per-muscle impact bars — relative to the heaviest muscle in
              the session, so the bars are comparative without needing
              MEV/MAV thresholds threaded down from the server. */}
          {data.muscleImpact.length > 0 && (
            <div className="mt-5">
              <p className="tlog-eyebrow text-[var(--text-muted)] mb-2">
                Impacto por músculo
              </p>
              <ul className="flex flex-col gap-2.5">
                {(() => {
                  const max = Math.max(
                    ...data.muscleImpact.map((m) => m.sets),
                    1
                  );
                  return data.muscleImpact.map((m) => {
                    const pct = (m.sets / max) * 100;
                    return (
                      <li key={m.muscle}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[12px] font-bold text-[var(--text)]">
                            {m.muscle}
                          </span>
                          <span className="text-[11px] font-bold tnum text-[var(--text-muted)]">
                            {m.sets} {m.sets === 1 ? "série" : "séries"}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background:
                                "linear-gradient(90deg, var(--accent), var(--accent-hover))",
                            }}
                          />
                        </div>
                      </li>
                    );
                  });
                })()}
              </ul>
            </div>
          )}

          <Link
            href={`/workout/${data.sessionId}`}
            onClick={onClose}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] py-3 text-sm font-bold hover:border-[var(--border-strong)] transition-colors"
          >
            <Trophy size={14} strokeWidth={2} className="text-[var(--accent)]" />
            Ver sessão completa
            <ArrowRight size={14} strokeWidth={2.25} />
          </Link>
        </div>
      )}
    </BottomSheet>
  );
}

function RecapStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2">
      <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-0.5 text-[15px] font-extrabold tnum leading-none"
        style={{ letterSpacing: "-0.01em" }}
      >
        {value}
      </p>
    </div>
  );
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function formatVolume(kg: number): string {
  if (kg < 1000) return `${Math.round(kg)}kg`;
  const t = kg / 1000;
  return t >= 10 ? `${t.toFixed(1)}t` : `${t.toFixed(2)}t`;
}
