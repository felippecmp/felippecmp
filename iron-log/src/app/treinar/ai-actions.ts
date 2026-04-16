"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getAnthropicClient,
  COACH_MODEL,
  COACH_SYSTEM_PROMPT,
} from "@/lib/coach/ai-client";
import { buildTrainingContext } from "@/lib/coach/training-context";
import {
  buildSessionContext,
  formatSessionContextForPrompt,
  SESSION_GENERATOR_SYSTEM_PROMPT,
  type SessionGeneratorInput,
} from "@/lib/coach/session-generator";

export type BriefingSuggestion = {
  text: string;
  type: "technique" | "adjust_weight" | "add_sets" | "swap" | "general";
};

export type BriefingResult =
  | { ok: true; suggestions: BriefingSuggestion[] }
  | { ok: false; error: string };

export async function generatePreWorkoutBriefing(input: {
  templateName: string;
  sessionType: string;
  exercises: string[];
}): Promise<BriefingResult> {
  const client = getAnthropicClient();
  if (!client) {
    return { ok: false, error: "ANTHROPIC_API_KEY não configurada." };
  }

  const context = await buildTrainingContext();

  const userMessage = `Vou treinar agora: "${input.templateName}" (${input.sessionType}).
Exercícios do template: ${input.exercises.join(", ")}.

${context.text}

---

Com base no meu histórico acima, me dê 2-4 sugestões práticas e curtas para ESTE treino.
Foque em: exercícios stalled que preciso ajustar, volume que tá abaixo do target, técnicas pra tentar.

Retorne APENAS um JSON array neste formato, sem markdown:
[
  {"text": "Supino stalled há 3 sessões em 80kg — tenta pause reps (2s no peito) pra quebrar o platô.", "type": "technique"},
  {"text": "Volume de costas tá 4 sets abaixo do target. Adiciona 1 set extra de remada.", "type": "add_sets"}
]

Tipos válidos: technique, adjust_weight, add_sets, swap, general`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 1024,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const suggestions: BriefingSuggestion[] = JSON.parse(cleaned);
    return { ok: true, suggestions };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Falha ao gerar briefing: ${msg}` };
  }
}

// ============================================================
// AI Workout Generator — monta a sessão do dia usando os exercícios
// que o Felippe já faz (catálogo pessoal), respeitando tempo, disposição
// e histórico recente. Materializa como workout_template efêmero
// (is_ai_generated=true) para reaproveitar todo o fluxo de sessão.
// ============================================================

type GeneratedExercise = {
  exercise_id: string;
  target_sets: number;
  rep_range_low: number;
  rep_range_high: number;
  rest_seconds: number;
  rationale: string;
  // Enriquecido pelo server depois de validar
  name?: string;
  primary_muscle?: string;
  suggested_weight_kg?: number | null;
};

export type GeneratedWorkout = {
  name: string;
  reasoning: string;
  exercises: GeneratedExercise[];
};

export type GenerateWorkoutResult =
  | {
      ok: true;
      templateId: string;
      workout: GeneratedWorkout;
    }
  | { ok: false; error: string };

/**
 * Calls Claude to compose the day's workout using only the user's own
 * exercise catalog, then persists it as an ephemeral workout_template.
 * The UI can then call startSessionFromTemplate(templateId) as usual.
 */
export async function generateAIWorkout(
  input: SessionGeneratorInput
): Promise<GenerateWorkoutResult> {
  const client = getAnthropicClient();
  if (!client) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY não configurada. Adicione nas variáveis de ambiente.",
    };
  }

  const ctx = await buildSessionContext(input.sessionType);
  if (ctx.availableExercises.length < 3) {
    return {
      ok: false,
      error: `Catálogo de exercícios ${input.sessionType} tem só ${ctx.availableExercises.length} itens. Adicione mais antes de pedir uma sessão IA.`,
    };
  }

  const userMessage = formatSessionContextForPrompt(input, ctx);

  let raw: string;
  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 2048,
      system: SESSION_GENERATOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    raw =
      response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Falha na chamada ao Claude: ${msg}` };
  }

  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: GeneratedWorkout;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      ok: false,
      error: `Coach retornou JSON inválido. Tente de novo.\n\nRaw: ${raw.slice(0, 200)}`,
    };
  }

  // Validate the shape
  if (
    !parsed?.name ||
    !Array.isArray(parsed.exercises) ||
    parsed.exercises.length === 0
  ) {
    return { ok: false, error: "Resposta da IA sem exercícios válidos." };
  }

  // Validate every exercise_id exists in the catalog for this session type
  const catalogIds = new Set(ctx.availableExercises.map((e) => e.id));
  const invalid = parsed.exercises.filter(
    (e) => !catalogIds.has(e.exercise_id)
  );
  if (invalid.length > 0) {
    return {
      ok: false,
      error: `IA tentou usar exercícios fora do catálogo: ${invalid.map((i) => i.exercise_id).join(", ")}`,
    };
  }

  // Dedup: sometimes the model slips the same id twice
  const seen = new Set<string>();
  const unique = parsed.exercises.filter((e) => {
    if (seen.has(e.exercise_id)) return false;
    seen.add(e.exercise_id);
    return true;
  });

  // Persist as workout_template (ephemeral, is_ai_generated=true)
  const supabase = await createClient();

  const { data: tplRow, error: tplErr } = await supabase
    .from("workout_templates")
    .insert({
      name: parsed.name.slice(0, 80),
      session_type: input.sessionType,
      sort_order: 9999,
      is_active: true,
      is_ai_generated: true,
      ai_rationale: parsed.reasoning,
    })
    .select("id")
    .single();

  if (tplErr || !tplRow) {
    return {
      ok: false,
      error: tplErr?.message ?? "Erro ao criar template efêmero.",
    };
  }

  const teRows = unique.map((ex, idx) => ({
    template_id: tplRow.id,
    exercise_id: ex.exercise_id,
    slot_order: idx,
    target_sets: clampInt(ex.target_sets, 1, 6),
    rep_range_low: clampInt(ex.rep_range_low, 1, 30),
    rep_range_high: clampInt(ex.rep_range_high, 1, 30),
    rest_seconds: clampInt(ex.rest_seconds, 30, 300),
  }));

  const { error: teErr } = await supabase
    .from("template_exercises")
    .insert(teRows);

  if (teErr) {
    await supabase.from("workout_templates").delete().eq("id", tplRow.id);
    return { ok: false, error: teErr.message };
  }

  // Enrich for the preview — attach names/muscles/suggested weight
  const byId = new Map(ctx.availableExercises.map((e) => [e.id, e]));
  const enriched: GeneratedExercise[] = unique.map((ex) => {
    const meta = byId.get(ex.exercise_id);
    return {
      ...ex,
      name: meta?.name,
      primary_muscle: meta?.primary_muscle,
      suggested_weight_kg: meta?.progression_weight_kg ?? null,
    };
  });

  // Log decision (non-blocking)
  try {
    await supabase.from("coach_decisions").insert({
      decision_type: "generate_session",
      context_summary: userMessage.slice(0, 2000),
      proposal: {
        input,
        workout: { ...parsed, exercises: unique },
        templateId: tplRow.id,
      } as unknown as Record<string, unknown>,
      reasoning: parsed.reasoning,
      applied: true,
    });
  } catch {
    // non-blocking
  }

  revalidatePath("/treinar");

  return {
    ok: true,
    templateId: tplRow.id,
    workout: { ...parsed, exercises: enriched },
  };
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Discards an AI-generated template that the user decided not to use.
 * We keep the row in the DB but flip is_active=false so it doesn't
 * interfere with anything (historical FK integrity preserved).
 */
export async function discardAIWorkout(
  templateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_templates")
    .update({ is_active: false })
    .eq("id", templateId)
    .eq("is_ai_generated", true);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/treinar");
  return { ok: true };
}
