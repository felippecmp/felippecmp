"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bed,
  Check,
  Dumbbell,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { userDayKey } from "@/lib/timezone";
import { saveRotationPattern } from "../settings/actions";

type TemplateLite = {
  id: string;
  name: string;
  sessionType: "upper" | "lower";
};

export type RotationSlot = { t: string }; // template_id or "rest"

type Props = {
  templates: TemplateLite[];
  savedPattern: RotationSlot[] | null;
  /** Template ID of the most recent finished session */
  lastTemplateId: string | null;
};

/**
 * Rotation editor + preview. Shows the template cycle and a 14-day projection.
 * Tap "Editar" to enter edit mode: add/remove/reorder slots, then save.
 */
export function RotationPreview({
  templates,
  savedPattern,
  lastTemplateId,
}: Props) {
  const templateMap = new Map(templates.map((t) => [t.id, t]));
  const autoPattern = buildAutoPattern(templates);
  const currentPattern = savedPattern ?? autoPattern;
  const [editing, setEditing] = useState(false);
  const [editSlots, setEditSlots] = useState<RotationSlot[]>(currentPattern);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (templates.length === 0) return null;

  function nameFor(slot: RotationSlot): string {
    if (slot.t === "rest") return "Off";
    return templateMap.get(slot.t)?.name ?? "?";
  }

  function shortNameFor(slot: RotationSlot): string {
    if (slot.t === "rest") return "off";
    const name = templateMap.get(slot.t)?.name ?? "?";
    return name.replace(/^Upper/i, "Up").replace(/^Lower/i, "Lo").slice(0, 5);
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveRotationPattern(editSlots);
      if (result.ok) {
        setSaved(true);
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleReset() {
    setEditSlots(autoPattern);
  }

  function moveSlot(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= editSlots.length) return;
    const next = [...editSlots];
    [next[idx], next[target]] = [next[target], next[idx]];
    setEditSlots(next);
  }

  function removeSlot(idx: number) {
    setEditSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSlot(slot: RotationSlot) {
    setEditSlots((prev) => [...prev, slot]);
  }

  // Projection — find where we are based on the last completed session.
  const currentIdx = findCurrentIndex(currentPattern, lastTemplateId);
  const projection = projectDays(currentPattern, currentIdx, 14);
  const todayKey = userDayKey(new Date());

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="label">Rotação</p>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setEditSlots(currentPattern);
              setEditing(true);
              setSaved(false);
            }}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <Pencil size={10} strokeWidth={1.75} />
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <ul className="space-y-1">
            {editSlots.map((slot, i) => (
              <li
                key={`${slot.t}-${i}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)]"
              >
                <span className="text-[10px] text-[var(--text-dim)] tnum w-4">
                  {i + 1}
                </span>
                {slot.t === "rest" ? (
                  <Bed size={12} strokeWidth={1.75} className="text-[var(--text-dim)]" />
                ) : (
                  <Dumbbell size={12} strokeWidth={1.75} className="text-[var(--text-soft)]" />
                )}
                <span className="text-sm flex-1 min-w-0 truncate">
                  {nameFor(slot)}
                </span>
                <button
                  type="button"
                  onClick={() => moveSlot(i, -1)}
                  disabled={i === 0}
                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-30"
                >
                  <ArrowUp size={12} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSlot(i, 1)}
                  disabled={i === editSlots.length - 1}
                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-30"
                >
                  <ArrowDown size={12} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors"
                >
                  <X size={12} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => addSlot({ t: t.id })}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--border)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors"
              >
                <Plus size={10} strokeWidth={1.75} />
                {t.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addSlot({ t: "rest" })}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-[var(--border)] text-[11px] text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"
            >
              <Plus size={10} strokeWidth={1.75} />
              Descanso
            </button>
          </div>

          {error && <p className="text-[10px] text-[var(--danger)]">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              <RotateCcw size={10} strokeWidth={1.75} />
              Auto
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={isPending}
              className="px-4 py-2 text-xs border border-[var(--border)] rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || editSlots.length === 0}
              className="px-4 py-2 text-xs bg-accent text-accent-fg rounded-lg font-semibold disabled:opacity-60 inline-flex items-center gap-1"
            >
              {saved ? <Check size={12} strokeWidth={2.5} /> : null}
              {isPending ? "Salvando…" : saved ? "Salvo" : "Salvar"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-1 flex-wrap mb-4">
            {currentPattern.map((slot, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider ${
                  slot.t === "rest"
                    ? "text-[var(--text-dim)] border border-dashed border-[var(--border)]"
                    : "bg-[var(--bg-raised)] text-[var(--text-soft)]"
                }`}
              >
                {slot.t === "rest" ? (
                  <Bed size={9} strokeWidth={1.75} />
                ) : (
                  <Dumbbell size={9} strokeWidth={1.75} />
                )}
                {shortNameFor(slot)}
              </span>
            ))}
            <span className="text-[10px] text-[var(--text-faint)] self-center ml-1">
              ↻
            </span>
          </div>

          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Próximos 14 dias
          </p>
          <div className="grid grid-cols-7 gap-1">
            {projection.map((day, i) => {
              const isToday = day.dateKey === todayKey;
              const slot = currentPattern[(currentIdx + i) % currentPattern.length];
              return (
                <div
                  key={i}
                  className={`rounded-lg border px-1.5 py-2 text-center ${
                    isToday
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)]"
                  }`}
                >
                  <p
                    className={`text-[9px] uppercase tracking-wider mb-1 ${
                      isToday ? "text-[var(--accent)] font-semibold" : "text-[var(--text-dim)]"
                    }`}
                  >
                    {day.weekday}
                  </p>
                  <p className="text-[10px] tnum text-[var(--text-muted)]">
                    {day.dayNum}
                  </p>
                  {slot.t === "rest" ? (
                    <Bed size={10} strokeWidth={1.75} className="mx-auto mt-1 text-[var(--text-faint)]" />
                  ) : (
                    <p
                      className={`text-[9px] font-medium mt-1 truncate ${
                        isToday ? "text-[var(--accent)]" : "text-[var(--text-soft)]"
                      }`}
                    >
                      {shortNameFor(slot)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-[var(--text-dim)] mt-3 leading-relaxed">
            {currentPattern.filter((s) => s.t !== "rest").length} treinos + {currentPattern.filter((s) => s.t === "rest").length} descansos por ciclo.
            {savedPattern ? "" : " Gerado automaticamente — toque Editar pra customizar."}
          </p>
        </>
      )}
    </section>
  );
}

function buildAutoPattern(templates: TemplateLite[]): RotationSlot[] {
  const pattern: RotationSlot[] = [];
  let count = 0;
  for (const t of templates) {
    pattern.push({ t: t.id });
    count++;
    if (count === 2) {
      pattern.push({ t: "rest" });
      count = 0;
    }
  }
  if (count > 0 && pattern[pattern.length - 1]?.t !== "rest") {
    pattern.push({ t: "rest" });
  }
  return pattern;
}

/**
 * Find the next slot in the rotation after the last completed template.
 * Finds the template ID in the pattern, returns the slot AFTER it.
 * So if you just did Lower A, the projection starts from the rest day
 * (or next template) that follows Lower A in the cycle.
 */
function findCurrentIndex(
  pattern: RotationSlot[],
  lastTemplateId: string | null
): number {
  if (!lastTemplateId || pattern.length === 0) return 0;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i].t === lastTemplateId) {
      return (i + 1) % pattern.length;
    }
  }
  return 0;
}

type ProjectedDay = {
  dateKey: string;
  weekday: string;
  dayNum: string;
};

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function projectDays(
  pattern: RotationSlot[],
  startIdx: number,
  count: number
): ProjectedDay[] {
  const out: ProjectedDay[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    out.push({
      dateKey: userDayKey(d),
      weekday: WEEKDAYS_SHORT[d.getDay()],
      dayNum: d.getDate().toString(),
    });
  }
  return out;
}
