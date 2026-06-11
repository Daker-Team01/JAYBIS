import React, { useState, useEffect, useRef } from 'react';
import { useVoiceAgent } from './voiceAgent';
import { runPensionAgent, resetPensionAgent } from './pensionAgent';
import { analyzeRetirementIncome } from './pensionAnalysis';
import { runDigitalGuideAgent, resetDigitalGuideAgent, TASK_TYPES } from './digitalGuideAgent';

// ─── TTS 훅 ──────────────────────────────────────────────────────────────────
function useTTS(voiceGuide) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (text) => {
    if (!voiceGuide) return;
    setIsSpeaking(true);
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        u.rate = 0.95;
        u.pitch = 1.0;
        u.volume = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      console.error('TTS error', e);
    }
    if ('speechSynthesis' in window) {
      const onEnd = () => {
        setIsSpeaking(false);
        window.speechSynthesis.removeEventListener('end', onEnd);
        window.speechSynthesis.removeEventListener('error', onEnd);
      };
      window.speechSynthesis.addEventListener('end', onEnd);
      window.speechSynthesis.addEventListener('error', onEnd);
      window.setTimeout(() => setIsSpeaking(false), 6000);
    } else {
      window.setTimeout(() => setIsSpeaking(false), 1800);
    }
  };

  return { isSpeaking, speak };
}

// ─── 연금 진단 화면 ───────────────────────────────────────────────────────────
// 상태를 Senior에서 내려받아 화면 이동 시에도 유지
function PensionView({ onBack, onGoGuide, speak, messages, setMessages, diagnosis, setDiagnosis }) {
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [monthlyPension, setMonthlyPension] = useState('');
  const [monthlyExpense, setMonthlyExpense] = useState('');
  const [assets, setAssets] = useState('');
  const [age, setAge] = useState('');
  const messagesRef = useRef(null);

  const speakWrap = (text) => {
    setIsSpeakingLocal(true);
    speak(text);
    window.setTimeout(() => setIsSpeakingLocal(false), 6000);
  };

  const voice = useVoiceAgent({
    onResult: async (text) => {
      if (!text?.trim()) return;
      setMessages((c) => [...c, { from: 'user', text }]);
      setMessages((c) => [...c, { from: 'agent', text: '⏳ 분석 중...', loading: true }]);
      try {
        const result = await runPensionAgent(text);
        const ad = result.analysisData;
        const hasRiskInResult = ad && ad.depletionSimulation?.depletionYears !== Infinity && ad.depletionSimulation?.depletionYears != null;
        setMessages((c) => {
          const n = [...c];
          const i = n.findLastIndex((m) => m.loading);
          if (i !== -1) n[i] = { from: 'agent', text: result.message, card: hasRiskInResult ? 'depletion' : null, analysisData: ad };
          return n;
        });
        if (ad) setDiagnosis(ad);
        speakWrap(result.message);
      } catch (err) {
        const msg = err?.message?.includes('API 키') ? err.message : '잠시 문제가 생겼어요.';
        setMessages((c) => { const n = [...c]; const i = n.findLastIndex((m) => m.loading); if (i !== -1) n[i] = { from: 'agent', text: msg }; return n; });
      }
    },
  });

  useEffect(() => {
    try { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight; } catch {}
  }, [messages]);

  const runSample = async () => {
    const sample = '월 연금 150만원, 생활비 130만원, 자산 5천만원, 나이 67세인데 괜찮을까요?';
    setMessages((c) => [...c, { from: 'user', text: sample }, { from: 'agent', text: '⏳ 분석 중...', loading: true }]);
    try {
      const result = await runPensionAgent(sample);
      const ad = result.analysisData;
      const hasRiskInResult = ad && ad.depletionSimulation?.depletionYears !== Infinity && ad.depletionSimulation?.depletionYears != null;
      setMessages((c) => { const n = [...c]; const i = n.findLastIndex((m) => m.loading); if (i !== -1) n[i] = { from: 'agent', text: result.message, card: hasRiskInResult ? 'depletion' : null, analysisData: ad }; return n; });
      if (ad) setDiagnosis(ad);
      speakWrap(result.message);
    } catch (err) {
      const msg = err?.message?.includes('API 키') ? err.message : '잠시 문제가 생겼어요.';
      setMessages((c) => { const n = [...c]; const i = n.findLastIndex((m) => m.loading); if (i !== -1) n[i] = { from: 'agent', text: msg }; return n; });
    }
  };

  const calculate = () => {
    const data = analyzeRetirementIncome({
      monthlyPension: Number(monthlyPension) || 0,
      monthlyExpense: Number(monthlyExpense) || 0,
      assets: Number(assets) || 0,
      age: Number(age) || 0,
      lifeExpectancy: 90,
    });
    setDiagnosis(data);
  };

  const hasRisk = diagnosis?.depletionSimulation?.depletionYears != null && diagnosis.depletionSimulation.depletionYears !== Infinity;

  return (
    <div className="scroll screen-anim" style={{ paddingBottom: 'calc(var(--tab-h) + 20px)' }}>
      {/* 서브 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '58px 18px 16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink)', padding: 0 }}>←</button>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>연금 진단</div>
          <div style={{ fontSize: 12.5, color: 'var(--slate-400)' }}>연금 조회 → 생활비 비교 → 소진 시점</div>
        </div>
      </div>

      <div style={{ padding: '0 18px' }}>
        {/* 음성 입력 */}
        <div className="card" style={{ marginBottom: 12, padding: 16 }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <b style={{ fontSize: 15 }}>음성으로 질문하기</b>
            <span className={voice.isListening ? 'pill pill-pos' : 'pill pill-teal'} style={{ fontSize: 11.5 }}>
              {voice.isListening ? '듣는 중' : '대기 중'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()} className="btn btn-primary" style={{ flex: 1, height: 50, fontSize: 15 }} disabled={isSpeakingLocal}>
              {voice.isListening ? '🔴 중지' : '🎤 말하기'}
            </button>
            <button onClick={runSample} className="btn btn-line" style={{ flex: 1, height: 50, fontSize: 14 }} disabled={isSpeakingLocal || voice.isListening}>
              샘플 질문
            </button>
          </div>
          {voice.transcript && (
            <div style={{ marginTop: 10, fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.5 }}>{voice.transcript}</div>
          )}
        </div>

        {/* 대화 기록 */}
        {messages.length > 0 && (
          <div className="card" style={{ padding: 14, maxHeight: 400, overflowY: 'auto', marginBottom: 12 }} ref={messagesRef}>
            <div className="between" style={{ marginBottom: 10 }}>
              <b style={{ fontSize: 14 }}>대화 기록</b>
              <button onClick={() => { setMessages([]); resetPensionAgent(); }} className="pill" style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer' }}>초기화</button>
            </div>
            {messages.map((m, i) => (
              <div key={i} style={{ margin: '7px 0', textAlign: m.from === 'user' ? 'right' : 'left' }}>
                <div style={{ display: 'inline-block', background: m.from === 'user' ? 'var(--teal-100)' : 'var(--bg)', border: `1px solid ${m.from === 'user' ? 'var(--teal-100)' : 'var(--line)'}`, padding: '9px 12px', borderRadius: 13, maxWidth: '86%', fontSize: 14.5, lineHeight: 1.55, color: m.loading ? 'var(--slate-400)' : 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
                {m.card === 'depletion' && (
                  <div style={{ marginTop: 8, padding: 14, background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1.5px solid #fdba74', borderRadius: 12, textAlign: 'left' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#c2410c', marginBottom: 5 }}>⚠️ 자산 소진이 예상돼요</div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: '#9a3412', marginBottom: 10 }}>
                      지금부터 생활비를 직접 관리하면 소진 시점을 늦출 수 있어요.
                    </div>
                    <button
                      onClick={() => onGoGuide(m.analysisData)}
                      style={{ width: '100%', height: 40, fontSize: 13.5, fontWeight: 800, background: '#ea580c', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer' }}
                    >
                      📱 이렇게 시작해 보세요 →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 수동 입력 폼 */}
        <div className="card" style={{ marginBottom: 12, padding: 14 }}>
          <b style={{ fontSize: 15, display: 'block', marginBottom: 10 }}>직접 입력하기</b>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { label: '월 연금액', val: monthlyPension, set: setMonthlyPension, ph: '1500000' },
              { label: '월 평균 생활비', val: monthlyExpense, set: setMonthlyExpense, ph: '1300000' },
              { label: '보유 자산', val: assets, set: setAssets, ph: '50000000' },
              { label: '나이', val: age, set: setAge, ph: '67' },
            ].map(({ label, val, set, ph }) => (
              <label key={label} style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800 }}>{label}</span>
                <input type="number" value={val} onChange={e => set(e.target.value)} placeholder={`예: ${ph}`} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)', fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={calculate} className="btn btn-primary" style={{ flex: 1, height: 44 }}>계산하기</button>
            <button onClick={() => { setDiagnosis(null); setMonthlyPension(''); setMonthlyExpense(''); setAssets(''); setAge(''); }} className="btn btn-line" style={{ flex: 1, height: 44 }}>초기화</button>
          </div>
        </div>

        {/* 진단 결과 */}
        {diagnosis && (
          <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
            <div className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>진단 결과: {diagnosis.status}</div>
                <div className="muted" style={{ marginTop: 5, fontSize: 13 }}>{diagnosis.summary}</div>
                <div className="muted" style={{ marginTop: 4, fontSize: 12.5 }}>{diagnosis.recommendation}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{Math.abs(diagnosis.expenseComparison.gap).toLocaleString('ko-KR')}원</div>
                <div className="muted" style={{ fontSize: 12 }}>{diagnosis.expenseComparison.gap >= 0 ? '월 여유액' : '월 부족액'}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
              {[
                ['월 연금액', `${diagnosis.pensionLookup.monthlyPension.toLocaleString('ko-KR')}원`],
                ['월 평균 생활비', `${diagnosis.expenseComparison.monthlyExpense.toLocaleString('ko-KR')}원`],
                ['보유 자산', `${diagnosis.inputs.assets.toLocaleString('ko-KR')}원`],
                ['나이', `${diagnosis.inputs.age}세`],
                ['소진 예상 시점', diagnosis.depletionSimulation.depletionLabel],
                ['충족률', `${Math.round(diagnosis.expenseComparison.coverageRatio * 100)}%`],
              ].map(([k, v]) => (
                <div key={k} className="between"><span className="muted" style={{ fontSize: 13.5 }}>{k}</span><b style={{ fontSize: 13.5 }}>{v}</b></div>
              ))}
            </div>

            <div className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 2 }}>시나리오별 생활 가능 기간</div>
              {diagnosis.scenarios.map((s) => (
                <div key={s.name} className="between" style={{ fontSize: 13.5 }}>
                  <span className="muted">{s.name}</span><b>{s.lifeCoverage}</b>
                </div>
              ))}
            </div>

            {/* 소진 위험 → 디지털 금융 연계 카드 */}
            {hasRisk && (
              <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1.5px solid #fdba74' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#c2410c', marginBottom: 6 }}>⚠️ 자산 소진이 예상돼요</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.65, color: '#9a3412', marginBottom: 14 }}>
                  지금부터 생활비를 직접 관리하면 소진 시점을 늦출 수 있어요. 단계별로 쉽게 안내해 드릴게요.
                </div>
                <button onClick={() => onGoGuide(diagnosis)} className="btn btn-primary" style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 800, background: '#ea580c', border: 'none' }}>
                  📱 이렇게 시작해 보세요 →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 디지털 금융 단계별 안내 화면 ────────────────────────────────────────────
function GuideView({ onBack, pensionDiagnosis, speak, isSpeaking }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [agentMessage, setAgentMessage] = useState('');

  const pensionStatus = pensionDiagnosis?.status || null;

  const recommendedTask = (() => {
    if (!pensionDiagnosis) return null;
    if (pensionDiagnosis.status === '부족' || pensionDiagnosis.status === '위험') return 'budget';
    if (pensionDiagnosis.depletionSimulation?.depletionYears) return 'budget';
    return null;
  })();

  const startTask = async (taskType) => {
    setSelectedTask(taskType);
    setCurrentStep(1);
    setStepData(null);
    setCompleted(false);
    setStuck(false);
    setLoading(true);
    resetDigitalGuideAgent();
    try {
      const result = await runDigitalGuideAgent({ question: '', currentStep: 1, taskType, stuck: false, pensionStatus });
      const sd = result.stepData;
      setStepData(sd);
      // agent 메시지가 비어있으면 stepData로 직접 구성
      const msg = result.message || (sd ? `${sd.step}단계입니다. ${sd.desc}` : '안내를 시작할게요.');
      setAgentMessage(msg);
      speak(msg);
    } catch { setAgentMessage('죄송해요, 잠시 후 다시 시도해 주세요.'); }
    setLoading(false);
  };

  const nextStep = async () => {
    const next = currentStep + 1;
    if (stepData && next > stepData.totalSteps) {
      setCompleted(true);
      const msg = '모든 단계를 완료하셨어요! 정말 잘 하셨습니다 👏';
      setAgentMessage(msg);
      speak(msg);
      return;
    }
    setCurrentStep(next);
    setStuck(false);
    setLoading(true);
    try {
      const result = await runDigitalGuideAgent({ question: '', currentStep: next, taskType: selectedTask, stuck: false, pensionStatus });
      const sd = result.stepData;
      setStepData(sd);
      const msg = result.message || (sd ? `${sd.step}단계입니다. ${sd.desc}` : '다음 단계로 넘어갈게요.');
      setAgentMessage(msg);
      speak(msg);
    } catch { setAgentMessage('다음 단계를 불러오지 못했어요.'); }
    setLoading(false);
  };

  const askHelp = async () => {
    setStuck(true);
    setLoading(true);
    try {
      const result = await runDigitalGuideAgent({ question: '', currentStep, taskType: selectedTask, stuck: true, pensionStatus });
      const sd = result.stepData;
      setStepData(sd);
      const msg = result.message || (sd?.extraExplanation ? sd.extraExplanation : sd ? `다시 설명할게요. ${sd.desc} ${sd.tip || ''}` : '조금 더 쉽게 설명할게요.');
      setAgentMessage(msg);
      speak(msg);
    } catch { setAgentMessage('추가 설명을 불러오지 못했어요.'); }
    setLoading(false);
  };

  const reset = () => { setSelectedTask(null); setCurrentStep(1); setStepData(null); setCompleted(false); setStuck(false); setAgentMessage(''); resetDigitalGuideAgent(); };

  return (
    <div className="scroll screen-anim" style={{ paddingBottom: 'calc(var(--tab-h) + 20px)' }}>
      {/* 서브 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '58px 18px 16px' }}>
        <button onClick={selectedTask ? reset : onBack} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink)', padding: 0 }}>←</button>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            {selectedTask ? `${TASK_TYPES[selectedTask]?.icon} ${TASK_TYPES[selectedTask]?.label}` : '디지털 금융 안내'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--slate-400)' }}>
            {selectedTask && stepData ? `${currentStep} / ${stepData.totalSteps} 단계` : '원하는 항목을 선택해 주세요'}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 18px' }}>
        {/* 태스크 선택 */}
        {!selectedTask && (
          <div style={{ display: 'grid', gap: 10 }}>
            {pensionDiagnosis && recommendedTask && (
              <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #86efac' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>💡 연금 진단 결과 기반 추천</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#166534', marginBottom: 12 }}>
                  {pensionDiagnosis.status === '부족' || pensionDiagnosis.status === '위험'
                    ? '연금이 생활비보다 부족할 수 있어요. 월 예산 관리부터 시작해 보세요.'
                    : '소진 가능 시점이 예상돼요. 생활비 관리를 지금 시작하면 좋아요.'}
                </div>
                <button onClick={() => startTask(recommendedTask)} className="btn btn-primary" style={{ width: '100%', height: 46, fontSize: 15, fontWeight: 800 }}>
                  {TASK_TYPES[recommendedTask]?.icon} {TASK_TYPES[recommendedTask]?.label} 시작하기
                </button>
              </div>
            )}
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>직접 선택하기</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {Object.entries(TASK_TYPES).map(([key, { label, icon }]) => (
                  <button key={key} onClick={() => startTask(key)} className="btn btn-line" style={{ height: 52, fontSize: 15, fontWeight: 700, textAlign: 'left', paddingLeft: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <span style={{ flex: 1 }}>{label}</span>
                    {key === recommendedTask && <span className="pill pill-pos" style={{ fontSize: 10.5 }}>추천</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 완료 */}
        {selectedTask && completed && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="card" style={{ padding: 20, textAlign: 'center', background: 'var(--teal-50)', border: '1.5px solid var(--teal-200)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--teal-700)', marginBottom: 8 }}>완료!</div>
              <div style={{ fontSize: 14.5, color: 'var(--slate-600)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{agentMessage}</div>
            </div>
            <div className="card" style={{ padding: 12, background: '#fefce8', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>📩 보호자 알림</div>
              <div style={{ fontSize: 12.5, color: '#78350f' }}>{TASK_TYPES[selectedTask]?.label} 완료를 보호자에게 알렸어요.</div>
            </div>
            <button onClick={reset} className="btn btn-line" style={{ height: 46, fontSize: 15 }}>다른 항목 안내받기</button>
          </div>
        )}

        {/* 단계 진행 */}
        {selectedTask && !completed && (
          <div style={{ display: 'grid', gap: 10 }}>
            {/* 진행 바 */}
            {stepData && (
              <div style={{ height: 6, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: 'var(--teal-500)', width: `${(currentStep / stepData.totalSteps) * 100}%`, transition: 'width .3s ease' }} />
              </div>
            )}

            {loading ? (
              <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--slate-400)', fontSize: 14 }}>⏳ 안내 불러오는 중...</div>
            ) : stepData ? (
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--teal-600)', marginBottom: 6 }}>{currentStep}단계</div>
                <div style={{ fontSize: 19, fontWeight: 900, marginBottom: 10 }}>{stepData.title}</div>
                <div style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 14 }}>{stepData.desc}</div>

                {stuck && stepData.extraExplanation && (
                  <div style={{ padding: 12, background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 10, marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7e22ce', marginBottom: 4 }}>💜 더 쉽게 설명할게요</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: '#6b21a8' }}>{stepData.extraExplanation}</div>
                  </div>
                )}

                {stepData.tip && !stuck && (
                  <div style={{ padding: 10, background: 'var(--teal-50)', borderRadius: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--teal-700)' }}>💡 {stepData.tip}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={askHelp} className="btn btn-line" style={{ flex: 1, height: 50, fontSize: 14 }} disabled={loading || isSpeaking}>🙋 잘 모르겠어요</button>
                  <button onClick={nextStep} className="btn btn-primary" style={{ flex: 2, height: 50, fontSize: 15, fontWeight: 800 }} disabled={loading || isSpeaking}>
                    {currentStep === stepData?.totalSteps ? '완료 ✓' : '다음 단계 →'}
                  </button>
                </div>
              </div>
            ) : null}

            {agentMessage && (
              <div className="card" style={{ padding: 12, fontSize: 13.5, lineHeight: 1.6, color: 'var(--slate-600)', whiteSpace: 'pre-wrap' }}>🤖 {agentMessage}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 최근 거래 카드 ───────────────────────────────────────────────────────────
function RecentTransactionsCard({ transactions }) {
  const recent = transactions.slice(0, 5);
  if (!recent.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--slate-400)', marginBottom: 10, letterSpacing: '.3px' }}>최근 거래</div>
      <div className="card" style={{ padding: '4px 0' }}>
        {recent.map((tx, i) => {
          const isFraud = tx.fraudStatus === 'suspicious';
          return (
            <div
              key={tx.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderTop: i ? '1px solid var(--line)' : 'none',
                background: isFraud ? '#fff8f8' : 'transparent',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: isFraud ? '#dc2626' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isFraud ? '⚠️ ' : ''}{tx.merchantName || tx.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>
                  {tx.date}{tx.transactionTime ? ' ' + tx.transactionTime.slice(0, 5) : ''}
                  {tx.merchantCity ? ' · ' + tx.merchantCity : ''}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: isFraud ? '#dc2626' : 'var(--ink)', flexShrink: 0 }}>
                {tx.amount < 0 ? '-' : '+'}₩{Math.abs(tx.amount).toLocaleString('ko-KR')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 시니어 메인 화면 ────────────────────────────────────────────────────────
export default function Senior({ seniorMode, setSeniorMode }) {
  const [settings] = window.useAppSettings();
  const [snapshot] = window.useJaybisRuntimeData();
  // 화면 스택: 'main' | 'pension' | 'guide'
  const [view, setView] = useState('main');
  const { isSpeaking, speak } = useTTS(settings?.voiceGuide);

  // 연금 진단 상태 — Senior에서 관리해 화면 이동 시에도 유지
  const [pensionMessages, setPensionMessages] = useState([]);
  const [pensionDiagnosis, setPensionDiagnosis] = useState(null);

  // 메인 화면 전용 음성 (연금 agent 호출 없음, 안내 용도만)
  const [mainMessages, setMainMessages] = useState([]);
  const voice = useVoiceAgent({
    onResult: async (text) => {
      if (!text?.trim()) return;
      // 메인 화면에서 말하면 연금 진단 화면으로 이동해서 처리
      setView('pension');
      setPensionMessages((c) => [...c, { from: 'user', text }, { from: 'agent', text: '⏳ 분석 중...', loading: true }]);
      try {
        const result = await runPensionAgent(text);
        setPensionMessages((c) => { const n = [...c]; const i = n.findLastIndex((m) => m.loading); if (i !== -1) n[i] = { from: 'agent', text: result.message }; return n; });
        if (result.analysisData) setPensionDiagnosis(result.analysisData);
        speak(result.message);
      } catch (err) {
        const msg = err?.message?.includes('API 키') ? err.message : '잠시 문제가 생겼어요.';
        setPensionMessages((c) => { const n = [...c]; const i = n.findLastIndex((m) => m.loading); if (i !== -1) n[i] = { from: 'agent', text: msg }; return n; });
      }
    },
  });

  const messagesRef = useRef(null);
  useEffect(() => {
    try { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight; } catch {}
  }, [mainMessages]);

  // 디지털 금융 안내 화면
  if (view === 'guide') {
    return (
      <GuideView
        onBack={() => setView('main')}
        pensionDiagnosis={pensionDiagnosis}
        speak={speak}
        isSpeaking={isSpeaking}
      />
    );
  }

  // 연금 진단 화면
  if (view === 'pension') {
    return (
      <PensionView
        onBack={() => setView('main')}
        onGoGuide={(diag) => { setPensionDiagnosis(diag); setView('guide'); }}
        speak={speak}
        messages={pensionMessages}
        setMessages={setPensionMessages}
        diagnosis={pensionDiagnosis}
        setDiagnosis={setPensionDiagnosis}
      />
    );
  }

  // 메인 화면
  return (
    <div className="scroll screen-anim" style={{ paddingBottom: 'calc(var(--tab-h) + 20px)' }}>
      {/* Hero */}
      <div className="hero" style={{ paddingTop: 58, paddingBottom: 24 }}>
        <div className="between" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pill pill-ghost" style={{ width: 'fit-content', marginBottom: 10 }}>시니어 모드</div>
            <h2 style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 900, letterSpacing: '-.4px', marginBottom: 8 }}>
              음성으로
              <br />필요한 금융 안내를 받아보세요
            </h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(255,255,255,.82)' }}>
              연금, 생활비, 디지털 금융 안내 등 큰 버튼과 쉬운 말로 도와드려요.
            </p>
          </div>
          <button
            onClick={() => setSeniorMode && setSeniorMode((v) => !v)}
            className="pill"
            style={{ background: 'rgba(255,255,255,.14)', color: '#fff', border: '1px solid rgba(255,255,255,.22)', padding: '9px 12px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}
          >
            {seniorMode ? '시니어 모드 ON' : '시니어 모드 OFF'}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 18px' }} className="stagger">
        {/* 음성 호출 카드 */}
        {voice.error && (
          <div className="card" style={{ marginBottom: 12, background: '#fff4f4', border: '1px solid #ffd6d6', color: '#c33', fontSize: 14 }}>⚠️ {voice.error}</div>
        )}

        <div className="card" style={{ marginBottom: 12, padding: 16 }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <b style={{ fontSize: 15.5 }}>음성 호출</b>
            <span className={voice.isListening ? 'pill pill-pos' : 'pill pill-teal'} style={{ fontSize: 11.5 }}>
              {voice.isListening ? '듣는 중' : '대기 중'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()}
              className="btn btn-primary"
              style={{ flex: 1, height: 56, fontSize: 16 }}
              disabled={isSpeaking}
            >
              {voice.isListening ? '🔴 듣는 중 · 중지' : '🎤 말하기 시작'}
            </button>
          </div>

          {/* 자막 */}
          <div style={{ minHeight: 48, marginTop: 12, fontSize: 15, lineHeight: 1.6, color: voice.transcript ? 'var(--ink)' : 'var(--slate-400)' }}>
            {voice.transcript || '(말해주세요...)'}
          </div>
        </div>

        {/* 연금 진단 최근 대화 미리보기 (있을 때만) */}
        {pensionMessages.length > 0 && (
          <div className="card" style={{ padding: 14, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }} ref={messagesRef}>
            <div className="between" style={{ marginBottom: 8 }}>
              <b style={{ fontSize: 14 }}>최근 대화</b>
              <button onClick={() => { setPensionMessages([]); resetPensionAgent(); }} className="pill" style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer' }}>지우기</button>
            </div>
            {pensionMessages.map((m, i) => (
              <div key={i} style={{ margin: '6px 0', textAlign: m.from === 'user' ? 'right' : 'left' }}>
                <div style={{ display: 'inline-block', background: m.from === 'user' ? 'var(--teal-100)' : 'var(--bg)', border: `1px solid ${m.from === 'user' ? 'var(--teal-100)' : 'var(--line)'}`, padding: '9px 12px', borderRadius: 13, maxWidth: '86%', fontSize: 14.5, lineHeight: 1.5, color: m.loading ? 'var(--slate-400)' : 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {isSpeaking && (
          <div className="card" style={{ marginBottom: 12, background: 'var(--teal-50)', border: '1px solid var(--teal-100)', color: 'var(--teal-700)', padding: 14, fontSize: 13.5 }}>
            🔊 답변을 읽는 중이에요...
          </div>
        )}

        {/* 기능 카드 */}
        <div style={{ marginTop: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--slate-400)', marginBottom: 10, letterSpacing: '.3px' }}>기능 바로가기</div>
          <div style={{ display: 'grid', gap: 10 }}>

            <button
              onClick={() => setView('pension')}
              className="card"
              style={{ padding: 18, textAlign: 'left', cursor: 'pointer', border: '1.5px solid var(--line)', background: 'var(--card)', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <div style={{ fontSize: 32, flexShrink: 0 }}>🏦</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>연금 진단</div>
                <div style={{ fontSize: 13, color: 'var(--slate-400)', lineHeight: 1.5 }}>
                  월 연금과 생활비를 비교하고<br />자산 소진 시점을 확인해요
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--slate-300)' }}>›</div>
            </button>

            <button
              onClick={() => setView('guide')}
              className="card"
              style={{ padding: 18, textAlign: 'left', cursor: 'pointer', border: '1.5px solid var(--line)', background: 'var(--card)', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <div style={{ fontSize: 32, flexShrink: 0 }}>📱</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>디지털 금융 안내</div>
                <div style={{ fontSize: 13, color: 'var(--slate-400)', lineHeight: 1.5 }}>
                  계좌 이체, 자동이체, 예산 설정 등<br />단계별로 쉽게 따라해요
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--slate-300)' }}>›</div>
            </button>

          </div>
        </div>

        <RecentTransactionsCard transactions={snapshot?.transactions || []} />
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.Senior = Senior;
}

export { Senior };
