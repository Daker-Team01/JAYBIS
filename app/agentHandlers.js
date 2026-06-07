import { estimateMonthlyFromPension } from './pensionMock';

export async function handleIntent(text = '') {
  const t = (text || '').toLowerCase();

  if (/연금|연금액|연금으로|연금 기반/.test(t)) {
    // 데모용 기본값 — 실제 연동 시 사용자 데이터로 대체
    const total = 30000000; // 예시 총 연금 자산
    const years = 15;
    const monthly = estimateMonthlyFromPension({ totalPension: total, expectedYears: years });
    const message = `예시 계산: 총 연금자산 ${total.toLocaleString()}원으로 약 월 ${monthly.toLocaleString()}원 수준이 가능합니다. 수령 시점이나 기간을 알려주시면 더 정확히 안내드릴게요.`;
    return { intent: 'pension', message, data: { total, years, monthly } };
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
