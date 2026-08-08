/* ===================================================================
   THE STORY LAYER — the figures on Discover SHRS
   -------------------------------------------------------------------
   Four drawn instruments and two pieces of apparatus, built here
   rather than typed into the page:

     · the shield, quartered and wired to the four crest cards
     · the CLEVER rosette, wired to the six value cards
     · the chain of accountability, built from the leadership cards
     · the escalation, built from the safeguarding cards
     · the numbered undertakings
     · gilt motes drifting in the royal band

   One rule governs all of it: NOTHING HERE INVENTS A LABEL. Every
   name a figure prints is read out of a card already in the markup,
   so a figure cannot say something the text beside it does not, and a
   page translated once is a page whose figures are translated too.
   The two or three labels that have no card to come from (the Board,
   the Head of Schools, the fifth institution, the first step of the
   escalation) are read from data- attributes on the mount, which live
   in the page file where a translator will find them.

   Everything yields to Motion: Reduced and to the operating system's
   reduced-motion setting: the figures are still drawn, complete, and
   simply do not animate.
   =================================================================== */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var still = root.getAttribute('data-pc-motion') === 'reduced'
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- small helpers --------------------------------------- */

  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) {
      e.setAttribute(k, attrs[k]);
    }
    return e;
  }
  function text(node) { return (node && node.textContent || '').replace(/\s+/g, ' ').trim(); }

  /* Break a string into lines of at most `max` characters without
     splitting a word. Used for every label a figure sets in SVG,
     where there is no line box to do it for us. */
  function wrap(str, max, cap) {
    var words = String(str || '').split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (next.length > max && line) { lines.push(line); line = words[i]; }
      else line = next;
    }
    if (line) lines.push(line);
    if (cap && lines.length > cap) {
      lines = lines.slice(0, cap);
      lines[cap - 1] = lines[cap - 1].replace(/[\s,;:]+$/, '') + '…';
    }
    return lines;
  }

  /* An SVG <text> carrying several lines, centred on x. */
  function lines(x, y, lh, arr, cls) {
    var t = svg('text', { x: x, y: y, class: cls });
    for (var i = 0; i < arr.length; i++) {
      t.appendChild(svg('tspan', { x: x, dy: i ? lh : 0 })).textContent = arr[i];
    }
    return t;
  }

  function star(cx, cy, ro, ri, pts) {
    var d = '', a0 = -Math.PI / 2;
    for (var i = 0; i < pts * 2; i++) {
      var r = (i % 2) ? ri : ro, a = a0 + i * Math.PI / pts;
      d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2);
    }
    return d + 'Z';
  }

  /* An annulus sector — the rosette's segment. */
  function sector(cx, cy, r0, r1, a0, a1) {
    function p(r, a) { return (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2); }
    var big = (a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + p(r1, a0) + ' A' + r1 + ',' + r1 + ' 0 ' + big + ' 1 ' + p(r1, a1)
         + ' L' + p(r0, a1) + ' A' + r0 + ',' + r0 + ' 0 ' + big + ' 0 ' + p(r0, a0) + ' Z';
  }

  /* Give a drawn path its own length, so the dash animation is exact
     whatever the shape, instead of a guessed constant that either
     finishes early or leaves a gap.

     Only the custom property is written. Setting stroke-dashoffset
     inline here would win over the .is-lit rule that has to unset it —
     an inline declaration cannot be overridden by a stylesheet — and
     the figure would stay permanently undrawn. The stylesheet reads
     var(--len) for both the array and the offset. */
  function measure(path) {
    var len = 0;
    try { len = path.getTotalLength(); } catch (e) { len = 0; }
    if (!len) return;
    path.style.setProperty('--len', Math.ceil(len) + 2);
  }

  /* Light a figure the first time it is reached, then leave it. */
  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-lit');
          io.unobserve(en.target);
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' })
    : null;

  function arrive(el) {
    if (!el) return;
    if (still || !io) { el.classList.add('is-lit'); return; }
    io.observe(el);
  }

  /* Wire a set of figure parts to a set of cards, both ways: address
     either and both light. Keyboard reaches the figure parts, so the
     figure is not a mouse-only affordance. */
  function link(parts, cards, name) {
    parts.forEach(function (part, i) {
      var card = cards[i];
      function on() { part.classList.add('is-hot'); if (card) card.classList.add('is-hot'); }
      function off() { part.classList.remove('is-hot'); if (card) card.classList.remove('is-hot'); }
      part.setAttribute('tabindex', '0');
      part.setAttribute('role', 'button');
      if (name && name[i]) part.setAttribute('aria-label', name[i]);
      part.addEventListener('pointerenter', on);
      part.addEventListener('pointerleave', off);
      part.addEventListener('focus', on);
      part.addEventListener('blur', off);
      if (card) {
        card.addEventListener('pointerenter', on);
        card.addEventListener('pointerleave', off);
        card.addEventListener('focusin', on);
        card.addEventListener('focusout', off);
        /* Addressing the card from the keyboard should move the eye to
           the part of the figure it belongs to, not only tint it. */
        card.addEventListener('click', function () { on(); window.setTimeout(off, 1400); });
      }
    });
  }

  /* Split "Principal, Royal College." into the role and the thing it
     is a role over. The cards write it that way in every language we
     publish; if a translation does not, the whole string is used as
     the institution and nothing is lost. */
  function splitRole(s) {
    var str = String(s || '').replace(/\.\s*$/, '');
    var i = str.indexOf(',');
    if (i < 0) return { role: '', of: str };
    return { role: str.slice(0, i).trim(), of: str.slice(i + 1).trim() };
  }

  function pair(attr, fallbackA, fallbackB) {
    var parts = String(attr || '').split('|');
    return { a: (parts[0] || fallbackA || '').trim(), b: (parts[1] || fallbackB || '').trim() };
  }

  /* =================================================================
     1. THE SHIELD, ASSEMBLED
     ================================================================= */
  function shield() {
    var mount = document.querySelector('[data-st="shield"]');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.pr-quad'));
    if (!mount || cards.length < 4) return;

    var W = 320, H = 372;
    var BODY = 'M22,18 H298 V196 C298,286 232,340 160,362 C88,340 22,286 22,196 Z';

    var s = svg('svg', {
      viewBox: '0 0 ' + W + ' ' + H, role: 'group',
      'aria-label': text(mount.getAttribute('data-st-label')) || 'The school shield, quartered'
    });

    var defs = svg('defs');
    var clip = svg('clipPath', { id: 'st-sh-clip' });
    clip.appendChild(svg('path', { d: BODY }));
    defs.appendChild(clip);
    s.appendChild(defs);

    /* The four quadrants, clipped to the shield so a wash never
       escapes the shape it is washing. */
    var boxes = [
      { x: 22,  y: 18,  w: 138, h: 168, cx: 91,  cy: 100, tx: 91,  ty: 152 },
      { x: 160, y: 18,  w: 138, h: 168, cx: 229, cy: 100, tx: 229, ty: 152 },
      { x: 22,  y: 186, w: 138, h: 176, cx: 91,  cy: 252, tx: 100, ty: 306 },
      { x: 160, y: 186, w: 138, h: 176, cx: 229, cy: 252, tx: 220, ty: 306 }
    ];

    var devices = [
      /* crescent and star */
      function (cx, cy) {
        return ['M' + (cx + 4) + ',' + (cy - 28) + ' A29,29 0 1 0 ' + (cx + 4) + ',' + (cy + 28)
              + ' A46,46 0 1 1 ' + (cx + 4) + ',' + (cy - 28) + ' Z',
                star(cx + 12, cy, 11, 4.6, 5)];
      },
      /* the open book */
      function (cx, cy) {
        return ['M' + (cx - 3) + ',' + (cy - 18) + ' C' + (cx - 15) + ',' + (cy - 26) + ' ' + (cx - 27) + ',' + (cy - 28) + ' ' + (cx - 35) + ',' + (cy - 26)
              + ' L' + (cx - 35) + ',' + (cy + 24) + ' C' + (cx - 27) + ',' + (cy + 22) + ' ' + (cx - 15) + ',' + (cy + 24) + ' ' + (cx - 3) + ',' + (cy + 32) + ' Z',
                'M' + (cx + 3) + ',' + (cy - 18) + ' C' + (cx + 15) + ',' + (cy - 26) + ' ' + (cx + 27) + ',' + (cy - 28) + ' ' + (cx + 35) + ',' + (cy - 26)
              + ' L' + (cx + 35) + ',' + (cy + 24) + ' C' + (cx + 27) + ',' + (cy + 22) + ' ' + (cx + 15) + ',' + (cy + 24) + ' ' + (cx + 3) + ',' + (cy + 32) + ' Z'];
      },
      /* three stars */
      function (cx, cy) {
        return [star(cx - 28, cy + 6, 10, 4.2, 5), star(cx, cy - 12, 12, 5, 5), star(cx + 28, cy + 6, 10, 4.2, 5)];
      },
      /* the tree */
      function (cx, cy) {
        return ['M' + (cx - 4) + ',' + (cy + 30) + ' h8 v-34 h-8 Z',
                'M' + (cx - 20) + ',' + (cy + 32) + ' h40 v4 h-40 Z',
                'M' + cx + ',' + (cy - 42) + ' a22,22 0 1 0 .01,0 Z',
                'M' + (cx - 18) + ',' + (cy - 22) + ' a17,17 0 1 0 .01,0 Z',
                'M' + (cx + 18) + ',' + (cy - 22) + ' a17,17 0 1 0 .01,0 Z'];
      }
    ];

    var groups = [], names = [];
    boxes.forEach(function (b, i) {
      var g = svg('g', { class: 'st-sh-q', 'clip-path': 'url(#st-sh-clip)' });
      g.appendChild(svg('rect', { class: 'wash', x: b.x, y: b.y, width: b.w, height: b.h }));

      var dev = svg('g', { class: 'dev' });
      dev.style.setProperty('--ox', b.cx + 'px');
      dev.style.setProperty('--oy', b.cy + 'px');
      dev.style.setProperty('--d', (0.5 + i * 0.22).toFixed(2) + 's');
      devices[i](b.cx, b.cy).forEach(function (d) { dev.appendChild(svg('path', { d: d, 'fill-rule': 'evenodd' })); });
      g.appendChild(dev);

      var nm = text(cards[i].querySelector('h3'));
      names.push(nm);
      var tag = svg('text', { class: 'tag', x: b.tx, y: b.ty });
      tag.textContent = nm;
      g.appendChild(tag);

      s.appendChild(g);
      groups.push(g);
    });

    /* The shield's own line, drawn over the quadrant washes, and the
       quartering rules that follow it. */
    var body = svg('path', { class: 'st-sh-body', d: BODY });
    s.appendChild(body);
    var rule = svg('path', {
      class: 'st-sh-rule', 'clip-path': 'url(#st-sh-clip)',
      d: 'M160,18 V362 M22,186 H298'
    });
    s.appendChild(rule);
    var trace = svg('path', { class: 'st-sh-trace', d: BODY });
    s.appendChild(trace);

    mount.appendChild(s);
    measure(body); measure(rule);
    link(groups, cards, names);
    arrive(mount);
  }

  /* =================================================================
     2. THE CLEVER ROSETTE
     ================================================================= */
  function rosette() {
    var mount = document.querySelector('[data-st="rosette"]');
    if (!mount) return;
    var cards = Array.prototype.slice.call(
      document.querySelectorAll('[data-st-values] .pr-card, .st-values .pr-card'));
    if (cards.length < 6) return;
    cards = cards.slice(0, 6);

    var C = 170, R0 = 88, R1 = 142, GAP = 1.6 * Math.PI / 180;
    var hub = pair(mount.getAttribute('data-st-hub'), 'CLEVER', 'The Standard');

    var s = svg('svg', { viewBox: '0 0 340 340', role: 'group', 'aria-label': hub.a + ' — ' + hub.b });
    s.appendChild(svg('circle', { class: 'st-rose-guilloche', cx: C, cy: C, r: 158 }));
    s.appendChild(svg('circle', { class: 'st-rose-guilloche', cx: C, cy: C, r: 150 }));

    var segs = [], names = [];
    /* The first value is set at twelve o'clock, which means the ring
       starts a third of a segment before it — not at it. */
    var TOP = -Math.PI / 2 - Math.PI / 6;
    for (var i = 0; i < 6; i++) {
      var a0 = TOP + i * Math.PI / 3 + GAP;
      var a1 = TOP + (i + 1) * Math.PI / 3 - GAP;
      var mid = (a0 + a1) / 2;
      var g = svg('g', { class: 'st-rose-seg' });
      var p = svg('path', { class: 'seg', d: sector(C, C, R0, R1, a0, a1) });
      p.style.setProperty('--d', (0.35 + i * 0.13).toFixed(2) + 's');
      g.appendChild(p);

      var letter = text(cards[i].querySelector('.pr-letter'))
        || text(cards[i].querySelector('h3')).charAt(0).toUpperCase();
      var nm = text(cards[i].querySelector('h3'));
      names.push(nm);

      var lx = C + 115 * Math.cos(mid), ly = C + 115 * Math.sin(mid);
      var t = svg('text', { class: 'ltr', x: lx.toFixed(1), y: ly.toFixed(1) });
      t.textContent = letter;
      g.appendChild(t);
      s.appendChild(g);
      segs.push(g);
    }

    s.appendChild(svg('circle', { class: 'st-rose-hub', cx: C, cy: C, r: 78 }));
    var title = svg('text', { class: 'st-rose-hub-t', x: C, y: C + 2 });
    title.textContent = hub.a;
    var sub = svg('text', { class: 'st-rose-hub-s', x: C, y: C + 24 });
    sub.textContent = hub.b;
    s.appendChild(title); s.appendChild(sub);

    mount.appendChild(s);
    link(segs, cards, names);

    /* The hub names whichever value is being addressed, so the ring is
       readable without six labels crowding its outside. */
    function say(n) {
      title.textContent = n || hub.a;
      title.setAttribute('font-size', (n && n.length > 11) ? '14' : '18');
    }
    title.setAttribute('font-size', '18');
    segs.forEach(function (g, i) {
      ['pointerenter', 'focus'].forEach(function (ev) { g.addEventListener(ev, function () { say(names[i]); }); });
      ['pointerleave', 'blur'].forEach(function (ev) { g.addEventListener(ev, function () { say(''); }); });
      cards[i].addEventListener('pointerenter', function () { say(names[i]); });
      cards[i].addEventListener('pointerleave', function () { say(''); });
    });

    arrive(mount);
  }

  /* =================================================================
     3. THE CHAIN OF ACCOUNTABILITY
     ================================================================= */
  function chain() {
    var mount = document.querySelector('[data-st="chain"]');
    if (!mount) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll('#leadership .pr-card'));
    if (!cards.length) return;

    var board = pair(mount.getAttribute('data-st-board'), 'Board of Governors', '');
    var head = pair(mount.getAttribute('data-st-head'), 'Head of Schools', '');
    var fifth = pair(mount.getAttribute('data-st-fifth'), '', '');

    /* Each institution comes out of its own card: the person from the
       heading, the institution from the role sentence beneath it. */
    var units = cards.map(function (c) {
      var role = splitRole(text(c.querySelector('b')));
      return { of: role.of, who: text(c.querySelector('h3')), role: role.role, card: c };
    });
    if (fifth.a) units.push({ of: fifth.a, who: fifth.b, role: '', card: null });

    var W = 1000;
    var s = svg('svg', { role: 'group',
      'aria-label': mount.getAttribute('data-st-label') || 'The chain of accountability' });

    var n = units.length;
    var span = 790, first = 105;
    var pitch = n > 1 ? span / (n - 1) : 0;
    var xs = [];
    for (var i = 0; i < n; i++) xs.push(first + pitch * i);

    /* Every box is sized to the words it actually holds. A fixed height
       was enough until a translation ran the Head of Schools' line to
       two lines and pushed its second line out through the floor of
       its own box. */
    var PAD_T = 17, TL = 18, GAP = 5, SL = 14, PAD_B = 13;
    function box(top, w2, wid, subWrap, crown) {
      var tl = wrap(top, w2, 3);
      var bl = subWrap ? wrap(subWrap, crown ? 44 : 27, 2) : [];
      var h = PAD_T + tl.length * TL + (bl.length ? GAP + bl.length * SL : 0) + PAD_B;
      return { tl: tl, bl: bl, h: h, wid: wid };
    }
    function draw(x, y, b, crown, delay) {
      var g = svg('g', { class: 'st-chain-node' + (crown ? ' is-crown' : '') });
      g.style.setProperty('--d', delay + 's');
      g.appendChild(svg('rect', {
        x: (x - b.wid / 2).toFixed(1), y: y.toFixed(1), width: b.wid, height: b.h.toFixed(1), rx: 12
      }));
      g.appendChild(lines(x.toFixed(1), (y + PAD_T + 13).toFixed(1), TL, b.tl, 't'));
      if (b.bl.length) {
        g.appendChild(lines(x.toFixed(1),
          (y + PAD_T + b.tl.length * TL + GAP + 10).toFixed(1), SL, b.bl, 's'));
      }
      s.appendChild(g);
      return g;
    }

    var bBoard = box(board.a, 30, 320, board.b, true);
    var bHead = box(head.a, 32, 344, head.b, true);
    var unitW = Math.max(140, Math.min(180, pitch - 14));
    var bUnits = units.map(function (u) {
      var label = u.who ? (u.role ? u.role + ' · ' + u.who : u.who) : '';
      return box(u.of, 22, unitW, label, false);
    });
    var unitH = bUnits.reduce(function (m, b) { return Math.max(m, b.h); }, 0);
    bUnits.forEach(function (b) { b.h = unitH; });

    var boardY = 8;
    var headY = boardY + bBoard.h + 32;
    var busY = headY + bHead.h + 42;
    var unitY = busY + 38;
    var H = unitY + unitH + 10;
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + Math.round(H));

    /* Wires first, so the nodes sit on top of them. */
    var wire = 'M500,' + (boardY + bBoard.h) + ' V' + headY
             + ' M500,' + (headY + bHead.h) + ' V' + busY
             + ' M' + xs[0].toFixed(1) + ',' + busY + ' H' + xs[n - 1].toFixed(1);
    xs.forEach(function (x) { wire += ' M' + x.toFixed(1) + ',' + busY + ' V' + unitY; });
    var w = svg('path', { class: 'st-chain-wire', d: wire });
    s.appendChild(w);
    s.appendChild(svg('path', {
      class: 'st-chain-bead',
      d: 'M' + xs[0].toFixed(1) + ',' + busY + ' H' + xs[n - 1].toFixed(1)
    }));

    draw(500, boardY, bBoard, true, 0.05);
    draw(500, headY, bHead, true, 0.18);
    var nodes = bUnits.map(function (b, i) {
      return draw(xs[i], unitY, b, false, (0.32 + i * 0.11).toFixed(2));
    });

    mount.appendChild(s);
    measure(w);
    link(nodes.filter(function (g, i) { return !!units[i].card; }),
         units.filter(function (u) { return !!u.card; }).map(function (u) { return u.card; }),
         units.filter(function (u) { return !!u.card; }).map(function (u) { return u.of + ' — ' + u.who; }));
    arrive(mount);
  }

  /* =================================================================
     4. THE ESCALATION
     ================================================================= */
  var GLYPHS = [
    /* something happens */ ['M12 4 L21.5 20.5 H2.5 Z', 'M12 10.5 v4.2', 'M12 18 v0.01'],
    /* first aid */         ['M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z'],
    /* watched over */      ['M2.5 12h4l2.2-5.4 3.1 10.4 2.3-5h7.4'],
    /* told the same day */ ['M6 9.5a6 6 0 0 1 12 0c0 5 2 6.2 2 6.2H4s2-1.2 2-6.2z', 'M10 19a2 2 0 0 0 4 0'],
    /* published */         ['M6 2.6h8l4.2 4.2v14.6H6z', 'M14 2.6v4.2h4.2', 'M9 12.5h6', 'M9 16h6']
  ];

  function escalation() {
    var mount = document.querySelector('[data-st="escalation"]');
    if (!mount) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll('#safeguarding .pr-card'));
    if (!cards.length) return;

    var origin = mount.getAttribute('data-st-origin') || '';
    var stops = [];
    if (origin) stops.push({ t: origin, card: null });
    cards.forEach(function (c) { stops.push({ t: text(c.querySelector('h3')), card: c }); });

    var W = 1000, H = 226, n = stops.length;
    var s = svg('svg', {
      viewBox: '0 0 ' + W + ' ' + H, role: 'group',
      'aria-label': mount.getAttribute('data-st-label') || 'What happens, in order'
    });

    var first = 100, last = W - 100, pitch = n > 1 ? (last - first) / (n - 1) : 0;
    var railD = 'M' + first + ',84 H' + last;
    var rail = svg('path', { class: 'st-esc-rail', d: railD });
    s.appendChild(rail);
    s.appendChild(svg('path', { class: 'st-esc-run', d: railD }));

    var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    var groups = [], names = [];
    stops.forEach(function (st, i) {
      var x = first + pitch * i;
      var g = svg('g', { class: 'st-esc-stn' + (i === 0 && origin ? ' is-origin' : '') });
      g.style.setProperty('--d', (0.2 + i * 0.13).toFixed(2) + 's');
      g.appendChild(svg('circle', { class: 'disc', cx: x.toFixed(1), cy: 84, r: 38 }));

      var ico = svg('g', { class: 'gl', transform: 'translate(' + (x - 15.6).toFixed(1) + ',68.4) scale(1.3)' });
      (GLYPHS[i % GLYPHS.length]).forEach(function (d) { ico.appendChild(svg('path', { d: d })); });
      g.appendChild(ico);

      var num = svg('text', { class: 'n', x: x.toFixed(1), y: 142 });
      num.textContent = ROMAN[i];
      g.appendChild(num);

      var wl = wrap(st.t, 18, 3);
      g.appendChild(lines(x.toFixed(1), 164, 16, wl, 't'));
      s.appendChild(g);
      groups.push(g); names.push(st.t);
    });

    mount.appendChild(s);
    measure(rail);
    var withCards = [], theCards = [], theNames = [];
    stops.forEach(function (st, i) {
      if (!st.card) return;
      withCards.push(groups[i]); theCards.push(st.card); theNames.push(names[i]);
    });
    link(withCards, theCards, theNames);
    arrive(mount);
  }

  /* =================================================================
     5. THE UNDERTAKINGS, AND THE SIGN-OFF
     ================================================================= */
  function pledges() {
    var list = document.querySelector('.st-pledges');
    if (!list) return;
    Array.prototype.forEach.call(list.children, function (li, i) {
      li.style.setProperty('--d', (i * 0.12).toFixed(2) + 's');
    });
    arrive(list);
  }

  function signoff() {
    var block = document.querySelector('.st-sign');
    if (!block) return;
    Array.prototype.forEach.call(block.querySelectorAll('.st-sign-ink path'), measure);
    arrive(block);
  }

  /* =================================================================
     6. GILT MOTES IN THE ROYAL BAND
     ================================================================= */
  function motes() {
    if (still) return;
    var band = document.querySelector('.pr-section.is-royal');
    if (!band || band.querySelector('.st-motes')) return;
    var layer = document.createElement('div');
    layer.className = 'st-motes';
    layer.setAttribute('aria-hidden', 'true');
    var html = '';
    for (var i = 0; i < 18; i++) {
      /* Deterministic scatter: the same on every load, so a reader who
         returns does not meet a different room. */
      var x = ((i * 37) % 97) + 1;
      var y = ((i * 53) % 88) + 4;
      var dur = 20 + (i % 7) * 3.5;
      var dly = -(i * 1.9);
      var dx = ((i % 5) - 2) * 16;
      var pk = 0.32 + ((i % 4) * 0.14);
      html += '<i style="left:' + x + '%;bottom:' + y + '%;'
            + '--dur:' + dur + 's;--dly:' + dly.toFixed(1) + 's;'
            + '--dx:' + dx + 'px;--pk:' + pk.toFixed(2) + '"></i>';
    }
    layer.innerHTML = html;
    band.insertBefore(layer, band.firstChild);
  }

  /* ---------------------------------------------------------------- */
  function mount() {
    try { shield(); } catch (e) {}
    try { rosette(); } catch (e) {}
    try { chain(); } catch (e) {}
    try { escalation(); } catch (e) {}
    try { pledges(); } catch (e) {}
    try { signoff(); } catch (e) {}
    try { motes(); } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
