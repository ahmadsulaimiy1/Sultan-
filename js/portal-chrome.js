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
          clock: 'The time in Ikorodu', zone: 'Ikorodu · West Africa Time' },
    ar: { standing: 'الحرم الرقمي', gateway: 'البوابة', site: 'الموقع الرئيسي',
          contact: 'اتصل بنا', policies: 'السياسات', governed: 'يحكمها مجلس أمناء',
          sig: 'تأسست في يوليو ٢٠١٦ · إيكورودو، ولاية لاغوس',
          note: 'هذا نظام عامل من أنظمة مدارس السلطان حنفي الملكية. والسجلات المعروضة هنا سجلات المدرسة نفسها؛ فإن بدا شيء منها خطأً فأبلغ المكتب ولا تتصرّف بناءً عليه.',
          clock: 'التوقيت في إيكورودو', zone: 'إيكورودو · توقيت غرب أفريقيا' },
    yo: { standing: 'Ọgbà Oní-nọ́mbà', gateway: 'Ẹnu-ọ̀nà', site: 'Ojúlé àkọ́kọ́',
          contact: 'Bá wa sọ̀rọ̀', policies: 'Àwọn Ìlànà', governed: 'Ìgbìmọ̀ Alábòójútó ló ń darí rẹ̀',
          sig: 'Tí a dá sílẹ̀ ní July 2016 · Ikorodu, Ìpínlẹ̀ Èkó',
          note: 'Ètò tí ń ṣiṣẹ́ ti Ilé-ẹ̀kọ́ Ọba Sultan Hanafi ni èyí. Ti ilé-ẹ̀kọ́ ni àwọn àkọsílẹ̀ tí a fi hàn níbí; bí ohunkóhun bá dà bí èyí tí kò tọ́, sọ fún ọ́fíìsì dípò kí o gbé ìgbésẹ̀ lórí rẹ̀.',
          clock: 'Àkókò ní Ikorodu', zone: 'Ikorodu · Àkókò Ìwọ̀-Oòrùn Áfíríkà' },
    fr: { standing: 'Campus numérique', gateway: 'Le portail', site: 'Site principal',
          contact: 'Contact', policies: 'Politiques', governed: 'Régie par un conseil de gouverneurs',
          sig: 'Fondée en juillet 2016 · Ikorodu, État de Lagos',
          note: 'Ceci est un système en service des Écoles royales Sultan Hanafi. Les données affichées sont celles de l’école ; si quelque chose paraît erroné, signalez-le au bureau plutôt que d’agir dessus.',
          clock: 'L’heure à Ikorodu', zone: 'Ikorodu · Heure d’Afrique de l’Ouest' }
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
    var foot = document.createElement('footer');
    foot.className = 'pch-foot';
    foot.innerHTML =
      '<div class="pch-foot-inner">'
      +   '<div class="pch-foot-brand">'
      +     '<img src="/assets/images/brand-mark.png" alt="" aria-hidden="true" />'
      +     '<span><span class="pch-foot-name">Sultan Hanafi Royal Schools</span>'
      +     '<span class="pch-foot-sig">' + esc(T.sig) + '</span></span>'
      +   '</div>'
      +   '<nav class="pch-links" aria-label="' + esc(T.standing) + '">'
      +     '<a class="pch-link" href="/portal/select/">' + esc(T.gateway) + '</a>'
      +     '<a class="pch-link" href="/">' + esc(T.site) + '</a>'
      +     '<a class="pch-link" href="/contact/">' + esc(T.contact) + '</a>'
      +     '<a class="pch-link" href="/policies/">' + esc(T.policies) + '</a>'
      +   '</nav>'
      +   '<span class="pch-badge">' + esc(T.governed) + '</span>'
      + '</div>'
      + '<div class="pch-rule" aria-hidden="true"></div>'
      + '<p class="pch-note">' + esc(T.note) + '</p>';
    document.body.appendChild(foot);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
