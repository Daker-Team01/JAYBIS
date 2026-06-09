/* =========================================================================
   제이비스 (JAYBIS) — Runtime data layer
   실제 금융 데이터를 주입하기 위한 정규화/저장/분석 레이어
   ========================================================================= */

const { useState, useEffect } = window.React;

const JAYBIS_DATA_KEY = 'jaybis.realData';
const JAYBIS_CHAT_KEY = 'jaybis.chatMessages';
const JAYBIS_DATA_ENDPOINT = import.meta.env.VITE_JAYBIS_DATA_ENDPOINT || '';
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_DATA_TABLE = import.meta.env.VITE_SUPABASE_DATA_TABLE || 'jaybis_runtime_data';
const SUPABASE_DATA_ID = import.meta.env.VITE_SUPABASE_DATA_ID || 'default';

// ---- 포맷 헬퍼 --------------------------------------------------------------
const numberOrZero = (value) => {
  const next = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(next) ? next : 0;
};
const won = (n) => '₩' + Math.round(numberOrZero(n)).toLocaleString('ko-KR');
const manwon = (n) => Math.round(numberOrZero(n) / 10000).toLocaleString('ko-KR') + '만';
const pct = (n, d = 0) => numberOrZero(n).toFixed(d) + '%';

const EMPTY_USER = {
  name: '사용자',
  age: 0,
  job: '',
  track: '',
  joinedMonths: 0,
  greeting: '사용자',
};

const EMPTY_ASSETS = {
  netWorth: 0,
  totalAssets: 0,
  totalDebt: 0,
  debtRatio: 0,
  retireReady: 0,
  composition: [],
  cashflow: { income: 0, spend: 0, left: 0 },
};

const EMPTY_BUDGET = {
  salary: 0,
  buckets: [
    { key: 'need', label: '필수', ratio: 50, plan: 0, used: 0, tone: '#0d9488' },
    { key: 'want', label: '여유', ratio: 30, plan: 0, used: 0, tone: '#f59e0b' },
    { key: 'save', label: '저축·투자', ratio: 20, plan: 0, used: 0, tone: '#0ea5e9' },
  ],
  categories: [],
  peers: [],
  alerts: [],
  nextMonthTip: '실제 지출 데이터가 연결되면 다음 달 예산 보정안을 계산합니다.',
};

const EMPTY_AI_DIAGNOSIS = {
  grade: '데이터 대기',
  comment: '마이데이터 또는 내부 API가 연결되면 자산 진단 결과를 보여드릴게요.',
  signals: [],
};

const DEFAULT_INSTITUTIONS = [
  { id: 'bank', name: '은행', type: '은행', tone: '#0d9488', initial: 'B' },
  { id: 'card', name: '카드', type: '카드', tone: '#0f766e', initial: 'C' },
  { id: 'pension', name: '연금', type: '연금', tone: '#475569', initial: 'P' },
  { id: 'investment', name: '투자', type: '투자', tone: '#334155', initial: 'I' },
  { id: 'insurance', name: '보험', type: '보험', tone: '#64748b', initial: 'N' },
];

const DEFAULT_SIM = {
  productName: '금융상품',
  minMonthly: 0,
  maxMonthly: 1000000,
  stepMonthly: 50000,
  defaultMonthly: 0,
  termMonths: 60,
  rateAnnual: 0,
  govMatchRate: 0,
  taxFreeNote: '',
};

const EMPTY_PENSION_PLAN = {
  age: 0,
  targetLivingCost: 0,
  currentMonthlyPension: 0,
  expectedRetireAge: 65,
  monthlyGap: 0,
  prepRate: 0,
  steps: [],
};

const EMPTY_FRAUD_SCENARIO = {
  riskScore: 0,
  riskLabel: '데이터 없음',
  amount: 0,
  channel: '',
  reasons: [],
  actions: [],
};

const DEFAULT_DIGITAL_GUIDE_STEPS = [
  { step: 1, title: '데이터 연결', body: '실제 계좌, 카드, 연금 데이터를 연결합니다.' },
  { step: 2, title: '진단 실행', body: '연결된 데이터로 자산과 현금흐름을 계산합니다.' },
  { step: 3, title: '추천 확인', body: '사용자 조건에 맞는 다음 행동을 확인합니다.' },
];

function readRuntimeData() {
  if (typeof window === 'undefined') return {};
  if (window.__JAYBIS_DATA__ && typeof window.__JAYBIS_DATA__ === 'object') {
    return window.__JAYBIS_DATA__;
  }
  try {
    const raw = window.localStorage.getItem(JAYBIS_DATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function saveRuntimeData(data) {
  if (typeof window === 'undefined') return data || {};
  const next = normalizeRuntimeData(data || {});
  window.__JAYBIS_DATA__ = next.raw;
  try {
    window.localStorage.setItem(JAYBIS_DATA_KEY, JSON.stringify(next.raw));
  } catch (err) {}
  window.dispatchEvent(new CustomEvent('jaybis-data-changed', { detail: next }));
  return next;
}

function normalizeUser(user = {}, onboardingProfile = null) {
  const name = user.name || onboardingProfile?.name || EMPTY_USER.name;
  return {
    ...EMPTY_USER,
    ...user,
    name,
    age: numberOrZero(user.age || onboardingProfile?.age),
    greeting: user.greeting || name,
  };
}

function normalizeAssets(assets = {}) {
  const totalAssets = numberOrZero(assets.totalAssets);
  const totalDebt = numberOrZero(assets.totalDebt);
  const netWorth = assets.netWorth !== undefined ? numberOrZero(assets.netWorth) : totalAssets - totalDebt;
  const cashflow = {
    income: numberOrZero(assets.cashflow?.income),
    spend: numberOrZero(assets.cashflow?.spend),
    left: assets.cashflow?.left !== undefined
      ? numberOrZero(assets.cashflow.left)
      : numberOrZero(assets.cashflow?.income) - numberOrZero(assets.cashflow?.spend),
  };
  return {
    ...EMPTY_ASSETS,
    ...assets,
    netWorth,
    totalAssets,
    totalDebt,
    debtRatio: totalAssets > 0 ? totalDebt / totalAssets * 100 : numberOrZero(assets.debtRatio),
    retireReady: numberOrZero(assets.retireReady),
    composition: Array.isArray(assets.composition) ? assets.composition : [],
    cashflow,
  };
}

function normalizeBudget(budget = {}) {
  const salary = numberOrZero(budget.salary);
  const buckets = Array.isArray(budget.buckets) && budget.buckets.length
    ? budget.buckets.map((bucket, index) => ({
        ...EMPTY_BUDGET.buckets[index % EMPTY_BUDGET.buckets.length],
        ...bucket,
        ratio: numberOrZero(bucket.ratio),
        plan: numberOrZero(bucket.plan),
        used: numberOrZero(bucket.used),
      }))
    : EMPTY_BUDGET.buckets.map((bucket) => ({
        ...bucket,
        plan: Math.round(salary * bucket.ratio / 100),
      }));

  return {
    ...EMPTY_BUDGET,
    ...budget,
    salary,
    buckets,
    categories: Array.isArray(budget.categories) ? budget.categories : [],
    peers: Array.isArray(budget.peers) ? budget.peers : [],
    alerts: Array.isArray(budget.alerts) ? budget.alerts : [],
  };
}

function normalizeProducts(products = []) {
  return Array.isArray(products)
    ? products.map((product, index) => ({
        id: product.id || `product-${index + 1}`,
        rank: numberOrZero(product.rank || index + 1),
        name: product.name || '금융상품',
        issuer: product.issuer || '',
        tagline: product.tagline || '',
        rate: product.rate || '',
        maxMonthly: numberOrZero(product.maxMonthly),
        term: numberOrZero(product.term),
        maturity: numberOrZero(product.maturity),
        benefit: product.benefit || '',
        tags: Array.isArray(product.tags) ? product.tags : [],
        why: product.why || '',
        eligible: product.eligible !== false,
        tone: product.tone || '#0d9488',
        ...product,
      }))
    : [];
}

function normalizeTransactions(transactions = []) {
  return Array.isArray(transactions)
    ? transactions.map((transaction, index) => ({
        id: transaction.id || `tx-${index + 1}`,
        date: transaction.date || '',
        name: transaction.name || '',
        amount: numberOrZero(transaction.amount),
        type: transaction.type === 'income' ? 'income' : 'spend',
        category: transaction.category || '기타',
        fixed: Boolean(transaction.fixed),
        ...transaction,
      }))
    : [];
}

function normalizeRuntimeData(raw = {}) {
  const onboarding = typeof window !== 'undefined' ? loadOnboardingState() : null;
  const user = normalizeUser(raw.user, onboarding?.profile);
  const assets = normalizeAssets(raw.assets);
  const budget = normalizeBudget(raw.budget || { salary: assets.cashflow.income });
  const products = normalizeProducts(raw.products);
  const transactions = normalizeTransactions(raw.transactions);
  const sim = { ...DEFAULT_SIM, ...(raw.sim || {}) };

  return {
    raw,
    user,
    institutions: Array.isArray(raw.institutions) && raw.institutions.length ? raw.institutions : DEFAULT_INSTITUTIONS,
    assets,
    aiDiagnosis: { ...EMPTY_AI_DIAGNOSIS, ...(raw.aiDiagnosis || {}) },
    budget,
    products,
    sim,
    transactions,
    pensionPlan: { ...EMPTY_PENSION_PLAN, ...(raw.pensionPlan || {}) },
    fraudScenario: { ...EMPTY_FRAUD_SCENARIO, ...(raw.fraudScenario || {}) },
    digitalGuideSteps: Array.isArray(raw.digitalGuideSteps) && raw.digitalGuideSteps.length ? raw.digitalGuideSteps : DEFAULT_DIGITAL_GUIDE_STEPS,
  };
}

function getRuntimeSnapshot() {
  return normalizeRuntimeData(readRuntimeData());
}

function getSupabaseConfigStatus() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return 'Supabase 미연결';
  return `${SUPABASE_DATA_TABLE}/${SUPABASE_DATA_ID}`;
}

function getSupabaseRestUrl(path, params = '') {
  return `${SUPABASE_URL}/rest/v1/${path}${params ? `?${params}` : ''}`;
}

async function supabaseRequest(path, { method = 'GET', params = '', body, headers = {} } = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }
  const requestHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...headers,
  };
  if (method !== 'GET') {
    requestHeaders.Prefer = 'resolution=merge-duplicates,return=representation';
  }
  const response = await fetch(getSupabaseRestUrl(path, params), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST 오류 (${response.status}): ${text || response.statusText}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function unwrapSupabaseRuntimeRow(row) {
  if (!row) return {};
  return row.data || row.payload || row.runtime_data || row;
}

async function fetchSupabaseRuntimeData({ table = SUPABASE_DATA_TABLE, id = SUPABASE_DATA_ID } = {}) {
  const params = new URLSearchParams({
    select: '*',
    id: `eq.${id}`,
    limit: '1',
  });
  const rows = await supabaseRequest(table, { params: params.toString() });
  return unwrapSupabaseRuntimeRow(Array.isArray(rows) ? rows[0] : rows);
}

async function saveSupabaseRuntimeData(data, { table = SUPABASE_DATA_TABLE, id = SUPABASE_DATA_ID } = {}) {
  const rows = await supabaseRequest(table, {
    method: 'POST',
    body: {
      id,
      data,
      updated_at: new Date().toISOString(),
    },
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function refreshJaybisRuntimeData(endpoint = JAYBIS_DATA_ENDPOINT) {
  if (!endpoint && SUPABASE_URL && SUPABASE_ANON_KEY) {
    const data = await fetchSupabaseRuntimeData();
    return saveRuntimeData(data || {});
  }
  if (!endpoint) return getRuntimeSnapshot();
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`데이터 API 오류 (${response.status})`);
  const data = await response.json();
  return saveRuntimeData(data);
}

function useJaybisRuntimeData() {
  const [snapshot, setSnapshot] = useState(getRuntimeSnapshot);
  useEffect(() => {
    const onChange = (event) => setSnapshot(event?.detail || getRuntimeSnapshot());
    window.addEventListener('jaybis-data-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('jaybis-data-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return [snapshot, saveRuntimeData, refreshJaybisRuntimeData];
}

// ---- 앱 설정 ---------------------------------------------------------------
const APP_SETTINGS_KEY = 'jaybis.settings';
const ONBOARDING_STATE_KEY = 'jaybis.onboarding';
const DEFAULT_APP_SETTINGS = {
  seniorMode: false,
  easyLanguage: true,
  voiceGuide: true,
  ttsSpeed: 1,
  fraudProtection: true,
};

const DEFAULT_ONBOARDING_STATE = {
  completed: false,
  profile: null,
};

function loadAppSettings() {
  if (typeof window === 'undefined') return { ...DEFAULT_APP_SETTINGS };
  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_KEY);
    return { ...DEFAULT_APP_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch (err) {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

function saveAppSettings(patch) {
  const next = { ...loadAppSettings(), ...patch };
  if (typeof window !== 'undefined') {
    window.__JAYBIS_SETTINGS = next;
    if (next.voiceGuide === false && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {}
    }
    try {
      window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
    } catch (err) {}
    window.dispatchEvent(new CustomEvent('jaybis-settings-changed', { detail: next }));
  }
  return next;
}

function useAppSettings() {
  const [settings, setSettings] = useState(loadAppSettings());
  useEffect(() => {
    const onChange = (event) => setSettings(event?.detail || loadAppSettings());
    const onStorage = () => setSettings(loadAppSettings());
    window.addEventListener('jaybis-settings-changed', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('jaybis-settings-changed', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return [settings, saveAppSettings];
}

function defaultJaybisChatMessages() {
  const snapshot = getRuntimeSnapshot();
  const user = snapshot.user || EMPTY_USER;
  return [
    {
      id: 'g1',
      who: 'ai',
      kind: 'text',
      text: `${user.greeting || user.name}님, 여기서 바로 이야기해요. 필요한 금융 기능을 대화로 골라드릴게요.`,
    },
  ];
}

function sanitizeChatMessages(messages) {
  if (!Array.isArray(messages)) return defaultJaybisChatMessages();
  const cleaned = messages
    .filter((message) => message && message.who && message.kind)
    .map((message, index) => ({
      id: message.id || `m${Date.now()}-${index}`,
      ...message,
    }));
  return cleaned.length ? cleaned : defaultJaybisChatMessages();
}

function loadJaybisChatMessages(fallback = defaultJaybisChatMessages()) {
  if (typeof window === 'undefined') return sanitizeChatMessages(fallback);
  try {
    const raw = window.localStorage.getItem(JAYBIS_CHAT_KEY);
    return raw ? sanitizeChatMessages(JSON.parse(raw)) : sanitizeChatMessages(fallback);
  } catch (err) {
    return sanitizeChatMessages(fallback);
  }
}

function saveJaybisChatMessages(messages) {
  const next = sanitizeChatMessages(messages);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(JAYBIS_CHAT_KEY, JSON.stringify(next));
    } catch (err) {}
    window.dispatchEvent(new CustomEvent('jaybis-chat-changed', { detail: next }));
  }
  return next;
}

function clearJaybisChatMessages() {
  const next = defaultJaybisChatMessages();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(JAYBIS_CHAT_KEY);
    } catch (err) {}
    window.dispatchEvent(new CustomEvent('jaybis-chat-changed', { detail: next }));
  }
  return next;
}

function createJaybisMessageId() {
  return `m${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadOnboardingState() {
  if (typeof window === 'undefined') return { ...DEFAULT_ONBOARDING_STATE };
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STATE_KEY);
    return { ...DEFAULT_ONBOARDING_STATE, ...(raw ? JSON.parse(raw) : {}) };
  } catch (err) {
    return { ...DEFAULT_ONBOARDING_STATE };
  }
}

function saveOnboardingState(profile) {
  const next = {
    completed: true,
    profile: profile || null,
  };
  if (typeof window !== 'undefined') {
    window.__JAYBIS_ONBOARDING = next;
    try {
      window.localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(next));
    } catch (err) {}
    window.dispatchEvent(new CustomEvent('jaybis-onboarding-changed', { detail: next }));
    window.dispatchEvent(new CustomEvent('jaybis-data-changed', { detail: getRuntimeSnapshot() }));
  }
  return next;
}

function clearOnboardingState() {
  if (typeof window !== 'undefined') {
    window.__JAYBIS_ONBOARDING = { ...DEFAULT_ONBOARDING_STATE };
    try {
      window.localStorage.removeItem(ONBOARDING_STATE_KEY);
    } catch (err) {}
    window.dispatchEvent(new CustomEvent('jaybis-onboarding-changed', { detail: { ...DEFAULT_ONBOARDING_STATE } }));
    window.dispatchEvent(new CustomEvent('jaybis-data-changed', { detail: getRuntimeSnapshot() }));
  }
}

function speakText(text, { rate } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = rate || loadAppSettings().ttsSpeed || 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    return false;
  }
}

function summarizeEasy(text, settings = loadAppSettings()) {
  if (!settings.easyLanguage && !settings.seniorMode) return text;
  return text
    .replace(/또래 평균보다/g, '비슷한 나이대보다')
    .replace(/부채비율/g, '빚 비율')
    .replace(/현금흐름/g, '한 달 돈 흐름')
    .replace(/고정비/g, '매달 꼭 나가는 돈')
    .replace(/변동비/g, '쓰는 만큼 달라지는 돈')
    .replace(/은퇴준비율/g, '노후 준비 정도')
    .replace(/이상거래/g, '수상한 거래');
}

function analyzeCashflow(transactions = []) {
  const normalized = normalizeTransactions(transactions);
  const income = normalized.filter((t) => t.type === 'income').reduce((sum, t) => sum + numberOrZero(t.amount), 0);
  const spendItems = normalized.filter((t) => t.type === 'spend');
  const spend = spendItems.reduce((sum, t) => sum + Math.abs(numberOrZero(t.amount)), 0);
  const fixedItems = spendItems.filter((t) => t.fixed);
  const variableItems = spendItems.filter((t) => !t.fixed);
  const fixed = fixedItems.reduce((sum, t) => sum + Math.abs(numberOrZero(t.amount)), 0);
  const variable = variableItems.reduce((sum, t) => sum + Math.abs(numberOrZero(t.amount)), 0);
  const categories = spendItems.reduce((acc, t) => {
    const key = t.category || '기타';
    acc[key] = (acc[key] || 0) + Math.abs(numberOrZero(t.amount));
    return acc;
  }, {});
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, value]) => ({ label, value }));
  const left = income - spend;
  const savingsPotential = Math.max(
    0,
    Math.round(
      (
        fixedItems.filter((t) => ['구독', 'OTT'].includes(t.category)).reduce((sum, t) => sum + Math.abs(numberOrZero(t.amount)), 0) +
        variable * 0.12
      ) / 100
    ) * 100
  );
  const risk = income && left < income * 0.2 ? '주의' : '안정';
  return {
    income,
    spend,
    left,
    fixed,
    variable,
    recurringCount: fixedItems.length,
    fixedItems,
    variableItems,
    topCategories,
    savingsPotential,
    risk,
  };
}

function analyzeFraud(scenario = EMPTY_FRAUD_SCENARIO) {
  return {
    ...EMPTY_FRAUD_SCENARIO,
    ...scenario,
    canBlock: numberOrZero(scenario.riskScore) >= 70,
    summary: `위험 점수 ${numberOrZero(scenario.riskScore)}점으로 ${scenario.riskLabel || '데이터 없음'} 수준이에요.`,
  };
}

function simulate(monthly, simConfig = SIM) {
  const months = numberOrZero(simConfig.termMonths);
  const principal = numberOrZero(monthly) * months;
  const interest = principal * numberOrZero(simConfig.rateAnnual) * (months + 1) / (2 * 12);
  const govMatch = Math.min(numberOrZero(monthly), numberOrZero(simConfig.maxMonthly)) * months * numberOrZero(simConfig.govMatchRate);
  const total = principal + interest + govMatch;
  const taxSaved = interest * 0.154;
  return { principal, interest, govMatch, total, taxSaved };
}

const snapshot = getRuntimeSnapshot();

const USER = snapshot.user;
const MYDATA_INSTITUTIONS = snapshot.institutions;
const ASSETS = snapshot.assets;
const AI_DIAGNOSIS = snapshot.aiDiagnosis;
const BUDGET = snapshot.budget;
const PRODUCTS = snapshot.products;
const SIM = snapshot.sim;
const TRANSACTIONS = snapshot.transactions;
const PENSION_PLAN = snapshot.pensionPlan;
const FRAUD_SCENARIO = snapshot.fraudScenario;
const DIGITAL_GUIDE_STEPS = snapshot.digitalGuideSteps;

const CASHFLOW_INSIGHT = analyzeCashflow(TRANSACTIONS);
const FRAUD_INSIGHT = analyzeFraud(FRAUD_SCENARIO);

// ---- AI 에이전트 채팅 시드 --------------------------------------------------
const CHAT_QUICK = [
  '이번 달 어디에 많이 썼어?',
  '가입 가능한 상품 추천해줘',
  '내 자산 진단해줘',
  '고정비 정리하고 싶어',
];

const CHAT_TOOLSEQ = [
  { tool: '거래내역 조회', detail: '연결된 계좌·카드 데이터', ms: 900 },
  { tool: '카테고리 분류', detail: '수입·지출·고정비 분리', ms: 1100 },
  { tool: '절약 포인트 계산', detail: '반복 지출과 예산 초과 확인', ms: 800 },
  { tool: '추천 생성', detail: '조건 기반 다음 행동 제안', ms: 700 },
];

const FRAUD_TOOLSEQ = [
  { tool: '이체 조건 수집', detail: '금액 · 수취인 · 시간대 확인', ms: 700 },
  { tool: '이상거래 탐지', detail: '위험 신호 확인', ms: 1000 },
  { tool: '위험 점수 계산', detail: '경고 단계 산출', ms: 700 },
  { tool: '보호 안내 생성', detail: '차단 · 보류 · 재확인 안내', ms: 800 },
];

const PENSION_TOOLSEQ = [
  { tool: '연금 정보 조회', detail: '연금 데이터 연결', ms: 800 },
  { tool: '월 생활비 계산', detail: '필요 생활비와 비교', ms: 900 },
  { tool: '부족분 산출', detail: '현재 준비율 확인', ms: 800 },
  { tool: '단계별 안내 생성', detail: '실행 순서 제안', ms: 700 },
];

const GUIDE_TOOLSEQ = [
  { tool: '사용자 의도 분류', detail: '복잡한 요청을 쉬운 단계로 변환', ms: 700 },
  { tool: '안내 단계 생성', detail: '1단계부터 순서대로 정리', ms: 900 },
  { tool: '음성 안내 준비', detail: 'TTS 재생 문장 구성', ms: 700 },
];

if (JAYBIS_DATA_ENDPOINT) {
  refreshJaybisRuntimeData().catch((error) => {
    console.warn('JAYBIS data refresh failed:', error);
  });
}

Object.assign(window, {
  JAYBIS_DATA_KEY, JAYBIS_CHAT_KEY, JAYBIS_DATA_ENDPOINT,
  SUPABASE_URL, SUPABASE_DATA_TABLE, SUPABASE_DATA_ID,
  getRuntimeSnapshot, saveRuntimeData, refreshJaybisRuntimeData, useJaybisRuntimeData,
  getSupabaseConfigStatus, supabaseRequest, fetchSupabaseRuntimeData, saveSupabaseRuntimeData,
  defaultJaybisChatMessages, loadJaybisChatMessages, saveJaybisChatMessages, clearJaybisChatMessages, createJaybisMessageId,
  won, manwon, pct,
  USER, MYDATA_INSTITUTIONS, ASSETS, AI_DIAGNOSIS,
  BUDGET, PRODUCTS, SIM, simulate, CHAT_QUICK, CHAT_TOOLSEQ,
  TRANSACTIONS, PENSION_PLAN, FRAUD_SCENARIO, DIGITAL_GUIDE_STEPS,
  DEFAULT_APP_SETTINGS, loadAppSettings, saveAppSettings, useAppSettings,
  DEFAULT_ONBOARDING_STATE, loadOnboardingState, saveOnboardingState, clearOnboardingState,
  speakText, summarizeEasy, analyzeCashflow, analyzeFraud,
  CASHFLOW_INSIGHT, FRAUD_INSIGHT, FRAUD_TOOLSEQ, PENSION_TOOLSEQ, GUIDE_TOOLSEQ,
});
