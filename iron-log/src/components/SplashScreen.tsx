"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "flog:splash-shown";
const DURATION_MS = 5000;
const FADE_MS = 400;

/**
 * 5-second entry splash. Shows the robot logo pulsing softly over a
 * rosa-to-black radial gradient, with the product wordmark in
 * Orbitron (tech-style) below. Gated by sessionStorage so client-side
 * navigations inside the same session don't re-trigger it — a cold
 * PWA launch or a full reload gets a fresh session and shows it again.
 *
 * Rendered as a fixed-position overlay at the root of the layout
 * (z-index 9999) so it covers any content during the intro. Fades
 * out over 400ms at DURATION_MS so the user doesn't feel a hard cut.
 */
export function SplashScreen() {
  // Start false on the server so HTML doesn't ship with the overlay
  // (would flash on hydration). First client render reads session
  // storage and flips to true if splash hasn't been shown yet.
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">(
    "hidden"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const shown = sessionStorage.getItem(SESSION_KEY);
      if (shown) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private mode / disabled storage — show anyway; the session
      // ends when the tab closes so it's effectively once-per-launch.
    }
    setPhase("visible");

    const fade = setTimeout(() => setPhase("fading"), DURATION_MS - FADE_MS);
    const hide = setTimeout(() => setPhase("hidden"), DURATION_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(hide);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      role="status"
      aria-label="Carregando Felippe Training Log"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse at center, color-mix(in oklab, var(--accent) 35%, #0a0a0a) 0%, #000000 70%)",
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/splash-robot.png"
        alt=""
        aria-hidden="true"
        onError={() => setPhase("hidden")}
        className="w-40 h-40 object-contain"
        style={{
          animation: "tlog-splash-pulse 1.6s ease-in-out infinite",
          filter:
            "drop-shadow(0 0 30px color-mix(in oklab, var(--accent) 55%, transparent))",
        }}
      />
      <p
        className="mt-6 text-[14px] uppercase"
        style={{
          fontFamily:
            "'Orbitron', 'Share Tech Mono', 'Courier New', monospace",
          fontWeight: 700,
          letterSpacing: "0.28em",
          color: "#F4F5F7",
          textShadow:
            "0 0 12px color-mix(in oklab, var(--accent) 45%, transparent)",
        }}
      >
        Felippe Training Log
      </p>
    </div>
  );
}
