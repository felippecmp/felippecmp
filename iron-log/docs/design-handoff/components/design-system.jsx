// design-system.jsx — tokens, shared atoms
const TOKENS = {
  // surfaces
  ink:    '#0A0D13',
  bg:     '#0E1218',
  surf1:  '#141924',
  surf2:  '#1A2030',
  surf3:  '#212838',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)',
  // text
  tPrim:  '#F4F5F7',
  tSec:   'rgba(244,245,247,0.62)',
  tTer:   'rgba(244,245,247,0.38)',
  tQuat:  'rgba(244,245,247,0.22)',
  // accents — paleta final: rosa + azul
  coral:  '#FF3D7F',       // rosa/magenta — primária "brilho"
  coralDim: '#C42863',
  mint:   '#4DD4E8',       // cyan/azul — "feito/OK" (streak, sucesso)
  mintDim: '#2A8FA3',
  teal:   '#4DD4E8',       // alias
  tealDim: '#2A8FA3',
  amber:  '#4DD4E8',       // energia/streak → agora azul
  gold:   '#4DD4E8',       // alias
  goldDim: '#2A8FA3',
  violet: '#B48CFF',
  violetDim: '#8C66D4',
  rose:   '#FF8FA3',
  // states
  red:    '#FF3D7F',
  green:  '#4DD4E8',
  gray:   'rgba(244,245,247,0.3)',
};

// tiny icon set — stroked, 1.75
const Icon = ({ name, size = 20, color = 'currentColor', strokeWidth = 1.75 }) => {
  const s = { width: size, height: size, flexShrink: 0 };
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z" {...p}/></>,
    dumbbell: <><path d="M3 9v6M6.5 6.5v11M17.5 6.5v11M21 9v6M6.5 12h11" {...p}/></>,
    chart: <><path d="M3 20h18M6 16l4-5 4 3 5-7" {...p}/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" {...p}/></>,
    play: <><path d="M7 5l12 7-12 7V5z" fill={color} stroke="none"/></>,
    pause: <><rect x="6" y="5" width="4" height="14" rx="1" fill={color} stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill={color} stroke="none"/></>,
    plus: <><path d="M12 5v14M5 12h14" {...p}/></>,
    check: <><path d="M5 12.5l4 4L19 7" {...p}/></>,
    chevR: <><path d="M9 6l6 6-6 6" {...p}/></>,
    chevL: <><path d="M15 6l-9 6 9 6" {...p}/></>,
    chevD: <><path d="M6 9l6 6 6-6" {...p}/></>,
    x: <><path d="M6 6l12 12M18 6L6 18" {...p}/></>,
    flame: <><path d="M12 3s4 3 4 8a4 4 0 01-8 0c0-2 1-3 1-3s-1 3 1 3c0-4 2-8 2-8z" {...p}/></>,
    bolt: <><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" {...p}/></>,
    settings: <><circle cx="12" cy="12" r="3" {...p}/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" {...p}/></>,
    clock: <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 7v5l3 2" {...p}/></>,
    target: <><circle cx="12" cy="12" r="9" {...p}/><circle cx="12" cy="12" r="5" {...p}/><circle cx="12" cy="12" r="1.5" fill={color} stroke="none"/></>,
    note: <><path d="M5 4h11l3 3v13H5V4z" {...p}/><path d="M16 4v3h3M9 12h6M9 16h4" {...p}/></>,
    bed: <><path d="M3 18v-6a3 3 0 013-3h12a3 3 0 013 3v6M3 14h18M7 9V7a1 1 0 011-1h2a1 1 0 011 1v2" {...p}/></>,
    sparkle: <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" fill={color} stroke="none"/></>,
    scale: <><path d="M4 20h16M6 20V8a2 2 0 012-2h8a2 2 0 012 2v12M9 10h6M10 13h4" {...p}/></>,
    heart: <><path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" {...p}/></>,
    steps: <><path d="M8 4l2 8-2 3M16 6l-2 9 2 3M8 4h2M16 6h-2" {...p}/></>,
    more: <><circle cx="5" cy="12" r="1.5" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.5" fill={color} stroke="none"/><circle cx="19" cy="12" r="1.5" fill={color} stroke="none"/></>,
    back: <><path d="M15 6l-9 6 9 6" {...p}/></>,
    search: <><circle cx="11" cy="11" r="7" {...p}/><path d="M20 20l-4-4" {...p}/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" {...p}/><path d="M3 9h18M8 3v4M16 3v4" {...p}/></>,
    undo: <><path d="M9 14l-5-5 5-5M4 9h10a6 6 0 110 12H9" {...p}/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...p}/></>,
    swap: <><path d="M7 4l-3 3 3 3M4 7h12M17 20l3-3-3-3M20 17H8" {...p}/></>,
    timer: <><circle cx="12" cy="13" r="8" {...p}/><path d="M12 9v4l2 2M9 3h6" {...p}/></>,
    minus: <><path d="M5 12h14" {...p}/></>,
    voice: <><rect x="9" y="3" width="6" height="12" rx="3" {...p}/><path d="M5 11a7 7 0 0014 0M12 18v3" {...p}/></>,
    link: <><path d="M10 14a4 4 0 005.7 0l3.6-3.6a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3.6 3.6a4 4 0 005.7 5.7l1-1" {...p}/></>,
    trend: <><path d="M3 17l6-6 4 4 8-8M14 7h7v7" {...p}/></>,
    layers: <><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 18l9 5 9-5" {...p}/></>,
    dots: <><circle cx="12" cy="5" r="1.5" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.5" fill={color} stroke="none"/><circle cx="12" cy="19" r="1.5" fill={color} stroke="none"/></>,
    info: <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 8v.5M12 11v6" {...p}/></>,
    filter: <><path d="M4 5h16l-6 8v6l-4-2v-4L4 5z" {...p}/></>,
    share: <><path d="M12 3v12M7 8l5-5 5 5M5 15v4a2 2 0 002 2h10a2 2 0 002-2v-4" {...p}/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3" {...p}/><path d="M5 11a7 7 0 0014 0M12 18v3" {...p}/></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{paths[name]}</svg>;
};

// Tab bar — iOS-style floating dock
const TabBar = ({ active, onChange, theme = 'coral' }) => {
  const items = [
    { id: 'home', label: 'Hoje', icon: 'home' },
    { id: 'train', label: 'Treinar', icon: 'dumbbell' },
    { id: 'progress', label: 'Progresso', icon: 'chart' },
    { id: 'more', label: 'Mais', icon: 'menu' },
  ];
  const accent = theme === 'coral' ? TOKENS.coral : theme === 'mint' ? TOKENS.mint : TOKENS.amber;
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
      height: 88, paddingBottom: 20,
      background: `linear-gradient(to top, ${TOKENS.ink} 60%, rgba(10,13,19,0))`,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
      padding: '0 8px 20px',
    }}>
      {items.map(it => {
        const isActive = active === it.id;
        return (
          <button key={it.id} onClick={() => onChange?.(it.id)}
            style={{
              background: 'none', border: 'none', padding: '8px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              cursor: 'pointer', flex: 1,
            }}>
            <div style={{
              width: 44, height: 32, borderRadius: 14,
              background: isActive ? `${accent}22` : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .2s',
            }}>
              <Icon name={it.icon} size={22} color={isActive ? accent : TOKENS.tTer} />
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: 600, letterSpacing: 0.2,
              color: isActive ? accent : TOKENS.tTer,
            }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// Phone shell — bezel + status bar + home indicator, dark
const Phone = ({ children, theme = 'coral', width = 390, height = 820 }) => {
  return (
    <div style={{
      width, height,
      borderRadius: 54,
      padding: 10,
      background: 'linear-gradient(145deg, #1c1c22, #0b0b0e)',
      boxShadow: '0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 0 1px rgba(255,255,255,0.03)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 44,
        overflow: 'hidden', position: 'relative',
        background: TOKENS.ink,
        fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
        color: TOKENS.tPrim,
        WebkitFontSmoothing: 'antialiased',
      }}>
        {/* status bar */}
        <div style={{
          height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '0 28px 8px', position: 'relative', zIndex: 30,
          fontSize: 15, fontWeight: 600, color: TOKENS.tPrim,
        }}>
          <span>17:18</span>
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            top: 10, width: 110, height: 30, borderRadius: 16, background: '#000',
          }} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="16" height="11" viewBox="0 0 16 11"><rect x="0" y="6" width="2.5" height="5" rx=".5" fill={TOKENS.tPrim}/><rect x="4" y="4" width="2.5" height="7" rx=".5" fill={TOKENS.tPrim}/><rect x="8" y="2" width="2.5" height="9" rx=".5" fill={TOKENS.tPrim}/><rect x="12" y="0" width="2.5" height="11" rx=".5" fill={TOKENS.tPrim}/></svg>
            <svg width="14" height="10" viewBox="0 0 16 11"><path d="M8 3c2 0 4 .8 5.4 2l1-1A8 8 0 008 1a8 8 0 00-6.4 3l1 1c1.4-1.2 3.4-2 5.4-2z" fill={TOKENS.tPrim}/><path d="M8 6c1.2 0 2.3.5 3 1.2l1-1A6 6 0 008 4.5a6 6 0 00-4 1.7l1 1C5.7 6.5 6.8 6 8 6z" fill={TOKENS.tPrim}/><circle cx="8" cy="9" r="1" fill={TOKENS.tPrim}/></svg>
            <div style={{
              width: 24, height: 11, borderRadius: 3, border: `1px solid ${TOKENS.tPrim}`,
              padding: 1, position: 'relative', opacity: 0.9,
            }}>
              <div style={{ width: '100%', height: '100%', background: TOKENS.tPrim, borderRadius: 1 }}/>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

Object.assign(window, { TOKENS, Icon, TabBar, Phone });
