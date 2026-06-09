/* =========================================================================
   제이비스 (JAYBIS) — 온보딩 플로우
   스플래시 → 마이데이터 동의 → AI 자산진단 → 유형 자동 분류 → AI 개인화
   ========================================================================= */

const {
  useState, useEffect, StatusBar, Logo, Icon, stagger,
  MYDATA_INSTITUTIONS, ASSETS, AI_DIAGNOSIS, manwon, pct,
} = window;

function Onboarding({ onComplete }) {
  const [step, setStep] = useState('splash');
  const [profile, setProfile] = useState({ name:'', age:'', track:'', tone:'', agentLevel:'' });
  const upd = (f) => (v) => setProfile(p => ({ ...p, [f]:v }));

  return (
    <div className="app" style={{ background:'var(--bg)' }}>
      <StatusBar dark={step !== 'splash' && step !== 'analyzing'} />
      {step === 'splash'          && <OnbSplash         onNext={() => setStep('signup_name')} />}
      {step === 'signup_name'     && <OnbSignupName     value={profile.name} onChange={upd('name')} onBack={() => setStep('splash')}           onNext={() => setStep('signup_age')} />}
      {step === 'signup_age'      && <OnbSignupAge      value={profile.age}  onChange={upd('age')}  onBack={() => setStep('signup_name')}       onNext={() => setStep('consent')} />}
      {step === 'consent'         && <OnbConsent        onBack={() => setStep('signup_age')}          onNext={() => setStep('analyzing')} />}
      {step === 'analyzing'       && <OnbAnalyzing      onDone={() => setStep('result')} />}
      {step === 'result'          && <OnbResult         profile={profile}                             onNext={() => setStep('persona_track')} />}
      {step === 'persona_track'   && <PersonaTrack      value={profile.track}      onChange={upd('track')}      onNext={() => setStep('persona_tone')} />}
      {step === 'persona_tone'    && <PersonaTone       value={profile.tone}       onChange={upd('tone')}       onBack={() => setStep('persona_track')}  onNext={() => setStep('persona_agent')} />}
      {step === 'persona_agent'   && <PersonaAgentLevel value={profile.agentLevel} onChange={upd('agentLevel')} onBack={() => setStep('persona_tone')}   onNext={() => onComplete(profile)} />}
      <div className={'home-indicator' + ((step==='splash'||step==='analyzing') ? ' on-dark':'')}></div>
    </div>
  );
}

/* ---- 1. 스플래시 ---------------------------------------------------------- */
function GradientTypewriter({ text, style }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= text.length) return;
    const t = setTimeout(() => setCount(c => c + 1), 55);
    return () => clearTimeout(t);
  }, [count, text.length]);

  const chars = text.split('');
  const total = chars.filter(c => c !== '\n').length;
  let charIdx = 0;

  return (
    <span style={style}>
      {chars.map((char, i) => {
        if (char === '\n') return <br key={i} />;
        const pos = charIdx / Math.max(total - 1, 1);
        // 흰색(#fff) → teal-300(#5eead4) 선형 보간
        const r = Math.round(255 + (94  - 255) * pos);
        const g = Math.round(255 + (234 - 255) * pos);
        const b = Math.round(255 + (212 - 255) * pos);
        charIdx++;
        return (
          <span
            key={i}
            style={{
              color: `rgb(${r},${g},${b})`,
              opacity: i < count ? 1 : 0,
              transition: 'opacity 0.35s ease',
              display: 'inline',
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

function OnbSplash({ onNext }) {
  const stages = [
    { age:'사회초년생', icon:'spark', t:'첫 월급' },
    { age:'은퇴 준비', icon:'target', t:'자산 형성' },
    { age:'은퇴 이후', icon:'leaf', t:'연금 생활' },
  ];
  return (
    <div style={{ position:'absolute', inset:0, color:'#fff', display:'flex', flexDirection:'column',
      background:'linear-gradient(165deg,var(--teal-900) 0%, var(--teal-700) 52%, var(--teal-600) 120%)', overflow:'hidden' }}>
      <style>{`
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ position:'absolute', top:-80, right:-70, width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(94,234,212,.22), transparent 65%)' }}></div>
      <div style={{ position:'absolute', bottom:60, left:-90, width:260, height:260, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(45,212,191,.18), transparent 65%)' }}></div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 30px', position:'relative' }}>
        <div className="stagger">
          <div style={{ ...stagger(0) }}><Logo size={34} /></div>
          <h1 style={{ ...stagger(1), fontSize:33, fontWeight:800, lineHeight:1.28, letterSpacing:'-.6px', marginTop:26 }}>
            <GradientTypewriter text={'첫 월급부터\n은퇴 이후까지,\n경제적 전환기를\n관리하는 AI 금융비서'} />
          </h1>
          <p style={{ ...stagger(2), fontSize:15, color:'rgba(255,255,255,.72)', marginTop:18, lineHeight:1.6, fontWeight:500 }}>
            지금 상황을 진단하고, 다음 금융 행동을<br/>먼저 제안하는 에이전트 제이비스
          </p>

          <div style={{ display:'flex', gap:9, marginTop:30 }}>
            {stages.map((s,i) => (
              <div key={i} style={{ flex:1, background:'rgba(255,255,255,.1)', borderRadius:16, padding:'14px 10px',
                border:'1px solid rgba(255,255,255,.14)', textAlign:'center', backdropFilter:'blur(6px)',
                opacity:0, animation:'splashFadeUp 0.5s cubic-bezier(.22,1,.36,1) forwards',
                animationDelay:`${2000 + i * 180}ms` }}>
                <Icon name={s.icon} size={22} color="var(--teal-300)" />
                <div style={{ fontSize:11.5, fontWeight:700, marginTop:8 }}>{s.age}</div>
                <div style={{ fontSize:10.5, color:'rgba(255,255,255,.6)', marginTop:2 }}>{s.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'0 22px 30px', opacity:0, animation:'splashFadeUp 0.55s cubic-bezier(.22,1,.36,1) forwards', animationDelay:'2560ms' }}>
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

/* ---- 2. 회원가입 공통 래퍼 -------------------------------------------------- */
const SIGNUP_KF = `
  @keyframes signupSlideIn {
    from { opacity:0; transform:translateX(40px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes signupItemIn {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;

function SignupStep({ stepNum, onBack, title, children, footer }) {
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
      background:'var(--bg)', animation:'signupSlideIn 0.38s cubic-bezier(.22,1,.36,1) both' }}>
      <style>{SIGNUP_KF}</style>

      <div style={{ paddingTop:47 }}>
        <div style={{ height:50, padding:'0 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={onBack} style={{ width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="chevL" size={24} color="var(--ink)" />
          </button>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {[1,2].map(n => (
              <span key={n} style={{
                width: n === stepNum ? 20 : 7, height:7, borderRadius:99,
                background: n <= stepNum ? 'var(--teal-600)' : 'var(--slate-200)',
                transition:'all 0.35s cubic-bezier(.22,1,.36,1)'
              }} />
            ))}
          </div>
          <div style={{ width:40 }} />
        </div>
      </div>

      <div style={{ flex:1, padding:'8px 24px 0', overflowY:'auto' }}>
        <h2 style={{ fontSize:28, fontWeight:800, color:'var(--ink)', lineHeight:1.28,
          letterSpacing:'-.5px', whiteSpace:'pre-line',
          animation:'signupItemIn 0.45s cubic-bezier(.22,1,.36,1) 0.1s both' }}>
          {title}
        </h2>
        <div style={{ animation:'signupItemIn 0.45s cubic-bezier(.22,1,.36,1) 0.2s both' }}>
          {children}
        </div>
      </div>

      <div style={{ padding:'10px 22px 28px', borderTop:'1px solid var(--line)', background:'var(--card)',
        animation:'signupItemIn 0.45s cubic-bezier(.22,1,.36,1) 0.28s both' }}>
        {footer}
      </div>
    </div>
  );
}

/* ---- 2a. 이름 입력 --------------------------------------------------------- */
function OnbSignupName({ value, onChange, onBack, onNext }) {
  const ok = value.trim().length > 0;
  return (
    <SignupStep stepNum={1} onBack={onBack} title={'안녕하세요!\n이름이 뭐예요?'}
      footer={
        <button className="btn btn-primary" onClick={onNext} disabled={!ok}
          style={!ok ? { opacity:.45, boxShadow:'none' } : {}}>
          다음 <Icon name="arrowR" size={20} color="#fff" />
        </button>
      }
    >
      <input autoFocus type="text" value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && ok && onNext()}
        placeholder="이름 입력"
        style={{ width:'100%', marginTop:36, fontSize:26, fontWeight:700,
          border:'none', borderBottom:'2.5px solid var(--teal-600)',
          padding:'6px 0 10px', outline:'none', background:'transparent',
          color:'var(--ink)', letterSpacing:'-.3px' }}
      />
      <p style={{ fontSize:13, color:'var(--slate-400)', marginTop:10 }}>닉네임도 괜찮아요</p>
    </SignupStep>
  );
}

/* ---- 2b. 나이 입력 --------------------------------------------------------- */
function OnbSignupAge({ value, onChange, onBack, onNext }) {
  const ok = value && Number(value) >= 10 && Number(value) <= 100;
  return (
    <SignupStep stepNum={2} onBack={onBack} title={'몇 살이에요?'}
      footer={
        <button className="btn btn-primary" onClick={onNext} disabled={!ok}
          style={!ok ? { opacity:.45, boxShadow:'none' } : {}}>
          금융 데이터 연결하기 <Icon name="arrowR" size={20} color="#fff" />
        </button>
      }
    >
      <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:36 }}>
        <input autoFocus type="number" value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ok && onNext()}
          placeholder="00" min={10} max={100}
          style={{ width:110, fontSize:52, fontWeight:800,
            border:'none', borderBottom:'2.5px solid var(--teal-600)',
            padding:'4px 0 8px', outline:'none', background:'transparent',
            color:'var(--ink)', letterSpacing:'-2px',
            MozAppearance:'textfield', WebkitAppearance:'none' }}
        />
        <span style={{ fontSize:22, fontWeight:700, color:'var(--slate-500)' }}>세</span>
      </div>
    </SignupStep>
  );
}

/* ---- 3. 마이데이터 연동 동의 ---------------------------------------------- */
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
    { t:'계좌·카드 거래내역 수집', d:'연결된 금융기관' },
    { t:'순자산 · 부채비율 계산', d:'자산 조회 Tool 호출' },
    { t:'또래 벤치마크 비교', d:'연령 · 지역 기준 통계' },
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

/* ---- 5. 유형 분류 결과 ---------------------------------------------------- */
function OnbResult({ profile, onNext }) {
  const name = profile?.name || '사용자';
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>
      <div className="scroll" style={{ paddingTop:47 }}>
        <div style={{ padding:'30px 24px 0', textAlign:'center' }} className="stagger">
          <div style={{ ...stagger(0), width:72, height:72, margin:'0 auto', borderRadius:24, background:'var(--teal-50)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="spark" size={36} color="var(--teal-600)" />
          </div>
          <div style={{ ...stagger(1), marginTop:18 }}>
            <span className="pill pill-teal">자산 진단 완료</span>
          </div>
          <h2 style={{ ...stagger(2), fontSize:24, fontWeight:800, color:'var(--ink)', marginTop:14, letterSpacing:'-.4px', lineHeight:1.3 }}>
            {name}님의 자산을<br/>분석했어요
          </h2>
          <p style={{ ...stagger(3), fontSize:14, marginTop:10, lineHeight:1.6, padding:'0 6px', color:'var(--slate-500)' }}>
            연결된 금융 데이터를 바탕으로 순자산·부채·은퇴준비율을 진단했어요.
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
        <button className="btn btn-primary" onClick={onNext}>
          AI 개인화 설정하기 <Icon name="arrowR" size={20} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   AI 개인화 — 공통 래퍼
   ========================================================================= */
const PERSONA_KF = `
  @keyframes personaIn {
    from { opacity:0; transform:translateY(28px) scale(0.97); }
    to   { opacity:1; transform:translateY(0)    scale(1);    }
  }
  @keyframes personaCardIn {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;

function PersonaStep({ stepNum, totalSteps, onBack, title, subtitle, children, footer }) {
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
      background:'var(--bg)', animation:'personaIn 0.42s cubic-bezier(.22,1,.36,1) both' }}>
      <style>{PERSONA_KF}</style>

      <div style={{ paddingTop:47 }}>
        <div style={{ height:50, padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {onBack
            ? <button onClick={onBack} style={{ width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="chevL" size={24} color="var(--ink)" />
              </button>
            : <div style={{ width:40 }} />
          }
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:11.5, fontWeight:600, color:'var(--slate-400)', letterSpacing:'.4px', textTransform:'uppercase' }}>
              AI 개인화
            </span>
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <span key={i} style={{
                  width: i + 1 === stepNum ? 22 : 7, height:7, borderRadius:99,
                  background: i + 1 <= stepNum ? 'var(--teal-600)' : 'var(--slate-200)',
                  transition:'all 0.35s cubic-bezier(.22,1,.36,1)'
                }} />
              ))}
            </div>
          </div>
          <div style={{ width:40 }} />
        </div>
      </div>

      <div style={{ flex:1, padding:'12px 24px 0', overflowY:'auto' }}>
        <div style={{ animation:'personaCardIn 0.45s cubic-bezier(.22,1,.36,1) 0.08s both' }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:'var(--ink)', lineHeight:1.3,
            letterSpacing:'-.5px', whiteSpace:'pre-line' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize:14, color:'var(--slate-400)', marginTop:8, lineHeight:1.6 }}>{subtitle}</p>
          )}
        </div>
        <div style={{ animation:'personaCardIn 0.45s cubic-bezier(.22,1,.36,1) 0.18s both' }}>
          {children}
        </div>
      </div>

      <div style={{ padding:'10px 22px 28px', borderTop:'1px solid var(--line)', background:'var(--card)',
        animation:'personaCardIn 0.45s cubic-bezier(.22,1,.36,1) 0.26s both' }}>
        {footer}
      </div>
    </div>
  );
}

/* ---- 개인화 Q1: 트랙 선택 -------------------------------------------------- */
const TRACKS = [
  { id:'junior', icon:'spark',  label:'사회초년생', desc:'첫 직장 · 첫 월급 · 저축 시작', color:'#0047bb' },
  { id:'mid',    icon:'target', label:'은퇴 준비',  desc:'자산 형성 · 투자 · 목돈 마련',  color:'#0d2d77' },
  { id:'retire', icon:'leaf',   label:'은퇴 이후',  desc:'연금 수령 · 안정적 생활 관리',  color:'#0a6655' },
];

function PersonaTrack({ value, onChange, onNext }) {
  return (
    <PersonaStep stepNum={1} totalSteps={3} title={'지금 어떤 단계에\n계신가요?'} subtitle={'맞춤형 재무 전략을 추천해 드려요'}
      footer={
        <button className="btn btn-primary" onClick={onNext} disabled={!value}
          style={!value ? { opacity:.45, boxShadow:'none' } : {}}>
          다음 <Icon name="arrowR" size={20} color="#fff" />
        </button>
      }
    >
      <div style={{ display:'flex', flexDirection:'column', gap:11, marginTop:24 }}>
        {TRACKS.map((t, i) => {
          const sel = value === t.id;
          return (
            <button key={t.id} onClick={() => onChange(t.id)}
              style={{ display:'flex', alignItems:'center', gap:16, width:'100%',
                padding:'18px 20px', borderRadius:18, textAlign:'left',
                background: sel ? t.color : 'var(--card)',
                border:`2px solid ${sel ? t.color : 'var(--line)'}`,
                color: sel ? '#fff' : 'var(--ink)',
                transition:'all 0.25s cubic-bezier(.22,1,.36,1)',
                transform: sel ? 'scale(1.02)' : 'scale(1)',
                opacity:0,
                animation:`personaCardIn 0.45s cubic-bezier(.22,1,.36,1) ${0.28 + i*0.1}s forwards` }}>
              <span style={{ width:46, height:46, borderRadius:14, flex:'0 0 auto',
                background: sel ? 'rgba(255,255,255,.2)' : t.color+'18',
                display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.22s' }}>
                <Icon name={t.icon} size={24} color={sel ? '#fff' : t.color} />
              </span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-.3px' }}>{t.label}</div>
                <div style={{ fontSize:13, marginTop:3, color: sel ? 'rgba(255,255,255,.78)' : 'var(--slate-500)' }}>{t.desc}</div>
              </div>
              {sel && <Icon name="check" size={20} color="#fff" stroke={2.5} />}
            </button>
          );
        })}
      </div>
    </PersonaStep>
  );
}

/* ---- 개인화 Q2: 말투 선택 -------------------------------------------------- */
const TONES = [
  { id:'friendly', emoji:'😊', label:'친근하게',   desc:'편하고 따뜻한 말투로 대화해요' },
  { id:'formal',   emoji:'💼', label:'격식 있게',  desc:'정중하고 신뢰감 있는 말투예요' },
  { id:'concise',  emoji:'⚡', label:'간결하게',   desc:'핵심만 짧고 빠르게 전달해요' },
];

function PersonaTone({ value, onChange, onBack, onNext }) {
  return (
    <PersonaStep stepNum={2} totalSteps={3} onBack={onBack} title={'어떤 말투가\n편하세요?'} subtitle={'제이비스가 대화할 방식을 골라주세요'}
      footer={
        <button className="btn btn-primary" onClick={onNext} disabled={!value}
          style={!value ? { opacity:.45, boxShadow:'none' } : {}}>
          다음 <Icon name="arrowR" size={20} color="#fff" />
        </button>
      }
    >
      <div style={{ display:'flex', flexDirection:'column', gap:11, marginTop:24 }}>
        {TONES.map((t, i) => {
          const sel = value === t.id;
          return (
            <button key={t.id} onClick={() => onChange(t.id)}
              style={{ display:'flex', alignItems:'center', gap:16, width:'100%',
                padding:'18px 20px', borderRadius:18, textAlign:'left',
                background: sel ? 'var(--teal-600)' : 'var(--card)',
                border:`2px solid ${sel ? 'var(--teal-600)' : 'var(--line)'}`,
                color: sel ? '#fff' : 'var(--ink)',
                transition:'all 0.25s cubic-bezier(.22,1,.36,1)',
                transform: sel ? 'scale(1.02)' : 'scale(1)',
                opacity:0,
                animation:`personaCardIn 0.45s cubic-bezier(.22,1,.36,1) ${0.28 + i*0.1}s forwards` }}>
              <span style={{ width:46, height:46, borderRadius:14, flex:'0 0 auto', fontSize:22,
                background: sel ? 'rgba(255,255,255,.2)' : 'var(--teal-50)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {t.emoji}
              </span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-.3px' }}>{t.label}</div>
                <div style={{ fontSize:13, marginTop:3, color: sel ? 'rgba(255,255,255,.78)' : 'var(--slate-500)' }}>{t.desc}</div>
              </div>
              {sel && <Icon name="check" size={20} color="#fff" stroke={2.5} />}
            </button>
          );
        })}
      </div>
    </PersonaStep>
  );
}

/* ---- 개인화 Q3: AI 개입 수준 ----------------------------------------------- */
const AGENT_LEVELS = [
  { id:'active',  emoji:'🔔', label:'자주 챙겨줘',    desc:'이상 감지·리포트·제안을 적극적으로 알려줘요' },
  { id:'onask',   emoji:'💬', label:'물어볼 때만',    desc:'제가 먼저 묻기 전엔 조용히 있어요' },
  { id:'summary', emoji:'📋', label:'요약만 해줘',    desc:'주 1회 핵심 요약만 딱 보내드려요' },
];

function PersonaAgentLevel({ value, onChange, onBack, onNext }) {
  return (
    <PersonaStep stepNum={3} totalSteps={3} onBack={onBack} title={'제이비스가 얼마나\n챙겨드릴까요?'} subtitle={'언제든 설정에서 바꿀 수 있어요'}
      footer={
        <button className="btn btn-primary" onClick={onNext} disabled={!value}
          style={!value ? { opacity:.45, boxShadow:'none' } : {}}>
          완료 <Icon name="check" size={20} color="#fff" stroke={2.5} />
        </button>
      }
    >
      <div style={{ display:'flex', flexDirection:'column', gap:11, marginTop:24 }}>
        {AGENT_LEVELS.map((a, i) => {
          const sel = value === a.id;
          return (
            <button key={a.id} onClick={() => onChange(a.id)}
              style={{ display:'flex', alignItems:'center', gap:16, width:'100%',
                padding:'18px 20px', borderRadius:18, textAlign:'left',
                background: sel ? 'var(--teal-600)' : 'var(--card)',
                border:`2px solid ${sel ? 'var(--teal-600)' : 'var(--line)'}`,
                color: sel ? '#fff' : 'var(--ink)',
                transition:'all 0.25s cubic-bezier(.22,1,.36,1)',
                transform: sel ? 'scale(1.02)' : 'scale(1)',
                opacity:0,
                animation:`personaCardIn 0.45s cubic-bezier(.22,1,.36,1) ${0.28 + i*0.1}s forwards` }}>
              <span style={{ width:46, height:46, borderRadius:14, flex:'0 0 auto', fontSize:22,
                background: sel ? 'rgba(255,255,255,.2)' : 'var(--teal-50)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {a.emoji}
              </span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-.3px' }}>{a.label}</div>
                <div style={{ fontSize:13, marginTop:3, color: sel ? 'rgba(255,255,255,.78)' : 'var(--slate-500)' }}>{a.desc}</div>
              </div>
              {sel && <Icon name="check" size={20} color="#fff" stroke={2.5} />}
            </button>
          );
        })}
      </div>
    </PersonaStep>
  );
}

Object.assign(window, { Onboarding, Toggle });
