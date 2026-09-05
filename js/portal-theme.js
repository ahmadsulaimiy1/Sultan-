/* Portal appearance toggle, and the portal's synchronous locale bootstrap.
 *
 * Reuses the exact same shrsPersonalisation localStorage key + data-pc-theme
 * attribute mechanism as the public site's Personalisation Centre
 * (js/personalisation.js, applied via the inline FOUC-prevention script in
 * partials/head.html) so a visitor's theme choice is one unified preference
 * across the whole site, not a second parallel toggle. This file exists
 * because the portal pages are standalone HTML (they don't include the public
 * site's header/personalisation partials), so the portal needs its own small
 * entry point into the same mechanism. Applied synchronously (this script is
 * NOT deferred) so data-pc-theme is set on <html> before the body paints.
 *
 * LANGUAGE is no longer handled here. This file used to carry a seven-key
 * Arabic dictionary and its own EN/AR toggle button — a second, parallel
 * language system that knew nothing about the rest of the site and could not
 * express a third language. It now does exactly one language job: apply the
 * stored locale's lang/dir to <html> synchronously, before first paint, so an
 * Arabic reader never sees a frame of LTR layout. Everything else — the
 * switcher control, the dictionaries, the in-place text swap — belongs to
 * js/i18n.js, which is shared with the public site.
 */
(function(){
  var PREFS_KEY = 'shrsPersonalisation';
  var LOCALE_KEY = 'shrsLocale';
  var ORDER = ['royal', 'light', 'dark'];

  function loadPrefs(){
    try{
      var raw = window.localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(err){ return {}; }
  }
  function savePrefs(prefs){
    try{ window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }catch(err){ /* storage unavailable — preference just won't persist */ }
    try{ document.dispatchEvent(new CustomEvent('sultan:personalisation-changed', { detail: prefs })); }catch(err){}
  }

  // Founder redesign directive (Phase 5): every dashboard page defaulted
  // to 'royal' (a dark, espresso theme) with no stored preference, which
  // is why the portal read as permanently dark/brown regardless of the
  // "polished white, gold" look the rest of the site (and this same
  // mechanism, via js/personalisation.js) already defaults to elsewhere.
  // Matches the public site's own default now, rather than a second,
  // portal-only default that happened to point the other way.
  var prefs = loadPrefs();
  var theme = ORDER.indexOf(prefs.theme) > -1 ? prefs.theme : 'light';
  document.documentElement.setAttribute('data-pc-theme', theme);

  /* Synchronous locale bootstrap. js/i18n.js is deferred (it fetches a
     dictionary and builds a control, neither of which should block paint),
     but direction cannot wait for it: flipping to RTL after first paint is a
     visible lurch. So read the stored preference here and stamp <html> now.
     js/i18n.js then finds the document already in the right direction and has
     only the text left to do.

     prefs.portalLang is read once for continuity: it is where the old
     portal-only toggle stored its choice, and a reader who picked Arabic in
     the portal before this change should stay in Arabic after it. */
  (function bootstrapLocale(){
    var stored = null;
    try{ stored = window.localStorage.getItem(LOCALE_KEY); }catch(err){}
    if(!stored){
      var m = document.cookie.match(/(?:^|; )shrs_locale=([^;]*)/);
      if(m) { try { stored = decodeURIComponent(m[1]); } catch(err){} }
    }
    if(!stored && prefs.portalLang) stored = prefs.portalLang;
    if(!stored) return;

    // SHRS_I18N is loaded before this file on portal pages; if it is absent
    // (a page that hasn't been rewired yet) fall back to the one direction
    // fact we can state without the registry.
    var dir = null;
    if(window.SHRS_I18N && window.SHRS_I18N.isKnown(stored)){
      dir = window.SHRS_I18N.get(stored).dir;
    } else if(stored === 'ar'){
      dir = 'rtl';
    }
    if(!dir) return;

    var html = document.documentElement;
    html.setAttribute('lang', stored);
    html.setAttribute('dir', dir);
    html.setAttribute('data-locale', stored);
  })();

  /* THE APPEARANCE BUTTON MOVED. It used to be built here — icons, labels,
     the cycle, the injection — and the marketing pages had nothing like it,
     so the only way to change the edition out there was to open the
     Personalisation Centre or to answer an invitation that let itself in over
     the page. It is one control in one file now, js/edition-toggle.js,
     mounted on both sides. What is left here is what only the portal needs:
     stamping the stored edition and locale onto <html> synchronously, before
     the body paints, because this script is not deferred and that button is.
     A reader must never see a frame of the wrong edition or the wrong
     direction. */
})();
