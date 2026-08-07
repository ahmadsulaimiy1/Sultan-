/* ===================================================================
   THE REGALIA — lighting the figures as they arrive
   -------------------------------------------------------------------
   One observer for the whole layer. Anything carrying .rg-light,
   .rg-sweep, .rg-bar, .rg-ring or .rg-cmp-row is lit once when it
   comes into view and then left alone; the counters attached to a
   figure count up over the same interval the bar or the arc takes to
   draw, so the number and the drawing finish together.
   =================================================================== */
(function () {
  var html = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var still = reduced || html.getAttribute('data-pc-motion') === 'reduced';

  function countUp(el, to, ms, suffix) {
    if (still) { el.textContent = to + (suffix || ''); return; }
    var start = null, from = 0;
    function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / ms);
      // the same easing the bars draw on, so the figure and the bar agree
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e) + (suffix || '');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function light(el) {
    el.classList.add('is-lit');
    var n = el.querySelector('[data-rg-count]');
    if (n) {
      var to = parseFloat(n.getAttribute('data-rg-count')) || 0;
      countUp(n, to, 1500, n.getAttribute('data-rg-suffix') || '');
    }
  }

  // The Adhkār Centre builds its panels after this file has run, and the
  // portal and announcement strips replace their own contents as they
  // load. So the selector covers those too and the observer keeps
  // watching rather than taking one census at load and stopping.
  var SEL = '.rg-light, .rg-sweep, .rg-bar, .rg-ring, .rg-cmp-row, [data-rg],'
          + '.adk-priority-card, .adk-wird-card, .adk-quick-mode, .adk-sd-stat,'
          + '.adk-progress-stat, .adk-achv-badge, .adk-ctr-dial';
  var io = null, seen = 0;

  function observe(el) {
    if (el.hasAttribute('data-rg-seen')) return;
    el.setAttribute('data-rg-seen', '');
    // Stagger the travelling lights so a grid of cards does not pulse
    // in unison like a heartbeat.
    el.style.setProperty('--rg-delay', (-(seen % 7) * 1.1).toFixed(1) + 's');
    el.style.setProperty('--rg-dur', (6.5 + (seen % 5) * 0.7).toFixed(1) + 's');
    seen++;
    if (io) io.observe(el); else light(el);
  }

  function scan(scope) {
    var items = (scope || document).querySelectorAll(SEL);
    Array.prototype.forEach.call(items, observe);
  }

  function mount() {
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          light(e.target);
          io.unobserve(e.target);
        });
      }, { threshold: 0.28, rootMargin: '0px 0px -6% 0px' });
    }
    scan(document);
    if (!('MutationObserver' in window)) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      // One coalesced pass per frame — the Adhkār app can rewrite a whole
      // panel in a single tick and there is no need to rescan per node.
      requestAnimationFrame(function () { pending = false; scan(document); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
