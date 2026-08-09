/* ===================================================================
   THRIFT — light only where somebody is looking
   -------------------------------------------------------------------
   Measured, on /about/, before this file existed:

       254 CSS animations running
       209 of them on elements outside the viewport
       13 frames per second

   And it was not only the new work. /contact/ ran 113 animations with
   57 off-screen; the homepage 207 with 148 off-screen. Every one of
   those off-screen animations was costing a style recalculation and,
   for the conic-gradient lights, a re-raster on every single frame, to
   produce a picture nobody could see. A site that is meant to feel
   like a jeweller's window cannot stutter, and it was stuttering for a
   reason that has nothing to do with how much ornament there is and
   everything to do with WHERE it was being spent.

   The fix is one rule, applied at the section level rather than the
   element level: an ornament outside the viewport is paused.

   Sections, not elements, because a page has a dozen or two sections
   and several hundred ornaments. One observer over twenty targets
   pauses everything inside them, and costs nothing to maintain when
   somebody adds an ornament later — a new light inside a section is
   thrifted the day it is added, without this file knowing it exists.

   The margin is generous on purpose. An ornament starts moving well
   before it arrives, so nothing is ever caught starting up in front of
   the reader.

   Nothing here changes what anything looks like when it IS on screen.
   =================================================================== */
(function () {
  'use strict';

  if (!('IntersectionObserver' in window)) return;

  /* The bands a page is actually made of. Anything not matched here is
     simply never thrifted — this can slow nothing down and can break
     nothing, it can only decline to help. */
  var SEL = [
    'section', 'footer', 'header.nav',
    '.kx-ticker', '.pc-islamic-strip', '.pr-hero', '.pr-section',
    '.wrap > .pr-grid', '[data-thrift]'
  ].join(',');

  var seen = new WeakSet();

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) e.target.removeAttribute('data-idle');
      else e.target.setAttribute('data-idle', '');
    });
  }, { rootMargin: '280px 0px 280px 0px', threshold: 0 });

  function watch(el) {
    if (seen.has(el)) return;
    /* A section nested inside another watched section would be paused
       and unpaused twice for no gain, and the inner one can only ever
       be a subset of the outer. One watcher per band. */
    if (el.parentElement && el.parentElement.closest(SEL)) return;
    seen.add(el);
    io.observe(el);
  }

  function scan(scope) {
    var found = (scope || document).querySelectorAll(SEL);
    Array.prototype.forEach.call(found, watch);
  }

  /* The whole document rests when the tab does. Browsers throttle
     requestAnimationFrame in a hidden tab but do not reliably stop CSS
     animations, and a laptop should not be turning eighty conic
     gradients in a tab nobody is looking at. */
  function tab() {
    document.documentElement.toggleAttribute('data-idle-all', document.hidden);
  }
  document.addEventListener('visibilitychange', tab);
  tab();

  function mount() {
    scan(document);
    /* Sections arrive after load on several pages — the Adhkār Centre
       builds its own, the portal shell writes a footer late — so the
       census is not taken once. One coalesced pass per frame. */
    if (!('MutationObserver' in window)) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; scan(document); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
