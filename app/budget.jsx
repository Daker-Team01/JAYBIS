/* =========================================================================
   제이비스 (JAYBIS) — 청년 예산설계 (50/30/20 + 또래 비교)
   ========================================================================= */

const {
  useState, useEffect, TopBar, SectionLabel, Icon, Bar, stagger,
  USER, BUDGET, useJaybisRuntimeData, saveMyDataRuntimeData, saveManualRuntimeData,
  refreshSupabaseTransactions, refreshSupabaseBudgetInsights, applyBudgetInsight, won, manwon,
} = window;

function Budget({ nav, toast }) {
  const [snapshot] = useJaybisRuntimeData();
  const b = snapshot?.budget || BUDGET;
  const [tab, setTab] = useState('all'); // all | need | want | save
  const [inputMode, setInputMode] = useState(() => {
    const mode = window.__JAYBIS_BUDGET_INPUT_MODE || 'mydata';
    window.__JAYBIS_BUDGET_INPUT_MODE = '';
    return mode;
  });
  const [mydataText, setMydataText] = useState('');
  const [manual, setManual] = useState({ salary: '', need: '', want: '', save: '', memo: '' });
  const [inputError, setInputError] = useState('');
  const [syncState, setSyncState] = useState('idle');
  const cats = tab === 'all' ? b.categories : b.categories.filter(c => c.bucket === tab);
  const hasConnectedData = Boolean((snapshot?.transactions || []).length || b.salary);
  const dataSource = snapshot?.raw?.metadata?.dataSource || '';

  useEffect(() => {
    let alive = true;
    setSyncState('loading');
    refreshSupabaseTransactions()
      .then(() => refreshSupabaseBudgetInsights())
      .then(() => { if (alive) setSyncState('done'); })
      .catch(() => { if (alive) setSyncState('error'); });
    return () => { alive = false; };
  }, []);

  const applyMyData = () => {
    try {
      const parsed = JSON.parse(mydataText);
      saveMyDataRuntimeData(parsed);
      setInputError('');
      setMydataText('');
      toast('마이데이터를 연결했어요');
    } catch (err) {
      setInputError('JSON 형식을 확인해주세요.');
    }
  };

  const applyManual = () => {
    if (!manual.salary) {
      setInputError('세후 월급을 먼저 입력해주세요.');
      return;
    }
    saveManualRuntimeData(manual);
    setInputError('');
    toast('수기 데이터를 반영했어요');
  };

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
        <div className="card" style={{ ...stagger(0), marginBottom:18, padding:'15px 16px' }}>
          <div className="between" style={{ marginBottom:12 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--ink)' }}>데이터 입력</div>
              <div className="muted" style={{ fontSize:12, marginTop:2 }}>
                {hasConnectedData ? `현재 ${dataSource || '저장된'} 데이터가 적용 중이에요` : '마이데이터를 먼저 연결하고, 없으면 수기로 입력하세요'}
              </div>
            </div>
            <span className={'pill ' + (hasConnectedData ? 'pill-pos' : 'pill-warn')} style={{ fontSize:10.5 }}>
              {syncState === 'loading' ? '동기화 중' : hasConnectedData ? '연결됨' : '입력 필요'}
            </span>
          </div>

          <div className="seg" style={{ marginBottom:12 }}>
            <button className={inputMode === 'mydata' ? 'on' : ''} onClick={() => setInputMode('mydata')}>마이데이터</button>
            <button className={inputMode === 'manual' ? 'on' : ''} onClick={() => setInputMode('manual')}>수기 입력</button>
          </div>

          {inputMode === 'mydata' ? (
            <div>
              <textarea
                value={mydataText}
                onChange={(e) => setMydataText(e.target.value)}
                placeholder="마이데이터 JSON을 붙여넣으세요"
                style={{ width:'100%', minHeight:116, resize:'vertical', border:'1px solid var(--line)', borderRadius:12, padding:'11px 12px', outline:'none', fontSize:12.5, lineHeight:1.5, color:'var(--ink)', background:'var(--bg)' }}
              />
              <button onClick={applyMyData} className="btn btn-primary" style={{ height:42, fontSize:14, marginTop:10, boxShadow:'none' }}>
                마이데이터 연결하기
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gap:9 }}>
              <ManualInput label="세후 월급" value={manual.salary} onChange={(v) => setManual((m) => ({ ...m, salary:v }))} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <ManualInput label="필수비 사용액" value={manual.need} onChange={(v) => setManual((m) => ({ ...m, need:v }))} />
                <ManualInput label="여유비 사용액" value={manual.want} onChange={(v) => setManual((m) => ({ ...m, want:v }))} />
              </div>
              <ManualInput label="저축·투자액" value={manual.save} onChange={(v) => setManual((m) => ({ ...m, save:v }))} />
              <input
                value={manual.memo}
                onChange={(e) => setManual((m) => ({ ...m, memo:e.target.value }))}
                placeholder="메모 예: 첫 월급 기준"
                style={{ height:40, border:'1px solid var(--line)', borderRadius:11, padding:'0 12px', outline:'none', color:'var(--ink)', background:'var(--bg)' }}
              />
              <button onClick={applyManual} className="btn btn-primary" style={{ height:42, fontSize:14, boxShadow:'none' }}>
                수기 데이터 반영하기
              </button>
            </div>
          )}

          {inputError && <p style={{ color:'var(--neg)', fontSize:12, marginTop:8, fontWeight:700 }}>{inputError}</p>}
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
          <SectionLabel>{USER.age ? `${USER.age}세 또래와 비교` : '또래와 비교'}</SectionLabel>
          <div className="card">
            {b.peers.length ? b.peers.map((p,i) => {
              const unit = p.unit === '%';
              const meV = unit ? p.me : p.me;
              const peerV = unit ? p.peer : p.peer;
              const max = Math.max(meV, peerV) * 1.15;
              return (
                <div key={i} style={{ padding:'12px 0', borderTop: i? '1px solid var(--line)':'none' }}>
                  <div className="between" style={{ marginBottom:9 }}>
                    <span style={{ fontSize:13.5, fontWeight:700, color:'var(--ink)' }}>{p.label}</span>
                    {p.over !== undefined && (
                      <span className={'pill ' + (p.over ? 'pill-neg':'pill-pos')} style={{ fontSize:10.5 }}>
                        {p.over ? '또래보다 많음' : '또래보다 좋음'}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    <div className="row" style={{ gap:9 }}>
                      <span style={{ fontSize:11, width:30, color:'var(--teal-700)', fontWeight:700 }}>나</span>
                      <span style={{ flex:1 }}><Bar value={meV/max*100} color="var(--teal-600)" height={8} /></span>
                      <span className="tnum" style={{ fontSize:11.5, fontWeight:700, color:'var(--ink)', width:54, textAlign:'right' }}>{unit? p.me+'%' : won(p.me)}</span>
                    </div>
                    <div className="row" style={{ gap:9 }}>
                      <span style={{ fontSize:11, width:30, color:'var(--slate-400)', fontWeight:700 }}>또래</span>
                      <span style={{ flex:1 }}><Bar value={peerV/max*100} color="var(--slate-300)" height={8} /></span>
                      <span className="tnum" style={{ fontSize:11.5, fontWeight:700, color:'var(--slate-500)', width:54, textAlign:'right' }}>{unit? p.peer+'%' : won(p.peer)}</span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <p className="muted" style={{ fontSize:13, lineHeight:1.55, padding:'12px 0' }}>
                비교 데이터가 연결되면 이 영역에 또래 대비 소비/저축 지표를 표시합니다.
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

function ManualInput({ label, value, onChange }) {
  return (
    <label style={{ display:'grid', gap:5 }}>
      <span style={{ fontSize:12, fontWeight:800, color:'var(--slate-600)' }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="원 단위"
        style={{ height:40, border:'1px solid var(--line)', borderRadius:11, padding:'0 12px', outline:'none', color:'var(--ink)', background:'var(--bg)' }}
      />
    </label>
  );
}

Object.assign(window, { Budget });
