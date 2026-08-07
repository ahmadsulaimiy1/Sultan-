/* ===================================================================
   THE GILDED EDGE — a light on every shape, on every page
   -------------------------------------------------------------------
   css/regalia.css section 7 draws the arc; this decides what wears it.

   The original travelling light was drawn on ::before, so it could only
   be given to elements that did not already own that pseudo-element —
   which ruled out most of the site's furniture. This appends a real
   child instead, so anything can carry it.

   Three things keep it from becoming noise.

   1. Only shapes. A card, a plate, a panel, a framed photograph, a
      table — things with an edge to run. Never a paragraph, never a
      link in running text.
   2. Only what is big enough. Anything under 90×54 is skipped: at that
      size the ring is a halo, not an edge.
   3. Never twice. A shape that already carries .rg-light keeps that one
      and is left alone, and nothing is ever given two.

   The staggering is deliberate: a grid of twelve cards on one timing
   pulses like a heartbeat, so each takes its own phase and duration.
   =================================================================== */
(function () {
  'use strict';

  var SHAPES = [
    '.pr-card', '.policy', '.pr-person', '.pr-committee', '.institution-card',
    '.grade-table', '.revision-history', '.related-docs', '.flow-stage',
    '.dc-sys', '.adk-std', '.rg-plate', '.now-panel', '.ic-cta',
    '.pgc-card', '.pr-quote', '.pr-plate', '.pr-figure', '.ct-card',
    '.foot-map-panel', '.ann-card', '.press-card', '.mkt-card',
    '.gi-frame', '.gal-item', '.school-block', '.pr-stat', '.pr-metric',
    // the homepage's own furniture
    '.hx-mark', '.hx-q', '.hx-track', '.el-stage', '.cl-tile',
    '.contact-item', '.ic-visual', '.mono-letter', '.teaser',
    '.pr-quad', '.pr-panel', '.pr-band-card', '.sw-card', '.tm-card'
  ].join(',');

  var MIN_W = 90, MIN_H = 54;
  var n = 0;

  function dress(el) {
    if (el.classList.contains('rg-edged')) return;
    if (el.classList.contains('rg-light')) return;   // already has one
    if (el.querySelector(':scope > .rg-edge')) return;
    var r = el.getBoundingClientRect();
    if (r.width < MIN_W || r.height < MIN_H) return;

    el.classList.add('rg-edged');
    el.style.setProperty('--rg-delay', (-(n % 9) * 1.05).toFixed(2) + 's');
    el.style.setProperty('--rg-dur', (8 + (n % 6) * 0.85).toFixed(2) + 's');
    n += 1;
    var edge = document.createElement('span');
    edge.className = 'rg-edge';
    edge.setAttribute('aria-hidden', 'true');
    el.appendChild(edge);
  }

  function sweep(scope) {
    var found = (scope || document).querySelectorAll(SHAPES);
    Array.prototype.forEach.call(found, dress);
  }

  function start() {
    sweep(document);
    // The Adhkar Centre, the announcement strips and the portal panels
    // all write their own contents after this runs, so the sweep keeps
    // watching rather than taking one census and stopping.
    if (!('MutationObserver' in window)) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; sweep(document); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
