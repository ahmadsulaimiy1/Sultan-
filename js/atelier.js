/* ===================================================================
   THE ATELIER — the behaviours behind css/atelier.css
   -------------------------------------------------------------------
   Four things: the motes that drift across the dark bands, the rule
   that draws itself under a heading as it arrives, the curtain between
   pages, and the reading ruler. Each one checks its own preference and
   its own reduced-motion state before doing anything at all, and each
   is written so that removing this file leaves the site working.
   =================================================================== */
(function () {
  var html = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function on(name, dflt) {
    var v = html.getAttribute('data-pc-' + name);
    return (v === null ? dflt : v) === 'on';
  }
  function motionOK() { return !reduced && html.getAttribute('data-pc-motion') !== 'reduced'; }

  /* ---- 1. Motes ---------------------------------------------------
     Twelve per band, seeded from the band's own index so the pattern is
     stable across a reload rather than dancing about on every visit. */
  function mountMotes() {
    if (!motionOK() || !on('motes', true)) return;
    var bands = document.querySelectorAll(
      '.pr-section.is-royal, .governance, .contact, .digital-campus-teaser, .pr-cta');
    Array.prototype.forEach.call(bands, function (band, bi) {
      if (band.querySelector(':scope > .at-motes')) return;
      var box = document.createElement('div');
      box.className = 'at-motes';
      box.setAttribute('aria-hidden', 'true');
      var seed = bi * 9973 + 41;
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      var frag = document.createDocumentFragment();
      for (var i = 0; i < 12; i++) {
        var s = document.createElement('span');
        var size = 2 + rnd() * 4;
        s.style.width = size.toFixed(1) + 'px';
        s.style.height = size.toFixed(1) + 'px';
        s.style.left = (rnd() * 100).toFixed(2) + '%';
        s.style.setProperty('--d', (34 + rnd() * 46).toFixed(1) + 's');
        s.style.setProperty('--dl', (-rnd() * 40).toFixed(1) + 's');
        s.style.setProperty('--dx', ((rnd() - 0.5) * 90).toFixed(0) + 'px');
        s.style.setProperty('--o', (0.22 + rnd() * 0.4).toFixed(2));
        frag.appendChild(s);
      }
      box.appendChild(frag);
      if (getComputedStyle(band).position === 'static') band.style.position = 'relative';
      band.insertBefore(box, band.firstChild);
      // Light them only while the band is on screen: a mote animating
      // three sections below the fold is work nobody is watching.
      if (!('IntersectionObserver' in window)) { box.classList.add('is-lit'); return; }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { box.classList.toggle('is-lit', e.isIntersecting); });
      }, { rootMargin: '10% 0px' }).observe(band);
    });
  }

  /* ---- 2. The rule that draws itself ------------------------------
     The CSS keys the drawn state off a class on the section, so a
     heading inside a band that has no reveal wrapper still signs
     itself when it arrives. */
  function mountRules() {
    if (!motionOK()) return;
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('at-rule-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('section'), function (s) {
      if (s.querySelector('h2, h1.page-title')) io.observe(s);
    });
  }

  /* ---- 3. The curtain between pages -------------------------------
     Only for same-origin, same-tab, plain left-clicks on real page
     links: anything else — a new tab, a download, a hash, a modifier
     key — is left entirely alone. */
  function mountCurtain() {
    if (!motionOK() || !on('pagewipe', true)) return;
    var curtain = document.createElement('div');
    curtain.className = 'at-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(curtain);
    // Draw it back on arrival, so the page is uncovered rather than
    // simply appearing.
    curtain.classList.add('is-out');
    window.setTimeout(function () { curtain.classList.remove('is-out'); }, 560);

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download') || a.dataset.pcTriggerLink !== undefined) return;
      // Anything inside a panel that scripts its own links is left alone.
      if (a.closest('[data-personalisation],[data-livery-prompt],[data-adk-app],form')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:|https?:\/\/(?!127\.0\.0\.1|localhost))/i.test(href)) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      curtain.classList.remove('is-out');
      curtain.classList.add('is-in');
      window.setTimeout(function () { location.href = a.href; }, 380);
      // If navigation is blocked for any reason, do not leave the page
      // behind a curtain.
      window.setTimeout(function () { curtain.classList.remove('is-in'); }, 4000);
    }, true);
  }

  /* ---- 4. The reading ruler --------------------------------------- */
  function mountRuler() {
    var ruler = null, raf = 0, y = 0;
    function ensure() {
      if (ruler) return ruler;
      ruler = document.createElement('div');
      ruler.className = 'at-ruler';
      ruler.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ruler);
      return ruler;
    }
    function move(e) {
      if (html.getAttribute('data-pc-ruler') !== 'on') return;
      y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var el = ensure();
        var h = parseFloat(getComputedStyle(el).getPropertyValue('--rh')) || 58;
        el.style.setProperty('--ry', Math.round(y - h / 2) + 'px');
      });
    }
    window.addEventListener('pointermove', move, { passive: true });
  }

  function start() { mountMotes(); mountRules(); mountCurtain(); mountRuler(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // A livery or setting change should take effect without a reload.
  document.addEventListener('sultan:personalisation-changed', function () {
    if (!motionOK() || !on('motes', true)) {
      Array.prototype.forEach.call(document.querySelectorAll('.at-motes'), function (m) { m.remove(); });
    } else { mountMotes(); }
  });
})();

/* ===================================================================
   NUMERALS
   -------------------------------------------------------------------
   Arabic pages are published with the figures their editors chose. A
   reader who wants the other convention gets it here, applied to text
   nodes only — never to an attribute, a value, a class or anything a
   script might later parse. Runs once, and again when the preference
   changes; it converts in both directions, so it is reversible.
   =================================================================== */
(function () {
  var html = document.documentElement;
  var AR = '٠١٢٣٤٥٦٧٨٩', WE = '0123456789';
  var SKIP = { SCRIPT:1, STYLE:1, CODE:1, PRE:1, INPUT:1, TEXTAREA:1, SELECT:1, TIME:1 };

  function convert(mode) {
    if (mode !== 'arabic' && mode !== 'western') return;
    var from = mode === 'arabic' ? WE : AR;
    var to   = mode === 'arabic' ? AR : WE;
    var map = {};
    for (var i = 0; i < 10; i++) map[from[i]] = to[i];
    var re = new RegExp('[' + from + ']', 'g');
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !re.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== document.body) {
          if (SKIP[p.nodeName]) return NodeFilter.FILTER_REJECT;
          // Anything a machine reads back — a reference, a code, an
          // identifier — keeps the figures it was issued with.
          if (p.classList && (p.classList.contains('at-no-numerals') ||
              p.classList.contains('plib-code') || p.classList.contains('idc-mrz') ||
              p.classList.contains('stat-num') || p.hasAttribute('data-count-to'))) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      t.nodeValue = t.nodeValue.replace(re, function (c) { return map[c]; });
    });
  }

  function run() { convert(html.getAttribute('data-pc-numerals')); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  document.addEventListener('sultan:personalisation-changed', function () {
    window.setTimeout(run, 0);
  });
})();
