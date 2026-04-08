import Link from "next/link";
import { ArrowRight, Layers, Play, Timer, TrendingUp } from "lucide-react";

export default function TreinarPage() {
  return (
    <div className="px-6 pt-10">
      <header className="mb-8">
        <p className="label mb-2">Sessão</p>
        <h1 className="display text-4xl leading-none">Treinar</h1>
      </header>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
          Em breve
        </p>
        <h2 className="display-sm text-2xl mb-3">Fluxo de treino</h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          A próxima fase traz o fluxo completo: templates de rotina, registro
          de sets em tempo real com peso, reps e RIR, timer de descanso
          automático e finalização com feedback.
        </p>
      </div>

      <ul className="space-y-2">
        <Preview
          icon={Layers}
          title="Templates"
          subtitle="Upper A, Lower A, Upper B... rotação automática."
        />
        <Preview
          icon={Play}
          title="Iniciar sessão"
          subtitle="Abre o treino do dia com histórico do último como referência."
        />
        <Preview
          icon={Timer}
          title="Rest timer"
          subtitle="Dispara ao registrar cada set. Vibra ao terminar."
        />
        <Preview
          icon={TrendingUp}
          title="Double progression"
          subtitle="O app sugere quando subir a carga."
        />
      </ul>

      <div className="mt-8">
        <Link
          href="/exercicios"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          Enquanto isso, revise seus exercícios
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function Preview({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <li className="flex items-start gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-soft)]">
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      </div>
    </li>
  );
}
