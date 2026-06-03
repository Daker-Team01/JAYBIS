/* =========================================================================
   제이비스 (JAYBIS) — Mock data layer
   생애주기 AI 금융비서 · 사회초년생 트랙 중심 페르소나
   ========================================================================= */

const { useState, useEffect } = window.React;

// ---- 포맷 헬퍼 --------------------------------------------------------------
const won = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');
const manwon = (n) => Math.round(n / 10000).toLocaleString('ko-KR') + '만';
const pct = (n, d = 0) => n.toFixed(d) + '%';

// ---- 사용자 페르소나 --------------------------------------------------------
const USER = {
  name: '김도윤',
  age: 27,
  job: '마케팅 1년차',
  track: '사회초년생',
  joinedMonths: 14,
  greeting: '도윤',
};

const MYDATA_INSTITUTIONS = [
  { id: 'jb', name: '전북은행', type: '은행', tone: '#0d9488', initial: 'JB' },
  { id: 'kwang', name: '광주은행', type: '은행', tone: '#1e6f5c', initial: '光' },
  { id: 'card', name: 'JB카드', type: '카드', tone: '#0f766e', initial: 'C' },
  { id: 'nps', name: '국민연금공단', type: '연금', tone: '#475569', initial: '연' },
  { id: 'toss', name: '증권·투자', type: '투자', tone: '#334155', initial: '投' },
  { id: 'ins', name: '보험', type: '보험', tone: '#64748b', initial: '保' },
];

// ---- 자산진단 (대시보드) ----------------------------------------------------
const ASSETS = {
  netWorth: 12480000,
  totalAssets: 15200000,
  totalDebt: 2720000,
  debtRatio: 17.9,
  retireReady: 12,
  composition: [
    { label: '예·적금', value: 7200000, tone: '#0d9488' },
    { label: '투자', value: 3100000, tone: '#14b8a6' },
    { label: '청약', value: 1800000, tone: '#5eead4' },
    { label: '비상금', value: 380000, tone: '#99f6e4' },
  ],
  cashflow: { income: 2850000, spend: 1980000, left: 870000 },
};

const AI_DIAGNOSIS = {
  grade: '성장 출발',
  comment: '도윤님은 또래 평균보다 저축 여력이 18% 높아요. 지금 청년도약계좌를 시작하면 5년 뒤 약 5,000만 원을 모을 수 있어요.',
  signals: [
    { label: '저축 여력', status: 'good', note: '또래 +18%' },
    { label: '부채 건전성', status: 'good', note: '양호' },
    { label: '비상금', status: 'warn', note: '1.4개월분' },
  ],
};

// ---- 청년 예산설계 (50/30/20) ----------------------------------------------
const BUDGET = {
  salary: 2850000,
  buckets: [
    { key: 'need', label: '필수', ratio: 50, plan: 1425000, used: 1310000, tone: '#0d9488' },
    { key: 'want', label: '여유', ratio: 30, plan: 855000, used: 910000, tone: '#f59e0b' },
    { key: 'save', label: '저축·투자', ratio: 20, plan: 570000, used: 430000, tone: '#0ea5e9' },
  ],
  categories: [
    { label: '주거·월세', bucket: 'need', used: 520000, plan: 550000, icon: 'home' },
    { label: '교통·통신', bucket: 'need', used: 180000, plan: 200000, icon: 'bus' },
    { label: '식비(장보기)', bucket: 'need', used: 340000, plan: 360000, icon: 'cart' },
    { label: '외식·배달', bucket: 'want', used: 290000, plan: 210000, icon: 'food', warn: true },
    { label: '쇼핑', bucket: 'want', used: 268000, plan: 300000, icon: 'bag' },
    { label: '구독·OTT', bucket: 'want', used: 48000, plan: 30000, icon: 'play', warn: true },
    { label: '청년도약계좌', bucket: 'save', used: 300000, plan: 400000, icon: 'piggy' },
    { label: '투자', bucket: 'save', used: 130000, plan: 170000, icon: 'chart' },
  ],
  peers: [
    { label: '외식·배달', me: 290000, peer: 210000, over: true },
    { label: '구독·OTT', me: 48000, peer: 22000, over: true },
    { label: '저축률', me: 15, peer: 11, over: false, unit: '%' },
  ],
  alerts: [
    { type: 'warn', title: '구독 3개가 겹쳐요', body: '넷플릭스·티빙·유튜브 프리미엄이 동시에 결제 중이에요. 하나만 남기면 월 18,500원을 아껴요.', save: 18500 },
    { type: 'warn', title: '외식·배달이 또래보다 38% 높아요', body: '이번 달 배달 14회. 주 2회로 줄이면 월 80,000원이 남아요.', save: 80000 },
  ],
  nextMonthTip: '다음 달 여유 예산을 80,000원 줄이고 저축으로 옮기면 50/30/20 균형이 맞아요.',
};

// ---- 청년 금융상품 로드맵 ---------------------------------------------------
const PRODUCTS = [
  {
    id: 'doyak', rank: 1, name: '청년도약계좌', issuer: '전북은행',
    tagline: '5년 만기 · 정부기여금 + 비과세',
    rate: '연 6.0%', maxMonthly: 700000, term: 60, maturity: 50550000,
    benefit: '정부기여 최대 144만원', tags: ['무주택 무관', '소득 7,500만↓'],
    why: '저축 여력이 충분하고 비과세 혜택이 가장 커요. 1순위로 시작하세요.',
    eligible: true, tone: '#0d9488',
  },
  {
    id: 'cheongan', rank: 2, name: '청년 주택드림 청약통장', issuer: '전북은행',
    tagline: '내 집 마련 + 우대금리',
    rate: '연 4.5%', maxMonthly: 1000000, term: 24, maturity: 0,
    benefit: '청약가점 + 전용 대출', tags: ['무주택', '만 19~34세'],
    why: '청약 가점을 미리 쌓아두면 주택드림 대출까지 연결돼요.',
    eligible: true, tone: '#14b8a6',
  },
  {
    id: 'sodeuk', rank: 3, name: '청년형 소득공제 장기펀드', issuer: '증권 연계',
    tagline: '연말정산 40% 소득공제',
    rate: '실적 배당', maxMonthly: 500000, term: 36, maturity: 0,
    benefit: '납입액 40% 공제', tags: ['총급여 5,000만↓'],
    why: '연말정산 환급을 늘리고 싶다면 여유 자금으로 추가하세요.',
    eligible: true, tone: '#5eead4',
  },
];

// ---- 시뮬레이터 -------------------------------------------------------------
const SIM = {
  productName: '청년도약계좌',
  minMonthly: 100000,
  maxMonthly: 700000,
  stepMonthly: 50000,
  defaultMonthly: 500000,
  termMonths: 60,
  rateAnnual: 0.06,
  govMatchRate: 0.033,
  taxFreeNote: '이자소득 비과세',
};

function simulate(monthly) {
  const months = SIM.termMonths;
  const principal = monthly * months;
  const interest = principal * SIM.rateAnnual * (months + 1) / (2 * 12);
  const govMatch = Math.min(monthly, 700000) * months * SIM.govMatchRate;
  const total = principal + interest + govMatch;
  const taxSaved = interest * 0.154;
  return { principal, interest, govMatch, total, taxSaved };
}

// ---- 더미 거래 / 보안 / 연금 -----------------------------------------------
const DUMMY_TRANSACTIONS = [
  { id: 't1', date: '2026-05-28', name: '급여', amount: 2850000, type: 'income', category: '월급', fixed: true },
  { id: 't2', date: '2026-05-28', name: '청년도약계좌 자동이체', amount: -300000, type: 'spend', category: '저축', fixed: true },
  { id: 't3', date: '2026-05-27', name: '월세', amount: -520000, type: 'spend', category: '주거', fixed: true },
  { id: 't4', date: '2026-05-26', name: '통신비', amount: -82000, type: 'spend', category: '통신', fixed: true },
  { id: 't5', date: '2026-05-24', name: '구독 결제', amount: -19800, type: 'spend', category: '구독', fixed: true },
  { id: 't6', date: '2026-05-22', name: '배달의민족', amount: -46000, type: 'spend', category: '외식', fixed: false },
  { id: 't7', date: '2026-05-21', name: '카페', amount: -18000, type: 'spend', category: '식비', fixed: false },
  { id: 't8', date: '2026-05-18', name: '교통카드', amount: -54000, type: 'spend', category: '교통', fixed: false },
  { id: 't9', date: '2026-05-15', name: '쇼핑', amount: -92000, type: 'spend', category: '쇼핑', fixed: false },
  { id: 't10', date: '2026-05-12', name: '국민연금 추정', amount: -100000, type: 'spend', category: '연금', fixed: true },
  { id: 't11', date: '2026-05-08', name: '생활비 환급', amount: 40000, type: 'income', category: '기타', fixed: false },
  { id: 't12', date: '2026-05-04', name: 'OTT', amount: -12800, type: 'spend', category: '구독', fixed: true },
];

const PENSION_PLAN = {
  age: 27,
  targetLivingCost: 1800000,
  currentMonthlyPension: 320000,
  expectedRetireAge: 65,
  monthlyGap: 1480000,
  prepRate: 12,
  steps: [
    '국민연금 납입 이력 확인',
    '퇴직연금·IRP 추가 적립',
    '월 생활비 목표 재설정',
    '연금 수령 시뮬레이션 점검',
  ],
};

const FRAUD_SCENARIO = {
  riskScore: 87,
  riskLabel: '높음',
  amount: 1850000,
  channel: '모르는 수취인 이체',
  reasons: [
    '처음 보는 계좌로 고액 이체',
    '짧은 시간 안에 반복 시도',
    '야간 시간대 이체',
  ],
  actions: [
    '이체를 10분 보류하세요',
    '수취인과 금액을 다시 확인하세요',
    '보호자 또는 상담센터에 확인하세요',
  ],
};

const DIGITAL_GUIDE_STEPS = [
  { step: 1, title: '상황 이해', body: '지금 무엇이 필요한지 한 문장으로 정리해요.' },
  { step: 2, title: '핵심 정보 확인', body: '금액, 계좌, 날짜처럼 꼭 필요한 정보만 봐요.' },
  { step: 3, title: '추천 행동 선택', body: '저축·이체·중단 중 가장 안전한 방법을 골라요.' },
  { step: 4, title: '음성 안내 확인', body: '원하면 TTS로 다시 들려드려요.' },
];

// ---- 앱 설정 ---------------------------------------------------------------
const APP_SETTINGS_KEY = 'jaybis.settings';
const DEFAULT_APP_SETTINGS = {
  seniorMode: false,
  easyLanguage: true,
  voiceGuide: true,
  ttsSpeed: 1,
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

function analyzeCashflow(transactions = DUMMY_TRANSACTIONS) {
  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const spendItems = transactions.filter((t) => t.type === 'spend');
  const spend = spendItems.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const fixedItems = spendItems.filter((t) => t.fixed);
  const variableItems = spendItems.filter((t) => !t.fixed);
  const fixed = fixedItems.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const variable = variableItems.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const categories = spendItems.reduce((acc, t) => {
    const key = t.category;
    acc[key] = (acc[key] || 0) + Math.abs(t.amount);
    return acc;
  }, {});
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, value]) => ({ label, value }));
  const recurringCount = fixedItems.length;
  const left = income - spend;
  const savingsPotential = Math.max(
    0,
    Math.round(
      (
        fixedItems.filter((t) => ['구독', 'OTT'].includes(t.category)).reduce((sum, t) => sum + Math.abs(t.amount), 0) +
        variable * 0.12
      ) / 100
    ) * 100
  );
  const risk = left < income * 0.2 ? '주의' : '안정';
  return {
    income,
    spend,
    left,
    fixed,
    variable,
    recurringCount,
    fixedItems,
    variableItems,
    topCategories,
    savingsPotential,
    risk,
  };
}

function analyzeFraud(scenario = FRAUD_SCENARIO) {
  return {
    ...scenario,
    canBlock: true,
    summary: `위험 점수 ${scenario.riskScore}점으로 ${scenario.riskLabel} 수준이에요.`,
  };
}

const CASHFLOW_INSIGHT = analyzeCashflow();
const FRAUD_INSIGHT = analyzeFraud();

// ---- AI 에이전트 채팅 시드 --------------------------------------------------
const CHAT_QUICK = [
  '이번 달 어디에 많이 썼어?',
  '청년 상품 추천해줘',
  '내 자산 진단해줘',
  '구독 정리하고 싶어',
];

const CHAT_TOOLSEQ = [
  { tool: '거래내역 조회', detail: '최근 30일 · 카드+계좌', ms: 900 },
  { tool: 'MCC 카테고리 분류', detail: '142건 분류 완료', ms: 1100 },
  { tool: '고정비 자동 식별', detail: '구독 3건 · 정기결제 5건', ms: 800 },
  { tool: '또래 벤치마크 비교', detail: '27세 · 수도권', ms: 700 },
];

const FRAUD_TOOLSEQ = [
  { tool: '이체 조건 수집', detail: '금액 · 수취인 · 시간대 확인', ms: 700 },
  { tool: '이상거래 탐지', detail: '룰 기반 위험 신호 확인', ms: 1000 },
  { tool: '위험 점수 계산', detail: '경고 단계 산출', ms: 700 },
  { tool: '보호 안내 생성', detail: '차단 · 보류 · 재확인 안내', ms: 800 },
];

const PENSION_TOOLSEQ = [
  { tool: '연금 정보 조회', detail: '국민연금 · IRP · 퇴직연금', ms: 800 },
  { tool: '월 생활비 계산', detail: '필요 생활비와 비교', ms: 900 },
  { tool: '부족분 산출', detail: '현재 준비율 확인', ms: 800 },
  { tool: '단계별 안내 생성', detail: '실행 순서 제안', ms: 700 },
];

const GUIDE_TOOLSEQ = [
  { tool: '사용자 의도 분류', detail: '복잡한 요청을 쉬운 단계로 변환', ms: 700 },
  { tool: '안내 단계 생성', detail: '1단계부터 순서대로 정리', ms: 900 },
  { tool: '음성 안내 준비', detail: 'TTS 재생 문장 구성', ms: 700 },
];

Object.assign(window, {
  won, manwon, pct,
  USER, MYDATA_INSTITUTIONS, ASSETS, AI_DIAGNOSIS,
  BUDGET, PRODUCTS, SIM, simulate, CHAT_QUICK, CHAT_TOOLSEQ,
  DUMMY_TRANSACTIONS, PENSION_PLAN, FRAUD_SCENARIO, DIGITAL_GUIDE_STEPS,
  DEFAULT_APP_SETTINGS, loadAppSettings, saveAppSettings, useAppSettings,
  speakText, summarizeEasy, analyzeCashflow, analyzeFraud,
  CASHFLOW_INSIGHT, FRAUD_INSIGHT, FRAUD_TOOLSEQ, PENSION_TOOLSEQ, GUIDE_TOOLSEQ,
});
