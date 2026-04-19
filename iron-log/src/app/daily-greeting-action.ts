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

  // Rotate "flavors" per day-of-week so the model doesn't converge on the
  // same shape every morning. Each flavor pushes the acid in a slightly
  // different direction.
  const flavors = [
    "pergunta ácida + empurrão",
    "cutucada direta no medo de regredir fisicamente",
    "constatação fria seguida de ordem curta",
    "provocação tipo: 'vai mesmo?' + resposta",
    "chamada pro confronto com a versão mole dele",
    "frase que explora o medo de acordar gordo de novo",
    "ordem seca, tipo técnico que perdeu a paciência",
  ];
  const flavor = flavors[new Date().getDay() % flavors.length];

  const userMessage = `Gere UMA frase motivacional ÁCIDA pra home do app do Felippe agora (${timeOfDay}). É um soco no estômago da preguiça — feito pra ele, pessoal, ninguém mais vê.

EXEMPLO da vibe certa:
"Vai ser gordo pra sempre? Bora, vai fazer o que tem que ser feito."

Note o formato: pergunta ácida que expõe o medo → imperativo seco que empurra. Duas cláusulas. Direta, sem poesia.

Tom deste exemplar: ${flavor}.

Princípios:
- Confrontacional. Ácida. Sem papas na língua.
- Pode (e deve) usar o medo de voltar a ficar gordo / fora de forma / flácido como alavanca — ele PEDIU por isso.
- Pode ser pergunta retórica: "Vai…?", "Quer…?", "Sabe quem volta gordo?", "Ou vai resolver isso?"
- Pode ter duas cláusulas separadas — a primeira provoca, a segunda manda fazer.
- Fala com ele direto: "faz", "levanta", "para de", "acaba com", "não inventa", "mexe essa bunda"
- Ou constatação fria sobre padrão perdedor que ele precisa ouvir.

PONTUAÇÃO — regra crítica:
- TODA cláusula que for pergunta retórica TERMINA com "?". Sem exceção.
- Palavras de abertura típicas de pergunta: "Vai", "Quer", "Sabe", "Cadê", "Como", "Por que", "Quanto", "Quando", "Ou vai", "Até quando" → SE a cláusula começa com uma dessas, ela TERMINA com "?".
- NUNCA substitua "?" por ".". Se é pergunta, escreve "?".
- Cláusula imperativa ou declarativa pode terminar com "." ou sem pontuação — tanto faz.
- Em uma frase de duas cláusulas, cada cláusula segue sua própria regra: pergunta → "?", ordem → "." ou nada.

PROIBIDO:
- Frases clichê motivacional ("vamos nessa", "você consegue", "acredite", "melhor versão")
- Emoji
- Exclamação (!) — NUNCA
- Hashtag
- Citar NÚMERO de qualquer tipo (dias, kg, %, séries)
- Citar nome de treino, músculo ou exercício
- Citar "Felippe" (o nome já tá em cima)
- Acomodar, suavizar, pedir licença

Forma:
- 8 a 18 palavras
- PRIMEIRA LETRA MAIÚSCULA
- Pode ser 1 frase ou 2 cláusulas separadas por "?" / "."
- Nada de "!" em lugar nenhum

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
    // Strip outer quotes + any exclamation marks anywhere (banned by the
    // prompt; this is the belt-and-suspenders). "?" and "." stay — the
    // v2 acid tone wants rhetorical questions + period-separated clauses.
    const cleaned = text
      .trim()
      .replace(/^["'«»]+|["'«»]+$/g, "")
      .replace(/!+/g, "")
      .trim();
    if (!cleaned) {
      return { ok: false, error: "Resposta vazia." };
    }
    // Capitalize first letter — belt-and-suspenders on top of the prompt
    // rule in case the model slips.
    const capitalized =
      cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    // Fix rhetorical questions that the model wrote with "." instead of "?".
    // Splits on "." / "?", detects clauses that OPEN with an interrogative
    // word, swaps their trailing "." for "?". Preserves imperative
    // clauses as-is.
    const questionStarters =
      /^(vai|quer|sabe|cadê|como|por\s*que|porque|quanto|quantos|quantas|quando|ou\s+vai|até\s+quando|será)\b/i;
    const fixed = capitalized
      .split(/([.?])/)
      .reduce<string[]>((acc, chunk, i, arr) => {
        if (chunk === "." || chunk === "?") {
          const prev = arr[i - 1]?.trim() ?? "";
          if (chunk === "." && questionStarters.test(prev)) {
            acc.push("?");
          } else {
            acc.push(chunk);
          }
        } else {
          acc.push(chunk);
        }
        return acc;
      }, [])
      .join("");
    return { ok: true, message: fixed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Falha: ${msg}` };
  }
}
