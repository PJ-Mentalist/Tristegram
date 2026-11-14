/*!
 * Tristegram UI — плагин визуала для ExDesktop
 * iOS / macOS-стиль: стекло, размытие, мягкие тени, плавные анимации.
 *
 * Плагин не завязан на CSS-классы приложения: он сам находит шапку, сайдбар,
 * список чатов, поиск и область переписки по структуре страницы и помечает их
 * своими классами (tg-*). Поэтому переживает обновления клиента.
 *
 * Публичное API (для будущих модулей):
 *   window.Tristegram.settings            — текущие настройки
 *   window.Tristegram.set(key, value)     — изменить настройку
 *   window.Tristegram.menu.register(item) — добавить пункт в меню Tristegram
 *        item = { id, title, icon?, onClick() }
 *   window.Tristegram.openMenu() / openSettings()
 *   window.Tristegram.disable()           — полностью выключить плагин
 */
(function () {
  'use strict';

  if (window.Tristegram && window.Tristegram.__loaded) return;

  // ───────────────────────── Настройки ─────────────────────────
  const STORE_KEY = 'tristegram.settings.v1';
  const DEFAULTS = {
    titleColor: '#0A84FF',   // синий iOS
    accentColor: '#0A84FF',
    blur: 28,                // px
    radius: 22,              // px, скругление панелей
    aurora: true,            // цветное свечение на фоне
    animations: true,
    compact: false,
  };

  const PRESETS = ['#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#64D2FF', '#FFFFFF'];

  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }
  const settings = load();

  function hexToRgb(hex) {
    const h = String(hex).replace('#', '');
    const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
    const n = parseInt(v.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function applyVars() {
    const r = document.documentElement;
    const [tr, tg, tb] = hexToRgb(settings.titleColor);
    const [ar, ag, ab] = hexToRgb(settings.accentColor);
    r.style.setProperty('--tg-title', settings.titleColor);
    r.style.setProperty('--tg-title-rgb', `${tr}, ${tg}, ${tb}`);
    r.style.setProperty('--tg-accent', settings.accentColor);
    r.style.setProperty('--tg-accent-rgb', `${ar}, ${ag}, ${ab}`);
    r.style.setProperty('--tg-blur', settings.blur + 'px');
    r.style.setProperty('--tg-radius', settings.radius + 'px');
    r.classList.toggle('tg-no-aurora', !settings.aurora);
    r.classList.toggle('tg-no-anim', !settings.animations);
    r.classList.toggle('tg-compact', !!settings.compact);
  }

  // ───────────────────────── Стили ─────────────────────────
  const CSS = `
:root{
  --tg-font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI Variable Display", "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
  --tg-bg: #050507;
  --tg-glass: rgba(28, 28, 32, .52);
  --tg-glass-strong: rgba(22, 22, 26, .72);
  --tg-stroke: rgba(255, 255, 255, .085);
  --tg-stroke-hi: rgba(255, 255, 255, .14);
  --tg-text: rgba(255, 255, 255, .96);
  --tg-text-2: rgba(235, 235, 245, .6);
  --tg-fill: rgba(118, 118, 128, .2);
  --tg-fill-2: rgba(118, 118, 128, .28);
  --tg-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 0 0 .5px rgba(0,0,0,.6), 0 18px 50px -12px rgba(0,0,0,.65), 0 4px 14px rgba(0,0,0,.35);
  --tg-spring: cubic-bezier(.32, .72, 0, 1);
  --tg-ease: cubic-bezier(.25, .1, .25, 1);
}

html.tg-on, html.tg-on body{
  font-family: var(--tg-font) !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  background: var(--tg-bg) !important;
  color: var(--tg-text);
  letter-spacing: -.011em;
}

/* Фоновое «северное сияние» за стеклом */
#tg-aurora{
  position: fixed; inset: -20vmax; z-index: -1; pointer-events: none;
  background:
    radial-gradient(38vmax 38vmax at 12% 18%, rgba(var(--tg-accent-rgb), .22), transparent 60%),
    radial-gradient(34vmax 34vmax at 88% 12%, rgba(191, 90, 242, .16), transparent 60%),
    radial-gradient(40vmax 40vmax at 70% 95%, rgba(100, 210, 255, .12), transparent 60%),
    radial-gradient(30vmax 30vmax at 5% 95%, rgba(255, 55, 95, .08), transparent 60%),
    var(--tg-bg);
  filter: saturate(120%);
  animation: tg-drift 38s var(--tg-ease) infinite alternate;
}
#tg-aurora::after{ /* лёгкое зерно для «дорогой» глубины */
  content:""; position:absolute; inset:0; opacity:.05; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
html.tg-no-aurora #tg-aurora{ background: var(--tg-bg); }
html.tg-no-aurora #tg-aurora::after{ display:none; }
@keyframes tg-drift{
  0%{ transform: translate3d(0,0,0) scale(1); }
  50%{ transform: translate3d(2vmax,-1.5vmax,0) scale(1.04); }
  100%{ transform: translate3d(-2vmax,1.5vmax,0) scale(1.02); }
}
/* корневые контейнеры приложения делаем прозрачными, чтобы было видно сияние */
html.tg-on .tg-root-clear{ background: transparent !important; }

/* ── Стеклянные панели ── */
.tg-glass{
  background: var(--tg-glass) !important;
  -webkit-backdrop-filter: blur(var(--tg-blur)) saturate(180%);
  backdrop-filter: blur(var(--tg-blur)) saturate(180%);
  border: 1px solid var(--tg-stroke) !important;
  border-radius: var(--tg-radius) !important;
  box-shadow: var(--tg-shadow) !important;
  overflow: hidden;
}

/* ── Шапка ── */
.tg-header{
  position: relative !important;
  background: linear-gradient(180deg, rgba(40,40,46,.62), rgba(24,24,28,.5)) !important;
}
.tg-header button, .tg-header [role="button"]{
  border-radius: 12px !important;
  transition: background .25s var(--tg-ease), transform .35s var(--tg-spring) !important;
}
.tg-header button:hover{ background: var(--tg-fill) !important; }
.tg-header button:active{ transform: scale(.92); }
.tg-header-slot{ /* тёмный пустой прямоугольник справа — превращаем в стекло */
  background: var(--tg-fill) !important;
  border: 1px solid var(--tg-stroke) !important;
  border-radius: 14px !important;
}

/* ── Надпись Tristegram ── */
#tg-brand{
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  z-index: 5; display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 16px 8px 12px; border-radius: 999px;
  font: 700 22px/1 var(--tg-font); letter-spacing: -.035em;
  color: var(--tg-title);
  background: rgba(var(--tg-title-rgb), .08);
  border: 1px solid rgba(var(--tg-title-rgb), .22);
  box-shadow: 0 0 0 0 rgba(var(--tg-title-rgb), 0), inset 0 1px 0 rgba(255,255,255,.08);
  text-shadow: 0 0 22px rgba(var(--tg-title-rgb), .55);
  cursor: pointer; user-select: none; -webkit-app-region: no-drag;
  transition: transform .5s var(--tg-spring), box-shadow .4s var(--tg-ease), background .3s var(--tg-ease);
}
#tg-brand:hover{
  transform: translate(-50%, -50%) scale(1.04);
  background: rgba(var(--tg-title-rgb), .14);
  box-shadow: 0 8px 30px -6px rgba(var(--tg-title-rgb), .55), inset 0 1px 0 rgba(255,255,255,.12);
}
#tg-brand:active{ transform: translate(-50%, -50%) scale(.96); }
#tg-brand .tg-logo{
  width: 26px; height: 26px; border-radius: 8px; flex: none;
  display:grid; place-items:center;
  background: linear-gradient(145deg, rgba(var(--tg-title-rgb),1), rgba(var(--tg-title-rgb),.55));
  box-shadow: 0 4px 14px -2px rgba(var(--tg-title-rgb), .7), inset 0 1px 0 rgba(255,255,255,.35);
}
#tg-brand .tg-logo svg{ width: 15px; height: 15px; }
#tg-brand .tg-chev{ width: 12px; height: 12px; opacity: .7; transition: transform .4s var(--tg-spring); }
#tg-brand.tg-open .tg-chev{ transform: rotate(180deg); }
#tg-brand .tg-word{
  background: linear-gradient(180deg, #fff -40%, var(--tg-title) 70%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}

/* ── Сайдбар ── */
.tg-sidebar{ background: var(--tg-glass-strong) !important; }
.tg-sidebar-title{
  font-family: var(--tg-font) !important;
  font-weight: 800 !important; letter-spacing: -.04em !important;
}
.tg-toolbar{
  background: var(--tg-fill) !important;
  border: 1px solid var(--tg-stroke) !important;
  border-radius: 14px !important;
  padding: 3px !important;
}
.tg-toolbar > *{
  border-radius: 10px !important;
  transition: background .25s var(--tg-ease), transform .35s var(--tg-spring), color .25s !important;
}
.tg-toolbar > *:hover{ background: rgba(255,255,255,.1) !important; }
.tg-toolbar > *:active{ transform: scale(.88); }

/* ── Поиск в стиле iOS ── */
.tg-search{
  background-color: var(--tg-fill) !important;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ebebf5' stroke-opacity='.6' stroke-width='2.4' stroke-linecap='round'><circle cx='11' cy='11' r='7'/><path d='m20 20-3.5-3.5'/></svg>") !important;
  background-repeat: no-repeat !important;
  background-position: 12px 50% !important;
  background-size: 16px !important;
  padding-left: 36px !important;
  border: 1px solid transparent !important;
  border-radius: 12px !important;
  color: var(--tg-text) !important;
  font: 400 15px var(--tg-font) !important;
  outline: none !important;
  box-shadow: none !important;
  transition: background-color .25s var(--tg-ease), border-color .25s var(--tg-ease), box-shadow .35s var(--tg-ease) !important;
}
.tg-search::placeholder{ color: var(--tg-text-2) !important; }
.tg-search:focus{
  background-color: var(--tg-fill-2) !important;
  border-color: rgba(var(--tg-accent-rgb), .55) !important;
  box-shadow: 0 0 0 4px rgba(var(--tg-accent-rgb), .18) !important;
}

/* ── Элементы списка чатов ── */
.tg-item{
  position: relative;
  margin: 2px 8px !important;
  border-radius: 14px !important;
  border: 0 !important;
  border-bottom-color: transparent !important;
  background: transparent !important;
  transition: background .22s var(--tg-ease), transform .45s var(--tg-spring) !important;
  cursor: pointer;
}
.tg-item::after{ /* разделитель как в iOS — с отступом под аватар */
  content:""; position:absolute; left: 72px; right: 12px; bottom: -2px; height: .5px;
  background: rgba(84,84,88,.45); pointer-events:none;
}
.tg-item:last-child::after, .tg-item:hover::after, .tg-item.tg-active::after{ opacity: 0; }
.tg-item:hover{ background: rgba(255,255,255,.055) !important; }
.tg-item:active{ transform: scale(.975); background: rgba(255,255,255,.08) !important; }
.tg-item.tg-active{
  background: linear-gradient(135deg, rgba(var(--tg-accent-rgb), .9), rgba(var(--tg-accent-rgb), .7)) !important;
  box-shadow: 0 8px 24px -10px rgba(var(--tg-accent-rgb), .9);
}
.tg-item.tg-active, .tg-item.tg-active *{ color: #fff !important; }
.tg-item img, .tg-item .tg-avatar{
  box-shadow: 0 0 0 .5px rgba(255,255,255,.12), 0 4px 12px -4px rgba(0,0,0,.6);
  transition: transform .5s var(--tg-spring);
}
.tg-item:hover img, .tg-item:hover .tg-avatar{ transform: scale(1.05); }
.tg-anim .tg-item{ animation: tg-rise .6s var(--tg-spring) both; animation-delay: calc(var(--tg-i, 0) * 35ms); }
@keyframes tg-rise{ from{ opacity:0; transform: translateY(10px) scale(.985); } to{ opacity:1; transform:none; } }
html.tg-compact .tg-item{ margin: 0 6px !important; }

/* ── Область переписки ── */
.tg-main{ background-color: rgba(10,10,12,.55) !important; }
.tg-main::before{ /* мягкая виньетка поверх узора */
  content:""; position:absolute; inset:0; pointer-events:none; z-index:0;
  background: radial-gradient(120% 90% at 50% 40%, transparent 40%, rgba(0,0,0,.45) 100%);
}
.tg-main > *{ position: relative; z-index: 1; }
.tg-empty{
  display: inline-block !important;
  padding: 10px 18px !important;
  border-radius: 999px !important;
  background: rgba(30,30,34,.6) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--tg-stroke) !important;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,.7);
  font: 600 15px var(--tg-font) !important;
  color: var(--tg-text) !important;
  animation: tg-float 4s ease-in-out infinite;
}
@keyframes tg-float{ 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-4px); } }

/* ── Скроллбары ── */
html.tg-on ::-webkit-scrollbar{ width: 10px; height: 10px; }
html.tg-on ::-webkit-scrollbar-track{ background: transparent; }
html.tg-on ::-webkit-scrollbar-thumb{
  background: rgba(255,255,255,.14); border-radius: 99px;
  border: 3px solid transparent; background-clip: padding-box;
}
html.tg-on ::-webkit-scrollbar-thumb:hover{ background-color: rgba(255,255,255,.26); }
html.tg-on ::selection{ background: rgba(var(--tg-accent-rgb), .45); }

/* ── Меню Tristegram и настройки ── */
.tg-pop-backdrop{
  position: fixed; inset: 0; z-index: 2147483000;
  background: rgba(0,0,0,.25);
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  opacity: 0; transition: opacity .3s var(--tg-ease);
}
.tg-pop-backdrop.tg-show{ opacity: 1; }
.tg-pop{
  position: fixed; z-index: 2147483001;
  min-width: 280px; max-width: min(380px, calc(100vw - 32px));
  max-height: calc(100vh - 110px); overflow-y: auto; overscroll-behavior: contain;
  padding: 8px; border-radius: 20px;
  font-family: var(--tg-font); color: var(--tg-text);
  background: rgba(36,36,40,.72);
  -webkit-backdrop-filter: blur(40px) saturate(190%); backdrop-filter: blur(40px) saturate(190%);
  border: 1px solid var(--tg-stroke-hi);
  box-shadow: 0 30px 80px -20px rgba(0,0,0,.8), 0 0 0 .5px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08);
  transform-origin: top center;
  opacity: 0; transform: scale(.92) translateY(-8px);
  transition: opacity .25s var(--tg-ease), transform .5s var(--tg-spring);
}
.tg-pop.tg-show{ opacity: 1; transform: none; }
.tg-pop-head{ display:flex; align-items:center; justify-content:space-between; padding: 10px 12px 8px; }
.tg-pop-head b{ font-size: 17px; letter-spacing: -.02em; }
.tg-pop-head small{ color: var(--tg-text-2); font-size: 12px; }
.tg-pop-item{
  display:flex; align-items:center; gap: 12px; width:100%;
  padding: 10px 12px; border: 0; border-radius: 12px;
  background: transparent; color: inherit; font: 500 15px var(--tg-font); text-align:left;
  cursor: pointer; transition: background .2s var(--tg-ease), transform .3s var(--tg-spring);
}
.tg-pop-item:hover{ background: rgba(255,255,255,.08); }
.tg-pop-item:active{ transform: scale(.98); }
.tg-pop-item .tg-ic{
  width: 30px; height: 30px; border-radius: 9px; display:grid; place-items:center; flex:none;
  background: rgba(var(--tg-accent-rgb), .18); color: var(--tg-accent);
}
.tg-pop-item .tg-ic svg{ width: 17px; height: 17px; }
.tg-pop-item span small{ display:block; color: var(--tg-text-2); font-size: 12px; font-weight: 400; margin-top: 2px; }
.tg-pop-sep{ height: .5px; margin: 6px 12px; background: rgba(84,84,88,.6); }
.tg-soon{ padding: 8px 12px 12px; color: var(--tg-text-2); font-size: 13px; line-height: 1.4; }

.tg-set{ padding: 4px 6px 8px; }
.tg-set-group{ background: rgba(118,118,128,.14); border-radius: 14px; margin: 8px 4px; overflow: hidden; }
.tg-set-row{ display:flex; align-items:center; justify-content:space-between; gap: 12px; padding: 12px 14px; font-size: 15px; }
.tg-set-row + .tg-set-row{ border-top: .5px solid rgba(84,84,88,.55); }
.tg-set-label{ color: var(--tg-text-2); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; padding: 10px 16px 0; }
.tg-swatches{ display:flex; flex-wrap:wrap; gap: 10px; padding: 12px 14px; }
.tg-sw{
  width: 28px; height: 28px; border-radius: 50%; border: 0; cursor: pointer; padding: 0;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
  transition: transform .35s var(--tg-spring), box-shadow .2s;
}
.tg-sw:hover{ transform: scale(1.12); }
.tg-sw.tg-on{ box-shadow: 0 0 0 2px rgba(36,36,40,1), 0 0 0 4px currentColor; }
.tg-sw-custom{
  position: relative; overflow: hidden;
  background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
}
.tg-sw-custom input{ position:absolute; inset:-8px; opacity:0; cursor:pointer; }
.tg-switch{ position: relative; width: 51px; height: 31px; flex:none; }
.tg-switch input{ opacity:0; position:absolute; inset:0; margin:0; cursor:pointer; z-index:1; }
.tg-switch i{
  position:absolute; inset:0; border-radius: 99px; background: rgba(120,120,128,.32);
  transition: background .3s var(--tg-ease);
}
.tg-switch i::after{
  content:""; position:absolute; top:2px; left:2px; width:27px; height:27px; border-radius:50%;
  background:#fff; box-shadow: 0 3px 8px rgba(0,0,0,.25), 0 1px 1px rgba(0,0,0,.16);
  transition: transform .45s var(--tg-spring);
}
.tg-switch input:checked + i{ background: #30D158; }
.tg-switch input:checked + i::after{ transform: translateX(20px); }
.tg-range{ -webkit-appearance:none; appearance:none; width: 140px; height: 4px; border-radius: 4px; background: rgba(120,120,128,.4); outline: none; }
.tg-range::-webkit-slider-thumb{ -webkit-appearance:none; width: 22px; height: 22px; border-radius: 50%; background:#fff; box-shadow: 0 2px 8px rgba(0,0,0,.35); cursor:pointer; }
.tg-btn{
  width: calc(100% - 8px); margin: 6px 4px 2px; padding: 11px; border:0; border-radius: 12px; cursor:pointer;
  font: 600 15px var(--tg-font); color: #FF453A; background: rgba(118,118,128,.14);
  transition: background .2s;
}
.tg-btn:hover{ background: rgba(118,118,128,.24); }

html.tg-no-anim *, html.tg-no-anim *::before, html.tg-no-anim *::after{ animation: none !important; transition: none !important; }
@media (prefers-reduced-motion: reduce){
  #tg-aurora, .tg-empty, .tg-anim .tg-item{ animation: none !important; }
}
`;

  // ───────────────────────── Иконки ─────────────────────────
  const ICON = {
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M5 6.5h14M12 6.5V19"/><circle cx="18.5" cy="18" r="1.8" fill="#fff" stroke="none"/></svg>',
    chev: '<svg class="tg-chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 4.5 3 3 3-3"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z"/></svg>',
  };

  // ───────────────────────── Поиск элементов интерфейса ─────────────────────────
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;
  const rect = (el) => el.getBoundingClientRect();

  function ownText(el) {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    return t.trim();
  }
  function findByText(re, root) {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (re.test(n.nodeValue) && n.parentElement && !n.parentElement.closest('.tg-pop, #tg-brand')) return n.parentElement;
    }
    return null;
  }
  function climb(el, ok) {
    while (el && el !== document.body) {
      if (ok(el, rect(el))) return el;
      el = el.parentElement;
    }
    return null;
  }

  function mark(el, cls) { if (el && !el.classList.contains(cls)) el.classList.add(cls); return el; }

  function detectHeader() {
    // Шапка: широкий низкий блок у верхнего края окна
    const candidates = document.body.querySelectorAll('header, div, nav');
    let best = null;
    for (const el of candidates) {
      if (el.closest('.tg-pop')) continue;
      const r = rect(el);
      if (r.top < 40 && r.height >= 44 && r.height <= 110 && r.width > vw() * 0.8) {
        const cs = getComputedStyle(el);
        const visual = cs.borderTopWidth !== '0px' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || el.tagName === 'HEADER';
        if (visual && (!best || r.height <= rect(best).height)) best = el;
      }
    }
    return best;
  }

  function detectSearch(scope) {
    return (scope || document).querySelector(
      'input[placeholder*="Поиск" i], input[placeholder*="Search" i], input[type="search"]'
    );
  }

  function detectSidebar(search) {
    const anchor = search || findByText(/^\s*Чаты\s*$/);
    if (!anchor) return null;
    return climb(anchor, (el, r) => r.height > vh() * 0.55 && r.width < vw() * 0.5 && r.width > 200);
  }

  function detectMain(sidebar) {
    const empty = findByText(/Выберите чат/i);
    if (empty) {
      mark(empty, 'tg-empty');
      const m = climb(empty, (el, r) => r.width > vw() * 0.45 && r.height > vh() * 0.55);
      if (m) return m;
    }
    // Чат открыт — берём самый широкий соседний с сайдбаром блок
    if (sidebar && sidebar.parentElement) {
      let best = null;
      for (const sib of sidebar.parentElement.children) {
        if (sib === sidebar) continue;
        const r = rect(sib);
        if (r.width > vw() * 0.4 && r.height > vh() * 0.55 && (!best || r.width > rect(best).width)) best = sib;
      }
      return best;
    }
    return null;
  }

  function detectItems(sidebar, search) {
    // Строки списка: блоки почти во всю ширину сайдбара, высотой 52–96px, с аватаром
    const sw = rect(sidebar).width;
    const top = search ? rect(search).bottom : rect(sidebar).top + 80;
    const items = [];
    for (const el of sidebar.querySelectorAll('a, li, div, button')) {
      if (el === search || el.contains(search)) continue;
      const r = rect(el);
      if (r.top < top - 2) continue;
      if (r.height < 52 || r.height > 96 || r.width < sw * 0.8) continue;
      const hasAvatar = el.querySelector('img, svg, [class*="avatar" i]') || avatarOf(el);
      if (!hasAvatar) continue;
      if (items.some((p) => p.contains(el))) continue; // берём самый внешний подходящий
      items.push(el);
    }
    return items;
  }

  function detectToolbar(sidebar, search) {
    // Группа из 2+ иконок-кнопок над поиском
    const limit = search ? rect(search).top : rect(sidebar).top + 90;
    for (const el of sidebar.querySelectorAll('div, nav')) {
      const r = rect(el);
      if (r.bottom > limit + 2 || r.height > 64) continue;
      const kids = [...el.children];
      if (kids.length >= 2 && kids.length <= 6 && kids.every((k) => k.querySelector('svg') || k.tagName === 'svg')) return el;
    }
    return null;
  }

  function avatarOf(item) {
    const img = item.querySelector('img');
    if (img) return img;
    for (const el of item.querySelectorAll('div, span')) {
      const r = rect(el);
      if (r.width >= 32 && r.width <= 64 && Math.abs(r.width - r.height) < 3 && parseFloat(getComputedStyle(el).borderRadius) >= r.width * 0.3) return el;
    }
    return null;
  }

  // ───────────────────────── Надпись Tristegram ─────────────────────────
  let brand = null;
  function ensureBrand(header) {
    if (!header) return;
    if (brand && header.contains(brand)) return;
    brand = document.createElement('div');
    brand.id = 'tg-brand';
    brand.setAttribute('role', 'button');
    brand.setAttribute('tabindex', '0');
    brand.setAttribute('aria-label', 'Меню Tristegram');
    brand.innerHTML = `<span class="tg-logo">${ICON.logo}</span><span class="tg-word">Tristegram</span>${ICON.chev}`;
    brand.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    brand.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); } });
    if (getComputedStyle(header).position === 'static') header.style.position = 'relative';
    header.appendChild(brand);
  }

  // ───────────────────────── Меню ─────────────────────────
  const menuItems = [];
  let pop = null, backdrop = null;

  function closePop() {
    if (!pop) return;
    const p = pop, b = backdrop;
    pop = backdrop = null;
    p.classList.remove('tg-show'); b.classList.remove('tg-show');
    brand && brand.classList.remove('tg-open');
    setTimeout(() => { p.remove(); b.remove(); }, 320);
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closePop(); }

  function openPop(build) {
    closePop();
    backdrop = document.createElement('div');
    backdrop.className = 'tg-pop-backdrop';
    backdrop.addEventListener('click', closePop);
    pop = document.createElement('div');
    pop.className = 'tg-pop';
    pop.addEventListener('click', (e) => e.stopPropagation());
    build(pop);
    document.body.append(backdrop, pop);
    const b = brand ? rect(brand) : { left: vw() / 2, width: 0, bottom: 70 };
    const w = pop.offsetWidth;
    pop.style.top = b.bottom + 12 + 'px';
    pop.style.left = Math.max(16, Math.min(vw() - w - 16, b.left + b.width / 2 - w / 2)) + 'px';
    requestAnimationFrame(() => { pop && pop.classList.add('tg-show'); backdrop && backdrop.classList.add('tg-show'); });
    brand && brand.classList.add('tg-open');
    document.addEventListener('keydown', escClose);
  }

  function toggleMenu() { pop ? closePop() : openMenu(); }

  function openMenu() {
    openPop((p) => {
      p.innerHTML = `<div class="tg-pop-head"><b>Tristegram</b><small>v1.0</small></div>`;
      const list = document.createElement('div');
      for (const it of menuItems) list.appendChild(menuButton(it.icon || ICON.spark, it.title, it.subtitle, () => { closePop(); it.onClick && it.onClick(); }));
      if (!menuItems.length) {
        const s = document.createElement('div');
        s.className = 'tg-soon';
        s.textContent = 'Здесь скоро появятся новые функции ✨';
        list.appendChild(s);
      }
      p.appendChild(list);
      const sep = document.createElement('div'); sep.className = 'tg-pop-sep'; p.appendChild(sep);
      p.appendChild(menuButton(ICON.gear, 'Настройки', 'Цвет надписи, стекло, анимации', openSettings));
    });
  }

  function menuButton(icon, title, sub, onClick) {
    const b = document.createElement('button');
    b.className = 'tg-pop-item';
    b.innerHTML = `<span class="tg-ic">${icon}</span><span></span>`;
    const label = b.lastChild;
    label.textContent = title;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; label.appendChild(s); }
    b.addEventListener('click', onClick);
    return b;
  }

  function set(key, value) {
    settings[key] = value;
    save();
    applyVars();
  }

  function openSettings() {
    openPop((p) => {
      p.innerHTML = `
        <div class="tg-pop-head"><b>Настройки</b><small>Tristegram</small></div>
        <div class="tg-set">
          <div class="tg-set-label">Цвет надписи</div>
          <div class="tg-set-group"><div class="tg-swatches" data-k="titleColor"></div></div>
          <div class="tg-set-label">Акцентный цвет</div>
          <div class="tg-set-group"><div class="tg-swatches" data-k="accentColor"></div></div>
          <div class="tg-set-label">Внешний вид</div>
          <div class="tg-set-group">
            <div class="tg-set-row"><span>Размытие стекла</span><input class="tg-range" type="range" min="0" max="60" data-k="blur"></div>
            <div class="tg-set-row"><span>Скругление</span><input class="tg-range" type="range" min="6" max="32" data-k="radius"></div>
            <div class="tg-set-row"><span>Сияние на фоне</span><label class="tg-switch"><input type="checkbox" data-k="aurora"><i></i></label></div>
            <div class="tg-set-row"><span>Анимации</span><label class="tg-switch"><input type="checkbox" data-k="animations"><i></i></label></div>
            <div class="tg-set-row"><span>Компактный список</span><label class="tg-switch"><input type="checkbox" data-k="compact"><i></i></label></div>
          </div>
          <button class="tg-btn" data-reset>Сбросить настройки</button>
        </div>`;

      p.querySelectorAll('.tg-swatches').forEach((box) => {
        const key = box.dataset.k;
        const render = () => {
          box.innerHTML = '';
          for (const c of PRESETS) {
            const s = document.createElement('button');
            s.className = 'tg-sw' + (settings[key].toLowerCase() === c.toLowerCase() ? ' tg-on' : '');
            s.style.background = c; s.style.color = c; s.title = c;
            s.addEventListener('click', () => { set(key, c); render(); });
            box.appendChild(s);
          }
          const custom = document.createElement('label');
          custom.className = 'tg-sw tg-sw-custom' + (PRESETS.some((c) => c.toLowerCase() === settings[key].toLowerCase()) ? '' : ' tg-on');
          custom.title = 'Свой цвет';
          custom.style.color = settings[key];
          const inp = document.createElement('input');
          inp.type = 'color'; inp.value = settings[key];
          inp.addEventListener('input', () => set(key, inp.value));
          inp.addEventListener('change', render);
          custom.appendChild(inp);
          box.appendChild(custom);
        };
        render();
      });

      p.querySelectorAll('input[data-k]').forEach((inp) => {
        const key = inp.dataset.k;
        if (inp.type === 'checkbox') {
          inp.checked = !!settings[key];
          inp.addEventListener('change', () => set(key, inp.checked));
        } else {
          inp.value = settings[key];
          inp.addEventListener('input', () => set(key, Number(inp.value)));
        }
      });

      p.querySelector('[data-reset]').addEventListener('click', () => {
        Object.assign(settings, DEFAULTS);
        save(); applyVars(); openSettings();
      });
    });
  }

  // ───────────────────────── Применение ─────────────────────────
  let styleEl = null, aurora = null, observer = null, scheduled = false, enabled = true;

  function enhance() {
    scheduled = false;
    if (!enabled || !document.body) return;

    // прозрачные корневые контейнеры
    const firstApp = [...document.body.children].find((c) => c.id !== 'tg-aurora' && c.tagName !== 'SCRIPT');
    for (const el of [document.body, firstApp, document.querySelector('#root, #app, #__next')]) {
      if (el && el.id !== 'tg-aurora') mark(el, 'tg-root-clear');
    }

    const header = detectHeader();
    if (header) {
      mark(header, 'tg-glass'); mark(header, 'tg-header');
      ensureBrand(header);
      // пустой тёмный прямоугольник в шапке
      for (const el of header.querySelectorAll('div')) {
        const r = rect(el);
        if (r.width > 120 && r.height > 28 && r.height < 70 && !el.textContent.trim() && !el.querySelector('img,svg') && el !== brand) mark(el, 'tg-header-slot');
      }
    }

    const search = detectSearch();
    const sidebar = detectSidebar(search);
    if (sidebar) {
      mark(sidebar, 'tg-glass'); mark(sidebar, 'tg-sidebar');
      if (search) mark(search, 'tg-search');
      const title = findByText(/^\s*Чаты\s*$/, sidebar);
      if (title) mark(title, 'tg-sidebar-title');
      const tb = detectToolbar(sidebar, search);
      if (tb) mark(tb, 'tg-toolbar');

      const items = detectItems(sidebar, search);
      items.forEach((it, i) => {
        if (!it.classList.contains('tg-item')) { it.style.setProperty('--tg-i', i); mark(it, 'tg-item'); }
        const av = avatarOf(it);
        if (av) mark(av, 'tg-avatar');
        // «выбранный» чат: приложение обычно ставят aria-selected / active / selected
        const active = it.matches('[aria-selected="true"], [aria-current], .active, .selected, [class*="active" i], [class*="selected" i]');
        it.classList.toggle('tg-active', !!active);
      });
      if (items.length && items[0].parentElement) mark(items[0].parentElement, 'tg-anim');
    }

    const main = detectMain(sidebar);
    if (main) {
      mark(main, 'tg-glass'); mark(main, 'tg-main');
      if (getComputedStyle(main).position === 'static') main.style.position = 'relative';
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestIdleCallback || setTimeout)(enhance, 120);
  }

  function start() {
    document.documentElement.classList.add('tg-on');
    styleEl = document.createElement('style');
    styleEl.id = 'tg-style';
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
    aurora = document.createElement('div');
    aurora.id = 'tg-aurora';
    document.body.prepend(aurora);
    applyVars();
    enhance();
    observer = new MutationObserver((muts) => {
      if (muts.some((m) => !(m.target.closest && m.target.closest('.tg-pop, #tg-brand')))) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    // клик по чату меняет «выбранный» — перепроверяем подсветку
    document.addEventListener('click', schedule, true);
    // горячая клавиша: Ctrl+Shift+T — меню Tristegram
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 'Е')) { e.preventDefault(); toggleMenu(); }
    });
  }

  function disable() {
    enabled = false;
    observer && observer.disconnect();
    closePop();
    styleEl && styleEl.remove();
    aurora && aurora.remove();
    brand && brand.remove();
    document.documentElement.classList.remove('tg-on', 'tg-no-aurora', 'tg-no-anim', 'tg-compact');
    document.querySelectorAll('[class*="tg-"]').forEach((el) => {
      [...el.classList].filter((c) => c.startsWith('tg-')).forEach((c) => el.classList.remove(c));
    });
  }

  window.Tristegram = {
    __loaded: true,
    version: '1.0.0',
    settings,
    set,
    openMenu,
    openSettings,
    closeMenu: closePop,
    refresh: enhance,
    disable,
    menu: {
      register(item) {
        if (!item || !item.title) throw new Error('Tristegram.menu.register: нужен { title, onClick }');
        const i = menuItems.findIndex((m) => item.id && m.id === item.id);
        if (i >= 0) menuItems[i] = item; else menuItems.push(item);
      },
      unregister(id) {
        const i = menuItems.findIndex((m) => m.id === id);
        if (i >= 0) menuItems.splice(i, 1);
      },
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // Для загрузчиков плагинов, ожидающих модуль
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { name: 'Tristegram UI', start: () => {}, stop: disable };
  }
})();
