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
  var LABEL = { royal: 'Royal (Default)', light: 'Light', dark: 'Dark' };

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

  var prefs = loadPrefs();
  var theme = ORDER.indexOf(prefs.theme) > -1 ? prefs.theme : 'royal';
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

  var ICONS = {
    royal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/></svg>',
    light: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>',
    dark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>'
  };

  var btn;
  function render(){
    if(!btn) return;
    btn.innerHTML = ICONS[theme];
    var label = (window.SHRS_LOCALE && window.SHRS_LOCALE.t)
      ? window.SHRS_LOCALE.t('portal.appearance') + ': ' + LABEL[theme]
      : 'Appearance: ' + LABEL[theme];
    btn.setAttribute('aria-label', label + '. Activate to change.');
    btn.title = label;
  }

  function cycle(){
    theme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    document.documentElement.setAttribute('data-pc-theme', theme);
    var p = loadPrefs();
    p.theme = theme;
    savePrefs(p);
    render();
  }

  function inject(){
    if(document.querySelector('.portal-theme-toggle')) return;
    var topbar = document.querySelector('.portal-topbar');
    if(!topbar) return;
    var actions = topbar.lastElementChild;
    var mount = (actions && actions !== topbar.firstElementChild) ? actions : topbar;
    var prepend = mount === actions ? function(el){ actions.insertBefore(el, actions.firstChild); } : function(el){ topbar.appendChild(el); };

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'portal-theme-toggle';
    btn.addEventListener('click', cycle);
    render();
    prepend(btn);
  }

  // Re-label the appearance button when the reader changes language, since
  // its accessible name is prose too.
  document.addEventListener('shrs:locale-changed', render);

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
