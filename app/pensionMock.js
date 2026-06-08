// Simple pension estimation utilities for MVP
// All amounts are in KRW units (number)

function toNumber(value) {
  const next = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(next) ? next : 0;
}

function formatYears(value) {
  const years = Math.max(0, value);
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (!whole) return `${months}개월`;
  if (!months) return `${whole}년`;
  return `${whole}년 ${months}개월`;
}

export function estimateMonthlyFromPension({ totalPension = 0, expectedYears = 15, annualReturn = 0.02, inflation = 0.01 } = {}) {
  // Conservative approach: compute sustainable monthly withdrawal using annuity formula
  // PV = withdrawal * (1 - (1 + r)^-n) / r  => withdrawal = PV * r / (1 - (1+r)^-n)
  const r = Math.max(-0.9, annualReturn - inflation); // real return
  const n = Math.max(1, expectedYears);

  if (r === 0) {
    const yearly = totalPension / n;
    return Math.floor(yearly / 12);
  }

  const denom = 1 - Math.pow(1 + r, -n);
  const yearlyWithdrawal = (totalPension * r) / denom;
  const monthly = Math.max(0, Math.floor(yearlyWithdrawal / 12));
  return monthly;
}

export function simulatePensionScenarios({ totalPension = 0, monthlyExpense = 0, startAge = 65, currentAge = 60, annualReturn = 0.02, inflation = 0.01, maxYears = 40 } = {}) {
  // Returns simple scenarios: conservative/nominal/aggressive with different return assumptions
  const scenarios = [
    { name: '보수적', annualReturn: Math.max(-0.05, annualReturn - 0.02) },
    { name: '기본', annualReturn },
    { name: '공격적', annualReturn: annualReturn + 0.02 },
  ];

  return scenarios.map((s) => {
    const monthlyAvailable = estimateMonthlyFromPension({ totalPension, expectedYears: maxYears, annualReturn: s.annualReturn, inflation });
    // simple depletion check: if monthlyExpense <= monthlyAvailable => sustainable for maxYears
    const sustainable = monthlyExpense <= monthlyAvailable;
    return {
      name: s.name,
      annualReturn: s.annualReturn,
      monthlyAvailable,
      sustainable,
      note: sustainable ? '현재 지출 수준을 연금으로 커버할 수 있습니다.' : `월 ${monthlyExpense - monthlyAvailable}원 정도 부족합니다.`,
    };
  });
}

export function diagnoseRetirementIncome({ monthlyPension = 0, monthlyExpense = 0 } = {}) {
  const income = Math.max(0, toNumber(monthlyPension));
  const expense = Math.max(0, toNumber(monthlyExpense));
  const gap = income - expense;
  const coverageRatio = expense > 0 ? income / expense : 0;

  let status = '균형';
  let summary = '연금과 생활비가 비슷한 수준이에요.';
  let recommendation = '큰 조정은 필요하지 않아요. 지출 변동만 주기적으로 확인하세요.';

  if (gap > 0) {
    status = '여유';
    summary = `월 ${gap.toLocaleString()}원 정도 여유가 있어요.`;
    recommendation = '여유 자금을 비상금이나 안전한 자산에 두는 방법을 볼 수 있어요.';
  } else if (gap < 0) {
    status = '부족';
    summary = `월 ${Math.abs(gap).toLocaleString()}원 정도 부족해요.`;
    recommendation = '생활비를 줄이거나 추가 소득/자산 활용을 검토해보세요.';
  }

  return {
    status,
    monthlyPension: income,
    monthlyExpense: expense,
    gap,
    coverageRatio,
    summary,
    recommendation,
  };
}

export function analyzeRetirementIncome({ monthlyPension = 0, monthlyExpense = 0, assets = 0, age = 0, lifeExpectancy = 90, annualReturn = 0.02, inflation = 0.01 } = {}) {
  const pension = Math.max(0, toNumber(monthlyPension));
  const expense = Math.max(0, toNumber(monthlyExpense));
  const totalAssets = Math.max(0, toNumber(assets));
  const currentAge = Math.max(0, toNumber(age));
  const endAge = Math.max(currentAge + 1, toNumber(lifeExpectancy) || 90);

  const monthlyGap = pension - expense;
  const annualGap = monthlyGap * 12;

  const realReturn = Math.max(-0.9, annualReturn - inflation);
  const remainingYears = Math.max(1, endAge - currentAge);

  const scenarioDefs = [
    { key: '보수적', expenseRate: 1.1, returnShift: -0.02 },
    { key: '기본', expenseRate: 1.0, returnShift: 0 },
    { key: '여유', expenseRate: 0.9, returnShift: 0.02 },
  ];

  const scenarios = scenarioDefs.map((scenario) => {
    const scenarioExpense = expense * scenario.expenseRate;
    const scenarioGap = pension - scenarioExpense;
    const scenarioRealReturn = Math.max(-0.9, realReturn + scenario.returnShift);

    let yearsToDepletion = Infinity;
    let coverageLabel = '생활비를 자산이 직접 줄이지 않음';

    if (totalAssets > 0) {
      if (scenarioGap >= 0) {
        coverageLabel = '소진 없음';
      } else {
        const monthlyDeficit = Math.abs(scenarioGap);
        const monthlyReturnFromAssets = (totalAssets * scenarioRealReturn) / 12;
        const netMonthlyRunoff = Math.max(1, monthlyDeficit - monthlyReturnFromAssets);
        const months = totalAssets / netMonthlyRunoff;
        yearsToDepletion = Math.max(0, months / 12);
        coverageLabel = `약 ${formatYears(yearsToDepletion)} 유지 가능`;
      }
    }

    return {
      name: scenario.key,
      monthlyExpense: scenarioExpense,
      monthlyGap: scenarioGap,
      yearsToDepletion,
      lifeCoverage: coverageLabel,
    };
  });

  const baseScenario = scenarios.find((item) => item.name === '기본') || scenarios[0];
  const depletionYears = baseScenario.yearsToDepletion;
  const depletionAge = depletionYears === Infinity ? Infinity : currentAge + depletionYears;

  let status = '균형';
  let summary = '연금과 생활비가 비슷한 수준이에요.';
  let recommendation = '큰 조정은 필요하지 않아요. 지출 변동만 주기적으로 확인하세요.';

  if (monthlyGap > 0) {
    status = '여유';
    summary = `월 ${monthlyGap.toLocaleString()}원 정도 여유가 있어요.`;
    recommendation = '여유 자금을 비상금이나 안전한 자산에 두는 방법을 볼 수 있어요.';
  } else if (monthlyGap < 0) {
    status = '부족';
    summary = `월 ${Math.abs(monthlyGap).toLocaleString()}원 정도 부족해요.`;
    recommendation = totalAssets > 0
      ? '보유 자산을 함께 쓰는 경우 소진 시점을 꼭 확인해보세요.'
      : '생활비를 줄이거나 추가 소득/자산 활용을 검토해보세요.';
  }

  return {
    status,
    inputs: { monthlyPension: pension, monthlyExpense: expense, assets: totalAssets, age: currentAge, lifeExpectancy: endAge },
    pensionLookup: {
      monthlyPension: pension,
      source: '사용자 입력 또는 더미 연금 조회 결과',
    },
    expenseComparison: {
      monthlyExpense: expense,
      gap: monthlyGap,
      annualGap,
      coverageRatio: expense > 0 ? pension / expense : 0,
    },
    depletionSimulation: {
      currentAge,
      lifeExpectancy: endAge,
      depletionAge,
      depletionYears,
      depletionLabel: depletionYears === Infinity ? '소진 없음' : `약 ${formatYears(depletionYears)} 후`,
    },
    scenarios,
    summary,
    recommendation,
  };
}

export default estimateMonthlyFromPension;
