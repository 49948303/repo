/*!
 * frost · algoritmika auto answer
 * made by frost — https://guns.lol/frostqqq
 *
 * Konsolda işə sal -> hello intro -> açar -> menyu (Main / Why? / Credits).
 * Main > Auto answer: ekrandakı sualı oxuyur, Gemini-yə göndərir, cavabı özü doldurur.
 */
(function () {
  'use strict';

  var NS = '__frost_algo__';
  try { if (window[NS] && typeof window[NS].destroy === 'function') window[NS].destroy(); } catch (e) { /* ignore */ }

  // ───────────────────────── config ─────────────────────────
  const ACCESS_KEY = 'az2026';
  const LINK = 'https://guns.lol/frostqqq';
  const DEFAULT_MODEL = 'gemini-3.6-flash';
  const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  const STORE = 'frost.algo.cfg.v1';
  const HELLO_D = 'M36 222 C78 205 112 120 132 46 C140 16 172 18 162 62 C152 108 128 172 122 208 C120 226 100 222 106 192 C112 160 128 138 152 134 C180 130 196 156 188 184 C184 204 196 216 214 198 C230 184 238 152 258 142 C282 130 296 160 268 176 C248 186 226 192 232 208 C238 224 272 216 294 190 C308 172 320 96 338 48 C346 20 378 22 368 66 C360 110 340 172 342 204 C344 224 368 214 386 190 C400 172 412 96 430 48 C438 20 470 22 460 66 C452 110 432 172 434 204 C436 224 460 214 476 186 C484 170 500 148 522 146 C554 144 564 196 528 208 C500 216 482 186 498 160 C512 140 552 130 596 150';

  const cfg = Object.assign({ key: '', model: DEFAULT_MODEL, remember: true, submit: false, delay: 1.2, maxPerMin: 6, cps: 9 }, readCfg());
  function readCfg() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
  function saveCfg() {
    try {
      const c = Object.assign({}, cfg);
      if (!c.remember) c.key = '';
      localStorage.setItem(STORE, JSON.stringify(c));
    } catch (e) { /* storage blocked */ }
  }

  const S = { auto: false, busy: false, unlocked: false, destroyed: false, solved: 0, tab: 'main', calls: 0, cacheHits: 0, abort: false, pauseUntil: 0 };
  const REDUCED = (function () { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jit = (ms) => ms * (0.75 + Math.random() * 0.5);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ───────────────────────── styles ─────────────────────────
  const CSS = `
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
h2,h3,p{margin:0}
.r{--frost:#eaf4ff;--mute:#a3b7d6;--dim:#6f84a8;--ice:#7fd0ff;--glacier:#4f7cff;--aurora:#b58cff;--rose:#ff8ac4;--ok:#5df2c0;--bad:#ff6b8a;--warn:#ffd27a;--line:rgba(190,220,255,.16);position:fixed;inset:0;pointer-events:none;color:var(--frost);font:400 13.5px/1.45 "SF Pro Text","Segoe UI Variable Text","Segoe UI",Inter,system-ui,-apple-system,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.r :where(button){all:unset;box-sizing:border-box;cursor:pointer;-webkit-tap-highlight-color:transparent}
.r :where(input){font:inherit;color:inherit;background:none;border:0;outline:0;margin:0}
.r button:focus-visible{outline:2px solid var(--ice);outline-offset:2px}
.r input[type=checkbox]:focus-visible,.rng:focus-visible{outline:2px solid var(--ice);outline-offset:2px}
[hidden]{display:none!important}

/* intro */
.intro{position:absolute;inset:0;pointer-events:auto;cursor:pointer;display:grid;place-items:center;background:radial-gradient(110% 85% at 50% 38%,#10204a 0%,#070d20 52%,#03060f 100%);transition:opacity .8s ease,transform .9s cubic-bezier(.4,0,.2,1)}
.intro.out{opacity:0;transform:scale(1.06);pointer-events:none}
.hello{width:min(780px,88vw);height:auto;overflow:visible;margin-top:-4vh}
.hello path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.hs{stroke-width:7}
.hgl{stroke-width:14;opacity:.5}
.tip{fill:#fff}
.cap{position:absolute;left:0;right:0;bottom:10vh;text-align:center;font-size:12px;letter-spacing:.36em;color:#8ea6cf;opacity:0;transition:opacity 1.2s ease .5s}
.intro.on .cap{opacity:.8}

/* veil + key card */
.veil{position:absolute;inset:0;background:rgba(3,7,18,.62);backdrop-filter:blur(12px) saturate(1.3);-webkit-backdrop-filter:blur(12px) saturate(1.3);opacity:0;pointer-events:none;transition:opacity .7s ease}
.veil.on{opacity:1;pointer-events:auto}
.stage{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
.glass{background:linear-gradient(155deg,rgba(255,255,255,.12),rgba(255,255,255,.03) 60%),rgba(8,14,36,.84);border:1px solid rgba(190,220,255,.22);backdrop-filter:blur(28px) saturate(1.5);-webkit-backdrop-filter:blur(28px) saturate(1.5);box-shadow:0 40px 90px rgba(0,6,24,.7),inset 0 1px 0 rgba(255,255,255,.28)}
.key{pointer-events:auto;width:min(396px,92vw);padding:30px 30px 24px;border-radius:26px;text-align:center;position:relative;overflow:hidden}
.key.drop{animation:drop 1s cubic-bezier(.2,.7,.2,1) both}
.key.leave{animation:leave .55s cubic-bezier(.5,0,.8,.4) forwards}
.key.shake{animation:shake .5s cubic-bezier(.36,.07,.19,.97)}
@keyframes drop{0%{transform:translateY(-120vh) rotate(-2.5deg)}55%{transform:translateY(26px) rotate(.8deg)}72%{transform:translateY(-12px) rotate(-.3deg)}86%{transform:translateY(5px)}100%{transform:none}}
@keyframes leave{to{transform:translateY(-34px) scale(.94);opacity:0}}
@keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(5px)}30%,50%,70%{transform:translateX(-9px)}40%,60%{transform:translateX(9px)}}
.lock{width:46px;height:46px;margin:0 auto 10px;display:block;fill:none;stroke:var(--ice);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:stroke .4s}
.lock rect{fill:rgba(127,208,255,.12)}
.lock circle{fill:currentColor;stroke:none}
.lock .shackle{transform-origin:32px 22px;transition:transform .6s cubic-bezier(.3,1.5,.5,1)}
.key.ok .lock{stroke:var(--ok)}
.key.ok .lock .shackle{transform:translateY(-5px) rotate(28deg)}
.key h2{font-size:22px;font-weight:600;letter-spacing:-.01em}
.key p{color:var(--mute);margin-top:4px}
.kin{margin:20px 0 6px;border-radius:14px;background:rgba(5,10,28,.5);border:1px solid var(--line);transition:border-color .25s,box-shadow .25s}
.kin:focus-within{border-color:rgba(127,208,255,.7);box-shadow:0 0 0 4px rgba(127,208,255,.14)}
.key.bad .kin{border-color:var(--bad);box-shadow:0 0 0 4px rgba(255,107,138,.14)}
.key.ok .kin{border-color:var(--ok);box-shadow:0 0 0 4px rgba(93,242,192,.14)}
.kin input{width:100%;padding:13px 16px;text-align:center;font-size:19px;letter-spacing:.32em;font-weight:500}
.kin input::placeholder{letter-spacing:.1em;color:var(--dim);font-weight:400}
.kmsg{min-height:20px;font-size:12.5px;color:var(--mute);margin-bottom:10px}
.kmsg.bad{color:var(--bad)}
.kmsg.ok{color:var(--ok)}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 22px;border-radius:13px;font-weight:600;background:linear-gradient(135deg,#5d8bff,#7fd0ff);color:#04112b;box-shadow:0 10px 26px rgba(79,124,255,.38);transition:transform .2s,box-shadow .2s,filter .2s}
.btn:hover{transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 14px 30px rgba(79,124,255,.5)}
.btn:active{transform:translateY(1px) scale(.985)}
.btn.stop{background:linear-gradient(135deg,#ff6b8a,#ff9a6b);color:#2a0612;box-shadow:0 10px 26px rgba(255,107,138,.35)}
.btn.soft{background:rgba(255,255,255,.08);color:var(--frost);box-shadow:none;border:1px solid var(--line)}
.btn.soft:hover{background:rgba(255,255,255,.13);box-shadow:none}
.key .btn{width:100%}
.kwm{margin-top:16px;font-size:11px;letter-spacing:.22em;color:var(--dim);opacity:.75}

/* window */
.win{position:absolute;pointer-events:auto;border-radius:26px;display:grid;grid-template-columns:178px 1fr;overflow:hidden;transition:opacity .35s ease}
.win.drop{animation:drop 1s cubic-bezier(.2,.7,.2,1) both}
.win.mini{animation:mini .35s cubic-bezier(.5,0,.8,.4) forwards;pointer-events:none}
@keyframes mini{to{transform:translate(28vw,38vh) scale(.1);opacity:0}}
:host([data-busy]) .win{opacity:.2;pointer-events:none}
.rail{padding:18px 14px;display:flex;flex-direction:column;border-right:1px solid var(--line);background:linear-gradient(180deg,rgba(10,20,48,.55),rgba(8,14,34,.35))}
.brand{display:flex;align-items:center;gap:10px;padding:2px 8px 18px;font-size:24px;font-weight:300;letter-spacing:-.02em;cursor:grab;user-select:none}
.brand svg{width:24px;height:24px;stroke:var(--ice);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;transition:transform .8s cubic-bezier(.3,1.2,.5,1)}
.brand:hover svg{transform:rotate(60deg)}
.tabs{position:relative;display:flex;flex-direction:column;gap:4px}
.ind{position:absolute;left:0;top:0;right:0;height:44px;border-radius:13px;background:linear-gradient(135deg,rgba(93,139,255,.34),rgba(127,208,255,.18));border:1px solid rgba(127,208,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.18);transition:transform .45s cubic-bezier(.3,1.35,.5,1)}
.tab{position:relative;height:44px;padding:0 16px;display:flex;align-items:center;border-radius:13px;font-weight:500;color:var(--mute);transition:color .25s}
.tab:hover,.tab.on{color:var(--frost)}
.railfoot{margin-top:auto;padding:0 8px;font-size:11px;color:var(--dim)}
.content{position:relative;display:flex;flex-direction:column;min-width:0;min-height:0}
.top{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 18px 6px 22px;cursor:grab;user-select:none}
.status{display:flex;align-items:center;gap:9px;color:var(--mute);font-size:12.5px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--dim);transition:background .3s}
.dot.scan{background:var(--ice);--pc:127,208,255;animation:pulse 1.1s infinite}
.dot.think{background:var(--aurora);--pc:181,140,255;animation:pulse .9s infinite}
.dot.act{background:var(--warn);--pc:255,210,122;animation:pulse .6s infinite}
.dot.ok{background:var(--ok)}
.dot.err{background:var(--bad)}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(var(--pc),.65)}100%{box-shadow:0 0 0 9px rgba(var(--pc),0)}}
.ctl{display:flex;gap:4px}
.ctl button{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;color:var(--mute);transition:background .2s,color .2s}
.ctl button:hover{background:rgba(255,255,255,.1);color:var(--frost)}
.ctl svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}
.panes{position:relative;flex:1;min-height:0;z-index:1}
.pane{position:absolute;inset:0;padding:6px 22px 36px;overflow:auto;opacity:0;visibility:hidden;transform:translateX(14px);pointer-events:none;transition:opacity .3s ease,transform .45s cubic-bezier(.2,.8,.2,1),visibility 0s .45s;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}
.pane.on{opacity:1;visibility:visible;transform:none;pointer-events:auto;transition:opacity .3s ease,transform .45s cubic-bezier(.2,.8,.2,1),visibility 0s}
.pane[data-pane="main"]{display:flex;flex-direction:column}
.wm{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.wm span{position:absolute;font-size:30px;font-weight:700;letter-spacing:.04em;color:#cfe4ff;opacity:.05;transform:rotate(-18deg);white-space:nowrap}
.sig{position:absolute;right:20px;bottom:10px;z-index:2;font-size:11px;letter-spacing:.22em;color:#8da3c9;opacity:.8;pointer-events:none}

/* main */
.card{padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.055);border:1px solid var(--line);transition:border-color .3s,box-shadow .3s}
.card.live{border-color:rgba(127,208,255,.55);box-shadow:0 0 0 1px rgba(127,208,255,.2),0 0 34px rgba(79,124,255,.28)}
.row{display:flex;align-items:center;justify-content:space-between;gap:16px}
.card h3{font-size:15px;font-weight:600}
.card p,.opt small{color:var(--mute);font-size:12px;display:block;margin-top:2px}
.sw{width:46px;height:28px;border-radius:14px;background:rgba(255,255,255,.14);position:relative;flex:none;transition:background .3s}
.sw i{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transition:transform .35s cubic-bezier(.3,1.5,.5,1)}
.sw[aria-checked="true"]{background:linear-gradient(90deg,var(--glacier),var(--ice))}
.sw[aria-checked="true"] i{transform:translateX(18px)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.field>span,.opt b{font-size:12px;color:var(--mute);font-weight:500}
.opt b{color:var(--frost)}
.inp{display:flex;align-items:center;margin-top:5px;border-radius:12px;background:rgba(5,10,28,.45);border:1px solid var(--line);transition:border-color .25s,box-shadow .25s}
.inp:focus-within{border-color:rgba(127,208,255,.6)}
.inp.flash{animation:shake .5s;border-color:var(--bad)}
.inp input{flex:1;min-width:0;padding:9px 12px;font-size:13px}
.eye{padding:0 10px;color:var(--mute);display:grid;place-items:center}
.eye svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.opt{padding:11px 14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--line)}
.opt .row{gap:10px}
.rng{width:100%;-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,.16);margin:12px 0 2px;cursor:pointer}
.rng::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.45)}
.rng::-moz-range-thumb{width:16px;height:16px;border:0;border-radius:50%;background:#fff}
.acts{display:flex;align-items:center;gap:14px;margin-top:12px}
.chk{display:flex;align-items:center;gap:7px;color:var(--mute);font-size:12px;cursor:pointer}
.chk input{accent-color:#7fd0ff;width:14px;height:14px}
.stats{margin-left:auto;color:var(--dim);font-size:12px}
.log{margin-top:12px;flex:1;min-height:64px;overflow:auto;padding:10px 12px;border-radius:14px;background:rgba(3,7,20,.55);border:1px solid var(--line);font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}
.ln{color:var(--mute);animation:lnin .35s ease both}
.ln .t{color:var(--dim);margin-right:8px}
.ln.ok{color:var(--ok)}
.ln.err{color:var(--bad)}
.ln.info{color:var(--ice)}
.ln.dim{color:var(--dim)}
@keyframes lnin{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}

/* why */
.why-t{font-size:21px;line-height:1.3;font-weight:600;min-height:56px;letter-spacing:-.01em;margin-top:8px}
.caret{display:inline-block;width:2px;height:1.05em;background:var(--ice);margin-left:3px;vertical-align:-.15em;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.flow{width:100%;height:auto;margin-top:10px;overflow:visible}
.flow [data-a]{opacity:0;transform-box:fill-box;transform-origin:center}
.flow .ln2{fill:none;stroke:rgba(190,220,255,.5);stroke-width:2;stroke-linecap:round;stroke-dasharray:1}
.flow rect{fill:rgba(255,255,255,.07);stroke:rgba(190,220,255,.3)}
.flow text{fill:#eaf4ff;font-size:12.5px;font-weight:500;font-family:inherit}
.flow .lbl{fill:#a3b7d6;font-size:11.5px;letter-spacing:.08em}
.flow .hot rect{fill:rgba(79,124,255,.24);stroke:rgba(127,208,255,.85)}
.flow .spark{fill:#fff}

/* credits */
.ph{font-size:21px;font-weight:600;letter-spacing:-.01em;margin-top:8px}
.credit{display:flex;align-items:center;gap:14px;margin:18px 0 20px}
.avatar{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:26px;font-weight:300;background:conic-gradient(from 20deg,#7fd0ff,#b58cff,#ff8ac4,#7fd0ff);color:#06102a;animation:spin 9s linear infinite}
.avatar span{display:block;animation:spin 9s linear infinite reverse}
@keyframes spin{to{transform:rotate(360deg)}}
.credit b{font-size:17px;font-weight:600;display:block}
.credit small{color:var(--mute)}
.gun{position:relative;display:inline-flex;align-items:center;gap:10px;padding:13px 22px;border-radius:16px;font-weight:600;background:rgba(255,255,255,.07);border:1px solid rgba(190,220,255,.28);overflow:hidden;transition:transform .25s cubic-bezier(.3,1.5,.5,1),border-color .25s}
.gun::before{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.28) 50%,transparent 70%);transform:translateX(-120%);transition:transform .7s ease}
.gun:hover{transform:translateY(-2px) scale(1.02);border-color:rgba(127,208,255,.8)}
.gun:hover::before{transform:translateX(120%)}
.gun svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.muted{color:var(--mute);font-size:12.5px;margin-top:14px;max-width:46ch}
.pill{position:absolute;right:22px;bottom:22px;pointer-events:auto;padding:10px 20px;border-radius:999px;font-weight:300;font-size:17px;letter-spacing:-.01em;animation:pillin .5s cubic-bezier(.3,1.5,.5,1) both}
@keyframes pillin{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.avatar,.avatar span{animation:none}.key.drop,.win.drop{animation-duration:.01s}}
`;

  const CSS_EXTRA = `
.flow .ln3{fill:none;stroke-width:2.6;stroke-linecap:round;stroke-dasharray:1}
`;

  // ───────────────────────── markup ─────────────────────────
  const TPL = `
<div class="intro" id="intro">
  <svg class="hello" viewBox="0 0 640 290" aria-hidden="true">
    <defs>
      <linearGradient id="hg" gradientUnits="userSpaceOnUse" x1="30" y1="0" x2="610" y2="0">
        <stop offset="0" stop-color="#ff9a3c"/><stop offset=".28" stop-color="#ff4f9a"/>
        <stop offset=".55" stop-color="#a06bff"/><stop offset=".8" stop-color="#4ea8ff"/>
        <stop offset="1" stop-color="#38e0c0"/>
      </linearGradient>
      <filter id="hb" x="-10%" y="-25%" width="120%" height="150%"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>
    <path id="hGlow" class="hgl" stroke="url(#hg)" filter="url(#hb)" d="${HELLO_D}"/>
    <path id="hStroke" class="hs" stroke="url(#hg)" d="${HELLO_D}"/>
    <circle id="hTip" class="tip" r="6" cx="36" cy="222" opacity="0"/>
  </svg>
  <div class="cap">made by frost</div>
</div>

<div class="veil" id="veil"></div>

<div class="stage" id="keyStage" hidden>
  <div class="key glass" id="keyCard">
    <svg class="lock" viewBox="0 0 48 48" aria-hidden="true">
      <path class="shackle" d="M16 22v-6a8 8 0 0 1 16 0v6"/>
      <rect x="11" y="22" width="26" height="20" rx="6"/>
      <circle cx="24" cy="32" r="2.6"/>
    </svg>
    <h2>Açarı daxil et</h2>
    <p>Davam etmək üçün açarı yaz.</p>
    <div class="kin"><input id="keyIn" type="text" autocomplete="off" spellcheck="false" placeholder="açar" maxlength="24"></div>
    <div class="kmsg" id="kMsg"></div>
    <button class="btn" id="keyGo">Daxil ol</button>
    <div class="kwm">made by frost</div>
  </div>
</div>

<div class="win glass" id="win" hidden>
  <aside class="rail">
    <div class="brand dragh">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M4.2 7l15.6 10M4.2 17L19.8 7M9.4 3.9L12 6.4l2.6-2.5M9.4 20.1L12 17.6l2.6 2.5"/></svg>
      <span>frost</span>
    </div>
    <nav class="tabs" id="tabs">
      <span class="ind" id="ind"></span>
      <button class="tab on" data-tab="main">Main</button>
      <button class="tab" data-tab="why">Why?</button>
      <button class="tab" data-tab="credits">Credits</button>
    </nav>
    <div class="railfoot">algoritmika · v1.1</div>
  </aside>

  <section class="content">
    <header class="top dragh">
      <div class="status"><i class="dot" id="dot"></i><span id="statusTxt">Hazırdır</span></div>
      <div class="ctl">
        <button id="btnMin" aria-label="Kiçilt"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
        <button id="btnClose" aria-label="Bağla"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
    </header>

    <div class="wm" id="wm"></div>

    <div class="panes">
      <div class="pane on" data-pane="main">
        <div class="card" id="autoCard">
          <div class="row">
            <div><h3>Auto answer</h3><p>Ekrandakı sualı analiz edir, Gemini ilə cavabı tapıb özü doldurur.</p></div>
            <button class="sw" id="swAuto" role="switch" aria-checked="false" aria-label="Auto answer"><i></i></button>
          </div>
        </div>
        <div class="grid2">
          <label class="field"><span>Gemini API key</span>
            <div class="inp" id="keyBox"><input id="apiKey" type="password" placeholder="AIza…" autocomplete="off" spellcheck="false">
              <button class="eye" id="eye" aria-label="Göstər"><svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div></label>
          <label class="field"><span>Model</span>
            <div class="inp"><input id="model" type="text" autocomplete="off" spellcheck="false"></div></label>
        </div>
        <div class="grid2">
          <div class="opt"><div class="row"><div><b>Auto-submit</b><small>Cavabdan sonra Yoxla / Növbəti düyməsini basır</small></div>
            <button class="sw" id="swSubmit" role="switch" aria-checked="false" aria-label="Auto-submit"><i></i></button></div></div>
          <div class="opt"><b>Gecikmə</b> <small id="delayTxt"></small>
            <input class="rng" id="delay" type="range" min="0" max="6" step="0.2"></div>
          <div class="opt"><b>API limiti</b> <small id="limitTxt"></small>
            <input class="rng" id="limit" type="range" min="1" max="20" step="1"></div>
          <div class="opt"><b>Yazma sürəti</b> <small id="cpsTxt"></small>
            <input class="rng" id="cps" type="range" min="3" max="25" step="1"></div>
        </div>
        <div class="acts">
          <button class="btn" id="btnSolve">İndi həll et</button>
          <label class="chk"><input type="checkbox" id="chkRemember"> açarı yadda saxla</label>
          <span class="stats" id="stats">0 həll · 0 sorğu</span>
        </div>
        <div class="log" id="log"></div>
      </div>

      <div class="pane" data-pane="why">
        <h3 class="why-t"><span id="whyTxt"></span><i class="caret"></i></h3>
        <svg class="flow" id="flow" viewBox="0 0 560 240" aria-label="Normal yol və kodla yol">
          <defs>
            <linearGradient id="fg" gradientUnits="userSpaceOnUse" x1="68" y1="0" x2="486" y2="0">
              <stop offset="0" stop-color="#7fd0ff"/><stop offset="1" stop-color="#b58cff"/>
            </linearGradient>
          </defs>
          <text class="lbl" data-a="l1" x="4" y="14">Normalda</text>
          <g data-a="sual"><rect x="4" y="60" width="64" height="30" rx="15"/><text x="36" y="75" text-anchor="middle" dominant-baseline="central">Sual</text></g>
          <path class="ln2" data-a="p0" pathLength="1" d="M68 75H138"/>
          <circle data-a="sp" cx="144" cy="75" r="4" fill="#7fd0ff"/>
          <path class="ln2" data-a="p1" pathLength="1" d="M144 75C164 75 164 33 188 33"/>
          <path class="ln2" data-a="p2" pathLength="1" d="M144 75H188"/>
          <path class="ln2" data-a="p3" pathLength="1" d="M144 75C164 75 164 117 188 117"/>
          <g data-a="s1"><rect x="188" y="18" width="196" height="30" rx="15"/><text x="286" y="33" text-anchor="middle" dominant-baseline="central">1. Müəllimə qulaq asmaq</text></g>
          <g data-a="s2"><rect x="188" y="60" width="196" height="30" rx="15"/><text x="286" y="75" text-anchor="middle" dominant-baseline="central">2. Ask to Gemini</text></g>
          <g data-a="s3"><rect x="188" y="102" width="196" height="30" rx="15"/><text x="286" y="117" text-anchor="middle" dominant-baseline="central">3. Research on Google</text></g>
          <path class="ln2" data-a="m1" pathLength="1" d="M384 33C408 33 408 75 428 75"/>
          <path class="ln2" data-a="m2" pathLength="1" d="M384 75H428"/>
          <path class="ln2" data-a="m3" pathLength="1" d="M384 117C408 117 408 75 428 75"/>
          <path class="ln2" data-a="p4" pathLength="1" d="M428 75H486"/>
          <g data-a="cav1"><rect x="486" y="60" width="70" height="30" rx="15"/><text x="521" y="75" text-anchor="middle" dominant-baseline="central">Cavab</text></g>

          <text class="lbl" data-a="l2" x="4" y="168">Kodla</text>
          <g data-a="sual2"><rect x="4" y="185" width="64" height="30" rx="15"/><text x="36" y="200" text-anchor="middle" dominant-baseline="central">Sual</text></g>
          <path class="ln3" data-a="q" pathLength="1" stroke="url(#fg)" d="M68 200H486"/>
          <g data-a="chip" class="hot"><rect x="250" y="185" width="60" height="30" rx="15"/><text x="280" y="200" text-anchor="middle" dominant-baseline="central">kod</text></g>
          <circle class="spark" data-a="spark" cx="68" cy="200" r="5"/>
          <g data-a="cav2" class="hot"><rect x="486" y="185" width="70" height="30" rx="15"/><text x="521" y="200" text-anchor="middle" dominant-baseline="central">Cavab</text></g>
        </svg>
      </div>

      <div class="pane" data-pane="credits">
        <h3 class="ph">Credits</h3>
        <div class="credit">
          <div class="avatar"><span>f</span></div>
          <div><b>frost</b><small>developer</small></div>
        </div>
        <button class="gun" id="btnGun"><span>gunslol</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></button>
        <p class="muted">guns.lol/frostqqq</p>
        <p class="muted">Cavabları Gemini tapır. Skript yalnız sən işə salıb açarı daxil edəndən sonra aktiv olur.</p>
      </div>
    </div>
    <div class="sig">made by frost</div>
  </section>
</div>

<button class="pill glass" id="pill" hidden>frost</button>
`;

  // ───────────────────────── mount (shadow DOM) ─────────────────────────
  const host = document.createElement('div');
  host.id = 'frost-algo-host';
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const root = host.attachShadow({ mode: 'open' });
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS + CSS_EXTRA);
    root.adoptedStyleSheets = [sheet];
  } catch (e) {
    const st = document.createElement('style');
    st.textContent = CSS + CSS_EXTRA;
    root.appendChild(st);
  }
  const wrap = document.createElement('div');
  wrap.className = 'r';
  const parsed = new DOMParser().parseFromString('<body>' + TPL + '</body>', 'text/html').body;
  while (parsed.firstChild) wrap.appendChild(parsed.firstChild);
  root.appendChild(wrap);
  document.documentElement.appendChild(host);

  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));

  // keep key presses inside our UI away from the page's hotkeys
  ['keydown', 'keyup', 'keypress'].forEach((t) => root.addEventListener(t, (e) => e.stopPropagation()));

  // ───────────────────────── small UI helpers ─────────────────────────
  const el = {
    intro: $('#intro'), veil: $('#veil'), keyStage: $('#keyStage'), keyCard: $('#keyCard'), keyIn: $('#keyIn'),
    kMsg: $('#kMsg'), keyGo: $('#keyGo'), win: $('#win'), ind: $('#ind'), dot: $('#dot'), statusTxt: $('#statusTxt'),
    swAuto: $('#swAuto'), autoCard: $('#autoCard'), swSubmit: $('#swSubmit'), apiKey: $('#apiKey'), model: $('#model'),
    keyBox: $('#keyBox'), delay: $('#delay'), delayTxt: $('#delayTxt'), limit: $('#limit'), limitTxt: $('#limitTxt'), cps: $('#cps'), cpsTxt: $('#cpsTxt'), remember: $('#chkRemember'), stats: $('#stats'),
    log: $('#log'), pill: $('#pill'), wm: $('#wm')
  };

  function log(type, msg) {
    const d = document.createElement('div');
    d.className = 'ln ' + type;
    const t = document.createElement('span');
    t.className = 't';
    const n = new Date();
    t.textContent = [n.getHours(), n.getMinutes(), n.getSeconds()].map((v) => String(v).padStart(2, '0')).join(':');
    d.appendChild(t);
    d.appendChild(document.createTextNode(msg));
    el.log.appendChild(d);
    while (el.log.children.length > 80) el.log.firstChild.remove();
    el.log.scrollTop = el.log.scrollHeight;
  }
  function setStatus(kind, text) {
    el.dot.className = 'dot ' + kind;
    el.statusTxt.textContent = text;
  }
  function ghost(on) { host.toggleAttribute('data-busy', !!on); }
  function setSwitch(btn, on) { btn.setAttribute('aria-checked', on ? 'true' : 'false'); }
  function updateStats() { el.stats.textContent = S.solved + ' həll · ' + S.calls + ' sorğu'; }
  function flashKeyBox() {
    el.keyBox.classList.remove('flash');
    void el.keyBox.offsetWidth;
    el.keyBox.classList.add('flash');
    el.apiKey.focus();
  }

  // watermark: a quiet grid of rotated "made by frost" behind the content
  (function buildWatermark() {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        const s = document.createElement('span');
        s.textContent = 'made by frost';
        s.style.left = (c * 250 - 40 + (r % 2) * 110) + 'px';
        s.style.top = (r * 110 + 20) + 'px';
        el.wm.appendChild(s);
      }
    }
  })();

  // ───────────────────────── hello intro ─────────────────────────
  let skipIntro = false;
  function playHello() {
    return new Promise((resolve) => {
      const stroke = $('#hStroke'), glow = $('#hGlow'), tip = $('#hTip');
      const len = stroke.getTotalLength();
      [stroke, glow].forEach((p) => { p.style.strokeDasharray = String(len); p.style.strokeDashoffset = String(len); });
      const dur = REDUCED ? 700 : 3300;
      const start = performance.now() + 350;
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const skip = () => { skipIntro = true; };
      el.intro.addEventListener('click', skip);
      let finished = false;
      const finish = async () => {
        if (finished) return;
        finished = true;
        tip.setAttribute('opacity', '0');
        stroke.style.strokeDashoffset = '0';
        glow.style.strokeDashoffset = '0';
        el.intro.classList.add('on');
        await sleep(skipIntro ? 120 : 900);
        el.intro.classList.add('out');
        await sleep(skipIntro ? 300 : 800);
        el.intro.remove();
        resolve();
      };
      const frame = (now) => {
        if (S.destroyed) return resolve();
        if (skipIntro) return finish();
        const t = clamp((now - start) / dur, 0, 1);
        const p = ease(t);
        stroke.style.strokeDashoffset = String(len * (1 - p));
        glow.style.strokeDashoffset = String(len * (1 - p));
        if (t > 0 && t < 1) {
          const pt = stroke.getPointAtLength(p * len);
          tip.setAttribute('cx', pt.x);
          tip.setAttribute('cy', pt.y);
          tip.setAttribute('opacity', '1');
        }
        if (t < 1) requestAnimationFrame(frame); else finish();
      };
      requestAnimationFrame(frame);
    });
  }

  // ───────────────────────── key gate ─────────────────────────
  function showKeyCard() {
    el.veil.classList.add('on');
    el.keyStage.hidden = false;
    el.keyCard.classList.add('drop');
    setTimeout(() => { if (!S.destroyed) el.keyIn.focus(); }, 950);
  }
  async function tryKey() {
    if (S.unlocked) return;
    const v = el.keyIn.value.trim().toLowerCase();
    if (v === ACCESS_KEY) {
      S.unlocked = true;
      el.keyCard.classList.remove('bad');
      el.keyCard.classList.add('ok');
      el.kMsg.className = 'kmsg ok';
      el.kMsg.textContent = 'Açıldı';
      await sleep(850);
      el.keyCard.classList.remove('drop');
      el.keyCard.classList.add('leave');
      el.veil.classList.remove('on');
      await sleep(520);
      el.keyStage.hidden = true;
      openWindow();
    } else {
      el.keyCard.classList.remove('drop', 'shake');
      void el.keyCard.offsetWidth;
      el.keyCard.classList.add('bad', 'shake');
      el.kMsg.className = 'kmsg bad';
      el.kMsg.textContent = v ? 'Açar yanlışdır. Yenidən yoxla.' : 'Əvvəlcə açarı yaz.';
      el.keyIn.select();
    }
  }
  el.keyGo.addEventListener('click', tryKey);
  el.keyIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryKey(); });
  el.keyIn.addEventListener('input', () => { el.keyCard.classList.remove('bad'); if (el.kMsg.classList.contains('bad')) { el.kMsg.textContent = ''; el.kMsg.className = 'kmsg'; } });

  // ───────────────────────── window ─────────────────────────
  function placeWindow() {
    const w = Math.min(740, innerWidth - 24), h = Math.min(580, innerHeight - 24);
    el.win.style.width = w + 'px';
    el.win.style.height = h + 'px';
    el.win.style.left = Math.max(12, (innerWidth - w) / 2) + 'px';
    el.win.style.top = Math.max(12, (innerHeight - h) / 2) + 'px';
  }
  function openWindow() {
    placeWindow();
    el.win.hidden = false;
    el.win.classList.add('drop');
    moveIndicator('main');
    log('info', 'Xoş gəldin. Gemini API açarını yaz, sonra Auto answer-i aç.');
    if (!cfg.key) setTimeout(() => { if (!S.destroyed) el.apiKey.focus(); }, 1000);
  }
  function minimize() {
    el.win.classList.remove('drop');
    el.win.classList.add('mini');
    el.pill.hidden = false;
  }
  function restore() {
    el.pill.hidden = true;
    el.win.classList.remove('mini');
    el.win.classList.remove('drop');
    void el.win.offsetWidth;
    el.win.classList.add('drop');
  }
  $('#btnMin').addEventListener('click', minimize);
  el.pill.addEventListener('click', restore);
  $('#btnClose').addEventListener('click', () => destroy());

  $$('.dragh').forEach((h) => {
    h.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button,input')) return;
      const r = el.win.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      h.setPointerCapture(e.pointerId);
      const mv = (ev) => {
        el.win.style.left = clamp(ev.clientX - dx, 80 - r.width, innerWidth - 80) + 'px';
        el.win.style.top = clamp(ev.clientY - dy, 0, innerHeight - 40) + 'px';
      };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); };
      h.addEventListener('pointermove', mv);
      h.addEventListener('pointerup', up);
    });
  });

  function onHotkey(e) {
    if (e.key !== 'Insert' || !S.unlocked) return;
    if (el.win.classList.contains('mini')) restore(); else minimize();
  }
  window.addEventListener('keydown', onHotkey, true);
  function onResize() { if (!el.win.hidden) placeWindow(); }
  window.addEventListener('resize', onResize);

  // ───────────────────────── tabs ─────────────────────────
  const TAB_ORDER = ['main', 'why', 'credits'];
  function moveIndicator(name) { el.ind.style.transform = 'translateY(' + TAB_ORDER.indexOf(name) * 48 + 'px)'; }
  function showTab(name) {
    S.tab = name;
    $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    $$('.pane').forEach((p) => p.classList.toggle('on', p.dataset.pane === name));
    moveIndicator(name);
    if (name === 'why') startWhy(); else stopWhy();
  }
  $$('.tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

  $('#btnGun').addEventListener('click', () => {
    try { window.open(LINK, '_blank', 'noopener,noreferrer'); } catch (e) { /* popup blocked */ }
  });

  // ───────────────────────── Why? animation ─────────────────────────
  let whyTok = 0, whyAnims = [];
  function stopWhy() { whyTok++; whyAnims.forEach((a) => { try { a.cancel(); } catch (e) { /* ignore */ } }); whyAnims = []; }
  async function waitTok(tok, ms) { const end = Date.now() + ms; while (Date.now() < end) { if (tok !== whyTok || S.destroyed) return false; await sleep(Math.min(120, end - Date.now())); } return tok === whyTok && !S.destroyed; }
  function startWhy() {
    stopWhy();
    const tok = whyTok;
    typeWhy(tok);
    flowLoop(tok);
  }
  async function typeWhy(tok) {
    const t = $('#whyTxt');
    t.textContent = '';
    const text = 'Bu kod hər kəsin etdiyini edir, sadəcə insan əlinə ehtiyac olmadan ;D';
    for (const ch of text) {
      if (tok !== whyTok) return;
      t.textContent += ch;
      await sleep(ch === ',' ? 280 : 30 + Math.random() * 28);
    }
  }
  async function flowLoop(tok) {
    const svg = $('#flow');
    const find = (n) => svg.querySelector('[data-a="' + n + '"]');
    const EASE = 'cubic-bezier(.2,.8,.2,1)';
    while (tok === whyTok && !S.destroyed) {
      const anims = [];
      const A = (name, kf, delay, dur, ease) => {
        const a = find(name).animate(kf, { delay, duration: dur, easing: ease || EASE, fill: 'both' });
        anims.push(a);
        return a;
      };
      const pop = [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }];
      const fade = [{ opacity: 0 }, { opacity: 1 }];
      const draw = [{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }];
      A('l1', fade, 0, 350);
      A('sual', pop, 100, 420);
      A('p0', draw, 450, 600);
      A('sp', pop, 1000, 250);
      A('p1', draw, 1150, 560);
      A('p2', draw, 1230, 560);
      A('p3', draw, 1310, 560);
      A('s1', pop, 1750, 380);
      A('s2', pop, 2300, 380);
      A('s3', pop, 2850, 380);
      A('m1', draw, 3500, 560);
      A('m2', draw, 3500, 560);
      A('m3', draw, 3500, 560);
      A('p4', draw, 4050, 480);
      A('cav1', pop, 4500, 420);
      A('l2', fade, 5400, 350);
      A('sual2', pop, 5500, 380);
      A('q', draw, 5900, 380, 'cubic-bezier(.7,0,.2,1)');
      A('spark', [{ opacity: 0, transform: 'translateX(0px)', offset: 0 }, { opacity: 1, transform: 'translateX(40px)', offset: 0.12 }, { opacity: 1, transform: 'translateX(400px)', offset: 0.9 }, { opacity: 0, transform: 'translateX(418px)', offset: 1 }], 5900, 400, 'cubic-bezier(.7,0,.2,1)');
      A('chip', pop, 6050, 300);
      A('cav2', [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.14)', offset: 0.6 }, { opacity: 1, transform: 'scale(1)' }], 6300, 520);
      // fade everything out before the loop restarts
      svg.querySelectorAll('[data-a]').forEach((n) => anims.push(n.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 10200, duration: 450, fill: 'forwards' })));
      whyAnims = anims;
      const alive = await waitTok(tok, 11000);
      anims.forEach((a) => { try { a.cancel(); } catch (e) { /* ignore */ } });
      if (!alive) return;
    }
  }

  // ───────────────────────── page scanner ─────────────────────────
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg', 'SVG', 'IFRAME', 'CANVAS', 'HEAD', 'META', 'LINK', 'OBJECT', 'AUDIO', 'VIDEO']);
  const DRAG_SEL = '[draggable="true"],[data-rbd-draggable-id],[data-rfd-draggable-id],[aria-roledescription="sortable"],[aria-roledescription="draggable"],[data-dnd-draggable],[data-draggable]';
  const DROP_SEL = '[data-rbd-droppable-id],[data-rfd-droppable-id],[data-droppable],[data-dnd-droppable]';
  const DRAG_TOK = /^(draggable|drag|drag[-_]?item|dragitem|sortable[-_]?item|sortable|dnd[-_]?item|draggable[-_]?item|ui-draggable|react-draggable)$/;
  const DROP_TOK = /^(gap|target|dest|destination|zone|droppable|dropbox|drop[-_]?area|drop[-_]?target)$|(^|[-_])(slot|blank|dropzone|zone)($|[-_\d])/;
  const TEXT_TYPES = ['', 'text', 'number', 'search', 'tel', 'email', 'url'];

  const normTxt = (e, max) => (((e.innerText || e.textContent || '') + '').replace(/\s+/g, ' ').trim()).slice(0, max || 120);
  function shown(e) {
    if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.02;
  }
  function tokens(e) {
    const c = typeof e.className === 'string' ? e.className : ((e.className && e.className.baseVal) || '');
    return (c + ' ' + (e.id || '')).toLowerCase().split(/\s+/).filter(Boolean);
  }
  function inChrome(e) { return !!e.closest('nav,header,footer,[role="navigation"],[role="banner"],[role="contentinfo"],[role="menubar"]'); }

  function classify(e) {
    const tag = e.tagName;
    if (tag === 'INPUT') {
      const t = (e.type || 'text').toLowerCase();
      if (t === 'radio') return 'radio';
      if (t === 'checkbox') return 'checkbox';
      if (TEXT_TYPES.indexOf(t) >= 0) return 'input';
      return null;
    }
    if (tag === 'TEXTAREA') return 'textarea';
    if (tag === 'SELECT') return 'select';
    const ce = e.getAttribute('contenteditable');
    if (ce === '' || ce === 'true' || ce === 'plaintext-only') return 'textarea';
    const role = e.getAttribute('role');
    if (role === 'radio' || role === 'menuitemradio') return 'radio';
    if (role === 'checkbox') return 'checkbox';
    if (role === 'option') return 'option';
    if (e.matches(DRAG_SEL)) return 'draggable';
    const tk = tokens(e);
    if (tk.some((t) => DRAG_TOK.test(t))) return 'draggable';
    if (e.matches(DROP_SEL)) return 'dropzone';
    if (tk.some((t) => DROP_TOK.test(t) || (/drop/.test(t) && !/drop-?down|drop-?shadow|dropcap|dropped|dropping|dropover/.test(t)))) return 'dropzone';
    if (tag === 'BUTTON' || role === 'button' || (tag === 'INPUT' && /^(button|submit)$/i.test(e.type))) return 'button';
    if (/^(DIV|SECTION|LI|SPAN|TD|P|ARTICLE|IMG|FIGURE|A)$/.test(tag) && e.children.length <= 8) {
      const cs = getComputedStyle(e);
      if (/^(grab|grabbing|move)$/.test(cs.cursor) && !(e.parentElement && getComputedStyle(e.parentElement).cursor === cs.cursor)) return 'draggable';
      if (tag === 'IMG' || tag === 'A' || tag === 'FIGURE') return null;
      if ((cs.borderTopStyle === 'dashed' || cs.borderLeftStyle === 'dashed' || cs.outlineStyle === 'dashed') && parseFloat(cs.borderTopWidth || 0) + parseFloat(cs.borderLeftWidth || 0) + parseFloat(cs.outlineWidth || 0) > 0) return 'dropzone';
    }
    return null;
  }

  function labelOfInput(e) {
    let t = '';
    try { if (e.labels && e.labels.length) t = normTxt(e.labels[0], 80); } catch (x) { /* ignore */ }
    if (!t) t = e.getAttribute('aria-label') || '';
    if (!t && e.getAttribute('aria-labelledby')) { const l = document.getElementById(e.getAttribute('aria-labelledby')); if (l) t = normTxt(l, 80); }
    if (!t) t = e.getAttribute('title') || '';
    return (t || '').trim().slice(0, 80);
  }
  function choiceLabel(e) {
    let lab = null;
    if (e.tagName === 'INPUT') {
      lab = e.closest('label');
      if (!lab && e.id) { try { lab = document.querySelector('label[for="' + CSS.escape(e.id) + '"]'); } catch (x) { /* ignore */ } }
    }
    let t = lab ? normTxt(lab, 80) : normTxt(e, 80);
    if (!t) t = e.getAttribute('aria-label') || '';
    if (!t && e.nextElementSibling) t = normTxt(e.nextElementSibling, 80);
    if (!t && e.nextSibling && e.nextSibling.nodeType === 3) t = (e.nextSibling.nodeValue || '').trim().slice(0, 80);
    return { lab, text: (t || '').trim() };
  }
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  function collect() {
    const reg = new Map();      // id -> entry {id, el, click, kind, label, key}
    const elId = new Map();     // element -> id
    const items = [];           // serialisable catalog sent to Gemini
    const claimed = new Set();
    const counters = new Map();
    let n = 0;
    const nth = (k) => { const c = counters.get(k) || 0; counters.set(k, c + 1); return c; };
    const rectOf = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left / 5) * 5, Math.round(r.top / 5) * 5, Math.round(r.width / 5) * 5, Math.round(r.height / 5) * 5]; };
    const claimedAbove = (e) => { for (let p = e; p; p = p.parentElement) if (claimed.has(p)) return true; return false; };
    const containsClaimed = (e) => { for (const c of claimed) if (c !== e && e.contains(c)) return true; return false; };
    const add = (kind, e, click, label, extra) => {
      const id = 'f' + (++n);
      const key = kind === 'dropzone' ? 'dropzone|#' + nth('dz') : kind + '|' + label + '|' + nth(kind + '|' + label);
      const ent = { id, el: e, click: click || e, kind, label, key };
      reg.set(id, ent);
      elId.set(e, id);
      if (click && click !== e) elId.set(click, id);
      claimed.add(e);
      if (click) claimed.add(click);
      items.push(Object.assign({ id, kind, label, rect: rectOf(click || e) }, extra || {}));
      return ent;
    };
    const dragAncestor = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const i = elId.get(p); if (i && reg.get(i).kind === 'draggable') return true; } return false; };

    const all = Array.from(document.body.querySelectorAll('*')).slice(0, 5000);

    // pass 1: things you fill in, choose, or drag
    for (const e of all) {
      if (SKIP_TAGS.has(e.tagName)) continue;
      const kind = classify(e);
      if (!kind || kind === 'button') continue;
      if (kind === 'input' || kind === 'textarea') {
        if (!shown(e) || e.disabled || e.readOnly) continue;
        const isCE = !('value' in e);
        add(kind, e, e, labelOfInput(e), { value: (isCE ? e.textContent : e.value) || '', placeholder: e.placeholder || '', inputType: e.type || 'text' });
      } else if (kind === 'select') {
        if (!shown(e) || e.disabled) continue;
        add(kind, e, e, labelOfInput(e), { options: Array.from(e.options).map((o) => o.text.trim()), selected: e.selectedOptions[0] ? e.selectedOptions[0].text.trim() : '' });
      } else if (kind === 'radio' || kind === 'checkbox') {
        const c = choiceLabel(e);
        const click = [c.lab, e].find((x) => x && shown(x));
        if (!click || e.disabled) continue;
        const checked = e.tagName === 'INPUT' ? e.checked : e.getAttribute('aria-checked') === 'true';
        add(kind, e, click, c.text, { checked, group: e.name || '' });
        if (c.lab) claimed.add(c.lab);
      } else if (kind === 'option') {
        if (!shown(e)) continue;
        add(kind, e, e, normTxt(e, 80), { selected: e.getAttribute('aria-selected') === 'true' });
      } else if (kind === 'draggable') {
        if (!shown(e) || dragAncestor(e)) continue;
        const img = e.querySelector('img');
        add(kind, e, e, normTxt(e, 80) || (img && img.alt) || e.getAttribute('aria-label') || '');
      } else if (kind === 'dropzone') {
        if (!shown(e)) continue;
        add(kind, e, e, normTxt(e, 60));
      }
    }

    // pass 2: buttons and anything that behaves like a clickable card/option
    const cur = new Map();
    const cursorOf = (e) => { if (!cur.has(e)) cur.set(e, getComputedStyle(e).cursor); return cur.get(e); };
    let nb = 0, nc = 0;
    const vpArea = innerWidth * innerHeight;
    for (const e of all) {
      if (SKIP_TAGS.has(e.tagName) || e.tagName === 'A' || claimedAbove(e)) continue;
      const role = e.getAttribute('role');
      const isBtn = e.tagName === 'BUTTON' || role === 'button' || (e.tagName === 'INPUT' && /^(button|submit)$/i.test(e.type));
      if (isBtn) {
        if (nb >= 25 || e.disabled || !shown(e) || inChrome(e)) continue;
        const label = normTxt(e, 60) || e.value || e.getAttribute('aria-label') || '';
        if (!label) continue;
        add('button', e, e, label, { disabled: false });
        nb++;
        continue;
      }
      if (nc >= 60 || cursorOf(e) !== 'pointer') continue;
      if (e.parentElement && cursorOf(e.parentElement) === 'pointer') continue;
      if (inChrome(e) || containsClaimed(e) || !shown(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width * r.height > vpArea * 0.6) continue;
      const img = e.querySelector('img');
      const label = normTxt(e, 80) || (img && (img.alt || (img.getAttribute('src') || '').split('/').pop())) || '';
      if (!label) continue;
      add('clickable', e, e, label);
      nc++;
    }

    // which dropzone a draggable currently sits in
    const info = new Map(items.map((i) => [i.id, i]));
    for (const ent of reg.values()) {
      if (ent.kind !== 'draggable') continue;
      for (let p = ent.el.parentElement; p; p = p.parentElement) {
        const zid = elId.get(p);
        if (zid && reg.get(zid).kind === 'dropzone') { info.get(ent.id).in = zid; break; }
      }
    }

    // annotated page text: the page text with ⟦id kind "label"⟧ markers where interactive things sit
    const LIMIT = 9000;
    let out = '';
    const emitted = new Set();
    const mark = (id) => {
      const it = info.get(id);
      return ' ⟦' + id + ' ' + it.kind + (it.label ? ' "' + it.label.replace(/"/g, "'") + '"' : '') + '⟧ ';
    };
    (function walk(node) {
      if (out.length > LIMIT) return;
      if (node.nodeType === 3) {
        const t = node.nodeValue.replace(/\s+/g, ' ');
        if (t.trim()) out += t; else if (out && !/\s$/.test(out)) out += ' ';
        return;
      }
      if (node.nodeType !== 1) return;
      const e = node;
      if (SKIP_TAGS.has(e.tagName) || e.matches('nav,[role="navigation"],footer')) return;
      const id = elId.get(e);
      if (id) {
        if (emitted.has(id)) return;
        emitted.add(id);
        if (info.get(id).kind === 'dropzone') {
          out += ' ⟦' + id + ' dropzone⟧{';
          e.childNodes.forEach(walk);
          out += '} ';
        } else out += mark(id);
        return;
      }
      if (e.tagName === 'IMG') { out += ' [img: ' + (e.alt || (e.getAttribute('src') || '').split('/').pop().split('?')[0] || '?') + '] '; return; }
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const blk = !(cs.display.indexOf('inline') === 0 || cs.display === 'contents');
      if (blk) out += '\n';
      e.childNodes.forEach(walk);
      if (blk) out += '\n';
    })(document.body);
    const text = out.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    // signature that survives our own actions: ignore ids, dropzone contents, where draggables currently sit and clocks
    let sigText = text;
    for (let k = 0; k < 6; k++) {
      const nx = sigText.replace(/⟦f\d+ dropzone⟧\{[^{}]*\}/g, '⟦dz⟧');
      if (nx === sigText) break;
      sigText = nx;
    }
    sigText = sigText.replace(/⟦[^⟧]*⟧/g, '⟦⟧').replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '');
    const sig = hash(sigText + '|' + items.filter((i) => i.kind !== 'dropzone' && i.kind !== 'button').map((i) => i.kind + ':' + i.label).sort().join(';'));
    return { reg, items, text, sig, answerable: items.some((i) => i.kind !== 'button') };
  }

  // ───────────────────────── Gemini ─────────────────────────
  const SYS = `You solve interactive school exercises (programming, computer science, maths, logic) that are shown on a web page, for a student platform.
You receive JSON: {"page":{"url","title","text"},"elements":[...]}.
"text" is the visible page text. Interactive elements are marked inline as ⟦id kind "label"⟧ (a dropzone is ⟦id dropzone⟧{its current content}). "elements" is the catalog with state (value, checked, selected, options, in = dropzone id, rect = [x,y,w,h]).
Work out the correct answer(s) and reply with ONLY one JSON object:
{"question":"<short restatement>","kind":"input|single|multi|dragdrop|matching|ordering|select|none","reasoning":"<max 25 words>","actions":[ ... ]}
Allowed actions (use only ids from the catalog, in the order they must be executed):
 {"op":"type","id":"<input/textarea id>","value":"<text to enter>"}
 {"op":"select","id":"<select id>","value":"<visible option text>"}
 {"op":"click","id":"<radio/checkbox/option/clickable id>"}
 {"op":"drag","from":"<draggable id>","to":"<dropzone id, or another draggable id whose position it should take>"}
Rules:
- Be correct above all: compute maths, trace code and read the question carefully before answering.
- Single choice: one click on the right option. Multiple choice: click every correct option, nothing else. Skip options that already have the right state.
- Fill in the blank / text answers: one "type" per input, exact minimal answer (no extra words, keep code syntax and case exactly). Numbers without units unless asked.
- Drag and drop: one "drag" per draggable that must move, from the draggable to the dropzone it belongs in. Omit draggables that already sit in the right dropzone.
- Matching: if the items are draggable use "drag". If the UI matches by clicking, click the first item of a pair and then its partner, pair by pair.
- Ordering / sorting: output drags in the sequence that produces the final order.
- Never click navigation, menu, check, submit or next buttons; the app handles those itself. Only click buttons that are themselves the answer options.
- If there is no question to answer, return {"kind":"none","actions":[]}.
Answer in the language of the question. Output JSON only, no markdown.`;

  const callTimes = [];                 // timestamps of real API requests (rolling minute)
  const modelBlock = new Map();         // model -> blocked until (ms)
  function explainHttp(status, body) {
    const m = (body && body.error && body.error.message) || '';
    if (status === 400 && /api key/i.test(m)) return 'Gemini API açarı yanlışdır.';
    if (status === 403) return 'Gemini icazə vermədi (403): açarı və ya region məhdudiyyətini yoxla.';
    if (status === 429) return 'Gemini limiti doldu (429).';
    return 'Gemini xətası ' + status + (m ? ': ' + m.slice(0, 140) : '');
  }
  function retryAfterOf(j) {
    try {
      const d = ((j && j.error && j.error.details) || []).find((x) => x && x.retryDelay);
      if (d) { const m = String(d.retryDelay).match(/([\d.]+)s/); if (m) return Math.ceil(parseFloat(m[1])); }
    } catch (e) { /* ignore */ }
    const m2 = ((j && j.error && j.error.message) || '').match(/retry in ([\d.]+)s/i);
    return m2 ? Math.ceil(parseFloat(m2[1])) : 0;
  }
  async function callModel(model, task) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
    const payload = { page: { url: location.host + location.pathname, title: document.title, text: task.text }, elements: task.items };
    const body = {
      systemInstruction: { parts: [{ text: SYS }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      let res;
      S.calls++; callTimes.push(Date.now()); updateStats();
      try {
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key }, body: JSON.stringify(body) });
      } catch (e) {
        throw Object.assign(new Error('Gemini-yə qoşulmaq alınmadı (şəbəkə və ya səhifənin CSP məhdudiyyəti).'), { fatal: true });
      }
      let j = null;
      try { j = await res.json(); } catch (e) { /* not json */ }
      if (res.ok) {
        const parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
        const text = parts ? parts.map((p) => p.text || '').join('') : '';
        if (!text) throw new Error('Gemini boş cavab qaytardı' + (j && j.promptFeedback && j.promptFeedback.blockReason ? ' (' + j.promptFeedback.blockReason + ')' : '') + '.');
        return parseJson(text);
      }
      // 429 is never retried here: every retry would burn more quota. The caller switches model / pauses instead.
      if (res.status === 429) throw Object.assign(new Error(explainHttp(429, j)), { status: 429, daily: /per.?day/i.test(JSON.stringify(j || {})), retryAfter: retryAfterOf(j) });
      if (res.status >= 500 && attempt === 0) { await sleep(1500); continue; }
      throw Object.assign(new Error(explainHttp(res.status, j)), { status: res.status });
    }
    throw new Error('Gemini cavab vermədi.');
  }
  function parseJson(text) {
    const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try { return JSON.parse(clean); } catch (e) { /* try to cut out the object */ }
    const a = clean.indexOf('{'), b = clean.lastIndexOf('}');
    if (a >= 0 && b > a) { try { return JSON.parse(clean.slice(a, b + 1)); } catch (e) { /* fallthrough */ } }
    throw new Error('Gemini cavabı JSON deyil.');
  }
  async function askGemini(task) {
    const chain = [cfg.model || DEFAULT_MODEL].concat(FALLBACK_MODELS.filter((m) => m !== cfg.model));
    let last = null, soonest = Infinity;
    for (const m of chain) {
      const until = modelBlock.get(m) || 0;
      if (until > Date.now()) { if (until - Date.now() < 3500e3) soonest = Math.min(soonest, until); continue; }
      try { return await callModel(m, task); } catch (e) {
        last = e;
        if (e.status === 404 || (e.status === 400 && /model/i.test(e.message))) { modelBlock.set(m, Date.now() + 3600e3); log('dim', m + ' mövcud deyil, növbəti model…'); continue; }
        if (e.status === 429) {
          const wait = e.daily ? 3600e3 : Math.max(20, e.retryAfter || 60) * 1000;
          modelBlock.set(m, Date.now() + wait);
          if (!e.daily) soonest = Math.min(soonest, Date.now() + wait);
          log('dim', m + ' limitdədir (' + (e.daily ? 'gündəlik kvota' : Math.round(wait / 1000) + ' san') + '), növbəti model…');
          continue;
        }
        throw e;
      }
    }
    const secs = soonest < Infinity ? Math.max(5, Math.ceil((soonest - Date.now()) / 1000)) : 1800;
    S.pauseUntil = Date.now() + secs * 1000;
    throw Object.assign(new Error('Bütün modellər limitdədir (kvota proyekt və model üzrə sayılır). ' + (secs >= 1800 ? 'Gündəlik kvota bitib: sabah (Pasifik vaxtı ilə gecə yarısı) yenilənir və ya AI Studio-da billing aç.' : secs + ' saniyə sonra yenidən sınayacağam.')), { rateLimited: true, secs: secs });
  }

  // ───────────────────────── executor ─────────────────────────
  const center = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const bringIntoView = (e) => { try { e.scrollIntoView({ block: 'center', inline: 'center' }); } catch (x) { /* ignore */ } };
  const mkPointer = (type, x, y, buttons) => new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: buttons });
  const mkMouse = (type, x, y, buttons) => new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, button: 0, buttons: buttons });

  async function clickEl(e) {
    bringIntoView(e);
    await sleep(110);
    const c = center(e);
    ['pointerover', 'pointerenter'].forEach((t) => e.dispatchEvent(mkPointer(t, c.x, c.y, 0)));
    ['mouseover', 'mouseenter', 'mousemove'].forEach((t) => e.dispatchEvent(mkMouse(t, c.x, c.y, 0)));
    e.dispatchEvent(mkPointer('pointerdown', c.x, c.y, 1));
    e.dispatchEvent(mkMouse('mousedown', c.x, c.y, 1));
    if (typeof e.focus === 'function') { try { e.focus({ preventScroll: true }); } catch (x) { /* ignore */ } }
    await sleep(40 + Math.random() * 60);
    e.dispatchEvent(mkPointer('pointerup', c.x, c.y, 0));
    e.dispatchEvent(mkMouse('mouseup', c.x, c.y, 0));
    e.click();
  }

  async function typeInto(e, value) {
    bringIntoView(e);
    await sleep(100);
    e.focus({ preventScroll: true });
    const isCE = !('value' in e);
    const read = () => (isCE ? e.textContent : e.value);
    if (read() === value) return false;
    let setter = null;
    if (!isCE) {
      const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    }
    const write = (v) => { if (isCE) e.textContent = v; else setter.call(e, v); };
    write('');
    e.dispatchEvent(new Event('input', { bubbles: true }));
    if (value.length <= 60 && cfg.delay > 0) {
      let acc = '';
      for (const ch of value) {
        acc += ch;
        e.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
        write(acc);
        e.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }));
        e.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
        await sleep(16 + Math.random() * 38);
      }
    } else {
      write(value);
      e.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    }
    e.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(60);
    if (read() !== value) {                       // controlled input fought back: use the editing command path
      e.focus();
      if (!isCE && e.select) e.select();
      try { document.execCommand('insertText', false, value); } catch (x) { /* ignore */ }
      e.dispatchEvent(new Event('change', { bubbles: true }));
    }
    try { e.blur(); } catch (x) { /* ignore */ }
    return true;
  }

  async function selectOption(e, value) {
    if (e.tagName !== 'SELECT') throw new Error('bu element select deyil');
    const v = String(value).trim().toLowerCase();
    const opts = Array.from(e.options);
    const opt = opts.find((o) => o.text.trim().toLowerCase() === v) || opts.find((o) => o.value.toLowerCase() === v) || opts.find((o) => o.text.toLowerCase().indexOf(v) >= 0);
    if (!opt) throw new Error('variant tapılmadı: ' + value);
    bringIntoView(e);
    await sleep(100);
    e.focus({ preventScroll: true });
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(e, opt.value);
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function html5Drag(src, dst) {
    const dt = new DataTransfer();
    const a = center(src), b = center(dst);
    const ev = (t, x, y) => new DragEvent(t, { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, dataTransfer: dt });
    src.dispatchEvent(ev('dragstart', a.x, a.y));
    await sleep(50);
    src.dispatchEvent(ev('drag', a.x, a.y));
    const hit = document.elementFromPoint(b.x, b.y);
    const tgt = hit && dst.contains(hit) ? hit : dst;      // listeners are often on an inner child; events still bubble to dst
    tgt.dispatchEvent(ev('dragenter', b.x, b.y));
    tgt.dispatchEvent(ev('dragover', b.x, b.y));
    await sleep(60);
    tgt.dispatchEvent(ev('dragover', b.x, b.y));
    tgt.dispatchEvent(ev('drop', b.x, b.y));
    src.dispatchEvent(ev('dragend', b.x, b.y));
  }

  async function pointerDrag(src, dst) {
    const a = center(src), b = center(dst);
    const under = (x, y) => document.elementFromPoint(x, y) || document.body;
    src.dispatchEvent(mkPointer('pointerdown', a.x, a.y, 1));
    src.dispatchEvent(mkMouse('mousedown', a.x, a.y, 1));
    await sleep(70);
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      const tgt = under(x, y);
      tgt.dispatchEvent(mkPointer('pointermove', x, y, 1));
      tgt.dispatchEvent(mkMouse('mousemove', x, y, 1));
      await sleep(14 + Math.random() * 14);
    }
    const end = under(b.x, b.y);
    end.dispatchEvent(mkPointer('pointerup', b.x, b.y, 0));
    end.dispatchEvent(mkMouse('mouseup', b.x, b.y, 0));
  }

  async function dragTo(src, dst) {
    if (src === dst) return 'same';
    if (dst.contains(src)) return 'already';
    bringIntoView(src);
    await sleep(90);
    const rd = dst.getBoundingClientRect();
    if (rd.bottom < 0 || rd.top > innerHeight) { bringIntoView(dst); await sleep(90); }
    const snap = () => { const r = src.getBoundingClientRect(); return { parent: src.parentElement, x: Math.round(r.left), y: Math.round(r.top), dl: dst.innerHTML.length }; };
    const before = snap();
    const bodyBefore = hash(document.body.innerHTML);
    const changed = () => {
      if (!src.isConnected || !dst.isConnected || dst.contains(src)) return true;
      const s = snap();
      return s.parent !== before.parent || Math.abs(s.x - before.x) > 3 || Math.abs(s.y - before.y) > 3 || s.dl !== before.dl;
    };
    const order = (src.draggable === true ? ['html5', 'pointer'] : ['pointer', 'html5']).concat(['click']);
    for (const m of order) {
      if (m === 'html5') await html5Drag(src, dst);
      else if (m === 'pointer') await pointerDrag(src, dst);
      else { await clickEl(src); await sleep(250); await clickEl(dst); }       // some UIs: click the piece, then the slot
      await sleep(380);
      if (changed()) return m;
    }
    return hash(document.body.innerHTML) !== bodyBefore ? 'unverified' : 'nochange';
  }

  function isChecked(ent) {
    const e = ent.el;
    return e.tagName === 'INPUT' ? e.checked : e.getAttribute('aria-checked') === 'true';
  }

  async function doAction(a, get) {
    if (a.op === 'type') {
      const ent = get(a.id);
      const changed = await typeInto(ent.el, a.value);
      return (changed ? 'yazıldı' : 'artıq düzdür') + ': ' + (ent.label || ent.kind) + ' ← ' + a.value;
    }
    if (a.op === 'select') {
      const ent = get(a.id);
      await selectOption(ent.el, a.value);
      return 'seçildi: ' + (ent.label || 'select') + ' ← ' + a.value;
    }
    if (a.op === 'click') {
      const ent = get(a.id);
      if ((ent.kind === 'radio' || ent.kind === 'checkbox') && isChecked(ent)) return 'artıq seçilib: ' + ent.label;
      await clickEl(ent.click || ent.el);
      return 'klik: ' + (ent.label || ent.kind);
    }
    if (a.op === 'drag') {
      const s = get(a.from), d = get(a.to);
      const how = await dragTo(s.el, d.el);
      if (how === 'nochange') throw new Error('sürüşdürmə təsir etmədi: ' + (s.label || s.kind));
      return (how === 'already' ? 'artıq yerindədir: ' : how === 'unverified' ? 'sürüşdürüldü (səhifə dəyişdi, yerləşməsi təsdiqlənmədi): ' : 'sürüşdürüldü (' + how + '): ') + (s.label || s.kind);
    }
    throw new Error('naməlum əməliyyat: ' + a.op);
  }

  function sanitize(actions, reg) {
    const out = [];
    if (!Array.isArray(actions)) return out;
    for (const a of actions) {
      if (!a || typeof a !== 'object') continue;
      const op = String(a.op || '').toLowerCase();
      if (op === 'drag' && reg.has(a.from) && reg.has(a.to)) out.push({ op, from: a.from, to: a.to });
      else if ((op === 'type' || op === 'select') && reg.has(a.id) && a.value !== undefined && a.value !== null) out.push({ op, id: a.id, value: String(a.value) });
      else if (op === 'click' && reg.has(a.id)) out.push({ op, id: a.id });
    }
    return out;
  }

  // The page may re-render while we work (React replaces nodes), so ids are re-resolved by a stable key.
  async function runActions(actions, task) {
    const keys = new Map();
    task.reg.forEach((v, id) => keys.set(id, v.key));
    let byKey = new Map();
    task.reg.forEach((v) => byKey.set(v.key, v));
    const get = (id) => {
      const key = keys.get(id);
      if (!key) throw new Error('naməlum id: ' + id);
      let ent = byKey.get(key);
      if (!ent || !ent.el.isConnected) {
        const t2 = collect();
        byKey = new Map();
        t2.reg.forEach((v) => byKey.set(v.key, v));
        ent = byKey.get(key);
      }
      if (!ent) throw new Error('element artıq səhifədə yoxdur (' + id + ')');
      return ent;
    };
    let ok = 0, fail = 0;
    for (const a of actions) {
      if (S.destroyed || S.abort) break;
      try { log('dim', await doAction(a, get)); ok++; } catch (e) { fail++; log('err', 'alınmadı: ' + e.message); }
      await sleep(jit(Math.max(0, cfg.delay) * 1000));
    }
    return { ok, fail };
  }

  const SUBMIT_RX = /^(yoxla|cavabı yoxla|yoxlayın|təsdiq( et)?|göndər|cavabla|check|check answer|submit|verify)$/i;
  const NEXT_RX = /(növbəti|novbeti|davam et|davam|next|continue|sonrakı|bitir|finish)/i;
  function findButton(rx) {
    const c = Array.from(document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]'));
    return c.find((b) => !b.disabled && b.getAttribute('aria-disabled') !== 'true' && shown(b) && rx.test((normTxt(b, 40) || b.value || '').trim()));
  }
  async function autoSubmit() {
    await sleep(jit(500 + cfg.delay * 300));
    let b = findButton(SUBMIT_RX);
    if (b) { log('info', 'Yoxla düyməsi basılır'); await clickEl(b); await sleep(1500); }
    b = findButton(NEXT_RX);
    if (b) { log('info', 'Növbəti düyməsi basılır'); await clickEl(b); }
  }

  // ───────────────────────── keyboard trainer (solved locally: zero API calls) ─────────────────────────
  const AZ_CODE = { 'ə': ['Quote', 222], 'ü': ['KeyW', 87], 'ö': ['BracketLeft', 219], 'ğ': ['BracketRight', 221], 'ı': ['Semicolon', 186], 'ç': ['Comma', 188], 'ş': ['Period', 190], '.': ['Slash', 191], '-': ['Minus', 189], '=': ['Equal', 187], ' ': ['Space', 32], '\n': ['Enter', 13] };
  function keyFor(ch) {
    const lower = ch.toLocaleLowerCase('az');
    const hit = AZ_CODE[lower];
    let code = '', kc = 0;
    if (hit) { code = hit[0]; kc = hit[1]; }
    else if (/^[a-z]$/.test(lower)) { code = 'Key' + lower.toUpperCase(); kc = lower.toUpperCase().charCodeAt(0); }
    else if (/^[0-9]$/.test(ch)) { code = 'Digit' + ch; kc = 48 + Number(ch); }
    else kc = ch.charCodeAt(0);
    return { key: ch === '\n' ? 'Enter' : ch, code: code, kc: kc, shift: ch !== lower, ch: ch.codePointAt(0) };
  }
  function fireKey(type, o, target) {
    const ev = new KeyboardEvent(type, { key: o.key, code: o.code, keyCode: o.kc, which: o.kc, charCode: type === 'keypress' ? o.ch : 0, shiftKey: !!o.shift, bubbles: true, cancelable: true, composed: true, view: window });
    try {
      Object.defineProperty(ev, 'keyCode', { get: () => o.kc });
      Object.defineProperty(ev, 'which', { get: () => o.kc });
      if (type === 'keypress') Object.defineProperty(ev, 'charCode', { get: () => o.ch });
    } catch (x) { /* ignore */ }
    return target.dispatchEvent(ev);
  }
  function keyTarget(strat) {
    if (strat === 1) return document;
    if (strat === 2) return window;
    const a = document.activeElement;
    return (!a || a === host || a === document.documentElement) ? document.body : a;
  }
  async function pressChar(ch, strat) {
    const o = keyFor(ch);
    const t = keyTarget(strat || 0);
    if (o.shift) fireKey('keydown', { key: 'Shift', code: 'ShiftLeft', kc: 16, shift: true, ch: 0 }, t);
    const d = fireKey('keydown', o, t);
    const p = fireKey('keypress', o, t);
    if (d && p && ch !== '\n') {
      if ((t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && !t.readOnly) {
        const proto = t.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(t, t.value + ch);
        t.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }));
      } else if (t.isContentEditable) {
        try { document.execCommand('insertText', false, ch); } catch (x) { /* ignore */ }
      }
    }
    fireKey('keyup', o, t);
    if (o.shift) fireKey('keyup', { key: 'Shift', code: 'ShiftLeft', kc: 16, shift: false, ch: 0 }, t);
  }

  const LEAF_BAD = /^(SCRIPT|STYLE|NOSCRIPT|SVG|svg|INPUT|TEXTAREA|SELECT|BUTTON|KBD|A|OPTION|IMG|CANVAS|IFRAME|BR)$/;
  function isLeaf1(e) {
    if (e.children.length || LEAF_BAD.test(e.tagName)) return false;
    const t = e.textContent;
    if (!t || t.length !== 1) return false;
    if (e.closest('button,[role="button"],kbd,a,nav,select')) return false;
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  function lcaOf(a, b) {
    const s = new Set();
    for (let p = a; p; p = p.parentElement) s.add(p);
    for (let p = b; p; p = p.parentElement) if (s.has(p)) return p;
    return document.body;
  }
  // Finds the text a typing trainer shows: a block of >= 10 one-character elements that reads like language
  // (repeated letters), and is not the on-screen keyboard (every key appears once).
  function detectTyping() {
    const cand = [];
    for (const e of document.body.querySelectorAll('*')) {
      if (!isLeaf1(e) || /^[\s\u00a0]$/.test(e.textContent)) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      cand.push({ el: e, ch: e.textContent, top: r.top, bottom: r.bottom });
    }
    if (cand.length < 10) return null;
    cand.sort((a, b) => a.top - b.top);
    const clusters = [];
    for (const c of cand) {
      const last = clusters[clusters.length - 1];
      if (last && c.top <= last.bottom + 45) { last.items.push(c); last.bottom = Math.max(last.bottom, c.bottom); } else clusters.push({ items: [c], bottom: c.bottom });
    }
    let best = null;
    for (const cl of clusters) {
      const n = cl.items.length;
      if (n < 10) continue;
      const chars = cl.items.map((x) => x.ch);
      const letters = chars.filter((c) => /\p{L}/u.test(c)).length;
      const distinct = new Set(chars.map((c) => c.toLowerCase())).size;
      if (letters / n < 0.55 || distinct / n > 0.8) continue;
      if (!best || n > best.items.length) best = cl;
    }
    if (!best) return null;
    const ordered = best.items.map((x) => x.el).sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const root = lcaOf(ordered[0], ordered[ordered.length - 1]);
    const leaves = Array.from(root.querySelectorAll('*')).filter(isLeaf1);
    if (leaves.length < 10) return null;
    const text = leaves.map((e) => e.textContent).join('');
    return { root: root, leaves: leaves, text: text, sig: hash(text) };
  }
  function styleSig(e) {
    const c = getComputedStyle(e);
    return [c.color, c.backgroundColor, c.fontWeight, c.textDecorationLine, c.borderTopWidth, c.borderTopColor, c.outlineWidth, c.boxShadow, c.opacity].join('|');
  }
  const CUR_RX = /(^|[-_\s])(cur|current|active|caret|cursor|next|focus|focused|now)($|[-_\s])/i;
  function currentIndex(leaves) {
    const cls = (e) => (typeof e.className === 'string' ? e.className : '');
    const hint = leaves.findIndex((e) => CUR_RX.test(cls(e)) || (e.parentElement && CUR_RX.test(cls(e.parentElement)) && e.parentElement.children.length === 1));
    if (hint >= 0) return hint;
    const sigs = leaves.map(styleSig);
    const last = sigs[sigs.length - 1];
    let u = sigs.length;
    while (u > 0 && sigs[u - 1] === last) u--;
    return u <= 1 ? 0 : u - 1;       // the char right before the "not yet typed" run is the current one
  }
  function gapBetween(a, b) {
    try { const r = document.createRange(); r.setStartAfter(a); r.setEndBefore(b); return r.toString(); } catch (e) { return ''; }
  }
  async function runTyping(tr) {
    const cps = clamp(Number(cfg.cps) || 9, 2, 40);
    let leaves = tr.leaves;
    let k = currentIndex(leaves);
    log('info', 'Klaviatura məşqi: ' + leaves.length + ' simvol, ' + cps + ' simvol/san (API işlənmir)');
    setStatus('act', 'Yazılır…');
    try {
      const inp = document.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]),textarea');
      if (inp) inp.focus({ preventScroll: true });
    } catch (x) { /* ignore */ }
    let strat = 0, blind = false, typed = 0, misses = 0;
    while (k < leaves.length && !S.abort && !S.destroyed) {
      const leaf = leaves[k];
      if (!leaf.isConnected) {                 // the page re-rendered the text: find it again
        const t2 = detectTyping();
        if (!t2) break;
        leaves = t2.leaves;
        k = currentIndex(leaves);
        if (k >= leaves.length) break;
        continue;
      }
      let ch = leaf.textContent;
      if (ch === '\u00a0') ch = ' ';
      if (/^[↵⏎↩¶]$/.test(ch)) ch = '\n';
      const next = leaves[k + 1];
      const before = styleSig(leaf), beforeNext = next ? styleSig(next) : '';
      const advanced = () => !leaf.isConnected || styleSig(leaf) !== before || (next && next.isConnected && styleSig(next) !== beforeNext);
      const waitMoved = async () => { for (let w = 0; w < 10; w++) { await sleep(40); if (advanced()) return true; } return false; };
      await pressChar(ch, strat);
      let moved = blind || await waitMoved();
      if (!moved && typed === 0) {              // first key: probe the other places a page may listen on
        for (const s2 of [1, 2]) { await pressChar(ch, s2); if (await waitMoved()) { strat = s2; moved = true; break; } }
      }
      if (!moved) {
        misses++;
        if (typed === 0 || misses >= 3) { blind = true; log('err', 'Səhifə düymə basışına cavab verməyə bilər; yoxlamadan davam edirəm.'); }
      }
      typed++;
      if (next && /^[ \u00a0]$/.test(gapBetween(leaf, next))) { await sleep(jit(1000 / cps)); await pressChar(' ', strat); }
      k++;
      await sleep(jit(1000 / cps) * (ch === ' ' ? 1.3 : 1) + (Math.random() < 0.05 ? 150 + Math.random() * 200 : 0));
    }
    log('ok', 'Yazıldı: ' + typed + ' simvol');
    return typed;
  }
  function describeTyping() {
    const tr = detectTyping();
    return tr ? { found: true, chars: tr.leaves.length, text: tr.text.slice(0, 160), currentIndex: currentIndex(tr.leaves) } : { found: false };
  }
  const hasFields = () => Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]),textarea,select,[contenteditable="true"]')).some(shown);

  // ───────────────────────── solve ─────────────────────────
  const answerCache = new Map();           // signature -> key-based actions (so the same question never costs a 2nd request)
  const toKeyActions = (acts, reg) => acts.map((a) => {
    const k = (id) => reg.get(id).key;
    return a.op === 'drag' ? { op: 'drag', from: k(a.from), to: k(a.to) } : { op: a.op, id: k(a.id), value: a.value };
  });
  function fromKeyActions(kacts, reg) {
    const byKey = new Map();
    reg.forEach((v) => byKey.set(v.key, v.id));
    const out = [];
    for (const a of kacts) {
      if (a.op === 'drag') { if (byKey.has(a.from) && byKey.has(a.to)) out.push({ op: 'drag', from: byKey.get(a.from), to: byKey.get(a.to) }); }
      else if (byKey.has(a.id)) out.push(Object.assign({}, a, { id: byKey.get(a.id) }));
    }
    return out.length === kacts.length ? out : null;
  }
  function gateWait() {
    const now = Date.now();
    while (callTimes.length && now - callTimes[0] > 60000) callTimes.shift();
    const cap = Math.max(1, Number(cfg.maxPerMin) || 6);
    return callTimes.length < cap ? 0 : callTimes[0] + 60000 - now;
  }
  const btnSolve = $('#btnSolve');
  function setStopBtn(on) { btnSolve.textContent = on ? 'Dayandır' : 'İndi həll et'; btnSolve.classList.toggle('stop', on); }
  const idleText = () => (S.auto ? 'Sual gözlənilir…' : 'Hazırdır');
  const toIdleLater = () => setTimeout(() => { if (!S.busy && !S.destroyed) setStatus('idle', idleText()); }, 2800);

  // returns: ok | partial | typing | none | nokey | limit | error | skip
  async function solve(manual, pre) {
    if (S.busy || S.destroyed) return 'skip';
    S.busy = true; S.abort = false; setStopBtn(true);
    try {
      setStatus('scan', 'Skan edilir…');
      await sleep(100);
      const tr = hasFields() ? null : detectTyping();
      if (tr) {
        const n = await runTyping(tr);
        if (n > 0) { S.solved++; updateStats(); }
        if (cfg.submit && !S.abort) await autoSubmit();
        setStatus('ok', S.abort ? 'Dayandırıldı' : 'Tamamlandı');
        toIdleLater();
        return 'typing';
      }
      if (!cfg.key) { flashKeyBox(); log('err', 'Bu sual üçün Gemini API açarı lazımdır.'); setStatus('idle', idleText()); return 'nokey'; }
      const task = pre || collect();
      if (!task.answerable) {
        log('dim', 'Ekranda cavablandırıla bilən sual tapılmadı.');
        setStatus('idle', idleText());
        return 'none';
      }
      let actions = null;
      const cached = manual ? null : answerCache.get(task.sig);
      if (cached) { actions = fromKeyActions(cached, task.reg); if (actions) { S.cacheHits++; log('info', 'Cavab keşdən götürüldü (API işlənmədi)'); } }
      if (!actions) {
        log('info', task.items.length + ' element oxundu, Gemini-yə göndərilir');
        setStatus('think', 'Gemini düşünür…');
        const t0 = performance.now();
        const res = await askGemini(task);
        const ms = Math.round(performance.now() - t0);
        actions = sanitize(res && res.actions, task.reg);
        log('ok', (res && res.kind ? res.kind : '?') + ' · ' + actions.length + ' əməliyyat · ' + ms + ' ms' + (res && res.reasoning ? ' · ' + String(res.reasoning).slice(0, 120) : ''));
        try { answerCache.set(task.sig, toKeyActions(actions, task.reg)); } catch (x) { /* ignore */ }
      }
      if (!actions.length) { setStatus('ok', 'Cavab lazım deyil'); toIdleLater(); return 'none'; }
      setStatus('act', 'Cavab yazılır…');
      ghost(true);
      const r = await runActions(actions, task);
      ghost(false);
      if (cfg.submit && r.ok && !S.abort) await autoSubmit();
      if (r.ok) { S.solved++; updateStats(); }
      setStatus(r.fail && !r.ok ? 'err' : 'ok', r.fail ? r.ok + ' uğurlu, ' + r.fail + ' alınmadı' : 'Tamamlandı');
      toIdleLater();
      return r.fail ? 'partial' : 'ok';
    } catch (e) {
      ghost(false);
      log('err', (e && e.message) || String(e));
      if (e && e.rateLimited) { setStatus('err', 'Limit: ' + (e.secs >= 1800 ? 'gündəlik kvota' : e.secs + ' san')); return 'limit'; }
      setStatus('err', 'Xəta');
      return 'error';
    } finally {
      S.busy = false; ghost(false); setStopBtn(false);
    }
  }

  // ───────────────────────── auto watcher ─────────────────────────
  let mo = null, pollT = null, debT = null, cooldown = 0, warnedNoKey = false, gateLogged = 0;
  const attempts = new Map();               // signature -> {n, last, ok}: a question is never solved twice in a loop
  function schedule(ms) { clearTimeout(debT); debT = setTimeout(tick, ms); }
  async function tick() {
    if (!S.auto || S.busy || S.destroyed || !S.unlocked) return;
    if (Date.now() < S.pauseUntil || Date.now() < cooldown) return;
    let key, task = null, tr = null;
    try {
      tr = hasFields() ? null : detectTyping();
      if (tr) key = 'typing:' + tr.sig;
      else { task = collect(); if (!task.answerable) return; key = task.sig; }
    } catch (e) { return; }
    const rec = attempts.get(key);
    if (rec && (rec.ok || rec.n >= 2 || Date.now() - rec.last < 12000)) return;
    if (!tr) {
      if (!cfg.key) {
        if (!warnedNoKey) { warnedNoKey = true; log('err', 'Gemini API açarı yoxdur: yalnız klaviatura məşqləri həll olunur.'); }
        return;
      }
      if (!(answerCache.has(key))) {
        const w = gateWait();
        if (w > 0) {
          schedule(Math.min(w + 300, 20000));
          if (Date.now() - gateLogged > 20000) { gateLogged = Date.now(); log('dim', 'Dəqiqəlik API limitinə çatdım, ' + Math.ceil(w / 1000) + ' san gözləyirəm.'); }
          return;
        }
      }
    }
    const st = await solve(false, task);
    cooldown = Date.now() + 2500;
    if (st === 'limit' || st === 'skip' || st === 'nokey') return;
    const r = attempts.get(key) || { n: 0, last: 0, ok: false };
    r.n++; r.last = Date.now(); r.ok = (st === 'ok' || st === 'typing' || st === 'none');
    attempts.set(key, r);
  }
  function startWatch() {
    if (mo) return;
    mo = new MutationObserver((ms) => { if (ms.every((m) => m.target === host)) return; schedule(900); });
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    pollT = setInterval(() => schedule(0), 3000);
  }
  function stopWatch() {
    if (mo) { mo.disconnect(); mo = null; }
    clearInterval(pollT); pollT = null;
    clearTimeout(debT);
  }
  function setAuto(on) {
    S.auto = on;
    setSwitch(el.swAuto, on);
    el.autoCard.classList.toggle('live', on);
    if (on) {
      log('ok', 'Auto answer aktivdir' + (cfg.key ? '' : ' (API açarı yoxdur: yalnız klaviatura məşqləri)'));
      setStatus('idle', 'Sual gözlənilir…');
      warnedNoKey = false;
      startWatch();
      schedule(300);
    } else {
      S.abort = true;
      stopWatch();
      log('dim', 'Auto answer dayandırıldı');
      setStatus('idle', 'Hazırdır');
    }
  }

  // ───────────────────────── diagnostics (copy(__frost_algo__.snapshot())) ─────────────────────────
  function snapshot() {
    const t = collect();
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script,style,svg,noscript,link,meta,iframe,canvas').forEach((n) => n.remove());
    clone.querySelectorAll('*').forEach((n) => {
      Array.from(n.attributes).forEach((a) => {
        if (!/^(class|id|draggable|role|type|name|placeholder|data-[\w-]+|aria-[\w-]+|for|contenteditable|tabindex|disabled|checked)$/.test(a.name)) n.removeAttribute(a.name);
        else if (a.value.length > 60) n.setAttribute(a.name, a.value.slice(0, 60));
      });
    });
    let html = clone.innerHTML.replace(/\s+/g, ' ');
    if (html.length > 14000) html = html.slice(0, 14000) + ' …[kəsildi]';
    return JSON.stringify({ v: 1, page: location.host + location.pathname, found: t.items.map((i) => i.kind + ':' + i.label).slice(0, 80), typing: describeTyping(), text: t.text.slice(0, 2500), html: html }, null, 1);
  }

  // ───────────────────────── settings wiring ─────────────────────────
  const updateDelayTxt = () => { el.delayTxt.textContent = Number(cfg.delay).toFixed(1) + ' san'; };
  const updateLimitTxt = () => { el.limitTxt.textContent = cfg.maxPerMin + ' sorğu/dəq'; };
  const updateCpsTxt = () => { el.cpsTxt.textContent = cfg.cps + ' simvol/san'; };
  el.apiKey.value = cfg.key || '';
  el.model.value = cfg.model || DEFAULT_MODEL;
  el.delay.value = String(cfg.delay);
  el.limit.value = String(cfg.maxPerMin);
  el.cps.value = String(cfg.cps);
  el.remember.checked = !!cfg.remember;
  setSwitch(el.swSubmit, !!cfg.submit);
  updateDelayTxt(); updateLimitTxt(); updateCpsTxt(); updateStats();

  el.apiKey.addEventListener('input', () => { cfg.key = el.apiKey.value.trim(); saveCfg(); S.pauseUntil = 0; });
  el.model.addEventListener('input', () => { cfg.model = el.model.value.trim() || DEFAULT_MODEL; saveCfg(); });
  el.delay.addEventListener('input', () => { cfg.delay = parseFloat(el.delay.value) || 0; updateDelayTxt(); saveCfg(); });
  el.limit.addEventListener('input', () => { cfg.maxPerMin = parseInt(el.limit.value, 10) || 6; updateLimitTxt(); saveCfg(); });
  el.cps.addEventListener('input', () => { cfg.cps = parseInt(el.cps.value, 10) || 9; updateCpsTxt(); saveCfg(); });
  el.remember.addEventListener('change', () => { cfg.remember = el.remember.checked; saveCfg(); });
  el.swSubmit.addEventListener('click', () => { cfg.submit = !cfg.submit; setSwitch(el.swSubmit, cfg.submit); saveCfg(); log('dim', 'Auto-submit ' + (cfg.submit ? 'aktiv' : 'söndürüldü')); });
  el.swAuto.addEventListener('click', () => setAuto(!S.auto));
  btnSolve.addEventListener('click', () => { if (S.busy) { S.abort = true; log('dim', 'Dayandırılır…'); } else solve(true); });
  $('#eye').addEventListener('click', () => { el.apiKey.type = el.apiKey.type === 'password' ? 'text' : 'password'; });

  // ───────────────────────── lifecycle ─────────────────────────
  function destroy() {
    if (S.destroyed) return;
    S.destroyed = true;
    S.auto = false;
    stopWatch();
    stopWhy();
    window.removeEventListener('keydown', onHotkey, true);
    window.removeEventListener('resize', onResize);
    try { host.remove(); } catch (e) { /* ignore */ }
    try { delete window[NS]; } catch (e) { window[NS] = undefined; }
  }

  window[NS] = { version: '1.1.0', destroy: destroy, solve: function () { return solve(true); }, collect: collect, snapshot: snapshot, typing: describeTyping, cfg: cfg, S: S };

  (async function boot() {
    await playHello();
    if (S.destroyed) return;
    showKeyCard();
  })();
})();
