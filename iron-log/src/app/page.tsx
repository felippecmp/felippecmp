import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Peito",
  lats: "Costas",
  front_delts: "Ombro Ant.",
  side_delts: "Ombro Lat.",
  rear_delts: "Ombro Post.",
  biceps: "Bíceps",
  triceps: "Tríceps",
  traps: "Trapézio",
  quads: "Quadríceps",
  hamstrings: "Posterior",
  glutes: "Glúteo",
  calves: "Panturrilha",
  lower_back: "Lombar",
};

const DAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatDate(date: Date) {
  return `${DAYS[date.getDay()]} · ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export default async function HomePage() {
  const supabase = await createClient();

  const { count: exerciseCount } = await supabase
    .from("exercises")
    .select("*", { count: "exact", head: true });

  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, finished_at, duration_minutes, template_id")
    .order("started_at", { ascending: false })
    .limit(5);

  const now = new Date();
  const hasExercises = (exerciseCount ?? 0) > 0;
  const sessions = recentSessions ?? [];

  return (
    <div className="px-5 pt-8">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">
          Felippe&apos;s Log
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1 capitalize">
          {formatDate(now)}
        </p>
      </header>

      {/* Next workout card */}
      <section className="mb-8">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Próximo Treino
        </h2>
        <div className="border border-[var(--border)] bg-[var(--bg-elevated)] rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-2xl font-bold">
                {sessions.length === 0 ? "Primeiro treino" : "Upper A"}
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                {sessions.length === 0
                  ? "Configure seus templates primeiro"
                  : "—"}
              </div>
            </div>
          </div>
          <Link
            href="/treinar"
            className="block w-full text-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-bold py-3 rounded uppercase tracking-wider transition-colors"
          >
            {sessions.length === 0 ? "Ver treinar" : "▶ Iniciar"}
          </Link>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mb-8 grid grid-cols-2 gap-3">
        <Link
          href="/exercicios"
          className="border border-[var(--border)] bg-[var(--bg-elevated)] rounded-lg p-4 hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="text-3xl font-black tabular">
            {exerciseCount ?? 0}
          </div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">
            Exercícios
          </div>
        </Link>
        <Link
          href="/progresso"
          className="border border-[var(--border)] bg-[var(--bg-elevated)] rounded-lg p-4 hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="text-3xl font-black tabular">{sessions.length}</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">
            Sessões recentes
          </div>
        </Link>
      </section>

      {/* Empty state or volume overview */}
      {sessions.length === 0 ? (
        <section className="mb-8 border border-dashed border-[var(--border-strong)] rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">💪</div>
          <h3 className="font-bold mb-1">Nenhum treino ainda</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {hasExercises
              ? "Você tem exercícios cadastrados. Próximo passo: criar templates e iniciar um treino."
              : "Comece cadastrando seus exercícios."}
          </p>
          <Link
            href={hasExercises ? "/treinar" : "/exercicios"}
            className="inline-block border border-[var(--accent)] text-[var(--accent)] font-semibold px-4 py-2 rounded text-sm uppercase tracking-wider hover:bg-[var(--accent)] hover:text-black transition-colors"
          >
            {hasExercises ? "Ir para Treinar" : "Ver exercícios"}
          </Link>
        </section>
      ) : (
        <section className="mb-8">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
            Últimos Treinos
          </h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="border border-[var(--border)] bg-[var(--bg-elevated)] rounded p-3 flex justify-between items-center"
              >
                <span className="text-sm">
                  {new Date(s.started_at).toLocaleDateString("pt-BR")}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {s.duration_minutes ? `${s.duration_minutes} min` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
