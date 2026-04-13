"use client";

import { useState, useTransition } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { restoreTemplate, deleteTemplatePermanently } from "./actions";
import { useToast } from "@/components/Toast";

type ArchivedTemplate = {
  id: string;
  name: string;
  session_type: string;
};

export function ArchivedTemplates({
  templates,
}: {
  templates: ArchivedTemplate[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(templates);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { toast } = useToast();

  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-3"
      >
        <Archive size={12} strokeWidth={1.75} />
        {open ? "Esconder" : "Mostrar"} arquivados ({items.length})
      </button>

      {open && (
        <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
          {items.map((t) => (
            <li key={t.id} className="px-4 py-3.5">
              {confirmDelete === t.id ? (
                <div>
                  <p className="text-sm text-[var(--danger)] mb-2">
                    Deletar &ldquo;{t.name}&rdquo; permanentemente? Isso não pode ser desfeito.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      disabled={isPending}
                      className="flex-1 border border-[var(--border)] py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteTemplatePermanently(t.id);
                          if (result.ok) {
                            setItems((prev) => prev.filter((i) => i.id !== t.id));
                            setConfirmDelete(null);
                            toast("Template deletado");
                          }
                        });
                      }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-60"
                      style={{ background: "var(--danger)", color: "#fff" }}
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-soft)]">{t.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] mt-0.5">
                      {t.session_type} · arquivado
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await restoreTemplate(t.id);
                        if (result.ok) {
                          setItems((prev) => prev.filter((i) => i.id !== t.id));
                          toast("Template restaurado");
                        }
                      });
                    }}
                    className="shrink-0 w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--status-ready)] transition-colors disabled:opacity-40"
                    aria-label="Restaurar"
                  >
                    <RotateCcw size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(t.id)}
                    className="shrink-0 w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors"
                    aria-label="Deletar permanentemente"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
