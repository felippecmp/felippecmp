import { BarChart3, Calendar, TrendingUp, Activity } from "lucide-react";

export default function ProgressoPage() {
  return (
    <div className="px-6 pt-10">
      <header className="mb-8">
        <p className="label mb-2">Análise</p>
        <h1 className="display text-4xl leading-none">Progresso</h1>
      </header>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
          Em breve
        </p>
        <h2 className="display-sm text-2xl mb-3">Sem dados ainda</h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          A partir da sua primeira sessão, esta tela passa a mostrar como
          você está progredindo — em volume, em força e em consistência.
        </p>
      </div>

      <ul className="space-y-2">
        <Preview
          icon={BarChart3}
          title="Volume 7 dias rolantes"
          subtitle="Sets diretos por grupo muscular vs. target (5-6 sets)."
        />
        <Preview
          icon={TrendingUp}
          title="Curva de força"
          subtitle="Progressão de peso por exercício ao longo do tempo."
        />
        <Preview
          icon={Activity}
          title="Estimated 1RM"
          subtitle="Fórmula Epley, acompanhando sua evolução real."
        />
        <Preview
          icon={Calendar}
          title="Heatmap 90 dias"
          subtitle="Consistência visual dos últimos três meses."
        />
      </ul>
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
