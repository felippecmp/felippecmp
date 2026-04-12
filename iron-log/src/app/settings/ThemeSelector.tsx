"use client";

import { Palette } from "lucide-react";
import { useTheme, type Theme } from "@/components/ThemeProvider";

const SWATCHES: Record<Theme, string[]> = {
  default: ["#0a0a0a", "#171717", "#ffffff", "#a3e635"],
  gohan: ["#0c0a14", "#EDF1F5", "#EE1111", "#49426B"],
  beast: ["#0c0816", "#e8e0f0", "#e11d48", "#a855f7"],
};

export function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Palette
          size={14}
          strokeWidth={1.75}
          className="text-[var(--text-muted)]"
        />
        <p className="label">Tema</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => {
          const active = theme === t.value;
          const colors = SWATCHES[t.value];
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`rounded-xl border py-3 px-3 flex flex-col items-center gap-2 transition-all ${
                active
                  ? "border-accent bg-accent/10 text-[var(--text)] ring-1 ring-accent/30"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-soft)]"
              }`}
            >
              {/* Color swatches preview */}
              <div className="flex gap-1">
                {colors.map((c, i) => (
                  <span
                    key={i}
                    className="w-4 h-4 rounded-full border border-white/10"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
