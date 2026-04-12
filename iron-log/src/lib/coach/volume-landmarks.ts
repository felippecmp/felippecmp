/**
 * Weekly set volume landmarks per primary muscle group.
 *
 * Numbers are from Renaissance Periodization (Mike Israetel, James Hoffmann,
 * Jared Feather) — the most cited individualized volume framework in modern
 * strength science. Values represent direct working sets per week, RIR 0-3.
 *
 * MV  — Maintenance Volume: minimum to not regress
 * MEV — Minimum Effective Volume: minimum to grow
 * MAV — Maximum Adaptive Volume: productive zone (range)
 * MRV — Maximum Recoverable Volume: ceiling, beyond which you regress
 *
 * Some muscles (traps, front delts, glutes) have very low MV because they
 * receive significant indirect work from compound lifts (deadlifts, OHP,
 * squats). Forearms, abs and lower back have minimal direct landmarks
 * because they're rarely the limiting factor on direct volume.
 *
 * The "muscle" key matches the values in src/lib/muscles.ts. Anything
 * missing falls back to undefined and the insights engine treats it as
 * untracked.
 */

export type VolumeLandmark = {
  mv: number;
  mev: number;
  mav: [number, number];
  mrv: number;
};

export const VOLUME_LANDMARKS: Record<string, VolumeLandmark> = {
  chest: { mv: 6, mev: 10, mav: [12, 20], mrv: 22 },
  lats: { mv: 8, mev: 12, mav: [14, 22], mrv: 25 },
  traps: { mv: 0, mev: 4, mav: [4, 12], mrv: 16 },
  front_delts: { mv: 0, mev: 6, mav: [6, 12], mrv: 16 },
  side_delts: { mv: 8, mev: 10, mav: [12, 20], mrv: 24 },
  rear_delts: { mv: 0, mev: 8, mav: [10, 18], mrv: 22 },
  biceps: { mv: 5, mev: 8, mav: [12, 20], mrv: 24 },
  triceps: { mv: 4, mev: 6, mav: [10, 18], mrv: 22 },
  forearms: { mv: 0, mev: 2, mav: [2, 6], mrv: 8 },
  abs: { mv: 0, mev: 0, mav: [0, 25], mrv: 25 },
  quads: { mv: 6, mev: 8, mav: [10, 18], mrv: 20 },
  hamstrings: { mv: 4, mev: 6, mav: [8, 16], mrv: 20 },
  glutes: { mv: 0, mev: 4, mav: [6, 12], mrv: 16 },
  adductors: { mv: 0, mev: 4, mav: [4, 10], mrv: 14 },
  abductors: { mv: 0, mev: 4, mav: [4, 10], mrv: 14 },
  calves: { mv: 6, mev: 8, mav: [8, 16], mrv: 20 },
  lower_back: { mv: 0, mev: 0, mav: [0, 12], mrv: 12 },
};

export type VolumeZone =
  | "below_mv"
  | "maintenance"
  | "productive_low"
  | "productive_high"
  | "above_mrv";

/**
 * Classify a weekly set count against the muscle's landmarks.
 *
 *  below_mv         < MV  → losing ground
 *  maintenance      MV..MEV → not growing, just maintaining
 *  productive_low   MEV..MAV.0 → effective floor, building
 *  productive_high  MAV → MRV → high but recoverable, peak adaptation
 *  above_mrv        > MRV → diminishing returns, regression risk
 */
export function classifyVolumeZone(
  sets: number,
  landmark: VolumeLandmark
): VolumeZone {
  if (sets < landmark.mv) return "below_mv";
  if (sets < landmark.mev) return "maintenance";
  if (sets < landmark.mav[1]) return "productive_low";
  if (sets <= landmark.mrv) return "productive_high";
  return "above_mrv";
}

export function landmarkFor(muscle: string): VolumeLandmark | null {
  return VOLUME_LANDMARKS[muscle] ?? null;
}
