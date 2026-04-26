import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTemplateProgression } from "@/lib/template-progression";
import { TemplateEditor } from "./TemplateEditor";
import { TemplateHistory } from "./TemplateHistory";

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
      "id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, machine, exercise_id, exercises(id, name, primary_muscle, equipment, session_type)"
    )
    .eq("template_id", id)
    .order("slot_order", { ascending: true });

  const { data: availableExercises } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle, equipment, session_type")
    .eq("is_active", true)
    .eq("session_type", template.session_type)
    .order("name");

  const progression = await getTemplateProgression(id);

  // Machine autocomplete: for each exercise in this template, surface
  // every distinct machine value the user has ever used (from past
  // template slots OR logged sets). Single batch query — buckets the
  // results by exercise_id client-side.
  const exerciseIds = (templateExercises ?? [])
    .map((te) => te.exercise_id)
    .filter((v): v is string => v !== null);
  const machineSuggestions: Record<string, string[]> = {};
  if (exerciseIds.length > 0) {
    const [{ data: tpl }, { data: sets }] = await Promise.all([
      supabase
        .from("template_exercises")
        .select("exercise_id, machine")
        .in("exercise_id", exerciseIds)
        .not("machine", "is", null),
      supabase
        .from("workout_sets")
        .select("exercise_id, machine")
        .in("exercise_id", exerciseIds)
        .not("machine", "is", null),
    ]);
    type Row = { exercise_id: string | null; machine: string | null };
    const seen = new Map<string, Set<string>>();
    for (const row of [...((tpl ?? []) as Row[]), ...((sets ?? []) as Row[])]) {
      if (!row.exercise_id || !row.machine) continue;
      const bucket = seen.get(row.exercise_id) ?? new Set<string>();
      bucket.add(row.machine);
      seen.set(row.exercise_id, bucket);
    }
    for (const [exId, set] of seen) {
      machineSuggestions[exId] = Array.from(set).sort((a, b) =>
        a.localeCompare(b)
      );
    }
  }

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
          machine: te.machine ?? null,
          exercise_id: te.exercise_id,
          exercise: Array.isArray(te.exercises) ? te.exercises[0] : te.exercises,
        }))}
        availableExercises={availableExercises ?? []}
        machineSuggestions={machineSuggestions}
      />

      <TemplateHistory progression={progression} />
    </div>
  );
}
