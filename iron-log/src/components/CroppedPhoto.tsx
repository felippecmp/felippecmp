import type { PhotoListItem } from "@/app/fotos/actions";

/**
 * Renders a progress photo honoring its stored crop rect WITHOUT
 * distorting — uses a single uniform scale factor driven by the real
 * pixel aspect ratio of the original image.
 *
 * Math:
 *   origAR     = origWidth / origHeight
 *   windowW    = cropRight - cropLeft        // in fraction of original W
 *   windowH    = cropBottom - cropTop        // in fraction of original H
 *   cropAR     = (windowW * origW) / (windowH * origH)
 *
 * The container is given aspect-ratio = cropAR so it matches the crop
 * rect exactly; the image inside scales uniformly so the cropped window
 * fills the container perfectly. No translate() squash, no letterbox.
 *
 * For legacy rows without orig_width/height, we fall back to the
 * independent-scale math — looks slightly off when the user cropped
 * out-of-aspect, but doesn't crash.
 */
export function CroppedPhoto({
  photo,
  className = "",
  /** When provided, overrides the intrinsic cropAR so the consumer can
      force a specific frame (e.g. 3:4 tiles in a grid) and the image
      will cover-fit inside. */
  forceAspect,
  lazy = true,
  children,
}: {
  photo: PhotoListItem;
  className?: string;
  forceAspect?: number;
  lazy?: boolean;
  children?: React.ReactNode;
}) {
  const windowH = Math.max(0.001, photo.cropBottom - photo.cropTop);
  const windowW = Math.max(0.001, photo.cropRight - photo.cropLeft);
  const hasDims = photo.origWidth && photo.origHeight;

  // cropAR = width / height of the visible crop rect in real pixels.
  const cropAR = hasDims
    ? (windowW * photo.origWidth!) / (windowH * photo.origHeight!)
    : windowW / windowH;

  // Container aspect: forced (cover-fit inside) or intrinsic (exact match).
  const frameAR = forceAspect ?? cropAR;
  const coverFit = forceAspect !== undefined && forceAspect !== cropAR;

  // Uniform scale. If the frame matches the crop aspect exactly, scale
  // = 1 / windowW (same as 1 / windowH). If the frame is a different AR
  // (forceAspect), pick the larger of the two so the image COVERS — the
  // excess bleeds past the container edges and is hidden by overflow.
  let scale: number;
  if (coverFit && hasDims) {
    // Convert frame aspect to the same coordinate space as the window
    // fractions. The scale that makes windowW * origW map to containerW
    // and windowH * origH map to containerH — pick max for cover.
    const scaleForWidth = 1 / windowW;
    const scaleForHeight = 1 / windowH;
    scale = Math.max(scaleForWidth, scaleForHeight);
  } else {
    scale = 1 / windowW;
  }

  // Translate to bring the crop rect's top-left onto (0, 0) AFTER scale.
  // In CSS %-translate, 100% of the element's SCALED size = scale * 100%.
  // We want to shift by cropLeft * origW CSS pixels = cropLeft / windowW
  // expressed as % of the scaled image width.
  const translateX = -(photo.cropLeft / windowW) * 100;
  const translateY = -(photo.cropTop / windowH) * 100;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: frameAR }}
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
