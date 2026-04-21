import Link from "next/link";
import { ChevronLeft, Camera } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Placeholder — full grid + upload flow land in PRs 2-3 of the photos
 * series. This keeps the route 200-OK so the TodayChecklist goal chip
 * can link here without a 404 while the UI is being built.
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
      <header className="mb-5">
        <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
          Progresso visual
        </p>
        <h1 className="tlog-title">Fotos</h1>
      </header>

      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] mb-4">
          <Camera size={20} strokeWidth={1.75} />
        </div>
        <p className="text-sm font-semibold mb-1">Em construção</p>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[280px] mx-auto">
          Upload, crop (topo/fundo), peso, lado-a-lado — chegam nas próximas
          PRs do port.
        </p>
      </div>
    </div>
  );
}
