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
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {isRestDay && (
            <Bed
              size={12}
              strokeWidth={1.75}
              className="text-[var(--text-dim)]"
            />
          )}
          <p className="label">
            Hoje
          </p>
        </div>
        <p
          className={`text-xs tnum ${
            allDone
              ? "text-[var(--status-ready)] font-semibold"
              : "text-[var(--text-muted)]"
          }`}
        >
          {hit}/{max}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            allDone ? "bg-[var(--status-ready)]" : "bg-[var(--accent)]"
          }`}
          style={{ width: `${max > 0 ? (hit / max) * 100 : 0}%` }}
        />
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
