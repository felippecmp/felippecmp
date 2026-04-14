"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Bed,
  Check,
  Dumbbell,
  Footprints,
  Heart,
  Loader2,
  Scale,
  X,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { logBodyWeight } from "./peso/actions";
import { logDailySteps } from "./passos/actions";

export type TodayChecklistProps = {
  hasWeight: boolean;
  hasStrength: boolean;
  hasCardio: boolean;
  hasSteps: boolean;
  isRestDay: boolean;
  todayWeightKg: number | null;
  todayStepsCount: number | null;
  latestWeightKg: number | null;
  todayKey: string;
};

type Expanded = "weight" | "steps" | null;

type ChipBase = {
  key: string;
  label: string;
  done: boolean;
  Icon: typeof Check;
  color: string; // CSS var for the chip's semantic color
};

type LinkChip = ChipBase & { kind: "link"; href: string };
type FormChip = ChipBase & { kind: "form"; expand: "weight" | "steps" };
type Chip = LinkChip | FormChip;

/**
 * Compact "today" panel that doubles as the home's quick-add surface.
 * Each chip is interactive: PESO and PASSOS expand inline forms in place
 * (no second card needed), FORÇA and CARDIO link straight to their flows.
 *
 * Rest days drop the FORÇA chip and the max moves from 4 → 3 so the
 * heatmap glow logic stays consistent.
 */
export function TodayChecklist({
  hasWeight,
  hasStrength,
  hasCardio,
  hasSteps,
  isRestDay,
  todayWeightKg,
  todayStepsCount,
  latestWeightKg,
  todayKey,
}: TodayChecklistProps) {
  const [expanded, setExpanded] = useState<Expanded>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const chips: Chip[] = [
    {
      key: "weight",
      label: "peso",
      done: hasWeight,
      Icon: Scale,
      kind: "form",
      expand: "weight",
      color: "var(--status-progressed)",
    },
    ...(isRestDay
      ? []
      : ([
          {
            key: "strength",
            label: "força",
            done: hasStrength,
            Icon: Dumbbell,
            kind: "link",
            href: "/treinar",
            color: "var(--status-ready)",
          },
        ] as Chip[])),
    {
      key: "cardio",
      label: "cardio",
      done: hasCardio,
      Icon: Heart,
      kind: "link",
      href: "/cardio/novo",
      color: "var(--status-stalled)",
    },
    {
      key: "steps",
      label: "passos",
      done: hasSteps,
      Icon: Footprints,
      kind: "form",
      expand: "steps",
      color: "var(--status-building)",
    },
  ];

  const hit = chips.filter((c) => c.done).length;
  const max = chips.length;
  const allDone = hit === max;
  const remaining = chips.filter((c) => !c.done);

  function toggleExpand(target: Expanded) {
    setError(null);
    setExpanded((cur) => (cur === target ? null : target));
  }

  function handleWeightSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await logBodyWeight(formData);
      if (result.ok) {
        setExpanded(null);
        toast("Peso registrado");
      } else {
        setError(result.error);
      }
    });
  }

  function handleStepsSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await logDailySteps(formData);
      if (result.ok) {
        setExpanded(null);
        toast("Passos registrados");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className={`mb-4 rounded-2xl border px-4 py-3.5 transition-colors ${
        allDone
          ? "border-[var(--status-ready)]/40 bg-[var(--bg-card)] checklist-glow"
          : "border-[var(--border)] bg-[var(--bg-card)]"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Ring progress */}
        {(() => {
          const R = 14;
          const C = 2 * Math.PI * R;
          const pct = max > 0 ? hit / max : 0;
          const offset = C * (1 - pct);
          const ringColor = allDone ? "var(--status-ready)" : "var(--accent)";
          return (
            <div className="shrink-0 relative w-9 h-9">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r={R} fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle cx="18" cy="18" r={R} fill="none" stroke={ringColor} strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} className="transition-all duration-500" />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold tnum ${allDone ? "text-[var(--status-ready)]" : "text-[var(--text-soft)]"}`}>
                {hit}
              </span>
            </div>
          );
        })()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isRestDay && <Bed size={12} strokeWidth={1.75} className="text-[var(--text-dim)]" />}
            <p className="text-sm font-semibold">{allDone ? "Dia completo" : "Hoje"}</p>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] tnum">{hit}/{max} metas</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {chips.map((chip) => {
          const baseClass =
            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] tracking-wider uppercase tnum transition-all duration-150 active:scale-95";
          const stateClass = chip.done
            ? "border-transparent text-[var(--accent-fg)]"
            : "border-[var(--border)] hover:border-[var(--text-muted)]";
          const expandedClass =
            chip.kind === "form" && expanded === chip.expand
              ? "ring-1 ring-[var(--text-muted)]"
              : "";
          const className = `${baseClass} ${stateClass} ${expandedClass}`;
          const chipStyle = chip.done
            ? { background: chip.color }
            : { color: chip.color };

          const inner = (
            <>
              {chip.done ? (
                <Check size={10} strokeWidth={2.75} />
              ) : (
                <chip.Icon size={10} strokeWidth={1.75} />
              )}
              {chip.label}
            </>
          );

          if (chip.kind === "link") {
            return (
              <Link key={chip.key} href={chip.href} className={className} style={chipStyle}>
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => toggleExpand(chip.expand)}
              disabled={isPending}
              className={`${className} disabled:opacity-60`}
              style={chipStyle}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {expanded === "weight" && (
        <form
          action={handleWeightSubmit}
          className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2"
          aria-busy={isPending}
        >
          <div className="flex-1 flex items-baseline gap-1 min-w-0">
            <label htmlFor="checklist-weight" className="sr-only">
              Peso em quilos
            </label>
            <input
              id="checklist-weight"
              name="weight_kg"
              type="number"
              step="0.1"
              min="1"
              required
              autoFocus
              defaultValue={todayWeightKg ?? ""}
              placeholder={
                latestWeightKg ? latestWeightKg.toFixed(1) : "74.2"
              }
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "checklist-weight-error" : undefined}
              className={`flex-1 min-w-0 bg-transparent border-0 border-b focus:outline-none display-sm text-xl tnum py-1 ${
                error
                  ? "border-[var(--danger)]"
                  : "border-[var(--border)] focus:border-[var(--text-muted)]"
              }`}
            />
            <span className="text-xs text-[var(--text-dim)]">kg</span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(null)}
            disabled={isPending}
            className="shrink-0 w-11 h-11 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition-transform disabled:opacity-60"
            aria-label="Cancelar"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 w-11 h-11 rounded-lg bg-accent text-accent-fg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
            aria-label={isPending ? "Salvando peso" : "Salvar peso"}
          >
            {isPending ? (
              <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
            ) : (
              <Check size={14} strokeWidth={2.5} />
            )}
          </button>
        </form>
      )}

      {expanded === "steps" && (
        <form
          action={handleStepsSubmit}
          className="mt-3 pt-3 border-t border-[var(--border)] space-y-2"
          aria-busy={isPending}
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <label htmlFor="checklist-steps" className="sr-only">
                Passos do dia
              </label>
              <input
                id="checklist-steps"
                name="steps"
                type="number"
                min="0"
                required
                autoFocus
                defaultValue={todayStepsCount ?? ""}
                placeholder="8500"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "checklist-steps-error" : undefined}
                className={`w-full bg-transparent border-0 border-b focus:outline-none display-sm text-xl tnum py-1 ${
                  error
                    ? "border-[var(--danger)]"
                    : "border-[var(--border)] focus:border-[var(--text-muted)]"
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(null)}
              disabled={isPending}
              className="shrink-0 w-11 h-11 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition-transform disabled:opacity-60"
              aria-label="Cancelar"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="shrink-0 w-11 h-11 rounded-lg bg-accent text-accent-fg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
              aria-label={isPending ? "Salvando passos" : "Salvar passos"}
            >
              {isPending ? (
                <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
              ) : (
                <Check size={14} strokeWidth={2.5} />
              )}
            </button>
          </div>
          <label htmlFor="checklist-step-date" className="sr-only">
            Data dos passos
          </label>
          <input
            id="checklist-step-date"
            name="step_date"
            type="date"
            defaultValue={todayKey}
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs tnum text-[var(--text-soft)] focus:outline-none"
          />
        </form>
      )}

      {error && (
        <p
          id={
            expanded === "weight"
              ? "checklist-weight-error"
              : "checklist-steps-error"
          }
          className="text-[10px] text-[var(--danger)] mt-2"
          role="alert"
        >
          {error}
        </p>
      )}

      {!allDone && !expanded && remaining.length > 0 && (
        <p className="text-[10px] text-[var(--text-dim)] mt-2 leading-relaxed">
          Falta{remaining.length === 1 ? "" : "m"}{" "}
          {remaining.map((r) => r.label).join(" e ")}.
        </p>
      )}
    </div>
  );
}
