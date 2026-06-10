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
const SUPABASE_PRODUCTS_TABLE = import.meta.env.VITE_SUPABASE_PRODUCTS_TABLE || 'financial_products';
const SUPABASE_TRANSACTIONS_TABLE = import.meta.env.VITE_SUPABASE_TRANSACTIONS_TABLE || 'transactions';
const SUPABASE_BUDGET_INSIGHTS_TABLE = import.meta.env.VITE_SUPABASE_BUDGET_INSIGHTS_TABLE || 'budget_insights';
const CARD_SPENDING_PATTERN_CSV_URL = new URL('../data/블록별 성별연령대별 카드소비패턴.utf8.csv', import.meta.url).href;
const CARD_INDUSTRY_CODE_CSV_URL = new URL('../data/카드소비 업종코드.utf8.csv', import.meta.url).href;

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
  tone: '',
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
  spendingReport: null,
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
    spendingReport: budget.spendingReport || null,
  };
}

function normalizeProducts(products = []) {
  return Array.isArray(products)
    ? products.map((product, index) => ({
        id: product.id || `product-${index + 1}`,
        rank: numberOrZero(product.rank || index + 1),
        name: product.name || '금융상품',
        issuer: product.issuer || product.provider || '',
        provider: product.provider || product.issuer || '',
        category: product.category || '',
        tagline: product.tagline || '',
        description: product.description || '',
        rate: product.rate || product.rate_label || product.rateLabel || '',
        rateLabel: product.rateLabel || product.rate_label || product.rate || '',
        minRate: numberOrZero(product.minRate ?? product.min_rate),
        maxRate: numberOrZero(product.maxRate ?? product.max_rate),
        rateType: product.rateType || product.rate_type || '',
        applyUrl: product.applyUrl || product.apply_url || product.joinUrl || product.join_url || product.productUrl || product.product_url || product.sourceUrl || product.source_url || '',
        sourceUrl: product.sourceUrl || product.source_url || '',
        maxMonthly: numberOrZero(product.maxMonthly),
        term: numberOrZero(product.term),
        maturity: numberOrZero(product.maturity),
        benefit: product.benefit || '',
        tags: Array.isArray(product.tags) ? product.tags : [],
        eligibility: product.eligibility || {},
        limits: product.limits || {},
        simulation: product.simulation || {},
        coaching: product.coaching || {},
        why: product.why || product.coaching?.why || product.description || '',
        caution: product.caution || product.coaching?.caution || '',
        eligible: product.eligible !== false && product.status !== 'inactive',
        status: product.status || 'active',
        tone: product.tone || '#0d9488',
        ...product,
      }))
    : [];
}

function normalizeSupabaseFinancialProduct(row = {}, index = 0) {
  const limits = row.limits || {};
  const simulation = row.simulation || {};
  const coaching = row.coaching || {};
  const tags = Array.isArray(row.tags)
    ? row.tags
    : String(row.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);

  return normalizeProducts([{
    id: row.id || row.product_id || `product-${index + 1}`,
    name: row.name || row.product_name,
    provider: row.provider || row.issuer,
    issuer: row.issuer || row.provider,
    category: row.category,
    tagline: row.tagline,
    description: row.description,
    rank: row.rank || index + 1,
    tone: row.tone,
    status: row.status,
    rate: row.rate || row.rate_label || row.rateLabel,
    rateLabel: row.rate_label || row.rateLabel || row.rate,
    minRate: row.min_rate ?? row.minRate,
    maxRate: row.max_rate ?? row.maxRate,
    rateType: row.rate_type || row.rateType,
    benefit: row.benefit,
    tags,
    eligibility: row.eligibility || {},
    limits,
    simulation,
    coaching,
    maxMonthly: row.max_monthly ?? row.maxMonthly ?? limits.maxMonthly ?? limits.max_monthly,
    term: row.term_months ?? row.termMonths ?? limits.termMonths ?? limits.term_months,
    maturity: row.maturity ?? simulation.maturity,
    why: row.why || coaching.why || row.description,
    caution: row.caution || coaching.caution,
    eligible: row.eligible,
    sourceName: row.source_name || row.sourceName,
    sourceUrl: row.source_url || row.sourceUrl,
    applyUrl: row.apply_url || row.applyUrl || row.join_url || row.joinUrl || row.product_url || row.productUrl || row.source_url || row.sourceUrl,
    updatedAt: row.updated_at || row.updatedAt,
  }])[0];
}

function normalizeTransactions(transactions = []) {
  return Array.isArray(transactions)
    ? transactions.map((transaction, index) => ({
        id: transaction.id || `tx-${index + 1}`,
        date: transaction.date || '',
        name: transaction.name || transaction.merchantName || transaction.description || '',
        amount: numberOrZero(transaction.amount),
        category: transaction.category || '기타',
        categoryLabel: transaction.categoryLabel || transaction.category || '기타',
        bucket: transaction.bucket || transaction.budgetBucket || '',
        fixed: Boolean(transaction.fixed ?? transaction.isFixed),
        ...transaction,
        type: transaction.type === 'income' ? 'income' : 'spend',
      }))
    : [];
}

function normalizeSupabaseTransaction(row = {}, index = 0) {
  return normalizeTransactions([{
    id: row.id || `tx-${index + 1}`,
    date: row.transaction_date || row.date || '',
    postedAt: row.posted_at || row.postedAt || '',
    sourceType: row.source_type || row.sourceType || '',
    sourceId: row.source_id || row.sourceId || '',
    institutionId: row.institution_id || row.institutionId || '',
    merchantName: row.merchant_name || row.merchantName || row.description || '',
    name: row.merchant_name || row.merchantName || row.description || '',
    description: row.description || '',
    amount: row.amount,
    currency: row.currency || 'KRW',
    type: row.transaction_type === 'income' ? 'income' : 'spend',
    transactionType: row.transaction_type || row.transactionType,
    category: row.category || '기타',
    categoryLabel: row.category_label || row.categoryLabel || row.category || '기타',
    bucket: row.budget_bucket || row.budgetBucket || '',
    budgetBucket: row.budget_bucket || row.budgetBucket || '',
    paymentMethod: row.payment_method || row.paymentMethod || '',
    accountId: row.account_id || row.accountId || '',
    cardId: row.card_id || row.cardId || '',
    fixed: Boolean(row.is_fixed ?? row.fixed),
    isFixed: Boolean(row.is_fixed ?? row.fixed),
    isSubscription: Boolean(row.is_subscription ?? row.isSubscription),
    isExcluded: Boolean(row.is_excluded ?? row.isExcluded),
    memo: row.memo || '',
    rawData: row.raw_data || row.rawData || {},
  }])[0];
}

function normalizeBudgetInsights(insights = []) {
  return Array.isArray(insights)
    ? insights.map((insight, index) => ({
        id: insight.id || `insight-${index + 1}`,
        type: insight.type || 'saving_opportunity',
        severity: insight.severity || 'info',
        title: insight.title || '절약 포인트',
        body: insight.body || '',
        category: insight.category || '',
        categoryLabel: insight.category_label || insight.categoryLabel || insight.category || '',
        bucket: insight.budget_bucket || insight.budgetBucket || '',
        currentAmount: numberOrZero(insight.current_amount ?? insight.currentAmount),
        suggestedLimit: numberOrZero(insight.suggested_limit ?? insight.suggestedLimit),
        save: numberOrZero(insight.expected_saving ?? insight.save),
        actionLabel: insight.action_label || insight.actionLabel || '한도 적용하기',
        actionPayload: insight.action_payload || insight.actionPayload || {},
        status: insight.status || 'active',
        source: insight.source || 'jaybis_agent',
      }))
    : [];
}

function parseCsvLine(line = '') {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseCsv(text = '') {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

function ageToPeerBand(age) {
  const value = numberOrZero(age);
  if (!value) return '';
  if (value < 20) return '10대';
  if (value >= 70) return '70대이상';
  return `${Math.floor(value / 10) * 10}대`;
}

function mapTransactionToPeerClass(transaction = {}) {
  const text = [
    transaction.category,
    transaction.categoryLabel,
    transaction.name,
    transaction.description,
  ].filter(Boolean).join(' ');
  if (/배달|외식|카페|커피|food_delivery|cafe/.test(text)) return '요식/유흥';
  if (/식비|마트|편의점|음식|식료|food/.test(text)) return '음/식료품';
  if (/교통|버스|지하철|택시|transport/.test(text)) return '여행/교통';
  if (/쇼핑|온라인|쿠팡|마켓|shopping/.test(text)) return '전자상거래';
  if (/구독|OTT|영화|문화|subscription/.test(text)) return '스포츠/문화/레저';
  if (/의류|잡화|패션/.test(text)) return '의류/잡화';
  if (/병원|의료|약국/.test(text)) return '의료';
  if (/주유|자동차/.test(text)) return '주유';
  return '';
}

async function loadCardPeerComparisons({ age, transactions = [] } = {}) {
  const ageBand = ageToPeerBand(age);
  if (!ageBand) return [];

  const [patternText, industryText] = await Promise.all([
    fetch(CARD_SPENDING_PATTERN_CSV_URL).then((response) => response.text()),
    fetch(CARD_INDUSTRY_CODE_CSV_URL).then((response) => response.text()),
  ]);
  const industryRows = parseCsv(industryText);
  const patternRows = parseCsv(patternText);
  const industryByCode = Object.fromEntries(industryRows.map((row) => [
    String(row['업종코드(UPJONG_CD)'] || '').toLowerCase(),
    row,
  ]));

  const peerGroups = patternRows
    .filter((row) => row['연령대별(AGE)'] === ageBand)
    .reduce((acc, row) => {
      const code = String(row['서울시민업종코드(UPJONG_CD)'] || '').toLowerCase();
      const industry = industryByCode[code];
      const label = industry?.['대분류(CLASS1)'];
      if (!label) return acc;
      if (!acc[label]) acc[label] = { amount: 0, count: 0 };
      acc[label].amount += numberOrZero(row['카드이용금액계(AMT_CORR)']);
      acc[label].count += 1;
      return acc;
    }, {});
  const peerTotal = Object.values(peerGroups)
    .reduce((sum, group) => sum + numberOrZero(group.amount), 0);

  const mySpendTransactions = normalizeTransactions(transactions)
    .filter((transaction) => transaction.type === 'spend' && !transaction.isExcluded);
  const myTotal = mySpendTransactions
    .reduce((sum, transaction) => sum + Math.abs(numberOrZero(transaction.amount)), 0);
  const myGroups = mySpendTransactions.reduce((acc, transaction) => {
      const label = mapTransactionToPeerClass(transaction);
      if (!label) return acc;
      acc[label] = (acc[label] || 0) + Math.abs(numberOrZero(transaction.amount));
      return acc;
    }, {});

  const labels = Object.keys(myGroups)
    .filter((label) => peerGroups[label]?.amount && myTotal && peerTotal)
    .map((label) => {
      const meAmount = Math.round(myGroups[label]);
      const peerAmount = Math.round(peerGroups[label].amount);
      const meRatio = myTotal ? meAmount / myTotal * 100 : 0;
      const peerRatio = peerTotal ? peerAmount / peerTotal * 100 : 0;
      const diff = meRatio - peerRatio;
      return {
        label,
        me: meAmount,
        peer: peerAmount,
        meRatio,
        peerRatio,
        diff,
        status: Math.abs(diff) >= 5 ? (diff > 0 ? '높음' : '낮음') : '비슷',
        over: Math.abs(diff) >= 5 ? diff > 0 : undefined,
        source: 'card_peer_csv',
        ageBand,
      };
    })
    .filter((item) => item.status !== '비슷')
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 5);

  return labels;
}

function mapBudgetBucket(bucket) {
  if (bucket === 'need') return 'need';
  if (bucket === 'want') return 'want';
  if (bucket === 'save') return 'save';
  return '';
}

function buildCategoriesFromTransactions(transactions = [], budgets = {}) {
  const plannedByBucket = Object.fromEntries((budgets.buckets || []).map((bucket) => [
    bucket.key,
    numberOrZero(bucket.plannedAmount ?? bucket.plan),
  ]));
  const grouped = transactions
    .filter((transaction) => transaction.type === 'spend' && !transaction.isExcluded)
    .reduce((acc, transaction) => {
      const label = transaction.categoryLabel || transaction.category || '기타';
      const bucket = mapBudgetBucket(transaction.budgetBucket || transaction.bucket) || 'want';
      const key = `${bucket}:${label}`;
      if (!acc[key]) {
        acc[key] = {
          label,
          bucket,
          used: 0,
          plan: 0,
          icon: bucket === 'need' ? 'home' : bucket === 'save' ? 'piggy' : 'bag',
        };
      }
      acc[key].used += Math.abs(numberOrZero(transaction.amount));
      return acc;
    }, {});

  const categories = Object.values(grouped);
  const byBucketCounts = categories.reduce((acc, category) => {
    acc[category.bucket] = (acc[category.bucket] || 0) + 1;
    return acc;
  }, {});
  return categories.map((category) => ({
    ...category,
    plan: category.plan || Math.round((plannedByBucket[category.bucket] || category.used) / Math.max(1, byBucketCounts[category.bucket] || 1)),
    warn: category.used > (category.plan || plannedByBucket[category.bucket] || category.used) * 1.05,
  }));
}

function normalizeBudgetBucketsFromMyData(budgets = {}, salary = 0, categories = []) {
  if (Array.isArray(budgets.buckets) && budgets.buckets.length) {
    return budgets.buckets.map((bucket, index) => ({
      ...EMPTY_BUDGET.buckets[index % EMPTY_BUDGET.buckets.length],
      key: bucket.key,
      label: bucket.label || EMPTY_BUDGET.buckets[index % EMPTY_BUDGET.buckets.length].label,
      ratio: numberOrZero(bucket.ratio),
      plan: numberOrZero(bucket.plannedAmount ?? bucket.plan),
      used: numberOrZero(bucket.usedAmount ?? bucket.used),
    }));
  }
  const usedByBucket = categories.reduce((acc, category) => {
    acc[category.bucket] = (acc[category.bucket] || 0) + numberOrZero(category.used);
    return acc;
  }, {});
  return EMPTY_BUDGET.buckets.map((bucket) => ({
    ...bucket,
    plan: Math.round(salary * bucket.ratio / 100),
    used: usedByBucket[bucket.key] || 0,
  }));
}

function normalizeMyDataRuntimeData(mydata = {}) {
  const transactions = normalizeTransactions(mydata.transactions || []);
  const analysis = mydata.analysis || {};
  const income = mydata.income || {};
  const accounts = Array.isArray(mydata.accounts) ? mydata.accounts : [];
  const cards = Array.isArray(mydata.cards) ? mydata.cards : [];
  const totalAssets = accounts.reduce((sum, account) => sum + Math.max(0, numberOrZero(account.balance)), 0);
  const totalDebt = cards.reduce((sum, card) => sum + Math.max(0, numberOrZero(card.monthlyApprovedAmount)), 0);
  const salary = numberOrZero(mydata.budgets?.salary || mydata.budget?.salary || income.monthlySalary || mydata.user?.monthlySalary || analysis.totalIncome);
  const categories = buildCategoriesFromTransactions(transactions, mydata.budgets || mydata.budget || {});
  const buckets = normalizeBudgetBucketsFromMyData(mydata.budgets || mydata.budget || {}, salary, categories);
  const alerts = Array.isArray(analysis.signals)
    ? analysis.signals.map((signal) => ({
        type: signal.type || 'warning',
        title: signal.title,
        body: signal.description || signal.suggestedAction || '',
        save: numberOrZero(signal.save),
      }))
    : [];

  return {
    user: {
      ...(mydata.user || {}),
      monthlySalary: salary,
    },
    institutions: Array.isArray(mydata.connections)
      ? mydata.connections.map((connection) => ({
          id: connection.institutionId,
          name: connection.institutionName,
          type: connection.type,
          tone: connection.type === 'card' ? '#0f766e' : '#0d9488',
          initial: (connection.institutionName || connection.type || '?').slice(0, 1).toUpperCase(),
        }))
      : undefined,
    assets: {
      totalAssets,
      totalDebt,
      cashflow: {
        income: numberOrZero(analysis.totalIncome || salary),
        spend: numberOrZero(analysis.totalExpense || transactions.filter((t) => t.type === 'spend').reduce((sum, t) => sum + Math.abs(numberOrZero(t.amount)), 0)),
        left: analysis.remainingCash,
      },
    },
    budget: {
      month: mydata.budgets?.month || analysis.month || '',
      rule: mydata.budgets?.rule || '50_30_20',
      salary,
      buckets,
      categories,
      alerts,
      peers: [],
      nextMonthTip: alerts[0]?.body || '마이데이터 기반으로 예산과 소비 습관을 계속 업데이트합니다.',
    },
    transactions,
    mydata: {
      connections: mydata.connections || [],
      accounts,
      cards,
      income,
      analysis,
      metadata: mydata.metadata || {},
    },
    metadata: {
      ...(mydata.metadata || {}),
      dataSource: mydata.metadata?.dataSource || 'mydata_normalized',
      importedAt: new Date().toISOString(),
    },
  };
}

function saveMyDataRuntimeData(mydata) {
  const current = readRuntimeData();
  const normalized = normalizeMyDataRuntimeData(mydata);
  return saveRuntimeData({ ...current, ...normalized });
}

function buildManualRuntimeData({ salary = 0, need = 0, want = 0, save = 0, memo = '' } = {}) {
  const income = numberOrZero(salary);
  const needUsed = numberOrZero(need);
  const wantUsed = numberOrZero(want);
  const saveUsed = numberOrZero(save);
  const transactions = [
    income ? { id: `manual-income-${Date.now()}`, date: new Date().toISOString().slice(0, 10), name: '수기 입력 급여', amount: income, type: 'income', category: 'salary', categoryLabel: '급여', fixed: true } : null,
    needUsed ? { id: `manual-need-${Date.now()}`, date: new Date().toISOString().slice(0, 10), name: '수기 입력 필수비', amount: -needUsed, type: 'spend', category: 'manual_need', categoryLabel: '필수비', budgetBucket: 'need', fixed: true } : null,
    wantUsed ? { id: `manual-want-${Date.now()}`, date: new Date().toISOString().slice(0, 10), name: '수기 입력 여유비', amount: -wantUsed, type: 'spend', category: 'manual_want', categoryLabel: '여유비', budgetBucket: 'want', fixed: false } : null,
    saveUsed ? { id: `manual-save-${Date.now()}`, date: new Date().toISOString().slice(0, 10), name: '수기 입력 저축·투자', amount: -saveUsed, type: 'spend', category: 'manual_save', categoryLabel: '저축·투자', budgetBucket: 'save', fixed: true } : null,
  ].filter(Boolean);
  const categories = buildCategoriesFromTransactions(transactions, {});
  const buckets = EMPTY_BUDGET.buckets.map((bucket) => ({
    ...bucket,
    plan: Math.round(income * bucket.ratio / 100),
    used: bucket.key === 'need' ? needUsed : bucket.key === 'want' ? wantUsed : saveUsed,
  }));
  return {
    assets: {
      cashflow: {
        income,
        spend: needUsed + wantUsed + saveUsed,
        left: income - needUsed - wantUsed - saveUsed,
      },
    },
    budget: {
      salary: income,
      buckets,
      categories,
      alerts: [],
      peers: [],
      nextMonthTip: memo || '수기 입력 데이터를 기준으로 예산을 계산했어요. 마이데이터를 연결하면 더 세밀한 진단이 가능해요.',
    },
    transactions,
    metadata: {
      dataSource: 'manual_input',
      importedAt: new Date().toISOString(),
    },
  };
}

function saveManualRuntimeData(input) {
  const current = readRuntimeData();
  const normalized = buildManualRuntimeData(input);
  return saveRuntimeData({ ...current, ...normalized });
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

async function fetchSupabaseFinancialProducts({ table = SUPABASE_PRODUCTS_TABLE } = {}) {
  const params = new URLSearchParams({
    select: '*',
    order: 'rank.asc.nullslast,name.asc',
  });
  const rows = await supabaseRequest(table, { params: params.toString() });
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.status !== 'archived')
    .map((row, index) => normalizeSupabaseFinancialProduct(row, index));
}

async function refreshSupabaseFinancialProducts() {
  const products = await fetchSupabaseFinancialProducts();
  const snapshot = getRuntimeSnapshot();
  return saveRuntimeData({
    ...snapshot.raw,
    products,
  });
}

async function fetchSupabaseTransactions({ table = SUPABASE_TRANSACTIONS_TABLE, userId = SUPABASE_DATA_ID, limit = 200 } = {}) {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/jaybis-transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId: userId || 'default', limit }),
    }).catch(() => null);
    if (response?.ok) {
      const payload = await response.json().catch(() => ({}));
      return (Array.isArray(payload.transactions) ? payload.transactions : [])
        .map((row, index) => normalizeSupabaseTransaction(row, index));
    }
  }

  const params = new URLSearchParams({
    select: '*',
    user_id: `eq.${userId || 'default'}`,
    order: 'transaction_date.desc,posted_at.desc',
    limit: String(limit),
  });
  const rows = await supabaseRequest(table, { params: params.toString() });
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => normalizeSupabaseTransaction(row, index));
}

function buildBudgetFromTransactions(transactions = [], previousBudget = {}) {
  const normalized = normalizeTransactions(transactions).filter((tx) => !tx.isExcluded);
  const income = normalized
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + Math.abs(numberOrZero(tx.amount)), 0);
  const salary = income || numberOrZero(previousBudget.salary);
  const categories = buildCategoriesFromTransactions(normalized, previousBudget);
  const usedByBucket = categories.reduce((acc, category) => {
    acc[category.bucket] = (acc[category.bucket] || 0) + numberOrZero(category.used);
    return acc;
  }, {});
  const buckets = EMPTY_BUDGET.buckets.map((bucket, index) => {
    const prev = previousBudget.buckets?.[index] || {};
    return {
      ...bucket,
      ...prev,
      ratio: numberOrZero(prev.ratio || bucket.ratio),
      plan: numberOrZero(prev.plan) || Math.round(salary * numberOrZero(prev.ratio || bucket.ratio) / 100),
      used: usedByBucket[bucket.key] || 0,
    };
  });

  return {
    ...EMPTY_BUDGET,
    ...previousBudget,
    salary,
    buckets,
    categories,
    alerts: Array.isArray(previousBudget.alerts)
      ? previousBudget.alerts.filter((alert) => alert?.type === 'diagnosis')
      : [],
    nextMonthTip: normalized.length
      ? `Supabase 소비내역 ${normalized.length}건을 기준으로 예산 사용액을 다시 계산했어요.`
      : previousBudget.nextMonthTip,
  };
}

async function refreshSupabaseTransactions(options = {}) {
  const transactions = await fetchSupabaseTransactions(options);
  const snapshot = getRuntimeSnapshot();
  const nextBudget = buildBudgetFromTransactions(transactions, snapshot.raw.budget || snapshot.budget);
  const peers = await loadCardPeerComparisons({
    age: snapshot.user?.age,
    transactions,
  }).catch(() => []);
  nextBudget.peers = peers;
  const nextAssets = {
    ...(snapshot.raw.assets || {}),
    cashflow: {
      ...(snapshot.raw.assets?.cashflow || {}),
      income: transactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + Math.abs(numberOrZero(tx.amount)), 0),
      spend: transactions.filter((tx) => tx.type !== 'income').reduce((sum, tx) => sum + Math.abs(numberOrZero(tx.amount)), 0),
    },
  };
  nextAssets.cashflow.left = numberOrZero(nextAssets.cashflow.income) - numberOrZero(nextAssets.cashflow.spend);
  return saveRuntimeData({
    ...snapshot.raw,
    assets: nextAssets,
    budget: nextBudget,
    transactions,
    metadata: {
      ...(snapshot.raw.metadata || {}),
      dataSource: 'supabase_transactions',
      transactionsSyncedAt: new Date().toISOString(),
    },
  });
}

async function fetchSupabaseBudgetInsights({ table = SUPABASE_BUDGET_INSIGHTS_TABLE, userId = SUPABASE_DATA_ID, status = 'active', limit = 20 } = {}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const params = new URLSearchParams({
    select: '*',
    user_id: `eq.${userId || 'default'}`,
    status: `eq.${status}`,
    order: 'created_at.desc',
    limit: String(limit),
  });
  const rows = await supabaseRequest(table, { params: params.toString() });
  return normalizeBudgetInsights(Array.isArray(rows) ? rows : [])
    .filter((insight) => !insight.insightMonth || insight.insightMonth === currentMonth || true);
}

async function updateSupabaseBudgetInsightStatus(id, status = 'applied') {
  if (!id) return null;
  const params = new URLSearchParams({ id: `eq.${id}` });
  const rows = await supabaseRequest(SUPABASE_BUDGET_INSIGHTS_TABLE, {
    method: 'PATCH',
    params: params.toString(),
    body: {
      status,
      updated_at: new Date().toISOString(),
    },
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function refreshSupabaseBudgetInsights(options = {}) {
  const alerts = await fetchSupabaseBudgetInsights(options);
  const snapshot = getRuntimeSnapshot();
  const diagnosisAlerts = (snapshot.budget?.alerts || []).filter((alert) => alert?.type === 'diagnosis');
  return saveRuntimeData({
    ...snapshot.raw,
    budget: {
      ...(snapshot.raw.budget || snapshot.budget || {}),
      alerts: [...diagnosisAlerts, ...alerts],
    },
  });
}

function applyBudgetInsight(insight) {
  const snapshot = getRuntimeSnapshot();
  const currentBudget = snapshot.raw.budget || snapshot.budget || EMPTY_BUDGET;
  const suggestedLimit = numberOrZero(insight?.suggestedLimit || insight?.actionPayload?.limit);
  const categoryKey = insight?.category || insight?.actionPayload?.budgetCategory || '';
  const categoryLabel = insight?.categoryLabel || '';
  const bucket = insight?.bucket || insight?.budgetBucket || '';
  if (!suggestedLimit) return snapshot;

  const categories = (currentBudget.categories || []).map((category) => {
    const matchesCategory = categoryKey && (category.category === categoryKey || category.id === categoryKey);
    const matchesLabel = categoryLabel && category.label === categoryLabel;
    const matchesBucket = bucket && category.bucket === bucket && (matchesLabel || matchesCategory);
    if (!matchesCategory && !matchesLabel && !matchesBucket) return category;
    return {
      ...category,
      plan: suggestedLimit,
      suggestedLimit,
    };
  });

  const nextBudget = {
    ...currentBudget,
    categories,
    alerts: (currentBudget.alerts || []).map((alert) => (
      alert.id === insight.id ? { ...alert, status: 'applied' } : alert
    )).filter((alert) => alert.status !== 'applied'),
    nextMonthTip: `${insight.categoryLabel || insight.title} 한도를 ${won(suggestedLimit)}로 조정했어요.`,
  };

  const next = saveRuntimeData({
    ...snapshot.raw,
    budget: nextBudget,
  });
  updateSupabaseBudgetInsightStatus(insight.id, 'applied').catch(() => {});
  return next;
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
  tone: '',
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
    if (profile?.tone) saveAppSettings({ tone: profile.tone });
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
  SUPABASE_URL, SUPABASE_DATA_TABLE, SUPABASE_DATA_ID, SUPABASE_PRODUCTS_TABLE, SUPABASE_TRANSACTIONS_TABLE, SUPABASE_BUDGET_INSIGHTS_TABLE,
  getRuntimeSnapshot, saveRuntimeData, refreshJaybisRuntimeData, useJaybisRuntimeData,
  normalizeMyDataRuntimeData, saveMyDataRuntimeData, buildManualRuntimeData, saveManualRuntimeData,
  getSupabaseConfigStatus, supabaseRequest, fetchSupabaseRuntimeData, saveSupabaseRuntimeData,
  fetchSupabaseFinancialProducts, refreshSupabaseFinancialProducts,
  fetchSupabaseTransactions, refreshSupabaseTransactions,
  fetchSupabaseBudgetInsights, refreshSupabaseBudgetInsights, applyBudgetInsight,
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
