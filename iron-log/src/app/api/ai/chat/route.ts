import { NextResponse } from "next/server";
import {
  getAnthropicClient,
  COACH_MODEL,
  COACH_SYSTEM_PROMPT,
} from "@/lib/coach/ai-client";
import { buildTrainingContext } from "@/lib/coach/training-context";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const client = getAnthropicClient();
  if (!client) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY não configurada." },
      { status: 500 }
    );
  }

  const { messages } = (await req.json()) as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Nenhuma mensagem." }, { status: 400 });
  }

  // Load training context to prepend to the conversation
  const context = await buildTrainingContext();

  const systemPrompt = `${COACH_SYSTEM_PROMPT}

---

## Dados atuais do Felippe

${context.text}

---

Responda em PT-BR, direto, como um coach de academia que manja de ciência. Use os dados acima pra fundamentar suas respostas. Quando não souber, diga "não tenho dados pra isso" ao invés de chutar.`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
