import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listPhotos } from "../actions";
import { ComparePhotos } from "./ComparePhotos";

export const dynamic = "force-dynamic";

/**
 * Compare two photos side-by-side. Default picks the oldest on the left
 * and the newest on the right; user can swap either side.
 *
 * Empty / insufficient state: < 2 photos falls back to a CTA to go take
 * another one since compare needs two sides.
 */
export default async function CompareFotosPage() {
  const photos = await listPhotos();

  return (
    <div className="px-6 pt-10">
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/fotos"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
          Fotos
        </Link>
      </div>
      <header className="mb-5">
        <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
          Antes e depois
        </p>
        <h1 className="tlog-title">Comparar</h1>
      </header>

      {photos.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
          <p className="text-sm font-semibold mb-1">Precisa de 2 fotos</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[260px] mx-auto mb-5">
            Só dá pra comparar quando tem pelo menos duas. Tira a próxima
            e volta.
          </p>
          <Link
            href="/fotos/novo"
            className="inline-flex items-center gap-2 font-extrabold text-sm px-5 py-2.5 rounded-xl"
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
            }}
          >
            Nova foto
          </Link>
        </div>
      ) : (
        <ComparePhotos photos={photos} />
      )}
    </div>
  );
}
