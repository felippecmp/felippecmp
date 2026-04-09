import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  walking: "Caminhada",
  running: "Corrida",
  cycling: "Bike",
  other: "Cardio",
};

type CardioRow = {
  id: string;
  activity_type: string;
  started_at: string;
  duration_seconds: number;
  distance_km: number | string | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  device_source: string | null;
  notes: string | null;
};

export default async function CardioPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cardio_sessions")
    .select(
      "id, activity_type, started_at, duration_seconds, distance_km, avg_heart_rate, max_heart_rate, calories, device_source, notes"
    )
    .order("started_at", { ascending: false })
    .limit(200);

  const sessions = (data ?? []) as CardioRow[];

  // Aggregate stats for the header
  const totalKm = sessions.reduce(
    (sum, s) => sum + (s.distance_km ? Number(s.distance_km) : 0),
    0
  );
  const totalMinutes = Math.round(
    sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60
  );

  return (
    <div className="px-6 pt-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Hoje
      </Link>

      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="label mb-2">Registro</p>
          <h1 className="display text-4xl leading-none">Cardio</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 tnum">
            {sessions.length}{" "}
            {sessions.length === 1 ? "sessão" : "sessões"}
            {totalKm > 0 && (
              <>
                <span className="text-[var(--text-faint)]"> · </span>
                {totalKm.toFixed(1)} km
              </>
            )}
            {totalMinutes > 0 && (
              <>
                <span className="text-[var(--text-faint)]"> · </span>
                {Math.round(totalMinutes / 60)}h {totalMinutes % 60}min
              </>
            )}
          </p>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/cardio/novo"
          className="flex items-center justify-center gap-2 bg-accent text-accent-fg font-semibold py-3 rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          Registrar manual
        </Link>
        <Link
          href="/cardio/upload"
          className="flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text)] font-semibold py-3 rounded-xl hover:border-[var(--border-strong)] transition-colors"
        >
          <Upload size={14} strokeWidth={1.75} />
          Upload FIT
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
          <p className="text-sm font-semibold mb-1">Nenhum cardio ainda</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[260px] mx-auto">
            Registre uma caminhada manualmente ou faça upload de um arquivo
            .FIT exportado do seu relógio.
          </p>
        </div>
      ) : (
        <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/cardio/${s.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-[15px]">
                      {TYPE_LABELS[s.activity_type] ?? "Cardio"}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] tnum">
                      {formatDate(s.started_at)}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 tnum flex items-center gap-2 flex-wrap">
                    <span>{formatDuration(s.duration_seconds)}</span>
                    {s.distance_km && (
                      <>
                        <span className="text-[var(--text-faint)]">·</span>
                        <span>{Number(s.distance_km).toFixed(2)} km</span>
                      </>
                    )}
                    {s.avg_heart_rate && (
                      <>
                        <span className="text-[var(--text-faint)]">·</span>
                        <span>HR {s.avg_heart_rate}</span>
                      </>
                    )}
                    {s.calories && (
                      <>
                        <span className="text-[var(--text-faint)]">·</span>
                        <span>{s.calories} kcal</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  strokeWidth={1.75}
                  className="shrink-0 text-[var(--text-dim)]"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  if (total < 60) return `${total}min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
