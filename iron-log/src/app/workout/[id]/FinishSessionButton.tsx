"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Flag, Trophy, X } from "lucide-react";
import { finishSession, type PRDetection } from "./actions";

const FEELING_OPTIONS = [
  { value: 1, label: "Fraco" },
  { value: 2, label: "OK" },
  { value: 3, label: "Bom" },
  { value: 4, label: "Forte" },
  { value: 5, label: "PR" },
] as const;

export function FinishSessionButton({
  sessionId,
  totalLogged,
}: {
  sessionId: string;
  totalLogged: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prs, setPrs] = useState<PRDetection[] | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await finishSession(sessionId, {
        overallFeeling: feeling,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.prs.length > 0) {
        setPrs(result.prs);
      } else {
        router.push("/");
      }
    });
  }

  function handleContinue() {
    router.push("/");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-accent text-accent-fg font-semibold py-3.5 rounded-xl hover:bg-accent-hover transition-colors"
      >
        <Flag size={16} strokeWidth={2.5} />
        Finalizar treino
      </button>

      {open && (
        <div
          className="fixed inset-x-0 top-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          style={{ height: "100dvh" }}
          onClick={() => {
            if (isPending) return;
            if (prs) return; // celebration view requires explicit Continuar
            setOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[var(--bg-raised)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col"
          >
            <div className="px-6 pt-5 pb-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
              <h2 className="display-sm text-xl">
                {prs ? "Você quebrou recorde" : "Finalizar sessão"}
              </h2>
              {!prs && (
                <button
                  type="button"
                  onClick={() => !isPending && setOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]"
                  aria-label="Fechar"
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              )}
            </div>

            {prs ? (
              <div
                className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
                style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-accent text-accent-fg flex items-center justify-center shrink-0">
                    <Trophy size={22} strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <p className="display-sm text-2xl leading-tight">
                      {prs.length === 1
                        ? "1 PR no bolso"
                        : `${prs.length} PRs no bolso`}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {prs.length === 1
                        ? "Hoje você superou seu melhor."
                        : "Hoje foi um massacre."}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {prs.map((pr) => (
                    <li
                      key={pr.exerciseId + pr.kind}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold truncate">
                          {pr.exerciseName}
                        </p>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] tnum shrink-0">
                          {pr.kind === "weight" ? "Peso novo" : "Mais reps"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] tnum">
                        <span className="text-[var(--text)] font-semibold">
                          {formatKg(pr.newWeight)} × {pr.newReps}
                        </span>
                        <span className="text-[var(--text-faint)]">
                          {" "}
                          · era {formatKg(pr.priorWeight)} × {pr.priorReps}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full flex items-center justify-center gap-2 bg-accent text-accent-fg font-semibold py-3 rounded-xl hover:bg-accent-hover transition-colors"
                >
                  Continuar
                  <ArrowRight size={16} strokeWidth={2.25} />
                </button>
              </div>
            ) : (
            <div
              className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
              style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            >
              {totalLogged === 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-muted)] leading-relaxed">
                  Nenhum set registrado. Você pode finalizar mesmo assim, mas
                  nada vai entrar no histórico de carga.
                </div>
              )}

              <div>
                <p className="label mb-3">Como foi?</p>
                <div className="grid grid-cols-5 gap-2">
                  {FEELING_OPTIONS.map((opt) => {
                    const active = feeling === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setFeeling(active ? null : opt.value)
                        }
                        disabled={isPending}
                        className={`rounded-xl border py-3 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                          active
                            ? "border-[var(--text)] bg-accent text-accent-fg"
                            : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                        } disabled:opacity-50`}
                      >
                        <span className="display-sm text-lg tnum">
                          {opt.value}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="label block mb-2">Notas</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Opcional — dor, grip, sensação…"
                  disabled={isPending}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] transition-colors resize-none"
                />
              </label>

              {error && (
                <p className="text-xs text-[var(--danger)]">{error}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="flex-1 border border-[var(--border)] py-3 rounded-xl text-sm font-medium disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="flex-1 bg-accent text-accent-fg py-3 rounded-xl text-sm font-semibold hover:bg-accent-hover disabled:opacity-60"
                >
                  {isPending ? "Finalizando…" : "Finalizar"}
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function formatKg(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded}kg`;
  return `${rounded.toFixed(1)}kg`;
}
