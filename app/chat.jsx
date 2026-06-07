/* Keep single Chat implementation below (removed duplicate header block) */
/* =========================================================================
   제이비스 (JAYBIS) — AI 에이전트 채팅
   도구 호출(Tool Use) 시퀀스를 시각화하는 대화형 진단
   ========================================================================= */

const {
  useState, useEffect, useRef, useAppSettings, summarizeEasy, speakText,
  StatusBar, Icon, Bar, Donut,
  STARTER_FEATURE_CHIPS, selectJaybisToolCall, executeJaybisToolCall, getJaybisToolSequence,
  runJaybisOpenAIConversation, getJaybisOpenAIConfigStatus,
  AI_DIAGNOSIS, ASSETS, CASHFLOW_INSIGHT, FRAUD_INSIGHT, PENSION_PLAN,
  PRODUCTS, USER, BUDGET, won, manwon, pct,
} = window;

function Chat({ onClose, seed }) {
  const [settings] = useAppSettings();
  const [msgs, setMsgs] = useState([
    { id: 'g1', who: 'ai', kind: 'text', text: '안녕하세요 도윤님, 금융비서 제이비스예요. 첫 월급 예산, 소비 진단, 청년 금융상품 추천, 추천 과정 속 금융코칭 중 필요한 기능을 대화로 골라드릴게요.' },
  ]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(getJaybisOpenAIConfigStatus());
  const scrollRef = useRef(null);
  const idRef = useRef(2);
  const nid = () => 'm' + (idRef.current++);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  const push = (m) => setMsgs((prev) => [...prev, { id: nid(), ...m }]);

  const emitAi = (text) => {
    const next = summarizeEasy(text, settings);
    push({ who: 'ai', kind: 'text', text: next });
    if (settings.voiceGuide) speakText(next, { rate: settings.ttsSpeed });
  };

  const emitLocalResponse = (text) => {
    const toolCall = selectJaybisToolCall(text);
    const seq = getJaybisToolSequence(toolCall.name);
    push({ who: 'ai', kind: 'tools', seq, toolCall });
    const result = executeJaybisToolCall(toolCall);
    emitAi(result.data.summary);
    if (result.kind !== 'featureMenuResult') {
      push({ who: 'ai', kind: result.kind, data: result.data });
    }
    push({ who: 'ai', kind: 'chips', items: result.data.nextChips || STARTER_FEATURE_CHIPS });
  };

  async function respond(text) {
    if (busy) return;
    const nextMsgs = [...msgs, { id: nid(), who: 'me', kind: 'text', text }];
    push({ who: 'me', kind: 'text', text });
    setBusy(true);
    try {
      const remote = await runJaybisOpenAIConversation(nextMsgs, {
        userName: USER?.name,
        age: USER?.age,
        monthlySalary: BUDGET?.salary,
        annualIncome: BUDGET?.salary ? BUDGET.salary * 12 : undefined,
        isHomeless: true,
      });
      setStatus(getJaybisOpenAIConfigStatus());

      if (remote.configured) {
        if (remote.usedTool && remote.toolCall) {
          const seq = getJaybisToolSequence(remote.toolCall.name);
          push({ who: 'ai', kind: 'tools', seq, toolCall: remote.toolCall });
          if (remote.result) {
            push({ who: 'ai', kind: remote.result.kind, data: remote.result.data });
          }
        }

        if (remote.text) emitAi(remote.text);

        const chips = remote.result?.data?.nextChips || STARTER_FEATURE_CHIPS;
        push({ who: 'ai', kind: 'chips', items: chips });
        return;
      }
      emitLocalResponse(text);
    } catch (error) {
      push({ who: 'ai', kind: 'text', text: `OpenAI 연결에 실패해서 로컬 모드로 이어갈게요. ${error?.message ? `(${error.message})` : ''}`.trim() });
      emitLocalResponse(text);
    } finally {
      setBusy(false);
    }
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
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal-300)' }} /> {status}
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
          {STARTER_FEATURE_CHIPS.map((q, i) => (
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
  if (m.kind === 'budgetPlanResult') return <BudgetPlanCard data={m.data} />;
  if (m.kind === 'spendingDiagnosisResult') return <SpendingDiagnosisCard data={m.data} />;
  if (m.kind === 'productRoadmapResult') return <ProductRoadmapCard data={m.data} />;
  if (m.kind === 'coachingResult') return <CoachingCard data={m.data} />;
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

function BudgetPlanCard({ data }) {
  return (
    <div className="card" style={{ maxWidth: '90%', animation: 'pop .3s ease', boxShadow: 'var(--shadow-md)' }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <div>
          <b style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>첫 월급 예산 설계</b>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>세후 {won(data.salary)} 기준</div>
        </div>
        <span className="pill pill-teal" style={{ fontSize: 10.5 }}>50·30·20</span>
      </div>
      <div style={{ display: 'flex', height: 12, borderRadius: 8, overflow: 'hidden', gap: 3, marginBottom: 11 }}>
        {data.buckets.map((b, i) => (
          <div key={b.key} style={{ flex: b.ratio, background: i === 0 ? 'var(--teal-600)' : i === 1 ? 'var(--warn)' : '#0ea5e9' }} />
        ))}
      </div>
      {data.buckets.map((b, i) => (
        <div key={b.key} className="between" style={{ padding: '9px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{b.label} {b.ratio}%</span>
          <span className="tnum" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{won(b.amount)}</span>
        </div>
      ))}
      <div style={{ marginTop: 10, padding: '11px 13px', background: 'var(--teal-50)', borderRadius: 11 }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--teal-800)', fontWeight: 500 }}>
          비상금은 먼저 월 {won(data.emergencyMonthly)}씩 자동이체로 쌓아두면 좋아요. 고정비 압박은 월급의 {pct(data.fixedPressure, 1)} 수준이에요.
        </p>
      </div>
    </div>
  );
}

function SpendingDiagnosisCard({ data }) {
  return (
    <div className="card" style={{ maxWidth: '90%', animation: 'pop .3s ease', boxShadow: 'var(--shadow-md)' }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <div>
          <b style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>소비 진단</b>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{data.source === 'manual' ? '수기 입력' : '마이데이터'} 분석</div>
        </div>
        <span className={'pill ' + (data.warning === '안정' ? 'pill-pos' : 'pill-warn')} style={{ fontSize: 10.5 }}>{data.warning}</span>
      </div>
      {[
        { l: '수입', v: data.income, tone: 'var(--pos)' },
        { l: '지출', v: data.spend, tone: 'var(--neg)' },
        { l: '남은 돈', v: data.left, tone: 'var(--teal-600)' },
        { l: '절약 가능액', v: data.savingsPotential, tone: 'var(--warn)' },
      ].map((x, i) => (
        <div key={x.l} className="between" style={{ padding: '7px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
          <span className="muted" style={{ fontSize: 13 }}>{x.l}</span>
          <span className="tnum" style={{ fontSize: 14, fontWeight: 800, color: x.tone }}>{won(x.v)}</span>
        </div>
      ))}
      <div style={{ marginTop: 10 }}>
        {data.topCategories.slice(0, 3).map((c) => {
          const max = Math.max(...data.topCategories.map((x) => x.value));
          return (
            <div key={c.label} style={{ marginTop: 9 }}>
              <div className="between" style={{ marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{c.label}</span>
                <span className="tnum muted" style={{ fontSize: 12 }}>{won(c.value)}</span>
              </div>
              <Bar value={c.value / max * 100} color="var(--teal-600)" height={6} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductRoadmapCard({ data }) {
  return (
    <div className="card" style={{ maxWidth: '90%', animation: 'pop .3s ease', boxShadow: 'var(--shadow-md)' }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <div>
          <b style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>청년 금융상품 로드맵</b>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>가입 가능 조건 필터링</div>
        </div>
        <span className="pill pill-pos" style={{ fontSize: 10.5 }}>실행 연결</span>
      </div>
      {data.products.slice(0, 3).map((p, i) => (
        <div key={p.id} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
          <div className="between">
            <div className="row" style={{ gap: 8 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: p.eligible ? p.tone : 'var(--slate-300)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{i + 1}</span>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>{p.name}</span>
            </div>
            <span className={'pill ' + (p.eligible ? 'pill-pos' : 'pill-neg')} style={{ fontSize: 10 }}>{p.eligible ? '가능' : '확인'}</span>
          </div>
          <p className="muted" style={{ fontSize: 12.3, lineHeight: 1.45, marginTop: 6 }}>{p.eligible ? p.why : p.reasons.join(', ')}</p>
        </div>
      ))}
      <div style={{ marginTop: 10, padding: '11px 13px', background: 'var(--teal-50)', borderRadius: 11 }}>
        <div className="between">
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--teal-800)' }}>월 납입 {won(data.monthly)}</span>
          <span className="tnum" style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal-700)' }}>{won(data.simulation.total)}</span>
        </div>
      </div>
    </div>
  );
}

function CoachingCard({ data }) {
  return (
    <div className="card" style={{ maxWidth: '90%', animation: 'pop .3s ease', boxShadow: 'var(--shadow-md)' }}>
      <div className="row" style={{ gap: 9, marginBottom: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--teal-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="sparkF" size={17} color="var(--teal-700)" />
        </span>
        <div>
          <b style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{data.title}</b>
          <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{data.product.name} 코칭</div>
        </div>
      </div>
      <p style={{ fontSize: 13.2, lineHeight: 1.62, color: 'var(--slate-700)', fontWeight: 500 }}>{data.explanation}</p>
      <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--teal-50)', borderRadius: 11, color: 'var(--teal-800)', fontSize: 12.5, lineHeight: 1.5, fontWeight: 600 }}>
        결론: 왜 이 상품인지 이해한 뒤, 월 납입 가능액과 중도해지 조건을 같이 확인하면 됩니다.
      </div>
    </div>
  );
}

Object.assign(window, { Chat });
