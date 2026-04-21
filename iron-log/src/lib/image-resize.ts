/**
 * Client-side image resize. Loads a File through createImageBitmap so
 * browser EXIF-orientation handling is applied (iPhones rotate photos
 * via metadata; without this, portraits end up sideways). Re-encodes
 * to JPEG at 80% quality with the long edge capped at `maxEdge`.
 *
 * Typical iPhone photo: 3–5 MB, 4032×3024 → resized output ~200 KB,
 * 1200×900 — plenty of detail for progression photos without blowing
 * Storage budget.
 */
export type ResizedImage = {
  file: File;
  width: number;
  height: number;
};

export async function resizeImage(
  file: File,
  { maxEdge = 1200, quality = 0.8 }: { maxEdge?: number; quality?: number } = {}
): Promise<ResizedImage> {
  // createImageBitmap with imageOrientation:'from-image' applies EXIF
  // rotation so iPhone portrait photos aren't sideways. Falls back to
  // a regular Image element on the rare browser that doesn't support
  // the option (older mobile Safari).
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch {
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    bitmap = await createImageBitmap(canvas);
  }

  const ratio = Math.min(maxEdge / bitmap.width, maxEdge / bitmap.height, 1);
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context indisponível.");
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao codificar JPEG"))),
      "image/jpeg",
      quality
    );
  });

  // Clean original name, force .jpg since we just re-encoded.
  const base = file.name.replace(/\.[a-z0-9]+$/i, "") || "photo";
  const out = new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  return { file: out, width: w, height: h };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
