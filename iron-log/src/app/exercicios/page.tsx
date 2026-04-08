import Link from "next/link";
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
    <div className="px-5 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Exercícios</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {exercises.length} cadastrados
          </p>
        </div>
        <Link
          href="/exercicios/novo"
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-bold px-4 py-2 rounded uppercase text-xs tracking-wider"
        >
          + Novo
        </Link>
      </header>

      {error && (
        <div className="border border-[var(--danger)] bg-red-950/40 text-red-300 p-3 rounded text-sm mb-4">
          {error.message}
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="border border-dashed border-[var(--border-strong)] rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-[var(--text-muted)] mb-4">
            Nenhum exercício cadastrado ainda.
          </p>
          <Link
            href="/exercicios/novo"
            className="inline-block bg-[var(--accent)] text-black font-bold px-4 py-2 rounded uppercase text-xs tracking-wider"
          >
            Criar primeiro exercício
          </Link>
        </div>
      ) : (
        <>
          <ExerciseGroup title="Upper" items={upper} />
          <ExerciseGroup title="Lower" items={lower} />
        </>
      )}
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
    <section className="mb-8">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent)] mb-3">
        {title} ({items.length})
      </h2>
      <ul className="space-y-2">
        {items.map((e) => (
          <li key={e.id}>
            <Link
              href={`/exercicios/${e.id}`}
              className="flex items-center justify-between border border-[var(--border)] bg-[var(--bg-elevated)] rounded p-3 hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{e.name}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {muscleLabel(e.primary_muscle)} ·{" "}
                  {equipmentLabel(e.equipment)}
                </div>
              </div>
              <div className="text-[var(--text-dim)] ml-2">›</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
