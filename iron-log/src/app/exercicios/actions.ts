"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function parseLoadIncrement(raw: FormDataEntryValue | null): number {
  if (!raw) return 2.5;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 2.5;
}

export async function createExercise(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const session_type = String(formData.get("session_type") ?? "");
  const movement_pattern = String(formData.get("movement_pattern") ?? "");
  const primary_muscle = String(formData.get("primary_muscle") ?? "");
  const equipment = String(formData.get("equipment") ?? "") || null;
  const load_increment = parseLoadIncrement(formData.get("load_increment"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { ok: false, error: "Nome é obrigatório" };
  if (!["upper", "lower"].includes(session_type))
    return { ok: false, error: "Tipo de sessão inválido" };
  if (!movement_pattern)
    return { ok: false, error: "Padrão de movimento obrigatório" };
  if (!primary_muscle)
    return { ok: false, error: "Músculo primário obrigatório" };

  const { error } = await supabase.from("exercises").insert({
    name,
    session_type,
    movement_pattern,
    primary_muscle,
    equipment,
    load_increment,
    notes,
    is_active: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/exercicios");
  revalidatePath("/");
  return { ok: true };
}

export async function updateExercise(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const session_type = String(formData.get("session_type") ?? "");
  const movement_pattern = String(formData.get("movement_pattern") ?? "");
  const primary_muscle = String(formData.get("primary_muscle") ?? "");
  const equipment = String(formData.get("equipment") ?? "") || null;
  const load_increment = parseLoadIncrement(formData.get("load_increment"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { ok: false, error: "Nome é obrigatório" };

  const { error } = await supabase
    .from("exercises")
    .update({
      name,
      session_type,
      movement_pattern,
      primary_muscle,
      equipment,
      load_increment,
      notes,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/exercicios");
  revalidatePath(`/exercicios/${id}`);
  return { ok: true };
}

export async function deleteExercise(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("exercises").delete().eq("id", id);
  revalidatePath("/exercicios");
  revalidatePath("/");
  redirect("/exercicios");
}
