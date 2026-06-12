/* =========================================================================
   제이비스 (JAYBIS) — 청년 예산설계 (50/30/20 + 또래 비교)
   ========================================================================= */

const {
  useState, useEffect, TopBar, SectionLabel, Icon, Bar, stagger,
  USER, BUDGET, useJaybisRuntimeData,
  refreshSupabaseTransactions, refreshSupabaseBudgetInsights, won, pct,
} = window;

function Budget({ nav, toast }) {
  const [snapshot] = useJaybisRuntimeData();
  const b = snapshot?.budget || BUDGET;
  const user = snapshot?.user || USER;
  const report = b.spendingReport;
  const [tab, setTab] = useState('all'); // all | need | want | save
  const cats = tab === 'all' ? b.categories : b.categories.filter(c => c.bucket === tab);
  const currentAge = Number(user.age || report?.assetGoal?.currentAge || 0);
  const monthlyAvailable = Number(report?.assetGoal?.monthlyAvailable || snapshot?.assets?.cashflow?.left || 0);
  const targetAge = Math.max(currentAge || 0, Number(report?.assetGoal?.targetAge || (user.age ? user.age + 3 : 30)));
  const targetAmount = Math.max(0, Number(report?.assetGoal?.targetAmount || 10000000));
  const monthsToGoal = Math.max(1, Math.round((targetAge - currentAge) * 12));
  const monthlyRequired = Math.ceil((targetAmount / monthsToGoal) / 10000) * 10000;
  const monthlyGap = Math.max(0, monthlyRequired - monthlyAvailable);

  useEffect(() => {
    refreshSupabaseTransactions()
      .then(() => refreshSupabaseBudgetInsights())
      .catch(() => {});
  }, []);

  return (
    <div className="scroll screen-anim">
      <TopBar title="소비분석 및 예산설계" right={
        <span className="pill pill-teal" style={{ fontSize:11.5 }}>실데이터</span>
      } />

      <div style={{ padding:'2px 18px 26px' }} className="stagger">
        {/* ---- 소비진단 리포트 ---- */}
        {report && (
          <div style={{ ...stagger(0) }}>
            <SectionLabel>{user.name || '사용자'}님의 리포트</SectionLabel>
            <div className="card" style={{ padding:'15px 16px' }}>
              <div className="between" style={{ marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:14.5, fontWeight:800, color:'var(--ink)' }}>이번 달 소비 요약</div>
                  <div className="muted" style={{ fontSize:12, marginTop:2 }}>
                    {report.summary}
                  </div>
                </div>
                <span className={'pill ' + (report.status === '주의' ? 'pill-neg' : report.status === '관찰' ? 'pill-warn' : 'pill-pos')} style={{ fontSize:10.5 }}>
                  {report.status}
                </span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {(report.metrics || []).slice(0, 4).map((metric, i) => (
                  <div key={i} style={{ border:'1px solid var(--line)', borderRadius:12, padding:'9px 10px', background:'var(--bg)' }}>
                    <div className="muted" style={{ fontSize:11, fontWeight:700 }}>{metric.label}</div>
                    <div className="tnum" style={{ fontSize:13.5, fontWeight:800, color:'var(--ink)', marginTop:3 }}>{metric.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:14, padding:'13px 13px', borderRadius:13, background:'var(--teal-50)', border:'1px solid var(--teal-100)' }}>
                <div className="between" style={{ marginBottom:10, gap:10 }}>
                  <div>
                    <div style={{ fontSize:13.5, fontWeight:800, color:'var(--teal-800)' }}>내 자산 모으기</div>
                    <div style={{ fontSize:11.5, color:'var(--teal-700)', marginTop:2 }}>현재 소비 상태 기준으로 월 필요 저축액을 계산해요</div>
                  </div>
                  <Icon name="piggy" size={20} color="var(--teal-700)" />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:8 }}>
                  <GoalValue label="몇 살까지" value={`${targetAge}세`} />
                  <GoalValue label="목표 금액" value={won(targetAmount)} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
                  <GoalMetric label="월 필요액" value={won(monthlyRequired)} />
                  <GoalMetric label="현재 여유" value={won(monthlyAvailable)} />
                </div>
                <div style={{ marginTop:9, padding:'9px 10px', borderRadius:11, background:'#fff', border:'1px solid var(--teal-100)' }}>
                  <div className="between" style={{ gap:10 }}>
                    <span style={{ fontSize:12.5, fontWeight:800, color:'var(--ink)' }}>
                      {monthlyGap > 0 ? '월 부족액' :'JAYBIS의 코멘트'}
                    </span>
                    <span className="tnum" style={{ fontSize:13.5, fontWeight:900, color: monthlyGap > 0 ? 'var(--neg)' : 'var(--pos)' }}>
                      {monthlyGap > 0 ? won(monthlyGap) : '가능'}
                    </span>
                  </div>
                  <p className="muted" style={{ fontSize:11.5, lineHeight:1.45, marginTop:5 }}>
                    {currentAge
                      ? `${targetAge}세까지 ${won(targetAmount)}을 모으려면 앞으로 약 ${monthsToGoal}개월 동안 월 ${won(monthlyRequired)}이 필요해요.`
                      : `목표 기간을 기준으로 월 ${won(monthlyRequired)}이 필요해요.`}
                  </p>
                </div>
              </div>

              {!!(report.topCategories || []).length && (
                <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:7 }}>
                  {(report.topCategories || []).slice(0, 3).map((category, i) => (
                    <div key={i} className="between" style={{ gap:10 }}>
                      <span style={{ fontSize:12.5, fontWeight:700, color:'var(--slate-600)' }}>{category.label}</span>
                      <span className="tnum" style={{ fontSize:12.5, fontWeight:800, color:'var(--ink)' }}>
                        {won(category.amount)} · {pct(category.ratio || 0, 1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {report.savingBasis && (
                <p className="muted" style={{ fontSize:11.8, lineHeight:1.5, marginTop:11 }}>
                  {report.savingBasis}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---- 또래 비교 ---- */}
        <div style={{ marginTop: report ? 22 : 0, ...stagger(report ? 1 : 0) }}>
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

        {/* ---- AI 경고 ---- */}
        {!!b.alerts.length && (
          <div style={{ marginTop:22, ...stagger(report ? 2 : 1) }}>
            <SectionLabel>제이비스가 찾은 절약 포인트</SectionLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {b.alerts.map((al,i) => (
              <div key={i} className="card" style={{ borderLeft:'3px solid var(--warn)', padding:'14px 16px' }}>
                <div className="between" style={{ marginBottom:6 }}>
                  <div className="row" style={{ gap:8 }}>
                    <Icon name="warn" size={17} color="var(--warn)" />
                    <b style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{al.title}</b>
                  </div>
                  <span className="pill pill-pos" style={{ fontSize:11 }}>월 {won(al.save).replace('₩','')}원↓</span>
                </div>
                <p className="muted" style={{ fontSize:13, lineHeight:1.55 }}>{al.body}</p>
              </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- 카테고리별 지출 ---- */}
        <div style={{ marginTop:22, ...stagger(report ? (b.alerts.length ? 3 : 2) : (b.alerts.length ? 2 : 1)) }}>
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
        <div className="card" style={{ marginTop:16, ...stagger(report ? (b.alerts.length ? 4 : 3) : (b.alerts.length ? 3 : 2)), background:'var(--teal-50)', border:'1px solid var(--teal-100)' }}>
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

function GoalValue({ label, value }) {
  return (
    <label style={{ display:'grid', gap:5 }}>
      <span style={{ fontSize:11.5, fontWeight:800, color:'var(--teal-800)' }}>{label}</span>
      <div style={{ minHeight:36, border:'1px solid var(--teal-100)', borderRadius:10, background:'#fff', padding:'8px 9px' }}>
        <div className="tnum" style={{ fontSize:12.5, lineHeight:1.25, fontWeight:900, color:'var(--ink)', overflowWrap:'anywhere' }}>
          {value}
        </div>
      </div>
    </label>
  );
}

function GoalMetric({ label, value }) {
  return (
    <div style={{ padding:'9px 10px', borderRadius:11, background:'#fff', border:'1px solid var(--teal-100)' }}>
      <div className="muted" style={{ fontSize:11, fontWeight:800 }}>{label}</div>
      <div className="tnum" style={{ fontSize:13.5, fontWeight:900, color:'var(--teal-800)', marginTop:3 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { Budget });
