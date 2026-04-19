// train-screen.jsx — Treinar (template picker) — Hub aesthetic

const TrainScreen = ({ onStart, onActive }) => {
  const S = SAMPLE;
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('ALL');
  const groups = ['ALL', ...new Set(S.templates.map(t => t.group))];
  const filtered = S.templates.filter(t =>
    (filter === 'ALL' || t.group === filter) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '8px 16px 20px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 14px' }}>
          <div>
            <div style={{ fontSize: 12, color: TOKENS.tTer, fontWeight: 600 }}>{S.date.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: TOKENS.tPrim, letterSpacing: -0.4 }}>Treinar</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: TOKENS.surf2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calendar" size={17} color={TOKENS.tSec} />
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: TOKENS.surf2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={17} color={TOKENS.tSec} />
            </div>
          </div>
        </div>

        {/* HERO — Next workout ring card (matches Hub home) */}
        <div onClick={onActive} style={{
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
          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {['Quadríceps', 'Posterior', 'Panturrilha', 'Abdômen'].map(m => (
              <span key={m} style={{
                fontSize: 10.5, fontWeight: 600, color: TOKENS.tSec,
                padding: '4px 8px', background: TOKENS.surf3, borderRadius: 6,
              }}>{m}</span>
            ))}
          </div>
        </div>

        {/* AI builder — violet accent */}
        <button style={{
          width: '100%', background: `linear-gradient(135deg, ${TOKENS.violet}18, ${TOKENS.surf1})`,
          border: `1px solid ${TOKENS.violet}30`,
          borderRadius: 16, padding: '14px', cursor: 'pointer', color: TOKENS.tPrim, marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: `${TOKENS.violet}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="sparkle" size={18} color={TOKENS.violet} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Montar treino com IA</div>
            <div style={{ fontSize: 11.5, color: TOKENS.tSec, marginTop: 2 }}>Calibra pelo tempo e disposição</div>
          </div>
          <Icon name="chevR" size={16} color={TOKENS.tTer} />
        </button>

        <button style={{
          width: '100%', background: 'transparent', border: `1px dashed ${TOKENS.border}`,
          borderRadius: 14, padding: '12px', cursor: 'pointer', color: TOKENS.tSec,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 13, fontWeight: 600, marginTop: 10, marginBottom: 18,
        }}>
          <Icon name="bolt" size={14} color={TOKENS.amber} /> Briefing AI antes do treino
        </button>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: TOKENS.surf1, border: `1px solid ${TOKENS.border}`,
          borderRadius: 12, padding: '10px 12px', marginBottom: 10,
        }}>
          <Icon name="search" size={15} color={TOKENS.tTer} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar template…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: TOKENS.tPrim, fontSize: 13, fontFamily: 'inherit' }} />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {groups.map(g => (
            <button key={g} onClick={() => setFilter(g)} style={{
              padding: '7px 13px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: filter === g ? TOKENS.coral : TOKENS.surf2,
              color: filter === g ? '#0B0B10' : TOKENS.tSec,
              fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3, flexShrink: 0,
            }}>{g === 'ALL' ? 'Todos' : g}</button>
          ))}
        </div>

        {/* Templates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((t, i) => (
            <div key={t.id} style={{
              padding: '14px 14px', background: TOKENS.surf1, borderRadius: 14,
              border: `1px solid ${t.next ? TOKENS.coral + '30' : TOKENS.border}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: t.next ? `${TOKENS.coral}15` : TOKENS.surf2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: t.next ? `1px solid ${TOKENS.coral}30` : 'none',
              }}>
                <Icon name="dumbbell" size={18} color={t.next ? TOKENS.coral : TOKENS.tSec} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>{t.group}</span>
                  {t.next && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: TOKENS.coral }}>· PRÓXIMO</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: TOKENS.tPrim }}>{t.name}</div>
                <div style={{ fontSize: 11, color: TOKENS.tTer, marginTop: 2 }}>{t.exercises} exerc · ~{t.estMin}min · {t.lastDone}</div>
              </div>
              <button onClick={i === 0 ? onActive : null} style={{
                background: t.next ? TOKENS.coral : TOKENS.surf2, color: t.next ? '#0B0B10' : TOKENS.tPrim,
                border: 'none', padding: '9px 12px', borderRadius: 10,
                fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                cursor: 'pointer', flexShrink: 0,
              }}>
                <Icon name="play" size={11} color={t.next ? '#0B0B10' : TOKENS.tPrim} />
                Iniciar
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: TOKENS.tTer, fontSize: 13 }}>Nenhum template encontrado</div>
          )}
        </div>
      </div>
    </div>
  );
};

window.TrainScreen = TrainScreen;
