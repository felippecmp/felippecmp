import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { listPhotos } from "../actions";
import { PhotoDetail } from "./PhotoDetail";

export const dynamic = "force-dynamic";

/**
 * Single photo view — edit crop, weight, note, date, or delete. Loads
 * by filtering listPhotos() since that's the one call-site that
 * generates signed URLs. For a single-user app the list is small
 * enough that scanning is fine; if it grows, split into a fetch-by-id.
 */
export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const photos = await listPhotos();
  const photo = photos.find((p) => p.id === id);
  if (!photo) notFound();

  const label = new Date(photo.photoDate + "T12:00:00Z").toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  );

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
          {label}
        </p>
        <h1 className="tlog-title">
          {photo.weightKg !== null
            ? `${photo.weightKg.toFixed(1)}kg`
            : "Foto"}
        </h1>
      </header>

      <PhotoDetail photo={photo} />
    </div>
  );
}
