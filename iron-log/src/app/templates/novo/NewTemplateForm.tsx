"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { createTemplate } from "../actions";

export function NewTemplateForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<"upper" | "lower">("upper");

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTemplate(formData);
      if (result && !result.ok) setError(result.error);
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

      <div>
        <label className="label block mb-2">Nome</label>
        <input
          name="name"
          type="text"
          required
          placeholder="Upper A"
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-base placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        />
      </div>

      <div>
        <label className="label block mb-2">Tipo</label>
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
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-fg py-3.5 rounded-xl font-semibold text-sm transition-colors"
      >
        {isPending ? "Criando…" : "Criar e adicionar exercícios"}
      </button>
    </form>
  );
}
