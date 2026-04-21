"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { CropBars } from "@/components/CropBars";
import type { PhotoListItem } from "../actions";
import { deletePhoto, updatePhoto } from "../actions";

/**
 * Full-width photo view with editable crop bars + metadata form. Lets
 * the user adjust crop_top / crop_bottom / weight / note / photo_date
 * without re-uploading. Destructive delete is two-step (confirm pill).
 */
export function PhotoDetail({ photo }: { photo: PhotoListItem }) {
  const router = useRouter();
  const [crop, setCrop] = useState({
    top: photo.cropTop,
    bottom: photo.cropBottom,
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

  const dirty =
    crop.top !== photo.cropTop ||
    crop.bottom !== photo.cropBottom ||
    weight !== (photo.weightKg !== null ? photo.weightKg.toString() : "") ||
    note !== (photo.note ?? "") ||
    date !== photo.photoDate;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setError(null);
    startSave(async () => {
      const result = await updatePhoto({
        id: photo.id,
        cropTop: crop.top,
        cropBottom: crop.bottom,
        weightKg: weight.trim() === "" ? null : Number(weight),
        note: note.trim() === "" ? null : note.trim(),
        photoDate: date,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
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

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <CropBars value={crop} onChange={setCrop}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.signedUrl}
          alt={photo.note ?? `Foto de ${photo.photoDate}`}
          className="block w-full h-auto select-none pointer-events-none"
          draggable={false}
        />
      </CropBars>

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
