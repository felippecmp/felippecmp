import {
  computeZoneSeconds,
  formatZoneMinutes,
  totalZoneSeconds,
  type ZoneSeconds,
} from "@/lib/hr-zones";

export type HrSample = { t: number; hr: number };

export type SetMarker = {
  t: number;
  label: string;
  isWarmup: boolean;
};

const ZONE_KEYS: Array<keyof ZoneSeconds> = ["z1", "z2", "z3", "z4", "z5"];
const ZONE_LABELS: Record<keyof ZoneSeconds, string> = {
  z1: "Z1",
  z2: "Z2",
  z3: "Z3",
  z4: "Z4",
  z5: "Z5",
};
// Mono ramp using the accent color so it works in every theme.
const ZONE_OPACITIES: Record<keyof ZoneSeconds, number> = {
  z1: 0.2,
  z2: 0.4,
  z3: 0.6,
  z4: 0.8,
  z5: 1.0,
};

const WIDTH = 560;
const HEIGHT = 180;
const PAD_LEFT = 26;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

/**
 * Server-rendered HR curve with vertical markers at each saved set's
 * wall-clock timestamp. Uses the same brutalist style as WeightTrendChart
 * in /progresso.
 *
 * The samples array is a downsampled series (~1 point every 5 seconds)
 * with `t` as seconds since `hrSeriesStartTime`. Markers come from
 * workout_sets.performed_at converted to the same offset.
 */
export function SessionHrChart({
  samples,
  markers,
  maxHr,
}: {
  samples: HrSample[];
  markers: SetMarker[];
  maxHr: number | null;
}) {
  if (samples.length < 2) return null;

  const zoneSeconds = maxHr ? computeZoneSeconds(samples, maxHr) : null;
  const zoneTotal = zoneSeconds ? totalZoneSeconds(zoneSeconds) : 0;

  const hrValues = samples.map((s) => s.hr);
  const minHr = Math.min(...hrValues);
  const sampleMaxHr = Math.max(...hrValues);
  // Pad the Y domain so the line doesn't hug the edges; clamp to
  // physiologically reasonable bounds.
  const yMin = Math.max(30, Math.floor(minHr - 5));
  const yMax = Math.min(220, Math.ceil(sampleMaxHr + 5));

  const tValues = samples.map((s) => s.t);
  const tMin = Math.min(0, ...tValues);
  const tMax = Math.max(...tValues);
  const tSpan = Math.max(1, tMax - tMin);

  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (t: number) =>
    PAD_LEFT + ((t - tMin) / tSpan) * innerW;
  const yFor = (hr: number) =>
    PAD_TOP + innerH - ((hr - yMin) / Math.max(1, yMax - yMin)) * innerH;

  const linePath = samples
    .map((s, i) => `${i === 0 ? "M" : "L"}${xFor(s.t)},${yFor(s.hr)}`)
    .join(" ");

  const fillPath =
    `${linePath} L${xFor(samples[samples.length - 1].t)},${HEIGHT - PAD_BOTTOM}` +
    ` L${xFor(samples[0].t)},${HEIGHT - PAD_BOTTOM} Z`;

  // Filter markers to those that fall within the sample window. Outside
  // markers are visual noise (the set was logged after the watch stopped
  // recording, or before it started).
  const visibleMarkers = markers.filter(
    (m) => m.t >= tMin - 5 && m.t <= tMax + 5
  );

  const avgHr = Math.round(
    hrValues.reduce((a, b) => a + b, 0) / hrValues.length
  );

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="label">Batimentos durante a sessão</p>
        <span className="text-[10px] text-[var(--text-dim)] tnum">
          {visibleMarkers.length} sets marcados
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        {/* Y axis ticks: min, avg, max */}
        {[yMin, avgHr, yMax].map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="var(--border)"
              strokeWidth={0.4}
              strokeDasharray={i === 1 ? "2 3" : undefined}
              opacity={i === 1 ? 0.6 : 0.4}
            />
            <text
              x={2}
              y={yFor(v) + 3}
              fontSize="9"
              fill="var(--text-dim)"
              className="tnum"
            >
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* Vertical set markers (working sets stronger than warmups) */}
        {visibleMarkers.map((m, i) => (
          <line
            key={i}
            x1={xFor(m.t)}
            x2={xFor(m.t)}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            stroke={
              m.isWarmup
                ? "var(--border)"
                : "var(--border-strong)"
            }
            strokeWidth={m.isWarmup ? 0.5 : 0.75}
            strokeDasharray="2 3"
          />
        ))}

        {/* Fill under the HR curve */}
        <path
          d={fillPath}
          fill="var(--status-stalled)"
          fillOpacity="0.08"
        />

        {/* HR line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--status-stalled)"
          strokeWidth={1.25}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* X axis labels: start and end time */}
        <text
          x={PAD_LEFT}
          y={HEIGHT - PAD_BOTTOM + 13}
          fontSize="9"
          fill="var(--text-dim)"
          className="tnum"
        >
          0:00
        </text>
        <text
          x={WIDTH - PAD_RIGHT}
          y={HEIGHT - PAD_BOTTOM + 13}
          fontSize="9"
          fill="var(--text-dim)"
          textAnchor="end"
          className="tnum"
        >
          {formatMMSS(tMax)}
        </text>
      </svg>
      <p className="text-[10px] text-[var(--text-dim)] mt-2 leading-relaxed">
        Linhas tracejadas marcam quando cada set foi salvo. Picos de HR
        geralmente coincidem com working sets; vales são descansos.
      </p>

      {/* HR zones — only when max_hr is configured */}
      {zoneSeconds && zoneTotal > 0 ? (
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <div className="flex items-baseline justify-between mb-2">
            <p className="label">Zonas</p>
            <span className="text-[10px] text-[var(--text-dim)] tnum">
              max {maxHr} bpm
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden border border-[var(--border)]">
            {ZONE_KEYS.map((k) => {
              const seconds = zoneSeconds[k];
              const pct = (seconds / zoneTotal) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={k}
                  style={{
                    width: `${pct}%`,
                    background: "var(--accent)",
                    opacity: ZONE_OPACITIES[k],
                  }}
                  title={`${ZONE_LABELS[k]} · ${formatZoneMinutes(seconds)}`}
                />
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1 text-[10px] text-[var(--text-muted)] tnum tabular-nums">
            {ZONE_KEYS.map((k) => (
              <div key={k} className="flex flex-col items-center">
                <span className="uppercase tracking-wider">
                  {ZONE_LABELS[k]}
                </span>
                <span
                  className={
                    zoneSeconds[k] > 0
                      ? "text-[var(--text)]"
                      : "text-[var(--text-faint)]"
                  }
                >
                  {formatZoneMinutes(zoneSeconds[k])}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : !maxHr ? (
        <p className="text-[10px] text-[var(--text-dim)] mt-3 pt-3 border-t border-[var(--border)] leading-relaxed">
          Configure seu HR máximo em{" "}
          <a href="/settings" className="underline">
            Configurações
          </a>{" "}
          pra desbloquear as zonas.
        </p>
      ) : null}
    </div>
  );
}

function formatMMSS(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
