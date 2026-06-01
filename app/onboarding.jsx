/* =========================================================================
   제이비스 (JAYBIS) — 온보딩 플로우
   스플래시 → 마이데이터 동의 → AI 자산진단 → 유형 자동 분류
   ========================================================================= */

function Onboarding({ onComplete }) {
  const [step, setStep] = useState('splash'); // splash | consent | analyzing | result

  return (
    <div className="app" style={{ background:'var(--bg)' }}>
      <StatusBar dark={step !== 'splash' && step !== 'analyzing'} />
      {step === 'splash'   && <OnbSplash  onNext={() => setStep('consent')} />}
      {step === 'consent'  && <OnbConsent onBack={() => setStep('splash')} onNext={() => setStep('analyzing')} />}
      {step === 'analyzing'&& <OnbAnalyzing onDone={() => setStep('result')} />}
      {step === 'result'   && <OnbResult  onNext={onComplete} />}
      <div className={'home-indicator' + ((step==='splash'||step==='analyzing') ? ' on-dark':'')}></div>
    </div>
  );
}

/* ---- 1. 스플래시 ---------------------------------------------------------- */
function OnbSplash({ onNext }) {
  const stages = [
    { age:'사회초년생', icon:'spark', t:'첫 월급' },
    { age:'은퇴 준비', icon:'target', t:'자산 형성' },
    { age:'은퇴 이후', icon:'leaf', t:'연금 생활' },
  ];
  return (
    <div style={{ position:'absolute', inset:0, color:'#fff', display:'flex', flexDirection:'column',
      background:'linear-gradient(165deg,var(--teal-900) 0%, var(--teal-700) 52%, var(--teal-600) 120%)', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-80, right:-70, width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(94,234,212,.22), transparent 65%)' }}></div>
      <div style={{ position:'absolute', bottom:60, left:-90, width:260, height:260, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(45,212,191,.18), transparent 65%)' }}></div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 30px', position:'relative' }}>
        <div className="stagger">
          <div style={{ ...stagger(0) }}><Logo size={34} /></div>
          <h1 style={{ ...stagger(1), fontSize:33, fontWeight:800, lineHeight:1.28, letterSpacing:'-.6px', marginTop:26 }}>
            첫 월급부터<br/>은퇴 이후까지,<br/>
            <span style={{ color:'var(--teal-300)' }}>경제적 전환기</span>를<br/>관리하는 AI 금융비서
          </h1>
          <p style={{ ...stagger(2), fontSize:15, color:'rgba(255,255,255,.72)', marginTop:18, lineHeight:1.6, fontWeight:500 }}>
            지금 상황을 진단하고, 다음 금융 행동을<br/>먼저 제안하는 에이전트 제이비스
          </p>

          <div style={{ ...stagger(3), display:'flex', gap:9, marginTop:30 }}>
            {stages.map((s,i) => (
              <div key={i} style={{ flex:1, background:'rgba(255,255,255,.1)', borderRadius:16, padding:'14px 10px',
                border:'1px solid rgba(255,255,255,.14)', textAlign:'center', backdropFilter:'blur(6px)' }}>
                <Icon name={s.icon} size={22} color="var(--teal-300)" />
                <div style={{ fontSize:11.5, fontWeight:700, marginTop:8 }}>{s.age}</div>
                <div style={{ fontSize:10.5, color:'rgba(255,255,255,.6)', marginTop:2 }}>{s.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'0 22px 30px' }}>
        <button className="btn" onClick={onNext}
          style={{ background:'#fff', color:'var(--teal-700)', boxShadow:'0 10px 30px rgba(0,0,0,.25)' }}>
          시작하기 <Icon name="arrowR" size={20} color="var(--teal-700)" />
        </button>
        <button style={{ width:'100%', textAlign:'center', color:'rgba(255,255,255,.75)', fontSize:13.5, fontWeight:600, marginTop:16 }}>
          이미 계정이 있어요 · 로그인
        </button>
      </div>
    </div>
  );
}

/* ---- 2. 마이데이터 연동 동의 ---------------------------------------------- */
function OnbConsent({ onBack, onNext }) {
  const [on, setOn] = useState(() => Object.fromEntries(MYDATA_INSTITUTIONS.map(i => [i.id, true])));
  const [agreeAll, setAgreeAll] = useState(true);
  const count = Object.values(on).filter(Boolean).length;

  const toggle = (id) => setOn(s => ({ ...s, [id]: !s[id] }));

  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>
      <div style={{ paddingTop:47 }}>
        <div className="row" style={{ height:50, padding:'0 12px' }}>
          <button onClick={onBack} style={{ width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="chevL" size={24} color="var(--ink)" />
          </button>
        </div>
      </div>

      <div className="scroll" style={{ padding:'4px 22px 12px' }}>
        <div style={{ width:54, height:54, borderRadius:17, background:'var(--teal-50)',
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
          <Icon name="shield" size={28} color="var(--teal-600)" />
        </div>
        <h2 style={{ fontSize:23, fontWeight:800, color:'var(--ink)', lineHeight:1.32, letterSpacing:'-.4px' }}>
          자산을 한 번에 연결하면<br/>진단이 정확해져요
        </h2>
        <p className="muted" style={{ fontSize:14, marginTop:10, lineHeight:1.6 }}>
          마이데이터로 계좌·카드·연금을 안전하게 불러옵니다. 정보는 암호화되어 진단 목적으로만 사용돼요.
        </p>

        <div className="card" style={{ marginTop:20, padding:'6px 18px' }}>
          {MYDATA_INSTITUTIONS.map((inst, i) => (
            <div key={inst.id} className="lrow">
              <span className="ic-chip" style={{ background:inst.tone+'14', color:inst.tone }}>
                <b style={{ fontSize:14, fontWeight:800, color:inst.tone }}>{inst.initial}</b>
              </span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink)' }}>{inst.name}</div>
                <div className="muted" style={{ fontSize:12, marginTop:1 }}>{inst.type} 정보 제공</div>
              </div>
              <Toggle on={on[inst.id]} onClick={() => toggle(inst.id)} />
            </div>
          ))}
        </div>

        <button onClick={() => setAgreeAll(a => !a)} className="row"
          style={{ width:'100%', gap:11, marginTop:16, padding:'4px 2px' }}>
          <span style={{ width:24, height:24, borderRadius:8, flex:'0 0 auto',
            background: agreeAll ? 'var(--teal-600)' : 'var(--card)', border: agreeAll ? 'none' : '1.5px solid var(--slate-300)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            {agreeAll && <Icon name="check" size={15} color="#fff" stroke={2.6} />}
          </span>
          <span style={{ fontSize:13.5, color:'var(--slate-700)', fontWeight:600, textAlign:'left', lineHeight:1.45 }}>
            마이데이터 종합포털 약관 및 개인정보 수집·이용에 모두 동의합니다
          </span>
        </button>
      </div>

      <div style={{ padding:'10px 22px 24px', borderTop:'1px solid var(--line)', background:'var(--card)' }}>
        <button className="btn btn-primary" disabled={!agreeAll}
          onClick={onNext} style={!agreeAll ? { opacity:.45, boxShadow:'none' } : {}}>
          {count}개 기관 연결하고 진단받기
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ width:48, height:29, borderRadius:99, flex:'0 0 auto',
      background: on ? 'var(--teal-600)' : 'var(--slate-300)', position:'relative', transition:'background .2s' }}>
      <span style={{ position:'absolute', top:3, left: on ? 22 : 3, width:23, height:23, borderRadius:'50%',
        background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .2s cubic-bezier(.4,1.3,.5,1)' }} />
    </button>
  );
}

/* ---- 3. AI 자산진단 진행 -------------------------------------------------- */
function OnbAnalyzing({ onDone }) {
  const steps = [
    { t:'계좌·카드 거래내역 수집', d:'전북은행 · JB카드' },
    { t:'순자산 · 부채비율 계산', d:'자산 조회 Tool 호출' },
    { t:'또래 벤치마크 비교', d:'27세 · 수도권 통계' },
    { t:'생애주기 유형 분류', d:'소득·지출 패턴 분석' },
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= steps.length) { const t = setTimeout(onDone, 600); return () => clearTimeout(t); }
    const t = setTimeout(() => setDone(d => d + 1), done === 0 ? 700 : 850);
    return () => clearTimeout(t);
  }, [done]);

  const prog = Math.round((done / steps.length) * 100);

  return (
    <div style={{ position:'absolute', inset:0, color:'#fff', display:'flex', flexDirection:'column',
      justifyContent:'center', padding:'0 30px',
      background:'linear-gradient(165deg,var(--teal-900) 0%, var(--teal-700) 60%, var(--teal-600) 130%)' }}>
      <div style={{ position:'relative', width:120, height:120, margin:'0 auto 6px' }}>
        <svg width="120" height="120" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="6" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--teal-300)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2*Math.PI*52} strokeDashoffset={2*Math.PI*52*(1-prog/100)}
            style={{ transition:'stroke-dashoffset .7s ease' }} />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <Icon name="sparkF" size={30} color="var(--teal-300)" />
          <b className="tnum" style={{ fontSize:18, fontWeight:800, marginTop:4 }}>{prog}%</b>
        </div>
      </div>
      <p style={{ textAlign:'center', fontSize:17, fontWeight:700, margin:'14px 0 28px' }}>제이비스가 자산을 진단하고 있어요</p>

      <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
        {steps.map((s,i) => {
          const state = i < done ? 'done' : i === done ? 'active' : 'wait';
          return (
            <div key={i} className="row" style={{ gap:13, opacity: state==='wait' ? .4 : 1, transition:'opacity .3s' }}>
              <span style={{ width:30, height:30, borderRadius:'50%', flex:'0 0 auto', display:'flex', alignItems:'center', justifyContent:'center',
                background: state==='done' ? 'var(--teal-300)' : 'rgba(255,255,255,.14)' }}>
                {state==='done' ? <Icon name="check" size={17} color="#0a3a36" stroke={2.6} />
                  : state==='active' ? <span style={{ width:14, height:14, border:'2.5px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
                  : <span style={{ width:7, height:7, borderRadius:'50%', background:'rgba(255,255,255,.5)' }} />}
              </span>
              <div>
                <div style={{ fontSize:14.5, fontWeight:700 }}>{s.t}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', marginTop:1 }}>{s.d}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- 4. 유형 분류 결과 ---------------------------------------------------- */
function OnbResult({ onNext }) {
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>
      <div className="scroll" style={{ paddingTop:47 }}>
        <div style={{ padding:'30px 24px 0', textAlign:'center' }} className="stagger">
          <div style={{ ...stagger(0), width:72, height:72, margin:'0 auto', borderRadius:24, background:'var(--teal-50)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="spark" size={36} color="var(--teal-600)" />
          </div>
          <div style={{ ...stagger(1), marginTop:18 }}>
            <span className="pill pill-teal">생애주기 분류 완료</span>
          </div>
          <h2 style={{ ...stagger(2), fontSize:24, fontWeight:800, color:'var(--ink)', marginTop:14, letterSpacing:'-.4px', lineHeight:1.3 }}>
            도윤님은 지금<br/><span style={{ color:'var(--teal-600)' }}>사회초년생</span> 트랙이에요
          </h2>
          <p style={{ ...stagger(3), fontSize:14, marginTop:10, lineHeight:1.6, padding:'0 6px', color:'var(--slate-500)' }}>
            소득은 막 늘기 시작했고 저축 여력이 충분해요. 지금은 <b style={{ color:'var(--slate-700)' }}>소비 습관과 첫 목돈</b>을 만드는 시기예요.
          </p>
        </div>

        <div style={{ padding:'22px 22px 14px' }} className="stagger">
          <div className="card" style={{ ...stagger(4), padding:0, overflow:'hidden' }}>
            {[
              { ic:'budget', t:'순자산', v: manwon(ASSETS.netWorth)+'원', s:'또래 +18%', tone:'pos' },
              { ic:'shield', t:'부채비율', v: pct(ASSETS.debtRatio,1), s:'양호', tone:'pos' },
              { ic:'target', t:'은퇴준비율', v: pct(ASSETS.retireReady), s:'시작 단계', tone:'warn' },
            ].map((r,i) => (
              <div key={i} className="lrow" style={{ padding:'15px 18px', borderTop: i? '1px solid var(--line)':'none' }}>
                <span className="ic-chip" style={{ background:'var(--teal-50)' }}><Icon name={r.ic} size={20} color="var(--teal-600)" /></span>
                <div style={{ flex:1 }}><div style={{ fontSize:13.5, color:'var(--slate-600)', fontWeight:600 }}>{r.t}</div></div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <div className="tnum" style={{ fontSize:16, fontWeight:800, color:'var(--ink)', whiteSpace:'nowrap' }}>{r.v}</div>
                  <span className={'pill pill-'+r.tone} style={{ fontSize:10.5, padding:'2px 7px' }}>{r.s}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ ...stagger(5), marginTop:12, background:'var(--teal-900)', color:'#fff', border:'none' }}>
            <div className="row" style={{ gap:8, marginBottom:8 }}>
              <Icon name="sparkF" size={18} color="var(--teal-300)" />
              <b style={{ fontSize:13.5, fontWeight:700, color:'var(--teal-300)' }}>제이비스의 첫 제안</b>
            </div>
            <p style={{ fontSize:14.5, lineHeight:1.6, color:'rgba(255,255,255,.92)' }}>
              {AI_DIAGNOSIS.comment}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding:'10px 22px 24px', background:'var(--card)', borderTop:'1px solid var(--line)' }}>
        <button className="btn btn-primary" onClick={onNext}>제이비스 시작하기</button>
      </div>
    </div>
  );
}

Object.assign(window, { Onboarding, Toggle });
