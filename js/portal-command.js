/* ===========================================================================
   PORTAL COMMAND — the executive layer, behaviour
   ===========================================================================

   Runs on every page carrying .portal-topbar. Three jobs:

     1. rebuild the topbar into a command header
     2. replace the shell footer with an executive control panel
     3. provide the chart engine (window.SHRSChart) and the motion helpers

   WHY IT UPGRADES RATHER THAN REPLACES. There are 72 portal pages and each
   one already ships a .portal-topbar with a language switcher and a sign-out
   button wired to other code. This moves those existing controls into the
   new header rather than re-creating them, so nothing that was working stops
   working, and a page that adds a control tomorrow inherits the treatment.

   ON HONEST NUMBERS. Every chart here renders real values or an empty state
   naming what is missing. It will not invent a trend. This portal is shown
   to ministers, accreditation panels and parents; a plausible-looking
   attendance curve with no data behind it is a fabricated institutional
   record, which is a different thing from a design flourish. Where the API
   marks a payload isSampleData, the chart is labelled as sample on its face.

   No dependencies. Charts are inline SVG built with the DOM, which is both
   faster than a charting library and lets every stroke inherit the palette.
   =========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs || {}) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }
  function icon(d, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  /* One icon family, one stroke weight, drawn here so nothing is imported
     and nothing drifts. */
  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    bell:   '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
    grid:   '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
    shield: '<path d="M12 3 5 6v6c0 4.4 3 8.2 7 9 4-.8 7-4.6 7-9V6z"/><path d="m9.2 12 2 2 3.6-3.8"/>',
    sync:   '<path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8"/><path d="M3 5.5V10h4.5M21 18.5V14h-4.5"/>',
    clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.2 1.9"/>',
    chart:  '<path d="M4 19h16"/><path d="m6 15 3.6-4.2 3 2.4L18 7"/>',
    empty:  '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M3 10h18M8.5 15h7"/>',
    coin:   '<ellipse cx="12" cy="7" rx="7.5" ry="3.2"/><path d="M4.5 7v10c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2V7"/><path d="M4.5 12c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2"/>',
    book:   '<path d="M4 4.5h6a3 3 0 0 1 3 3V20a2.6 2.6 0 0 0-2.6-2.2H4z"/><path d="M20 4.5h-6a3 3 0 0 0-3 3V20a2.6 2.6 0 0 1 2.6-2.2H20z"/>',
    people: '<circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M15 19c.2-2.2 1.7-3.7 3.6-3.7 1.7 0 3 1.1 3.4 2.9"/>',
    doc:    '<path d="M6 3h7l5 5v13H6z"/><path d="M13 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    building:'<path d="M4 21V6l7-3 7 3v15"/><path d="M4 21h16"/><path d="M9 21v-4h4v4"/><path d="M8 9h2M14 9h2M8 13h2M14 13h2"/>',
    menu:   '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };

  /* A card names its icon in markup; the family is drawn once, above. */
  function fillIcons() {
    document.querySelectorAll('[data-cmd-ico]').forEach(function (n) {
      var d = ICONS[n.getAttribute('data-cmd-ico')];
      if (d && !n.firstChild) n.innerHTML = icon(d);
    });
  }

  /* --------------------------------------------------------------------- */
  /* 1. THE COMMAND HEADER                                                  */
  /* --------------------------------------------------------------------- */

  var ATMOSPHERE = {
    parent:    'Parent & Guardian',
    student:   'Student',
    teacher:   'Teaching Staff',
    registrar: "Office of the Registrar",
    finance:   'Bursary & Finance',
    executive: 'Executive Office',
    founder:   'Head of Schools · Chairman'
  };

  /* The session runs September to August, so a date in January belongs to the
     session that opened the previous September. Getting this wrong on a
     school portal is the kind of error a registrar notices immediately. */
  function academicSession(d) {
    var y = d.getFullYear();
    var start = d.getMonth() >= 8 ? y : y - 1;   // month 8 = September
    return start + '/' + String(start + 1).slice(2);
  }

  function greeting(d) {
    var h = d.getHours();
    if (h < 5)  return 'Good evening';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function crumbsFromPath() {
    var parts = location.pathname.replace(/\/index\.html?$/, '/').split('/').filter(Boolean);
    var out = [{ label: 'Portal', href: '/portal/select/' }];
    var acc = '';
    parts.forEach(function (p, i) {
      if (p === 'portal') { acc = '/portal'; return; }
      acc += '/' + p;
      out.push({
        label: p.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
        href: i === parts.length - 1 ? null : acc + '/'
      });
    });
    return out;
  }

  function buildHeader() {
    var bar = document.querySelector('.portal-topbar');
    if (!bar || bar.classList.contains('cmd-header')) return;

    var atmos = document.body.getAttribute('data-atmosphere') || '';
    var role = ATMOSPHERE[atmos] || 'Digital Campus';
    var now = new Date();

    /* portal-chrome.js runs first and builds its own two-tier masthead inside
       this same bar: it adds .pch-mast, injects a .pch-standing line, and
       names the unclassed control cluster .pch-utility. Two layout systems on
       one element is how the header ended up overlapping itself. This one
       owns the bar, so those are stood down here — deliberately, and only
       inside the bar. The .pch-strip above it (Hijri date, clock, Adhkār) is
       portal-chrome's too, is genuinely useful, and is left alone. */
    bar.classList.remove('pch-mast');
    bar.querySelectorAll('.pch-standing').forEach(function (n) { n.remove(); });

    /* Keep whatever the page already put here — the language switcher and the
       sign-out button are wired by other scripts and must survive. The utility
       cluster is unwrapped rather than kept, because its wrapper carries a
       margin-inline-start:auto that would fight the grid. */
    var existing = [];
    Array.prototype.forEach.call(bar.children, function (c) {
      if (c.classList && c.classList.contains('portal-brand')) return;
      var isCluster = c.tagName === 'DIV' &&
        (c.classList.contains('pch-utility') || !c.className);
      if (isCluster) {
        Array.prototype.forEach.call(c.children, function (k) { existing.push(k); });
      } else {
        existing.push(c);
      }
    });
    var brandImg = bar.querySelector('.portal-brand img');
    var crestSrc = brandImg ? brandImg.getAttribute('src') : '/assets/images/brand-mark.png';

    bar.textContent = '';
    bar.classList.add('cmd-header');

    /* identity */
    bar.appendChild(el('a', { class: 'cmd-identity', href: '/portal/select/',
      'aria-label': 'Sultan Hanafi Royal Schools — portal home' }, [
      el('img', { src: crestSrc, alt: '' }),
      el('span', { class: 'cmd-identity-text' }, [
        el('span', { class: 'cmd-identity-name', text: 'Sultan Hanafi' }),
        el('span', { class: 'cmd-identity-sub', text: role })
      ])
    ]));

    /* centre — breadcrumb over the live strip */
    var crumbs = el('nav', { class: 'cmd-crumbs', 'aria-label': 'Breadcrumb' });
    crumbsFromPath().forEach(function (c, i, all) {
      if (i) crumbs.appendChild(el('span', { class: 'sep', html: '&#9670;' }));
      crumbs.appendChild(c.href
        ? el('a', { href: c.href, text: c.label })
        : el('span', { 'aria-current': 'page', text: c.label }));
    });

    var live = el('div', { class: 'cmd-live' }, [
      el('span', { 'data-cmd-greeting': '', text: greeting(now) }),
      el('span', { class: 'dot' }),
      el('span', { 'data-cmd-date': '' }),
      el('span', { class: 'dot' }),
      el('span', { text: 'Session ' + academicSession(now) })
    ]);
    bar.appendChild(el('div', { class: 'cmd-centre' }, [crumbs, live]));

    /* actions */
    var actions = el('div', { class: 'cmd-actions' });

    var search = el('div', { class: 'cmd-search', html: icon(ICONS.search) });
    var input = el('input', { type: 'search', placeholder: 'Search…',
      'aria-label': 'Search the portal', 'data-cmd-search': '' });
    search.appendChild(input);
    actions.appendChild(search);

    /* portal-shell.js already puts a calendar link in this bar on most pages.
       Two calendar buttons side by side is the tell of a header assembled by
       two people who never spoke, so this one only appears if none exists. */
    var hasCalendar = existing.some(function (c) {
      return c.classList && c.classList.contains('portal-topbar-calendar');
    });
    if (!hasCalendar) {
      actions.appendChild(el('a', { class: 'cmd-btn cmd-btn--icon', href: '/academic-calendar/',
        title: 'Academic calendar', 'aria-label': 'Academic calendar',
        html: icon(ICONS.calendar) }));
    }

    var bell = el('button', { type: 'button', class: 'cmd-btn cmd-btn--icon',
      title: 'Notifications', 'aria-label': 'Notifications', html: icon(ICONS.bell) });
    bell.appendChild(el('span', { class: 'cmd-badge', 'data-cmd-notify-count': '', hidden: 'hidden' }));
    bell.addEventListener('click', function () {
      var target = document.querySelector('[data-portal-notifications]');
      if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      else location.href = '/portal/dashboard/';
    });
    actions.appendChild(bell);

    /* profile — initials until the page tells us a name */
    var profile = el('div', { class: 'cmd-profile' }, [
      el('span', { class: 'cmd-avatar', 'data-cmd-initials': '', text: '—' }),
      el('span', { class: 'cmd-profile-text' }, [
        el('span', { class: 'cmd-profile-name', 'data-cmd-name': '', text: 'Signed in' }),
        el('span', { class: 'cmd-profile-role', text: role })
      ])
    ]);
    actions.appendChild(profile);

    existing.forEach(function (c) { actions.appendChild(c); });
    bar.appendChild(actions);
    bar.appendChild(el('div', { class: 'cmd-engrave', 'aria-hidden': 'true' }));
    buildNavGrid(bar);

    tickClock();
    setInterval(tickClock, 30000);
    watchIdentity();
  }

  /* The public masthead's card grid and action rail, in the portal, built out
     of the PUBLIC SITE'S OWN CLASSES — .navlinks, .nav-drop, .nav-drop-trigger,
     .nav-mark.nav-cta. brand.css is already loaded on every portal page, so
     this is the same treatment rather than a copy of it: if the public
     masthead is restyled tomorrow, this follows it automatically. Only the
     content differs, because a signed-in office needs different doors than a
     visitor does. */
  var NAV_CARDS = [
    { label: 'My Dashboard',       href: '/portal/dashboard/',            ico: 'grid' },
    { label: 'My Children',        href: '/portal/dashboard/#children',   ico: 'people' },
    { label: 'Results',            href: '/portal/dashboard/#results',    ico: 'chart' },
    { label: 'Fees',               href: '/portal/dashboard/#fees',       ico: 'coin' },
    { label: 'Documents',          href: '/portal/profile/',              ico: 'doc' },
    { label: 'Verify Certificate', href: '/verify-certificate/',          ico: 'shield' },
    { label: 'All Offices',        href: '/portal/select/',               ico: 'building' },
    { label: 'Full Menu',          href: '/',                             ico: 'menu' }
  ];
  var NAV_RAIL = [
    { label: 'My Dashboard',       href: '/portal/dashboard/' },
    { label: 'Verify a Certificate', href: '/verify-certificate/' },
    { label: 'Adhkār Centre',      href: '/adhkar/' },
    { label: 'Prayer Times',       href: '/prayer-times/' },
    { label: 'Academic Calendar',  href: '/academic-calendar/' }
  ];

  function buildNavGrid(bar) {
    if (document.querySelector('.cmd-navgrid')) return;
    var here = location.pathname.replace(/index\.html?$/, '');

    /* The public masthead's signature, and the piece the portal never had: an
       ivory band carrying the crest and the wordmark, with the place and date
       of foundation set between two struck rules. It is what makes that
       masthead read as an institution rather than as navigation — the dark
       bands above and below are chrome, this is the identity. */
    var estab = el('div', { class: 'cmd-estab' }, [
      el('a', { class: 'cmd-estab-brand', href: '/portal/select/' }, [
        el('img', { src: '/assets/images/brand-mark.png', alt: '' }),
        el('span', { class: 'cmd-estab-name' }, [
          el('b', { text: 'Sultan Hanafi' }),
          el('i', { text: 'Royal Schools' })
        ])
      ]),
      el('div', { class: 'cmd-estab-line' }, [
        el('span', { class: 'cmd-estab-rule' }),
        el('span', { class: 'cmd-estab-text',
          text: 'Established July 2016 · Ikorodu, Lagos State' }),
        el('span', { class: 'cmd-estab-rule' })
      ]),
      el('div', { class: 'cmd-estab-office', 'data-cmd-office': '' })
    ]);

    var links = el('div', { class: 'navlinks' });
    NAV_CARDS.forEach(function (c) {
      var drop = el('div', { class: 'nav-drop' });
      var a = el('a', { class: 'nav-drop-trigger', href: c.href });
      a.appendChild(el('span', { class: 'cmd-medallion',
                                 html: icon(ICONS[c.ico] || ICONS.grid) }));
      a.appendChild(el('span', { class: 'cmd-cardlabel', text: c.label }));
      drop.appendChild(a);
      links.appendChild(drop);
    });

    var rail = el('div', { class: 'cmd-rail' });
    NAV_RAIL.forEach(function (c) {
      var a = el('a', { class: 'nav-drop-trigger nav-mark nav-cta', href: c.href });
      a.appendChild(el('span', { text: c.label }));
      a.appendChild(el('span', { class: 'arrow', 'aria-hidden': 'true', text: '→' }));
      if (here === c.href) a.classList.add('is-here');
      rail.appendChild(a);
    });

    var wrap = el('div', { class: 'cmd-navgrid' }, [estab, links, rail]);
    bar.insertAdjacentElement('afterend', wrap);
  }

  function tickClock() {
    var d = new Date();
    var date = d.toLocaleDateString(document.documentElement.lang || 'en-GB',
      { weekday: 'short', day: 'numeric', month: 'short' });
    var time = d.toLocaleTimeString(document.documentElement.lang || 'en-GB',
      { hour: '2-digit', minute: '2-digit' });
    document.querySelectorAll('[data-cmd-date]').forEach(function (n) {
      n.textContent = date;
    });
    document.querySelectorAll('[data-cmd-greeting]').forEach(function (n) {
      n.textContent = greeting(d);
    });
    document.querySelectorAll('[data-cmd-sync]').forEach(function (n) { n.textContent = time; });
  }

  /* The dashboard writes the signed-in name into [data-portal-hello] once the
     session resolves. Rather than fetch /me a second time, watch that node —
     one request, one source of truth. */
  function watchIdentity() {
    var src = document.querySelector('[data-portal-hello]');
    if (!src) return;
    var apply = function () {
      var t = (src.textContent || '').replace(/^[^A-Za-z؀-ۿ]+/, '').trim();
      if (!t || t === '—') return;
      var name = t.replace(/^(Welcome( back)?,?\s*)/i, '').replace(/[.!,]$/, '').trim();
      if (!name) return;
      document.querySelectorAll('[data-cmd-name]').forEach(function (n) { n.textContent = name; });
      var ini = name.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('');
      document.querySelectorAll('[data-cmd-initials]').forEach(function (n) {
        n.textContent = ini.toUpperCase();
      });
    };
    apply();
    new MutationObserver(apply).observe(src, { childList: true, characterData: true, subtree: true });
  }

  /* --------------------------------------------------------------------- */
  /* 2. THE EXECUTIVE FOOTER                                                */
  /* --------------------------------------------------------------------- */

  function buildFooter() {
    if (document.querySelector('.cmd-footer')) return;
    var old = document.querySelector('.portal-shell-footer');
    var links = old ? old.querySelectorAll('.portal-shell-footer-links a') : [];

    var legal = el('div', { class: 'cmd-footer-legal' });
    if (links.length) {
      var row = el('div');
      Array.prototype.forEach.call(links, function (a, i) {
        if (i) row.appendChild(document.createTextNode(' · '));
        row.appendChild(el('a', { href: a.getAttribute('href'), text: a.textContent }));
      });
      legal.appendChild(row);
    }
    legal.appendChild(el('div', {
      text: '© ' + new Date().getFullYear() + ' Sultan Hanafi Royal Schools'
    }));
    legal.appendChild(el('div', { text: 'Ikorodu · Lagos State · Federal Republic of Nigeria' }));

    var secure = location.protocol === 'https:';
    var status = el('div', { class: 'cmd-status' }, [
      statusItem(null, 'System', 'Operational', true),
      statusItem(ICONS.shield, 'Connection', secure ? 'Secure · TLS' : 'Not secure', false, !secure),
      statusItem(ICONS.calendar, 'Session', academicSession(new Date())),
      statusItem(ICONS.sync, 'Last sync', '—', false, false, 'data-cmd-sync')
    ]);

    var footer = el('footer', { class: 'cmd-footer', role: 'contentinfo' }, [
      el('div', { class: 'cmd-footer-grid' }, [
        el('div', { class: 'cmd-footer-seal' }, [
          el('img', { src: '/assets/images/brand-mark.png', alt: '' }),
          el('span', { class: 'cmd-footer-seal-text' }, [
            el('span', { class: 'cmd-footer-seal-name', text: 'Sultan Hanafi Royal Schools' }),
            el('span', { class: 'cmd-footer-seal-sub', text: 'Digital Campus' })
          ])
        ]),
        status,
        legal
      ]),
      el('div', { class: 'cmd-ornament' })
    ]);
    footer.insertBefore(el('div', { class: 'cmd-engrave', 'aria-hidden': 'true' }),
                        footer.firstChild);

    if (old) old.replaceWith(footer);
    else {
      var main = document.querySelector('.portal-main') || document.body;
      main.insertAdjacentElement('afterend', footer);
    }
    tickClock();
  }

  function statusItem(ic, label, value, pulse, warn, attr) {
    var lead = pulse || warn
      ? el('span', { class: 'cmd-pulse' + (warn ? ' cmd-pulse--warn' : '') })
      : el('span', { html: icon(ic || ICONS.clock) });
    var val = el('span', { class: 'cmd-status-value', text: value });
    if (attr) val.setAttribute(attr.replace(/^data-/, 'data-'), '');
    return el('div', { class: 'cmd-status-item' }, [
      lead,
      el('span', {}, [el('span', { class: 'cmd-status-label', text: label }), val])
    ]);
  }

  /* --------------------------------------------------------------------- */
  /* 3. CHARTS                                                              */
  /* --------------------------------------------------------------------- */

  var PALETTE = ['#B08D45', '#4E3B22', '#5B7A94', '#E3C88A'];

  function emptyState(mount, title, note) {
    mount.textContent = '';
    mount.appendChild(el('div', { class: 'cmd-empty' }, [
      el('span', { html: icon(ICONS.empty) }),
      el('div', { class: 'cmd-empty-title', text: title || 'No data yet' }),
      el('div', { class: 'cmd-empty-note', text: note ||
        'This chart draws from live records. It will fill in as soon as the ' +
        'first entry is posted.' })
    ]));
    return null;
  }

  function hasData(series) {
    return series && series.some(function (s) {
      return s.values && s.values.some(function (v) { return typeof v === 'number' && isFinite(v); });
    });
  }

  /* An animated line/area chart. Draws itself once and then holds — a chart
     that loops is a chart nobody can read. */
  function lineChart(mount, opts) {
    opts = opts || {};
    var series = opts.series || [];
    if (!hasData(series)) return emptyState(mount, opts.emptyTitle, opts.emptyNote);

    var W = 100, H = opts.height || 42, pad = 2;
    var labels = opts.labels || [];
    var all = series.reduce(function (a, s) { return a.concat(s.values.filter(isFinite)); }, []);
    var min = opts.min != null ? opts.min : Math.min.apply(null, all);
    var max = opts.max != null ? opts.max : Math.max.apply(null, all);
    if (max === min) { max = min + 1; }

    var n = Math.max.apply(null, series.map(function (s) { return s.values.length; }));
    var x = function (i) { return pad + (i / Math.max(1, n - 1)) * (W - pad * 2); };
    var y = function (v) { return H - pad - ((v - min) / (max - min)) * (H - pad * 2); };

    mount.textContent = '';
    var wrap = el('div', { class: 'cmd-chart-wrap' });
    var s = svg('svg', { class: 'cmd-chart', viewBox: '0 0 ' + W + ' ' + H,
      preserveAspectRatio: 'none', role: 'img',
      'aria-label': opts.title || 'Chart' });
    s.style.height = (opts.px || 150) + 'px';

    /* grid */
    for (var g = 0; g <= 3; g++) {
      var gy = pad + (g / 3) * (H - pad * 2);
      var ln = svg('line', { class: 'grid-line', x1: 0, x2: W, y1: gy, y2: gy,
        'vector-effect': 'non-scaling-stroke' });
      s.appendChild(ln);
    }

    series.forEach(function (ser, si) {
      var colour = ser.color || PALETTE[si % PALETTE.length];
      var pts = ser.values.map(function (v, i) {
        return isFinite(v) ? x(i) + ',' + y(v) : null;
      }).filter(Boolean);
      if (!pts.length) return;

      if (ser.fill !== false) {
        var id = 'cmdgrad' + si + '-' + Math.random().toString(36).slice(2, 7);
        var defs = svg('defs');
        var lg = svg('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 });
        lg.appendChild(svg('stop', { offset: '0%', 'stop-color': colour, 'stop-opacity': .30 }));
        lg.appendChild(svg('stop', { offset: '100%', 'stop-color': colour, 'stop-opacity': 0 }));
        defs.appendChild(lg); s.appendChild(defs);
        s.appendChild(svg('path', { class: 'series-area',
          d: 'M' + pts.join(' L') + ' L' + x(ser.values.length - 1) + ',' + (H - pad) +
             ' L' + x(0) + ',' + (H - pad) + ' Z',
          fill: 'url(#' + id + ')' }));
      }

      var path = svg('path', { class: 'series-line', d: 'M' + pts.join(' L'),
        stroke: colour, 'vector-effect': 'non-scaling-stroke' });
      s.appendChild(path);
      requestAnimationFrame(function () {
        var len = 0;
        try { len = path.getTotalLength(); } catch (e) { len = 0; }
        path.style.setProperty('--len', len || 400);
        if (reduced) { path.style.strokeDashoffset = '0'; path.style.animation = 'none'; }
      });
    });

    wrap.appendChild(s);

    /* readable values: a tooltip on hover, and the same numbers in a table
       for anyone using a screen reader */
    var tip = el('div', { class: 'cmd-chart-tip' });
    wrap.appendChild(tip);
    s.addEventListener('pointermove', function (ev) {
      var r = s.getBoundingClientRect();
      var i = Math.round(((ev.clientX - r.left) / r.width) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      var rows = series.map(function (ser) {
        var v = ser.values[i];
        return isFinite(v) ? (ser.name || 'Value') + ': <b>' +
          (opts.format ? opts.format(v) : v) + '</b>' : null;
      }).filter(Boolean);
      if (!rows.length) return;
      tip.innerHTML = (labels[i] ? '<div>' + labels[i] + '</div>' : '') + rows.join('<br>');
      tip.style.left = ((i / Math.max(1, n - 1)) * r.width) + 'px';
      tip.style.top = '0px';
      tip.setAttribute('data-show', '');
    });
    s.addEventListener('pointerleave', function () { tip.removeAttribute('data-show'); });

    mount.appendChild(wrap);

    if (labels.length && labels.length <= 12) {
      var ax = el('div', { class: 'cmd-axis' });
      labels.forEach(function (l) { ax.appendChild(el('span', { text: l })); });
      mount.appendChild(ax);
    }
    if (labels.length) {
      var axis = el('div', { class: 'cmd-legend' });
      series.forEach(function (ser, si) {
        axis.appendChild(el('span', { html:
          '<i style="background:' + (ser.color || PALETTE[si % PALETTE.length]) + '"></i>' +
          (ser.name || 'Series ' + (si + 1)) }));
      });
      mount.appendChild(axis);
    }
    mount.appendChild(dataTable(labels, series, opts));
    return s;
  }

  /* The same numbers as a visually-hidden table. A chart that only exists as
     a picture is unreadable to a screen reader, and this portal is meant to
     meet an accessibility standard, not to claim one. */
  function dataTable(labels, series, opts) {
    var t = el('table');
    t.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;' +
      'clip:rect(0 0 0 0);white-space:nowrap;border:0';
    var cap = el('caption', { text: opts.title || 'Chart data' });
    t.appendChild(cap);
    var head = el('tr', {}, [el('th', { text: 'Point' })]);
    series.forEach(function (s) { head.appendChild(el('th', { text: s.name || 'Value' })); });
    t.appendChild(head);
    (labels.length ? labels : (series[0] ? series[0].values : [])).forEach(function (lab, i) {
      var tr = el('tr', {}, [el('th', { text: labels[i] != null ? labels[i] : 'Point ' + (i + 1) })]);
      series.forEach(function (s) {
        var v = s.values[i];
        tr.appendChild(el('td', { text: isFinite(v) ? (opts.format ? opts.format(v) : String(v)) : '—' }));
      });
      t.appendChild(tr);
    });
    return t;
  }

  /* A radial meter. Used for anything bounded — attendance, completion,
     memorisation against a target. */
  function ring(mount, opts) {
    opts = opts || {};
    var v = Number(opts.value);
    if (!isFinite(v)) return emptyState(mount, opts.emptyTitle, opts.emptyNote);
    var max = opts.max || 100;
    var pct = Math.max(0, Math.min(1, v / max));
    var size = opts.size || 132, sw = opts.stroke || 9;
    var r = (size - sw) / 2, circ = 2 * Math.PI * r;

    mount.textContent = '';
    var s = svg('svg', { class: 'cmd-chart', viewBox: '0 0 ' + size + ' ' + size,
      role: 'img', 'aria-label': (opts.title || 'Meter') + ': ' + v + ' of ' + max });
    s.style.maxWidth = size + 'px'; s.style.margin = '0 auto';
    s.appendChild(svg('circle', { class: 'cmd-ring-track', cx: size / 2, cy: size / 2,
      r: r, 'stroke-width': sw }));
    var val = svg('circle', { class: 'cmd-ring-value', cx: size / 2, cy: size / 2, r: r,
      'stroke-width': sw, stroke: opts.color || '#B08D45' });
    val.style.setProperty('--circ', circ);
    val.style.setProperty('--dash', circ * (1 - pct));
    if (reduced) { val.style.strokeDashoffset = circ * (1 - pct); val.style.animation = 'none'; }
    s.appendChild(val);
    var label = svg('text', { class: 'cmd-ring-label', x: size / 2, y: size / 2 + 2,
      'font-size': size * 0.21 });
    label.textContent = opts.display || (Math.round(pct * 100) + '%');
    s.appendChild(label);
    if (opts.sub) {
      var sub = svg('text', { class: 'cmd-ring-label', x: size / 2, y: size / 2 + size * 0.18,
        'font-size': size * 0.082, opacity: .68 });
      sub.textContent = opts.sub;
      s.appendChild(sub);
    }
    mount.appendChild(s);
    return s;
  }

  /* A donut, for composition — where a whole divides into named parts. */
  function donut(mount, opts) {
    opts = opts || {};
    var segs = (opts.segments || []).filter(function (s) { return Number(s.value) > 0; });
    if (!segs.length) return emptyState(mount, opts.emptyTitle, opts.emptyNote);
    var total = segs.reduce(function (a, s) { return a + Number(s.value); }, 0);
    var size = opts.size || 132, sw = opts.stroke || 15;
    var r = (size - sw) / 2, circ = 2 * Math.PI * r, offset = 0;

    mount.textContent = '';
    var s = svg('svg', { class: 'cmd-chart', viewBox: '0 0 ' + size + ' ' + size, role: 'img',
      'aria-label': opts.title || 'Composition' });
    s.style.maxWidth = size + 'px'; s.style.margin = '0 auto';
    s.appendChild(svg('circle', { class: 'cmd-ring-track', cx: size / 2, cy: size / 2, r: r,
      'stroke-width': sw }));
    segs.forEach(function (seg, i) {
      var frac = Number(seg.value) / total;
      var c = svg('circle', { cx: size / 2, cy: size / 2, r: r, fill: 'none',
        stroke: seg.color || PALETTE[i % PALETTE.length], 'stroke-width': sw,
        'stroke-dasharray': (circ * frac) + ' ' + (circ * (1 - frac)),
        'stroke-dashoffset': -offset, transform: 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')' });
      c.style.opacity = 0;
      c.style.animation = reduced ? 'none' : 'cmd-fade-in .5s ' + (i * 0.12) + 's var(--cmd-ease-out) forwards';
      if (reduced) c.style.opacity = 1;
      s.appendChild(c);
      offset += circ * frac;
    });
    var lab = svg('text', { class: 'cmd-ring-label', x: size / 2, y: size / 2 + 4,
      'font-size': size * 0.18 });
    lab.textContent = opts.display || total;
    s.appendChild(lab);
    mount.appendChild(s);

    var legend = el('div', { class: 'cmd-legend' });
    segs.forEach(function (seg, i) {
      var shown = opts.format ? opts.format(seg.value) : seg.value;
      legend.appendChild(el('span', { html: '<i style="background:' +
        (seg.color || PALETTE[i % PALETTE.length]) + '"></i>' + seg.label + ' · ' + shown }));
    });
    mount.appendChild(legend);
    return s;
  }

  /* A number that counts up to its value. Purely presentational, so under
     reduced motion it simply appears. */
  function count(node, to, opts) {
    opts = opts || {};
    var fmt = opts.format || function (v) { return Math.round(v); };
    if (reduced || !isFinite(to)) { node.textContent = fmt(to || 0); return; }
    var from = 0, dur = opts.duration || 1100, t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* --------------------------------------------------------------------- */
  /* 4. MOTION                                                              */
  /* --------------------------------------------------------------------- */

  /* Reveal-on-scroll, with two safeguards that matter more than the effect.
     
     A .cmd-reveal card starts at opacity 0, so if the observer never reports
     it the card is INVISIBLE — not merely un-animated. That is a real failure
     mode here: the intelligence panel ships hidden and is unhidden only once
     the payload lands, and an element inside a display:none parent never
     intersects anything. So: this is re-runnable (call it again after showing
     a section), and anything still unrevealed shortly after is forced on.
     Decoration must never be able to hide content. */
  var revealIO = null;
  function reveal() {
    var nodes = document.querySelectorAll('.cmd-reveal:not(.is-in)');
    if (!nodes.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    }
    nodes.forEach(function (n) { revealIO.observe(n); });

    clearTimeout(reveal._safety);
    reveal._safety = setTimeout(function () {
      document.querySelectorAll('.cmd-reveal:not(.is-in)').forEach(function (n) {
        if (n.getBoundingClientRect().height) n.classList.add('is-in');
      });
    }, 2500);
  }

  /* Counters fire when their card first comes into view, not on load, so the
     number is moving at the moment somebody is looking at it. */
  function autoCount() {
    var nodes = document.querySelectorAll('[data-cmd-count]');
    if (!nodes.length) return;
    var run = function (n) {
      var to = parseFloat(n.getAttribute('data-cmd-count'));
      var suffix = n.getAttribute('data-cmd-suffix') || '';
      count(n, to, { format: function (v) { return Math.round(v) + suffix; } });
    };
    if (reduced || !('IntersectionObserver' in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  window.SHRSChart = { line: lineChart, ring: ring, donut: donut, count: count,
                       empty: emptyState, palette: PALETTE, reduced: reduced, icon: icon,
                       icons: ICONS, reveal: reveal };

  function init() {
    try { buildHeader(); } catch (e) { console.error('[command] header', e); }
    try { buildFooter(); } catch (e) { console.error('[command] footer', e); }
    try { fillIcons(); } catch (e) { console.error('[command] icons', e); }
    try { reveal(); autoCount(); } catch (e) { console.error('[command] motion', e); }
    document.dispatchEvent(new CustomEvent('shrs:command-ready'));
  }

  /* portal-shell.js is loaded undeferred in <head> and injects its own footer
     on DOMContentLoaded. This file is deferred, so by the time it executes
     readyState is already 'interactive' and running init() here would land
     BEFORE that listener — leaving the page with two footers. Deferring to a
     task puts us after it, so there is exactly one footer to replace. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  } else {
    setTimeout(init, 0);
  }
})();

/* ===========================================================================
   THE WELCOME LINE, TYPED
   ===========================================================================
   The dashboard opened on a name that was simply there. Typing it makes the
   moment of arrival an event — the one place on the page where motion is the
   content rather than decoration.

   It types the name only, never the greeting, and it types ONCE per session:
   a line that retypes on every navigation stops being a welcome and becomes
   a tic. Under reduced motion the line is simply set.
   =========================================================================== */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var typed = false;

  function type(node, text) {
    if (typed) return;
    typed = true;
    if (reduced) { node.textContent = text; return; }
    node.textContent = '';
    var caret = document.createElement('span');
    caret.className = 'cmd-caret';
    node.appendChild(caret);
    var i = 0;
    (function step() {
      if (i <= text.length) {
        caret.previousSibling && node.removeChild(caret.previousSibling);
        node.insertBefore(document.createTextNode(text.slice(0, i)), caret);
        i++;
        // a shade quicker through a long name, so it never outstays the moment
        setTimeout(step, text.length > 26 ? 34 : 48);
      } else {
        caret.setAttribute('data-done', '');
      }
    })();
  }

  function watch() {
    var hello = document.querySelector('.exec-welcome h1[data-portal-hello]');
    if (!hello) return;
    var run = function () {
      var t = (hello.textContent || '').trim();
      if (!t || t === '—' || typed) return;
      type(hello, t);
    };
    run();
    new MutationObserver(function () { if (!typed) run(); })
      .observe(hello, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(watch, 0); });
  } else { setTimeout(watch, 0); }
})();

/* ===========================================================================
   THE ORNAMENT LAYER, AND THE OFFICES
   ===========================================================================

   Ornament here is generated by rule, never drawn and never licensed — the
   same standard the stationery is held to (docs/institutional-identity.md
   §IV). The band under the header is literally the letterhead's guilloche:
   two summed sine waves, four cycles against nine, phase-shifted across
   fifteen copies. Coprime, so the interference never repeats across the
   width. Using the same lathe on the sheet and on the screen is what makes
   them one house rather than two designs that share a colour.

   THE OFFICES. A registrar's desk and a bursary are not the same room, so
   they do not open the same way: each office carries its own name, its own
   photograph behind the welcome, and its own ornament accent. The identity
   is constant; the room is not.
   =========================================================================== */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- the lathe ------------------------------------------------------- */
  function guilloche(w, h, copies, amp1, amp2, stroke, opacity) {
    var k1 = 2 * Math.PI * 4 / w, k2 = 2 * Math.PI * 9 / w, step = w / 900, p = [];
    for (var i = 0; i < copies; i++) {
      var pts = [];
      for (var n = 0; n * step <= w; n++) {
        var x = n * step;
        pts.push(x.toFixed(1) + ',' +
          (h / 2 + amp1 * Math.sin(k1 * x + 0.24 * i) +
                   amp2 * Math.sin(k2 * x + 0.456 * i)).toFixed(2));
      }
      p.push('<path d="M' + pts.join(' L') + '" fill="none" stroke="' + stroke +
             '" stroke-width=".5" opacity="' + opacity + '"/>');
    }
    return 'data:image/svg+xml;base64,' + btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" preserveAspectRatio="none">' + p.join('') + '</svg>');
  }

  /* --- the offices ------------------------------------------------------ */
  var OFFICES = {
    parent:    { name: 'Office of Parents & Guardians', photo: 'campus-frontage.jpg' },
    student:   { name: 'The Student Body',              photo: 'classroom-in-session.jpg' },
    teacher:   { name: 'The Common Room',               photo: 'classroom-in-session.jpg' },
    registrar: { name: 'Office of the Registrar',       photo: 'graduation-prize-giving.jpg' },
    finance:   { name: 'The Bursary',                   photo: 'campus-aerial.jpg' },
    executive: { name: 'The Executive Office',          photo: 'campus-aerial-hero.jpg' },
    /* Renamed from the Founder's Office. The data attributes and API paths
       keep the word 'founder' because they are wired to authentication;
       renaming those would lock the office out of its own dashboard. Only
       what a person reads has changed. */
    founder:   { name: 'Office of the Head of Schools',
                 photo: 'graduation-with-founder.jpg' }
  };

  function dressOffice() {
    var atmos = document.body.getAttribute('data-atmosphere') || 'parent';
    var office = OFFICES[atmos] || OFFICES.parent;
    var root = document.documentElement;
    root.style.setProperty('--cmd-office-photo',
      "url('/assets/images/campus/" + office.photo + "')");
    document.querySelectorAll('[data-cmd-office]').forEach(function (n) {
      n.textContent = office.name;
    });
    return office;
  }

  function dressOrnament() {
    var root = document.documentElement;
    /* fine, for the 1px band under the header */
    root.style.setProperty('--cmd-guilloche',
      "url('" + guilloche(1400, 26, 13, 6.5, 2.8, '%23C6A15B', '.5') + "')");
    /* heavier, for the footer's engraved field */
    root.style.setProperty('--cmd-guilloche-deep',
      "url('" + guilloche(1400, 40, 15, 11, 4.4, '%23E9CE8A', '.42') + "')");
  }

  /* --- typing, for any heading that asks for it -------------------------- */
  function typeHeadings() {
    var nodes = document.querySelectorAll('[data-cmd-type]:not([data-typed])');
    if (!nodes.length) return;
    nodes.forEach(function (n) {
      n.setAttribute('data-typed', '');
      var text = n.textContent.trim();
      if (reduced) return;
      var run = function () {
        n.textContent = '';
        var caret = document.createElement('span');
        caret.className = 'cmd-caret';
        n.appendChild(caret);
        var i = 0;
        (function step() {
          if (i <= text.length) {
            if (caret.previousSibling) n.removeChild(caret.previousSibling);
            n.insertBefore(document.createTextNode(text.slice(0, i)), caret);
            i++; setTimeout(step, 30);
          } else { caret.setAttribute('data-done', ''); }
        })();
      };
      if (!('IntersectionObserver' in window)) { run(); return; }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { run(); io.disconnect(); } });
      }, { threshold: .5 });
      io.observe(n);
    });
  }

  /* --- magnetic hover ----------------------------------------------------
     The card leans a degree or two toward the pointer. Two degrees is the
     whole effect: enough that the surface feels physical, little enough that
     nobody notices it happening. Pointer-fine only — on a touch screen there
     is no pointer to lean toward, and the transform would just cost frames. */
  function magnetise() {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.cmd-card--lit').forEach(function (card) {
      if (card.hasAttribute('data-magnetic')) return;
      card.setAttribute('data-magnetic', '');
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - .5;
        var dy = (e.clientY - r.top) / r.height - .5;
        card.style.transform =
          'perspective(900px) rotateX(' + (-dy * 2.2).toFixed(2) + 'deg) rotateY(' +
          (dx * 2.2).toFixed(2) + 'deg) translateY(-3px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  function init() {
    try { dressOffice(); dressOrnament(); } catch (e) { console.error('[ornament]', e); }
    try { typeHeadings(); magnetise(); } catch (e) { console.error('[motion]', e); }
  }
  document.addEventListener('shrs:command-ready', function () { setTimeout(init, 0); });
  if (document.readyState !== 'loading') setTimeout(init, 60);
})();
