/* ===================================================================
   THE EDITION SWITCH
   -------------------------------------------------------------------
   One small control, in the masthead, on every page: the crescent, the
   sun or the star, and a tap moves between Clear, Royal and Midnight.

   It exists because the only way to change the site's edition used to
   be to open the Personalisation Centre — thirty panels deep — or to
   answer an invitation that let itself in over the page eight seconds
   after arrival and put a scrim behind it. A reader who simply wanted
   the paler paper had to be interrupted first, and a reader who was
   interrupted had no way back to it afterwards.

   So: an icon, present from the first paint, that can be changed and
   switched. Nothing waits, nothing covers the page, and the choice is
   one tap from wherever the reader already is.

   The portal has had exactly this control since it was built. This is
   that control, in one file, mounted in both places — the marketing
   masthead by the [data-edition-toggle] slot the header partial gives
   it, and the Digital Campus by injection, because those pages are
   hand-authored and have no slot to give.

   It writes the same shrsPersonalisation key the Personalisation
   Centre writes, so the two can never disagree.
   =================================================================== */
(function () {
  'use strict';

  var PREFS_KEY = 'shrsPersonalisation';
  var ORDER = ['royal', 'light', 'dark'];
  /* The three editions are named here exactly as the Personalisation Centre
     names them in partials/personalisation.html — Clear, Royal, Midnight —
     because that panel states them as literals too and a control that called
     them something else would be a second vocabulary for one setting. When
     the Centre is translated these move with it. */
  var LABEL = { royal: 'Royal', light: 'Clear', dark: 'Midnight' };

  var ICONS = {
    royal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/></svg>',
    light: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>',
    dark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>'
  };

  function loadPrefs() {
    try {
      var raw = window.localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) { return {}; }
  }
  function savePrefs(prefs) {
    try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (err) {}
    try {
      document.dispatchEvent(new CustomEvent('sultan:personalisation-changed', { detail: prefs }));
    } catch (err) {}
  }

  var html = document.documentElement;
  var theme = html.getAttribute('data-pc-theme');
  if (ORDER.indexOf(theme) < 0) theme = loadPrefs().theme;
  if (ORDER.indexOf(theme) < 0) theme = 'royal';

  var buttons = [];

  /* The label names the edition the reader is IN and the one the tap will
     take them to. A control that only says "Appearance" leaves a screen
     reader user pressing it to find out which. */
  function render() {
    var next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    var label = LABEL[theme] + ' edition. Switch to ' + LABEL[next] + '.';
    buttons.forEach(function (b) {
      b.innerHTML = ICONS[theme];
      b.setAttribute('aria-label', label);
      b.title = label;
    });
  }

  function cycle() {
    theme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    html.setAttribute('data-pc-theme', theme);
    var p = loadPrefs();
    p.theme = theme;
    savePrefs(p);
    render();
  }

  function adopt(btn) {
    if (btn.__shrsEdition) return;
    btn.__shrsEdition = true;
    btn.addEventListener('click', cycle);
    buttons.push(btn);
  }

  function mount() {
    // The marketing masthead hands it a slot.
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-edition-toggle]'), adopt);

    /* The Digital Campus has no slot: sixty-eight hand-authored pages, so the
       button is made here and put at the head of the utility cluster.

       WHICH ELEMENT IS THE CLUSTER MATTERS. The rule this replaces took
       `topbar.lastElementChild` — which on a dashboard is the utility <div>
       and is right, and on /portal/login/ is the <span> the language switcher
       mounts into. js/i18n.js renders that switcher by writing the mount's
       innerHTML, so on every sign-in page the edition switch was built,
       inserted, and then erased a moment later by a script that had no idea
       it was there. Nobody could change the edition from a sign-in screen,
       and nothing reported an error.

       So the cluster is identified rather than guessed at: the tier
       js/portal-chrome.js names, or the unclassed <div> it names it from, and
       otherwise the bar itself — never a mount that belongs to something
       else. */
    if (!buttons.length) {
      var topbar = document.querySelector('.portal-topbar');
      if (topbar && !topbar.querySelector('.portal-theme-toggle')) {
        var host = topbar.querySelector('.pch-utility');
        if (!host) {
          var kids = topbar.children;
          for (var i = 0; i < kids.length; i++) {
            if (kids[i].tagName === 'DIV' && !kids[i].className) { host = kids[i]; break; }
          }
        }
        if (!host) host = topbar;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'portal-theme-toggle';
        adopt(btn);
        host.insertBefore(btn, host.firstChild);
      }
    }
    render();
  }

  // The edition can also be changed from the Personalisation Centre; the icon
  // follows it rather than going stale.
  document.addEventListener('sultan:personalisation-changed', function (e) {
    var t = e && e.detail && e.detail.theme;
    if (t && ORDER.indexOf(t) > -1 && t !== theme) { theme = t; render(); }
  });
  document.addEventListener('shrs:locale-changed', render);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
