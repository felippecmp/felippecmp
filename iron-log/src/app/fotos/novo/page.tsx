import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { userDayKey } from "@/lib/timezone";
import { PhotoUploader } from "./PhotoUploader";

export const dynamic = "force-dynamic";

/**
 * Server component that fetches the latest body-weight entry for the
 * current day and hands it to <PhotoUploader> as a prefill. Keeps the
 * upload flow purely client-side otherwise.
 */
export default async function NewPhotoPage() {
  const today = userDayKey();
  const supabase = await createClient();

  // Most recent weight entry for today — null if the user hasn't weighed
  // in yet. The uploader still lets you type a weight manually.
  const { data } = await supabase
    .from("body_weight_entries")
    .select("weight_kg, recorded_at")
    .gte("recorded_at", `${today}T00:00:00.000Z`)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prefillWeightKg =
    data && data.weight_kg !== null ? Number(data.weight_kg) : null;

  return (
    <div className="px-6 pt-10">
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/fotos"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
          Fotos
        </Link>
      </div>
      <header className="mb-5">
        <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
          Nova foto
        </p>
        <h1 className="tlog-title">Registrar progresso</h1>
      </header>

      <PhotoUploader defaultDate={today} prefillWeightKg={prefillWeightKg} />
    </div>
  );
}
