/* =========================================================================
   제이비스 (JAYBIS) — 이상거래 시뮬레이터 + 알림 오버레이
   Ctrl+Shift+F → simulateFraud() 실행
   ========================================================================= */

const { useState, useEffect } = window.React;

const fmt = (n) => '₩' + Math.abs(Number(n)).toLocaleString('ko-KR');

const RISK_FLAG_LABELS = {
  night_transaction: '새벽 시간대',
  foreign_ip: '해외 IP',
  amount_spike: '평소 5배 금액',
  location_mismatch: '위치 이상',
  rapid_sequence: '연속 결제',
};

const FRAUD_PRESETS = {
  overseas: {
    merchantName: 'Shopee SG',
    merchantCity: 'Singapore',
    merchantCountry: 'SG',
    amount: -340000,
    transactionTime: '03:24:11',
    channel: 'online',
    category: '해외결제',
    categoryLabel: '해외 온라인',
    riskFlags: ['night_transaction', 'foreign_ip', 'amount_spike'],
    riskScore: 87,
  },
};

const DEMO_SEED_TRANSACTIONS = [
  { id: 'seed-1', date: '2024-06-14', transactionTime: '23:12:00', merchantName: '배달의민족 치킨', amount: -19500, type: 'spend', categoryLabel: '배달', fraudStatus: 'normal' },
  { id: 'seed-2', date: '2024-06-14', transactionTime: '12:31:00', merchantName: '스타벅스 합정점', amount: -5900, type: 'spend', categoryLabel: '카페', fraudStatus: 'normal' },
  { id: 'seed-3', date: '2024-06-13', transactionTime: '19:45:00', merchantName: '이마트 합정', amount: -54000, type: 'spend', categoryLabel: '마트', fraudStatus: 'normal' },
  { id: 'seed-4', date: '2024-06-13', transactionTime: '08:44:00', merchantName: 'GS25 마포대로점', amount: -3200, type: 'spend', categoryLabel: '편의점', fraudStatus: 'normal' },
  { id: 'seed-5', date: '2024-06-12', transactionTime: '09:00:00', merchantName: '교통카드 충전', amount: -50000, type: 'spend', categoryLabel: '교통', fraudStatus: 'normal' },
];

function simulateFraud(preset = 'overseas') {
  const config = FRAUD_PRESETS[preset] || FRAUD_PRESETS.overseas;
  const tx = {
    id: `fraud-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    type: 'spend',
    fraudStatus: 'suspicious',
    userResponse: null,
    ...config,
  };

  const snap = window.getRuntimeSnapshot();
  const base = (snap.raw.transactions || []).length
    ? snap.raw.transactions
    : DEMO_SEED_TRANSACTIONS;

  window.saveRuntimeData({
    ...snap.raw,
    transactions: [tx, ...base],
  });

  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('jaybis-fraud-detected', { detail: tx }));
  }, 600);

  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('jaybis-fraud-analyzed', { detail: tx }));
  }, 2200);

  setTimeout(() => {
    const msgs = window.loadJaybisChatMessages();
    window.saveJaybisChatMessages([...msgs, {
      id: window.createJaybisMessageId(),
      who: 'ai',
      kind: 'text',
      text: `⚠️ **이상거래가 감지됐어요.**\n\n새벽 ${config.transactionTime.slice(0, 5)} **${config.merchantCity}**에서 **${fmt(config.amount)}** 결제가 시도됐어요. (${config.merchantName})\n\n본인 거래가 맞지 않다면 카드를 즉시 정지할 수 있어요.`,
    }]);
  }, 3000);
}

document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+F (Windows/Linux) or Cmd+Shift+F (macOS) — Cmd avoids Chrome DevTools conflict
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyF') {
    e.preventDefault();
    simulateFraud('overseas');
  }
});

// ── FraudAlertOverlay ─────────────────────────────────────────────────────────

function FraudAlertOverlay() {
  const [phase, setPhase] = useState(null); // null | 'analyzing' | 'alert' | 'action' | 'blocked'
  const [tx, setTx] = useState(null);

  useEffect(() => {
    const onDetected = (e) => { setTx(e.detail); setPhase('analyzing'); };
    const onAnalyzed = (e) => { setTx(e.detail); setPhase('alert'); };
    window.addEventListener('jaybis-fraud-detected', onDetected);
    window.addEventListener('jaybis-fraud-analyzed', onAnalyzed);
    return () => {
      window.removeEventListener('jaybis-fraud-detected', onDetected);
      window.removeEventListener('jaybis-fraud-analyzed', onAnalyzed);
    };
  }, []);

  if (!phase) return null;

  const dismiss = () => setPhase(null);

  const handleBlock = () => {
    setPhase('blocked');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('jaybis-navigate', { detail: { tab: 'jaybis' } }));
      setPhase(null);
    }, 1400);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div
        onClick={phase === 'analyzing' ? undefined : dismiss}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }}
      />
      <div style={{ position: 'relative', zIndex: 1, background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '22px 20px 40px', animation: 'pop .28s ease' }}>

        {phase === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--teal-400)', animation: 'pulse 1s infinite', animationDelay: (i * .18) + 's' }} />
              ))}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>거래 분석 중...</div>
            <div style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 5 }}>이상 패턴을 확인하고 있어요</div>
          </div>
        )}

        {phase === 'alert' && tx && (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626', marginBottom: 14 }}>⚠️ 이상거래가 감지됐어요</div>
            <div style={{ background: '#fff8f8', border: '1.5px solid #fecaca', borderRadius: 14, padding: '13px 15px', marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{tx.merchantName}</div>
              <div style={{ fontSize: 12.5, color: 'var(--slate-400)', marginTop: 3 }}>
                {tx.date} {tx.transactionTime?.slice(0, 5)} · {tx.merchantCity}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#dc2626', marginTop: 8 }}>{fmt(tx.amount)}</div>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
              {(tx.riskFlags || []).map(f => (
                <span key={f} style={{ background: '#fff0f0', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
                  {RISK_FLAG_LABELS[f] || f}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={dismiss} style={{ flex: 1, height: 50, borderRadius: 13, border: '1.5px solid var(--line)', background: 'var(--card)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>
                내가 했어요
              </button>
              <button onClick={() => setPhase('action')} style={{ flex: 1, height: 50, borderRadius: 13, border: 'none', background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                아니에요
              </button>
            </div>
          </>
        )}

        {phase === 'action' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink)', marginBottom: 6 }}>지금 바로 카드사에 연락하세요</div>
            <div style={{ fontSize: 14, color: 'var(--slate-500)', lineHeight: 1.65, marginBottom: 22 }}>
              카드사 고객센터에 전화해 이상거래를 신고하고 카드를 정지 요청하세요.<br />빠를수록 추가 피해를 막을 수 있어요.
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <button style={{ height: 52, borderRadius: 13, border: 'none', background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                📞 고객센터 전화 · 1599-3900
              </button>
              <button onClick={handleBlock} style={{ height: 48, borderRadius: 13, border: '1.5px solid var(--teal-400)', background: 'var(--teal-50)', fontSize: 15, fontWeight: 700, color: 'var(--teal-700)', cursor: 'pointer' }}>
                제이비스에게 추가 안내 받기
              </button>
              <button onClick={dismiss} style={{ height: 44, borderRadius: 13, border: 'none', background: 'none', fontSize: 14, color: 'var(--slate-400)', cursor: 'pointer' }}>
                나중에
              </button>
            </div>
          </>
        )}

        {phase === 'blocked' && (
          <div style={{ textAlign: 'center', padding: '18px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--teal-700)' }}>제이비스가 함께할게요</div>
            <div style={{ fontSize: 13.5, color: 'var(--slate-500)', marginTop: 6, lineHeight: 1.6 }}>카드사 연락 후 다음 절차를<br />제이비스가 단계별로 안내할게요</div>
          </div>
        )}

      </div>
    </div>
  );
}

Object.assign(window, { simulateFraud, FraudAlertOverlay });
