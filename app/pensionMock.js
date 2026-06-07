export function estimateMonthlyFromPension({ totalPension = 0, expectedYears = 15 } = {}) {
  // 간단한 목업 계산: 총자산을 기대 수령년수로 나누고 월별로 환산
  const yearly = totalPension / Math.max(1, expectedYears);
  const monthly = Math.floor(yearly / 12);
  return monthly;
}

export default estimateMonthlyFromPension;
