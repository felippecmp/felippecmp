"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  deleteBodyWeight,
  logBodyWeight,
  updateBodyWeight,
} from "./actions";

export type WeightEntry = {
  id: string;
  weightKg: number;
  recordedAt: string;
  notes: string | null;
};

export function WeightEntries({ entries }: { entries: WeightEntry[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <>
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full mb-6 flex items-center justify-center gap-2 bg-accent text-accent-fg font-semibold py-3 rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Registrar peso
        </button>
      )}

      {adding && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <EntryForm
            mode="create"
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
          <p className="text-sm font-semibold mb-1">Sem registros ainda</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[260px] mx-auto">
            Um registro por dia já é suficiente. O app mantém a trend de 90
            dias e calcula delta 7d/30d em Progresso.
          </p>
        </div>
      ) : (
        <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </>
  );
}

function EntryRow({ entry }: { entry: WeightEntry }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteBodyWeight(entry.id);
    });
  }

  if (editing) {
    return (
      <li className="p-4">
        <EntryForm
          mode="edit"
          entry={entry}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="display-sm text-xl tnum tabular-nums">
            {entry.weightKg.toFixed(1)}
          </span>
          <span className="text-xs text-[var(--text-dim)]">kg</span>
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5 tnum">
          {formatDateTime(entry.recordedAt)}
          {entry.notes && (
            <>
              <span className="text-[var(--text-faint)]"> · </span>
              <span className="text-[var(--text-soft)]">{entry.notes}</span>
            </>
          )}
        </div>
      </div>
      {confirmDelete ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            disabled={isPending}
            className="text-[10px] uppercase tracking-wider px-2 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-[10px] uppercase tracking-wider px-2 py-1.5 rounded-md bg-[var(--danger)] text-white font-semibold disabled:opacity-50"
          >
            {isPending ? "…" : "Apagar"}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
            aria-label="Editar"
          >
            <Pencil size={12} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors"
            aria-label="Apagar"
          >
            <Trash2 size={12} strokeWidth={1.75} />
          </button>
        </>
      )}
    </li>
  );
}

function EntryForm({
  mode,
  entry,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  entry?: WeightEntry;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultDate = entry
    ? entry.recordedAt.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const defaultWeight = entry ? entry.weightKg.toString() : "";
  const defaultNotes = entry?.notes ?? "";

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "edit" && entry
          ? await updateBodyWeight(entry.id, formData)
          : await logBodyWeight(formData);
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label block mb-1.5">Peso (kg)</span>
          <input
            name="weight_kg"
            type="number"
            step="0.1"
            min="1"
            required
            defaultValue={defaultWeight}
            placeholder="74.2"
            autoFocus
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-4 py-3 text-base tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </label>
        <label className="block">
          <span className="label block mb-1.5">Data</span>
          <input
            name="recorded_at"
            type="date"
            required
            defaultValue={defaultDate}
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </label>
      </div>
      <label className="block">
        <span className="label block mb-1.5">Notas (opcional)</span>
        <input
          name="notes"
          type="text"
          defaultValue={defaultNotes}
          placeholder="Manhã, em jejum, etc."
          className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        />
      </label>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 border border-[var(--border)] py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-60"
        >
          <X size={14} className="inline mr-1" strokeWidth={1.75} />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-accent text-accent-fg py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          <Check size={14} className="inline mr-1" strokeWidth={2.5} />
          {isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}
