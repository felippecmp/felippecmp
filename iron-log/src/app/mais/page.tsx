import Link from "next/link";
import {
  Brain,
  Camera,
  ChevronRight,
  Dumbbell,
  Footprints,
  Layers,
  MessageCircle,
  Scale,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Menu items grouped by section, matching the MoreScreen from the Training
 * Log handoff (docs/design-handoff/components/progress-screen.jsx → MoreScreen).
 * Each item lives in its own rounded card per group so the page scans as
 * "Você / Treino / Inteligência / App" instead of one long list.
 */
type Item = {
  href: string;
  label: string;
  desc: string;
  Icon: typeof Brain;
  iconColor: string;
};

const GROUPS: Array<{ group: string; items: Item[] }> = [
  {
    group: "Você",
    items: [
      {
        href: "/peso",
        label: "Peso corporal",
        desc: "Histórico de pesagens e meta.",
        Icon: Scale,
        iconColor: "var(--status-progressed)",
      },
      {
        href: "/fotos",
        label: "Fotos de progresso",
        desc: "Registro visual — privado, com crop ajustável.",
        Icon: Camera,
        iconColor: "var(--accent)",
      },
    ],
  },
  {
    group: "Treino",
    items: [
      {
        href: "/templates",
        label: "Templates",
        desc: "Rotinas: Upper A, Lower B… montar e reordenar.",
        Icon: Layers,
        iconColor: "var(--status-ready)",
      },
      {
        href: "/exercicios",
        label: "Exercícios",
        desc: "Catálogo de exercícios, usados e inativos.",
        Icon: Dumbbell,
        iconColor: "var(--accent)",
      },
      {
        href: "/cardio",
        label: "Cardio",
        desc: "Caminhadas, corridas, uploads FIT do Coros.",
        Icon: Footprints,
        iconColor: "var(--status-stalled)",
      },
    ],
  },
  {
    group: "Inteligência",
    items: [
      {
        href: "/coach",
        label: "Coach",
        desc: "Periodização: blocos, fases, volume semanal.",
        Icon: Brain,
        iconColor: "var(--status-progressed)",
      },
      {
        href: "/coach/chat",
        label: "Coach AI Chat",
        desc: "Converse com o coach sobre treino e dúvidas.",
        Icon: MessageCircle,
        iconColor: "var(--accent)",
      },
    ],
  },
  {
    group: "App",
    items: [
      {
        href: "/settings",
        label: "Preferências",
        desc: "Defaults, tema, rotação, export, logout.",
        Icon: Settings,
        iconColor: "var(--text-soft)",
      },
    ],
  },
];

export default async function MaisPage() {
  const supabase = await createClient();
  const settings = await getUserSettings();

  // Profile card subtitle: latest weight + target + ~sessions/week over 30d.
  // Everything optional — we degrade to just "Seu perfil" when no data.
  const [{ data: latestWeightRow }, { data: sessions30d }] = await Promise.all([
    supabase
      .from("body_weight_entries")
      .select("weight_kg")
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return supabase
        .from("workout_sessions")
        .select("id")
        .not("finished_at", "is", null)
        .gte("started_at", thirtyDaysAgo.toISOString());
    })(),
  ]);

  const latestKg = latestWeightRow
    ? Number((latestWeightRow as { weight_kg: number | string }).weight_kg)
    : null;
  const sessionsPerWeek =
    sessions30d && Array.isArray(sessions30d) && sessions30d.length > 0
      ? Math.round(((sessions30d.length / 30) * 7) * 10) / 10
      : null;

  const subtitleParts: string[] = [];
  if (latestKg !== null) subtitleParts.push(`${latestKg.toFixed(1)}kg`);
  if (settings.target_weight_kg !== null) {
    subtitleParts.push(`meta ${settings.target_weight_kg.toFixed(1)}kg`);
  }
  if (sessionsPerWeek !== null) {
    subtitleParts.push(`${sessionsPerWeek}x/sem`);
  }
  const subtitle =
    subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Hipertrofia";

  return (
    <div className="px-6 pt-10">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
            Ajustes & mais
          </p>
          <h1 className="tlog-title">Mais</h1>
        </div>
        <Link
          href="/settings"
          aria-label="Preferências"
          className="shrink-0 w-9 h-9 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
        >
          <Settings size={16} strokeWidth={1.75} />
        </Link>
      </header>

      {/* Profile card — coral gradient avatar tile, name, stat subtitle. Links
          to /settings since that's where the profile data is edited today. */}
      <Link
        href="/settings"
        className="mb-5 flex items-center gap-3.5 rounded-[20px] border border-[var(--border)] p-4 hover:bg-[var(--bg-hover)] transition-colors"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--accent) 15%, transparent), var(--bg-card))",
        }}
      >
        <div
          aria-hidden="true"
          className="shrink-0 flex items-center justify-center rounded-full text-[22px] font-extrabold"
          style={{
            width: 54,
            height: 54,
            background:
              "linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 75%, var(--bg)))",
            color: "var(--accent-fg)",
            letterSpacing: "-0.02em",
          }}
        >
          F
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[17px] font-extrabold leading-tight"
            style={{ letterSpacing: "-0.01em" }}
          >
            Seu perfil
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 tnum truncate">
            {subtitle}
          </p>
        </div>
        <div className="shrink-0 inline-flex items-center gap-1 text-[var(--text-muted)]">
          <Target size={14} strokeWidth={1.75} />
          <ChevronRight size={16} strokeWidth={1.75} />
        </div>
      </Link>

      {/* Categorized sections. Each group = eyebrow label + a rounded card
          with the items divided. Icon tiles inherit the item's color with a
          15% tint — preserves legibility across themes. */}
      {GROUPS.map(({ group, items }) => (
        <section key={group} className="mb-5">
          <p className="tlog-eyebrow mb-2 px-1 text-[var(--text-muted)]">
            {group}
          </p>
          <ul className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border)]">
            {items.map(({ href, label, desc, Icon, iconColor }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div
                    className="shrink-0 flex items-center justify-center rounded-lg"
                    style={{
                      width: 32,
                      height: 32,
                      background: `color-mix(in oklab, ${iconColor} 15%, transparent)`,
                      color: iconColor,
                    }}
                  >
                    <Icon size={15} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold leading-tight">
                      {label}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed truncate">
                      {desc}
                    </p>
                  </div>
                  <ChevronRight
                    size={15}
                    strokeWidth={1.75}
                    className="shrink-0 text-[var(--text-dim)]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Tiny footer hint — reminds the user the AI features live inside the
          Coach surfaces above, matching the handoff's "INTELIGÊNCIA" group. */}
      <p className="mt-2 mb-10 flex items-center justify-center gap-1.5 text-[10.5px] font-semibold text-[var(--text-dim)]">
        <Sparkles size={11} strokeWidth={2} />
        Coach AI ativo
      </p>
    </div>
  );
}
