import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Info,
  TrendingDown,
} from "lucide-react";
import type {
  Insight,
  InsightSeverity,
} from "@/lib/coach/insights";

type Props = {
  insights: Insight[];
};

const SEVERITY_ICON: Record<InsightSeverity, typeof Info> = {
  good: CheckCircle2,
  info: Info,
  warning: TrendingDown,
  alert: AlertTriangle,
};

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  good: "text-[var(--status-ready)]",
  info: "text-[var(--text-muted)]",
  warning: "text-[var(--status-progressed)]",
  alert: "text-[var(--accent)]",
};

const SEVERITY_BORDER: Record<InsightSeverity, string> = {
  good: "border-[var(--border)]",
  info: "border-[var(--border)]",
  warning: "border-[var(--border-strong)]",
  alert: "border-[var(--accent)]",
};

/**
 * "Coach insights" panel — server-rendered list of observations from the
 * deterministic engine. Renders nothing when there's nothing to say.
 */
export function CoachInsights({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Brain
            size={14}
            strokeWidth={1.75}
            className="text-[var(--text-muted)]"
          />
          <p className="label">Insights</p>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Tudo dentro do esperado. Continue como tá indo.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain
            size={14}
            strokeWidth={1.75}
            className="text-[var(--text-muted)]"
          />
          <p className="label">Insights</p>
        </div>
        <span className="text-[10px] text-[var(--text-dim)] tracking-wider uppercase">
          determinístico
        </span>
      </div>
      <ul className="space-y-2">
        {insights.map((insight) => {
          const Icon = SEVERITY_ICON[insight.severity];
          return (
            <li
              key={insight.id}
              className={`rounded-xl border bg-[var(--bg-card)] px-4 py-3 ${SEVERITY_BORDER[insight.severity]}`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  size={14}
                  strokeWidth={2}
                  className={`shrink-0 mt-0.5 ${SEVERITY_COLOR[insight.severity]}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">
                    {insight.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
                    {insight.detail}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
