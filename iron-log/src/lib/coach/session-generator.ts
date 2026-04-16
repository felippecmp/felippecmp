/**
 * System prompt + context builder for AI-generated single-session workouts.
 *
 * Separate from the mesocycle planner (coach/ai-client.ts) because the
 * decision surface is different: here Claude must pick a handful of
 * EXERCISES THE USER HAS ALREADY DONE, not design a block from scratch.
 *
 * Design principles baked into the prompt:
 *  - Low rotation: prefer consistency; don't swap compounds unless stalled 3+
 *  - Science: frequency ≥2x/week/muscle, volume inside MAV, RIR 0-3
 *  - Use only the exercises present in the provided catalog (with IDs)
 *  - Order: compounds → accessories → isolations
 *  - Respect time budget: 30/45/60/90min maps to 3/4-5/5-6/7-8 exercises
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { muscleLabel, patternLabel } from "@/lib/muscles";
import { WEEKLY_VOLUME_TARGET } from "@/lib/stats";
import { getUserSettings } from "@/lib/settings";

export type Readiness = "tired" | "normal" | "ready";
export type SessionType = "upper" | "lower";

export type SessionGeneratorInput = {
  sessionType: SessionType;
  minutes: 30 | 45 | 60 | 90;
  readiness: Readiness;
};

export type AvailableExercise = {
  id: string;
  name: string;
  primary_muscle: string;
  movement_pattern: string;
  session_type: SessionType;
  load_increment: number;
  progression_weight_kg: number | null;
  progression_status: string | null;
  sessions_at_current_weight: number;
  last_top_set_reps: number | null;
  last_session_date: string | null;
  total_sessions_90d: number;
};

export type SessionContext = {
  availableExercises: AvailableExercise[];
  volume7d: Record<string, number>;
  volumeTargets: Record<string, number>;
  rirAvg7d: number | null;
  recentSessionsSummary: string;
  lastSessionType: SessionType | null;
};

/**
 * Compact context focused on what matters for a SINGLE session decision:
 * which of the user's own exercises to pick, at what loads, in what order.
 */
export async function buildSessionContext(
  sessionType: SessionType
): Promise<SessionContext> {
  const supabase = await createClient();
  const settings = await getUserSettings();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [exercisesRes, progressionRes, setsRes, sessionsRes] =
    await Promise.all([
      supabase
        .from("exercises")
        .select(
          "id, name, primary_muscle, movement_pattern, session_type, load_increment"
        )
        .eq("is_active", true)
        .eq("session_type", sessionType)
        .order("name", { ascending: true }),
      supabase
        .from("progression_state")
        .select(
          "exercise_id, current_weight_kg, current_status, sessions_at_current_weight, last_top_set_reps, last_session_date"
        ),
      supabase
        .from("workout_sets")
        .select(
          "exercise_id, rir, performed_at, exercises(primary_muscle)"
        )
        .eq("is_warmup", false)
        .gte("performed_at", ninetyDaysAgo.toISOString()),
      supabase
        .from("workout_sessions")
        .select(
          "started_at, workout_templates(session_type, name)"
        )
        .not("finished_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(8),
    ]);

  type ExerciseRow = {
    id: string;
    name: string;
    primary_muscle: string;
    movement_pattern: string;
    session_type: SessionType;
    load_increment: number | string | null;
  };
  type ProgressionRow = {
    exercise_id: string;
    current_weight_kg: number | string | null;
    current_status: string | null;
    sessions_at_current_weight: number | null;
    last_top_set_reps: number | null;
    last_session_date: string | null;
  };
  type SetRow = {
    exercise_id: string | null;
    rir: number | null;
    performed_at: string;
    exercises:
      | { primary_muscle: string }
      | { primary_muscle: string }[]
      | null;
  };
  type SessionRow = {
    started_at: string;
    workout_templates:
      | { session_type: SessionType; name: string }
      | { session_type: SessionType; name: string }[]
      | null;
  };

  const exercises = (exercisesRes.data ?? []) as ExerciseRow[];
  const progression = (progressionRes.data ?? []) as ProgressionRow[];
  const sets = (setsRes.data ?? []) as SetRow[];
  const sessions = (sessionsRes.data ?? []) as SessionRow[];

  const progMap = new Map<string, ProgressionRow>();
  for (const p of progression) progMap.set(p.exercise_id, p);

  // Count sessions per exercise in the last 90 days (for "consistency" signal)
  const sessionCounts = new Map<string, Set<string>>();
  for (const s of sets) {
    if (!s.exercise_id) continue;
    const dayKey = s.performed_at.slice(0, 10);
    if (!sessionCounts.has(s.exercise_id))
      sessionCounts.set(s.exercise_id, new Set());
    sessionCounts.get(s.exercise_id)!.add(dayKey);
  }

  const availableExercises: AvailableExercise[] = exercises.map((e) => {
    const p = progMap.get(e.id);
    return {
      id: e.id,
      name: e.name,
      primary_muscle: e.primary_muscle,
      movement_pattern: e.movement_pattern,
      session_type: e.session_type,
      load_increment: Number(e.load_increment ?? 2.5),
      progression_weight_kg:
        p?.current_weight_kg !== null && p?.current_weight_kg !== undefined
          ? Number(p.current_weight_kg)
          : null,
      progression_status: p?.current_status ?? null,
      sessions_at_current_weight: p?.sessions_at_current_weight ?? 0,
      last_top_set_reps: p?.last_top_set_reps ?? null,
      last_session_date: p?.last_session_date ?? null,
      total_sessions_90d: sessionCounts.get(e.id)?.size ?? 0,
    };
  });

  // Volume per muscle over rolling 7 days (all session types)
  const volume7d: Record<string, number> = {};
  for (const s of sets) {
    const t = new Date(s.performed_at);
    if (t < sevenDaysAgo) continue;
    const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises;
    if (!ex) continue;
    volume7d[ex.primary_muscle] = (volume7d[ex.primary_muscle] ?? 0) + 1;
  }

  // RIR average last 7d
  const rirs = sets
    .filter(
      (s) => s.rir !== null && new Date(s.performed_at) >= sevenDaysAgo
    )
    .map((s) => s.rir as number);
  const rirAvg7d =
    rirs.length > 0 ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;

  // Recent sessions summary (last 6) — compact
  const recentSessionsSummary = sessions
    .slice(0, 6)
    .map((s) => {
      const tpl = Array.isArray(s.workout_templates)
        ? s.workout_templates[0]
        : s.workout_templates;
      const date = new Date(s.started_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
      return `${date}: ${tpl?.name ?? "—"} (${tpl?.session_type ?? "?"})`;
    })
    .join(" · ");

  const lastSession = sessions[0];
  const lastTpl = lastSession
    ? Array.isArray(lastSession.workout_templates)
      ? lastSession.workout_templates[0]
      : lastSession.workout_templates
    : null;
  const lastSessionType = lastTpl?.session_type ?? null;

  const volumeTargets: Record<string, number> = {
    ...WEEKLY_VOLUME_TARGET,
    ...(settings.volume_targets ?? {}),
  };

  return {
    availableExercises,
    volume7d,
    volumeTargets,
    rirAvg7d,
    recentSessionsSummary,
    lastSessionType,
  };
}

export function formatSessionContextForPrompt(
  input: SessionGeneratorInput,
  ctx: SessionContext
): string {
  const lines: string[] = [];

  const exerciseCountHint = exerciseCountForMinutes(input.minutes);
  const readinessHint = readinessDescription(input.readiness);

  lines.push(`## Pedido`);
  lines.push(
    `- Tipo: ${input.sessionType.toUpperCase()}`
  );
  lines.push(
    `- Tempo disponível: ${input.minutes} minutos (alvo ${exerciseCountHint.min}-${exerciseCountHint.max} exercícios)`
  );
  lines.push(`- Disposição: ${readinessHint}`);
  lines.push(
    `- Última sessão: ${ctx.lastSessionType ? ctx.lastSessionType.toUpperCase() : "sem registro"}`
  );

  lines.push(`\n## Volume por músculo (rolling 7d)`);
  const allMuscles = new Set([
    ...Object.keys(ctx.volume7d),
    ...Object.keys(ctx.volumeTargets).filter((k) => ctx.volumeTargets[k] > 0),
  ]);
  for (const m of allMuscles) {
    const curr = ctx.volume7d[m] ?? 0;
    const target = ctx.volumeTargets[m] ?? 0;
    const deficit = Math.max(0, target - curr);
    const flag = deficit >= 4 ? " ⚠️ déficit alto" : deficit >= 2 ? " ⚠️ déficit" : "";
    lines.push(
      `- ${muscleLabel(m)}: ${curr}/${target} sets${flag}`
    );
  }

  if (ctx.rirAvg7d !== null) {
    lines.push(`\nRIR médio 7d: ${ctx.rirAvg7d.toFixed(1)}`);
  }

  if (ctx.recentSessionsSummary) {
    lines.push(`\n## Últimas sessões`);
    lines.push(ctx.recentSessionsSummary);
  }

  lines.push(`\n## Catálogo de exercícios disponíveis (${input.sessionType})`);
  lines.push(
    `Formato: [id] Nome · músculo · padrão · status · carga atual · sessões 90d`
  );
  for (const ex of ctx.availableExercises) {
    const weight =
      ex.progression_weight_kg !== null
        ? `${ex.progression_weight_kg}kg`
        : "—";
    const status = ex.progression_status
      ? ` · ${ex.progression_status}${ex.progression_status === "stalled" ? ` (${ex.sessions_at_current_weight}x)` : ""}`
      : " · novo";
    lines.push(
      `[${ex.id}] ${ex.name} · ${muscleLabel(ex.primary_muscle)} · ${patternLabel(ex.movement_pattern)}${status} · ${weight} · ${ex.total_sessions_90d} sessões`
    );
  }

  return lines.join("\n");
}

export function exerciseCountForMinutes(minutes: number): {
  min: number;
  max: number;
} {
  if (minutes <= 30) return { min: 3, max: 4 };
  if (minutes <= 45) return { min: 4, max: 5 };
  if (minutes <= 60) return { min: 5, max: 6 };
  return { min: 6, max: 8 };
}

function readinessDescription(r: Readiness): string {
  switch (r) {
    case "tired":
      return "Cansado — reduzir volume ~20%, evitar RIR 0, priorizar técnica";
    case "ready":
      return "Pronto — pode empurrar RIR 0-1 nos top sets, volume no alto";
    case "normal":
    default:
      return "Normal — volume/intensidade padrão, RIR 2 nos compostos";
  }
}

export const SESSION_GENERATOR_SYSTEM_PROMPT = `Você monta o treino do dia do Felippe, um trainee intermediário, usando O APP PESSOAL DELE. Você é o coach de sessão — não de mesociclo.

## Regras inegociáveis

1. USE APENAS OS EXERCÍCIOS DO CATÁLOGO FORNECIDO. Cada exercício tem um ID. Você referencia exatamente esses IDs. Nunca invente exercícios.
2. BAIXA ROTAÇÃO. Preservar consistência é melhor que variedade. Só sugira trocar exercício principal se ele estiver stalled 3+ sessões. Caso contrário, repita os exercícios que o Felippe já está fazendo.
3. Ciência sobre gosto. Sempre apoie decisões em princípios de hipertrofia: frequência ≥2x/semana/grupo (Schoenfeld 2016), volume entre MEV e MAV, RIR 0-3, compostos antes de isolados.
4. Respeite o tempo disponível. O pedido indica faixa de exercícios (ex: 45min = 4-5 exercícios). Não extrapole.
5. Respeite a disposição. "Cansado" = -20% volume e RIR ≥2. "Pronto" = pode empurrar RIR 0-1 nos top sets.

## Heurística de escolha

- Priorize grupos com déficit de volume (marcados ⚠️ no contexto)
- Sempre inclua pelo menos 1 exercício por grupo muscular alvo do session_type
- UPPER: peito + costas + ombros + (bíceps OU tríceps). Preferível incluir os dois se tempo permitir.
- LOWER: quadríceps + posterior + glúteo + (panturrilha OU core).
- Ordem: compostos (barbell/dumbbell livres) → acessórios (máquinas grandes) → isolações (cabo/halter pequeno)
- Exercícios com progression_status = "ready_to_progress" têm prioridade (user vai bater PR)
- Exercícios com progression_status = "just_progressed" ficam em volume mais baixo (consolidação)
- Exercícios com progression_status = "stalled" por 3+ sessões: substitua por similar (mesmo padrão de movimento)

## Sets/reps/rest

- Composto pesado (hip_hinge, quad_dominant, horizontal_push, vertical_pull): 3 sets, 4-6 reps, rest 180s
- Composto padrão (horizontal_push, horizontal_pull, vertical_push, quad_accessory): 3 sets, 6-8 reps, rest 150s
- Acessório (isolation de grupo grande): 2-3 sets, 8-12 reps, rest 90s
- Isolação pequena (biceps, triceps, side_delts, calves): 2-3 sets, 10-15 reps, rest 60s

Se "Cansado": reduzir 1 set dos compostos, RIR alvo +1.
Se "Pronto": manter volume, RIR 0-1 nos top sets dos compostos.

## Output obrigatório

Retorne SEMPRE e SOMENTE um JSON válido:

{
  "name": "string — nome curto (ex: 'Upper · Push-Pull 45min')",
  "reasoning": "string — 2-3 frases explicando a lógica. Mencione: qual grupo priorizou, quais exercícios stalled evitou, por que nessa ordem.",
  "exercises": [
    {
      "exercise_id": "string — UUID do catálogo",
      "target_sets": number,
      "rep_range_low": number,
      "rep_range_high": number,
      "rest_seconds": number,
      "rationale": "string — 1 frase curta sobre esse exercício específico"
    }
  ]
}

Regras do JSON:
- Sem markdown, sem código fences, sem texto fora do JSON
- exercise_id DEVE ser exatamente um dos IDs do catálogo
- Não duplique exercise_id
- Entre 3 e 8 exercícios, conforme o tempo solicitado`;
