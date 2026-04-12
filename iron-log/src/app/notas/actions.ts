"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function parseBody(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 500) return trimmed.slice(0, 500);
  return trimmed;
}

function parseDate(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
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

function revalidateNoteSurfaces() {
  revalidatePath("/");
}

export async function saveDailyNote(formData: FormData): Promise<ActionResult> {
  const body = parseBody(formData.get("body"));
  if (body === null) return { ok: false, error: "Escreve alguma coisa." };
  const noteDate = parseDate(formData.get("note_date")) ?? todayDateStr();

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("daily_notes")
    .select("id")
    .eq("note_date", noteDate)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("daily_notes")
      .update({ body, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("daily_notes")
      .insert({ note_date: noteDate, body });
    if (error) return { ok: false, error: error.message };
  }

  revalidateNoteSurfaces();
  return { ok: true };
}

export async function deleteDailyNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_notes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateNoteSurfaces();
  return { ok: true };
}
