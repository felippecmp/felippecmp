"use server";

import {
  getAnthropicClient,
  COACH_MODEL,
  COACH_SYSTEM_PROMPT,
} from "@/lib/coach/ai-client";
import { buildTrainingContext } from "@/lib/coach/training-context";

export type WeeklySummaryResult =
  | { ok: true; summary: string }
  | { ok: false; error: string };

export async function generateWeeklySummary(): Promise<WeeklySummaryResult> {
  const client = getAnthropicClient();
  if (!client) {
    return { ok: false, error: "ANTHROPIC_API_KEY não configurada." };
  }

  const context = await buildTrainingContext();

  const userMessage = `Faça um resumo da minha semana de treino. 3-5 bullet points, direto, sem introdução.

${context.text}

Inclua:
- Volume total vs targets (quais músculos tão no alvo e quais não)
- Consistência (quantas sessões, se tá mantendo frequência)
- Destaques positivos (PRs, exercícios progredindo)
- Pontos de atenção (músculos negligenciados, stalls, feeling baixo)
- Uma recomendação concreta pra semana que vem

Seja específico com nomes de exercícios e números. Máximo 5 bullet points.`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 512,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return { ok: true, summary: text.trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Falha: ${msg}` };
  }
}
