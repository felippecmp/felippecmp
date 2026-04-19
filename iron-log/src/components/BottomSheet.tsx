"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Bottom sheet primitive — full-width modal anchored to the bottom of the
 * viewport with a drag handle. On mobile/touch the sheet can be dragged
 * downward to dismiss; passing 100px of pull triggers onClose.
 *
 * Ported from the Training Log v2 handoff
 * (docs/design-handoff/components/interactions.jsx → BottomSheet).
 *
 * Why a primitive: the v2 handoff introduces several sheet-shaped flows
 * (StreakCalendar, DayPeek, ExerciseSheet, PlateCalculator, WorkoutRecap).
 * Centralizing the chrome — backdrop, drag handle, slide-in animation,
 * keyboard dismiss — keeps each consumer focused on its content.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  /** Optional accessibility label for the sheet (used as aria-label). */
  ariaLabel,
  /** Max sheet height as CSS value. Defaults to 85% of the viewport. */
  maxHeight = "85dvh",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  maxHeight?: string;
}) {
  if (!open) {
    // Early-return wrapper component renders the actual sheet only when
    // open. Keeping the open-only state inside <BottomSheetInner> avoids
    // the "reset state on prop change" useEffect anti-pattern.
    return null;
  }
  return <BottomSheetInner onClose={onClose} ariaLabel={ariaLabel} maxHeight={maxHeight}>{children}</BottomSheetInner>;
}

function BottomSheetInner({
  onClose,
  children,
  ariaLabel,
  maxHeight,
}: {
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  maxHeight: string;
}) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  // Lock body scroll while the sheet is mounted so the page underneath
  // doesn't bounce. Cleanup on unmount restores whatever was there.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC closes — keyboard parity with the click-outside backdrop.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only react to primary touch/mouse — ignore pen/middle-click etc.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    setDragging(true);
    startYRef.current = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dy = Math.max(0, e.clientY - startYRef.current);
      setDragY(dy);
    },
    [dragging]
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (dragY > 100) onClose();
    else setDragY(0);
  }, [dragging, dragY, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-end bg-black/55 backdrop-blur-sm"
      style={{ animation: "tlog-fade-in 0.22s ease-out" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-[var(--bg-raised)] border border-[var(--border)] border-b-0 rounded-t-3xl overflow-hidden"
        style={{
          maxHeight,
          transform: `translateY(${dragY}px)`,
          transition: dragging
            ? "none"
            : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
          animation: dragging
            ? undefined
            : "tlog-sheet-up 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle — also doubles as the touch surface for the gesture. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          aria-hidden="true"
        >
          <span className="block h-1 w-9 rounded-full bg-[var(--border-strong)]" />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 32px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
