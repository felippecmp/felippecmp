"use server";

import {
  getAnthropicClient,
  COACH_MODEL,
} from "@/lib/coach/ai-client";
import { buildTrainingContext } from "@/lib/coach/training-context";

export type DailyGreetingResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Generate a short personalized greeting line for the Home header.
 * Uses Felippe's current training context (streak, recent sessions,
 * next planned template) so the line actually lands — no generic
 * "let's crush it" spam, no emoji, no corporate speak.
 *
 * Client caches the result in localStorage keyed by day so we only
 * hit the API once per day per device.
 */
export async function generateDailyGreeting(
  timeOfDay: "madrugada" | "manhã" | "tarde" | "noite"
): Promise<DailyGreetingResult> {
  const client = getAnthropicClient();
  if (!client) {
    return { ok: false, error: "ANTHROPIC_API_KEY não configurada." };
  }

  const context = await buildTrainingContext();

  const userMessage = `Gere UMA linha curta de abertura pra home do app do Felippe agora (${timeOfDay}).

Tom: direto, específico, conectado ao que tá acontecendo no treino dele AGORA. Nada de motivação rasa ("vamos nessa", "bora treinar"), nada de emoji, nada de "!" exclamação. Um amigo de academia que sabe o que ele tá fazendo.

Regras:
- Máximo 12 palavras
- Pode mencionar: streak, próximo treino, músculo que tá negligenciado, exercício em que ele tá progredindo, PR recente, dia da semana
- Nada genérico. Se mencionar streak, cita o número. Se mencionar treino, cita o nome.
- Sem "Felippe" (o nome já tá em cima)
- Sem ponto final
- Primeira letra minúscula (emenda visualmente com o "Boa noite," que vem antes)

Contexto:
${context.text}

Responde APENAS a linha. Sem aspas, sem explicação.`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 80,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text
      .trim()
      .replace(/^["'«»]+|["'«»]+$/g, "")
      .replace(/^[.!?]+|[.!?]+$/g, "")
      .trim();
    if (!cleaned) {
      return { ok: false, error: "Resposta vazia." };
    }
    return { ok: true, message: cleaned };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Falha: ${msg}` };
  }
}
