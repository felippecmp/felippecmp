// home-variants.jsx — 3 home-screen directions (Safe / Bold / Experimental)

// ─────────────────────────────────────────────────────────────
// Shared atoms
// ─────────────────────────────────────────────────────────────
const Card = ({ children, style = {}, onClick, padding = 16 }) => (
  <div onClick={onClick} style={{
    background: TOKENS.surf1, borderRadius: 18,
    border: `1px solid ${TOKENS.border}`, padding,
    cursor: onClick ? 'pointer' : 'default', ...style,
  }}>{children}</div>
);

const StatCard = ({ value, label, color, sparkData }) => (
  <div style={{
    background: TOKENS.surf1, borderRadius: 16, padding: 14,
    border: `1px solid ${TOKENS.border}`, flex: 1, minWidth: 0,
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 6, marginBottom: 10,
    }}>
      <span style={{
        fontSize: 30, fontWeight: 800, color, letterSpacing: -1.2, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
      {sparkData && <Spark data={sparkData} color={color} width={48} height={22} />}
    </div>
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>{label}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// DIRECTION A — SAFE: refined current, tighter hierarchy, freq on home
// ─────────────────────────────────────────────────────────────
const HomeSafe = ({ onStart, onTab }) => {
  const S = SAMPLE;
  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '8px 20px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginTop: 4, marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: TOKENS.tSec, marginBottom: 4 }}>{S.date.label}</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, color: TOKENS.coral, letterSpacing: -1, whiteSpace: 'nowrap' }}>{S.user.greeting}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: `${TOKENS.mint}18`, border: `1px solid ${TOKENS.mint}40`,
              padding: '7px 11px', borderRadius: 999,
            }}>
              <Icon name="flame" size={14} color={TOKENS.mint} />
              <span style={{ fontSize: 13, fontWeight: 700, color: TOKENS.mint, fontVariantNumeric: 'tabular-nums' }}>{S.streak.days}</span>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: 999,
              background: TOKENS.surf2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="settings" size={17} color={TOKENS.tSec} />
            </div>
          </div>
        </div>

        {/* Primary card: today's workout */}
        <Card padding={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '18px 18px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 8 }}>
              {S.next.group} · {S.next.exercises} EXERCÍCIOS · ~{S.next.estMin}MIN
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: TOKENS.coral, letterSpacing: -1.2, lineHeight: 1 }}>{S.next.template}</div>
          </div>
          <button onClick={onStart} style={{
            width: '100%', border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${TOKENS.coral}, ${TOKENS.coralDim})`,
            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: '#0B0B10',
          }}>
            <Icon name="play" size={18} color="#0B0B10" />
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.2 }}>Iniciar treino</span>
          </button>
        </Card>

        {/* 3 stat cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <StatCard value={S.weekly.treinos} label="TREINOS" color={TOKENS.mint} sparkData={[2,3,2,4,3,4,4]} />
          <StatCard value={S.weekly.cardio} label="CARDIO" color={TOKENS.coral} sparkData={[0,1,1,2,1,2,2]} />
          <StatCard value={S.weight.current} label="PESO" color={TOKENS.gold} sparkData={S.weight.sparks} />
        </div>

        {/* NEW: Frequency chart on home (from Progresso) */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>FREQUÊNCIA · 4 SEMANAS</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, fontWeight: 600 }}>
              <span style={{ color: TOKENS.mint, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.mint }}/> Força
              </span>
              <span style={{ color: TOKENS.coral, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.coral }}/> Cardio
              </span>
            </div>
          </div>
          <FrequencyChart weeks={S.frequency} height={90} />
        </Card>

        {/* Goals */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Ring value={0} size={42} stroke={4} color={TOKENS.coral}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TOKENS.tSec }}>0</span>
            </Ring>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Hoje</div>
              <div style={{ fontSize: 12, color: TOKENS.tSec }}>0/4 metas</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {S.goals.map(g => {
              const c = g.color === 'coral' ? TOKENS.coral : g.color === 'mint' ? TOKENS.mint : g.color === 'gold' ? TOKENS.gold : TOKENS.gold;
              return (
                <button key={g.id} style={{
                  flex: 1, background: TOKENS.surf2, border: `1px solid ${c}30`,
                  padding: '7px 4px', borderRadius: 10, color: c,
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  cursor: 'pointer',
                }}>
                  <Icon name={g.icon} size={13} color={c} />
                  {g.label}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <button style={{
            flex: 1, background: 'transparent', border: `1px dashed ${TOKENS.border}`,
            borderRadius: 12, padding: '12px', cursor: 'pointer',
            color: TOKENS.tSec, fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          }}>
            <Icon name="note" size={15} /> Escrever nota
          </button>
          <button style={{
            flex: 1, background: 'transparent', border: `1px dashed ${TOKENS.border}`,
            borderRadius: 12, padding: '12px', cursor: 'pointer',
            color: TOKENS.tSec, fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          }}>
            <Icon name="bed" size={15} /> Marcar descanso
          </button>
        </div>

        {/* AI */}
        <button style={{
          width: '100%', background: TOKENS.surf1, border: `1px solid ${TOKENS.border}`,
          borderRadius: 14, padding: '14px', cursor: 'pointer', color: TOKENS.tPrim,
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
          fontSize: 13, fontWeight: 600,
        }}>
          <Icon name="sparkle" size={15} color={TOKENS.amber} /> Gerar resumo da semana com IA
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DIRECTION B — BOLD: editorial + data moments
// ─────────────────────────────────────────────────────────────
const HomeBold = ({ onStart, onTab }) => {
  const S = SAMPLE;
  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '4px 20px 24px' }}>
        {/* Masthead */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: TOKENS.tTer,
          padding: '12px 0 20px', borderBottom: `1px solid ${TOKENS.border}`,
        }}>
          <span>SEX · 17 ABR · SEMANA 16</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="flame" size={12} color={TOKENS.mint}/>
            <span style={{ color: TOKENS.mint }}>{S.streak.days} DIA</span>
          </span>
        </div>

        {/* Huge greeting w/ embedded context */}
        <div style={{ padding: '22px 0 14px' }}>
          <div style={{
            fontSize: 52, fontWeight: 800, letterSpacing: -2.4, lineHeight: 0.95,
            color: TOKENS.tPrim,
          }}>
            Boa noite,<br/>
            <span style={{ color: TOKENS.coral }}>Lucas.</span>
          </div>
          <div style={{ fontSize: 15, color: TOKENS.tSec, marginTop: 14, lineHeight: 1.4 }}>
            Você está em <b style={{ color: TOKENS.tPrim }}>4 treinos</b> esta semana —
            o melhor ritmo em 4 meses. Resta <b style={{ color: TOKENS.coral }}>Lower A</b> para fechar o bloco.
          </div>
        </div>

        {/* HERO block — start card, editorial */}
        <div style={{
          marginTop: 20, padding: '24px 20px', borderRadius: 24,
          background: `radial-gradient(120% 80% at 0% 0%, ${TOKENS.coral}22 0%, ${TOKENS.surf1} 60%)`,
          border: `1px solid ${TOKENS.border}`, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 2, color: TOKENS.coral, marginBottom: 14 }}>
            TREINO DE HOJE
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -2.5, lineHeight: 0.9, color: TOKENS.tPrim }}>
            Lower<br/>A.
          </div>
          <div style={{
            display: 'flex', gap: 24, marginTop: 18,
            fontSize: 12, fontWeight: 600, color: TOKENS.tSec,
          }}>
            <span><b style={{ color: TOKENS.tPrim }}>6</b> exerc.</span>
            <span><b style={{ color: TOKENS.tPrim }}>~55</b> min</span>
            <span><b style={{ color: TOKENS.tPrim }}>12</b> séries</span>
          </div>
          <button onClick={onStart} style={{
            marginTop: 20, width: '100%', background: TOKENS.coral, color: '#0B0B10',
            border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
            letterSpacing: 0.2,
          }}>
            <Icon name="play" size={16} color="#0B0B10" /> INICIAR
          </button>
        </div>

        {/* Editorial stat row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 24,
          borderTop: `1px solid ${TOKENS.border}`, borderBottom: `1px solid ${TOKENS.border}`,
        }}>
          {[
            { v: '4', l: 'Treinos', d: 'sem', c: TOKENS.mint },
            { v: '58', l: 'Séries', d: '+241%', c: TOKENS.coral },
            { v: '27.8', l: 'Ton · 30d', d: '', c: TOKENS.gold },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '18px 0',
              borderLeft: i > 0 ? `1px solid ${TOKENS.border}` : 'none',
              paddingLeft: i > 0 ? 14 : 0,
            }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.c, letterSpacing: -1.2, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: TOKENS.tSec, marginTop: 6 }}>
                {s.l} {s.d && <span style={{ color: TOKENS.tTer, fontWeight: 500 }}>{s.d}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Frequency — minimal, editorial */}
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>Frequência</h3>
            <span style={{ fontSize: 11, fontWeight: 600, color: TOKENS.tTer, letterSpacing: 0.5 }}>4 SEMANAS</span>
          </div>
          <FrequencyChart weeks={S.frequency} height={80} />
        </div>

        {/* AI insight */}
        <div style={{
          marginTop: 22, padding: 18, borderRadius: 18,
          background: TOKENS.surf1, border: `1px solid ${TOKENS.border}`,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: `${TOKENS.amber}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name="sparkle" size={16} color={TOKENS.amber} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, color: TOKENS.amber, marginBottom: 4 }}>INSIGHT</div>
              <div style={{ fontSize: 14, lineHeight: 1.4, color: TOKENS.tPrim }}>
                Ombro lateral abaixo do MV (6/8). Posso adicionar 2 séries ao Upper A de amanhã?
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{
                  background: TOKENS.amber, color: '#0B0B10', border: 'none',
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>Adicionar</button>
                <button style={{
                  background: 'transparent', color: TOKENS.tSec, border: 'none',
                  padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Mais tarde</button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[
            { i: 'note', l: 'Nota' },
            { i: 'bed', l: 'Descanso' },
            { i: 'scale', l: 'Peso' },
            { i: 'heart', l: 'Cardio' },
          ].map(q => (
            <button key={q.l} style={{
              flex: 1, background: TOKENS.surf1, border: `1px solid ${TOKENS.border}`,
              borderRadius: 12, padding: '12px 8px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            }}>
              <Icon name={q.i} size={16} color={TOKENS.tSec} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: TOKENS.tSec }}>{q.l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DIRECTION C — EXPERIMENTAL: "Hub" — unified command surface
// ─────────────────────────────────────────────────────────────
const HomeHub = ({ onStart, onTab, streakPalette = 'gold' }) => {
  const S = SAMPLE;
  const dow = ['D','S','T','Q','Q','S','S'];
  const dayState = [1, 1, 0, 1, 1, 3, 0];
  const dayData = [
    { label: 'DOM · 12 ABR', title: 'Upper A', subtitle: '6 exerc · 52min · 3.8t · +3 PRs',
      exercises: [
        { name: 'Supino reto', sets: 3, reps: 8 }, { name: 'Remada curvada', sets: 3, reps: 10 },
        { name: 'Desenvolvimento', sets: 3, reps: 8 }, { name: 'Puxada alta', sets: 3, reps: 12 },
        { name: 'Elevação lateral', sets: 3, reps: 15 }, { name: 'Face pull', sets: 3, reps: 15 },
      ]},
    { label: 'SEG · 13 ABR', title: 'Lower A', subtitle: '6 exerc · 58min · 4.1t',
      exercises: [
        { name: 'Agachamento', sets: 4, reps: 6 }, { name: 'RDL', sets: 3, reps: 8 },
        { name: 'Leg press', sets: 3, reps: 12 }, { name: 'Cadeira flexora', sets: 3, reps: 12 },
        { name: 'Panturrilha em pé', sets: 4, reps: 15 }, { name: 'Abdominal', sets: 3, reps: 15 },
      ]},
    { label: 'TER · 14 ABR', title: 'Descanso', subtitle: 'Recuperação ativa · 20min caminhada' },
    { label: 'QUA · 15 ABR', title: 'Upper B', subtitle: '6 exerc · 54min · 3.9t · +1 PR',
      exercises: [
        { name: 'Supino inclinado', sets: 3, reps: 8 }, { name: 'Remada unilateral', sets: 3, reps: 10 },
        { name: 'Crucifixo', sets: 3, reps: 12 }, { name: 'Rosca direta', sets: 3, reps: 10 },
        { name: 'Tríceps testa', sets: 3, reps: 12 }, { name: 'Abdominal oblíquo', sets: 3, reps: 20 },
      ]},
    { label: 'QUI · 16 ABR', title: 'Cardio + Core', subtitle: '30min Z2 + core · 4.2km' },
    { label: 'SEX · 17 ABR', title: 'Lower A · Hoje', subtitle: '6 exerc · ~55min planejados' },
    { label: 'SÁB · 18 ABR', title: 'Planejado', subtitle: 'Upper A' },
  ];

  const [showExercise, setShowExercise] = React.useState(null);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [showRecap, setShowRecap] = React.useState(false);
  const [peekDay, setPeekDay] = React.useState(null);
  const [volTooltip, setVolTooltip] = React.useState(null);

  const onRefresh = async () => { await new Promise(r => setTimeout(r, 700)); };

  return (
    <>
    <PullToRefresh onRefresh={onRefresh}>
      <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '8px 16px 24px' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 4px 14px',
        }}>
          <div>
            <div style={{ fontSize: 12, color: TOKENS.tTer, fontWeight: 600 }}>{S.date.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: TOKENS.tPrim, letterSpacing: -0.4 }}>Olá, Lucas</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowCalendar(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', height: 36, borderRadius: 999,
              background: `${TOKENS.coral}15`, border: `1px solid ${TOKENS.coral}35`, cursor: 'pointer',
            }}>
              <Icon name="flame" size={14} color={TOKENS.coral} />
              <span style={{ fontSize: 13, fontWeight: 800, color: TOKENS.coral, fontVariantNumeric: 'tabular-nums' }}>{S.streak.days}</span>
            </button>
            <div style={{
              width: 36, height: 36, borderRadius: 999, background: TOKENS.surf2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="settings" size={17} color={TOKENS.tSec} />
            </div>
          </div>
        </div>

        {/* Week strip — horizontal days */}
        <div style={{
          display: 'flex', gap: 6, padding: '10px 10px', marginBottom: 14,
          background: TOKENS.surf1, borderRadius: 14, border: `1px solid ${TOKENS.border}`,
        }}>
          {dow.map((d, i) => {
            const st = dayState[i];
            const isToday = st === 3;
            const isDone = st === 1;
            return (
              <DayCell key={i} label={d} isToday={isToday} isDone={isDone}
                onPeek={() => setPeekDay(dayData[i])} />
            );
          })}
        </div>

        {/* HERO — unified workout card with ring + context + CTA */}
        <div onClick={onStart} style={{
          background: TOKENS.surf1, borderRadius: 24, padding: 18,
          border: `1px solid ${TOKENS.border}`, cursor: 'pointer',
          marginBottom: 14, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 150, height: 150,
            borderRadius: '50%', background: `radial-gradient(circle, ${TOKENS.coral}25, transparent 70%)`,
          }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
            <Ring value={0} size={78} stroke={5} color={TOKENS.coral}>
              <Icon name="play" size={24} color={TOKENS.coral} />
            </Ring>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, color: TOKENS.tTer, marginBottom: 3 }}>PRÓXIMO TREINO</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: TOKENS.tPrim, letterSpacing: -0.8, lineHeight: 1 }}>Lower A</div>
              <div style={{ fontSize: 12, color: TOKENS.tSec, marginTop: 5 }}>6 exercícios · ~55 min</div>
            </div>
            <Icon name="chevR" size={20} color={TOKENS.tTer}/>
          </div>
          {/* targeted muscles */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {['Quadríceps', 'Posterior', 'Panturrilha', 'Abdômen'].map(m => (
              <span key={m} style={{
                fontSize: 10.5, fontWeight: 600, color: TOKENS.tSec,
                padding: '4px 8px', background: TOKENS.surf3, borderRadius: 6,
              }}>{m}</span>
            ))}
          </div>
        </div>

        {/* STREAK HERO — full-width, motivational */}
        <StreakHero
          days={S.streak.days}
          best={S.streak.best}
          history={S.streak.history}
          milestones={S.milestones}
          palette={streakPalette}
          onTap={() => setShowCalendar(true)}
        />

        {/* Volume mini — now stands alone next to Hero flow */}
        <Card padding={14} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon name="trend" size={14} color={TOKENS.coral} />
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>VOLUME · 30D</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: TOKENS.coral, lineHeight: 1, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>27.8</span>
                <span style={{ fontSize: 12, color: TOKENS.tTer, fontWeight: 600 }}>t</span>
                <span style={{ fontSize: 11, color: TOKENS.mint, fontWeight: 700, marginLeft: 6 }}>↗ +241%</span>
              </div>
            </div>
            <Spark data={[8,10,12,14,16,20,24,27]} color={TOKENS.coral} width={80} height={36} />
          </div>
        </Card>

        {/* Last workout recap trigger */}
        <Card onClick={() => setShowRecap(true)} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: `${TOKENS.coral}15`,
              border: `1px solid ${TOKENS.coral}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="check" size={18} color={TOKENS.coral} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>QUA · ÚLTIMO TREINO</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.tPrim, marginTop: 2, letterSpacing: -0.2 }}>
                Upper A · <span style={{ color: TOKENS.coral }}>+3 PRs</span>
              </div>
              <div style={{ fontSize: 11, color: TOKENS.tTer, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>52min · 14 séries · 3.8t</div>
            </div>
            <Icon name="chevR" size={18} color={TOKENS.tTer} />
          </div>
        </Card>

        {/* Frequency chart */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>FREQUÊNCIA</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, fontWeight: 600 }}>
              <span style={{ color: TOKENS.mint, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.mint }}/> Força
              </span>
              <span style={{ color: TOKENS.coral, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.coral }}/> Cardio
              </span>
            </div>
          </div>
          <FrequencyChart weeks={S.frequency} height={80}
            onWeekTap={(w, i) => setPeekDay({
              label: w.label,
              title: `Semana ${w.label}`,
              subtitle: `${w.forca} força · ${w.cardio} cardio`,
              exercises: [],
            })} />
        </Card>

        {/* Today's Goals — compact row with progress */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Metas de hoje</div>
              <div style={{ fontSize: 11, color: TOKENS.tTer, marginTop: 2 }}>0 de 4 concluídas</div>
            </div>
            <Ring value={0} size={38} stroke={4} color={TOKENS.coral}>
              <span style={{ fontSize: 10, fontWeight: 700, color: TOKENS.tSec }}>0/4</span>
            </Ring>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {S.goals.map(g => {
              const c = g.color === 'coral' ? TOKENS.coral : g.color === 'mint' ? TOKENS.mint : g.color === 'gold' ? TOKENS.gold : TOKENS.gold;
              return (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  background: TOKENS.surf2, borderRadius: 10, border: `1px solid ${TOKENS.border}`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 999,
                    border: `1.5px solid ${c}70`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={g.icon} size={12} color={c} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: TOKENS.tPrim }}>{g.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* AI sidekick — floating glass command */}
        <div style={{
          padding: 14, borderRadius: 16,
          background: `linear-gradient(135deg, ${TOKENS.violet}18, ${TOKENS.surf1})`,
          border: `1px solid ${TOKENS.violet}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="sparkle" size={16} color={TOKENS.violet} />
            <div style={{ flex: 1, fontSize: 13, color: TOKENS.tSec }}>
              <b style={{ color: TOKENS.tPrim }}>Pergunte algo</b> sobre seus treinos…
            </div>
            <Icon name="mic" size={16} color={TOKENS.tTer} />
          </div>
        </div>
      </div>
      </div>
    </PullToRefresh>

      {/* Sheets & modals — outside PullToRefresh to escape transform clipping */}
      <ExerciseSheet exercise={showExercise} onClose={() => setShowExercise(null)} />
      <StreakCalendar open={showCalendar} onClose={() => setShowCalendar(false)} />
      <WorkoutRecap open={showRecap} onClose={() => setShowRecap(false)} />
      <DayPeek day={peekDay} onClose={() => setPeekDay(null)} />
    </>
  );
};

// DayCell with long-press
const DayCell = ({ label, isToday, isDone, onPeek }) => {
  const [pressed, setPressed] = React.useState(false);
  const handlers = useLongPress(onPeek, null, 380);
  return (
    <div {...handlers}
      onMouseDown={(e) => { setPressed(true); handlers.onMouseDown(e); }}
      onMouseUp={(e) => { setPressed(false); handlers.onMouseUp(e); }}
      onMouseLeave={(e) => { setPressed(false); handlers.onMouseLeave(e); }}
      onTouchStart={(e) => { setPressed(true); handlers.onTouchStart(e); }}
      onTouchEnd={(e) => { setPressed(false); handlers.onTouchEnd(e); }}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '6px 0',
        background: isToday ? `${TOKENS.coral}15` : pressed ? TOKENS.surf2 : 'transparent',
        borderRadius: 10, cursor: 'pointer',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform .15s',
        userSelect: 'none',
      }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: isToday ? TOKENS.coral : TOKENS.tTer, letterSpacing: 0.5 }}>{label}</span>
      <div style={{
        width: 20, height: 20, borderRadius: 999,
        background: isToday ? TOKENS.coral : isDone ? TOKENS.mint : TOKENS.surf3,
        border: isToday ? 'none' : `1px solid ${TOKENS.borderStrong}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isDone && !isToday && <Icon name="check" size={12} color={TOKENS.ink} />}
      </div>
    </div>
  );
};

Object.assign(window, { HomeSafe, HomeBold, HomeHub, Card, StatCard });

// ═══════════════════════════════════════════════════════════════
// STREAK HERO — motivational full-width streak showcase
// ═══════════════════════════════════════════════════════════════
// Palette definitions for streak hero — 3 options
const STREAK_PALETTES = {
  gold: {
    name: 'Ouro',
    primary: '#F5C542',   // warm gold
    primaryDim: '#B89122',
    glow: '#F5C542',
    number: '#F5C542',
  },
  lime: {
    name: 'Verde elétrico',
    primary: '#9BE80A',   // electric lime
    primaryDim: '#5FA000',
    glow: '#9BE80A',
    number: '#9BE80A',
  },
  cyan: {
    name: 'Azul elétrico',
    primary: '#4DD4E8',   // electric cyan-blue
    primaryDim: '#2A8FA0',
    glow: '#4DD4E8',
    number: '#4DD4E8',
  },
};

const StreakHero = ({ days, best, history, milestones, onTap, palette = 'gold' }) => {
  const P = STREAK_PALETTES[palette] || STREAK_PALETTES.gold;
  // history: 84 days, 0-4 intensity. Laid out as 12 cols × 7 rows (weeks × days of week)
  const cols = 12;
  const rows = 7;
  const totalCells = cols * rows; // 84
  const grid = history.slice(-totalCells);
  const cell = 13;
  const gap = 4;
  const todayIdx = grid.length - 1;

  // Find next milestone
  const next = milestones.find(m => !m.achieved) || milestones[milestones.length - 1];
  const prev = [...milestones].reverse().find(m => m.achieved);
  const prevDays = prev ? prev.days : 0;
  const progressPct = next ? Math.min(100, ((days - prevDays) / (next.days - prevDays)) * 100) : 100;
  const daysToNext = next ? next.days - days : 0;

  // Intensity colors — palette tones
  const intensityColor = (v) => {
    if (v === 0) return TOKENS.surf2;
    if (v === 1) return `${P.primary}26`;
    if (v === 2) return `${P.primary}66`;
    if (v === 3) return P.primary;
    if (v === 4) return TOKENS.coral; // PR day
    return TOKENS.surf2;
  };

  return (
    <div
      onClick={onTap}
      style={{
        position: 'relative',
        marginBottom: 14,
        padding: 18,
        borderRadius: 20,
        background: `radial-gradient(ellipse at 85% 0%, ${P.primary}22 0%, transparent 55%), linear-gradient(180deg, ${TOKENS.surf1} 0%, ${TOKENS.surf0 || TOKENS.surf1} 100%)`,
        border: `1px solid ${P.primary}30`,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Top: big number + flame */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, color: TOKENS.tTer, marginBottom: 4 }}>
            SEQUÊNCIA ATUAL
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, lineHeight: 1 }}>
            <span style={{
              fontSize: 64, fontWeight: 800, color: P.number,
              letterSpacing: -2.5, fontVariantNumeric: 'tabular-nums',
              lineHeight: 0.9,
              textShadow: `0 0 28px ${P.glow}55`,
            }}>{days}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: TOKENS.tPrim, letterSpacing: -0.2 }}>dias</span>
              <span style={{ fontSize: 11, color: TOKENS.tTer, fontWeight: 600 }}>
                melhor: <span style={{ color: TOKENS.tSec, fontWeight: 700 }}>{best}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Flame badge with pulsing ring */}
        <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 999,
            background: `radial-gradient(circle, ${TOKENS.coral}44 0%, transparent 70%)`,
            animation: 'pulse 2.4s ease-in-out infinite',
          }}/>
          <div style={{
            position: 'relative', width: 56, height: 56, borderRadius: 999,
            background: `linear-gradient(135deg, ${TOKENS.coral}, ${TOKENS.coralDim || '#C43745'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 20px ${TOKENS.coral}50`,
          }}>
            <Icon name="flame" size={26} color="#fff" />
          </div>
        </div>
      </div>

      {/* Heatmap grid — 12 weeks × 7 days */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoFlow: 'column',
        gridTemplateRows: `repeat(${rows}, ${cell}px)`,
        gap,
        marginBottom: 14,
      }}>
        {grid.map((v, i) => {
          const isToday = i === todayIdx;
          const inStreak = i > todayIdx - days;
          return (
            <div key={i} style={{
              height: cell, borderRadius: 3,
              background: intensityColor(v),
              border: isToday ? `1.5px solid ${TOKENS.tPrim}` : inStreak && v > 0 ? `1px solid ${P.primary}88` : 'none',
              boxShadow: isToday ? `0 0 10px ${P.primary}88` : 'none',
            }}/>
          );
        })}
      </div>

      {/* Legend row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 10, color: TOKENS.tTer, fontWeight: 600, letterSpacing: 0.3,
        marginBottom: 16,
      }}>
        <span>12 semanas</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>menos</span>
          {[0,1,2,3].map(v => (
            <div key={v} style={{ width: 9, height: 9, borderRadius: 2, background: intensityColor(v) }}/>
          ))}
          <div style={{ width: 9, height: 9, borderRadius: 2, background: TOKENS.coral, marginLeft: 2 }}/>
          <span>PR</span>
        </div>
      </div>

      {/* Next milestone progress */}
      {next && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: TOKENS.tSec }}>
              PRÓXIMA CONQUISTA · <span style={{ color: TOKENS.tPrim }}>{next.label}</span>
            </div>
            <div style={{ fontSize: 11, color: TOKENS.tTer, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              +{daysToNext} {daysToNext === 1 ? 'dia' : 'dias'}
            </div>
          </div>
          <div style={{
            position: 'relative', height: 6, borderRadius: 4,
            background: TOKENS.surf3, overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              width: `${progressPct}%`,
              background: `linear-gradient(90deg, ${P.primary}, ${TOKENS.coral})`,
              borderRadius: 4,
              transition: 'width .4s cubic-bezier(.2,.8,.3,1)',
            }}/>
          </div>
          {/* Milestone markers */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 10, paddingTop: 2,
          }}>
            {milestones.map(m => {
              const reached = m.achieved;
              const isCurrent = m.current;
              return (
                <div key={m.days} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  opacity: reached ? 1 : 0.55,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 999,
                    background: reached ? P.primary : isCurrent ? `${TOKENS.coral}22` : TOKENS.surf2,
                    border: isCurrent ? `1.5px dashed ${TOKENS.coral}` : `1px solid ${TOKENS.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9.5, fontWeight: 800, color: reached ? TOKENS.ink : TOKENS.tSec,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {reached ? <Icon name="check" size={12} color={TOKENS.ink} /> : m.days}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
                    color: reached ? P.primary : isCurrent ? TOKENS.coral : TOKENS.tTer,
                    whiteSpace: 'nowrap',
                  }}>{m.days}d</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { StreakHero });
