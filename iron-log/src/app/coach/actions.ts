"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/settings";
import {
  computeWeekTargets,
  generatePhases,
  PHASE_INTENSITY,
  type Phase,
} from "@/lib/coach/mesocycle";

export type ActionResult = { ok: true } | { ok: false; error: string };

function parseDate(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function parseInt0(
  raw: FormDataEntryValue | null,
  min: number,
  max: number
): number | null {
  if (typeof raw !== "string") return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function parseStr(raw: FormDataEntryValue | null, maxLen: number): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  return t.slice(0, maxLen);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function revalidateCoachSurfaces() {
  revalidatePath("/coach");
  revalidatePath("/progresso");
  revalidatePath("/");
}

/**
 * Create a fresh mesocycle. Auto-generates the per-week rows with phase
 * assignments and pre-filled volume targets based on the user's global
 * targets (or compile-time defaults).
 */
export async function createMesocycle(formData: FormData): Promise<ActionResult> {
  const name = parseStr(formData.get("name"), 80);
  if (!name) return { ok: false, error: "Nome é obrigatório." };

  const startsOn = parseDate(formData.get("starts_on"));
  if (!startsOn) return { ok: false, error: "Data de início inválida." };

  const totalWeeks = parseInt0(formData.get("total_weeks"), 3, 16);
  if (!totalWeeks) return { ok: false, error: "Duração inválida (3-16)." };

  const userNotes = parseStr(formData.get("user_notes"), 500);

  const supabase = await createClient();
  const settings = await getUserSettings();
  const baseTargets = settings.volume_targets;

  const endsOn = addDaysISO(startsOn, totalWeeks * 7 - 1);

  const { data: mesoRow, error: mesoErr } = await supabase
    .from("mesocycles")
    .insert({
      name,
      starts_on: startsOn,
      ends_on: endsOn,
      total_weeks: totalWeeks,
      source: "user",
      user_notes: userNotes,
    })
    .select("id")
    .single();

  if (mesoErr || !mesoRow) {
    return { ok: false, error: mesoErr?.message ?? "Erro ao criar bloco." };
  }

  // Generate phases + per-week targets in one shot.
  const phases = generatePhases(totalWeeks);

  // Precompute index-within-phase so the volume ramp inside accumulation works.
  const phaseGroups: Array<{
    phase: Phase;
    startIdx: number;
    length: number;
  }> = [];
  let cur: { phase: Phase; startIdx: number; length: number } | null = null;
  phases.forEach((p, i) => {
    if (!cur || cur.phase !== p) {
      if (cur) phaseGroups.push(cur);
      cur = { phase: p, startIdx: i, length: 1 };
    } else {
      cur.length++;
    }
  });
  if (cur) phaseGroups.push(cur);

  const weekRows = phases.map((phase, i) => {
    const group = phaseGroups.find(
      (g) => i >= g.startIdx && i < g.startIdx + g.length
    )!;
    const indexInPhase = i - group.startIdx;
    const targets = computeWeekTargets(
      baseTargets,
      phase,
      indexInPhase,
      group.length
    );
    return {
      mesocycle_id: mesoRow.id,
      week_number: i + 1,
      week_starts_on: addDaysISO(startsOn, i * 7),
      phase,
      volume_targets: targets,
      intensity_target: PHASE_INTENSITY[phase],
      coach_reasoning: null,
      user_overrode: false,
    };
  });

  const { error: weeksErr } = await supabase
    .from("mesocycle_weeks")
    .insert(weekRows);

  if (weeksErr) {
    // Roll back the parent so we don't leave an orphan mesocycle.
    await supabase.from("mesocycles").delete().eq("id", mesoRow.id);
    return { ok: false, error: weeksErr.message };
  }

  revalidateCoachSurfaces();
  return { ok: true };
}

/**
 * Update a single week's targets and/or phase. Marks user_overrode = true.
 */
export async function updateMesocycleWeek(
  weekId: string,
  updates: {
    volume_targets?: Record<string, number>;
    phase?: Phase;
    intensity_target?: string | null;
  }
): Promise<ActionResult> {
  const payload: Record<string, unknown> = { user_overrode: true };
  if (updates.volume_targets !== undefined)
    payload.volume_targets = updates.volume_targets;
  if (updates.phase !== undefined) payload.phase = updates.phase;
  if (updates.intensity_target !== undefined)
    payload.intensity_target = updates.intensity_target;

  const supabase = await createClient();
  const { error } = await supabase
    .from("mesocycle_weeks")
    .update(payload)
    .eq("id", weekId);
  if (error) return { ok: false, error: error.message };

  revalidateCoachSurfaces();
  return { ok: true };
}

/**
 * Hard delete a mesocycle (and its weeks, via cascade). Used by the
 * "encerrar bloco" button when the user wants to drop a plan entirely.
 */
export async function deleteMesocycle(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("mesocycles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateCoachSurfaces();
  return { ok: true };
}

/**
 * Close a block early — set ends_on to today so it stops being "active" but
 * the history is preserved.
 */
export async function closeMesocycleEarly(id: string): Promise<ActionResult> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { error } = await supabase
    .from("mesocycles")
    .update({ ends_on: today })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateCoachSurfaces();
  return { ok: true };
}
