/* ============================================================
   CLASSERA SITE FOOTER v1
   One shared footer for every page of plans.classera.com.
   Each page only loads this file. It:
     - turns the page's existing <footer> into the dark site footer,
     - keeps whatever that footer already held (program logos, notes, data-source
       lines) in a strip above the copyright line, so nothing the page relies on is lost,
     - follows the page language (html[data-lang] or html[lang]) and re-renders on switch.
   To change the links or wording for ALL pages, edit LINKS / TEXT below. Nothing else.
   ============================================================ */
(function () {
  'use strict';
  var SELF = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var ROOT = new URL('../', SELF.src).href;
  var FILE = location.protocol === 'file:';
  function u(p) { return ROOT + p + (FILE && /\/$/.test(p) ? 'index.html' : ''); }
  function hub(h) { return FILE ? ROOT + 'index.html' + h : ROOT + h; }

  var TEXT = {
    tag:   { ar: 'خطط وبرامج التدريب والتطوير المهني للعام الأكاديمي 2026 – 2027 على منصة كلاسيرا.',
             en: 'Training and professional development plans for the 2026 – 2027 academic year on the Classera platform.' },
    unit:  { ar: 'وحدة التدريب - نجاح الشركاء', en: 'Training Unit - Partner Success' },
    h1:    { ar: 'الخطط والبرامج', en: 'Plans & programs' },
    h2:    { ar: 'الفعاليات والمزيد', en: 'Events & more' },
    copy:  { ar: '© وحدة التدريب - نجاح الشركاء | كلاسيرا. جميع الحقوق محفوظة.', en: '© Training Unit - Partner Success | Classera. All rights reserved.' }
  };
  var LINKS = {
    h1: [
      { ar: 'برامج كلاسيرا (الرئيسية)', en: 'Programs hub (home)',          href: hub('') },
      { ar: 'خطة التطوير المهني',       en: 'Professional Development plan', href: u('eLearning/') },
      { ar: 'جدول اختبارات الاعتماد',   en: 'Accreditation exam calendar',   href: u('Accreditation/') },
      { ar: 'خطة أكاديمية الإثراء',     en: 'Enrichment Academy plan',       href: u('Enrichment/') },
      { ar: 'خطة تدريب العودة إلى المدرسة', en: 'Back-to-School training plan', href: u('Training/') }
    ],
    h2: [
      { ar: 'التقويم الكامل للفعاليات', en: 'Full events calendar',   href: u('Calendar/') },
      { ar: 'الفعاليات الحضورية',       en: 'In-person events',       href: u('InPersonEvents/') },
      { ar: 'فعاليات المنتجات',         en: 'Product events',         href: u('ProductEvents/') },
      { ar: 'مركز التهيئة للعملاء الجدد', en: 'Client onboarding hub', href: u('Onboarding/') },
      { ar: 'تعليمنا لن يتوقف',         en: 'Learning Never Stops',   href: u('LearningNeverStops/') }
    ]
  };
  var LOGO = ROOT + 'assets/classera-logo-white-v1.png';

  var CSS = [
    'footer.cl-site.cl-site{display:block;margin:48px 0 0;padding:34px 0 22px;background:#071C2B;color:#B6C8D6;border:0;border-top:0;text-align:start;font-size:14px;line-height:1.6;font-family:inherit;box-shadow:none}',
    'footer.cl-site .cl-wrap{width:min(100% - 32px,1100px);margin-inline:auto;display:block;padding:0}',
    'footer.cl-site .cl-fgrid{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:30px;align-items:start}',
    'footer.cl-site .cl-brand img{height:44px;width:auto;margin:0 0 12px;display:block;max-width:100%}',
    'footer.cl-site .cl-brand p{margin:0 0 10px;font-size:14px;line-height:1.7;max-width:46ch;color:#B6C8D6}',
    'footer.cl-site .cl-slogan{color:#F0AC3E;font-size:14px;font-weight:700}',
    'footer.cl-site h4{margin:0 0 12px;color:#fff;font-size:15px;font-weight:700;line-height:1.4}',
    'footer.cl-site ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}',
    'footer.cl-site li{margin:0;padding:0}',
    'footer.cl-site .cl-fgrid a{color:#B6C8D6;text-decoration:none;font-weight:500;font-size:14px}',
    'footer.cl-site .cl-fgrid a:hover{color:#fff;text-decoration:underline}',
    'footer.cl-site .cl-fgrid a[aria-current="page"]{color:#fff;font-weight:700}',
    /* what the page already had in its footer */
    'footer.cl-site .cl-strip{margin-top:26px;padding:14px 0 0;border-top:1px solid rgba(255,255,255,.14);display:block}',
    'footer.cl-site .cl-strip{display:flex!important;flex-direction:column;gap:10px}',
    'footer.cl-site .cl-strip > *{margin:0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;width:auto!important;max-width:none!important;display:flex;flex-wrap:wrap;gap:10px 22px;align-items:center;justify-content:space-between;color:#8FA6B7!important;font-size:13px!important}',
    'footer.cl-site .cl-strip a{color:#B6C8D6!important;text-decoration:none;font-weight:600}',
    'footer.cl-site .cl-strip a:hover{color:#fff!important;text-decoration:underline}',
    'footer.cl-site .cl-strip img{background:#fff;border-radius:10px;padding:6px 12px;height:48px!important;width:auto!important;max-width:100%}',
    'footer.cl-site .cl-strip .plate{background:none!important;padding:0!important;border:0!important}',
    'footer.cl-site .cl-strip .footer-divider,footer.cl-site .cl-strip .footer-logos{display:none!important}',
    'footer.cl-site .cl-strip p,footer.cl-site .cl-strip span,footer.cl-site .cl-strip div{color:#8FA6B7!important}',
    'footer.cl-site .cl-strip .footer-logos{gap:12px 18px;justify-content:flex-start}',
    'footer.cl-site .cl-strip .footer-links{display:flex;gap:6px 18px;flex-wrap:wrap}',
    'footer.cl-site .cl-fcopy{display:block;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.14);font-size:13px;color:#8FA6B7;text-align:center}',
    'footer.cl-site .cl-strip:empty{display:none}',
    'footer.cl-site [data-cl]{display:inline}',
    'footer.cl-site[data-cl-lang="en"] [data-cl="ar"],footer.cl-site[data-cl-lang="ar"] [data-cl="en"]{display:none!important}',
    '@media (max-width:760px){footer.cl-site .cl-fgrid{grid-template-columns:1fr}footer.cl-site .cl-strip > *{justify-content:center;text-align:center}}',
    '@media print{footer.cl-site .cl-fgrid{display:none}footer.cl-site.cl-site{padding:8px 0;background:#fff;color:#555}footer.cl-site .cl-fcopy{border:0}}'
  ].join('\n');

  function bi(o) { return '<span data-cl="ar">' + o.ar + '</span><span data-cl="en">' + o.en + '</span>'; }
  function col(title, list) {
    var here = location.href.replace(/index\.html$/, '').replace(/[#?].*$/, '');
    return '<div><h4>' + bi(title) + '</h4><ul>' + list.map(function (l) {
      var cur = l.href.replace(/index\.html$/, '').replace(/[#?].*$/, '') === here && l.href.indexOf('#') < 0;
      return '<li><a href="' + l.href + '"' + (cur ? ' aria-current="page"' : '') + '>' + bi(l) + '</a></li>';
    }).join('') + '</ul></div>';
  }
  function lang() {
    var h = document.documentElement, l = (h.getAttribute('data-lang') || h.getAttribute('lang') || 'en').toLowerCase();
    return l.indexOf('ar') === 0 ? 'ar' : 'en';
  }
  function build() {
    if (document.querySelector('footer.cl-site')) return;
    var f = document.querySelector('footer');
    var made = false;
    if (!f) { f = document.createElement('footer'); document.body.appendChild(f); made = true; }
    var old = made ? [] : [].slice.call(f.childNodes);
    var st = document.createElement('style'); st.setAttribute('data-cl-footer', ''); st.textContent = CSS; document.head.appendChild(st);
    f.classList.add('cl-site');
    var strip = document.createElement('div'); strip.className = 'cl-wrap cl-strip';
    old.forEach(function (n) { if (n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())) strip.appendChild(n); else f.removeChild(n); });
    f.innerHTML = '';
    var grid = document.createElement('div'); grid.className = 'cl-wrap cl-fgrid';
    grid.innerHTML = '<div class="cl-brand"><img src="' + LOGO + '" alt="Classera"><p>' + bi(TEXT.tag) + '</p><b class="cl-slogan">' + bi(TEXT.unit) + '</b></div>'
      + col(TEXT.h1, LINKS.h1) + col(TEXT.h2, LINKS.h2);
    var copy = document.createElement('div'); copy.className = 'cl-wrap cl-fcopy'; copy.innerHTML = bi(TEXT.copy);
    f.appendChild(grid); if (strip.childNodes.length) f.appendChild(strip); f.appendChild(copy);
    function sync() { f.setAttribute('data-cl-lang', lang()); }
    sync();
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang', 'lang'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
