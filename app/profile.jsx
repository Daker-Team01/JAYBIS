/* =========================================================================
   제이비스 (JAYBIS) — MY (프로필 · 설정)
  /* =========================================================================
     제이비스 (JAYBIS) — MY (프로필 · 설정)
     ========================================================================= */

  const {
    useState, useEffect, TopBar, Icon, SectionLabel, Toggle, stagger, useAppSettings, saveAppSettings,
    USER, useJaybisRuntimeData, saveRuntimeData,
  } = window;

  const TONE_OPTIONS = [
    { id: 'friendly', emoji: '😊', label: '친근하게',  desc: '편하고 따뜻한 말투' },
    { id: 'formal',   emoji: '💼', label: '격식 있게', desc: '정중하고 신뢰감 있는 말투' },
    { id: 'concise',  emoji: '⚡', label: '간결하게',  desc: '핵심만 짧고 빠르게' },
  ];

  function Profile({ nav, toast }) {
    const [settings, saveSettings] = useAppSettings();
    const [snapshot] = useJaybisRuntimeData();
    const user = snapshot?.user || USER;
    const [senior, setSenior] = useState(Boolean(settings?.seniorMode));
    const [voice, setVoice] = useState(Boolean(settings?.voiceGuide));
    const [profileOpen, setProfileOpen] = useState(false);
    const [draftName, setDraftName] = useState(user.name || '');
    const [draftAge, setDraftAge] = useState(user.age || '');

    useEffect(() => {
      setSenior(Boolean(settings?.seniorMode));
      setVoice(Boolean(settings?.voiceGuide));
    }, [settings?.seniorMode, settings?.voiceGuide]);

    useEffect(() => {
      if (!profileOpen) {
        setDraftName(user.name || '');
        setDraftAge(user.age || '');
      }
    }, [profileOpen, user.name, user.age]);

    const toggleSenior = () => {
      const next = !senior;
      setSenior(next);
      saveAppSettings({ seniorMode: next });
      toast(next ? '시니어 모드를 켰어요' : '시니어 모드를 해제했어요');
    };

    const toggleVoice = () => {
      const next = !voice;
      setVoice(next);
      saveAppSettings({ voiceGuide: next });
      toast(next ? '음성 안내를 켰어요' : '음성 안내를 껐어요');
    };

    const openProfileEditor = () => {
      setDraftName(user.name || '');
      setDraftAge(user.age || '');
      setProfileOpen(true);
    };

    const applyProfile = () => {
      const name = String(draftName || '').trim() || user.name || '사용자';
      const age = Number(draftAge) || 0;
      saveRuntimeData({
        ...(snapshot?.raw || {}),
        user: {
          ...(snapshot?.raw?.user || user || {}),
          name,
          greeting: name,
          age,
        },
      });
      setProfileOpen(false);
      toast('개인정보를 수정했어요');
    };

    return (
      <div className="scroll screen-anim">
        <TopBar title="MY" right={<Icon name="bell" size={20} color="var(--ink)" />} />

        <div style={{ padding:'2px 18px 26px' }} className="stagger">
          {/* 프로필 헤더 */}
          <div className="card" style={{ ...stagger(0), background:'var(--teal-900)', color:'#fff', padding:'18px 18px' }}>
            <div className="row" style={{ gap:14 }}>
              <span style={{ width:54, height:54, borderRadius:18, background:'linear-gradient(160deg,var(--teal-400),var(--teal-700))', display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' }}>
                <b style={{ fontSize:21, fontWeight:800 }}>{(user.name || '사').slice(0, 1)}</b>
              </span>
              <div style={{ flex:1 }}>
                <div className="row" style={{ gap:7 }}>
                  <b style={{ fontSize:18, fontWeight:800 }}>{user.name}</b>
                  {user.track && <span className="pill" style={{ background:'rgba(94,234,212,.18)', color:'var(--teal-300)', fontSize:10.5 }}>{user.track}</span>}
                </div>
                <div style={{ fontSize:12.5, color:'rgba(255,255,255,.72)', marginTop:3 }}>
                  {[user.age ? `${user.age}세` : null, user.job, user.joinedMonths ? `함께한 지 ${user.joinedMonths}개월` : null].filter(Boolean).join(' · ') || '프로필 데이터 대기 중'}
                </div>
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
               결혼·출산·주택 마련 이벤트도 곧 지원됩니다.
            </p>
          </div>

          {/* AI 말투 설정 */}
          <div style={{ marginTop:20, ...stagger(2) }}>
            <SectionLabel>AI 말투</SectionLabel>
            <div className="card" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {TONE_OPTIONS.map((t) => {
                  const sel = settings?.tone === t.id;
                  return (
                    <button key={t.id} onClick={() => { saveSettings({ tone: t.id }); toast(`말투를 "${t.label}"로 변경했어요`); }}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:12, border: sel ? '1.5px solid var(--teal-500)' : '1.5px solid var(--line)', background: sel ? 'var(--teal-50)' : 'transparent', textAlign:'left', cursor:'pointer' }}>
                      <span style={{ fontSize:20 }}>{t.emoji}</span>
                      <div>
                        <div style={{ fontSize:13.5, fontWeight:700, color: sel ? 'var(--teal-700)' : 'var(--ink)' }}>{t.label}</div>
                        <div className="muted" style={{ fontSize:11.5, marginTop:1 }}>{t.desc}</div>
                      </div>
                      {sel && <span style={{ marginLeft:'auto' }}><Icon name="check" size={16} color="var(--teal-500)" /></span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 접근성 */}
          <div style={{ marginTop:20, ...stagger(2) }}>
            <SectionLabel>접근성</SectionLabel>
            <div className="card" style={{ padding:'4px 18px' }}>
              <SettingRow icon="eye" tone="#0d9488" title="시니어 모드" sub="큰 글씨 · 쉬운 설명 · 음성 인식"
                on={senior} onToggle={toggleSenior} />
              <SettingRow icon="voice" tone="#0ea5e9" title="음성 안내 (TTS)" sub="경고·진단을 음성으로 읽어줘요"
                on={voice} onToggle={toggleVoice} last />
            </div>
          </div>

          {/* 메뉴 */}
          <div className="card" style={{ marginTop:14, ...stagger(3), padding:'4px 18px' }}>
            {[['금융코칭 학습 현황','spark'],['개인정보 · 보안','lock'],['고객센터','chat']].map(([t,ic],i) => (
              <button key={i} onClick={() => t === '개인정보 · 보안' ? openProfileEditor() : toast(t)} className="lrow" style={{ width:'100%', textAlign:'left', borderTop: i?'1px solid var(--line)':'none' }}>
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
        {profileOpen && (
          <div style={{ position:'absolute', inset:0, zIndex:30, background:'rgba(15,23,42,.28)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 18px calc(var(--tab-h) + 24px)' }}>
            <div className="card" style={{ width:'100%', maxWidth:360, padding:'16px 17px', boxShadow:'var(--shadow-md)' }}>
              <div className="between" style={{ marginBottom:13 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--ink)' }}>개인정보 수정</div>
                  <div className="muted" style={{ fontSize:12, marginTop:2 }}>닉네임과 나이를 변경합니다</div>
                </div>
                <button onClick={() => setProfileOpen(false)} style={{ width:32, height:32, borderRadius:10, background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:18, lineHeight:1, color:'var(--slate-500)', fontWeight:700 }}>×</span>
                </button>
              </div>

              <div style={{ display:'grid', gap:10 }}>
                <ProfileInput label="닉네임" value={draftName} onChange={setDraftName} placeholder="닉네임" />
                <ProfileInput label="나이" value={draftAge} onChange={setDraftAge} placeholder="나이" type="number" />
              </div>

              <div className="row" style={{ gap:8, marginTop:15 }}>
                <button onClick={() => setProfileOpen(false)} className="btn btn-line" style={{ height:40, flex:1, fontSize:13.5, borderRadius:11 }}>
                  취소
                </button>
                <button onClick={applyProfile} className="btn btn-primary" style={{ height:40, flex:1, fontSize:13.5, borderRadius:11, boxShadow:'none' }}>
                  적용
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function ProfileInput({ label, value, onChange, placeholder, type = 'text' }) {
    return (
      <label style={{ display:'grid', gap:6 }}>
        <span style={{ fontSize:12, fontWeight:800, color:'var(--slate-600)' }}>{label}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ height:40, border:'1px solid var(--line)', borderRadius:11, padding:'0 11px', outline:'none', color:'var(--ink)', background:'var(--bg)', fontSize:13.5 }}
        />
      </label>
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
