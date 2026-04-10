"use client";

import { Palette } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Palette size={14} strokeWidth={1.75} className="text-[var(--text-muted)]" />
        <p className="label">Tema</p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl">
        {themes.map((t) => {
          const active = theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`text-center py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-accent text-accent-fg"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--text-dim)] mt-2 leading-relaxed">
        {theme === "orchid"
          ? "Rosa-púrpura nos acentos e undertone quente nos backgrounds."
          : "Monocromático puro — branco sobre preto, sem cor."}
      </p>
    </div>
  );
}
