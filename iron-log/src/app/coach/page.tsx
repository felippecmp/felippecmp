import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadCoachContext } from "@/lib/coach/context-loader";
import { buildInsights } from "@/lib/coach/insights";
import { isAIAvailable } from "@/lib/coach/ai-client";
import { getActiveMesocycle } from "@/lib/coach/mesocycle-server";
import { CoachBlockView } from "./CoachBlockView";
import { CoachInsights } from "./CoachInsights";
import { CreateBlockAI } from "./CreateBlockAI";
import { CreateBlockForm } from "./CreateBlockForm";
import { RotationPreview } from "./RotationPreview";

export const dynamic = "force-dynamic";

type TemplateRow = {
  id: string;
  name: string;
  session_type: "upper" | "lower";
};

type LastSessionRow = {
  started_at: string;
  workout_templates: { name: string } | { name: string }[] | null;
};

function pickJoined<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function CoachPage() {
  const supabase = await createClient();
  const [active, context, templatesRes, lastSessionRes] = await Promise.all([
    getActiveMesocycle(),
    loadCoachContext(),
    supabase
      .from("workout_templates")
      .select("id, name, session_type")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("workout_sessions")
      .select("started_at, workout_templates(name)")
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1),
  ]);
  const insights = buildInsights(context);

  const templates = ((templatesRes.data ?? []) as TemplateRow[]).map((t) => ({
    id: t.id,
    name: t.name,
    sessionType: t.session_type,
  }));
  const lastSession = (lastSessionRes.data ?? [])[0] as
    | LastSessionRow
    | undefined;
  const lastTemplateName = lastSession
    ? pickJoined(lastSession.workout_templates)?.name ?? null
    : null;

  return (
    <div className="px-6 pt-10 pb-24">
      <Link
        href="/mais"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Mais
      </Link>

      <header className="mb-6">
        <p className="label mb-2">Coach</p>
        <h1 className="display text-3xl leading-tight">Periodização</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
          Bloco de treino estruturado em fases + observações automáticas
          sobre volume, fadiga e progressão. Tudo determinístico, sem IA.
        </p>
      </header>

      <div className="space-y-8">
        {active ? (
          <CoachBlockView active={active} />
        ) : (
          <>
            {isAIAvailable() && <CreateBlockAI />}
            <CreateBlockForm />
          </>
        )}

        {templates.length > 1 && (
          <RotationPreview
            templates={templates}
            lastSessionAt={lastSession?.started_at ?? null}
            lastTemplateName={lastTemplateName}
          />
        )}

        <CoachInsights insights={insights} />
      </div>
    </div>
  );
}
