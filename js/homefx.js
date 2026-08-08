/* ===================================================================
   THE HOMEPAGE, LIT
   -------------------------------------------------------------------
   css/homefx.css draws it; this decides where it goes and when it
   moves. Three pieces, all of them ornament — remove this file and the
   page reads exactly as it did.

   1. The golden thread: a rail down the side of the page that fills as
      the page is read, with a node at each section that lights as that
      section arrives and holds its light. The nodes are also a way
      through — pressing one goes to its section.
   2. The illuminated head: a drawn rule and a turning medallion at each
      section opening.
   3. Both are driven by one rAF-throttled scroll listener and one
      IntersectionObserver, not one of each per section.
   =================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  if (root.getAttribute('data-pc-ornament') === 'none') return;

  // The sections the thread threads. Anything shorter than a screen is
  // a strip rather than a chapter and is passed over.
  function chapters() {
    var all = Array.prototype.slice.call(
      document.querySelectorAll('body > section, body > div > section, main > section'));
    return all.filter(function (s) {
      var r = s.getBoundingClientRect();
      return r.height > 260 && !s.closest('footer') && !s.closest('header');
    });
  }

  // The label a node shows: the section's own heading, cut to something
  // a rail can carry, and never invented.
  function labelFor(sec) {
    var h = sec.querySelector('h2, h1, .eyebrow, .pr-eyebrow');
    var t = h ? (h.textContent || '').trim() : '';
    t = t.replace(/\s+/g, ' ');
    if (t.length > 34) t = t.slice(0, 33).replace(/[\s,·—-]+$/, '') + '…';
    return t;
  }

  var MARK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1"/>'
    + '<rect x="7.6" y="7.6" width="8.8" height="8.8" transform="rotate(45 12 12)"'
    + ' fill="none" stroke="currentColor" stroke-width="1"/>'
    + '<circle cx="12" cy="12" r="1.7" fill="currentColor"/></svg>';

  var secs = chapters();
  if (!secs.length) return;

  // --- the rail ------------------------------------------------------
  // A <nav>, not a decoration. The nodes were first written as
  // aria-hidden ornaments, which left nineteen links on the page with no
  // accessible name at all — the structural sweep counted them, rightly.
  // They are a real way through a very long page, so they are named and
  // reachable by keyboard, and the rail says what it is.
  var rail = document.createElement('nav');
  rail.className = 'gt-rail';
  rail.setAttribute('aria-label', document.documentElement.lang === 'ar'
    ? 'أقسام هذه الصفحة'
    : 'Sections of this page');
  rail.innerHTML = '<span class="gt-fill" aria-hidden="true"></span>'
    + '<span class="gt-bead" aria-hidden="true"></span>';
  document.body.appendChild(rail);

  var nodes = [];
  secs.forEach(function (sec, i) {
    var n = document.createElement('a');
    n.className = 'gt-node';
    var id = sec.id || ('chapter-' + (i + 1));
    if (!sec.id) sec.id = id;
    n.href = '#' + id;
    var label = labelFor(sec) || ('\u00A7 ' + (i + 1));
    n.setAttribute('data-label', label);
    n.setAttribute('aria-label', label);
    rail.appendChild(n);
    nodes.push({ el: n, sec: sec });
  });

  var top = 0, height = 0;
  function place() {
    var first = secs[0].getBoundingClientRect();
    var last = secs[secs.length - 1].getBoundingClientRect();
    var y = window.scrollY || root.scrollTop || 0;
    top = first.top + y;
    height = (last.top + y + last.height) - top;
    rail.style.top = top + 'px';
    rail.style.height = height + 'px';
    // Sit the rail in the margin beside the measure, not over the text.
    var wrap = document.querySelector('.wrap');
    var left = wrap ? wrap.getBoundingClientRect().left : 40;
    rail.style.left = Math.max(18, left - 34) + 'px';
    nodes.forEach(function (n) {
      var r = n.sec.getBoundingClientRect();
      n.el.style.top = ((r.top + y) - top) + 'px';
    });
  }

  var ticking = false;
  function measure() {
    ticking = false;
    var y = window.scrollY || root.scrollTop || 0;
    var mid = y + window.innerHeight * 0.5;
    var p = height > 0 ? Math.min(1, Math.max(0, (mid - top) / height)) : 0;
    rail.style.setProperty('--gt', p.toFixed(4));
    rail.style.setProperty('--gt-px', Math.round(p * height));
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(measure);
  }

  // --- the heads -----------------------------------------------------
  var heads = [];
  secs.forEach(function (sec) {
    var h = sec.querySelector('h2');
    if (!h || h.classList.contains('hfx-head')) return;
    h.classList.add('hfx-head');
    var m = document.createElement('span');
    m.className = 'hfx-mark';
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML = MARK;
    h.appendChild(m);
    heads.push(h);
  });

  // --- one observer for both -----------------------------------------
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains('hfx-head')) {
          e.target.classList.add('is-lit');
          io.unobserve(e.target);
          return;
        }
        var found = nodes.filter(function (n) { return n.sec === e.target; })[0];
        if (found) { found.el.classList.add('is-lit'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -18% 0px' });
    secs.forEach(function (s) { io.observe(s); });
    heads.forEach(function (h) { io.observe(h); });
  } else {
    nodes.forEach(function (n) { n.el.classList.add('is-lit'); });
    heads.forEach(function (h) { h.classList.add('is-lit'); });
  }

  // --- the constellation ---------------------------------------------
  // The spokes and nodes are drawn by CSS once the figure is lit. What
  // needs a script is the pip: a bead of light that runs one spoke at a
  // time, out from the board and back, so the figure keeps a slow pulse
  // rather than drawing once and going still.
  (function constellation() {
    var fig = document.querySelector('[data-cst]');
    if (!fig) return;
    var pip = fig.querySelector('.cst-pip');
    var spokes = Array.prototype.slice.call(fig.querySelectorAll('.cst-spoke'));
    if (!pip || !spokes.length) return;

    var still = root.getAttribute('data-pc-motion') === 'reduced'
      || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var lit = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          lit = e.isIntersecting;
          if (lit) fig.classList.add('is-lit');
        });
      }, { threshold: 0.2 }).observe(fig);
    } else { fig.classList.add('is-lit'); lit = true; }

    if (still) return;

    var i = 0, t0 = null, DUR = 1500, GAP = 700;
    function run(ts) {
      window.requestAnimationFrame(run);
      if (!lit) { t0 = null; pip.setAttribute('opacity', '0'); return; }
      if (t0 === null) t0 = ts;
      var e = ts - t0;
      if (e > DUR + GAP) { t0 = ts; i = (i + 1) % spokes.length; return; }
      if (e > DUR) { pip.setAttribute('opacity', '0'); return; }
      var sp = spokes[i];
      var len = sp.getTotalLength();
      var p = e / DUR;
      // out and back, so the board both sends and receives
      var d = p < 0.5 ? (p * 2) : (2 - p * 2);
      var pt = sp.getPointAtLength(len * d);
      pip.setAttribute('cx', pt.x.toFixed(1));
      pip.setAttribute('cy', pt.y.toFixed(1));
      pip.setAttribute('opacity', (Math.sin(p * Math.PI) * 0.95).toFixed(2));
    }
    window.requestAnimationFrame(run);
  })();

  place();
  measure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { place(); measure(); }, { passive: true });
  // The page grows as photographs load and as reveals expand their
  // sections; the rail has to be re-placed when it does.
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { place(); measure(); });
    ro.observe(document.body);
  }
  window.addEventListener('load', function () { place(); measure(); });
})();
