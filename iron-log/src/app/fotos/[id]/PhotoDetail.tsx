"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Crop, Loader2, Trash2, X } from "lucide-react";
import { CroppedPhoto } from "@/components/CroppedPhoto";
import { CropFrame, type CropRect } from "@/components/CropFrame";
import type { PhotoListItem } from "../actions";
import { deletePhoto, updatePhoto } from "../actions";

/**
 * Full-width photo view. Defaults to "view" mode — the image already
 * cropped, no handles — and hides the crop UI behind an explicit
 * "Editar recorte" button so the user doesn't see the frame every
 * time they open a photo. Weight / note / date stay inline-editable
 * since they're not visually loud.
 */
export function PhotoDetail({ photo }: { photo: PhotoListItem }) {
  const router = useRouter();
  const [editingCrop, setEditingCrop] = useState(false);
  const [crop, setCrop] = useState<CropRect>({
    top: photo.cropTop,
    bottom: photo.cropBottom,
    left: photo.cropLeft,
    right: photo.cropRight,
  });
  const [weight, setWeight] = useState<string>(
    photo.weightKg !== null ? photo.weightKg.toString() : ""
  );
  const [note, setNote] = useState(photo.note ?? "");
  const [date, setDate] = useState(photo.photoDate);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const cropDirty =
    crop.top !== photo.cropTop ||
    crop.bottom !== photo.cropBottom ||
    crop.left !== photo.cropLeft ||
    crop.right !== photo.cropRight;
  const fieldsDirty =
    weight !== (photo.weightKg !== null ? photo.weightKg.toString() : "") ||
    note !== (photo.note ?? "") ||
    date !== photo.photoDate;
  const dirty = cropDirty || fieldsDirty;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setError(null);
    startSave(async () => {
      const result = await updatePhoto({
        id: photo.id,
        cropTop: crop.top,
        cropBottom: crop.bottom,
        cropLeft: crop.left,
        cropRight: crop.right,
        weightKg: weight.trim() === "" ? null : Number(weight),
        note: note.trim() === "" ? null : note.trim(),
        photoDate: date,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setEditingCrop(false);
        router.refresh();
      }
    });
  }

  function handleCancelCrop() {
    // Revert pending crop edits back to the saved values.
    setCrop({
      top: photo.cropTop,
      bottom: photo.cropBottom,
      left: photo.cropLeft,
      right: photo.cropRight,
    });
    setEditingCrop(false);
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startDelete(async () => {
      const result = await deletePhoto(photo.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/fotos");
      router.refresh();
    });
  }

  // Crop preview uses the pending crop state so "Editar" shows the user
  // their in-flight edits immediately without needing to save first. We
  // construct a pseudo-photo with the pending crop for the renderer.
  const previewPhoto: PhotoListItem = {
    ...photo,
    cropTop: crop.top,
    cropBottom: crop.bottom,
    cropLeft: crop.left,
    cropRight: crop.right,
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      {editingCrop ? (
        <>
          <CropFrame value={crop} onChange={setCrop}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.signedUrl}
              alt={photo.note ?? `Foto de ${photo.photoDate}`}
              className="block w-full h-auto select-none pointer-events-none"
              draggable={false}
            />
          </CropFrame>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelCrop}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] py-2.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
            >
              <X size={12} strokeWidth={2.25} />
              Cancelar recorte
            </button>
            <button
              type="button"
              onClick={() => setEditingCrop(false)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-extrabold text-[var(--accent-fg)]"
              style={{
                background: "var(--accent)",
              }}
            >
              <Check size={12} strokeWidth={2.5} />
              Concluir recorte
            </button>
          </div>
        </>
      ) : (
        <div className="relative">
          <CroppedPhoto photo={previewPhoto} lazy={false} className="rounded-[14px]">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-24 pointer-events-none rounded-b-[14px]"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 40%, transparent 100%)",
              }}
            />
          </CroppedPhoto>
          <button
            type="button"
            onClick={() => setEditingCrop(true)}
            className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold backdrop-blur"
            style={{
              background: "rgba(0,0,0,0.55)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <Crop size={11} strokeWidth={2.25} />
            Editar recorte
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="tlog-eyebrow text-[var(--text-muted)]">Data</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isSaving || isDeleting}
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
            disabled={isSaving || isDeleting}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm tnum focus:outline-none focus:border-[var(--text-muted)]"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="tlog-eyebrow text-[var(--text-muted)]">Nota</span>
        <input
          type="text"
          placeholder="Opcional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          disabled={isSaving || isDeleting}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--text-muted)]"
        />
      </label>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={!dirty || isSaving || isDeleting}
        className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-extrabold text-[var(--accent-fg)] disabled:opacity-50 active:scale-[0.99] transition-transform"
        style={{
          background:
            "linear-gradient(135deg, var(--accent), var(--accent-hover))",
        }}
      >
        {isSaving ? (
          <>
            <Loader2 size={16} className="animate-spin" strokeWidth={2.5} />
            Salvando…
          </>
        ) : (
          <>
            <Check size={16} strokeWidth={2.5} />
            {dirty ? "Salvar alterações" : "Sem mudanças"}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isSaving || isDeleting}
        onBlur={() => setConfirmDelete(false)}
        className={`mt-2 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-colors ${
          confirmDelete
            ? "border-[var(--danger)] text-[var(--danger)] bg-[var(--danger)]/10"
            : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/50"
        } disabled:opacity-50`}
      >
        {isDeleting ? (
          <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
        ) : (
          <Trash2 size={14} strokeWidth={2} />
        )}
        {isDeleting
          ? "Apagando…"
          : confirmDelete
            ? "Confirmar exclusão"
            : "Apagar foto"}
      </button>
    </form>
  );
}
