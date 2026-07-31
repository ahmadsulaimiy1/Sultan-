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

  // Animated count-up: parses a leading/trailing non-numeric prefix and
  // suffix (₦, %, "due", etc.) off the real final value and counts up
  // to it — the number itself is never invented, only its reveal is
  // animated. Identical approach to the Founder Dashboard's own
  // animateValue (js/portal-founder-dashboard.js), shared here so every
  // Command Centre's KPI tiles reveal the same way. Falls back to
  // setting the text immediately if the value isn't numeric-shaped or
  // the user has asked for reduced motion.
  function animateValue(target, finalText, duration) {
    var m = /^(\D*)([\d,]+)(\D*)$/.exec(String(finalText));
    if (!m || PREFERS_REDUCED_MOTION) {
      target.textContent = finalText;
      return;
    }
    var prefix = m[1], suffix = m[3];
    var end = parseInt(m[2].replace(/,/g, ''), 10);
    if (!isFinite(end)) { target.textContent = finalText; return; }
    var start = null, dur = duration || 900;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      target.textContent = prefix + Math.round(end * eased).toLocaleString('en-NG') + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Typewriter reveal — a single restrained executive touch, not a
  // site-wide gimmick. Types at a steady, unhurried pace and calls
  // opts.onDone when finished (used to chain the next reveal line).
  // Skipped entirely under reduced motion.
  function typewrite(el, text, opts) {
    opts = opts || {};
    if (PREFERS_REDUCED_MOTION || !el) {
      if (el) el.textContent = text;
      if (opts.onDone) opts.onDone();
      return;
    }
    var speed = opts.speed || 32;
    var i = 0;
    el.textContent = '';
    el.classList.add('exec-typewriter-caret');
    (function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(tick, speed);
      } else {
        el.classList.remove('exec-typewriter-caret');
        if (opts.onDone) opts.onDone();
      }
    })();
  }

  // Sequential typewriter chain — types each line in turn into the same
  // element, pausing between lines, then calls opts.onDone once the
  // final line has finished. Used for each Command Centre's scripted
  // multi-line greeting (Registrar/Finance/Ra'ees/Mudeer), plays once
  // per browser session per surface (guarded by the caller), and falls
  // back to showing the final line instantly under reduced motion.
  function typewriteChain(el, lines, opts) {
    opts = opts || {};
    if (!lines || !lines.length) { if (opts.onDone) opts.onDone(); return; }
    if (PREFERS_REDUCED_MOTION || !el) {
      if (el) el.textContent = lines[lines.length - 1];
      if (opts.onDone) opts.onDone();
      return;
    }
    var pause = opts.pause || 900;
    var i = 0;
    (function next() {
      typewrite(el, lines[i], { speed: opts.speed || 28, onDone: function () {
        i++;
        if (i < lines.length) setTimeout(next, pause);
        else if (opts.onDone) opts.onDone();
      } });
    })();
  }

  window.SHRSExecArrival = { play: playExecArrival, animateValue: animateValue, typewrite: typewrite, typewriteChain: typewriteChain };
})();
