/* =========================================================================
   제이비스 (JAYBIS) — AI 에이전트 채팅
   도구 호출(Tool Use) 시퀀스를 시각화하는 대화형 진단
   ========================================================================= */

function Chat({ onClose, seed }) {
  const [msgs, setMsgs] = useState([
    { id:'g1', who:'ai', kind:'text', text:'안녕하세요 도윤님, 금융비서 제이비스예요. 자산·소비·상품 무엇이든 물어보세요. 거래내역을 직접 분석해 답해드릴게요.' },
  ]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const idRef = useRef(2);
  const nid = () => 'm' + (idRef.current++);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  const push = (m) => setMsgs(prev => [...prev, { id: nid(), ...m }]);

  function classify(text) {
    const t = text.replace(/\s/g, '');
    if (/(많이썼|소비|어디에|지출|돈)/.test(t)) return 'spend';
    if (/(상품|추천|도약|적금|청약)/.test(t)) return 'product';
    if (/(자산|진단|순자산|부채)/.test(t)) return 'asset';
    if (/(구독|넷플|OTT|정리)/.test(t)) return 'subs';
    return 'default';
  }

  function respond(text) {
    if (busy) return;
    push({ who:'me', kind:'text', text });
    setBusy(true);
    const kind = classify(text);

    if (kind === 'spend') {
      // 도구 호출 시퀀스
      push({ who:'ai', kind:'tools', seq: CHAT_TOOLSEQ });
      const total = CHAT_TOOLSEQ.reduce((s,t)=>s+t.ms,0) + 500;
      setTimeout(() => {
        push({ who:'ai', kind:'spendResult' });
        push({ who:'ai', kind:'chips', items:['구독 정리하고 싶어','외식 줄이는 팁 줘'] });
        setBusy(false);
      }, total);
      return;
    }
    const map = {
      product: () => {
        push({ who:'ai', kind:'text', text:'도윤님 조건이면 청년도약계좌가 1순위예요. 저축 여력이 또래보다 높아 비과세 혜택을 가장 크게 받을 수 있어요.' });
        push({ who:'ai', kind:'productResult' });
        push({ who:'ai', kind:'chips', items:['청년도약계좌가 왜 1순위야?','월 얼마씩 넣어야 해?'] });
      },
      asset: () => {
        push({ who:'ai', kind:'text', text:'지금 순자산은 1,248만원, 부채비율 17.9%로 건전해요. 다만 비상금이 1.4개월분이라 3개월분까지 늘리는 걸 추천해요.' });
        push({ who:'ai', kind:'assetResult' });
      },
      subs: () => {
        push({ who:'ai', kind:'text', text:'정기결제 5건 중 OTT 3개가 겹쳐요. 넷플릭스만 남기고 둘을 해지하면 매달 18,500원, 1년이면 222,000원을 아껴요.' });
        push({ who:'ai', kind:'chips', items:['해지 방법 알려줘','다른 절약 포인트는?'] });
      },
      default: () => {
        push({ who:'ai', kind:'text', text:'좋은 질문이에요. 거래내역과 자산 데이터를 기준으로 도와드릴게요. 아래에서 골라보셔도 좋아요.' });
        push({ who:'ai', kind:'chips', items: CHAT_QUICK });
      },
    };
    setTimeout(() => { map[kind](); setBusy(false); }, 700);
  }

  useEffect(() => {
    if (seed) { const t = setTimeout(() => respond(seed), 380); return () => clearTimeout(t); }
  }, []);

  return (
    <div style={{ position:'absolute', inset:0, zIndex:200, display:'flex', flexDirection:'column', background:'var(--bg)', animation:'screenIn .3s ease' }}>
      <StatusBar dark={false} />
      {/* 헤더 */}
      <div style={{ paddingTop:47, background:'linear-gradient(160deg,var(--teal-700),var(--teal-600))', color:'#fff', flexShrink:0 }}>
        <div className="between" style={{ height:54, padding:'0 14px' }}>
          <div className="row" style={{ gap:10 }}>
            <span style={{ width:38, height:38, borderRadius:12, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="sparkF" size={20} color="#fff" />
            </span>
            <div>
              <div style={{ fontSize:15, fontWeight:800 }}>제이비스</div>
              <div className="row" style={{ gap:5, fontSize:11.5, color:'rgba(255,255,255,.8)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal-300)' }} /> 온라인 · 마이데이터 연결됨
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:38, height:38, borderRadius:12, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="chevD" size={22} color="#fff" />
          </button>
        </div>
      </div>

      {/* 메시지 */}
      <div ref={scrollRef} className="scroll" style={{ padding:'18px 16px 8px', display:'flex', flexDirection:'column', gap:12 }}>
        {msgs.map((m) => <Message key={m.id} m={m} onChip={respond} />)}
        {busy && <TypingBubble />}
        <div style={{ height:4 }} />
      </div>

      {/* 빠른 답변 (초기) */}
      {msgs.length <= 1 && (
        <div style={{ padding:'0 16px 10px', display:'flex', gap:8, flexWrap:'wrap', flexShrink:0 }}>
          {CHAT_QUICK.map((q,i) => (
            <button key={i} onClick={() => respond(q)} className="pill" style={{ background:'var(--card)', border:'1px solid var(--teal-100)', color:'var(--teal-700)', fontSize:12.5, padding:'9px 13px' }}>{q}</button>
          ))}
        </div>
      )}

      {/* 입력 바 */}
      <div style={{ padding:'10px 14px 26px', background:'var(--card)', borderTop:'1px solid var(--line)', flexShrink:0 }}>
        <div className="row" style={{ gap:9 }}>
          <button style={{ width:42, height:42, borderRadius:13, background:'var(--teal-50)', display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' }}>
            <Icon name="mic" size={20} color="var(--teal-600)" />
          </button>
          <div className="row" style={{ flex:1, background:'var(--bg)', borderRadius:14, padding:'0 6px 0 15px', border:'1px solid var(--line)' }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && input.trim()) { respond(input.trim()); setInput(''); } }}
              placeholder="제이비스에게 물어보기" style={{ flex:1, height:42, border:'none', background:'none', fontSize:14.5, outline:'none', color:'var(--ink)' }} />
            <button onClick={() => { if (input.trim()) { respond(input.trim()); setInput(''); } }}
              style={{ width:34, height:34, borderRadius:10, background: input.trim()?'var(--teal-600)':'var(--slate-300)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .2s' }}>
              <Icon name="send" size={18} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ m, onChip }) {
  if (m.who === 'me') return (
    <div style={{ display:'flex', justifyContent:'flex-end' }}>
      <div className="bubble bubble-me">{m.text}</div>
    </div>
  );
  if (m.kind === 'text') return (
    <div style={{ display:'flex', justifyContent:'flex-start' }}><div className="bubble bubble-ai">{m.text}</div></div>
  );
  if (m.kind === 'tools') return <ToolSequence seq={m.seq} />;
  if (m.kind === 'chips') return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingLeft:2 }}>
      {m.items.map((q,i) => (
        <button key={i} onClick={() => onChip(q)} className="pill" style={{ background:'var(--card)', border:'1px solid var(--teal-100)', color:'var(--teal-700)', fontSize:12.5, padding:'9px 13px' }}>{q}</button>
      ))}
    </div>
  );
  if (m.kind === 'spendResult') return <SpendResultCard />;
  if (m.kind === 'productResult') return <ChatProductCard />;
  if (m.kind === 'assetResult') return <ChatAssetCard />;
  return null;
}

function ToolSequence({ seq }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= seq.length) return;
    const t = setTimeout(() => setDone(d => d+1), seq[done].ms);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, maxWidth:'82%' }}>
      {seq.map((s,i) => {
        if (i > done) return null;
        const fin = i < done;
        return (
          <div key={i} className="tool-line" style={{ opacity: i===done && !fin ? 1 : 1 }}>
            {fin ? <Icon name="check" size={14} color="var(--teal-600)" stroke={2.6} />
                 : <span className="dot-pulse" />}
            <span style={{ fontWeight:700, color:'var(--teal-800)' }}>{s.tool}</span>
            <span style={{ color:'var(--slate-500)' }}>· {s.detail}</span>
          </div>
        );
      })}
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display:'flex', justifyContent:'flex-start' }}>
      <div className="bubble bubble-ai" style={{ display:'flex', gap:5, padding:'14px 16px' }}>
        {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--slate-300)', animation:'pulse 1s infinite', animationDelay:(i*.15)+'s' }} />)}
      </div>
    </div>
  );
}

/* ---- 결과 카드들 ---------------------------------------------------------- */
function SpendResultCard() {
  return (
    <div className="card" style={{ maxWidth:'90%', animation:'pop .3s ease', boxShadow:'var(--shadow-md)' }}>
      <div className="between" style={{ marginBottom:11 }}>
        <b style={{ fontSize:14, fontWeight:800, color:'var(--ink)' }}>이번 달 소비 진단</b>
        <span className="pill pill-warn" style={{ fontSize:10.5 }}>주의 1건</span>
      </div>
      {[
        { l:'외식·배달', v:290000, peer:210000, warn:true },
        { l:'쇼핑', v:268000, peer:240000 },
        { l:'구독·OTT', v:48000, peer:22000, warn:true },
      ].map((x,i) => {
        const max = Math.max(x.v, x.peer)*1.1;
        return (
          <div key={i} style={{ padding:'8px 0', borderTop: i? '1px solid var(--line)':'none' }}>
            <div className="between" style={{ marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{x.l}</span>
              <span className="tnum" style={{ fontSize:13, fontWeight:800, color: x.warn?'var(--neg)':'var(--ink)' }}>{won(x.v)}</span>
            </div>
            <Bar value={x.v/max*100} color={x.warn?'var(--warn)':'var(--teal-600)'} height={6} />
          </div>
        );
      })}
      <div style={{ marginTop:12, padding:'11px 13px', background:'var(--teal-50)', borderRadius:11 }}>
        <p style={{ fontSize:12.5, lineHeight:1.55, color:'var(--teal-800)', fontWeight:500 }}>
          외식·배달이 또래보다 <b>38% 많아요</b>. 주 2회로 줄이고 OTT를 1개로 정리하면 <b>월 98,500원</b>을 아낄 수 있어요.
        </p>
      </div>
    </div>
  );
}

function ChatProductCard() {
  const p = PRODUCTS[0];
  return (
    <div className="card" style={{ maxWidth:'90%', animation:'pop .3s ease', boxShadow:'var(--shadow-md)' }}>
      <div className="between">
        <div>
          <div className="row" style={{ gap:6 }}>
            <b style={{ fontSize:15, fontWeight:800, color:'var(--ink)' }}>{p.name}</b>
            <span className="pill pill-pos" style={{ fontSize:10 }}>1순위</span>
          </div>
          <div className="muted" style={{ fontSize:12, marginTop:2 }}>{p.tagline}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10.5, color:'var(--slate-400)', fontWeight:600 }}>금리</div>
          <div className="tnum" style={{ fontSize:15, fontWeight:800, color:p.tone }}>{p.rate}</div>
        </div>
      </div>
      <div className="row" style={{ justifyContent:'space-between', marginTop:13, padding:'12px 0 0', borderTop:'1px solid var(--line)' }}>
        <div style={{ textAlign:'center', flex:1 }}>
          <div className="muted" style={{ fontSize:11 }}>월 70만원 × 5년</div>
          <div className="tnum" style={{ fontSize:15, fontWeight:800, color:'var(--teal-600)', marginTop:3 }}>약 5,055만원</div>
        </div>
      </div>
    </div>
  );
}

function ChatAssetCard() {
  return (
    <div className="card" style={{ maxWidth:'90%', animation:'pop .3s ease', boxShadow:'var(--shadow-md)' }}>
      <div className="row" style={{ gap:14, justifyContent:'space-around' }}>
        <div style={{ textAlign:'center' }}>
          <Donut value={ASSETS.debtRatio} size={70} stroke={8} label={pct(ASSETS.debtRatio,0)} color="var(--teal-600)" />
          <div style={{ fontSize:11.5, fontWeight:700, color:'var(--slate-600)', marginTop:7 }}>부채비율</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <Donut value={ASSETS.retireReady} size={70} stroke={8} label={pct(ASSETS.retireReady,0)} color="#f59e0b" />
          <div style={{ fontSize:11.5, fontWeight:700, color:'var(--slate-600)', marginTop:7 }}>은퇴준비율</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div className="tnum" style={{ fontSize:22, fontWeight:800, color:'var(--ink)', marginTop:18 }}>{manwon(ASSETS.netWorth)}</div>
          <div style={{ fontSize:11.5, fontWeight:700, color:'var(--slate-600)', marginTop:7 }}>순자산</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Chat });
