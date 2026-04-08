"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { loginAction, type LoginResult } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, isPending] = useActionState<LoginResult | null, FormData>(
    loginAction,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />

      <div>
        <label className="label block mb-2">Senha</label>
        <input
          name="password"
          type="password"
          autoFocus
          required
          autoComplete="current-password"
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-base placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
        />
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 text-[var(--danger)] text-xs">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-[var(--accent-fg)] font-semibold py-3.5 rounded-xl text-sm transition-colors inline-flex items-center justify-center gap-2"
      >
        {isPending ? "Entrando…" : "Entrar"}
        {!isPending && <ArrowRight size={16} strokeWidth={2.5} />}
      </button>
    </form>
  );
}
