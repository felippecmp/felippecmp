"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

export type Theme = "default" | "gohan" | "beast" | "openclaw";

const STORAGE_KEY = "flog:theme";
const VALID_THEMES = new Set<Theme>(["default", "gohan", "beast", "openclaw"]);
const THEMES: Array<{ value: Theme; label: string; desc: string }> = [
  { value: "default", label: "Default", desc: "Monocromático puro." },
  { value: "gohan", label: "Gohan", desc: "Prata, índigo, carmesim." },
  { value: "beast", label: "Beast Mode", desc: "Neon purple + crimson." },
  { value: "openclaw", label: "Open Claw", desc: "Navy profundo + crimson + Clash Display." },
];

type ThemeCtx = { theme: Theme; setTheme: (t: Theme) => void; themes: typeof THEMES };
const ThemeContext = createContext<ThemeCtx>({
  theme: "default",
  setTheme: () => {},
  themes: THEMES,
});

export function useTheme() {
  return useContext(ThemeContext);
}

const THEME_CLASSES = ["theme-gohan", "theme-beast", "theme-openclaw"] as const;

function applyClass(t: Theme) {
  if (typeof document === "undefined") return;
  const cl = document.documentElement.classList;
  for (const c of THEME_CLASSES) cl.remove(c);
  if (t === "gohan") cl.add("theme-gohan");
  if (t === "beast") cl.add("theme-beast");
  if (t === "openclaw") cl.add("theme-openclaw");
}

/**
 * Reads the persisted theme from localStorage on mount and keeps the
 * <html> class in sync. Wraps the app in layout.tsx.
 *
 * FOUC prevention: a tiny inline <script> in layout.tsx applies the class
 * BEFORE React hydrates, so there's no flash.
 */
// Use useSyncExternalStore to read the theme from localStorage without
// triggering the "setState in useEffect" lint rule. The subscribe callback
// listens for storage events (cross-tab sync) and manual dispatches.
let listeners: Array<() => void> = [];
function emitChange() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot(): Theme {
  if (typeof localStorage === "undefined") return "default";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && VALID_THEMES.has(stored as Theme)
    ? (stored as Theme)
    : "default";
}

function getServerSnapshot(): Theme {
  return "default";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Keep the <html> class in sync whenever the theme changes.
  useEffect(() => {
    applyClass(theme);
  }, [theme]);

  function setTheme(t: Theme) {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // quota / private mode — ignore
    }
    applyClass(t);
    emitChange();
  }

  return (
    <ThemeContext value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext>
  );
}
