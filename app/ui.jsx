/* =========================================================================
   제이비스 (JAYBIS) — UI 프리미티브
   ========================================================================= */
const React = window.React;
const { useState, useEffect, useRef } = React;

/* ---- 아이콘 (스트로크 라인) ----------------------------------------------- */
function Icon({ name, size = 22, color = 'currentColor', stroke = 1.8, fill = 'none', style }) {
  const p = { fill, stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const f = { fill: color, stroke: 'none' };
  const paths = {
    home:   <><path d="M3 10.5 12 3l9 7.5" {...p}/><path d="M5 9.5V20h14V9.5" {...p}/><path d="M9.5 20v-6h5v6" {...p}/></>,
    budget: <><circle cx="12" cy="12" r="8.5" {...p}/><path d="M12 12 12 4.5M12 12l6 3.2" {...p}/></>,
    products:<><rect x="3.5" y="6" width="17" height="13" rx="2.5" {...p}/><path d="M8 6V5a4 4 0 0 1 8 0v1" {...p}/><path d="M3.5 11h17" {...p}/></>,
    chat:   <><path d="M4 5.5h16v11H9l-4 3.5v-3.5H4z" {...p}/><circle cx="9" cy="11" r="1" {...f}/><circle cx="12.5" cy="11" r="1" {...f}/><circle cx="16" cy="11" r="1" {...f}/></>,
    user:   <><circle cx="12" cy="8" r="3.6" {...p}/><path d="M5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6" {...p}/></>,
    spark:  <><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4L12 3z" {...p}/></>,
    sparkF: <><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4L12 3z" {...f}/></>,
    shield: <><path d="M12 3l7 2.5v5c0 5-3.4 8.3-7 9.5-3.6-1.2-7-4.5-7-9.5v-5L12 3z" {...p}/><path d="M9 12l2 2 4-4" {...p}/></>,
    arrowR: <><path d="M5 12h13M13 6l6 6-6 6" {...p}/></>,
    chevR:  <><path d="M9 5l7 7-7 7" {...p}/></>,
    chevL:  <><path d="M15 5l-7 7 7 7" {...p}/></>,
    chevD:  <><path d="M5 9l7 7 7-7" {...p}/></>,
    check:  <><path d="M5 12.5l4.5 4.5L19 6.5" {...p}/></>,
    checkC: <><circle cx="12" cy="12" r="9" {...p}/><path d="M8 12.3l2.7 2.7L16 9.5" {...p}/></>,
    plus:   <><path d="M12 5v14M5 12h14" {...p}/></>,
    bell:   <><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" {...p}/><path d="M10 20a2 2 0 0 0 4 0" {...p}/></>,
    send:   <><path d="M4 12l16-7-7 16-2.5-6.5L4 12z" {...p}/></>,
    mic:    <><rect x="9" y="3" width="6" height="11" rx="3" {...p}/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" {...p}/></>,
    home2:  <><path d="M3 10.5 12 3l9 7.5V20H3z" {...p}/></>,
    bus:    <><rect x="5" y="4" width="14" height="13" rx="2.5" {...p}/><path d="M5 12h14" {...p}/><circle cx="8.5" cy="19" r="1.3" {...f}/><circle cx="15.5" cy="19" r="1.3" {...f}/></>,
    cart:   <><circle cx="9" cy="20" r="1.4" {...f}/><circle cx="17" cy="20" r="1.4" {...f}/><path d="M3 4h2l2.5 11h10l2-7H6" {...p}/></>,
    food:   <><path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v9" {...p}/><path d="M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5zM16 12v8" {...p}/></>,
    bag:    <><path d="M6 8h12l-1 12H7L6 8z" {...p}/><path d="M9 8V6a3 3 0 0 1 6 0v2" {...p}/></>,
    play:   <><rect x="3.5" y="5" width="17" height="14" rx="3" {...p}/><path d="M10 9.5l4.5 2.5L10 14.5z" {...f}/></>,
    piggy:  <><path d="M4 12a6 6 0 0 1 6-6h3a6 6 0 0 1 5.7 4.2l1.3.4v3l-1.3.3A6 6 0 0 1 16 18v2h-2v-1.5h-3V20H9v-2a6 6 0 0 1-5-6z" {...p}/><circle cx="9" cy="11" r=".9" {...f}/></>,
    chart:  <><path d="M4 20V10M9.5 20V5M15 20v-7M20.5 20V8" {...p}/></>,
    home3:  <><path d="M4 11l8-6 8 6v9H4z" {...p}/></>,
    bank:   <><path d="M4 9l8-4 8 4M5 9v9M19 9v9M9 9v9M15 9v9M3.5 20h17" {...p}/></>,
    lock:   <><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5" {...p}/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...p}/></>,
    warn:   <><path d="M12 4l9 16H3L12 4z" {...p}/><path d="M12 10v4M12 17.5v.2" {...p}/></>,
    eye:    <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...p}/><circle cx="12" cy="12" r="2.8" {...p}/></>,
    clock:  <><circle cx="12" cy="12" r="8.5" {...p}/><path d="M12 7.5V12l3 2" {...p}/></>,
    target: <><circle cx="12" cy="12" r="8.5" {...p}/><circle cx="12" cy="12" r="4.5" {...p}/><circle cx="12" cy="12" r=".5" {...f}/></>,
    voice:  <><path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4" {...p}/></>,
    refresh:<><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4" {...p}/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4" {...p}/></>,
    gift:   <><rect x="4" y="9" width="16" height="11" rx="1.5" {...p}/><path d="M3 9h18M12 9v11M12 9c-2-4-6-3-6-1s4 1 6 1zm0 0c2-4 6-3 6-1s-4 1-6 1z" {...p}/></>,
    leaf:   <><path d="M5 19c0-8 6-13 14-13 0 8-6 13-14 13z" {...p}/><path d="M5 19c3-5 6-7 10-9" {...p}/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
}

/* ---- 로고 ----------------------------------------------------------------- */
function Logo({ size = 26, color = '#fff', mark = false }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap: size*0.32 }}>
      <span style={{
        width:size, height:size, borderRadius:size*0.3, flex:'0 0 auto',
        background: mark ? 'linear-gradient(160deg,var(--teal-400),var(--teal-700))' : 'rgba(255,255,255,.16)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: mark ? '0 4px 12px rgba(13,148,136,.4)' : 'none',
      }}>
        <Icon name="sparkF" size={size*0.62} color={mark ? '#fff' : color} />
      </span>
      {!mark && <span style={{ fontWeight:800, fontSize:size*0.74, color, letterSpacing:'-.5px' }}>JAYBIS</span>}
    </span>
  );
}

/* ---- 상태바 --------------------------------------------------------------- */
function StatusBar({ dark = false }) {
  return (
    <div className={'statusbar ' + (dark ? 'dark' : 'light')}>
      <span className="sb-time">9:41</span>
      <span className="sb-icons">
        <svg width="18" height="12" viewBox="0 0 18 12"><g fill="currentColor">
          <rect x="0" y="7" width="3" height="5" rx=".6"/><rect x="4.5" y="4.5" width="3" height="7.5" rx=".6"/>
          <rect x="9" y="2.2" width="3" height="9.8" rx=".6"/><rect x="13.5" y="0" width="3" height="12" rx=".6"/>
        </g></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 3c2.1 0 4 .8 5.4 2.1l1-1A9 9 0 0 0 8 1.4 9 9 0 0 0 1.6 4l1 1.1A7.6 7.6 0 0 1 8 3z"/><path d="M8 6.4c1.2 0 2.3.5 3.1 1.3l1-1A6 6 0 0 0 8 4.9a6 6 0 0 0-4.1 1.7l1 1A4.4 4.4 0 0 1 8 6.4z"/><circle cx="8" cy="10" r="1.4"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" stroke="currentColor" strokeOpacity=".4"/><rect x="2" y="2" width="18" height="8" rx="1.8" fill="currentColor"/><rect x="23" y="4" width="1.6" height="4" rx=".8" fill="currentColor" fillOpacity=".4"/></svg>
      </span>
    </div>
  );
}

/* ---- 도넛 게이지 ---------------------------------------------------------- */
function Donut({ value, size = 92, stroke = 10, color = 'var(--teal-600)', track = 'var(--line)', label, sub, big }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <span className="gauge-wrap" style={{ width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition:'stroke-dashoffset 1s cubic-bezier(.22,.61,.36,1)' }} />
      </svg>
      <span className="gauge-center">
        <b className="tnum" style={{ fontSize: big ? 26 : 21, fontWeight:800, color:'var(--ink)' }}>{label}</b>
        {sub && <span style={{ fontSize:11, color:'var(--slate-500)', fontWeight:600, marginTop:1 }}>{sub}</span>}
      </span>
    </span>
  );
}

/* ---- 화면 헤더 (sticky 미니 헤더) ----------------------------------------- */
function TopBar({ title, onBack, right, dark }) {
  return (
    <div style={{
      position:'sticky', top:0, zIndex:40, paddingTop:47,
      background:'var(--bg)',
    }}>
      <div className="between" style={{ height:50, padding:'0 16px' }}>
        <div className="row" style={{ gap:6 }}>
          {onBack && (
            <button onClick={onBack} style={{ width:36, height:36, marginLeft:-8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="chevL" size={24} color="var(--ink)" />
            </button>
          )}
          <b style={{ fontSize:19, fontWeight:800, color:'var(--ink)', letterSpacing:'-.3px' }}>{title}</b>
        </div>
        <div className="row" style={{ gap:4 }}>{right}</div>
      </div>
    </div>
  );
}

/* ---- 섹션 제목 ------------------------------------------------------------ */
function SectionLabel({ children, action, onAction }) {
  return (
    <div className="between" style={{ margin:'2px 2px 11px' }}>
      <b style={{ fontSize:15.5, fontWeight:800, color:'var(--ink)', letterSpacing:'-.2px' }}>{children}</b>
      {action && (
        <button onClick={onAction} className="row" style={{ gap:2, fontSize:12.5, fontWeight:700, color:'var(--teal-600)' }}>
          {action} <Icon name="chevR" size={14} color="var(--teal-600)" />
        </button>
      )}
    </div>
  );
}

/* ---- 진행 막대 ------------------------------------------------------------ */
function Bar({ value, color = 'var(--teal-600)', track, height = 9 }) {
  return (
    <span className="bar" style={{ height, ...(track ? { background:track } : {}) }}>
      <i style={{ width: Math.max(2, Math.min(100, value)) + '%', background:color, transition:'width .9s cubic-bezier(.22,.61,.36,1)' }} />
    </span>
  );
}

/* ---- 토스트 훅 ------------------------------------------------------------ */
function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (m) => { setMsg(m); clearTimeout(window.__tt); window.__tt = setTimeout(() => setMsg(null), 2200); };
  const node = msg ? (
    <div className="toast"><Icon name="checkC" size={18} color="var(--teal-300)" /><span>{msg}</span></div>
  ) : null;
  return [node, show];
}

/* 화면 진입 stagger 적용 헬퍼 */
function stagger(i, base = 0.04) { return { animationDelay: (base + i * 0.06) + 's' }; }

Object.assign(window, {
  Icon, Logo, StatusBar, Donut, TopBar, SectionLabel, Bar, useToast, stagger,
  useState, useEffect, useRef,
});
