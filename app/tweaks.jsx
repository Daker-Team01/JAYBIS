/* =========================================================================
   제이비스 (JAYBIS) — Tweaks 패널
   메인 컬러 팔레트 · 다크 모드 · 카드 라운드
   (스케일된 프레임 바깥의 #tweaks-root 에 마운트)
   ========================================================================= */

const {
  ReactDOM, useEffect, useTweaks, TweaksPanel, TweakSection,
  TweakColor, TweakToggle, TweakSlider,
} = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#0047bb", "#2f6bdb", "#a9c5f7"],
  "dark": false,
  "radius": 22
}/*EDITMODE-END*/;

// 팔레트별 teal 램프 (key = 대표 700 색)
const PALETTES = {
  '#0047bb': { 900:'#0a2257',800:'#0d2d77',700:'#0047bb',600:'#0047bb',500:'#2f6bdb',400:'#5b8def',300:'#a9c5f7',100:'#dbe7fb',50:'#eef3fc' },
  '#0f766e': { 900:'#0a3a36',800:'#0c4d47',700:'#0f766e',600:'#0d9488',500:'#14b8a6',400:'#2dd4bf',300:'#5eead4',100:'#ccfbf1',50:'#f0fdfa' },
  '#15803d': { 900:'#0d3320',800:'#125030',700:'#15803d',600:'#16a34a',500:'#22c55e',400:'#4ade80',300:'#86efac',100:'#dcfce7',50:'#f0fdf4' },
  '#6d28d9': { 900:'#2e1065',800:'#3b1d8f',700:'#6d28d9',600:'#7c3aed',500:'#8b5cf6',400:'#a78bfa',300:'#c4b5fd',100:'#ede9fe',50:'#f5f3ff' },
};
const SWATCHES = [
  ['#0047bb','#2f6bdb','#a9c5f7'],
  ['#0f766e','#14b8a6','#5eead4'],
  ['#15803d','#22c55e','#86efac'],
  ['#6d28d9','#8b5cf6','#c4b5fd'],
];

function applyTweaks(t) {
  const root = document.documentElement;
  const ramp = PALETTES[(t.palette && t.palette[0]) || '#0047bb'] || PALETTES['#0047bb'];
  Object.entries(ramp).forEach(([k, v]) => root.style.setProperty('--teal-' + k, v));
  root.dataset.theme = t.dark ? 'dark' : '';
  root.style.setProperty('--r-lg', t.radius + 'px');
  root.style.setProperty('--r-md', Math.max(10, t.radius - 6) + 'px');
}

function Tweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(() => { applyTweaks(t); }, [t.palette, t.dark, t.radius]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="브랜드" />
      <TweakColor label="메인 컬러" value={t.palette} options={SWATCHES}
        onChange={(v) => setTweak('palette', v)} />
      <TweakSection label="화면" />
      <TweakToggle label="다크 모드" value={t.dark} onChange={(v) => setTweak('dark', v)} />
      <TweakSlider label="카드 라운드" value={t.radius} min={12} max={28} step={1} unit="px"
        onChange={(v) => setTweak('radius', v)} />
    </TweaksPanel>
  );
}

// 초기 1회 적용 (패널 열기 전에도 기본값 반영)
applyTweaks(TWEAK_DEFAULTS);

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<Tweaks />);
