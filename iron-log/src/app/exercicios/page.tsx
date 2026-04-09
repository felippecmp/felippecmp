import Link from "next/link";
import { BarChart3, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { muscleLabel, equipmentLabel } from "@/lib/muscles";

export const dynamic = "force-dynamic";

type Exercise = {
  id: string;
  name: string;
  session_type: "upper" | "lower";
  primary_muscle: string;
  equipment: string | null;
};

type SetCountRow = {
  exercise_id: string | null;
  session_id: string;
  performed_at: string;
};

type UsageEntry = {
  exerciseId: string;
  totalSets: number;
  sessionIds: Set<string>;
  lastPerformedAt: string;
};

export default async function ExerciciosPage() {
  const supabase = await createClient();

  const [catalogRes, setsRes] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, name, session_type, primary_muscle, equipment")
      .eq("is_active", true)
      .order("session_type")
      .order("name"),
    supabase
      .from("workout_sets")
      .select("exercise_id, session_id, performed_at")
      .eq("is_warmup", false)
      .order("performed_at", { ascending: false })
      .limit(5000),
  ]);

  const exercises = (catalogRes.data ?? []) as Exercise[];
  const allSets = (setsRes.data ?? []) as SetCountRow[];

  // Aggregate usage stats per exercise id.
  const usageMap = new Map<string, UsageEntry>();
  for (const s of allSets) {
    if (!s.exercise_id) continue;
    const entry = usageMap.get(s.exercise_id);
    if (entry) {
      entry.totalSets += 1;
      entry.sessionIds.add(s.session_id);
      if (new Date(s.performed_at) > new Date(entry.lastPerformedAt)) {
        entry.lastPerformedAt = s.performed_at;
      }
    } else {
      usageMap.set(s.exercise_id, {
        exerciseId: s.exercise_id,
        totalSets: 1,
        sessionIds: new Set([s.session_id]),
        lastPerformedAt: s.performed_at,
      });
    }
  }

  // Build the "Usados" list: only exercises that have usage.
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const usedRows = Array.from(usageMap.values())
    .map((u) => {
      const ex = byId.get(u.exerciseId);
      if (!ex) return null;
      return {
        exercise: ex,
        totalSets: u.totalSets,
        totalSessions: u.sessionIds.size,
        lastPerformedAt: u.lastPerformedAt,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => {
      // Sort by sessions desc, tiebreak by total sets desc
      if (b.totalSessions !== a.totalSessions) {
        return b.totalSessions - a.totalSessions;
      }
      return b.totalSets - a.totalSets;
    });

  const upper = exercises.filter((e) => e.session_type === "upper");
  const lower = exercises.filter((e) => e.session_type === "lower");
  const error = catalogRes.error;

  return (
    <div className="px-6 pt-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="label mb-2">Catálogo</p>
          <h1 className="display text-4xl leading-none">Exercícios</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 tnum">
            {exercises.length} ativos
            {usedRows.length > 0 && (
              <>
                <span className="text-[var(--text-faint)]"> · </span>
                {usedRows.length} usados
              </>
            )}
          </p>
        </div>
        <Link
          href="/exercicios/novo"
          aria-label="Novo exercício"
          className="shrink-0 w-11 h-11 rounded-full bg-accent text-accent-fg flex items-center justify-center hover:bg-accent-hover transition-colors"
        >
          <Plus size={20} strokeWidth={2.5} />
        </Link>
      </header>

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-red-950/20 text-red-300 p-4 text-sm mb-6">
          {error.message}
        </div>
      )}

      {exercises.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {usedRows.length > 0 && (
            <section className="mb-10">
              <div className="flex items-baseline justify-between mb-3">
                <p className="label">Usados</p>
                <span className="text-[10px] text-[var(--text-dim)] tnum tracking-wider">
                  {usedRows.length.toString().padStart(2, "0")}
                </span>
              </div>
              <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
                {usedRows.map((row) => (
                  <li key={row.exercise.id}>
                    <Link
                      href={`/progresso/exercicio/${row.exercise.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[15px] leading-tight truncate">
                          {row.exercise.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1 tnum flex items-center gap-2 flex-wrap">
                          <span>{muscleLabel(row.exercise.primary_muscle)}</span>
                          <span className="text-[var(--text-faint)]">·</span>
                          <span>{row.totalSets} sets</span>
                          <span className="text-[var(--text-faint)]">·</span>
                          <span>
                            {row.totalSessions}{" "}
                            {row.totalSessions === 1 ? "sessão" : "sessões"}
                          </span>
                          <span className="text-[var(--text-faint)]">·</span>
                          <span>últ. {formatDaysAgo(row.lastPerformedAt)}</span>
                        </div>
                      </div>
                      <BarChart3
                        size={14}
                        strokeWidth={1.75}
                        className="shrink-0 text-[var(--text-dim)]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-[var(--text-dim)] mt-2 px-1 leading-relaxed">
                Tap pra ver a curva de peso, 1RM estimado e histórico
                completo por sessão.
              </p>
            </section>
          )}

          <ExerciseGroup title="Catálogo · Upper" items={upper} />
          <ExerciseGroup title="Catálogo · Lower" items={lower} />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
      <p className="text-[var(--text-muted)] text-sm mb-6">
        Nenhum exercício cadastrado.
      </p>
      <Link
        href="/exercicios/novo"
        className="inline-flex items-center gap-2 bg-accent text-accent-fg font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-accent-hover transition-colors"
      >
        <Plus size={16} strokeWidth={2.5} />
        Criar primeiro
      </Link>
    </div>
  );
}

function ExerciseGroup({
  title,
  items,
}: {
  title: string;
  items: Exercise[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <p className="label">{title}</p>
        <span className="text-[10px] text-[var(--text-dim)] tnum tracking-wider">
          {items.length.toString().padStart(2, "0")}
        </span>
      </div>
      <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
        {items.map((e) => (
          <li key={e.id}>
            <Link
              href={`/exercicios/${e.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[15px] leading-tight truncate">
                  {e.name}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-2">
                  <span>{muscleLabel(e.primary_muscle)}</span>
                  <span className="text-[var(--text-faint)]">·</span>
                  <span>{equipmentLabel(e.equipment)}</span>
                </div>
              </div>
              <ChevronRight
                size={16}
                className="shrink-0 text-[var(--text-dim)]"
                strokeWidth={1.75}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDaysAgo(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.floor((now.getTime() - then.getTime()) / msPerDay);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}m`;
}
