// progress-screen.jsx — Progresso — Hub aesthetic

const ProgressScreen = () => {
  const S = SAMPLE;
  const [period, setPeriod] = React.useState('7d');
  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '8px 16px 20px' }}>
        {/* Top bar — consistent with Hub */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 14px' }}>
          <div>
            <div style={{ fontSize: 12, color: TOKENS.tTer, fontWeight: 600 }}>Análise</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: TOKENS.tPrim, letterSpacing: -0.4 }}>Progresso</div>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: 4, background: TOKENS.surf2, borderRadius: 999 }}>
            {['7d','30d','90d'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: period === p ? TOKENS.coral : 'transparent',
                color: period === p ? '#0B0B10' : TOKENS.tSec,
                fontSize: 11, fontWeight: 700,
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Hero KPIs — full bleed card with editorial numbers */}
        <div style={{
          background: `radial-gradient(120% 80% at 100% 0%, ${TOKENS.coral}18 0%, ${TOKENS.surf1} 60%)`,
          borderRadius: 24, padding: 18, marginBottom: 14,
          border: `1px solid ${TOKENS.border}`,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, color: TOKENS.tTer, marginBottom: 12 }}>VOLUME LEVANTADO · 30D</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: TOKENS.coral, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>27.8</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: TOKENS.tSec, letterSpacing: -0.5 }}>toneladas</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11.5, fontWeight: 600 }}>
            <span style={{ color: TOKENS.mint, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="trend" size={12} color={TOKENS.mint} /> +241% vs anterior
            </span>
            <span style={{ color: TOKENS.tTer }}>· 58 séries</span>
          </div>
        </div>

        {/* Mini KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          <KPI label="SESSÕES" v={S.weekly.treinos} sub="30d" color={TOKENS.mint} spark={[1,2,3,2,3,4,4]} />
          <KPI label="STREAK" v={S.streak.days} sub={`melhor ${S.streak.best}`} color={TOKENS.amber} icon="flame" />
          <KPI label="TEMPO" v="4h" sub="30d" color={TOKENS.gold} spark={[1,2,2,3,3,4,4]} />
        </div>

        {/* Frequency */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
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

        {/* Donut distribution */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 14 }}>DISTRIBUIÇÃO · 7 DIAS</div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <DonutChart data={S.distribution} centerLabel="58" centerSub="SETS" />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
              {S.distribution.slice(0, 8).map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: d.color, flexShrink: 0 }}/>
                  <span style={{ color: TOKENS.tSec, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                  <span style={{ color: TOKENS.tPrim, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Volume by muscle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>VOLUME POR MÚSCULO · 7D</span>
          <span style={{ fontSize: 10, color: TOKENS.tTer, fontWeight: 600 }}>MV → MRV</span>
        </div>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {S.muscles.map(m => (
              <VolumeBar key={m.name} current={m.current} target={m.target} mev={m.mev} mav={m.mav} mrv={m.mrv}
                label={m.name} status={m.status} />
            ))}
          </div>
        </Card>

        {/* Heatmap */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>CONSISTÊNCIA · 90 DIAS</div>
            <span style={{ fontSize: 11, color: TOKENS.tTer, fontWeight: 600 }}>5 sessões</span>
          </div>
          <Heatmap days={S.heatmap} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 9.5, fontWeight: 600, color: TOKENS.tTer, letterSpacing: 0.4 }}>
            <span>MENOS</span>
            {[1,2,3,4].map(i => (
              <span key={i} style={{
                width: 11, height: 11, borderRadius: 2.5,
                background: i === 4 ? TOKENS.mint : i === 3 ? TOKENS.mint + 'aa' : i === 2 ? TOKENS.mintDim : TOKENS.mint + '55',
              }}/>
            ))}
            <span>MAIS</span>
            <span style={{ width: 11, height: 11, borderRadius: 2.5, background: TOKENS.coral + '55', marginLeft: 6 }}/>
            <span>QUASE</span>
          </div>
        </Card>

        {/* Recents */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer }}>EXERCÍCIOS RECENTES</span>
          <span style={{ fontSize: 11, color: TOKENS.coral, fontWeight: 600 }}>Ver tudo →</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SAMPLE.recentExercises.slice(0, 4).map((e, i) => (
            <div key={i} style={{
              padding: '12px 14px', background: TOKENS.surf1, borderRadius: 12,
              border: `1px solid ${TOKENS.border}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.tPrim }}>{e.name}</div>
                <div style={{ fontSize: 11, color: TOKENS.tTer, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {e.muscle} · {e.weight}kg × {e.reps}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: TOKENS.tTer, letterSpacing: 0.8 }}>e1RM</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: TOKENS.mint, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{e.e1rm}</div>
              </div>
              <Icon name="chevR" size={15} color={TOKENS.tTer} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const KPI = ({ label, v, sub, color, spark, icon }) => (
  <div style={{
    padding: 12, borderRadius: 14, background: TOKENS.surf1,
    border: `1px solid ${TOKENS.border}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
      {icon && <Icon name={icon} size={11} color={color} />}
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, color: TOKENS.tTer }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
      <span style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: -0.8, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
      {spark && <Spark data={spark} color={color} width={38} height={18} />}
    </div>
    <div style={{ fontSize: 10, color: TOKENS.tTer, marginTop: 4, fontWeight: 500 }}>{sub}</div>
  </div>
);

// More / Settings — hub-style
const MoreScreen = () => (
  <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
    <div style={{ padding: '8px 16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 18px' }}>
        <div>
          <div style={{ fontSize: 12, color: TOKENS.tTer, fontWeight: 600 }}>Ajustes & mais</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: TOKENS.tPrim, letterSpacing: -0.4 }}>Mais</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: TOKENS.surf2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="settings" size={17} color={TOKENS.tSec} />
        </div>
      </div>

      {/* Profile card */}
      <div style={{
        background: `linear-gradient(135deg, ${TOKENS.coral}15, ${TOKENS.surf1})`,
        border: `1px solid ${TOKENS.border}`, borderRadius: 20, padding: 16, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: 999,
          background: `linear-gradient(135deg, ${TOKENS.coral}, ${TOKENS.coralDim})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 800, color: '#0B0B10', letterSpacing: -0.5,
        }}>L</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: TOKENS.tPrim, letterSpacing: -0.3 }}>Lucas</div>
          <div style={{ fontSize: 12, color: TOKENS.tSec, marginTop: 2 }}>78.3kg · Hipertrofia · 4x/sem</div>
        </div>
        <Icon name="chevR" size={16} color={TOKENS.tTer} />
      </div>

      {[
        { group: 'VOCÊ', items: [
          ['Perfil & metas', 'target', TOKENS.coral],
          ['Peso & medidas', 'scale', TOKENS.gold],
          ['Sono & recuperação', 'bed', TOKENS.violet],
        ]},
        { group: 'TREINO', items: [
          ['Gerenciar templates', 'layers', TOKENS.mint],
          ['Biblioteca de exercícios', 'dumbbell', TOKENS.amber],
          ['Histórico completo', 'calendar', TOKENS.tSec],
        ]},
        { group: 'INTELIGÊNCIA', items: [
          ['Briefings IA', 'sparkle', TOKENS.violet],
          ['Insights da semana', 'bolt', TOKENS.amber],
        ]},
        { group: 'APP', items: [
          ['Preferências', 'settings', TOKENS.tSec],
          ['Exportar dados', 'share', TOKENS.tSec],
        ]},
      ].map((s, si) => (
        <div key={si} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: TOKENS.tTer, marginBottom: 8, padding: '0 4px' }}>{s.group}</div>
          <div style={{ background: TOKENS.surf1, borderRadius: 16, border: `1px solid ${TOKENS.border}`, overflow: 'hidden' }}>
            {s.items.map(([label, icon, c], i) => (
              <div key={i} style={{
                padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < s.items.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={icon} size={15} color={c} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: TOKENS.tPrim }}>{label}</span>
                <Icon name="chevR" size={15} color={TOKENS.tTer} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

Object.assign(window, { ProgressScreen, MoreScreen });
