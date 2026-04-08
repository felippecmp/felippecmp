"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
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
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/40 bg-red-950/20 text-red-300 p-4 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Field label="Nome">
        <input
          name="name"
          type="text"
          required
          defaultValue={exercise?.name ?? ""}
          placeholder="Supino reto com barra"
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-base placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        />
      </Field>

      <Field label="Tipo">
        <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          {(["upper", "lower"] as const).map((t) => {
            const active = sessionType === t;
            return (
              <label
                key={t}
                className={`cursor-pointer text-center py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-[var(--text)] text-[var(--bg)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <input
                  type="radio"
                  name="session_type"
                  value={t}
                  checked={active}
                  onChange={() => setSessionType(t)}
                  className="sr-only"
                />
                {t === "upper" ? "Upper" : "Lower"}
              </label>
            );
          })}
        </div>
      </Field>

      <Field label="Padrão de movimento">
        <select
          name="movement_pattern"
          required
          defaultValue={exercise?.movement_pattern ?? ""}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        >
          <option value="">Selecionar</option>
          {filteredPatterns.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Músculo primário">
        <select
          name="primary_muscle"
          required
          defaultValue={exercise?.primary_muscle ?? ""}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        >
          <option value="">Selecionar</option>
          {MUSCLES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Equipamento">
        <select
          name="equipment"
          defaultValue={exercise?.equipment ?? ""}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        >
          <option value="">—</option>
          {EQUIPMENT.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Incremento"
        hint="Quanto subir quando bater o topo do rep range"
      >
        <div className="relative">
          <input
            name="load_increment"
            type="number"
            step="0.25"
            min="0.25"
            defaultValue={exercise?.load_increment?.toString() ?? "2.5"}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3.5 pr-12 text-base tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
            kg
          </span>
        </div>
      </Field>

      <Field label="Notas" optional>
        <textarea
          name="notes"
          rows={3}
          defaultValue={exercise?.notes ?? ""}
          placeholder="Execução, cuidados, dicas..."
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] transition-colors resize-none"
        />
      </Field>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-[var(--border)] py-3.5 rounded-xl font-medium text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-[var(--accent-fg)] py-3.5 rounded-xl font-semibold text-sm transition-colors"
        >
          {isPending ? "Salvando…" : mode === "edit" ? "Salvar" : "Criar"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="label">{label}</label>
        {optional && (
          <span className="text-[10px] text-[var(--text-dim)] italic">
            opcional
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-xs text-[var(--text-dim)] mt-2 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
