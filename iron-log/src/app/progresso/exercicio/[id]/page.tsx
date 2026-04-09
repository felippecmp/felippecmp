import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { equipmentLabel, muscleLabel } from "@/lib/muscles";
import { epley1RM } from "@/lib/stats";
import { WeightChart } from "./WeightChart";

export const dynamic = "force-dynamic";

type SetRow = {
  id: string;
  session_id: string;
  weight_kg: number | string;
  reps: number;
  rir: number | null;
  performed_at: string;
};

type SessionPoint = {
  sessionId: string;
  date: string; // ISO
  maxWeight: number;
  topRepsAtMax: number;
  bestEpley: number;
  sets: Array<{ weight: number; reps: number; rir: number | null }>;
};

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle, equipment, load_increment")
    .eq("id", id)
    .maybeSingle();

  if (!exercise) notFound();

  const { data: setsData } = await supabase
    .from("workout_sets")
    .select("id, session_id, weight_kg, reps, rir, performed_at")
    .eq("exercise_id", id)
    .eq("is_warmup", false)
    .order("performed_at", { ascending: true });

  const sets = (setsData ?? []) as SetRow[];

  // Group by session
  const bySession = new Map<string, SessionPoint>();
  for (const s of sets) {
    const weight = Number(s.weight_kg);
    const reps = s.reps;
    const point = bySession.get(s.session_id);
    if (!point) {
      bySession.set(s.session_id, {
        sessionId: s.session_id,
        date: s.performed_at,
        maxWeight: weight,
        topRepsAtMax: reps,
        bestEpley: epley1RM(weight, reps),
        sets: [{ weight, reps, rir: s.rir }],
      });
    } else {
      point.sets.push({ weight, reps, rir: s.rir });
      if (weight > point.maxWeight) {
        point.maxWeight = weight;
        point.topRepsAtMax = reps;
      } else if (weight === point.maxWeight && reps > point.topRepsAtMax) {
        point.topRepsAtMax = reps;
      }
      const epley = epley1RM(weight, reps);
      if (epley > point.bestEpley) point.bestEpley = epley;
      // Keep earliest date per session (same thing for all sets of a session,
      // but safer to not overwrite).
      if (new Date(s.performed_at) < new Date(point.date)) {
        point.date = s.performed_at;
      }
    }
  }

  const timeline = Array.from(bySession.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const reversedTimeline = [...timeline].reverse();

  // Best ever
  const allTimeBest = timeline.reduce<{
    weight: number;
    reps: number;
  } | null>((best, point) => {
    for (const s of point.sets) {
      if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
        return { weight: s.weight, reps: s.reps };
      }
    }
    return best;
  }, null);

  const best1RM = timeline.reduce(
    (max, p) => Math.max(max, p.bestEpley),
    0
  );

  return (
    <div className="px-6 pt-10">
      <Link
        href="/progresso"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Progresso
      </Link>

      <header className="mb-8">
        <p className="label mb-2">{muscleLabel(exercise.primary_muscle)}</p>
        <h1 className="display text-3xl leading-tight">{exercise.name}</h1>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
          <p className="text-xs text-[var(--text-muted)] tnum">
            {equipmentLabel(exercise.equipment)} · incremento{" "}
            {Number(exercise.load_increment)}kg
          </p>
          <Link
            href={`/exercicios/${exercise.id}`}
            className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Editar metadados
          </Link>
        </div>
      </header>

      {timeline.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center">
          <p className="text-sm font-semibold mb-1">Sem histórico</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Nenhum set registrado pra este exercício ainda.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-8 grid grid-cols-3 gap-2">
            <Stat
              label="Sessões"
              value={timeline.length.toString()}
            />
            <Stat
              label="Melhor set"
              value={
                allTimeBest
                  ? `${formatKg(allTimeBest.weight)}×${allTimeBest.reps}`
                  : "—"
              }
            />
            <Stat
              label="e1RM"
              value={best1RM > 0 ? `${formatKg(best1RM)}kg` : "—"}
            />
          </section>

          <section className="mb-10">
            <p className="label mb-3">Curva de peso</p>
            <WeightChart
              points={timeline.map((p) => ({
                date: p.date,
                maxWeight: p.maxWeight,
                topReps: p.topRepsAtMax,
                epley: p.bestEpley,
              }))}
            />
          </section>

          <section className="mb-10">
            <p className="label mb-3">Histórico</p>
            <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
              {reversedTimeline.map((p) => (
                <li key={p.sessionId}>
                  <Link
                    href={`/workout/${p.sessionId}`}
                    className="block px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-[var(--text-muted)] tnum uppercase tracking-wider">
                        {formatDateShort(p.date)}
                      </span>
                      <span className="text-xs text-[var(--text-soft)] tnum">
                        e1RM {formatKg(p.bestEpley)}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm tnum flex flex-wrap gap-x-3 gap-y-1 text-[var(--text-soft)]">
                      {p.sets.map((s, i) => (
                        <span key={i}>
                          {formatKg(s.weight)}×{s.reps}
                          {s.rir !== null && (
                            <span className="text-[var(--text-dim)]">
                              @{s.rir}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <p className="label mb-2">{label}</p>
      <div className="display-sm text-xl tnum leading-none">{value}</div>
    </div>
  );
}

function formatKg(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
