/* ===================================================================
   SHRS Motion Layer — engine
   -------------------------------------------------------------------
   Companion to css/motion.css. Handles the parts CSS cannot do alone:
   measuring SVG path lengths, scroll-linked parallax, pointer-tracked
   spotlight and magnetism, and the scroll progress rail.

   Every listener is passive and rAF-throttled; every effect is skipped
   entirely under prefers-reduced-motion, and pointer effects are skipped
   on touch devices where there is no cursor to follow.
   =================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasHover = !(window.matchMedia && window.matchMedia('(hover: none)').matches);

  /* ---- measure SVG paths so CSS can draw them ---- */
  function measure(root) {
    (root || document).querySelectorAll('.mo-draw, .mo-org-line').forEach(function (el) {
      var shapes = el.matches && el.matches('.mo-org-line') ? [el] : el.querySelectorAll('path,circle,rect,line,polyline,polygon');
      Array.prototype.forEach.call(shapes, function (s) {
        if (s.dataset.moLen) return;
        var len = 0;
        try { len = s.getTotalLength ? s.getTotalLength() : 0; } catch (e) { len = 0; }
        if (!len) {
          // circles and rects in some engines report 0 before layout; fall back
          // to a generous constant rather than leaving the shape invisible.
          len = 400;
        }
        s.dataset.moLen = '1';
        s.style.setProperty('--len', Math.ceil(len + 2));
      });
    });
  }

  /* ---- split a heading into word spans so they can rise in sequence ---- */
  function splitWords(el) {
    if (el.dataset.moSplit) return;
    el.dataset.moSplit = '1';
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    var sr = document.createElement('span');
    sr.className = 'pr-sr';
    sr.textContent = text;
    el.textContent = '';
    el.appendChild(sr);
    var holder = document.createElement('span');
    holder.setAttribute('aria-hidden', 'true');
    text.split(' ').forEach(function (w, i) {
      var s = document.createElement('span');
      s.textContent = w;
      s.style.setProperty('--w', i);
      holder.appendChild(s);
      if (i < text.split(' ').length - 1) holder.appendChild(document.createTextNode(' '));
    });
    el.appendChild(holder);
  }

  /* ---- reveal observer ---- */
  function initReveal() {
    var sel = '.mo-draw, .mo-mask-up, .mo-mask-left, .mo-rise, .mo-words, .mo-shine, .mo-org-line, .mo-org';
    var targets = document.querySelectorAll(sel);
    if (!targets.length) return;
    document.querySelectorAll('.mo-words').forEach(splitWords);
    measure(document);
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('mo-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('mo-in');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---- idle float: desynchronise a grid so it breathes, not pulses ---- */
  function initFloat() {
    if (reduce) return;
    document.querySelectorAll('.mo-float').forEach(function (el, i) {
      el.style.setProperty('--d', (i % 7) * 0.42 + 's');
    });
  }

  /* ---- scroll-linked parallax + progress rail ---- */
  function initScroll() {
    var pars = Array.prototype.slice.call(document.querySelectorAll('.mo-par, .mo-par-img'));
    var rail = document.querySelector('.mo-rail');
    if (reduce || (!pars.length && !rail)) return;
    var ticking = false;
    function frame() {
      ticking = false;
      var vh = window.innerHeight || 1;
      pars.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        // -1 when the element sits below the fold, +1 when it has passed above
        var centre = r.top + r.height / 2;
        var p = (centre - vh / 2) / (vh / 2 + r.height / 2);
        el.style.setProperty('--p', Math.max(-1, Math.min(1, p)).toFixed(3));
      });
      if (rail) {
        var d = document.documentElement;
        var max = (d.scrollHeight - d.clientHeight) || 1;
        rail.style.setProperty('--sp', Math.max(0, Math.min(1, d.scrollTop / max)).toFixed(4));
      }
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    frame();
  }

  /* ---- cursor spotlight over a section ---- */
  function initSpotlight() {
    if (reduce || !hasHover) return;
    document.querySelectorAll('.mo-spot').forEach(function (sec) {
      var raf = null, x = 50, y = 30;
      function apply() {
        raf = null;
        sec.style.setProperty('--sx', x.toFixed(1) + '%');
        sec.style.setProperty('--sy', y.toFixed(1) + '%');
      }
      sec.addEventListener('pointermove', function (e) {
        var r = sec.getBoundingClientRect();
        x = ((e.clientX - r.left) / r.width) * 100;
        y = ((e.clientY - r.top) / r.height) * 100;
        sec.classList.add('is-lit');
        if (raf === null) raf = requestAnimationFrame(apply);
      }, { passive: true });
      sec.addEventListener('pointerleave', function () { sec.classList.remove('is-lit'); });
    });
  }

  /* ---- magnetic buttons ---- */
  function initMagnetic() {
    if (reduce || !hasHover) return;
    document.querySelectorAll('.mo-mag').forEach(function (btn) {
      var raf = null, dx = 0, dy = 0;
      function apply() {
        raf = null;
        btn.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
      }
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var strength = parseFloat(btn.getAttribute('data-mag') || '7');
        dx = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength;
        dy = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength;
        btn.classList.add('is-pulled');
        if (raf === null) raf = requestAnimationFrame(apply);
      }, { passive: true });
      btn.addEventListener('pointerleave', function () {
        btn.classList.remove('is-pulled');
        btn.style.transform = '';
      });
    });
  }

  function init() {
    initReveal();
    initFloat();
    initScroll();
    initSpotlight();
    initMagnetic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();

/* ===================================================================
   SHRS Interaction Sound
   -------------------------------------------------------------------
   A short, soft confirmation tone on deliberate interactions — the
   banking-app "tick". Synthesised with WebAudio rather than shipping an
   audio file, so it costs nothing to download and can be tuned here.

   Rules it obeys: nothing is created until the visitor's first gesture
   (browsers require this, and it means a page never makes noise at a
   visitor unprompted); it fires only on genuine controls, never on
   scroll or hover; it is quiet by design; and a persistent toggle sits
   in the corner so it can be silenced for good on that device.
   =================================================================== */
(function () {
  'use strict';
  var KEY = 'shrsSound';
  var enabled = (function () {
    try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; }
  })();
  var ctx = null;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }

  // Two quick partials a fifth apart with a fast decay: bright enough to
  // register as a confirmation, short enough never to become a nuisance.
  function tick(kind) {
    if (!enabled) return;
    var c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    var t = c.currentTime;
    var spec = kind === 'soft' ? [[880, 0.030], [1320, 0.022]] : [[1180, 0.034], [1760, 0.026]];
    spec.forEach(function (pair, i) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(pair[0], t);
      var peak = pair[1] * (kind === 'soft' ? 0.7 : 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.006 + i * 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16 + i * 0.03);
      o.connect(g); g.connect(c.destination);
      o.start(t + i * 0.012);
      o.stop(t + 0.22 + i * 0.03);
    });
  }

  var LOUD = '.pr-btn, .btn, .ic-cta, .adm-enquiry-btn';
  var SOFT = '.pr-chip, .pr-committee, .flow-stage, .faq-question, .pr-card, .pr-person, .pr-org-node, .ic-dot, .el-voices-btn';

  document.addEventListener('click', function (e) {
    if (!enabled) return;
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-sound-toggle]')) return;
    if (t.closest(LOUD)) tick('firm');
    else if (t.closest(SOFT)) tick('soft');
  }, { passive: true });

  /* the toggle */
  function mountToggle() {
    if (document.querySelector('[data-sound-toggle]')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pr-sound-toggle';
    b.setAttribute('data-sound-toggle', '');
    function paint() {
      b.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      b.setAttribute('aria-label', enabled ? 'Interface sound on. Turn off.' : 'Interface sound off. Turn on.');
      b.title = enabled ? 'Interface sound on' : 'Interface sound off';
      b.innerHTML = enabled
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
      b.classList.toggle('is-off', !enabled);
    }
    b.addEventListener('click', function () {
      enabled = !enabled;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) {}
      paint();
      if (enabled) tick('firm');
    });
    paint();
    document.body.appendChild(b);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle);
  } else { mountToggle(); }
})();
