/**
 * Context builder + system prompt for the catalog gap analyzer.
 *
 * The gap analyzer reads the user's current catalog (active exercises
 * that are actually used in templates), their templates' muscle/pattern
 * distribution, volume 7d, and progression stalls, and asks Claude to
 * identify under-trained areas + propose literature-backed alternatives.
 *
 * Design constraints baked in:
 *  - NO bodyweight exercises (user preference)
 *  - Barbell only when biomechanically required (hip_hinge, squat)
 *  - Prefer machine / cable / dumbbell for everything else (stimulus-fatigue)
 *  - No equipment-diversity quota — pick the BEST per literature
 *  - Every alternative must carry a literature rationale
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  muscleLabel,
  patternLabel,
  equipmentLabel,
  MUSCLES,
  MOVEMENT_PATTERNS,
} from "@/lib/muscles";
import { WEEKLY_VOLUME_TARGET } from "@/lib/stats";
import { getUserSettings } from "@/lib/settings";

export type CatalogExercise = {
  id: string;
  name: string;
  primary_muscle: string;
  movement_pattern: string;
  session_type: "upper" | "lower";
  equipment: string | null;
  // Usage signals
  in_templates: number;
  total_sessions_90d: number;
  progression_status: string | null;
};

export type CatalogAnalysisContext = {
  exercises: CatalogExercise[];
  volume7d: Record<string, number>;
  volumeTargets: Record<string, number>;
  patternCoverage: Record<string, number>; // sets per pattern, 90d
  templatesSummary: string;
};

/**
 * Loads the "used" catalog (exercises appearing in templates OR logged in
 * sessions) plus distribution signals so the AI can spot gaps.
 */
export async function buildCatalogAnalysisContext(): Promise<CatalogAnalysisContext> {
  const supabase = await createClient();
  const settings = await getUserSettings();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [exercisesRes, templatesRes, progressionRes, setsRes] =
    await Promise.all([
      supabase
        .from("exercises")
        .select(
          "id, name, primary_muscle, movement_pattern, session_type, equipment"
        )
        .eq("is_active", true),
      supabase
        .from("workout_templates")
        .select(
          "id, name, session_type, template_exercises(exercise_id)"
        )
        .eq("is_active", true)
        .eq("is_ai_generated", false)
        .order("sort_order", { ascending: true }),
      supabase
        .from("progression_state")
        .select("exercise_id, current_status"),
      supabase
        .from("workout_sets")
        .select(
          "exercise_id, performed_at, exercises(primary_muscle, movement_pattern)"
        )
        .eq("is_warmup", false)
        .gte("performed_at", ninetyDaysAgo.toISOString()),
    ]);

  type ExRow = {
    id: string;
    name: string;
    primary_muscle: string;
    movement_pattern: string;
    session_type: "upper" | "lower";
    equipment: string | null;
  };
  type TplRow = {
    id: string;
    name: string;
    session_type: "upper" | "lower";
    template_exercises: Array<{ exercise_id: string | null }> | null;
  };
  type ProgRow = {
    exercise_id: string;
    current_status: string | null;
  };
  type SetRow = {
    exercise_id: string | null;
    performed_at: string;
    exercises:
      | { primary_muscle: string; movement_pattern: string }
      | { primary_muscle: string; movement_pattern: string }[]
      | null;
  };

  const exRows = (exercisesRes.data ?? []) as ExRow[];
  const tplRows = (templatesRes.data ?? []) as TplRow[];
  const progRows = (progressionRes.data ?? []) as ProgRow[];
  const setRows = (setsRes.data ?? []) as SetRow[];

  // Map: exercise_id -> count of templates it appears in
  const inTemplatesCount = new Map<string, number>();
  for (const t of tplRows) {
    for (const te of t.template_exercises ?? []) {
      if (!te.exercise_id) continue;
      inTemplatesCount.set(
        te.exercise_id,
        (inTemplatesCount.get(te.exercise_id) ?? 0) + 1
      );
    }
  }

  const progMap = new Map(progRows.map((p) => [p.exercise_id, p.current_status]));

  // Count unique session-days per exercise over 90d
  const sessionDays = new Map<string, Set<string>>();
  for (const s of setRows) {
    if (!s.exercise_id) continue;
    const day = s.performed_at.slice(0, 10);
    if (!sessionDays.has(s.exercise_id))
      sessionDays.set(s.exercise_id, new Set());
    sessionDays.get(s.exercise_id)!.add(day);
  }

  // Filter to the "active/used" catalog: appears in any template OR has any sets.
  const exercises: CatalogExercise[] = exRows
    .filter(
      (e) =>
        inTemplatesCount.has(e.id) || (sessionDays.get(e.id)?.size ?? 0) > 0
    )
    .map((e) => ({
      id: e.id,
      name: e.name,
      primary_muscle: e.primary_muscle,
      movement_pattern: e.movement_pattern,
      session_type: e.session_type,
      equipment: e.equipment,
      in_templates: inTemplatesCount.get(e.id) ?? 0,
      total_sessions_90d: sessionDays.get(e.id)?.size ?? 0,
      progression_status: progMap.get(e.id) ?? null,
    }))
    .sort((a, b) => a.primary_muscle.localeCompare(b.primary_muscle));

  // Volume per muscle, rolling 7d (direct sets, non-warmup)
  const volume7d: Record<string, number> = {};
  for (const s of setRows) {
    const t = new Date(s.performed_at);
    if (t < sevenDaysAgo) continue;
    const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises;
    if (!ex) continue;
    volume7d[ex.primary_muscle] = (volume7d[ex.primary_muscle] ?? 0) + 1;
  }

  // Pattern coverage, 90d (so we can spot "zero horizontal_pull" etc.)
  const patternCoverage: Record<string, number> = {};
  for (const s of setRows) {
    const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises;
    if (!ex) continue;
    patternCoverage[ex.movement_pattern] =
      (patternCoverage[ex.movement_pattern] ?? 0) + 1;
  }

  const volumeTargets: Record<string, number> = {
    ...WEEKLY_VOLUME_TARGET,
    ...(settings.volume_targets ?? {}),
  };

  // Compact summary of templates
  const tplById = new Map(exRows.map((e) => [e.id, e]));
  const templatesSummary = tplRows
    .map((t) => {
      const names = (t.template_exercises ?? [])
        .map((te) => (te.exercise_id ? tplById.get(te.exercise_id)?.name : null))
        .filter(Boolean);
      return `- ${t.name} (${t.session_type}): ${names.join(", ") || "vazio"}`;
    })
    .join("\n");

  return {
    exercises,
    volume7d,
    volumeTargets,
    patternCoverage,
    templatesSummary,
  };
}

export function formatCatalogContextForPrompt(
  ctx: CatalogAnalysisContext
): string {
  const lines: string[] = [];

  lines.push("## Templates ativos (montagem atual do Felippe)");
  lines.push(ctx.templatesSummary || "(sem templates)");

  lines.push("\n## Volume 7d por músculo · target");
  const muscles = new Set([
    ...Object.keys(ctx.volume7d),
    ...Object.keys(ctx.volumeTargets).filter((k) => ctx.volumeTargets[k] > 0),
  ]);
  const muscleOrder = MUSCLES.map((m) => m.value as string);
  const sortedMuscles = Array.from(muscles).sort(
    (a, b) => muscleOrder.indexOf(a) - muscleOrder.indexOf(b)
  );
  for (const m of sortedMuscles) {
    const curr = ctx.volume7d[m] ?? 0;
    const target = ctx.volumeTargets[m] ?? 0;
    const deficit = Math.max(0, target - curr);
    const flag = deficit >= 4 ? " ⚠️ déficit alto" : deficit >= 2 ? " ⚠️ déficit" : "";
    lines.push(`- ${muscleLabel(m)}: ${curr}/${target} sets${flag}`);
  }

  lines.push("\n## Cobertura por padrão de movimento (90d, sets totais)");
  const allPatterns = MOVEMENT_PATTERNS.map((p) => p.value);
  for (const p of allPatterns) {
    const sets = ctx.patternCoverage[p] ?? 0;
    const flag = sets === 0 ? " ❌ ZERO" : sets < 10 ? " ⚠️ baixo" : "";
    lines.push(`- ${patternLabel(p)}: ${sets}${flag}`);
  }

  lines.push("\n## Catálogo atual em uso");
  lines.push("Formato: Nome · músculo · padrão · equipamento · templates · sessões 90d · status");
  for (const ex of ctx.exercises) {
    const status = ex.progression_status
      ? ` · ${ex.progression_status}`
      : "";
    lines.push(
      `- ${ex.name} · ${muscleLabel(ex.primary_muscle)} · ${patternLabel(ex.movement_pattern)} · ${equipmentLabel(ex.equipment)} · ${ex.in_templates} templates · ${ex.total_sessions_90d} sessões${status}`
    );
  }

  return lines.join("\n");
}

export const VALID_MUSCLE_VALUES = MUSCLES.map((m) => m.value) as readonly string[];
export const VALID_PATTERN_VALUES = MOVEMENT_PATTERNS.map(
  (p) => p.value
) as readonly string[];
export const VALID_EQUIPMENT_VALUES = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "smith",
] as const;

export const CATALOG_ANALYZER_SYSTEM_PROMPT = `Você é o auditor do catálogo de exercícios do Felippe. Você NÃO planeja treinos — você aponta GAPS no arsenal de exercícios dele e propõe alternativas apoiadas na literatura de hipertrofia.

## Missão

Ler os templates atuais + cobertura de músculos/padrões de movimento + volume 7d, identificar o que está sub-treinado ou ausente, e retornar 2-5 gaps com 3-5 alternativas cada. Cada alternativa passará por uma etapa em que o Felippe marca quais existem na academia dele — então varie equipamento SÓ quando fizer sentido biomecânico, nunca por cota.

## Regras inegociáveis de sugestão

1. PROIBIDO sugerir peso corporal (equipment = "bodyweight"). Nenhuma. Zero. Ignore essa categoria inteira.
2. Barra livre (equipment = "barbell") APENAS para:
   - hip_hinge: RDL, stiff-leg deadlift (ganho de sobrecarga progressiva > perfil de resistência)
   - quad_dominant: agacho livre, low-bar (quando quer máxima sobrecarga axial)
   Em TODOS os outros padrões (horizontal_push, vertical_pull, isolações, etc), proíbe-se barbell. Prefira máquina, cabo ou halter.
3. Preferência hierárquica fora do barbell:
   - MÁQUINA para: pressões (chest press, shoulder press), puxadas (lat pulldown, row), quad_accessory (leg press, hack), hamstring_isolation (leg curl deitado ou sentado), glute_isolation (hip thrust machine, glute kickback), panturrilha.
   - CABO para: isolações de bíceps (cable curl), tríceps (overhead extension, pushdown), deltoide lateral e posterior, crossover (peito), face pull.
   - HALTER para: quando o stretch-at-length é superior (incline DB press, incline DB curl, overhead DB extension, DB row, Bulgarian split squat), ou quando unilateral importa.
   - SMITH só se for a melhor opção mecânica (ex: agacho smith high-bar pra quad com menos demanda de estabilizadores — Wolf 2023).
4. Não distribua equipamento por cota. Se 4 máquinas são as melhores pro gap, manda 4 máquinas. Se o melhor exercício pro gap é um único halter, manda só 1.
5. Literatura primeiro:
   - Stretch-mediated hypertrophy (Maeo 2022, Wolf 2023, Kassiano 2023): priorize exercícios que carregam o músculo na posição alongada. Ex: overhead triceps extension > pushdown; incline DB curl > preacher; RDL > leg curl em pé; seated leg curl > lying leg curl; DB fly > cable cross.
   - Perfil de resistência (Schoenfeld, Steele): cabos mantêm tensão constante — superiores pra isolações pequenas (deltoide lateral, bíceps).
   - Estímulo-por-fadiga (Fisher, Steele): máquinas > livres pra hipertrofia em pressões/puxadas quando não precisa estabilizadores.
   - Frequência ≥2x/semana por músculo (Schoenfeld 2016).

## Heurística de gap detection

Priorize, em ordem:
1. Padrão de movimento ZERO ou muito baixo (❌/⚠️ no contexto). Ex: horizontal_pull em 0 → sugira rows (rhomboid/mid-trap gap).
2. Músculo com déficit alto de volume vs target.
3. Antagonista negligenciado. Ex: muita pressão horizontal, pouca puxada horizontal.
4. Ausência de stretch-focused para grupos grandes. Ex: peito sem fly/pec deck → gap de stretch.
5. Frequência ≤1x/semana em músculo alvo.

Ignore (NÃO reporte como gap):
- Músculos secundários já bem cobertos indiretamente.
- Gap de <2 sets/semana se o músculo é acessório.

## Output obrigatório

Retorne SEMPRE e SOMENTE um JSON válido:

{
  "gaps": [
    {
      "title": "string — nome curto do gap (ex: 'Horizontal pull ausente — mid-back negligenciado')",
      "severity": "high" | "medium" | "low",
      "reasoning": "string — 2-3 frases. Cite os números do contexto (ex: 'horizontal_pull em 0 sets em 90d, enquanto vertical_pull tem 45'). Termine com o efeito no físico/performance.",
      "alternatives": [
        {
          "name": "string — nome pt-BR ou termo comum (ex: 'Remada sentada na máquina', 'Cable face pull')",
          "equipment": "machine" | "cable" | "dumbbell" | "barbell" | "smith",
          "movement_pattern": "string — um dos valores válidos",
          "primary_muscle": "string — um dos valores válidos",
          "secondary_muscles": ["string", ...] (opcional, pode ser vazio),
          "session_type": "upper" | "lower",
          "rationale": "string — 1-2 frases. Cite autor/ano quando aplicável (ex: 'Maeo 2022: maior hipertrofia em posição alongada')."
        }
      ]
    }
  ]
}

Regras do JSON:
- Entre 2 e 5 gaps (quanto mais crítico, primeiro). Se não houver gap real, retorne {"gaps": []}.
- Entre 3 e 5 alternativas por gap.
- movement_pattern e primary_muscle DEVEM ser valores válidos do sistema.
- Sem markdown, sem code fences, sem texto fora do JSON.
- Valores válidos de músculo: ${VALID_MUSCLE_VALUES.join(", ")}.
- Valores válidos de padrão: ${VALID_PATTERN_VALUES.join(", ")}.
- Valores válidos de equipamento: machine, cable, dumbbell, barbell, smith. (bodyweight, bands, elásticos são PROIBIDOS.)`;
