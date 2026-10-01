/* =====================================================================
   Classera Programs AY26-27 - Interactive effects layer (v1)
   ---------------------------------------------------------------------
   Switch any effect on or off below (true / false), save, commit.
   Nothing else in this file needs editing.
   ===================================================================== */
const FX_CONFIG = {
  progressBar: true,   // thin brand-colored reading bar at the top
  reveal:      true,   // cards and sections fade up as you scroll
  counters:    true,   // numbers in stat tiles count up (15,000+, 92%...)
  heroOrbs:    true,   // soft drifting brand-colored lights in the hero
  titleShine:  true,   // one light sweep across the main title on load
  spotlight:   true,   // cursor-following glow on cards (desktop)
  tilt:        true,   // subtle 3D tilt on the hub program cards (desktop)
  ripple:      true,   // click ripple on buttons
  backToTop:   true    // floating "back to top" button
};

/* ---------------------------------------------------------------------
   Engine. Every block is guarded, so if one effect fails the page and
   the other effects keep working.
   --------------------------------------------------------------------- */
(function(){
  'use strict';
  const C = FX_CONFIG;
  const doc = document, root = doc.documentElement;
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isHub = !!doc.getElementById('viewer');
  const safe = fn => { try{ fn() }catch(e){ console && console.warn && console.warn('[classera-fx]', e) } };

  /* Page extras: a page can add its own selectors before loading this file,
     e.g. window.FX_EXTRA = { reveal:'.kpi', spot:'.kpi', ripple:'.step', count:'.kpi .val', hero:'.band' } */
  const X = window.FX_EXTRA || {};
  const more = k => X[k] ? ',' + X[k] : '';
  const REVEAL_SEL = [
    '.prog','.calband',                                   // hub
    'article.item','.statstrip .st','.stats .stat',       // eLearning / Enrichment
    'article.ev','.month > .mm',                          // Product / In-person events
    '.rn-card','.step','.status','.box',                  // Accreditation
    '.shead','.sect','.mo','.legend'                      // shared headers, calendar
  ].join(',') + more('reveal');
  const SPOT_SEL = '.prog, .card, .ev, .rn-card, .stat, .st, .step, .calband' + more('spot');
  const RIPPLE_SEL = '.btn, .cta, .abtn, .calbtn, .fbtn, .track, .rn-tab, .vtab, .vback, .printbtn, .rn-jump, .langtoggle button' + more('ripple');

  /* 1. Progress bar ---------------------------------------------------- */
  if(C.progressBar) safe(()=>{
    const bar = doc.createElement('div'); bar.className='fx-progress'; bar.setAttribute('aria-hidden','true');
    doc.body.appendChild(bar);
    let tick = false;
    const upd = ()=>{ tick=false;
      const max = root.scrollHeight - innerHeight;
      bar.style.setProperty('--fx-p', max>0 ? Math.min(1, scrollY/max) : 0);
      bar.style.display = root.classList.contains('in-plan') ? 'none' : '';
    };
    addEventListener('scroll', ()=>{ if(!tick){ tick=true; requestAnimationFrame(upd) } }, {passive:true});
    addEventListener('resize', upd); upd();
    new MutationObserver(upd).observe(root,{attributes:true,attributeFilter:['class']});
  });

  /* 2 + 7. Reveal on scroll and count-up -------------------------------- */
  const counted = new WeakSet();
  function countUp(el){
    if(counted.has(el)) return; counted.add(el);
    const txt = el.textContent.trim();
    const m = txt.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if(!m || el.children.length) return;
    const [ , pre, numStr, post ] = m;
    const target = parseFloat(numStr.replace(/,/g,''));
    if(!isFinite(target) || target === 0) return;
    const comma = numStr.includes(','), dec = (numStr.split('.')[1]||'').length;
    const fmt = v => { let s = v.toFixed(dec); if(comma) s = Number(s).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}); return pre+s+post };
    el.classList.add('fx-count');
    const dur = Math.min(1800, 700 + Math.log10(target+1)*300), t0 = performance.now();
    const step = now => {
      if(!el.isConnected) return;
      const p = Math.max(0, Math.min(1,(now-t0)/dur)), e = 1-Math.pow(1-p,3);
      el.textContent = fmt(target*e);
      if(p<1) requestAnimationFrame(step); else el.textContent = txt;
    };
    el.textContent = fmt(0); requestAnimationFrame(step);
  }
  const COUNT_SEL = '.statstrip .st > b, .stats .stat > b' + more('count');

  if((C.reveal || C.counters) && 'IntersectionObserver' in window && !reduced) safe(()=>{
    const seen = new WeakSet();
    const io = new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(!en.isIntersecting) return;
        const el = en.target; io.unobserve(el);
        if(el.classList.contains('fx-pre')){ el.classList.add('fx-in'); el.classList.remove('fx-pre');
          setTimeout(()=>{ el.classList.remove('fx-in'); el.style.removeProperty('--fx-d') }, 1400) }
        if(C.counters){ if(el.matches(COUNT_SEL)) countUp(el); else el.querySelectorAll(COUNT_SEL).forEach(countUp) }
      });
    },{rootMargin:'0px 0px -8% 0px',threshold:.08});

    function scan(scope){
      if(C.reveal){
        const groups = new Map();
        scope.querySelectorAll(REVEAL_SEL).forEach(el=>{
          if(seen.has(el) || el.closest('.fx-pre,.viewer')) return;
          seen.add(el);
          const p = el.parentElement; const i = groups.get(p)||0; groups.set(p,i+1);
          el.style.setProperty('--fx-d', Math.min(i,6)*70+'ms');
          el.classList.add('fx-pre'); io.observe(el);
        });
      }
      if(C.counters) scope.querySelectorAll(COUNT_SEL).forEach(b=>{ if(!counted.has(b) && !seen.has(b)){ seen.add(b); io.observe(b) } });
    }
    scan(doc);
    doc.body.classList.add('fx-ready');
    // pages that re-render cards (filters, language switch) get the effect too
    let pend = null;
    new MutationObserver(()=>{ if(pend) return; pend = requestAnimationFrame(()=>{ pend=null; scan(doc) }) })
      .observe(doc.body,{childList:true,subtree:true});
  });

  /* 3. Hero orbs, parallax and title shine ----------------------------- */
  safe(()=>{
    const hero = doc.querySelector(X.hero || '.hero'); if(!hero) return;
    if(C.heroOrbs && !reduced){
      hero.classList.add('fx-hero');
      const o = doc.createElement('div'); o.className='fx-orbs'; o.setAttribute('aria-hidden','true');
      o.innerHTML='<i></i><i></i><i></i>'; hero.prepend(o);
      if(finePointer) hero.addEventListener('pointermove', e=>{
        const r = hero.getBoundingClientRect();
        o.style.setProperty('--fx-px', ((e.clientX-r.left)/r.width-.5)*-30+'px');
        o.style.setProperty('--fx-py', ((e.clientY-r.top)/r.height-.5)*-20+'px');
      });
    }
    if(C.titleShine && !reduced){ const h = hero.querySelector('h1'); if(h) h.classList.add('fx-shine') }
  });

  /* 4. Spotlight + tilt -------------------------------------------------- */
  if((C.spotlight || C.tilt) && finePointer && !reduced) safe(()=>{
    doc.addEventListener('pointerover', e=>{
      const card = e.target.closest && e.target.closest(SPOT_SEL); if(!card || card.dataset.fx) return;
      card.dataset.fx = '1';
      if(getComputedStyle(card).position === 'static') card.style.position = 'relative';
      if(C.spotlight){ const g = doc.createElement('span'); g.className='fx-glow'; g.setAttribute('aria-hidden','true'); card.prepend(g); card.classList.add('fx-spot') }
      const tilt = C.tilt && card.classList.contains('prog');
      if(tilt) card.classList.add('fx-tilt');
      card.addEventListener('pointermove', ev=>{
        const r = card.getBoundingClientRect(), x = ev.clientX-r.left, y = ev.clientY-r.top;
        card.style.setProperty('--fx-x', x+'px'); card.style.setProperty('--fx-y', y+'px');
        if(tilt){ const rx = (y/r.height-.5)*-6, ry = (x/r.width-.5)*7;
          card.style.transform = `perspective(900px) translateY(-6px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)` }
      });
      if(tilt) card.addEventListener('pointerleave', ()=>{ card.style.transform='' });
    });
  });

  /* 5. Ripple ------------------------------------------------------------ */
  if(C.ripple && !reduced) safe(()=>{
    doc.addEventListener('pointerdown', e=>{
      const b = e.target.closest && e.target.closest(RIPPLE_SEL); if(!b) return;
      b.classList.add('fx-ripple-host');
      const r = b.getBoundingClientRect(), s = Math.max(r.width,r.height)*2.2;
      const d = doc.createElement('span'); d.className='fx-ripple';
      d.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;
      b.appendChild(d); setTimeout(()=>d.remove(), 650);
    });
  });

  /* 8. Back to top ------------------------------------------------------- */
  if(C.backToTop) safe(()=>{
    const ar = () => (root.getAttribute('data-lang')||root.lang) === 'ar';
    const btn = doc.createElement('button'); btn.type='button'; btn.className='fx-top';
    btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 19V5M5.8 11.2 12 5l6.2 6.2"/></svg>';
    const label = ()=> btn.setAttribute('aria-label', ar() ? 'العودة إلى الأعلى' : 'Back to top');
    label(); new MutationObserver(label).observe(root,{attributes:true,attributeFilter:['data-lang','lang']});
    btn.addEventListener('click', ()=> scrollTo({top:0, behavior: reduced?'auto':'smooth'}));
    doc.body.appendChild(btn);
    const upd = ()=> btn.classList.toggle('on', scrollY > innerHeight*0.9 && !root.classList.contains('in-plan'));
    addEventListener('scroll', upd, {passive:true}); upd();
  });

  /* 9. Theme button spin ------------------------------------------------- */
  if(!reduced) safe(()=>{
    doc.querySelectorAll('#themeBtn, #themebtn').forEach(b=>b.addEventListener('click', ()=>{
      b.classList.remove('fx-spin'); void b.offsetWidth; b.classList.add('fx-spin');
    }));
  });
})();
