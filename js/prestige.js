/* ===================================================================
   SHRS Prestige Layer — motion engine
   -------------------------------------------------------------------
   Drives the interior flagship pages: scroll-reveal, animated counters,
   and self-drawing SVG charts (bars, donut, line). No dependencies.
   Everything degrades to its finished state when JavaScript is off or
   the visitor prefers reduced motion — the content is always present in
   the HTML; this only animates it in.
   =================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- counters ---- */
  function animateCounter(el) {
    if (el.dataset.prDone) return;
    el.dataset.prDone = '1';
    var target = parseFloat(el.getAttribute('data-count-to'));
    if (isNaN(target)) return;
    var plain = el.hasAttribute('data-plain');
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var dp = parseInt(el.getAttribute('data-decimals') || '0', 10);
    function render(v) {
      var n = dp > 0 ? v.toFixed(dp) : Math.round(v);
      if (!plain && dp === 0) n = Number(n).toLocaleString('en-US');
      el.textContent = prefix + n + suffix;
    }
    if (reduce) { render(target); return; }
    var dur = 1600, start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      render(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---- charts ---- */
  function animateBars(scope) {
    scope.querySelectorAll('.pr-bar-fill[data-h]').forEach(function (b) {
      if (b.dataset.prDone) return; b.dataset.prDone = '1';
      var h = Math.max(0, Math.min(100, parseFloat(b.getAttribute('data-h')) || 0));
      if (reduce) { b.style.height = h + '%'; return; }
      requestAnimationFrame(function () { b.style.height = h + '%'; });
    });
  }
  function animateAgeBars(scope) {
    scope.querySelectorAll('.pr-age-fill[data-w]').forEach(function (b) {
      if (b.dataset.prDone) return; b.dataset.prDone = '1';
      var w = Math.max(0, Math.min(100, parseFloat(b.getAttribute('data-w')) || 0));
      if (reduce) { b.style.width = w + '%'; return; }
      requestAnimationFrame(function () { b.style.width = w + '%'; });
    });
  }
  function animateDonuts(scope) {
    scope.querySelectorAll('.pr-donut .val').forEach(function (c) {
      if (c.dataset.prDone) return; c.dataset.prDone = '1';
      var r = parseFloat(c.getAttribute('r'));
      var circ = 2 * Math.PI * r;
      var v = Math.max(0, Math.min(100, parseFloat(c.getAttribute('data-value')) || 0));
      c.style.strokeDasharray = circ;
      c.style.strokeDashoffset = circ;
      var target = circ * (1 - v / 100);
      if (reduce) { c.style.strokeDashoffset = target; return; }
      requestAnimationFrame(function () { c.style.strokeDashoffset = target; });
    });
  }
  function animateLines(scope) {
    scope.querySelectorAll('.pr-line-svg .line').forEach(function (p) {
      if (p.dataset.prDone) return; p.dataset.prDone = '1';
      var len = 0;
      try { len = p.getTotalLength(); } catch (e) { return; }
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      if (reduce) { p.style.strokeDashoffset = 0; return; }
      requestAnimationFrame(function () { p.style.strokeDashoffset = 0; });
    });
  }

  /* ---- typewriter ----
     The full sentence is already in the HTML, so it is present for search
     engines and for anyone without JavaScript. On reveal we hide the real
     text from sight (keeping it for screen readers) and type a visual copy
     beside it, so assistive technology never has to listen to a string
     assembling itself one character at a time. */
  function typewriter(el) {
    if (el.dataset.prDone) return;
    el.dataset.prDone = '1';
    var full = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!full) return;

    el.textContent = '';
    var sr = document.createElement('span');
    sr.className = 'pr-sr';
    sr.textContent = full;
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    var caret = document.createElement('span');
    caret.className = 'pr-type-caret';
    caret.setAttribute('aria-hidden', 'true');
    el.appendChild(sr); el.appendChild(vis); el.appendChild(caret);

    if (reduce) { vis.textContent = full; el.classList.add('is-done'); return; }

    var i = 0;
    (function step() {
      vis.textContent = full.slice(0, i);
      if (i >= full.length) { el.classList.add('is-done'); return; }
      var ch = full.charAt(i);
      i += 1;
      // Hand-set rhythm: a compositor rests longer after punctuation than
      // between letters. Without this it reads as a machine, not a pen.
      var delay =
        ch === ',' || ch === ';' ? 240 :
        ch === '.' || ch === '—' || ch === ':' ? 340 :
        ch === ' ' ? 64 : 30 + Math.random() * 28;
      setTimeout(step, delay);
    })();
  }

  /* ---- pointer-tracked 3D tilt ----
     Skipped entirely on touch devices (no hover to track) and under reduced
     motion. Writes CSS custom properties and lets the compositor do the work. */
  function initTilt() {
    if (reduce) return;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    document.querySelectorAll('.pr-tilt').forEach(function (card) {
      var raf = null, nx = 0, ny = 0;
      function apply() {
        raf = null;
        var max = parseFloat(card.getAttribute('data-tilt-max') || '5');
        card.style.setProperty('--ry', ((nx - 0.5) * max * 2).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-(ny - 0.5) * max * 2).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (nx * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (ny * 100).toFixed(1) + '%');
      }
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        nx = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
        ny = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
        card.classList.add('is-tilting');
        if (raf === null) raf = requestAnimationFrame(apply);
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  function fire(el) {
    el.classList.add('pr-in');
    el.querySelectorAll && el.querySelectorAll('[data-count-to]').forEach(animateCounter);
    if (el.hasAttribute && el.hasAttribute('data-count-to')) animateCounter(el);
    animateBars(el); animateAgeBars(el); animateDonuts(el); animateLines(el);
    el.querySelectorAll && el.querySelectorAll('[data-pr-type]').forEach(typewriter);
    if (el.hasAttribute && el.hasAttribute('data-pr-type')) typewriter(el);
  }

  function init() {
    initTilt();
    var targets = document.querySelectorAll('.pr-reveal, .pr-stagger, [data-count-to], [data-pr-type], .pr-sheen');
    if (!('IntersectionObserver' in window)) { targets.forEach(fire); return; }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { fire(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
