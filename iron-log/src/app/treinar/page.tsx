import Link from "next/link";
import { ArrowRight, ChevronRight, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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
 * Pick the next suggested template in rotation:
 *  1. Opposite session_type from the last finished session (default: upper).
 *  2. Within that type, the template that follows the last-used one in
 *     sort_order (wraps around). If none used yet, the first.
 */
function pickSuggestion(
  templates: TemplateRow[],
  recent: RecentSession[]
): { template: TemplateRow; targetType: SessionType } | null {
  if (templates.length === 0) return null;

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

  const [templatesRes, activeRes, recentRes] = await Promise.all([
    supabase
      .from("workout_templates")
      .select("id, name, session_type, sort_order, template_exercises(count)")
      .eq("is_active", true)
      .order("session_type", { ascending: true })
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
  ]);

  const templates: TemplateRow[] = (templatesRes.data ?? []).map((t) => {
    const count = Array.isArray(t.template_exercises)
      ? (t.template_exercises[0] as { count: number } | undefined)?.count ?? 0
      : 0;
    return {
      id: t.id,
      name: t.name,
      session_type: t.session_type as SessionType,
      sort_order: t.sort_order ?? 0,
      exercise_count: count,
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

  const suggestion = pickSuggestion(templates, recent);
  const suggestedId = suggestion?.template.id;

  return (
    <div className="px-6 pt-10">
      <header className="mb-8">
        <p className="label mb-2">Sessão</p>
        <h1 className="display text-4xl leading-none">Treinar</h1>
      </header>

      {/* Active session banner */}
      {active && activeTemplate && (
        <section className="mb-6">
          <Link
            href={`/workout/${active.id}`}
            className="block rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-5 hover:border-[var(--text-muted)] transition-colors"
          >
            <p className="label mb-2">Em andamento</p>
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="display-sm text-2xl truncate">
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
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text)]">
                Continuar
                <ArrowRight size={14} strokeWidth={2} />
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Suggestion card */}
      {!active && suggestion && (
        <section className="mb-8">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <p className="label mb-2">
              Sugerido · {sessionTypeLabel(suggestion.targetType)}
            </p>
            <h2 className="display-sm text-3xl leading-tight mb-1">
              {suggestion.template.name}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6 tnum">
              {suggestion.template.exercise_count} exercícios
            </p>
            <StartSessionButton
              templateId={suggestion.template.id}
              label={`Iniciar ${suggestion.template.name}`}
              disabled={suggestion.template.exercise_count === 0}
            />
            {suggestion.template.exercise_count === 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-3">
                Adicione exercícios ao template antes de iniciar.
              </p>
            )}
          </div>
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

      {/* All templates list */}
      {templates.length > 0 && (
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
          <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
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
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--text-dim)]">
            {sessionTypeLabel(template.session_type)}
          </span>
          {isSuggested && (
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--status-ready)]">
              · Próximo
            </span>
          )}
        </div>
        <div className="font-medium text-[15px] leading-tight mt-0.5 truncate">
          {template.name}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1 tnum">
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

