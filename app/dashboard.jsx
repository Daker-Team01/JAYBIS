/* =========================================================================
   제이비스 (JAYBIS) — 홈
   상단: 대화 패널  ·  하단: AI가 추천하는 기능 카드
   ========================================================================= */

const {
  useState, useEffect, useRef, Logo, Icon, SectionLabel, stagger, MarkdownBubble,
  USER, ASSETS, BUDGET, STARTER_FEATURE_CHIPS,
  loadJaybisChatMessages, saveJaybisChatMessages, createJaybisMessageId,
  saveAppSettings, getRuntimeSnapshot, saveRuntimeData,
  useJaybisRuntimeData, refreshSupabaseTransactions, refreshSupabaseBudgetInsights,
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
  const [snapshot] = useJaybisRuntimeData();
  const user = snapshot?.user || USER;
  const [msgs, setMsgs] = useState(() => loadJaybisChatMessages([
    { id: 'g1', who: 'ai', kind: 'text', text: `${user.greeting || user.name}님, 여기서 바로 이야기해요. 필요한 금융 기능을 대화로 바로 도와드릴게요.` },
  ]));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(getJaybisOpenAIConfigStatus());
  const [chips, setChips] = useState(STARTER_FEATURE_CHIPS);
  const [cards, setCards] = useState(buildFeatureCards(null, null));
  const [pendingAction, setPendingAction] = useState(null);
  const [featureModal, setFeatureModal] = useState(null);
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
    setMsgs((prev) => prev.map((message) => (
      message.id === 'g1'
        ? { ...message, text: `${user.greeting || user.name}님, 여기서 바로 이야기해요. 필요한 금융 기능을 대화로 바로 도와드릴게요.` }
        : message
    )));
  }, [user.name, user.greeting]);

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

  const emitAiWithCta = (text, cta) => {
    const next = summarizeEasy(text, settings);
    push({ who: 'ai', kind: 'textCta', text: next, cta });
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

  const saveSpendingDiagnosisReport = (diagnosis = {}) => {
    const snapshot = getRuntimeSnapshot();
    const currentBudget = snapshot.raw.budget || snapshot.budget || {};
    const salary = Number(diagnosis.salary || currentBudget.salary || 0);
    const spend = Number(diagnosis.spend || 0);
    const spendRate = salary ? spend / salary * 100 : Number(diagnosis.spendRate || 0);
    const categories = Array.isArray(currentBudget.categories) ? currentBudget.categories : [];
    const topCategories = categories.length
      ? [...categories]
          .filter((category) => Number(category.used || 0) > 0)
          .sort((a, b) => Number(b.used || 0) - Number(a.used || 0))
          .slice(0, 3)
          .map((category) => ({
            label: category.label || category.category || '기타',
            amount: Number(category.used || 0),
            plan: Number(category.plan || 0),
            bucket: category.bucket || '',
            ratio: spend ? Number(category.used || 0) / spend * 100 : 0,
          }))
      : (diagnosis.topCategories || []).slice(0, 3).map((category) => ({
          label: category.label || '기타',
          amount: Number(category.value || category.amount || 0),
          ratio: spend ? Number(category.value || category.amount || 0) / spend * 100 : 0,
        }));
    const fixedOrNonCuttablePattern = /(비상금|저축|투자|월세|주거|관리비|대출|보험|공과금|통신|교통|의료|병원|약국)/;
    const spendTransactions = (snapshot.transactions || [])
      .filter((transaction) => transaction.type === 'spend' && transaction.date);
    const monthKey = spendTransactions[0]?.date?.slice(0, 7) || new Date().toISOString().slice(0, 7);
    const monthTransactions = spendTransactions.filter((transaction) => transaction.date?.slice(0, 7) === monthKey);
    const latestDay = monthTransactions.reduce((max, transaction) => {
      const day = Number(transaction.date?.slice(8, 10));
      return Number.isFinite(day) ? Math.max(max, day) : max;
    }, new Date().getDate());
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 30;
    const monthProgress = Math.min(1, Math.max(0.05, latestDay / daysInMonth));
    const variableSavingCandidates = categories.length
      ? [...categories]
          .filter((category) => {
            const amount = Number(category.used || 0);
            const label = String(category.label || category.category || '');
            if (!amount) return false;
            if (fixedOrNonCuttablePattern.test(label)) return false;
            return category.bucket === 'want' || (!category.bucket && amount > 0);
          })
          .sort((a, b) => Number(b.used || 0) - Number(a.used || 0))
          .slice(0, 2)
          .map((category) => ({
            label: category.label || category.category || '기타',
            amount: Number(category.used || 0),
            plan: Number(category.plan || 0),
            bucket: category.bucket || 'want',
            ratio: spend ? Number(category.used || 0) / spend * 100 : 0,
          }))
      : topCategories
          .filter((category) => !fixedOrNonCuttablePattern.test(String(category.label || '')))
          .slice(0, 2);

    const status = spendRate > 75 ? '주의' : spendRate > 60 ? '관찰' : '안정';
    const report = {
      generatedAt: new Date().toISOString(),
      source: diagnosis.source || 'mydata',
      status,
      summary: `이번 달 지출은 ${won(spend)}이고, 월급 대비 ${pct(spendRate, 1)} 수준입니다.`,
      metrics: [
        { label: '총지출', value: won(spend) },
        { label: '소비율', value: pct(spendRate, 1) },
        { label: '고정비', value: won(diagnosis.fixed || 0) },
        { label: '변동비', value: won(diagnosis.variable || 0) },
      ],
      topCategories,
      savingBasis: '절약 포인트는 비상금·주거비 같은 고정/필수 지출을 제외하고 유동비 안에서만 골랐습니다.',
    };

    const alerts = variableSavingCandidates
      .map((category) => {
        const plan = Number(category.plan || 0);
        const usedRatio = plan ? category.amount / plan : 0;
        const projected = category.amount / monthProgress;
        const projectedRatio = plan ? projected / plan : 0;
        const overAmount = Math.max(0, category.amount - plan);
        const isOverBudget = plan > 0 && usedRatio >= 1;
        const isFastPace = plan > 0 && monthProgress < 0.85 && usedRatio > monthProgress + 0.18 && projectedRatio >= 1.12;
        const isLargeVariable = !plan && category.ratio >= 18 && category.amount >= 50000;
        if (!isOverBudget && !isFastPace && !isLargeVariable) return null;
        const save = Math.max(10000, Math.round(category.amount * 0.12 / 1000) * 1000);
        const reason = isOverBudget
          ? `이미 예산을 ${won(overAmount)} 초과했어요.`
          : isFastPace
            ? `이번 달이 ${Math.round(monthProgress * 100)}% 지났는데 예산의 ${Math.round(usedRatio * 100)}%를 사용했어요.`
            : `예산이 없지만 전체 지출의 ${pct(category.ratio, 1)}를 차지하는 큰 유동비예요.`;
        return {
          id: `diagnosis-${Date.now()}-${category.label}`,
          type: 'diagnosis',
          title: `${category.label} 유동비 점검`,
          body: `${reason} 이미 사용한 금액은 바꾸지 않고, 다음 소비진단 전까지 관찰 포인트로 유지합니다.`,
          categoryLabel: category.label,
          bucket: category.bucket,
          save,
        };
      })
      .filter(Boolean)
      .slice(0, 2);

    saveRuntimeData({
      ...snapshot.raw,
      budget: {
        ...currentBudget,
        spendingReport: report,
        alerts,
        nextMonthTip: alerts.length
          ? `${status} 단계예요. 고정비는 유지하고 ${alerts[0].categoryLabel} 같은 유동비 사용 속도를 먼저 관찰해보세요.`
          : `${status} 단계예요. 이번 진단에서는 예산 초과나 사용 속도 과다 신호가 뚜렷하지 않았습니다.`,
      },
    });
    return report;
  };

  const askToApplyBudgetPlan = (data, note = '이 예산안을 예산 화면에 바로 반영할 수 있어요.') => {
    askToRunAction({
      id: `budget-${Date.now()}`,
      type: 'applyBudgetPlan',
      data,
      confirmText: `${note} 필수비 ${won(data.buckets[0]?.amount || 0)}, 여유비 ${won(data.buckets[1]?.amount || 0)}, 저축·투자 ${won(data.buckets[2]?.amount || 0)} 기준입니다.`,
    });
  };

  const spendingReportCta = {
    label: '소비진단 리포트 확인',
    target: 'budget',
    icon: 'chart',
  };

  const runConfirmedAction = (action) => {
    if (!action) return false;
    if (action.type === 'toggleSeniorMode') {
      saveAppSettings({ seniorMode: action.value });
      toast(action.value ? '시니어 모드를 켰어요' : '시니어 모드를 껐어요');
      emitAi(action.value
        ? '시니어 모드를 켰어요. 홈 화면이 큰 글씨와 쉬운 설명 중심으로 바뀌고, MY 설정에도 반영됩니다.'
        : '시니어 모드를 껐어요. 홈 화면을 기본 모드로 다시 사용할 수 있어요.');
      setPendingAction(null);
      return true;
    }
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
    if (action.type === 'openBudgetDesigner') {
      setFeatureModal({
        id: `budget-modal-${Date.now()}`,
        kind: 'budgetDesigner',
        salary: action.data?.salary || '',
        fixedCost: '',
        housing: '',
        telecomTransport: '',
        foodLiving: '',
        wantLimit: '',
        savingTargetAmount: '',
        savingsGoal: '비상금',
        budgetRule: '50_30_20',
      });
      emitAi('좋아요. 예산 설계 입력창을 열었어요. 필요한 값을 채운 뒤 실행을 눌러주세요.');
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
    const wantsSeniorMode = /(시니어|senior|큰글씨|큰글자|쉬운설명|고령|어르신)/i.test(t);
    const wantsVoice = /(tts|음성|읽어|소리)/i.test(t);
    if (wantsSeniorMode && /(꺼|끄|off|해제|기본|일반)/i.test(t)) {
      return {
        id: `senior-off-${Date.now()}`,
        type: 'toggleSeniorMode',
        value: false,
        confirmText: '시니어 모드를 끄면 홈 화면이 기본 화면으로 돌아가고, 큰 글씨·쉬운 설명 중심 표시가 해제됩니다.',
        yesLabel: '끄기',
        noLabel: '취소',
      };
    }
    if (wantsSeniorMode && /(켜|on|시작|활성|설정|바꿔|전환)/i.test(t)) {
      return {
        id: `senior-on-${Date.now()}`,
        type: 'toggleSeniorMode',
        value: true,
        confirmText: '시니어 모드를 켜면 홈 화면이 큰 글씨와 쉬운 설명 중심으로 바뀌고, 음성 인식 기능을 더 쉽게 사용할 수 있어요.',
        yesLabel: '켜기',
        noLabel: '취소',
      };
    }
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
    if (result.kind === 'spendingDiagnosisResult') {
      emitAiWithCta(result.data.summary, spendingReportCta);
    } else {
      emitAi(result.data.summary);
    }
    if (result.kind === 'budgetPlanResult') {
      askToApplyBudgetPlan(result.data, '방금 만든 첫 월급 예산안을 예산 화면에 바로 반영할 수 있어요.');
    }
    if (result.kind === 'spendingDiagnosisResult') {
      saveSpendingDiagnosisReport(result.data);
    }
    setChips(result.data.nextChips || STARTER_FEATURE_CHIPS);
    setCards(buildFeatureCards(result.kind, result.data, nav));
  };

  const askToOpenBudgetDesigner = (text) => {
    const toolCall = selectJaybisToolCall(text);
    const salary = toolCall?.arguments?.monthlySalary || ASSETS?.cashflow?.income || 0;
    askToRunAction({
      id: `budget-designer-${Date.now()}`,
      type: 'openBudgetDesigner',
      data: { salary },
      confirmText: '첫 월급 예산 설계를 실행할까요? 실행하면 입력창을 열고, 값을 채운 뒤 예산안을 만들 수 있어요.',
      yesLabel: '예',
      noLabel: '아니오',
    });
  };

  const runBudgetDesignerSubmit = (values) => {
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

  const handleBudgetDesignerSubmit = (messageId, values) => {
    setMsgs((prev) => prev.map((m) => (
      m.id === messageId ? { ...m, submitted: true } : m
    )));
    runBudgetDesignerSubmit(values);
  };

  const handleBudgetModalSubmit = (messageId, values) => {
    setFeatureModal(null);
    runBudgetDesignerSubmit(values);
  };

  const handleBudgetDesignerCancel = (messageId) => {
    setMsgs((prev) => prev.map((m) => (
      m.id === messageId ? { ...m, cancelled: true } : m
    )));
    emitAi('예산짜기를 취소했어요. 필요하면 언제든 다시 “예산 짜줘”라고 말해줘요.');
  };

  const handleBudgetModalCancel = () => {
    setFeatureModal(null);
    emitAi('예산짜기를 취소했어요. 필요하면 언제든 다시 “예산 짜줘”라고 말해줘요.');
  };

  async function respond(text) {
    if (busy || !text?.trim()) return;
    const activeBudgetDesigner = msgs.some((m) => m.kind === 'budgetDesigner' && !m.submitted && !m.cancelled);
    if (activeBudgetDesigner || featureModal?.kind === 'budgetDesigner') {
      emitAi('예산 설계 입력이 아직 끝나지 않았어요. 입력창에서 실행하거나 취소한 뒤 다음 대화를 이어갈 수 있어요.');
      return;
    }
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
        askToOpenBudgetDesigner(prompt);
        return;
      }
      const localDiagnosisResult = localToolCall.name === 'mydata_spending_diagnosis'
        ? executeJaybisToolCall(localToolCall)
        : null;

      const remote = await runJaybisOpenAIConversation(nextMsgs, {
        userName: user?.name,
        age: user?.age,
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

        const isSpendingDiagnosis = result?.kind === 'spendingDiagnosisResult' || localDiagnosisResult?.kind === 'spendingDiagnosisResult';
        if (remote.text) {
          if (isSpendingDiagnosis) emitAiWithCta(remote.text, spendingReportCta);
          else emitAi(remote.text);
        }
        if (result?.kind === 'budgetPlanResult') {
          askToApplyBudgetPlan(result.data, '방금 만든 첫 월급 예산안을 예산 화면에 바로 반영할 수 있어요.');
        }
        if (result?.kind === 'spendingDiagnosisResult') {
          saveSpendingDiagnosisReport(result.data);
        } else if (localDiagnosisResult?.kind === 'spendingDiagnosisResult') {
          saveSpendingDiagnosisReport(localDiagnosisResult.data);
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
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>{user.name}님 홈</div>
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
            {msgs.map((m) => <div key={m.id} data-message-id={m.id}><Message m={m} onChip={respond} onConfirm={handleConfirmAction} onBudgetSubmit={handleBudgetDesignerSubmit} onBudgetCancel={handleBudgetDesignerCancel} onNavigate={nav} /></div>)}
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
      {featureModal?.kind === 'budgetDesigner' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, background:'rgba(15,23,42,.28)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'64px 14px calc(var(--tab-h) + 34px)', overflow:'auto' }}>
          <BudgetDesignerCard
            m={featureModal}
            onSubmit={handleBudgetModalSubmit}
            onCancel={handleBudgetModalCancel}
            submitLabel="실행"
            cancelLabel="취소"
            modal
          />
        </div>
      )}
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

function Message({ m, onChip, onConfirm, onBudgetSubmit, onBudgetCancel, onNavigate }) {
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
  if (m.kind === 'textCta') return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ maxWidth: '86%' }}>
        <MarkdownBubble text={m.text} />
        {m.cta && (
          <button
            onClick={() => onNavigate && onNavigate(m.cta.target || 'budget')}
            className="btn btn-primary"
            style={{ height: 40, width: 'auto', display: 'inline-flex', marginTop: 8, padding: '0 15px', fontSize: 13.5, borderRadius: 12, boxShadow: 'none' }}
          >
            <Icon name={m.cta.icon || 'chevR'} size={16} color="#fff" /> {m.cta.label}
          </button>
        )}
      </div>
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
  if (m.kind === 'cta') return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <button
        onClick={() => onNavigate && onNavigate(m.target || 'budget')}
        className="btn btn-primary"
        style={{ height: 40, width: 'auto', padding: '0 15px', fontSize: 13.5, borderRadius: 12, boxShadow: 'none' }}
      >
        <Icon name={m.icon || 'chevR'} size={16} color="#fff" /> {m.label}
      </button>
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
    <BudgetDesignerCard m={m} onSubmit={onBudgetSubmit} onCancel={onBudgetCancel} />
  );
  if (m.kind === 'budgetPlanPreview') return (
    <BudgetPlanPreview data={m.data} recommendations={m.recommendations} />
  );
  return null;
}

function BudgetDesignerCard({ m, onSubmit, onCancel, submitLabel = '예산안 만들기', cancelLabel = '예산짜기 취소', modal = false }) {
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
  const requiredFields = [
    ['세후 월급', salary],
    ['주거·관리비', housing],
    ['통신·교통', telecomTransport],
    ['식비·생활', foodLiving],
    ['여유비 한도', wantLimit],
    ['목표 저축액', savingTargetAmount],
  ];
  const missingLabels = requiredFields
    .filter(([, value]) => !String(value ?? '').trim())
    .map(([label]) => label);
  const [attempted, setAttempted] = useState(false);
  const canSubmit = !m.submitted && !m.cancelled;
  const locked = m.submitted || m.cancelled;

  const submit = () => {
    setAttempted(true);
    if (missingLabels.length > 0) return;
    onSubmit(m.id, { salary, fixedCost, housing, telecomTransport, foodLiving, wantLimit, savingTargetAmount, savingsGoal, budgetRule });
  };
  const isMissing = (label) => attempted && missingLabels.includes(label);

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', width: modal ? '100%' : 'auto' }}>
      <div className="card" style={{ width: modal ? '100%' : 'auto', maxWidth: modal ? 430 : '94%', maxHeight: modal ? 'calc(100vh - var(--tab-h) - 108px)' : 'none', overflowY: modal ? 'auto' : 'visible', padding: 14, border: '1px solid var(--teal-100)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>첫 월급 예산 설계</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>고정비와 목표를 나눠 입력하면 더 정확하게 설계해요</div>
        {m.cancelled && (
          <span className="pill pill-warn" style={{ fontSize: 11.5, marginTop: 10 }}>
            취소됨
          </span>
        )}

        <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
          <BudgetInput label="세후 월급" value={salary} onChange={setSalary} disabled={locked} invalid={isMissing('세후 월급')} />
          <BudgetInput label="매달 꼭 나가는 돈" value={fixedCost} onChange={setFixedCost} placeholder="모르면 비워둬도 돼요" disabled={locked} />

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 6 }}>필수비 세부 입력</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <BudgetInput label="주거·관리비" value={housing} onChange={setHousing} compact disabled={locked} invalid={isMissing('주거·관리비')} />
              <BudgetInput label="통신·교통" value={telecomTransport} onChange={setTelecomTransport} compact disabled={locked} invalid={isMissing('통신·교통')} />
            </div>
            <div style={{ marginTop: 7 }}>
              <BudgetInput label="식비·생활" value={foodLiving} onChange={setFoodLiving} compact disabled={locked} invalid={isMissing('식비·생활')} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 6 }}>조절 항목</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <BudgetInput label="여유비 한도" value={wantLimit} onChange={setWantLimit} compact disabled={locked} invalid={isMissing('여유비 한도')} />
              <BudgetInput label="목표 저축액" value={savingTargetAmount} onChange={setSavingTargetAmount} compact disabled={locked} invalid={isMissing('목표 저축액')} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 6 }}>저축 목표</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {goals.map((goal) => (
                <button
                  key={goal}
                  disabled={locked}
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
                  disabled={locked}
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
            disabled={!canSubmit}
            onClick={submit}
            className="btn btn-primary"
            style={{ height: 40, fontSize: 14, boxShadow: 'none', opacity: canSubmit ? 1 : .45 }}
          >
            {m.submitted ? '설계 완료' : m.cancelled ? '취소됨' : submitLabel}
          </button>
          {!m.submitted && !m.cancelled && attempted && missingLabels.length > 0 && (
            <div style={{ fontSize:11.5, lineHeight:1.45, color:'var(--neg)', fontWeight:700 }}>
              빈칸을 채워주세요: {missingLabels.join(', ')}
            </div>
          )}
          {!m.submitted && !m.cancelled && (
            <button
              onClick={() => onCancel && onCancel(m.id)}
              className="btn btn-line"
              style={{ height: 38, fontSize: 13.5, borderRadius: 11 }}
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BudgetInput({ label, value, onChange, placeholder = '원 단위', compact = false, disabled = false, invalid = false }) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ fontSize: compact ? 11.2 : 12, fontWeight: 800, color: invalid ? 'var(--neg)' : 'var(--slate-600)' }}>{label}</span>
      <input
        type="number"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ height: compact ? 34 : 38, border: `1.5px solid ${invalid ? 'var(--neg)' : 'var(--line)'}`, borderRadius: 11, padding: '0 10px', outline: 'none', color: 'var(--ink)', background: invalid ? 'var(--warn-bg)' : disabled ? 'var(--slate-50)' : 'var(--bg)', fontSize: compact ? 12.5 : 13.5, minWidth: 0, opacity: disabled ? .65 : 1 }}
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
  { ic:'eye', title:'접근성 설정', desc:'시니어 모드와 음성 안내를 조정해요', go:'profile', tone:'#64748b' },
];

function Home({ nav, toast }) {
  const [snapshot] = useJaybisRuntimeData();
  const [syncState, setSyncState] = useState('idle');
  const user = snapshot?.user || USER;
  const b = snapshot?.budget || BUDGET;
  const hasConnectedData = Boolean((snapshot?.transactions || []).length || snapshot?.budget?.salary);

  useEffect(() => {
    let alive = true;
    setSyncState('loading');
    refreshSupabaseTransactions()
      .then(() => refreshSupabaseBudgetInsights())
      .then(() => { if (alive) setSyncState('done'); })
      .catch(() => { if (alive) setSyncState('error'); });
    return () => { alive = false; };
  }, []);

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
                안녕하세요, {user.name}님
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
          <div className="between" style={{ marginBottom:10, alignItems:'flex-end', gap:12 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--ink)' }}>소비 데이터</div>
              <div className="muted" style={{ fontSize:11.5, marginTop:2 }}>
                거래내역을 기준으로 자동 분석합니다
              </div>
            </div>
            <span className={'pill ' + (hasConnectedData ? 'pill-pos' : 'pill-warn')} style={{ fontSize:10.5, flex:'0 0 auto' }}>
              {syncState === 'loading' ? '동기화 중' : hasConnectedData ? '연결됨' : '데이터 없음'}
            </span>
          </div>

          <div className="card" style={{ background:'var(--teal-900)', color:'#fff' }}>
            <div className="between">
              <div>
                <div style={{ fontSize:12.5, color:'rgba(255,255,255,.7)', fontWeight:600 }}>세후 월급</div>
                <div className="tnum" style={{ fontSize:26, fontWeight:800, marginTop:3 }}>{won(b.salary)}</div>
              </div>
              <span className="pill pill-ghost" style={{ background:'rgba(94,234,212,.18)', color:'var(--teal-300)' }}>
                <Icon name="sparkF" size={13} color="var(--teal-300)" /> 50·30·20 룰
              </span>
            </div>

            <div style={{ display:'flex', height:16, borderRadius:8, overflow:'hidden', gap:3, marginTop:18 }}>
              {b.buckets.map((bk,i) => (
                <div key={i} style={{ flex:bk.ratio, background:bk.tone, position:'relative' }} />
              ))}
            </div>
            <div className="row" style={{ gap:8, marginTop:14 }}>
              {b.buckets.map((bk,i) => {
                const over = bk.used > bk.plan;
                return (
                  <div key={i} style={{ flex:1, background:'rgba(255,255,255,.1)', borderRadius:12, padding:'10px 11px' }}>
                    <div className="row" style={{ gap:6 }}>
                      <span style={{ width:8, height:8, borderRadius:3, background:bk.tone }} />
                      <span style={{ fontSize:11.5, fontWeight:700 }}>{bk.label} {bk.ratio}%</span>
                    </div>
                    <div className="tnum" style={{ fontSize:13.5, fontWeight:800, marginTop:7 }}>{manwon(bk.used)}</div>
                    <div style={{ fontSize:10.5, color: over ? '#fca5a5' : 'rgba(255,255,255,.6)', fontWeight:600, marginTop:1 }}>
                      / {manwon(bk.plan)} {over ? '초과' : '여유'}
                    </div>
                  </div>
                );
              })}
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
