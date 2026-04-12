/**
 * Aggregates the user's recent training data into a compact text summary
 * that fits in a Claude prompt. Covers:
 *  - Volume per muscle (last 7d + prior 7d)
 *  - Recent session history (last 10 sessions with feeling + duration)
 *  - Stalled exercises
 *  - RIR averages
 *  - User's baseline volume targets
 *  - Current body weight trend
 *
 * The summary is designed to be ~1500 tokens, keeping API costs minimal
 * while giving Claude enough context to make informed decisions.
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/settings";
import { muscleLabel } from "@/lib/muscles";
import { WEEKLY_VOLUME_TARGET } from "@/lib/stats";

export type TrainingContextSummary = {
  text: string;
  hasEnoughData: boolean;
};

type SetRow = {
  exercise_id: string | null;
  weight_kg: number | string;
  reps: number;
  rir: number | null;
  performed_at: string;
  exercises:
    | { name: string; primary_muscle: string }
    | { name: string; primary_muscle: string }[]
    | null;
};

type SessionRow = {
  id: string;
  started_at: string;
  duration_minutes: number | null;
  overall_feeling: number | null;
  workout_templates:
    | { name: string }
    | { name: string }[]
    | null;
};

type ProgressionRow = {
  exercise_id: string | null;
  current_weight_kg: number | string | null;
  current_status: string | null;
  sessions_at_current_weight: number | null;
  exercises:
    | { name: string }
    | { name: string }[]
    | null;
};

type WeightRow = {
  weight_kg: number | string;
  recorded_at: string;
};

function pick<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function buildTrainingContext(): Promise<TrainingContextSummary> {
  const supabase = await createClient();
  const settings = await getUserSettings();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [setsRes, sessionsRes, progressionRes, weightRes] = await Promise.all([
    supabase
      .from("workout_sets")
      .select(
        "exercise_id, weight_kg, reps, rir, performed_at, exercises(name, primary_muscle)"
      )
      .eq("is_warmup", false)
      .gte("performed_at", fourteenDaysAgo.toISOString())
      .order("performed_at", { ascending: false }),
    supabase
      .from("workout_sessions")
      .select(
        "id, started_at, duration_minutes, overall_feeling, workout_templates(name)"
      )
      .not("finished_at", "is", null)
      .gte("started_at", sixtyDaysAgo.toISOString())
      .order("started_at", { ascending: false })
      .limit(15),
    supabase
      .from("progression_state")
      .select(
        "exercise_id, current_weight_kg, current_status, sessions_at_current_weight, exercises(name)"
      ),
    supabase
      .from("body_weight_entries")
      .select("weight_kg, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(10),
  ]);

  const sets = (setsRes.data ?? []) as SetRow[];
  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const progression = (progressionRes.data ?? []) as ProgressionRow[];
  const weights = (weightRes.data ?? []) as WeightRow[];

  const lines: string[] = [];

  if (sessions.length === 0) {
    lines.push(
      "## Nota: usuário começou recentemente, sem sessões finalizadas ainda. Planeje baseado nos targets globais abaixo."
    );
  } else if (sessions.length < 3) {
    lines.push(
      `## Nota: apenas ${sessions.length} sessão(ões) registrada(s). Dados limitados — planeje conservadoramente, começando perto do MEV.`
    );
  }

  // Volume per muscle: 7d and prior 7d
  const vol7d: Record<string, number> = {};
  const volPrev7d: Record<string, number> = {};
  for (const s of sets) {
    const ex = pick(s.exercises);
    if (!ex) continue;
    const t = new Date(s.performed_at);
    if (t >= sevenDaysAgo) {
      vol7d[ex.primary_muscle] = (vol7d[ex.primary_muscle] ?? 0) + 1;
    } else {
      volPrev7d[ex.primary_muscle] = (volPrev7d[ex.primary_muscle] ?? 0) + 1;
    }
  }

  lines.push("## Volume por músculo (sets diretos, janela 7d)");
  const allMuscles = new Set([
    ...Object.keys(vol7d),
    ...Object.keys(volPrev7d),
  ]);
  for (const m of allMuscles) {
    const curr = vol7d[m] ?? 0;
    const prev = volPrev7d[m] ?? 0;
    const target =
      settings.volume_targets?.[m] ?? WEEKLY_VOLUME_TARGET[m] ?? 0;
    lines.push(
      `- ${muscleLabel(m)}: ${curr} sets (7d anterior: ${prev}, target: ${target})`
    );
  }

  // Recent sessions
  lines.push("\n## Últimas sessões");
  for (const s of sessions.slice(0, 10)) {
    const tpl = pick(s.workout_templates)?.name ?? "—";
    const date = new Date(s.started_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
    const feeling =
      s.overall_feeling !== null ? `feeling ${s.overall_feeling}/5` : "";
    const dur = s.duration_minutes ? `${s.duration_minutes}min` : "";
    lines.push(`- ${date}: ${tpl} · ${dur} ${feeling}`.trim());
  }

  // RIR average
  const rirs = sets
    .filter((s) => s.rir !== null && new Date(s.performed_at) >= sevenDaysAgo)
    .map((s) => s.rir as number);
  if (rirs.length > 0) {
    const avgRir = (rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1);
    lines.push(`\nRIR médio últimos 7d: ${avgRir} (${rirs.length} sets)`);
  }

  // Stalled exercises
  const stalled = progression.filter(
    (p) => p.current_status === "stalled"
  );
  if (stalled.length > 0) {
    lines.push("\n## Exercícios travados");
    for (const p of stalled) {
      const name = pick(p.exercises)?.name ?? "?";
      const w =
        p.current_weight_kg !== null
          ? `${Number(p.current_weight_kg)}kg`
          : "—";
      lines.push(
        `- ${name}: ${p.sessions_at_current_weight ?? 0} sessões em ${w}`
      );
    }
  }

  // Weight trend
  if (weights.length >= 2) {
    const latest = Number(weights[0].weight_kg);
    const oldest = Number(weights[weights.length - 1].weight_kg);
    const delta = (latest - oldest).toFixed(1);
    lines.push(
      `\nPeso corporal: ${latest.toFixed(1)}kg (${delta}kg nos últimos registros)`
    );
  }

  // Baseline targets
  lines.push("\n## Targets globais do user (baseline)");
  const targets = settings.volume_targets ?? WEEKLY_VOLUME_TARGET;
  const targetLines = Object.entries(targets)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${muscleLabel(k)}: ${v}`)
    .join(", ");
  lines.push(targetLines);

  return { text: lines.join("\n"), hasEnoughData: true };
  // Note: we always return hasEnoughData = true. Even without sessions,
  // Claude can plan from the user's baseline targets. The context text
  // includes a note about limited data so the coach adjusts accordingly.
}
