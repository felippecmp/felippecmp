"use client";

import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { BottomSheet } from "./BottomSheet";

export type ExerciseSheetData = {
  exerciseId: string;
  name: string;
  muscle: string;
  /** Most recent reference sets (last completed session of this exercise). */
  reference: Array<{ weightKg: number; reps: number; rir: number | null }>;
  /** ISO timestamp of the reference session, when known. */
  referenceAt: string | null;
  /** Suggested weight for the next set, or null when not computable. */
  suggestedWeight: number | null;
  /** Suggested reps for the next set (single number or range). */
  suggestedRepsLabel: string;
  /** Optional latest e1RM in kg — when present, shown as a hero stat. */
  e1rmKg: number | null;
};

/**
 * Exercise detail sheet — opens from the info button on each ExerciseCard
 * during a live session. Surfaces the suggestion + last-session reference
 * + e1RM, and links out to /progresso/exercicio/[id] for the full history.
 *
 * Ported from the v2 handoff (interactions.jsx → ExerciseSheet). Trimmed
 * to the data we already load on the workout page; the full history view
 * lives on the progresso route.
 */
export function ExerciseSheet({
  data,
  onClose,
}: {
  data: ExerciseSheetData | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      open={data !== null}
      onClose={onClose}
      ariaLabel={data?.name ?? undefined}
    >
      {data && (
        <div className="px-5 py-3">
          <p className="tlog-eyebrow text-[var(--text-muted)]">{data.muscle}</p>
          <h2
            className="mt-1 text-[24px] font-extrabold leading-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            {data.name}
          </h2>

          {data.e1rmKg !== null && (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3.5 flex items-baseline justify-between">
              <p className="tlog-eyebrow text-[var(--text-muted)]">e1RM</p>
              <p
                className="tnum text-[22px] font-extrabold leading-none"
                style={{ color: "var(--accent)", letterSpacing: "-0.02em" }}
              >
                {Math.round(data.e1rmKg)}
                <span className="text-[11px] font-bold text-[var(--text-muted)] ml-0.5">
                  kg
                </span>
              </p>
            </div>
          )}

          {/* Suggestion for the next set. */}
          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3.5">
            <p className="tlog-eyebrow text-[var(--text-muted)] mb-2">
              Próximo
            </p>
            {data.suggestedWeight !== null ? (
              <p className="text-[15px] font-extrabold tnum">
                <span style={{ color: "var(--accent)" }}>
                  {data.suggestedWeight}kg
                </span>
                <span className="ml-2 text-[var(--text-soft)]">
                  × {data.suggestedRepsLabel}
                </span>
              </p>
            ) : (
              <p className="text-[13px] text-[var(--text-muted)]">
                Sem sugestão — primeira vez ou histórico insuficiente.
              </p>
            )}
          </div>

          {/* Last-session reference. */}
          {data.reference.length > 0 && (
            <div className="mt-3">
              <p className="tlog-eyebrow text-[var(--text-muted)] mb-2">
                Última vez{data.referenceAt ? ` · ${formatRelativeDay(data.referenceAt)}` : ""}
              </p>
              <ul className="flex flex-col gap-1.5">
                {data.reference.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-2.5 flex items-center gap-3"
                  >
                    <span className="w-6 text-[10px] font-bold tnum text-[var(--text-muted)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-[14px] font-bold tnum">
                      {s.weightKg}
                      <span className="text-[11px] text-[var(--text-muted)] ml-0.5">
                        kg
                      </span>{" "}
                      × {s.reps}
                    </span>
                    {s.rir !== null && (
                      <span className="text-[11px] tnum text-[var(--text-muted)]">
                        RIR {s.rir}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href={`/progresso/exercicio/${data.exerciseId}`}
            onClick={onClose}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] py-3 text-sm font-bold hover:border-[var(--border-strong)] transition-colors"
          >
            <Trophy size={14} strokeWidth={2} className="text-[var(--accent)]" />
            Ver histórico completo
            <ArrowRight size={14} strokeWidth={2.25} />
          </Link>
        </div>
      )}
    </BottomSheet>
  );
}

function formatRelativeDay(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - then.getTime()) / 86400000);
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays}d`;
  if (diffDays < 30) return `há ${Math.round(diffDays / 7)}sem`;
  return then.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
