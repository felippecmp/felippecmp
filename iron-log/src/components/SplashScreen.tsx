"use client";

import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "flog:splash-shown";
const TOTAL_MS = 8000;
const TYPE_START_MS = 600;
const EXPAND_AT_MS = 5700;
const DARK_AT_MS = 6900;
const LIGHT_AT_MS = 7450;
const HIDE_AT_MS = TOTAL_MS;

const TYPED_MESSAGE = "Sistema iniciado. Bom treino.";
const TYPE_CHAR_MS = 90;

type Phase =
  | "hidden"
  | "intro"
  | "expanding"
  | "darkening"
  | "flashing"
  | "fading-out";

/**
 * 8-second cinematic splash. Robot pulses under the wordmark while a
 * typewriter message prints below; then the robot zooms to cover the
 * screen, a dark overlay swallows it, a light flash opens, and the
 * app is revealed as the flash fades out.
 *
 * Gated by sessionStorage so client-side nav inside the same session
 * doesn't re-trigger. A cold PWA launch or full reload resets the
 * session and plays it again.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [typed, setTyped] = useState("");
  const typeIdxRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const shown = sessionStorage.getItem(SESSION_KEY);
      if (shown) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private mode / disabled storage — fall through and show anyway;
      // the session still effectively ends when the tab closes.
    }
    setPhase("intro");

    let typeTimerId: ReturnType<typeof setInterval> | null = null;

    // Sequence of phase flips. Each timeout is owned so we can clean up
    // on unmount to avoid state churn after the fact.
    const typeStart = setTimeout(() => {
      typeTimerId = setInterval(() => {
        const next = typeIdxRef.current + 1;
        if (next > TYPED_MESSAGE.length) {
          if (typeTimerId !== null) clearInterval(typeTimerId);
          return;
        }
        typeIdxRef.current = next;
        setTyped(TYPED_MESSAGE.slice(0, next));
      }, TYPE_CHAR_MS);
    }, TYPE_START_MS);

    const expand = setTimeout(() => setPhase("expanding"), EXPAND_AT_MS);
    const dark = setTimeout(() => setPhase("darkening"), DARK_AT_MS);
    const light = setTimeout(() => setPhase("flashing"), LIGHT_AT_MS);
    const fadeOut = setTimeout(() => setPhase("fading-out"), LIGHT_AT_MS + 250);
    const hide = setTimeout(() => setPhase("hidden"), HIDE_AT_MS);

    return () => {
      clearTimeout(typeStart);
      clearTimeout(expand);
      clearTimeout(dark);
      clearTimeout(light);
      clearTimeout(fadeOut);
      clearTimeout(hide);
      if (typeTimerId !== null) clearInterval(typeTimerId);
    };
  }, []);

  if (phase === "hidden") return null;

  // Robot transform: pulse during intro, then expand once the finale
  // kicks in. Transition durations differ per phase so the pulse feels
  // organic and the expansion feels mechanical.
  const robotExpanding =
    phase === "expanding" ||
    phase === "darkening" ||
    phase === "flashing" ||
    phase === "fading-out";

  return (
    <div
      role="status"
      aria-label="Carregando Felippe Training Log"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, color-mix(in oklab, var(--accent) 35%, #0a0a0a) 0%, #000000 70%)",
      }}
    >
      {/* Dark overlay — fades IN at the darkening phase, blanketing the
          expanding robot so only black remains before the flash. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black"
        style={{
          opacity:
            phase === "darkening" ||
            phase === "flashing" ||
            phase === "fading-out"
              ? 1
              : 0,
          transition: "opacity 400ms ease-in",
        }}
      />

      {/* Light flash — rosa-tinted white that fades in at the flashing
          phase and out during fading-out, revealing the app underneath. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, #ffffff 0%, color-mix(in oklab, var(--accent) 40%, #ffffff) 100%)",
          opacity:
            phase === "flashing" ? 1 : phase === "fading-out" ? 0 : 0,
          transition:
            phase === "flashing"
              ? "opacity 200ms ease-out"
              : "opacity 520ms ease-in",
        }}
      />

      {/* Robot logo — pulses during intro, expands at the finale. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/splash-robot.png"
        alt=""
        aria-hidden="true"
        onError={() => setPhase("hidden")}
        className="w-40 h-40 object-contain relative z-10"
        style={{
          animation: robotExpanding
            ? undefined
            : "tlog-splash-pulse 1.6s ease-in-out infinite",
          transform: robotExpanding ? "scale(9)" : "scale(1)",
          transition: robotExpanding
            ? "transform 1200ms cubic-bezier(0.55, 0, 0.3, 1)"
            : "transform 400ms ease-out",
          filter:
            "drop-shadow(0 0 30px color-mix(in oklab, var(--accent) 55%, transparent))",
          opacity:
            phase === "darkening" ||
            phase === "flashing" ||
            phase === "fading-out"
              ? 0
              : 1,
          // Fade the robot out during the dark phase so the screen lands
          // on pure black before the flash pops.
          transitionProperty:
            phase === "darkening"
              ? "opacity, transform"
              : phase === "expanding"
                ? "transform"
                : "opacity, transform",
        }}
      />

      <p
        className="mt-6 text-[14px] uppercase relative z-10"
        style={{
          fontFamily:
            "'Orbitron', 'Share Tech Mono', 'Courier New', monospace",
          fontWeight: 700,
          letterSpacing: "0.28em",
          color: "#F4F5F7",
          textShadow:
            "0 0 12px color-mix(in oklab, var(--accent) 45%, transparent)",
          opacity: robotExpanding ? 0 : 1,
          transition: "opacity 400ms ease-out",
        }}
      >
        Felippe Training Log
      </p>

      {/* Typewriter line. Reserves min-height so the layout doesn't
          jump as characters come in. Cursor blinks after the final
          character while we wait for the finale. */}
      <p
        className="mt-4 text-[12px] relative z-10 min-h-[1.2em]"
        style={{
          fontFamily:
            "'Share Tech Mono', 'Orbitron', 'Courier New', monospace",
          letterSpacing: "0.06em",
          color: "color-mix(in oklab, #F4F5F7 85%, transparent)",
          opacity: robotExpanding ? 0 : 1,
          transition: "opacity 400ms ease-out",
        }}
      >
        {typed}
        <span
          aria-hidden="true"
          className="inline-block ml-0.5"
          style={{
            animation: "tlog-cursor-blink 0.9s step-end infinite",
          }}
        >
          _
        </span>
      </p>
    </div>
  );
}
