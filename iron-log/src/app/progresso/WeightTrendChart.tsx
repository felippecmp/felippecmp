type WeightPoint = {
  date: string;
  weightKg: number;
};

const WIDTH = 560;
const HEIGHT = 140;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;

/**
 * Compact weight trend chart. Same brutalist style as WeightChart in the
 * per-exercise page, but server-rendered and simpler — no hover state,
 * since this is an overview glance.
 */
export function WeightTrendChart({ series }: { series: WeightPoint[] }) {
  if (series.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] text-center py-6">
        Sem dados de peso ainda.
      </p>
    );
  }

  const values = series.map((s) => s.weightKg);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const yPad = Math.max(0.5, (maxVal - minVal) * 0.2);
  const yMin = Math.max(0, minVal - yPad);
  const yMax = maxVal + yPad;

  const n = series.length;
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  // Convert ISO dates to relative x by timestamp (so gaps look like gaps).
  const firstT = new Date(series[0].date).getTime();
  const lastT = new Date(series[series.length - 1].date).getTime();
  const span = Math.max(1, lastT - firstT);

  const xFor = (iso: string) => {
    if (n === 1) return PAD_LEFT + innerW / 2;
    const t = new Date(iso).getTime();
    return PAD_LEFT + ((t - firstT) / span) * innerW;
  };
  const yFor = (v: number) =>
    PAD_TOP + innerH - ((v - yMin) / Math.max(0.0001, yMax - yMin)) * innerH;

  const path = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.date)},${yFor(p.weightKg)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-auto"
      preserveAspectRatio="none"
    >
      {/* Baseline */}
      <line
        x1={PAD_LEFT}
        x2={WIDTH - PAD_RIGHT}
        y1={HEIGHT - PAD_BOTTOM}
        y2={HEIGHT - PAD_BOTTOM}
        stroke="var(--border)"
        strokeWidth={0.5}
      />

      {/* Fill under the curve, subtle */}
      <path
        d={`${path} L${xFor(series[n - 1].date)},${HEIGHT - PAD_BOTTOM} L${xFor(series[0].date)},${HEIGHT - PAD_BOTTOM} Z`}
        fill="var(--text)"
        fillOpacity="0.04"
      />

      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke="var(--text)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {series.map((p, i) => (
        <circle
          key={i}
          cx={xFor(p.date)}
          cy={yFor(p.weightKg)}
          r={1.75}
          fill="var(--text)"
        />
      ))}

      {/* Axis labels: first and last date */}
      <text
        x={PAD_LEFT}
        y={HEIGHT - PAD_BOTTOM + 12}
        fontSize="9"
        fill="var(--text-dim)"
        className="tnum"
      >
        {formatDate(series[0].date)}
      </text>
      <text
        x={WIDTH - PAD_RIGHT}
        y={HEIGHT - PAD_BOTTOM + 12}
        fontSize="9"
        fill="var(--text-dim)"
        textAnchor="end"
        className="tnum"
      >
        {formatDate(series[series.length - 1].date)}
      </text>
    </svg>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
