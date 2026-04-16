"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getAnthropicClient,
  COACH_MODEL,
} from "@/lib/coach/ai-client";
import {
  buildCatalogAnalysisContext,
  formatCatalogContextForPrompt,
  CATALOG_ANALYZER_SYSTEM_PROMPT,
  VALID_EQUIPMENT_VALUES,
  VALID_MUSCLE_VALUES,
  VALID_PATTERN_VALUES,
} from "@/lib/coach/catalog-analyzer";

// ============================================================
// Orphan cleanup — archive exercises that are not in any template
// AND have never been logged in a workout_set. Soft-delete so FKs
// and historical queries keep working; reversible via is_active=true.
// ============================================================

export type OrphanExercise = {
  id: string;
  name: string;
  primary_muscle: string;
  session_type: "upper" | "lower";
  equipment: string | null;
};

export async function listOrphanExercises(): Promise<OrphanExercise[]> {
  const supabase = await createClient();

  const [exRes, teRes, setsRes] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, name, primary_muscle, session_type, equipment")
      .eq("is_active", true),
    supabase.from("template_exercises").select("exercise_id"),
    supabase
      .from("workout_sets")
      .select("exercise_id")
      .not("exercise_id", "is", null),
  ]);

  const usedIds = new Set<string>();
  for (const row of (teRes.data ?? []) as Array<{
    exercise_id: string | null;
  }>) {
    if (row.exercise_id) usedIds.add(row.exercise_id);
  }
  for (const row of (setsRes.data ?? []) as Array<{
    exercise_id: string | null;
  }>) {
    if (row.exercise_id) usedIds.add(row.exercise_id);
  }

  const exercises = (exRes.data ?? []) as OrphanExercise[];
  return exercises.filter((e) => !usedIds.has(e.id));
}

export async function archiveOrphanExercises(): Promise<
  { ok: true; archived: number } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const orphans = await listOrphanExercises();
  if (orphans.length === 0) return { ok: true, archived: 0 };

  const ids = orphans.map((o) => o.id);
  const { error } = await supabase
    .from("exercises")
    .update({ is_active: false })
    .in("id", ids);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/exercicios");
  revalidatePath("/");
  return { ok: true, archived: orphans.length };
}

// ============================================================
// Gap analyzer — Claude audits the catalog and proposes swaps
// ============================================================

export type GapAlternative = {
  name: string;
  equipment: string;
  movement_pattern: string;
  primary_muscle: string;
  secondary_muscles?: string[];
  session_type: "upper" | "lower";
  rationale: string;
};

export type GapProposal = {
  title: string;
  severity: "high" | "medium" | "low";
  reasoning: string;
  alternatives: GapAlternative[];
};

export type AnalyzeGapsResult =
  | { ok: true; gaps: GapProposal[] }
  | { ok: false; error: string };

function validateAlternative(a: GapAlternative): string | null {
  if (!a?.name?.trim()) return "nome vazio";
  if (!VALID_EQUIPMENT_VALUES.includes(a.equipment as typeof VALID_EQUIPMENT_VALUES[number])) {
    return `equipamento inválido: ${a.equipment}`;
  }
  if (!VALID_MUSCLE_VALUES.includes(a.primary_muscle)) {
    return `músculo inválido: ${a.primary_muscle}`;
  }
  if (!VALID_PATTERN_VALUES.includes(a.movement_pattern)) {
    return `padrão inválido: ${a.movement_pattern}`;
  }
  if (a.session_type !== "upper" && a.session_type !== "lower") {
    return `session_type inválido: ${a.session_type}`;
  }
  return null;
}

/**
 * Ask Claude to identify gaps in the catalog and propose alternatives.
 * Second argument `rejectedNames` lets the UI re-roll a specific gap's
 * alternatives after the user says "none of these work".
 */
export async function analyzeCatalogGaps(
  rejectedNames?: string[]
): Promise<AnalyzeGapsResult> {
  const client = getAnthropicClient();
  if (!client) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY não configurada.",
    };
  }

  const ctx = await buildCatalogAnalysisContext();
  if (ctx.exercises.length === 0) {
    return {
      ok: false,
      error: "Catálogo vazio. Adicione exercícios aos seus templates primeiro.",
    };
  }

  let userMessage = formatCatalogContextForPrompt(ctx);
  if (rejectedNames && rejectedNames.length > 0) {
    userMessage += `\n\n## Exercícios já descartados (não repita nem variações próximas)\n${rejectedNames.map((n) => `- ${n}`).join("\n")}`;
  }

  let raw: string;
  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 3072,
      system: CATALOG_ANALYZER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    raw =
      response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Falha na chamada ao Claude: ${msg}` };
  }

  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: { gaps?: GapProposal[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      ok: false,
      error: `Coach retornou JSON inválido. Raw: ${raw.slice(0, 200)}`,
    };
  }

  const gaps = Array.isArray(parsed.gaps) ? parsed.gaps : [];

  // Filter out any alternative that violates the equipment rules or has
  // invalid enum values. We'd rather silently drop bad picks than crash.
  const validated: GapProposal[] = [];
  for (const g of gaps) {
    if (!g?.title || !Array.isArray(g.alternatives)) continue;
    const alternatives = g.alternatives.filter((a) => {
      const err = validateAlternative(a);
      return err === null;
    });
    if (alternatives.length === 0) continue;
    validated.push({ ...g, alternatives });
  }

  return { ok: true, gaps: validated };
}

// ============================================================
// Approve — persist selected alternatives into the exercises table
// ============================================================

export type ApproveSelection = {
  name: string;
  equipment: string;
  movement_pattern: string;
  primary_muscle: string;
  secondary_muscles?: string[];
  session_type: "upper" | "lower";
};

export async function approveGapSelections(
  selections: ApproveSelection[]
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  if (selections.length === 0) {
    return { ok: true, added: 0 };
  }

  const supabase = await createClient();

  // Re-validate server-side (defensive against tampered input)
  for (const s of selections) {
    const err = validateAlternative({ ...s, rationale: "" });
    if (err !== null) return { ok: false, error: `Seleção inválida: ${err}` };
  }

  // Dedup by name (case-insensitive, trimmed) against existing catalog
  const { data: existing } = await supabase
    .from("exercises")
    .select("id, name")
    .eq("is_active", true);
  const existingNames = new Set(
    ((existing ?? []) as Array<{ name: string }>).map((e) =>
      e.name.trim().toLowerCase()
    )
  );

  const rows = selections
    .filter((s) => !existingNames.has(s.name.trim().toLowerCase()))
    .map((s) => ({
      name: s.name.trim(),
      session_type: s.session_type,
      movement_pattern: s.movement_pattern,
      primary_muscle: s.primary_muscle,
      secondary_muscles: s.secondary_muscles ?? [],
      equipment: s.equipment,
      is_active: true,
      load_increment: 2.5,
    }));

  if (rows.length === 0) {
    return { ok: true, added: 0 };
  }

  const { error } = await supabase.from("exercises").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/exercicios");
  revalidatePath("/");
  return { ok: true, added: rows.length };
}
