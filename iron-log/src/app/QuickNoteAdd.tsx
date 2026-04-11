"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, NotebookPen, X } from "lucide-react";
import { saveDailyNote } from "./notas/actions";

type Props = {
  todayNote: { id: string; body: string; noteDate: string } | null;
};

/**
 * Free-form daily journal entry. One per day; tap to edit, save with
 * the green check. Saves to /daily_notes which surfaces in the diary.
 */
export function QuickNoteAdd({ todayNote }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (todayNote && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] transition-colors text-left"
      >
        <NotebookPen
          size={14}
          strokeWidth={1.75}
          className="text-[var(--text-soft)] mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Nota de hoje
          </p>
          <p className="text-sm text-[var(--text)] line-clamp-2 leading-snug">
            {todayNote.body}
          </p>
        </div>
        <ArrowRight
          size={14}
          strokeWidth={1.75}
          className="text-[var(--text-dim)] mt-0.5"
        />
      </button>
    );
  }

  if (editing) {
    return (
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await saveDailyNote(formData);
            if (result.ok) {
              setEditing(false);
            } else {
              setError(result.error);
            }
          });
        }}
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
              Como tá hoje
            </span>
            <textarea
              name="body"
              required
              autoFocus
              rows={3}
              maxLength={500}
              defaultValue={todayNote?.body ?? ""}
              placeholder="Sono, dor, humor, energia…"
              className="w-full bg-transparent border-0 border-b border-[var(--border)] focus:border-[var(--text-muted)] focus:outline-none text-sm py-1 resize-none placeholder:text-[var(--text-dim)]"
            />
            <input
              type="hidden"
              name="note_date"
              value={
                todayNote?.noteDate ?? new Date().toISOString().slice(0, 10)
              }
            />
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={isPending}
              className="w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-60"
              aria-label="Cancelar"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="w-9 h-9 rounded-lg bg-accent text-accent-fg flex items-center justify-center disabled:opacity-60"
              aria-label="Salvar"
            >
              <Check size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        {error && (
          <p className="text-[10px] text-[var(--danger)] mt-2">{error}</p>
        )}
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-transparent hover:border-[var(--text-muted)] hover:bg-[var(--bg-card)]/40 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
          Escrever nota
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Sono, dor, humor — uma linha bastam
        </p>
      </div>
      <NotebookPen
        size={14}
        strokeWidth={1.75}
        className="text-[var(--text-dim)]"
      />
    </button>
  );
}
