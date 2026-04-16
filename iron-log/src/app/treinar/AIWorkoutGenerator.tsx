"use client";

import { useState, useTransition } from "react";
import { Brain, ChevronRight, Dumbbell, Loader2, Sparkles, X } from "lucide-react";
import {
  generateAIWorkout,
  discardAIWorkout,
  type GeneratedWorkout,
} from "./ai-actions";
import { startSessionFromTemplate } from "./actions";
import { muscleLabel } from "@/lib/muscles";
import type {
  Readiness,
  SessionType,
  SessionGeneratorInput,
} from "@/lib/coach/session-generator";

const MINUTES_OPTIONS: Array<SessionGeneratorInput["minutes"]> = [
  30, 45, 60, 90,
];

const READINESS_OPTIONS: Array<{
  value: Readiness;
  label: string;
  hint: string;
}> = [
  { value: "tired", label: "Cansado", hint: "-20% volume, RIR ≥2" },
  { value: "normal", label: "Normal", hint: "volume padrão, RIR 2" },
  { value: "ready", label: "Pronto", hint: "pode empurrar, RIR 0-1" },
];

const SESSION_OPTIONS: Array<{ value: SessionType; label: string }> = [
  { value: "upper", label: "Upper" },
  { value: "lower", label: "Lower" },
];

type Props = {
  defaultSessionType: SessionType;
};

/**
 * AI generator panel on /treinar. Three visual states:
 *  1. Collapsed button — "Montar com IA"
 *  2. Form — pick type / time / disposition
 *  3. Preview — generated workout with "Iniciar" / "Descartar"
 */
export function AIWorkoutGenerator({ defaultSessionType }: Props) {
  const [open, setOpen] = useState(false);
  const [sessionType, setSessionType] =
    useState<SessionType>(defaultSessionType);
  const [minutes, setMinutes] =
    useState<SessionGeneratorInput["minutes"]>(45);
  const [readiness, setReadiness] = useState<Readiness>("normal");

  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isGenerating, startGenerating] = useTransition();
  const [isStarting, startStarting] = useTransition();
  const [isDiscarding, startDiscarding] = useTransition();

  function handleGenerate() {
    setError(null);
    startGenerating(async () => {
      const result = await generateAIWorkout({
        sessionType,
        minutes,
        readiness,
      });
      if (result.ok) {
        setWorkout(result.workout);
        setTemplateId(result.templateId);
      } else {
        setError(result.error);
      }
    });
  }

  function handleStart() {
    if (!templateId) return;
    setError(null);
    startStarting(async () => {
      const result = await startSessionFromTemplate(templateId);
      if (result && result.ok === false) setError(result.error);
    });
  }

  function handleDiscard() {
    if (!templateId) {
      setWorkout(null);
      setOpen(false);
      return;
    }
    setError(null);
    startDiscarding(async () => {
      await discardAIWorkout(templateId);
      setWorkout(null);
      setTemplateId(null);
    });
  }

  // State 1 — collapsed CTA
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)] p-4 flex items-center gap-3 hover:border-[var(--accent)] hover:bg-[var(--bg-raised)] transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-full bg-[var(--bg-raised)] text-[var(--accent)] flex items-center justify-center shrink-0">
          <Sparkles size={16} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[14px] leading-tight">
            Montar treino com IA
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
            Usa só seus exercícios, calibra pelo tempo e disposição
          </p>
        </div>
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          className="text-[var(--text-dim)] shrink-0"
        />
      </button>
    );
  }

  // State 3 — preview
  if (workout) {
    return (
      <div className="rounded-2xl border border-[var(--accent)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Brain
              size={14}
              strokeWidth={1.75}
              className="text-[var(--accent)] shrink-0"
            />
            <p className="label truncate">Treino do dia</p>
          </div>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isDiscarding || isStarting}
            aria-label="Descartar proposta"
            className="w-8 h-8 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-raised)] flex items-center justify-center transition-colors disabled:opacity-50"
          >
            {isDiscarding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <X size={14} strokeWidth={2} />
            )}
          </button>
        </div>

        <div>
          <h3 className="display-sm text-xl leading-tight">{workout.name}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
            {workout.reasoning}
          </p>
        </div>

        <ul className="space-y-2">
          {workout.exercises.map((ex, idx) => (
            <li
              key={ex.exercise_id}
              className="flex items-start gap-3 rounded-xl bg-[var(--bg-raised)] px-3 py-2.5"
            >
              <span className="text-[10px] font-semibold text-[var(--text-dim)] tnum w-5 pt-0.5">
                {(idx + 1).toString().padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-[14px] leading-tight truncate">
                    {ex.name ?? ex.exercise_id}
                  </p>
                  {ex.suggested_weight_kg != null && (
                    <span className="text-[11px] text-[var(--text-muted)] tnum shrink-0">
                      {ex.suggested_weight_kg}kg
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)] tnum">
                  <span>
                    {ex.target_sets}×{ex.rep_range_low}-{ex.rep_range_high}
                  </span>
                  <span className="text-[var(--text-dim)]">·</span>
                  <span>{ex.rest_seconds}s rest</span>
                  {ex.primary_muscle && (
                    <>
                      <span className="text-[var(--text-dim)]">·</span>
                      <span className="truncate">
                        {muscleLabel(ex.primary_muscle)}
                      </span>
                    </>
                  )}
                </div>
                {ex.rationale && (
                  <p className="text-[11px] text-[var(--text-dim)] mt-1 leading-snug">
                    {ex.rationale}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting || isDiscarding}
          className="w-full bg-accent text-accent-fg font-semibold py-3.5 rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
        >
          {isStarting ? (
            <>
              <Loader2 size={14} className="animate-spin" strokeWidth={2} />
              Iniciando…
            </>
          ) : (
            <>
              <Dumbbell size={14} strokeWidth={2} />
              Iniciar esse treino
            </>
          )}
        </button>
      </div>
    );
  }

  // State 2 — form
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles
            size={14}
            strokeWidth={1.75}
            className="text-[var(--accent)]"
          />
          <p className="label">Montar com IA</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isGenerating}
          aria-label="Fechar"
          className="w-8 h-8 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-raised)] flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        O coach olha só os exercícios que você já faz, o volume da semana e
        sua progressão. Monta um treino único pra hoje — você aprova antes
        de iniciar.
      </p>

      <fieldset disabled={isGenerating} className="space-y-4">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
            Tipo
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {SESSION_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setSessionType(o.value)}
                className={`text-[13px] font-medium px-3 py-2.5 rounded-xl border transition-colors ${
                  sessionType === o.value
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
            Tempo disponível
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {MINUTES_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={`text-[12px] font-medium px-2 py-2.5 rounded-xl border transition-colors tnum ${
                  minutes === m
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                }`}
              >
                {m}min
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
            Disposição hoje
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {READINESS_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReadiness(r.value)}
                className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                  readiness === r.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                <p
                  className={`text-[12px] font-semibold leading-tight ${
                    readiness === r.value
                      ? "text-[var(--accent)]"
                      : "text-[var(--text)]"
                  }`}
                >
                  {r.label}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] leading-snug mt-0.5">
                  {r.hint}
                </p>
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-accent text-accent-fg font-semibold py-3 rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 size={14} className="animate-spin" strokeWidth={2} />
            Coach pensando…
          </>
        ) : (
          <>
            <Brain size={14} strokeWidth={2} />
            Gerar treino
          </>
        )}
      </button>
    </div>
  );
}
