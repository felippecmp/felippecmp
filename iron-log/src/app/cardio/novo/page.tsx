import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CardioForm } from "../CardioForm";

export default function NovoCardioPage() {
  return (
    <div className="px-6 pt-10">
      <Link
        href="/cardio"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Cardio
      </Link>
      <header className="mb-8">
        <p className="label mb-2">Novo</p>
        <h1 className="display text-4xl leading-none">Registrar cardio</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
          Entrada manual, sem arquivo do relógio. Se tiver FIT, use o
          botão Upload.
        </p>
      </header>

      <CardioForm mode="create" />
    </div>
  );
}
