// Institutional Access Gateway — portal/select/. Two small, self-contained
// behaviours, both no-ops if their triggering elements aren't on the page:
//  1. Pointer-tracked 3D tilt on the five gateway cards (fine-pointer/hover
//     devices only, off entirely under prefers-reduced-motion) — sets
//     --gate-rx/--gate-ry consumed by css/portal.css's .gateway-card rule.
//  2. The Verification & Records card expands the real verify-link panel
//     in place, rather than navigating anywhere — there is no verification
//     login to sign in to.
(function () {
  var REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FINE_POINTER = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  function initTilt() {
    if (REDUCED_MOTION || !FINE_POINTER) return;
    var cards = document.querySelectorAll('.gateway-card[href]');
    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--gate-ry', (px * 10).toFixed(2) + 'deg');
        card.style.setProperty('--gate-rx', (py * -10).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--gate-rx', '0deg');
        card.style.setProperty('--gate-ry', '0deg');
      });
    });
  }

  function initVerifyToggle() {
    var btn = document.querySelector('[data-gateway-verify-toggle]');
    var panel = document.querySelector('[data-gateway-verify-panel]');
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
      if (!open) panel.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'nearest' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTilt();
    initVerifyToggle();
  });
})();
