import Link from "next/link";
import { ChevronLeft, Download, LogOut } from "lucide-react";
import { getUserSettings } from "@/lib/settings";
import { logoutAction } from "../login/actions";
import { SettingsForm } from "./SettingsForm";
import { ThemeSelector } from "./ThemeSelector";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <div className="px-6 pt-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Hoje
      </Link>

      <header className="mb-8">
        <p className="label mb-2">Preferências</p>
        <h1 className="display text-4xl leading-none">Ajustes</h1>
      </header>

      <section className="mb-10">
        <p className="label mb-3">Defaults de template</p>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <SettingsForm settings={settings} />
        </div>
        <p className="text-[11px] text-[var(--text-dim)] mt-3 leading-relaxed">
          Valores aplicados quando você adiciona um exercício novo a um
          template, ou cria um exercício novo no catálogo. Templates
          existentes não são afetados.
        </p>
      </section>

      <section className="mb-10">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <ThemeSelector />
        </div>
      </section>

      <section className="mb-10">
        <p className="label mb-3">Dados</p>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)]">
          <a
            href="/api/export"
            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">Exportar tudo como JSON</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                Backup completo: exercícios, templates, sessões, sets,
                progressão e estas preferências.
              </p>
            </div>
            <Download
              size={16}
              strokeWidth={1.75}
              className="shrink-0 text-[var(--text-dim)]"
            />
          </a>
        </div>
      </section>

      <section className="pt-4 border-t border-[var(--border)]">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            <LogOut size={14} strokeWidth={1.75} />
            Sair
          </button>
        </form>
      </section>
    </div>
  );
}
