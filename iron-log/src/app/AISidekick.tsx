import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

/**
 * Floating glass AI sidekick card — violet gradient prompt that links into
 * /coach/chat. Sits at the bottom of Home as the always-on "ask the coach"
 * affordance.
 *
 * Ported from the v2 handoff (home-variants.jsx → AI sidekick card).
 */
export function AISidekick() {
  return (
    <Link
      href="/coach/chat"
      className="mb-6 flex items-center gap-3 rounded-2xl border p-3.5 active:scale-[0.99] transition-transform"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--tlog-violet) 18%, transparent), var(--bg-card))",
        borderColor: "color-mix(in oklab, var(--tlog-violet) 30%, transparent)",
      }}
    >
      <div
        className="shrink-0 flex h-10 w-10 items-center justify-center rounded-[10px]"
        style={{
          background:
            "color-mix(in oklab, var(--tlog-violet) 22%, transparent)",
          color: "var(--tlog-violet)",
        }}
      >
        <Sparkles size={16} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1 text-[13px] text-[var(--text-soft)]">
        <span className="font-bold text-[var(--text)]">Pergunte algo</span>{" "}
        sobre seus treinos…
      </div>
      <ChevronRight
        size={16}
        strokeWidth={1.75}
        className="shrink-0 text-[var(--text-muted)]"
      />
    </Link>
  );
}
