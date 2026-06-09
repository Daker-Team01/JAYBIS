/* =========================================================================
   제이비스 (JAYBIS) — 홈
   상단: 대화 패널  ·  하단: AI가 추천하는 기능 카드
   ========================================================================= */

const {
  useState, useEffect, useRef, Logo, Icon, SectionLabel, stagger, MarkdownBubble,
  USER, ASSETS, AI_DIAGNOSIS, STARTER_FEATURE_CHIPS,
  loadJaybisChatMessages, saveJaybisChatMessages, createJaybisMessageId,
  saveAppSettings, getRuntimeSnapshot, saveRuntimeData,
  runJaybisOpenAIConversation, getJaybisOpenAIConfigStatus,
  selectJaybisToolCall, executeJaybisToolCall, getJaybisToolSequence,
  summarizeEasy, speakText, won, manwon, pct,
} = window;

const FEATURE_CATALOG = {
  budget: { id:'budget', title:'첫 월급 예산 설계', desc:'월급을 기준으로 50·30·20을 바로 나눠요', icon:'budget', tone:'#0047bb', action:{ type:'nav', target:'budget' } },
  spend: { id:'spend', title:'소비 진단 시작', desc:'마이데이터 또는 수기 입력으로 지출을 살펴봐요', icon:'chart', tone:'#0d2d77', action:{ type:'prompt', prompt:'마이데이터로 소비 진단해줘' } },
  products: { id:'products', title:'청년 상품 추천', desc:'가입 가능한 상품을 우선순위로 정리해요', icon:'products', tone:'#2f6bdb', action:{ type:'prompt', prompt:'청년 금융상품 추천해줘' } },
  coach: { id:'coach', title:'금융코칭 보기', desc:'왜 이 상품인지 쉽게 이해해요', icon:'sparkF', tone:'#0d2d77', action:{ type:'prompt', prompt:'추천 상품이 왜 좋아?' } },
  profile: { id:'profile', title:'내 설정 확인', desc:'시니어 모드와 음성 안내를 조정해요', icon:'user', tone:'#64748b', action:{ type:'nav', target:'profile' } },
  chat: { id:'chat', title:'AI 상담 이어가기', desc:'대화 흐름을 계속 이어가요', icon:'chat', tone:'#0047bb', action:{ type:'prompt', prompt:'계속 도와줘' } },
};

function Jaybis({ nav, toast, seed, clearSeed }) {
  const [settings] = window.useAppSettings();
  const [msgs, setMsgs] = useState(() => loadJaybisChatMessages([
    { id: 'g1', who: 'ai', kind: 'text', text: `${USER.greeting || USER.name}님, 여기서 바로 이야기해요. 위는 대화, 아래는 지금 필요한 기능 카드예요.` },
  ]));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(getJaybisOpenAIConfigStatus());
  const [chips, setChips] = useState(STARTER_FEATURE_CHIPS);
  const [cards, setCards] = useState(buildFeatureCards(null, null));
  const [pendingAction, setPendingAction] = useState(null);
  const scrollRef = useRef(null);
  const persistedMsgsRef = useRef(JSON.stringify(msgs));
  const composingRef = useRef(false);
  const lastSubmitRef = useRef({ text: '', at: 0 });
  const nid = () => createJaybisMessageId();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  useEffect(() => {
    const serialized = JSON.stringify(msgs);
    if (persistedMsgsRef.current === serialized) return;
    persistedMsgsRef.current = serialized;
    saveJaybisChatMessages(msgs);
  }, [msgs]);

  useEffect(() => {
    const syncMessages = (event) => {
      const next = event?.detail || loadJaybisChatMessages();
      const serialized = JSON.stringify(next);
      if (persistedMsgsRef.current === serialized) return;
      persistedMsgsRef.current = serialized;
      setMsgs(next);
    };
    window.addEventListener('jaybis-chat-changed', syncMessages);
    window.addEventListener('storage', syncMessages);
    return () => {
      window.removeEventListener('jaybis-chat-changed', syncMessages);
      window.removeEventListener('storage', syncMessages);
    };
  }, []);

  useEffect(() => {
    if (!seed) return;
    const t = setTimeout(() => {
      respond(seed);
      clearSeed?.();
    }, 200);
    return () => clearTimeout(t);
  }, [seed]);

  const push = (m) => setMsgs((prev) => [...prev, { id: nid(), ...m }]);

  const emitAi = (text) => {
    const next = summarizeEasy(text, settings);
    push({ who: 'ai', kind: 'text', text: next });
    if (settings.voiceGuide) speakText(next, { rate: settings.ttsSpeed });
  };

  const askToRunAction = (action) => {
    setPendingAction(action);
    emitAi(`${action.confirmText}\n\n진행해도 될까요?`);
    push({
      who: 'ai',
      kind: 'confirm',
      actionId: action.id,
      action,
      prompt: '이 작업을 실행할까요?',
      yesLabel: action.yesLabel || '응',
      noLabel: action.noLabel || '아니오',
    });
  };

  const applyBudgetPlan = (data) => {
    const snapshot = getRuntimeSnapshot();
    const nextBudget = {
      ...(snapshot.raw.budget || {}),
      salary: data.salary,
      buckets: data.buckets.map((bucket, index) => ({
        key: bucket.key,
        label: index === 0 ? '필수' : index === 1 ? '여유' : '저축·투자',
        ratio: bucket.ratio,
        plan: bucket.amount,
        used: snapshot.budget.buckets?.[index]?.used || 0,
        tone: snapshot.budget.buckets?.[index]?.tone || (index === 0 ? '#0d9488' : index === 1 ? '#f59e0b' : '#0ea5e9'),
      })),
      nextMonthTip: `세후 ${won(data.salary)} 기준 예산을 반영했어요. 저축·투자 목표는 ${won(data.buckets[2]?.amount || 0)}입니다.`,
    };
    saveRuntimeData({ ...snapshot.raw, budget: nextBudget });
    toast('예산 설계를 반영했어요');
    return `좋아요. 첫 월급 예산을 실제 예산 화면에 반영했어요. 필수비 ${won(data.buckets[0]?.amount || 0)}, 여유비 ${won(data.buckets[1]?.amount || 0)}, 저축·투자 ${won(data.buckets[2]?.amount || 0)}로 저장했습니다.`;
  };

  const runConfirmedAction = (action) => {
    if (!action) return false;
    if (action.type === 'toggleVoice') {
      saveAppSettings({ voiceGuide: action.value });
      toast(action.value ? '음성 안내를 켰어요' : '음성 안내를 껐어요');
      emitAi(action.value ? '음성 안내를 켰어요. 이제 제이비스 답변을 음성으로도 들을 수 있어요.' : '음성 안내를 껐어요. 이제 제이비스가 답변을 소리로 읽지 않아요.');
      setPendingAction(null);
      return true;
    }
    if (action.type === 'applyBudgetPlan') {
      emitAi(applyBudgetPlan(action.data));
      setCards(buildFeatureCards('budgetPlanResult', action.data, nav));
      setPendingAction(null);
      return true;
    }
    return false;
  };

  const parseActionRequest = (text) => {
    const t = text.replace(/\s/g, '');
    const wantsVoice = /(tts|음성|읽어|소리)/i.test(t);
    if (wantsVoice && /(꺼|끄|off|중지|그만)/i.test(t)) {
      return {
        id: `voice-off-${Date.now()}`,
        type: 'toggleVoice',
        value: false,
        confirmText: '음성 안내를 끄면 제이비스가 답변을 소리로 읽지 않게 됩니다.',
      };
    }
    if (wantsVoice && /(켜|on|시작|활성)/i.test(t)) {
      return {
        id: `voice-on-${Date.now()}`,
        type: 'toggleVoice',
        value: true,
        confirmText: '음성 안내를 켜면 제이비스 답변을 음성으로 읽어드립니다.',
      };
    }
    return null;
  };

  const isConfirmText = (text) => /(응|네|예|그래|좋아|허락|진행|해줘|반영|적용|확인|ㅇㅇ|ok|yes)/i.test(text.replace(/\s/g, ''));
  const isCancelText = (text) => /(아니|취소|멈춰|하지마|보류|no)/i.test(text.replace(/\s/g, ''));

  const emitLocalResponse = (text) => {
    const toolCall = selectJaybisToolCall(text);
    const seq = getJaybisToolSequence(toolCall.name);
    push({ who: 'ai', kind: 'tools', seq, toolCall });
    const result = executeJaybisToolCall(toolCall);
    emitAi(result.data.summary);
    if (result.kind === 'budgetPlanResult') {
      askToRunAction({
        id: `budget-${Date.now()}`,
        type: 'applyBudgetPlan',
        data: result.data,
        confirmText: `방금 만든 첫 월급 예산안을 예산 화면에 바로 반영할 수 있어요. 필수비 ${won(result.data.buckets[0]?.amount || 0)}, 여유비 ${won(result.data.buckets[1]?.amount || 0)}, 저축·투자 ${won(result.data.buckets[2]?.amount || 0)} 기준입니다.`,
      });
    }
    setChips(result.data.nextChips || STARTER_FEATURE_CHIPS);
    setCards(buildFeatureCards(result.kind, result.data, nav));
  };

  async function respond(text) {
    if (busy || !text?.trim()) return;
    const prompt = text.trim();
    const now = Date.now();
    if (lastSubmitRef.current.text === prompt && now - lastSubmitRef.current.at < 450) return;
    lastSubmitRef.current = { text: prompt, at: now };
    const nextMsgs = [...msgs, { id: nid(), who: 'me', kind: 'text', text: prompt }];
    push({ who: 'me', kind: 'text', text: prompt });
    setBusy(true);

    try {
      if (pendingAction) {
        if (isCancelText(prompt)) {
          resolveConfirmMessage(pendingAction.id, 'denied');
          setPendingAction(null);
          emitAi('알겠어요. 실행하지 않고 보류할게요.');
          return;
        }
        if (isConfirmText(prompt)) {
          resolveConfirmMessage(pendingAction.id, 'approved');
          runConfirmedAction(pendingAction);
          return;
        }
        return;
      }

      const requestedAction = parseActionRequest(prompt);
      if (requestedAction) {
        askToRunAction(requestedAction);
        return;
      }

      const remote = await runJaybisOpenAIConversation(nextMsgs, {
        userName: USER?.name,
        age: USER?.age,
        monthlySalary: ASSETS?.cashflow?.income,
        annualIncome: ASSETS?.cashflow?.income ? ASSETS.cashflow.income * 12 : undefined,
        isHomeless: true,
      });
      setStatus(getJaybisOpenAIConfigStatus());

      if (remote.configured) {
        const result = remote.result;
        if (remote.usedTool && remote.toolCall) {
          const seq = getJaybisToolSequence(remote.toolCall.name);
          push({ who: 'ai', kind: 'tools', seq, toolCall: remote.toolCall });
        }

        if (remote.text) emitAi(remote.text);
        if (result?.kind === 'budgetPlanResult') {
          askToRunAction({
            id: `budget-${Date.now()}`,
            type: 'applyBudgetPlan',
            data: result.data,
            confirmText: `방금 만든 첫 월급 예산안을 예산 화면에 바로 반영할 수 있어요. 필수비 ${won(result.data.buckets[0]?.amount || 0)}, 여유비 ${won(result.data.buckets[1]?.amount || 0)}, 저축·투자 ${won(result.data.buckets[2]?.amount || 0)} 기준입니다.`,
          });
        }
        const nextChips = result?.data?.nextChips || STARTER_FEATURE_CHIPS;
        setChips(nextChips);
        setCards(buildFeatureCards(result?.kind || null, result?.data || null, nav, prompt));
        return;
      }

      emitLocalResponse(prompt);
    } catch (error) {
      push({ who: 'ai', kind: 'text', text: `OpenAI 연결에 실패해서 로컬 모드로 이어갈게요. ${error?.message ? `(${error.message})` : ''}`.trim() });
      emitLocalResponse(prompt);
      setStatus('OpenAI 오류');
    } finally {
      setBusy(false);
    }
  }

  const resolveConfirmMessage = (actionId, result) => {
    setMsgs((prev) => prev.map((m) => (
      m.kind === 'confirm' && m.actionId === actionId
        ? { ...m, resolved: result }
        : m
    )));
  };

  const handleConfirmAction = (approved, actionId) => {
    const storedAction = msgs.find((m) => m.kind === 'confirm' && m.actionId === actionId)?.action;
    const action = pendingAction?.id === actionId ? pendingAction : storedAction;
    if (!action) return;
    push({ who: 'me', kind: 'text', text: approved ? '응' : '아니오' });
    resolveConfirmMessage(actionId, approved ? 'approved' : 'denied');
    if (approved) {
      runConfirmedAction(action);
      return;
    }
    setPendingAction(null);
    emitAi('알겠어요. 실행하지 않고 보류할게요.');
  };

  const submitInput = () => {
    const prompt = input.trim();
    if (!prompt) return;
    respond(prompt);
    setInput('');
  };

  const summaryLeft = ASSETS.cashflow.left;

  return (
    <div
      className="screen-anim"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '50px 14px 12px',
      }}
    >
      <div className="between" style={{ padding: '0 2px 10px' }}>
        <div className="row" style={{ gap: 9 }}>
          <Logo size={23} mark />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>{USER.name}님 홈</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>대화는 위에서, 실행은 아래에서</div>
          </div>
        </div>
        <span className="pill pill-teal" style={{ fontSize: 10.5 }}>{status}</span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: '3fr 2fr',
          gap: 12,
        }}
      >
        <section className="card" style={{ minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 14px 12px' }}>
          <div ref={scrollRef} className="scroll" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
            {msgs.map((m) => <Message key={m.id} m={m} onChip={respond} onConfirm={handleConfirmAction} />)}
            {busy && <TypingBubble />}
          </div>

          <div style={{ paddingTop: 10 }}>
            <div className="row" style={{ gap: 8 }}>
              <button style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--teal-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="mic" size={18} color="var(--teal-700)" />
              </button>
              <div className="row" style={{ flex: 1, background: 'var(--bg)', borderRadius: 13, padding: '0 6px 0 12px', border: '1px solid var(--line)' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={() => { composingRef.current = false; }}
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return;
                    if (e.nativeEvent?.isComposing || composingRef.current) return;
                    e.preventDefault();
                    submitInput();
                  }}
                  placeholder="예: 첫 월급으로 예산 짜줘"
                  style={{ flex: 1, height: 40, border: 'none', background: 'none', fontSize: 14, outline: 'none', color: 'var(--ink)' }}
                />
                <button
                  onClick={submitInput}
                  style={{ width: 32, height: 32, borderRadius: 10, background: input.trim() ? 'var(--teal-600)' : 'var(--slate-300)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="send" size={17} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                기능 카드
              </div>
              <div className="muted" style={{ fontSize: 11.5 }}>
                대화에 따라 필요한 기능이 바뀌어요
              </div>
            </div>
            <button onClick={() => toast('기능 카드가 대화 흐름에 맞춰 바뀌어요')} className="pill pill-teal" style={{ fontSize: 10.5 }}>
              AI 추천
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {cards.map((card, i) => (
                <FeatureCard
                  key={card.id}
                  card={card}
                  onAction={() => {
                    if (card.action.type === 'nav') nav(card.action.target);
                    else respond(card.action.prompt);
                  }}
                  delay={i}
                />
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <SectionLabel>자산 한눈에</SectionLabel>
              <div className="card-flat" style={{ padding: '14px 14px 12px', background: 'linear-gradient(160deg,var(--teal-800),var(--teal-700))', color: '#fff' }}>
                <div className="between">
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.72)', fontWeight: 600 }}>이번 달 여유</div>
                    <div className="tnum" style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>{won(summaryLeft)}</div>
                  </div>
                  <span className="pill" style={{ background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 10.5 }}>부채비율 {pct(ASSETS.debtRatio, 1)}</span>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.14)' }}>
                  <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(255,255,255,.84)', fontWeight: 500 }}>
                    {AI_DIAGNOSIS.comment}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildFeatureCards(kind, data, nav, text) {
  const base = [
    FEATURE_CATALOG.budget,
    FEATURE_CATALOG.spend,
    FEATURE_CATALOG.products,
    FEATURE_CATALOG.coach,
  ];

  if (!kind) return base;

  if (kind === 'budgetPlanResult') {
    return [
      { ...FEATURE_CATALOG.budget, desc: '현재 월급 기준으로 바로 조정해요', action:{ type:'nav', target:'budget' } },
      { ...FEATURE_CATALOG.spend, desc: '고정비와 변동비를 같이 볼 수 있어요', action:{ type:'prompt', prompt:'마이데이터로 소비 진단해줘' } },
      { ...FEATURE_CATALOG.products, desc: '월 납입 여력에 맞는 상품을 이어서 봐요', action:{ type:'nav', target:'products' } },
      { ...FEATURE_CATALOG.coach, desc: '왜 이렇게 나눴는지 이해를 붙여요', action:{ type:'prompt', prompt:'이 예산이 왜 이렇게 나뉘어?' } },
    ];
  }

  if (kind === 'spendingDiagnosisResult') {
    return [
      { ...FEATURE_CATALOG.spend, desc: '어디로 새는지 더 자세히 파볼 수 있어요', action:{ type:'prompt', prompt:'고정비 더 줄여줘' } },
      { ...FEATURE_CATALOG.budget, desc: '소비 결과를 예산에 바로 반영해요', action:{ type:'nav', target:'budget' } },
      { ...FEATURE_CATALOG.products, desc: '남는 돈으로 할 수 있는 상품을 골라요', action:{ type:'nav', target:'products' } },
      { ...FEATURE_CATALOG.coach, desc: '소비를 줄인 돈을 어디에 둘지 코칭해요', action:{ type:'prompt', prompt:'남는 돈은 어디에 두면 돼?' } },
    ];
  }

  if (kind === 'productRoadmapResult') {
    return [
      { ...FEATURE_CATALOG.products, desc: '가입 가능 조건과 순서를 확인해요', action:{ type:'nav', target:'products' } },
      { ...FEATURE_CATALOG.coach, desc: '왜 이 상품인지 쉬운 말로 이해해요', action:{ type:'prompt', prompt:'추천 상품이 왜 1순위야?' } },
      { ...FEATURE_CATALOG.budget, desc: '월 납입액이 생활비를 흔드는지 체크해요', action:{ type:'nav', target:'budget' } },
      { ...FEATURE_CATALOG.profile, desc: '내 설정과 알림 방식을 다듬어요', action:{ type:'nav', target:'profile' } },
    ];
  }

  if (kind === 'coachingResult') {
    return [
      { ...FEATURE_CATALOG.coach, desc: '상품 안에서 개념을 계속 따라가요', action:{ type:'prompt', prompt:'다른 개념도 쉽게 설명해줘' } },
      { ...FEATURE_CATALOG.products, desc: '비교해야 할 다른 상품을 봐요', action:{ type:'nav', target:'products' } },
      { ...FEATURE_CATALOG.budget, desc: '가입 후 예산을 같이 맞춰요', action:{ type:'nav', target:'budget' } },
      { ...FEATURE_CATALOG.spend, desc: '납입 가능액을 소비와 연결해요', action:{ type:'prompt', prompt:'수기로 소비 입력할래' } },
    ];
  }

  return base;
}

function Message({ m, onChip, onConfirm }) {
  if (m.who === 'me') return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div className="bubble bubble-me">{m.text}</div>
    </div>
  );
  if (m.kind === 'text') return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <MarkdownBubble text={m.text} />
    </div>
  );
  if (m.kind === 'tools') return <ToolSequence seq={m.seq} />;
  if (m.kind === 'chips') return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 2 }}>
      {m.items.map((q, i) => (
        <button key={i} onClick={() => onChip(q)} className="pill" style={{ background: 'var(--card)', border: '1px solid var(--teal-100)', color: 'var(--teal-700)', fontSize: 12.2, padding: '8px 11px' }}>{q}</button>
      ))}
    </div>
  );
  if (m.kind === 'confirm') return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div className="card" style={{ maxWidth: '86%', padding: '12px 13px', border: '1px solid var(--teal-100)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 9 }}>{m.prompt || '이 작업을 실행할까요?'}</div>
        {m.resolved ? (
          <span className={'pill ' + (m.resolved === 'approved' ? 'pill-pos' : 'pill-warn')} style={{ fontSize: 11.5 }}>
            {m.resolved === 'approved' ? '승인됨' : '취소됨'}
          </span>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <button
              onClick={() => onConfirm(true, m.actionId)}
              className="btn btn-primary"
              style={{ height: 36, flex: 1, fontSize: 13.5, borderRadius: 11, boxShadow: 'none' }}
            >
              {m.yesLabel || '응'}
            </button>
            <button
              onClick={() => onConfirm(false, m.actionId)}
              className="btn btn-line"
              style={{ height: 36, flex: 1, fontSize: 13.5, borderRadius: 11 }}
            >
              {m.noLabel || '아니오'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
  return null;
}

function ToolSequence({ seq }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= seq.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), seq[done].ms);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '92%' }}>
      {seq.map((s, i) => {
        if (i > done) return null;
        const fin = i < done;
        return (
          <div key={i} className="tool-line">
            {fin ? <Icon name="check" size={14} color="var(--teal-600)" stroke={2.6} /> : <span className="dot-pulse" />}
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

function FeatureCard({ card, onAction, delay }) {
  return (
    <button
      onClick={onAction}
      className="card"
      style={{
        textAlign: 'left',
        padding: '14px 13px',
        minHeight: 108,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        animationDelay: `${0.03 + delay * 0.045}s`,
      }}
    >
      <span className="ic-chip" style={{ width: 38, height: 38, borderRadius: 12, background: `${card.tone}15` }}>
        <Icon name={card.icon} size={20} color={card.tone} />
      </span>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 14.2, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.25 }}>{card.title}</div>
        <div className="muted" style={{ fontSize: 11.8, lineHeight: 1.45, marginTop: 4 }}>{card.desc}</div>
      </div>
    </button>
  );
}

const HOME_PROMPTS = [
  '이번 달 어디에 많이 썼어?',
  '가입 가능한 상품 추천해줘',
  '내 자산 진단해줘',
];

const HOME_FEATURES = [
  { ic:'budget', title:'예산 설계', desc:'수입 기준 예산과 지출을 확인해요', go:'budget', tone:'#0047bb' },
  { ic:'products', title:'금융상품', desc:'가입 가능한 상품과 조건을 봐요', go:'products', tone:'#0d2d77' },
  { ic:'piggy', title:'납입 시뮬레이터', desc:'월 납입액별 예상 결과를 계산해요', go:'products', tone:'#2f6bdb' },
  { ic:'chat', title:'AI 금융상담', desc:'대화로 진단과 코칭을 이어가요', go:'chat', tone:'#0047bb' },
  { ic:'shield', title:'보이스피싱 보호', desc:'보호 설정과 감시 상태를 확인해요', go:'profile', tone:'#0d2d77' },
  { ic:'eye', title:'접근성 설정', desc:'시니어 모드와 음성 안내를 조정해요', go:'profile', tone:'#64748b' },
];

function Home({ nav, toast }) {
  const [hide, setHide] = useState(false);
  const a = ASSETS;
  const mask = (s) => hide ? '••••••' : s;
  const savingsNote = a.cashflow.income
    ? `이번 달 여유 자금은 ${manwon(a.cashflow.left)}원이에요`
    : '실제 자산 데이터가 연결되면 진단 결과를 보여드려요';

  return (
    <div className="scroll screen-anim">
      <div
        style={{
          position:'relative',
          paddingTop:58,
          paddingBottom:64,
          background:'linear-gradient(165deg, var(--teal-800) 0%, var(--teal-700) 75%, var(--teal-600) 130%)',
          color:'#fff',
          borderRadius:'0 0 26px 26px',
          overflow:'hidden'
        }}
      >
        <div style={{ position:'absolute', top:-50, right:-40, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,.12), transparent 65%)' }} />

        <div className="between" style={{ position:'relative', zIndex:1, padding:'0 22px' }}>
          <div className="row" style={{ gap:10 }}>
            <Logo size={24} mark />
            <div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,.72)', fontWeight:600 }}>
                안녕하세요, {USER.name}님
              </div>
              <div style={{ fontSize:13.5, fontWeight:700 }}>
                오늘 필요한 금융 정보를 확인해보세요
              </div>
            </div>
          </div>

          <button
            onClick={() => toast('알림을 확인했어요')}
            style={{ width:40, height:40, borderRadius:13, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}
          >
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
        <div style={{ ...stagger(0) }}>
          <button
            onClick={() => nav('chat')}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:12, background:'var(--card)', borderRadius:18, padding:'15px 16px', textAlign:'left', boxShadow:'0 12px 34px rgba(13,45,119,.16), 0 2px 8px rgba(13,45,119,.08)', border:'1px solid var(--line)' }}
          >
            <span style={{ width:38, height:38, borderRadius:12, flex:'0 0 auto', background:'linear-gradient(150deg, var(--teal-500), var(--teal-800))', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,71,187,.32)' }}>
              <Icon name="sparkF" size={20} color="#fff" />
            </span>
            <span style={{ flex:1, fontSize:15, color:'var(--slate-500)', fontWeight:500 }}>
              제이비스에게 무엇이든 물어보세요
            </span>
            <span style={{ width:36, height:36, borderRadius:11, background:'var(--teal-50)', display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' }}>
              <Icon name="mic" size={19} color="var(--teal-700)" />
            </span>
          </button>

          <div style={{ display:'flex', gap:8, marginTop:11, flexWrap:'wrap' }}>
            {HOME_PROMPTS.map((q, i) => (
              <button key={i} onClick={() => nav('chat', q)} className="pill" style={{ background:'var(--card)', border:'1px solid var(--teal-100)', color:'var(--teal-700)', fontSize:12.5, padding:'9px 13px', boxShadow:'var(--shadow-sm)' }}>
                <Icon name="spark" size={13} color="var(--teal-600)" /> {q}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop:24, ...stagger(1) }}>
          <SectionLabel action="진단 상세" onAction={() => toast('자산진단 리포트')}>
            내 자산 한눈에
          </SectionLabel>

          <div className="card" style={{ background:'linear-gradient(160deg, var(--teal-800), var(--teal-700))', color:'#fff', boxShadow:'var(--shadow-md)' }}>
            <div className="between">
              <div className="row" style={{ gap:7 }}>
                <span style={{ fontSize:13, color:'rgba(255,255,255,.78)', fontWeight:600 }}>순자산</span>
                <button onClick={() => setHide(h => !h)}>
                  <Icon name="eye" size={15} color="rgba(255,255,255,.7)" />
                </button>
              </div>
              <span className="pill" style={{ background:'rgba(255,255,255,.16)', color:'#fff', fontSize:11 }}>
                <Icon name="sparkF" size={12} color="#fff" /> {AI_DIAGNOSIS.grade}
              </span>
            </div>

            <b className="tnum" style={{ fontSize:33, fontWeight:800, letterSpacing:'-.8px', display:'block', marginTop:6 }}>
              {mask(won(a.netWorth))}
            </b>

            <div className="row" style={{ gap:10, marginTop:16 }}>
              <MiniStat label="총자산" value={mask(manwon(a.totalAssets) + '원')} />
              <MiniStat label="총부채" value={mask(manwon(a.totalDebt) + '원')} />
              <MiniStat label="이번 달 여유" value={mask(manwon(a.cashflow.left) + '원')} accent />
            </div>

            <div className="row" style={{ gap:18, marginTop:18, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.16)' }}>
              <MiniGauge value={a.debtRatio} label="부채비율" txt={pct(a.debtRatio, 1)} />
              <MiniGauge value={a.retireReady} label="은퇴준비율" txt={pct(a.retireReady)} warn />
              <div style={{ flex:1, alignSelf:'center' }}>
                <p style={{ fontSize:11.5, lineHeight:1.5, color:'rgba(255,255,255,.82)' }}>
                  {savingsNote}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop:24, ...stagger(2) }}>
          <SectionLabel>전체 서비스</SectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
            {HOME_FEATURES.map((f, i) => (
              <button key={i} onClick={() => nav(f.go)} className="card" style={{ textAlign:'left', padding:'16px 15px' }}>
                <span className="ic-chip" style={{ width:42, height:42, borderRadius:13, background:f.tone + '15' }}>
                  <Icon name={f.ic} size={22} color={f.tone} />
                </span>
                <div style={{ fontSize:14.5, fontWeight:800, color:'var(--ink)', marginTop:12, letterSpacing:'-.2px' }}>
                  {f.title}
                </div>
                <div className="muted" style={{ fontSize:12, marginTop:3 }}>
                  {f.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop:24, ...stagger(3) }}>
          <SectionLabel>제이비스 추천 액션</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <ActionCard tone="#0047bb" icon="piggy" title="상품 추천 확인하기" body="가입 가능한 상품과 우선순위를 확인해요" onClick={() => nav('products')} />
            <ActionCard tone="#d97706" icon="warn" title="예산 초과 항목 확인" body="실제 지출 데이터 기준으로 조정해요" onClick={() => nav('budget')} />
            <ActionCard tone="#0d2d77" icon="chat" title="대화로 이어가기" body="궁금한 내용을 제이비스에게 물어보세요" onClick={() => nav('chat', '내 상황에 맞는 다음 행동 알려줘')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div style={{ flex:1, background:'rgba(255,255,255,.1)', borderRadius:13, padding:'10px 12px' }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:600 }}>{label}</div>
      <div className="tnum" style={{ fontSize:14, fontWeight:800, marginTop:3, color: accent ? 'var(--teal-300)' : '#fff' }}>{value}</div>
    </div>
  );
}

function MiniGauge({ value, label, txt, warn }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div style={{ textAlign:'center' }}>
      <span style={{ position:'relative', display:'inline-flex' }}>
        <svg width="54" height="54" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="5" />
          <circle cx="27" cy="27" r={r} fill="none" stroke={warn ? '#fbbf24' : '#fff'} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition:'stroke-dashoffset 1s ease' }} />
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
      <span className="ic-chip" style={{ background:tone + '16' }}>
        <Icon name={icon} size={21} color={tone} />
      </span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink)' }}>{title}</div>
        <div className="muted" style={{ fontSize:12.5, marginTop:2 }}>{body}</div>
      </div>
      <Icon name="chevR" size={18} color="var(--slate-400)" />
    </button>
  );
}

Object.assign(window, { Home, Jaybis });
