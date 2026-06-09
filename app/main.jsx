/* =========================================================================
   제이비스 (JAYBIS) — 루트 App · 네비게이션
   ========================================================================= */

const {
  ReactDOM, useState, useEffect, useToast, useAppSettings, StatusBar, Onboarding,
  Home, Budget, Products, Profile, Chat, Icon,
} = window;

function App() {
  const [phase, setPhase] = useState('onboarding'); // onboarding | app
  const [settings, saveSettings] = useAppSettings();
  const [seniorMode, setSeniorMode] = useState(Boolean(settings?.seniorMode));
  const [tab, setTab] = useState('home');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState(null);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    setSeniorMode(Boolean(settings?.seniorMode));
  }, [settings?.seniorMode]);

  const nav = (target, seed) => {
    if (target === 'chat') { setChatSeed(seed || null); setChatOpen(true); return; }
    setTab(target);
  };

  if (phase === 'onboarding') {
    return <Onboarding onComplete={(_profile) => setPhase('app')} />;
  }

  // 홈은 teal hero → 밝은 상태바, 나머지는 어두운 상태바
  const statusDark = tab !== 'home';

  const toggleSeniorMode = () => {
    const next = !seniorMode;
    setSeniorMode(next);
    saveSettings({ seniorMode: next });
    toast(next ? '시니어 모드를 켰어요' : '시니어 모드를 껐어요');
  };

  return (
    <div className="app">
      <StatusBar dark={statusDark} />

      {tab === 'home'     && (window.Senior && seniorMode ? <window.Senior nav={nav} toast={toast} seniorMode={seniorMode} setSeniorMode={toggleSeniorMode} /> : <Home nav={nav} toast={toast} />)}
      {tab === 'budget'   && <Budget   nav={nav} toast={toast} />}
      {tab === 'products' && <Products nav={nav} toast={toast} />}
      {tab === 'profile'  && <Profile  nav={nav} toast={toast} />}

      {toastNode}

      <TabBar tab={tab} setTab={setTab} onChat={() => { setChatSeed(null); setChatOpen(true); }} />

      {chatOpen && <Chat seed={chatSeed} onClose={() => { setChatOpen(false); setChatSeed(null); }} />}

      <div className={'home-indicator' + (chatOpen ? '' : '')}></div>
    </div>
  );
}

function TabBar({ tab, setTab, onChat }) {
  const items = [
    { k:'home', l:'홈', ic:'home' },
    { k:'budget', l:'예산', ic:'budget' },
    { k:'__fab', l:'', ic:'' },
    { k:'products', l:'상품', ic:'products' },
    { k:'profile', l:'MY', ic:'user' },
  ];
  return (
    <div className="tabbar">
      {items.map((it) => {
        if (it.k === '__fab') {
          return (
            <div key="fab" className="tab-fab-wrap">
              <button className="tab-fab" onClick={onChat} aria-label="제이비스 AI">
                <Icon name="sparkF" size={26} color="#fff" />
              </button>
              <span className="tab-fab-label">제이비스</span>
            </div>
          );
        }
        const active = tab === it.k;
        return (
          <button key={it.k} className={'tab' + (active ? ' active' : '')} onClick={() => setTab(it.k)}>
            <Icon name={it.ic} size={24} color={active ? 'var(--teal-600)' : 'var(--slate-400)'} stroke={active ? 2.1 : 1.8} />
            <span>{it.l}</span>
          </button>
        );
      })}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
