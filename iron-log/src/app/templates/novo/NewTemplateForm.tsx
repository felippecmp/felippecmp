"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Brain, Loader2, Sparkles } from "lucide-react";
import { createTemplate } from "../actions";
import {
  applyProposedTemplate,
  proposeTemplate,
  type AITemplateProposal,
} from "./ai-action";

export function NewTemplateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<"upper" | "lower">("upper");

  // AI state
  const [aiMode, setAiMode] = useState(false);
  const [aiFocus, setAiFocus] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [proposal, setProposal] = useState<AITemplateProposal | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTemplate(formData);
      if (result && !result.ok) setError(result.error);
    });
  }

  async function handleAIPropose() {
    setError(null);
    setAiLoading(true);
    try {
      const result = await proposeTemplate({
        sessionType,
        focus: aiFocus.trim() || undefined,
      });
      if (result.ok) {
        setProposal(result.proposal);
      } else {
        setError(result.error);
      }
    } finally {
      setAiLoading(false);
    }
  }

  function handleApplyProposal() {
    if (!proposal) return;
    setError(null);
    startTransition(async () => {
      const result = await applyProposedTemplate(proposal);
      if (result.ok) {
        router.push(`/templates/${result.templateId}`);
      } else {
        setError(result.error);
      }
    });
  }

  // AI proposal review screen
  if (proposal) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[var(--bg-card)] overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--border)]">
            <Sparkles size={14} strokeWidth={1.75} className="text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Proposta do Coach
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Nome</p>
              <h3 className="display-sm text-2xl leading-none mt-1">{proposal.name}</h3>
            </div>
            <p className="text-xs text-[var(--text-soft)] leading-relaxed">
              {proposal.reasoning}
            </p>
            <div className="pt-2 border-t border-[var(--border)]">
              <p className="label mb-2">{proposal.exercises.length} exercícios</p>
              <ul className="space-y-1.5">
                {proposal.exercises.map((ex, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="text-[10px] tnum text-[var(--text-dim)] w-4">{i + 1}.</span>
                    <span className="font-medium flex-1 min-w-0 truncate">{ex.exercise_name}</span>
                    <span className="text-[11px] tnum text-[var(--text-muted)]">
                      {ex.target_sets}×{ex.rep_range_low}-{ex.rep_range_high}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/40 bg-red-950/20 text-red-300 p-4 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProposal(null)}
            disabled={isPending}
            className="flex-1 border border-[var(--border)] py-3 rounded-xl text-sm font-medium disabled:opacity-60"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleApplyProposal}
            disabled={isPending}
            className="flex-1 font-bold text-sm py-3 rounded-xl disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {isPending ? "Criando..." : "Criar este template"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/40 bg-red-950/20 text-red-300 p-4 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="label block mb-2">Tipo</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          {(["upper", "lower"] as const).map((t) => {
            const active = sessionType === t;
            return (
              <label
                key={t}
                className={`cursor-pointer text-center py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-accent text-accent-fg"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <input
                  type="radio"
                  name="session_type"
                  value={t}
                  checked={active}
                  onChange={() => setSessionType(t)}
                  className="sr-only"
                />
                {t === "upper" ? "Upper" : "Lower"}
              </label>
            );
          })}
        </div>
      </div>

      {/* AI Proposal toggle */}
      <div className="rounded-2xl bg-[var(--bg-card)] p-4">
        <button
          type="button"
          onClick={() => setAiMode(!aiMode)}
          className="w-full flex items-center gap-2 text-left"
        >
          <Brain size={16} strokeWidth={1.75} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Sugerir com AI</span>
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            {aiMode ? "−" : "+"}
          </span>
        </button>
        {aiMode && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              O coach vê seu catálogo + histórico e monta um template {sessionType} completo com exercícios, sets e reps.
            </p>
            <input
              type="text"
              value={aiFocus}
              onChange={(e) => setAiFocus(e.target.value)}
              placeholder="Foco opcional (ex: hipertrofia de peito)"
              className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm placeholder:text-[var(--text-dim)] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAIPropose}
              disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {aiLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} strokeWidth={2} />
              )}
              {aiLoading ? "Montando template..." : "Gerar com AI"}
            </button>
          </div>
        )}
      </div>

      {/* Manual form */}
      <div>
        <label className="label block mb-2">Ou crie manualmente — Nome</label>
        <input
          name="name"
          type="text"
          required
          placeholder="Upper A"
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-base placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-fg py-3.5 rounded-xl font-semibold text-sm transition-colors"
      >
        {isPending ? "Criando…" : "Criar vazio e adicionar exercícios"}
      </button>
    </form>
  );
}
