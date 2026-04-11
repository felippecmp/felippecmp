import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getActiveMesocycle } from "@/lib/coach/mesocycle-server";
import { CoachBlockView } from "./CoachBlockView";
import { CreateBlockForm } from "./CreateBlockForm";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const active = await getActiveMesocycle();

  return (
    <div className="px-6 pt-10 pb-24">
      <Link
        href="/mais"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Mais
      </Link>

      <header className="mb-6">
        <p className="label mb-2">Coach</p>
        <h1 className="display text-3xl leading-tight">Periodização</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
          Bloco de treino estruturado em fases. Volume e intensidade rampam
          conforme a literatura — você decide quando começar e termina, e
          pode editar qualquer semana.
        </p>
      </header>

      {active ? (
        <CoachBlockView active={active} />
      ) : (
        <CreateBlockForm />
      )}
    </div>
  );
}
