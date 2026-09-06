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

  /* ---- dashboard section reveal, sitewide ----
     js/portal-founder-dashboard.js already does exactly this for the
     Founder page alone (its own setupScrollReveal, added when that
     page's real data resolves). Reusing the identical CSS contract
     (.js-scroll-pending / .js-scroll-in / @keyframes pfd-scroll-reveal,
     already defined once in css/portal.css) here makes every other
     dashboard's .pfd-section cards stagger in on scroll too, instead of
     that being one page's bespoke feature. Classes are only ever ADDED
     by script, never a default hidden state in CSS, so a page where
     this script fails to load still shows its content — the same
     safety property the Founder page's own version already has. */
  function initSectionReveal() {
    if (reduce || !('IntersectionObserver' in window)) return;
    // Founder's dashboard ships its own older, more elaborate scroll-reveal
    // (an arrival-sequence-aware version with a fast-scroll settle-check
    // this generic one doesn't have) that reads and writes the exact same
    // js-scroll-pending/js-scroll-in classes on the exact same .pfd-section
    // elements. Running both would mean two IntersectionObservers doing
    // duplicate work on one page, and — since Founder's own version
    // unconditionally re-adds js-scroll-pending without checking whether a
    // section is already revealed — a real risk of this generic observer
    // revealing a section first, only for Founder's to briefly hide it
    // again. Its script tag is present in the DOM (deferred scripts still
    // parse before DOMContentLoaded) whether or not it has run yet, so
    // this is a reliable, zero-coupling way to yield to it.
    if (document.querySelector('script[src*="portal-founder-dashboard.js"]')) return;
    var sections = document.querySelectorAll('.pfd-section');
    if (!sections.length) return;
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('js-scroll-pending');
        e.target.classList.add('js-scroll-in');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    sections.forEach(function (s) {
      if (s.classList.contains('js-scroll-in')) return;
      s.classList.add('js-scroll-pending');
      io.observe(s);
    });
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

  /* ---- 3D tilt toward the cursor ----
     A genuine perspective tilt (not a flat hover lift) on the surfaces
     that most deserve to feel like an object rather than a rectangle —
     the gateway doors, the executive hero. Bounded to a few degrees so
     it reads as "responsive metal," not a gimmick; the existing gold
     -edge/foil treatments already ride along for free since they're
     drawn on the same element. No new markup: targets .gateway-card
     and .mo-tilt directly, same convention as .mo-spot/.mo-mag above. */
  function initTilt() {
    if (reduce || !hasHover) return;
    document.querySelectorAll('.gateway-card, .portal-child-card, .mo-tilt').forEach(function (card) {
      var raf = null, rx = 0, ry = 0;
      // .portal-child-card sits in denser grids (office tiles, class
      // rosters) than the eight gateway doors, so it gets a shallower
      // tilt and a shorter lift — "responsive metal," not a gimmick that
      // fights the surrounding grid for attention.
      var isChildCard = card.classList.contains('portal-child-card');
      var max = parseFloat(card.getAttribute('data-tilt') || (isChildCard ? '2.5' : '5'));
      var lift = isChildCard ? -4 : -9;
      function apply() {
        raf = null;
        card.style.transform = 'perspective(900px) translateY(' + lift + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      }
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        ry = (px - 0.5) * (max * 2);
        rx = (0.5 - py) * (max * 2);
        card.classList.add('is-tilted');
        if (raf === null) raf = requestAnimationFrame(apply);
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilted');
        card.style.transform = '';
      });
    });
  }

  // The .pch-menu-panel grid is anchored to its toggle's start edge (see
  // css/portal-chrome.css) because that toggle sits in different spots on
  // different pages' topbars — sometimes with room to spare, sometimes
  // hard against the far-right utility cluster. A fixed CSS anchor can
  // only be right for some of those pages; real-device QA found the
  // panel running past the viewport's right edge on ones where the
  // toggle sits close to it (clipped invisibly by html/body's sitewide
  // overflow-x:clip in css/brand.css, not scrollable into view). This
  // measures the open panel against the real viewport each time and
  // nudges it back in with a margin, on whichever side it overflows.
  // margin-left, not transform: the panel's own materialize keyframe
  // animates transform with fill-mode "both", so its end value (none)
  // sticks in the cascade's animation layer and silently overrides any
  // transform set from JS afterwards — the same class of bug as the
  // tilt-vs-hover fix elsewhere in this file, different property.
  function initMenuPanelClamp() {
    var menus = document.querySelectorAll('.pch-menu');
    if (!menus.length) return;
    function clamp(panel) {
      panel.style.marginLeft = '';
      // Two passes: the first corrects the (unshifted) overflow, but
      // shifting the box changes its own rect, so one more measurement
      // against the now-shifted position catches any remainder exactly
      // rather than trusting a single linear estimate.
      for (var i = 0; i < 2; i++) {
        var rect = panel.getBoundingClientRect();
        var vw = document.documentElement.clientWidth;
        var overflowRight = rect.right - (vw - 12);
        var overflowLeft = 12 - rect.left;
        var current = parseFloat(panel.style.marginLeft) || 0;
        if (overflowRight > 0) panel.style.marginLeft = (current - overflowRight) + 'px';
        else if (overflowLeft > 0) panel.style.marginLeft = (current + overflowLeft) + 'px';
        else break;
      }
    }
    menus.forEach(function (menu) {
      var panel = menu.querySelector('.pch-menu-panel');
      if (!panel) return;
      menu.addEventListener('toggle', function () {
        if (!menu.open) return;
        // An immediate best-effort pass (the panel is still mid-materialize
        // here — its entrance keyframe scales up from .96 — so this can
        // undershoot slightly), then the authoritative one once that
        // animation actually finishes and the box is at its real size.
        requestAnimationFrame(function () { clamp(panel); });
        panel.addEventListener('animationend', function () { clamp(panel); }, { once: true });
      });
      window.addEventListener('resize', function () {
        if (menu.open) clamp(panel);
      }, { passive: true });
    });
  }

  function init() {
    initReveal();
    initSectionReveal();
    initRake();
    initFloat();
    initScroll();
    initSpotlight();
    initMagnetic();
    initTilt();
    initMenuPanelClamp();
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

  // The floating toggle is retired: interface sound is a preference, and
  // preferences belong in the Personalisation Centre, where this one now
  // lives alongside typeface, leading, contrast and the rest. The module
  // still listens for the preference so a change takes effect at once,
  // without a reload.
  function mountNothing() {
    window.addEventListener('shrs:sound-off', function () { enabled = false; });
    window.addEventListener('shrs:sound-on', function () { enabled = true; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountNothing);
  } else { mountNothing(); }
})();
