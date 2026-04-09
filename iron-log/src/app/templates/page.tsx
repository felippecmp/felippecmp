import Link from "next/link";
import { Plus, ChevronRight, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TemplateRow = {
  id: string;
  name: string;
  session_type: "upper" | "lower";
  exercise_count: number;
};

export default async function TemplatesPage() {
  const supabase = await createClient();

  const { data: templates, error } = await supabase
    .from("workout_templates")
    .select("id, name, session_type, template_exercises(count)")
    .eq("is_active", true)
    .order("session_type")
    .order("name");

  const rows: TemplateRow[] = (templates ?? []).map((t) => {
    const count = Array.isArray(t.template_exercises)
      ? (t.template_exercises[0] as { count: number } | undefined)?.count ?? 0
      : 0;
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
      ) : (
        <>
          <TemplateGroup title="Upper" items={upper} />
          <TemplateGroup title="Lower" items={lower} />
        </>
      )}
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
}: {
  title: string;
  items: TemplateRow[];
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
        {items.map((t) => (
          <li key={t.id}>
            <Link
              href={`/templates/${t.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors"
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
          </li>
        ))}
      </ul>
    </section>
  );
}
