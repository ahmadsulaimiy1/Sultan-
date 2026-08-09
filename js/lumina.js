/* ===================================================================
   LUMINA — mounting the marks
   -------------------------------------------------------------------
   Puts a turning light around the circular icon medallions in the
   masthead ribbon and in the colophon.

   It wraps each mark here rather than asking for a wrapper in the
   markup because those partials are shared by four locales and a
   decoration should not have to be typed into all of them — and
   because anything added to the ribbon or the colophon later is
   mounted the day it is added, without this file knowing it exists.

   See css/lumina.css for why these rings are rotated rather than
   angle-animated, which is the whole reason there can be twenty-nine
   of them — and for the three mistakes the first version made, which
   are the reason the quick row is no longer in the list below.
   =================================================================== */
(function () {
  'use strict';

  /* ONLY marks that sit in a round medallion. The quick row's glyphs
     sit inline beside their words with no ring of their own, and a
     light drawn round one of those does not read as an ornament — it
     reads as a broken circle bleeding out of the icon, which is
     exactly how it looked. It was tried and removed. */
  var HOSTS = [
    '.mnr-item',   // the eight ribbon plates, top of every page
    '.fd-item'     // the colophon's directory, twenty-one of them
  ].join(',');

  var n = 0;

  function mount(host) {
    if (host.hasAttribute('data-lum')) return;
    var svg = host.querySelector(':scope > svg');
    if (!svg) return;
    host.setAttribute('data-lum', '');

    var w = document.createElement('span');
    w.className = 'lum-mount';
    /* The wrapper is presentational only. The mark inside it is already
       aria-hidden and the host carries the accessible name, so this
       must not introduce a second thing for a screen reader to meet. */
    w.setAttribute('aria-hidden', 'true');
    svg.parentNode.insertBefore(w, svg);
    w.appendChild(svg);

    /* Staggered so a row of eight never turns in step. The spreads are
       chosen to be mutually prime-ish: 5 durations against 7 offsets
       means the pattern takes thirty-five marks to repeat, so it never
       resynchronises within a row the way round numbers do. The delay
       is NEGATIVE, which starts each ring partway through its cycle
       rather than making it wait — nothing on the page is ever seen
       standing still waiting for its turn to begin. */
    w.style.setProperty('--lum-dur', (8 + (n % 5) * 1.4).toFixed(2) + 's');
    w.style.setProperty('--lum-delay', (-(n % 7) * 1.9).toFixed(2) + 's');
    n += 1;
  }

  function scan(scope) {
    var hosts = (scope || document).querySelectorAll(HOSTS);
    Array.prototype.forEach.call(hosts, mount);
  }

  function start() {
    scan(document);
    /* The colophon is written late by js/portal-chrome.js on the portal
       pages, and the ribbon is rebuilt on a language switch, so the
       census is not taken once. One coalesced pass per frame. */
    if (!('MutationObserver' in window)) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; scan(document); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
