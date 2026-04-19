// shared-viz.jsx — reusable data viz pieces

// Sparkline
const Spark = ({ data, color, width = 64, height = 28, strokeWidth = 1.75, fill = false }) => {
  if (!data?.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = path + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {fill && <path d={area} fill={color} opacity="0.14" />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Weekly frequency — 4 weeks of bars (força + cardio stacked)
const FrequencyChart = ({ weeks, height = 110, onWeekTap }) => {
  // weeks: [{label, forca, cardio}]
  const max = Math.max(...weeks.map(w => w.forca + w.cardio), 6);
  const barW = 48;
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', height: height + 28, paddingTop: 14 }}>
      {weeks.map((w, i) => {
        const total = w.forca + w.cardio;
        const isCurrent = i === weeks.length - 1;
        const h = (total / max) * height;
        const hCardio = (w.cardio / max) * height;
        const hForca = (w.forca / max) * height;
        return (
          <div key={i}
            onClick={onWeekTap ? () => onWeekTap(w, i) : undefined}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: onWeekTap ? 'pointer' : 'default' }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: total ? (isCurrent ? TOKENS.tPrim : TOKENS.tSec) : 'transparent',
              fontVariantNumeric: 'tabular-nums',
            }}>{total || '\u00A0'}</div>
            <div style={{
              width: barW, height, position: 'relative',
              background: total ? 'transparent' : TOKENS.surf2,
              borderRadius: 10, overflow: 'hidden',
              border: total ? 'none' : `1px dashed ${TOKENS.border}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            }}>
              {hCardio > 0 && (
                <div style={{
                  height: hCardio, background: isCurrent ? TOKENS.coral : `${TOKENS.coral}66`,
                  borderTopLeftRadius: 8, borderTopRightRadius: 8,
                }} />
              )}
              {hForca > 0 && (
                <div style={{
                  height: hForca, background: isCurrent ? TOKENS.mint : `${TOKENS.mint}66`,
                  borderTopLeftRadius: hCardio > 0 ? 0 : 8,
                  borderTopRightRadius: hCardio > 0 ? 0 : 8,
                }} />
              )}
            </div>
            <div style={{ fontSize: 11, color: isCurrent ? TOKENS.tPrim : TOKENS.tTer, fontWeight: 600, letterSpacing: 0.3 }}>
              {w.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// MV/MEV/MAV/MRV bar
const VolumeBar = ({ current, target, mev, mav, mrv, label, status }) => {
  // position along a 0..(mrv+2) scale
  const scaleMax = mrv + 2;
  const pos = Math.min(current / scaleMax, 1) * 100;
  const mevP = (mev / scaleMax) * 100;
  const mavP = (mav / scaleMax) * 100;
  const mrvP = (mrv / scaleMax) * 100;
  const statusColor = status === 'PRODUTIVO' ? TOKENS.mint
    : status === 'ABAIXO DO MV' ? TOKENS.coral
    : status === 'MANUTENÇÃO' ? TOKENS.amber
    : TOKENS.tSec;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {current} <span style={{ color: TOKENS.tTer, fontWeight: 500 }}>/ {target}</span>
          </span>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
            color: statusColor,
            background: `${statusColor}18`,
            padding: '3px 7px', borderRadius: 5,
          }}>{status}</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 10, borderRadius: 6, background: TOKENS.surf3, overflow: 'hidden' }}>
        {/* zones */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${mevP}%`, background: `${TOKENS.coral}35` }} />
        <div style={{ position: 'absolute', left: `${mevP}%`, top: 0, bottom: 0, width: `${mavP - mevP}%`, background: `${TOKENS.mint}30` }} />
        <div style={{ position: 'absolute', left: `${mavP}%`, top: 0, bottom: 0, width: `${mrvP - mavP}%`, background: `${TOKENS.mint}20` }} />
        <div style={{ position: 'absolute', left: `${mrvP}%`, top: 0, bottom: 0, right: 0, background: `${TOKENS.amber}30` }} />
        {/* pointer */}
        <div style={{
          position: 'absolute', left: `calc(${pos}% - 6px)`, top: -2, width: 12, height: 14,
          borderRadius: 3, background: TOKENS.tPrim, boxShadow: '0 0 0 2px ' + TOKENS.ink,
        }} />
      </div>
      <div style={{
        display: 'flex', marginTop: 4, fontSize: 9, fontWeight: 600,
        color: TOKENS.tQuat, letterSpacing: 0.5,
      }}>
        <span style={{ width: `${mevP}%` }}>MV</span>
        <span style={{ width: `${mavP - mevP}%` }}>MEV</span>
        <span style={{ width: `${mrvP - mavP}%` }}>MAV</span>
        <span style={{ flex: 1, textAlign: 'right' }}>MRV</span>
      </div>
    </div>
  );
};

// Donut chart for muscle distribution
const DonutChart = ({ data, size = 130, thickness = 22, centerLabel, centerSub }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = c * frac;
          const el = (
            <circle key={i} cx={size/2} cy={size/2} r={r}
              fill="none" stroke={d.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 1,
      }}>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{centerLabel}</div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: TOKENS.tTer }}>{centerSub}</div>
      </div>
    </div>
  );
};

// Consistency heatmap — 90 days (13 weeks × 7 days)
const Heatmap = ({ days }) => {
  // days: array length 90, values: 0 (none), 1..4 intensity, -1 rest, -2 near-complete
  const cols = 13;
  const cell = 18;
  const gap = 3;
  const colorFor = (v) => {
    if (v === 0) return TOKENS.surf2;
    if (v === -1) return 'transparent'; // rest
    if (v === -2) return `${TOKENS.coral}55`; // quase
    if (v >= 4) return TOKENS.mint;
    if (v === 3) return `${TOKENS.mint}aa`;
    if (v === 2) return `${TOKENS.mintDim}`;
    if (v === 1) return `${TOKENS.mint}55`;
    return TOKENS.surf2;
  };
  const border = (v) => v === -1 ? `1px dashed ${TOKENS.border}` : 'none';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, width: '100%' }}>
      {Array.from({ length: cols * 7 }).map((_, i) => {
        const v = days[i] ?? 0;
        return (
          <div key={i} style={{
            aspectRatio: '1', borderRadius: 3,
            background: colorFor(v), border: border(v),
          }} />
        );
      })}
    </div>
  );
};

// Circular ring progress
const Ring = ({ value = 0.5, size = 80, stroke = 7, color = TOKENS.coral, track, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track || TOKENS.surf3} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - value)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
};

Object.assign(window, { Spark, FrequencyChart, VolumeBar, DonutChart, Heatmap, Ring });
