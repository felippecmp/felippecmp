"use server";

import {
  getAnthropicClient,
  COACH_MODEL,
  COACH_SYSTEM_PROMPT,
} from "@/lib/coach/ai-client";
import { buildTrainingContext } from "@/lib/coach/training-context";

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
