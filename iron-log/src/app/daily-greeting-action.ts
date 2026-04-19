"use server";

import { getAnthropicClient, COACH_MODEL } from "@/lib/coach/ai-client";

export type DailyGreetingResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Pure motivational line for the Home header — an order, not a stat.
 * NO training context, NO personal data: a punch in the gut of laziness
 * that tells Felippe to do the thing he was about to postpone.
 *
 * Client caches the result in localStorage keyed by day so we only hit
 * the API once per day per device.
 */
export async function generateDailyGreeting(
  timeOfDay: "madrugada" | "manhã" | "tarde" | "noite"
): Promise<DailyGreetingResult> {
  const client = getAnthropicClient();
  if (!client) {
    return { ok: false, error: "ANTHROPIC_API_KEY não configurada." };
  }

  // Rotate "flavors" per day-of-week so the AI doesn't converge on the same
  // shape every morning. Each flavor is just a seed to push the line in a
  // slightly different direction — all still motivational commands.
  const flavors = [
    "um comando direto, sem rodeio",
    "uma provocação seca contra a preguiça",
    "uma constatação fria sobre postergar",
    "uma ordem curta tipo técnico durão",
    "um aviso sobre o custo real de relaxar",
    "uma frase que vira o estômago de quem quer fugir do treino",
    "um lembrete brutal de pra onde o caminho fácil leva",
  ];
  const flavor = flavors[new Date().getDay() % flavors.length];

  const userMessage = `Gere UMA frase motivacional pra home do app do Felippe agora (${timeOfDay}).

É um soco no estômago da preguiça. Uma ordem pra ele fazer o que tem que ser feito. Nada de dado, nada de estatística, nada sobre treino específico dele — é MOTIVAÇÃO BRUTA.

Tom deste exemplar: ${flavor}.

Princípios:
- Fale COM ele, como quem cutuca: "faz", "levanta", "acaba com", "para de", "não negocia", "não inventa"
- Ou constata em terceira pessoa um padrão perdedor pra ele reconhecer ("Preguiça é a única coisa que cresce sem treinar")
- Pode mirar no medo de voltar a ficar fora de forma, perder o físico, envergonhar a versão futura dele
- Pode ser sarcástico, seco, afiado

PROIBIDO:
- Frases clichê ("vamos nessa", "você consegue", "acredite em si", "a melhor versão de você")
- Emoji
- Exclamação (!)
- Pergunta (?)
- Hashtag
- Citar NÚMERO de qualquer tipo (dias, séries, kg, %)
- Citar nome de treino, músculo ou exercício específico
- Citar "Felippe" (o nome já tá em cima)
- Qualquer dado do treino dele (você não tem contexto — e nem deve ter)

Forma:
- 8 a 16 palavras
- PRIMEIRA LETRA MAIÚSCULA
- Sem ponto final

Responde APENAS a frase. Sem aspas, sem explicação, sem "Aqui está:".`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 100,
      // Higher temperature: with no context, we need variety between days.
      temperature: 1,
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
    // Capitalize first letter — belt-and-suspenders on top of the prompt
    // rule in case the model slips.
    const capitalized =
      cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return { ok: true, message: capitalized };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Falha: ${msg}` };
  }
}
