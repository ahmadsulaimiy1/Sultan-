/* ===========================================================================
   MEASURE — the school's analytics loader and event layer
   ===========================================================================

   PRINCIPLE. The site ships fully instrumented but silent: until a real ID is
   pasted below, this file makes ZERO network requests and sets zero cookies.
   The day the school creates its accounts (see docs/seo-operations-manual.md)
   someone pastes the IDs here, bumps the ?v= on the script tag, and every
   conversion event starts flowing — no other code changes anywhere.

   WHAT COUNTS AS A CONVERSION ON THIS SITE. A parent does not "check out" —
   they tap WhatsApp, call, email, download a prospectus, or submit the
   application form. Those five are the funnel, and all five are instrumented
   below by delegation, so pages never need per-element tags.
   =========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    ga4: '',        // e.g. 'G-XXXXXXXXXX'  — Google Analytics 4 measurement ID
    clarity: '',    // e.g. 'abcdefghij'    — Microsoft Clarity project ID
  };

  /* ---- event queue: events fire into the dataLayer even before (or
          without) GA loading, so nothing is lost and nothing breaks ---- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function track(name, params) {
    try { gtag('event', name, params || {}); } catch (e) { /* never break the page */ }
  }

  /* ---- loaders: only when an ID exists ---- */
  if (CONFIG.ga4) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + CONFIG.ga4;
    document.head.appendChild(s);
    gtag('js', new Date());
    /* IP anonymisation is the default in GA4; page_view fires on config. */
    gtag('config', CONFIG.ga4, { send_page_view: true });
  }
  if (CONFIG.clarity) {
    (function (c, l, a, r, i) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      var t = l.createElement(r); t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      var y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CONFIG.clarity);
  }

  /* ---- the five conversions, by delegation ---- */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var page = location.pathname;

    if (/wa\.me|api\.whatsapp\.com/.test(href)) {
      track('whatsapp_click', { link_url: href, page_path: page });
    } else if (href.indexOf('tel:') === 0) {
      track('phone_click', { number: href.slice(4), page_path: page });
    } else if (href.indexOf('mailto:') === 0) {
      track('email_click', { page_path: page });
    } else if (/\.pdf($|\?)/i.test(href) || a.hasAttribute('download')) {
      track('file_download', {
        file_name: (href.split('/').pop() || '').split('?')[0], page_path: page,
      });
    } else if (/^https?:\/\//.test(href) && a.host !== location.host) {
      track('outbound_click', { link_domain: a.host, page_path: page });
    }
  }, { passive: true });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.nodeName !== 'FORM') return;
    track('form_submit', {
      form_id: f.id || f.getAttribute('name') || 'unnamed',
      page_path: location.pathname,
    });
  }, true);

  /* ---- one engagement signal GA cannot infer: reaching the page's foot ---- */
  var footSeen = false;
  window.addEventListener('scroll', function () {
    if (footSeen) return;
    var d = document.documentElement;
    if (d.scrollTop + window.innerHeight >= d.scrollHeight - 200) {
      footSeen = true;
      track('page_bottom', { page_path: location.pathname });
    }
  }, { passive: true });
})();
