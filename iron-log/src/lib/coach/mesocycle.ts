/**
 * Mesocycle helpers — phase generation and volume scaling. PURE module
 * (no side effects, no I/O), safe to import from client components. The
 * server-side query for the active mesocycle lives in `mesocycle-server.ts`.
 *
 * Phase model (Issurin block periodization, RP modern interpretation):
 *
 *   accumulation     — build capacity. Volume ramps from MEV toward MAV.
 *                      RIR target is high (3), focus on quality.
 *   intensification  — hold the volume, push closer to failure (RIR 2 → 1).
 *                      The peak adaptation window.
 *   realization      — back off volume slightly, peak intensity (RIR 1 → 0).
 *                      Test new PRs here.
 *   deload           — drop volume to ~50%, RIR back to 4. Recover.
 */

import { WEEKLY_VOLUME_TARGET } from "@/lib/stats";
import { MUSCLES } from "@/lib/muscles";

export type Phase = "accumulation" | "intensification" | "realization" | "deload";

export const PHASE_LABEL: Record<Phase, string> = {
  accumulation: "Acumulação",
  intensification: "Intensificação",
  realization: "Realização",
  deload: "Deload",
};

export const PHASE_INTENSITY: Record<Phase, string> = {
  accumulation: "RIR 3",
  intensification: "RIR 2 → 1",
  realization: "RIR 1 → 0",
  deload: "RIR 4",
};

/**
 * Allocate phases across N weeks. Bias toward accumulation, with a single
 * realization week and a single deload at the end (when there's room). The
 * intensification phase only appears for blocks of 5+ weeks.
 *
 * Examples (totalWeeks → phases):
 *   3 → [acc, acc, deload]
 *   4 → [acc, acc, real, deload]
 *   5 → [acc, acc, int, real, deload]
 *   6 → [acc, acc, acc, int, real, deload]
 *   7 → [acc, acc, acc, int, int, real, deload]
 *   8 → [acc, acc, acc, acc, int, int, real, deload]
 */
export function generatePhases(totalWeeks: number): Phase[] {
  if (totalWeeks < 3) return Array(totalWeeks).fill("accumulation");
  const phases: Phase[] = [];
  // Always end with: ..., realization (if room), deload
  // Always start with: accumulation block
  // Fill the middle with intensification when room allows
  if (totalWeeks === 3) return ["accumulation", "accumulation", "deload"];
  if (totalWeeks === 4)
    return ["accumulation", "accumulation", "realization", "deload"];

  // 5+ weeks: room for intensification
  const tail: Phase[] = ["realization", "deload"];
  const intCount = totalWeeks <= 6 ? 1 : Math.min(3, totalWeeks - 5);
  const accCount = totalWeeks - intCount - tail.length;
  for (let i = 0; i < accCount; i++) phases.push("accumulation");
  for (let i = 0; i < intCount; i++) phases.push("intensification");
  phases.push(...tail);
  return phases;
}

/**
 * Volume multiplier per phase. For accumulation, the multiplier ramps with
 * the position-within-phase (week 1 = 0.85, last week = 1.15) so consecutive
 * accumulation weeks bring small progressive overload at the volume level.
 */
export function volumeMultiplier(
  phase: Phase,
  weekIndexInPhase: number,
  phaseWeeks: number
): number {
  switch (phase) {
    case "accumulation": {
      if (phaseWeeks <= 1) return 1.0;
      // Ramp 0.85 → 1.15 across the phase
      const t = weekIndexInPhase / (phaseWeeks - 1);
      return 0.85 + 0.3 * t;
    }
    case "intensification":
      return 1.15; // hold high volume
    case "realization":
      return 0.85; // back off vol, peak intensity
    case "deload":
      return 0.5; // reset
  }
}

/**
 * Compute volume targets for a single mesocycle week given the user's base
 * targets (or null = use compile-time defaults) and the phase scaling.
 */
export function computeWeekTargets(
  baseTargets: Record<string, number> | null,
  phase: Phase,
  weekIndexInPhase: number,
  phaseWeeks: number
): Record<string, number> {
  const mult = volumeMultiplier(phase, weekIndexInPhase, phaseWeeks);
  const out: Record<string, number> = {};
  for (const m of MUSCLES) {
    const base =
      baseTargets?.[m.value] ?? WEEKLY_VOLUME_TARGET[m.value] ?? 0;
    if (base === 0) continue;
    out[m.value] = Math.max(1, Math.round(base * mult));
  }
  return out;
}

export type MesocycleRow = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string | null;
  total_weeks: number;
  source: "user" | "coach";
  user_notes: string | null;
  created_at: string;
};

export type MesocycleWeekRow = {
  id: string;
  mesocycle_id: string;
  week_number: number;
  week_starts_on: string;
  phase: Phase;
  volume_targets: Record<string, number> | null;
  intensity_target: string | null;
  coach_reasoning: string | null;
  user_overrode: boolean;
};

export type ActiveMesocycle = {
  mesocycle: MesocycleRow;
  weeks: MesocycleWeekRow[];
  currentWeek: MesocycleWeekRow | null;
  currentWeekNumber: number | null;
};

