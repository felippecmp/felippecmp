"use server";

import {
  getAnthropicClient,
  COACH_MODEL,
  COACH_SYSTEM_PROMPT,
} from "@/lib/coach/ai-client";
import { createClient } from "@/lib/supabase/server";
import { muscleLabel } from "@/lib/muscles";

export type InsightResult =
  | { ok: true; insight: string }
  | { ok: false; error: string };

export async function generatePostWorkoutInsight(
  sessionId: string
): Promise<InsightResult> {
  const client = getAnthropicClient();
  if (!client) return { ok: false, error: "AI não disponível." };

  const supabase = await createClient();

  // Fetch this session's data
  const [sessionRes, setsRes, avgRes] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("started_at, finished_at, duration_minutes, overall_feeling, workout_templates(name, session_type)")
      .eq("id", sessionId)
      .single(),
    supabase
      .from("workout_sets")
      .select("exercise_id, weight_kg, reps, rir, exercises(name, primary_muscle)")
      .eq("session_id", sessionId)
      .eq("is_warmup", false)
      .order("set_number"),
    // Average volume of last 5 sessions for comparison
    supabase
      .from("workout_sessions")
      .select("id")
      .not("finished_at", "is", null)
      .neq("id", sessionId)
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  if (!sessionRes.data || !setsRes.data) {
    return { ok: false, error: "Sessão não encontrada." };
  }

  const session = sessionRes.data;
  const sets = setsRes.data as Array<{
    exercise_id: string;
    weight_kg: number | string;
    reps: number;
    rir: number | null;
    exercises: { name: string; primary_muscle: string } | { name: string; primary_muscle: string }[] | null;
  }>;
  const tpl = Array.isArray(session.workout_templates)
    ? session.workout_templates[0]
    : session.workout_templates;

  // Compute session stats
  const totalSets = sets.length;
  const totalVolume = sets.reduce(
    (sum, s) => sum + Number(s.weight_kg) * s.reps,
    0
  );
  const muscles = new Set<string>();
  const exerciseLines: string[] = [];
  const byExercise = new Map<string, Array<{ w: number; r: number }>>();

  for (const s of sets) {
    const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises;
    if (!ex) continue;
    muscles.add(ex.primary_muscle);
    const key = ex.name;
    const arr = byExercise.get(key) ?? [];
    arr.push({ w: Number(s.weight_kg), r: s.reps });
    byExercise.set(key, arr);
  }

  for (const [name, ss] of byExercise.entries()) {
    const best = ss.reduce((a, b) => (a.w > b.w ? a : b));
    exerciseLines.push(`${name}: ${ss.length} sets, melhor ${best.w}kg×${best.r}`);
  }

  // Count avg sets per recent session
  const recentIds = (avgRes.data ?? []).map((r) => r.id);
  let avgSetsPerSession = 0;
  if (recentIds.length > 0) {
    const { count } = await supabase
      .from("workout_sets")
      .select("*", { count: "exact", head: true })
      .in("session_id", recentIds)
      .eq("is_warmup", false);
    avgSetsPerSession = Math.round((count ?? 0) / recentIds.length);
  }

  const userMessage = `Acabei de finalizar um treino. Me dê um insight curto (2-3 frases, direto, sem introdução).

Sessão: ${(tpl as { name: string } | null)?.name ?? "Treino"} (${(tpl as { session_type: string } | null)?.session_type ?? "?"})
Duração: ${session.duration_minutes ?? "?"}min
Feeling: ${session.overall_feeling ?? "não informado"}/5
Total: ${totalSets} sets, ${Math.round(totalVolume / 1000 * 10) / 10} toneladas
Músculos: ${Array.from(muscles).map(muscleLabel).join(", ")}
Média dos últimos 5 treinos: ${avgSetsPerSession} sets/sessão

Exercícios:
${exerciseLines.join("\n")}

Análise: compare com a média, destaque destaques ou preocupações. Seja específico com nomes e números.`;

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 256,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return { ok: true, insight: text.trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return { ok: false, error: msg };
  }
}
