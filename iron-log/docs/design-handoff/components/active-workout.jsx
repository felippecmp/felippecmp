// active-workout.jsx — live set logging, rest timer, interactive

const ActiveWorkout = ({ onClose, onFinish }) => {
  const S = SAMPLE;
  const [exercises, setExercises] = React.useState(S.lowerA.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) })));
  const [currentEx, setCurrentEx] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(14 * 60 + 23); // seconds
  const [restTimer, setRestTimer] = React.useState(0); // 0 = off
  const [restDuration, setRestDuration] = React.useState(90);
  const [showFinish, setShowFinish] = React.useState(false);
  const [pulseSet, setPulseSet] = React.useState(null);
  const [showPlateCalc, setShowPlateCalc] = React.useState(null); // weight or null
  const [showExerciseSheet, setShowExerciseSheet] = React.useState(null);
  const [pr, setPr] = React.useState(null); // { name, diff } or null

  // elapsed timer
  React.useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  // rest timer
  React.useEffect(() => {
    if (restTimer <= 0) return;
    const t = setInterval(() => setRestTimer(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [restTimer]);

  const ex = exercises[currentEx];
  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);
  const doneSets = exercises.reduce((s, e) => s + e.sets.filter(s => s.done).length, 0);
  const progressPct = doneSets / totalSets;

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const completeSet = (setIdx) => {
    setExercises(prev => {
      const next = [...prev];
      next[currentEx] = {
        ...next[currentEx],
        sets: next[currentEx].sets.map((s, i) => i === setIdx ? { ...s, done: !s.done } : s),
      };
      return next;
    });
    // trigger rest if completing (not uncompleting)
    if (!ex.sets[setIdx].done) {
      setRestTimer(restDuration);
      setPulseSet(`${currentEx}-${setIdx}`);
      setTimeout(() => setPulseSet(null), 500);
      // simulate PR on 2nd exercise, last set (RDL)
      const allDoneAfter = ex.sets.every((s, i) => i === setIdx ? true : s.done);
      if (currentEx === 1 && setIdx === ex.sets.length - 1 && allDoneAfter) {
        setTimeout(() => setPr({ name: ex.name, diff: '+5kg' }), 450);
      }
    }
  };

  const updateSet = (setIdx, field, delta) => {
    setExercises(prev => {
      const next = [...prev];
      const sets = [...next[currentEx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: Math.max(0, sets[setIdx][field] + delta) };
      next[currentEx] = { ...next[currentEx], sets };
      return next;
    });
  };

  const addSet = () => {
    setExercises(prev => {
      const next = [...prev];
      const last = next[currentEx].sets[next[currentEx].sets.length - 1];
      next[currentEx] = {
        ...next[currentEx],
        sets: [...next[currentEx].sets, { ...last, done: false }],
      };
      return next;
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: TOKENS.ink, position: 'relative' }}>
      {/* Top bar */}
      <div style={{
        padding: '8px 16px 10px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${TOKENS.border}`,
      }}>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 10, background: TOKENS.surf2, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevD" size={18} color={TOKENS.tSec} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.tTer, letterSpacing: 0.5 }}>LOWER A</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: TOKENS.tPrim, letterSpacing: -0.3, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(elapsed)}
            </span>
            <span style={{ fontSize: 11, color: TOKENS.tTer }}>{doneSets}/{totalSets} séries</span>
          </div>
        </div>
        <button onClick={() => setShowFinish(true)} style={{
          background: `${TOKENS.mint}18`, color: TOKENS.mint, border: `1px solid ${TOKENS.mint}30`,
          padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>Finalizar</button>
      </div>
      {/* Progress */}
      <div style={{ height: 3, background: TOKENS.surf2, position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, right: 'auto', width: `${progressPct * 100}%`,
          background: TOKENS.coral, transition: 'width .3s ease',
        }} />
      </div>

      {/* Exercise strip */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto',
        borderBottom: `1px solid ${TOKENS.border}`,
      }}>
        {exercises.map((e, i) => {
          const done = e.sets.every(s => s.done);
          const active = i === currentEx;
          return (
            <button key={e.id} onClick={() => setCurrentEx(i)} style={{
              padding: '6px 11px', borderRadius: 8, border: 'none',
              background: active ? TOKENS.coral : done ? `${TOKENS.mint}18` : TOKENS.surf2,
              color: active ? '#0B0B10' : done ? TOKENS.mint : TOKENS.tSec,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {done && !active && <Icon name="check" size={11} color={TOKENS.mint} />}
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 180px' }}>
        {/* Exercise header */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 4 }}>
            EXERCÍCIO {currentEx + 1} DE {exercises.length} · {ex.muscle.toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: TOKENS.tPrim, letterSpacing: -0.6, lineHeight: 1.1 }}>
              {ex.name}
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{
                width: 34, height: 34, borderRadius: 9, background: TOKENS.surf2, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="swap" size={16} color={TOKENS.tSec} /></button>
              <button onClick={() => setShowExerciseSheet(ex)} style={{
                width: 34, height: 34, borderRadius: 9, background: TOKENS.surf2, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="info" size={16} color={TOKENS.tSec} /></button>
            </div>
          </div>
        </div>

        {/* Last-time + e1RM */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{
            flex: 1, padding: '10px 12px', background: TOKENS.surf1, borderRadius: 10,
            border: `1px solid ${TOKENS.border}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: TOKENS.tTer }}>ÚLTIMA VEZ</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.tPrim, marginTop: 2 }}>{ex.lastTime}</div>
          </div>
          <div style={{
            padding: '10px 12px', background: TOKENS.surf1, borderRadius: 10,
            border: `1px solid ${TOKENS.border}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: TOKENS.tTer }}>e1RM</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.mint, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{ex.e1rm}kg</div>
          </div>
        </div>

        {/* Sets grid header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 44px', gap: 8,
          padding: '0 4px 8px', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer,
        }}>
          <span>SET</span>
          <span style={{ textAlign: 'center' }}>KG</span>
          <span style={{ textAlign: 'center' }}>REPS</span>
          <span style={{ textAlign: 'center' }}>RIR</span>
          <span></span>
        </div>

        {/* Set rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ex.sets.map((s, i) => (
            <div key={i} className={pulseSet === `${currentEx}-${i}` ? 'set-pulse' : ''} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 44px', gap: 8,
              alignItems: 'center',
              padding: '10px 8px', borderRadius: 12,
              background: s.done ? `${TOKENS.mint}10` : TOKENS.surf1,
              border: `1px solid ${s.done ? TOKENS.mint + '30' : TOKENS.border}`,
              transition: 'all .2s',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7, background: s.done ? TOKENS.mint : TOKENS.surf3,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4,
                fontSize: 11, fontWeight: 800, color: s.done ? TOKENS.ink : TOKENS.tSec,
              }}>{i + 1}</div>
              <SetInput val={s.weight} suffix="kg" onDelta={(d) => updateSet(i, 'weight', d)} dis={s.done} step={2.5}
                onDoubleClick={() => setShowPlateCalc(s.weight)} />
              <SetInput val={s.reps} onDelta={(d) => updateSet(i, 'reps', d)} dis={s.done} />
              <SetInput val={s.rir} onDelta={(d) => updateSet(i, 'rir', d)} dis={s.done} />
              <button onClick={() => completeSet(i)} style={{
                width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: s.done ? TOKENS.mint : 'transparent',
                boxShadow: s.done ? 'none' : `inset 0 0 0 1.5px ${TOKENS.borderStrong}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="check" size={17} color={s.done ? TOKENS.ink : TOKENS.tTer} />
              </button>
            </div>
          ))}
        </div>

        {/* Add set */}
        <button onClick={addSet} style={{
          width: '100%', marginTop: 10, padding: '11px', border: `1px dashed ${TOKENS.border}`,
          background: 'transparent', borderRadius: 12, cursor: 'pointer', color: TOKENS.tSec,
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="plus" size={14} /> Adicionar série
        </button>

        {/* Note */}
        <button style={{
          width: '100%', marginTop: 10, padding: '11px', border: `1px solid ${TOKENS.border}`,
          background: TOKENS.surf1, borderRadius: 12, cursor: 'pointer', color: TOKENS.tSec,
          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="note" size={14} /> Escrever nota para este exercício
        </button>
      </div>

      {/* Rest timer floating pill */}
      <RestTimerPill seconds={restTimer} total={restDuration}
        onDismiss={() => setRestTimer(0)}
        onAdd={() => setRestTimer(r => r + 15)} />

      {/* Bottom nav between exercises */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        padding: '10px 16px 24px',
        background: `linear-gradient(to top, ${TOKENS.ink} 80%, transparent)`,
        display: 'flex', gap: 10,
      }}>
        <button onClick={() => setCurrentEx(i => Math.max(0, i - 1))} disabled={currentEx === 0}
          style={{
            flex: '0 0 auto', padding: '14px 16px', borderRadius: 14, border: `1px solid ${TOKENS.border}`,
            background: TOKENS.surf1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: currentEx === 0 ? 0.4 : 1,
          }}>
          <Icon name="chevL" size={18} color={TOKENS.tSec} />
        </button>
        <button onClick={() => setCurrentEx(i => Math.min(exercises.length - 1, i + 1))}
          style={{
            flex: 1, padding: '14px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: TOKENS.coral, color: '#0B0B10',
            fontSize: 14, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          Próximo exercício <Icon name="chevR" size={16} color="#0B0B10" />
        </button>
      </div>

      {/* Finish sheet */}
      {showFinish && (
        <FinishSheet onClose={() => setShowFinish(false)} onConfirm={onFinish} elapsed={fmt(elapsed)}
          totalSets={totalSets} doneSets={doneSets} />
      )}

      {/* Plate calculator */}
      <PlateCalculator open={showPlateCalc !== null} weight={showPlateCalc}
        onClose={() => setShowPlateCalc(null)} />

      {/* Exercise detail sheet */}
      <ExerciseSheet exercise={showExerciseSheet} onClose={() => setShowExerciseSheet(null)} />

      {/* PR celebration */}
      <PRCelebration show={!!pr} exercise={pr?.name} diff={pr?.diff} onClose={() => setPr(null)} />
    </div>
  );
};

// Stepper input
const SetInput = ({ val, onDelta, dis, step = 1, suffix, onDoubleClick }) => {
  const lastTap = React.useRef(0);
  const handleValueTap = () => {
    if (!onDoubleClick) return;
    const now = Date.now();
    if (now - lastTap.current < 300) onDoubleClick();
    lastTap.current = now;
  };
  return (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: TOKENS.surf2, borderRadius: 9, padding: '4px 4px', border: `1px solid ${TOKENS.border}`,
    opacity: dis ? 0.7 : 1,
  }}>
    <button onClick={() => !dis && onDelta(-step)} style={{
      width: 26, height: 26, borderRadius: 7, background: 'transparent', border: 'none', cursor: dis ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}><Icon name="minus" size={12} color={TOKENS.tSec} /></button>
    <span onClick={handleValueTap} style={{ fontSize: 14, fontWeight: 700, color: TOKENS.tPrim, fontVariantNumeric: 'tabular-nums', cursor: onDoubleClick ? 'pointer' : 'default', userSelect: 'none' }}>
      {val}{suffix && <span style={{ fontSize: 10, color: TOKENS.tTer, marginLeft: 1 }}>{suffix}</span>}
    </span>
    <button onClick={() => !dis && onDelta(step)} style={{
      width: 26, height: 26, borderRadius: 7, background: 'transparent', border: 'none', cursor: dis ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}><Icon name="plus" size={12} color={TOKENS.tSec} /></button>
  </div>
  );
};

const FinishSheet = ({ onClose, onConfirm, elapsed, totalSets, doneSets }) => (
  <div style={{
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
    display: 'flex', alignItems: 'flex-end', padding: 0,
  }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', background: TOKENS.surf1, borderRadius: '24px 24px 0 0',
      padding: '24px 20px 34px', border: `1px solid ${TOKENS.border}`, borderBottom: 'none',
    }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: TOKENS.surf3, margin: '0 auto 18px' }} />
      <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: TOKENS.tPrim }}>Finalizar treino?</h3>
      <div style={{ fontSize: 13, color: TOKENS.tSec, marginTop: 6 }}>Você pode revisar e ajustar depois.</div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 18,
      }}>
        <Stat label="DURAÇÃO" v={elapsed} c={TOKENS.mint} />
        <Stat label="SÉRIES" v={`${doneSets}/${totalSets}`} c={TOKENS.coral} />
        <Stat label="VOLUME" v="4.2t" c={TOKENS.gold} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '15px', borderRadius: 12, background: TOKENS.surf2, border: 'none', cursor: 'pointer',
          color: TOKENS.tPrim, fontSize: 14, fontWeight: 700,
        }}>Continuar</button>
        <button onClick={onConfirm} style={{
          flex: 1, padding: '15px', borderRadius: 12, background: TOKENS.mint, border: 'none', cursor: 'pointer',
          color: TOKENS.ink, fontSize: 14, fontWeight: 800,
        }}>Salvar</button>
      </div>
    </div>
  </div>
);

const Stat = ({ label, v, c }) => (
  <div style={{ padding: '12px 10px', background: TOKENS.surf2, borderRadius: 11, border: `1px solid ${TOKENS.border}` }}>
    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color: c, marginTop: 3, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>{v}</div>
  </div>
);

// Post-workout summary
const WorkoutSummary = ({ onClose }) => {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 20px 40px', background: TOKENS.ink }}>
      <button onClick={onClose} style={{
        width: 34, height: 34, borderRadius: 10, background: TOKENS.surf2, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      }}>
        <Icon name="x" size={18} color={TOKENS.tSec} />
      </button>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: TOKENS.mint, marginBottom: 8 }}>TREINO COMPLETO</div>
      <h1 style={{ fontSize: 44, fontWeight: 800, margin: 0, letterSpacing: -1.5, lineHeight: 1 }}>Lower A<br/><span style={{ color: TOKENS.coral }}>finalizado.</span></h1>
      <div style={{ fontSize: 14, color: TOKENS.tSec, marginTop: 12 }}>
        Volume: 4.2 toneladas · 12 séries · PR em <b style={{ color: TOKENS.mint }}>RDL</b>
      </div>

      {/* Contribution to week */}
      <div style={{
        marginTop: 22, padding: 16, background: TOKENS.surf1, borderRadius: 18,
        border: `1px solid ${TOKENS.border}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 12 }}>CONTRIBUIÇÃO NA SEMANA</div>
        <FrequencyChart weeks={SAMPLE.frequency.slice(0, 3).concat({ label: 'ATUAL', forca: 5, cardio: 1 })} height={80} />
      </div>

      {/* Muscle impact */}
      <div style={{ marginTop: 16, padding: 16, background: TOKENS.surf1, borderRadius: 18, border: `1px solid ${TOKENS.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 14 }}>IMPACTO NOS MÚSCULOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <VolumeBar current={13} target={10} mev={8} mav={14} mrv={18} label="Quadríceps" status="PRODUTIVO" />
          <VolumeBar current={10} target={8} mev={6} mav={12} mrv={18} label="Posterior de coxa" status="PRODUTIVO" />
          <VolumeBar current={7} target={8} mev={8} mav={14} mrv={18} label="Panturrilha" status="MANUTENÇÃO" />
        </div>
      </div>

      <button onClick={onClose} style={{
        width: '100%', marginTop: 20, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer',
        background: TOKENS.coral, color: '#0B0B10', fontSize: 15, fontWeight: 800,
      }}>Voltar ao início</button>
    </div>
  );
};

Object.assign(window, { ActiveWorkout, WorkoutSummary });
