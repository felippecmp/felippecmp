import Link from "next/link";
import { Camera, ChevronLeft, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Photos landing — PR 2 only wires the "nova foto" CTA. The grid + compare
 * flows land in PRs 3-4 and will replace the empty-state card below.
 */
export default function FotosPage() {
  return (
    <div className="px-6 pt-10">
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
          Hoje
        </Link>
      </div>
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
            Progresso visual
          </p>
          <h1 className="tlog-title">Fotos</h1>
        </div>
        <Link
          href="/fotos/novo"
          aria-label="Nova foto"
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </Link>
      </header>

      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] mb-4">
          <Camera size={20} strokeWidth={1.75} />
        </div>
        <p className="text-sm font-semibold mb-1">Sem fotos ainda</p>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[280px] mx-auto mb-5">
          Tira a primeira. A partir da segunda, abre o modo comparar.
        </p>
        <Link
          href="/fotos/novo"
          className="inline-flex items-center gap-2 font-extrabold text-sm px-5 py-2.5 rounded-xl"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
          }}
        >
          <Camera size={14} strokeWidth={2.25} />
          Nova foto
        </Link>
      </div>
    </div>
  );
}
