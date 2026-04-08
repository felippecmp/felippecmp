export const MUSCLES = [
  { value: "chest", label: "Peito" },
  { value: "lats", label: "Costas (Dorsais)" },
  { value: "traps", label: "Trapézio" },
  { value: "front_delts", label: "Ombro Anterior" },
  { value: "side_delts", label: "Ombro Lateral" },
  { value: "rear_delts", label: "Ombro Posterior" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "forearms", label: "Antebraço" },
  { value: "abs", label: "Abdômen" },
  { value: "quads", label: "Quadríceps" },
  { value: "hamstrings", label: "Posterior de coxa" },
  { value: "glutes", label: "Glúteo" },
  { value: "calves", label: "Panturrilha" },
  { value: "lower_back", label: "Lombar" },
] as const;

export const MOVEMENT_PATTERNS = [
  { value: "horizontal_push", label: "Empurrar Horizontal", session: "upper" },
  { value: "horizontal_pull", label: "Puxar Horizontal", session: "upper" },
  { value: "vertical_push", label: "Empurrar Vertical", session: "upper" },
  { value: "vertical_pull", label: "Puxar Vertical", session: "upper" },
  { value: "biceps_isolation", label: "Bíceps Isolado", session: "upper" },
  { value: "triceps_isolation", label: "Tríceps Isolado", session: "upper" },
  { value: "side_delt_isolation", label: "Deltóide Lateral", session: "upper" },
  { value: "rear_delt_isolation", label: "Deltóide Posterior", session: "upper" },
  { value: "quad_dominant", label: "Quadríceps Dominante", session: "lower" },
  { value: "quad_accessory", label: "Quadríceps Acessório", session: "lower" },
  { value: "hip_hinge", label: "Dobradiça de Quadril", session: "lower" },
  { value: "hamstring_isolation", label: "Hamstring Isolado", session: "lower" },
  { value: "glute_isolation", label: "Glúteo Isolado", session: "lower" },
  { value: "calf", label: "Panturrilha", session: "lower" },
  { value: "core", label: "Core", session: "lower" },
] as const;

export const EQUIPMENT = [
  { value: "barbell", label: "Barra" },
  { value: "dumbbell", label: "Halteres" },
  { value: "cable", label: "Cabo / Polia" },
  { value: "machine", label: "Máquina" },
  { value: "bodyweight", label: "Peso do corpo" },
  { value: "smith", label: "Smith" },
  { value: "bands", label: "Elástico" },
] as const;

export function muscleLabel(value: string): string {
  return MUSCLES.find((m) => m.value === value)?.label ?? value;
}

export function equipmentLabel(value: string | null): string {
  if (!value) return "—";
  return EQUIPMENT.find((e) => e.value === value)?.label ?? value;
}

export function patternLabel(value: string): string {
  return MOVEMENT_PATTERNS.find((p) => p.value === value)?.label ?? value;
}
