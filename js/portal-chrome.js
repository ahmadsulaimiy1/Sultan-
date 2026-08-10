/* ===================================================================
   THE PORTAL CHROME
   -------------------------------------------------------------------
   Sixty-eight pages of the Digital Campus are hand-authored rather than
   assembled from the partials, so none of them carried a masthead or a
   colophon: they opened on a thin white strip and ended on nothing.

   This gives them chrome of their own. Not the marketing masthead — a
   portal is a room you are already inside, and eight section plates
   would be noise there — but the same materials at working weight: the
   standing line and the chronometer added to the bar they already have,
   and a ruled colophon at the foot carrying the way back out.

   It only ever adds. A page that already has a real header or footer is
   left exactly as it is.
   =================================================================== */
(function () {
  'use strict';

  var LANG = (document.documentElement.lang || 'en').toLowerCase().slice(0, 2);
  var T = {
    en: { standing: 'Digital Campus', gateway: 'The Gateway', site: 'Main site',
          contact: 'Contact', policies: 'Policies', governed: 'Governed by a Board of Governors',
          sig: 'Established July 2016 · Ikorodu, Lagos State',
          note: 'This is a working system of Sultan Hanafi Royal Schools. Records shown here are the school’s own; if anything looks wrong, tell the office rather than acting on it.',
          clock: 'The time in Ikorodu', zone: 'Ikorodu · West Africa Time',
          verifyHead: 'Verification', campusHead: 'The Campus' },
    ar: { standing: 'الحرم الرقمي', gateway: 'البوابة', site: 'الموقع الرئيسي',
          contact: 'اتصل بنا', policies: 'السياسات', governed: 'يحكمها مجلس أمناء',
          sig: 'تأسست في يوليو ٢٠١٦ · إيكورودو، ولاية لاغوس',
          note: 'هذا نظام عامل من أنظمة مدارس السلطان حنفي الملكية. والسجلات المعروضة هنا سجلات المدرسة نفسها؛ فإن بدا شيء منها خطأً فأبلغ المكتب ولا تتصرّف بناءً عليه.',
          clock: 'التوقيت في إيكورودو', zone: 'إيكورودو · توقيت غرب أفريقيا',
          verifyHead: 'التحقّق', campusHead: 'الحرم' },
    yo: { standing: 'Ọgbà Oní-nọ́mbà', gateway: 'Ẹnu-ọ̀nà', site: 'Ojúlé àkọ́kọ́',
          contact: 'Bá wa sọ̀rọ̀', policies: 'Àwọn Ìlànà', governed: 'Ìgbìmọ̀ Alábòójútó ló ń darí rẹ̀',
          sig: 'Tí a dá sílẹ̀ ní July 2016 · Ikorodu, Ìpínlẹ̀ Èkó',
          note: 'Ètò tí ń ṣiṣẹ́ ti Ilé-ẹ̀kọ́ Ọba Sultan Hanafi ni èyí. Ti ilé-ẹ̀kọ́ ni àwọn àkọsílẹ̀ tí a fi hàn níbí; bí ohunkóhun bá dà bí èyí tí kò tọ́, sọ fún ọ́fíìsì dípò kí o gbé ìgbésẹ̀ lórí rẹ̀.',
          clock: 'Àkókò ní Ikorodu', zone: 'Ikorodu · Àkókò Ìwọ̀-Oòrùn Áfíríkà',
          verifyHead: 'Ìjẹ́rìísí', campusHead: 'Ọgbà náà' },
    fr: { standing: 'Campus numérique', gateway: 'Le portail', site: 'Site principal',
          contact: 'Contact', policies: 'Politiques', governed: 'Régie par un conseil de gouverneurs',
          sig: 'Fondée en juillet 2016 · Ikorodu, État de Lagos',
          note: 'Ceci est un système en service des Écoles royales Sultan Hanafi. Les données affichées sont celles de l’école ; si quelque chose paraît erroné, signalez-le au bureau plutôt que d’agir dessus.',
          clock: 'L’heure à Ikorodu', zone: 'Ikorodu · Heure d’Afrique de l’Ouest',
          verifyHead: 'Vérification', campusHead: 'Le campus' }
  }[LANG] || null;
  if (!T) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ------------------------------------------------------------------
     THE LOCKUP
     The bar carried the crest beside one line of Cinzel — "SULTAN
     HANAFI" and nothing else. The masthead every other page of the
     school wears carries a lockup: the crest inside a shimmer wrap, the
     name over "Royal Schools" in gold small caps. That treatment is in
     css/brand.css, which the portal already loads, so the portal was
     one span away from wearing it and simply had not been given the
     markup. This gives it the markup.

     It rewrites rather than replaces, so whatever the page's own crest
     link points at and whatever the name says in that page's language
     both survive.
     ------------------------------------------------------------------ */
  function dressBrand(brand) {
    if (!brand || brand.querySelector('.brand-text')) return;
    var img = brand.querySelector('img');
    var nameEl = brand.querySelector('span');
    var name = nameEl ? nameEl.textContent.trim() : 'Sultan Hanafi';
    /* The sixty-eight pages spell the name in the markup and none of them
       marks it for translation, so the crest said "Sultan Hanafi" in Latin
       letters on a page a reader had put into Arabic. brand.name is the key
       the marketing masthead uses; taking it here is what makes the two
       mastheads say the same thing in the same language. The page's own
       spelling stays as the fallback until the dictionary arrives. */
    var i18nKey = (nameEl && nameEl.getAttribute('data-i18n')) || 'brand.name';
    if (!img) return;
    brand.classList.add('brand');
    img.classList.add('brand-mark');
    var wrap = document.createElement('span');
    wrap.className = 'crest-shimmer-wrap';
    brand.insertBefore(wrap, img);
    wrap.appendChild(img);
    var text = document.createElement('span');
    text.className = 'brand-text';
    text.innerHTML =
      '<span class="line1" data-i18n="' + esc(i18nKey) + '">'
      + esc(name) + '</span><br />'
      + '<span class="line2" data-i18n="brand.sub">Royal Schools</span>';
    if (nameEl && nameEl.parentNode) nameEl.parentNode.removeChild(nameEl);
    brand.appendChild(text);
  }

  /* ------------------------------------------------------------------
     THE CALENDAR BAND
     Every public page of the school opens on a thin band carrying both
     calendars — the Hijri date that governs the prayer times and the
     fasts, and the Gregorian one that governs the timetable — and the
     time in Ikorodu beside them. It is the single most recognisable
     thing about the school's chrome, and the Digital Campus did not
     have it, which is most of why the portal read as a different
     institution's software.

     It is the same band, not an imitation of one: the same arithmetic
     (js/hijri.js, shared with the marketing pages) and the same two
     dates in the same order. What it does NOT carry is the prayer
     countdown, because that one is fetched from a calculation service
     and a sign-in page should not be waiting on a network call to
     finish drawing its own header. The countdown stays one click away,
     on the Adhkār link at the end of the band.
     ------------------------------------------------------------------ */
  function mountStrip(bar) {
    if (!bar || !bar.parentNode || document.querySelector('.pch-strip')) return;
    var H = window.SHRSHijri;
    if (!H) return;                            // hijri.js absent — no half-band

    var moon = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"'
      + ' class="pch-strip-icon"><path d="M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z"'
      + ' fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
    var dial = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"'
      + ' class="pch-strip-icon"><circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor"'
      + ' stroke-width="1.4"/><path d="M12 7.6V12l3 1.8" fill="none" stroke="currentColor"'
      + ' stroke-width="1.4" stroke-linecap="round"/></svg>';
    var lamp = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"'
      + ' class="pch-strip-icon"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"'
      + ' fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

    var strip = document.createElement('div');
    strip.className = 'pch-strip';
    strip.innerHTML =
      '<div class="pch-strip-inner">'
      +   '<span class="pch-strip-item pch-strip-date" data-pch-hijri></span>'
      +   '<span class="pch-strip-sep" aria-hidden="true"></span>'
      +   '<span class="pch-strip-item pch-strip-time" data-pch-time aria-live="off">'
      +     dial + '<span data-pch-time-text>&mdash;&mdash;:&mdash;&mdash;</span></span>'
      +   '<span class="pch-strip-sep" aria-hidden="true"></span>'
      +   '<a class="pch-strip-item pch-strip-link" href="/adhkar/">'
      +     lamp + '<span data-i18n="quick.adhkar">Adhkār Centre</span></a>'
      + '</div>';
    bar.parentNode.insertBefore(strip, bar);

    /* Both calendars, in the order the school reads them.
       The month name and the Gregorian date are the only text on this band
       written by hand rather than by the dictionary, so they are the only
       text that would have stayed English when a reader switched to Arabic
       mid-page. The switch is a language attribute on <html> — watched here
       rather than hooked to one event, because the locale arrives by three
       different routes (a stored preference applied at load, the switcher,
       and a navigation) and only the attribute is common to all three. */
    var dateEl = strip.querySelector('[data-pch-hijri]');
    function renderDate() {
      var lang = (document.documentElement.lang || 'en').toLowerCase().slice(0, 2) === 'ar' ? 'ar' : 'en';
      var gregorian = new Date().toLocaleDateString(lang, {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      dateEl.innerHTML = moon + '<span>' + esc(H.label(lang) + ' · ' + gregorian) + '</span>';
    }
    renderDate();
    document.addEventListener('shrs:locale-changed', renderDate);
    if ('MutationObserver' in window) {
      new MutationObserver(renderDate).observe(document.documentElement,
        { attributes: true, attributeFilter: ['lang'] });
    }

    // The time in Ikorodu, not the time on the reader's wrist — a parent
    // reading this in London is being told when the office is open.
    var timeEl = strip.querySelector('[data-pch-time-text]');
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit',
        second: '2-digit', hour12: false
      });
    } catch (e) {
      // A wrong hour on an institution's own header is worse than none.
      // The divider that framed it goes with it, or the band ends on a rule.
      var stale = strip.querySelector('.pch-strip-time');
      var sep = stale.previousElementSibling;
      if (sep && sep.className === 'pch-strip-sep') sep.parentNode.removeChild(sep);
      stale.parentNode.removeChild(stale);
      return;
    }
    function tick() { timeEl.textContent = fmt.format(new Date()); }
    tick();
    var timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { window.clearInterval(timer); timer = null; }
      else if (!timer) { tick(); timer = window.setInterval(tick, 1000); }
    });
  }

  /* ------------------------------------------------------------------
     THE ARRIVAL
     The school's own footer does not begin with columns. It begins with
     a ruled plate: four corner marks, the school's statement set in the
     display face, and a lozenge under it. Then the columns. That plate
     is the reason the public footer reads as the close of a document
     and the portal's read as the bottom of a screen, and there is
     nothing about it that a portal cannot wear.
     ------------------------------------------------------------------ */
  function arrivalHTML() {
    var corner = '<svg viewBox="0 0 46 46" aria-hidden="true">'
      + '<path d="M2 44 L2 2 L44 2" stroke="currentColor" stroke-width="1.2" fill="none"/>'
      + '<circle cx="2" cy="2" r="2.6" fill="currentColor"/></svg>';
    return '<div class="pch-arrival">'
      + '<div class="pch-corner tl">' + corner + '</div>'
      + '<div class="pch-corner tr">' + corner + '</div>'
      + '<div class="pch-corner bl">' + corner + '</div>'
      + '<div class="pch-corner br">' + corner + '</div>'
      + '<p class="pch-statement" data-i18n="footer.tagline">'
      + '&ldquo;Forming Scholars, Leaders and Guardians of Excellence.&rdquo;</p>'
      + '<div class="pch-mark" aria-hidden="true"><svg viewBox="0 0 24 24">'
      + '<rect x="7" y="7" width="10" height="10" transform="rotate(45 12 12)" fill="none"'
      + ' stroke="currentColor" stroke-width="1.3"/></svg></div>'
      + '</div>';
  }

  /* ------------------------------------------------------------------
     THE SCHOOL, RIGHT NOW
     The same live panel the public footer carries, driven by the same
     js/footer-live.js — the time in Ikorodu, whether the offices are
     open at this moment, and today's hours. It is arguably worth more
     here than on the marketing pages: a parent who has just read a fee
     notice on their dashboard wants to know whether there is anybody at
     the desk to ring about it.

     THE FIVE STATE STRINGS BELOW ARE THE ONE DUPLICATION IN THIS FILE.
     footer-live.js reads them from the panel's own attributes, and on
     the built pages scripts/build.js renders them there from
     i18n/<lang>.json. Portal pages are not built from partials, so they
     are stated here instead. Everything a reader can see is marked with
     data-i18n and comes from the dictionary as usual; only these five,
     which are read out of attributes before the dictionary has been
     fetched, are written twice. If now.open / now.closed / now.closesIn
     / now.opensIn / now.opensOn are ever reworded in i18n/*.json, they
     have to be reworded here too.
     ------------------------------------------------------------------ */
  var NOW = {
    en: { open: 'Open', closed: 'Closed', closes: 'Closes in {t}',
          opens: 'Opens in {t}', openson: 'Opens {d} at {t}' },
    ar: { open: 'مفتوحة', closed: 'مغلقة', closes: 'تُغلق بعد {t}',
          opens: 'تفتح بعد {t}', openson: 'تفتح {d} الساعة {t}' },
    yo: { open: 'Ṣí sílẹ̀', closed: 'Tì', closes: 'Yóò tì ní {t}',
          opens: 'Yóò ṣí ní {t}', openson: 'Yóò ṣí {d} ní {t}' },
    fr: { open: 'Ouverts', closed: 'Fermés', closes: 'Ferment dans {t}',
          opens: 'Ouvrent dans {t}', openson: 'Ouvrent {d} à {t}' }
  }[LANG] || null;

  function nowHTML() {
    if (!NOW) return '';
    return '<section class="pch-now" data-now-panel aria-labelledby="pch-now-h"'
      + ' data-s-open="' + esc(NOW.open) + '" data-s-closed="' + esc(NOW.closed) + '"'
      + ' data-s-closes="' + esc(NOW.closes) + '" data-s-opens="' + esc(NOW.opens) + '"'
      + ' data-s-openson="' + esc(NOW.openson) + '">'
      +   '<div class="pch-now-head">'
      +     '<p class="pch-now-eyebrow" id="pch-now-h" data-i18n="now.eyebrow">The School, Right Now</p>'
      +     '<p class="pch-now-place" data-i18n="now.place">Ikorodu, Lagos State &middot; West Africa Time</p>'
      +   '</div>'
      +   '<div class="pch-now-grid">'
      +     '<div class="pch-now-cell">'
      +       '<span class="pch-now-k" data-i18n="now.time">Local time</span>'
      +       '<span class="pch-now-clock" data-now-clock role="timer" aria-live="off">&mdash;&mdash;:&mdash;&mdash;</span>'
      +       '<span class="pch-now-sub" data-now-date>&nbsp;</span>'
      +     '</div>'
      +     '<div class="pch-now-cell">'
      +       '<span class="pch-now-k" data-i18n="now.offices">The offices</span>'
      +       '<span class="pch-now-state" data-now-state>'
      +         '<span class="pch-now-dot" aria-hidden="true"></span>'
      +         '<span data-now-state-text>&nbsp;</span></span>'
      +       '<span class="pch-now-sub" data-now-next>&nbsp;</span>'
      +     '</div>'
      +     '<div class="pch-now-cell">'
      +       '<span class="pch-now-k" data-i18n="now.today">Today&rsquo;s hours</span>'
      +       '<span class="pch-now-hours" data-now-hours>&nbsp;</span>'
      +       '<span class="pch-now-sub"><a class="pch-now-link" href="/contact/"'
      +         ' data-i18n="now.allHours">All opening hours &rarr;</a></span>'
      +     '</div>'
      +   '</div>'
      + '</section>';
  }

  function mount() {
    var bar = document.querySelector('.portal-topbar');
    var hasHeader = document.querySelector('header.nav');
    var hasFooter = document.querySelector('footer, .pch-foot');
    if (hasHeader) return;                    // a real masthead already
    document.documentElement.classList.add('has-portal-chrome');

    // The utility cluster is an unclassed <div> in sixty-eight hand-authored
    // pages, and the masthead's second tier is built out of it. Naming it here
    // is the difference between CSS that addresses the right element and CSS
    // that addresses "the div with no class", which is true until somebody
    // adds one. Same for the bar itself: the two-tier rules below are scoped
    // to .pch-mast so a page that brings its own masthead is left alone.
    if (bar) {
      bar.classList.add('pch-mast');
      var cluster = null, kids = bar.children, ki;
      for (ki = 0; ki < kids.length; ki++) {
        if (kids[ki].tagName === 'DIV' && !kids[ki].className) { cluster = kids[ki]; break; }
      }
      if (cluster) cluster.classList.add('pch-utility');
    }

    // Error and empty cards get .pch-state so the crest-and-rule treatment can
    // be addressed precisely. It cannot be inferred from the markup — the full
    // application form also carries a .portal-back-link — so the cards that are
    // genuinely a *state* rather than a page are named by the two things only
    // they have: an id ending -error, or an error-message slot.
    var STATE = '[id$="-error"], [data-portal-error-card], [data-founder-error-card]';
    Array.prototype.forEach.call(document.querySelectorAll(STATE), function (el) {
      var card = el.classList && el.classList.contains('portal-card') ? el : el.closest('.portal-card');
      if (card) card.classList.add('pch-state');
    });
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-error-message], [data-portal-error-message]'), function (el) {
        var card = el.closest('.portal-card');
        if (card) card.classList.add('pch-state');
      });

    // --- the head: add to the bar rather than replace it -------------
    if (bar && !bar.querySelector('.pch-standing')) {
      var brand = bar.querySelector('.portal-brand');
      dressBrand(brand);
      mountStrip(bar);
      /* The standing line, in the marketing masthead's own form: two
         statements with a raised point between them, between two rules.
         It said "Digital Campus" alone, which named the room but not the
         institution — the public bar answers "who is this and where" in
         the same place and the portal may as well answer it too. */
      var standing = document.createElement('span');
      standing.className = 'pch-standing';
      standing.innerHTML =
        '<span class="pch-standing-t">' + esc(T.standing) + '</span>'
        + '<span class="pch-standing-d" aria-hidden="true">&middot;</span>'
        + '<span class="pch-standing-t" data-i18n="masthead.place">Ikorodu, Lagos State</span>';
      if (brand && brand.nextSibling) bar.insertBefore(standing, brand.nextSibling);
      else bar.appendChild(standing);

      // The same chronometer the marketing masthead carries. clock.js
      // finds it by attribute and does not care which page it is on.
      if (!document.querySelector('[data-clock]')) {
        var right = bar.lastElementChild;
        var clock = document.createElement('span');
        clock.className = 'rlx pch-clock';
        clock.setAttribute('data-clock', '');
        clock.hidden = true;
        clock.innerHTML =
          '<button type="button" class="rlx-btn" data-clock-btn aria-expanded="false"'
          + ' data-label-base="' + esc(T.clock) + '" aria-label="' + esc(T.clock) + '"></button>'
          + '<div class="rlx-pop" data-clock-pop hidden role="dialog" aria-label="' + esc(T.clock) + '">'
          + '<p class="rlx-digits" data-clock-digits>&mdash;&mdash;:&mdash;&mdash;</p>'
          + '<p class="rlx-date" data-clock-date>&nbsp;</p>'
          + '<span class="rlx-zone">' + esc(T.zone) + '</span></div>';
        if (right && right !== brand) right.insertBefore(clock, right.firstChild);
        else bar.appendChild(clock);
      }
    }

    // --- the foot ----------------------------------------------------
    if (hasFooter) return;
    adoptLateFooter();
    // A colophon in three columns on an espresso plate, which is the language
    // the school's own footer speaks. What stood here was a row of underlined
    // links, a right-orphaned meta line, four flat lozenges and a dashed box,
    // separated by three stacked rules — a form's footer, not an
    // institution's. Columns, Cinzel headings under a gold hairline, and one
    // closing rule instead of three.
    var foot = document.createElement('footer');
    foot.className = 'pch-foot';
    foot.innerHTML =
      arrivalHTML()
      + nowHTML()
      + '<div class="pch-foot-inner">'
      +   '<div class="pch-col pch-col-brand">'
      +     '<img class="pch-crest" src="/assets/images/brand-mark.png" alt="" aria-hidden="true" />'
      +     '<span class="pch-foot-name" data-i18n="brand.full">Sultan Hanafi Royal Schools</span>'
      +     '<span class="pch-foot-sig">' + esc(T.sig) + '</span>'
      +     '<p class="pch-note">' + esc(T.note) + '</p>'
      +   '</div>'
      +   '<div class="pch-col">'
      +     '<h2 class="pch-h">' + esc(T.verifyHead) + '</h2>'
      +     '<nav class="pch-list" data-pch-verify aria-label="' + esc(T.verifyHead) + '"></nav>'
      +   '</div>'
      +   '<div class="pch-col">'
      +     '<h2 class="pch-h">' + esc(T.campusHead) + '</h2>'
      +     '<nav class="pch-list" aria-label="' + esc(T.standing) + '">'
      +       '<a class="pch-link" href="/portal/select/">' + esc(T.gateway) + '</a>'
      +       '<a class="pch-link" href="/">' + esc(T.site) + '</a>'
      +       '<a class="pch-link" href="/contact/">' + esc(T.contact) + '</a>'
      +       '<a class="pch-link" href="/policies/">' + esc(T.policies) + '</a>'
      +     '</nav>'
      +   '</div>'
      + '</div>'
      + '<div class="pch-rule" aria-hidden="true"></div>'
      + '<div class="pch-colophon">'
      +   '<div class="pch-meta" data-pch-meta></div>'
      +   '<span class="pch-badge">' + esc(T.governed) + '</span>'
      + '</div>';
    document.body.appendChild(foot);
  }

  // portal-shell.js writes its own thin utility strip — verification
  // links and a version number — and it writes it AFTER this file runs.
  // Left alone that gave those pages two footers stacked on one another.
  // When it appears it is taken into the colophon as its top row, so
  // the page ends on one foot carrying both.
  function adoptLateFooter() {
    if (!('MutationObserver' in window)) return;
    var obs = new MutationObserver(function () {
      var late = document.querySelector('footer:not(.pch-foot)');
      if (!late) return;
      obs.disconnect();
      var mine = document.querySelector('.pch-foot');
      if (!mine || mine.contains(late)) return;
      // It used to be inserted whole as a top stripe, which is what put a row
      // of bare underlined links and a right-orphaned meta line above the
      // colophon. Its two halves belong in the colophon proper: the
      // verification links are the Verification column, and its meta is the
      // colophon bar. Only what it actually carries is moved, so if that strip
      // ever changes the colophon follows it.
      var verifyInto = mine.querySelector('[data-pch-verify]');
      var metaInto = mine.querySelector('[data-pch-meta]');
      var srcLinks = late.querySelectorAll('.portal-shell-footer-links a');
      var srcMeta = late.querySelector('.portal-shell-footer-meta');
      if (verifyInto && srcLinks.length) {
        Array.prototype.forEach.call(srcLinks, function (a) {
          a.className = 'pch-link';
          verifyInto.appendChild(a);
        });
      }
      if (metaInto && srcMeta) {
        while (srcMeta.firstChild) metaInto.appendChild(srcMeta.firstChild);
      }
      if (late.parentNode) late.parentNode.removeChild(late);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // It either arrives with the shell or it does not arrive at all.
    window.setTimeout(function () { obs.disconnect(); }, 8000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
