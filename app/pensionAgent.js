import { tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import {
  analyzeRetirementIncome,
  diagnoseRetirementIncome,
  simulatePensionScenarios,
} from './pensionMock';

const analyzePensionTool = tool(
  async ({ monthlyPension, monthlyExpense, assets, age, lifeExpectancy }) => {
    const result = analyzeRetirementIncome({
      monthlyPension,
      monthlyExpense,
      assets,
      age,
      lifeExpectancy: lifeExpectancy || 90,
    });

    const { status, summary, recommendation, expenseComparison, depletionSimulation, scenarios } = result;
    const scenarioText = scenarios
      .map((s) => `${s.name} 시나리오: ${s.lifeCoverage}`)
      .join(', ');

    return [
      `진단 결과: ${status}`,
      summary,
      `월 여유/부족액: ${expenseComparison.gap >= 0 ? '+' : ''}${expenseComparison.gap.toLocaleString()}원`,
      `생활비 충족률: ${Math.round(expenseComparison.coverageRatio * 100)}%`,
      `자산 소진 예상: ${depletionSimulation.depletionLabel}`,
      `시나리오: ${scenarioText}`,
      `추천: ${recommendation}`,
    ].join('\n');
  },
  {
    name: 'analyze_pension',
    description: '월 연금액, 월 생활비, 보유 자산, 나이를 받아 연금 종합 진단을 수행합니다.',
    schema: z.object({
      monthlyPension: z.number().describe('월 연금 수령액 (원)'),
      monthlyExpense: z.number().describe('월 평균 생활비 (원)'),
      assets: z.number().describe('연금 외 보유 자산 합계 (원)'),
      age: z.number().describe('현재 나이 (세)'),
      lifeExpectancy: z.number().optional().describe('기대 수명 (기본값 90세)'),
    }),
  }
);

const diagnosePensionTool = tool(
  async ({ monthlyPension, monthlyExpense }) => {
    const result = diagnoseRetirementIncome({ monthlyPension, monthlyExpense });
    return [`진단: ${result.status}`, result.summary, `추천: ${result.recommendation}`].join('\n');
  },
  {
    name: 'diagnose_pension',
    description: '월 연금액과 월 생활비만으로 빠르게 연금 여유/균형/부족 여부를 진단합니다.',
    schema: z.object({
      monthlyPension: z.number().describe('월 연금 수령액 (원)'),
      monthlyExpense: z.number().describe('월 평균 생활비 (원)'),
    }),
  }
);

const simulateScenariosTool = tool(
  async ({ totalPension, monthlyExpense, startAge, annualReturn }) => {
    const results = simulatePensionScenarios({
      totalPension,
      monthlyExpense,
      startAge: startAge || 65,
      annualReturn: annualReturn || 0.02,
    });
    return results
      .map((s) => `${s.name}: 월 ${s.monthlyAvailable.toLocaleString()}원 가능 — ${s.note}`)
      .join('\n');
  },
  {
    name: 'simulate_pension_scenarios',
    description: '연금 총액 기준으로 보수적/기본/공격적 수익률 시나리오별 월 생활 가능 금액을 계산합니다.',
    schema: z.object({
      totalPension: z.number().describe('연금 총 자산액 (원)'),
      monthlyExpense: z.number().describe('월 생활비 (원)'),
      startAge: z.number().optional().describe('연금 수령 시작 나이 (기본값 65세)'),
      annualReturn: z.number().optional().describe('예상 연 수익률 (기본값 0.02)'),
    }),
  }
);

const TOOLS = [analyzePensionTool, diagnosePensionTool, simulateScenariosTool];
const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

const SYSTEM_PROMPT = `당신은 시니어 고객 전담 금융 상담 AI입니다.
연금 수령, 월 생활비 관리, 자산 소진 시뮬레이션을 전문으로 합니다.

규칙:
- 쉽고 친근한 말투로 답변하세요 (경어 사용)
- 숫자는 항상 "원" 단위로 읽기 쉽게 표현하세요
- 불필요한 금융 전문 용어는 피하세요
- 대화 히스토리를 반드시 참고해서 이미 말한 정보는 다시 묻지 마세요
- 정보가 부족할 때는 아직 모르는 항목 하나만 물어보세요
- 월 연금액, 월 생활비, 자산, 나이 4가지가 모이면 즉시 analyze_pension 도구로 진단하세요
- 자산이나 나이를 모르면 diagnose_pension 도구로 먼저 간단 진단하세요
- 자산 소진 가능성이 있으면 꼭 알려주세요`;

// 대화 히스토리를 모듈 레벨에서 관리
let conversationHistory = [new SystemMessage(SYSTEM_PROMPT)];

export function resetPensionAgent() {
  conversationHistory = [new SystemMessage(SYSTEM_PROMPT)];
}

export async function runPensionAgent(userMessage) {
  const apiKey = import.meta.env?.VITE_OPENAI_API_KEY || '';
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았어요. .env.local에 VITE_OPENAI_API_KEY를 추가해주세요.');
  }

  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    apiKey,
  }).bindTools(TOOLS);

  // 사용자 메시지를 히스토리에 추가
  conversationHistory.push(new HumanMessage(userMessage));

  for (let i = 0; i < 5; i++) {
    const response = await llm.invoke(conversationHistory);
    conversationHistory.push(response);

    const toolCalls = response.tool_calls || [];
    if (toolCalls.length === 0) {
      return { message: response.content, intent: 'pension_agent' };
    }

    for (const call of toolCalls) {
      const toolFn = TOOL_MAP[call.name];
      const toolResult = toolFn
        ? await toolFn.invoke(call.args)
        : `도구 "${call.name}"를 찾을 수 없어요.`;

      conversationHistory.push(
        new ToolMessage({ tool_call_id: call.id, content: String(toolResult) })
      );
    }
  }

  return { message: '죄송해요, 분석 중 문제가 생겼어요. 다시 시도해 주세요.', intent: 'pension_agent' };
}

export default runPensionAgent;