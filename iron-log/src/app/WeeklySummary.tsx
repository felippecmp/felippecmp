"use client";

import { useState, useTransition } from "react";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { generateWeeklySummary } from "./weekly-ai-action";

export function WeeklySummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateWeeklySummary();
      if (result.ok) {
        setSummary(result.summary);
      } else {
        setError(result.error);
      }
    });
  }

  if (summary) {
    return (
      <div className="mb-6 rounded-2xl bg-[var(--bg-card)] overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--border)]">
          <Sparkles size={14} strokeWidth={1.75} className="text-[var(--accent)]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Resumo da Semana
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-[var(--text-soft)] leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isPending}
      className="mb-6 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] py-4 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" strokeWidth={2} />
      ) : (
        <Brain size={14} strokeWidth={1.75} />
      )}
      {isPending ? "Gerando resumo..." : "Gerar resumo da semana com AI"}
      {error && (
        <span className="text-[var(--danger)] text-xs ml-2">{error}</span>
      )}
    </button>
  );
}
