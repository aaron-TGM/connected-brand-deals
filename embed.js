/* Connected deals calendar - embed.js
   Put these two lines on any page (Shopify: Custom Liquid section):
     <div id="cc-deals"></div>
     <script src="https://aaron-tgm.github.io/connected-brand-deals/embed.js" defer></script>
   Loads deals-YYYY-MM.json (California) or deals-az-YYYY-MM.json (Arizona) for the current month from the
   same folder, falling back to deals.json / deals-az.json. ?state=az picks Arizona; so does an Arizona time zone.
   Optional attributes on the <div>:
     data-src="https://.../deals-2026-12.json"   load a specific data file
     data-shop="stiiizy-dtla-1a2b"              preselect a shop (also works as ?shop=... in the page URL)
   Built from data/promos.json + the sales tracker export by tools/build.py.
*/
(function () {
  'use strict';
  var script = document.currentScript;
  var HID = 'cc-deals'; // page element id; also scopes the CSS
  var host = document.getElementById(HID);
  if (!host) { host = document.createElement('section'); host.id = HID; (script ? script.parentNode : document.body).insertBefore(host, script || null); }
  host.setAttribute('aria-label', 'Deals calendar');
  var base = script && script.src ? script.src : location.href;
  var fixedSrc = host.getAttribute('data-src');

  /* ---------- styles (scoped to #cc-deals) ---------- */
  var CSS = '\
#cc-deals{--fh:"Jost",sans-serif;--fb:"Figtree","Helvetica Neue",Arial,sans-serif;--on-acc:#fff;--hero:#0C2A38;--bg:#151515;--bg-2:#1E1E1E;--bg-3:#262626;--line:#2E2E2E;--line-2:#444;--tx:#FFFFFF;--tx-2:#C9C9C9;--tx-3:#8E8E8E;--acc:#1A98CE;--acc-2:#5FC0EA;--ink:#0E0E0E;--c:var(--acc);background:var(--bg);color:var(--tx);font-family:var(--fb);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;padding:36px 20px 56px;box-sizing:border-box;text-align:left}\
#cc-deals *,#cc-deals *::before,#cc-deals *::after{box-sizing:border-box}\
#cc-deals button,#cc-deals input{font:inherit;color:inherit;margin:0;letter-spacing:normal;text-transform:none;box-shadow:none;border-radius:0}\
#cc-deals button{cursor:pointer;background:none;border:0;padding:0;line-height:inherit;height:auto;min-height:0;max-height:none;vertical-align:baseline;white-space:normal;text-align:left;font-weight:inherit;text-decoration:none;align-items:normal;justify-content:normal;flex-wrap:nowrap;min-width:0;max-width:none;opacity:1;transform:none;float:none}\
#cc-deals input{height:auto;min-height:0;line-height:normal;box-sizing:border-box}\
#cc-deals a{color:inherit}#cc-deals :focus-visible{outline:2px solid var(--acc-2);outline-offset:2px}\
#cc-deals h2,#cc-deals h3,#cc-deals h4,#cc-deals p{margin:0;padding:0;color:inherit;letter-spacing:normal;text-transform:none;font-weight:inherit}\
#cc-deals .in{max-width:1180px;margin:0 auto}\
#cc-deals .hd{display:flex;align-items:flex-end;justify-content:space-between;gap:16px 24px;flex-wrap:wrap;margin-bottom:22px}\
#cc-deals .logo{display:block;width:150px;height:auto;margin:0 0 10px -4px}\
#cc-deals .kicker{font-family:var(--fh);font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--acc-2);font-weight:600}\
#cc-deals h2.ttl{font-family:var(--fh);font-weight:700;font-size:44px;line-height:1.02;margin:6px 0 10px;letter-spacing:.04em;text-transform:uppercase}\
#cc-deals h2.ttl span{color:var(--acc)}\
#cc-deals .lede{color:var(--tx-2);max-width:58ch}\
#cc-deals .navs{display:grid;gap:8px;justify-items:end}\
#cc-deals .mnav{display:flex;gap:6px;flex-wrap:wrap}\
#cc-deals .snav button[aria-pressed="true"]{background:var(--acc);border-color:var(--acc);color:var(--on-acc)}\
#cc-deals .mnav button{border:1.5px solid var(--line-2);padding:9px 16px;font-family:var(--fh);font-weight:600;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--tx-2);transition:all .15s}\
#cc-deals .mnav button:hover{border-color:var(--tx);color:var(--tx)}\
#cc-deals .mnav button[aria-pressed="true"]{background:var(--tx);border-color:var(--tx);color:var(--ink)}\
/* feature banner */\
#cc-deals .evt{display:grid;grid-template-columns:1fr auto;gap:18px 28px;align-items:center;width:100%;margin:0 0 18px;padding:26px 28px;text-align:left;color:#fff;background:radial-gradient(700px 260px at 0% 0%,color-mix(in srgb,var(--c) 45%,transparent),transparent 70%),linear-gradient(135deg,var(--hero),#0b0b0b 70%);border:2px solid var(--c);box-shadow:0 14px 40px color-mix(in srgb,var(--c) 22%,transparent)}\
#cc-deals .evt-ey{font-family:var(--fh);font-size:12px;letter-spacing:.22em;text-transform:uppercase;font-weight:600;color:var(--acc-2)}\
#cc-deals .evt-h{font-family:var(--fh);font-weight:800;font-size:52px;line-height:.95;letter-spacing:.01em;text-transform:uppercase;margin:10px 0 8px}\
#cc-deals .evt-h em{font-style:normal;color:var(--c)}\
#cc-deals .evt-s{font-size:16px;font-weight:500;color:rgba(255,255,255,.88)}\
#cc-deals .evt-r{text-align:right;min-width:200px}\
#cc-deals .evt-st{font-family:var(--fh);font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;color:rgba(255,255,255,.7)}\
#cc-deals .evt-cd{font-family:var(--fh);font-weight:700;font-size:30px;line-height:1.05;color:#fff;margin:6px 0 14px}\
#cc-deals .evt-go{display:inline-block;background:var(--c);color:var(--on-acc);font-family:var(--fh);font-weight:600;font-size:13px;letter-spacing:.12em;text-transform:uppercase;padding:12px 16px}\
#cc-deals .evt:hover .evt-go{background:#fff;color:var(--ink)}\
#cc-deals .evt.live .evt-st::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:#3DDC84;margin-right:8px;vertical-align:1px;animation:ccPulse 1.3s ease-in-out infinite}\
@keyframes ccPulse{0%,100%{box-shadow:0 0 0 0 rgba(61,220,132,.7)}50%{box-shadow:0 0 0 7px rgba(61,220,132,0)}}\
/* shop finder */\
#cc-deals .row2{display:grid;grid-template-columns:1.1fr 1fr;gap:14px;margin-bottom:22px}\
#cc-deals .card{background:var(--bg-2);border:1px solid var(--line);padding:20px 22px}\
#cc-deals .card h3{font-family:var(--fh);font-weight:700;font-size:15px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:4px}\
#cc-deals .card .sub{font-size:13px;color:var(--tx-3);margin-bottom:12px}\
#cc-deals .find{position:relative}\
#cc-deals .fbar{display:flex;gap:6px}\
#cc-deals .fbar input{flex:1;min-width:0;background:var(--bg);border:1.5px solid var(--line-2);padding:11px 12px;font-size:15px;color:var(--tx);outline:none}\
#cc-deals .fbar input::placeholder{color:var(--tx-3)}\
#cc-deals .fbar input:focus{border-color:var(--acc)}\
#cc-deals .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:var(--acc);color:var(--on-acc);font-family:var(--fh);font-weight:600;font-size:13px;letter-spacing:.1em;text-transform:uppercase;padding:11px 14px;text-decoration:none;white-space:nowrap;transition:background .15s,color .15s}\
#cc-deals .btn:hover{background:#fff;color:var(--ink)}\
#cc-deals .btn.ghost{background:transparent;border:1.5px solid var(--line-2);color:var(--tx)}\
#cc-deals .btn.ghost:hover{border-color:#fff;background:transparent;color:#fff}\
#cc-deals .btn svg{width:13px;height:13px;flex:none}\
#cc-deals .res{margin-top:8px;display:grid;gap:4px;max-height:340px;overflow:auto}\
#cc-deals .res:empty{display:none}\
#cc-deals .res button{display:grid;grid-template-columns:1fr auto;gap:2px 10px;text-align:left;background:var(--bg);border:1px solid var(--line);padding:9px 12px;width:100%}\
#cc-deals .res button:hover{border-color:var(--acc)}\
#cc-deals .res b{font-weight:700;font-size:14px}\
#cc-deals .res small{grid-column:1;color:var(--tx-3);font-size:12.5px}\
#cc-deals .res i{grid-row:1/span 2;grid-column:2;align-self:center;font-style:normal;font-size:12px;color:var(--acc-2);font-weight:700}\
#cc-deals .res .none{font-size:13px;color:var(--tx-3);padding:6px 2px}\
#cc-deals .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;align-items:center;font-size:12.5px;color:var(--tx-3)}\
#cc-deals .chips button{border:1px solid var(--line-2);padding:6px 10px;font-size:12.5px;font-weight:600;color:var(--tx-2)}\
#cc-deals .chips button:hover{border-color:var(--acc);color:#fff}\
#cc-deals .picked{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;background:var(--bg);border:1.5px solid var(--acc);padding:14px 16px}\
#cc-deals .picked .l{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--acc-2);font-weight:700}\
#cc-deals .picked b{display:block;font-family:var(--fh);font-size:20px;font-weight:700;line-height:1.15;margin-top:2px}\
#cc-deals .picked small{display:block;color:var(--tx-3);font-size:13px;margin-top:2px}\
#cc-deals .picked .acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}\
#cc-deals .chg{font-size:13px;color:var(--acc-2);text-decoration:underline;text-underline-offset:3px;font-weight:600;margin-top:8px}\
/* weekly card */\
#cc-deals .wk{display:grid;gap:8px}\
#cc-deals .wi{display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center;background:var(--bg);border:1px solid var(--line);padding:10px 12px}\
#cc-deals .wi .pct{font-family:var(--fh);font-weight:800;font-size:24px;line-height:1;color:var(--acc);text-align:center}\
#cc-deals .wi b{display:block;font-weight:700;font-size:14.5px;line-height:1.25}\
#cc-deals .wi small{display:block;color:var(--tx-3);font-size:12.5px;margin-top:2px}\
#cc-deals .wk .note{font-size:12.5px;color:var(--tx-3)}\
/* calendar */\
#cc-deals .tools{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}\
#cc-deals .tools h3{font-family:var(--fh);font-weight:700;font-size:15px;letter-spacing:.16em;text-transform:uppercase}\
#cc-deals .legend{display:flex;gap:8px 16px;flex-wrap:wrap;font-size:12px;color:var(--tx-2);font-weight:600}\
#cc-deals .legend i{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px;background:var(--c)}\
#cc-deals .legend i.w{background:var(--line-2)}\
#cc-deals .earlier{display:none;width:100%;align-items:center;justify-content:space-between;gap:10px;border:1px dashed var(--line-2);background:var(--bg-2);padding:10px 14px;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--tx-2);text-align:left}\
#cc-deals .earlier.on{display:flex}\
#cc-deals .earlier span{color:var(--acc-2)}\
#cc-deals .dows{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px}\
#cc-deals .dows div{font-family:var(--fh);font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--tx-3);font-weight:600;padding:0 4px}\
#cc-deals .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}\
#cc-deals .day{position:relative;text-align:left;background:var(--bg-2);border:1px solid var(--line);min-height:128px;padding:12px 11px 10px;display:flex;flex-direction:column;gap:5px;transition:transform .15s,border-color .15s,box-shadow .15s;overflow:hidden;width:100%}\
#cc-deals .day::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:var(--line-2)}\
#cc-deals .day.hot{background:linear-gradient(165deg,color-mix(in srgb,var(--c) 26%,var(--bg-2)),var(--bg-2) 70%);border-color:color-mix(in srgb,var(--c) 60%,var(--line))}\
#cc-deals .day.hot::before{background:var(--c)}\
#cc-deals .day.blank{background:transparent;border-style:dashed;cursor:default}\
#cc-deals .day.blank::before,#cc-deals .day.quiet::before{display:none}\
#cc-deals .day.quiet{cursor:default}\
#cc-deals .day.past{opacity:.38}\
#cc-deals .day.hidden{display:none}\
#cc-deals .day:not(.blank):not(.quiet):hover{transform:translateY(-2px);border-color:var(--tx-3);box-shadow:0 10px 26px rgba(0,0,0,.45)}\
#cc-deals .day.is-today{border-color:#fff;box-shadow:0 0 0 1px #fff}\
#cc-deals .day .n{display:flex;justify-content:space-between;align-items:baseline}\
#cc-deals .day .n b{font-family:var(--fh);font-weight:700;font-size:21px;line-height:1}\
#cc-deals .day .n span{font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--tx-3)}\
#cc-deals .day .n span.tdy{background:#fff;color:var(--ink);padding:3px 6px}\
#cc-deals .day .h{font-family:var(--fh);font-weight:700;font-size:15px;line-height:1.15;text-transform:uppercase;letter-spacing:.02em}\
#cc-deals .day .h em{font-style:normal;color:var(--c)}\
#cc-deals .day.hot .h em{font-size:22px;display:block;line-height:1}\
#cc-deals .day .h.w{color:var(--tx-2);font-size:13px}\
#cc-deals .day .m{font-size:12px;color:var(--tx-2);line-height:1.35}\
#cc-deals .day .more{margin-top:auto;font-size:11.5px;color:var(--acc-2);font-weight:700}\
/* modal */\
#cc-deals .ov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:2147483000;display:none}\
#cc-deals .ov.on{display:block}\
#cc-deals .md{position:fixed;z-index:2147483001;top:50%;left:50%;transform:translate(-50%,-50%);width:min(700px,calc(100% - 24px));max-height:min(90vh,940px);overflow:auto;background:var(--bg);border:1px solid var(--line-2);box-shadow:0 20px 60px rgba(0,0,0,.6);display:none;color:var(--tx);overscroll-behavior:contain}\
#cc-deals .md.on{display:block}\
#cc-deals .md .band{position:sticky;top:0;background:#000;border-bottom:4px solid var(--c);padding:18px 22px 16px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;z-index:2}\
#cc-deals .md .band .k{font-family:var(--fh);font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;color:var(--acc-2)}\
#cc-deals .md .band .d{font-family:var(--fh);font-weight:700;font-size:28px;line-height:1.1;margin:6px 0 4px;text-transform:uppercase;letter-spacing:.04em}\
#cc-deals .md .band .s{font-weight:500;font-size:13.5px;color:var(--tx-2)}\
#cc-deals .md .band .cl{background:rgba(255,255,255,.12);width:36px;height:36px;display:grid;place-items:center;font-size:20px;line-height:1;font-weight:600;color:#fff}\
#cc-deals .md .band .cl:hover{background:rgba(255,255,255,.25)}\
#cc-deals .md .nav{display:flex;justify-content:space-between;padding:12px 22px 0}\
#cc-deals .md .nav button{font-size:13px;color:var(--tx-2);font-weight:600}\
#cc-deals .md .nav button:hover{color:#fff}\
#cc-deals .md .bd{padding:12px 22px 26px;display:grid;gap:22px}\
#cc-deals .sec .st{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px;flex-wrap:wrap}\
#cc-deals .sec .st h4{font-family:var(--fh);font-weight:700;font-size:15px;letter-spacing:.16em;text-transform:uppercase;line-height:1.2}\
#cc-deals .sec .st small{font-size:12.5px;color:var(--tx-3);font-weight:600}\
#cc-deals .deals{display:grid;gap:6px}\
#cc-deals .deal{display:grid;grid-template-columns:70px 1fr;gap:12px;align-items:center;background:var(--bg-2);border:1px solid var(--line);padding:12px 14px}\
#cc-deals .deal.top{border-color:var(--c);background:linear-gradient(90deg,color-mix(in srgb,var(--c) 22%,var(--bg-2)),var(--bg-2))}\
#cc-deals .deal .pct{font-family:var(--fh);font-weight:800;font-size:28px;line-height:1;color:var(--c);text-align:center}\
#cc-deals .deal .pct.sm{font-size:20px;letter-spacing:-.02em}\
#cc-deals .row2.one{grid-template-columns:1fr}\
#cc-deals .deal b{display:block;font-weight:700;font-size:15px;line-height:1.25}\
#cc-deals .deal small{display:block;color:var(--tx-3);font-size:12.5px;margin-top:3px}\
#cc-deals .sbar{display:flex;gap:6px;margin-bottom:8px}\
#cc-deals .sbar input{flex:1;min-width:0;background:var(--bg-2);border:1.5px solid var(--line-2);padding:9px 11px;font-size:14px;color:var(--tx);outline:none}\
#cc-deals .sbar input:focus{border-color:var(--acc)}\
#cc-deals .sbar .btn{padding:9px 12px;font-size:12px}\
#cc-deals .shops{display:grid;gap:5px}\
#cc-deals .shop{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;background:var(--bg-2);border:1px solid var(--line);padding:10px 12px}\
#cc-deals .shop b{display:block;font-weight:700;font-size:14.5px;line-height:1.2}\
#cc-deals .shop small{display:block;color:var(--tx-3);font-size:12.5px;margin-top:2px}\
#cc-deals .shop .tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}\
#cc-deals .shop .tags span{font-size:11px;font-weight:700;letter-spacing:.04em;border:1px solid var(--line-2);color:var(--tx-2);padding:2px 6px}\
#cc-deals .shop .tags span.hot{border-color:var(--c);color:#fff;background:color-mix(in srgb,var(--c) 30%,transparent)}\
#cc-deals .shop .acts{display:flex;gap:5px}\
#cc-deals .shop .acts a,#cc-deals .shop .acts button{font-size:11.5px;padding:8px 10px}\
#cc-deals .shop.me{border-color:var(--acc)}\
#cc-deals .moreb{width:100%;text-align:center;border:1px dashed var(--line-2);padding:10px;font-size:13px;font-weight:600;color:var(--acc-2)}\
#cc-deals .moreb:hover{border-color:var(--acc-2)}\
#cc-deals .md .fine,#cc-deals .foot{font-size:11.5px;color:var(--tx-3);line-height:1.5}\
#cc-deals .foot{margin-top:22px;display:flex;justify-content:space-between;gap:12px 24px;flex-wrap:wrap;align-items:center}\
#cc-deals .foot a{color:var(--acc-2);font-weight:600}\
#cc-deals .err{padding:24px;color:var(--tx-2);text-align:center}\
#cc-deals .err a{color:var(--acc-2)}\
@media (max-width:900px){#cc-deals .row2{grid-template-columns:1fr}#cc-deals h2.ttl{font-size:34px}#cc-deals .evt-h{font-size:40px}}\
@media (max-width:640px){#cc-deals .navs{justify-items:start}#cc-deals{padding:22px 12px 44px}#cc-deals .logo{width:120px}#cc-deals .evt{grid-template-columns:1fr;padding:20px 18px 22px}#cc-deals .evt-h{font-size:34px}#cc-deals .evt-r{text-align:left;min-width:0}#cc-deals .evt-cd{font-size:24px}#cc-deals .card{padding:16px}#cc-deals .dows{display:none}#cc-deals .grid{grid-template-columns:1fr 1fr}#cc-deals .day.blank,#cc-deals .day.past,#cc-deals .day.quiet{display:none}#cc-deals .day.past.show{display:flex}#cc-deals .day{min-height:112px}#cc-deals .legend{display:none}#cc-deals .picked{grid-template-columns:1fr}#cc-deals .picked .acts{justify-content:flex-start}#cc-deals .shop{grid-template-columns:1fr}#cc-deals .md{top:auto;bottom:0;left:0;transform:none;width:100%;max-height:92vh}#cc-deals .md .band .d{font-size:22px}}\
@media (prefers-reduced-motion:reduce){#cc-deals *{transition:none !important;animation:none !important}}';

  if (!document.getElementById(HID + '-css')) {
    var st = document.createElement('style'); st.id = HID + '-css'; st.textContent = CSS.replace(/#cc-deals/g, '#' + HID); document.head.appendChild(st);
  }
  var fontsLoaded = {};
  var loadFonts = function (u) { if (!u || fontsLoaded[u]) return; fontsLoaded[u] = 1; var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = u; document.head.appendChild(f); };

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var FALLBACK = host.getAttribute('data-fallback') || 'https://connectedcannabisco.com/pages/find-products';
  var BN = 'our';
  var TZ = 'America/Los_Angeles';
  var partsNow = function (tz) {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
      var g = function (t) { for (var i = 0; i < p.length; i++) if (p[i].type === t) return +p[i].value; };
      return { y: g('year'), m: g('month'), d: g('day') };
    } catch (e) { var d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; }
  };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var now0 = partsNow(TZ);
  var load = function (u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  var STATE = 'ca';
  try {
    var qs = (new URLSearchParams(location.search).get('state') || host.getAttribute('data-state') || localStorage.getItem(HID + '_state') || '').toLowerCase();
    if (qs === 'az' || qs === 'ca') STATE = qs;
    else if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/Phoenix') STATE = 'az';
  } catch (e) {}
  var pre = function (st) { return st === 'ca' ? 'deals' : 'deals-' + st; };
  var fileFor = function (ym, st) { return new URL(pre(st || STATE) + '-' + ym + '.json', base).href; };
  var cache = {};
  var getMonth = function (ym, st) { st = st || STATE; var k = st + ym; if (!cache[k]) cache[k] = load(fileFor(ym, st)); return cache[k]; };
  var openState = function (st, ym) {
    return getMonth(ym, st).catch(function () { return load(new URL(pre(st) + '.json', base).href); });
  };

  var first = fixedSrc ? load(fixedSrc) : openState(STATE, now0.y + '-' + pad(now0.m));
  first.then(function (D) { cache[(D.state || 'ca') + D.month] = Promise.resolve(D); init(D); })
    .catch(function (e) { host.innerHTML = '<div class="in"><div class="err">Deals are taking a moment to load. <a href="' + FALLBACK + '">Find a shop near you</a> or refresh the page.</div></div>'; console.error('cc-deals', e); });

  /* ---------- state shared across months ---------- */
  var shopId = null, shopName = '', userPos = null, showPast = false, shopMem = {};
  var skey = function (st) { return HID + '_shop' + (st === 'ca' ? '' : '_' + st); };
  var recallShop = function (st) {
    if (shopMem[st]) { shopId = shopMem[st].id; shopName = shopMem[st].n; return; }
    shopId = null; shopName = '';
    try { shopId = localStorage.getItem(skey(st)); shopName = localStorage.getItem(skey(st) + '_name') || ''; } catch (e) {}
  };
  recallShop(STATE);
  try { var qshop = new URLSearchParams(location.search).get('shop') || host.getAttribute('data-shop'); if (qshop) { shopId = qshop; shopName = ''; } } catch (e) {}
  var arrow = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4"/></svg>';
  var pin = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 11s3.5-3.4 3.5-6A3.5 3.5 0 0 0 2.5 5c0 2.6 3.5 6 3.5 6z"/><circle cx="6" cy="5" r="1.2"/></svg>';
  var DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function init(D) {
    STATE = D.state || 'ca';
    var STN = D.stateName || 'California', STATES = D.states || [];
    TZ = (D.brand && D.brand.timeZone) || TZ;
    FALLBACK = (D.brand && D.brand.findProducts) || FALLBACK;
    BN = (D.brand && D.brand.name) || BN;
    host.setAttribute('aria-label', BN + ' deals calendar');
    var TH = (D.brand && D.brand.theme) || {};
    Object.keys(TH).forEach(function (k) { host.style.setProperty('--' + k, TH[k]); });
    loadFonts((D.brand && D.brand.fonts) || 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Jost:wght@500;600;700;800&display=swap');
    var now = partsNow(TZ);
    var Y = +D.month.split('-')[0], M = +D.month.split('-')[1];
    var daysIn = new Date(Y, M, 0).getDate(), firstDow = new Date(Y, M - 1, 1).getDay();
    var MONTH = new Date(Y, M - 1, 1).toLocaleString('en-US', { month: 'long' }), MON = MONTH.slice(0, 3);
    var todayNum = (now.y === Y && now.m === M) ? now.d : null;
    var isPastMonth = now.y > Y || (now.y === Y && now.m > M);
    var dow = function (day) { return (firstDow + day - 1) % 7; };
    var SHOPS = D.shops || [], DATED = D.dated || [], WEEKLY = D.weekly || [];
    var byId = {}; SHOPS.forEach(function (s) { byId[s.id] = s; });
    var shop = function () { return shopId && byId[shopId] ? byId[shopId] : null; };
    if (shop()) shopName = shop().n;
    var has = function (s, id) { return s.p.indexOf(id) !== -1; };
    var promo = function (id) { for (var i = 0; i < DATED.length; i++) if (DATED[i].id === id) return DATED[i]; for (var j = 0; j < WEEKLY.length; j++) if (WEEKLY[j].id === id) return WEEKLY[j]; return null; };
    var count = function (id) { return SHOPS.filter(function (s) { return has(s, id); }).length; };
    var datedOn = function (day) { var S = shop(); return DATED.filter(function (p) { return day >= p.from && day <= p.to && (!S || has(S, p.id)); }); };
    var weeklyFor = function () { var S = shop(); return WEEKLY.filter(function (w) { return !S || has(S, w.id); }); };
    var range = function (p) { return p.from === p.to ? M + '/' + p.from : M + '/' + p.from + '\u2013' + M + '/' + p.to; };
    var linkOf = function (s) { return s.u || FALLBACK; };
    var mapsOf = function (s) { return s.a ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.n + ', ' + s.a) : null; };
    var where = function (s) { return s.a ? s.a : (s.dl ? 'Delivery' + (s.c ? ' \u00b7 ' + s.c : '') : (s.c || STN)); };
    var km = function (s) {
      if (!userPos || s.lat == null) return null;
      var r = Math.PI / 180, a = Math.sin((s.lat - userPos.lat) * r / 2), b = Math.sin((s.lng - userPos.lng) * r / 2);
      var h = a * a + Math.cos(userPos.lat * r) * Math.cos(s.lat * r) * b * b; return 3958.8 * 2 * Math.asin(Math.sqrt(h)); // miles
    };
    var miles = function (s) { var d = km(s); return d == null ? '' : (d < 10 ? d.toFixed(1) : Math.round(d)) + ' mi'; };
    var sortShops = function (list) {
      return list.slice().sort(function (a, b) {
        if (userPos) { var da = km(a), db = km(b); if (da == null && db != null) return 1; if (db == null && da != null) return -1; if (da != null && db != null && da !== db) return da - db; }
        return a.n.localeCompare(b.n);
      });
    };
    var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); };
    var match = function (s, q) { if (!q) return true; var hay = norm(s.n + ' ' + (s.c || '') + ' ' + (s.a || '') + (s.dl ? ' delivery' : '')); return norm(q).split(' ').every(function (w) { return hay.indexOf(w) !== -1; }); };
    var locate = function (btn, done) {
      if (!navigator.geolocation) { btn.textContent = 'Location unavailable'; return; }
      var old = btn.innerHTML; btn.textContent = 'Finding you\u2026';
      navigator.geolocation.getCurrentPosition(function (p) { userPos = { lat: p.coords.latitude, lng: p.coords.longitude }; btn.innerHTML = old; done(); },
        function () { btn.innerHTML = old; btn.blur(); alert('We couldn\u2019t get your location. Search by shop name or city instead.'); }, { timeout: 10000, maximumAge: 600000 });
    };

    /* ---------- shell ---------- */
    var months = D.months || [D.month];
    host.innerHTML =
      '<div class="in"><header class="hd"><div>' + (D.brand && D.brand.logo ? '<img class="logo" src="' + esc(new URL(D.brand.logo, base).href) + '" alt="' + esc(D.brand.name || '') + '">' : '') +
      '<div class="kicker">' + esc((D.brand && D.brand.kicker) || '') + '</div><h2 class="ttl">' + esc(D.title || MONTH) + ' <span>Deals</span></h2><p class="lede">' + esc(D.lede || '') + '</p></div>' +
      '<div class="navs">' + (STATES.length > 1 ? '<div class="mnav snav" role="group" aria-label="Choose state">' + STATES.map(function (x) { return '<button type="button" data-st="' + esc(x.id) + '" aria-pressed="' + (x.id === STATE) + '">' + esc(x.name) + '</button>'; }).join('') + '</div>' : '') +
      (months.length > 1 ? '<div class="mnav" role="group" aria-label="Choose month">' + months.map(function (m) { var d = new Date(+m.slice(0, 4), +m.slice(5) - 1, 1); return '<button type="button" data-m="' + m + '" aria-pressed="' + (m === D.month) + '">' + d.toLocaleString('en-US', { month: 'long' }) + '</button>'; }).join('') + '</div>' : '') + '</div>' +
      '</header><div id="ccEvent"></div>' +
      '<div class="row2"><div class="card find" id="ccFind"></div><div class="card" id="ccWeekly"></div></div>' +
      '<div class="tools"><h3>' + esc(MONTH) + ' calendar</h3><div class="legend">' + DATED.map(function (p) { return '<span><i style="--c:' + esc(p.color || 'var(--acc)') + '"></i>' + esc(p.short || p.name) + ' ' + range(p) + '</span>'; }).join('') + (WEEKLY.length ? '<span><i class="w"></i>Weekly deals</span>' : '') + '</div></div>' +
      '<button type="button" class="earlier" id="ccEarlier"></button><div class="dows">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) { return '<div>' + d + '</div>'; }).join('') + '</div><div class="grid" id="ccGrid"></div>' +
      '<div class="foot"><span>' + esc(D.finePrint || '') + '</span><a href="' + esc(FALLBACK) + '" target="_blank" rel="noopener">Don\u2019t see your shop? Find ' + esc(BN) + ' near you &rarr;</a></div></div>' +
      '<div class="ov" id="ccOv"></div><div class="md" id="ccMd" role="dialog" aria-modal="true" aria-labelledby="ccMdTitle"></div>';
    var $ = function (id) { return host.querySelector('#' + id); };
    Array.prototype.forEach.call(host.querySelectorAll('.mnav button[data-m]'), function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.m === D.month) return;
        b.textContent = 'Loading\u2026';
        getMonth(b.dataset.m).then(function (N) { showPast = false; init(N); }).catch(function () { b.textContent = 'Try again'; });
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll('.snav button[data-st]'), function (b) {
      b.addEventListener('click', function () {
        var st = b.dataset.st; if (st === STATE) return;
        var label = b.textContent; b.textContent = 'Loading\u2026';
        openState(st, D.month).then(function (N) {
          try { localStorage.setItem(HID + '_state', st); } catch (e) {}
          shopMem[STATE] = { id: shopId, n: shopName }; recallShop(st); showPast = false; init(N);
        }).catch(function () { b.textContent = label; });
      });
    });
    var setShop = function (id) {
      shopId = id; shopName = id && byId[id] ? byId[id].n : ''; shopMem[STATE] = { id: shopId, n: shopName };
      try { if (id) { localStorage.setItem(skey(STATE), id); localStorage.setItem(skey(STATE) + '_name', shopName); } else { localStorage.removeItem(skey(STATE)); localStorage.removeItem(skey(STATE) + '_name'); } } catch (e) {}
      renderAll();
    };

    /* ---------- feature banner (countdown by day, Pacific time) ---------- */
    function renderEvent() {
      var slot = $('ccEvent'), S = shop(), P = null;
      if (todayNum) DATED.forEach(function (p) { if (!P && p.feature && todayNum <= p.to && todayNum >= p.from - (p.teaseDays || 7) && (!S || has(S, p.id))) P = p; });
      if (!P) { slot.innerHTML = ''; return; }
      var live = todayNum >= P.from, n = P.from - todayNum, last = todayNum === P.to;
      var label = live ? (last && P.from !== P.to ? 'Last day' : 'Live now') : (n === 1 ? 'Starts tomorrow' : 'Starts in ' + n + ' days');
      var big = live ? (last ? 'Today only' : 'Through ' + DN[dow(P.to)]) : DN[dow(P.from)] + ' ' + M + '/' + P.from;
      var c = count(P.id);
      slot.innerHTML = '<button type="button" class="evt' + (live ? ' live' : '') + '" style="--c:' + esc(P.color || 'var(--acc)') + '"><div><div class="evt-ey">' + esc(P.name) + ' \u00b7 ' + range(P) + '</div>' +
        '<div class="evt-h"><em>' + esc(P.pct) + '</em> ' + esc(P.what || '') + '</div><div class="evt-s">' + (S ? 'At ' + esc(S.n) + '. Tap for details.' : 'At ' + c + ' ' + esc(STN) + ' shops. Tap to see where.') + '</div></div>' +
        '<div class="evt-r"><div class="evt-st">' + esc(label) + '</div><div class="evt-cd">' + esc(big) + '</div><span class="evt-go">' + (S ? 'See the deal' : 'Find a shop') + ' &rarr;</span></div></button>';
      slot.firstChild.addEventListener('click', function () { openDay(live ? todayNum : P.from); });
    }

    var topCities = function () {
      var n = {}; SHOPS.forEach(function (s) { if (s.c && !/bay$/i.test(s.c)) n[s.c] = (n[s.c] || 0) + 1; });
      return Object.keys(n).sort(function (a, b) { return n[b] - n[a] || a.localeCompare(b); }).slice(0, 8);
    };
    /* ---------- shop finder ---------- */
    function renderFind() {
      var el = $('ccFind'), S = shop();
      if (S) {
        var mp = mapsOf(S);
        el.innerHTML = '<h3>Your shop</h3><div class="sub">The calendar now shows only this shop\u2019s ' + esc(BN) + ' deals.</div>' +
          '<div class="picked"><div><div class="l">Shopping at</div><b>' + esc(S.n) + '</b><small>' + esc(where(S)) + '</small></div><div class="acts">' +
          '<a class="btn" href="' + esc(linkOf(S)) + '" target="_blank" rel="noopener">Visit shop ' + arrow + '</a>' + (mp ? '<a class="btn ghost" href="' + esc(mp) + '" target="_blank" rel="noopener">' + pin + 'Directions</a>' : '') + '</div></div>' +
          '<button type="button" class="chg" id="ccChange">Change shop</button>';
        $('ccChange').addEventListener('click', function () { setShop(null); var i = $('ccQ'); if (i) i.focus(); });
        return;
      }
      if (!SHOPS.length) { el.innerHTML = '<h3>Find your shop</h3><div class="sub"><b style="color:var(--tx)">No ' + esc(STN) + ' deals posted for ' + esc(MONTH) + ' yet.</b> Check back soon' + (STATES.length > 1 ? ', or switch states above' : '') + '.</div>'; return; }
      var gone = shopId && !byId[shopId] && SHOPS.length ? (shopName || 'Your shop') : '';
      el.innerHTML = '<h3>Find your shop</h3><div class="sub">' + (gone ? '<b style="color:#fff">' + esc(gone) + ' has no ' + esc(BN) + ' deals posted for ' + esc(MONTH) + ' yet.</b> Check back soon, or pick another shop. ' : '') + (SHOPS.length ? SHOPS.length + ' ' + esc(STN) + (SHOPS.some(function (s) { return s.dl; }) ? ' dispensaries &amp; delivery services are running ' : ' dispensaries are running ') + esc(BN) + ' deals in ' + esc(MONTH) + '.' : '<b style="color:var(--tx)">No ' + esc(STN) + ' deals posted for ' + esc(MONTH) + ' yet.</b> Check back soon.') + '</div>' +
        '<div class="fbar"><input id="ccQ" type="search" autocomplete="off" placeholder="Shop name or city" aria-label="Search shops by name or city"><button type="button" class="btn" id="ccNear">' + pin + 'Near me</button></div><div class="res" id="ccRes" role="list"></div>' +
        '<div class="chips" id="ccChips"><span>Popular:</span>' + topCities().map(function (c) { return '<button type="button" data-q="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
      var q = $('ccQ'), res = $('ccRes');
      var show = function () {
        var v = q.value.trim();
        if (!v && !userPos) { res.innerHTML = ''; return; }
        var list = sortShops(SHOPS.filter(function (s) { return match(s, v); })).slice(0, 8);
        res.innerHTML = list.length ? list.map(function (s) { return '<button type="button" role="listitem" data-id="' + esc(s.id) + '"><b>' + esc(s.n) + '</b><small>' + esc(where(s)) + '</small><i>' + esc(miles(s)) + '</i></button>'; }).join('')
          : '<div class="none">No match. Try a city, or <a href="' + esc(FALLBACK) + '" target="_blank" rel="noopener">find ' + esc(BN) + ' near you</a>.</div>';
        Array.prototype.forEach.call(res.querySelectorAll('button[data-id]'), function (b) { b.addEventListener('click', function () { setShop(b.dataset.id); }); });
      };
      q.addEventListener('input', show);
      Array.prototype.forEach.call(el.querySelectorAll('#ccChips button'), function (b) { b.addEventListener('click', function () { q.value = b.dataset.q; show(); q.focus(); }); });
      $('ccNear').addEventListener('click', function () { locate($('ccNear'), show); });
      show();
    }

    /* ---------- weekly card ---------- */
    function renderWeekly() {
      var el = $('ccWeekly'), S = shop(), W = weeklyFor();
      el.parentNode.classList.toggle('one', !WEEKLY.length);
      if (!WEEKLY.length) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.innerHTML = '<h3>Every week in ' + esc(MONTH) + '</h3><div class="sub">' + (S ? (W.length ? 'Weekly ' + esc(BN) + ' deals at ' + esc(S.n) + '.' : esc(S.n) + ' isn\u2019t running a weekly ' + esc(BN) + ' deal this month.') : 'Running at participating shops. Pick your shop to see which ones it runs.') + '</div>' +
        '<div class="wk">' + W.map(function (w) { return '<div class="wi"><div class="pct">' + esc(w.pct) + '</div><div><b>' + esc(w.pct + ' ' + w.what) + '</b><small>' + esc(w.freq) + (S ? '' : ' \u00b7 ' + count(w.id) + ' shops') + '</small></div></div>'; }).join('') +
        (W.length ? '<div class="note">Each shop picks its own day' + (S ? ' \u2014 check ' + esc(S.n) + '\u2019s menu for this week\u2019s deal.' : 's \u2014 check your shop\u2019s menu for this week\u2019s deal.') + '</div>' : '') + '</div>';
    }

    /* ---------- calendar grid ---------- */
    var grid = $('ccGrid');
    function tile(day) {
      var P = datedOn(day), W = weeklyFor(), S = shop();
      if (P.length) {
        var p = P[0], ids = P.map(function (x) { return x.id; });
        var n = SHOPS.filter(function (s) { return ids.some(function (id) { return has(s, id); }); }).length;
        var more = P.length > 1 ? ' \u00b7 ' + P.length + ' deals' : (W.length ? ' \u00b7 plus weekly deals' : '');
        return { hot: true, c: p.color, h: '<em>' + esc(p.head || p.pct + ' off') + '</em>' + esc(p.short || p.name), m: S ? esc(P.map(function (x) { return x.tag || x.line || x.what; }).join(' \u00b7 ')) : n + ' shop' + (n === 1 ? '' : 's') + more };
      }
      if (W.length) return { h: 'Weekly deals', w: true, m: W.map(function (w) { return esc(w.pct + ' ' + w.label); }).join(' \u00b7 ') };
      return { quiet: true, h: '', m: '' };
    }
    function buildGrid() {
      grid.innerHTML = '';
      var blank = function () { var x = document.createElement('div'); x.className = 'day blank'; grid.appendChild(x); };
      var weekStart = todayNum ? todayNum - dow(todayNum) : 1; // Sunday of this week
      var hidePast = todayNum && !showPast;
      if (!(hidePast && weekStart > 1)) for (var i = 0; i < firstDow; i++) blank();
      for (var day = 1; day <= daysIn; day++) (function (day) {
        var t = tile(day), b = document.createElement(t.quiet ? 'div' : 'button');
        if (!t.quiet) b.type = 'button';
        var past = (todayNum && day < todayNum) || isPastMonth;
        b.className = 'day' + (t.hot ? ' hot' : '') + (t.quiet ? ' quiet' : '') + (past ? ' past' : '') + (showPast ? ' show' : '') + (day === todayNum ? ' is-today' : '') + (hidePast && day < weekStart ? ' hidden' : '');
        b.dataset.day = day; if (t.c) b.style.setProperty('--c', t.c);
        b.setAttribute('aria-label', DN[dow(day)] + ', ' + MONTH + ' ' + day + (t.hot ? ' \u2014 ' + datedOn(day)[0].name : ''));
        b.innerHTML = '<div class="n"><b>' + day + '</b><span class="' + (day === todayNum ? 'tdy' : '') + '">' + (day === todayNum ? 'Today' : DN[dow(day)].slice(0, 3)) + '</span></div>' +
          '<div class="h' + (t.w ? ' w' : '') + '">' + t.h + '</div><div class="m">' + t.m + '</div>' + (t.quiet ? '' : '<div class="more">' + (shop() ? 'Details' : t.hot ? 'See where' : 'See shops') + ' &rarr;</div>');
        if (!t.quiet) b.addEventListener('click', function () { openDay(day); });
        grid.appendChild(b);
      })(day);
      var tail = (7 - ((firstDow + daysIn) % 7)) % 7;
      for (var j = 0; j < tail; j++) blank();
      var eb = $('ccEarlier'), pc = todayNum ? todayNum - 1 : 0;
      eb.classList.toggle('on', pc > 0);
      eb.innerHTML = showPast ? 'Hide earlier days <span>&uarr;</span>' : 'Earlier this month <span>Show ' + MON + ' 1&ndash;' + pc + '</span>';
    }
    $('ccEarlier').onclick = function () { showPast = !showPast; buildGrid(); };

    /* ---------- day popup ---------- */
    var ov = $('ccOv'), md = $('ccMd'), sel = null, lastFocus = null;
    var dealRow = function (p, top, sub) { return '<div class="deal' + (top ? ' top' : '') + '"' + (p.color ? ' style="--c:' + esc(p.color) + '"' : '') + '><div class="pct' + (String(p.pct).length > 3 ? ' sm' : '') + '">' + esc(p.pct) + '</div><div><b>' + esc(p.line || p.pct + ' ' + p.what) + '</b><small>' + sub + '</small></div></div>'; };
    var shopRow = function (s, ids, hotIds) {
      var mp = mapsOf(s), d = miles(s);
      return '<div class="shop' + (s.id === shopId ? ' me' : '') + '"><div><b>' + esc(s.n) + '</b><small>' + esc(where(s)) + (d ? ' \u00b7 ' + d : '') + '</small><div class="tags">' +
        ids.filter(function (id) { return has(s, id); }).map(function (id) { var p = promo(id); return '<span class="' + (hotIds.indexOf(id) !== -1 ? 'hot' : '') + '">' + esc(p.tag || p.pct + ' ' + (p.label || p.short || p.name)) + '</span>'; }).join('') +
        '</div></div><div class="acts"><a class="btn" href="' + esc(linkOf(s)) + '" target="_blank" rel="noopener">Visit ' + arrow + '</a>' + (mp ? '<a class="btn ghost" href="' + esc(mp) + '" target="_blank" rel="noopener" aria-label="Directions to ' + esc(s.n) + '">' + pin + '</a>' : '') + '</div></div>';
    };
    function openDay(day) {
      if (!md.classList.contains('on')) lastFocus = document.activeElement;
      sel = day;
      var S = shop(), P = datedOn(day), allP = DATED.filter(function (p) { return day >= p.from && day <= p.to; }), W = weeklyFor();
      var c = P[0] ? P[0].color : (allP[0] && !S ? allP[0].color : null);
      md.style.setProperty('--c', c || 'var(--line-2)');
      var kick = P.length ? (P.length > 2 ? P[0].name + ' + ' + (P.length - 1) + ' more deals' : P.map(function (p) { return p.name; }).join(' + ')) : 'Weekly deals';
      var sub = P.length ? (day === P[0].to ? (P[0].from === P[0].to ? 'One day only' : 'Last day') : 'Limited time \u00b7 through ' + DN[dow(P[0].to)] + ' ' + M + '/' + P[0].to) : (S ? 'At ' + esc(S.n) : 'At participating shops');
      var html = '<div class="band"><div><div class="k">' + esc(kick) + '</div><div class="d" id="ccMdTitle">' + DN[dow(day)] + ', ' + MONTH + ' ' + day + '</div><div class="s">' + sub + '</div></div><button type="button" class="cl" aria-label="Close">&times;</button></div>' +
        '<div class="nav"><button type="button" data-nav="-1"' + (day === 1 ? ' style="visibility:hidden"' : '') + '>&larr; ' + MON + ' ' + (day - 1) + '</button><button type="button" data-nav="1"' + (day === daysIn ? ' style="visibility:hidden"' : '') + '>' + MON + ' ' + (day + 1) + ' &rarr;</button></div><div class="bd">';
      if (S) {
        html += '<div class="sec"><div class="st"><h4>At ' + esc(S.n) + '</h4><small>' + esc(where(S)) + '</small></div><div class="deals">' +
          P.map(function (p) { return dealRow(p, true, esc(p.name + ' \u00b7 ' + range(p))); }).join('') +
          W.map(function (w) { return dealRow(w, false, esc(w.freq + ' \u2014 the shop picks the day, check their menu')); }).join('') +
          (!P.length && !W.length ? '<div class="deal"><div class="pct">&ndash;</div><div><b>No ' + esc(BN) + ' deal posted for this day</b><small>Check the shop\u2019s menu for current pricing.</small></div></div>' : '') + '</div></div>' +
          '<div class="shops">' + shopRow(S, P.map(function (p) { return p.id; }).concat(W.map(function (w) { return w.id; })), P.map(function (p) { return p.id; })) + '</div>';
        var others = allP.filter(function (p) { return !has(S, p.id); });
        if (others.length) html += '<div class="sec"><div class="st"><h4>Also today at other shops</h4></div><div class="deals">' + others.map(function (p) { return dealRow(p, true, count(p.id) + ' shops \u00b7 ' + esc(range(p))); }).join('') + '</div><button type="button" class="moreb" id="ccAll" style="margin-top:8px">See every shop running it</button></div>';
      } else {
        html += '<div class="sec"><div class="st"><h4>' + esc(BN) + ' deals</h4><small>' + (P.length && W.length ? 'Limited time + weekly' : P.length ? 'Limited time' : 'This week') + '</small></div><div class="deals">' +
          P.map(function (p) { return dealRow(p, true, esc(p.name) + ' \u00b7 ' + count(p.id) + ' shops'); }).join('') +
          W.map(function (w) { return dealRow(w, false, esc(w.freq) + ' \u00b7 ' + count(w.id) + ' shops \u00b7 day varies by shop'); }).join('') + '</div></div>';
      }
      if (!S) html += shopsSection(day, P, W);
      html += '<div class="fine">' + esc(D.finePrint || '') + '</div></div>';
      md.innerHTML = html;
      wireModal(day);
      ov.classList.add('on'); md.classList.add('on'); md.scrollTop = 0;
      document.documentElement.style.overflow = 'hidden';
      md.querySelector('.cl').focus();
    }
    function shopsSection(day, P, W) {
      var ids = P.map(function (p) { return p.id; }).concat(W.map(function (w) { return w.id; }));
      return '<div class="sec" id="ccShopSec" data-ids="' + esc(ids.join(',')) + '" data-hot="' + esc(P.map(function (p) { return p.id; }).join(',')) + '"><div class="st"><h4>Where to shop</h4><small id="ccShopCount"></small></div>' +
        '<div class="sbar"><input id="ccSq" type="search" autocomplete="off" placeholder="Filter by shop or city" aria-label="Filter shops"><button type="button" class="btn" id="ccSNear">' + pin + 'Near me</button></div><div class="shops" id="ccShops"></div></div>';
    }
    function wireModal(day) {
      md.querySelector('.cl').addEventListener('click', closeMd);
      Array.prototype.forEach.call(md.querySelectorAll('[data-nav]'), function (b) { b.addEventListener('click', function () { openDay(day + +b.dataset.nav); }); });
      var all = md.querySelector('#ccAll');
      if (all) all.addEventListener('click', function () { setShop(null); openDay(day); });
      var sec = md.querySelector('#ccShopSec'); if (!sec) return;
      var ids = sec.dataset.ids ? sec.dataset.ids.split(',') : [], hot = sec.dataset.hot ? sec.dataset.hot.split(',') : [];
      var limit = 12, q = md.querySelector('#ccSq'), list = md.querySelector('#ccShops');
      var draw = function () {
        var pool = SHOPS.filter(function (s) { return (hot.length ? hot : ids).some(function (id) { return has(s, id); }); });
        var found = sortShops(pool.filter(function (s) { return match(s, q.value.trim()); }));
        md.querySelector('#ccShopCount').textContent = pool.length + ' shops' + (userPos ? ' \u00b7 nearest first' : '');
        list.innerHTML = found.slice(0, limit).map(function (s) { return shopRow(s, ids, hot); }).join('') +
          (found.length > limit ? '<button type="button" class="moreb" id="ccMore">Show ' + Math.min(found.length - limit, 24) + ' more of ' + (found.length - limit) + '</button>' : '') +
          (!found.length ? '<div class="deal"><div class="pct">&ndash;</div><div><b>No shop matches \u201c' + esc(q.value) + '\u201d</b><small><a href="' + esc(FALLBACK) + '" target="_blank" rel="noopener">Find ' + esc(BN) + ' near you &rarr;</a></small></div></div>' : '');
        var more = list.querySelector('#ccMore'); if (more) more.addEventListener('click', function () { limit += 24; draw(); });
      };
      q.addEventListener('input', function () { limit = 12; draw(); });
      md.querySelector('#ccSNear').addEventListener('click', function () { locate(md.querySelector('#ccSNear'), function () { limit = 12; draw(); renderFind(); }); });
      draw();
    }
    function closeMd() {
      ov.classList.remove('on'); md.classList.remove('on'); document.documentElement.style.overflow = '';
      sel = null; if (lastFocus && lastFocus.focus && host.contains(lastFocus)) lastFocus.focus();
    }
    ov.addEventListener('click', closeMd);
    if (host._ccKey) document.removeEventListener('keydown', host._ccKey);
    host._ccKey = function (e) {
      if (!md.classList.contains('on')) return;
      if (e.key === 'Escape') closeMd();
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' && sel < daysIn) openDay(sel + 1);
      if (e.key === 'ArrowLeft' && sel > 1) openDay(sel - 1);
    };
    document.addEventListener('keydown', host._ccKey);

    function renderAll() { renderEvent(); renderFind(); renderWeekly(); buildGrid(); }
    renderAll();
    if (host._ccTick) clearInterval(host._ccTick);
    host._ccTick = setInterval(function () { var n = partsNow(TZ); if (n.d !== now.d) { now = n; todayNum = (n.y === Y && n.m === M) ? n.d : null; renderAll(); } }, 60000);
  }
})();
