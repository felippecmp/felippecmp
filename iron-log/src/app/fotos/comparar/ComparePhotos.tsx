"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { CroppedPhoto } from "@/components/CroppedPhoto";
import type { PhotoListItem } from "../actions";

type Side = "left" | "right";

/**
 * Side-by-side compare view. Two slots (esquerda / direita); tapping
 * a slot opens a thumbnail picker below. Once both slots are filled,
 * the delta banner above shows the gap in days and kg.
 *
 * Slider/scrubber mode is intentionally skipped for MVP — the 2-column
 * layout is what most people actually use (same pose, different date).
 * Can add in a follow-up PR if you miss it.
 */
export function ComparePhotos({ photos }: { photos: PhotoListItem[] }) {
  // Default: most recent on the right, oldest on the left. User can
  // change either side via the picker below.
  const [leftId, setLeftId] = useState<string | null>(
    photos.length > 0 ? photos[photos.length - 1].id : null
  );
  const [rightId, setRightId] = useState<string | null>(
    photos.length > 0 ? photos[0].id : null
  );
  const [picking, setPicking] = useState<Side | null>(null);

  const left = photos.find((p) => p.id === leftId) ?? null;
  const right = photos.find((p) => p.id === rightId) ?? null;

  const daysApart =
    left && right
      ? Math.abs(
          Math.round(
            (new Date(right.photoDate).getTime() -
              new Date(left.photoDate).getTime()) /
              86400000
          )
        )
      : null;
  const weightDelta =
    left?.weightKg !== null &&
    left?.weightKg !== undefined &&
    right?.weightKg !== null &&
    right?.weightKg !== undefined
      ? +((right.weightKg ?? 0) - (left.weightKg ?? 0)).toFixed(1)
      : null;

  function pickFor(side: Side, id: string) {
    if (side === "left") setLeftId(id);
    else setRightId(id);
    setPicking(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Delta banner — only once both sides are picked. */}
      {left && right && daysApart !== null && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5">
          <DeltaStat label="Intervalo" value={`${daysApart}d`} />
          {weightDelta !== null && (
            <>
              <span className="text-[var(--border-strong)]">·</span>
              <DeltaStat
                label="Peso"
                value={`${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)}kg`}
                tone={
                  weightDelta === 0
                    ? "neutral"
                    : weightDelta < 0
                      ? "accent"
                      : "stalled"
                }
              />
            </>
          )}
        </div>
      )}

      {/* The two slots. Tapping an empty one opens the picker. */}
      <div className="grid grid-cols-2 gap-2">
        <CompareSlot
          side="left"
          photo={left}
          onPick={() => setPicking("left")}
          onClear={() => setLeftId(null)}
        />
        <CompareSlot
          side="right"
          photo={right}
          onPick={() => setPicking("right")}
          onClear={() => setRightId(null)}
        />
      </div>

      {/* Picker sheet — inline, not a modal, so the user still sees
          the slots while choosing. */}
      {picking && (
        <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-card)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="tlog-eyebrow text-[var(--accent)]">
              Escolher {picking === "left" ? "esquerda" : "direita"}
            </p>
            <button
              type="button"
              onClick={() => setPicking(null)}
              aria-label="Fechar"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 max-h-[40vh] overflow-y-auto">
            {photos.map((p) => {
              const active =
                (picking === "left" && p.id === leftId) ||
                (picking === "right" && p.id === rightId);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickFor(picking, p.id)}
                  className={`relative rounded-lg border active:scale-[0.98] transition-transform overflow-hidden ${
                    active
                      ? "border-[var(--accent)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  <CroppedPhoto photo={p} forceAspect={3 / 4}>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full"
                        style={{
                          background: "var(--accent)",
                          color: "var(--accent-fg)",
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    <span className="absolute left-1 bottom-1 text-[9px] font-bold tnum text-white drop-shadow">
                      {p.photoDate.slice(5).replace("-", "/")}
                    </span>
                  </CroppedPhoto>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareSlot({
  side,
  photo,
  onPick,
  onClear,
}: {
  side: Side;
  photo: PhotoListItem | null;
  onPick: () => void;
  onClear: () => void;
}) {
  if (!photo) {
    return (
      <button
        type="button"
        onClick={onPick}
        className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-card)] text-[var(--text-muted)] active:scale-[0.99]"
      >
        <Plus size={20} strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {side === "left" ? "Esquerda" : "Direita"}
        </span>
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)]">
      <CroppedPhoto photo={photo} forceAspect={3 / 4}>
        {/* Darker gradient for caption legibility against bright photos. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 35%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-2">
          <p className="text-[11px] font-bold tnum text-white">
            {formatLabel(photo.photoDate)}
          </p>
          {photo.weightKg !== null && (
            <p
              className="text-[13px] font-extrabold tnum leading-none"
              style={{ color: "var(--accent)" }}
            >
              {photo.weightKg.toFixed(1)}kg
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Remover"
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onPick}
          aria-label="Trocar"
          className="absolute top-1.5 left-1.5 text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/60 text-white"
        >
          Trocar
        </button>
      </CroppedPhoto>
    </div>
  );
}

function DeltaStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "accent" | "stalled";
}) {
  const color =
    tone === "accent"
      ? "var(--accent)"
      : tone === "stalled"
        ? "var(--status-stalled)"
        : "var(--text)";
  return (
    <div className="text-center">
      <p className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-0.5 text-[14px] font-extrabold tnum leading-none"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

function formatLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    })
    .replace(".", "");
}
