import { createClient } from "@/lib/supabase/server";

export type Unit = "kg" | "lb";

export type UserSettings = {
  id: string | null;
  default_target_sets: number;
  default_rep_range_low: number;
  default_rep_range_high: number;
  default_rest_seconds: number;
  default_load_increment: number;
  unit: Unit;
};

/**
 * Compile-time fallback used when the settings row doesn't exist yet (first
 * run, before the user visits /settings). Kept in sync with the CHECK
 * constraints and DEFAULT values in migration 003.
 */
export const DEFAULT_SETTINGS: UserSettings = {
  id: null,
  default_target_sets: 2,
  default_rep_range_low: 4,
  default_rep_range_high: 8,
  default_rest_seconds: 180,
  default_load_increment: 2.5,
  unit: "kg",
};

type SettingsRow = {
  id: string;
  default_target_sets: number;
  default_rep_range_low: number;
  default_rep_range_high: number;
  default_rest_seconds: number;
  default_load_increment: number | string;
  unit: Unit;
};

/**
 * Fetch the (single) user_settings row, or return the compile-time defaults
 * when none exists yet. Swallows errors so callers can use it as a prefill
 * source without caring about DB state.
 */
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("user_settings")
      .select(
        "id, default_target_sets, default_rep_range_low, default_rep_range_high, default_rest_seconds, default_load_increment, unit"
      )
      .limit(1)
      .maybeSingle();

    if (!data) return DEFAULT_SETTINGS;
    const row = data as SettingsRow;
    return {
      id: row.id,
      default_target_sets: row.default_target_sets,
      default_rep_range_low: row.default_rep_range_low,
      default_rep_range_high: row.default_rep_range_high,
      default_rest_seconds: row.default_rest_seconds,
      default_load_increment: Number(row.default_load_increment),
      unit: row.unit,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
