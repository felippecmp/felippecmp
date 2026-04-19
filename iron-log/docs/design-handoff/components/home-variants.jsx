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
const HomeHub = ({ onStart, onTab }) => {
  const S = SAMPLE;
  // days-of-week strip
  const dow = ['D','S','T','Q','Q','S','S'];
  const dayState = [1, 1, 0, 1, 1, 3, 0]; // 0 off, 1 done, 3 today
  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
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
            <div style={{
              width: 36, height: 36, borderRadius: 999, background: TOKENS.surf2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="search" size={17} color={TOKENS.tSec} />
            </div>
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
              <div key={i} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '6px 0',
                background: isToday ? `${TOKENS.coral}15` : 'transparent',
                borderRadius: 10,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isToday ? TOKENS.coral : TOKENS.tTer, letterSpacing: 0.5 }}>{d}</span>
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

        {/* DUAL focus row — streak + volume mini-card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Card padding={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon name="flame" size={14} color={TOKENS.mint} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>STREAK</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: TOKENS.mint, lineHeight: 1, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{S.streak.days}</span>
              <span style={{ fontSize: 12, color: TOKENS.tTer, fontWeight: 600 }}>dia</span>
            </div>
            <div style={{ fontSize: 11, color: TOKENS.tTer, marginTop: 4 }}>Melhor: {S.streak.best} dias</div>
          </Card>
          <Card padding={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon name="trend" size={14} color={TOKENS.coral} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>VOLUME · 30D</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: TOKENS.coral, lineHeight: 1, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>27.8</span>
              <span style={{ fontSize: 12, color: TOKENS.tTer, fontWeight: 600 }}>t</span>
            </div>
            <div style={{ fontSize: 11, color: TOKENS.mint, marginTop: 4, fontWeight: 600 }}>↗ +241%</div>
          </Card>
        </div>

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
          <FrequencyChart weeks={S.frequency} height={80} />
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
  );
};

Object.assign(window, { HomeSafe, HomeBold, HomeHub, Card, StatCard });
