"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MUSCLES, MOVEMENT_PATTERNS, EQUIPMENT } from "@/lib/muscles";
import { createExercise, updateExercise, type ActionResult } from "./actions";

type Exercise = {
  id?: string;
  name?: string | null;
  session_type?: string | null;
  movement_pattern?: string | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  load_increment?: number | string | null;
  notes?: string | null;
};

export function ExerciseForm({
  exercise,
  mode,
}: {
  exercise?: Exercise;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [sessionType, setSessionType] = useState<string>(
    exercise?.session_type ?? "upper"
  );

  const filteredPatterns = MOVEMENT_PATTERNS.filter(
    (p) => p.session === sessionType
  );

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      let result: ActionResult;
      if (mode === "edit" && exercise?.id) {
        result = await updateExercise(exercise.id, formData);
      } else {
        result = await createExercise(formData);
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/exercicios");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="border border-[var(--danger)] bg-red-950/40 text-red-300 p-3 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Nome
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={exercise?.name ?? ""}
          placeholder="Ex: Supino Reto com Barra"
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-4 py-3 text-base focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Tipo de Treino
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["upper", "lower"] as const).map((t) => (
            <label
              key={t}
              className={`cursor-pointer text-center py-3 rounded border font-semibold uppercase text-sm tracking-wider ${
                sessionType === t
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              }`}
            >
              <input
                type="radio"
                name="session_type"
                value={t}
                checked={sessionType === t}
                onChange={() => setSessionType(t)}
                className="sr-only"
              />
              {t === "upper" ? "Upper" : "Lower"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Padrão de Movimento
        </label>
        <select
          name="movement_pattern"
          required
          defaultValue={exercise?.movement_pattern ?? ""}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-4 py-3 text-base focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">Selecione...</option>
          {filteredPatterns.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Músculo Primário
        </label>
        <select
          name="primary_muscle"
          required
          defaultValue={exercise?.primary_muscle ?? ""}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-4 py-3 text-base focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">Selecione...</option>
          {MUSCLES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Equipamento
        </label>
        <select
          name="equipment"
          defaultValue={exercise?.equipment ?? ""}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-4 py-3 text-base focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">—</option>
          {EQUIPMENT.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Incremento de carga (kg)
        </label>
        <input
          name="load_increment"
          type="number"
          step="0.25"
          min="0.25"
          defaultValue={exercise?.load_increment?.toString() ?? "2.5"}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-4 py-3 text-base tabular focus:outline-none focus:border-[var(--accent)]"
        />
        <p className="text-xs text-[var(--text-dim)] mt-1">
          Quanto adicionar quando bater o topo do rep range (ex: 2.5kg
          compostos, 1kg isolados)
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Notas (opcional)
        </label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={exercise?.notes ?? ""}
          placeholder="Observações sobre execução, cuidados, etc."
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-[var(--border)] py-3 rounded font-semibold uppercase text-sm tracking-wider text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-black py-3 rounded font-bold uppercase text-sm tracking-wider transition-colors"
        >
          {isPending ? "Salvando..." : mode === "edit" ? "Salvar" : "Criar"}
        </button>
      </div>
    </form>
  );
}
