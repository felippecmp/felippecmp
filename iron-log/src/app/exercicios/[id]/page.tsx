import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="px-5 pt-8">
      <header className="mb-6">
        <Link
          href="/exercicios"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ← Exercícios
        </Link>
        <h1 className="text-2xl font-black tracking-tight mt-2">
          Editar Exercício
        </h1>
      </header>

      <ExerciseForm mode="edit" exercise={exercise} />

      <div className="mt-8 pt-6 border-t border-[var(--border)]">
        <DeleteButton id={exercise.id} name={exercise.name} />
      </div>
    </div>
  );
}
