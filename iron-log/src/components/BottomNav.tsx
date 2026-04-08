"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, LineChart, ListChecks } from "lucide-react";

const tabs = [
  { href: "/", label: "Hoje", Icon: Home },
  { href: "/treinar", label: "Treinar", Icon: Dumbbell },
  { href: "/progresso", label: "Progresso", Icon: LineChart },
  { href: "/exercicios", label: "Exercícios", Icon: ListChecks },
];

const HIDDEN_ON = ["/login"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="max-w-xl mx-auto grid grid-cols-4">
        {tabs.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                  active
                    ? "text-[var(--text)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text-soft)]"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[var(--text)] rounded-full" />
                )}
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-[10px] tracking-wide font-medium">
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
