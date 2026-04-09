import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseFit } from "@/lib/fit";

/**
 * Accept a multipart FIT upload for a NEW cardio session. Unlike the
 * strength endpoint, this one creates a fresh cardio_sessions row from
 * the parsed summary instead of updating an existing one.
 */

// Map a FIT `sport` + `sub_sport` pair to our activity_type enum.
function deriveActivityType(
  sport: string | null,
  subSport: string | null
): "walking" | "running" | "cycling" | "other" {
  const s = (sport ?? "").toLowerCase();
  const sub = (subSport ?? "").toLowerCase();
  if (s === "running" || sub.includes("running")) return "running";
  if (s === "cycling" || sub.includes("cycling") || sub.includes("bike"))
    return "cycling";
  if (s === "walking" || sub.includes("walk") || sub.includes("hiking"))
    return "walking";
  return "other";
}

export async function POST(request: Request) {
  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Multipart inválido." },
      { status: 400 }
    );
  }

  if (!file) {
    return NextResponse.json(
      { ok: false, error: "Arquivo não enviado." },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: "Arquivo muito grande (> 5 MB)." },
      { status: 413 }
    );
  }

  const buffer = await file.arrayBuffer();
  const result = await parseFit(buffer);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const { summary } = result;
  if (!summary.durationSeconds || summary.durationSeconds <= 0) {
    return NextResponse.json(
      { ok: false, error: "Arquivo sem duração válida." },
      { status: 400 }
    );
  }

  const activityType = deriveActivityType(summary.sport, summary.subSport);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cardio_sessions")
    .insert({
      activity_type: activityType,
      started_at: summary.startTime ?? new Date().toISOString(),
      duration_seconds: summary.durationSeconds,
      distance_km: summary.distanceKm,
      avg_heart_rate: summary.avgHeartRate,
      max_heart_rate: summary.maxHeartRate,
      calories: summary.calories,
      device_source: "coros",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  revalidatePath("/");
  revalidatePath("/cardio");
  revalidatePath("/progresso");

  return NextResponse.json({ ok: true, id: data.id });
}
