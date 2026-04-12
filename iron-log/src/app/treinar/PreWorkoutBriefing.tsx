"use client";

import { useState, useTransition } from "react";
import {
  Brain,
  Check,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import {
  generatePreWorkoutBriefing,
  type BriefingSuggestion,
} from "./ai-actions";

const TYPE_ICONS: Record<string, string> = {
  technique: "Técnica",
  adjust_weight: "Peso",
  add_sets: "Volume",
  swap: "Trocar",
  general: "Dica",
};

export function PreWorkoutBriefing({
  templateName,
  sessionType,
  exercises,
}: {
  templateName: string;
  sessionType: string;
  exercises: string[];
}) {
  const [suggestions, setSuggestions] = useState<BriefingSuggestion[] | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generatePreWorkoutBriefing({
        templateName,
        sessionType,
        exercises,
      });
      if (result.ok) {
        setSuggestions(result.suggestions);
      } else {
        setError(result.error);
      }
    });
  }

  function toggleAccept(idx: number) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  if (!suggestions) {
    return (
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-3 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" strokeWidth={2} />
        ) : (
          <Brain size={14} strokeWidth={1.75} />
        )}
        {isPending ? "Analisando seu histórico..." : "Briefing AI"}
        {error && (
          <span className="text-[var(--danger)] text-xs ml-2">{error}</span>
        )}
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--border)]">
        <Sparkles size={14} strokeWidth={1.75} className="text-[var(--accent)]" />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          AI Briefing
        </p>
        <button
          type="button"
          onClick={() => setSuggestions(null)}
          className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
          aria-label="Fechar"
        >
          <X size={12} strokeWidth={1.75} />
        </button>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {suggestions.map((s, i) => {
          const isAccepted = accepted.has(i);
          return (
            <li key={i} className="px-4 py-3 flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleAccept(i)}
                className={`shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                  isAccepted
                    ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-muted)]"
                }`}
              >
                {isAccepted && <Check size={12} strokeWidth={2.5} />}
              </button>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                  {TYPE_ICONS[s.type] ?? s.type}
                </span>
                <p className={`text-sm leading-snug mt-0.5 ${isAccepted ? "text-[var(--text)]" : "text-[var(--text-soft)]"}`}>
                  {s.text}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
