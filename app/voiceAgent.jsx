import { useState, useRef, useEffect } from 'react';

export function useVoiceAgent({ onResult } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('음성 인식을 지원하지 않는 브라우저입니다.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = false;

    rec.onstart = () => {
      setError(null);
    };

    rec.onresult = (e) => {
      let isFinal = false;
      let text = '';
      
      // 모든 결과를 순회하며 최종 결과 확인
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          isFinal = true;
        }
      }
      
      setTranscript(text);
      
      // 최종 인식 결과일 때만 onResult 호출
      if (isFinal && onResultRef.current && text.trim()) {
        onResultRef.current(text);
      }
    };

    rec.onerror = (e) => {
      setError(`음성 인식 오류: ${e.error}`);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch (e) {}
    };
  }, []);

  function startListening() {
    if (!recognitionRef.current) {
      setError('음성 인식이 준비되지 않았습니다.');
      return;
    }
    try {
      setTranscript('');
      setError(null);
      setIsListening(true);
      recognitionRef.current.start();
    } catch (e) {
      setError(`시작 오류: ${e.message}`);
      setIsListening(false);
    }
  }

  function stopListening() {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.error('중지 오류:', e);
    }
    setIsListening(false);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.9; // 시니어 사용자 대상 약간 느린 속도
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return { isListening, transcript, error, startListening, stopListening, speak };
}

export default useVoiceAgent;
