import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseFit } from "@/lib/fit";

/**
 * Accept a multipart FIT file upload for a finished strength session,
 * parse it server-side, and write HR/calorie/duration aggregates onto the
 * workout_sessions row. Protected by the existing auth middleware.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Defensive size limit: typical FITs are 10-200 KB; anything over 5 MB is
  // almost certainly not a strength session.
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

  const supabase = await createClient();

  // Verify the session exists (RLS naturally scopes it to this user).
  const { data: session, error: sessErr } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (sessErr) {
    return NextResponse.json(
      { ok: false, error: sessErr.message },
      { status: 500 }
    );
  }
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Sessão não encontrada." },
      { status: 404 }
    );
  }

  const { summary } = result;
  const updatePayload: Record<string, unknown> = {
    avg_heart_rate: summary.avgHeartRate,
    max_heart_rate: summary.maxHeartRate,
    device_calories: summary.calories,
    device_duration_seconds: summary.durationSeconds,
    device_source: "coros",
  };

  const { error: updateErr } = await supabase
    .from("workout_sessions")
    .update(updatePayload)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json(
      { ok: false, error: updateErr.message },
      { status: 500 }
    );
  }

  revalidatePath(`/workout/${id}`);
  revalidatePath("/");
  revalidatePath("/progresso");

  return NextResponse.json({
    ok: true,
    summary: {
      avgHeartRate: summary.avgHeartRate,
      maxHeartRate: summary.maxHeartRate,
      calories: summary.calories,
      durationSeconds: summary.durationSeconds,
      sport: summary.sport,
      subSport: summary.subSport,
    },
  });
}
