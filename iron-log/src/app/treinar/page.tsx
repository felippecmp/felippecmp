import Link from "next/link";
import { ChevronRight, Dumbbell, Layers, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAIAvailable } from "@/lib/coach/ai-client";
import { muscleLabel } from "@/lib/muscles";
import { getUserSettings, type RotationMode } from "@/lib/settings";
import { Ring } from "@/components/Ring";
import { AIWorkoutGenerator } from "./AIWorkoutGenerator";
import { PreWorkoutBriefing } from "./PreWorkoutBriefing";
import { StartSessionButton } from "./StartSessionButton";

export const dynamic = "force-dynamic";

type SessionType = "upper" | "lower";

type TemplateRow = {
  id: string;
  name: string;
  session_type: SessionType;
  sort_order: number;
  exercise_count: number;
};

type RecentSession = {
  template_id: string | null;
  session_type: SessionType | null;
};

function sessionTypeLabel(t: SessionType): string {
  return t === "upper" ? "Upper" : "Lower";
}

/**
 * Pick the next suggested template.
 *
 * Auto mode: opposite session_type from the last finished session,
 * rotating within that type by sort_order.
 *
 * Linear mode: next template in global sort_order regardless of type,
 * wrapping to the top when the end is reached.
 */
function pickSuggestion(
  templates: TemplateRow[],
  recent: RecentSession[],
  mode: RotationMode
): { template: TemplateRow; targetType: SessionType } | null {
  if (templates.length === 0) return null;

  if (mode === "linear") {
    // All templates sorted by sort_order. Find last used, pick next.
    const lastUsedId = recent[0]?.template_id ?? null;
    if (!lastUsedId) {
      return { template: templates[0], targetType: templates[0].session_type };
    }
    const idx = templates.findIndex((t) => t.id === lastUsedId);
    const next = templates[(idx + 1) % templates.length];
    return { template: next, targetType: next.session_type };
  }

  // Auto mode: alternate upper↔lower, rotate within type.
  const lastType = recent[0]?.session_type ?? null;
  const targetType: SessionType = lastType === "upper" ? "lower" : "upper";

  const ofType = templates.filter((t) => t.session_type === targetType);
  const pool = ofType.length > 0 ? ofType : templates;

  const lastSameType = recent.find((s) => s.session_type === pool[0].session_type);
  if (!lastSameType?.template_id) {
    return { template: pool[0], targetType: pool[0].session_type };
  }

  const idx = pool.findIndex((t) => t.id === lastSameType.template_id);
  if (idx === -1) {
    return { template: pool[0], targetType: pool[0].session_type };
  }
  const next = pool[(idx + 1) % pool.length];
  return { template: next, targetType: next.session_type };
}

export default async function TreinarPage() {
  const supabase = await createClient();
  const settings = await getUserSettings();

  const [templatesRes, activeRes, recentRes, teCountRes] = await Promise.all([
    supabase
      .from("workout_templates")
      .select("id, name, session_type, sort_order")
      .eq("is_active", true)
      .eq("is_ai_generated", false)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("workout_sessions")
      .select("id, template_id, started_at, workout_templates(name, session_type)")
      .is("finished_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("template_id, workout_templates(session_type)")
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("template_exercises")
      .select("template_id, exercises(primary_muscle)"),
  ]);

  // Count exercises + collect distinct primary muscles per template in one
  // pass. Muscles power the Hub hero chip row.
  type TeRow = {
    template_id: string;
    exercises: { primary_muscle: string | null } | { primary_muscle: string | null }[] | null;
  };
  const teCounts = new Map<string, number>();
  const teMuscles = new Map<string, string[]>();
  for (const row of (teCountRes.data ?? []) as TeRow[]) {
    teCounts.set(row.template_id, (teCounts.get(row.template_id) ?? 0) + 1);
    const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    const muscle = ex?.primary_muscle ?? null;
    if (muscle) {
      const list = teMuscles.get(row.template_id) ?? [];
      if (!list.includes(muscle)) list.push(muscle);
      teMuscles.set(row.template_id, list);
    }
  }

  const templates: TemplateRow[] = (templatesRes.data ?? []).map((t) => {
    return {
      id: t.id,
      name: t.name,
      session_type: t.session_type as SessionType,
      sort_order: t.sort_order ?? 0,
      exercise_count: teCounts.get(t.id) ?? 0,
    };
  });

  const recent: RecentSession[] = (recentRes.data ?? []).map((r) => {
    const joined = Array.isArray(r.workout_templates)
      ? r.workout_templates[0]
      : r.workout_templates;
    return {
      template_id: r.template_id,
      session_type: (joined as { session_type: SessionType } | null)?.session_type ?? null,
    };
  });

  const active = activeRes.data;
  const activeTemplate = active
    ? Array.isArray(active.workout_templates)
      ? active.workout_templates[0]
      : active.workout_templates
    : null;

  const suggestion = pickSuggestion(templates, recent, settings.rotation_mode);
  const suggestedId = suggestion?.template.id;

  // Fetch exercise names for the suggested template (for AI briefing)
  let suggestedExerciseNames: string[] = [];
  if (suggestedId) {
    const { data: teRows } = await supabase
      .from("template_exercises")
      .select("exercises(name)")
      .eq("template_id", suggestedId)
      .order("slot_order", { ascending: true });
    suggestedExerciseNames = (teRows ?? [])
      .map((r) => {
        const ex = Array.isArray(r.exercises) ? r.exercises[0] : r.exercises;
        return (ex as { name: string } | null)?.name ?? null;
      })
      .filter((n): n is string => n !== null);
  }

  const suggestionMuscles: string[] = suggestion
    ? (teMuscles.get(suggestion.template.id) ?? []).slice(0, 4).map(muscleLabel)
    : [];

  return (
    <div className="px-6 pt-10">
      {/* Top bar — title + settings/plus slot (kept lightweight; the handoff
          also had calendar/plus icons but /templates already covers creation). */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          {suggestion && !active && (
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-1 tnum">
              Próximo: {sessionTypeLabel(suggestion.targetType)}
            </p>
          )}
          <h1 className="tlog-title">Treinar</h1>
        </div>
        <Link
          href="/templates"
          aria-label="Gerenciar templates"
          className="shrink-0 w-9 h-9 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
        >
          <Layers size={16} strokeWidth={1.75} />
        </Link>
      </header>

      {/* Active session banner */}
      {active && activeTemplate && (
        <Link
          href={`/workout/${active.id}`}
          className="group relative block mb-4 overflow-hidden rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] p-5 active:scale-[0.99] transition-transform"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--accent) 25%, transparent), transparent 70%)",
            }}
          />
          <div className="relative flex items-center gap-4">
            <Ring value={1} size={78} stroke={5} color="var(--accent)">
              <Play size={22} strokeWidth={2.5} fill="currentColor" className="text-[var(--accent)]" />
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="tlog-eyebrow mb-1 text-[var(--text-muted)]">Em andamento</p>
              <h2 className="text-[24px] leading-none font-extrabold tracking-[-0.02em] truncate">
                {(activeTemplate as { name: string }).name}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 tnum">
                Iniciado{" "}
                {new Date(active.started_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-[var(--text-muted)]" />
          </div>
        </Link>
      )}

      {/* Hero — Próximo treino card with ring + muscle chips + CTA button.
          Matches the Hub hero on /, but here the CTA actually starts the
          session instead of linking to /treinar. */}
      {!active && suggestion && (
        <section className="mb-5">
          <div className="relative overflow-hidden rounded-[20px] bg-[var(--bg-card)] border border-[var(--border)] p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)",
              }}
            />
            <div className="relative flex items-center gap-4">
              <Ring
                value={0}
                size={78}
                stroke={5}
                color="var(--accent)"
                ariaLabel={`Próximo treino: ${suggestion.template.name}`}
              >
                <Play
                  size={22}
                  strokeWidth={2.5}
                  fill="currentColor"
                  className="text-[var(--accent)]"
                />
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="tlog-eyebrow mb-1 text-[var(--text-muted)]">
                  Próximo treino
                </p>
                <h2 className="text-[26px] leading-none font-extrabold tracking-[-0.02em] truncate">
                  {suggestion.template.name}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1 tnum">
                  {sessionTypeLabel(suggestion.targetType)} ·{" "}
                  {suggestion.template.exercise_count} exercícios
                </p>
              </div>
            </div>
            {suggestionMuscles.length > 0 && (
              <ul className="relative mt-3.5 flex flex-wrap gap-1.5">
                {suggestionMuscles.map((m) => (
                  <li
                    key={m}
                    className="rounded-md bg-[var(--bg-hover)] px-2 py-1 text-[10.5px] font-semibold text-[var(--text-soft)]"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            )}
            {suggestion.template.exercise_count === 0 ? (
              <p className="relative mt-4 text-xs text-[var(--text-muted)]">
                Adicione exercícios ao template antes de iniciar.
              </p>
            ) : (
              <div className="relative mt-4">
                <StartSessionButton
                  templateId={suggestion.template.id}
                  label={`Iniciar ${suggestion.template.name}`}
                  disabled={false}
                />
              </div>
            )}
          </div>

          {/* AI Briefing — below the CTA */}
          {suggestion.template.exercise_count > 0 && (
            <div className="mt-3">
              <PreWorkoutBriefing
                templateName={suggestion.template.name}
                sessionType={sessionTypeLabel(suggestion.targetType)}
                exercises={suggestedExerciseNames}
              />
            </div>
          )}
        </section>
      )}

      {/* AI Workout Generator — compose the day from the user's own catalog */}
      {!active && isAIAvailable() && templates.length > 0 && (
        <section className="mb-8">
          <AIWorkoutGenerator
            defaultSessionType={suggestion?.targetType ?? "upper"}
          />
        </section>
      )}

      {/* Empty state (no templates at all) */}
      {!active && templates.length === 0 && (
        <section className="mb-8">
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] mb-4">
              <Layers size={18} strokeWidth={1.75} />
            </div>
            <p className="text-sm mb-1 font-semibold">Nenhum template ainda</p>
            <p className="text-[var(--text-muted)] text-xs mb-6 leading-relaxed max-w-[260px] mx-auto">
              Crie uma rotina de Upper / Lower para poder iniciar uma sessão.
            </p>
            <Link
              href="/templates/novo"
              className="inline-flex items-center gap-2 bg-accent text-accent-fg font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-accent-hover transition-colors"
            >
              Criar primeiro template
            </Link>
          </div>
        </section>
      )}

      {/* All templates list — Hub style: 44px icon tile on left, group eyebrow,
          name, meta. "Próximo" row gets a coral-tinted icon tile + border. */}
      {templates.length > 1 && (
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-3">
            <p className="label">Todos os templates</p>
            <Link
              href="/templates"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Gerenciar
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {templates.map((t) => {
              const isSuggested = t.id === suggestedId;
              const disabled = t.exercise_count === 0 || Boolean(active);
              return (
                <li key={t.id}>
                  <TemplateRowItem
                    template={t}
                    isSuggested={isSuggested}
                    disabled={disabled}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function TemplateRowItem({
  template,
  isSuggested,
  disabled,
}: {
  template: TemplateRow;
  isSuggested: boolean;
  disabled: boolean;
}) {
  const accent = isSuggested ? "var(--accent)" : null;
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border bg-[var(--bg-card)] px-3.5 py-3"
      style={{
        borderColor: accent
          ? "color-mix(in oklab, var(--accent) 30%, transparent)"
          : "var(--border)",
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center rounded-xl"
        style={{
          width: 44,
          height: 44,
          background: accent
            ? "color-mix(in oklab, var(--accent) 15%, transparent)"
            : "var(--bg-hover)",
          border: accent
            ? "1px solid color-mix(in oklab, var(--accent) 30%, transparent)"
            : "none",
          color: accent ?? "var(--text-muted)",
        }}
      >
        <Dumbbell size={18} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)]">
            {sessionTypeLabel(template.session_type)}
          </span>
          {isSuggested && (
            <span
              className="text-[9px] font-extrabold tracking-[0.1em] uppercase"
              style={{ color: "var(--accent)" }}
            >
              · Próximo
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[15px] font-bold leading-tight">
          {template.name}
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--text-muted)] tnum">
          {template.exercise_count} exercícios
        </div>
      </div>
      {disabled ? (
        <Link
          href={`/templates/${template.id}`}
          aria-label="Editar template"
          className="shrink-0 w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-soft)] flex items-center justify-center transition-colors"
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </Link>
      ) : (
        <StartSessionButton
          templateId={template.id}
          label="Iniciar"
          compact
        />
      )}
    </div>
  );
}

