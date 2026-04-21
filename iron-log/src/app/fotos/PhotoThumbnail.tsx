import Link from "next/link";
import { CroppedPhoto } from "@/components/CroppedPhoto";
import type { PhotoListItem } from "./actions";

/**
 * Single photo tile in the grid. Uses <CroppedPhoto> so the stored
 * crop rect is honored without distortion — cover-fit into the 3:4
 * tile when the user's crop doesn't match that aspect, preserving
 * pixel-accurate proportions.
 */
export function PhotoThumbnail({
  photo,
  href,
}: {
  photo: PhotoListItem;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] active:scale-[0.99] transition-transform"
    >
      <CroppedPhoto photo={photo} forceAspect={3 / 4} className="rounded-[14px]">
        {/* Darker legibility band — stronger gradient than before so
            the date/weight caption stays punchy against bright shots. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.65) 35%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold tnum text-white">
            {formatDateLabel(photo.photoDate)}
          </span>
          {photo.weightKg !== null && (
            <span
              className="text-[11px] font-extrabold tnum"
              style={{ color: "var(--accent)" }}
            >
              {photo.weightKg.toFixed(1)}kg
            </span>
          )}
        </div>
      </CroppedPhoto>
    </Link>
  );
}

function formatDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    })
    .replace(".", "");
}
