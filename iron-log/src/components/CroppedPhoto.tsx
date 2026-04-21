import type { PhotoListItem } from "@/app/fotos/actions";

/**
 * Renders a progress photo honoring its stored crop rect WITHOUT
 * distorting. The container takes the crop rect's real pixel aspect
 * ratio and the image scales uniformly so the cropped window exactly
 * fills the container — no translate squash, no letterbox, no
 * cover-fit drift.
 *
 * Math:
 *   origAR = origWidth / origHeight
 *   windowW = cropRight - cropLeft       // fraction of original W
 *   windowH = cropBottom - cropTop       // fraction of original H
 *   cropAR = (windowW * origW) / (windowH * origH)
 *   scale  = 1 / windowW                 // makes cropped width fill container
 *   translate = (-cropLeft/windowW * 100%, -cropTop/windowH * 100%)
 *
 * For legacy rows without orig_width/height, cropAR falls back to
 * windowW/windowH (treats original as square) — not geometrically
 * correct but doesn't crash or squash.
 *
 * Callers no longer force an external aspect ratio. Grids live with
 * variable tile heights instead of distorting to fit a fixed frame.
 */
export function CroppedPhoto({
  photo,
  className = "",
  lazy = true,
  children,
}: {
  photo: PhotoListItem;
  className?: string;
  lazy?: boolean;
  children?: React.ReactNode;
}) {
  const windowH = Math.max(0.001, photo.cropBottom - photo.cropTop);
  const windowW = Math.max(0.001, photo.cropRight - photo.cropLeft);
  const hasDims = photo.origWidth && photo.origHeight;

  const cropAR = hasDims
    ? (windowW * photo.origWidth!) / (windowH * photo.origHeight!)
    : windowW / windowH;

  const scale = 1 / windowW;
  // Translate is % of the element's un-transformed box. The element is
  // sized to fill the container width (w-full, h-auto), so cropLeft/
  // windowW * 100% maps the crop origin onto the container origin after
  // the uniform scale.
  const translateX = -(photo.cropLeft / windowW) * 100;
  const translateY = -(photo.cropTop / windowH) * 100;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: cropAR }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.signedUrl}
        alt={photo.note ?? `Foto de ${photo.photoDate}`}
        className="absolute left-0 top-0 w-full h-auto select-none pointer-events-none"
        style={{
          transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
          transformOrigin: "top left",
        }}
        loading={lazy ? "lazy" : "eager"}
        draggable={false}
      />
      {children}
    </div>
  );
}

