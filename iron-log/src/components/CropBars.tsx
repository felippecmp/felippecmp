"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Two horizontal draggable bars framing a vertical window on an image.
 * Used by the photo upload flow to hide head (top bar) and optionally
 * feet or anything below the waist (bottom bar) without destroying the
 * original pixels — top/bottom are stored as floats 0..1 so re-cropping
 * later is lossless.
 *
 * Accepts `value.top` / `value.bottom` as controlled values, emits
 * `onChange({top, bottom})` on drag. Touch + mouse via pointer events.
 */
export function CropBars({
  value,
  onChange,
  children,
  minWindow = 0.2,
}: {
  value: { top: number; bottom: number };
  onChange: (next: { top: number; bottom: number }) => void;
  /** The image element that the bars overlay. Controls the aspect ratio
      of the frame — CropBars just renders overlays on top. */
  children: React.ReactNode;
  /** Smallest allowed bottom - top. Prevents dragging handles past each
      other. 0.2 ≈ 20% of the image must stay visible. */
  minWindow?: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"top" | "bottom" | null>(null);

  const onPointerDown = useCallback(
    (which: "top" | "bottom") => (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDragging(which);
      e.preventDefault();
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      const rawY = (e.clientY - rect.top) / rect.height;
      const y = Math.max(0, Math.min(1, rawY));
      if (dragging === "top") {
        const nextTop = Math.min(y, value.bottom - minWindow);
        if (nextTop !== value.top) {
          onChange({ top: Math.max(0, nextTop), bottom: value.bottom });
        }
      } else {
        const nextBottom = Math.max(y, value.top + minWindow);
        if (nextBottom !== value.bottom) {
          onChange({ top: value.top, bottom: Math.min(1, nextBottom) });
        }
      }
    },
    [dragging, onChange, value, minWindow]
  );

  const onPointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const topPct = value.top * 100;
  const bottomPct = (1 - value.bottom) * 100;

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden rounded-[14px] select-none touch-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}

      {/* Top darken overlay — covers everything above the top crop line. */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 bg-[var(--bg)]/72 pointer-events-none"
        style={{ height: `${topPct}%` }}
      />
      {/* Bottom darken overlay. */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 bottom-0 bg-[var(--bg)]/72 pointer-events-none"
        style={{ height: `${bottomPct}%` }}
      />

      {/* Top handle — draggable line with a centered pill. */}
      <div
        role="slider"
        aria-label="Recortar topo"
        aria-valuenow={Math.round(value.top * 100)}
        aria-valuemin={0}
        aria-valuemax={Math.round((value.bottom - minWindow) * 100)}
        tabIndex={0}
        onPointerDown={onPointerDown("top")}
        className="absolute left-0 right-0 h-8 -mt-4 flex items-center justify-center cursor-ns-resize"
        style={{ top: `${topPct}%` }}
      >
        <div
          className="absolute left-0 right-0 h-0.5"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="relative z-10 h-6 w-12 rounded-full border border-[var(--border-strong)] bg-[var(--bg-raised)] shadow-md flex items-center justify-center"
          style={{
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <span className="block h-1 w-5 rounded-full bg-[var(--accent)]" />
        </div>
      </div>

      {/* Bottom handle. */}
      <div
        role="slider"
        aria-label="Recortar fundo"
        aria-valuenow={Math.round(value.bottom * 100)}
        aria-valuemin={Math.round((value.top + minWindow) * 100)}
        aria-valuemax={100}
        tabIndex={0}
        onPointerDown={onPointerDown("bottom")}
        className="absolute left-0 right-0 h-8 -mt-4 flex items-center justify-center cursor-ns-resize"
        style={{ top: `${value.bottom * 100}%` }}
      >
        <div
          className="absolute left-0 right-0 h-0.5"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="relative z-10 h-6 w-12 rounded-full border border-[var(--border-strong)] bg-[var(--bg-raised)] shadow-md flex items-center justify-center"
          style={{
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <span className="block h-1 w-5 rounded-full bg-[var(--accent)]" />
        </div>
      </div>
    </div>
  );
}
