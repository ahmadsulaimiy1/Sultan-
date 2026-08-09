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
    '.pr-chart-card', '.pr-agechart', '.pr-path', '.mv-lead',
    '.contact-item', '.ic-visual', '.mono-letter', '.teaser',
    '.pr-quad', '.pr-panel', '.pr-band-card', '.sw-card', '.tm-card',
    // the story layer, the armorial and the furniture they brought with
    // them — the complaint was that too much of the site sat still, and
    // a shape that is worth a plate is worth the light that goes round it
    '.st-figure', '.ins-tool', '.cmp-card', '.rec-card', '.card2',
    '.faq-i', '.st-aside-facts', '.st-pledges > li', '.fdn-list > li',
    '.att-card', '.att-stage',
    // controls and callouts that were never dressed at all
    '.pr-btn.is-gold', '.pr-arrival', '.pr-stats', '.pr-pledge',
    '.gateway-card', '.gw-q', '.wf-card', '.hfx-head', '.pr-founder-card',
    '.pr-doc', '.pr-impact-item', '.fc-card', '.faculty-card',
    '.pr-tl-item', '.pr-cmp-row', '.adk-priority-card', '.adk-wird-card'
  ].join(',');

  /* The diamond is not given to everything. These are the crown shapes:
     the arrival panels, the crest cards, the plates that carry a figure
     and the one gold button on a page. A second light on every card on
     the site would stop being a jewel and start being a texture. */
  var CROWN = [
    '.pr-arrival', '.pr-quad', '.pr-stats', '.pr-stat', '.st-figure',
    '.ins-tool', '.card2', '.pr-btn.is-gold', '.pr-quote', '.rec-card.is-won',
    '.att-stage', '.gateway-card', '.pr-founder-card', '.pr-pledge'
  ].join(',');

  /* A panel has to be at least this big before a travelling light on it
     reads as a light rather than as a flickering border. A button is the
     documented exception: it is meant to be small, and it is the one
     control on a page that should catch the eye. */
  var MIN_W = 90, MIN_H = 54;
  var SMALL_OK = '.pr-btn.is-gold, .gw-q, .pr-stat';
  var n = 0;

  function dress(el) {
    if (el.classList.contains('rg-edged')) return;
    if (el.classList.contains('rg-light')) return;   // already has one
    if (el.querySelector(':scope > .rg-edge')) return;
    var r = el.getBoundingClientRect();
    if (!el.matches(SMALL_OK) && (r.width < MIN_W || r.height < MIN_H)) return;
    if (r.width < 44 || r.height < 22) return;

    el.classList.add('rg-edged');
    el.style.setProperty('--rg-delay', (-(n % 9) * 1.05).toFixed(2) + 's');
    el.style.setProperty('--rg-dur', (8 + (n % 6) * 0.85).toFixed(2) + 's');
    n += 1;
    var edge = document.createElement('span');
    edge.className = 'rg-edge';
    edge.setAttribute('aria-hidden', 'true');
    el.appendChild(edge);

    /* The second light turns the other way and is offset in time, so the
       two never cross at the same corner twice in a row. */
    if (el.matches(CROWN)) {
      el.style.setProperty('--rg-dur2', (11 + (n % 5) * 1.3).toFixed(2) + 's');
      var gem = document.createElement('span');
      gem.className = 'rg-edge is-diamond';
      gem.setAttribute('aria-hidden', 'true');
      gem.style.animationDuration = (11 + (n % 5) * 1.3).toFixed(2) + 's';
      gem.style.animationDelay = (-(n % 7) * 1.7).toFixed(2) + 's';
      el.appendChild(gem);
    }
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
