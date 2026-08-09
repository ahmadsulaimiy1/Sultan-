/* ===================================================================
   THE KINETIC LAYER
   -------------------------------------------------------------------
   Three instruments — the royal ticker, the turning word, the line
   lift — and one rule shared by all of them:

     THE WORDS ARE ALWAYS IN THE PAGE.

   Nothing here types text into an empty element. Every sentence is in
   the markup before this file runs, and what the script animates is a
   copy marked aria-hidden, or the real text moved inside a wrapper
   that does not change what it says. A reader with the script blocked,
   a screen reader, and a crawler all get the sentence whole. An effect
   that can lose the sentence is not an effect.

   Everything stops for Motion: Reduced — and stops in the READABLE
   state, never the hidden one.
   =================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var still = root.getAttribute('data-pc-motion') === 'reduced'
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-lit');
          io.unobserve(e.target);
        });
      }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' })
    : null;

  function arrive(el) {
    if (!el) return;
    if (still || !io) { el.classList.add('is-lit'); return; }
    io.observe(el);
  }

  /* =================================================================
     1. THE ROYAL TICKER
     -----------------------------------------------------------------
     The markup carries ONE run of items. A seamless loop needs two
     identical runs and a translate of exactly -50%, so the second is
     cloned here rather than written twice into the page — a hand-
     duplicated list is a list that will be edited in one place only.

     The clone is aria-hidden and the whole band is given role="marquee"
     with aria-live="off", so a screen reader reads the entries once,
     as a list, and is never told about them again as they cycle past.

     The duration is derived from the measured width at a fixed speed
     in pixels per second, so a longer list moves for longer rather
     than faster: the reading pace stays the same however many entries
     the school adds.
     ================================================================= */
  var SPEED = 46; // px per second — a comfortable reading pace

  function ticker(band) {
    if (band.dataset.kxDone) return;
    var run = band.querySelector('.kx-run');
    if (!run) return;
    band.dataset.kxDone = '1';

    band.setAttribute('role', 'marquee');
    band.setAttribute('aria-live', 'off');

    var track = document.createElement('div');
    track.className = 'kx-track';
    run.parentNode.insertBefore(track, run);
    track.appendChild(run);

    var twin = run.cloneNode(true);
    twin.setAttribute('aria-hidden', 'true');
    track.appendChild(twin);

    var sheen = document.createElement('span');
    sheen.className = 'kx-sheen';
    sheen.setAttribute('aria-hidden', 'true');
    band.appendChild(sheen);

    function pace() {
      var w = run.getBoundingClientRect().width;
      if (!w) return;
      band.style.setProperty('--kx-dur', Math.max(24, Math.round(w / SPEED)) + 's');
    }
    pace();
    if (!still) band.classList.add('is-running');

    var t = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(t);
      t = window.setTimeout(pace, 200);
    }, { passive: true });
  }

  /* =================================================================
     2. THE TURNING WORD
     -----------------------------------------------------------------
     data-kx-cycle="one|two|three". The FIRST word must already be in
     the element as ordinary text — that is what a reader without this
     script sees, and what a crawler indexes. The rest are added as
     hidden siblings and turned through.

     A sizer holds the box open at the width of the longest word, so
     the sentence around it never reflows as they turn. Without it the
     line jumps on every change and the eye follows the jump instead of
     the word.
     ================================================================= */
  function cycler(el) {
    if (el.dataset.kxDone) return;
    var raw = el.getAttribute('data-kx-cycle') || '';
    var words = raw.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var first = (el.textContent || '').trim();
    if (first && words.indexOf(first) < 0) words.unshift(first);
    if (words.length < 2) return;
    el.dataset.kxDone = '1';

    el.classList.add('kx-cycle');
    el.textContent = '';
    /* Announced once, as a list. The turning is decoration; the set of
       answers is the information. */
    el.setAttribute('aria-label', words.join(', '));

    var longest = words.reduce(function (a, b) { return b.length > a.length ? b : a; }, '');
    var sizer = document.createElement('span');
    sizer.className = 'kx-sizer';
    sizer.setAttribute('aria-hidden', 'true');
    sizer.textContent = longest;
    el.appendChild(sizer);

    var nodes = words.map(function (w) {
      var s = document.createElement('span');
      s.className = 'kx-word';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = w;
      el.appendChild(s);
      return s;
    });
    nodes[0].classList.add('is-in');
    if (still) return;

    var i = 0, timer = null;
    function turn() {
      var out = nodes[i];
      i = (i + 1) % nodes.length;
      var into = nodes[i];
      out.classList.remove('is-in');
      out.classList.add('is-out');
      into.classList.remove('is-out');
      // one frame between, so the entering word has a start state
      requestAnimationFrame(function () { into.classList.add('is-in'); });
      window.setTimeout(function () { out.classList.remove('is-out'); }, 600);
    }
    function start() { if (!timer) timer = window.setInterval(turn, 2600); }
    function stop() { window.clearInterval(timer); timer = null; }
    // Never turning where nobody is looking, and never in a hidden tab.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: 0 }).observe(el);
    } else start();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

  /* =================================================================
     3. THE LINE LIFT
     -----------------------------------------------------------------
     A heading raised a line at a time as it is reached. The lines are
     found by MEASURING where the browser actually broke the text, not
     by guessing at a character count — so it survives a translation, a
     larger type size and a narrow screen, all three of which move the
     break.

     The element keeps its own text as its accessible name; the split
     copy is aria-hidden, so a screen reader is never handed a heading
     chopped into fragments.
     ================================================================= */
  function lines(el) {
    if (el.dataset.kxDone) return;
    var full = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!full) return;
    el.dataset.kxDone = '1';
    el.setAttribute('aria-label', full);

    var words = full.split(' ');
    var probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    el.textContent = '';
    el.appendChild(probe);
    probe.innerHTML = words.map(function (w, i) {
      return '<i style="font-style:inherit" data-w="' + i + '">' + w + '</i>';
    }).join(' ');

    // Group the words by the top edge the browser gave them.
    var rows = [], last = null;
    Array.prototype.forEach.call(probe.querySelectorAll('i'), function (n) {
      var top = Math.round(n.getBoundingClientRect().top);
      if (last === null || Math.abs(top - last) > 3) { rows.push([]); last = top; }
      rows[rows.length - 1].push(n.textContent);
    });
    if (!rows.length) { el.textContent = full; return; }

    el.removeChild(probe);
    el.classList.add('kx-lines');
    var holder = document.createElement('span');
    holder.setAttribute('aria-hidden', 'true');
    rows.forEach(function (r, i) {
      var line = document.createElement('span');
      line.className = 'kx-line';
      var inner = document.createElement('span');
      inner.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
      inner.textContent = r.join(' ');
      line.appendChild(inner);
      holder.appendChild(line);
    });
    el.appendChild(holder);
    arrive(el);
  }

  /* ---------------------------------------------------------------- */
  function mount() {
    Array.prototype.forEach.call(document.querySelectorAll('.kx-ticker'), function (b) {
      try { ticker(b); } catch (e) {}
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-kx-cycle]'), function (b) {
      try { cycler(b); } catch (e) {}
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-kx-lines]'), function (b) {
      try { lines(b); } catch (e) {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
