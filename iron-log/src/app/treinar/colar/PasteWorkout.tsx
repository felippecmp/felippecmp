"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ClipboardPaste,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  commitPaste,
  previewPaste,
  type ParsePreview,
} from "./actions";

const PLACEHOLDER = `Push A — 21 abr

Supino Inclinado
Cimerian
4x8x60kg

Desenvolvimento Halter
Hammer
3x10x22.5kg`;

/**
 * Three-state flow:
 *   "idle"    — empty textarea, paste your workout
 *   "preview" — parsed structure shown, user reviews + confirms
 *   "saving"  — committing to DB, redirect to the session on success
 *
 * Re-parsing on textarea edit happens via "Analisar" button, not
 * keystroke, to avoid hitting the server on every char while the user
 * is fixing typos.
 */
export function PasteWorkout() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, startParse] = useTransition();
  const [isSaving, startSave] = useTransition();

  function handleParse() {
    setError(null);
    startParse(async () => {
      const result = await previewPaste(text);
      if (!result.ok) {
        setError(result.error);
        setPreview(null);
        return;
      }
      setPreview(result.preview);
    });
  }

  function handleConfirm() {
    if (!preview) return;
    setError(null);
    startSave(async () => {
      const result = await commitPaste(preview);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/workout/${result.sessionId}`);
      router.refresh();
    });
  }

  function removeBlock(i: number) {
    if (!preview) return;
    setPreview({
      ...preview,
      exercises: preview.exercises.filter((_, idx) => idx !== i),
    });
  }

  if (!preview) {
    return (
      <div className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={14}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] tnum focus:outline-none focus:border-[var(--text-muted)] resize-none font-mono"
          style={{
            fontFamily:
              "'Share Tech Mono', 'SF Mono', 'Menlo', 'Courier New', monospace",
          }}
        />

        {error && (
          <p className="text-xs text-[var(--danger)] flex items-center gap-1.5">
            <AlertTriangle size={12} strokeWidth={2} />
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleParse}
          disabled={isParsing || text.trim().length === 0}
          className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-extrabold text-[var(--accent-fg)] disabled:opacity-50 active:scale-[0.99] transition-transform"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-hover))",
          }}
        >
          {isParsing ? (
            <>
              <Loader2 size={16} className="animate-spin" strokeWidth={2.5} />
              Analisando…
            </>
          ) : (
            <>
              <ClipboardPaste size={16} strokeWidth={2.5} />
              Analisar
            </>
          )}
        </button>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-1">
          Formato: nome do exercício, máquina (opcional), séries no formato{" "}
          <span className="tnum text-[var(--text-soft)]">4x8x50kg</span>,{" "}
          <span className="tnum text-[var(--text-soft)]">4x8 50kg</span> ou{" "}
          <span className="tnum text-[var(--text-soft)]">50kg 4x8</span>. Linhas
          em branco separam os blocos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {preview.templateNameHint && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--text-muted)] tracking-wider uppercase">
            Template
          </span>
          <span className="text-[13px] font-bold truncate">
            {preview.templateMatch?.name ?? `${preview.templateNameHint} (novo)`}
          </span>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {preview.exercises.map((ex, i) => (
          <li
            key={`${ex.exerciseName}-${i}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <p className="text-[14px] font-bold leading-tight truncate">
                {ex.exerciseName}
              </p>
              <button
                type="button"
                onClick={() => removeBlock(i)}
                aria-label="Remover este bloco"
                className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors"
              >
                <Trash2 size={12} strokeWidth={2} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {ex.machine && (
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded"
                  style={{
                    background:
                      "color-mix(in oklab, var(--accent) 12%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  {ex.machine}
                </span>
              )}
              {ex.willCreate && (
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--status-progressed)]/40 text-[var(--status-progressed)]">
                  <Plus
                    size={9}
                    strokeWidth={2.5}
                    className="inline -mt-0.5 mr-0.5"
                  />
                  novo
                </span>
              )}
            </div>
            {ex.sets.length === 0 ? (
              <p className="text-[11px] text-[var(--danger)] flex items-center gap-1.5">
                <AlertTriangle size={11} strokeWidth={2} />
                Nenhuma série reconhecida
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {ex.sets.map((s, j) => (
                  <li
                    key={j}
                    className="text-[11px] tnum px-2 py-1 rounded-md bg-[var(--bg-hover)] border border-[var(--border)]"
                  >
                    {s.weightKg}kg × {s.reps}
                  </li>
                ))}
              </ul>
            )}
            {ex.warnings.length > 0 && (
              <p className="mt-1.5 text-[10px] text-[var(--text-muted)] leading-relaxed">
                {ex.warnings.join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p className="text-xs text-[var(--danger)] flex items-center gap-1.5">
          <AlertTriangle size={12} strokeWidth={2} />
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={() => setPreview(null)}
          disabled={isSaving}
          className="flex-1 rounded-xl border border-[var(--border)] py-3 text-[13px] font-bold text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-50"
        >
          Voltar e editar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSaving || preview.exercises.length === 0}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-extrabold text-[var(--accent-fg)] disabled:opacity-50 active:scale-[0.99] transition-transform"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-hover))",
          }}
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
              Salvando…
            </>
          ) : (
            <>
              <Check size={14} strokeWidth={2.5} />
              Confirmar
              <ArrowRight size={12} strokeWidth={2.25} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
