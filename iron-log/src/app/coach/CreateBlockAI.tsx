"use client";

import { useState, useTransition } from "react";
import { Brain, Check, ChevronRight, Loader2 } from "lucide-react";
import {
  planMesocycleWithAI,
  createMesocycleFromAI,
  type AIBlockProposal,
} from "./ai-actions";
import { PHASE_LABEL, type Phase } from "@/lib/coach/mesocycle";
import { muscleLabel } from "@/lib/muscles";

const SUGGESTED_DURATIONS = [4, 5, 6, 8] as const;

/**
 * AI-powered block creation. Three states:
 *  1. Input: user answers 3 questions (duration, constraints, goals)
 *  2. Thinking: Claude is planning
 *  3. Preview: user sees the proposal and can approve or discard
 */
export function CreateBlockAI() {
  const [totalWeeks, setTotalWeeks] = useState(6);
  const [constraints, setConstraints] = useState("");
  const [goals, setGoals] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AIBlockProposal | null>(null);
  const [startsOn] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [isPending, startTransition] = useTransition();
  const [isCreating, startCreating] = useTransition();

  function handlePlan() {
    setError(null);
    startTransition(async () => {
      const result = await planMesocycleWithAI({
        totalWeeks,
        constraints: constraints.trim(),
        goals: goals.trim(),
      });
      if (result.ok) {
        setProposal(result.proposal);
      } else {
        setError(result.error);
      }
    });
  }

  function handleApprove() {
    if (!proposal) return;
    setError(null);
    startCreating(async () => {
      const result = await createMesocycleFromAI(proposal, startsOn);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  function handleDiscard() {
    setProposal(null);
    setError(null);
  }

  // State 3: Preview
  if (proposal) {
    return (
      <div className="rounded-2xl border border-[var(--accent)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Brain size={14} strokeWidth={1.75} className="text-[var(--accent)]" />
          <p className="label">Proposta do coach</p>
        </div>

        <div>
          <h3 className="display-sm text-xl leading-tight">
            {proposal.name}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
            {proposal.reasoning}
          </p>
        </div>

        <div className="space-y-1">
          {proposal.weeks.map((w) => (
            <div
              key={w.week_number}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-[var(--bg-raised)]"
            >
              <span className="text-[var(--text-dim)] tnum w-6">
                S{w.week_number}
              </span>
              <span className="font-medium flex-1">
                {PHASE_LABEL[w.phase as Phase]}
              </span>
              <span className="text-[var(--text-muted)] tnum">
                {w.intensity_target}
              </span>
              <span className="text-[var(--text-dim)] tnum">
                {Object.values(w.volume_targets).reduce((a, b) => a + b, 0)}{" "}
                sets
              </span>
            </div>
          ))}
        </div>

        {/* Top muscles detail for the first week */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Targets semana 1
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] tnum text-[var(--text-soft)]">
            {Object.entries(proposal.weeks[0]?.volume_targets ?? {})
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([m, v]) => (
                <span key={m}>
                  {muscleLabel(m)} {v}
                </span>
              ))}
          </div>
        </div>

        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isCreating}
            className="flex-1 border border-[var(--border)] py-3 rounded-xl text-sm font-medium disabled:opacity-60"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isCreating}
            className="flex-1 bg-accent text-accent-fg py-3 rounded-xl text-sm font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            {isCreating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Criando…
              </>
            ) : (
              <>
                <Check size={14} strokeWidth={2.5} />
                Aprovar e criar
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // State 1 + 2: Input + Thinking
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Brain size={14} strokeWidth={1.75} className="text-[var(--accent)]" />
        <p className="label">Criar com IA</p>
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        O coach lê seus últimos 60 dias de treino e planeja um mesociclo
        com fases e targets baseados na literatura. Você aprova antes de
        ativar.
      </p>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
          Duração (semanas)
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {SUGGESTED_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setTotalWeeks(d)}
              disabled={isPending}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                totalWeeks === d
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
              }`}
            >
              {d}sem
            </button>
          ))}
        </div>
      </label>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
          Restrições (opcional)
        </span>
        <input
          type="text"
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          disabled={isPending}
          placeholder="Ombro incomodando, viajo na sem 4, sono ruim…"
          className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        />
      </label>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
          Meta concreta (opcional)
        </span>
        <input
          type="text"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          disabled={isPending}
          placeholder="Agacha 100kg×5, fechar 10 barras, priorizar costas…"
          className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        />
      </label>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <button
        type="button"
        onClick={handlePlan}
        disabled={isPending}
        className="w-full bg-accent text-accent-fg font-semibold py-3 rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" strokeWidth={2} />
            Coach pensando…
          </>
        ) : (
          <>
            <Brain size={14} strokeWidth={2} />
            Gerar plano
            <ChevronRight size={14} strokeWidth={1.75} />
          </>
        )}
      </button>
    </div>
  );
}
