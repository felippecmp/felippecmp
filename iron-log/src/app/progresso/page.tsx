export default function ProgressoPage() {
  return (
    <div className="px-5 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Progresso</h1>
      </header>

      <div className="border border-dashed border-[var(--border-strong)] rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">📈</div>
        <h2 className="font-bold mb-2">Sem dados ainda</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Quando você registrar seus primeiros treinos, aqui vão aparecer:
          volume semanal rolante por grupo muscular, linhas de progresso de
          peso por exercício, estimated 1RM e heatmap de consistência dos
          últimos 90 dias.
        </p>
      </div>
    </div>
  );
}
