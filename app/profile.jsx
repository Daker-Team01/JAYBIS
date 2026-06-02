/* =========================================================================
   제이비스 (JAYBIS) — MY (프로필 · 설정 · 보호 기능)
   ========================================================================= */

function Profile({ nav, toast }) {
  const [settings, setSettings] = useAppSettings();
  const [guard, setGuard] = useState(true);
  const senior = settings.seniorMode;
  const voice = settings.voiceGuide;

  return (
    <div className="scroll screen-anim">
      <TopBar title="MY" right={<Icon name="bell" size={20} color="var(--ink)" />} />

      <div style={{ padding:'2px 18px 26px' }} className="stagger">
        {/* 프로필 헤더 */}
        <div className="card" style={{ ...stagger(0), background:'var(--teal-900)', color:'#fff', padding:'18px 18px' }}>
          <div className="row" style={{ gap:14 }}>
            <span style={{ width:54, height:54, borderRadius:18, background:'linear-gradient(160deg,var(--teal-400),var(--teal-700))', display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' }}>
              <b style={{ fontSize:21, fontWeight:800 }}>도</b>
            </span>
            <div style={{ flex:1 }}>
              <div className="row" style={{ gap:7 }}>
                <b style={{ fontSize:18, fontWeight:800 }}>{USER.name}</b>
                <span className="pill" style={{ background:'rgba(94,234,212,.18)', color:'var(--teal-300)', fontSize:10.5 }}>{USER.track}</span>
              </div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,.72)', marginTop:3 }}>{USER.age}세 · {USER.job} · 함께한 지 {USER.joinedMonths}개월</div>
            </div>
          </div>
        </div>

        {/* 생애주기 트랙 */}
        <div style={{ marginTop:20, ...stagger(1) }}>
          <SectionLabel>생애주기 트랙</SectionLabel>
          <div className="card" style={{ padding:'7px 8px' }}>
            <div className="row" style={{ gap:7 }}>
              {[
                { k:'사회초년생', ic:'spark', on:true },
                { k:'은퇴 준비', ic:'target', on:false },
                { k:'은퇴 이후', ic:'leaf', on:false },
              ].map((t,i) => (
                <div key={i} style={{ flex:1, textAlign:'center', padding:'13px 6px', borderRadius:13,
                  background: t.on ? 'var(--teal-50)' : 'transparent', border: t.on?'1px solid var(--teal-100)':'1px solid transparent' }}>
                  <Icon name={t.ic} size={22} color={t.on?'var(--teal-600)':'var(--slate-400)'} />
                  <div style={{ fontSize:11.5, fontWeight:700, color: t.on?'var(--teal-700)':'var(--slate-500)', marginTop:7 }}>{t.k}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="muted" style={{ fontSize:11.5, marginTop:8, lineHeight:1.5, padding:'0 2px' }}>
            소득·자산 변화를 감지해 트랙은 자동으로 전환돼요. 결혼·출산·주택 마련 이벤트도 곧 지원됩니다.
          </p>
        </div>

        {/* 접근성 & 보호 */}
        <div style={{ marginTop:20, ...stagger(2) }}>
          <SectionLabel>접근성 & 보호</SectionLabel>
          <div className="card" style={{ padding:'4px 18px' }}>
            <SettingRow icon="eye" tone="#0d9488" title="시니어 모드" sub="큰 글씨 22px · 쉬운 설명 · WCAG AAA"
              on={senior} onToggle={() => { const next = saveAppSettings({ seniorMode: !senior }); setSettings(next); toast(next.seniorMode ? '시니어 모드를 켰어요' : '시니어 모드를 해제했어요'); }} />
            <SettingRow icon="voice" tone="#0ea5e9" title="음성 안내 (TTS)" sub="경고·진단을 음성으로 읽어줘요"
              on={voice} onToggle={() => { const next = saveAppSettings({ voiceGuide: !voice }); setSettings(next); toast(next.voiceGuide ? '음성 안내를 켰어요' : '음성 안내를 껐어요'); }} />
            <SettingRow icon="shield" tone="#16a34a" title="보이스피싱 보호" sub="이상거래 자동 감지 · 위험 시 이체 지연"
              on={guard} onToggle={() => setGuard(g=>!g)} last />
          </div>
        </div>

        <div className="card" style={{ marginTop:14, ...stagger(2.5) }}>
          <div className="between" style={{ marginBottom:10 }}>
            <b style={{ fontSize:14.5, color:'var(--ink)' }}>현재 안내 정책</b>
            <span className="pill pill-teal" style={{ fontSize:10.5 }}>{voice ? 'TTS 켜짐' : 'TTS 꺼짐'}</span>
          </div>
          <p style={{ fontSize:12.5, lineHeight:1.6, color:'var(--slate-600)' }}>
            쉬운 설명은 {senior ? '사용 중' : '기본'}이고, 음성 안내는 {voice ? '활성화' : '비활성화'} 상태예요. 이 설정은 채팅 에이전트와 안내 카드에 그대로 반영돼요.
          </p>
          <button className="btn btn-ghost" style={{ marginTop:12 }} onClick={() => {
            speakText('안녕하세요. 제이비스 음성 안내를 테스트합니다. 지금은 쉬운 설명 모드와 음성 안내 상태를 확인하고 있어요.');
            toast('음성 안내를 재생했어요');
          }}>
            음성 미리듣기
          </button>
        </div>

        {/* 보이스피싱 데모 카드 */}
        {guard && (
          <div className="card" style={{ marginTop:14, ...stagger(3), borderLeft:'3px solid var(--pos)' }}>
            <div className="between">
              <div className="row" style={{ gap:9 }}>
                <Icon name="shield" size={19} color="var(--pos)" />
                <div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--ink)' }}>실시간 이상거래 감시 중</div>
                  <div className="muted" style={{ fontSize:11.5, marginTop:1 }}>최근 30일 위험 거래 0건 차단</div>
                </div>
              </div>
              <span className="pill pill-pos" style={{ fontSize:10.5 }}>안전</span>
            </div>
          </div>
        )}

        {/* 연동 기관 */}
        <div style={{ marginTop:20, ...stagger(4) }}>
          <SectionLabel action="관리" onAction={() => toast('마이데이터 연동 관리')}>연결된 기관 6곳</SectionLabel>
          <div className="card" style={{ padding:'14px 16px' }}>
            <div className="row" style={{ gap:8, flexWrap:'wrap' }}>
              {MYDATA_INSTITUTIONS.map(inst => (
                <span key={inst.id} className="pill" style={{ background:inst.tone+'12', color:inst.tone, fontSize:11.5, padding:'7px 11px' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--pos)' }} /> {inst.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        <div className="card" style={{ marginTop:14, ...stagger(5), padding:'4px 18px' }}>
          {[['보호자 알림 설정','bell'],['금융코칭 학습 현황','spark'],['디지털 금융 단계별 안내','target'],['개인정보 · 보안','lock'],['고객센터','chat']].map(([t,ic],i,arr) => (
            <button key={i} onClick={() => toast(t)} className="lrow" style={{ width:'100%', textAlign:'left', borderTop: i?'1px solid var(--line)':'none' }}>
              <Icon name={ic} size={19} color="var(--slate-500)" />
              <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--ink)' }}>{t}</span>
              <Icon name="chevR" size={16} color="var(--slate-400)" />
            </button>
          ))}
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--slate-400)', marginTop:20, lineHeight:1.6 }}>
          제이비스 · JB금융그룹 LifeLong WM<br/>본 화면은 Fin AI Challenge 프로토타입입니다
        </p>
      </div>
    </div>
  );
}

function SettingRow({ icon, tone, title, sub, on, onToggle, last }) {
  return (
    <div className="lrow" style={{ borderTop: 'none', padding:'14px 0', ...(last?{}:{ borderBottom:'1px solid var(--line)' }) }}>
      <span className="ic-chip" style={{ width:38, height:38, borderRadius:11, background:tone+'16' }}><Icon name={icon} size={19} color={tone} /></span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{title}</div>
        <div className="muted" style={{ fontSize:11.5, marginTop:1 }}>{sub}</div>
      </div>
      <Toggle on={on} onClick={onToggle} />
    </div>
  );
}

Object.assign(window, { Profile });
