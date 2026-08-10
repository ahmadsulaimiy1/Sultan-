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
      var standing = document.createElement('span');
      standing.className = 'pch-standing';
      standing.textContent = T.standing;
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
      '<div class="pch-foot-inner">'
      +   '<div class="pch-col pch-col-brand">'
      +     '<img class="pch-crest" src="/assets/images/brand-mark.png" alt="" aria-hidden="true" />'
      +     '<span class="pch-foot-name">Sultan Hanafi Royal Schools</span>'
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
