/* ============================================================
   CLASSERA NEW LABELS v1
   Shows a small NEW (جديد) label on anything that was added or changed in the last 14 days:
   events on the plan pages, plan cards and plan tabs on the hub.
   It reads assets/whats-new.json, which GitHub Actions keeps up to date automatically
   (after every push, and every 3 hours for edits made only in the Google Sheet).
   You never edit this file or the json.
   Settings you may change: DAYS (how long a label stays), SHOW (set to false to switch all labels off).
   ============================================================ */
(function () {
  'use strict';
  var SHOW = true;
  var DAYS = 0;                       /* 0 = use windowDays from whats-new.json (14) */
  var SELF = document.currentScript;
  var ROOT = new URL('../', SELF.src).href;
  if (!SHOW) return;

  /* hub: plan id -> program name in the sheet, and page folder */
  var PLANS = {
    pd:       { program: 'professional development', folder: 'eLearning' },
    acc:      { program: 'accreditation',            folder: 'Accreditation' },
    enrich:   { program: 'enrichment academy',       folder: 'Enrichment' },
    prodev:   { program: 'product events',           folder: 'ProductEvents' },
    onground: { program: 'in-person events',         folder: 'InPersonEvents' },
    calendar: { program: null,                       folder: 'Calendar' }
  };
  var DAY = 864e5, reg = null, done = false;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var fmt = function (iso) { var d = new Date(iso); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };

  /* ---- is this registry entry "new" right now? returns {kind, when} or null ---- */
  function fresh(e) {
    if (!e) return null;
    var win = (DAYS || reg.windowDays || 14) * DAY, now = Date.now(), a = e.a && Date.parse(e.a), c = e.c && Date.parse(e.c);
    if (e.s && /^(cancel|deliver)/i.test(e.s)) return null;          /* cancelled or already delivered */
    if (e.e && e.e < today()) return null;                           /* event is over */
    if (a && now - a < win) return { kind: 'added', when: e.a };
    if (c && now - c < win) return { kind: 'updated', when: e.c };
    return null;
  }
  function freshPage(e) {
    if (!e || !e.c) return null;
    return Date.now() - Date.parse(e.c) < (DAYS || reg.windowDays || 14) * DAY ? { kind: 'updated', when: e.c } : null;
  }
  /* newest label among a plan's events and its page */
  function planState(id) {
    var P = PLANS[id], best = null;
    function take(s) { if (s && (!best || Date.parse(s.when) > Date.parse(best.when))) best = s; }
    if (!P) return null;
    take(freshPage(reg.pages && reg.pages[P.folder]));
    if (P.program) Object.keys(reg.events || {}).forEach(function (k) {
      var e = reg.events[k]; if (e.p && e.p.toLowerCase() === P.program) take(fresh(e));
    });
    return best;
  }

  /* ---- the label ---- */
  function makeBadge(s, cls) {
    var b = document.createElement('span');
    b.className = 'cnew' + (cls ? ' ' + cls : '');
    b.setAttribute('data-cnew', '1');
    b.title = (s.kind === 'added' ? 'Added ' : 'Updated ') + fmt(s.when) + ' | ' + (s.kind === 'added' ? 'أضيفت ' : 'تم التحديث ') + fmt(s.when);
    b.innerHTML = '<i aria-hidden="true"></i><span class="en">NEW</span><span class="ar">جديد</span>';
    return b;
  }
  function style() {
    if (document.getElementById('cnew-style')) return;
    var s = document.createElement('style'); s.id = 'cnew-style';
    s.textContent =
      '.cnew{display:inline-flex;align-items:center;gap:5px;vertical-align:middle;margin-inline:8px;padding:2px 9px 2px 7px;border-radius:999px;' +
      'font:800 11px/1.5 "IBM Plex Sans Arabic","Tajawal",system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;' +
      'color:#fff;background:linear-gradient(135deg,#E8574A,#D68A21);box-shadow:0 2px 8px -2px rgba(214,138,33,.55);cursor:default;flex:none}' +
      '.cnew i{width:6px;height:6px;border-radius:50%;background:#fff;animation:cnewp 1.8s ease-in-out infinite}' +
      '@keyframes cnewp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.7)}}' +
      'html[data-lang="en"] .cnew .ar,html:not([data-lang="en"]) .cnew .en{display:none}' +
      'html:not([data-lang="en"]) .cnew{letter-spacing:0;text-transform:none;font-size:12px}' +
      '.cnew.cnew-corner{position:absolute;top:12px;inset-inline-end:14px;margin:0;z-index:3}' +
      '.cnew.cnew-tab{margin-inline:6px 0;padding:1px 7px 1px 5px;font-size:10px}' +
      '@media (prefers-reduced-motion:reduce){.cnew i{animation:none}}' +
      '@media print{.cnew{display:none!important}}';
    document.head.appendChild(s);
  }
  function put(host, s, cls, before) {
    if (!host || host.querySelector(':scope > [data-cnew]')) return;
    var b = makeBadge(s, cls);
    if (before && before.parentNode === host) host.insertBefore(b, before); else host.appendChild(b);
  }

  /* ---- apply to whatever this page shows ---- */
  function apply() {
    if (!reg) return;
    var ev = reg.events || {};
    /* plan pages (PD, Enrichment): one card per event, keyed by the Site Key */
    document.querySelectorAll('article.item').forEach(function (art) {
      var a = art.querySelector('h3 a[data-link]'); if (!a) return;
      var s = fresh(ev[String(a.getAttribute('data-link')).toLowerCase()]), h3 = a.closest('h3');
      var old = art.querySelector('[data-cnew]');
      if (!s) { if (old) old.remove(); return; }
      if (!old && h3) h3.appendChild(makeBadge(s));
    });
    /* in-person and product event lists */
    document.querySelectorAll('[data-link-slot]').forEach(function (slot) {
      var art = slot.closest('article.ev'); if (!art) return;
      var s = fresh(ev[String(slot.getAttribute('data-link-slot')).toLowerCase()]), h4 = art.querySelector('h4');
      var old = art.querySelector('[data-cnew]');
      if (!s) { if (old) old.remove(); return; }
      if (!old && h4) h4.appendChild(makeBadge(s));
    });
    /* accreditation exam windows: matched by their start date */
    var accByStart = null;
    document.querySelectorAll('.period [data-ics]').forEach(function (btn) {
      var row = btn.closest('.period'), old = row.querySelector('[data-cnew]');
      if (!accByStart) { accByStart = {}; Object.keys(ev).forEach(function (k) { var e = ev[k]; if (e.b && e.p && e.p.toLowerCase() === 'accreditation') accByStart[e.b] = e; }); }
      var s = fresh(accByStart[btn.getAttribute('data-ics')]), host = row.querySelector('.pt');
      if (!s) { if (old) old.remove(); return; }
      if (!old && host) host.appendChild(makeBadge(s));
    });
    /* hub: plan cards and plan tabs */
    document.querySelectorAll('.prog[data-plan]').forEach(function (card) {
      var s = planState(card.getAttribute('data-plan')), old = card.querySelector(':scope > [data-cnew]');
      if (!s) { if (old) old.remove(); return; }
      if (!old) { if (getComputedStyle(card).position === 'static') card.style.position = 'relative'; card.appendChild(makeBadge(s, 'cnew-corner')); }
    });
    document.querySelectorAll('[data-go]').forEach(function (tab) {
      var s = planState(tab.getAttribute('data-go')), old = tab.querySelector('[data-cnew]');
      if (!s) { if (old) old.remove(); return; }
      if (!old) tab.appendChild(makeBadge(s, 'cnew-tab'));
    });
  }

  function start() {
    style();
    fetch(ROOT + 'assets/whats-new.json?v=' + Math.floor(Date.now() / 36e5), { cache: 'default' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        reg = j; apply();
        /* pages build their lists with script (tracker, filters, language): re-apply after each redraw */
        var pending = false;
        new MutationObserver(function () {
          if (pending) return; pending = true;
          setTimeout(function () { pending = false; apply(); }, 120);
        }).observe(document.body, { childList: true, subtree: true });
      })
      .catch(function (e) { if (window.console) console.warn('[new-labels] not shown:', e && e.message); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
