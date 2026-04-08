"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Starts a new workout session from a template.
 *
 * If an active (unfinished) session already exists, we redirect to it instead
 * of creating a new one — only one workout at a time.
 */
export async function startSessionFromTemplate(
  templateId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Reuse active session if one exists
  const { data: active } = await supabase
    .from("workout_sessions")
    .select("id")
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) {
    redirect(`/workout/${active.id}`);
  }

  // Verify the template exists and is active
  const { data: template, error: tErr } = await supabase
    .from("workout_templates")
    .select("id")
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle();

  if (tErr) return { ok: false, error: tErr.message };
  if (!template) return { ok: false, error: "Template não encontrado." };

  const { data: session, error: sErr } = await supabase
    .from("workout_sessions")
    .insert({ template_id: templateId })
    .select("id")
    .single();

  if (sErr) return { ok: false, error: sErr.message };

  revalidatePath("/treinar");
  revalidatePath("/");
  redirect(`/workout/${session.id}`);
}

/**
 * Abandons an in-progress session — deletes it entirely. Safe because no sets
 * have been logged yet in this sprint. Later, we may switch to a soft-cancel.
 */
export async function abandonSession(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .is("finished_at", null);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/treinar");
  revalidatePath("/");
  redirect("/treinar");
}
