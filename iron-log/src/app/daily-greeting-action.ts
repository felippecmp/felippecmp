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
 * Generate a short personalized line for the Home header — aggressive,
 * confrontational, pushing against regression. Not motivational filler.
 *
 * Felippe doesn't want to go back to being out of shape. Use that as
 * leverage. Treat slack as the enemy, not a friend.
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

  const userMessage = `Gere UMA frase de abertura pra home do app do Felippe agora (${timeOfDay}). É pessoal, vai só pra ele.

Tom: agressivo, confrontacional, visceral. Amigo durão que não deixa o Felippe ser otário consigo mesmo. Ele NÃO quer voltar a ficar fora de forma — pode usar esse medo como alavanca. Treine como se a versão gorda dele estivesse atrás dele.

PROIBIDO:
- Motivação rasa ("vamos nessa", "bora", "tá indo bem", "você consegue")
- Emoji
- Exclamação (!)
- Pergunta (?)
- Corporate speak ou inspirational bullshit
- **Citar o número do streak em dias** (não diga "X dias", "streak de Y")
- **Citar o nome do próximo treino** (não diga "Lower A", "Upper B")
- Dado óbvio que ele já vê na própria home (sets da semana, volume do mês, nome de template)

LIBERADO:
- Medo de regressão física — voltar a ficar gordo, perder o físico, virar o cara que ele era
- Crítica direta se o contexto mostrar slack (músculo negligenciado há tempo, feeling baixo, cardio zerado)
- Sarcasmo seco
- Chamada de atenção tipo "não se ilude", "não se enrola", "não confia em ontem"
- Referência a padrões insidiosos (descanso virando desleixo, "começo semana que vem")

Regras de forma:
- 10 a 18 palavras
- PRIMEIRA LETRA MAIÚSCULA
- Sem ponto final
- Sem "Felippe" (o nome já tá em cima)
- Linha só — não é continuação do "Boa noite,"

Contexto real do treino dele:
${context.text}

Responde APENAS a linha. Sem aspas, sem explicação, sem "Aqui está:".`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 100,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text
      .trim()
      .replace(/^["'«»]+|["'«»]+$/g, "")
      .replace(/[.!?]+$/g, "")
      .trim();
    if (!cleaned) {
      return { ok: false, error: "Resposta vazia." };
    }
    // Ensure first letter is uppercase — belt-and-suspenders on top of the
    // prompt rule in case the model slips.
    const capitalized =
      cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return { ok: true, message: capitalized };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Falha: ${msg}` };
  }
}
