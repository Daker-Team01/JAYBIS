/* Keep single Chat implementation below (removed duplicate header block) */
/* =========================================================================
   제이비스 (JAYBIS) — AI 에이전트 채팅
   도구 호출(Tool Use) 시퀀스를 시각화하는 대화형 진단
   ========================================================================= */

const {
  useState, useEffect, useRef, useAppSettings, summarizeEasy, speakText,
  StatusBar, Icon, Bar, Donut,
  CHAT_QUICK, CHAT_TOOLSEQ, FRAUD_TOOLSEQ, PENSION_TOOLSEQ, GUIDE_TOOLSEQ,
  AI_DIAGNOSIS, ASSETS, CASHFLOW_INSIGHT, FRAUD_INSIGHT, PENSION_PLAN,
  PRODUCTS, won, manwon, pct,
} = window;

function Chat({ onClose, seed }) {
  const [settings] = useAppSettings();
  const [msgs, setMsgs] = useState([
    { id: 'g1', who: 'ai', kind: 'text', text: '안녕하세요 도윤님, 금융비서 제이비스예요. 자산·소비·상품 무엇이든 물어보세요. 거래내역을 직접 분석해 답해드릴게요.' },
  ]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const idRef = useRef(2);
  const nid = () => 'm' + (idRef.current++);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  const push = (m) => setMsgs((prev) => [...prev, { id: nid(), ...m }]);

  function classify(text) {
    const t = text.replace(/\s/g, '');
    if (/(많이썼|소비|어디에|지출|돈)/.test(t)) return 'spend';
    if (/(상품|추천|도약|적금|청약)/.test(t)) return 'product';
    if (/(자산|진단|순자산|부채)/.test(t)) return 'asset';
    if (/(구독|넷플|OTT|정리)/.test(t)) return 'subs';
    if (/(보이스피싱|사기|이체|수상|이상거래|차단)/.test(t)) return 'fraud';
    if (/(연금|노후|생활비|은퇴)/.test(t)) return 'pension';
    if (/(쉬운설명|단계별|어떻게해|처음|안내)/.test(t)) return 'guide';
    return 'default';
  }

  const emitAi = (text) => {
    const next = summarizeEasy(text, settings);
    push({ who: 'ai', kind: 'text', text: next });
    if (settings.voiceGuide) speakText(next, { rate: settings.ttsSpeed });
  };

  function respond(text) {
    if (busy) return;
    push({ who: 'me', kind: 'text', text });
    setBusy(true);
    const kind = classify(text);
    const seqMap = {
      spend: CHAT_TOOLSEQ,
      asset: CHAT_TOOLSEQ,
      product: CHAT_TOOLSEQ,
      subs: CHAT_TOOLSEQ,
      fraud: FRAUD_TOOLSEQ,
      pension: PENSION_TOOLSEQ,
      guide: GUIDE_TOOLSEQ,
    };
    const seq = seqMap[kind] || CHAT_TOOLSEQ;
    push({ who: 'ai', kind: 'tools', seq });
    const total = seq.reduce((s, t) => s + t.ms, 0) + 500;

    const map = {
      product: () => {
        emitAi('도윤님 조건이면 청년도약계좌가 1순위예요. 저축 여력이 높아서 비과세 혜택을 가장 크게 받을 수 있어요.');
        push({ who: 'ai', kind: 'productResult' });
        push({ who: 'ai', kind: 'chips', items: ['청년도약계좌가 왜 1순위야?', '월 얼마씩 넣어야 해?'] });
      },
      asset: () => {
        emitAi(`${AI_DIAGNOSIS.comment} 지금 순자산은 ${won(ASSETS.netWorth)}이고, 부채비율은 ${pct(ASSETS.debtRatio, 1)}예요.`);
        push({ who: 'ai', kind: 'assetResult' });
        push({ who: 'ai', kind: 'chips', items: ['비상금 늘리는 방법은?', '연금 준비도 같이 봐줘'] });
      },
      subs: () => {
        emitAi(`정기결제에서 ${CASHFLOW_INSIGHT.recurringCount}건의 고정 지출을 찾았어요. 구독과 외식·배달을 줄이면 월 ${won(CASHFLOW_INSIGHT.savingsPotential)} 정도를 아낄 수 있어요.`);
        push({ who: 'ai', kind: 'cashflowResult' });
        push({ who: 'ai', kind: 'chips', items: ['해지 방법 알려줘', '다른 절약 포인트는?'] });
      },
      spend: () => {
        emitAi(`이번 달 한 달 돈 흐름을 분석했어요. 고정비는 ${won(CASHFLOW_INSIGHT.fixed)}이고, 변동비는 ${won(CASHFLOW_INSIGHT.variable)}예요. ${CASHFLOW_INSIGHT.risk === '주의' ? '지출을 조금만 줄이면 더 편해져요.' : '지금은 흐름이 안정적이에요.'}`);
        push({ who: 'ai', kind: 'cashflowResult' });
        push({ who: 'ai', kind: 'chips', items: ['고정비 더 줄여줘', '가장 많이 쓴 항목이 뭐야?'] });
      },
      fraud: () => {
        emitAi(`위험 점수 ${FRAUD_INSIGHT.riskScore}점으로 ${FRAUD_INSIGHT.riskLabel} 수준이에요. 지금은 이체를 멈추고 수취인과 금액을 다시 확인하세요.`);
        push({ who: 'ai', kind: 'fraudResult' });
        push({ who: 'ai', kind: 'chips', items: ['차단해야 해?', '보호자에게 어떻게 알려?'] });
      },
      pension: () => {
        emitAi(`현재 예상 월 수령액은 ${won(PENSION_PLAN.currentMonthlyPension)}이고, 목표 생활비 ${won(PENSION_PLAN.targetLivingCost)}까지는 월 ${won(PENSION_PLAN.monthlyGap)}가 부족해요.`);
        push({ who: 'ai', kind: 'pensionResult' });
        push({ who: 'ai', kind: 'chips', items: ['지금부터 뭘 하면 돼?', '연금 준비를 쉽게 설명해줘'] });
      },
      guide: () => {
        emitAi('처음 하시는 분 기준으로 4단계로 안내드릴게요. 필요한 정보만 먼저 보고, 다음 행동을 차근차근 고르면 됩니다.');
        push({ who: 'ai', kind: 'guideResult' });
        push({ who: 'ai', kind: 'chips', items: ['음성으로 다시 읽어줘', '아주 쉽게 한 번 더'] });
      },
      default: () => {
        emitAi('좋은 질문이에요. 거래내역과 자산 데이터를 기준으로 도와드릴게요. 아래에서 골라보셔도 좋아요.');
        push({ who: 'ai', kind: 'chips', items: CHAT_QUICK });
      },
    };

    setTimeout(() => {
      map[kind]();
      setBusy(false);
    }, total);
  }

  useEffect(() => {
    if (seed) {
      const t = setTimeout(() => respond(seed), 380);
      return () => clearTimeout(t);
    }
  }, [seed]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: 'var(--bg)', animation: 'screenIn .3s ease' }}>
      <StatusBar dark={false} />

      <div style={{ paddingTop: 47, background: 'linear-gradient(160deg,var(--teal-700),var(--teal-600))', color: '#fff', flexShrink: 0 }}>
        <div className="between" style={{ height: 54, padding: '0 14px' }}>
          <div className="row" style={{ gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkF" size={20} color="#fff" />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>제이비스</div>
              <div className="row" style={{ gap: 5, fontSize: 11.5, color: 'rgba(255,255,255,.8)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal-300)' }} /> 온라인 · 마이데이터 연결됨
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevD" size={22} color="#fff" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="scroll" style={{ padding: '18px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m) => <Message key={m.id} m={m} onChip={respond} />)}
        {busy && <TypingBubble />}
        <div style={{ height: 4 }} />
      </div>

      {msgs.length <= 1 && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {CHAT_QUICK.map((q, i) => (
            <button key={i} onClick={() => respond(q)} className="pill" style={{ background: 'var(--card)', border: '1px solid var(--teal-100)', color: 'var(--teal-700)', fontSize: 12.5, padding: '9px 13px' }}>{q}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '10px 14px 26px', background: 'var(--card)', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
        <div className="row" style={{ gap: 9 }}>
          <button style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--teal-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <Icon name="mic" size={20} color="var(--teal-600)" />
          </button>
          <div className="row" style={{ flex: 1, background: 'var(--bg)', borderRadius: 14, padding: '0 6px 0 15px', border: '1px solid var(--line)' }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { respond(input.trim()); setInput(''); } }}
              placeholder="제이비스에게 물어보기" style={{ flex: 1, height: 42, border: 'none', background: 'none', fontSize: 14.5, outline: 'none', color: 'var(--ink)' }} />
            <button onClick={() => { if (input.trim()) { respond(input.trim()); setInput(''); } }}
              style={{ width: 34, height: 34, borderRadius: 10, background: input.trim() ? 'var(--teal-600)' : 'var(--slate-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}>
              <Icon name="send" size={18} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ m, onChip }) {
  if (m.who === 'me') return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div className="bubble bubble-me">{m.text}</div>
    </div>
  );
  if (m.kind === 'text') return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div className="bubble bubble-ai">{m.text}</div></div>
  );
  if (m.kind === 'tools') return <ToolSequence seq={m.seq} />;
  if (m.kind === 'chips') return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 2 }}>
      {m.items.map((q, i) => (
        <button key={i} onClick={() => onChip(q)} className="pill" style={{ background: 'var(--card)', border: '1px solid var(--teal-100)', color: 'var(--teal-700)', fontSize: 12.5, padding: '9px 13px' }}>{q}</button>
      ))}
    </div>
  );
  if (m.kind === 'spendResult') return <SpendResultCard />;
  if (m.kind === 'productResult') return <ChatProductCard />;
  if (m.kind === 'assetResult') return <ChatAssetCard />;
  return null;
}

function ToolSequence({ seq }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= seq.length) return;
    const t = setTimeout(() => setDone(d => d + 1), seq[done].ms);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '82%' }}>
      {seq.map((s, i) => {
        if (i > done) return null;
        const fin = i < done;
        return (
          <div key={i} className="tool-line" style={{ opacity: i === done && !fin ? 1 : 1 }}>
            {fin ? <Icon name="check" size={14} color="var(--teal-600)" stroke={2.6} />
                 : <span className="dot-pulse" />}
            <span style={{ fontWeight: 700, color: 'var(--teal-800)' }}>{s.tool}</span>
            <span style={{ color: 'var(--slate-500)' }}>· {s.detail}</span>
          </div>
        );
      })}
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div className="bubble bubble-ai" style={{ display: 'flex', gap: 5, padding: '14px 16px' }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--slate-300)', animation: 'pulse 1s infinite', animationDelay: (i * .15) + 's' }} />)}
      </div>
    </div>
  );
}

function SpendResultCard() {
  return (
    <div className="card" style={{ maxWidth: '90%', animation: 'pop .3s ease', boxShadow: 'var(--shadow-md)' }}>
      <div className="between" style={{ marginBottom: 11 }}>
        <b style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>이번 달 소비 진단</b>
        <span className="pill pill-warn" style={{ fontSize: 10.5 }}>주의 1건</span>
      </div>
      {[
        { l: '외식·배달', v: 290000, peer: 210000, warn: true },
        { l: '쇼핑', v: 268000, peer: 240000 },
        { l: '구독·OTT', v: 48000, peer: 22000, warn: true },
      ].map((x, i) => {
        const max = Math.max(x.v, x.peer) * 1.1;
        return (
          <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div className="between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{x.l}</span>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 800, color: x.warn ? 'var(--neg)' : 'var(--ink)' }}>{won(x.v)}</span>
            </div>
            <Bar value={x.v / max * 100} color={x.warn ? 'var(--warn)' : 'var(--teal-600)'} height={6} />
          </div>
        );
      })}
      <div style={{ marginTop: 12, padding: '11px 13px', background: 'var(--teal-50)', borderRadius: 11 }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--teal-800)', fontWeight: 500 }}>
          외식·배달이 또래보다 <b>38% 많아요</b>. 주 2회로 줄이고 OTT를 1개로 정리하면 <b>월 98,500원</b>을 아낄 수 있어요.
        </p>
      </div>
    </div>
  );
}

function ChatProductCard() {
  const p = PRODUCTS[0];
  return (
    <div className="card" style={{ maxWidth: '90%', animation: 'pop .3s ease', boxShadow: 'var(--shadow-md)' }}>
      <div className="between">
        <div>
          <div className="row" style={{ gap: 6 }}>
            <b style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{p.name}</b>
            <span className="pill pill-pos" style={{ fontSize: 10 }}>1순위</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{p.tagline}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10.5, color: 'var(--slate-400)', fontWeight: 600 }}>금리</div>
          <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: p.tone }}>{p.rate}</div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 13, padding: '12px 0 0', borderTop: '1px solid var(--line)' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div className="muted" style={{ fontSize: 11 }}>월 70만원 × 5년</div>
          <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: 'var(--teal-600)', marginTop: 3 }}>약 5,055만원</div>
        </div>
      </div>
    </div>
  );
}

function ChatAssetCard() {
  return (
    <div className="card" style={{ maxWidth: '90%', animation: 'pop .3s ease', boxShadow: 'var(--shadow-md)' }}>
      <div className="row" style={{ gap: 14, justifyContent: 'space-around' }}>
        <div style={{ textAlign: 'center' }}>
          <Donut value={ASSETS.debtRatio} size={70} stroke={8} label={pct(ASSETS.debtRatio, 0)} color="var(--teal-600)" />
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate-600)', marginTop: 7 }}>부채비율</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Donut value={ASSETS.retireReady} size={70} stroke={8} label={pct(ASSETS.retireReady, 0)} color="#f59e0b" />
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate-600)', marginTop: 7 }}>은퇴준비율</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginTop: 18 }}>{manwon(ASSETS.netWorth)}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate-600)', marginTop: 7 }}>순자산</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Chat });
