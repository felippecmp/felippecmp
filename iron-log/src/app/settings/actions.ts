"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function int(
  raw: FormDataEntryValue | null,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof raw !== "string") return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function num(
  raw: FormDataEntryValue | null,
  min: number,
  fallback: number
): number {
  if (typeof raw !== "string") return fallback;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

/**
 * Parse an optional positive-number field. Empty string or invalid → null.
 */
function optionalNum(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n >= 500) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Parse an optional integer field with bounds. Empty string or invalid → null.
 */
function optionalInt(
  raw: FormDataEntryValue | null,
  min: number,
  max: number
): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/**
 * Update (or create) the singleton user_settings row.
 */
export async function updateSettings(
  formData: FormData
): Promise<ActionResult> {
  const payload = {
    default_target_sets: int(formData.get("default_target_sets"), 1, 10, 2),
    default_rep_range_low: int(formData.get("default_rep_range_low"), 1, 30, 4),
    default_rep_range_high: int(formData.get("default_rep_range_high"), 1, 30, 8),
    default_rest_seconds: int(formData.get("default_rest_seconds"), 0, 900, 180),
    default_load_increment: num(formData.get("default_load_increment"), 0.25, 2.5),
    unit: (formData.get("unit") === "lb" ? "lb" : "kg") as "kg" | "lb",
    target_weight_kg: optionalNum(formData.get("target_weight_kg")),
    rotation_mode:
      formData.get("rotation_mode") === "linear" ? "linear" : "auto",
    max_hr: optionalInt(formData.get("max_hr"), 100, 230),
    updated_at: new Date().toISOString(),
  };

  if (payload.default_rep_range_high < payload.default_rep_range_low) {
    return {
      ok: false,
      error: "Rep range max deve ser ≥ min.",
    };
  }

  const supabase = await createClient();

  // Single-row upsert: look up the existing row (without filtering by
  // user_id, since single-user mode has user_id = NULL and NULL != NULL in
  // unique constraints). If nothing's there, insert.
  const { data: existing } = await supabase
    .from("user_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("user_settings")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("user_settings").insert(payload);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/templates");
  revalidatePath("/exercicios/novo");
  revalidatePath("/workout", "layout");
  return { ok: true };
}
