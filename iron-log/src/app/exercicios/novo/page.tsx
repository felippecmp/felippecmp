import Link from "next/link";
import { ExerciseForm } from "../ExerciseForm";

export default function NovoExercicioPage() {
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
          Novo Exercício
        </h1>
      </header>

      <ExerciseForm mode="create" />
    </div>
  );
}
