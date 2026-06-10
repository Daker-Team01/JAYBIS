import { tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';

// 태스크 유형 목록
export const TASK_TYPES = {
  transfer: { label: '계좌 이체', icon: '💸' },
  autoPay: { label: '공과금 자동이체', icon: '🔄' },
  budget: { label: '월 예산 설정', icon: '📊' },
  pensionSetup: { label: '연금 수령 설정', icon: '🏦' },
  bankBasic: { label: '인터넷 뱅킹 기초', icon: '💻' },
};

const determineTaskTypeTool = tool(
  async ({ question, pensionStatus }) => {
    const q = question.toLowerCase();
    if (/이체|송금|보내/.test(q)) return JSON.stringify({ taskType: 'transfer', reason: '계좌 이체 관련 질문' });
    if (/공과금|자동이체|자동납부/.test(q)) return JSON.stringify({ taskType: 'autoPay', reason: '공과금 자동이체 관련 질문' });
    if (/예산|생활비 관리|지출/.test(q)) return JSON.stringify({ taskType: 'budget', reason: '예산 설정 관련 질문' });
    if (/연금|수령|설정/.test(q)) return JSON.stringify({ taskType: 'pensionSetup', reason: '연금 수령 설정 관련 질문' });
    if (/뱅킹|앱|사용법|로그인/.test(q)) return JSON.stringify({ taskType: 'bankBasic', reason: '인터넷 뱅킹 기초 질문' });
    // 연금 진단 결과 기반 기본 추천
    if (pensionStatus === '부족' || pensionStatus === '위험') return JSON.stringify({ taskType: 'budget', reason: '연금 부족 → 생활비 관리 우선 추천' });
    return JSON.stringify({ taskType: 'bankBasic', reason: '기본 디지털 금융 안내' });
  },
  {
    name: 'determine_task_type',
    description: '고객 질문과 연금 진단 상태를 바탕으로 디지털 금융 태스크 유형을 결정합니다.',
    schema: z.object({
      question: z.string().describe('고객 질문 또는 요청'),
      pensionStatus: z.string().optional().describe('연금 진단 결과 상태 (여유/균형/부족/위험)'),
    }),
  }
);

const generateStepGuideTool = tool(
  async ({ taskType, currentStep, stuck }) => {
    const guides = {
      transfer: [
        { step: 1, title: '앱 열기', desc: '은행 앱을 열고 지문이나 비밀번호로 로그인하세요.', tip: '앱 아이콘이 보이지 않으면 화면을 아래로 쓸어내려 찾아보세요.' },
        { step: 2, title: '이체 메뉴', desc: '화면 아래 "이체" 또는 "보내기" 버튼을 눌러주세요.', tip: '버튼이 크고 파란색이에요.' },
        { step: 3, title: '받는 분 정보', desc: '받는 분 계좌번호와 이름을 입력해주세요.', tip: '계좌번호는 숫자만 입력하시면 돼요.' },
        { step: 4, title: '금액 입력', desc: '보낼 금액을 숫자로 입력하고 "확인"을 눌러주세요.', tip: '1만원은 10000, 10만원은 100000이에요.' },
        { step: 5, title: '최종 확인', desc: '받는 분 이름과 금액이 맞는지 확인하고 "이체" 버튼을 눌러주세요.', tip: '이 단계에서 한 번 더 확인하시면 안전해요.' },
      ],
      autoPay: [
        { step: 1, title: '앱 로그인', desc: '은행 앱을 열고 로그인해주세요.', tip: '로그인이 어려우시면 "지문 인증" 버튼을 눌러보세요.' },
        { step: 2, title: '자동이체 메뉴', desc: '"자동이체" 또는 "정기 이체" 메뉴를 찾아 눌러주세요.', tip: '설정이나 서비스 메뉴 안에 있는 경우가 많아요.' },
        { step: 3, title: '납부처 선택', desc: '공과금 종류(전기, 가스, 수도 등)를 선택해주세요.', tip: '고지서에 있는 고객번호가 필요해요.' },
        { step: 4, title: '날짜·금액 설정', desc: '매달 빠져나갈 날짜를 선택하고 최대 금액을 입력해주세요.', tip: '급여일 다음날로 설정하면 편리해요.' },
        { step: 5, title: '등록 완료', desc: '"등록" 버튼을 눌러 완료해주세요.', tip: '문자로 등록 완료 알림이 올 거예요.' },
      ],
      budget: [
        { step: 1, title: '지출 파악', desc: '지난 달 지출 내역을 앱에서 확인해보세요.', tip: '거래 내역 또는 소비 분석 메뉴에서 볼 수 있어요.' },
        { step: 2, title: '항목 분류', desc: '식비, 의료비, 교통비 등 항목별로 얼마 썼는지 확인하세요.', tip: '앱이 자동으로 분류해주는 경우도 있어요.' },
        { step: 3, title: '목표 설정', desc: '항목별로 이번 달 쓸 목표 금액을 정해보세요.', tip: '처음엔 지난달보다 5% 줄이는 것부터 시작해보세요.' },
        { step: 4, title: '알림 설정', desc: '예산의 80%를 쓰면 알림이 오도록 설정해보세요.', tip: '앱 설정 → 알림 → 소비 알림에서 켤 수 있어요.' },
      ],
      pensionSetup: [
        { step: 1, title: '연금 앱 접속', desc: '국민연금 앱이나 은행 연금 앱을 열고 로그인해주세요.', tip: '공동인증서나 간편 인증이 필요해요.' },
        { step: 2, title: '수령 계좌 확인', desc: '"연금 수령 계좌" 메뉴에서 지금 연금이 어디로 들어오는지 확인하세요.', tip: '잘못된 계좌로 들어가고 있다면 이 단계에서 바꿀 수 있어요.' },
        { step: 3, title: '수령일 확인', desc: '매달 몇 일에 연금이 들어오는지 확인하고 메모해두세요.', tip: '수령일을 알면 생활비 계획을 세우기 편해요.' },
        { step: 4, title: '수령액 확인', desc: '실제 수령액과 예상 수령액이 맞는지 비교해보세요.', tip: '세금이 공제된 금액이 실수령액이에요.' },
      ],
      bankBasic: [
        { step: 1, title: '앱 설치', desc: '스마트폰에 주거래 은행 앱을 설치해주세요.', tip: '앱스토어에서 은행 이름으로 검색하면 돼요.' },
        { step: 2, title: '회원가입', desc: '"처음 이용하시나요?" 버튼을 눌러 본인 인증을 해주세요.', tip: '주민등록증과 휴대폰이 필요해요.' },
        { step: 3, title: '간편 로그인 설정', desc: '지문이나 6자리 숫자로 간편하게 로그인하도록 설정해주세요.', tip: '매번 긴 비밀번호를 입력하지 않아도 되어 편해요.' },
        { step: 4, title: '잔액 조회', desc: '"잔액 조회" 또는 "내 계좌"를 눌러 잔액을 확인해보세요.', tip: '첫 화면에 큰 숫자로 표시되는 경우도 많아요.' },
      ],
    };

    const steps = guides[taskType] || guides.bankBasic;
    const idx = Math.max(0, Math.min(currentStep - 1, steps.length - 1));
    const s = steps[idx];

    if (stuck) {
      return JSON.stringify({
        ...s,
        extraExplanation: `"${s.title}" 단계가 어려우시죠? ${s.tip} 그래도 안 되시면 화면 아래 "도움 요청" 버튼을 눌러주세요.`,
        totalSteps: steps.length,
      });
    }

    return JSON.stringify({ ...s, totalSteps: steps.length });
  },
  {
    name: 'generate_step_guide',
    description: '태스크 유형과 현재 단계 번호를 받아 해당 단계의 행동 안내를 생성합니다.',
    schema: z.object({
      taskType: z.string().describe('태스크 유형 (transfer / autoPay / budget / pensionSetup / bankBasic)'),
      currentStep: z.number().describe('현재 진행 단계 (1부터 시작)'),
      stuck: z.boolean().optional().describe('고객이 이 단계에서 막혔는지 여부'),
    }),
  }
);

const notifyGuardianTool = tool(
  async ({ taskType, completedStep, totalSteps, guardianContact }) => {
    const taskLabel = TASK_TYPES[taskType]?.label || taskType;
    const msg = `[JAYBIS 보호자 알림] ${taskLabel} 진행 중 — ${completedStep}/${totalSteps} 단계 완료`;
    // 실제 연동 시 Supabase / 문자 API 호출
    console.log('[guardian notify]', msg, guardianContact);
    return `보호자에게 알림을 보냈어요: "${msg}"`;
  },
  {
    name: 'notify_guardian',
    description: '보호자에게 진행 상황을 알립니다.',
    schema: z.object({
      taskType: z.string(),
      completedStep: z.number(),
      totalSteps: z.number(),
      guardianContact: z.string().optional(),
    }),
  }
);

const TOOLS = [determineTaskTypeTool, generateStepGuideTool, notifyGuardianTool];
const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

const SYSTEM_PROMPT = `당신은 시니어 고객이 디지털 금융을 단계별로 따라할 수 있도록 돕는 AI입니다.

규칙:
- 반드시 determine_task_type → generate_step_guide → (필요 시) notify_guardian 순으로 Tool을 호출하세요
- 한 번에 한 단계만 안내하세요. 여러 단계를 동시에 설명하지 마세요
- stuck=true로 호출되면 같은 단계를 더 쉬운 말과 비유로 다시 설명하세요
- 단계 완료 시 반드시 짧은 칭찬 문장을 포함하세요 (예: "잘 하셨어요!", "완벽해요!")
- 전문 용어는 쓰지 마세요. 버튼 위치, 색깔, 모양으로 설명하세요
- 완료 시 notify_guardian을 호출하세요`;

let guideHistory = [new SystemMessage(SYSTEM_PROMPT)];

export function resetDigitalGuideAgent() {
  guideHistory = [new SystemMessage(SYSTEM_PROMPT)];
}

export async function runDigitalGuideAgent({ question, currentStep = 1, taskType = null, stuck = false, pensionStatus = null }) {
  const apiKey = import.meta.env?.VITE_OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았어요.');

  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0.2, apiKey }).bindTools(TOOLS);

  const userMsg = taskType
    ? `태스크: ${taskType}, 현재 단계: ${currentStep}, 막힘 여부: ${stuck}, 연금 상태: ${pensionStatus || '없음'}`
    : `질문: ${question}, 연금 상태: ${pensionStatus || '없음'}`;

  guideHistory.push(new HumanMessage(userMsg));

  let accumulatedStepData = null;

  for (let i = 0; i < 8; i++) {
    const response = await llm.invoke(guideHistory);
    guideHistory.push(response);

    const toolCalls = response.tool_calls || [];

    // tool 호출이 없으면 최종 텍스트 응답 → stepData와 함께 반환
    if (toolCalls.length === 0) {
      return { message: response.content, stepData: accumulatedStepData };
    }

    // tool 실행 후 결과를 히스토리에 추가, stepData 누적
    for (const call of toolCalls) {
      const fn = TOOL_MAP[call.name];
      const result = fn ? await fn.invoke(call.args) : `도구 "${call.name}"를 찾을 수 없어요.`;
      guideHistory.push(new ToolMessage({ tool_call_id: call.id, content: String(result) }));

      if (call.name === 'generate_step_guide') {
        try { accumulatedStepData = JSON.parse(result); } catch {}
      }
      if (call.name === 'determine_task_type') {
        try { const parsed = JSON.parse(result); accumulatedStepData = { ...accumulatedStepData, taskType: parsed.taskType }; } catch {}
      }
    }
    // 루프 계속 → 다음 LLM 호출에서 tool 결과 기반 텍스트 응답 생성
  }

  return { message: '죄송해요, 다시 시도해 주세요.', stepData: accumulatedStepData };
}
