/* ===================================================================
   THE MASTHEAD CHRONOMETER
   -------------------------------------------------------------------
   An analogue dial in the masthead showing the time in Ikorodu — the
   shape of the hour rather than the digits of it.

   It is drawn the way a real wristwatch is drawn, because that is what
   makes one read as an instrument rather than as a clip-art clock:

     · a fluted bezel of sixty flutes, cut round the case;
     · a sunburst dial, lit from the upper left as a lacquered dial is;
     · applied baton indices, doubled at twelve and blocked at three,
       six and nine, with a minute track between them;
     · dauphine hour and minute hands — faceted, so each carries a lit
       half and a shaded half rather than being a flat stick;
     · a seconds hand with a counterweight that SWEEPS at eight beats a
       second, which is the giveaway: a quartz clock ticks once a
       second and a mechanical one does not;
     · a crown at three, outside the case, with its own flutes;
     · the school's own mark under twelve, where a maker signs a dial.

   The time itself comes from the visitor's device, converted to Lagos
   by the browser's timezone database — so the dial shows the school's
   hour whether it is read in Ikorodu, London or Riyadh. Nothing is
   fetched and nothing is sent.

   Pressing it opens the same dial at size with the date beneath, and
   the digits for anyone who would rather read them.

   It never runs when it cannot be seen: the loop stops when the tab is
   hidden and when the masthead scrolls away, and it is not built at all
   under Motion: Reduced, where a sweeping hand is exactly the kind of
   perpetual movement that setting exists to stop.
   =================================================================== */
(function () {
  'use strict';

  var host = document.querySelector('[data-clock]');
  if (!host) return;

  var ZONE = 'Africa/Lagos';
  var LANG = (document.documentElement.lang || 'en').toLowerCase();

  try { new Intl.DateTimeFormat('en', { timeZone: ZONE }).format(new Date()); }
  catch (e) { host.remove(); return; }

  var reduced = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    || document.documentElement.getAttribute('data-pc-motion') === 'reduced';

  // ---- the dial ------------------------------------------------------
  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function pol(cx, cy, r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  var uid = 0;
  function dial(size) {
    uid += 1;
    var id = 'rlx' + uid;
    var svg = el('svg', { viewBox: '0 0 100 100', class: 'rlx-dial', 'aria-hidden': 'true', focusable: 'false' });

    var defs = el('defs');
    // The dial's sunburst, lit from the upper left.
    var face = el('radialGradient', { id: id + '-face', cx: '34%', cy: '28%', r: '78%' });
    [['0%', 'var(--rlx-face-1)'], ['58%', 'var(--rlx-face-2)'], ['100%', 'var(--rlx-face-3)']]
      .forEach(function (s) { face.appendChild(el('stop', { offset: s[0], 'stop-color': s[1] })); });
    defs.appendChild(face);
    // The case: gold turned on a lathe, so the light runs round it.
    var caseG = el('linearGradient', { id: id + '-case', x1: '0', y1: '0', x2: '1', y2: '1' });
    [['0%', 'var(--rlx-gold-2)'], ['30%', 'var(--rlx-gold-1)'], ['52%', 'var(--rlx-gold-3)'],
     ['74%', 'var(--rlx-gold-1)'], ['100%', 'var(--rlx-gold-2)']]
      .forEach(function (s) { caseG.appendChild(el('stop', { offset: s[0], 'stop-color': s[1] })); });
    defs.appendChild(caseG);
    svg.appendChild(defs);

    // the crown at three, drawn before the case so the case laps it
    var crown = el('g', { class: 'rlx-crown' });
    crown.appendChild(el('rect', { x: 95.4, y: 46.6, width: 4.4, height: 6.8, rx: 1.2,
      fill: 'url(#' + id + '-case)' }));
    for (var c = 0; c < 4; c++) {
      crown.appendChild(el('line', { x1: 95.8 + c * 1.1, y1: 47.4, x2: 95.8 + c * 1.1, y2: 52.6,
        stroke: 'var(--rlx-gold-3)', 'stroke-width': 0.3 }));
    }
    svg.appendChild(crown);

    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 47.5, fill: 'url(#' + id + '-case)' }));

    // the fluted bezel — sixty flutes cut round the case
    var flutes = el('g', { class: 'rlx-flutes' });
    for (var f = 0; f < 60; f++) {
      var a = f * 6;
      var p1 = pol(50, 50, 47.4, a), p2 = pol(50, 50, 41.8, a);
      flutes.appendChild(el('line', {
        x1: p1[0].toFixed(2), y1: p1[1].toFixed(2), x2: p2[0].toFixed(2), y2: p2[1].toFixed(2),
        stroke: 'var(--rlx-flute)', 'stroke-width': 0.55, 'stroke-linecap': 'round'
      }));
    }
    svg.appendChild(flutes);

    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 41.6, fill: 'var(--rlx-gold-3)' }));
    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 40.4, fill: 'url(#' + id + '-face)' }));

    // the minute track
    var track = el('g', { class: 'rlx-track' });
    for (var m = 0; m < 60; m++) {
      if (m % 5 === 0) continue;
      var q1 = pol(50, 50, 37.6, m * 6), q2 = pol(50, 50, 35.6, m * 6);
      track.appendChild(el('line', {
        x1: q1[0].toFixed(2), y1: q1[1].toFixed(2), x2: q2[0].toFixed(2), y2: q2[1].toFixed(2),
        stroke: 'var(--rlx-track)', 'stroke-width': 0.55, 'stroke-linecap': 'round'
      }));
    }
    svg.appendChild(track);

    // applied indices: doubled at twelve, blocked at three, six and nine
    var idx = el('g', { class: 'rlx-idx' });
    for (var h = 0; h < 12; h++) {
      var deg = h * 30;
      if (h === 0) {
        [-3.6, 3.6].forEach(function (off) {
          var t = pol(50, 50, 30.5, 0);
          idx.appendChild(el('rect', {
            x: (t[0] + off - 1.1).toFixed(2), y: (t[1] - 3.6).toFixed(2),
            width: 2.2, height: 8.6, rx: 0.5, fill: 'var(--rlx-idx)'
          }));
        });
        continue;
      }
      var block = (h === 3 || h === 6 || h === 9);
      var t2 = pol(50, 50, block ? 30.2 : 31.4, deg);
      var g = el('g', { transform: 'rotate(' + deg + ' 50 50)' });
      var y = block ? 15.6 : 16.4;
      g.appendChild(el('rect', {
        x: block ? 48.2 : 48.7, y: y.toFixed(2),
        width: block ? 3.6 : 2.6, height: block ? 8.8 : 7.4,
        rx: 0.5, fill: 'var(--rlx-idx)'
      }));
      idx.appendChild(g);
    }
    svg.appendChild(idx);

    // the maker's mark, where a dial is signed
    var mark = el('text', {
      x: 50, y: 32.5, class: 'rlx-sig', 'text-anchor': 'middle', fill: 'var(--rlx-sig)'
    });
    mark.textContent = 'SHRS';
    svg.appendChild(mark);
    var sub = el('text', {
      x: 50, y: 71.5, class: 'rlx-sub', 'text-anchor': 'middle', fill: 'var(--rlx-sig)'
    });
    sub.textContent = 'IKORODU';
    svg.appendChild(sub);

    // dauphine hands: two facets each, one lit and one shaded
    // A dauphine hand is a long faceted lozenge: two triangles meeting on
    // the centre line, one catching the light and one in shadow. The thin
    // outline is what keeps it legible at 38px in the masthead, where the
    // two facets are barely two pixels apart.
    function hand(cls, len, half, tail) {
      var g = el('g', { class: cls });
      var apex = 50 - len, base = 50 + tail;
      g.appendChild(el('path', {
        d: 'M50 ' + apex + ' L' + (50 - half) + ' 50 L50 ' + base + ' Z',
        fill: 'var(--rlx-hand-1)'
      }));
      g.appendChild(el('path', {
        d: 'M50 ' + apex + ' L' + (50 + half) + ' 50 L50 ' + base + ' Z',
        fill: 'var(--rlx-hand-2)'
      }));
      g.appendChild(el('path', {
        d: 'M50 ' + apex + ' L' + (50 - half) + ' 50 L50 ' + base
          + ' L' + (50 + half) + ' 50 Z',
        fill: 'none', stroke: 'var(--rlx-hand-edge)', 'stroke-width': 0.5,
        'stroke-linejoin': 'round'
      }));
      return g;
    }
    svg.appendChild(hand('rlx-h', 22, 3.4, 5.5));
    svg.appendChild(hand('rlx-m', 32.5, 2.6, 6.5));

    var sec = el('g', { class: 'rlx-s' });
    sec.appendChild(el('line', { x1: 50, y1: 62, x2: 50, y2: 14.5,
      stroke: 'var(--rlx-sec)', 'stroke-width': 1.15, 'stroke-linecap': 'round' }));
    sec.appendChild(el('circle', { cx: 50, cy: 64.5, r: 3.1, fill: 'var(--rlx-sec)' }));
    sec.appendChild(el('circle', { cx: 50, cy: 64.5, r: 1.35, fill: 'var(--rlx-face-2)' }));
    svg.appendChild(sec);

    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 1.9, fill: 'var(--rlx-gold-1)' }));
    svg.appendChild(el('circle', { cx: 50, cy: 50, r: 0.8, fill: 'var(--rlx-face-3)' }));

    // the crystal: one raking highlight across the glass
    var glass = el('path', {
      class: 'rlx-glass',
      d: 'M18 30 A40 40 0 0 1 62 13.5 L30 66 A40 40 0 0 1 18 30 Z',
      fill: 'var(--rlx-glass)'
    });
    svg.appendChild(glass);

    if (size) svg.setAttribute('width', size), svg.setAttribute('height', size);
    return svg;
  }

  // ---- the time ------------------------------------------------------
  var fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  var offset = 0, offsetAt = 0;
  function refreshOffset() {
    var now = Date.now();
    var got = {};
    fmt.formatToParts(new Date(now)).forEach(function (p) { got[p.type] = p.value; });
    var lagos = (parseInt(got.hour, 10) % 24) * 3600 + parseInt(got.minute, 10) * 60 + parseInt(got.second, 10);
    var utc = Math.floor(now / 1000) % 86400;
    var diff = lagos - utc;
    if (diff > 43200) diff -= 86400;
    if (diff < -43200) diff += 86400;
    offset = diff;
    offsetAt = now;
  }
  refreshOffset();

  function seconds() {
    var now = Date.now();
    if (now - offsetAt > 60000) refreshOffset();
    return ((now / 1000) + offset) % 86400;
  }

  // ---- mounting ------------------------------------------------------
  var btn = host.querySelector('[data-clock-btn]');
  var pop = host.querySelector('[data-clock-pop]');
  if (!btn || !pop) return;

  btn.appendChild(dial());
  var big = dial();
  big.classList.add('is-large');
  pop.insertBefore(big, pop.firstChild);
  host.removeAttribute('hidden');

  var hands = [];
  [btn, pop].forEach(function (scope) {
    hands.push({
      h: scope.querySelector('.rlx-h'),
      m: scope.querySelector('.rlx-m'),
      s: scope.querySelector('.rlx-s')
    });
  });

  var elDate = pop.querySelector('[data-clock-date]');
  var elDigits = pop.querySelector('[data-clock-digits]');
  var lastMinute = -1;

  function paint() {
    var t = seconds();
    // Eight beats a second, which is what a mechanical movement does and
    // a quartz one cannot. A whole-second step here would give the game
    // away instantly.
    var s = reduced ? Math.floor(t) : Math.floor(t * 8) / 8;
    var m = (t / 60) % 60;
    var h = (t / 3600) % 12;
    var rs = s % 60 * 6, rm = m * 6, rh = h * 30;
    hands.forEach(function (set) {
      if (set.h) set.h.setAttribute('transform', 'rotate(' + rh.toFixed(3) + ' 50 50)');
      if (set.m) set.m.setAttribute('transform', 'rotate(' + rm.toFixed(3) + ' 50 50)');
      if (set.s) set.s.setAttribute('transform', 'rotate(' + rs.toFixed(3) + ' 50 50)');
    });
    var min = Math.floor(t / 60);
    if (min !== lastMinute) {
      lastMinute = min;
      var hh = Math.floor(t / 3600), mm = Math.floor(t / 60) % 60;
      if (elDigits) {
        elDigits.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
      }
      if (elDate) {
        try {
          elDate.textContent = new Intl.DateTimeFormat(LANG, {
            timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          }).format(new Date());
        } catch (e) { elDate.textContent = ''; }
      }
    }
    btn.setAttribute('aria-label', btn.getAttribute('data-label-base') + ' — '
      + String(Math.floor(t / 3600)).padStart(2, '0') + ':'
      + String(Math.floor(t / 60) % 60).padStart(2, '0'));
  }

  var raf = null, running = false;
  function loop() { paint(); raf = window.requestAnimationFrame(loop); }
  function run() {
    if (running || document.hidden) return;
    running = true; loop();
  }
  function halt() {
    running = false;
    if (raf) { window.cancelAnimationFrame(raf); raf = null; }
  }
  paint();
  run();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) halt(); else run();
  });
  // A hand sweeping in a masthead that has scrolled away is a frame
  // budget spent on nothing.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) run(); else if (!host.classList.contains('is-open')) halt();
      });
    }, { threshold: 0 }).observe(host);
  }

  function openPop() {
    host.classList.add('is-open');
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    run();
    requestAnimationFrame(function () { pop.classList.add('is-shown'); });
  }
  function closePop() {
    host.classList.remove('is-open');
    pop.classList.remove('is-shown');
    btn.setAttribute('aria-expanded', 'false');
    window.setTimeout(function () { if (!host.classList.contains('is-open')) pop.hidden = true; }, 340);
  }
  btn.addEventListener('click', function () {
    if (host.classList.contains('is-open')) closePop(); else openPop();
  });
  document.addEventListener('pointerdown', function (e) {
    if (!host.classList.contains('is-open')) return;
    if (host.contains(e.target)) return;
    closePop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && host.classList.contains('is-open')) { closePop(); btn.focus(); }
  });
})();
