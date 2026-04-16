"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  analyzeCatalogGaps,
  approveGapSelections,
  archiveOrphanExercises,
  type ApproveSelection,
  type GapProposal,
  type OrphanExercise,
} from "./ai-actions";
import {
  muscleLabel,
  patternLabel,
  equipmentLabel,
} from "@/lib/muscles";

type Props = {
  orphans: OrphanExercise[];
};

const SEVERITY_STYLE: Record<GapProposal["severity"], string> = {
  high: "text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/30",
  medium:
    "text-[var(--warning,#d97706)] bg-yellow-950/20 border-yellow-900/40",
  low: "text-[var(--text-muted)] bg-[var(--bg-raised)] border-[var(--border)]",
};

const SEVERITY_LABEL: Record<GapProposal["severity"], string> = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

/**
 * Catalog gap analyzer UI. Sits at the top of /exercicios.
 *
 * States:
 *  - idle: CTA + optional orphan cleanup row
 *  - analyzing: spinner
 *  - results: list of gap cards, each with checkboxes for alternatives
 *             + a "Outras opções" button to re-roll that gap only
 */
export function CatalogGapAnalyzer({ orphans }: Props) {
  const [open, setOpen] = useState(false);
  const [gaps, setGaps] = useState<GapProposal[] | null>(null);
  const [selectedByGap, setSelectedByGap] = useState<
    Record<number, Set<number>>
  >({});
  const [rejectedNames, setRejectedNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const [isAnalyzing, startAnalyzing] = useTransition();
  const [isApproving, startApproving] = useTransition();
  const [isArchiving, startArchiving] = useTransition();

  const hasOrphans = orphans.length > 0;

  function handleAnalyze() {
    setError(null);
    setNotice(null);
    setRejectedNames([]);
    setSelectedByGap({});
    startAnalyzing(async () => {
      const result = await analyzeCatalogGaps();
      if (result.ok) {
        if (result.gaps.length === 0) {
          setNotice(
            "Nenhum gap identificado. Seu catálogo tá bem distribuído."
          );
        }
        setGaps(result.gaps);
        setExpanded(
          Object.fromEntries(result.gaps.map((_, i) => [i, i === 0]))
        );
      } else {
        setError(result.error);
      }
    });
  }

  function handleRerollGap(gapIndex: number) {
    if (!gaps) return;
    const currentGap = gaps[gapIndex];
    const toReject = [
      ...rejectedNames,
      ...currentGap.alternatives.map((a) => a.name),
    ];
    setError(null);
    setNotice(null);
    // Clear this gap's selections since alternatives change
    setSelectedByGap((prev) => {
      const next = { ...prev };
      delete next[gapIndex];
      return next;
    });
    startAnalyzing(async () => {
      const result = await analyzeCatalogGaps(toReject);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRejectedNames(toReject);
      // Find the gap with the same title, if any; otherwise fallback to same index
      const match =
        result.gaps.find((g) => g.title === currentGap.title) ??
        result.gaps[gapIndex] ??
        null;
      if (!match) {
        setError("Coach não retornou alternativas novas pra esse gap.");
        return;
      }
      setGaps((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[gapIndex] = match;
        return next;
      });
    });
  }

  function toggleSelection(gapIndex: number, altIndex: number) {
    setSelectedByGap((prev) => {
      const current = new Set(prev[gapIndex] ?? []);
      if (current.has(altIndex)) current.delete(altIndex);
      else current.add(altIndex);
      return { ...prev, [gapIndex]: current };
    });
  }

  function collectSelections(): ApproveSelection[] {
    if (!gaps) return [];
    const out: ApproveSelection[] = [];
    for (const [gapIdxStr, indices] of Object.entries(selectedByGap)) {
      const gapIdx = Number(gapIdxStr);
      const gap = gaps[gapIdx];
      if (!gap) continue;
      for (const altIdx of indices) {
        const a = gap.alternatives[altIdx];
        if (!a) continue;
        out.push({
          name: a.name,
          equipment: a.equipment,
          movement_pattern: a.movement_pattern,
          primary_muscle: a.primary_muscle,
          secondary_muscles: a.secondary_muscles,
          session_type: a.session_type,
        });
      }
    }
    return out;
  }

  function handleApprove() {
    const selections = collectSelections();
    if (selections.length === 0) {
      setError("Marque pelo menos um exercício pra adicionar.");
      return;
    }
    setError(null);
    setNotice(null);
    startApproving(async () => {
      const result = await approveGapSelections(selections);
      if (result.ok) {
        setNotice(
          result.added > 0
            ? `${result.added} exercício(s) adicionado(s) ao catálogo.`
            : "Nada adicionado (duplicados ignorados)."
        );
        setGaps(null);
        setSelectedByGap({});
        setExpanded({});
      } else {
        setError(result.error);
      }
    });
  }

  function handleArchiveOrphans() {
    setError(null);
    setNotice(null);
    startArchiving(async () => {
      const result = await archiveOrphanExercises();
      if (result.ok) {
        setNotice(
          result.archived > 0
            ? `${result.archived} exercício(s) sem uso arquivado(s).`
            : "Nada pra arquivar."
        );
      } else {
        setError(result.error);
      }
    });
  }

  const totalSelected = Object.values(selectedByGap).reduce(
    (acc, set) => acc + set.size,
    0
  );

  // Collapsed / idle state
  if (!open && !gaps) {
    return (
      <section className="mb-8 space-y-2">
        {hasOrphans && (
          <OrphanBanner
            orphans={orphans}
            onArchive={handleArchiveOrphans}
            isArchiving={isArchiving}
          />
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)] p-4 flex items-center gap-3 hover:border-[var(--accent)] hover:bg-[var(--bg-raised)] transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--bg-raised)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Sparkles size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[14px] leading-tight">
              Analisar gaps do catálogo
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
              Coach aponta o que falta e sugere exercícios com literatura
            </p>
          </div>
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            className="text-[var(--text-dim)] shrink-0"
          />
        </button>
        {notice && (
          <p className="text-xs text-[var(--status-ready)] pl-2">{notice}</p>
        )}
      </section>
    );
  }

  // Open, waiting to analyze (form state)
  if (open && !gaps) {
    return (
      <section className="mb-8 space-y-2">
        {hasOrphans && (
          <OrphanBanner
            orphans={orphans}
            onArchive={handleArchiveOrphans}
            isArchiving={isArchiving}
          />
        )}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles
                size={14}
                strokeWidth={1.75}
                className="text-[var(--accent)]"
              />
              <p className="label">Analisar gaps</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isAnalyzing}
              aria-label="Fechar"
              className="w-8 h-8 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-raised)] flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            O coach lê seus templates, cobertura por padrão de movimento e
            volume 7d. Aponta músculos/padrões sub-treinados e propõe
            exercícios apoiados na literatura (stretch-mediated, perfil de
            resistência, estímulo-por-fadiga).
          </p>
          <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">
            Sem sugestões de peso corporal. Barra livre só quando
            estritamente necessário. Priorizamos máquina, cabo e halter.
          </p>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full bg-accent text-accent-fg font-semibold py-3 rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" strokeWidth={2} />
                Coach analisando catálogo…
              </>
            ) : (
              <>
                <Brain size={14} strokeWidth={2} />
                Analisar agora
              </>
            )}
          </button>
        </div>
      </section>
    );
  }

  // Results state
  return (
    <section className="mb-8 space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="label">Gaps identificados ({gaps?.length ?? 0})</p>
        <button
          type="button"
          onClick={() => {
            setGaps(null);
            setSelectedByGap({});
            setOpen(false);
          }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          Cancelar
        </button>
      </div>

      {error && <p className="text-xs text-[var(--danger)] px-1">{error}</p>}
      {notice && (
        <p className="text-xs text-[var(--status-ready)] px-1">{notice}</p>
      )}

      {gaps && gaps.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)] p-6 text-center">
          <Check
            size={18}
            strokeWidth={1.75}
            className="mx-auto text-[var(--status-ready)] mb-2"
          />
          <p className="text-sm text-[var(--text)]">
            Catálogo balanceado. Nada a sugerir agora.
          </p>
        </div>
      )}

      {gaps?.map((gap, gi) => (
        <GapCard
          key={`${gap.title}-${gi}`}
          gap={gap}
          index={gi}
          selected={selectedByGap[gi] ?? new Set()}
          expanded={expanded[gi] ?? false}
          onToggleExpand={() =>
            setExpanded((prev) => ({ ...prev, [gi]: !prev[gi] }))
          }
          onToggleSelect={(ai) => toggleSelection(gi, ai)}
          onReroll={() => handleRerollGap(gi)}
          isBusy={isAnalyzing || isApproving}
        />
      ))}

      {gaps && gaps.length > 0 && (
        <div className="sticky bottom-[76px] z-10 -mx-2 px-2">
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-3 shadow-lg flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[var(--text-muted)]">
                Selecionados
              </p>
              <p className="text-sm font-semibold tnum">{totalSelected}</p>
            </div>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || totalSelected === 0}
              className="bg-accent text-accent-fg font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition-colors"
            >
              {isApproving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Adicionando…
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  Adicionar ao catálogo
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function OrphanBanner({
  orphans,
  onArchive,
  isArchiving,
}: {
  orphans: OrphanExercise[];
  onArchive: () => void;
  isArchiving: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 flex items-center gap-3">
      <AlertTriangle
        size={14}
        strokeWidth={1.75}
        className="text-[var(--text-muted)] shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">
          {orphans.length}{" "}
          {orphans.length === 1 ? "exercício" : "exercícios"} sem uso
        </p>
        <p className="text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">
          Não estão em template nem foram logados. Arquivar limpa o catálogo.
        </p>
      </div>
      <button
        type="button"
        onClick={onArchive}
        disabled={isArchiving}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold border border-[var(--border)] hover:border-[var(--border-strong)] px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
      >
        {isArchiving ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Trash2 size={12} strokeWidth={2} />
        )}
        Arquivar
      </button>
    </div>
  );
}

function GapCard({
  gap,
  index,
  selected,
  expanded,
  onToggleExpand,
  onToggleSelect,
  onReroll,
  isBusy,
}: {
  gap: GapProposal;
  index: number;
  selected: Set<number>;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleSelect: (altIndex: number) => void;
  onReroll: () => void;
  isBusy: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-[var(--bg-card)] overflow-hidden ${
        selected.size > 0
          ? "border-[var(--accent)]"
          : "border-[var(--border)]"
      }`}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--bg-raised)] transition-colors"
      >
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${SEVERITY_STYLE[gap.severity]}`}
        >
          {SEVERITY_LABEL[gap.severity]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[15px] leading-tight">
            {gap.title}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">
            {gap.alternatives.length} opções ·{" "}
            {selected.size > 0 ? `${selected.size} marcadas` : "nenhuma marcada"}
          </p>
        </div>
        {expanded ? (
          <ChevronUp
            size={16}
            strokeWidth={1.75}
            className="text-[var(--text-dim)] shrink-0 mt-0.5"
          />
        ) : (
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            className="text-[var(--text-dim)] shrink-0 mt-0.5"
          />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] p-4 space-y-3">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {gap.reasoning}
          </p>

          <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
            Marque o que tem na sua academia:
          </p>

          <ul className="space-y-1.5">
            {gap.alternatives.map((alt, ai) => {
              const isChecked = selected.has(ai);
              return (
                <li key={`${alt.name}-${ai}`}>
                  <button
                    type="button"
                    onClick={() => onToggleSelect(ai)}
                    disabled={isBusy}
                    className={`w-full text-left rounded-xl p-3 border transition-colors ${
                      isChecked
                        ? "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-[var(--border)] bg-[var(--bg-raised)] hover:border-[var(--border-strong)]"
                    } disabled:opacity-60`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center ${
                          isChecked
                            ? "bg-[var(--accent)] border-[var(--accent)]"
                            : "border-[var(--border-strong)]"
                        }`}
                        aria-hidden
                      >
                        {isChecked && (
                          <Check
                            size={12}
                            strokeWidth={3}
                            className="text-[var(--accent-fg)]"
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[14px] leading-tight">
                          {alt.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>{equipmentLabel(alt.equipment)}</span>
                          <span className="text-[var(--text-faint)]">·</span>
                          <span>{muscleLabel(alt.primary_muscle)}</span>
                          <span className="text-[var(--text-faint)]">·</span>
                          <span>{patternLabel(alt.movement_pattern)}</span>
                        </p>
                        <p className="text-[11px] text-[var(--text-dim)] mt-1.5 leading-snug">
                          {alt.rationale}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={onReroll}
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center gap-2 text-xs font-medium border border-dashed border-[var(--border-strong)] hover:border-[var(--text-muted)] py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-50 transition-colors"
          >
            {isBusy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCcw size={12} strokeWidth={2} />
            )}
            Não tenho nenhum — gerar outras opções
          </button>
        </div>
      )}

      {/* Hidden: index prop keeps key stability and is used by parent callbacks */}
      <span className="hidden">{index}</span>
    </div>
  );
}
