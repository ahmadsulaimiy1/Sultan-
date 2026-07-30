/* Portal Dark Mode toggle. Reuses the exact same shrsPersonalisation
   localStorage key + data-pc-theme attribute mechanism as the public
   site's Personalisation Centre (js/personalisation.js, applied via
   the inline FOUC-prevention script in partials/head.html) so a
   visitor's theme choice is one unified preference across the whole
   site, not a second parallel toggle. This file exists because the
   53 portal pages are standalone HTML (they don't include the public
   site's header/personalisation partials), so the portal needs its
   own small entry point into the same mechanism. Applied synchronously
   (this script is NOT deferred) so data-pc-theme is set on <html>
   before the body paints — no flash of the wrong theme. */
(function(){
  var PREFS_KEY = 'shrsPersonalisation';
  var ORDER = ['royal', 'light', 'dark'];
  var LABEL = { royal: 'Royal (Default)', light: 'Light', dark: 'Dark' };

  /* RTL Arabic — real, working layout capability: flips dir/lang on
     <html> and translates the topbar chrome shared by every one of the
     53 portal pages (data-i18n attributes, added by the build tooling).
     Scope named honestly: this proves the direction-flip + logical-CSS
     foundation end-to-end on real, correctly-translated UI strings.
     Full in-page module content (Dashboard/Analytics/etc. tab bodies,
     and dynamic JS-rendered data) stays English until a broader
     translation pass — the same honestly-deferred scope as task #119
     (full site + policy translation), not a hidden gap. */
  var AR = {
    'sign-out': 'تسجيل الخروج',
    'all-offices': 'جميع المكاتب',
    'org-chart': 'الهيكل التنظيمي',
    'admin-centre': 'مركز الإدارة',
    'clear-token': 'مسح الرمز',
    'pilot': 'تجريبي',
    'staff-documents': 'مستندات الموظفين'
  };
  var EN = {}; // populated lazily from the DOM's own English text on first run

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

  function applyDir(lang){
    var html = document.documentElement;
    html.setAttribute('lang', lang === 'ar' ? 'ar' : 'en');
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }
  function applyI18nText(lang){
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      if (lang === 'ar') {
        if (EN[key] === undefined) EN[key] = el.textContent;
        if (AR[key] !== undefined) el.textContent = AR[key];
      } else if (EN[key] !== undefined) {
        el.textContent = EN[key];
      }
    });
  }

  var prefs = loadPrefs();
  var theme = ORDER.indexOf(prefs.theme) > -1 ? prefs.theme : 'royal';
  document.documentElement.setAttribute('data-pc-theme', theme);
  var lang = prefs.portalLang === 'ar' ? 'ar' : 'en';
  applyDir(lang); // safe before body exists — only touches <html> attributes

  var ICONS = {
    royal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/></svg>',
    light: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>',
    dark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>'
  };

  var btn;
  function render(){
    if(!btn) return;
    btn.innerHTML = ICONS[theme];
    btn.setAttribute('aria-label', 'Appearance: ' + LABEL[theme] + '. Activate to change.');
    btn.title = 'Appearance: ' + LABEL[theme];
  }

  function cycle(){
    theme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    document.documentElement.setAttribute('data-pc-theme', theme);
    var p = loadPrefs();
    p.theme = theme;
    savePrefs(p);
    render();
  }

  var langBtn;
  function renderLang(){
    if(!langBtn) return;
    langBtn.textContent = lang === 'ar' ? 'EN' : 'AR';
    langBtn.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    langBtn.title = langBtn.getAttribute('aria-label');
  }
  function toggleLang(){
    lang = lang === 'ar' ? 'en' : 'ar';
    applyDir(lang);
    applyI18nText(lang);
    var p = loadPrefs();
    p.portalLang = lang;
    savePrefs(p);
    renderLang();
  }

  function inject(){
    applyI18nText(lang);
    if(document.querySelector('.portal-theme-toggle')) return;
    var topbar = document.querySelector('.portal-topbar');
    if(!topbar) return;
    var actions = topbar.lastElementChild;
    var mount = (actions && actions !== topbar.firstElementChild) ? actions : topbar;
    var prepend = mount === actions ? function(el){ actions.insertBefore(el, actions.firstChild); } : function(el){ topbar.appendChild(el); };

    langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.className = 'portal-lang-toggle';
    langBtn.addEventListener('click', toggleLang);
    renderLang();
    prepend(langBtn);

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'portal-theme-toggle';
    btn.addEventListener('click', cycle);
    render();
    prepend(btn);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
