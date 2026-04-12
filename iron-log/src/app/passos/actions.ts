"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function parseSteps(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") return null;
  const n = parseInt(raw.replace(/[.\s]/g, ""), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseDate(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return raw;
}

function todayDateStr(): string {
  // Always user TZ — server is likely UTC and would name "today" wrong.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function revalidateStepsSurfaces() {
  revalidatePath("/");
  revalidatePath("/progresso");
}

export async function logDailySteps(formData: FormData): Promise<ActionResult> {
  const steps = parseSteps(formData.get("steps"));
  if (steps === null) return { ok: false, error: "Quantidade inválida." };
  const stepDate = parseDate(formData.get("step_date")) ?? todayDateStr();

  const supabase = await createClient();

  // One entry per day: check if exists, update or insert.
  const { data: existing } = await supabase
    .from("daily_steps")
    .select("id")
    .eq("step_date", stepDate)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("daily_steps")
      .update({ steps })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("daily_steps")
      .insert({ step_date: stepDate, steps });
    if (error) return { ok: false, error: error.message };
  }

  revalidateStepsSurfaces();
  return { ok: true };
}

export async function deleteDailySteps(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_steps").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateStepsSurfaces();
  return { ok: true };
}
