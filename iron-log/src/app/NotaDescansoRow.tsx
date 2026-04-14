"use client";

import { useState, useTransition } from "react";
import { Bed, Check, Loader2, NotebookPen, X } from "lucide-react";
import { useToast } from "@/components/Toast";
import { saveDailyNote } from "./notas/actions";
import { markRestDay, unmarkRestDay } from "./descanso/actions";

type Props = {
  todayNote: { id: string; body: string; noteDate: string } | null;
  isRestDay: boolean;
  todayKey: string;
};

/**
 * Compact secondary row for things that aren't part of the daily checklist:
 * the journal note and the rest day toggle. Stacks on narrow screens, sits
 * inline on wider ones. Each side handles its own expand/edit state.
 */
export function NotaDescansoRow({ todayNote, isRestDay, todayKey }: Props) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
      <NotaSlot todayNote={todayNote} />
      <DescansoSlot isRestDay={isRestDay} todayKey={todayKey} />
    </div>
  );
}

function NotaSlot({ todayNote }: { todayNote: Props["todayNote"] }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  if (editing) {
    const errorId = "nota-descanso-error";
    return (
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await saveDailyNote(formData);
            if (result.ok) {
              setEditing(false);
              toast("Nota salva");
            } else {
              setError(result.error);
            }
          });
        }}
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5"
        aria-busy={isPending}
      >
        <div className="flex items-start gap-2">
          <NotebookPen
            size={12}
            strokeWidth={1.75}
            className="text-[var(--text-soft)] mt-1 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <label htmlFor="daily-note-body" className="sr-only">
              Nota do dia
            </label>
            <textarea
              id="daily-note-body"
              name="body"
              required
              autoFocus
              rows={2}
              maxLength={500}
              defaultValue={todayNote?.body ?? ""}
              placeholder="Sono, dor, humor, energia…"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={`w-full bg-transparent border-0 focus:outline-none text-sm py-0 resize-none placeholder:text-[var(--text-dim)] leading-snug ${
                error ? "text-[var(--danger)]" : ""
              }`}
            />
            <input
              type="hidden"
              name="note_date"
              value={
                todayNote?.noteDate ?? new Date().toISOString().slice(0, 10)
              }
            />
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="submit"
              disabled={isPending}
              className="w-9 h-9 rounded-md bg-accent text-accent-fg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
              aria-label={isPending ? "Salvando nota" : "Salvar nota"}
            >
              {isPending ? (
                <Loader2 size={12} strokeWidth={2.5} className="animate-spin" />
              ) : (
                <Check size={12} strokeWidth={2.5} />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={isPending}
              className="w-9 h-9 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition-transform disabled:opacity-60"
              aria-label="Cancelar"
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        {error && (
          <p
            id={errorId}
            className="text-[10px] text-[var(--danger)] mt-1.5"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
    );
  }

  if (todayNote) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] active:bg-[var(--bg-hover)] transition-colors text-left min-w-0"
      >
        <NotebookPen
          size={12}
          strokeWidth={1.75}
          className="text-[var(--text-soft)] mt-0.5 shrink-0"
        />
        <p className="text-xs text-[var(--text)] line-clamp-2 leading-snug min-w-0">
          {todayNote.body}
        </p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[var(--border-strong)] hover:border-[var(--text-muted)] active:bg-[var(--bg-card)] transition-colors text-left text-[var(--text-muted)] hover:text-[var(--text)]"
    >
      <NotebookPen size={12} strokeWidth={1.75} />
      <span className="text-xs">Escrever nota</span>
    </button>
  );
}

function DescansoSlot({
  isRestDay,
  todayKey,
}: {
  isRestDay: boolean;
  todayKey: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function toggle() {
    startTransition(async () => {
      if (isRestDay) {
        await unmarkRestDay(todayKey);
        toast("Dia de descanso removido");
      } else {
        const form = new FormData();
        form.append("rest_date", todayKey);
        await markRestDay(form);
        toast("Dia de descanso marcado");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={isRestDay}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-colors text-xs disabled:opacity-60 ${
        isRestDay
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
          : "border-dashed border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]"
      }`}
    >
      {isRestDay ? (
        <Check size={12} strokeWidth={2.5} />
      ) : (
        <Bed size={12} strokeWidth={1.75} />
      )}
      {isRestDay ? "Descanso" : "Marcar descanso"}
    </button>
  );
}
