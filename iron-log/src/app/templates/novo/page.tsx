import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewTemplateForm } from "./NewTemplateForm";

export default function NovoTemplatePage() {
  return (
    <div className="px-6 pt-10">
      <Link
        href="/templates"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Templates
      </Link>
      <header className="mb-8">
        <p className="label mb-2">Novo</p>
        <h1 className="display text-4xl leading-none">Criar template</h1>
        <p className="text-sm text-[var(--text-muted)] mt-3 leading-relaxed">
          Dê um nome curto (ex: Upper A) e escolha o tipo. Você adiciona os
          exercícios na próxima tela.
        </p>
      </header>

      <NewTemplateForm />
    </div>
  );
}
