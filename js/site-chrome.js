/* The chrome a serious institutional site is expected to carry.
   Three behaviours, all progressive — the page is complete without any
   of them, and none of them owns any content.

   1. The masthead condenses once the reader has left the top of the
      page, so the navigation stays present without holding a fifth of
      the screen for the whole of a long chapter.
   2. A return to the top of the page, which appears only once there is
      enough page behind the reader to make it worth offering.
   The reading rail already has an owner in js/motion.js and is left to
   it. Both behaviours here read scroll position through a single
   rAF-throttled listener. */
(function () {
  'use strict';

  var CONDENSE_AT = 120;   // px of scroll before the masthead condenses
  var TOP_AT = 900;        // px before the return-to-top is offered

  function init() {
    var header = document.querySelector('header.nav');
    var root = document.documentElement;
    var top = mountBackToTop();
    var ticking = false;
    var lastY = -1;

    function measure() {
      ticking = false;
      var y = window.scrollY || root.scrollTop || 0;
      if (y === lastY) return;
      lastY = y;

      if (header) header.classList.toggle('is-condensed', y > CONDENSE_AT);
      if (top) top.classList.toggle('is-shown', y > TOP_AT);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    }

    // A link anywhere in the page's prose can open the Personalisation
    // Centre, so the drawer can be referred to by name in running text
    // rather than only found by hunting for its control in the top bar.
    document.querySelectorAll('[data-pc-trigger-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var trigger = document.querySelector('[data-pc-trigger]');
        if (!trigger) return;          // no drawer on this page — follow the href
        e.preventDefault();
        trigger.click();
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    measure();
  }

  function mountBackToTop() {
    if (document.querySelector('.to-top')) return null;
    var isRtl = document.documentElement.getAttribute('dir') === 'rtl';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'to-top';
    b.setAttribute('aria-label', isRtl ? 'العودة إلى أعلى الصفحة' : 'Return to the top of the page');
    b.title = isRtl ? 'إلى الأعلى' : 'Back to top';
    b.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 19V6"/><path d="M6 11l6-6 6 6"/></svg>';
    b.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      // Return the keyboard to the top of the document as well as the page.
      var first = document.querySelector('header.nav a, header.nav button');
      if (first) first.focus({ preventScroll: true });
    });
    document.body.appendChild(b);
    return b;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
