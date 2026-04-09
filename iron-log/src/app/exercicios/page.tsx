import Link from "next/link";
import { Plus, ChevronRight, Search } from "lucide-react";
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

export default async function ExerciciosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, session_type, primary_muscle, equipment")
    .eq("is_active", true)
    .order("session_type")
    .order("name");

  const exercises = (data ?? []) as Exercise[];
  const upper = exercises.filter((e) => e.session_type === "upper");
  const lower = exercises.filter((e) => e.session_type === "lower");

  return (
    <div className="px-6 pt-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="label mb-2">Catálogo</p>
          <h1 className="display text-4xl leading-none">Exercícios</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 tnum">
            {exercises.length} ativos
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
          <ExerciseGroup title="Upper" items={upper} />
          <ExerciseGroup title="Lower" items={lower} />
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
