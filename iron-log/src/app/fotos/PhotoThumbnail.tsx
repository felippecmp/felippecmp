import Link from "next/link";
import type { PhotoListItem } from "./actions";

/**
 * Single photo tile — respects stored crop_top/crop_bottom so the
 * thumbnail visual matches the user's editorial intent (e.g. head
 * cropped out). The raw image stays full-frame behind a scaled+translated
 * clip so we don't re-encode anything client-side just to display.
 */
export function PhotoThumbnail({
  photo,
  href,
}: {
  photo: PhotoListItem;
  href: string;
}) {
  const windowH = Math.max(0.001, photo.cropBottom - photo.cropTop);
  const windowW = Math.max(0.001, photo.cropRight - photo.cropLeft);
  const scaleX = 1 / windowW;
  const scaleY = 1 / windowH;
  // translate expressed as a % of the TRANSFORMED (scaled) axis. We shift
  // the image so the cropped window lines up with the tile's top-left.
  const translateX = -(photo.cropLeft / windowW) * 100;
  const translateY = -(photo.cropTop / windowH) * 100;

  return (
    <Link
      href={href}
      className="group relative block aspect-[3/4] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] active:scale-[0.99] transition-transform"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.signedUrl}
        alt={photo.note ?? `Foto de ${photo.photoDate}`}
        className="absolute left-0 top-0 w-full h-auto select-none"
        style={{
          transform: `translate(${translateX}%, ${translateY}%) scale(${scaleX}, ${scaleY})`,
          transformOrigin: "top left",
        }}
        loading="lazy"
        draggable={false}
      />
      {/* Gradient legibility band for the caption. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
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
