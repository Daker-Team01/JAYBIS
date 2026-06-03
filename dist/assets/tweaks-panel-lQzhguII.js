import{j as e}from"./jsx-runtime-0LH7Ozuy.js";import"./index-BIjPbUQL.js";const x=window.React,L=`
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;function E(i){const[t,r]=x.useState(i),a=x.useCallback((n,c)=>{const o=typeof n=="object"&&n!==null?n:{[n]:c};r(l=>({...l,...o})),window.parent.postMessage({type:"__edit_mode_set_keys",edits:o},"*"),window.dispatchEvent(new CustomEvent("tweakchange",{detail:o}))},[]);return[t,a]}function R({title:i="Tweaks",children:t}){const[r,a]=x.useState(!1),n=x.useRef(null),c=x.useRef({x:16,y:16}),o=16,l=x.useCallback(()=>{const s=n.current;if(!s)return;const p=s.offsetWidth,w=s.offsetHeight,b=Math.max(o,window.innerWidth-p-o),k=Math.max(o,window.innerHeight-w-o);c.current={x:Math.min(b,Math.max(o,c.current.x)),y:Math.min(k,Math.max(o,c.current.y))},s.style.right=c.current.x+"px",s.style.bottom=c.current.y+"px"},[]);x.useEffect(()=>{if(!r)return;if(l(),typeof ResizeObserver>"u")return window.addEventListener("resize",l),()=>window.removeEventListener("resize",l);const s=new ResizeObserver(l);return s.observe(document.documentElement),()=>s.disconnect()},[r,l]),x.useEffect(()=>{const s=p=>{var b;const w=(b=p==null?void 0:p.data)==null?void 0:b.type;w==="__activate_edit_mode"?a(!0):w==="__deactivate_edit_mode"&&a(!1)};return window.addEventListener("message",s),window.parent.postMessage({type:"__edit_mode_available"},"*"),()=>window.removeEventListener("message",s)},[]);const h=()=>{a(!1),window.parent.postMessage({type:"__edit_mode_dismissed"},"*")},m=s=>{const p=n.current;if(!p)return;const w=p.getBoundingClientRect(),b=s.clientX,k=s.clientY,j=window.innerWidth-w.right,d=window.innerHeight-w.bottom,u=f=>{c.current={x:j-(f.clientX-b),y:d-(f.clientY-k)},l()},g=()=>{window.removeEventListener("mousemove",u),window.removeEventListener("mouseup",g)};window.addEventListener("mousemove",u),window.addEventListener("mouseup",g)};return r?e.jsxs(e.Fragment,{children:[e.jsx("style",{children:L}),e.jsxs("div",{ref:n,className:"twk-panel","data-omelette-chrome":"",style:{right:c.current.x,bottom:c.current.y},children:[e.jsxs("div",{className:"twk-hd",onMouseDown:m,children:[e.jsx("b",{children:i}),e.jsx("button",{className:"twk-x","aria-label":"Close tweaks",onMouseDown:s=>s.stopPropagation(),onClick:h,children:"✕"})]}),e.jsx("div",{className:"twk-body",children:t})]})]}):null}function M({label:i,children:t}){return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"twk-sect",children:i}),t]})}function v({label:i,value:t,children:r,inline:a=!1}){return e.jsxs("div",{className:a?"twk-row twk-row-h":"twk-row",children:[e.jsxs("div",{className:"twk-lbl",children:[e.jsx("span",{children:i}),t!=null&&e.jsx("span",{className:"twk-val",children:t})]}),r]})}function T({label:i,value:t,min:r=0,max:a=100,step:n=1,unit:c="",onChange:o}){return e.jsx(v,{label:i,value:`${t}${c}`,children:e.jsx("input",{type:"range",className:"twk-slider",min:r,max:a,step:n,value:t,onChange:l=>o(Number(l.target.value))})})}function z({label:i,value:t,onChange:r}){return e.jsxs("div",{className:"twk-row twk-row-h",children:[e.jsx("div",{className:"twk-lbl",children:e.jsx("span",{children:i})}),e.jsx("button",{type:"button",className:"twk-toggle","data-on":t?"1":"0",role:"switch","aria-checked":!!t,onClick:()=>r(!t),children:e.jsx("i",{})})]})}function S({label:i,value:t,options:r,onChange:a}){const n=x.useRef(null),[c,o]=x.useState(!1),l=x.useRef(t);l.current=t;const h=d=>String(typeof d=="object"?d.label:d).length;if(!(r.reduce((d,u)=>Math.max(d,h(u)),0)<=({2:16,3:10}[r.length]??0))){const d=u=>{const g=r.find(f=>String(typeof f=="object"?f.value:f)===u);return g===void 0?u:typeof g=="object"?g.value:g};return e.jsx(N,{label:i,value:t,options:r,onChange:u=>a(d(u))})}const p=r.map(d=>typeof d=="object"?d:{value:d,label:d}),w=Math.max(0,p.findIndex(d=>d.value===t)),b=p.length,k=d=>{const u=n.current.getBoundingClientRect(),g=u.width-4,f=Math.floor((d-u.left-2)/g*b);return p[Math.max(0,Math.min(b-1,f))].value},j=d=>{o(!0);const u=k(d.clientX);u!==l.current&&a(u);const g=_=>{if(!n.current)return;const y=k(_.clientX);y!==l.current&&a(y)},f=()=>{o(!1),window.removeEventListener("pointermove",g),window.removeEventListener("pointerup",f)};window.addEventListener("pointermove",g),window.addEventListener("pointerup",f)};return e.jsx(v,{label:i,children:e.jsxs("div",{ref:n,role:"radiogroup",onPointerDown:j,className:c?"twk-seg dragging":"twk-seg",children:[e.jsx("div",{className:"twk-seg-thumb",style:{left:`calc(2px + ${w} * (100% - 4px) / ${b})`,width:`calc((100% - 4px) / ${b})`}}),p.map(d=>e.jsx("button",{type:"button",role:"radio","aria-checked":d.value===t,children:d.label},d.value))]})})}function N({label:i,value:t,options:r,onChange:a}){return e.jsx(v,{label:i,children:e.jsx("select",{className:"twk-field",value:t,onChange:n=>a(n.target.value),children:r.map(n=>{const c=typeof n=="object"?n.value:n,o=typeof n=="object"?n.label:n;return e.jsx("option",{value:c,children:o},c)})})})}function C({label:i,value:t,placeholder:r,onChange:a}){return e.jsx(v,{label:i,children:e.jsx("input",{className:"twk-field",type:"text",value:t,placeholder:r,onChange:n=>a(n.target.value)})})}function D({label:i,value:t,min:r,max:a,step:n=1,unit:c="",onChange:o}){const l=s=>r!=null&&s<r?r:a!=null&&s>a?a:s,h=x.useRef({x:0,val:0}),m=s=>{s.preventDefault(),h.current={x:s.clientX,val:t};const p=(String(n).split(".")[1]||"").length,w=k=>{const j=k.clientX-h.current.x,d=h.current.val+j*n,u=Math.round(d/n)*n;o(l(Number(u.toFixed(p))))},b=()=>{window.removeEventListener("pointermove",w),window.removeEventListener("pointerup",b)};window.addEventListener("pointermove",w),window.addEventListener("pointerup",b)};return e.jsxs("div",{className:"twk-num",children:[e.jsx("span",{className:"twk-num-lbl",onPointerDown:m,children:i}),e.jsx("input",{type:"number",value:t,min:r,max:a,step:n,onChange:s=>o(l(Number(s.target.value)))}),c&&e.jsx("span",{className:"twk-num-unit",children:c})]})}function A(i){const t=String(i).replace("#",""),r=t.length===3?t.replace(/./g,l=>l+l):t.padEnd(6,"0"),a=parseInt(r.slice(0,6),16);if(Number.isNaN(a))return!0;const n=a>>16&255,c=a>>8&255,o=a&255;return n*299+c*587+o*114>148e3}const B=({light:i})=>e.jsx("svg",{viewBox:"0 0 14 14","aria-hidden":"true",children:e.jsx("path",{d:"M3 7.2 5.8 10 11 4.2",fill:"none",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round",stroke:i?"rgba(0,0,0,.78)":"#fff"})});function X({label:i,value:t,options:r,onChange:a}){if(!r||!r.length)return e.jsxs("div",{className:"twk-row twk-row-h",children:[e.jsx("div",{className:"twk-lbl",children:e.jsx("span",{children:i})}),e.jsx("input",{type:"color",className:"twk-swatch",value:t,onChange:o=>a(o.target.value)})]});const n=o=>String(JSON.stringify(o)).toLowerCase(),c=n(t);return e.jsx(v,{label:i,children:e.jsx("div",{className:"twk-chips",role:"radiogroup",children:r.map((o,l)=>{const h=Array.isArray(o)?o:[o],[m,...s]=h,p=s.slice(0,4),w=n(o)===c;return e.jsxs("button",{type:"button",className:"twk-chip",role:"radio","aria-checked":w,"data-on":w?"1":"0","aria-label":h.join(", "),title:h.join(" · "),style:{background:m},onClick:()=>a(o),children:[p.length>0&&e.jsx("span",{children:p.map((b,k)=>e.jsx("i",{style:{background:b}},k))}),w&&e.jsx(B,{light:A(m)})]},l)})})})}function P({label:i,onClick:t,secondary:r=!1}){return e.jsx("button",{type:"button",className:r?"twk-btn secondary":"twk-btn",onClick:t,children:i})}Object.assign(window,{useTweaks:E,TweaksPanel:R,TweakSection:M,TweakRow:v,TweakSlider:T,TweakToggle:z,TweakRadio:S,TweakSelect:N,TweakText:C,TweakNumber:D,TweakColor:X,TweakButton:P});
