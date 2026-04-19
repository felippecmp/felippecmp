"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

type TemplateLite = {
  id: string;
  name: string;
  session_type: "upper" | "lower";
};

/**
 * Search bar + filter chips ("Todos / Upper / Lower") for the Treinar
 * template list.
 *
 * Server / client split: the server pre-renders each row as a ReactNode
 * and passes them in `rows` (1:1 with `templates`). The client filters
 * the templates by query + segment and renders the matching pre-built
 * row. Going via pre-rendered nodes (instead of a function) keeps the
 * RSC boundary clean — functions can't cross from a server component
 * into a client component.
 *
 * Ported from the v2 handoff (train-screen.jsx → search bar + chips).
 */
export function TemplateFilter({
  templates,
  rows,
}: {
  templates: TemplateLite[];
  rows: ReactNode[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "upper" | "lower">("all");

  const filteredIndices = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: number[] = [];
    templates.forEach((t, i) => {
      if (filter !== "all" && t.session_type !== filter) return;
      if (q && !t.name.toLowerCase().includes(q)) return;
      out.push(i);
    });
    return out;
  }, [templates, query, filter]);

  return (
    <>
      <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
        <Search size={15} strokeWidth={2} className="text-[var(--text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar template…"
          aria-label="Buscar template"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {(["all", "upper", "lower"] as const).map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={isActive}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11.5px] font-extrabold tracking-wide transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-soft)]"
              }`}
            >
              {f === "all" ? "Todos" : f === "upper" ? "Upper" : "Lower"}
            </button>
          );
        })}
      </div>
      <ul className="flex flex-col gap-2">
        {filteredIndices.map((i) => (
          <li key={templates[i].id}>
            <Fragment>{rows[i]}</Fragment>
          </li>
        ))}
        {filteredIndices.length === 0 && (
          <li className="text-center text-[12px] text-[var(--text-muted)] py-8">
            Nenhum template encontrado.
          </li>
        )}
      </ul>
    </>
  );
}
