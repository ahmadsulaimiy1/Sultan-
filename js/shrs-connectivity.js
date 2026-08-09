/* Sultan Hanafi Royal Schools — connectivity, update and recovery layer.
 *
 * The offline shell in sw.js decides what a device can still do. This file
 * is the half the reader actually meets: it says, in their own language,
 * which of four states the application is in, and it never lets a saved
 * copy pass itself off as live.
 *
 *   ONLINE            nothing is shown. A working connection is not news.
 *   OFFLINE           a standing indicator, plus a dated notice on any page
 *                     that was served from the cache.
 *   SYNCING           work is queued and moving. Phase 4's outbound queue
 *                     drives this through SHRS_CONNECTIVITY.setSync().
 *   UPDATE AVAILABLE  a new worker is waiting. The reader decides when it
 *                     takes over — see the note on skipWaiting in sw.js.
 *
 * It also owns two recoveries that have nothing to do with the network:
 * a controlled reset when the cached shell is corrupt (a half-written or
 * partially evicted CacheStorage otherwise leaves a page permanently
 * unstyled), and resolving a portal loading skeleton that would otherwise
 * shimmer for ever against a connection that cannot answer it.
 *
 * Loaded from js/i18n.js, which is the one script present on every page in
 * the estate — public, portal and verification alike. Registering it there
 * rather than in 172 documents is what keeps a new page from silently
 * shipping without it.
 */
(function () {
  'use strict';

  if (window.__SHRS_CONNECTIVITY_STARTED__) return;
  window.__SHRS_CONNECTIVITY_STARTED__ = true;

  var RECOVERY_FLAG = 'shrsShellRecovered';
  var BACK_ONLINE_MS = 4000;
  var SKELETON_GRACE_MS = 1500;

  // --- words ---------------------------------------------------------------
  var STR = {
    en: {
      offline: 'Offline', backOnline: 'Back online', syncing: 'Syncing…',
      pendingOne: '1 change waiting to send', pendingMany: '{n} changes waiting to send',
      savedOffline: 'You are offline. This is the copy saved {when}.',
      savedOnline: 'Showing the copy saved {when}.',
      refresh: 'Load the live page', dismiss: 'Dismiss',
      updateReady: 'A newer version of this site is ready.',
      updateNow: 'Update now', later: 'Later',
      repairing: 'Repairing the saved copy…',
      portalOffline: 'You are offline. This office needs a live connection before it can show its records.',
      justNow: 'a moment ago',
    },
    ar: {
      offline: 'غير متصل', backOnline: 'عاد الاتصال', syncing: 'جارٍ المزامنة…',
      pendingOne: 'تغيير واحد في انتظار الإرسال', pendingMany: '{n} تغييرات في انتظار الإرسال',
      savedOffline: 'أنت غير متصل. هذه هي النسخة المحفوظة {when}.',
      savedOnline: 'تُعرض النسخة المحفوظة {when}.',
      refresh: 'تحميل الصفحة المباشرة', dismiss: 'إغلاق',
      updateReady: 'تتوفر نسخة أحدث من هذا الموقع.',
      updateNow: 'تحديث الآن', later: 'لاحقًا',
      repairing: 'جارٍ إصلاح النسخة المحفوظة…',
      portalOffline: 'أنت غير متصل. يحتاج هذا المكتب إلى اتصال مباشر قبل عرض سجلاته.',
      justNow: 'قبل لحظات',
    },
    yo: {
      offline: 'Kò sí lórí ayélujára', backOnline: 'Ìsopọ̀ ti padà', syncing: 'Ń mú wọn bára mu…',
      pendingOne: 'Àyípadà 1 ń dúró láti fi ránṣẹ́', pendingMany: 'Àyípadà {n} ń dúró láti fi ránṣẹ́',
      savedOffline: 'O kò sí lórí ayélujára. Èyí ni ẹ̀dà tí a pamọ́ {when}.',
      savedOnline: 'Ẹ̀dà tí a pamọ́ {when} ni a ń fihàn.',
      refresh: 'Ṣí ojú-ìwé gidi', dismiss: 'Pa á',
      updateReady: 'Ẹ̀dà tuntun ti ojúlé yìí ti ṣetán.',
      updateNow: 'Ṣe àtúnṣe báyìí', later: 'Nígbà mìíràn',
      repairing: 'Ń tún ẹ̀dà tí a pamọ́ ṣe…',
      portalOffline: 'O kò sí lórí ayélujára. Ọ́fíìsì yìí nílò ìsopọ̀ gidi kí ó tó lè fi àwọn àkọsílẹ̀ rẹ̀ hàn.',
      justNow: 'ní ìṣẹ́jú díẹ̀ sẹ́yìn',
    },
    fr: {
      offline: 'Hors ligne', backOnline: 'Connexion rétablie', syncing: 'Synchronisation…',
      pendingOne: '1 modification en attente d’envoi', pendingMany: '{n} modifications en attente d’envoi',
      savedOffline: 'Vous êtes hors ligne. Voici la copie enregistrée {when}.',
      savedOnline: 'Affichage de la copie enregistrée {when}.',
      refresh: 'Charger la page en direct', dismiss: 'Fermer',
      updateReady: 'Une version plus récente de ce site est prête.',
      updateNow: 'Mettre à jour', later: 'Plus tard',
      repairing: 'Réparation de la copie enregistrée…',
      portalOffline: 'Vous êtes hors ligne. Ce bureau a besoin d’une connexion active pour afficher ses dossiers.',
      justNow: 'il y a un instant',
    },
  };

  function lang() {
    var el = document.documentElement;
    var code = el.getAttribute('data-locale') || el.getAttribute('lang') || 'en';
    code = String(code).slice(0, 2).toLowerCase();
    return STR[code] ? code : 'en';
  }

  function t(key) {
    var pack = STR[lang()];
    return (pack && pack[key]) || STR.en[key] || key;
  }

  function isRtl() {
    return document.documentElement.getAttribute('dir') === 'rtl';
  }

  // Uses the registry's BCP-47 tag when the locale runtime is present, so
  // Arabic gets Arabic numerals and French gets a 24-hour clock, and falls
  // back to the plain code rather than to the browser's own locale — which
  // would print a French date on a Yoruba page.
  function whenLabel(ms) {
    if (!ms) return t('justNow');
    var age = Date.now() - ms;
    if (age < 60000) return t('justNow');
    var code = lang();
    var tag = code;
    try {
      if (window.SHRS_I18N && window.SHRS_I18N.get) tag = window.SHRS_I18N.get(code).intlLocale || code;
    } catch (e) { /* registry absent */ }
    var d = new Date(ms);
    var sameDay = new Date().toDateString() === d.toDateString();
    try {
      return new Intl.DateTimeFormat(tag, sameDay
        ? { hour: '2-digit', minute: '2-digit' }
        : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 16).replace('T', ' ');
    }
  }

  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(values, k) ? values[k] : m;
    });
  }

  // --- chrome --------------------------------------------------------------
  // Styles are injected rather than shipped as a stylesheet on purpose: this
  // layer has to be able to speak on a page whose stylesheet is exactly what
  // failed to load. Logical properties throughout, so the pill sits bottom-
  // left in English and bottom-right in Arabic with no second rule.
  var CSS = [
    '.shrs-conn-pill{position:fixed;inset-block-end:18px;inset-inline-start:18px;z-index:2147483000;',
    'display:inline-flex;align-items:center;gap:8px;padding:8px 15px;border-radius:999px;',
    "font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:0.78rem;font-weight:600;",
    'letter-spacing:0.01em;background:#3B2A1D;color:#F7EEDF;border:1px solid rgba(233,206,138,0.35);',
    'box-shadow:0 6px 22px rgba(0,0,0,0.28);opacity:0;transform:translateY(8px);',
    'transition:opacity .22s ease,transform .22s ease;pointer-events:none;}',
    '.shrs-conn-pill[data-show]{opacity:1;transform:translateY(0);}',
    '.shrs-conn-dot{width:8px;height:8px;border-radius:50%;background:#C6A15B;flex:none;}',
    '.shrs-conn-pill[data-state="offline"] .shrs-conn-dot{background:#B4603C;}',
    '.shrs-conn-pill[data-state="online"] .shrs-conn-dot{background:#5E8C61;}',
    '.shrs-conn-pill[data-state="syncing"] .shrs-conn-dot{background:#C6A15B;animation:shrsConnPulse 1.1s ease-in-out infinite;}',
    '@keyframes shrsConnPulse{0%,100%{opacity:1}50%{opacity:0.28}}',
    '@media (prefers-reduced-motion: reduce){.shrs-conn-pill{transition:none}.shrs-conn-dot{animation:none!important}}',

    '.shrs-conn-bar{position:sticky;top:0;z-index:2147483000;display:flex;align-items:center;',
    'gap:14px;flex-wrap:wrap;padding:11px 20px;background:#2A1D13;color:#F7EEDF;',
    'border-block-end:1px solid rgba(233,206,138,0.3);',
    "font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:0.84rem;line-height:1.5;}",
    '.shrs-conn-bar[hidden]{display:none;}',
    '.shrs-conn-bar-text{flex:1 1 240px;}',
    '.shrs-conn-btn{border:1px solid #C6A15B;background:#C6A15B;color:#221709;border-radius:999px;',
    "padding:7px 16px;font-family:'Inter',system-ui,sans-serif;font-size:0.78rem;font-weight:600;cursor:pointer;}",
    '.shrs-conn-btn.is-quiet{background:transparent;color:#E9CE8A;}',
    '.shrs-conn-offline-note{margin:18px 0;padding:18px 20px;border:1px solid rgba(59,42,29,0.22);',
    "border-inline-start:3px solid #B4603C;background:rgba(180,96,60,0.06);font-family:'Inter',system-ui,sans-serif;",
    'font-size:0.9rem;line-height:1.65;}',
  ].join('');

  function injectStyles() {
    if (document.getElementById('shrs-conn-style')) return;
    var s = document.createElement('style');
    s.id = 'shrs-conn-style';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  var pillEl = null;
  var barEl = null;
  var hideTimer = null;

  function pill() {
    if (pillEl) return pillEl;
    pillEl = document.createElement('div');
    pillEl.className = 'shrs-conn-pill';
    pillEl.setAttribute('role', 'status');
    pillEl.setAttribute('aria-live', 'polite');
    pillEl.innerHTML = '<span class="shrs-conn-dot"></span><span class="shrs-conn-label"></span>';
    document.body.appendChild(pillEl);
    return pillEl;
  }

  function showPill(state, label) {
    var el = pill();
    el.setAttribute('data-state', state);
    el.querySelector('.shrs-conn-label').textContent = label;
    el.setAttribute('data-show', '');
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  function hidePill(afterMs) {
    if (!pillEl) return;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { pillEl.removeAttribute('data-show'); }, afterMs || 0);
  }

  function bar() {
    if (barEl) return barEl;
    barEl = document.createElement('div');
    barEl.className = 'shrs-conn-bar';
    barEl.hidden = true;
    barEl.setAttribute('role', 'status');
    barEl.innerHTML = '<span class="shrs-conn-bar-text"></span><span class="shrs-conn-bar-actions"></span>';
    document.body.insertBefore(barEl, document.body.firstChild);
    return barEl;
  }

  function showBar(text, actions) {
    var el = bar();
    el.querySelector('.shrs-conn-bar-text').textContent = text;
    var box = el.querySelector('.shrs-conn-bar-actions');
    box.textContent = '';
    (actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'shrs-conn-btn' + (a.quiet ? ' is-quiet' : '');
      b.textContent = a.label;
      b.addEventListener('click', a.onClick);
      box.appendChild(b);
    });
    el.hidden = false;
  }

  function hideBar() { if (barEl) barEl.hidden = true; }

  // --- state ---------------------------------------------------------------
  var sync = { active: false, pending: 0 };

  function render() {
    if (!navigator.onLine) {
      showPill('offline', t('offline'));
      return;
    }
    if (sync.active) {
      showPill('syncing', t('syncing'));
      return;
    }
    if (sync.pending > 0) {
      showPill('syncing', sync.pending === 1
        ? t('pendingOne')
        : fill(t('pendingMany'), { n: sync.pending }));
      return;
    }
    hidePill(0);
  }

  // --- the saved-copy notice ----------------------------------------------
  // sw.js writes __SHRS_CACHED_AT into any document it serves from the page
  // cache. Nothing else does. Its presence is therefore proof — not a guess —
  // that what the reader is looking at is not live, and the notice says when
  // it was taken rather than only that it is old.
  function announceCachedCopy() {
    var at = window.__SHRS_CACHED_AT;
    if (!at) return;
    var when = whenLabel(at);
    var actions = [];
    if (navigator.onLine) {
      actions.push({ label: t('refresh'), onClick: function () { window.location.reload(); } });
    }
    actions.push({ label: t('dismiss'), quiet: true, onClick: hideBar });
    showBar(fill(navigator.onLine ? t('savedOnline') : t('savedOffline'), { when: when }), actions);
  }

  // --- service worker lifecycle -------------------------------------------
  var updatePrompted = false;

  function promptUpdate(worker) {
    if (updatePrompted) return;
    updatePrompted = true;
    showBar(t('updateReady'), [
      {
        label: t('updateNow'),
        onClick: function () {
          try { worker.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { window.location.reload(); }
        },
      },
      { label: t('later'), quiet: true, onClick: function () { hideBar(); } },
    ]);
  }

  function watchRegistration(reg) {
    if (!reg) return;
    if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var incoming = reg.installing;
      if (!incoming) return;
      incoming.addEventListener('statechange', function () {
        // A worker that reaches "installed" while another one controls the
        // page is a new version waiting its turn. With no controller it is
        // the first install, which needs no announcement.
        if (incoming.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(incoming);
      });
    });
  }

  function startServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(watchRegistration).catch(function () {
      // No worker means no offline shell — and nothing else here depends on
      // one, so the page carries on exactly as it did before this file
      // existed. That is the point: this layer is additive.
    });

    // A controllerchange means one of two very different things. On a first
    // install it is clients.claim() taking over a page that loaded without a
    // worker — nothing has changed underneath the reader and reloading would
    // be a visible, pointless flash on their very first visit. After that it
    // means a NEW worker has replaced the one that served this page, and the
    // assets it holds may not be the ones this document was built against;
    // that one does need a reload. The flag is the whole difference.
    var hadController = Boolean(navigator.serviceWorker.controller);
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  }

  function tellWorker(message) {
    return new Promise(function (resolve, reject) {
      if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
        reject(new Error('no controller'));
        return;
      }
      var channel = new MessageChannel();
      var settled = false;
      channel.port1.onmessage = function (e) { settled = true; resolve(e.data); };
      setTimeout(function () { if (!settled) reject(new Error('timeout')); }, 8000);
      navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
    });
  }

  // --- recovery ------------------------------------------------------------
  // A stylesheet or script that 404s while a worker is controlling the page,
  // on a connection that is up, means the cache is lying about what it holds.
  // Left alone that is permanent: every reload re-reads the same broken
  // entry. One reset, once per session, and the shell is rebuilt from the
  // network. The session flag is what stops a genuinely missing asset from
  // becoming a reload loop.
  function watchForCorruptShell() {
    window.addEventListener('error', function (event) {
      var el = event.target;
      if (!el || !el.tagName) return;
      var src = el.tagName === 'LINK' ? el.href : (el.tagName === 'SCRIPT' ? el.src : null);
      if (!src) return;
      var url;
      try { url = new URL(src, window.location.href); } catch (e) { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname.indexOf('/css/') !== 0 && url.pathname.indexOf('/js/') !== 0) return;
      if (!navigator.onLine) return;                       // offline: expected, not corruption
      if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
      try {
        if (sessionStorage.getItem(RECOVERY_FLAG)) return;
        sessionStorage.setItem(RECOVERY_FLAG, '1');
      } catch (e) { return; }                              // no sessionStorage: no loop guard, so no reset

      showBar(t('repairing'), []);
      tellWorker({ type: 'RESET_CACHES' })
        .then(function () { window.location.reload(); })
        .catch(function () { window.location.reload(); });
    }, true);
  }

  // --- portal skeletons ----------------------------------------------------
  // Portal pages paint a shimmer while they fetch their own records. Offline
  // that fetch can never land, so the shimmer becomes a lie told indefinitely.
  // The skeleton is retired and replaced with a sentence that is true. The
  // page's own error state is deliberately NOT reused: it says "try signing
  // in again", and a missing connection is not a rejected session.
  function resolveOfflineSkeletons() {
    if (navigator.onLine) return;
    var skeletons = document.querySelectorAll('[data-portal-loading]');
    Array.prototype.forEach.call(skeletons, function (sk) {
      if (sk.hidden || sk.getAttribute('data-shrs-offline-resolved')) return;
      sk.setAttribute('data-shrs-offline-resolved', '1');
      sk.hidden = true;
      var note = document.createElement('div');
      note.className = 'shrs-conn-offline-note';
      note.setAttribute('data-shrs-offline-note', '');
      note.textContent = t('portalOffline');
      if (sk.parentNode) sk.parentNode.insertBefore(note, sk);
    });
  }

  function clearOfflineSkeletonNotes() {
    var notes = document.querySelectorAll('[data-shrs-offline-note]');
    if (!notes.length) return;
    // The records themselves still have to be fetched, and only the page
    // that owns them knows how. A reload is the honest way back.
    window.location.reload();
  }

  // --- public surface ------------------------------------------------------
  // Phase 4's outbound queue owns the syncing state; this file only renders
  // it. Exposed as a method and as an event so a module that loads later —
  // or not at all — never has to reach into this one's internals.
  window.SHRS_CONNECTIVITY = {
    setSync: function (state) {
      state = state || {};
      sync.active = Boolean(state.syncing);
      sync.pending = Number(state.pending) || 0;
      render();
    },
    state: function () {
      if (!navigator.onLine) return 'offline';
      if (sync.active) return 'syncing';
      if (sync.pending > 0) return 'pending';
      return 'online';
    },
    isCachedCopy: function () { return Boolean(window.__SHRS_CACHED_AT); },
    cachedAt: function () { return window.__SHRS_CACHED_AT || null; },
    resetCaches: function () { return tellWorker({ type: 'RESET_CACHES' }); },
    cacheStatus: function () { return tellWorker({ type: 'CACHE_STATUS' }); },
  };

  document.addEventListener('shrs:sync', function (e) {
    window.SHRS_CONNECTIVITY.setSync(e.detail || {});
  });

  // --- start ---------------------------------------------------------------
  function start() {
    injectStyles();
    startServiceWorker();
    watchForCorruptShell();
    announceCachedCopy();
    render();
    setTimeout(resolveOfflineSkeletons, SKELETON_GRACE_MS);

    window.addEventListener('offline', function () {
      render();
      setTimeout(resolveOfflineSkeletons, SKELETON_GRACE_MS);
    });

    window.addEventListener('online', function () {
      showPill('online', t('backOnline'));
      hidePill(BACK_ONLINE_MS);
      clearOfflineSkeletonNotes();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
