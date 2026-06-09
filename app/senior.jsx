import React, { useState, useEffect, useRef } from 'react';
import { useVoiceAgent } from './voiceAgent';
import { runPensionAgent, resetPensionAgent } from './pensionAgent';
import { analyzeRetirementIncome } from './pensionMock';

export default function Senior({ seniorMode, setSeniorMode }) {
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const formatCurrency = (value) => Number(value || 0).toLocaleString('ko-KR');

  const speakResponse = (text) => {
    setIsSpeaking(true);
    try {
      if (voice && typeof voice.speak === 'function') {
        voice.speak(text);
      } else if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        u.rate = 0.95;
        u.pitch = 1.0;
        u.volume = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } else {
        console.warn('TTS not supported in this browser');
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

  const voice = useVoiceAgent({
    onResult: async (text) => {
      if (!text || !text.trim()) return;
      setMessages((current) => [...current, { from: 'user', text }]);
      setMessages((current) => [...current, { from: 'agent', text: '⏳ 분석 중...', loading: true }]);
      try {
        const result = await runPensionAgent(text);
        setMessages((current) => {
          const next = [...current];
          const idx = next.findLastIndex((m) => m.loading);
          if (idx !== -1) next[idx] = { from: 'agent', text: result.message };
          return next;
        });
        speakResponse(result.message);
      } catch (err) {
        const errMsg = err?.message?.includes('API 키') ? err.message : '잠시 문제가 생겼어요. 다시 말씀해 주세요.';
        setMessages((current) => {
          const next = [...current];
          const idx = next.findLastIndex((m) => m.loading);
          if (idx !== -1) next[idx] = { from: 'agent', text: errMsg };
          return next;
        });
      }
    },
  });

  const messagesRef = useRef(null);

  useEffect(() => {
    try {
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    } catch (e) {}
  }, [messages]);

  const runSample = async () => {
    const sample = '월 연금 150만원, 생활비 130만원, 자산 5천만원, 나이 67세인데 괜찮을까요?';
    setMessages((current) => [...current, { from: 'user', text: sample }]);
    setMessages((current) => [...current, { from: 'agent', text: '⏳ 분석 중...', loading: true }]);
    try {
      const result = await runPensionAgent(sample);
      setMessages((current) => {
        const next = [...current];
        const idx = next.findLastIndex((m) => m.loading);
        if (idx !== -1) next[idx] = { from: 'agent', text: result.message };
        return next;
      });
      speakResponse(result.message);
    } catch (err) {
      const errMsg = err?.message?.includes('API 키') ? err.message : '잠시 문제가 생겼어요. 다시 시도해 주세요.';
      setMessages((current) => {
        const next = [...current];
        const idx = next.findLastIndex((m) => m.loading);
        if (idx !== -1) next[idx] = { from: 'agent', text: errMsg };
        return next;
      });
    }
  };

  // Pension diagnosis form state
  const [monthlyPension, setMonthlyPension] = useState('');
  const [monthlyExpense, setMonthlyExpense] = useState();
  const [assets, setAssets] = useState('');
  const [age, setAge] = useState('');
  const [diagnosis, setDiagnosis] = useState(null);

  const applyPreset = (preset) => {
    setMonthlyPension(preset.monthlyPension);
    setMonthlyExpense(preset.monthlyExpense);
    setAssets(preset.assets);
    setAge(preset.age);
    setDiagnosis(null);
  };

  const presetCases = [
    { label: '기본 점검', monthlyPension: 1500000, monthlyExpense: 1300000, assets: 50000000, age: 67 },
    { label: '부족 점검', monthlyPension: 1200000, monthlyExpense: 1800000, assets: 30000000, age: 70 },
    { label: '균형 점검', monthlyPension: 1000000, monthlyExpense: 1000000, assets: 0, age: 65 },
    { label: '음수 방어', monthlyPension: -100, monthlyExpense: -200, assets: -300, age: -1 },
  ];

  const calculatePension = () => {
    const data = analyzeRetirementIncome({
      monthlyPension: Number(monthlyPension) || 0,
      monthlyExpense: Number(monthlyExpense) || 0,
      assets: Number(assets) || 0,
      age: Number(age) || 0,
      lifeExpectancy: 90,
    });
    setDiagnosis(data);
  };

  return (
    <div className="scroll screen-anim" style={{ paddingBottom: 'calc(var(--tab-h) + 20px)' }}>
      <div className="hero" style={{ paddingTop: 58, paddingBottom: 24 }}>
        <div className="between" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pill pill-ghost" style={{ width: 'fit-content', marginBottom: 10 }}>음성 모드</div>
            <h2 style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 900, letterSpacing: '-.4px', marginBottom: 8 }}>
              음성으로
              <br />필요한 금융 안내를 받아보세요
            </h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(255,255,255,.82)' }}>
              연금, 생활비, 디지털 금융 안내 등 여러 시나리오를 큰 버튼과 쉬운 말로 도와드려요.
            </p>
          </div>
          <button
            onClick={() => setSeniorMode && setSeniorMode((value) => !value)}
            className="pill"
            style={{
              background: 'rgba(255,255,255,.14)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,.22)',
              padding: '9px 12px',
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {seniorMode ? '시니어 모드 ON' : '시니어 모드 OFF'}
          </button>
        </div>
      </div>

      <div style={{ padding: '18px 18px 0' }} className="stagger">
        {voice.error && (
          <div className="card" style={{ marginBottom: 12, background: '#fff4f4', border: '1px solid #ffd6d6', color: '#c33', fontSize: 14 }}>
            ⚠️ {voice.error}
          </div>
        )}

        <div className="card" style={{ marginBottom: 12, padding: 16 }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <b style={{ fontSize: 15.5 }}>음성 호출</b>
            <span className={voice.isListening ? 'pill pill-pos' : 'pill pill-teal'} style={{ fontSize: 11.5 }}>
              {voice.isListening ? '듣는 중' : '대기 중'}
            </span>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => (voice.isListening ? voice.stopListening() : voice.startListening())}
              className="btn btn-primary"
              style={{ flex: 1, minWidth: 140, height: 52, fontSize: 15.5 }}
              disabled={isSpeaking}
            >
              {voice.isListening ? '🔴 듣는 중 · 중지' : '🎤 말하기 시작'}
            </button>

            <button
              onClick={runSample}
              className="btn btn-line"
              style={{ flex: 1, minWidth: 120, height: 52, fontSize: 14.5 }}
              disabled={isSpeaking || voice.isListening}
            >
              샘플 질문
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12, padding: 16 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 15.5 }}>실시간 자막</b>
            <span className="muted" style={{ fontSize: 12.5 }}>말하는 내용을 그대로 보여줘요</span>
          </div>
          <div style={{ minHeight: 72, fontSize: 16, lineHeight: 1.6, color: voice.transcript ? 'var(--ink)' : 'var(--slate-400)' }}>
            {voice.transcript || '(말해주세요...)'}
          </div>
        </div>

        <div className="card" style={{ padding: 16, maxHeight: 240, overflowY: 'auto', marginBottom: 12 }} ref={messagesRef}>
          <div className="between" style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 15.5 }}>대화 기록</b>
            <button
              onClick={() => { setMessages([]); resetPensionAgent(); }}
              className="pill"
              style={{ fontSize: 11.5, background: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer' }}
            >
              대화 초기화
            </button>
          </div>

          {messages.length === 0 ? (
            <div style={{ color: 'var(--slate-400)', fontSize: 14, textAlign: 'center', padding: '18px 10px' }}>
              🎤 마이크를 누르고 말씀해주세요
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ margin: '8px 0', textAlign: m.from === 'user' ? 'right' : 'left' }}>
                <div
                  style={{
                    display: 'inline-block',
                    background: m.from === 'user' ? 'var(--teal-100)' : 'var(--bg)',
                    border: `1px solid ${m.from === 'user' ? 'var(--teal-100)' : 'var(--line)'}`,
                    padding: '10px 12px',
                    borderRadius: 14,
                    maxWidth: '86%',
                    wordWrap: 'break-word',
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: m.loading ? 'var(--slate-400)' : 'var(--ink)',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pension diagnosis */}
        <div className="card" style={{ marginBottom: 12, padding: 14 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 15.5 }}>연금 기반 월 생활비 관리</b>
            <span className="muted" style={{ fontSize: 12 }}>연금 조회 → 생활비 비교 → 소진 시점 시뮬레이션</span>
          </div>

          <div className="card" style={{ marginBottom: 10, padding: 12, background: 'var(--teal-50)', border: '1px solid var(--teal-100)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6 }}>각 항목은 이런 의미예요</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--slate-700)' }}>
              <div><b>월 연금액</b>: 지금 매달 실제로 들어오는 연금 금액이에요.</div>
              <div><b>월 평균 생활비</b>: 매달 평균적으로 쓰는 생활비예요.</div>
              <div><b>보유 자산</b>: 연금 외에 함께 쓸 수 있는 자산이에요.</div>
              <div><b>나이</b>: 현재 나이예요. 소진 시점 계산에 쓰여요.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>월 연금액</span>
              <input type="number" value={monthlyPension} onChange={e => setMonthlyPension(e.target.value)} placeholder="예: 1500000" style={{ padding:10, borderRadius:10, border:'1px solid var(--line)' }} />
            </label>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>월 평균 생활비</span>
              <input type="number" value={monthlyExpense} onChange={e => setMonthlyExpense(e.target.value)} placeholder="예: 1500000" style={{ padding:10, borderRadius:10, border:'1px solid var(--line)' }} />
            </label>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>보유 자산</span>
              <input type="number" value={assets} onChange={e => setAssets(e.target.value)} placeholder="예: 50000000" style={{ padding:10, borderRadius:10, border:'1px solid var(--line)' }} />
            </label>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>나이</span>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="예: 67" style={{ padding:10, borderRadius:10, border:'1px solid var(--line)' }} />
            </label>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={calculatePension} className="btn btn-primary" style={{ flex:1, height:44 }}>계산하기</button>
            <button onClick={() => { setDiagnosis(null); setMonthlyPension(''); setMonthlyExpense(''); setAssets(''); setAge(''); }} className="btn btn-line" style={{ flex:1, height:44 }}>초기화</button>
          </div>
        </div>

        {diagnosis && (
          <div style={{ display:'grid', gap:10, marginBottom:12 }}>
            <div className="card" style={{ padding:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:15 }}>진단 결과: {diagnosis.status}</div>
                <div className="muted" style={{ marginTop:6 }}>{diagnosis.summary}</div>
                <div className="muted" style={{ marginTop:6, fontSize:12.5 }}>{diagnosis.recommendation}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:900, fontSize:18 }}>{Math.abs(diagnosis.expenseComparison.gap).toLocaleString('ko-KR')}원</div>
                <div className="muted" style={{ fontSize:12 }}>{diagnosis.expenseComparison.gap >= 0 ? '월 여유액' : '월 부족액'}</div>
              </div>
            </div>

            <div className="card" style={{ padding:12, display:'grid', gap:8 }}>
              <div className="between"><span className="muted">월 연금액</span><b>{diagnosis.pensionLookup.monthlyPension.toLocaleString('ko-KR')}원</b></div>
              <div className="between"><span className="muted">월 평균 생활비</span><b>{diagnosis.expenseComparison.monthlyExpense.toLocaleString('ko-KR')}원</b></div>
              <div className="between"><span className="muted">보유 자산</span><b>{diagnosis.inputs.assets.toLocaleString('ko-KR')}원</b></div>
              <div className="between"><span className="muted">나이</span><b>{diagnosis.inputs.age}세</b></div>
              <div className="between"><span className="muted">소진 예상 시점</span><b>{diagnosis.depletionSimulation.depletionLabel}</b></div>
              <div className="between"><span className="muted">생활비 대비 충족률</span><b>{Math.round(diagnosis.expenseComparison.coverageRatio * 100)}%</b></div>
            </div>

            <div className="card" style={{ padding:12, display:'grid', gap:8 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>시나리오별 생활 가능 기간</div>
              {diagnosis.scenarios.map((s) => (
                <div key={s.name} className="between" style={{ fontSize: 13.5 }}>
                  <span className="muted">{s.name}</span>
                  <b>{s.lifeCoverage}</b>
                </div>
              ))}
            </div>

          </div>
        )}

        {isSpeaking && (
          <div className="card" style={{ marginBottom: 12, background: 'var(--teal-50)', border: '1px solid var(--teal-100)', color: 'var(--teal-700)', padding: 14, fontSize: 13.5 }}>
            🔊 답변을 읽는 중이에요...
          </div>
        )}

      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.Senior = Senior;
}

export { Senior };