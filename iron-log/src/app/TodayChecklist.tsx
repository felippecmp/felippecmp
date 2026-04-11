"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Bed,
  Check,
  Dumbbell,
  Footprints,
  Heart,
  Scale,
  X,
} from "lucide-react";
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

  const chips: Chip[] = [
    {
      key: "weight",
      label: "peso",
      done: hasWeight,
      Icon: Scale,
      kind: "form",
      expand: "weight",
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
          },
        ] as Chip[])),
    {
      key: "cardio",
      label: "cardio",
      done: hasCardio,
      Icon: Heart,
      kind: "link",
      href: "/cardio/novo",
    },
    {
      key: "steps",
      label: "passos",
      done: hasSteps,
      Icon: Footprints,
      kind: "form",
      expand: "steps",
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
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 ${
        allDone
          ? "border-[var(--accent)] bg-[var(--bg-card)]"
          : "border-[var(--border)] bg-[var(--bg-card)]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isRestDay && (
            <Bed
              size={12}
              strokeWidth={1.75}
              className="text-[var(--text-dim)]"
            />
          )}
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Hoje
          </p>
        </div>
        <p
          className={`text-xs tnum ${
            allDone
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--text-muted)]"
          }`}
        >
          {hit}/{max}
          {allDone && " — fechou"}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {chips.map((chip) => {
          const baseClass =
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] tracking-wider uppercase tnum transition-colors";
          const stateClass = chip.done
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
            : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-muted)] hover:text-[var(--text-muted)]";
          const expandedClass =
            chip.kind === "form" && expanded === chip.expand
              ? "ring-1 ring-[var(--text-muted)]"
              : "";
          const className = `${baseClass} ${stateClass} ${expandedClass}`;

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
              <Link key={chip.key} href={chip.href} className={className}>
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
        >
          <div className="flex-1 flex items-baseline gap-1 min-w-0">
            <input
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
              className="flex-1 min-w-0 bg-transparent border-0 border-b border-[var(--border)] focus:border-[var(--text-muted)] focus:outline-none display-sm text-xl tnum py-1"
            />
            <span className="text-xs text-[var(--text-dim)]">kg</span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(null)}
            disabled={isPending}
            className="shrink-0 w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-60"
            aria-label="Cancelar"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 w-9 h-9 rounded-lg bg-accent text-accent-fg flex items-center justify-center disabled:opacity-60"
            aria-label="Salvar"
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
        </form>
      )}

      {expanded === "steps" && (
        <form
          action={handleStepsSubmit}
          className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2"
        >
          <div className="flex-1 min-w-0">
            <input
              name="steps"
              type="number"
              min="0"
              required
              autoFocus
              defaultValue={todayStepsCount ?? ""}
              placeholder="8500"
              className="w-full bg-transparent border-0 border-b border-[var(--border)] focus:border-[var(--text-muted)] focus:outline-none display-sm text-xl tnum py-1"
            />
            <input type="hidden" name="step_date" value={todayKey} />
          </div>
          <button
            type="button"
            onClick={() => setExpanded(null)}
            disabled={isPending}
            className="shrink-0 w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-60"
            aria-label="Cancelar"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 w-9 h-9 rounded-lg bg-accent text-accent-fg flex items-center justify-center disabled:opacity-60"
            aria-label="Salvar"
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
        </form>
      )}

      {error && (
        <p className="text-[10px] text-[var(--danger)] mt-2">{error}</p>
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
