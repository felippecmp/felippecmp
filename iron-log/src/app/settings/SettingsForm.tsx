"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import type { UserSettings } from "@/lib/settings";
import { updateSettings } from "./actions";

export function SettingsForm({ settings }: { settings: UserSettings }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<"kg" | "lb">(settings.unit);
  const [rotationMode, setRotationMode] = useState<"auto" | "linear">(
    settings.rotation_mode
  );

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    // Segmented controls render no native input, so feed them explicitly.
    formData.set("unit", unit);
    formData.set("rotation_mode", rotationMode);
    startTransition(async () => {
      const result = await updateSettings(formData);
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <NumField
          name="default_target_sets"
          label="Sets"
          defaultValue={settings.default_target_sets}
          min={1}
          max={10}
        />
        <NumField
          name="default_rep_range_low"
          label="Rep min"
          defaultValue={settings.default_rep_range_low}
          min={1}
          max={30}
        />
        <NumField
          name="default_rep_range_high"
          label="Rep max"
          defaultValue={settings.default_rep_range_high}
          min={1}
          max={30}
        />
      </div>

      <NumField
        name="default_rest_seconds"
        label="Descanso padrão (seg)"
        defaultValue={settings.default_rest_seconds}
        min={0}
        max={900}
        step={15}
      />

      <div>
        <label className="label block mb-2">Incremento padrão</label>
        <div className="relative">
          <input
            name="default_load_increment"
            type="number"
            step="0.25"
            min="0.25"
            defaultValue={String(settings.default_load_increment)}
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-4 py-3 pr-12 text-base tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
            {unit}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-dim)] mt-1.5">
          Usado como fallback quando você cria um exercício novo.
        </p>
      </div>

      <div>
        <label className="label block mb-2">Unidade</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl">
          {(["kg", "lb"] as const).map((u) => {
            const active = unit === u;
            return (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`text-center py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-accent text-accent-fg"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {u}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[var(--text-dim)] mt-1.5">
          Hoje só kg está totalmente suportado na UI — lb fica armazenado mas
          sem conversão automática.
        </p>
      </div>

      <div>
        <label className="label block mb-2">Meta de peso corporal</label>
        <div className="relative">
          <input
            name="target_weight_kg"
            type="number"
            step="0.1"
            min="0"
            defaultValue={
              settings.target_weight_kg !== null
                ? String(settings.target_weight_kg)
                : ""
            }
            placeholder="Opcional — ex: 72.0"
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-4 py-3 pr-12 text-base tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
            {unit}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-dim)] mt-1.5">
          Aparece como linha tracejada no gráfico de peso em /progresso e um
          chip com o delta atual. Deixa em branco pra não usar.
        </p>
      </div>

      <div>
        <label className="label block mb-2">HR máximo</label>
        <div className="relative">
          <input
            name="max_hr"
            type="number"
            min="100"
            max="230"
            step="1"
            defaultValue={
              settings.max_hr !== null ? String(settings.max_hr) : ""
            }
            placeholder="Opcional — ex: 188"
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-4 py-3 pr-12 text-base tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
            bpm
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-dim)] mt-1.5 leading-relaxed">
          Necessário pra ver as zonas (Z1-Z5) embaixo do gráfico de
          batimentos no treino. Se não souber, 220 - sua idade é uma
          aproximação grosseira.
        </p>
      </div>

      <div>
        <label className="label block mb-2">Rotação de templates</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl">
          {(
            [
              { value: "auto", label: "Auto" },
              { value: "linear", label: "Sequência" },
            ] as const
          ).map((opt) => {
            const active = rotationMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRotationMode(opt.value)}
                className={`text-center py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-accent text-accent-fg"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[var(--text-dim)] mt-1.5 leading-relaxed">
          {rotationMode === "auto"
            ? "Alterna upper ↔ lower, rotacionando dentro do tipo."
            : "Segue a ordem global que você definir em /templates (setas ↑↓). Ignora tipo."}
        </p>
      </div>

      {error && (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-accent text-accent-fg font-semibold py-3 rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors"
      >
        {saved && !isPending ? (
          <>
            <Check size={14} strokeWidth={2.5} />
            Salvo
          </>
        ) : isPending ? (
          "Salvando…"
        ) : (
          "Salvar"
        )}
      </button>
    </form>
  );
}

function NumField({
  name,
  label,
  defaultValue,
  min,
  max,
  step = 1,
}: {
  name: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="label block mb-1.5">{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
      />
    </label>
  );
}
