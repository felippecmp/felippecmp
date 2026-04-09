import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Flame,
  Settings as SettingsIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/streak";
import { QuickWeightAdd } from "./QuickWeightAdd";

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

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

type WeightRow = {
  id: string;
  weight_kg: number | string;
  recorded_at: string;
};

export default async function HomePage() {
  const supabase = await createClient();
  const now = new Date();
  const todayKey = localDayKey(now);

  // Parallel fetches: everything the home page needs
  const [
    { count: exerciseCount },
    { data: recentSessions },
    { data: allFinishedSessions },
    { data: weightRows },
  ] = await Promise.all([
    supabase.from("exercises").select("*", { count: "exact", head: true }),
    supabase
      .from("workout_sessions")
      .select("id, started_at, duration_minutes, workout_templates(name)")
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(5),
    // For streak: only timestamps, no joins. Pull up to ~1 year so best
    // streak is meaningful.
    supabase
      .from("workout_sessions")
      .select("started_at")
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(400),
    supabase
      .from("body_weight_entries")
      .select("id, weight_kg, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(30),
  ]);

  const { weekday, day, month } = formatHeaderDate(now);
  const sessions = recentSessions ?? [];
  const exercisesTotal = exerciseCount ?? 0;
  const firstRun = sessions.length === 0;

  // Streak computation (strength + cardio — cardio lands in Sprint 5f and
  // naturally joins this union once its sessions start getting fetched).
  const strengthTimestamps = (allFinishedSessions ?? []).map(
    (s) => s.started_at as string
  );
  const streak = computeStreak({
    activeTimestamps: strengthTimestamps,
    today: now,
  });

  // Body weight for today (if any) and latest overall
  const weights = (weightRows ?? []) as WeightRow[];
  const todayWeight = weights.find(
    (w) => localDayKey(new Date(w.recorded_at)) === todayKey
  );
  const latestWeight = weights[0];

  return (
    <div className="px-6 pt-10">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between">
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

      {/* Streak line — discreet, above the CTA */}
      {streak.current > 0 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Flame
            size={12}
            strokeWidth={1.75}
            className="text-[var(--status-ready)]"
          />
          <span className="tnum">
            streak {streak.current} {streak.current === 1 ? "dia" : "dias"}
          </span>
          {streak.best > streak.current && (
            <span className="text-[var(--text-dim)] tnum">
              · melhor {streak.best}
            </span>
          )}
          {!streak.todayActive && (
            <span className="text-[var(--text-dim)]">
              · hoje ainda tá em aberto
            </span>
          )}
        </div>
      )}

      {/* Primary CTA card */}
      <section className="mb-6">
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
              <p className="text-sm text-[var(--text-muted)] mb-4">
                A sugestão aparece dentro da tela de treinar.
              </p>
              <Link
                href="/treinar"
                className="block w-full text-center bg-accent text-accent-fg font-semibold py-3.5 rounded-xl hover:bg-accent-hover transition-colors"
              >
                Iniciar sessão
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Body weight line */}
      <section className="mb-8">
        <QuickWeightAdd
          todayWeight={
            todayWeight
              ? {
                  id: todayWeight.id,
                  weightKg: Number(todayWeight.weight_kg),
                  recordedAt: todayWeight.recorded_at,
                }
              : null
          }
          latestWeight={
            !todayWeight && latestWeight
              ? {
                  weightKg: Number(latestWeight.weight_kg),
                  recordedAt: latestWeight.recorded_at,
                }
              : null
          }
        />
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
            {sessions.map((s) => {
              const templateName = Array.isArray(s.workout_templates)
                ? s.workout_templates[0]?.name
                : (s.workout_templates as { name: string } | null)?.name;
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Calendar
                      size={14}
                      className="text-[var(--text-dim)] shrink-0"
                      strokeWidth={1.75}
                    />
                    <span className="text-sm tnum shrink-0">
                      {new Date(s.started_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    {templateName && (
                      <span className="text-xs text-[var(--text-soft)] truncate">
                        · {templateName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] tnum shrink-0">
                    {s.duration_minutes ? `${s.duration_minutes}min` : "—"}
                  </span>
                </li>
              );
            })}
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
