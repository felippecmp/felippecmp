import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ExerciseForm } from "../ExerciseForm";
import { DeleteButton } from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function EditExercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!exercise) notFound();

  return (
    <div className="px-6 pt-10">
      <Link
        href="/exercicios"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Exercícios
      </Link>
      <header className="mb-8">
        <p className="label mb-2">Editar</p>
        <h1 className="display text-3xl leading-tight">{exercise.name}</h1>
      </header>

      <ExerciseForm mode="edit" exercise={exercise} />

      <div className="mt-10 pt-6 border-t border-[var(--border)]">
        <DeleteButton id={exercise.id} name={exercise.name} />
      </div>
    </div>
  );
}
