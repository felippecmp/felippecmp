"use client";

import { useState, useTransition } from "react";
import { deleteExercise } from "../actions";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full border border-[var(--danger)]/40 text-[var(--danger)] py-3 rounded font-semibold uppercase text-sm tracking-wider hover:bg-red-950/40 transition-colors"
      >
        Deletar exercício
      </button>
    );
  }

  return (
    <div className="border border-[var(--danger)] bg-red-950/30 p-4 rounded">
      <p className="text-sm text-red-300 mb-3">
        Deletar <strong>{name}</strong>? Essa ação não pode ser desfeita.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="flex-1 border border-[var(--border)] py-2 rounded text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]"
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
          className="flex-1 bg-[var(--danger)] text-white py-2 rounded text-sm font-bold uppercase tracking-wider disabled:opacity-60"
        >
          {isPending ? "Deletando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
