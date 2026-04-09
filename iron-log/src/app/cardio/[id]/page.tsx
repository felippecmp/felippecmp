import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CardioForm } from "../CardioForm";
import { CardioDeleteButton } from "./CardioDeleteButton";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  walking: "Caminhada",
  running: "Corrida",
  cycling: "Bike",
  other: "Cardio",
};

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export default async function CardioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("cardio_sessions")
    .select(
      "id, activity_type, started_at, duration_seconds, distance_km, avg_heart_rate, max_heart_rate, calories, device_source, notes"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="px-6 pt-10">
      <Link
        href="/cardio"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Cardio
      </Link>
      <header className="mb-8">
        <p className="label mb-2 uppercase">
          {TYPE_LABELS[data.activity_type] ?? "Cardio"}
          {data.device_source === "coros" && (
            <span className="text-[var(--text-dim)]"> · coros</span>
          )}
        </p>
        <h1 className="display text-3xl leading-none">
          {formatHeaderDate(data.started_at)}
        </h1>
      </header>

      <CardioForm
        mode="edit"
        defaults={{
          id: data.id,
          activityType: data.activity_type as
            | "walking"
            | "running"
            | "cycling"
            | "other",
          startedAt: toLocalDatetimeInput(data.started_at),
          durationMinutes: Math.round(data.duration_seconds / 60),
          distanceKm:
            data.distance_km !== null ? Number(data.distance_km) : null,
          avgHeartRate: data.avg_heart_rate,
          maxHeartRate: data.max_heart_rate,
          calories: data.calories,
          notes: data.notes,
        }}
      />

      <div className="mt-8 pt-6 border-t border-[var(--border)]">
        <CardioDeleteButton id={data.id} />
      </div>
    </div>
  );
}

function formatHeaderDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
