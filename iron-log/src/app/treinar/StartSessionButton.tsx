"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { startSessionFromTemplate } from "./actions";

type Props = {
  templateId: string;
  label: string;
  compact?: boolean;
  disabled?: boolean;
};

export function StartSessionButton({
  templateId,
  label,
  compact = false,
  disabled = false,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startSessionFromTemplate(templateId);
      if (result && result.ok === false) {
        setError(result.error);
      }
    });
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        className="shrink-0 inline-flex items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-fg)] font-semibold text-xs px-3 py-2 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Play size={12} strokeWidth={2.5} fill="currentColor" />
        {isPending ? "…" : label}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-fg)] font-semibold py-3.5 rounded-xl hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Play size={16} strokeWidth={2.5} fill="currentColor" />
        {isPending ? "Iniciando…" : label}
      </button>
      {error && (
        <p className="text-xs text-[var(--danger)] mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
