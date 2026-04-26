import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PasteWorkout } from "./PasteWorkout";

export const dynamic = "force-dynamic";

export default function ColarPage() {
  return (
    <div className="px-6 pt-10">
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/treinar"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
          Treinar
        </Link>
      </div>
      <header className="mb-5">
        <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
          Pós-treino
        </p>
        <h1 className="tlog-title">Colar treino</h1>
        <p className="mt-2 text-[12px] text-[var(--text-muted)] leading-relaxed">
          Cola o texto que você preencheu no Notes. O app reconhece exercícios,
          máquinas e séries. Exercícios novos entram no catálogo automático.
        </p>
      </header>

      <PasteWorkout />
    </div>
  );
}
