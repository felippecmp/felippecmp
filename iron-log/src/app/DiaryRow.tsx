import Link from "next/link";
import {
  Dumbbell,
  Footprints,
  NotebookPen,
  Scale,
  TrendingUp,
} from "lucide-react";

/**
 * Discriminated union of every entry kind that can appear in the home
 * diary timeline. Adding a new kind requires adding a case to DiaryRow.
 */
export type DiaryEntry =
  | {
      kind: "strength";
      id: string;
      at: string;
      templateName: string | null;
      durationMinutes: number | null;
      avgHr: number | null;
      feeling: number | null;
      notes: string | null;
    }
  | {
      kind: "cardio";
      id: string;
      at: string;
      activityType: string;
      durationSeconds: number;
      distanceKm: number | null;
      avgHr: number | null;
    }
  | {
      kind: "weight";
      id: string;
      at: string;
      weightKg: number;
    }
  | {
      kind: "steps";
      id: string;
      at: string;
      steps: number;
    }
  | {
      kind: "note";
      id: string;
      at: string;
      body: string;
    };

const FEELING_SHORT: Record<number, string> = {
  1: "fraco",
  2: "ok",
  3: "bom",
  4: "forte",
  5: "PR",
};

const CARDIO_TYPE_LABELS: Record<string, string> = {
  walking: "Caminhada",
  running: "Corrida",
  cycling: "Bike",
  other: "Cardio",
};

export function DiaryRow({ entry }: { entry: DiaryEntry }) {
  switch (entry.kind) {
    case "strength":
      return <StrengthRow entry={entry} />;
    case "cardio":
      return <CardioRow entry={entry} />;
    case "weight":
      return <WeightRow entry={entry} />;
    case "steps":
      return <StepsRow entry={entry} />;
    case "note":
      return <NoteRow entry={entry} />;
  }
}

function StrengthRow({
  entry,
}: {
  entry: Extract<DiaryEntry, { kind: "strength" }>;
}) {
  return (
    <li>
      <Link
        href={`/workout/${entry.id}`}
        className="flex items-start gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5" style={{ background: "color-mix(in oklab, var(--status-ready) 15%, transparent)" }}>
          <Dumbbell
            size={12}
            strokeWidth={1.75}
            className="text-[var(--status-ready)]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {entry.templateName ?? "Treino de força"}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5 tnum">
            {entry.durationMinutes ? `${entry.durationMinutes} min` : "—"}
            {entry.avgHr && (
              <>
                <span className="text-[var(--text-faint)]"> · </span>
                HR {entry.avgHr}
              </>
            )}
            {entry.feeling !== null && (
              <>
                <span className="text-[var(--text-faint)]"> · </span>
                {FEELING_SHORT[entry.feeling] ?? entry.feeling}
              </>
            )}
          </div>
          {entry.notes && (
            <p className="text-[11px] text-[var(--text-dim)] mt-1 leading-snug line-clamp-2 italic">
              {entry.notes}
            </p>
          )}
        </div>
        <span className="text-[11px] tnum text-[var(--text-dim)] tabular-nums mt-1">
          {formatHM(entry.at)}
        </span>
      </Link>
    </li>
  );
}

function CardioRow({
  entry,
}: {
  entry: Extract<DiaryEntry, { kind: "cardio" }>;
}) {
  return (
    <li>
      <Link
        href={`/cardio/${entry.id}`}
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--status-stalled) 15%, transparent)" }}>
          <Footprints
            size={12}
            strokeWidth={1.75}
            className="text-[var(--status-stalled)]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {CARDIO_TYPE_LABELS[entry.activityType] ?? "Cardio"}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5 tnum">
            {Math.round(entry.durationSeconds / 60)} min
            {entry.distanceKm !== null && (
              <>
                <span className="text-[var(--text-faint)]"> · </span>
                {entry.distanceKm.toFixed(2)} km
              </>
            )}
            {entry.avgHr && (
              <>
                <span className="text-[var(--text-faint)]"> · </span>
                HR {entry.avgHr}
              </>
            )}
          </div>
        </div>
        <span className="text-[11px] tnum text-[var(--text-dim)] tabular-nums">
          {formatHM(entry.at)}
        </span>
      </Link>
    </li>
  );
}

function WeightRow({
  entry,
}: {
  entry: Extract<DiaryEntry, { kind: "weight" }>;
}) {
  return (
    <li>
      <Link
        href="/peso"
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--status-progressed) 15%, transparent)" }}>
          <Scale
            size={12}
            strokeWidth={1.75}
            className="text-[var(--status-progressed)]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium tnum tabular-nums">
            {entry.weightKg.toFixed(1)} kg
          </div>
        </div>
        <span className="text-[11px] tnum text-[var(--text-dim)] tabular-nums">
          {formatHM(entry.at)}
        </span>
      </Link>
    </li>
  );
}

function StepsRow({
  entry,
}: {
  entry: Extract<DiaryEntry, { kind: "steps" }>;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--status-building) 15%, transparent)" }}>
        <TrendingUp
          size={12}
          strokeWidth={1.75}
          className="text-[var(--status-building)]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">
          <span className="tnum tabular-nums">
            {entry.steps.toLocaleString("pt-BR")}
          </span>{" "}
          passos
          {entry.steps >= 8000 && (
            <span className="text-[10px] ml-1.5 text-[var(--status-ready)] font-semibold">
              meta ✓
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function NoteRow({
  entry,
}: {
  entry: Extract<DiaryEntry, { kind: "note" }>;
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-[var(--bg-raised)] flex items-center justify-center mt-0.5">
        <NotebookPen
          size={12}
          strokeWidth={1.75}
          className="text-[var(--text-muted)]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--text)] leading-snug whitespace-pre-wrap">
          {entry.body}
        </p>
      </div>
    </li>
  );
}

function formatHM(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
