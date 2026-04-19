"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { generateDailyGreeting } from "./daily-greeting-action";

// Cache version bump invalidates previously-cached greetings when the
// prompt/tone changes. Increment on prompt rewrites so old cached lines
// from a different tone don't linger.
const CACHE_VERSION = "v5";
const CACHE_PREFIX = `flog:greeting:${CACHE_VERSION}:`;
const LEGACY_PREFIX = "flog:greeting:";
const USER_NAME = "Felippe";

type CachedGreeting = {
  dayKey: string;
  timeOfDay: string;
  message: string;
};

function readCache(dayKey: string, timeOfDay: string): string | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${dayKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedGreeting;
    // Regenerate when the greeting period flips (e.g. morning → afternoon)
    // so "bom dia, ..." doesn't linger into the evening.
    if (parsed.timeOfDay !== timeOfDay) return null;
    return parsed.message;
  } catch {
    return null;
  }
}

function writeCache(dayKey: string, timeOfDay: string, message: string) {
  try {
    const payload: CachedGreeting = { dayKey, timeOfDay, message };
    localStorage.setItem(`${CACHE_PREFIX}${dayKey}`, JSON.stringify(payload));
    // Best-effort cleanup: prune any cached greetings from previous days OR
    // older cache versions so localStorage doesn't accumulate forever.
    const keep = `${CACHE_PREFIX}${dayKey}`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const isOurs =
        k.startsWith(CACHE_PREFIX) || k.startsWith(LEGACY_PREFIX);
      if (isOurs && k !== keep) {
        localStorage.removeItem(k);
        // Rewind since we mutated the storage mid-iteration.
        i -= 1;
      }
    }
  } catch {
    // localStorage may be disabled (private mode) — acceptable, we'll just
    // re-fetch on the next render.
  }
}

/**
 * Home greeting headline. Renders "Bom dia/Boa tarde/Boa noite, Felippe"
 * plus a short AI-generated personalized line that references the user's
 * current training state.
 *
 * Cached in localStorage per day + period so the API only fires once.
 * Failures degrade silently to the static greeting.
 */
export function DailyGreeting({
  greet,
  timeOfDay,
  dayKey,
}: {
  greet: string;
  timeOfDay: "madrugada" | "manhã" | "tarde" | "noite";
  dayKey: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCache(dayKey, timeOfDay);
    if (cached) {
      setMessage(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    generateDailyGreeting(timeOfDay).then((r) => {
      if (cancelled) return;
      setLoading(false);
      if (r.ok) {
        setMessage(r.message);
        writeCache(dayKey, timeOfDay, r.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dayKey, timeOfDay]);

  return (
    <>
      <h1 className="tlog-title">
        {greet}, <span className="text-[var(--accent)]">{USER_NAME}</span>
      </h1>
      <div className="mt-1.5 min-h-[18px] text-[13px] leading-tight text-[var(--text-soft)]">
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
            <Loader2 size={11} strokeWidth={2} className="animate-spin" />
            <span className="opacity-70">pensando…</span>
          </span>
        ) : (
          message
        )}
      </div>
    </>
  );
}
