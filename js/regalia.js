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

  function mount() {
    var sel = '.rg-light, .rg-sweep, .rg-bar, .rg-ring, .rg-cmp-row, [data-rg]';
    var items = document.querySelectorAll(sel);
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, light); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        light(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.28, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(items, function (el, i) {
      // Stagger the travelling lights so a grid of cards does not pulse
      // in unison like a heartbeat.
      if (el.classList.contains('rg-light')) {
        el.style.setProperty('--rg-delay', (-(i % 7) * 1.1).toFixed(1) + 's');
        el.style.setProperty('--rg-dur', (6.5 + (i % 5) * 0.7).toFixed(1) + 's');
      }
      io.observe(el);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
