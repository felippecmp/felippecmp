"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const TRIGGER_DISTANCE = 70;
const MAX_PULL = 110;

/**
 * Pull-to-refresh wrapper — works on touch (mobile/PWA). When the page is
 * scrolled to the top and the user drags down past 70px, a router.refresh()
 * fires, re-running server components without losing client state.
 *
 * Ported from the v2 handoff (interactions.jsx → PullToRefresh). Web has
 * no browser-native PTR; this reimplements the gesture with a tiny header
 * indicator (cyan loader) so the feel matches a native app.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    // Only engage when the page is at the top — otherwise the user is just
    // scrolling normally and we shouldn't fight that.
    if (window.scrollY > 0) {
      startYRef.current = null;
      return;
    }
    startYRef.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startYRef.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Resistance curve — gets stiffer past the trigger so the indicator
      // feels like rubber, not infinite scroll.
      const resisted = dy < TRIGGER_DISTANCE ? dy : TRIGGER_DISTANCE + (dy - TRIGGER_DISTANCE) * 0.4;
      setPull(Math.min(MAX_PULL, resisted));
    },
    [refreshing]
  );

  const onTouchEnd = useCallback(() => {
    if (startYRef.current === null) return;
    startYRef.current = null;
    if (pull >= TRIGGER_DISTANCE && !refreshing) {
      setRefreshing(true);
      setPull(48); // hold the indicator visible while we refresh
      router.refresh();
      // Give the server round-trip ~600ms; if your network is slower the
      // loader just keeps spinning until the new RSC payload mounts.
      setTimeout(() => {
        setRefreshing(false);
        setPull(0);
      }, 800);
    } else {
      setPull(0);
    }
  }, [pull, refreshing, router]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const visible = pull > 0 || refreshing;
  const indicatorOpacity = Math.min(1, pull / TRIGGER_DISTANCE);
  const ready = pull >= TRIGGER_DISTANCE && !refreshing;

  return (
    <div
      ref={containerRef}
      style={{
        transform: `translateY(${pull * 0.5}px)`,
        transition: refreshing || pull === 0 ? "transform 0.25s ease-out" : "none",
      }}
    >
      {visible && (
        <div
          className="pointer-events-none absolute left-0 right-0 -top-1 z-20 flex items-center justify-center"
          style={{
            transform: `translateY(${Math.min(pull, 48)}px)`,
            opacity: indicatorOpacity,
          }}
          aria-hidden={!refreshing}
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-raised)] px-3 py-1.5 text-[11px] font-bold tracking-wider"
            style={{
              color: ready
                ? "var(--accent)"
                : "var(--status-ready)",
            }}
          >
            <Loader2
              size={12}
              strokeWidth={2.5}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "ATUALIZANDO" : ready ? "SOLTAR" : "PUXAR"}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
