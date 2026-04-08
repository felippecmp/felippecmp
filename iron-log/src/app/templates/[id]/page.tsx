import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TemplateEditor } from "./TemplateEditor";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("workout_templates")
    .select("id, name, session_type")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!template) notFound();

  const { data: templateExercises } = await supabase
    .from("template_exercises")
    .select(
      "id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, exercise_id, exercises(id, name, primary_muscle, equipment, session_type)"
    )
    .eq("template_id", id)
    .order("slot_order", { ascending: true });

  const { data: availableExercises } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle, equipment, session_type")
    .eq("is_active", true)
    .eq("session_type", template.session_type)
    .order("name");

  return (
    <div className="px-6 pt-10">
      <Link
        href="/templates"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Templates
      </Link>

      <TemplateEditor
        template={template}
        templateExercises={(templateExercises ?? []).map((te) => ({
          id: te.id,
          slot_order: te.slot_order,
          target_sets: te.target_sets,
          rep_range_low: te.rep_range_low,
          rep_range_high: te.rep_range_high,
          rest_seconds: te.rest_seconds,
          exercise_id: te.exercise_id,
          exercise: Array.isArray(te.exercises) ? te.exercises[0] : te.exercises,
        }))}
        availableExercises={availableExercises ?? []}
      />
    </div>
  );
}
