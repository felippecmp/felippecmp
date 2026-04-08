import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ExerciseForm } from "../ExerciseForm";

export default function NovoExercicioPage() {
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
        <p className="label mb-2">Novo</p>
        <h1 className="display text-4xl leading-none">Criar exercício</h1>
      </header>

      <ExerciseForm mode="create" />
    </div>
  );
}
