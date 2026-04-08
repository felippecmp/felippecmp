import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Dumbbell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { muscleLabel } from "@/lib/muscles";
import { AbandonSessionButton } from "./AbandonSessionButton";

export const dynamic = "force-dynamic";

type Exercise = {
  id: string;
  name: string;
  primary_muscle: string;
};

type TemplateExerciseRow = {
  id: string;
  slot_order: number;
  target_sets: number;
  rep_range_low: number;
  rep_range_high: number;
  rest_seconds: number;
  exercises: Exercise | Exercise[] | null;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select(
      "id, started_at, finished_at, template_id, workout_templates(id, name, session_type)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!session) notFound();

  const template = Array.isArray(session.workout_templates)
    ? session.workout_templates[0]
    : session.workout_templates;

  const { data: templateExercises } = session.template_id
    ? await supabase
        .from("template_exercises")
        .select(
          "id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, exercises(id, name, primary_muscle)"
        )
        .eq("template_id", session.template_id)
        .order("slot_order", { ascending: true })
    : { data: [] as TemplateExerciseRow[] };

  const exercises = (templateExercises ?? []).map((te) => {
    const ex = Array.isArray(te.exercises) ? te.exercises[0] : te.exercises;
    return {
      id: te.id,
      slot_order: te.slot_order,
      target_sets: te.target_sets,
      rep_range_low: te.rep_range_low,
      rep_range_high: te.rep_range_high,
      rest_seconds: te.rest_seconds,
      exercise: ex as Exercise | null,
    };
  });

  const isFinished = Boolean(session.finished_at);

  return (
    <div className="px-6 pt-10">
      <Link
        href="/treinar"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Treinar
      </Link>

      <header className="mb-8">
        <p className="label mb-2 uppercase">
          {template?.session_type ?? "Sessão"}
        </p>
        <h1 className="display text-4xl leading-none">
          {template?.name ?? "Sessão"}
        </h1>
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-muted)] tnum">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} strokeWidth={1.75} />
            {isFinished ? "Finalizado" : "Iniciado"} {formatTime(session.started_at)}
          </span>
          <span className="text-[var(--text-faint)]">·</span>
          <span>{exercises.length} exercícios</span>
        </div>
      </header>

      {exercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] mb-4">
            <Dumbbell size={18} strokeWidth={1.75} />
          </div>
          <p className="text-sm mb-1 font-semibold">
            Template sem exercícios
          </p>
          <p className="text-[var(--text-muted)] text-xs leading-relaxed max-w-[260px] mx-auto">
            O template usado foi iniciado sem exercícios configurados.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 mb-8">
          {exercises.map((te, idx) => (
            <li
              key={te.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-lg border border-[var(--border)] text-[var(--text-dim)] flex items-center justify-center text-xs tnum font-semibold">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[15px] leading-tight truncate">
                    {te.exercise?.name ?? "Exercício removido"}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-2 tnum">
                    {te.exercise && (
                      <>
                        <span>{muscleLabel(te.exercise.primary_muscle)}</span>
                        <span className="text-[var(--text-faint)]">·</span>
                      </>
                    )}
                    <span>{te.target_sets} sets</span>
                    <span className="text-[var(--text-faint)]">·</span>
                    <span>
                      {te.rep_range_low}-{te.rep_range_high} reps
                    </span>
                    <span className="text-[var(--text-faint)]">·</span>
                    <span>{Math.round(te.rest_seconds / 60)} min rest</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isFinished && (
        <>
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-5 mb-6 text-center">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Registro de sets, timer de descanso e sugestões de carga chegam
              no próximo sprint.
            </p>
          </div>
          <AbandonSessionButton sessionId={session.id} />
        </>
      )}
    </div>
  );
}
