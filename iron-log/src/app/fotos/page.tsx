import Link from "next/link";
import { ArrowLeftRight, Camera, ChevronLeft, Plus } from "lucide-react";
import { listPhotos } from "./actions";
import { PhotoThumbnail } from "./PhotoThumbnail";

export const dynamic = "force-dynamic";

/**
 * Photos grid. Groups photos by month so the user has a chronological
 * sense of the timeline; each row inside a month is a 2-column grid
 * of thumbnails. Empty state wires directly to /fotos/novo.
 */
export default async function FotosPage() {
  const photos = await listPhotos();

  // Group by "YYYY-MM" for monthly headings.
  const byMonth = new Map<string, typeof photos>();
  for (const p of photos) {
    const key = p.photoDate.slice(0, 7);
    const bucket = byMonth.get(key) ?? [];
    bucket.push(p);
    byMonth.set(key, bucket);
  }
  const monthKeys = Array.from(byMonth.keys()).sort((a, b) =>
    a < b ? 1 : -1
  );

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
          {photos.length > 0 && (
            <p className="mt-1 text-[11px] text-[var(--text-muted)] tnum">
              {photos.length} {photos.length === 1 ? "foto" : "fotos"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {photos.length >= 2 && (
            <Link
              href="/fotos/comparar"
              aria-label="Comparar fotos"
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              <ArrowLeftRight size={16} strokeWidth={2} />
            </Link>
          )}
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
        </div>
      </header>

      {photos.length === 0 ? (
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
      ) : (
        <div className="flex flex-col gap-6 mb-10">
          {monthKeys.map((monthKey) => {
            const items = byMonth.get(monthKey) ?? [];
            return (
              <section key={monthKey}>
                <p className="tlog-eyebrow text-[var(--text-muted)] mb-2">
                  {formatMonthLabel(monthKey)} · {items.length}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((p) => (
                    <PhotoThumbnail
                      key={p.id}
                      photo={p}
                      href={`/fotos/${p.id}`}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map((n) => parseInt(n, 10));
  const d = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
  return d
    .toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}
