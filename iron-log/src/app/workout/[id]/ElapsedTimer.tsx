"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Live elapsed-time counter that ticks every second. Rendered in the
 * workout header so the user always knows how long the session has been
 * running — even when the rest timer isn't active.
 */
export function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [display, setDisplay] = useState(() => formatElapsed(startedAt));

  useEffect(() => {
    const id = setInterval(() => setDisplay(formatElapsed(startedAt)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs tnum text-[var(--text-soft)] font-medium tabular-nums">
      <Clock size={12} strokeWidth={1.75} className="text-[var(--status-ready)]" />
      {display}
    </span>
  );
}
