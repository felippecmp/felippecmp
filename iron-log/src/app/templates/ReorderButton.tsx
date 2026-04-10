"use client";

import { useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { reorderTemplate } from "./actions";

type Props = {
  templateId: string;
  direction: "up" | "down";
  disabled?: boolean;
};

export function ReorderButton({ templateId, direction, disabled = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const Icon = direction === "up" ? ArrowUp : ArrowDown;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await reorderTemplate(templateId, direction);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      aria-label={direction === "up" ? "Mover pra cima" : "Mover pra baixo"}
      className="text-[var(--text-dim)] disabled:opacity-30 hover:text-[var(--text)] transition-colors"
    >
      <Icon size={12} strokeWidth={2} />
    </button>
  );
}
