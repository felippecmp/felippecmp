"use client";

import { useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { duplicateTemplate } from "./actions";

type Props = {
  templateId: string;
  variant?: "icon" | "full";
};

/**
 * Small client button that calls the server action. Used in two places:
 *  - as a compact icon on each template row of /templates
 *  - as a full-width labeled button in the template editor footer
 */
export function DuplicateButton({ templateId, variant = "icon" }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    // Prevent parent <Link> from navigating when the button lives inside
    // a linked row.
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await duplicateTemplate(templateId);
    });
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" strokeWidth={2} />
            Duplicando…
          </>
        ) : (
          <>
            <Copy size={14} strokeWidth={1.75} />
            Duplicar template
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Duplicar template"
      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition-colors disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" strokeWidth={2} />
      ) : (
        <Copy size={14} strokeWidth={1.75} />
      )}
    </button>
  );
}
