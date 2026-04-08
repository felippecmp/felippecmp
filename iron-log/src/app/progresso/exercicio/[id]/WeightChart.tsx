"use client";

import { useState } from "react";

export type ChartPoint = {
  date: string; // ISO
  maxWeight: number;
  topReps: number;
  epley: number;
};

type Props = {
  points: ChartPoint[];
};

const WIDTH = 560;
const HEIGHT = 180;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 20;

export function WeightChart({ points }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center text-xs text-[var(--text-muted)]">
        Sem dados para plotar.
      </div>
    );
  }

  // Compute scales — y axis shared between maxWeight and epley so both
  // series live in the same space.
  const allValues = points.flatMap((p) => [p.maxWeight, p.epley]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  // Add a little padding so lines don't kiss the edges.
  const yPad = Math.max(1, (maxVal - minVal) * 0.15);
  const yMin = Math.max(0, minVal - yPad);
  const yMax = maxVal + yPad;

  const n = points.length;
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) =>
    n === 1 ? PAD_LEFT + innerW / 2 : PAD_LEFT + (i / (n - 1)) * innerW;
  const yFor = (v: number) =>
    PAD_TOP + innerH - ((v - yMin) / Math.max(0.0001, yMax - yMin)) * innerH;

  const maxPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.maxWeight)}`)
    .join(" ");
  const epleyPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.epley)}`)
    .join(" ");

  const hover = hoverIdx !== null ? points[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? xFor(hoverIdx) : 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-4 mb-3 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[var(--text)]" />
          Top set
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[var(--status-progressed)]" />
          e1RM
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* y grid lines */}
        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={PAD_TOP}
          y2={PAD_TOP}
          stroke="var(--border)"
          strokeWidth={0.5}
        />
        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={HEIGHT - PAD_BOTTOM}
          y2={HEIGHT - PAD_BOTTOM}
          stroke="var(--border)"
          strokeWidth={0.5}
        />

        {/* e1RM line */}
        <path
          d={epleyPath}
          fill="none"
          stroke="var(--status-progressed)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* max weight line */}
        <path
          d={maxPath}
          fill="none"
          stroke="var(--text)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={xFor(i)}
              cy={yFor(p.maxWeight)}
              r={hoverIdx === i ? 3.5 : 2.25}
              fill="var(--text)"
            />
            {/* Invisible wider hit area */}
            <rect
              x={xFor(i) - innerW / (n * 2 || 1)}
              y={PAD_TOP}
              width={Math.max(16, innerW / (n || 1))}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onTouchStart={() => setHoverIdx(i)}
            />
          </g>
        ))}

        {/* Hover guide */}
        {hover && (
          <>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--border-strong)"
              strokeWidth={0.5}
            />
            <text
              x={hoverX > WIDTH / 2 ? hoverX - 4 : hoverX + 4}
              y={PAD_TOP + 12}
              fontSize="10"
              fill="var(--text)"
              textAnchor={hoverX > WIDTH / 2 ? "end" : "start"}
              className="tnum"
            >
              {formatKg(hover.maxWeight)}×{hover.topReps} · e1RM{" "}
              {formatKg(hover.epley)}
            </text>
            <text
              x={hoverX > WIDTH / 2 ? hoverX - 4 : hoverX + 4}
              y={HEIGHT - PAD_BOTTOM + 12}
              fontSize="9"
              fill="var(--text-muted)"
              textAnchor={hoverX > WIDTH / 2 ? "end" : "start"}
              className="tnum"
            >
              {formatDate(hover.date)}
            </text>
          </>
        )}

        {/* Axis labels: first and last dates */}
        {!hover && (
          <>
            <text
              x={PAD_LEFT}
              y={HEIGHT - PAD_BOTTOM + 12}
              fontSize="9"
              fill="var(--text-dim)"
              className="tnum"
            >
              {formatDate(points[0].date)}
            </text>
            <text
              x={WIDTH - PAD_RIGHT}
              y={HEIGHT - PAD_BOTTOM + 12}
              fontSize="9"
              fill="var(--text-dim)"
              textAnchor="end"
              className="tnum"
            >
              {formatDate(points[points.length - 1].date)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

function formatKg(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
