"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import {
  createCardioSession,
  updateCardioSession,
  type ActionResult,
  type CardioType,
} from "./actions";

type CardioDefaults = {
  id?: string;
  activityType?: CardioType;
  startedAt?: string;
  durationMinutes?: number;
  distanceKm?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  calories?: number | null;
  notes?: string | null;
};

const TYPE_OPTIONS: Array<{ value: CardioType; label: string }> = [
  { value: "walking", label: "Caminhada" },
  { value: "running", label: "Corrida" },
  { value: "cycling", label: "Bike" },
  { value: "other", label: "Outro" },
];

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export function CardioForm({
  mode,
  defaults,
}: {
  mode: "create" | "edit";
  defaults?: CardioDefaults;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activityType, setActivityType] = useState<CardioType>(
    defaults?.activityType ?? "walking"
  );

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      let result: ActionResult;
      if (mode === "edit" && defaults?.id) {
        result = await updateCardioSession(defaults.id, formData);
      } else {
        result = await createCardioSession(formData);
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(defaults?.id ? `/cardio/${defaults.id}` : "/cardio");
      router.refresh();
    });
  }

  const defaultStartedAt =
    defaults?.startedAt ?? toLocalDatetimeInput(new Date().toISOString());

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/40 bg-red-950/20 text-red-300 p-4 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Field label="Tipo">
        <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          {TYPE_OPTIONS.map((opt) => {
            const active = activityType === opt.value;
            return (
              <label
                key={opt.value}
                className={`cursor-pointer text-center py-2 rounded-lg text-[11px] font-medium transition-all ${
                  active
                    ? "bg-accent text-accent-fg"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <input
                  type="radio"
                  name="activity_type"
                  value={opt.value}
                  checked={active}
                  onChange={() => setActivityType(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Duração (min)" hint="Aceita 35 ou 1:05">
          <input
            name="duration_minutes"
            type="text"
            inputMode="numeric"
            required
            defaultValue={defaults?.durationMinutes?.toString() ?? ""}
            placeholder="35"
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </Field>
        <Field label="Distância (km)" optional>
          <input
            name="distance_km"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults?.distanceKm?.toString() ?? ""}
            placeholder="3.80"
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </Field>
      </div>

      <Field label="Início">
        <input
          name="started_at"
          type="datetime-local"
          defaultValue={defaultStartedAt}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="HR avg" optional>
          <input
            name="avg_heart_rate"
            type="number"
            min="0"
            max="260"
            defaultValue={defaults?.avgHeartRate?.toString() ?? ""}
            placeholder="118"
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </Field>
        <Field label="HR max" optional>
          <input
            name="max_heart_rate"
            type="number"
            min="0"
            max="260"
            defaultValue={defaults?.maxHeartRate?.toString() ?? ""}
            placeholder="142"
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </Field>
        <Field label="Kcal" optional>
          <input
            name="calories"
            type="number"
            min="0"
            defaultValue={defaults?.calories?.toString() ?? ""}
            placeholder="240"
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
        </Field>
      </div>

      <Field label="Notas" optional>
        <textarea
          name="notes"
          rows={2}
          maxLength={500}
          defaultValue={defaults?.notes ?? ""}
          placeholder="Parque da cidade, sol forte…"
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] transition-colors resize-none"
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-[var(--border)] py-3 rounded-xl font-medium text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-fg py-3 rounded-xl font-semibold text-sm transition-colors"
        >
          {isPending ? "Salvando…" : mode === "edit" ? "Salvar" : "Registrar"}
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
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="label">{label}</label>
        {optional && (
          <span className="text-[10px] text-[var(--text-dim)] italic">
            opcional
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-xs text-[var(--text-dim)] mt-1.5 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
