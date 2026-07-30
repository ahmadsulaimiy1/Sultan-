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

  function inject(){
    if(document.querySelector('.portal-theme-toggle')) return;
    var topbar = document.querySelector('.portal-topbar');
    if(!topbar) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'portal-theme-toggle';
    btn.addEventListener('click', cycle);
    render();
    var actions = topbar.lastElementChild;
    if(actions && actions !== topbar.firstElementChild){
      actions.insertBefore(btn, actions.firstChild);
    } else {
      topbar.appendChild(btn);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
