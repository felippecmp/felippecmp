"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

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

function revalidateRestSurfaces() {
  revalidatePath("/");
  revalidatePath("/progresso");
}

export async function markRestDay(formData: FormData): Promise<ActionResult> {
  const restDate = parseDate(formData.get("rest_date")) ?? todayDateStr();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("rest_days")
    .select("id")
    .eq("rest_date", restDate)
    .maybeSingle();

  if (existing) {
    revalidateRestSurfaces();
    return { ok: true };
  }

  const { error } = await supabase
    .from("rest_days")
    .insert({ rest_date: restDate });
  if (error) return { ok: false, error: error.message };

  revalidateRestSurfaces();
  return { ok: true };
}

export async function unmarkRestDay(restDate: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("rest_days")
    .delete()
    .eq("rest_date", restDate);
  if (error) return { ok: false, error: error.message };
  revalidateRestSurfaces();
  return { ok: true };
}
