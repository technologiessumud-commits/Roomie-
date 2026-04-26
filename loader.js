// ─────────────────────────────────────────────────────────────
//  ROOMIE — loader.js
//  PayPal-style R loading animation injected into any page.
//  Usage: import { showLoader, hideLoader } from './loader.js'
// ─────────────────────────────────────────────────────────────

const SVG_R = `
<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
  <defs>
    <linearGradient id="ldr1" x1="10" y1="10" x2="70" y2="70" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffb347"/>
      <stop offset="100%" stop-color="#ff6b35"/>
    </linearGradient>
  </defs>
  <!-- R stem -->
  <line x1="26" y1="20" x2="26" y2="60" stroke="url(#ldr1)" stroke-width="6" stroke-linecap="round"/>
  <!-- R bowl -->
  <path d="M26 20 Q26 20 44 20 Q56 20 56 31 Q56 42 44 42 L26 42"
    stroke="url(#ldr1)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- R leg -->
  <line x1="44" y1="42" x2="58" y2="60" stroke="url(#ldr1)" stroke-width="6" stroke-linecap="round"/>
  <!-- House in bowl -->
  <polyline points="34,37 38,31 42,37"
    stroke="url(#ldr1)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="34.5" y="37" width="7" height="5" rx="0.5"
    stroke="url(#ldr1)" stroke-width="3.5" fill="none"/>
</svg>`;

const CSS = `
.rl-overlay{
  position:fixed;inset:0;
  background:var(--bg,#0d0f14);
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  z-index:9999;gap:16px;
  transition:opacity .35s;
}
.rl-ring-wrap{position:relative;width:72px;height:72px;}
.rl-ring{
  position:absolute;inset:0;
  border-radius:50%;
  border:4px solid transparent;
  border-top-color:#ff6b35;
  border-right-color:#ffb347;
  animation:rl-spin .75s linear infinite;
}
.rl-r{
  position:absolute;inset:0;
  display:flex;align-items:center;justify-content:center;
  filter:drop-shadow(0 0 8px rgba(255,107,53,.6));
}
@keyframes rl-spin{to{transform:rotate(360deg);}}
.rl-label{
  font-family:'Syne',sans-serif;
  font-size:14px;font-weight:600;
  color:#7b82a0;
  letter-spacing:.3px;
}
.rl-dots span{
  display:inline-block;width:6px;height:6px;
  border-radius:50%;background:#ff6b35;margin:0 3px;
  animation:rl-bounce .8s ease-in-out infinite;
}
.rl-dots span:nth-child(2){animation-delay:.15s;}
.rl-dots span:nth-child(3){animation-delay:.3s;}
@keyframes rl-bounce{0%,100%{transform:translateY(0);opacity:.4;}50%{transform:translateY(-6px);opacity:1;}}
`;

function injectCSS() {
  if (document.getElementById('rl-style')) return;
  const s = document.createElement('style');
  s.id = 'rl-style'; s.textContent = CSS;
  document.head.appendChild(s);
}

function getOrCreate() {
  let el = document.getElementById('rl-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rl-overlay'; el.className = 'rl-overlay';
    el.innerHTML = `
      <div class="rl-ring-wrap">
        <div class="rl-ring"></div>
        <div class="rl-r">${SVG_R}</div>
      </div>
      <div class="rl-label" id="rl-label">Loading…</div>
      <div class="rl-dots">
        <span></span><span></span><span></span>
      </div>`;
    document.body.appendChild(el);
  }
  return el;
}

export function showLoader(msg = 'Loading…') {
  injectCSS();
  const el = getOrCreate();
  document.getElementById('rl-label').textContent = msg;
  el.style.opacity = '1';
  el.style.display = 'flex';
  el.style.pointerEvents = 'all';
}

export function hideLoader() {
  const el = document.getElementById('rl-overlay');
  if (!el) return;
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  setTimeout(() => { el.style.display = 'none'; }, 350);
}

export function setLoaderMsg(msg) {
  const el = document.getElementById('rl-label');
  if (el) el.textContent = msg;
}

// Auto-inject on import so it's always ready
injectCSS();
