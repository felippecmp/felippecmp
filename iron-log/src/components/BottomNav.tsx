"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, LineChart, Menu } from "lucide-react";

const tabs = [
  { href: "/", label: "Hoje", Icon: Home },
  { href: "/treinar", label: "Treinar", Icon: Dumbbell },
  { href: "/progresso", label: "Progresso", Icon: LineChart },
  { href: "/mais", label: "Mais", Icon: Menu },
];

// During an active workout we hide the tab bar so you can't bail on a set
// by accident, and the rest timer has room to live above the safe area.
const HIDDEN_ON = ["/login", "/workout"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--border)]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--bg)",
      }}
    >
      <ul className="max-w-xl mx-auto grid grid-cols-4">
        {tabs.map(({ href, label, Icon }) => {
          const MAIS_PREFIXES = ["/mais", "/exercicios", "/templates", "/cardio", "/peso", "/settings"];
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/mais"
                ? MAIS_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
                : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className="relative flex flex-col items-center justify-center gap-0.5 py-2"
              >
                <span
                  className="flex items-center justify-center w-14 h-8 rounded-full"
                  style={active ? { background: "var(--accent)" } : undefined}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    style={{ color: active ? "var(--accent-fg)" : "var(--text-dim)" }}
                  />
                </span>
                <span
                  className="text-[10px] tracking-wide font-medium"
                  style={{ color: active ? "var(--text)" : "var(--text-dim)" }}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
