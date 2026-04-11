"use client";

import { useState, useTransition } from "react";
import { Calendar, Check, Trash2, X } from "lucide-react";
import { MUSCLES, muscleLabel } from "@/lib/muscles";
import {
  PHASE_LABEL,
  type ActiveMesocycle,
  type MesocycleWeekRow,
  type Phase,
} from "@/lib/coach/mesocycle";
import {
  closeMesocycleEarly,
  deleteMesocycle,
  updateMesocycleWeek,
} from "./actions";

type Props = {
  active: ActiveMesocycle;
};

const PHASE_DOT: Record<Phase, string> = {
  accumulation: "bg-[var(--text-soft)]",
  intensification: "bg-[var(--text)]",
  realization: "bg-[var(--accent)]",
  deload: "bg-transparent border border-dashed border-[var(--text-dim)]",
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

function WeekRow({
  week,
  isCurrent,
  expanded,
  onToggle,
}: {
  week: MesocycleWeekRow;
  isCurrent: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const targets = week.volume_targets ?? {};
  const muscleCount = Object.keys(targets).filter(
    (k) => (targets[k] ?? 0) > 0
  ).length;
  const totalSets = Object.values(targets).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors ${
          isCurrent ? "bg-[var(--bg-hover)]/50" : ""
        }`}
      >
        <span
          className={`shrink-0 w-2.5 h-2.5 rounded-full ${PHASE_DOT[week.phase]}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-dim)] tnum">
              S{week.week_number}
            </span>
            <span className="text-sm font-medium">
              {PHASE_LABEL[week.phase]}
            </span>
            {isCurrent && (
              <span className="text-[9px] uppercase tracking-wider text-[var(--accent)] font-semibold">
                atual
              </span>
            )}
            {week.user_overrode && (
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-dim)]">
                editado
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--text-muted)] tnum mt-0.5">
            {totalSets} sets · {muscleCount} músculos
            {week.intensity_target && (
              <>
                <span className="text-[var(--text-faint)]"> · </span>
                {week.intensity_target}
              </>
            )}
          </div>
        </div>
      </button>

      {expanded && <WeekTargetsEditor week={week} />}
    </li>
  );
}

function WeekTargetsEditor({ week }: { week: MesocycleWeekRow }) {
  const [targets, setTargets] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const m of MUSCLES) {
      out[m.value] = String(week.volume_targets?.[m.value] ?? 0);
    }
    return out;
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    const out: Record<string, number> = {};
    for (const m of MUSCLES) {
      const n = parseInt(targets[m.value] ?? "0", 10);
      if (Number.isFinite(n) && n >= 0 && n <= 30 && n > 0) {
        out[m.value] = n;
      }
    }
    startTransition(async () => {
      const result = await updateMesocycleWeek(week.id, {
        volume_targets: out,
      });
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="px-4 pb-4 pt-1 bg-[var(--bg-raised)]/50 border-t border-[var(--border)]">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2 mt-2">
        Targets de volume (sets/semana)
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {MUSCLES.map((m) => (
          <label
            key={m.value}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1"
          >
            <span className="block text-[9px] uppercase tracking-wider text-[var(--text-muted)] truncate leading-tight">
              {m.label}
            </span>
            <input
              type="number"
              min="0"
              max="30"
              value={targets[m.value] ?? ""}
              onChange={(e) =>
                setTargets((prev) => ({ ...prev, [m.value]: e.target.value }))
              }
              disabled={isPending}
              className="w-full bg-transparent border-0 focus:outline-none text-sm tnum tabular-nums py-0.5 disabled:opacity-60"
            />
          </label>
        ))}
      </div>
      {error && (
        <p className="text-[10px] text-[var(--danger)] mt-2">{error}</p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-3 w-full text-xs bg-accent text-accent-fg py-2 rounded-lg font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
      >
        {saved ? (
          <>
            <Check size={12} strokeWidth={2.5} />
            Salvo
          </>
        ) : isPending ? (
          "Salvando…"
        ) : (
          "Salvar semana"
        )}
      </button>
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
