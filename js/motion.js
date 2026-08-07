/* ===================================================================
   SHRS Motion Layer — engine
   -------------------------------------------------------------------
   Companion to css/motion.css. Handles the parts CSS cannot do alone:
   measuring SVG path lengths, scroll-linked parallax, pointer-tracked
   spotlight and magnetism, and the scroll progress rail.

   Every listener is passive and rAF-throttled; every effect is skipped
   entirely under prefers-reduced-motion, and pointer effects are skipped
   on touch devices where there is no cursor to follow.
   =================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasHover = !(window.matchMedia && window.matchMedia('(hover: none)').matches);

  /* ---- measure SVG paths so CSS can draw them ---- */
  function measure(root) {
    (root || document).querySelectorAll('.mo-draw, .mo-org-line').forEach(function (el) {
      var shapes = el.matches && el.matches('.mo-org-line') ? [el] : el.querySelectorAll('path,circle,rect,line,polyline,polygon');
      Array.prototype.forEach.call(shapes, function (s) {
        if (s.dataset.moLen) return;
        var len = 0;
        try { len = s.getTotalLength ? s.getTotalLength() : 0; } catch (e) { len = 0; }
        if (!len) {
          // circles and rects in some engines report 0 before layout; fall back
          // to a generous constant rather than leaving the shape invisible.
          len = 400;
        }
        s.dataset.moLen = '1';
        s.style.setProperty('--len', Math.ceil(len + 2));
      });
    });
  }

  /* ---- split a heading into word spans so they can rise in sequence ---- */
  function splitWords(el) {
    if (el.dataset.moSplit) return;
    el.dataset.moSplit = '1';
    // A line break inside a heading is the author's own line-setting, and
    // must survive being split into words. Reading textContent alone threw
    // it away, so "Faith and Scholarship,<br>One Inheritance." came back as
    // "Faith and Scholarship,One Inheritance." — the break gone and the two
    // lines run together without even a space between them. The heading is
    // walked instead, and <br> is carried through as itself.
    var parts = [];
    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType === 3) {
        node.nodeValue.replace(/\s+/g, ' ').split(' ').forEach(function (w) {
          if (w) parts.push(w);
        });
      } else if (node.nodeName === 'BR') {
        parts.push('\n');
      } else if (node.textContent) {
        node.textContent.replace(/\s+/g, ' ').split(' ').forEach(function (w) {
          if (w) parts.push(w);
        });
      }
    });
    if (!parts.length) return;

    var sr = document.createElement('span');
    sr.className = 'pr-sr';
    sr.textContent = parts.join(' ').replace(/ ?\n ?/g, ' ');
    el.textContent = '';
    el.appendChild(sr);

    var holder = document.createElement('span');
    holder.setAttribute('aria-hidden', 'true');
    var wordIndex = 0;
    parts.forEach(function (w, i) {
      if (w === '\n') { holder.appendChild(document.createElement('br')); return; }
      var s = document.createElement('span');
      s.textContent = w;
      s.style.setProperty('--w', wordIndex);
      wordIndex += 1;
      holder.appendChild(s);
      if (i < parts.length - 1 && parts[i + 1] !== '\n') {
        holder.appendChild(document.createTextNode(' '));
      }
    });
    el.appendChild(holder);
  }

  /* ---- reveal observer ---- */
  function initReveal() {
    var sel = '.mo-draw, .mo-mask-up, .mo-mask-left, .mo-rise, .mo-words, .mo-shine, .mo-org-line, .mo-org';
    var targets = document.querySelectorAll(sel);
    if (!targets.length) return;
    document.querySelectorAll('.mo-words').forEach(splitWords);
    measure(document);
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('mo-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('mo-in');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---- idle float: desynchronise a grid so it breathes, not pulses ---- */
  function initFloat() {
    if (reduce) return;
    document.querySelectorAll('.mo-float').forEach(function (el, i) {
      el.style.setProperty('--d', (i % 7) * 0.42 + 's');
    });
  }

  /* ---- scroll-linked parallax + progress rail ---- */
  function initScroll() {
    var pars = Array.prototype.slice.call(document.querySelectorAll('.mo-par, .mo-par-img'));
    var rail = document.querySelector('.mo-rail');
    if (reduce || (!pars.length && !rail)) return;
    var ticking = false;
    function frame() {
      ticking = false;
      var vh = window.innerHeight || 1;
      pars.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        // -1 when the element sits below the fold, +1 when it has passed above
        var centre = r.top + r.height / 2;
        var p = (centre - vh / 2) / (vh / 2 + r.height / 2);
        el.style.setProperty('--p', Math.max(-1, Math.min(1, p)).toFixed(3));
      });
      if (rail) {
        var d = document.documentElement;
        var max = (d.scrollHeight - d.clientHeight) || 1;
        rail.style.setProperty('--sp', Math.max(0, Math.min(1, d.scrollTop / max)).toFixed(4));
      }
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    frame();
  }

  /* ---- cursor spotlight over a section ---- */
  function initSpotlight() {
    if (reduce || !hasHover) return;
    document.querySelectorAll('.mo-spot').forEach(function (sec) {
      var raf = null, x = 50, y = 30;
      function apply() {
        raf = null;
        sec.style.setProperty('--sx', x.toFixed(1) + '%');
        sec.style.setProperty('--sy', y.toFixed(1) + '%');
      }
      sec.addEventListener('pointermove', function (e) {
        var r = sec.getBoundingClientRect();
        x = ((e.clientX - r.left) / r.width) * 100;
        y = ((e.clientY - r.top) / r.height) * 100;
        sec.classList.add('is-lit');
        if (raf === null) raf = requestAnimationFrame(apply);
      }, { passive: true });
      sec.addEventListener('pointerleave', function () { sec.classList.remove('is-lit'); });
    });
  }

  /* ---- magnetic buttons ---- */
  function initMagnetic() {
    if (reduce || !hasHover) return;
    document.querySelectorAll('.mo-mag').forEach(function (btn) {
      var raf = null, dx = 0, dy = 0;
      function apply() {
        raf = null;
        btn.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
      }
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var strength = parseFloat(btn.getAttribute('data-mag') || '7');
        dx = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength;
        dy = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength;
        btn.classList.add('is-pulled');
        if (raf === null) raf = requestAnimationFrame(apply);
      }, { passive: true });
      btn.addEventListener('pointerleave', function () {
        btn.classList.remove('is-pulled');
        btn.style.transform = '';
      });
    });
  }


  /* ---- raking light ----
     Real gilt has no fixed highlight; the bright band moves with the viewer.
     We publish the pointer's position on the document element and let every
     gold surface read it, so the sheen travels as the reader does. One rAF
     per move, two custom properties, no per-element work. */
  function initRake() {
    if (reduce || !hasHover) return;
    var raf = null, gx = 50, gy = 50;
    function apply() {
      raf = null;
      var r = document.documentElement;
      r.style.setProperty('--gx', gx.toFixed(1));
      r.style.setProperty('--gy', gy.toFixed(1));
    }
    window.addEventListener('pointermove', function (e) {
      gx = (e.clientX / (window.innerWidth || 1)) * 100;
      gy = (e.clientY / (window.innerHeight || 1)) * 100;
      if (raf === null) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  function init() {
    initReveal();
    initRake();
    initFloat();
    initScroll();
    initSpotlight();
    initMagnetic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();

/* ===================================================================
   SHRS Interaction Sound
   -------------------------------------------------------------------
   A short, soft confirmation tone on deliberate interactions — the
   banking-app "tick". Synthesised with WebAudio rather than shipping an
   audio file, so it costs nothing to download and can be tuned here.

   Rules it obeys: nothing is created until the visitor's first gesture
   (browsers require this, and it means a page never makes noise at a
   visitor unprompted); it fires only on genuine controls, never on
   scroll or hover; it is quiet by design; and a persistent toggle sits
   in the corner so it can be silenced for good on that device.
   =================================================================== */
(function () {
  'use strict';
  var KEY = 'shrsSound';
  var enabled = (function () {
    try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; }
  })();
  var ctx = null;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }

  /* A small palette rather than one sound. Each voice is a short additive
     figure — a couple of partials with a fast exponential decay — chosen so
     the ear can tell an action apart from a confirmation apart from a
     refusal, without any of them becoming a novelty. Frequencies sit in a
     just-intoned relationship so two firing close together never beat. */
  var VOICES = {
    // a light contact: cards, chips, tiles
    soft:    { partials: [[880, .026], [1320, .016]], type: 'triangle', spread: .012, decay: .15 },
    // a deliberate press: primary buttons and links
    firm:    { partials: [[1180, .032], [1760, .022]], type: 'triangle', spread: .014, decay: .18 },
    // something opening: an accordion, a stage, a detail panel
    open:    { partials: [[740, .026], [988, .022], [1318, .014]], type: 'sine', spread: .028, decay: .20 },
    // the same thing closing — the figure inverted
    close:   { partials: [[1318, .022], [988, .018], [740, .014]], type: 'sine', spread: .026, decay: .17 },
    // navigation away from the page
    nav:     { partials: [[660, .026], [990, .020], [1320, .013]], type: 'triangle', spread: .034, decay: .22 },
    // a verified result: a rising major triad, the only voice allowed to sing
    success: { partials: [[784, .030], [988, .026], [1175, .022], [1568, .016]], type: 'sine', spread: .075, decay: .38 },
    // a refusal: low, flat, brief. Never harsh.
    deny:    { partials: [[196, .030], [233, .022]], type: 'sine', spread: .055, decay: .30 },
    // the toggle acknowledging itself
    toggle:  { partials: [[1046, .028], [1568, .018]], type: 'triangle', spread: .016, decay: .16 }
  };

  function play(name) {
    if (!enabled) return;
    var v = VOICES[name] || VOICES.soft;
    var c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    var t = c.currentTime;
    v.partials.forEach(function (pair, i) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = v.type;
      o.frequency.setValueAtTime(pair[0], t);
      var at = t + i * v.spread;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pair[1]), at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, at + v.decay);
      o.connect(g); g.connect(c.destination);
      o.start(at);
      o.stop(at + v.decay + 0.05);
    });
  }
  function tick(kind) { play(kind === 'firm' ? 'firm' : 'soft'); }

  var FIRM = '.pr-btn, .btn, .btn-gold, .ic-cta, .adm-enquiry-btn, .idc-flip';
  var SOFT = '.pr-chip, .pr-committee, .pr-card, .pr-person, .pr-org-node, .ic-dot, .el-voices-btn, .pr-outcome, .pr-doc';
  var TOGGLES = '.faq-question, .flow-stage, [aria-expanded]';

  document.addEventListener('click', function (e) {
    if (!enabled) return;
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-sound-toggle]')) return;

    // a control that opens and closes gets two different voices, so the ear
    // learns the state as quickly as the eye
    var tog = t.closest(TOGGLES);
    if (tog) {
      var wasOpen = tog.getAttribute('aria-expanded') === 'true' || tog.classList.contains('is-open');
      play(wasOpen ? 'close' : 'open');
      return;
    }
    // a link that leaves the page announces the departure
    var link = t.closest('a[href]');
    if (link) {
      var href = link.getAttribute('href') || '';
      var leaves = href && href.charAt(0) !== '#' && !link.hasAttribute('download');
      if (leaves && t.closest(FIRM)) { play('firm'); return; }
      if (leaves) { play('nav'); return; }
    }
    if (t.closest(FIRM)) play('firm');
    else if (t.closest(SOFT)) play('soft');
  }, { passive: true });

  // A verification result announces itself: sung if the record is good,
  // low and brief if it is not. Read from what the verifier printed, never
  // decided here.
  document.querySelectorAll('[data-identity-verify-result],[data-certificate-verify-result],[data-receipt-verify-result],[data-graduation-document-verify-result]').forEach(function (box) {
    new MutationObserver(function () {
      var txt = (box.textContent || '').toLowerCase();
      if (!txt.trim()) return;
      if (box.dataset.soundDone === txt) return;
      box.dataset.soundDone = txt;
      if (/checking|verifying/.test(txt)) return;
      if (/\bactive\b|genuine|valid|verified/.test(txt)) play('success');
      else if (/not found|revok|invalid|error|expired|tamper/.test(txt)) play('deny');
    }).observe(box, { childList: true, subtree: true });
  });

  /* the toggle */
  function mountToggle() {
    if (document.querySelector('[data-sound-toggle]')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pr-sound-toggle';
    b.setAttribute('data-sound-toggle', '');
    function paint() {
      b.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      b.setAttribute('aria-label', enabled ? 'Interface sound on. Turn off.' : 'Interface sound off. Turn on.');
      b.title = enabled ? 'Interface sound on' : 'Interface sound off';
      b.innerHTML = enabled
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
      b.classList.toggle('is-off', !enabled);
    }
    b.addEventListener('click', function () {
      enabled = !enabled;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) {}
      // The Personalisation Centre carries the same preference under its
      // own key. Writing both keeps one setting in two places from
      // disagreeing with itself, whichever control the reader used.
      try {
        var raw = localStorage.getItem('shrsPersonalisation');
        var prefs = raw ? JSON.parse(raw) : {};
        prefs.interfaceSound = enabled ? 'on' : 'off';
        localStorage.setItem('shrsPersonalisation', JSON.stringify(prefs));
        document.documentElement.setAttribute('data-pc-sound', prefs.interfaceSound);
      } catch (e) { /* storage unavailable — the toggle still works for this visit */ }
      // the spoken introduction listens for this and fades itself out
      window.dispatchEvent(new Event(enabled ? 'shrs:sound-on' : 'shrs:sound-off'));
      paint();
      if (enabled) play('toggle');
    });

    // The Personalisation Centre can change this preference too; when it
    // does, the floating toggle must show the new state rather than the
    // one it was born with.
    window.addEventListener('shrs:sound-off', function () { if (enabled) { enabled = false; paint(); } });
    window.addEventListener('shrs:sound-on', function () { if (!enabled) { enabled = true; paint(); } });

    paint();
    document.body.appendChild(b);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle);
  } else { mountToggle(); }
})();
