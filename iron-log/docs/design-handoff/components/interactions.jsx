// interactions.jsx — micro-interactions: sheets, modals, gestures, celebrations

// ═══════════════════════════════════════════════════════════════
// BOTTOM SHEET — drag to dismiss, reusable
// ═══════════════════════════════════════════════════════════════
const BottomSheet = ({ open, onClose, children, height = 'auto', maxHeight = '85%' }) => {
  const [dragY, setDragY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [bounds, setBounds] = React.useState(null);
  const startY = React.useRef(0);

  React.useEffect(() => {
    if (!open) { setDragY(0); return; }
    // locate the Phone inner frame by scanning for the distinctive style
    const findPhone = () => {
      const divs = [...document.querySelectorAll('div')];
      // the Phone inner is position:relative with overflow:hidden, borderRadius 44, background TOKENS.ink
      return divs.find(d => {
        const s = d.style;
        return s.position === 'relative' && s.overflow === 'hidden' && parseInt(s.borderRadius) === 44;
      });
    };
    const el = findPhone();
    if (el) {
      const r = el.getBoundingClientRect();
      setBounds({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  }, [open]);

  if (!open) return null;

  const onDown = (e) => {
    startY.current = e.touches ? e.touches[0].clientY : e.clientY;
    setDragging(true);
  };
  const onMove = (e) => {
    if (!dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setDragY(Math.max(0, y - startY.current));
  };
  const onUp = () => {
    setDragging(false);
    if (dragY > 100) onClose();
    else setDragY(0);
  };

  const style = bounds ? {
    position: 'fixed', top: bounds.top, left: bounds.left,
    width: bounds.width, height: bounds.height,
  } : { position: 'absolute', inset: 0 };

  return (
    <div style={{
      ...style, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'fadeIn .22s ease-out',
      borderRadius: 44, overflow: 'hidden',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchMove={onMove} onTouchEnd={onUp}
        style={{
          width: '100%', background: TOKENS.surf1,
          borderRadius: '24px 24px 0 0',
          border: `1px solid ${TOKENS.border}`, borderBottom: 'none',
          maxHeight, height, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform .25s cubic-bezier(.2,.9,.3,1)',
          animation: 'slideUp .28s cubic-bezier(.2,.9,.3,1)',
        }}>
        <div onMouseDown={onDown} onTouchStart={onDown} style={{ padding: '10px 0 4px', cursor: 'grab' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: TOKENS.surf3, margin: '0 auto' }} />
        </div>
        <div style={{ overflowY: 'auto', padding: '10px 20px 28px', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EXERCISE DETAIL SHEET — history, e1RM chart, notes
// ═══════════════════════════════════════════════════════════════
const ExerciseSheet = ({ exercise, onClose }) => {
  if (!exercise) return null;
  // fake e1RM history
  const history = [92, 95, 98, 100, 100, 102, 105, 105, 108, 110, 108, 112];
  const sessions = [
    { date: '17 ABR', weight: 80, reps: 8, rir: 2, pr: true },
    { date: '14 ABR', weight: 77.5, reps: 8, rir: 2 },
    { date: '10 ABR', weight: 75, reps: 10, rir: 1 },
    { date: '07 ABR', weight: 75, reps: 8, rir: 3 },
    { date: '03 ABR', weight: 72.5, reps: 10, rir: 2 },
  ];

  return (
    <BottomSheet open={!!exercise} onClose={onClose}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>
          {exercise.muscle?.toUpperCase() || 'QUADRÍCEPS'}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 0', color: TOKENS.tPrim, letterSpacing: -0.5 }}>
          {exercise.name || 'Agachamento livre'}
        </h2>
      </div>

      {/* e1RM card */}
      <div style={{
        marginTop: 16, padding: 14, borderRadius: 14,
        background: TOKENS.surf2, border: `1px solid ${TOKENS.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>e1RM · 12 SEMANAS</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: TOKENS.coral, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>
            {exercise.e1rm || 112}<span style={{ fontSize: 11, color: TOKENS.tTer, fontWeight: 600, marginLeft: 2 }}>kg</span>
          </span>
        </div>
        <Spark data={history} color={TOKENS.coral} width={280} height={48} />
      </div>

      {/* recent sessions */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 10 }}>HISTÓRICO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sessions.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: s.pr ? `${TOKENS.coral}10` : TOKENS.surf2,
              border: `1px solid ${s.pr ? TOKENS.coral + '30' : TOKENS.border}`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TOKENS.tTer, letterSpacing: 0.5, width: 50 }}>{s.date}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: TOKENS.tPrim, fontVariantNumeric: 'tabular-nums' }}>
                {s.weight}kg × {s.reps} <span style={{ color: TOKENS.tTer, fontWeight: 500, fontSize: 11 }}>RIR {s.rir}</span>
              </span>
              {s.pr && (
                <span style={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: 1, color: TOKENS.coral,
                  padding: '3px 6px', background: `${TOKENS.coral}15`, borderRadius: 5,
                }}>PR</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button style={{
          flex: 1, padding: '12px', borderRadius: 11, background: TOKENS.surf2,
          border: `1px solid ${TOKENS.border}`, cursor: 'pointer', color: TOKENS.tPrim,
          fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="note" size={14} color={TOKENS.tSec} /> Notas
        </button>
        <button style={{
          flex: 1, padding: '12px', borderRadius: 11, background: TOKENS.surf2,
          border: `1px solid ${TOKENS.border}`, cursor: 'pointer', color: TOKENS.tPrim,
          fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="swap" size={14} color={TOKENS.tSec} /> Substituir
        </button>
      </div>
    </BottomSheet>
  );
};

// ═══════════════════════════════════════════════════════════════
// PLATE CALCULATOR — double-tap on weight
// ═══════════════════════════════════════════════════════════════
const PlateCalculator = ({ open, weight = 80, onClose }) => {
  if (!open) return null;
  const bar = 20;
  const perSide = (weight - bar) / 2;
  const plates = [20, 15, 10, 5, 2.5, 1.25];
  const breakdown = [];
  let rem = perSide;
  for (const p of plates) {
    const n = Math.floor(rem / p);
    if (n > 0) { breakdown.push({ p, n }); rem -= n * p; }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>CALCULADORA DE ANILHAS</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 48, fontWeight: 800, color: TOKENS.coral, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{weight}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: TOKENS.tSec }}>kg</span>
        <span style={{ fontSize: 11, color: TOKENS.tTer, marginLeft: 8 }}>barra 20kg + {perSide}kg/lado</span>
      </div>

      {/* barbell visual */}
      <div style={{
        marginTop: 22, padding: '20px 14px', borderRadius: 14,
        background: TOKENS.surf2, border: `1px solid ${TOKENS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        {/* left plates */}
        {[...breakdown].reverse().flatMap(({ p, n }) => Array(n).fill(p)).map((p, i) => (
          <div key={'l'+i} style={{
            width: p >= 15 ? 10 : p >= 10 ? 8 : p >= 5 ? 6 : 4,
            height: p >= 15 ? 64 : p >= 10 ? 52 : p >= 5 ? 42 : p >= 2.5 ? 30 : 22,
            background: p === 20 ? '#E8443D' : p === 15 ? '#F2C130' : p === 10 ? '#2B6DBF' : p === 5 ? '#E8E8E8' : p === 2.5 ? '#1A1A1A' : '#5A5A5A',
            borderRadius: 2,
          }} />
        ))}
        {/* bar center */}
        <div style={{ flex: 1, height: 6, background: 'linear-gradient(to bottom, #8A8A8A, #5A5A5A)', borderRadius: 2, maxWidth: 80 }} />
        {/* right plates (mirror) */}
        {breakdown.flatMap(({ p, n }) => Array(n).fill(p)).map((p, i) => (
          <div key={'r'+i} style={{
            width: p >= 15 ? 10 : p >= 10 ? 8 : p >= 5 ? 6 : 4,
            height: p >= 15 ? 64 : p >= 10 ? 52 : p >= 5 ? 42 : p >= 2.5 ? 30 : 22,
            background: p === 20 ? '#E8443D' : p === 15 ? '#F2C130' : p === 10 ? '#2B6DBF' : p === 5 ? '#E8E8E8' : p === 2.5 ? '#1A1A1A' : '#5A5A5A',
            borderRadius: 2,
          }} />
        ))}
      </div>

      {/* breakdown */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 8 }}>POR LADO</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {breakdown.map(({ p, n }) => (
            <span key={p} style={{
              padding: '6px 10px', borderRadius: 8,
              background: TOKENS.surf2, border: `1px solid ${TOKENS.border}`,
              fontSize: 12, fontWeight: 700, color: TOKENS.tPrim, fontVariantNumeric: 'tabular-nums',
            }}>{n} × {p}kg</span>
          ))}
          {breakdown.length === 0 && <span style={{ fontSize: 12, color: TOKENS.tTer }}>só a barra</span>}
        </div>
      </div>
    </BottomSheet>
  );
};

// ═══════════════════════════════════════════════════════════════
// STREAK CALENDAR — tap on flame
// ═══════════════════════════════════════════════════════════════
const StreakCalendar = ({ open, onClose }) => {
  if (!open) return null;
  // 30 days, 1=done 0=rest 2=missed
  const days = [1,1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,2,0,1,1,1,3]; // 3 = today
  const labels = ['D','S','T','Q','Q','S','S'];
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Icon name="flame" size={20} color={TOKENS.coral} />
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>CONSISTÊNCIA · ABRIL</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: TOKENS.tPrim, letterSpacing: -0.4 }}>
            <span style={{ color: TOKENS.coral }}>12 dias</span> em sequência
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 18 }}>
        {labels.map((l, i) => (
          <div key={'h'+i} style={{ fontSize: 10, fontWeight: 700, color: TOKENS.tTer, textAlign: 'center', letterSpacing: 0.5 }}>{l}</div>
        ))}
        {/* offset for month start — say Apr starts on a Tuesday */}
        {[0,1].map(i => <div key={'e'+i} />)}
        {days.map((st, i) => (
          <div key={i} style={{
            aspectRatio: '1/1', borderRadius: 8,
            background: st === 3 ? TOKENS.coral : st === 1 ? `${TOKENS.coral}60` : st === 2 ? `${TOKENS.coral}15` : TOKENS.surf2,
            border: st === 3 ? `2px solid ${TOKENS.tPrim}` : `1px solid ${TOKENS.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: st === 3 ? TOKENS.ink : st === 1 ? TOKENS.tPrim : TOKENS.tTer,
            fontVariantNumeric: 'tabular-nums',
          }}>{i + 1}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20 }}>
        {[
          { v: 12, l: 'ATUAL', c: TOKENS.coral },
          { v: 21, l: 'MELHOR', c: TOKENS.amber },
          { v: 86, l: '% DO MÊS', c: TOKENS.mint },
        ].map((s, i) => (
          <div key={i} style={{
            padding: 12, borderRadius: 12, background: TOKENS.surf2, border: `1px solid ${TOKENS.border}`,
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>{s.l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c, marginTop: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{s.v}</div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
};

// ═══════════════════════════════════════════════════════════════
// WORKOUT RECAP MODAL — tap on "hoje" card
// ═══════════════════════════════════════════════════════════════
const WorkoutRecap = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>QUARTA · UPPER A</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 0', color: TOKENS.tPrim, letterSpacing: -0.5 }}>
        Último treino <span style={{ color: TOKENS.coral }}>+3 PRs</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
        {[
          ['52min', 'DURAÇÃO'],
          ['14', 'SÉRIES'],
          ['3.8t', 'VOLUME'],
          ['RPE 7', 'INTENS.'],
        ].map(([v, l]) => (
          <div key={l} style={{ padding: '10px 8px', borderRadius: 10, background: TOKENS.surf2, border: `1px solid ${TOKENS.border}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: TOKENS.tTer }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: TOKENS.tPrim, marginTop: 2, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 10 }}>PRs DESTA SESSÃO</div>
        {[
          ['Supino reto', '80kg × 8', '+2.5kg'],
          ['Remada curvada', '70kg × 10', '+5kg'],
          ['Desenvolvimento', '45kg × 8', '+2.5kg'],
        ].map(([name, perf, diff], i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', padding: '11px 12px',
            marginTop: i === 0 ? 0 : 6,
            background: `${TOKENS.coral}10`, borderRadius: 10, border: `1px solid ${TOKENS.coral}30`,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TOKENS.tPrim }}>{name}</div>
              <div style={{ fontSize: 11, color: TOKENS.tTer, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{perf}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: TOKENS.coral, fontVariantNumeric: 'tabular-nums' }}>{diff}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 10 }}>IMPACTO SEMANAL</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <VolumeBar current={13} target={10} mev={8} mav={14} mrv={18} label="Peito" status="PRODUTIVO" />
          <VolumeBar current={11} target={10} mev={8} mav={14} mrv={20} label="Costas" status="PRODUTIVO" />
          <VolumeBar current={8} target={8} mev={8} mav={14} mrv={20} label="Ombros" status="MANUTENÇÃO" />
        </div>
      </div>
    </BottomSheet>
  );
};

// ═══════════════════════════════════════════════════════════════
// DAY PEEK — long press on day strip
// ═══════════════════════════════════════════════════════════════
const DayPeek = ({ day, onClose }) => {
  if (!day) return null;
  return (
    <BottomSheet open={!!day} onClose={onClose}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>{day.label}</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 0', color: TOKENS.tPrim, letterSpacing: -0.4 }}>
        {day.title}
      </h2>
      <div style={{ fontSize: 12, color: TOKENS.tSec, marginTop: 4 }}>
        {day.subtitle}
      </div>
      {day.exercises && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {day.exercises.map((e, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 11px', borderRadius: 9, background: TOKENS.surf2, border: `1px solid ${TOKENS.border}`,
            }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: TOKENS.tTer, letterSpacing: 0.5, width: 20 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TOKENS.tPrim }}>{e.name}</span>
              <span style={{ fontSize: 11, color: TOKENS.tTer, fontVariantNumeric: 'tabular-nums' }}>{e.sets}×{e.reps}</span>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
};

// ═══════════════════════════════════════════════════════════════
// PR CONFETTI — one-shot celebration
// ═══════════════════════════════════════════════════════════════
const PRCelebration = ({ show, exercise, diff, onClose }) => {
  const [bounds, setBounds] = React.useState(null);
  React.useEffect(() => {
    if (show) {
      const divs = [...document.querySelectorAll('div')];
      const phone = divs.find(d => {
        const s = d.style;
        return s.position === 'relative' && s.overflow === 'hidden' && parseInt(s.borderRadius) === 44;
      });
      if (phone) {
        const r = phone.getBoundingClientRect();
        setBounds({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
      const t = setTimeout(onClose, 3200);
      return () => clearTimeout(t);
    }
  }, [show]);
  if (!show) return null;
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  const style = bounds
    ? { position: 'fixed', top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height }
    : { position: 'absolute', inset: 0 };
  return (
    <div style={{
      ...style, zIndex: 300, pointerEvents: 'none',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 100, overflow: 'hidden', borderRadius: 44,
    }}>
      {pieces.map(i => {
        const colors = [TOKENS.coral, TOKENS.amber, TOKENS.mint, TOKENS.violet];
        return (
          <span key={i} style={{
            position: 'absolute', top: 100,
            width: 8, height: 14, background: colors[i % 4],
            left: `${10 + (i * 73) % 80}%`,
            borderRadius: 2,
            animation: `confetti-fall 2.8s cubic-bezier(.2,.6,.5,1) ${i * 0.04}s forwards`,
            transform: `rotate(${(i * 37) % 360}deg)`,
            opacity: 0,
          }}/>
        );
      })}
      <div style={{
        pointerEvents: 'auto',
        padding: '18px 22px', borderRadius: 18,
        background: `linear-gradient(135deg, ${TOKENS.coral}, ${TOKENS.coralDim})`,
        color: TOKENS.ink, textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,.5)',
        animation: 'popIn .4s cubic-bezier(.34,1.56,.64,1)',
        maxWidth: 280,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, opacity: 0.75 }}>PERSONAL RECORD</div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, marginTop: 4, lineHeight: 1 }}>{exercise || 'RDL'}</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, opacity: 0.85 }}>{diff || '+5kg'} no e1RM 🔥</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// LONG PRESS HOOK — useLongPress
// ═══════════════════════════════════════════════════════════════
const useLongPress = (onLongPress, onClick, ms = 400) => {
  const timerRef = React.useRef(null);
  const triggered = React.useRef(false);
  const start = (e) => {
    triggered.current = false;
    timerRef.current = setTimeout(() => {
      triggered.current = true;
      onLongPress?.(e);
    }, ms);
  };
  const clear = (e) => {
    clearTimeout(timerRef.current);
    if (!triggered.current) onClick?.(e);
  };
  const cancel = () => clearTimeout(timerRef.current);
  return {
    onMouseDown: start, onMouseUp: clear, onMouseLeave: cancel,
    onTouchStart: start, onTouchEnd: clear,
  };
};

// ═══════════════════════════════════════════════════════════════
// PULL-TO-REFRESH WRAPPER
// ═══════════════════════════════════════════════════════════════
const PullToRefresh = ({ onRefresh, children }) => {
  const [pullY, setPullY] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef(0);
  const scrollEl = React.useRef(null);

  const onStart = (e) => {
    if (scrollEl.current && scrollEl.current.scrollTop === 0) {
      startY.current = e.touches ? e.touches[0].clientY : e.clientY;
    } else {
      startY.current = -1;
    }
  };
  const onMove = (e) => {
    if (startY.current < 0 || refreshing) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const d = y - startY.current;
    if (d > 0) setPullY(Math.min(120, d * 0.5));
  };
  const onEnd = async () => {
    if (pullY > 60) {
      setRefreshing(true);
      await onRefresh?.();
      setTimeout(() => { setRefreshing(false); setPullY(0); }, 900);
    } else {
      setPullY(0);
    }
    startY.current = -1;
  };

  return (
    <div ref={scrollEl} style={{ height: '100%', overflowY: 'auto', position: 'relative' }}
      onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: pullY,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1, overflow: 'hidden', transition: refreshing ? 'none' : 'height .2s',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          border: `2.5px solid ${TOKENS.surf3}`,
          borderTopColor: TOKENS.coral,
          animation: refreshing ? 'spin 0.9s linear infinite' : 'none',
          opacity: pullY / 80,
          transform: `rotate(${pullY * 3}deg)`,
        }}/>
      </div>
      <div style={{ transform: `translateY(${pullY}px)`, transition: refreshing ? 'none' : 'transform .2s' }}>
        {children}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// FLOATING REST TIMER PILL — persists across screens
// ═══════════════════════════════════════════════════════════════
const RestTimerPill = ({ seconds, total = 90, onDismiss, onAdd }) => {
  const [bounds, setBounds] = React.useState(null);
  const active = seconds > 0;
  React.useEffect(() => {
    if (!active) return;
    const divs = [...document.querySelectorAll('div')];
    const phone = divs.find(d => {
      const s = d.style;
      return s.position === 'relative' && s.overflow === 'hidden' && parseInt(s.borderRadius) === 44;
    });
    if (phone) {
      const r = phone.getBoundingClientRect();
      setBounds({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  }, [active]);

  if (!active) return null;
  const pct = seconds / total;
  const fmt = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,'0')}`;
  const style = bounds
    ? { position: 'fixed', left: bounds.left + 12, right: 'auto', width: bounds.width - 24, top: bounds.top + bounds.height - 180 }
    : { position: 'absolute', bottom: 90, left: 12, right: 12 };

  return (
    <div style={{
      ...style, zIndex: 40,
      padding: '10px 12px', borderRadius: 14,
      background: TOKENS.surf2, border: `1px solid ${TOKENS.coral}40`,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 10px 30px rgba(0,0,0,.45)',
      animation: 'slideUp .26s cubic-bezier(.2,.9,.3,1)',
    }}>
      <div style={{ position: 'relative', width: 34, height: 34 }}>
        <svg width="34" height="34" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="17" cy="17" r="14" stroke={TOKENS.surf3} strokeWidth="3" fill="none" />
          <circle cx="17" cy="17" r="14" stroke={TOKENS.coral} strokeWidth="3" fill="none"
            strokeDasharray={`${2 * Math.PI * 14}`}
            strokeDashoffset={`${2 * Math.PI * 14 * (1 - pct)}`}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, color: TOKENS.tTer }}>DESCANSO</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: TOKENS.coral, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmt}</div>
      </div>
      <button onClick={onAdd} style={{
        padding: '7px 10px', borderRadius: 8, background: TOKENS.surf3, border: 'none', cursor: 'pointer',
        color: TOKENS.tPrim, fontSize: 11, fontWeight: 700,
      }}>+15s</button>
      <button onClick={onDismiss} style={{
        width: 28, height: 28, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="x" size={14} color={TOKENS.tSec} />
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TOOLTIP — tap on volume bar
// ═══════════════════════════════════════════════════════════════
const Tooltip = ({ children, content, open, onClose }) => (
  <div style={{ position: 'relative' }}>
    {children}
    {open && (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)', zIndex: 100,
          background: TOKENS.surf3, border: `1px solid ${TOKENS.borderStrong}`,
          borderRadius: 10, padding: '10px 12px', minWidth: 180,
          boxShadow: '0 10px 30px rgba(0,0,0,.5)',
          animation: 'popIn .2s ease-out',
        }}>
          {content}
        </div>
      </>
    )}
  </div>
);

// inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('tl-kf')) {
  const s = document.createElement('style');
  s.id = 'tl-kf';
  s.textContent = `
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes popIn { 0% { transform: scale(.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
    }
    @keyframes pulse-done {
      0% { transform: scale(1); }
      40% { transform: scale(1.06); background: ${TOKENS.coral}30; }
      100% { transform: scale(1); }
    }
    .set-pulse { animation: pulse-done .5s cubic-bezier(.34,1.56,.64,1); }
    @keyframes pulse { 0%, 100% { transform: scale(1); opacity: .7; } 50% { transform: scale(1.15); opacity: 1; } }
  `;
  document.head.appendChild(s);
}

Object.assign(window, {
  BottomSheet, ExerciseSheet, PlateCalculator, StreakCalendar,
  WorkoutRecap, DayPeek, PRCelebration, useLongPress, PullToRefresh,
  RestTimerPill, Tooltip,
});
