/**
 * Deterministic insights engine — the "coach without AI" layer.
 *
 * Takes pre-aggregated context (volume by muscle, recent sessions, stalled
 * exercises, etc) and returns a list of observations. No LLM calls. The
 * caller is responsible for fetching and shaping the input data.
 *
 * Each insight has a severity level for visual prioritization, a stable id
 * (so the UI can dedupe / animate), a short title and a detail line. The
 * "source" tag groups insights by what data drove them.
 */

import { muscleLabel } from "@/lib/muscles";
import {
  classifyVolumeZone,
  landmarkFor,
  type VolumeZone,
} from "./volume-landmarks";

export type InsightSeverity = "good" | "info" | "warning" | "alert";
export type InsightSource =
  | "volume"
  | "fatigue"
  | "plateau"
  | "progression"
  | "consistency";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  source: InsightSource;
};

export type FeelingPoint = { feeling: number; at: string };
export type RirPoint = { rir: number; at: string };
export type StalledExercise = {
  exerciseId: string;
  exerciseName: string;
  sessionsAtCurrentWeight: number;
  currentWeightKg: number | null;
};

export type CoachContext = {
  /** Sets per muscle in the last 7 days. */
  volume7d: Record<string, number>;
  /** Sets per muscle in days 8-14 (the prior 7d, for trend). */
  volumePrev7d: Record<string, number>;
  /** Per-user overrides on volume targets (Sprint F). */
  userTargets: Record<string, number> | null;
  /** Recent finished session feelings, newest first. */
  recentFeelings: FeelingPoint[];
  /** Recent working set RIRs, newest first. */
  recentRirs: RirPoint[];
  /** Exercises that progression engine has marked as stalled. */
  stalledExercises: StalledExercise[];
  /** Strength sessions in the last 7d (for consistency). */
  sessionsLast7d: number;
  /** Strength sessions in days 8-14. */
  sessionsPrev7d: number;
};

const ZONE_LABEL: Record<VolumeZone, string> = {
  below_mv: "abaixo do mínimo",
  maintenance: "manutenção",
  productive_low: "zona produtiva",
  productive_high: "limite alto",
  above_mrv: "acima do recuperável",
};

/**
 * Build the full insight list from a context. Returns insights sorted by
 * severity (alert > warning > info > good) so the UI can show the most
 * important ones first.
 */
export function buildInsights(ctx: CoachContext): Insight[] {
  const insights: Insight[] = [];

  insights.push(...volumeInsights(ctx));
  insights.push(...stallInsights(ctx));
  insights.push(...feelingTrendInsight(ctx));
  insights.push(...rirTrendInsight(ctx));
  insights.push(...consistencyInsight(ctx));
  insights.push(...fatigueAggregateInsight(ctx, insights));

  return insights.sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity)
  );
}

function severityRank(s: InsightSeverity): number {
  switch (s) {
    case "alert":
      return 4;
    case "warning":
      return 3;
    case "info":
      return 2;
    case "good":
      return 1;
  }
}

/**
 * Volume insights — for each muscle with non-zero recent volume, compare
 * against landmarks. Surface notable cases: above MRV (regression risk),
 * below MV (losing ground), or jumped a lot week-over-week.
 */
function volumeInsights(ctx: CoachContext): Insight[] {
  const out: Insight[] = [];
  for (const [muscle, sets] of Object.entries(ctx.volume7d)) {
    const landmark = landmarkFor(muscle);
    if (!landmark) continue;
    if (sets === 0) continue;

    const zone = classifyVolumeZone(sets, landmark);
    const label = muscleLabel(muscle);

    if (zone === "above_mrv") {
      out.push({
        id: `vol-mrv-${muscle}`,
        severity: "warning",
        source: "volume",
        title: `${label} acima do MRV`,
        detail: `${sets} sets · MRV ${landmark.mrv}. Considere reduzir antes que vire regressão.`,
      });
    } else if (zone === "below_mv" && sets > 0) {
      out.push({
        id: `vol-mv-${muscle}`,
        severity: "info",
        source: "volume",
        title: `${label} abaixo do MV`,
        detail: `${sets} sets · MV ${landmark.mv}. Volume baixo demais pra crescer.`,
      });
    } else if (zone === "productive_high") {
      out.push({
        id: `vol-high-${muscle}`,
        severity: "good",
        source: "volume",
        title: `${label} no pico produtivo`,
        detail: `${sets} sets · MAV-MRV ${landmark.mav[1]}-${landmark.mrv}. Zona de adaptação máxima.`,
      });
    }

    // Volume jump check (>40% week-over-week, only if both weeks have data)
    const prev = ctx.volumePrev7d[muscle] ?? 0;
    if (prev >= 4 && sets > prev * 1.4) {
      out.push({
        id: `vol-jump-${muscle}`,
        severity: "info",
        source: "volume",
        title: `${label} subiu ${Math.round(((sets - prev) / prev) * 100)}%`,
        detail: `${prev} → ${sets} sets em uma semana. Salto rápido — fica de olho na recuperação.`,
      });
    }
  }
  return out;
}

/**
 * Stalled exercises — pull from progression_state. Surfaces when ≥ 2
 * exercises are stuck, since 1 stall is normal noise.
 */
function stallInsights(ctx: CoachContext): Insight[] {
  if (ctx.stalledExercises.length === 0) return [];
  if (ctx.stalledExercises.length === 1) {
    const e = ctx.stalledExercises[0];
    return [
      {
        id: `stall-${e.exerciseId}`,
        severity: "info",
        source: "plateau",
        title: `${e.exerciseName} travado`,
        detail: `${e.sessionsAtCurrentWeight} sessões em ${formatKg(e.currentWeightKg)}. Considere deload no exercício ou troca de variação.`,
      },
    ];
  }
  const names = ctx.stalledExercises.map((e) => e.exerciseName).join(", ");
  return [
    {
      id: "stalls-multi",
      severity: "warning",
      source: "plateau",
      title: `${ctx.stalledExercises.length} exercícios travados`,
      detail: `${names}. Quando vários travam ao mesmo tempo, geralmente é fadiga acumulada — considere deload.`,
    },
  ];
}

/**
 * Feeling trend — compare avg of last 5 sessions vs avg of the 5 before.
 * A drop of ≥ 0.8 points is meaningful. Going up is also worth surfacing.
 */
function feelingTrendInsight(ctx: CoachContext): Insight[] {
  const fs = ctx.recentFeelings.map((f) => f.feeling);
  if (fs.length < 5) return [];
  const recent = fs.slice(0, 5);
  const older = fs.slice(5, 10);
  if (older.length < 3) return [];
  const recentAvg = avg(recent);
  const olderAvg = avg(older);
  const delta = recentAvg - olderAvg;

  if (delta <= -0.8) {
    return [
      {
        id: "feeling-drop",
        severity: "warning",
        source: "fatigue",
        title: "Sensação caindo",
        detail: `Média ${olderAvg.toFixed(1)} → ${recentAvg.toFixed(1)} nas últimas sessões. Pode ser sinal de fadiga acumulada.`,
      },
    ];
  }
  if (delta >= 0.8) {
    return [
      {
        id: "feeling-rise",
        severity: "good",
        source: "fatigue",
        title: "Sensação subindo",
        detail: `Média ${olderAvg.toFixed(1)} → ${recentAvg.toFixed(1)}. Recuperando bem.`,
      },
    ];
  }
  return [];
}

/**
 * RIR trend — falling RIR (closer to failure) at constant load means
 * progressive fatigue. Look at the avg of last 10 RIRs vs the 10 before.
 */
function rirTrendInsight(ctx: CoachContext): Insight[] {
  const rs = ctx.recentRirs.map((r) => r.rir);
  if (rs.length < 10) return [];
  const recent = rs.slice(0, 10);
  const older = rs.slice(10, 20);
  if (older.length < 5) return [];
  const recentAvg = avg(recent);
  const olderAvg = avg(older);
  const delta = recentAvg - olderAvg;

  if (delta <= -0.8) {
    return [
      {
        id: "rir-drop",
        severity: "info",
        source: "fatigue",
        title: "RIR caindo",
        detail: `Você tá fechando mais perto da falha (${olderAvg.toFixed(1)} → ${recentAvg.toFixed(1)}). Intensificação natural — só fica de olho no feeling.`,
      },
    ];
  }
  return [];
}

/**
 * Consistency — sessions per week. Compares last 7d vs prior 7d.
 */
function consistencyInsight(ctx: CoachContext): Insight[] {
  if (ctx.sessionsPrev7d === 0 && ctx.sessionsLast7d === 0) return [];
  if (ctx.sessionsLast7d === 0 && ctx.sessionsPrev7d >= 2) {
    return [
      {
        id: "no-sessions",
        severity: "info",
        source: "consistency",
        title: "Semana sem treinos",
        detail: `${ctx.sessionsPrev7d} sessões na semana passada, 0 nessa. Pode ser deload, viagem, ou só pausa.`,
      },
    ];
  }
  return [];
}

/**
 * Fatigue aggregate — when 3+ negative signals coincide, raise an alert
 * suggesting a deload. This is the "deload signal" the user wanted, made
 * conservative so it doesn't fire on normal weeks.
 */
function fatigueAggregateInsight(
  ctx: CoachContext,
  existing: Insight[]
): Insight[] {
  const negatives = [
    ctx.stalledExercises.length >= 2,
    existing.some((i) => i.id === "feeling-drop"),
    existing.some((i) => i.id === "rir-drop"),
    existing.some((i) => i.id.startsWith("vol-mrv-")),
  ].filter(Boolean).length;

  if (negatives >= 3) {
    return [
      {
        id: "deload-signal",
        severity: "alert",
        source: "fatigue",
        title: "Sinais de fadiga acumulada",
        detail: `${negatives} indicadores alinhados (stalls + sensação + RIR + volume). Hora forte de considerar um deload de 5-7 dias.`,
      },
    ];
  }
  return [];
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function formatKg(v: number | null): string {
  if (v === null) return "—";
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? `${r}kg` : `${r.toFixed(1)}kg`;
}
