/* =========================================================================
   제이비스 (JAYBIS) — Mock data layer
   생애주기 AI 금융비서 · 사회초년생 트랙 중심 페르소나
   ========================================================================= */

// ---- 포맷 헬퍼 --------------------------------------------------------------
const won = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');
// 만원 단위 (1,248만원)
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

// 마이데이터 연동 기관
const MYDATA_INSTITUTIONS = [
  { id: 'jb',   name: '전북은행',      type: '은행',   tone: '#0d9488', initial: 'JB' },
  { id: 'kwang',name: '광주은행',      type: '은행',   tone: '#1e6f5c', initial: '光' },
  { id: 'card', name: 'JB카드',        type: '카드',   tone: '#0f766e', initial: 'C' },
  { id: 'nps',  name: '국민연금공단',  type: '연금',   tone: '#475569', initial: '연' },
  { id: 'toss', name: '증권·투자',     type: '투자',   tone: '#334155', initial: '投' },
  { id: 'ins',  name: '보험',          type: '보험',   tone: '#64748b', initial: '保' },
];

// ---- 자산진단 (대시보드) ----------------------------------------------------
const ASSETS = {
  netWorth: 12480000,        // 순자산
  totalAssets: 15200000,     // 총자산
  totalDebt: 2720000,        // 총부채
  debtRatio: 17.9,           // 부채비율 (%)
  retireReady: 12,           // 은퇴준비율 (%)
  // 자산 구성
  composition: [
    { label: '예·적금',   value: 7200000, tone: '#0d9488' },
    { label: '투자',      value: 3100000, tone: '#14b8a6' },
    { label: '청약',      value: 1800000, tone: '#5eead4' },
    { label: '비상금',    value: 380000,  tone: '#99f6e4' },
  ],
  // 월 현금흐름 (만원 기준 입력은 원 단위로)
  cashflow: { income: 2850000, spend: 1980000, left: 870000 },
};

// AI 진단 코멘트 (대시보드)
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
  salary: 2850000,           // 세후 월급
  buckets: [
    { key: 'need', label: '필수',      ratio: 50, plan: 1425000, used: 1310000, tone: '#0d9488' },
    { key: 'want', label: '여유',      ratio: 30, plan: 855000,  used: 910000,  tone: '#f59e0b' },
    { key: 'save', label: '저축·투자', ratio: 20, plan: 570000,  used: 430000,  tone: '#0ea5e9' },
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
  // 또래 비교
  peers: [
    { label: '외식·배달', me: 290000, peer: 210000, over: true },
    { label: '구독·OTT', me: 48000, peer: 22000, over: true },
    { label: '저축률', me: 15, peer: 11, over: false, unit: '%' },
  ],
  // AI 경고
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

// 납입 시뮬레이터 기준값 (청년도약계좌)
const SIM = {
  productName: '청년도약계좌',
  minMonthly: 100000, maxMonthly: 700000, stepMonthly: 50000, defaultMonthly: 500000,
  termMonths: 60, rateAnnual: 0.06,
  govMatchRate: 0.033,   // 정부기여 근사
  taxFreeNote: '이자소득 비과세',
};

// 만기 수령액 추정 (단리 근사 + 정부기여)
function simulate(monthly) {
  const months = SIM.termMonths;
  const principal = monthly * months;
  // 단리 평균 잔액 기준 이자 근사
  const interest = principal * SIM.rateAnnual * (months + 1) / (2 * 12);
  const govMatch = Math.min(monthly, 700000) * months * SIM.govMatchRate;
  const total = principal + interest + govMatch;
  const taxSaved = interest * 0.154; // 비과세로 아끼는 세금 근사
  return { principal, interest, govMatch, total, taxSaved };
}

// ---- AI 에이전트 채팅 시드 --------------------------------------------------
const CHAT_QUICK = [
  '이번 달 어디에 많이 썼어?',
  '청년 상품 추천해줘',
  '내 자산 진단해줘',
  '구독 정리하고 싶어',
];

// 에이전트가 "이번 달 소비"를 분석하는 도구 호출 시퀀스
const CHAT_TOOLSEQ = [
  { tool: '거래내역 조회', detail: '최근 30일 · 카드+계좌', ms: 900 },
  { tool: 'MCC 카테고리 분류', detail: '142건 분류 완료', ms: 1100 },
  { tool: '고정비 자동 식별', detail: '구독 3건 · 정기결제 5건', ms: 800 },
  { tool: '또래 벤치마크 비교', detail: '27세 · 수도권', ms: 700 },
];

Object.assign(window, {
  won, manwon, pct,
  USER, MYDATA_INSTITUTIONS, ASSETS, AI_DIAGNOSIS,
  BUDGET, PRODUCTS, SIM, simulate, CHAT_QUICK, CHAT_TOOLSEQ,
});
