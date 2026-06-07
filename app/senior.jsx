import React, { useState } from 'react';
import { useVoiceAgent } from './voiceAgent';
import { handleIntent } from './agentHandlers';

export default function Senior({ seniorMode, setSeniorMode }) {
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakResponse = (text) => {
    setIsSpeaking(true);
    voice.speak(text);
    window.setTimeout(() => setIsSpeaking(false), 1800);
  };

  const voice = useVoiceAgent({
    onResult: async (text) => {
      if (!text || !text.trim()) return;
      setMessages((current) => [...current, { from: 'user', text }]);
      const result = await handleIntent(text);
      setMessages((current) => [...current, { from: 'agent', text: result.message }]);
      speakResponse(result.message);
    },
  });

  const runSample = () => {
    const sample = '내 연금으로 월 생활비 얼마나 가능해?';
    setMessages((current) => [...current, { from: 'user', text: sample }]);
    handleIntent(sample).then((result) => {
      setMessages((current) => [...current, { from: 'agent', text: result.message }]);
      speakResponse(result.message);
    });
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

        {isSpeaking && (
          <div className="card" style={{ marginBottom: 12, background: 'var(--teal-50)', border: '1px solid var(--teal-100)', color: 'var(--teal-700)', padding: 14, fontSize: 13.5 }}>
            🔊 답변을 읽는 중이에요...
          </div>
        )}

        <div className="card" style={{ padding: 16, maxHeight: 300, overflowY: 'auto' }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 15.5 }}>대화 기록</b>
            <span className="muted" style={{ fontSize: 12.5 }}>{messages.length}개 메시지</span>
          </div>

          {messages.length === 0 ? (
            <div style={{ color: 'var(--slate-400)', fontSize: 14, textAlign: 'center', padding: '24px 10px' }}>
              🎤 마이크를 누르고 말씀해주세요
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ margin: '10px 0', textAlign: m.from === 'user' ? 'right' : 'left' }}>
                <div
                  style={{
                    display: 'inline-block',
                    background: m.from === 'user' ? 'var(--teal-100)' : 'var(--bg)',
                    border: `1px solid ${m.from === 'user' ? 'var(--teal-100)' : 'var(--line)'}`,
                    padding: '12px 14px',
                    borderRadius: 14,
                    maxWidth: '86%',
                    wordWrap: 'break-word',
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: 'var(--ink)',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// register for legacy main.jsx usage
if (typeof window !== 'undefined') {
  window.Senior = Senior;
}

export { Senior };
