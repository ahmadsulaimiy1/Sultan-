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
