import Link from "next/link";
import { ArrowRight, Calendar, Settings as SettingsIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WEEKDAYS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

function formatHeaderDate(date: Date) {
  const weekday = WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = date.toLocaleDateString("pt-BR", { month: "long" });
  return { weekday, day, month };
}

export default async function HomePage() {
  const supabase = await createClient();

  const { count: exerciseCount } = await supabase
    .from("exercises")
    .select("*", { count: "exact", head: true });

  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, duration_minutes")
    .order("started_at", { ascending: false })
    .limit(5);

  const now = new Date();
  const { weekday, day, month } = formatHeaderDate(now);
  const sessions = recentSessions ?? [];
  const exercisesTotal = exerciseCount ?? 0;
  const firstRun = sessions.length === 0;

  return (
    <div className="px-6 pt-10">
      {/* Header */}
      <header className="mb-10 flex items-start justify-between">
        <div>
          <p className="label mb-2">{weekday}</p>
          <h1 className="display text-[44px] leading-[1.05] tracking-tighter">
            Felippe&apos;s
            <br />
            Log
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-3 tnum">
            {day} de {month}
          </p>
        </div>
        <Link
          href="/settings"
          aria-label="Configurações"
          className="shrink-0 w-10 h-10 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] flex items-center justify-center transition-colors"
        >
          <SettingsIcon size={16} strokeWidth={1.75} />
        </Link>
      </header>

      {/* Primary CTA card */}
      <section className="mb-8">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6">
          <p className="label mb-3">Próximo treino</p>
          {firstRun ? (
            <>
              <h2 className="display-sm text-2xl mb-1">Ainda vazio</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
                Para começar, cadastre seus exercícios, monte um template de
                rotina e inicie sua primeira sessão.
              </p>
              <Link
                href="/exercicios"
                className="group inline-flex items-center gap-2 text-[var(--text)] font-semibold text-sm"
              >
                Configurar exercícios
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </>
          ) : (
            <>
              <h2 className="display-sm text-3xl mb-1">Upper A</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                7 exercícios · aproximadamente 55 minutos
              </p>
              <Link
                href="/treinar"
                className="block w-full text-center bg-[var(--accent)] text-[var(--accent-fg)] font-semibold py-3.5 rounded-xl hover:bg-[var(--accent-hover)] transition-colors"
              >
                Iniciar sessão
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Stats row */}
      <section className="mb-10 grid grid-cols-2 gap-3">
        <StatCard
          label="Exercícios"
          value={exercisesTotal}
          href="/exercicios"
        />
        <StatCard
          label="Sessões"
          value={sessions.length}
          href="/progresso"
          suffix={sessions.length > 0 ? " recentes" : ""}
        />
      </section>

      {/* Recent activity or onboarding checklist */}
      {firstRun ? (
        <section>
          <p className="label mb-4">Primeiros passos</p>
          <ol className="space-y-3">
            <ChecklistItem
              index={1}
              title="Revisar catálogo de exercícios"
              subtitle={`Você tem ${exercisesTotal} cadastrados. Adicione os que faltam.`}
              href="/exercicios"
              complete={exercisesTotal > 0}
            />
            <ChecklistItem
              index={2}
              title="Criar um template de treino"
              subtitle="Organize exercícios em rotinas: Upper A, Lower A..."
              href="/treinar"
              complete={false}
            />
            <ChecklistItem
              index={3}
              title="Registrar primeira sessão"
              subtitle="O histórico e as progressões começam a partir daqui."
              href="/treinar"
              complete={false}
            />
          </ol>
        </section>
      ) : (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <p className="label">Atividade recente</p>
            <Link
              href="/progresso"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Ver tudo
            </Link>
          </div>
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Calendar
                    size={14}
                    className="text-[var(--text-dim)]"
                    strokeWidth={1.75}
                  />
                  <span className="text-sm tnum">
                    {new Date(s.started_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-muted)] tnum">
                  {s.duration_minutes ? `${s.duration_minutes}min` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  suffix = "",
}: {
  label: string;
  value: number;
  href: string;
  suffix?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 hover:border-[var(--border-strong)] transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="label">{label}</p>
        <ArrowRight
          size={14}
          className="text-[var(--text-dim)] group-hover:text-[var(--text-soft)] transition-colors"
          strokeWidth={2}
        />
      </div>
      <div className="display text-4xl tnum">{value}</div>
      {suffix && (
        <div className="text-xs text-[var(--text-muted)] mt-1">{suffix}</div>
      )}
    </Link>
  );
}

function ChecklistItem({
  index,
  title,
  subtitle,
  href,
  complete,
}: {
  index: number;
  title: string;
  subtitle: string;
  href: string;
  complete: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-start gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] hover:border-[var(--border-strong)] transition-colors"
      >
        <div
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold tnum ${
            complete
              ? "bg-[var(--text)] text-[var(--bg)]"
              : "border border-[var(--border-strong)] text-[var(--text-muted)]"
          }`}
        >
          {complete ? "✓" : index}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-0.5">{title}</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {subtitle}
          </p>
        </div>
        <ArrowRight
          size={16}
          className="shrink-0 text-[var(--text-dim)] group-hover:text-[var(--text-soft)] transition-all group-hover:translate-x-0.5 mt-1"
          strokeWidth={1.75}
        />
      </Link>
    </li>
  );
}
