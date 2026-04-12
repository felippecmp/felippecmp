import Link from "next/link";
import {
  Brain,
  ChevronRight,
  Dumbbell,
  Footprints,
  Layers,
  Scale,
  Settings,
} from "lucide-react";

const items = [
  {
    href: "/coach",
    label: "Coach",
    desc: "Periodização: blocos, fases, volume semanal.",
    Icon: Brain,
    iconColor: "text-[var(--status-progressed)]",
  },
  {
    href: "/exercicios",
    label: "Exercícios",
    desc: "Catálogo de exercícios, usados e inativos.",
    Icon: Dumbbell,
    iconColor: "text-[var(--status-ready)]",
  },
  {
    href: "/templates",
    label: "Templates",
    desc: "Rotinas: Upper A, Lower B... montar e reordenar.",
    Icon: Layers,
    iconColor: "text-[var(--accent)]",
  },
  {
    href: "/cardio",
    label: "Cardio",
    desc: "Caminhadas, corridas, uploads FIT do Coros.",
    Icon: Footprints,
    iconColor: "text-[var(--status-stalled)]",
  },
  {
    href: "/peso",
    label: "Peso corporal",
    desc: "Histórico de pesagens e meta.",
    Icon: Scale,
    iconColor: "text-[var(--status-building)]",
  },
  {
    href: "/settings",
    label: "Settings",
    desc: "Defaults, tema, rotação, export, logout.",
    Icon: Settings,
    iconColor: "text-[var(--text-soft)]",
  },
];

export default function MaisPage() {
  return (
    <div className="px-6 pt-10">
      <header className="mb-8">
        <p className="label mb-2">Menu</p>
        <h1 className="display text-4xl leading-none">Mais</h1>
      </header>

      <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
        {items.map(({ href, label, desc, Icon, iconColor }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] transition-colors"
            >
              <div className={`shrink-0 w-9 h-9 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-center ${iconColor}`}>
                <Icon size={16} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[15px]">{label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  {desc}
                </p>
              </div>
              <ChevronRight
                size={16}
                strokeWidth={1.75}
                className="shrink-0 text-[var(--text-dim)]"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
