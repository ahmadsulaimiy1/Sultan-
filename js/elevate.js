/* ==========================================================================
   SHRS — ELEVATION LAYER (motion)
   Pointer-tracked 3D tilt and a specular highlight that follows the cursor.

   Additive: it attaches to existing components by class name and adds one
   <span class="el-glow"> inside each. It changes no markup you authored and
   does nothing at all when the visitor prefers reduced motion, on coarse
   pointers (phones and tablets), or on narrow screens.
   ========================================================================== */
(function () {
  'use strict';

  var TARGETS = [
    { sel: '.institution-card', max: 5.0, dark: false },
    { sel: '.dc-tile',          max: 7.0, dark: true  },
    { sel: '.director-card',    max: 4.0, dark: true  },
    { sel: '.quote-panel',      max: 3.0, dark: true  },
    { sel: '.mono-letter',      max: 9.0, dark: false },
    { sel: '.wird-card > .adhkar-teaser-card, .wird-card > .wird-reminder-card, .wird-card > .wird-quran-card', max: 6.0, dark: false },
    { sel: '.ledger-row',       max: 4.0, dark: true  },
    { sel: '.ann-hero-panel',   max: 2.5, dark: true  }
  ];

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)');
  var wide   = window.matchMedia('(min-width: 761px)');

  function enabled() {
    return !reduce.matches && fine.matches && wide.matches;
  }

  var bound = [];

  function attach(el, max, dark) {
    if (el.dataset.elBound === '1') return;
    el.dataset.elBound = '1';

    el.classList.add('el-3d', 'el-sheen');
    if (dark) el.classList.add('el-on-dark');

    var glow = document.createElement('span');
    glow.className = 'el-glow';
    glow.setAttribute('aria-hidden', 'true');
    el.appendChild(glow);

    var raf = null, rect = null;

    function measure() { rect = el.getBoundingClientRect(); }

    function onEnter() {
      if (!enabled()) return;
      measure();
      el.classList.add('is-hot', 'is-tilting');
    }

    function onMove(e) {
      if (!enabled() || !rect) return;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        if (x < 0 || x > 1 || y < 0 || y > 1) return;
        var ry = (x - 0.5) * 2 * max;
        var rx = (0.5 - y) * 2 * max;
        el.style.transform =
          'perspective(1100px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' +
          ry.toFixed(2) + 'deg) translate3d(0,-6px,0) scale(1.012)';
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
    }

    function onLeave() {
      el.classList.remove('is-hot', 'is-tilting');
      el.style.transform = '';
    }

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('blur', onLeave, true);
    bound.push({ el: el, measure: measure, reset: onLeave });
  }

  function init() {
    TARGETS.forEach(function (t) {
      document.querySelectorAll(t.sel).forEach(function (el) {
        attach(el, t.max, t.dark);
      });
    });
  }

  function resetAll() {
    bound.forEach(function (b) { b.reset(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      resetAll();
      bound.forEach(function (b) { b.measure(); });
    }, 150);
  }, { passive: true });

  if (reduce.addEventListener) reduce.addEventListener('change', resetAll);
})();
