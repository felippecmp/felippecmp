"use server";

import { revalidatePath } from "next/cache";
import {
  getAnthropicClient,
  COACH_MODEL,
  COACH_SYSTEM_PROMPT,
} from "@/lib/coach/ai-client";
import { buildTrainingContext } from "@/lib/coach/training-context";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/settings";

export type AITemplateExercise = {
  exercise_id: string;
  exercise_name: string;
  target_sets: number;
  rep_range_low: number;
  rep_range_high: number;
  rest_seconds: number;
};

export type AITemplateProposal = {
  name: string;
  session_type: "upper" | "lower";
  reasoning: string;
  exercises: AITemplateExercise[];
};

export type ProposeResult =
  | { ok: true; proposal: AITemplateProposal }
  | { ok: false; error: string };

export type ApplyResult = { ok: true; templateId: string } | { ok: false; error: string };

export async function proposeTemplate(input: {
  sessionType: "upper" | "lower";
  focus?: string;
}): Promise<ProposeResult> {
  const client = getAnthropicClient();
  if (!client) return { ok: false, error: "AI não disponível." };

  const supabase = await createClient();

  // Load the user's full exercise catalog
  const { data: exercisesRaw } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle, equipment, movement_pattern, session_type")
    .eq("is_active", true)
    .order("name");

  const catalog = exercisesRaw ?? [];
  if (catalog.length === 0) {
    return { ok: false, error: "Catálogo de exercícios vazio. Cadastre exercícios primeiro." };
  }

  const context = await buildTrainingContext();

  const catalogText = catalog
    .filter((e: { session_type: string }) => e.session_type === input.sessionType)
    .map((e: { id: string; name: string; primary_muscle: string; equipment: string | null; movement_pattern: string }) =>
      `- ID: ${e.id} | ${e.name} | ${e.primary_muscle} | ${e.movement_pattern} | ${e.equipment ?? "—"}`
    )
    .join("\n");

  const userMessage = `Monte um template de treino ${input.sessionType.toUpperCase()} completo para o Felippe.
${input.focus ? `Foco: ${input.focus}` : ""}

## Catálogo de exercícios disponíveis (${input.sessionType}):
${catalogText}

## Contexto do treino do Felippe:
${context.text}

---

Retorne APENAS um JSON neste formato:
{
  "name": "string — nome curto, ex: Upper A, Push Day",
  "session_type": "${input.sessionType}",
  "reasoning": "2-3 frases explicando a escolha dos exercícios e volume",
  "exercises": [
    {
      "exercise_id": "ID do catálogo",
      "exercise_name": "nome (pra referência)",
      "target_sets": 3,
      "rep_range_low": 6,
      "rep_range_high": 10,
      "rest_seconds": 180
    }
  ]
}

Regras:
- Use APENAS IDs que existem no catálogo acima.
- 5-8 exercícios por template.
- Compound primeiro, depois isolamento.
- Sets 2-4, reps 5-15, descanso 60-300s baseado no tipo de exercício (compound = mais).
- Considere balanço muscular e o histórico do Felippe.
- Sem markdown, sem texto fora do JSON.`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 2048,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const proposal: AITemplateProposal = JSON.parse(cleaned);

    // Validate all exercise_ids exist in the catalog
    const validIds = new Set(catalog.map((e: { id: string }) => e.id));
    proposal.exercises = proposal.exercises.filter((ex) => validIds.has(ex.exercise_id));

    if (proposal.exercises.length === 0) {
      return { ok: false, error: "AI não encontrou exercícios válidos no catálogo." };
    }

    return { ok: true, proposal };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return { ok: false, error: msg };
  }
}

export async function applyProposedTemplate(
  proposal: AITemplateProposal
): Promise<ApplyResult> {
  const supabase = await createClient();
  const settings = await getUserSettings();

  // Create template
  const { data: tpl, error: tplErr } = await supabase
    .from("workout_templates")
    .insert({
      name: proposal.name,
      session_type: proposal.session_type,
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (tplErr || !tpl) return { ok: false, error: tplErr?.message ?? "Erro ao criar template." };

  // Insert template exercises
  const rows = proposal.exercises.map((ex, idx) => ({
    template_id: tpl.id,
    exercise_id: ex.exercise_id,
    slot_order: idx,
    target_sets: ex.target_sets || settings.default_target_sets,
    rep_range_low: ex.rep_range_low || settings.default_rep_range_low,
    rep_range_high: ex.rep_range_high || settings.default_rep_range_high,
    rest_seconds: ex.rest_seconds || settings.default_rest_seconds,
  }));

  const { error: teErr } = await supabase.from("template_exercises").insert(rows);
  if (teErr) {
    await supabase.from("workout_templates").delete().eq("id", tpl.id);
    return { ok: false, error: teErr.message };
  }

  revalidatePath("/templates");
  revalidatePath("/treinar");
  return { ok: true, templateId: tpl.id };
}
