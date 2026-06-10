/* =========================================================================
   제이비스 (JAYBIS) — 청년 예산설계 (50/30/20 + 또래 비교)
   ========================================================================= */

const {
  useState, useEffect, TopBar, SectionLabel, Icon, Bar, stagger,
  USER, BUDGET, useJaybisRuntimeData,
  refreshSupabaseTransactions, refreshSupabaseBudgetInsights, applyBudgetInsight, won, manwon, pct,
} = window;

function Budget({ nav, toast }) {
  const [snapshot] = useJaybisRuntimeData();
  const b = snapshot?.budget || BUDGET;
  const user = snapshot?.user || USER;
  const [tab, setTab] = useState('all'); // all | need | want | save
  const [syncState, setSyncState] = useState('idle');
  const cats = tab === 'all' ? b.categories : b.categories.filter(c => c.bucket === tab);
  const hasConnectedData = Boolean((snapshot?.transactions || []).length || b.salary);

  useEffect(() => {
    let alive = true;
    setSyncState('loading');
    refreshSupabaseTransactions()
      .then(() => refreshSupabaseBudgetInsights())
      .then(() => { if (alive) setSyncState('done'); })
      .catch(() => { if (alive) setSyncState('error'); });
    return () => { alive = false; };
  }, []);

  const applyInsight = (insight) => {
    applyBudgetInsight(insight);
    toast(`${insight.categoryLabel || insight.title} 한도를 반영했어요`);
  };

  return (
    <div className="scroll screen-anim">
      <TopBar title="소비분석 및 예산설계" right={
        <span className="pill pill-teal" style={{ fontSize:11.5 }}>실데이터</span>
      } />

      <div style={{ padding:'2px 18px 26px' }} className="stagger">
        <div className="between" style={{ marginBottom:12, ...stagger(0) }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--ink)' }}>소비 데이터</div>
            <div className="muted" style={{ fontSize:12, marginTop:2 }}>
              Supabase 거래내역을 기준으로 자동 분석합니다
            </div>
          </div>
          <span className={'pill ' + (hasConnectedData ? 'pill-pos' : 'pill-warn')} style={{ fontSize:10.5 }}>
            {syncState === 'loading' ? '동기화 중' : hasConnectedData ? '연결됨' : '데이터 없음'}
          </span>
        </div>

        {/* ---- 50/30/20 요약 ---- */}
        <div className="card" style={{ ...stagger(1), background:'var(--teal-900)', color:'#fff' }}>
          <div className="between">
            <div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,.7)', fontWeight:600 }}>세후 월급</div>
              <div className="tnum" style={{ fontSize:26, fontWeight:800, marginTop:3 }}>{won(b.salary)}</div>
            </div>
            <span className="pill pill-ghost" style={{ background:'rgba(94,234,212,.18)', color:'var(--teal-300)' }}>
              <Icon name="sparkF" size={13} color="var(--teal-300)" /> 50·30·20 룰
            </span>
          </div>

          {/* 분배 막대 */}
          <div style={{ display:'flex', height:16, borderRadius:8, overflow:'hidden', gap:3, marginTop:18 }}>
            {b.buckets.map((bk,i) => (
              <div key={i} style={{ flex:bk.ratio, background:bk.tone, position:'relative' }} />
            ))}
          </div>
          <div className="row" style={{ gap:8, marginTop:14 }}>
            {b.buckets.map((bk,i) => {
              const over = bk.used > bk.plan;
              return (
                <div key={i} style={{ flex:1, background:'rgba(255,255,255,.1)', borderRadius:12, padding:'10px 11px' }}>
                  <div className="row" style={{ gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:3, background:bk.tone }} />
                    <span style={{ fontSize:11.5, fontWeight:700 }}>{bk.label} {bk.ratio}%</span>
                  </div>
                  <div className="tnum" style={{ fontSize:13.5, fontWeight:800, marginTop:7 }}>{manwon(bk.used)}</div>
                  <div style={{ fontSize:10.5, color: over ? '#fca5a5' : 'rgba(255,255,255,.6)', fontWeight:600, marginTop:1 }}>
                    / {manwon(bk.plan)} {over ? '초과' : '여유'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- AI 경고 ---- */}
        <div style={{ marginTop:20, ...stagger(2) }}>
          <SectionLabel>제이비스가 찾은 절약 포인트</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {b.alerts.length ? b.alerts.map((al,i) => (
              <div key={i} className="card" style={{ borderLeft:'3px solid var(--warn)', padding:'14px 16px' }}>
                <div className="between" style={{ marginBottom:6 }}>
                  <div className="row" style={{ gap:8 }}>
                    <Icon name="warn" size={17} color="var(--warn)" />
                    <b style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{al.title}</b>
                  </div>
                  <span className="pill pill-pos" style={{ fontSize:11 }}>월 {won(al.save).replace('₩','')}원↓</span>
                </div>
                <p className="muted" style={{ fontSize:13, lineHeight:1.55 }}>{al.body}</p>
                <button onClick={() => applyInsight(al)} className="btn btn-ghost"
                  style={{ height:40, fontSize:13, marginTop:11, width:'auto', padding:'0 16px', display:'inline-flex' }}>
                  {al.actionLabel || '한도 적용하기'}
                </button>
              </div>
            )) : (
              <div className="card" style={{ padding:'14px 16px' }}>
                <p className="muted" style={{ fontSize:13, lineHeight:1.55 }}>
                  제이비스 소비 진단 결과가 저장되면 이 영역에 절약 포인트를 표시합니다.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---- 또래 비교 ---- */}
        <div style={{ marginTop:22, ...stagger(3) }}>
          <SectionLabel>{user.age ? `${user.age}세 또래 지출 비중과 비교` : '또래 지출 비중과 비교'}</SectionLabel>
          <div className="card">
            {b.peers.length ? b.peers.map((p,i) => {
              const meRatio = Number(p.meRatio || p.me || 0);
              const peerRatio = Number(p.peerRatio || p.peer || 0);
              const max = Math.max(meRatio, peerRatio, 1) * 1.15;
              const statusClass = p.status === '높음' ? 'pill-neg' : p.status === '낮음' ? 'pill-pos' : 'pill-teal';
              return (
                <div key={i} style={{ padding:'12px 0', borderTop: i? '1px solid var(--line)':'none' }}>
                  <div className="between" style={{ marginBottom:9 }}>
                    <span style={{ fontSize:13.5, fontWeight:700, color:'var(--ink)' }}>{p.label}</span>
                    {p.status && (
                      <span className={'pill ' + statusClass} style={{ fontSize:10.5 }}>
                        {p.status}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    <div className="row" style={{ gap:9 }}>
                      <span style={{ fontSize:11, width:30, color:'var(--teal-700)', fontWeight:700 }}>나</span>
                      <span style={{ flex:1 }}><Bar value={meRatio/max*100} color="var(--teal-600)" height={8} /></span>
                      <span className="tnum" style={{ fontSize:11.5, fontWeight:700, color:'var(--ink)', width:96, textAlign:'right' }}>
                        {won(p.me)} · {pct(meRatio, 1)}
                      </span>
                    </div>
                    <div className="row" style={{ gap:9 }}>
                      <span style={{ fontSize:11, width:30, color:'var(--slate-400)', fontWeight:700 }}>또래</span>
                      <span style={{ flex:1 }}><Bar value={peerRatio/max*100} color="var(--slate-300)" height={8} /></span>
                      <span className="tnum" style={{ fontSize:11.5, fontWeight:700, color:'var(--slate-500)', width:96, textAlign:'right' }}>
                        {pct(peerRatio, 1)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <p className="muted" style={{ fontSize:13, lineHeight:1.55, padding:'12px 0' }}>
                차이가 5%p 이상인 업종이 있으면 이 영역에 표시합니다.
              </p>
            )}
          </div>
        </div>

        {/* ---- 카테고리별 지출 ---- */}
        <div style={{ marginTop:22, ...stagger(4) }}>
          <SectionLabel>카테고리별 지출</SectionLabel>
          <div className="seg" style={{ marginBottom:13 }}>
            {[['all','전체'],['need','필수'],['want','여유'],['save','저축']].map(([k,l]) => (
              <button key={k} className={tab===k?'on':''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div className="card" style={{ padding:'6px 16px' }}>
            {cats.length ? cats.map((c,i) => {
              const ratio = c.plan ? c.used / c.plan * 100 : 0;
              const over = c.used > c.plan;
              return (
                <div key={i} className="lrow" style={{ padding:'13px 0', display:'block', borderTop: i? '1px solid var(--line)':'none' }}>
                  <div className="between" style={{ marginBottom:9 }}>
                    <div className="row" style={{ gap:11 }}>
                      <span className="ic-chip" style={{ width:36, height:36, borderRadius:11, background: over?'var(--warn-bg)':'var(--teal-50)' }}>
                        <Icon name={c.icon} size={18} color={over?'var(--warn)':'var(--teal-600)'} />
                      </span>
                      <div>
                        <div className="row" style={{ gap:6 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{c.label}</span>
                          {c.warn && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--warn)' }} />}
                        </div>
                        <div className="muted" style={{ fontSize:11.5, marginTop:1 }}>예산 {won(c.plan)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div className="tnum" style={{ fontSize:14.5, fontWeight:800, color: over?'var(--neg)':'var(--ink)' }}>{won(c.used)}</div>
                      <div className="tnum" style={{ fontSize:10.5, fontWeight:700, color: over?'var(--neg)':'var(--slate-400)', marginTop:1 }}>{Math.round(ratio)}%</div>
                    </div>
                  </div>
                  <Bar value={ratio} color={over?'var(--warn)':'var(--teal-600)'} height={7} />
                </div>
              );
            }) : (
              <p className="muted" style={{ fontSize:13, lineHeight:1.55, padding:'14px 0' }}>
                카테고리별 지출 데이터가 아직 없습니다.
              </p>
            )}
          </div>
        </div>

        {/* ---- 다음 달 보정 제안 ---- */}
        <div className="card" style={{ marginTop:16, ...stagger(5), background:'var(--teal-50)', border:'1px solid var(--teal-100)' }}>
          <div className="row" style={{ gap:8, marginBottom:7 }}>
            <Icon name="refresh" size={17} color="var(--teal-700)" />
            <b style={{ fontSize:13.5, fontWeight:800, color:'var(--teal-800)' }}>다음 달 예산 보정 제안</b>
          </div>
          <p style={{ fontSize:13.5, lineHeight:1.6, color:'var(--teal-800)', fontWeight:500 }}>{b.nextMonthTip}</p>
          <button onClick={() => toast('다음 달 예산에 반영했어요')} className="btn btn-primary" style={{ height:46, marginTop:13, fontSize:14.5 }}>
            보정안 반영하기
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Budget });
