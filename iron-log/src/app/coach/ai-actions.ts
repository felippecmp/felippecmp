"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getAnthropicClient,
  COACH_MODEL,
  COACH_SYSTEM_PROMPT,
} from "@/lib/coach/ai-client";
import { buildTrainingContext } from "@/lib/coach/training-context";
import { VOLUME_LANDMARKS } from "@/lib/coach/volume-landmarks";

export type AIBlockProposal = {
  name: string;
  total_weeks: number;
  reasoning: string;
  weeks: Array<{
    week_number: number;
    phase: "accumulation" | "intensification" | "realization" | "deload";
    volume_targets: Record<string, number>;
    intensity_target: string;
    reasoning: string;
  }>;
};

export type PlanResult =
  | { ok: true; proposal: AIBlockProposal }
  | { ok: false; error: string };

export type CreateFromAIResult =
  | { ok: true }
  | { ok: false; error: string };

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Step 1: Ask Claude to plan a mesocycle. Returns the proposal for the
 * user to review before committing.
 */
export async function planMesocycleWithAI(input: {
  totalWeeks: number;
  constraints: string;
  goals: string;
}): Promise<PlanResult> {
  const client = getAnthropicClient();
  if (!client) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY não configurada. Adicione nas variáveis de ambiente.",
    };
  }

  const context = await buildTrainingContext();
  if (!context.hasEnoughData) {
    return {
      ok: false,
      error: "Dados insuficientes pra planejar. Precisa de pelo menos 3 sessões registradas.",
    };
  }

  const userMessage = `Planeje um mesociclo de ${input.totalWeeks} semanas baseado nos meus dados abaixo.

${input.constraints ? `Restrições: ${input.constraints}` : "Sem restrições."}
${input.goals ? `Metas concretas: ${input.goals}` : "Sem meta específica — progressão geral."}

---

${context.text}

---

Retorne APENAS o JSON no formato especificado, sem markdown, sem texto adicional.`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 4096,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON — Claude sometimes wraps in ```json fences despite instructions
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let proposal: AIBlockProposal;
    try {
      proposal = JSON.parse(cleaned);
    } catch {
      return {
        ok: false,
        error: `Coach retornou resposta inválida. Tente de novo.\n\nRaw: ${text.slice(0, 200)}`,
      };
    }

    // Guardrails: validate volumes are within MV-MRV bounds
    const violations: string[] = [];
    for (const week of proposal.weeks) {
      for (const [muscle, sets] of Object.entries(week.volume_targets)) {
        const landmark = VOLUME_LANDMARKS[muscle];
        if (!landmark) continue;
        if (sets > landmark.mrv) {
          violations.push(
            `Semana ${week.week_number}: ${muscle} ${sets} sets > MRV ${landmark.mrv}`
          );
          // Auto-clamp instead of rejecting
          week.volume_targets[muscle] = landmark.mrv;
        }
      }
    }

    if (violations.length > 0) {
      proposal.reasoning +=
        ` [Coach ajustado: ${violations.length} valores acima do MRV foram clampados.]`;
    }

    return { ok: true, proposal };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Falha na chamada ao Claude: ${msg}` };
  }
}

/**
 * Step 2: User approved the proposal — persist to DB.
 */
export async function createMesocycleFromAI(
  proposal: AIBlockProposal,
  startsOn: string
): Promise<CreateFromAIResult> {
  const supabase = await createClient();

  const endsOn = addDaysISO(startsOn, proposal.total_weeks * 7 - 1);

  const { data: mesoRow, error: mesoErr } = await supabase
    .from("mesocycles")
    .insert({
      name: proposal.name,
      starts_on: startsOn,
      ends_on: endsOn,
      total_weeks: proposal.total_weeks,
      source: "coach",
      user_notes: proposal.reasoning,
    })
    .select("id")
    .single();

  if (mesoErr || !mesoRow) {
    return { ok: false, error: mesoErr?.message ?? "Erro ao criar bloco." };
  }

  const weekRows = proposal.weeks.map((w) => ({
    mesocycle_id: mesoRow.id,
    week_number: w.week_number,
    week_starts_on: addDaysISO(startsOn, (w.week_number - 1) * 7),
    phase: w.phase,
    volume_targets: w.volume_targets,
    intensity_target: w.intensity_target,
    coach_reasoning: w.reasoning,
    user_overrode: false,
  }));

  const { error: weeksErr } = await supabase
    .from("mesocycle_weeks")
    .insert(weekRows);

  if (weeksErr) {
    await supabase.from("mesocycles").delete().eq("id", mesoRow.id);
    return { ok: false, error: weeksErr.message };
  }

  // Log the decision
  try {
    await supabase.from("coach_decisions").insert({
      decision_type: "plan_mesocycle",
      context_summary: proposal.reasoning,
      proposal: proposal as unknown as Record<string, unknown>,
      reasoning: proposal.reasoning,
      applied: true,
    });
  } catch {
    // Audit log failure is non-blocking
  }

  revalidatePath("/coach");
  revalidatePath("/progresso");
  revalidatePath("/");
  return { ok: true };
}
