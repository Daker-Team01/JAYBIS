/* =========================================================================
   제이비스 (JAYBIS) — 홈
   상단: 대화 패널  ·  하단: AI가 추천하는 기능 카드
   ========================================================================= */

const {
  useState, useEffect, useRef, Logo, Icon, SectionLabel, stagger, MarkdownBubble,
  USER, ASSETS, AI_DIAGNOSIS, STARTER_FEATURE_CHIPS,
  loadJaybisChatMessages, saveJaybisChatMessages, createJaybisMessageId,
  saveAppSettings, getRuntimeSnapshot, saveRuntimeData,
  applyBudgetInsight,
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
  const SCROLL_KEY = 'jaybis.chatScrollTop';
  const [settings] = window.useAppSettings();
  const [msgs, setMsgs] = useState(() => loadJaybisChatMessages([
    { id: 'g1', who: 'ai', kind: 'text', text: `${USER.greeting || USER.name}님, 여기서 바로 이야기해요. 필요한 금융 기능을 대화로 바로 도와드릴게요.` },
  ]));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(getJaybisOpenAIConfigStatus());
  const [chips, setChips] = useState(STARTER_FEATURE_CHIPS);
  const [cards, setCards] = useState(buildFeatureCards(null, null));
  const [pendingAction, setPendingAction] = useState(null);
  const scrollRef = useRef(null);
  const lastAiMessageIdRef = useRef(null);
  const shouldAutoScrollRef = useRef(false);
  const persistedMsgsRef = useRef(JSON.stringify(msgs));
  const composingRef = useRef(false);
  const lastSubmitRef = useRef({ text: '', at: 0 });
  const nid = () => createJaybisMessageId();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saved = Number(window.sessionStorage?.getItem(SCROLL_KEY) || 0);
    requestAnimationFrame(() => {
      el.scrollTop = saved;
    });
  }, []);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const lastAi = [...msgs].reverse().find((m) => m.who === 'ai');
    if (lastAi && lastAi.id !== lastAiMessageIdRef.current) {
      lastAiMessageIdRef.current = lastAi.id;
      requestAnimationFrame(() => {
        const node = el.querySelector(`[data-message-id="${lastAi.id}"]`);
        if (node) node.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
      return;
    }
    if (busy) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  const rememberScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    try {
      window.sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop));
    } catch (err) {}
  };

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

  const buildBudgetRecommendations = (data) => {
    const need = data.buckets?.[0]?.amount || 0;
    const want = data.buckets?.[1]?.amount || 0;
    const save = data.buckets?.[2]?.amount || 0;
    const details = data.expenseDetails || {};
    const housing = Number(details.housing) || 0;
    const telecomTransport = Number(details.telecomTransport) || 0;
    const foodLiving = Number(details.foodLiving) || 0;
    const wantLimit = Number(details.wantLimit) || 0;
    const savingTargetAmount = Number(details.savingTargetAmount) || 0;
    const fixedNeed = housing + telecomTransport + foodLiving;
    const remainingNeed = Math.max(0, need - fixedNeed);
    const remainingWant = Math.max(0, want - wantLimit);
    const remainingSave = Math.max(0, save - savingTargetAmount);
    return [
      { label: '주거·관리비', bucket: 'need', plan: housing || Math.round(need * 0.42), icon: 'home' },
      { label: '통신·교통', bucket: 'need', plan: telecomTransport || Math.round(need * 0.18), icon: 'bus' },
      { label: '식비·생활', bucket: 'need', plan: foodLiving || Math.round(need * 0.28), icon: 'cart' },
      { label: '기타 필수비', bucket: 'need', plan: remainingNeed ? Math.round(remainingNeed) : 0, icon: 'bag' },
      { label: '외식·취미', bucket: 'want', plan: wantLimit || Math.round(want * 0.45), icon: 'food' },
      { label: '쇼핑·선물', bucket: 'want', plan: Math.round(remainingWant || want * 0.28), icon: 'bag' },
      { label: data.savingsGoal || '비상금', bucket: 'save', plan: savingTargetAmount || Math.round(save * 0.55), icon: 'piggy' },
      { label: '투자·자기계발', bucket: 'save', plan: Math.round(remainingSave || save * 0.35), icon: 'chart' },
    ].filter((item) => item.plan > 0);
  };

  const clampBudgetRatio = (value) => Math.max(10, Math.min(80, Math.round(value)));

  const normalizeBudgetData = (data, note) => {
    const salary = Number(data.salary) || 0;
    const sourceBuckets = data.buckets?.length ? data.buckets : [
      { key: 'need', label: '필수비', ratio: 50 },
      { key: 'want', label: '여유비', ratio: 30 },
      { key: 'save', label: '저축·투자', ratio: 20 },
    ];
    const buckets = sourceBuckets.map((bucket, index) => {
      const label = bucket.label || (index === 0 ? '필수비' : index === 1 ? '여유비' : '저축·투자');
      const ratio = Number(bucket.ratio) || (index === 0 ? 50 : index === 1 ? 30 : 20);
      return {
        ...bucket,
        label,
        ratio,
        amount: Math.round(salary * ratio / 100),
      };
    });
    const normalized = {
      ...data,
      salary,
      buckets,
      adjustmentNote: note || data.adjustmentNote,
    };
    return {
      ...normalized,
      recommendations: buildBudgetRecommendations(normalized),
      summary: `세후 월급 ${won(salary)} 기준으로 필수비 ${won(buckets[0]?.amount || 0)}, 여유비 ${won(buckets[1]?.amount || 0)}, 저축·투자 ${won(buckets[2]?.amount || 0)}로 조정했어요.`,
    };
  };

  const rebalanceBudgetRatios = (data, targetKey, delta, note) => {
    const indexByKey = { need: 0, want: 1, save: 2 };
    const targetIndex = indexByKey[targetKey];
    if (targetIndex == null) return null;

    const buckets = (data.buckets || []).map((bucket) => ({ ...bucket }));
    const target = buckets[targetIndex];
    const oldTargetRatio = Number(target.ratio) || 0;
    const adjustedTargetRatio = clampBudgetRatio(oldTargetRatio + delta);
    let remainingDelta = adjustedTargetRatio - oldTargetRatio;
    target.ratio = adjustedTargetRatio;

    const preferredOrder = targetKey === 'save'
      ? [1, 0]
      : targetKey === 'want'
        ? [2, 0]
        : [1, 2];

    for (const index of preferredOrder) {
      if (!remainingDelta) break;
      const bucket = buckets[index];
      const current = Number(bucket.ratio) || 0;
      if (remainingDelta > 0) {
        const removable = Math.max(0, current - 10);
        const take = Math.min(removable, remainingDelta);
        bucket.ratio = current - take;
        remainingDelta -= take;
      } else {
        const addable = Math.max(0, 80 - current);
        const add = Math.min(addable, Math.abs(remainingDelta));
        bucket.ratio = current + add;
        remainingDelta += add;
      }
    }

    const total = buckets.reduce((sum, bucket) => sum + (Number(bucket.ratio) || 0), 0);
    const correction = 100 - total;
    const correctionIndex = preferredOrder[0] ?? 0;
    buckets[correctionIndex].ratio = clampBudgetRatio((Number(buckets[correctionIndex].ratio) || 0) + correction);

    return normalizeBudgetData({ ...data, buckets }, note);
  };

  const parseBudgetAdjustment = (text, data) => {
    const compact = text.replace(/\s/g, '');
    const percentMatch = compact.match(/(\d{1,2})(?:%|퍼센트|프로)/);
    const deltaSize = percentMatch ? Math.max(1, Math.min(20, Number(percentMatch[1]))) : 5;
    const wantsIncrease = /(늘|올|높|증가|더|많)/.test(compact);
    const wantsDecrease = /(줄|낮|감소|덜|빼)/.test(compact);
    const direction = wantsDecrease ? -1 : wantsIncrease ? 1 : 0;

    if (/(공격적저축|저축많|많이모|빡세)/.test(compact)) {
      return normalizeBudgetData({
        ...data,
        budgetRule: 'aggressive_saving',
        buckets: [
          { key: 'need', label: '필수비', ratio: 45 },
          { key: 'want', label: '여유비', ratio: 20 },
          { key: 'save', label: '저축·투자', ratio: 35 },
        ],
      }, '저축을 우선하는 스타일로 바꿨어요.');
    }
    if (/(안전|보수|스타터|필수비여유)/.test(compact)) {
      return normalizeBudgetData({
        ...data,
        budgetRule: 'starter_safe',
        buckets: [
          { key: 'need', label: '필수비', ratio: 55 },
          { key: 'want', label: '여유비', ratio: 25 },
          { key: 'save', label: '저축·투자', ratio: 20 },
        ],
      }, '필수비 여유를 더 두는 스타일로 바꿨어요.');
    }
    if (/(50.?30.?20|503020|오십삼십이십)/.test(compact)) {
      return normalizeBudgetData({
        ...data,
        budgetRule: '50_30_20',
        buckets: [
          { key: 'need', label: '필수비', ratio: 50 },
          { key: 'want', label: '여유비', ratio: 30 },
          { key: 'save', label: '저축·투자', ratio: 20 },
        ],
      }, '50·30·20 균형형으로 다시 맞췄어요.');
    }

    const targetKey = /(저축|저금|투자|모으|비상금)/.test(compact)
      ? 'save'
      : /(여유|취미|쇼핑|외식|생활비|용돈)/.test(compact)
        ? 'want'
        : /(필수|고정|월세|통신|교통|주거)/.test(compact)
          ? 'need'
          : null;

    if (!targetKey || !direction) return null;
    const labels = { need: '필수비', want: '여유비', save: '저축·투자' };
    return rebalanceBudgetRatios(
      data,
      targetKey,
      direction * deltaSize,
      `${labels[targetKey]} 비율을 ${deltaSize}%p ${direction > 0 ? '늘렸어요' : '줄였어요'}.`
    );
  };

  const applyBudgetPlan = (data) => {
    const snapshot = getRuntimeSnapshot();
    const recommendedCategories = data.recommendations || buildBudgetRecommendations(data);
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
      categories: recommendedCategories.map((item) => ({
        ...item,
        used: snapshot.budget.categories?.find((category) => category.label === item.label)?.used || 0,
      })),
      nextMonthTip: `세후 ${won(data.salary)} 기준 예산을 반영했어요. 저축·투자 목표는 ${won(data.buckets[2]?.amount || 0)}입니다.`,
    };
    saveRuntimeData({ ...snapshot.raw, budget: nextBudget });
    toast('예산 설계를 반영했어요');
    return `좋아요. 첫 월급 예산을 실제 예산 화면에 반영했어요. 필수비 ${won(data.buckets[0]?.amount || 0)}, 여유비 ${won(data.buckets[1]?.amount || 0)}, 저축·투자 ${won(data.buckets[2]?.amount || 0)}로 저장했습니다.`;
  };

  const askToApplyBudgetPlan = (data, note = '이 예산안을 예산 화면에 바로 반영할 수 있어요.') => {
    askToRunAction({
      id: `budget-${Date.now()}`,
      type: 'applyBudgetPlan',
      data,
      confirmText: `${note} 필수비 ${won(data.buckets[0]?.amount || 0)}, 여유비 ${won(data.buckets[1]?.amount || 0)}, 저축·투자 ${won(data.buckets[2]?.amount || 0)} 기준입니다.`,
    });
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
    if (action.type === 'applyBudgetInsight') {
      applyBudgetInsight(action.data);
      toast(`${action.data.categoryLabel || action.data.title} 한도를 반영했어요`);
      emitAi(`${action.data.categoryLabel || action.data.title} 한도를 ${won(action.data.suggestedLimit || action.data.actionPayload?.limit || 0)}로 조정했어요. 예산 페이지에도 반영했습니다.`);
      setPendingAction(null);
      return true;
    }
    if (action.type === 'openBudgetInput') {
      window.__JAYBIS_BUDGET_INPUT_MODE = action.mode;
      toast(action.mode === 'manual' ? '수기 입력으로 이동해요' : '마이데이터 연결로 이동해요');
      emitAi(action.mode === 'manual'
        ? '좋아요. 예산 페이지에서 수기 데이터 입력을 진행할 수 있게 이동할게요.'
        : '좋아요. 예산 페이지에서 마이데이터 JSON을 연결할 수 있게 이동할게요.');
      setPendingAction(null);
      nav('budget');
      return true;
    }
    return false;
  };

  const parseActionRequest = (text) => {
    const t = text.replace(/\s/g, '');
    const wantsVoice = /(tts|음성|읽어|소리)/i.test(t);
    if (/(마이데이터|mydata)/i.test(t) && /(연동|연결|입력|데이터)/i.test(t)) {
      return {
        id: `mydata-${Date.now()}`,
        type: 'openBudgetInput',
        mode: 'mydata',
        confirmText: '예산 페이지에서 마이데이터 JSON을 연결하면 예산 설계와 소비 진단에 바로 반영됩니다.',
        yesLabel: '이동',
        noLabel: '나중에',
      };
    }
    if (/(수기|직접|손으로)/i.test(t) && /(입력|데이터|예산|소비)/i.test(t)) {
      return {
        id: `manual-${Date.now()}`,
        type: 'openBudgetInput',
        mode: 'manual',
        confirmText: '마이데이터가 없다면 예산 페이지에서 월급과 지출을 수기로 입력할 수 있어요.',
        yesLabel: '이동',
        noLabel: '나중에',
      };
    }
    if (/(절약|한도|줄여|아껴|적용|반영)/i.test(t) && /(적용|반영|줄여|낮춰|해줘)/i.test(t)) {
      const snapshot = getRuntimeSnapshot();
      const alerts = snapshot.budget?.alerts || [];
      const matched = alerts.find((alert) => (
        (alert.categoryLabel && t.includes(alert.categoryLabel.replace(/\s/g, ''))) ||
        (alert.category && t.includes(String(alert.category).replace(/\s/g, ''))) ||
        (alert.bucket && t.includes(String(alert.bucket).replace(/\s/g, '')))
      )) || alerts[0];
      if (matched) {
        return {
          id: `insight-${Date.now()}`,
          type: 'applyBudgetInsight',
          data: matched,
          confirmText: `${matched.title} 제안을 적용해 ${matched.categoryLabel || '해당 항목'} 한도를 ${won(matched.suggestedLimit || matched.actionPayload?.limit || 0)}로 조정할 수 있어요.`,
          yesLabel: '적용',
          noLabel: '취소',
        };
      }
    }
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
      askToApplyBudgetPlan(result.data, '방금 만든 첫 월급 예산안을 예산 화면에 바로 반영할 수 있어요.');
    }
    setChips(result.data.nextChips || STARTER_FEATURE_CHIPS);
    setCards(buildFeatureCards(result.kind, result.data, nav));
  };

  const openBudgetDesigner = (text) => {
    const toolCall = selectJaybisToolCall(text);
    const salary = toolCall?.arguments?.monthlySalary || ASSETS?.cashflow?.income || 0;
    push({
      who: 'ai',
      kind: 'budgetDesigner',
      salary,
      fixedCost: '',
      housing: '',
      telecomTransport: '',
      foodLiving: '',
      wantLimit: '',
      savingTargetAmount: '',
      savingsGoal: '비상금',
      budgetRule: '50_30_20',
    });
  };

  const handleBudgetDesignerSubmit = (messageId, values) => {
    setMsgs((prev) => prev.map((m) => (
      m.id === messageId ? { ...m, submitted: true } : m
    )));
    const toolCall = {
      name: 'first_salary_budget_design',
      arguments: {
        monthlySalary: Number(values.salary) || 0,
        fixedCost: Number(values.fixedCost) || 0,
        savingsGoal: values.savingsGoal || '비상금',
        budgetRule: values.budgetRule || '50_30_20',
      },
    };
    const seq = getJaybisToolSequence(toolCall.name);
    push({ who: 'ai', kind: 'tools', seq, toolCall });
    const result = executeJaybisToolCall(toolCall);
    const expenseDetails = {
      housing: Number(values.housing) || 0,
      telecomTransport: Number(values.telecomTransport) || 0,
      foodLiving: Number(values.foodLiving) || 0,
      wantLimit: Number(values.wantLimit) || 0,
      savingTargetAmount: Number(values.savingTargetAmount) || 0,
    };
    const fixedDetailTotal = expenseDetails.housing + expenseDetails.telecomTransport + expenseDetails.foodLiving;
    const dataBase = {
      ...result.data,
      fixedCost: Number(values.fixedCost) || fixedDetailTotal,
      expenseDetails,
      savingsGoal: values.savingsGoal || result.data.savingsGoal,
    };
    const recommendations = buildBudgetRecommendations(dataBase);
    const data = { ...dataBase, recommendations };
    emitAi(`💰 **입력한 세부 항목으로 예산안을 나눴어요.**\n\n필수비 안에서는 주거·통신교통·식비를 먼저 고정하고, 남는 금액을 기타 필수비로 남겨뒀어요. 여유비와 저축 목표도 입력값을 우선 반영했습니다.`);
    push({ who: 'ai', kind: 'budgetPlanPreview', data, recommendations });
    askToApplyBudgetPlan(data);
    setChips(result.data.nextChips || STARTER_FEATURE_CHIPS);
    setCards(buildFeatureCards(result.kind, result.data, nav));
  };

  async function respond(text) {
    if (busy || !text?.trim()) return;
    shouldAutoScrollRef.current = true;
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
          shouldAutoScrollRef.current = true;
          resolveConfirmMessage(pendingAction.id, 'denied');
          setPendingAction(null);
          emitAi('알겠어요. 실행하지 않고 보류할게요.');
          return;
        }
        if (isConfirmText(prompt)) {
          shouldAutoScrollRef.current = true;
          resolveConfirmMessage(pendingAction.id, 'approved');
          runConfirmedAction(pendingAction);
          return;
        }
        if (pendingAction.type === 'applyBudgetPlan') {
          const adjusted = parseBudgetAdjustment(prompt, pendingAction.data);
          if (adjusted) {
            resolveConfirmMessage(pendingAction.id, 'revised');
            emitAi(adjusted.adjustmentNote || '요청한 방향으로 예산안을 다시 조정했어요.');
            push({ who: 'ai', kind: 'budgetPlanPreview', data: adjusted, recommendations: adjusted.recommendations });
            askToApplyBudgetPlan(adjusted, '수정한 예산안을 예산 화면에 반영할 수 있어요.');
            setCards(buildFeatureCards('budgetPlanResult', adjusted, nav));
            return;
          }
        }
        emitAi('수정하고 싶은 방향을 예산 항목으로 말해주면 바로 다시 짤게요. 예: 저축비율을 늘려줘, 여유비를 5% 줄여줘, 안전 스타터로 바꿔줘.');
        return;
      }

      const requestedAction = parseActionRequest(prompt);
      if (requestedAction) {
        askToRunAction(requestedAction);
        return;
      }

      const localToolCall = selectJaybisToolCall(prompt);
      if (localToolCall.name === 'first_salary_budget_design') {
        openBudgetDesigner(prompt);
        return;
      }

      const remote = await runJaybisOpenAIConversation(nextMsgs, {
        userName: USER?.name,
        age: USER?.age,
        tone: settings?.tone,
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
          askToApplyBudgetPlan(result.data, '방금 만든 첫 월급 예산안을 예산 화면에 바로 반영할 수 있어요.');
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
    shouldAutoScrollRef.current = true;
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
            <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>JAYBIS가 무엇이든 도와드려요 </div>
          </div>
        </div>
        <span className="pill pill-teal" style={{ fontSize: 10.5 }}>{status}</span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
        }}
      >
        <section className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 14px 12px' }}>
          <div ref={scrollRef} onScroll={rememberScroll} className="scroll" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
            {msgs.map((m) => <div key={m.id} data-message-id={m.id}><Message m={m} onChip={respond} onConfirm={handleConfirmAction} onBudgetSubmit={handleBudgetDesignerSubmit} /></div>)}
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

function Message({ m, onChip, onConfirm, onBudgetSubmit }) {
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
          <span className={'pill ' + (m.resolved === 'approved' ? 'pill-pos' : m.resolved === 'revised' ? 'pill-teal' : 'pill-warn')} style={{ fontSize: 11.5 }}>
            {m.resolved === 'approved' ? '승인됨' : m.resolved === 'revised' ? '수정됨' : '취소됨'}
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
  if (m.kind === 'budgetDesigner') return (
    <BudgetDesignerCard m={m} onSubmit={onBudgetSubmit} />
  );
  if (m.kind === 'budgetPlanPreview') return (
    <BudgetPlanPreview data={m.data} recommendations={m.recommendations} />
  );
  return null;
}

function BudgetDesignerCard({ m, onSubmit }) {
  const [salary, setSalary] = useState(m.salary || '');
  const [fixedCost, setFixedCost] = useState(m.fixedCost || '');
  const [housing, setHousing] = useState(m.housing || '');
  const [telecomTransport, setTelecomTransport] = useState(m.telecomTransport || '');
  const [foodLiving, setFoodLiving] = useState(m.foodLiving || '');
  const [wantLimit, setWantLimit] = useState(m.wantLimit || '');
  const [savingTargetAmount, setSavingTargetAmount] = useState(m.savingTargetAmount || '');
  const [savingsGoal, setSavingsGoal] = useState(m.savingsGoal || '비상금');
  const [budgetRule, setBudgetRule] = useState(m.budgetRule || '50_30_20');
  const goals = ['비상금', '여행', '독립', '전세·주거', '투자 시작'];
  const rules = [
    { key: '50_30_20', label: '50·30·20', desc: '균형형' },
    { key: 'aggressive_saving', label: '공격적 저축', desc: '저축 우선' },
    { key: 'starter_safe', label: '안전 스타터', desc: '필수비 여유' },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div className="card" style={{ maxWidth: '94%', padding: 14, border: '1px solid var(--teal-100)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>첫 월급 예산 설계</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>고정비와 목표를 나눠 입력하면 더 정확하게 설계해요</div>

        <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
          <BudgetInput label="세후 월급" value={salary} onChange={setSalary} />
          <BudgetInput label="매달 꼭 나가는 돈" value={fixedCost} onChange={setFixedCost} placeholder="모르면 비워둬도 돼요" />

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 6 }}>필수비 세부 입력</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <BudgetInput label="주거·관리비" value={housing} onChange={setHousing} compact />
              <BudgetInput label="통신·교통" value={telecomTransport} onChange={setTelecomTransport} compact />
            </div>
            <div style={{ marginTop: 7 }}>
              <BudgetInput label="식비·생활" value={foodLiving} onChange={setFoodLiving} compact />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 6 }}>조절 항목</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <BudgetInput label="여유비 한도" value={wantLimit} onChange={setWantLimit} compact />
              <BudgetInput label="목표 저축액" value={savingTargetAmount} onChange={setSavingTargetAmount} compact />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 6 }}>저축 목표</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {goals.map((goal) => (
                <button
                  key={goal}
                  onClick={() => setSavingsGoal(goal)}
                  className={'pill ' + (savingsGoal === goal ? 'pill-teal' : '')}
                  style={{ border: '1px solid var(--teal-100)', background: savingsGoal === goal ? 'var(--teal-50)' : 'var(--card)', fontSize: 11.5 }}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 6 }}>예산 스타일</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 7 }}>
              {rules.map((rule) => (
                <button
                  key={rule.key}
                  onClick={() => setBudgetRule(rule.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 10px',
                    borderRadius: 11,
                    border: `1px solid ${budgetRule === rule.key ? 'var(--teal-600)' : 'var(--line)'}`,
                    background: budgetRule === rule.key ? 'var(--teal-50)' : 'var(--card)',
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>{rule.label}</span>
                  <span className="muted" style={{ fontSize: 11.5 }}>{rule.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={m.submitted || !salary}
            onClick={() => onSubmit(m.id, { salary, fixedCost, housing, telecomTransport, foodLiving, wantLimit, savingTargetAmount, savingsGoal, budgetRule })}
            className="btn btn-primary"
            style={{ height: 40, fontSize: 14, boxShadow: 'none', opacity: m.submitted || !salary ? .45 : 1 }}
          >
            {m.submitted ? '설계 완료' : '예산안 만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetInput({ label, value, onChange, placeholder = '원 단위', compact = false }) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ fontSize: compact ? 11.2 : 12, fontWeight: 800, color: 'var(--slate-600)' }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ height: compact ? 34 : 38, border: '1px solid var(--line)', borderRadius: 11, padding: '0 10px', outline: 'none', color: 'var(--ink)', background: 'var(--bg)', fontSize: compact ? 12.5 : 13.5, minWidth: 0 }}
      />
    </label>
  );
}

function BudgetPlanPreview({ data, recommendations = [] }) {
  const details = data.expenseDetails || {};
  const detailItems = [
    ['주거', details.housing],
    ['통신·교통', details.telecomTransport],
    ['식비·생활', details.foodLiving],
    ['여유비 한도', details.wantLimit],
    ['목표 저축', details.savingTargetAmount],
  ].filter(([, value]) => Number(value) > 0);
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div className="card" style={{ maxWidth: '94%', padding: 14, boxShadow: 'var(--shadow-sm)' }}>
        <div className="between" style={{ marginBottom: 10 }}>
          <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>예산안 미리보기</b>
          <span className="pill pill-teal" style={{ fontSize: 10.5 }}>{won(data.salary)}</span>
        </div>
        {data.buckets.map((bucket, index) => (
          <div key={bucket.key} className="between" style={{ padding: '7px 0', borderTop: index ? '1px solid var(--line)' : 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{bucket.label} {bucket.ratio}%</span>
            <span className="tnum" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--teal-700)' }}>{won(bucket.amount)}</span>
          </div>
        ))}
        {detailItems.length > 0 && (
          <div style={{ marginTop: 10, padding: '9px 10px', borderRadius: 11, background: 'var(--teal-50)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal-800)', marginBottom: 6 }}>입력 기준</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {detailItems.map(([label, value]) => (
                <span key={label} className="pill" style={{ background: 'var(--card)', border: '1px solid var(--teal-100)', color: 'var(--teal-700)', fontSize: 10.5 }}>
                  {label} {won(value)}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 7 }}>추천 항목</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {recommendations.slice(0, 5).map((item) => (
              <div key={item.label} className="between" style={{ fontSize: 12.5 }}>
                <span className="muted">{item.label}</span>
                <b className="tnum" style={{ color: 'var(--ink)' }}>{won(item.plan)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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
        padding: '13px 14px',
        minHeight: 76,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        animationDelay: `${0.03 + delay * 0.045}s`,
      }}
    >
      <span className="ic-chip" style={{ width: 42, height: 42, borderRadius: 12, background: `${card.tone}15`, flex: '0 0 auto' }}>
        <Icon name={card.icon} size={20} color={card.tone} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14.2, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.25 }}>{card.title}</div>
        <div className="muted" style={{ fontSize: 11.8, lineHeight: 1.4, marginTop: 4, whiteSpace: 'normal' }}>{card.desc}</div>
      </div>
      <Icon name="chevR" size={18} color="var(--slate-400)" />
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

      <div style={{ padding:'0 18px 116px', marginTop:-40, position:'relative', zIndex:2 }} className="stagger">
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
