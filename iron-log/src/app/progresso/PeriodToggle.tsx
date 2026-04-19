"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PERIODS = ["7d", "30d", "90d"] as const;
type Period = (typeof PERIODS)[number];

/**
 * Segmented control — switches the analysis window for the Progresso
 * headline stats. Writes ?p=7d|30d|90d to the URL and triggers a server
 * refetch so the volume hero + KPI row recompute.
 *
 * Ported from the v2 handoff (progress-screen.jsx → top-bar segmented
 * toggle). Default is 30d when the param is absent.
 */
export function PeriodToggle({ active }: { active: Period }) {
  const router = useRouter();
  const params = useSearchParams();

  function pick(p: Period) {
    const next = new URLSearchParams(params.toString());
    if (p === "30d") next.delete("p");
    else next.set("p", p);
    const qs = next.toString();
    router.push(`/progresso${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-[var(--bg-hover)] p-1">
      {PERIODS.map((p) => {
        const isActive = p === active;
        return (
          <button
            key={p}
            type="button"
            onClick={() => pick(p)}
            aria-pressed={isActive}
            className={`px-3 h-7 rounded-full text-[11px] font-extrabold tnum transition-colors ${
              isActive
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-soft)]"
            }`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

export type { Period };
export { PERIODS };
