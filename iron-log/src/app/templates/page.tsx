import Link from "next/link";
import { Plus, ChevronRight, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/settings";
import { ArchivedTemplates } from "./ArchivedTemplates";
import { DuplicateButton } from "./DuplicateButton";
import { ReorderButton } from "./ReorderButton";

export const dynamic = "force-dynamic";

type TemplateRow = {
  id: string;
  name: string;
  session_type: "upper" | "lower";
  exercise_count: number;
};

export default async function TemplatesPage() {
  const supabase = await createClient();
  const settings = await getUserSettings();
  const isLinear = settings.rotation_mode === "linear";

  const [{ data: templates, error }, { data: archivedRaw }, { data: teCountRaw }] = await Promise.all([
    supabase
      .from("workout_templates")
      .select("id, name, session_type, sort_order")
      .eq("is_active", true)
      .eq("is_ai_generated", false)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("workout_templates")
      .select("id, name, session_type")
      .eq("is_active", false)
      .eq("is_ai_generated", false)
      .order("name", { ascending: true }),
    supabase
      .from("template_exercises")
      .select("template_id"),
  ]);

  const archived = (archivedRaw ?? []) as Array<{ id: string; name: string; session_type: string }>;

  const teCounts = new Map<string, number>();
  for (const row of (teCountRaw ?? []) as Array<{ template_id: string }>) {
    teCounts.set(row.template_id, (teCounts.get(row.template_id) ?? 0) + 1);
  }

  const rows: TemplateRow[] = (templates ?? []).map((t) => {
    const count = teCounts.get(t.id) ?? 0;
    return {
      id: t.id,
      name: t.name,
      session_type: t.session_type,
      exercise_count: count,
    };
  });

  const upper = rows.filter((r) => r.session_type === "upper");
  const lower = rows.filter((r) => r.session_type === "lower");

  return (
    <div className="px-6 pt-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="label mb-2">Rotinas</p>
          <h1 className="display text-4xl leading-none">Templates</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 tnum">
            {rows.length} ativos
          </p>
        </div>
        <Link
          href="/templates/novo"
          aria-label="Novo template"
          className="shrink-0 w-11 h-11 rounded-full bg-accent text-accent-fg flex items-center justify-center hover:bg-accent-hover transition-colors"
        >
          <Plus size={20} strokeWidth={2.5} />
        </Link>
      </header>

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-red-950/20 text-red-300 p-4 text-sm mb-6">
          {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState />
      ) : isLinear ? (
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-3">
            <p className="label">Sequência de rotação</p>
            <span className="text-[10px] text-[var(--text-dim)] tnum tracking-wider">
              {rows.length.toString().padStart(2, "0")}
            </span>
          </div>
          <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
            {rows.map((t, idx) => (
              <li key={t.id} className="flex items-center pr-2">
                <div className="flex flex-col gap-1 px-2 shrink-0">
                  <ReorderButton
                    templateId={t.id}
                    direction="up"
                    disabled={idx === 0}
                  />
                  <ReorderButton
                    templateId={t.id}
                    direction="down"
                    disabled={idx === rows.length - 1}
                  />
                </div>
                <Link
                  href={`/templates/${t.id}`}
                  className="flex items-center gap-3 px-2 py-3.5 hover:bg-[var(--bg-hover)] transition-colors flex-1 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                        {t.session_type}
                      </span>
                      <span className="font-medium text-[15px] leading-tight truncate">
                        {t.name}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1 tnum">
                      {t.exercise_count} exercícios
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-[var(--text-dim)]"
                    strokeWidth={1.75}
                  />
                </Link>
                <DuplicateButton templateId={t.id} />
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[var(--text-dim)] mt-2 leading-relaxed">
            O próximo treino sugerido segue esta ordem de cima pra baixo,
            voltando pro topo ao chegar no último. Reordene com as setas.
          </p>
        </section>
      ) : (
        <>
          <TemplateGroup title="Upper" items={upper} allRows={rows} />
          <TemplateGroup title="Lower" items={lower} allRows={rows} />
        </>
      )}

      <ArchivedTemplates templates={archived} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] mb-4">
        <Layers size={18} strokeWidth={1.75} />
      </div>
      <p className="text-sm mb-1 font-semibold">Nenhum template ainda</p>
      <p className="text-[var(--text-muted)] text-xs mb-6 leading-relaxed max-w-[260px] mx-auto">
        Crie Upper A, Upper B, Upper C, Lower A, Lower B, Lower C para rodar em
        rotação.
      </p>
      <Link
        href="/templates/novo"
        className="inline-flex items-center gap-2 bg-accent text-accent-fg font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-accent-hover transition-colors"
      >
        <Plus size={16} strokeWidth={2.5} />
        Criar primeiro
      </Link>
    </div>
  );
}

function TemplateGroup({
  title,
  items,
  allRows,
}: {
  title: string;
  items: TemplateRow[];
  allRows: TemplateRow[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <p className="label">{title}</p>
        <span className="text-[10px] text-[var(--text-dim)] tnum tracking-wider">
          {items.length.toString().padStart(2, "0")}
        </span>
      </div>
      <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
        {items.map((t, idx) => {
          const globalIdx = allRows.findIndex((r) => r.id === t.id);
          return (
            <li key={t.id} className="flex items-center pr-2">
              <div className="flex flex-col gap-1 px-2 shrink-0">
                <ReorderButton
                  templateId={t.id}
                  direction="up"
                  disabled={globalIdx === 0}
                />
                <ReorderButton
                  templateId={t.id}
                  direction="down"
                  disabled={globalIdx === allRows.length - 1}
                />
              </div>
              <Link
                href={`/templates/${t.id}`}
                className="flex items-center gap-3 px-2 py-3.5 hover:bg-[var(--bg-hover)] transition-colors flex-1 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[15px] leading-tight">
                    {t.name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 tnum">
                    {t.exercise_count} exercícios
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-[var(--text-dim)]"
                  strokeWidth={1.75}
                />
              </Link>
              <DuplicateButton templateId={t.id} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
