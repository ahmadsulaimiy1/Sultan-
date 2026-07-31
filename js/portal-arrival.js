// Shared Executive Arrival Sequence — one restrained overlay (crest icon,
// title, tagline, role greeting, optional real-data summary line) reused
// by every Command Centre: the generic office-portal template
// (js/portal-office.js keeps its own copy, shipped first) and dedicated
// staff pages like the Registrar's and Finance Officer's. Plays once per
// browser session per surface, skipped entirely under
// prefers-reduced-motion. See css/portal.css's .exec-arrival rules.
(function () {
  'use strict';
  var PREFERS_REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function playExecArrival(opts) {
    if (PREFERS_REDUCED_MOTION || !opts || !opts.key) return;
    var storageKey = 'shrs_office_arrival_' + opts.key;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');

    var overlay = document.createElement('div');
    overlay.className = 'exec-arrival';
    overlay.innerHTML =
      '<div class="exec-arrival-crest" aria-hidden="true"><svg viewBox="0 0 24 24" width="64" height="64">' + (opts.icon || '') + '</svg></div>' +
      '<div class="exec-arrival-lines">' +
        '<div class="exec-arrival-line l1">' + esc(opts.title) + '</div>' +
        '<div class="exec-arrival-line l2">' + esc(opts.tagline) + '</div>' +
        '<div class="exec-arrival-line l3">' + esc(opts.greeting) + '</div>' +
      '</div>' +
      (opts.summary ? '<div class="exec-arrival-summary">' + esc(opts.summary) + '</div>' : '');
    document.body.appendChild(overlay);
    overlay.addEventListener('animationend', function (e) { if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); });
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 2800);
  }

  window.SHRSExecArrival = { play: playExecArrival };
})();
