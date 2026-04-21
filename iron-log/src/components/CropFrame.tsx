"use client";

import { useCallback, useRef, useState } from "react";

export type CropRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/**
 * Four-sided crop frame with draggable edges and a rule-of-thirds
 * reference grid overlaid on the visible window. Grid helps the user
 * line up landmarks (shoulders on the top third, hips on the middle)
 * so consecutive photos are comparable without re-framing.
 *
 * Accepts controlled `value` and emits `onChange(next)` on drag. Every
 * edge is a float 0..1 matching the DB columns directly — no
 * translation needed on save.
 */
export function CropFrame({
  value,
  onChange,
  children,
  minWindow = 0.2,
  showGrid = true,
}: {
  value: CropRect;
  onChange: (next: CropRect) => void;
  children: React.ReactNode;
  /** Smallest allowed window on either axis (0..1). */
  minWindow?: number;
  /** Toggle the rule-of-thirds reference grid. Defaults on. */
  showGrid?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<
    "top" | "bottom" | "left" | "right" | null
  >(null);

  const onPointerDown = useCallback(
    (which: "top" | "bottom" | "left" | "right") =>
      (e: React.PointerEvent) => {
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
      if (dragging === "top" || dragging === "bottom") {
        const raw = (e.clientY - rect.top) / rect.height;
        const y = Math.max(0, Math.min(1, raw));
        if (dragging === "top") {
          const next = Math.min(y, value.bottom - minWindow);
          if (next !== value.top) {
            onChange({ ...value, top: Math.max(0, next) });
          }
        } else {
          const next = Math.max(y, value.top + minWindow);
          if (next !== value.bottom) {
            onChange({ ...value, bottom: Math.min(1, next) });
          }
        }
      } else {
        const raw = (e.clientX - rect.left) / rect.width;
        const x = Math.max(0, Math.min(1, raw));
        if (dragging === "left") {
          const next = Math.min(x, value.right - minWindow);
          if (next !== value.left) {
            onChange({ ...value, left: Math.max(0, next) });
          }
        } else {
          const next = Math.max(x, value.left + minWindow);
          if (next !== value.right) {
            onChange({ ...value, right: Math.min(1, next) });
          }
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
  const leftPct = value.left * 100;
  const rightPct = (1 - value.right) * 100;

  const windowH = value.bottom - value.top;
  const windowW = value.right - value.left;

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden rounded-[14px] select-none touch-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}

      {/* Four darken overlays — top / bottom / left / right. Left/right
          only darken the BAND between top and bottom so the corners
          don't get double-tinted. */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 bg-[var(--bg)]/72 pointer-events-none"
        style={{ height: `${topPct}%` }}
      />
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 bottom-0 bg-[var(--bg)]/72 pointer-events-none"
        style={{ height: `${bottomPct}%` }}
      />
      <div
        aria-hidden="true"
        className="absolute left-0 bg-[var(--bg)]/72 pointer-events-none"
        style={{
          top: `${topPct}%`,
          bottom: `${bottomPct}%`,
          width: `${leftPct}%`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute right-0 bg-[var(--bg)]/72 pointer-events-none"
        style={{
          top: `${topPct}%`,
          bottom: `${bottomPct}%`,
          width: `${rightPct}%`,
        }}
      />

      {/* Rule-of-thirds reference grid — drawn inside the visible window
          so the user can align consistent landmarks across photos. */}
      {showGrid && (
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            top: `${topPct}%`,
            left: `${leftPct}%`,
            width: `${windowW * 100}%`,
            height: `${windowH * 100}%`,
            border: "1px solid color-mix(in oklab, var(--accent) 55%, transparent)",
          }}
        >
          {/* Vertical thirds. */}
          <span
            className="absolute top-0 bottom-0"
            style={{
              left: "33.333%",
              width: 1,
              background: "color-mix(in oklab, var(--accent) 40%, transparent)",
            }}
          />
          <span
            className="absolute top-0 bottom-0"
            style={{
              left: "66.666%",
              width: 1,
              background: "color-mix(in oklab, var(--accent) 40%, transparent)",
            }}
          />
          {/* Horizontal thirds. */}
          <span
            className="absolute left-0 right-0"
            style={{
              top: "33.333%",
              height: 1,
              background: "color-mix(in oklab, var(--accent) 40%, transparent)",
            }}
          />
          <span
            className="absolute left-0 right-0"
            style={{
              top: "66.666%",
              height: 1,
              background: "color-mix(in oklab, var(--accent) 40%, transparent)",
            }}
          />
        </div>
      )}

      {/* Top handle. */}
      <EdgeHandle
        axis="h"
        position={topPct}
        onPointerDown={onPointerDown("top")}
        label="Recortar topo"
        ariaValue={Math.round(value.top * 100)}
        ariaMin={0}
        ariaMax={Math.round((value.bottom - minWindow) * 100)}
      />
      {/* Bottom handle. */}
      <EdgeHandle
        axis="h"
        position={value.bottom * 100}
        onPointerDown={onPointerDown("bottom")}
        label="Recortar fundo"
        ariaValue={Math.round(value.bottom * 100)}
        ariaMin={Math.round((value.top + minWindow) * 100)}
        ariaMax={100}
      />
      {/* Left handle. */}
      <EdgeHandle
        axis="v"
        position={leftPct}
        onPointerDown={onPointerDown("left")}
        label="Recortar esquerda"
        ariaValue={Math.round(value.left * 100)}
        ariaMin={0}
        ariaMax={Math.round((value.right - minWindow) * 100)}
      />
      {/* Right handle. */}
      <EdgeHandle
        axis="v"
        position={value.right * 100}
        onPointerDown={onPointerDown("right")}
        label="Recortar direita"
        ariaValue={Math.round(value.right * 100)}
        ariaMin={Math.round((value.left + minWindow) * 100)}
        ariaMax={100}
      />
    </div>
  );
}

function EdgeHandle({
  axis,
  position,
  onPointerDown,
  label,
  ariaValue,
  ariaMin,
  ariaMax,
}: {
  axis: "h" | "v";
  /** % along the cross-axis. Horizontal edges use top, vertical use left. */
  position: number;
  onPointerDown: (e: React.PointerEvent) => void;
  label: string;
  ariaValue: number;
  ariaMin: number;
  ariaMax: number;
}) {
  // Horizontal edges span the full width and drag vertically; vertical
  // edges span the full height and drag horizontally. The pill in the
  // center gives the user a big touch target while the line on the edge
  // gives visual precision.
  const isHorizontal = axis === "h";
  const positionStyle = isHorizontal
    ? { top: `${position}%` }
    : { left: `${position}%` };
  const wrapperClass = isHorizontal
    ? "absolute left-0 right-0 h-8 -mt-4 flex items-center justify-center cursor-ns-resize"
    : "absolute top-0 bottom-0 w-8 -ml-4 flex items-center justify-center cursor-ew-resize";
  const lineClass = isHorizontal
    ? "absolute left-0 right-0 h-0.5"
    : "absolute top-0 bottom-0 w-0.5";
  const pillClass = isHorizontal
    ? "relative z-10 h-6 w-12 rounded-full"
    : "relative z-10 h-12 w-6 rounded-full";
  const pillInnerClass = isHorizontal ? "block h-1 w-5" : "block h-5 w-1";

  return (
    <div
      role="slider"
      aria-label={label}
      aria-valuenow={ariaValue}
      aria-valuemin={ariaMin}
      aria-valuemax={ariaMax}
      tabIndex={0}
      onPointerDown={onPointerDown}
      className={wrapperClass}
      style={positionStyle}
    >
      <div className={lineClass} style={{ background: "var(--accent)" }} />
      <div
        className={`${pillClass} border border-[var(--border-strong)] bg-[var(--bg-raised)] flex items-center justify-center`}
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
      >
        <span
          className={`${pillInnerClass} rounded-full`}
          style={{ background: "var(--accent)" }}
        />
      </div>
    </div>
  );
}
