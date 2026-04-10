"use client";

import { Palette } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Palette
          size={14}
          strokeWidth={1.75}
          className="text-[var(--text-muted)]"
        />
        <p className="label">Tema</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((t) => {
          const active = theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`rounded-xl border py-3 px-2 flex flex-col items-center justify-center gap-1 transition-all ${
                active
                  ? "border-accent bg-accent/10 text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-soft)]"
              }`}
            >
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="text-[9px] leading-tight text-center opacity-75">
                {t.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
