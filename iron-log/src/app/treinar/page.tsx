import Link from "next/link";

export default function TreinarPage() {
  return (
    <div className="px-5 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Treinar</h1>
      </header>

      <div className="border border-dashed border-[var(--border-strong)] rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">🚧</div>
        <h2 className="font-bold mb-2">Em construção</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Próxima fase: criar templates de treino (Upper A, Upper B, Lower A
          etc.), iniciar sessão, registrar sets com peso + reps + RIR, rest
          timer automático e finalizar com feedback.
        </p>
        <Link
          href="/exercicios"
          className="inline-block border border-[var(--accent)] text-[var(--accent)] font-semibold px-4 py-2 rounded text-sm uppercase tracking-wider hover:bg-[var(--accent)] hover:text-black transition-colors"
        >
          Gerenciar exercícios
        </Link>
      </div>
    </div>
  );
}
