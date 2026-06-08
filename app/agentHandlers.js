import { analyzeRetirementIncome } from './pensionMock';

export async function handleIntent(text = '') {
  const t = (text || '').toLowerCase();

  if (/연금|연금액|연금으로|연금 기반/.test(t)) {
    // 데모용 기본값 — 실제 연동 시 사용자 데이터로 대체
    const analysis = analyzeRetirementIncome({
      monthlyPension: 1500000,
      monthlyExpense: 1300000,
      assets: 50000000,
      age: 67,
      lifeExpectancy: 90,
    });

    const message = [
      `연금 조회 결과, 월 연금은 ${analysis.pensionLookup.monthlyPension.toLocaleString()}원이에요.`,
      `월 생활비는 약 ${analysis.expenseComparison.monthlyExpense.toLocaleString()}원으로, ${analysis.expenseComparison.gap >= 0 ? '월 여유' : '월 부족'}는 약 ${Math.abs(analysis.expenseComparison.gap).toLocaleString()}원입니다.`,
      analysis.depletionSimulation.depletionLabel === '소진 없음'
        ? '현재 자산 기준으로는 예상 소진 시점이 없어요.'
        : `보유 자산 기준으로는 ${analysis.depletionSimulation.depletionLabel}에 소진될 수 있어요.`,
      `시나리오별로는 ${analysis.scenarios.map((s) => `${s.name}(${s.lifeCoverage})`).join(', ')}.`,
      `추천: ${analysis.recommendation}`,
    ].join(' ');

    return { intent: 'pension', message, data: analysis };
  }

  if (/생활비|생활비 관리|월 생활비/.test(t)) {
    return { intent: 'living', message: '현재 월 생활비를 기준으로 연금 수령과 예산을 조정하는 방법을 단계별로 안내하겠습니다. 먼저 월 지출을 알려주세요.' };
  }

  if (/안내|단계|방법/.test(t)) {
    return { intent: 'guide', message: '디지털 금융 안내: 1) 계좌연동 확인 2) 연금 수령 시점 설정 3) 월 예산 설정 4) 안전자산 분배 안내' };
  }

  return { intent: 'unknown', message: '무엇을 도와드릴까요? 예: "내 연금으로 월 얼마 쓸 수 있어?"' };
}

export default handleIntent;
