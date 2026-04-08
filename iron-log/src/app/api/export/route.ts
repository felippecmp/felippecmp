import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Dump the user's entire training history as a single JSON file. Protected
 * by the existing auth proxy, so no extra check needed here.
 *
 * The file is intentionally a plain structured dump (no wrapping / versioning
 * yet) so you can grep, diff, or re-import it manually if needed.
 */
export async function GET() {
  const supabase = await createClient();

  const [
    exercisesRes,
    templatesRes,
    templateExercisesRes,
    sessionsRes,
    setsRes,
    progressionRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from("exercises").select("*").order("name"),
    supabase.from("workout_templates").select("*").order("name"),
    supabase
      .from("template_exercises")
      .select("*")
      .order("template_id")
      .order("slot_order"),
    supabase
      .from("workout_sessions")
      .select("*")
      .order("started_at", { ascending: false }),
    supabase
      .from("workout_sets")
      .select("*")
      .order("performed_at", { ascending: false }),
    supabase.from("progression_state").select("*"),
    supabase.from("user_settings").select("*").limit(1).maybeSingle(),
  ]);

  const dump = {
    exported_at: new Date().toISOString(),
    app: "felippes-log",
    version: 1,
    data: {
      exercises: exercisesRes.data ?? [],
      workout_templates: templatesRes.data ?? [],
      template_exercises: templateExercisesRes.data ?? [],
      workout_sessions: sessionsRes.data ?? [],
      workout_sets: setsRes.data ?? [],
      progression_state: progressionRes.data ?? [],
      user_settings: settingsRes.data ?? null,
    },
  };

  const body = JSON.stringify(dump, null, 2);
  const filename = `felippes-log-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
