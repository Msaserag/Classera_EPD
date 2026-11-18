/* CLASSERA LANGUAGE SYNC v1
   Keeps the chosen language (AR/EN) when moving between plans.classera.com pages.
   Every page used its own storage key (cap-lang, cl_lang, none...). This file, loaded first in <head>:
   1) picks the language: ?lang=ar|en in the URL, else the shared key, else any page key;
   2) writes it to all keys BEFORE the page's own script reads them;
   3) for pages without storage, clicks the page's own AR/EN button once loaded;
   4) saves every later change back to all keys.
   To add a page with its own key, add the key to KEYS. */
(function () {
  'use strict';
  var KEYS = ['classera-lang', 'cap-lang', 'cl_lang'];
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(v) { KEYS.forEach(function (k) { try { localStorage.setItem(k, v); } catch (e) {} }); }
  function ok(v) { return v === 'ar' || v === 'en' ? v : null; }
  var root = document.documentElement, want = null;
  try { want = ok(new URLSearchParams(location.search).get('lang')); } catch (e) {}
  if (!want) for (var i = 0; i < KEYS.length && !want; i++) want = ok(get(KEYS[i]));
  if (want) put(want);
  function cur() { return ok((root.getAttribute('data-lang') || root.getAttribute('lang') || '').toLowerCase().slice(0, 2)); }
  var ready = false;
  new MutationObserver(function () { var c = cur(); if (ready && c) put(c); })
    .observe(root, { attributes: true, attributeFilter: ['data-lang', 'lang'] });
  function align() {
    if (want && cur() !== want) {
      var b = document.querySelector('[data-setlang="' + want + '"]');
      if (b) b.click();
    }
    ready = true;
  }
  if (document.readyState === 'complete') setTimeout(align, 0); else window.addEventListener('load', function () { setTimeout(align, 60); });
})();
