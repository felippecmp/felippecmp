"use server";

import {
  getAnthropicClient,
  COACH_MODEL,
} from "@/lib/coach/ai-client";
import { EQUIPMENT, MOVEMENT_PATTERNS, MUSCLES } from "@/lib/muscles";

export type AutofillResult =
  | {
      ok: true;
      movementPattern: string;
      primaryMuscle: string;
      equipment: string | null;
      loadIncrement: number;
    }
  | { ok: false; error: string };

export async function autofillExerciseFromName(
  name: string,
  sessionType: "upper" | "lower"
): Promise<AutofillResult> {
  if (!name || name.trim().length === 0) {
    return { ok: false, error: "Informe o nome." };
  }

  const client = getAnthropicClient();
  if (!client) return { ok: false, error: "AI não disponível." };

  const patterns = MOVEMENT_PATTERNS.filter((p) => p.session === sessionType)
    .map((p) => `${p.value} (${p.label})`)
    .join(", ");
  const muscles = MUSCLES.map((m) => `${m.value} (${m.label})`).join(", ");
  const equipment = EQUIPMENT.map((e) => `${e.value} (${e.label})`).join(", ");

  const prompt = `Classifique o exercício: "${name.trim()}" (sessão ${sessionType}).

Retorne APENAS JSON no formato:
{
  "movementPattern": "valor_do_enum",
  "primaryMuscle": "valor_do_enum",
  "equipment": "valor_do_enum ou null",
  "loadIncrement": numero (0.25, 0.5, 1, 2.5, 5 — incremento mínimo típico para este exercício)
}

Valores válidos:
- movementPattern: ${patterns}
- primaryMuscle: ${muscles}
- equipment: ${equipment}

Regras:
- Use os valores de enum exatos (ex: "horizontal_push", não "Empurrar Horizontal")
- loadIncrement: barras pesadas = 2.5, máquinas/cabos = 2.5-5, halteres = 1-2.5, exercícios pequenos (lateral raise) = 0.5-1
- Sem markdown, sem explicação, só o JSON.`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const data = JSON.parse(cleaned);
    return {
      ok: true,
      movementPattern: data.movementPattern ?? "",
      primaryMuscle: data.primaryMuscle ?? "",
      equipment: data.equipment ?? null,
      loadIncrement: typeof data.loadIncrement === "number" ? data.loadIncrement : 2.5,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return { ok: false, error: msg };
  }
}
