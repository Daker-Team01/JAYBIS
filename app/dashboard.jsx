/* =========================================================================
   제이비스 (JAYBIS) — 홈
   상단: 구글검색형 AI 에이전트 대화 바  ·  하단: 기능 카드 + 자산 요약
   ========================================================================= */

const HOME_PROMPTS = [
  '이번 달 어디에 많이 썼어?',
  '청년 상품 추천해줘',
  '내 자산 진단해줘',
];

const FEATURES = [
  { ic:'budget',   title:'청년 예산설계', desc:'50·30·20 · 또래 비교', go:'budget',   tone:'#0047bb' },
  { ic:'products', title:'금융상품 로드맵', desc:'청년 맞춤 우선순위',   go:'products', tone:'#0d2d77' },
  { ic:'piggy',    title:'납입 시뮬레이터', desc:'5년 뒤 수령액 계산',   go:'products', tone:'#2f6bdb' },
  { ic:'chat',     title:'AI 금융상담',    desc:'대화로 진단·코칭',     go:'chat',     tone:'#0047bb' },
  { ic:'shield',   title:'보이스피싱 보호', desc:'이상거래 실시간 감지',  go:'profile',  tone:'#0d2d77' },
  { ic:'eye',      title:'시니어 모드',     desc:'큰 글씨 · 음성 안내',   go:'profile',  tone:'#2f6bdb' },
  { ic:'clock',    title:'연금 생활비',    desc:'노후 준비 부족분 점검', go:'chat',     tone:'#0d2d77' },
  { ic:'voice',    title:'쉬운 설명·TTS',  desc:'음성 안내 · 단계별 설명', go:'profile', tone:'#0047bb' },
];

function Home({ nav, toast }) {
  const [hide, setHide] = useState(false);
  const a = ASSETS;
  const flow = CASHFLOW_INSIGHT;
  const mask = (s) => hide ? '••••••' : s;

  return (
    <div className="scroll screen-anim">
      {/* ---- 네이비 헤더 ---- */}
      <div style={{ position:'relative', paddingTop:58, paddingBottom:64,
        background:'linear-gradient(165deg, var(--teal-800) 0%, var(--teal-700) 75%, var(--teal-600) 130%)',
        color:'#fff', borderRadius:'0 0 26px 26px', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-50, right:-40, width:200, height:200, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(255,255,255,.12), transparent 65%)' }} />
        <div className="between" style={{ position:'relative', zIndex:1, padding:'0 22px' }}>
          <div className="row" style={{ gap:10 }}>
            <Logo size={24} mark />
            <div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,.72)', fontWeight:600 }}>안녕하세요, {USER.name}님</div>
              <div style={{ fontSize:13.5, fontWeight:700 }}>오늘도 든든한 하루 되세요</div>
            </div>
          </div>
          <button style={{ width:40, height:40, borderRadius:13, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <Icon name="bell" size={20} color="#fff" />
            <span style={{ position:'absolute', top:9, right:10, width:7, height:7, borderRadius:'50%', background:'#fff', border:'2px solid var(--teal-700)' }} />
          </button>
        </div>

        <div style={{ position:'relative', zIndex:1, padding:'22px 22px 0' }}>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-.4px', lineHeight:1.35 }}>
            무엇을 도와드릴까요?
          </h1>
          <p style={{ fontSize:13.5, color:'rgba(255,255,255,.74)', marginTop:6, fontWeight:500 }}>
            자산·소비·상품, 제이비스에게 바로 물어보세요
          </p>
        </div>
      </div>

      <div style={{ padding:'0 18px 26px', marginTop:-40, position:'relative', zIndex:2 }} className="stagger">

        {/* ---- 구글검색형 AI 에이전트 바 ---- */}
        <div style={{ ...stagger(0) }}>
          <button onClick={() => nav('chat')} style={{ width:'100%', display:'flex', alignItems:'center', gap:12,
            background:'var(--card)', borderRadius:18, padding:'15px 16px', textAlign:'left',
            boxShadow:'0 12px 34px rgba(13,45,119,.16), 0 2px 8px rgba(13,45,119,.08)',
            border:'1px solid var(--line)' }}>
            <span style={{ width:38, height:38, borderRadius:12, flex:'0 0 auto',
              background:'linear-gradient(150deg, var(--teal-500), var(--teal-800))',
              display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,71,187,.32)' }}>
              <Icon name="sparkF" size={20} color="#fff" />
            </span>
            <span style={{ flex:1, fontSize:15, color:'var(--slate-500)', fontWeight:500 }}>제이비스에게 무엇이든 물어보세요</span>
            <span style={{ width:36, height:36, borderRadius:11, background:'var(--teal-50)', display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' }}>
              <Icon name="mic" size={19} color="var(--teal-700)" />
            </span>
          </button>

          {/* 추천 프롬프트 칩 */}
          <div style={{ display:'flex', gap:8, marginTop:11, flexWrap:'wrap' }}>
            {HOME_PROMPTS.map((q,i) => (
              <button key={i} onClick={() => nav('chat', q)} className="pill"
                style={{ background:'var(--card)', border:'1px solid var(--teal-100)', color:'var(--teal-700)', fontSize:12.5, padding:'9px 13px', boxShadow:'var(--shadow-sm)' }}>
                <Icon name="spark" size={13} color="var(--teal-600)" /> {q}
              </button>
            ))}
          </div>
        </div>

        {/* ---- 자산 요약 ---- */}
        <div style={{ marginTop:24, ...stagger(1) }}>
          <SectionLabel action="진단 상세" onAction={() => toast('자산진단 리포트')}>내 자산 한눈에</SectionLabel>
          <div className="card" style={{ background:'linear-gradient(160deg, var(--teal-800), var(--teal-700))', color:'#fff', boxShadow:'var(--shadow-md)' }}>
            <div className="between">
              <div className="row" style={{ gap:7 }}>
                <span style={{ fontSize:13, color:'rgba(255,255,255,.78)', fontWeight:600 }}>순자산</span>
                <button onClick={() => setHide(h=>!h)}><Icon name="eye" size={15} color="rgba(255,255,255,.7)" /></button>
              </div>
              <span className="pill" style={{ background:'rgba(255,255,255,.16)', color:'#fff', fontSize:11 }}>
                <Icon name="sparkF" size={12} color="#fff" /> {AI_DIAGNOSIS.grade}
              </span>
            </div>
            <b className="tnum" style={{ fontSize:33, fontWeight:800, letterSpacing:'-.8px', display:'block', marginTop:6 }}>{mask(won(a.netWorth))}</b>

            <div className="row" style={{ gap:10, marginTop:16 }}>
              <MiniStat label="총자산" value={mask(manwon(a.totalAssets)+'원')} />
              <MiniStat label="총부채" value={mask(manwon(a.totalDebt)+'원')} />
              <MiniStat label="이번 달 여유" value={mask(manwon(a.cashflow.left)+'원')} accent />
            </div>

            <div className="row" style={{ gap:18, marginTop:18, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.16)' }}>
              <MiniGauge value={a.debtRatio} label="부채비율" txt={pct(a.debtRatio,1)} />
              <MiniGauge value={a.retireReady} label="은퇴준비율" txt={pct(a.retireReady)} warn />
              <div style={{ flex:1, alignSelf:'center' }}>
                <p style={{ fontSize:11.5, lineHeight:1.5, color:'rgba(255,255,255,.82)' }}>또래 평균보다 저축 여력이 <b>18% 높아요</b></p>
              </div>
            </div>
            <div style={{ marginTop:12, padding:'12px 13px', background:'rgba(255,255,255,.1)', borderRadius:14, border:'1px solid rgba(255,255,255,.12)' }}>
              <div className="between" style={{ marginBottom:8 }}>
                <b style={{ fontSize:12.5, color:'#fff' }}>월 현금흐름 요약</b>
                <span className="pill pill-ghost" style={{ fontSize:10.5 }}>{flow.risk}</span>
              </div>
              <div className="row" style={{ gap:8 }}>
                <MiniStat label="소득" value={mask(won(flow.income))} />
                <MiniStat label="지출" value={mask(won(flow.spend))} />
                <MiniStat label="남는 돈" value={mask(won(flow.left))} accent />
              </div>
            </div>
          </div>
        </div>

        {/* ---- 기능 카드 ---- */}
        <div style={{ marginTop:24, ...stagger(2) }}>
          <SectionLabel>전체 서비스</SectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
            {FEATURES.map((f,i) => (
              <button key={i} onClick={() => nav(f.go)} className="card" style={{ textAlign:'left', padding:'16px 15px' }}>
                <span className="ic-chip" style={{ width:42, height:42, borderRadius:13, background:f.tone+'15' }}>
                  <Icon name={f.ic} size={22} color={f.tone} />
                </span>
                <div style={{ fontSize:14.5, fontWeight:800, color:'var(--ink)', marginTop:12, letterSpacing:'-.2px' }}>{f.title}</div>
                <div className="muted" style={{ fontSize:12, marginTop:3 }}>{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ---- 추천 액션 ---- */}
        <div style={{ marginTop:24, ...stagger(3) }}>
          <SectionLabel>제이비스 추천 액션</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <ActionCard tone="#0047bb" icon="piggy" title="청년도약계좌 시작하기"
              body="5년 뒤 약 5,000만원 · 1순위 추천" onClick={() => nav('products')} />
            <ActionCard tone="#d97706" icon="warn" title="외식·배달 38% 초과"
              body="주 2회로 줄이면 월 8만원 절약" onClick={() => nav('budget')} />
            <ActionCard tone="#0d2d77" icon="chat" title="구독 3개가 겹쳐요"
              body="하나만 남기면 월 18,500원 절약" onClick={() => nav('chat', '구독 정리하고 싶어')} />
            <ActionCard tone="#16a34a" icon="shield" title="이상거래 점검"
              body="수상한 이체 전, 위험도 먼저 확인" onClick={() => nav('chat', '보이스피싱 예방해줘')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div style={{ flex:1, background: accent ? 'rgba(94,234,212,.16)' : 'rgba(255,255,255,.1)', borderRadius:13, padding:'10px 12px' }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:600 }}>{label}</div>
      <div className="tnum" style={{ fontSize:14, fontWeight:800, marginTop:3, color: accent ? 'var(--teal-300)' : '#fff' }}>{value}</div>
    </div>
  );
}

function MiniGauge({ value, label, txt, warn }) {
  const r = 22, c = 2*Math.PI*r, off = c*(1-value/100);
  return (
    <div style={{ textAlign:'center' }}>
      <span style={{ position:'relative', display:'inline-flex' }}>
        <svg width="54" height="54" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="5" />
          <circle cx="27" cy="27" r={r} fill="none" stroke={warn?'#fbbf24':'#fff'} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off} style={{ transition:'stroke-dashoffset 1s ease' }} />
        </svg>
        <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }} className="tnum">{txt}</span>
      </span>
      <div style={{ fontSize:11, color:'rgba(255,255,255,.78)', fontWeight:600, marginTop:5 }}>{label}</div>
    </div>
  );
}

function ActionCard({ tone, icon, title, body, onClick }) {
  return (
    <button onClick={onClick} className="card row" style={{ gap:13, textAlign:'left', padding:'15px 16px', width:'100%' }}>
      <span className="ic-chip" style={{ background:tone+'16' }}><Icon name={icon} size={21} color={tone} /></span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink)' }}>{title}</div>
        <div className="muted" style={{ fontSize:12.5, marginTop:2 }}>{body}</div>
      </div>
      <Icon name="chevR" size={18} color="var(--slate-400)" />
    </button>
  );
}

Object.assign(window, { Home });
