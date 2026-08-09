// Sultan Hanafi Royal Schools — PWA install layer. Registers the
// service worker and surfaces a real "Install App" banner (Android/
// desktop Chrome/Edge) or install instructions (iOS Safari, which has
// no beforeinstallprompt event). This is the concrete, buildable half of
// the Founder's app-architecture directive: one backend, one site,
// installable straight from the browser on any platform, with content
// updates appearing instantly and no reinstall ever required.
(function () {
  'use strict';

  // Registration moved to js/shrs-connectivity.js, which also owns the
  // update lifecycle (a waiting worker, the prompt, the reload). Two
  // registrations for the same URL are harmless in themselves, but two
  // owners of the reload-on-controllerchange rule are not — the page can
  // end up reloading twice. One owner.

  var deferredPrompt = null;
  var STORAGE_KEY = 'shrsPwaInstallDismissed';

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function isDismissed() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }
  function setDismissed() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }

  function buildBanner(text, installLabel, dismissLabel, showButton) {
    var banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.innerHTML =
      '<span class="pwa-install-text">' + text + '</span>'
      + (showButton ? '<button type="button" class="pwa-install-btn">' + installLabel + '</button>' : '')
      + '<button type="button" class="pwa-install-close" aria-label="' + dismissLabel + '">&times;</button>';
    return banner;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (isStandalone() || isDismissed()) return;
    var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    var STR = {
      en: {
        installBtn: 'Install App',
        iosText: 'Install this app: tap Share, then "Add to Home Screen".',
        androidText: 'Install Sultan Hanafi Royal Schools as an app on your device.',
        dismiss: 'Dismiss',
      },
      ar: {
        installBtn: 'تثبيت التطبيق',
        iosText: 'لتثبيت التطبيق: اضغط على زر "مشاركة" ثم "إضافة إلى الشاشة الرئيسية".',
        androidText: 'ثبّت مدارس السلطان حنفي الملكية كتطبيق على جهازك.',
        dismiss: 'إغلاق',
      },
    }[lang];

    if (isIOS()) {
      var iosBanner = buildBanner(STR.iosText, STR.installBtn, STR.dismiss, false);
      document.body.appendChild(iosBanner);
      iosBanner.querySelector('.pwa-install-close').addEventListener('click', function () {
        setDismissed();
        iosBanner.remove();
      });
      return;
    }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      var banner = buildBanner(STR.androidText, STR.installBtn, STR.dismiss, true);
      document.body.appendChild(banner);
      banner.querySelector('.pwa-install-btn').addEventListener('click', function () {
        banner.remove();
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt = null;
        }
      });
      banner.querySelector('.pwa-install-close').addEventListener('click', function () {
        setDismissed();
        banner.remove();
      });
    });

    window.addEventListener('appinstalled', function () {
      setDismissed();
      var existing = document.querySelector('.pwa-install-banner');
      if (existing) existing.remove();
    });
  });
})();
