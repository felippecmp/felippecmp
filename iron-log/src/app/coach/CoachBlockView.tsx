"use client";

import { useState, useTransition } from "react";
import { Calendar, Trash2 } from "lucide-react";
import {
  PHASE_LABEL,
  type ActiveMesocycle,
} from "@/lib/coach/mesocycle";
import { closeMesocycleEarly, deleteMesocycle } from "./actions";
import { WeekRow } from "./components/WeekRow";

type Props = {
  active: ActiveMesocycle;
};

/**
 * Active block dashboard. Shows the meso header, an editable per-week table,
 * and the danger zone (close early / delete).
 */
export function CoachBlockView({ active }: Props) {
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { mesocycle, weeks, currentWeek, currentWeekNumber } = active;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMesocycle(mesocycle.id);
      if (!result.ok) {
        setError(result.error);
        setDeleting(false);
      }
    });
  }

  function handleCloseEarly() {
    setError(null);
    startTransition(async () => {
      const result = await closeMesocycleEarly(mesocycle.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <p className="label mb-2">Bloco ativo</p>
        <h2 className="display-sm text-2xl leading-tight">{mesocycle.name}</h2>
        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)] tnum tabular-nums">
          <Calendar
            size={11}
            strokeWidth={1.75}
            className="text-[var(--text-dim)]"
          />
          {formatDate(mesocycle.starts_on)}
          {mesocycle.ends_on && (
            <>
              <span className="text-[var(--text-faint)]">→</span>
              {formatDate(mesocycle.ends_on)}
            </>
          )}
        </div>

        {currentWeek && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-baseline justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Semana atual
              </p>
              <div className="display-sm text-xl tnum">
                {currentWeekNumber}/{mesocycle.total_weeks}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Fase
              </p>
              <div className="text-sm font-semibold">
                {PHASE_LABEL[currentWeek.phase]}
              </div>
              {currentWeek.intensity_target && (
                <p className="text-[10px] text-[var(--text-dim)] tnum mt-0.5">
                  {currentWeek.intensity_target}
                </p>
              )}
            </div>
          </div>
        )}

        {mesocycle.user_notes && (
          <p className="text-xs text-[var(--text-muted)] mt-4 pt-3 border-t border-[var(--border)] leading-relaxed italic">
            {mesocycle.user_notes}
          </p>
        )}
      </section>

      <section>
        <p className="label mb-3">Semanas</p>
        <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
          {weeks.map((week) => (
            <WeekRow
              key={week.id}
              week={week}
              isCurrent={week.id === currentWeek?.id}
              expanded={expandedWeekId === week.id}
              onToggle={() =>
                setExpandedWeekId(expandedWeekId === week.id ? null : week.id)
              }
            />
          ))}
        </ul>
      </section>

      {error && (
        <p className="text-xs text-[var(--danger)] text-center">{error}</p>
      )}

      <section className="pt-4 border-t border-[var(--border)] space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] mb-2">
          Encerrar
        </p>
        <button
          type="button"
          onClick={handleCloseEarly}
          disabled={isPending}
          className="w-full text-sm border border-[var(--border)] py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] disabled:opacity-60 transition-colors"
        >
          Fechar bloco hoje
        </button>
        {!deleting ? (
          <button
            type="button"
            onClick={() => setDeleting(true)}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-1.5 text-sm border border-dashed border-[var(--border)] py-2.5 rounded-xl text-[var(--text-dim)] hover:text-[var(--danger)] hover:border-[var(--danger)] disabled:opacity-60 transition-colors"
          >
            <Trash2 size={12} strokeWidth={1.75} />
            Apagar bloco
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeleting(false)}
              disabled={isPending}
              className="flex-1 text-sm border border-[var(--border)] py-2.5 rounded-xl text-[var(--text-muted)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 text-sm bg-[var(--danger)] text-white py-2.5 rounded-xl font-semibold disabled:opacity-60"
            >
              {isPending ? "Apagando…" : "Confirmar"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
