"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { abandonSession } from "../../treinar/actions";

export function AbandonSessionButton({ sessionId }: { sessionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await abandonSession(sessionId);
      if (result && result.ok === false) {
        setError(result.error);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 py-3 rounded-xl text-sm font-medium transition-colors"
      >
        <Trash2 size={14} strokeWidth={1.75} />
        Abandonar sessão
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--danger)]/40 bg-red-950/20 p-4">
      <p className="text-sm text-red-200 mb-3">
        Abandonar a sessão apaga o registro. Tem certeza?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="flex-1 border border-[var(--border)] py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 bg-[var(--danger)] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          {isPending ? "Abandonando…" : "Abandonar"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-300 mt-3 text-center">{error}</p>
      )}
    </div>
  );
}
