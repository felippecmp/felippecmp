"use client";

import { useState, useTransition } from "react";
import { Check, ClipboardCopy, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { getTemplateText } from "./template-text-action";

/**
 * "Copiar como texto" button — fetches the template's textual
 * representation and writes it to the clipboard. Toast confirms
 * success; errors fall back to a small inline message.
 *
 * Used both on /templates/[id] (template detail) and on /treinar
 * (suggestion card) so the user can grab the text wherever they
 * already are pre-workout.
 */
export function CopyTemplateText({
  templateId,
  variant = "ghost",
}: {
  templateId: string;
  /** "ghost" = subtle border button (template detail page),
      "filled" = accent-tinted pill (treinar suggestion card). */
  variant?: "ghost" | "filled";
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleCopy() {
    setError(null);
    startTransition(async () => {
      const result = await getTemplateText(templateId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      try {
        await navigator.clipboard.writeText(result.text);
        setCopied(true);
        toast("Template copiado");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao copiar.");
      }
    });
  }

  const baseClass =
    "inline-flex items-center gap-1.5 text-[12px] font-extrabold transition-colors active:scale-[0.97]";
  const variantClass =
    variant === "filled"
      ? "px-3 py-1.5 rounded-full text-[var(--accent)]"
      : "px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]";
  const variantStyle =
    variant === "filled"
      ? {
          background:
            "color-mix(in oklab, var(--accent) 15%, transparent)",
          border:
            "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
        }
      : undefined;

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={isPending}
        className={`${baseClass} ${variantClass} disabled:opacity-50`}
        style={variantStyle}
        aria-label="Copiar template como texto"
      >
        {isPending ? (
          <Loader2 size={12} strokeWidth={2.25} className="animate-spin" />
        ) : copied ? (
          <Check size={12} strokeWidth={2.5} />
        ) : (
          <ClipboardCopy size={12} strokeWidth={2.25} />
        )}
        {copied ? "Copiado" : "Copiar como texto"}
      </button>
      {error && (
        <p className="text-[10px] text-[var(--danger)] mt-1">{error}</p>
      )}
    </>
  );
}
