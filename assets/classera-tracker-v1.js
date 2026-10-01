/* ============================================================
   CLASSERA TRACKER LAYER v1
   Reads events-tracker.xlsx (site root) and applies it to the page:
   titles, dates, time, audience, language, partner, pricing, countries,
   status and registration links. If the workbook is missing or cannot
   be read, the page keeps its built-in content and links.json is used.
   You never edit this file. You edit and upload events-tracker.xlsx.
   ============================================================ */
(function () {
  'use strict';
  window.CLASSERA_TRACKER_PAGE = true;
  var SELF = document.currentScript;
  var ROOT = new URL('../', SELF.src).href;
  var FILE = ROOT + 'events-tracker.xlsx';
  var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  var IS_HUB = SELF.hasAttribute('data-hub');

  var FIELDS = { id: 'Event ID', key: 'Site Key', program: 'Program', track: 'Track', title: 'Event Title (EN)', titleAr: 'Event Title (AR)',
    host: 'Partner / Host', start: 'Start Date', end: 'End Date', dstat: 'Date Status', time: 'Time (KSA)', aud: 'Audience', lang: 'Language',
    loc: 'Country / Location', price: 'Pricing', link: 'Registration Link', status: 'Event Status' };
  var norm = function (s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); };
  var clean = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };

  /* ---------- load (once per visit: the hub shares its copy with every plan page) ---------- */
  function loadLib() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = LIB; s.async = true;
      s.onload = function () { window.XLSX ? res(window.XLSX) : rej(new Error('lib')); };
      s.onerror = function () { rej(new Error('lib')); };
      document.head.appendChild(s);
    });
  }
  function serial(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number') return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5).toISOString().slice(0, 10);
    var m = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : '';
  }
  function parse(X, buf) {
    var wb = X.read(buf, { type: 'array' });
    var sh = wb.Sheets.Events; if (!sh) throw new Error('No Events sheet');
    var aoa = X.utils.sheet_to_json(sh, { header: 1, raw: true, defval: null, blankrows: false });
    var hi = aoa.findIndex(function (r) { return r && r.some(function (c) { return norm(c) === 'eventid'; }); });
    if (hi < 0) throw new Error('No Event ID header');
    var head = aoa[hi].map(norm), idx = {};
    Object.keys(FIELDS).forEach(function (k) { idx[k] = head.indexOf(norm(FIELDS[k])); });
    if (idx.start < 0 || idx.program < 0) throw new Error('Missing columns');
    var rows = [];
    aoa.slice(hi + 1).forEach(function (r) {
      if (!r || r[idx.id] == null || String(r[idx.id]).trim() === '') return;
      var o = {};
      Object.keys(FIELDS).forEach(function (k) {
        var v = idx[k] >= 0 ? r[idx[k]] : null;
        o[k] = (k === 'start' || k === 'end') ? serial(v) : clean(v);
      });
      if (!o.end) o.end = o.start;
      o.exact = !o.dstat || o.dstat === 'Confirmed';
      o.cancelled = /^cancel/i.test(o.status); o.postponed = /^postpon/i.test(o.status); o.delivered = /^deliver/i.test(o.status);
      rows.push(o);
    });
    var off = [], os = wb.Sheets['Off-Periods'];
    if (os) X.utils.sheet_to_json(os, { header: 1, raw: true, defval: null }).slice(1).forEach(function (r) {
      if (r && r[0] != null && r[2]) { var a = serial(r[0]), b = serial(r[1]); if (a && b) off.push({ start: a, end: b, en: clean(r[2]), ar: clean(r[3]) || clean(r[2]) }); }
    });
    var links = {};
    rows.forEach(function (o) { if (o.key) links[o.key] = o.link || ''; });
    return { rows: rows, off: off, links: links };
  }
  function load() {
    try { if (window.parent !== window && window.parent.CLASSERA_TRACKER) return window.parent.CLASSERA_TRACKER; } catch (e) {}
    if (!window.CLASSERA_TRACKER) {
      window.CLASSERA_TRACKER = Promise.all([
        loadLib(),
        fetch(FILE + '?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); })
      ]).then(function (a) { return parse(a[0], new Uint8Array(a[1])); });
    }
    return window.CLASSERA_TRACKER;
  }
  if (IS_HUB) { load().catch(function () {}); return; }

  /* ---------- shared helpers ---------- */
  var MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var WD_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var WD_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var parts = function (iso) { var p = iso.split('-').map(Number); return { y: p[0], m: p[1], d: p[2] || 1 }; };
  var dow = function (iso) { var p = parts(iso); return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); };
  var addDays = function (iso, n) { var p = parts(iso); return new Date(Date.UTC(p.y, p.m - 1, p.d + n)).toISOString().slice(0, 10); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var enc = encodeURIComponent;
  function dateEN(r) { var p = parts(r.start); return r.exact ? WD_EN[dow(r.start)] + ', ' + p.d + ' ' + MON_EN[p.m - 1] + ' ' + p.y : MON_EN[p.m - 1] + ' ' + p.y; }
  function dateAR(r) { var p = parts(r.start); return r.exact ? WD_AR[dow(r.start)] + ' ' + p.d + ' ' + MON_AR[p.m - 1] + ' ' + p.y : MON_AR[p.m - 1] + ' ' + p.y; }
  function hm(t) { var m = String(t || '').match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?/); if (!m) return null;
    var h = +m[1], mi = +(m[2] || 0); if (m[3]) { var pm = /p/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; } return [h, mi]; }
  function timeAR(t) { return String(t).replace(/\s*PM/i, ' مساءً').replace(/\s*AM/i, ' صباحاً'); }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function icsEsc(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function fold(line) { var out = [], s = line; while (s.length > 70) { out.push(s.slice(0, 70)); s = ' ' + s.slice(70); } out.push(s); return out.join('\r\n'); }
  function utcStamp(iso, h, mi) { var p = parts(iso); var d = new Date(Date.UTC(p.y, p.m - 1, p.d, h - 3, mi)); return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; }
  function ics(name, evs) {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Classera//Plans AY26-27//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(name), 'X-WR-TIMEZONE:Asia/Riyadh'];
    evs.forEach(function (e) {
      L.push('BEGIN:VEVENT', 'UID:' + e.uid + '@plans.classera.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z');
      if (e.timed) L.push('DTSTART:' + e.s, 'DTEND:' + e.e); else L.push('DTSTART;VALUE=DATE:' + e.s, 'DTEND;VALUE=DATE:' + e.e);
      L.push('SUMMARY:' + icsEsc(e.title), 'DESCRIPTION:' + icsEsc(e.desc), 'LOCATION:' + icsEsc(e.loc), 'URL:' + e.url, 'END:VEVENT');
    });
    L.push('END:VCALENDAR'); return L.map(fold).join('\r\n') + '\r\n';
  }

  /* bilingual dictionary harvested from the page itself (EN text -> its AR twin) */
  var DICT = {};
  function harvest() {
    document.querySelectorAll('span[lang="en"]').forEach(function (en) {
      var ar = en.nextElementSibling; if (ar && ar.getAttribute('lang') === 'ar') { var k = clean(en.textContent); if (k && !DICT[k]) DICT[k] = clean(ar.textContent); }
    });
  }
  var LANG_AR = { Arabic: 'الجلسة بالعربية', English: 'الجلسة بالإنجليزية', Bilingual: 'الجلسة باللغتين' };
  var STATUS_AR = { Cancelled: 'ملغاة', Postponed: 'مؤجلة', Completed: 'انعقدت' };
  function arFor(en) { return DICT[en] || en; }
  function setPair(host, en, ar) {
    var e = host.querySelector(':scope > span[lang="en"]'), a = host.querySelector(':scope > span[lang="ar"]');
    if (!e || !en) return false;
    if (clean(e.textContent) === clean(en)) return false;
    e.textContent = en; if (a) a.textContent = ar || arFor(en); return true;
  }
  function addStyle() {
    if (document.getElementById('x-tracker-css')) return;
    var st = document.createElement('style'); st.id = 'x-tracker-css';
    st.textContent = '.xst{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.03em;line-height:1.3;white-space:nowrap}' +
      '.xst.x-c{background:#FDE4E1;color:#9F1D12}.xst.x-p{background:#FFF0D6;color:#7A4A00}.xst.x-d{background:#DDF5E8;color:#0B6B3A}' +
      '.item.x-cancel .card>*:not(.top){opacity:.5}.item.x-cancel h3{text-decoration:line-through;text-decoration-thickness:1px}' +
      '.item.x-cancel .ctarow{display:none}.item.x-past .card{opacity:.78}' +
      'html[data-lang="ar"] .xst [lang="en"],html[data-lang="en"] .xst [lang="ar"]{display:none}';
    document.head.appendChild(st);
  }
  function statusPill(r) {
    var k = r.cancelled ? ['Cancelled', 'x-c'] : r.postponed ? ['Postponed', 'x-p'] : r.delivered ? ['Completed', 'x-d'] : null;
    if (!k) return null;
    var s = document.createElement('span'); s.className = 'xst ' + k[1];
    s.innerHTML = '<span lang="en">' + k[0] + '</span><span lang="ar">' + STATUS_AR[k[0]] + '</span>';
    return s;
  }

  /* ---------- PD + Enrichment cards ---------- */
  var COUNTRY = { 'saudi arabia': 'ksa', egypt: 'egy', jordan: 'jor', 'other countries': 'oth' };
  var CNAME = { ksa: ['Saudi Arabia', 'السعودية'], egy: ['Egypt', 'مصر'], jor: ['Jordan', 'الأردن'], oth: ['Other countries', 'دول أخرى'] };
  var PRICE = { free: ['t-free', 'Free', 'مجاني'], sponsored: ['t-sponsor', 'Sponsored', 'برعاية'], paid: ['t-paid', 'Paid — secondary', 'مدفوع — المرحلة الثانوية'] };

  function metaRow(meta, ico, en, ar, create) {
    var use = meta.querySelector('use[href="#' + ico + '"]'), row = use && use.closest('.meta > div');
    if (!row) {
      if (!create || !en) return;
      row = document.createElement('div');
      row.innerHTML = '<svg><use href="#' + ico + '"></use></svg><span lang="en"></span><span lang="ar"></span>';
      meta.appendChild(row);
      row.querySelector('[lang="en"]').textContent = en; row.querySelector('[lang="ar"]').textContent = ar || arFor(en);
      return;
    }
    setPair(row, en, ar);
  }
  function monthOf(header) {
    var t = clean((header.querySelector('[lang="en"]') || header).textContent);
    var m = t.match(new RegExp('(' + MON_EN.join('|') + ')\\s+(\\d{4})'));
    return m ? m[2] + '-' + pad(MON_EN.indexOf(m[1]) + 1) : '';
  }
  function placeCard(art, iso) {
    var rail = art.parentElement, mk = iso.slice(0, 7);
    var headers = Array.prototype.slice.call(rail.querySelectorAll(':scope > .month'));
    var target = headers.find(function (x) { return monthOf(x) === mk; });
    if (!target) {
      if (!headers.length) return;
      var tpl = headers[0], semStyle = /Semester/i.test(tpl.textContent), p = parts(iso);
      target = tpl.cloneNode(true); target.style.display = '';
      var sem2 = iso >= '2027-02-01';
      target.querySelector('.mm [lang="en"], [lang="en"]').textContent = (semStyle ? (sem2 ? 'Semester 2 · ' : 'Semester 1 · ') : '') + MON_EN[p.m - 1] + ' ' + p.y;
      target.querySelector('.mm [lang="ar"], [lang="ar"]').textContent = (semStyle ? (sem2 ? 'الفصل الدراسي الثاني · ' : 'الفصل الدراسي الأول · ') : '') + MON_AR[p.m - 1] + ' ' + p.y;
      var after = headers.find(function (x) { return monthOf(x) > mk; });
      rail.insertBefore(target, after || null);
    }
    var n = target.nextElementSibling, before = null, last = target;
    while (n && !n.classList.contains('month')) {
      if (n !== art && n.classList.contains('item')) {
        if (n.dataset.xdate && n.dataset.xdate > iso) { before = n; break; }
        last = n;
      }
      n = n.nextElementSibling;
    }
    if (!before) before = last.nextElementSibling === art ? art.nextElementSibling : last.nextElementSibling;
    if (before === art) return;
    rail.insertBefore(art, before);
  }
  function hideEmptyMonths() {
    document.querySelectorAll('.rail > .month').forEach(function (m) {
      var n = m.nextElementSibling, any = false;
      while (n && !n.classList.contains('month')) { if (n.classList.contains('item')) { any = true; break; } n = n.nextElementSibling; }
      if (!any) m.style.display = 'none';
    });
  }
  function patchCards(data, kind) {
    harvest(); addStyle();
    var by = {}; data.rows.forEach(function (r) { if (r.key) by[r.key] = r; });
    var PLATFORM = kind === 'pd' ? 'https://elearning.classera.com/' : 'https://iacademy.classera.com/';
    var LOCN = kind === 'pd' ? 'Online - Classera Innovation Platform' : 'Online - Classera Enrichment Academy';
    var t = today(), arts = Array.prototype.slice.call(document.querySelectorAll('article.item'));
    arts.forEach(function (art) {
      var a = art.querySelector('h3 a[data-link]'); var r = a && by[a.getAttribute('data-link')]; if (!r || !r.start) return;
      art.dataset.xdate = r.start;
      setPair(a, r.title, r.titleAr);
      var meta = art.querySelector('.meta');
      if (meta) {
        metaRow(meta, 'i-calendar', dateEN(r), dateAR(r), true);
        if (r.time) metaRow(meta, 'i-clock', r.time + ' (GMT+3)', timeAR(r.time) + ' (بتوقيت السعودية)', kind === 'pd');
        if (r.aud) metaRow(meta, 'i-users', r.aud, null, true);
        if (r.lang) metaRow(meta, 'i-globe', r.lang, DICT[r.lang] || LANG_AR[r.lang], kind === 'pd');
      }
      var top = art.querySelector('.top');
      if (kind === 'pd' && top && r.host && !/^tbc$/i.test(r.host)) {
        var pb = top.querySelector('.pbrand');
        if (pb) setPair(pb, r.host, null);
        else if (/partner/i.test(r.track)) {
          pb = document.createElement('span'); pb.className = 'pbrand';
          var ini = r.host.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
          pb.innerHTML = '<i aria-hidden="true"></i><span lang="en"></span><span lang="ar"></span>';
          pb.querySelector('i').textContent = ini; pb.querySelector('[lang="en"]').textContent = r.host; pb.querySelector('[lang="ar"]').textContent = arFor(r.host);
          var pill = top.querySelector('.pill'); top.insertBefore(pb, pill ? pill.nextSibling : top.firstChild);
        }
      }
      if (kind === 'enr') {
        var tag = art.querySelector('.tagrow .tag'), pk = /sponsor/i.test(r.price) ? 'sponsored' : /paid/i.test(r.price) ? 'paid' : /free/i.test(r.price) ? 'free' : '';
        if (tag && pk && !tag.classList.contains(PRICE[pk][0])) {
          tag.className = 'tag ' + PRICE[pk][0];
          tag.querySelector('[lang="en"]').textContent = PRICE[pk][1]; tag.querySelector('[lang="ar"]').textContent = PRICE[pk][2];
        }
        var codes = r.loc.split(',').map(function (s) { return COUNTRY[clean(s).toLowerCase()]; }).filter(Boolean);
        if (codes.length && codes.join(' ') !== (art.getAttribute('data-countries') || '')) {
          art.setAttribute('data-countries', codes.join(' '));
          var row = art.querySelector('.tagrow');
          if (row) { row.querySelectorAll('.cflag').forEach(function (c) { c.remove(); });
            codes.forEach(function (c) { var s = document.createElement('span'); s.className = 'cflag'; s.dataset.c = c; s.title = CNAME[c][0];
              s.innerHTML = '<span lang="en"></span><span lang="ar"></span>'; s.firstChild.textContent = CNAME[c][0]; s.lastChild.textContent = CNAME[c][1]; row.appendChild(s); }); }
        }
      }
      // status
      art.querySelectorAll('.xst').forEach(function (x) { x.remove(); });
      art.classList.toggle('x-cancel', r.cancelled);
      art.classList.toggle('x-past', !r.cancelled && r.end < t);
      var pillEl = statusPill(r); if (pillEl && top) top.appendChild(pillEl);
      // calendar buttons
      var btns = art.querySelectorAll('.calbtns a.calbtn'), url = r.link || PLATFORM;
      var calWrap = art.querySelector('.calbtns'); if (calWrap) calWrap.style.display = r.exact ? '' : 'none';
      if (btns.length && r.exact) {
        var desc = r.title + '\n' + r.titleAr + '\n\nAudience: ' + (r.aud || '') + '\nRegister: ' + url, tm = hm(r.time);
        if (tm) {
          var s = utcStamp(r.start, tm[0], tm[1]), e = utcStamp(r.start, tm[0], tm[1] + 75);
          btns[0].href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + enc(r.title) + '&dates=' + s + '%2F' + e + '&details=' + enc(desc) + '&location=' + enc(LOCN) + '&ctz=Asia%2FRiyadh';
          if (btns[1] && /^https:\/\/outlook/.test(btns[1].href)) {
            var st = r.start + 'T' + pad(tm[0]) + ':' + pad(tm[1]) + ':00+03:00';
            var et = r.start + 'T' + pad((tm[0] + Math.floor((tm[1] + 75) / 60)) % 24) + ':' + pad((tm[1] + 75) % 60) + ':00+03:00';
            btns[1].href = 'https://outlook.office.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=' + enc(r.title) + '&startdt=' + enc(st) + '&enddt=' + enc(et) + '&location=' + enc(LOCN) + '&body=' + enc(desc);
          }
        } else {
          var d1 = r.start.replace(/-/g, ''), d2 = addDays(r.end || r.start, 1).replace(/-/g, '');
          btns[0].href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + enc(r.title) + '&dates=' + d1 + '%2F' + d2 + '&details=' + enc(desc) + '&location=' + enc(LOCN) + '&ctz=Asia%2FRiyadh';
          if (btns[1] && /^data:/.test(btns[1].getAttribute('href') || ''))
            btns[1].href = 'data:text/calendar;charset=utf-8;base64,' + b64(ics(r.title, [{ uid: r.id, timed: false, s: d1, e: d2, title: r.title, desc: desc, loc: LOCN, url: url }]));
        }
      }
      placeCard(art, r.start);
    });
    hideEmptyMonths();
    // page calendar file
    var list = data.rows.filter(function (r) { return r.key && r.key.indexOf(kind === 'pd' ? 'pd-' : 'enr-') === 0 && !r.cancelled && r.exact; }).map(function (r) {
      var tm = hm(r.time), url = r.link || PLATFORM, desc = r.title + '\n' + r.titleAr + '\n\nAudience: ' + (r.aud || '') + '\nRegister: ' + url;
      return tm ? { uid: r.id, timed: true, s: utcStamp(r.start, tm[0], tm[1]), e: utcStamp(r.start, tm[0], tm[1] + 75), title: r.title, desc: desc, loc: LOCN, url: url }
                : { uid: r.id, timed: false, s: r.start.replace(/-/g, ''), e: addDays(r.end || r.start, 1).replace(/-/g, ''), title: r.title, desc: desc, loc: LOCN, url: url };
    });
    if (list.length) {
      var body = ics(kind === 'pd' ? 'Classera PD Plan AY26-27' : 'Classera Enrichment Academy AY26-27', list);
      document.querySelectorAll('a[download][href^="data:text/calendar"]').forEach(function (x) { x.href = 'data:text/calendar;charset=utf-8;base64,' + b64(body); });
      var ta = document.getElementById('icstext'); if (ta) ta.value = body;
    }
  }

  /* ---------- Accreditation exam windows ---------- */
  function patchAccreditation(data) {
    var acc = data.rows.filter(function (r) { return /^accreditation$/i.test(r.program) && r.start && !r.cancelled; })
      .sort(function (a, b) { return a.start.localeCompare(b.start); });
    if (!acc.length) return;
    var months = [];
    acc.forEach(function (r) {
      var p = parts(r.start), mo = months.find(function (x) { return x.y === p.y && x.m === p.m; });
      if (!mo) { mo = { y: p.y, m: p.m, sem: r.start >= '2027-02-01' ? 2 : 1, p: [] }; months.push(mo); }
      mo.p.push({ n: mo.p.length + 1, s: r.start, e: r.end || r.start });
    });
    DATA.length = 0; months.forEach(function (m) { DATA.push(m); });
    render();
  }

  /* ---------- Full calendar ---------- */
  function patchCalendar(data) {
    var old = {}; DATA.events.forEach(function (e) { if (e.id) old[e.id] = e; });
    var CAT = { 'professional development': 'pd', 'product events': 'prod', 'in-person events': 'ong', 'enrichment academy': 'enr' };
    var ev = [];
    data.rows.forEach(function (r) {
      var cat = CAT[r.program.toLowerCase()]; if (!cat || !r.start || r.cancelled) return;
      if (cat === 'enr' && !/skill/i.test(r.track)) return;
      var o = old[r.id] || {};
      var n = (r.id.match(/^PD-S0*(\d+)$/) || [])[1];
      var x = { cat: cat, id: r.id, start: r.exact ? r.start : r.start.slice(0, 7),
        en: (n ? 'S' + n + ' · ' : '') + r.title, ar: (n ? 'الجلسة ' + n + ' · ' : '') + (r.titleAr || r.title),
        men: o.men || [r.host, r.aud, r.lang].filter(Boolean).join(' · '), mar: o.mar || [r.host, r.aud, r.lang].filter(Boolean).join(' · ') };
      if (r.exact && r.end && r.end !== r.start) x.end = r.end;
      if (r.postponed) { x.en += ' (Postponed)'; x.ar += ' (مؤجلة)'; }
      ev.push(x);
    });
    var acc = data.rows.filter(function (r) { return /^accreditation$/i.test(r.program) && r.start && !r.cancelled; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
    var rng = function (r, ar) { var a = parts(r.start), b = parts(r.end || r.start); var M = ar ? MON_AR : MON_EN; return a.d + '–' + b.d + ' ' + M[b.m - 1] + ' ' + b.y; };
    if (acc.length) {
      var f = acc[0], l = acc[acc.length - 1];
      ev.push({ cat: 'acc', id: 'ACC-OPEN', start: f.start, en: 'Accreditation exam windows open', ar: 'انطلاق فترات اختبارات الاعتماد', men: 'First window: ' + rng(f), mar: 'الفترة الأولى: ' + rng(f, true) });
      ev.push({ cat: 'acc', id: 'ACC-CLOSE', start: l.end || l.start, en: 'Final accreditation window closes', ar: 'ختام فترات اختبارات الاعتماد', men: 'Last window: ' + rng(l), mar: 'الفترة الأخيرة: ' + rng(l, true) });
    }
    if (!ev.length) return;
    DATA.events.length = 0; ev.forEach(function (e) { DATA.events.push(e); });
    if (data.off.length) { DATA.off.length = 0; data.off.forEach(function (o) { DATA.off.push(o); }); }
    var ms = DATA.events.map(function (e) { return e.start.slice(0, 7); }).concat(DATA.months).sort();
    var out = [], p = parts(ms[0] + '-01'), y = p.y, m = p.m, last = ms[ms.length - 1];
    while ((y + '-' + pad(m)) <= last) { out.push(y + '-' + pad(m)); m++; if (m > 12) { m = 1; y++; } }
    DATA.months.length = 0; out.forEach(function (x) { DATA.months.push(x); });
    render();
  }

  /* ---------- Product + In-Person events ---------- */
  function patchEventList(data) {
    var by = {}; data.rows.forEach(function (r) { if (r.key) by[r.key] = r; });
    var dict = {};
    DATA.forEach(function (e) { ['title', 'kicker', 'place', 'audience'].forEach(function (k) { if (e[k] && e[k].en) dict[e[k].en] = e[k].ar; }); });
    var keep = [];
    DATA.forEach(function (e) {
      var r = by[CFG.id + '-' + e.id];
      if (!r) { keep.push(e); return; }
      if (r.cancelled) return;
      if (r.start) { e.start = r.exact ? r.start : r.start.slice(0, 7); if (r.exact && r.end && r.end !== r.start) e.end = r.end; else delete e.end; }
      var set = function (k, val) { if (!val) return; if (!e[k]) e[k] = { en: val, ar: dict[val] || val }; else if (clean(e[k].en) !== clean(val)) { e[k] = { en: val, ar: dict[val] || val }; } };
      if (r.title && (!e.title || clean(e.title.en) !== r.title)) e.title = { en: r.title, ar: r.titleAr || r.title };
      set('kicker', r.host); set('place', r.loc); set('audience', r.aud);
      keep.push(e);
    });
    DATA.length = 0; keep.forEach(function (e) { DATA.push(e); });
    render();
  }

  /* ---------- run ---------- */
  function applyLinks(links) {
    if (typeof window.CLASSERA_LINKS_APPLY === 'function') window.CLASSERA_LINKS_APPLY(links);
  }
  function fallback() { if (typeof window.CLASSERA_LINKS_FALLBACK === 'function') window.CLASSERA_LINKS_FALLBACK(); }
  function run() {
    load().then(function (data) {
      try {
        var pdCard = document.querySelector('article.item h3 a[data-link^="pd-"]'), enrCard = document.querySelector('article.item h3 a[data-link^="enr-"]');
        if (pdCard) patchCards(data, 'pd');
        else if (enrCard) patchCards(data, 'enr');
        else if (typeof DATA !== 'undefined' && DATA && DATA.events && typeof render === 'function') patchCalendar(data);
        else if (typeof DATA !== 'undefined' && Array.isArray(DATA) && DATA[0] && DATA[0].p && typeof render === 'function') patchAccreditation(data);
        else if (typeof CFG !== 'undefined' && CFG && CFG.id && Array.isArray(DATA) && typeof render === 'function') patchEventList(data);
      } catch (e) { if (window.console) console.warn('[tracker] page update skipped:', e); }
      applyLinks(data.links);
      var pending = false;
      new MutationObserver(function () { if (pending) return; pending = true; setTimeout(function () { pending = false; applyLinks(data.links); }, 60); })
        .observe(document.body, { childList: true, subtree: true });
      document.documentElement.setAttribute('data-tracker', 'live');
    }).catch(function (e) {
      if (window.console) console.warn('[tracker] events-tracker.xlsx not used:', e && e.message);
      document.documentElement.setAttribute('data-tracker', 'fallback');
      fallback();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
