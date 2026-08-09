/* ==========================================================================
   SHRS — ELEVATION LAYER (composed motion)

   Three behaviours, all additive, all one-shot or user-driven, none looping:

   1. Typewriter   — the CLEVER descriptors type themselves out in sequence
                     when the row first comes into view, with a calm gold
                     shimmer travelling through the settled letters.
   2. Counters     — the figures band counts up once, easing to rest.
   3. Voices       — the testimonial swiper: autoplay, dots, arrows,
                     keyboard, touch, and full pause-on-interaction.

   Everything below is skipped entirely under prefers-reduced-motion:
   the text is written out in full, the numbers are shown at their final
   value, and the swiper becomes a plain, fully-readable stack.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onceInView(el, cb, ratio) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.unobserve(e.target); cb(); }
      });
    }, { threshold: ratio || 0.35, rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
  }

  /* ----------------------------------------------------------------------
     1. TYPEWRITER — CLEVER descriptors
     ---------------------------------------------------------------------- */
  function typewriter() {
    var rail = document.querySelector('.mvv .monogram-rail');
    if (!rail) return;
    var cells = [].slice.call(rail.querySelectorAll('.mono-letter .md'));
    if (!cells.length) return;

    cells.forEach(function (el) {
      if (el.dataset.elTyped) return;
      el.dataset.elText = el.textContent.trim();
      if (REDUCE) { el.classList.add('el-typed-done'); return; }
      // reserve the final height so nothing reflows as it types
      el.style.minHeight = el.getBoundingClientRect().height + 'px';
      el.textContent = '';
      el.classList.add('el-typing');
      el.setAttribute('aria-label', el.dataset.elText);
    });

    if (REDUCE) return;

    onceInView(rail, function () {
      var i = 0;
      (function nextCell() {
        if (i >= cells.length) return;
        var el = cells[i++];
        var full = el.dataset.elText || '';
        var k = 0;
        el.classList.add('el-caret');

        (function step() {
          if (k > full.length) {
            el.classList.remove('el-caret', 'el-typing');
            el.classList.add('el-typed-done');
            el.dataset.elTyped = '1';
            setTimeout(nextCell, 190);          // pause between values
            return;
          }
          el.textContent = full.slice(0, k);
          k++;
          var ch = full.charAt(k - 2);
          // a hand-set rhythm: longer after a space, longest after a comma
          var delay = 52 + Math.random() * 34;
          if (ch === ' ') delay += 46;
          if (ch === ',' || ch === '&') delay += 130;
          setTimeout(step, delay);
        })();
      })();
    }, 0.4);
  }

  /* ----------------------------------------------------------------------
     2. COUNTERS — the figures band
     ---------------------------------------------------------------------- */
  function counters() {
    var rail = document.querySelector('[data-el-counters]');
    if (!rail) return;
    var nums = [].slice.call(rail.querySelectorAll('[data-count-to]'));
    if (!nums.length) return;

    nums.forEach(function (el) {
      var to = parseInt(el.getAttribute('data-count-to'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (REDUCE) { el.textContent = format(to, el) + suffix; return; }
      el.textContent = format(0, el) + '';
    });

    function format(v, el) {
      if (el.getAttribute('data-plain')) return String(v);
      return v.toLocaleString('en-GB');
    }

    if (REDUCE) return;

    onceInView(rail, function () {
      nums.forEach(function (el, idx) {
        var to = parseInt(el.getAttribute('data-count-to'), 10) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        var dur = 1500 + idx * 130;
        var start = null;
        el.classList.add('el-counting');

        setTimeout(function () {
          requestAnimationFrame(function tick(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / dur, 1);
            // easeOutExpo — fast away, long settle
            var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            el.textContent = format(Math.round(to * e), el) + (p === 1 ? suffix : '');
            if (p < 1) requestAnimationFrame(tick);
            else el.classList.remove('el-counting');
          });
        }, idx * 150);
      });
    }, 0.3);
  }

  /* ----------------------------------------------------------------------
     3. VOICES — testimonial swiper
     ---------------------------------------------------------------------- */
  function voices() {
    var root = document.querySelector('[data-el-swiper]');
    if (!root) return;
    var track = root.querySelector('[data-el-track]');
    var slides = [].slice.call(root.querySelectorAll('.el-voice'));
    var prev = root.querySelector('.is-prev');
    var next = root.querySelector('.is-next');
    var dots = root.querySelector('.el-voices-dots');
    if (!track || slides.length === 0) return;

    // A single testimonial needs no controls at all.
    if (slides.length < 2) {
      slides[0].classList.add('is-active');
      root.classList.add('is-single');
      return;
    }

    [prev, next, dots].forEach(function (n) { if (n) n.hidden = false; });

    var idx = 0, timer = null, paused = false;
    var AUTOPLAY = 7000;

    slides.forEach(function (s, i) {
      s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'el-voices-dot' + (i === 0 ? ' is-active' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Testimonial ' + (i + 1));
      b.addEventListener('click', function () { go(i, true); });
      dots.appendChild(b);
    });

    function go(n, user) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        s.classList.toggle('is-active', i === idx);
        s.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
      });
      [].slice.call(dots.children).forEach(function (d, i) {
        d.classList.toggle('is-active', i === idx);
        d.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      });
      track.style.setProperty('--el-h', slides[idx].scrollHeight + 'px');
      if (user) restart();
    }

    function restart() {
      clearInterval(timer);
      if (REDUCE || paused) return;
      timer = setInterval(function () { go(idx + 1); }, AUTOPLAY);
    }

    prev.addEventListener('click', function () { go(idx - 1, true); });
    next.addEventListener('click', function () { go(idx + 1, true); });

    root.addEventListener('pointerenter', function () { paused = true; clearInterval(timer); });
    root.addEventListener('pointerleave', function () { paused = false; restart(); });
    root.addEventListener('focusin', function () { paused = true; clearInterval(timer); });
    root.addEventListener('focusout', function () { paused = false; restart(); });

    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(idx - 1, true); e.preventDefault(); }
      if (e.key === 'ArrowRight') { go(idx + 1, true); e.preventDefault(); }
    });

    // touch / trackpad swipe
    var x0 = null, y0 = null;
    root.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; });
    root.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy)) go(idx + (dx < 0 ? 1 : -1), true);
      x0 = y0 = null;
    });
    root.addEventListener('pointercancel', function () { x0 = y0 = null; });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearInterval(timer); else restart();
    });

    window.addEventListener('resize', function () {
      track.style.setProperty('--el-h', slides[idx].scrollHeight + 'px');
    }, { passive: true });

    go(0);
    onceInView(root, restart, 0.25);
  }

  function boot() { typewriter(); counters(); voices(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ==========================================================================
   Chrome motion — header seat, footer arrival.
   Own IIFE: a fault here cannot reach the typewriter, counters or swiper.
   ========================================================================== */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var nav = document.querySelector('header.nav');
  if (nav) {
    var on = false;
    var tick = function () {
      var want = window.scrollY > 14;
      if (want !== on) { on = want; nav.classList.toggle('el-stuck', want); }
    };
    window.addEventListener('scroll', tick, { passive: true });
    tick();
  }

  var foot = document.querySelector('footer:not(.ap-foot)');
  if (!foot) return;

  /* stagger the pieces that already exist — nothing is added or removed */
  var order = [];
  var st = foot.querySelector('.foot-statement');       if (st) order.push(st);
  var ey = foot.querySelector('.foot-dash-eyebrow');    if (ey) order.push(ey);
  var db = foot.querySelector('.foot-dashboard');       if (db) order.push(db);
  [].slice.call(foot.querySelectorAll('.foot-grid > div')).forEach(function (d) { order.push(d); });
  order.forEach(function (el, i) { el.setAttribute('data-el-rise', String(Math.min(6, i + 1))); });

  if (reduce || !('IntersectionObserver' in window)) { foot.classList.add('el-in'); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { foot.classList.add('el-in'); io.disconnect(); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.04 });
  io.observe(foot);
})();
