import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CardioFitUpload } from "./CardioFitUpload";

export default function UploadCardioPage() {
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
        <p className="label mb-2">Upload</p>
        <h1 className="display text-4xl leading-none">Arquivo FIT</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
          Exporte uma atividade do Coros / Garmin e selecione o{" "}
          <code className="tnum text-[var(--text-soft)]">.fit</code> aqui.
          O app extrai tipo, duração, distância, HR e calorias e cria a
          sessão automaticamente.
        </p>
      </header>

      <CardioFitUpload />
    </div>
  );
}
