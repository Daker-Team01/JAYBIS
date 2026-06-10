/* =========================================================================
   제이비스 (JAYBIS) — 금융비서 Agent Tool Layer
   GPT function calling에 그대로 연결할 수 있는 함수 스키마 + 로컬 실행기
   ========================================================================= */

const {
  USER, BUDGET, PRODUCTS, SIM, TRANSACTIONS,
  getRuntimeSnapshot,
  analyzeCashflow, simulate, won, manwon, pct,
} = window;

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_CONFIGURED = Boolean(OPENAI_API_KEY);
const SUPABASE_AGENT_FUNCTION = import.meta.env.VITE_SUPABASE_AGENT_FUNCTION || 'jaybis-agent';
const USE_SUPABASE_AGENT = import.meta.env.VITE_USE_SUPABASE_AGENT !== 'false';
let OPENAI_LAST_ERROR = '';
let SUPABASE_AGENT_LAST_ERROR = '';

const JAYBIS_AI_TOOLS = [
  {
    type: 'function',
    name: 'first_salary_budget_design',
    description: '사회초년생의 첫 월급 또는 세후 월급을 기준으로 필수비, 여유비, 저축/투자 예산을 설계한다.',
    parameters: {
      type: 'object',
      properties: {
        monthlySalary: { type: 'number', description: '세후 월급. 원 단위.' },
        fixedCost: { type: ['number', 'null'], description: '월세, 통신비 등 매달 고정적으로 나가는 돈. 원 단위.' },
        savingsGoal: { type: ['string', 'null'], description: '비상금, 독립, 전세, 여행 등 사용자가 말한 목표.' },
        budgetRule: { type: ['string', 'null'], enum: ['50_30_20', 'aggressive_saving', 'starter_safe'], description: '적용할 예산 규칙.' },
      },
      required: ['monthlySalary', 'fixedCost', 'savingsGoal', 'budgetRule'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'mydata_spending_diagnosis',
    description: '마이데이터 또는 수기 입력 거래내역을 분석해 소비 카테고리, 고정비, 절약 가능액, 위험 신호를 진단한다.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['mydata', 'manual'], description: '거래내역 입력 방식.' },
        monthlySalary: { type: ['number', 'null'], description: '세후 월급. 원 단위.' },
        transactions: {
          type: ['array', 'null'],
          description: '수기 입력 거래내역. 없으면 연결된 마이데이터 샘플을 사용한다.',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              name: { type: 'string' },
              amount: { type: 'number' },
              type: { type: 'string', enum: ['income', 'spend'] },
              category: { type: 'string' },
              fixed: { type: 'boolean' },
            },
            required: ['date', 'name', 'amount', 'type', 'category', 'fixed'],
            additionalProperties: false,
          },
        },
      },
      required: ['source', 'monthlySalary', 'transactions'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'recommend_youth_financial_products',
    description: '나이, 소득, 무주택 여부, 월 납입 여력으로 가입 가능한 청년 금융상품을 필터링하고 우선순위 로드맵과 납입 시뮬레이션을 만든다.',
    parameters: {
      type: 'object',
      properties: {
        age: { type: 'number', description: '만 나이.' },
        annualIncome: { type: 'number', description: '연 소득 또는 총급여. 원 단위.' },
        isHomeless: { type: 'boolean', description: '무주택 여부.' },
        monthlySavingsCapacity: { type: ['number', 'null'], description: '월 저축 가능액. 원 단위.' },
        priority: { type: ['string', 'null'], enum: ['tax_free', 'housing', 'tax_deduction', 'balanced'], description: '사용자 우선순위.' },
      },
      required: ['age', 'annualIncome', 'isHomeless', 'monthlySavingsCapacity', 'priority'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'coach_financial_product_context',
    description: '금융상품 추천 흐름 안에서 사용자가 이해해야 할 비과세, 정부기여금, 청약, 소득공제 같은 금융 기초 개념을 설명한다.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: ['string', 'null'], description: '관련 상품 id. 예: doyak, cheongan, sodeuk.' },
        concept: { type: ['string', 'null'], description: '설명할 금융 개념.' },
        userQuestion: { type: 'string', description: '사용자의 질문 원문.' },
        userLevel: { type: ['string', 'null'], enum: ['beginner', 'normal'], description: '설명 난이도.' },
      },
      required: ['productId', 'concept', 'userQuestion', 'userLevel'],
      additionalProperties: false,
    },
    strict: true,
  },
];

const TOOL_SEQUENCES = {
  first_salary_budget_design: [
    { tool: '월급 정보 확인', detail: '세후 월급 기준 설정', ms: 520 },
    { tool: '예산 규칙 적용', detail: '필수·여유·저축 분리', ms: 720 },
    { tool: '초년생 안전장치 점검', detail: '비상금과 고정비 확인', ms: 680 },
  ],
  mydata_spending_diagnosis: [
    { tool: '거래내역 수집', detail: '마이데이터 또는 수기 입력', ms: 650 },
    { tool: '소비 카테고리 분류', detail: '고정비·변동비 분리', ms: 880 },
    { tool: '절약 포인트 계산', detail: '구독·외식·반복 지출 확인', ms: 720 },
  ],
  recommend_youth_financial_products: [
    { tool: '가입 조건 필터링', detail: '나이·소득·무주택 여부', ms: 680 },
    { tool: '우선순위 로드맵 생성', detail: '혜택과 실행 난이도 비교', ms: 820 },
    { tool: '납입 시뮬레이션', detail: '월 납입액별 만기 금액 계산', ms: 700 },
  ],
  coach_financial_product_context: [
    { tool: '추천 맥락 확인', detail: '상품과 질문 연결', ms: 520 },
    { tool: '필요 개념 선택', detail: '비과세·정부기여금·청약 등', ms: 620 },
    { tool: '쉬운 설명 생성', detail: '가입 판단에 필요한 만큼만', ms: 720 },
  ],
};

const STARTER_FEATURE_CHIPS = [
  '첫 월급으로 예산 짜줘',
  '마이데이터로 소비 진단해줘',
  '수기로 소비 입력할래',
  '청년 금융상품 추천해줘',
  '추천 상품이 왜 좋아?',
];

const JAYBIS_SYSTEM_PROMPT = [
  '너는 제이비스(JAYBIS)라는 한국어 금융비서다.',
  '대상은 사회초년생이며, 첫 월급 예산, 마이데이터/수기 소비 진단, 청년 금융상품 추천, 상품 추천 흐름 속 금융코칭을 다룬다.',
  '사용자의 의도를 파악해 필요한 경우에만 도구를 호출하고, 도구 결과를 바탕으로 짧고 친절하게 답한다.',
  '설명은 쉬운 한국어로 하며, "왜 이 상품인지"와 "지금 사용자가 다음에 무엇을 하면 되는지"를 함께 안내한다.',
  '금융상품 추천은 나이, 소득, 무주택 여부, 납입 가능액을 기준으로 필터링하고, 코칭은 상품 추천 흐름 안에 자연스럽게 섞는다.',
  '응답은 불필요하게 길지 않게, 실행 가능한 다음 행동을 포함해 마무리한다.',
].join(' ');

const JAYBIS_MARKDOWN_STYLE_PROMPT = [
  '출력은 항상 GitHub Flavored Markdown 형식으로 정리한다.',
  '첫 줄은 상황에 맞는 이모지 1개와 굵은 한 줄 요약으로 시작하고, 본문은 짧은 문단과 bullet list를 섞어 읽기 쉽게 만든다.',
  '이모지는 예산 💰, 소비 진단 📊, 저축 🐷, 경고 ⚠️, 다음 행동 ✅처럼 의미가 분명한 것만 섹션당 최대 1개 사용한다.',
  '금액, 비율, 실행 항목처럼 중요한 값은 **굵게** 강조한다.',
  '예산·소비·상품 비교처럼 항목이 3개 이상이면 표 대신 간결한 bullet list를 우선 사용한다.',
  '사용자가 바로 누르거나 입력해야 하는 행동은 마지막에 `다음 행동`으로 1개만 제안한다.',
  '불필요한 인사말, 긴 서론, 코드블록은 쓰지 않는다.',
].join(' ');

const TONE_PROMPTS = {
  friendly: '말투는 따뜻하고 친근하게, 마치 오랜 친구가 곁에서 도와주는 느낌으로 대화한다. 사용자의 상황에 공감하는 말을 먼저 하고, "같이 해봐요", "걱정 마세요", "잘 하고 계세요", "진짜 잘 하셨어요"처럼 응원과 안심을 자연스럽게 녹인다. 딱딱하거나 사무적인 표현, 어려운 금융 용어는 쓰지 않고, 쉽고 부드러운 말로 풀어서 설명한다. 문장 끝에 따뜻한 여운이 남도록 마무리한다.',
  formal:   '표준적인 존댓말을 사용하여 정중하고 신뢰감 있게 안내한다. 과도한 감정 표현 없이 필요한 정보를 명확하고 차분하게 전달한다.',
  concise:  '최대한 짧고 핵심만 전달한다. 인사·공감·부연 설명은 모두 생략한다. 모든 답변은 불렛·번호 목록·표 형식으로만 구성하고, 산문형 문장은 쓰지 않는다.',
};

function buildJaybisSystemPrompt(extraPrompts = []) {
  return [
    JAYBIS_SYSTEM_PROMPT,
    JAYBIS_MARKDOWN_STYLE_PROMPT,
    ...extraPrompts,
  ].filter(Boolean).join('\n\n');
}

function extractWonAmount(text) {
  const normalized = text.replace(/,/g, '').replace(/\s/g, '');
  const man = normalized.match(/(\d+(?:\.\d+)?)만원/);
  if (man) return Math.round(Number(man[1]) * 10000);
  const wonMatch = normalized.match(/(\d{6,})원?/);
  if (wonMatch) return Number(wonMatch[1]);
  return null;
}

function designFirstSalaryBudget({ monthlySalary, fixedCost = 0, savingsGoal = '비상금', budgetRule = '50_30_20' }) {
  const snapshot = getRuntimeSnapshot();
  const budget = snapshot.budget || BUDGET;
  const salary = monthlySalary || budget.salary;
  const ratios = budgetRule === 'aggressive_saving'
    ? { need: 45, want: 20, save: 35 }
    : budgetRule === 'starter_safe'
      ? { need: 55, want: 25, save: 20 }
      : { need: 50, want: 30, save: 20 };
  const buckets = [
    { key: 'need', label: '필수비', ratio: ratios.need, amount: Math.round(salary * ratios.need / 100) },
    { key: 'want', label: '여유비', ratio: ratios.want, amount: Math.round(salary * ratios.want / 100) },
    { key: 'save', label: '저축·투자', ratio: ratios.save, amount: Math.round(salary * ratios.save / 100) },
  ];
  const fixedPressure = salary
    ? (fixedCost ? fixedCost / salary * 100 : (budget.buckets?.[0]?.used || 0) / salary * 100)
    : 0;
  const emergencyMonthly = salary ? Math.max(100000, Math.round(salary * 0.12 / 10000) * 10000) : 0;

  return {
    salary,
    buckets,
    fixedPressure,
    emergencyMonthly,
    savingsGoal,
    summary: `세후 월급 ${won(salary)} 기준으로 필수비 ${won(buckets[0].amount)}, 여유비 ${won(buckets[1].amount)}, 저축·투자 ${won(buckets[2].amount)}로 시작하면 좋아요.`,
    nextChips: ['월급 250만원이면?', '비상금은 얼마 모아야 해?', '소비 진단도 해줘'],
  };
}

function diagnoseSpending({ source = 'mydata', transactions, monthlySalary }) {
  const snapshot = getRuntimeSnapshot();
  const budget = snapshot.budget || BUDGET;
  const runtimeTransactions = snapshot.transactions || TRANSACTIONS;
  const insight = analyzeCashflow(transactions?.length ? transactions : runtimeTransactions);
  const salary = monthlySalary || insight.income || budget.salary;
  const spendRate = salary ? insight.spend / salary * 100 : 0;
  const warning = spendRate > 75 ? '높음' : spendRate > 60 ? '주의' : '안정';
  return {
    ...insight,
    source,
    salary,
    spendRate,
    warning,
    summary: `${source === 'manual' ? '수기 입력' : '마이데이터'} 기준으로 이번 달 지출은 ${won(insight.spend)}예요. 월급 대비 소비율은 ${pct(spendRate, 1)}라서 ${warning} 단계로 볼 수 있어요.`,
    nextChips: ['가장 많이 쓴 항목은?', '고정비 줄이는 법 알려줘', '청년 상품 추천으로 이어줘'],
  };
}

function recommendYouthProducts({ age = USER.age, annualIncome = 34200000, isHomeless = true, monthlySavingsCapacity = SIM.defaultMonthly, priority = 'balanced' }) {
  const snapshot = getRuntimeSnapshot();
  const products = snapshot.products || PRODUCTS;
  const sim = snapshot.sim || SIM;
  const user = snapshot.user || USER;
  if (!products.length) {
    const monthly = Math.min(Math.max(monthlySavingsCapacity || 0, sim.minMonthly), sim.maxMonthly);
    const simulation = simulate(monthly, sim);
    return {
      products: [],
      monthly,
      simulation,
      top: null,
      summary: '아직 연결된 금융상품 데이터가 없어요. 상품 API 또는 jaybis.realData의 products 배열이 들어오면 가입 조건과 우선순위를 계산할 수 있어요.',
      nextChips: ['예산부터 설계해줘', '소비 진단해줘', '데이터 연결 방법 알려줘'],
    };
  }

  const scored = products.map((p) => {
    let eligible = true;
    const reasons = [];
    if (age < 19 || age > 34) {
      eligible = false;
      reasons.push('만 19~34세 조건을 벗어나요');
    }
    if (p.id === 'doyak' && annualIncome > 75000000) {
      eligible = false;
      reasons.push('총급여 7,500만원 이하 조건이 필요해요');
    }
    if (p.id === 'cheongan' && !isHomeless) {
      eligible = false;
      reasons.push('무주택 조건이 필요해요');
    }
    if (p.id === 'sodeuk' && annualIncome > 50000000) {
      eligible = false;
      reasons.push('총급여 5,000만원 이하 조건이 필요해요');
    }
    const priorityBoost =
      (priority === 'housing' && p.id === 'cheongan') ||
      (priority === 'tax_deduction' && p.id === 'sodeuk') ||
      (priority === 'tax_free' && p.id === 'doyak') ? -2 : 0;
    return {
      ...p,
      eligible,
      reasons,
      roadmapRank: eligible ? Math.max(1, p.rank + priorityBoost) : 99,
    };
  }).sort((a, b) => a.roadmapRank - b.roadmapRank);

  const monthly = Math.min(Math.max(monthlySavingsCapacity || 0, sim.minMonthly), sim.maxMonthly);
  const simulation = simulate(monthly, sim);
  const top = scored.find((p) => p.eligible) || scored[0];

  return {
    products: scored,
    monthly,
    simulation,
    top,
    summary: `${user.greeting}님 조건이면 ${top.name}을 1순위로 볼게요. 월 ${manwon(monthly)}원씩 넣으면 5년 뒤 예상 수령액은 ${won(simulation.total)} 정도예요.`,
    nextChips: [`${top.name}가 왜 1순위야?`, '월 얼마씩 넣어야 해?', '비과세가 뭐야?'],
  };
}

function coachProductContext({ productId = 'doyak', concept, userQuestion = '', userLevel = 'beginner' }) {
  const products = getRuntimeSnapshot().products || PRODUCTS;
  const product = products.find((p) => p.id === productId) || products[0] || { id: 'unknown', name: '해당 상품', why: '' };
  const q = `${concept || ''} ${userQuestion}`;
  let title = '추천 이유';
  let explanation = products.length
    ? `${product.name}은 지금 가입 가능성과 혜택이 커서 추천 우선순위가 높아요. 핵심은 내 돈을 오래 묶는 대신 금리, 세금 혜택, 정부 지원을 함께 받는 구조예요.`
    : '아직 연결된 상품 데이터가 없어 특정 상품 기준의 코칭은 제한돼요. 상품 데이터가 들어오면 금리, 세제 혜택, 가입 조건을 함께 설명할 수 있어요.';

  if (/비과세|세금/.test(q)) {
    title = '비과세';
    explanation = '비과세는 이자에 붙는 세금을 내지 않는다는 뜻이에요. 같은 이자를 받아도 세금을 덜 내니 실제 손에 남는 돈이 커져요.';
  } else if (/정부|기여/.test(q)) {
    title = '정부기여금';
    explanation = '정부기여금은 내가 매달 저축할 때 정부가 조건에 맞춰 더 얹어주는 돈이에요. 그래서 단순 적금보다 만기 때 체감 수익이 커질 수 있어요.';
  } else if (/청약|주택|무주택/.test(q)) {
    title = '청약과 무주택';
    explanation = '청약은 나중에 집을 마련할 기회를 쌓는 통장이에요. 무주택 조건이 붙는 상품은 실제 내 집 마련 가능성이 높은 사람에게 혜택을 집중하려는 목적이 있어요.';
  } else if (/소득공제|연말정산/.test(q)) {
    title = '소득공제';
    explanation = '소득공제는 세금을 계산하기 전에 과세 대상 소득을 줄여주는 장치예요. 연말정산 때 돌려받을 가능성이 생기지만 투자상품은 원금 변동 위험도 같이 봐야 해요.';
  }

  const suffix = userLevel === 'beginner' ? ' 가입 전에는 중도해지 조건과 매달 넣어도 생활비가 흔들리지 않는지부터 확인하면 됩니다.' : '';
  return {
    product,
    title,
    explanation: explanation + suffix,
    summary: `${product.name}을 이해하려면 먼저 "${title}"만 잡으면 돼요. ${explanation}`,
    nextChips: ['그럼 얼마 넣을까?', '다른 상품이랑 비교해줘', '가입 순서 알려줘'],
  };
}

function selectJaybisToolCall(text, context = {}) {
  const snapshot = getRuntimeSnapshot();
  const user = snapshot.user || USER;
  const budget = snapshot.budget || BUDGET;
  const sim = snapshot.sim || SIM;
  const t = text.replace(/\s/g, '');
  const amount = extractWonAmount(text);
  const mentionsBudget = /(예산|생활비|월급관리|50\/30\/20|503020)/.test(t);
  const wantsBudgetDesign = (
    /(첫월급|50\/30\/20|503020)/.test(t) ||
    (mentionsBudget && /(짜|짜줘|설계|만들|세워|계획|분배|나눠|추천|구성|반영)/.test(t)) ||
    (/(월급|세후)/.test(t) && /(예산|관리|분배|나눠)/.test(t) && !/(어때|어떤|괜찮|평가|진단|분석|봐줘|확인)/.test(t))
  );
  const wantsBudgetReview = mentionsBudget && /(어때|어떤|괜찮|평가|진단|분석|봐줘|확인|문제|초과|부족)/.test(t);

  if (wantsBudgetDesign && !wantsBudgetReview) {
    return {
      name: 'first_salary_budget_design',
      arguments: {
        monthlySalary: amount || context.monthlySalary || budget.salary,
        budgetRule: /빡세|많이모|저축많/.test(t) ? 'aggressive_saving' : '50_30_20',
      },
    };
  }
  if (wantsBudgetReview || /(마이데이터|소비|지출|수기|입력|많이썼|고정비|구독)/.test(t)) {
    return {
      name: 'mydata_spending_diagnosis',
      arguments: {
        source: /수기|직접|입력/.test(t) ? 'manual' : 'mydata',
        monthlySalary: amount || context.monthlySalary || budget.salary,
      },
    };
  }
  if (/(왜|비과세|정부기여|청약|소득공제|개념|설명|1순위)/.test(t) && /(상품|도약|청약|펀드|비과세|정부|소득공제)/.test(t)) {
    return {
      name: 'coach_financial_product_context',
      arguments: {
        productId: /청약|주택/.test(t) ? 'cheongan' : /펀드|소득공제/.test(t) ? 'sodeuk' : 'doyak',
        userQuestion: text,
        userLevel: 'beginner',
      },
    };
  }
  if (/(상품|추천|도약|적금|청년|로드맵|가입)/.test(t)) {
    return {
      name: 'recommend_youth_financial_products',
      arguments: {
        age: context.age || user.age,
        annualIncome: context.annualIncome || (budget.salary * 12),
        isHomeless: context.isHomeless ?? true,
        monthlySavingsCapacity: amount || sim.defaultMonthly,
        priority: /집|주택|청약/.test(t) ? 'housing' : /세금|비과세/.test(t) ? 'tax_free' : 'balanced',
      },
    };
  }
  return {
    name: 'starter_feature_menu',
    arguments: {},
  };
}

function executeJaybisToolCall(call) {
  const name = call?.name;
  const args = call?.arguments || {};
  if (name === 'first_salary_budget_design') {
    return { kind: 'budgetPlanResult', toolName: name, data: designFirstSalaryBudget(args) };
  }
  if (name === 'mydata_spending_diagnosis') {
    return { kind: 'spendingDiagnosisResult', toolName: name, data: diagnoseSpending(args) };
  }
  if (name === 'recommend_youth_financial_products') {
    return { kind: 'productRoadmapResult', toolName: name, data: recommendYouthProducts(args) };
  }
  if (name === 'coach_financial_product_context') {
    return { kind: 'coachingResult', toolName: name, data: coachProductContext(args) };
  }
  return {
    kind: 'featureMenuResult',
    toolName: 'starter_feature_menu',
    data: {
      summary: '좋아요. 사회초년생이 제일 자주 쓰는 기능부터 골라볼게요. 월급 예산, 소비 진단, 청년 금융상품 추천, 추천 과정 속 금융코칭 중 하나로 바로 시작할 수 있어요.',
      nextChips: STARTER_FEATURE_CHIPS,
    },
  };
}

function getJaybisToolSequence(name) {
  return TOOL_SEQUENCES[name] || [
    { tool: '의도 분류', detail: '필요한 금융 기능 선택', ms: 520 },
    { tool: '대화 흐름 구성', detail: '다음 질문과 실행 단계 준비', ms: 620 },
  ];
}

function buildJaybisOpenAIInput(messages = [], context = {}) {
  const base = [
    {
      role: 'system',
      content: [
        buildJaybisSystemPrompt([
          ...(context.extraPrompts || []),
          TONE_PROMPTS[context.tone] || '',
        ]),
        context.userName ? `사용자 이름은 ${context.userName}다.` : '',
        context.age ? `사용자 나이는 ${context.age}세다.` : '',
        context.monthlySalary ? `현재 참고 가능한 월급 정보는 ${won(context.monthlySalary)}다.` : '',
      ].filter(Boolean).join(' '),
    },
  ];

  messages.forEach((m) => {
    if (!m || !m.text) return;
    if (m.who === 'me') {
      base.push({ role: 'user', content: m.text });
    } else if (m.who === 'ai' && m.kind === 'text') {
      base.push({ role: 'assistant', content: m.text });
    }
  });

  return base;
}

function extractResponsesText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const texts = [];
  for (const item of payload?.output || []) {
    if (item.type === 'message') {
      for (const part of item.content || []) {
        if (part.type === 'output_text' && part.text) texts.push(part.text);
      }
    }
  }
  return texts.join('\n').trim();
}

async function createJaybisOpenAIResponse(input, { signal } = {}) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      tools: JAYBIS_AI_TOOLS,
      input,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    OPENAI_LAST_ERROR = `OpenAI API error (${response.status}): ${text || response.statusText}`;
    throw new Error(OPENAI_LAST_ERROR);
  }

  OPENAI_LAST_ERROR = '';
  return response.json();
}

async function runJaybisSupabaseAgent(messages, context = {}, { signal } = {}) {
  const supabaseUrl = (window.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = window.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const dataId = window.SUPABASE_DATA_ID || import.meta.env.VITE_SUPABASE_DATA_ID || 'default';
  if (!USE_SUPABASE_AGENT || !supabaseUrl || !anonKey || !SUPABASE_AGENT_FUNCTION) {
    return { configured: false };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${SUPABASE_AGENT_FUNCTION}`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ messages, context, dataId }),
  });

  const raw = await response.text();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (err) {}

  if (!response.ok) {
    SUPABASE_AGENT_LAST_ERROR = `Supabase Agent 오류 (${response.status}): ${payload?.error || raw || response.statusText}`;
    return { configured: false, error: SUPABASE_AGENT_LAST_ERROR };
  }

  SUPABASE_AGENT_LAST_ERROR = '';
  return {
    configured: true,
    text: payload.text || '',
    usedSupabaseAgent: true,
  };
}

async function runJaybisOpenAIConversation(messages, context = {}, { signal } = {}) {
  const edge = await runJaybisSupabaseAgent(messages, context, { signal }).catch((error) => ({
    configured: false,
    error: error?.message || String(error),
  }));
  if (edge.configured) {
    return {
      configured: true,
      usedSupabaseAgent: true,
      usedTool: false,
      text: edge.text,
      toolCall: null,
      result: null,
    };
  }

  if (!OPENAI_CONFIGURED) {
    return { configured: false, usedTool: false, text: '', toolCall: null, result: null };
  }

  const input = buildJaybisOpenAIInput(messages, context);
  let current = await createJaybisOpenAIResponse(input, { signal });
  const maxRounds = 4;
  let rounds = 0;
  let latestToolCall = null;
  let latestResult = null;

  while (rounds < maxRounds) {
    const toolCalls = (current.output || []).filter((item) => item.type === 'function_call');
    if (!toolCalls.length) break;

    input.push(...(current.output || []));
    const outputs = [];

    for (const call of toolCalls) {
      let parsedArgs = {};
      try {
        parsedArgs = call.arguments ? JSON.parse(call.arguments) : {};
      } catch (err) {
        parsedArgs = {};
      }
      const result = executeJaybisToolCall({ name: call.name, arguments: parsedArgs });
      latestToolCall = { name: call.name, arguments: parsedArgs };
      latestResult = result;
      outputs.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify({
          kind: result.kind,
          toolName: result.toolName,
          data: result.data,
        }),
      });
    }

    input.push(...outputs);
    current = await createJaybisOpenAIResponse(input, { signal });
    rounds += 1;
  }

  const text = extractResponsesText(current) || latestResult?.data?.summary || '';
  return {
    configured: true,
    usedTool: Boolean(latestToolCall),
    text,
    toolCall: latestToolCall,
    result: latestResult,
  };
}

function getJaybisOpenAIConfigStatus() {
  if (USE_SUPABASE_AGENT && window.SUPABASE_URL && !SUPABASE_AGENT_LAST_ERROR) return `Supabase Agent · ${SUPABASE_AGENT_FUNCTION}`;
  if (SUPABASE_AGENT_LAST_ERROR && !OPENAI_CONFIGURED) return SUPABASE_AGENT_LAST_ERROR;
  if (!OPENAI_CONFIGURED) return 'OpenAI 미연결';
  if (OPENAI_LAST_ERROR) return `OpenAI 오류 · ${OPENAI_LAST_ERROR}`;
  return `OpenAI 연결됨 · ${OPENAI_MODEL}`;
}

function getJaybisOpenAIKeyState() {
  return OPENAI_CONFIGURED;
}

function getJaybisOpenAIStatusDetail() {
  return {
    configured: OPENAI_CONFIGURED,
    model: OPENAI_MODEL,
    lastError: OPENAI_LAST_ERROR,
    supabaseAgentFunction: SUPABASE_AGENT_FUNCTION,
    supabaseAgentLastError: SUPABASE_AGENT_LAST_ERROR,
    status: getJaybisOpenAIConfigStatus(),
  };
}

Object.assign(window, {
  JAYBIS_AI_TOOLS,
  JAYBIS_SYSTEM_PROMPT,
  JAYBIS_MARKDOWN_STYLE_PROMPT,
  buildJaybisSystemPrompt,
  STARTER_FEATURE_CHIPS,
  OPENAI_MODEL,
  OPENAI_CONFIGURED,
  SUPABASE_AGENT_FUNCTION,
  getJaybisOpenAIConfigStatus,
  getJaybisOpenAIKeyState,
  getJaybisOpenAIStatusDetail,
  selectJaybisToolCall,
  executeJaybisToolCall,
  runJaybisOpenAIConversation,
  getJaybisToolSequence,
  designFirstSalaryBudget,
  diagnoseSpending,
  recommendYouthProducts,
  coachProductContext,
});
