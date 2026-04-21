import Link from "next/link";
import { Camera, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WeightEntries } from "./WeightEntries";

export const dynamic = "force-dynamic";

type WeightRow = {
  id: string;
  weight_kg: number | string;
  recorded_at: string;
  notes: string | null;
};

export default async function PesoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("body_weight_entries")
    .select("id, weight_kg, recorded_at, notes")
    .order("recorded_at", { ascending: false })
    .limit(365);

  const rows = (data ?? []) as WeightRow[];
  const entries = rows.map((r) => ({
    id: r.id,
    weightKg: Number(r.weight_kg),
    recordedAt: r.recorded_at,
    notes: r.notes,
  }));

  return (
    <div className="px-6 pt-10">
      <Link
        href="/progresso"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Progresso
      </Link>

      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="label mb-2">Registro</p>
          <h1 className="display text-4xl leading-none">Peso corporal</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 tnum">
            {entries.length}{" "}
            {entries.length === 1 ? "registro" : "registros"} salvos
          </p>
        </div>
        <Link
          href="/fotos"
          aria-label="Ver fotos de progresso"
          className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] border border-[var(--border)] transition-colors"
        >
          <Camera size={12} strokeWidth={2} />
          Fotos
        </Link>
      </header>

      <WeightEntries entries={entries} />
    </div>
  );
}
