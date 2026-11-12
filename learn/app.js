/* PS Training HUB front end. No build step. Talks to the Apps Script JSON API (config.js). */
(function () {
  'use strict';
  var CFG = window.PSHUB || {};
  var MOCK = !CFG.API_URL || CFG.API_URL === 'mock';
  var FLOW = { 'Requested': ['Under review', 'Rejected'], 'Under review': ['Approved', 'Rejected', 'Requested'], 'Approved': ['Scheduled', 'Rejected'], 'Scheduled': ['Delivered', 'Rejected'], 'Delivered': ['Closed'], 'Closed': ['Certified'], 'Certified': [], 'Rejected': [] };
  var NEEDS = { 'Approved': 60, 'Rejected': 60, 'Scheduled': 60, 'Certified': 60 };
  var LEVEL = { 'Super Admin': 100, 'Admin': 80, 'Manager': 60, 'PS Supervisor': 40 };
  var PATHS = ['Teacher', 'Admin', 'School', 'Other'];
  var PATH_NOTE = { Teacher: 'Teacher accreditation program', Admin: 'System administrator program', School: 'School program: Silver, Gold, Diamond Tech School', Other: 'Activation supervisor and trainer' };

  var I18N = {
    en: { dashboard: 'Dashboard', platforms: 'Platforms', certificates: 'Certificates', clients: 'Clients', requests: 'Training Requests', actions: 'Actions', reports: 'Reports', users: 'Users', settings: 'Settings', search: 'Search clients, certificates, requests...', refresh: 'Refresh', print: 'Print', export: 'Export CSV', logout: 'Log out', changepw: 'Change password', login: 'LOGIN', user: 'Username', pass: 'Password', remember: 'Remember me', forgot: 'Forgot password?', forgotmsg: 'Ask a PS Training HUB admin to reset your password.' },
    ar: { dashboard: 'لوحة التحكم', platforms: 'المنصات', certificates: 'الشهادات', clients: 'العملاء', requests: 'طلبات التدريب', actions: 'الإجراءات', reports: 'التقارير', users: 'المستخدمون', settings: 'الإعدادات', search: 'ابحث في العملاء والشهادات والطلبات...', refresh: 'تحديث', print: 'طباعة', export: 'تصدير CSV', logout: 'تسجيل الخروج', changepw: 'تغيير كلمة المرور', login: 'دخول', user: 'اسم المستخدم', pass: 'كلمة المرور', remember: 'تذكرني', forgot: 'نسيت كلمة المرور؟', forgotmsg: 'اطلب من مسؤول المنصة إعادة تعيين كلمة المرور.' }
  };
  var S = { token: null, user: null, theme: 'dark', lang: 'en', route: 'dashboard', cache: {}, collapsed: false };
  function t(k) { return (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { } }

  // ---------- tiny DOM helper (text is always set via textContent, never innerHTML)
  function h(tag, attrs) {
    var el = document.createElement(tag), kids = Array.prototype.slice.call(arguments, 2);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]; if (v === false || v == null) return;
      if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else if (k === 'class') el.className = v; else if (k === 'value') el.value = v; else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) { list.forEach(function (c) { if (c == null || c === false) return; if (Array.isArray(c)) add(c); else el.appendChild(c.nodeType ? c : document.createTextNode(String(c))); }); })(kids);
    return el;
  }
  function toast(msg, bad) { var x = h('div', { class: 'toast' + (bad ? ' e' : '') }, msg); document.getElementById('toasts').appendChild(x); setTimeout(function () { x.remove(); }, 4500); }
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* count-up for plain numbers like 462, 16,648 or 49.3% (700 ms, decelerating); anything else is left as is */
  function countUp(el, text) {
    var m = /^([\d,]+(?:\.\d+)?)(%?)$/.exec(String(text)); el.textContent = text;
    if (!m || REDUCED) return;
    var to = parseFloat(m[1].replace(/,/g, '')), dec = (m[1].split('.')[1] || '').length, suf = m[2], t0 = null;
    function fmt(v) { return dec ? v.toFixed(dec) : Math.round(v).toLocaleString() + ''; }
    el.textContent = fmt(0) + suf;
    function step(ts) { if (t0 === null) t0 = ts; var k = Math.min(1, (ts - t0) / 700), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e) + suf; if (k < 1) requestAnimationFrame(step); else el.textContent = text; }
    requestAnimationFrame(step);
  }
  function ring(frac, color) {
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 36 36'); svg.setAttribute('class', 'ring');
    var bg = document.createElementNS(ns, 'circle'), fg = document.createElementNS(ns, 'circle');
    [bg, fg].forEach(function (c) { c.setAttribute('cx', 18); c.setAttribute('cy', 18); c.setAttribute('r', 15.9); c.setAttribute('fill', 'none'); c.setAttribute('stroke-width', 3.6); });
    bg.setAttribute('stroke', 'var(--line)'); fg.setAttribute('stroke', color || 'var(--ok)'); fg.setAttribute('pathLength', 100); fg.setAttribute('stroke-linecap', 'round'); fg.setAttribute('transform', 'rotate(-90 18 18)'); fg.style.strokeDasharray = Math.max(0, Math.min(1, frac)) * 100 + ' 100';
    svg.appendChild(bg); svg.appendChild(fg); return svg;
  }
  function lvl() { return S.user ? (LEVEL[S.user.role] || 0) : 0; }
  function num(n) { return Number(n || 0).toLocaleString(); }
  function pct(n) { return (Number(n || 0) * 100).toFixed(1) + '%'; }

  // ---------- API
  function api(action, params) {
    if (MOCK) return mockApi(action, params || {});
    var body = JSON.stringify(Object.assign({ action: action, token: S.token }, params || {}));
    return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) { if (/expired|not signed/i.test(j.error)) { doLogout(true); } throw new Error(j.error || 'Request failed'); } return j.data; });
  }
  function load(key, action, params, force) {
    if (!force && S.cache[key]) return Promise.resolve(S.cache[key]);
    return api(action, params).then(function (d) { S.cache[key] = d; return d; });
  }

  // ---------- theme / language
  function applyPrefs() {
    document.documentElement.setAttribute('data-theme', S.theme);
    document.documentElement.setAttribute('dir', S.lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', S.lang);
  }
  function initPrefs() {
    S.theme = ls('pshub.theme') || 'dark'; // dark by default, like the CRM; the user's choice is remembered
    S.lang = ls('pshub.lang') || 'en'; applyPrefs();
  }
  function toggleTheme() { var d = document.documentElement; d.classList.add('theme-anim'); setTimeout(function () { d.classList.remove('theme-anim'); }, 350); S.theme = S.theme === 'dark' ? 'light' : 'dark'; ls('pshub.theme', S.theme); applyPrefs(); }
  function toggleLang() { S.lang = S.lang === 'en' ? 'ar' : 'en'; ls('pshub.lang', S.lang); applyPrefs(); render(true); }

  // ---------- auth
  function storeToken(tok, remember) { S.token = tok; if (remember) { ls('pshub.token', tok); ss('pshub.token', null); } else { ss('pshub.token', tok); ls('pshub.token', null); } }
  function doLogout(silent) { if (S.token && !silent) api('logout').catch(function () { }); S.token = null; S.user = null; S.cache = {}; ls('pshub.token', null); ss('pshub.token', null); render(); }

  var recaptchaId = null;
  function loginView() {
    var err = h('div', { class: 'err' }), u = h('input', { type: 'text', placeholder: t('user'), autocomplete: 'username' }), p = h('input', { type: 'password', placeholder: t('pass'), autocomplete: 'current-password' });
    var rem = h('input', { type: 'checkbox', id: 'rem' }), go = h('button', { class: 'go', type: 'submit' }, t('login'));
    var cap = h('div', { id: 'captcha', style: 'margin:0 0 12px' });
    var eye = h('button', { type: 'button', title: 'Show', onclick: function () { p.type = p.type === 'password' ? 'text' : 'password'; } }, '👁');
    var form = h('form', { class: 'box', onsubmit: function (e) {
      e.preventDefault(); err.textContent = ''; go.disabled = true; go.textContent = '...';
      var captcha = ''; if (CFG.RECAPTCHA_SITE_KEY && window.grecaptcha && recaptchaId !== null) captcha = window.grecaptcha.getResponse(recaptchaId);
      if (CFG.RECAPTCHA_SITE_KEY && !captcha) { err.textContent = 'Please complete the CAPTCHA'; go.disabled = false; return; }
      api('login', { username: u.value, password: p.value, captcha: captcha, remember: rem.checked }).then(function (d) {
        storeToken(d.token, rem.checked); S.user = d.user; p.value = ''; render();
      }).catch(function (x) { err.textContent = x.message; go.disabled = false; go.textContent = t('login'); form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); if (window.grecaptcha && recaptchaId !== null) window.grecaptcha.reset(recaptchaId); });
    } },
      h('div', { class: 'brand' }, h('div', { class: 'logo' }, 'C'), h('div', {}, h('b', {}, 'Classera®'), h('small', {}, 'The Learning Super Platform'))),
      h('h1', {}, 'Login to', h('br'), 'PS Training HUB'),
      u, h('div', { class: 'pw' }, p, eye), cap, err,
      h('div', { class: 'row' }, h('label', {}, rem, ' ' + t('remember')), h('a', { href: '#', style: 'color:#cfe0ff', onclick: function (e) { e.preventDefault(); toast(t('forgotmsg')); } }, t('forgot'))),
      go, h('div', { class: 'foot' }, 'Enterprise Classera Portal • Authorized Personnel Only'),
      h('div', { class: 'foot' }, h('a', { href: '#', style: 'color:#cfe0ff', onclick: function (e) { e.preventDefault(); toggleLang(); } }, S.lang === 'en' ? 'العربية' : 'English'), ' · ', h('a', { href: '#', style: 'color:#cfe0ff', onclick: function (e) { e.preventDefault(); toggleTheme(); } }, S.theme === 'dark' ? 'Light' : 'Dark')));
    setTimeout(function () {
      if (!CFG.RECAPTCHA_SITE_KEY) return;
      function mount() { if (window.grecaptcha && window.grecaptcha.render && document.getElementById('captcha')) { recaptchaId = window.grecaptcha.render('captcha', { sitekey: CFG.RECAPTCHA_SITE_KEY }); } else setTimeout(mount, 400); }
      if (!window.grecaptcha) { var s = document.createElement('script'); s.src = 'https://www.google.com/recaptcha/api.js?render=explicit'; s.async = true; document.head.appendChild(s); }
      mount();
    }, 0);
    return h('div', { class: 'login' }, form);
  }

  function modal(content) { var m = h('div', { class: 'modal', onclick: function (e) { if (e.target === m) m.remove(); } }, h('div', { class: 'card' }, content)); document.body.appendChild(m); return m; }
  function strength(v) { var s = 0; if (v.length >= 10) s++; if (v.length >= 14) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++; return s; }
  function passwordDialog(forced) {
    var old = h('input', { type: 'password', autocomplete: 'current-password' }), n1 = h('input', { type: 'password', autocomplete: 'new-password' }), n2 = h('input', { type: 'password', autocomplete: 'new-password' });
    var mi = h('i', { style: 'width:0;background:var(--bad)' }), err = h('div', { class: 'err', style: 'color:var(--bad)' });
    n1.addEventListener('input', function () { var s = strength(n1.value); mi.style.width = (s * 20) + '%'; mi.style.background = s < 3 ? 'var(--bad)' : s < 5 ? 'var(--warn)' : 'var(--ok)'; });
    var m = modal(h('div', { class: 'f' }, h('h3', {}, forced ? 'Set a new password' : t('changepw')), forced ? h('p', { class: 'sub' }, 'Your password is temporary. Choose a new one to continue.') : null,
      h('label', {}, 'Current password'), old, h('label', {}, 'New password (min 10 characters)'), n1, h('div', { class: 'meter' }, mi), h('label', {}, 'Confirm new password'), n2, err,
      h('div', { style: 'margin-top:14px;display:flex;gap:8px;justify-content:flex-end' }, forced ? null : h('button', { class: 'btn', onclick: function () { m.remove(); } }, 'Cancel'),
        h('button', { class: 'btn p', onclick: function () {
          err.textContent = ''; if (n1.value.length < 10) { err.textContent = 'Use at least 10 characters'; return; } if (n1.value !== n2.value) { err.textContent = 'Passwords do not match'; return; }
          api('changePassword', { oldPassword: old.value, newPassword: n1.value }).then(function (d) { storeToken(d.token, !!ls('pshub.token')); S.user.mustChange = false; m.remove(); toast('Password changed'); render(); }).catch(function (x) { err.textContent = x.message; });
        } }, 'Save'))));
    if (forced) m.onclick = null;
  }

  // ---------- layout
  var NAV = [['dashboard', '▦'], ['platforms', '◎'], ['certificates', '✔'], ['clients', '🏫'], ['requests', '🗓'], ['actions', '☑'], ['reports', '📊'], ['users', '👥'], ['settings', '⚙']];
  function shell() {
    var counts = S.cache.counts || {};
    var side = h('nav', { class: 'side' }, NAV.filter(function (n) { return n[0] !== 'users' || lvl() >= 80; }).map(function (n) {
      var badge = n[0] === 'requests' && counts.req ? h('span', { class: 'n', style: 'background:var(--active)' }, counts.req) : n[0] === 'actions' && counts.overdue ? h('span', { class: 'n' }, counts.overdue) : null;
      return h('a', { href: '#/' + n[0], class: S.route === n[0] ? 'on' : '' }, h('span', { class: 'ic' }, n[1]), h('span', { class: 'l' }, t(n[0])), badge);
    }), h('div', { class: 'ver' }, 'v1.0 · Sheets-backed'));
    var menu = null;
    var chip = h('div', { class: 'chip', onclick: function () {
      if (menu) { menu.remove(); menu = null; return; }
      menu = h('div', { class: 'menu' }, h('button', { onclick: function () { passwordDialog(false); } }, t('changepw')), h('button', { onclick: function () { doLogout(); } }, t('logout'))); chip.appendChild(menu);
    } }, h('div', { class: 'av' }, (S.user.name || '?').charAt(0).toUpperCase()), h('span', {}, S.user.email || S.user.username, ' — ' + S.user.role));
    var q = h('input', { placeholder: t('search'), onkeydown: function (e) { if (e.key === 'Enter' && q.value.trim()) { S.search = q.value.trim(); location.hash = '#/certificates'; render(); } } });
    var top = h('header', { class: 'top' },
      h('button', { class: 'pill', onclick: function () { S.collapsed = !S.collapsed; render(true); } }, '☰'),
      h('div', { class: 'brand' }, h('div', { class: 'logo' }, 'C'), h('div', {}, h('b', {}, 'Classera®'), h('small', {}, 'The Learning Super Platform'))),
      h('div', { class: 'title' }, 'PS Training HUB'), q,
      h('button', { class: 'pill', onclick: toggleLang }, S.lang === 'en' ? 'AR' : 'EN'),
      h('button', { class: 'pill', title: 'Theme', onclick: function () { toggleTheme(); render(true); } }, S.theme === 'dark' ? '☀' : '☾'), chip);
    var main = h('main', { class: 'main', id: 'main' });
    return { el: h('div', { class: 'shell' + (S.collapsed ? ' collapsed' : '') }, top, side, main), main: main };
  }
  function pickSup(n) { S.certState = { page: 1, path: '', status: '', q: n }; location.hash = '#/certificates'; }
  function head(title, sub, acts) { return h('div', { class: 'ph' }, h('div', {}, h('h2', {}, title), h('p', {}, sub || '')), h('div', { class: 'acts', style: 'display:flex;gap:8px' }, acts || [])); }
  function skeleton() { return h('div', { class: 'card' }, h('div', { class: 'sk', style: 'width:40%' }), h('div', { class: 'sk' }), h('div', { class: 'sk', style: 'width:70%' })); }
  function kpi(label, val, sub) { var v = h('div', { class: 'v' }); countUp(v, val); return h('div', { class: 'card kpi' }, h('div', { class: 'lb' }, label), v, h('div', { class: 's' }, sub || '')); }
  function pathKpi(p, r0) {
    var c = r0 ? kpi(p + ' path', pct(r0.validPct), num(r0.valid) + ' valid · ' + num(r0.expired) + ' expired') : kpi(p + ' path', '-', 'no data');
    c.classList.add('click'); c.title = 'Open ' + p + ' details'; c.tabIndex = 0;
    if (r0) { c.classList.add('hasring'); c.appendChild(ring(Number(r0.validPct))); }
    var go = function () { S.pathTab = p; location.hash = '#/platforms'; };
    c.addEventListener('click', go); c.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); }); return c;
  }
  function rankList(items, fmt, max, onPick) {
    if (!items.length) return h('div', { class: 'empty' }, 'No data yet');
    max = max || Math.max.apply(null, items.map(function (i) { return i.v; })) || 1;
    return h('div', {}, items.map(function (it, i) { return h('div', Object.assign({ class: 'rank' + (onPick ? ' pick' : '') }, onPick ? { title: 'Show certificates for ' + it.n, onclick: function () { onPick(it.n); } } : {}), h('span', { class: 'no' }, i + 1), h('span', { class: 'nm' }, it.n), h('span', { class: 'vl' }, fmt(it.v)), h('div', { class: 'bar' }, h('i', { style: 'width:' + Math.min(100, (it.v / max) * 100) + '%' }))); }));
  }
  function table(cols, rows, onRow) {
    return h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, cols.map(function (c) { return h('th', {}, c.h); }))),
      h('tbody', {}, rows.length ? rows.map(function (r) { var tr = h('tr', onRow ? { style: 'cursor:pointer', onclick: function () { onRow(r); } } : {}, cols.map(function (c) { var v = c.f ? c.f(r) : r[c.k]; return h('td', {}, v == null ? '' : v); })); return tr; }) : h('tr', {}, h('td', { colspan: cols.length, class: 'empty' }, 'Nothing to show')))));
  }
  function csv(rows, name) {
    if (!rows.length) { toast('Nothing to export', true); return; }
    var keys = Object.keys(rows[0]); function esc(v) { v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
    var out = '﻿' + keys.map(esc).join(',') + '\n' + rows.map(function (r) { return keys.map(function (k) { return esc(r[k]); }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'text/csv;charset=utf-8' })); a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  function exportBtn(dataset) { return h('button', { class: 'btn', onclick: function () { api('export', { dataset: dataset }).then(function (r) { csv(r, dataset); }).catch(function (e) { toast(e.message, true); }); } }, t('export')); }
  function pager(state, total, per, redraw) {
    var pages = Math.max(1, Math.ceil(total / per)); return h('div', { class: 'pager' }, h('button', { class: 'btn', disabled: state.page <= 1, onclick: function () { state.page--; redraw(); } }, '‹'), 'Page ' + state.page + ' of ' + pages + ' · ' + num(total) + ' rows', h('button', { class: 'btn', disabled: state.page >= pages, onclick: function () { state.page++; redraw(); } }, '›'));
  }

  // ---------- pages
  var PAGES = {};
  PAGES.dashboard = function (box) {
    box.appendChild(head(t('dashboard'), 'Partner Success overview · ' + new Date().toDateString(), [h('button', { class: 'btn', onclick: function () { S.cache = {}; render(); } }, '↻ ' + t('refresh'))]));
    var ph = skeleton(); box.appendChild(ph);
    Promise.all([load('hub', 'hub'), load('requests', 'requests'), load('actions', 'actions')]).then(function (r) {
      ph.remove(); var hub = r[0], sum = hub.summary, reqs = r[1], acts = r[2], today = new Date().toISOString().slice(0, 10);
      var open = reqs.filter(function (x) { return ['Certified', 'Rejected', 'Closed'].indexOf(x.status) < 0; }).length, overdue = acts.filter(function (a) { return a.status !== 'Done' && a.dueDate && a.dueDate < today; }).length;
      S.cache.counts = { req: open, overdue: overdue };
      var tot = sum.byPath.reduce(function (a, p) { return { p: a.p + Number(p.people), v: a.v + Number(p.valid) }; }, { p: 0, v: 0 });
      box.appendChild(h('div', { class: 'grid g4' }, kpi('Clients', num(sum.clients), 'projects in scope'), kpi('Valid certificates', tot.p ? pct(tot.v / tot.p) : '-', num(tot.v) + ' of ' + num(tot.p) + ' (all paths)'), kpi('Open requests', open, reqs.length + ' total'), kpi('Overdue actions', overdue, acts.length + ' actions')));
      box.appendChild(h('div', { class: 'grid g4' }, PATHS.map(function (p) { return pathKpi(p, sum.byPath.filter(function (x) { return x.path === p; })[0]); })));
      var sup = sum.bySupervisor.filter(function (x) { return x.path === 'Teacher'; }).sort(function (a, b) { return b.validPct - a.validPct; }).map(function (x) { return { n: x.supervisor, v: Number(x.validPct) }; });
      box.appendChild(h('div', { class: 'grid g2' }, h('div', { class: 'card' }, h('h3', {}, 'Teacher path: valid % by supervisor'), rankList(sup.slice(0, 10), pct, 1, pickSup)),
        h('div', { class: 'card' }, h('h3', {}, 'Quick links'), h('div', { class: 'links' }, hub.links.length ? hub.links.map(function (l) { var internal = String(l.url).charAt(0) === '#'; return h('a', { href: l.url, target: internal ? null : '_blank', rel: 'noopener' }, h('b', {}, l.title), h('div', { class: 'sub', style: 'margin:2px 0 0' }, l.group)); }) : h('div', { class: 'empty' }, 'No links configured')))));
      shellRefreshBadges();
    }).catch(fail(box, ph));
  };
  function shellRefreshBadges() { /* badges refresh on next render */ }
  function fail(box, ph) { return function (e) { if (ph) ph.remove(); box.appendChild(h('div', { class: 'card' }, h('b', {}, 'Could not load data'), h('p', { class: 'sub' }, e.message))); }; }

  PAGES.platforms = function (box) {
    box.appendChild(head(t('platforms'), 'Accreditation paths are reported separately. eLearning and Enrichment connect later.', [h('button', { class: 'btn', onclick: function () { S.cache.hub = null; S.cache.summary = null; render(); } }, '↻ ' + t('refresh'))]));
    var ph = skeleton(); box.appendChild(ph);
    load('summary', 'summary').then(function (sum) {
      ph.remove(); var cur = S.pathTab || 'Teacher'; var area = h('div');
      var tabs = h('div', { class: 'tabs' }, PATHS.map(function (p) { return h('button', { class: cur === p ? 'on' : '', onclick: function () { S.pathTab = p; render(); } }, p); }));
      box.appendChild(tabs); box.appendChild(area);
      var r0 = sum.byPath.filter(function (x) { return x.path === cur; })[0];
      area.appendChild(h('div', { class: 'grid g4' }, kpi('People with certificate', r0 ? num(r0.people) : '-', PATH_NOTE[cur]), kpi('Valid', r0 ? num(r0.valid) : '-', r0 ? pct(r0.validPct) : ''), kpi('Expired', r0 ? num(r0.expired) : '-', 'older than 3 years'), kpi('As of', r0 ? r0.asOf : '-', 'newest certificate per person in this path')));
      var rows = sum.bySupervisor.filter(function (x) { return x.path === cur; }).sort(function (a, b) { return b.validPct - a.validPct; });
      area.appendChild(h('div', { class: 'grid g2' }, h('div', { class: 'card' }, h('h3', {}, cur + ': valid % by supervisor'), rankList(rows.map(function (x) { return { n: x.supervisor, v: Number(x.validPct) }; }), pct, 1, pickSup)),
        h('div', { class: 'card' }, h('h3', {}, cur + ': valid vs expired'), rows.length ? rows.map(function (x) { var tot = Number(x.valid) + Number(x.expired) || 1; return h('div', { style: 'margin-bottom:10px' }, h('div', { style: 'display:flex;justify-content:space-between' }, h('span', {}, x.supervisor), h('span', { class: 'sub', style: 'margin:0' }, num(x.valid) + ' / ' + num(x.expired))), h('div', { class: 'bar2' }, h('div', { class: 'ok', style: 'width:' + (Number(x.valid) / tot * 100) + '%' }), h('div', { class: 'bad', style: 'width:' + (Number(x.expired) / tot * 100) + '%' }))); }) : h('div', { class: 'empty' }, 'No data yet'))));
      if (cur === 'School') area.appendChild(kpiCard(sum.kpi));
      box.appendChild(h('div', { class: 'grid g2' }, h('div', { class: 'card' }, h('h3', {}, 'eLearning platform'), h('div', { class: 'empty' }, 'Enrollment summary will appear here once the weekly export is loaded.')), h('div', { class: 'card' }, h('h3', {}, 'Enrichment platform'), h('div', { class: 'empty' }, 'Enrollment summary will appear here once the BigQuery summary is connected.'))));
    }).catch(fail(box, ph));
  };
  function kpiCard(rows) {
    return h('div', { class: 'card', style: 'margin-bottom:14px' }, h('h3', {}, 'School accreditation KPI (5% weight)'), h('p', { class: 'sub' }, 'Targets: 15% of schools reach L1 Silver, 7% L2 Gold, 2% L3 Diamond.'),
      table([{ h: 'Supervisor', k: 'supervisor' }, { h: 'Schools', f: function (r) { return num(r.schools); } }, { h: 'L1 Silver', f: function (r) { return r.L1 + ' (' + pct(r.L1pct) + ')'; } }, { h: 'L2 Gold', f: function (r) { return r.L2 + ' (' + pct(r.L2pct) + ')'; } }, { h: 'L3 Diamond', f: function (r) { return r.L3 + ' (' + pct(r.L3pct) + ')'; } }, { h: 'KPI score', f: function (r) { var s = Number(r.score5pct) * 100; return h('span', { class: 'tag ' + (s >= 4.99 ? 'ok' : s > 0 ? 'warn' : 'bad') }, s.toFixed(2) + '% of 5%'); } }], rows.slice().sort(function (a, b) { return b.score5pct - a.score5pct; })));
  }

  PAGES.certificates = function (box) {
    var st = S.certState = S.certState || { page: 1, path: '', status: '', q: '' };
    if (S.search) { st.q = S.search; S.search = null; st.page = 1; }
    box.appendChild(head(t('certificates'), 'Newest certificate per person per path. Valid for 3 years.', [exportBtn('certs')]));
    var tbl = h('div'), ph = skeleton();
    function draw(all) {
      var rows = all.filter(function (r) { return (!st.path || r.path === st.path) && (!st.status || r.status === st.status) && (!st.q || JSON.stringify(r).toLowerCase().indexOf(st.q.toLowerCase()) >= 0); });
      tbl.replaceChildren(table([{ h: 'Name', k: 'name' }, { h: 'Path', k: 'path' }, { h: 'Role', k: 'role' }, { h: 'School', k: 'school' }, { h: 'Country', k: 'country' }, { h: 'Course', k: 'course' }, { h: 'Issued', k: 'issueDate' }, { h: 'Expires', k: 'expiresOn' }, { h: 'Status', f: function (r) { return h('span', { class: 'tag ' + (r.status === 'Valid' ? 'ok' : 'bad') }, r.status); } }, { h: 'Supervisor', k: 'supervisor' }], rows.slice((st.page - 1) * 50, st.page * 50)), pager(st, rows.length, 50, function () { draw(all); }));
    }
    var q = h('input', { placeholder: 'Search', value: st.q, oninput: function () { st.q = q.value; st.page = 1; if (S.cache.certs) draw(S.cache.certs); } });
    var fp = h('select', { onchange: function () { st.path = fp.value; st.page = 1; draw(S.cache.certs); } }, h('option', { value: '' }, 'All paths'), PATHS.map(function (p) { return h('option', { value: p, selected: st.path === p }, p); }));
    var fs = h('select', { onchange: function () { st.status = fs.value; st.page = 1; draw(S.cache.certs); } }, h('option', { value: '' }, 'All statuses'), ['Valid', 'Expired'].map(function (p) { return h('option', { value: p, selected: st.status === p }, p); }));
    box.appendChild(h('div', { class: 'filters' }, q, fp, fs)); box.appendChild(h('div', { class: 'card' }, ph, tbl));
    load('certs', 'certs', { filter: {} }).then(function (all) { ph.remove(); draw(all); }).catch(fail(box, ph));
  };

  PAGES.clients = function (box) {
    var st = S.clientState = S.clientState || { page: 1, q: '', sup: '', country: '' };
    box.appendChild(head(t('clients'), 'Projects from the CRM. Supervisors only see their own clients.', [exportBtn('clients')]));
    var tbl = h('div'), ph = skeleton();
    function draw(all) {
      var rows = all.filter(function (r) { return (!st.sup || r['Assigned To'] === st.sup) && (!st.country || r.Country === st.country) && (!st.q || JSON.stringify(r).toLowerCase().indexOf(st.q.toLowerCase()) >= 0); });
      tbl.replaceChildren(table([{ h: 'Project', k: 'Project Name' }, { h: 'Supervisor', k: 'Assigned To' }, { h: 'Country', k: 'Country' }, { h: 'Status', k: 'Status' }, { h: 'Plan', k: 'Classera Plan' }, { h: 'Students', f: function (r) { return num(r.Students); } }, { h: 'Teachers', f: function (r) { return num(r.Teachers); } }, { h: 'Group ID', k: 'School Group ID' }], rows.slice((st.page - 1) * 50, st.page * 50), function (r) {
        modal(h('div', {}, h('h3', {}, r['Project Name']), h('div', { class: 'tw', style: 'max-height:60vh' }, h('table', {}, Object.keys(r).filter(function (k) { return r[k] !== '' && r[k] != null; }).map(function (k) { return h('tr', {}, h('th', {}, k), h('td', {}, String(r[k]))); })))));
      }), pager(st, rows.length, 50, function () { draw(all); }));
    }
    load('clients', 'clients').then(function (all) {
      ph.remove(); function uniq(k) { return Object.keys(all.reduce(function (a, r) { if (r[k]) a[r[k]] = 1; return a; }, {})).sort(); }
      var q = h('input', { placeholder: 'Search', value: st.q, oninput: function () { st.q = q.value; st.page = 1; draw(all); } });
      var fs = h('select', { onchange: function () { st.sup = fs.value; st.page = 1; draw(all); } }, h('option', { value: '' }, 'All supervisors'), uniq('Assigned To').map(function (v) { return h('option', { value: v, selected: st.sup === v }, v); }));
      var fc = h('select', { onchange: function () { st.country = fc.value; st.page = 1; draw(all); } }, h('option', { value: '' }, 'All countries'), uniq('Country').map(function (v) { return h('option', { value: v, selected: st.country === v }, v); }));
      box.insertBefore(h('div', { class: 'filters' }, q, fs, fc), box.lastChild); draw(all);
    }).catch(fail(box, ph));
    box.appendChild(h('div', { class: 'card' }, ph, tbl));
  };

  PAGES.requests = function (box) {
    box.appendChild(head(t('requests'), 'Request, 72-hour notice, approval, session, attendance, survey and certificate.', [h('button', { class: 'btn p', onclick: function () { requestForm(); } }, '+ New request'), exportBtn('requests')]));
    var ph = skeleton(); box.appendChild(ph);
    load('requests', 'requests', null, true).then(function (rows) {
      ph.remove(); var statuses = Object.keys(FLOW);
      box.appendChild(h('div', { class: 'tabs' }, statuses.map(function (s) { return h('span', { class: 'tag blue' }, s + ' ' + rows.filter(function (r) { return r.status === s; }).length); })));
      box.appendChild(h('div', { class: 'card' }, table([{ h: 'ID', k: 'id' }, { h: 'Client', k: 'client' }, { h: 'Platform', k: 'platform' }, { h: 'Audience', k: 'audience' }, { h: 'Start', k: 'preferredStart' }, { h: '72h', f: function (r) { return h('span', { class: 'tag ' + (r.noticeOk === 'Yes' ? 'ok' : 'warn') }, r.noticeOk || ''); } }, { h: 'Supervisor', k: 'supervisor' }, { h: 'Status', f: function (r) { return h('span', { class: 'tag blue' }, r.status); } }], rows.slice().reverse(), requestDetail)));
    }).catch(fail(box, ph));
  };
  function requestForm() {
    var f = {}; function inp(k, label, type, opts) { var el = opts ? h('select', {}, opts.map(function (o) { return h('option', { value: o }, o); })) : h('input', { type: type || 'text' }); f[k] = el; return [h('label', {}, label), el]; }
    var warn = h('div', { class: 'warnbox', style: 'display:none' }, 'Less than 72 hours notice. An exception reason is required.'), err = h('div', { class: 'err', style: 'color:var(--bad)' });
    var body = h('div', { class: 'f' }, h('h3', {}, 'New training request'), inp('client', 'Client / school group'), h('div', { class: 'two' }, h('div', {}, inp('country', 'Country')), h('div', {}, inp('platform', 'Platform', null, ['eLearning', 'Enrichment', 'Accreditation', 'Other']))),
      h('div', { class: 'two' }, h('div', {}, inp('audience', 'Audience')), h('div', {}, inp('attendees', 'Expected attendees', 'number'))), h('div', { class: 'two' }, h('div', {}, inp('mode', 'Delivery mode', null, ['Online', 'On site'])), h('div', {}, inp('language', 'Language', null, ['Arabic', 'English']))),
      h('div', { class: 'two' }, h('div', {}, inp('preferredStart', 'Preferred start', 'datetime-local')), h('div', {}, inp('hours', 'Duration (hours)', 'number'))), warn, inp('exceptionReason', 'Exception reason (only if less than 72 hours)'), err);
    f.preferredStart.addEventListener('input', function () { var d = new Date(f.preferredStart.value); warn.style.display = (d - Date.now()) / 36e5 < 72 ? 'block' : 'none'; });
    var m = modal(h('div', {}, body, h('div', { style: 'margin-top:14px;display:flex;gap:8px;justify-content:flex-end' }, h('button', { class: 'btn', onclick: function () { m.remove(); } }, 'Cancel'), h('button', { class: 'btn p', onclick: function () {
      var rec = {}; Object.keys(f).forEach(function (k) { rec[k] = f[k].value; }); if (!rec.client || !rec.preferredStart) { err.textContent = 'Client and preferred start are required'; return; }
      api('saveRequest', { record: rec }).then(function () { m.remove(); toast('Request created'); S.cache.requests = null; render(); }).catch(function (e) { err.textContent = e.message; });
    } }, 'Submit'))));
  }
  function requestDetail(r) {
    var note = h('input', { placeholder: 'Note (optional)' }), err = h('div', { class: 'err', style: 'color:var(--bad)' });
    var next = FLOW[r.status] || [];
    var m = modal(h('div', { class: 'f' }, h('h3', {}, r.id + ' · ' + r.client), h('p', { class: 'sub' }, r.status + ' · ' + (r.platform || '') + ' · ' + (r.preferredStart || '')),
      h('div', { class: 'tw', style: 'max-height:40vh' }, h('table', {}, Object.keys(r).filter(function (k) { return r[k] !== '' && r[k] != null; }).map(function (k) { return h('tr', {}, h('th', {}, k), h('td', {}, String(r[k]))); }))),
      next.length ? [h('label', {}, 'Move to'), note, err, h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px' }, next.map(function (s) { var ok = lvl() >= (NEEDS[s] || 40); return h('button', { class: 'btn ' + (s === 'Rejected' ? 'd' : 'p'), disabled: !ok, title: ok ? '' : 'Manager or above', onclick: function () { api('setRequestStatus', { id: r.id, status: s, note: note.value }).then(function () { m.remove(); toast('Status: ' + s); S.cache.requests = null; render(); }).catch(function (e) { err.textContent = e.message; }); } }, s); }))] : h('p', { class: 'sub' }, 'No further steps.')));
  }

  PAGES.actions = function (box) {
    box.appendChild(head(t('actions'), 'Follow-up tasks assigned by managers and supervisors.', [h('button', { class: 'btn p', onclick: function () { actionForm(); } }, '+ New action'), exportBtn('actions')]));
    var ph = skeleton(); box.appendChild(ph);
    load('actions', 'actions', null, true).then(function (rows) {
      ph.remove(); var today = new Date().toISOString().slice(0, 10);
      box.appendChild(h('div', { class: 'card' }, table([{ h: 'ID', k: 'id' }, { h: 'Title', k: 'title' }, { h: 'Assignee', k: 'assignee' }, { h: 'Related', f: function (r) { return (r.relatedType || '') + ' ' + (r.relatedId || ''); } }, { h: 'Due', f: function (r) { var late = r.status !== 'Done' && r.dueDate && r.dueDate < today; return h('span', { class: late ? 'tag bad' : '' }, r.dueDate || ''); } }, { h: 'Status', f: function (r) { return h('span', { class: 'tag ' + (r.status === 'Done' ? 'ok' : r.status === 'In progress' ? 'warn' : 'blue') }, r.status); } }], rows, function (r) { actionForm(r); })));
    }).catch(fail(box, ph));
  };
  function actionForm(rec) {
    rec = rec || {}; var f = {}; function inp(k, label, type, opts) { var el = opts ? h('select', {}, opts.map(function (o) { return h('option', { value: o, selected: rec[k] === o }, o); })) : h('input', { type: type || 'text', value: rec[k] || '' }); f[k] = el; return [h('label', {}, label), el]; }
    var err = h('div', { class: 'err', style: 'color:var(--bad)' });
    var m = modal(h('div', { class: 'f' }, h('h3', {}, rec.id ? 'Edit ' + rec.id : 'New action'), inp('title', 'Title'), lvl() >= 60 ? inp('assignee', 'Assignee (username)') : null, h('div', { class: 'two' }, h('div', {}, inp('relatedType', 'Related to', null, ['', 'Request', 'Client', 'Certificate'])), h('div', {}, inp('relatedId', 'Related ID'))), h('div', { class: 'two' }, h('div', {}, inp('dueDate', 'Due date', 'date')), h('div', {}, inp('status', 'Status', null, ['Open', 'In progress', 'Done']))), inp('note', 'Note'), err,
      h('div', { style: 'margin-top:14px;display:flex;gap:8px;justify-content:flex-end' }, h('button', { class: 'btn', onclick: function () { m.remove(); } }, 'Cancel'), h('button', { class: 'btn p', onclick: function () {
        var out = { id: rec.id }; Object.keys(f).forEach(function (k) { out[k] = f[k].value; }); if (!out.title) { err.textContent = 'Title is required'; return; }
        api('saveAction', { record: out }).then(function () { m.remove(); toast('Saved'); S.cache.actions = null; render(); }).catch(function (e) { err.textContent = e.message; });
      } }, 'Save'))));
  }

  PAGES.reports = function (box) {
    box.appendChild(head(t('reports'), 'Performance across the Partner Success operation', [h('button', { class: 'btn', onclick: function () { window.print(); } }, t('print'))]));
    var ph = skeleton(); box.appendChild(ph);
    load('summary', 'summary').then(function (sum) {
      ph.remove(); box.appendChild(h('div', { class: 'grid g4' }, PATHS.map(function (p) {
        var r0 = sum.byPath.filter(function (x) { return x.path === p; })[0]; var tot = r0 ? Number(r0.valid) + Number(r0.expired) || 1 : 1;
        return h('div', { class: 'card' }, h('h3', {}, p + ' path'), h('div', { class: 'kpi' }, h('div', { class: 'v' }, r0 ? pct(r0.validPct) : '-')), h('div', { class: 'bar2' }, r0 ? [h('div', { class: 'ok', style: 'width:' + (Number(r0.valid) / tot * 100) + '%' }), h('div', { class: 'bad', style: 'width:' + (Number(r0.expired) / tot * 100) + '%' })] : null), h('p', { class: 'sub' }, r0 ? num(r0.valid) + ' valid, ' + num(r0.expired) + ' expired' : 'no data'));
      }))); box.appendChild(kpiCard(sum.kpi));
      var pathsSel = h('div', { class: 'card' }, h('h3', {}, 'Supervisor valid % by path'), table([{ h: 'Supervisor', k: 'supervisor' }, { h: 'Path', k: 'path' }, { h: 'People', f: function (r) { return num(r.people); } }, { h: 'Valid', f: function (r) { return num(r.valid); } }, { h: 'Expired', f: function (r) { return num(r.expired); } }, { h: 'Valid %', f: function (r) { return pct(r.validPct); } }], sum.bySupervisor.slice().sort(function (a, b) { return a.supervisor < b.supervisor ? -1 : 1; })));
      box.appendChild(pathsSel);
    }).catch(fail(box, ph));
  };

  PAGES.users = function (box) {
    if (lvl() < 80) { box.appendChild(h('div', { class: 'empty' }, 'Not allowed for your role')); return; }
    box.appendChild(head(t('users'), 'Roles: Super Admin, Admin, Manager, PS Supervisor', [h('button', { class: 'btn p', onclick: function () { userForm(); } }, '+ Add user'), h('button', { class: 'btn', onclick: function () { api('runPipeline').then(function (r) { toast('Data refreshed: ' + r.certificates + ' certificates'); S.cache = {}; }).catch(function (e) { toast(e.message, true); }); } }, 'Refresh data')]));
    var ph = skeleton(); box.appendChild(ph);
    load('users', 'users', null, true).then(function (rows) {
      ph.remove(); box.appendChild(h('div', { class: 'card' }, table([{ h: 'Username', k: 'username' }, { h: 'Name', k: 'name' }, { h: 'Role', k: 'role' }, { h: 'Email', k: 'email' }, { h: 'Active', f: function (r) { return h('span', { class: 'tag ' + (String(r.active).toUpperCase() === 'FALSE' ? 'bad' : 'ok') }, String(r.active).toUpperCase() === 'FALSE' ? 'No' : 'Yes'); } }, { h: '', f: function (r) { return h('button', { class: 'btn', onclick: function (e) { e.stopPropagation(); if (!confirm('Reset password for ' + r.username + '?')) return; api('resetPassword', { id: r.id }).then(function (d) { showTemp(r.username, d.temporaryPassword); }).catch(function (x) { toast(x.message, true); }); } }, 'Reset'); } }], rows, userForm)));
    }).catch(fail(box, ph));
  };
  function showTemp(user, pw) { var m = modal(h('div', {}, h('h3', {}, 'Temporary password for ' + user), h('p', { class: 'sub' }, 'Shown once. The user must change it at first login.'), h('div', { class: 'card', style: 'font-family:monospace;font-size:18px;text-align:center' }, pw), h('div', { style: 'margin-top:12px;display:flex;gap:8px;justify-content:flex-end' }, h('button', { class: 'btn', onclick: function () { navigator.clipboard && navigator.clipboard.writeText(pw); toast('Copied'); } }, 'Copy'), h('button', { class: 'btn p', onclick: function () { m.remove(); } }, 'Done')))); }
  function userForm(rec) {
    rec = rec || {}; var f = {}; function inp(k, label, opts) { var el = opts ? h('select', {}, opts.map(function (o) { return h('option', { value: o, selected: rec[k] === o }, o); })) : h('input', { value: rec[k] || '' }); f[k] = el; return [h('label', {}, label), el]; }
    var roles = ['PS Supervisor', 'Manager', 'Admin'].concat(S.user.role === 'Super Admin' ? ['Super Admin'] : []), err = h('div', { class: 'err', style: 'color:var(--bad)' });
    var m = modal(h('div', { class: 'f' }, h('h3', {}, rec.id ? 'Edit ' + rec.username : 'Add user'), inp('username', 'Username'), inp('name', 'Full name (supervisors: exactly as in CRM "Assigned To")'), inp('role', 'Role', roles), inp('email', 'Email'), inp('active', 'Active', ['TRUE', 'FALSE']), err,
      h('div', { style: 'margin-top:14px;display:flex;gap:8px;justify-content:flex-end' }, h('button', { class: 'btn', onclick: function () { m.remove(); } }, 'Cancel'), h('button', { class: 'btn p', onclick: function () {
        var out = { id: rec.id }; Object.keys(f).forEach(function (k) { out[k] = f[k].value; }); if (!out.username || !out.name) { err.textContent = 'Username and name are required'; return; }
        api('saveUser', { record: out }).then(function (d) { m.remove(); S.cache.users = null; if (d.temporaryPassword) showTemp(out.username, d.temporaryPassword); else toast('Saved'); render(); }).catch(function (e) { err.textContent = e.message; });
      } }, 'Save'))));
  }
  PAGES.settings = function (box) {
    box.appendChild(head(t('settings'), 'Account and preferences'));
    box.appendChild(h('div', { class: 'grid g2' }, h('div', { class: 'card' }, h('h3', {}, 'Account'), h('p', {}, S.user.name + ' · ' + S.user.role), h('p', { class: 'sub' }, S.user.username), h('button', { class: 'btn', onclick: function () { passwordDialog(false); } }, t('changepw'))),
      h('div', { class: 'card' }, h('h3', {}, 'Preferences'), h('div', { style: 'display:flex;gap:8px' }, h('button', { class: 'btn', onclick: function () { toggleTheme(); render(true); } }, 'Theme: ' + S.theme), h('button', { class: 'btn', onclick: toggleLang }, 'Language: ' + S.lang.toUpperCase())))));
  };

  // ---------- router / render
  function route() { var r = (location.hash || '#/dashboard').replace('#/', '') || 'dashboard'; S.route = PAGES[r] ? r : 'dashboard'; }
  function render(quiet) {
    applyPrefs(); var root = document.getElementById('app'); root.replaceChildren(); route();
    if (!S.token) { root.appendChild(loginView()); return; }
    if (!S.user) { root.appendChild(h('div', { class: 'login' }, h('div', { class: 'box' }, 'Loading...'))); api('me').then(function (u) { S.user = u; render(); }).catch(function () { doLogout(true); }); return; }
    var sh = shell(); if (quiet) sh.main.setAttribute('data-quiet', '1'); root.appendChild(sh.el);
    if (S.user.mustChange) { passwordDialog(true); return; }
    PAGES[S.route](sh.main);
  }
  window.addEventListener('hashchange', render);

  // ---------- demo data (only used when API_URL is empty or "mock")
  function mockApi(action, p) {
    var sup = ['Rehab Negm', 'Wafaa Ibrahim', 'Abdelaziz Shahin', 'Tamer Lithey'];
    var D = {
      login: function () { if (p.username === 'demo' && p.password === 'demo') return { token: 'demo', user: { id: 'U1', username: 'demo', name: 'Demo Admin', role: 'Super Admin', email: 'demo@example.com', mustChange: false } }; throw new Error('Invalid username or password'); },
      me: function () { return { id: 'U1', username: 'demo', name: 'Demo Admin', role: 'Super Admin', email: 'demo@example.com', mustChange: false }; }, logout: function () { return true; }, changePassword: function () { return { token: 'demo' }; },
      summary: function () { return { clients: 462, byPath: [{ path: 'Teacher', people: 30893, valid: 15228, expired: 15665, validPct: 0.493, asOf: '2026-11-09' }, { path: 'Admin', people: 2416, valid: 1128, expired: 1288, validPct: 0.467, asOf: '2026-11-09' }, { path: 'School', people: 486, valid: 274, expired: 212, validPct: 0.564, asOf: '2026-11-09' }, { path: 'Other', people: 67, valid: 18, expired: 49, validPct: 0.269, asOf: '2026-11-09' }], bySupervisor: [].concat.apply([], PATHS.map(function (pp, i) { return sup.map(function (s, j) { var v = 200 + j * 80 + i * 10, e = 150 + j * 20; return { supervisor: s, path: pp, people: v + e, valid: v, expired: e, validPct: v / (v + e) }; }); })), kpi: sup.map(function (s, j) { return { supervisor: s, schools: 60 - j * 8, L1: 9 - j * 2, L2: 4 - j, L3: Math.max(0, 1 - j + 1), L1pct: (9 - j * 2) / (60 - j * 8), L2pct: (4 - j) / (60 - j * 8), L3pct: Math.max(0, 2 - j) / (60 - j * 8), score5pct: Math.max(0, 0.05 - j * 0.014) }; }) }; },
      hub: function () { return { summary: D.summary(), links: [{ group: 'Training', title: 'Training requests', url: '#/requests', minRole: 'PS Supervisor' }, { group: 'Platforms', title: 'Accreditation admin', url: 'https://accreditation.classera.com', minRole: 'PS Supervisor' }, { group: 'Platforms', title: 'PS CRM', url: 'https://ps-crm.classera.com', minRole: 'PS Supervisor' }] }; },
      clients: function () { return sup.map(function (s, i) { return { 'Project Name': 'Demo School ' + (i + 1), 'Assigned To': s, Country: i % 2 ? 'Egypt' : 'Saudi Arabia', Status: 'In Progress', 'Classera Plan': 'Classera Pro', Students: 800 + i * 50, Teachers: 70 + i, 'School Group ID': 5600 + i }; }); },
      certs: function () { return sup.map(function (s, i) { return { name: 'Teacher ' + (i + 1), role: 'Teacher', path: PATHS[i % 4], school: 'Demo School', country: 'Egypt', course: 'Novice teacher', issueDate: '2024-0' + (i + 1) + '-10', expiresOn: '2027-0' + (i + 1) + '-10', status: i % 3 ? 'Valid' : 'Expired', supervisor: s }; }); },
      requests: function () { return S.mockReq = S.mockReq || [{ id: 'TR001', client: 'Demo School', platform: 'eLearning', audience: 'Teachers', preferredStart: '2026-12-01T10:00', noticeOk: 'Yes', supervisor: 'Rehab Negm', status: 'Requested' }]; },
      saveRequest: function () { var r = p.record; r.id = 'TR00' + (D.requests().length + 1); r.status = 'Requested'; r.noticeOk = 'Yes'; D.requests().push(r); return r; },
      setRequestStatus: function () { D.requests().forEach(function (r) { if (r.id === p.id) r.status = p.status; }); return true; },
      actions: function () { return S.mockAct = S.mockAct || [{ id: 'A001', title: 'Follow up on training request', assignee: 'demo', status: 'Open', dueDate: '2026-11-01' }]; }, saveAction: function () { D.actions().push(Object.assign({ id: 'A00' + (D.actions().length + 1) }, p.record)); return true; },
      users: function () { return [{ id: 'U1', username: 'demo', name: 'Demo Admin', role: 'Super Admin', email: 'demo@example.com', active: 'TRUE' }]; }, saveUser: function () { return { temporaryPassword: 'Demo-Temp-123' }; }, resetPassword: function () { return { temporaryPassword: 'Demo-Temp-456' }; }, runPipeline: function () { return { certificates: 0 }; }, export: function () { return D.certs(); }
    };
    return new Promise(function (res, rej) { setTimeout(function () { try { res(D[action](p)); } catch (e) { rej(e); } }, 120); });
  }

  // ---------- boot
  initPrefs();
  S.token = ls('pshub.token') || ss('pshub.token');
  render();
})();
