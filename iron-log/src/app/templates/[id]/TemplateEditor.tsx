"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Archive,
  Check,
  X,
  Pencil,
  ChevronLeft,
} from "lucide-react";
import {
  muscleLabel,
  equipmentLabel,
  MUSCLES,
  MOVEMENT_PATTERNS,
  EQUIPMENT,
} from "@/lib/muscles";
import {
  addExerciseToTemplate,
  archiveTemplate,
  createExerciseFromTemplate,
  removeTemplateExercise,
  reorderTemplateExercise,
  updateTemplate,
  updateTemplateExercise,
} from "../actions";
import { DuplicateButton } from "../DuplicateButton";

type Exercise = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string | null;
  session_type: string;
};

type TemplateExercise = {
  id: string;
  slot_order: number;
  target_sets: number;
  rep_range_low: number;
  rep_range_high: number;
  rest_seconds: number;
  exercise_id: string;
  exercise: Exercise | null;
};

type Template = {
  id: string;
  name: string;
  session_type: "upper" | "lower";
};

export function TemplateEditor({
  template,
  templateExercises,
  availableExercises,
}: {
  template: Template;
  templateExercises: TemplateExercise[];
  availableExercises: Exercise[];
}) {
  const [picking, setPicking] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(template.name);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [isPending, startTransition] = useTransition();

  const usedIds = new Set(templateExercises.map((te) => te.exercise_id));
  const pickable = availableExercises.filter((e) => !usedIds.has(e.id));

  async function handleRename(formData: FormData) {
    startTransition(async () => {
      const result = await updateTemplate(template.id, formData);
      if (result.ok) setEditingName(false);
    });
  }

  function handleAdd(exerciseId: string) {
    startTransition(async () => {
      await addExerciseToTemplate(template.id, exerciseId);
      setPicking(false);
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeTemplateExercise(id, template.id);
    });
  }

  function handleReorder(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await reorderTemplateExercise(id, template.id, direction);
    });
  }

  function handleArchive() {
    startTransition(async () => {
      await archiveTemplate(template.id);
    });
  }

  return (
    <>
      <header className="mb-8">
        <p className="label mb-2 uppercase">{template.session_type}</p>
        {editingName ? (
          <form action={handleRename} className="flex items-center gap-2">
            <input
              name="name"
              defaultValue={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-2xl font-bold focus:outline-none focus:border-[var(--text-muted)] transition-colors display-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="w-10 h-10 rounded-xl bg-accent text-accent-fg flex items-center justify-center"
              aria-label="Salvar nome"
            >
              <Check size={16} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingName(false);
                setName(template.name);
              }}
              className="w-10 h-10 rounded-xl border border-[var(--border)] flex items-center justify-center"
              aria-label="Cancelar"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-2 group"
          >
            <h1 className="display text-4xl leading-none">{name}</h1>
            <Pencil
              size={14}
              className="text-[var(--text-dim)] group-hover:text-[var(--text-soft)]"
              strokeWidth={1.75}
            />
          </button>
        )}
        <p className="text-sm text-[var(--text-muted)] mt-2 tnum">
          {templateExercises.length} exercícios
        </p>
      </header>

      {/* Exercise list */}
      {templateExercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-8 text-center mb-4">
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Nenhum exercício ainda
          </p>
          <button
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-2 bg-accent text-accent-fg font-semibold px-5 py-2.5 rounded-xl text-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            Adicionar exercício
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-2 mb-4">
            {templateExercises.map((te, idx) => (
              <TemplateExerciseCard
                key={te.id}
                te={te}
                isFirst={idx === 0}
                isLast={idx === templateExercises.length - 1}
                templateId={template.id}
                onRemove={handleRemove}
                onReorder={handleReorder}
              />
            ))}
          </ul>

          <button
            onClick={() => setPicking(true)}
            disabled={pickable.length === 0}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] disabled:opacity-50 py-3.5 rounded-xl text-sm font-medium transition-colors mb-10"
          >
            <Plus size={16} strokeWidth={1.75} />
            {pickable.length === 0
              ? "Todos os exercícios já adicionados"
              : "Adicionar outro exercício"}
          </button>
        </>
      )}

      {/* Actions */}
      <div className="pt-6 border-t border-[var(--border)] space-y-3">
        <DuplicateButton templateId={template.id} variant="full" />

        {!confirmArchive ? (
          <button
            type="button"
            onClick={() => setConfirmArchive(true)}
            className="w-full flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            <Archive size={14} strokeWidth={1.75} />
            Arquivar template
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--danger)]/40 bg-red-950/20 p-4">
            <p className="text-sm text-red-200 mb-3">
              Arquivar <strong>{name}</strong>? Ele não aparecerá mais na lista,
              mas o histórico de sessões será preservado.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmArchive(false)}
                className="flex-1 border border-[var(--border)] py-2.5 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleArchive}
                disabled={isPending}
                className="flex-1 bg-[var(--danger)] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                Arquivar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Picker bottom sheet */}
      {picking && (
        <ExercisePicker
          exercises={pickable}
          templateId={template.id}
          sessionType={template.session_type}
          onPick={handleAdd}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

function TemplateExerciseCard({
  te,
  isFirst,
  isLast,
  templateId,
  onRemove,
  onReorder,
}: {
  te: TemplateExercise;
  isFirst: boolean;
  isLast: boolean;
  templateId: string;
  onRemove: (id: string) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateTemplateExercise(te.id, templateId, formData);
      setExpanded(false);
    });
  }

  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onReorder(te.id, "up")}
            disabled={isFirst}
            aria-label="Mover pra cima"
            className="text-[var(--text-dim)] disabled:opacity-30 hover:text-[var(--text)] transition-colors"
          >
            <ArrowUp size={14} strokeWidth={2} />
          </button>
          <button
            onClick={() => onReorder(te.id, "down")}
            disabled={isLast}
            aria-label="Mover pra baixo"
            className="text-[var(--text-dim)] disabled:opacity-30 hover:text-[var(--text)] transition-colors"
          >
            <ArrowDown size={14} strokeWidth={2} />
          </button>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="font-medium text-[15px] leading-tight truncate">
            {te.exercise?.name ?? "Exercício removido"}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-2 tnum">
            <span>{te.target_sets} sets</span>
            <span className="text-[var(--text-faint)]">·</span>
            <span>
              {te.rep_range_low}-{te.rep_range_high} reps
            </span>
            <span className="text-[var(--text-faint)]">·</span>
            <span>{Math.round(te.rest_seconds / 60)} min rest</span>
          </div>
        </button>

        <button
          onClick={() => onRemove(te.id)}
          aria-label="Remover"
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors"
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>

      {expanded && (
        <form action={handleSave} className="px-4 pb-4 border-t border-[var(--border)] pt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <NumField name="target_sets" label="Sets" defaultValue={te.target_sets} min={1} />
            <NumField name="rep_range_low" label="Rep min" defaultValue={te.rep_range_low} min={1} />
            <NumField name="rep_range_high" label="Rep max" defaultValue={te.rep_range_high} min={1} />
          </div>
          <NumField
            name="rest_seconds"
            label="Descanso (seg)"
            defaultValue={te.rest_seconds}
            min={0}
            step={15}
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-accent text-accent-fg py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60"
          >
            {isPending ? "Salvando…" : "Salvar"}
          </button>
        </form>
      )}
    </li>
  );
}

function NumField({
  name,
  label,
  defaultValue,
  min = 0,
  step = 1,
}: {
  name: string;
  label: string;
  defaultValue: number;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="label block mb-1">{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        step={step}
        defaultValue={defaultValue}
        className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm tnum focus:outline-none focus:border-[var(--text-muted)] transition-colors"
      />
    </label>
  );
}

function ExercisePicker({
  exercises,
  templateId,
  sessionType,
  onPick,
  onClose,
}: {
  exercises: Exercise[];
  templateId: string;
  sessionType: "upper" | "lower";
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"pick" | "create">("pick");

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[var(--bg-raised)] sm:border sm:border-[var(--border)] sm:rounded-3xl sm:max-h-[85dvh] flex flex-col h-full sm:h-auto"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="px-6 pt-5 pb-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          {mode === "create" ? (
            <button
              type="button"
              onClick={() => setMode("pick")}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
              Voltar
            </button>
          ) : (
            <h2 className="display-sm text-xl">Escolher exercício</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {mode === "pick" ? (
          <>
            <div className="px-6 py-3 shrink-0 space-y-3">
              <input
                type="search"
                placeholder="Buscar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)]"
              />
              <button
                type="button"
                onClick={() => setMode("create")}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                <Plus size={14} strokeWidth={2} />
                Criar exercício novo
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto px-6 pb-4"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {filtered.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] text-sm py-6">
                  Nenhum exercício encontrado.
                </p>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => onPick(e.id)}
                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-[var(--bg-card)] transition-colors"
                      >
                        <div className="font-medium text-sm">{e.name}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {muscleLabel(e.primary_muscle)} ·{" "}
                          {equipmentLabel(e.equipment)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <CreateExerciseMiniForm
            templateId={templateId}
            sessionType={sessionType}
            onCreated={onClose}
          />
        )}
      </div>
    </div>
  );
}

function CreateExerciseMiniForm({
  templateId,
  sessionType,
  onCreated,
}: {
  templateId: string;
  sessionType: "upper" | "lower";
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [movementPattern, setMovementPattern] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [loadIncrement, setLoadIncrement] = useState("2.5");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredPatterns = MOVEMENT_PATTERNS.filter(
    (p) => p.session === sessionType
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const n = Number(loadIncrement.replace(",", "."));
      const result = await createExerciseFromTemplate(templateId, {
        name,
        sessionType,
        movementPattern,
        primaryMuscle,
        equipment: equipment || null,
        loadIncrement: Number.isFinite(n) && n > 0 ? n : 2.5,
      });
      if (result.ok) {
        onCreated();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        O exercício vai pro catálogo geral e é adicionado a este template na
        sequência, já usando seus defaults de sets/reps/descanso.
      </p>

      <label className="block">
        <span className="label block mb-1.5">Nome</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Supino com corrente"
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)]"
        />
      </label>

      <label className="block">
        <span className="label block mb-1.5">Padrão de movimento</span>
        <select
          required
          value={movementPattern}
          onChange={(e) => setMovementPattern(e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--text-muted)]"
        >
          <option value="">Selecionar</option>
          {filteredPatterns.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label block mb-1.5">Músculo primário</span>
        <select
          required
          value={primaryMuscle}
          onChange={(e) => setPrimaryMuscle(e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--text-muted)]"
        >
          <option value="">Selecionar</option>
          {MUSCLES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label block mb-1.5">Equipamento</span>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--text-muted)]"
        >
          <option value="">—</option>
          {EQUIPMENT.map((eq) => (
            <option key={eq.value} value={eq.value}>
              {eq.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label block mb-1.5">Incremento (kg)</span>
        <input
          type="number"
          step="0.25"
          min="0.25"
          value={loadIncrement}
          onChange={(e) => setLoadIncrement(e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm tnum focus:outline-none focus:border-[var(--text-muted)]"
        />
      </label>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-accent text-accent-fg py-3 rounded-xl font-semibold text-sm hover:bg-accent-hover disabled:opacity-60 transition-colors"
      >
        {isPending ? "Criando…" : "Criar e adicionar"}
      </button>
    </form>
  );
}
