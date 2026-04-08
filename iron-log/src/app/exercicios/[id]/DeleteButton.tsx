"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteExercise } from "../actions";

export function DeleteButton({ id, name }: { id: string; name: string }) {
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
        Deletar exercício
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--danger)]/40 bg-red-950/20 p-5">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle
          size={18}
          className="text-[var(--danger)] shrink-0 mt-0.5"
          strokeWidth={1.75}
        />
        <div>
          <p className="font-semibold text-sm text-red-200 mb-1">
            Deletar {name}?
          </p>
          <p className="text-xs text-red-300/70 leading-relaxed">
            Esta ação não pode ser desfeita. O histórico de sessões com este
            exercício será preservado, mas ele não aparecerá mais no catálogo.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="flex-1 border border-[var(--border)] py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await deleteExercise(id);
            })
          }
          className="flex-1 bg-[var(--danger)] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          {isPending ? "Deletando…" : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
