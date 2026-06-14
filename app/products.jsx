/* =========================================================================
   제이비스 (JAYBIS) — 청년 금융상품 로드맵 + 납입 시뮬레이터
   ========================================================================= */

const {
  useState, useEffect, TopBar, SectionLabel, Icon, stagger,
  PRODUCTS, SIM, simulate, won, manwon,
  useJaybisRuntimeData, refreshSupabaseFinancialProducts,
} = window;

function Products({ nav, toast }) {
  const [snapshot] = useJaybisRuntimeData();
  const recommendation = snapshot.raw?.productRecommendation || null;
  const baseProducts = snapshot.products?.length ? snapshot.products : PRODUCTS;
  const products = applyRecommendedProductOrder(baseProducts, recommendation);
  const sim = snapshot.sim || SIM;
  const [selectedProductId, setSelectedProductId] = useState('');
  const selectedProduct = products.find((product) => product.id === selectedProductId) || products[0] || null;
  const simOption = buildProductSimulationOption(selectedProduct, sim);
  const [monthly, setMonthly] = useState(simOption.defaultMonthly);
  const [termYears, setTermYears] = useState(simOption.defaultYears);
  const [productOpen, setProductOpen] = useState(false);
  const [loadState, setLoadState] = useState('idle');
  const [loadError, setLoadError] = useState('');
  const r = simulateProductPlan({ product: selectedProduct, monthly, years: termYears, fallbackSim: sim });
  const hasProducts = products.length > 0;

  const getApplyUrl = (product) => {
    const direct = product.applyUrl || product.apply_url || product.joinUrl || product.join_url || product.productUrl || product.product_url || product.sourceUrl || product.source_url;
    if (direct) return direct;
    const text = [product.provider, product.issuer, product.name, ...(Array.isArray(product.tags) ? product.tags : [])].filter(Boolean).join(' ');
    if (/광주은행|광주/.test(text)) return 'https://www.kjbank.com';
    if (/전북은행|JB|전북/.test(text)) return 'https://www.jbbank.co.kr';
    return '';
  };

  const openApplyPage = (product) => {
    const url = getApplyUrl(product);
    if (!url) {
      toast(product.name + ' 비대면 가입 URL이 아직 연결되지 않았어요');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    toast(product.name + ' 가입 페이지로 이동해요');
  };

  useEffect(() => {
    let alive = true;
    setLoadState('loading');
    refreshSupabaseFinancialProducts()
      .then((next) => {
        if (!alive) return;
        setLoadState('done');
        const nextDefault = next.sim?.defaultMonthly ?? sim.defaultMonthly;
        if (!monthly && nextDefault) setMonthly(nextDefault);
      })
      .catch((error) => {
        if (!alive) return;
        setLoadState('error');
        setLoadError(error?.message || '상품 데이터를 불러오지 못했어요.');
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selectedProductId && products[0]?.id) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    setMonthly((current) => clampMonthly(current || simOption.defaultMonthly, simOption));
    setTermYears((current) => simOption.yearOptions.includes(current) ? current : simOption.defaultYears);
  }, [selectedProduct?.id]);

  return (
    <div className="scroll screen-anim">
      <TopBar title="금융상품" right={<span className="pill pill-teal" style={{ fontSize:11.5 }}>청년 맞춤</span>} />

      <div style={{ padding:'2px 18px 26px' }} className="stagger">
        {/* ---- 인트로 ---- */}
        <div className="card" style={{ ...stagger(0), padding:'16px 18px' }}>
          <div className="row" style={{ gap:10 }}>
            <span style={{ width:38, height:38, borderRadius:12, background:'var(--teal-900)', display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' }}>
              <Icon name="sparkF" size={20} color="var(--teal-300)" />
            </span>
            <div>
              <div style={{ fontSize:14.5, fontWeight:800, color:'var(--ink)' }}>
                {hasProducts ? `가입 가능한 상품 ${products.length}개` : loadState === 'loading' ? '상품 데이터 불러오는 중' : '상품 데이터 대기 중'}
              </div>
              <div className="muted" style={{ fontSize:12.5, marginTop:2 }}>
                {recommendation?.profile
                  ? `${formatRecommendationProfile(recommendation.profile)} 기준으로 정렬했어요`
                  : hasProducts ? 'Supabase 금융상품 데이터를 반영했어요' : loadError || 'financial_products 테이블 데이터가 연결되면 로드맵을 계산합니다'}
              </div>
            </div>
          </div>
        </div>

        {/* ---- 우선순위 로드맵 ---- */}
        <div style={{ marginTop:20, ...stagger(1) }}>
          <SectionLabel>우선순위 로드맵</SectionLabel>
          <div style={{ position:'relative', paddingLeft:4 }}>
            {/* 세로 라인 */}
            <div style={{ position:'absolute', left:22, top:14, bottom:24, width:2, background:'var(--line)' }} />
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              {hasProducts ? products.map((p,i) => (
                <div key={p.id} style={{ position:'relative', paddingLeft:46 }}>
                  <span style={{ position:'absolute', left:8, top:18, width:28, height:28, borderRadius:'50%',
                    background:p.tone, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight:800, zIndex:1, boxShadow:'0 2px 6px '+p.tone+'66' }}>{i + 1}</span>
                  <ProductCard p={p} onApply={() => openApplyPage(p)} />
                </div>
              )) : (
                <div className="card" style={{ padding:'16px 18px', marginLeft:0 }}>
                  <b style={{ fontSize:14.5, color:'var(--ink)' }}>연결할 상품이 없습니다</b>
                  <p className="muted" style={{ fontSize:12.5, lineHeight:1.55, marginTop:6 }}>
                    Supabase `financial_products` 테이블을 읽을 수 있으면 이 영역에 실제 상품이 표시됩니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- 납입 시뮬레이터 ---- */}
        <div style={{ marginTop:24, ...stagger(2) }}>
          <SectionLabel>납입 시뮬레이터</SectionLabel>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'16px 18px', background:'var(--teal-900)', color:'#fff' }}>
              <div className="between">
                <div className="row" style={{ gap:7 }}>
                  <Icon name="piggy" size={18} color="var(--teal-300)" />
                  <b style={{ fontSize:13.5, fontWeight:700 }}>{selectedProduct?.name || sim.productName}</b>
                </div>
                <span className="pill" style={{ background:'rgba(94,234,212,.18)', color:'var(--teal-300)', fontSize:10.5 }}>
                  {termYears}년 {r.taxSaved ? '· 절세 반영' : ''}
                </span>
              </div>
              <div style={{ textAlign:'center', marginTop:16 }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', fontWeight:600 }}>{termYears}년 뒤 예상 수령액</div>
                <div className="tnum" style={{ fontSize:34, fontWeight:800, letterSpacing:'-1px', marginTop:4 }}>{won(r.total)}</div>
                <div className="row" style={{ justifyContent:'center', gap:6, marginTop:8 }}>
                  <span className="pill" style={{ background:'rgba(255,255,255,.14)', color:'#fff', fontSize:10.5 }}>+ 정부기여 {won(r.govMatch)}</span>
                  <span className="pill" style={{ background:'rgba(255,255,255,.14)', color:'#fff', fontSize:10.5 }}>+ 이자 {won(r.interest)}</span>
                  <span className="pill" style={{ background:'rgba(255,255,255,.14)', color:'#fff', fontSize:10.5 }}>+ 절세 {won(r.taxSaved)}</span>
                </div>
              </div>
            </div>

            <div style={{ padding:'18px 18px 20px' }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>상품 선택</div>
                <button
                  onClick={() => setProductOpen((open) => !open)}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'11px 12px', borderRadius:12, border:'1.5px solid var(--teal-600)', background:'var(--teal-50)', textAlign:'left' }}
                >
                  <span style={{ minWidth:0 }}>
                    <span style={{ display:'block', fontSize:13.5, fontWeight:800, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedProduct?.name || '상품을 선택하세요'}</span>
                    <span className="muted" style={{ display:'block', fontSize:11.5, marginTop:1 }}>{selectedProduct?.rateLabel || selectedProduct?.rate || selectedProduct?.benefit || '상품 조건 기반 계산'}</span>
                  </span>
                  <Icon name="chevR" size={17} color="var(--teal-600)" style={{ transform: productOpen ? 'rotate(90deg)' : 'none', transition:'transform .18s ease' }} />
                </button>
                {productOpen && (
                  <div style={{ display:'grid', gap:7, marginTop:8, maxHeight:250, overflowY:'auto', paddingRight:2 }}>
                    {products.map((product) => {
                      const selected = selectedProduct?.id === product.id;
                      return (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setProductOpen(false);
                          }}
                          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'10px 11px', borderRadius:12, border:selected ? '1.5px solid var(--teal-600)' : '1px solid var(--line)', background:selected ? 'var(--teal-50)' : 'var(--bg)', textAlign:'left' }}
                        >
                          <span style={{ minWidth:0 }}>
                            <span style={{ display:'block', fontSize:13, fontWeight:800, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{product.name}</span>
                            <span className="muted" style={{ display:'block', fontSize:11.5, marginTop:1 }}>{product.rateLabel || product.rate || product.benefit || '상품 조건 기반 계산'}</span>
                          </span>
                          {selected && <Icon name="check" size={16} color="var(--teal-600)" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {isYouthLeapProduct(selectedProduct) && (
                  <p className="muted" style={{ fontSize:11.5, lineHeight:1.45, marginTop:7 }}>
                    청년도약계좌는 상품 데이터에 별도 기여율이 없으면 월 최대 24,000원 기준의 정부기여금을 기본 반영합니다.
                  </p>
                )}
              </div>

              <div className="between" style={{ marginBottom:13 }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:'var(--ink)' }}>월 납입액</span>
                <span className="tnum" style={{ fontSize:18, fontWeight:800, color:'var(--teal-600)' }}>{won(monthly)}</span>
              </div>
              <input type="range" className="sim" min={simOption.minMonthly} max={simOption.maxMonthly} step={simOption.stepMonthly}
                value={monthly} onChange={e => setMonthly(+e.target.value)} />
              <div className="between" style={{ marginTop:6 }}>
                <span className="muted tnum" style={{ fontSize:11 }}>{manwon(simOption.minMonthly)}원</span>
                <span className="muted tnum" style={{ fontSize:11 }}>{manwon(simOption.maxMonthly)}원</span>
              </div>

              <div style={{ marginTop:16 }}>
                <div className="between" style={{ marginBottom:8 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--ink)' }}>기간 선택</div>
                  <span className="muted" style={{ fontSize:11.5 }}>{simOption.minYears}년~{simOption.maxYears}년</span>
                </div>
                <div className="seg">
                  {simOption.yearOptions.map((year) => (
                    <button key={year} className={termYears === year ? 'on' : ''} onClick={() => setTermYears(year)}>{year}년</button>
                  ))}
                </div>
              </div>

              <div className="divider" style={{ margin:'18px 0' }} />

              {[
                { t:`${termYears}년 총 납입 원금`, v:won(r.principal) },
                { t:'정부기여금', v:'+ '+won(r.govMatch), pos:true },
                { t:'이자 수익', v:'+ '+won(r.interest), pos:true },
                { t:'비과세 절세 효과', v:'+ '+won(r.taxSaved), pos:true },
              ].map((x,i) => (
                <div key={i} className="between" style={{ padding:'7px 0' }}>
                  <span className="muted" style={{ fontSize:13 }}>{x.t}</span>
                  <span className="tnum" style={{ fontSize:14, fontWeight:700, color: x.pos?'var(--pos)':'var(--ink)' }}>{x.v}</span>
                </div>
              ))}

              <button onClick={() => openApplyPage(selectedProduct || { name: sim.productName })} className="btn btn-primary" style={{ marginTop:16 }}>
                이 조건으로 가입하기
              </button>
            </div>
          </div>
        </div>

        {/* ---- 코칭 힌트 ---- */}
        <button onClick={() => nav('chat')} className="card row" style={{ marginTop:14, ...stagger(3), gap:11, width:'100%', textAlign:'left', background:'var(--teal-50)', border:'1px solid var(--teal-100)' }}>
          <Icon name="chat" size={20} color="var(--teal-700)" />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13.5, fontWeight:700, color:'var(--teal-800)' }}>&quot;이 상품이 왜 1순위야?&quot;</div>
            <div style={{ fontSize:12, color:'var(--teal-700)', marginTop:2 }}>제이비스가 추천 이유를 쉽게 코칭해줘요</div>
          </div>
          <Icon name="chevR" size={17} color="var(--teal-600)" />
        </button>
      </div>
    </div>
  );
}

function applyRecommendedProductOrder(products = [], recommendation = null) {
  const ids = Array.isArray(recommendation?.productIds) ? recommendation.productIds : [];
  if (!ids.length) return products;
  const order = new Map(ids.map((id, index) => [id, index]));
  return [...products].sort((a, b) => {
    const aOrder = order.has(a.id) ? order.get(a.id) : 999;
    const bOrder = order.has(b.id) ? order.get(b.id) : 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return Number(a.rank || 99) - Number(b.rank || 99);
  });
}

function formatRecommendationProfile(profile = {}) {
  const incomeLabel = profile.incomeType === 'annual'
    ? `연소득 ${won(profile.income || 0)}`
    : `월소득 ${won(profile.income || 0)}`;
  const homelessLabel = profile.isHomeless === true ? '무주택' : '유주택';
  return `${profile.age || '-'}세 · ${incomeLabel} · ${homelessLabel} · 월 납입 ${won(profile.monthlySavingsCapacity || 0)}`;
}

function numberOr(value, fallback = 0) {
  const next = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function rateFromProduct(product = {}, fallback = 0) {
  const simulation = product.simulation || {};
  const rawRate = numberOr(simulation.rateAnnual ?? simulation.rate_annual ?? product.rateAnnual ?? product.rate_annual ?? product.maxRate ?? product.max_rate ?? product.minRate ?? product.min_rate, fallback);
  return rawRate > 1 ? rawRate / 100 : rawRate;
}

function buildProductSimulationOption(product, fallbackSim = SIM) {
  const limits = product?.limits || {};
  const simulation = product?.simulation || {};
  const unit = 10000;
  const rawMaxMonthly = numberOr(product?.maxMonthly ?? product?.max_monthly ?? limits.maxMonthly ?? limits.max_monthly, fallbackSim.maxMonthly || 1000000);
  const rawMinMonthly = numberOr(product?.minMonthly ?? product?.min_monthly ?? limits.minMonthly ?? limits.min_monthly, fallbackSim.minMonthly || 0);
  const minMonthly = Math.ceil(rawMinMonthly / unit) * unit;
  const maxMonthly = Math.max(minMonthly, Math.floor(rawMaxMonthly / unit) * unit);
  const stepMonthly = unit;
  const rawDefaultMonthly = numberOr(simulation.defaultMonthly ?? simulation.default_monthly ?? fallbackSim.defaultMonthly, Math.min(maxMonthly, 300000));
  const defaultMonthly = Math.min(maxMonthly, Math.max(minMonthly, Math.round(rawDefaultMonthly / unit) * unit));
  const fallbackTermMonths = fallbackSim.termMonths || 60;
  const defaultTermMonths = numberOr(product?.term ?? product?.termMonths ?? product?.term_months ?? limits.termMonths ?? limits.term_months ?? simulation.termMonths, fallbackTermMonths);
  const minTermMonths = numberOr(product?.minTermMonths ?? product?.min_term_months ?? limits.minTermMonths ?? limits.min_term_months ?? simulation.minTermMonths ?? simulation.min_term_months, Math.min(defaultTermMonths, 12));
  const maxTermMonths = numberOr(product?.maxTermMonths ?? product?.max_term_months ?? limits.maxTermMonths ?? limits.max_term_months ?? simulation.maxTermMonths ?? simulation.max_term_months, Math.max(defaultTermMonths, minTermMonths));
  const minYears = Math.max(1, Math.ceil(minTermMonths / 12));
  const maxYears = Math.max(minYears, Math.floor(maxTermMonths / 12));
  const defaultYears = Math.min(maxYears, Math.max(minYears, Math.round(defaultTermMonths / 12)));
  const baseOptions = [1, 2, 3, 5, 7, 10, defaultYears, minYears, maxYears]
    .filter((year) => year >= minYears && year <= maxYears);
  return {
    minMonthly,
    maxMonthly,
    stepMonthly,
    defaultMonthly,
    defaultYears,
    minYears,
    maxYears,
    yearOptions: Array.from(new Set(baseOptions)).sort((a, b) => a - b),
  };
}

function clampMonthly(value, option) {
  const raw = numberOr(value, option.defaultMonthly);
  const stepped = Math.round(raw / option.stepMonthly) * option.stepMonthly;
  return Math.min(option.maxMonthly, Math.max(option.minMonthly, stepped));
}

function simulateProductPlan({ product, monthly, years, fallbackSim = SIM }) {
  const simulation = product?.simulation || {};
  const option = buildProductSimulationOption(product, fallbackSim);
  const monthCount = Math.max(1, Math.round(numberOr(years, option.defaultYears) * 12));
  const monthlyAmount = clampMonthly(monthly, option);
  const principal = monthlyAmount * monthCount;
  const annualRate = rateFromProduct(product, fallbackSim.rateAnnual || 0);
  const interest = principal * annualRate * (monthCount + 1) / (2 * 12);
  const defaultGovRate = isYouthLeapProduct(product) ? 0.06 : fallbackSim.govMatchRate;
  const govRate = numberOr(simulation.govMatchRate ?? simulation.gov_match_rate ?? product?.govMatchRate ?? product?.gov_match_rate ?? defaultGovRate, 0);
  const govMaxMonthly = numberOr(simulation.govMaxMonthly ?? simulation.gov_max_monthly ?? option.maxMonthly, option.maxMonthly);
  const govMonthlyCap = numberOr(simulation.govMonthlyCap ?? simulation.gov_monthly_cap ?? product?.govMonthlyCap ?? product?.gov_monthly_cap, isYouthLeapProduct(product) ? 24000 : 0);
  const rawGovMatchMonthly = Math.min(monthlyAmount, govMaxMonthly) * (govRate > 1 ? govRate / 100 : govRate);
  const govMatch = (govMonthlyCap ? Math.min(rawGovMatchMonthly, govMonthlyCap) : rawGovMatchMonthly) * monthCount;
  const explicitTaxRate = simulation.taxSavingRate ?? simulation.tax_saving_rate ?? product?.taxSavingRate ?? product?.tax_saving_rate ?? fallbackSim.taxSavingRate;
  const taxRate = numberOr(explicitTaxRate, (simulation.taxFree || simulation.tax_free || productHasTaxBenefit(product)) ? 0.154 : 0);
  const taxSaved = interest * taxRate;
  const total = principal + interest + govMatch + taxSaved;
  return { principal, interest, govMatch, taxSaved, total };
}

function productHasTaxBenefit(product = {}) {
  const text = [product.name, product.benefit, product.category, ...(Array.isArray(product.tags) ? product.tags : [])].filter(Boolean).join(' ');
  return /비과세|절세|소득공제|세액공제|청년도약|ISA|연금/i.test(text);
}

function isYouthLeapProduct(product = {}) {
  const text = [product.name, product.category, product.benefit, ...(Array.isArray(product.tags) ? product.tags : [])].filter(Boolean).join(' ');
  return /청년도약|도약계좌|youth.?leap/i.test(text);
}

function ProductCard({ p, onApply }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ padding:'15px 16px' }}>
      <div className="between">
        <div style={{ flex:1 }}>
          <div className="row" style={{ gap:6 }}>
            <b style={{ fontSize:15.5, fontWeight:800, color:'var(--ink)', letterSpacing:'-.2px' }}>{p.name}</b>
            {p.eligible && <span className="pill pill-pos" style={{ fontSize:10, padding:'2px 7px' }}>가입가능</span>}
          </div>
          <div className="muted" style={{ fontSize:12.5, marginTop:3 }}>{p.tagline}</div>
        </div>
        <div style={{ textAlign:'right', marginLeft:8 }}>
          <div style={{ fontSize:11, color:'var(--slate-400)', fontWeight:600 }}>금리</div>
          <div className="tnum" style={{ fontSize:16, fontWeight:800, color:p.tone, whiteSpace:'nowrap' }}>{p.rate}</div>
        </div>
      </div>

      <div className="row" style={{ gap:6, marginTop:11, flexWrap:'wrap' }}>
        <span className="pill" style={{ background:p.tone+'14', color:p.tone, fontSize:10.5 }}>{p.benefit}</span>
        {p.tags.map((t,i) => <span key={i} className="pill" style={{ background:'var(--line-soft)', color:'var(--slate-600)', fontSize:10.5 }}>{t}</span>)}
      </div>

      {open && (
        <div style={{ marginTop:12, padding:'12px 14px', background:'var(--teal-50)', borderRadius:12, animation:'fadeUp .25s ease' }}>
          <div className="row" style={{ gap:7, marginBottom:5 }}>
            <Icon name="sparkF" size={14} color="var(--teal-600)" />
            <b style={{ fontSize:12.5, fontWeight:800, color:'var(--teal-800)' }}>제이비스 추천 이유</b>
          </div>
          <p style={{ fontSize:13, lineHeight:1.55, color:'var(--teal-800)' }}>{p.why}</p>
        </div>
      )}

      <div className="row" style={{ gap:9, marginTop:13 }}>
        <button onClick={() => setOpen(o=>!o)} className="btn btn-line" style={{ height:42, fontSize:13.5, flex:1 }}>
          {open ? '접기' : '추천 이유'}
        </button>
        <button onClick={onApply} className="btn btn-primary" style={{ height:42, fontSize:13.5, flex:1, boxShadow:'none' }}>
          가입하기
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { Products });
