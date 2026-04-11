"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { createMesocycle } from "./actions";
import { generatePhases, PHASE_LABEL, type Phase } from "@/lib/coach/mesocycle";

const SUGGESTED_DURATIONS = [4, 5, 6, 8] as const;

/**
 * Empty-state form for creating a fresh mesocycle. Shows a live phase
 * preview so the user knows what they're committing to before they save.
 */
export function CreateBlockForm() {
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [totalWeeks, setTotalWeeks] = useState(6);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewPhases = generatePhases(totalWeeks);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createMesocycle(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-5"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles
          size={14}
          strokeWidth={1.75}
          className="text-[var(--text-muted)]"
        />
        <p className="label">Criar bloco</p>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
          Nome do bloco
        </span>
        <input
          name="name"
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Hipertrofia Q2 2026"
          disabled={isPending}
          className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
            Início
          </span>
          <input
            name="starts_on"
            type="date"
            required
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            disabled={isPending}
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
            Semanas
          </span>
          <input
            name="total_weeks"
            type="number"
            min="3"
            max="16"
            required
            value={totalWeeks}
            onChange={(e) => setTotalWeeks(parseInt(e.target.value) || 6)}
            disabled={isPending}
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </label>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {SUGGESTED_DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setTotalWeeks(d)}
            disabled={isPending}
            className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
              totalWeeks === d
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            {d}sem
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
          Notas (opcional)
        </span>
        <textarea
          name="user_notes"
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Restrições, metas concretas, contexto…"
          disabled={isPending}
          className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--text-muted)] resize-none transition-colors"
        />
      </label>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Estrutura prevista
        </p>
        <div className="flex gap-1 flex-wrap">
          {previewPhases.map((p, i) => (
            <PhaseChip key={i} phase={p} index={i + 1} />
          ))}
        </div>
        <p className="text-[10px] text-[var(--text-dim)] mt-2 leading-relaxed">
          Volume sobe ao longo da acumulação, mantém na intensificação,
          desce na realização (pra fechar PRs), e zera no deload.
        </p>
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="w-full bg-accent text-accent-fg font-semibold py-3 rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors"
      >
        {isPending ? "Criando…" : "Criar bloco"}
      </button>
    </form>
  );
}

function PhaseChip({ phase, index }: { phase: Phase; index: number }) {
  const colorByPhase: Record<Phase, string> = {
    accumulation: "bg-[var(--bg-raised)] text-[var(--text-soft)]",
    intensification:
      "bg-[var(--bg-raised)] text-[var(--text)] border border-[var(--border-strong)]",
    realization: "bg-[var(--accent)] text-[var(--accent-fg)]",
    deload: "bg-transparent text-[var(--text-dim)] border border-dashed border-[var(--border)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider tnum ${colorByPhase[phase]}`}
      title={`Semana ${index} — ${PHASE_LABEL[phase]}`}
    >
      <span className="opacity-60">{index}</span>
      {PHASE_LABEL[phase].slice(0, 4)}
    </span>
  );
}
