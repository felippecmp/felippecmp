"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function parseWeight(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") return null;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (n <= 0 || n >= 500) return null;
  return Math.round(n * 100) / 100;
}

function parseDate(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  // HTML date input gives YYYY-MM-DD — interpret as local noon so timezone
  // doesn't kick the row into the previous day.
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(
    parseInt(y, 10),
    parseInt(m, 10) - 1,
    parseInt(d, 10),
    12,
    0,
    0
  );
}

function revalidateAllWeightSurfaces() {
  revalidatePath("/");
  revalidatePath("/peso");
  revalidatePath("/progresso");
}

export async function logBodyWeight(formData: FormData): Promise<ActionResult> {
  const weight = parseWeight(formData.get("weight_kg"));
  if (weight === null) {
    return { ok: false, error: "Peso inválido." };
  }
  const date = parseDate(formData.get("recorded_at")) ?? new Date();
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("body_weight_entries").insert({
    weight_kg: weight,
    recorded_at: date.toISOString(),
    notes,
  });

  if (error) return { ok: false, error: error.message };
  revalidateAllWeightSurfaces();
  return { ok: true };
}

export async function updateBodyWeight(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const weight = parseWeight(formData.get("weight_kg"));
  if (weight === null) return { ok: false, error: "Peso inválido." };
  const date = parseDate(formData.get("recorded_at"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  const supabase = await createClient();
  const payload: Record<string, unknown> = {
    weight_kg: weight,
    notes,
  };
  if (date) payload.recorded_at = date.toISOString();

  const { error } = await supabase
    .from("body_weight_entries")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateAllWeightSurfaces();
  return { ok: true };
}

export async function deleteBodyWeight(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("body_weight_entries")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateAllWeightSurfaces();
  return { ok: true };
}
