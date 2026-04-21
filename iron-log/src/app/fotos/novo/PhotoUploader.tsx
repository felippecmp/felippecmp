"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, X } from "lucide-react";
import { CropBars } from "@/components/CropBars";
import { resizeImage } from "@/lib/image-resize";
import { uploadPhoto } from "../actions";

/**
 * Upload flow for a progress photo. Three states:
 *   - "pick"     — big camera target, file input opens camera/gallery
 *   - "crop"     — image preview + top/bottom crop bars + form
 *   - "uploading" — spinner + disabled form
 *
 * All image work is client-side: resize to 1200px JPEG at 80% quality,
 * then POST the resized blob + form fields to the server action.
 */
export function PhotoUploader({
  defaultDate,
  prefillWeightKg,
}: {
  defaultDate: string;
  /** Latest body weight logged for `defaultDate`, if any. */
  prefillWeightKg: number | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ top: 0, bottom: 1 });
  const [weight, setWeight] = useState<string>(
    prefillWeightKg !== null ? prefillWeightKg.toString() : ""
  );
  const [note, setNote] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  // Revoke the object URL when the file changes or the component unmounts
  // so the browser doesn't hang onto the buffer.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  function handleFile(picked: File | null) {
    setError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (!picked.type.startsWith("image/")) {
      setError("Selecione uma imagem.");
      return;
    }
    setFile(picked);
    // Reset crop so each new photo starts full-frame.
    setCrop({ top: 0, bottom: 1 });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecione uma imagem primeiro.");
      return;
    }
    setError(null);
    startUpload(async () => {
      try {
        const resized = await resizeImage(file, { maxEdge: 1200, quality: 0.8 });
        const fd = new FormData();
        fd.set("file", resized);
        fd.set("photo_date", date);
        fd.set("weight_kg", weight);
        fd.set("note", note);
        fd.set("crop_top", String(crop.top));
        fd.set("crop_bottom", String(crop.bottom));
        const result = await uploadPhoto(fd);
        if (result.ok) {
          router.push("/fotos");
          router.refresh();
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha no upload.");
      }
    });
  }

  // Empty state — the big camera target. Tapping triggers the file input
  // which iOS/Android render with a camera + gallery picker.
  if (!file) {
    return (
      <label
        className="flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-card)] py-16 px-6 cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: "color-mix(in oklab, var(--accent) 18%, transparent)",
            color: "var(--accent)",
          }}
        >
          <Camera size={26} strokeWidth={1.75} />
        </div>
        <p className="text-[15px] font-bold">Tirar ou escolher foto</p>
        <p className="text-[12px] text-[var(--text-muted)] leading-relaxed text-center max-w-[260px]">
          A foto fica privada (URL com expiração). Original não é editado — crop é ajustável depois.
        </p>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {error && (
          <p className="text-[11px] text-[var(--danger)] mt-1">{error}</p>
        )}
      </label>
    );
  }

  // Crop + form state.
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <CropBars value={crop} onChange={setCrop}>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Pré-visualização"
            className="block w-full h-auto select-none pointer-events-none"
            draggable={false}
          />
        )}
      </CropBars>

      <button
        type="button"
        onClick={() => handleFile(null)}
        disabled={isUploading}
        className="inline-flex items-center justify-center gap-1.5 self-start text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40"
      >
        <X size={12} strokeWidth={2} />
        Trocar foto
      </button>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="tlog-eyebrow text-[var(--text-muted)]">Data</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isUploading}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm tnum focus:outline-none focus:border-[var(--text-muted)]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="tlog-eyebrow text-[var(--text-muted)]">Peso (kg)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="—"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            disabled={isUploading}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm tnum focus:outline-none focus:border-[var(--text-muted)]"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="tlog-eyebrow text-[var(--text-muted)]">Nota</span>
        <input
          type="text"
          placeholder="Opcional — luz, hora, humor"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          disabled={isUploading}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--text-muted)]"
        />
      </label>

      {error && (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className="mt-2 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-extrabold text-[var(--accent-fg)] disabled:opacity-60 active:scale-[0.99] transition-transform"
        style={{
          background:
            "linear-gradient(135deg, var(--accent), var(--accent-hover))",
        }}
      >
        {isUploading ? (
          <>
            <Loader2 size={16} className="animate-spin" strokeWidth={2.5} />
            Enviando…
          </>
        ) : (
          <>
            <Check size={16} strokeWidth={2.5} />
            Salvar foto
          </>
        )}
      </button>
    </form>
  );
}
