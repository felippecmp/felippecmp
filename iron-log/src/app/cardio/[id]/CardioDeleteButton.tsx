"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCardioSession } from "../actions";

export function CardioDeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 py-3 rounded-xl text-sm font-medium transition-colors"
      >
        <Trash2 size={14} strokeWidth={1.75} />
        Apagar sessão
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--danger)]/40 bg-red-950/20 p-4">
      <p className="text-sm text-red-200 mb-3">
        Apagar esta sessão de cardio? Essa ação não tem volta.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="flex-1 border border-[var(--border)] py-2.5 rounded-lg text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              await deleteCardioSession(id);
            });
          }}
          disabled={isPending}
          className="flex-1 bg-[var(--danger)] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          {isPending ? "Apagando…" : "Apagar"}
        </button>
      </div>
    </div>
  );
}
