import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Exercise = {
  id: string;
  name: string;
  session_type: string;
  primary_muscle: string;
  equipment: string | null;
};

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, session_type, primary_muscle, equipment")
    .order("session_type")
    .order("name");

  const exercises = (data ?? []) as Exercise[];
  const upper = exercises.filter((e) => e.session_type === "upper");
  const lower = exercises.filter((e) => e.session_type === "lower");

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-10 border-b border-neutral-800 pb-6">
          <h1 className="text-4xl font-black tracking-tight">
            Felippe&apos;s Log
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Upper / Lower · Double Progression 4-8
          </p>
        </header>

        {error && (
          <div className="border border-red-900 bg-red-950/50 text-red-300 p-4 rounded mb-6 text-sm">
            <strong>Erro ao conectar no Supabase:</strong>
            <div className="mt-1 font-mono text-xs">{error.message}</div>
            <div className="mt-2 text-red-400">
              Rode as migrations em <code>supabase/migrations/</code>.
            </div>
          </div>
        )}

        {!error && exercises.length === 0 && (
          <div className="border border-amber-900 bg-amber-950/50 text-amber-300 p-4 rounded mb-6 text-sm">
            Conectado ao Supabase, mas nenhum exercício encontrado. Rode{" "}
            <code>002_seed_exercises.sql</code>.
          </div>
        )}

        {exercises.length > 0 && (
          <>
            <div className="mb-8 p-4 border border-emerald-900 bg-emerald-950/40 text-emerald-300 rounded text-sm">
              ✅ Conectado ao Supabase — {exercises.length} exercícios
              carregados.
            </div>

            <section className="mb-10">
              <h2 className="text-xl font-bold uppercase tracking-wider text-amber-500 mb-3">
                Upper ({upper.length})
              </h2>
              <ul className="space-y-2">
                {upper.map((e) => (
                  <li
                    key={e.id}
                    className="flex justify-between items-center border border-neutral-800 bg-neutral-900 p-3 rounded"
                  >
                    <span className="font-medium">{e.name}</span>
                    <span className="text-xs text-neutral-500 uppercase">
                      {e.primary_muscle}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold uppercase tracking-wider text-amber-500 mb-3">
                Lower ({lower.length})
              </h2>
              <ul className="space-y-2">
                {lower.map((e) => (
                  <li
                    key={e.id}
                    className="flex justify-between items-center border border-neutral-800 bg-neutral-900 p-3 rounded"
                  >
                    <span className="font-medium">{e.name}</span>
                    <span className="text-xs text-neutral-500 uppercase">
                      {e.primary_muscle}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <footer className="mt-16 pt-6 border-t border-neutral-800 text-xs text-neutral-600">
          Fase 1 — Foundation · próximo: templates + input de sets
        </footer>
      </div>
    </main>
  );
}
