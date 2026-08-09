(function(){
  var PREFS_KEY = 'shrsPersonalisation';
  var STRIP_LANG = document.documentElement.lang === 'ar' ? 'ar' : 'en';

  var DEFAULTS = {
    textSize: 'medium',
    theme: 'light',   // the Clear edition is the house default
    livery: 'royal',
    ornament: 'full',
    corners: 'soft',
    depth: 'standard',
    grain: 'on',
    cursorLight: 'on',
    parallax: 'on',
    revealStyle: 'rise',
    measure: 'standard',
    letterpress: 'on',
    motes: 'on',
    pageWipe: 'on',
    readingRuler: 'off',
    numerals: 'auto',
    liveryPromptSeen: false,
    accent: 'royal-gold',
    readingMode: 'standard',
    textDensity: 'comfortable',
    motion: 'standard',
    bodyFace: 'serif',
    leading: 'normal',
    tracking: 'normal',
    alignment: 'justified',
    versal: 'on',
    arabicScale: 'standard',
    contrast: 'standard',
    links: 'hover',
    focusRing: 'standard',
    interfaceSound: 'on',
    spokenIntro: 'on',
    readAloud: 'on',
    imagery: 'full',
    dateFormat: 'both',
    timeFormat: '24h',
    aiCommunicationStyle: 'professional',
    islamicPrayerTimes: true,
    islamicHijriCalendar: true,
    islamicEvents: true,
    islamicCoords: null, // {lat,lng} once the visitor opts in via geolocation
    aiOffice: null,
    landingPage: 'home',
    floatingWhatsapp: true,
    floatingAssistant: true,
    floatingApply: true,
    floatingCall: true,
  };

  // School's own coordinates (Ikorodu, Lagos State, Nigeria) — the
  // honest default until a visitor opts in to sharing their own location
  // for prayer times relevant to Riyadh, Jeddah, Doha, Dubai, Kuala
  // Lumpur, Abuja, London, Paris, etc.
  var SCHOOL_COORDS = { lat: 6.6194, lng: 3.5105 };

  function loadPrefs(){
    try{
      var raw = window.localStorage.getItem(PREFS_KEY);
      var stored = raw ? JSON.parse(raw) : {};
      return Object.assign({}, DEFAULTS, stored);
    }catch(err){ return Object.assign({}, DEFAULTS); }
  }
  // Raised while this module is the one writing, so the reconciler at the
  // foot of the file can tell its own echo apart from a write made by
  // another module — the livery invitation, the portal theme switch —
  // and reload only for the latter. Without this the Centre's in-memory
  // copy goes stale the moment anything else saves a preference, and the
  // next control the visitor touches writes the stale copy back: a
  // livery chosen in the invitation would silently revert to Royal.
  var writingOwnPrefs = false;
  function savePrefs(prefs){
    writingOwnPrefs = true;
    try{ window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }catch(err){ /* storage unavailable — preferences just won't persist */ }
    document.dispatchEvent(new CustomEvent('sultan:personalisation-changed', { detail: prefs }));
    writingOwnPrefs = false;
  }

  var prefs = loadPrefs();

  var FLOATING_MAP = {
    floatingWhatsapp: '.whatsapp-float',
    floatingAssistant: '.assistant-root',
    floatingApply: '.apply-float',
    floatingCall: '.call-float',
  };

  var dyslexiaFontLoaded = false;
  function ensureDyslexiaFont(){
    if(dyslexiaFontLoaded || prefs.readingMode !== 'dyslexia') return;
    dyslexiaFontLoaded = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap';
    document.head.appendChild(link);
  }

  function applyAccessibility(){
    var html = document.documentElement;
    html.setAttribute('data-pc-theme', prefs.theme);
    html.setAttribute('data-pc-livery', prefs.livery);
    html.setAttribute('data-pc-ornament', prefs.ornament);
    html.setAttribute('data-pc-corners', prefs.corners);
    html.setAttribute('data-pc-depth', prefs.depth);
    html.setAttribute('data-pc-grain', prefs.grain);
    html.setAttribute('data-pc-cursor', prefs.cursorLight);
    html.setAttribute('data-pc-parallax', prefs.parallax);
    html.setAttribute('data-pc-reveal', prefs.revealStyle);
    html.setAttribute('data-pc-width', prefs.measure);
    html.setAttribute('data-pc-press', prefs.letterpress);
    html.setAttribute('data-pc-motes', prefs.motes);
    html.setAttribute('data-pc-pagewipe', prefs.pageWipe);
    html.setAttribute('data-pc-ruler', prefs.readingRuler);
    html.setAttribute('data-pc-numerals', prefs.numerals);
    html.setAttribute('data-pc-text', prefs.textSize);
    html.setAttribute('data-pc-motion', prefs.motion);
    html.setAttribute('data-pc-accent', prefs.accent);
    html.setAttribute('data-pc-reading', prefs.readingMode);
    html.setAttribute('data-pc-text-density', prefs.textDensity);
    html.setAttribute('data-pc-face', prefs.bodyFace);
    html.setAttribute('data-pc-leading', prefs.leading);
    html.setAttribute('data-pc-tracking', prefs.tracking);
    html.setAttribute('data-pc-align', prefs.alignment);
    html.setAttribute('data-pc-versal', prefs.versal);
    html.setAttribute('data-pc-arabic', prefs.arabicScale);
    html.setAttribute('data-pc-contrast', prefs.contrast);
    html.setAttribute('data-pc-links', prefs.links);
    html.setAttribute('data-pc-focus', prefs.focusRing);
    html.setAttribute('data-pc-imagery', prefs.imagery);
    // The interface-sound preference is the same preference the floating
    // sound toggle writes, so the two controls are one setting rather
    // than two that can disagree. js/motion.js listens for this event.
    html.setAttribute('data-pc-sound', prefs.interfaceSound);
    html.setAttribute('data-pc-intro', prefs.spokenIntro);
    html.setAttribute('data-pc-read-aloud', prefs.readAloud);
    try {
      window.localStorage.setItem('shrsSound', prefs.interfaceSound === 'off' ? 'off' : 'on');
      window.dispatchEvent(new Event(prefs.interfaceSound === 'off' ? 'shrs:sound-off' : 'shrs:sound-on'));
      // The spoken introduction carries its own switch, so silencing the
      // interface no longer silences the school's voice by side effect.
      window.localStorage.setItem('shrsIntroVoice', prefs.spokenIntro === 'off' ? 'off' : 'on');
      if(prefs.spokenIntro === 'off') window.dispatchEvent(new Event('shrs:intro-off'));
    } catch (e) { /* storage unavailable — the attribute still applies */ }
    ensureDyslexiaFont();
  }

  function applyFloatingVisibility(){
    Object.keys(FLOATING_MAP).forEach(function(key){
      var el = document.querySelector(FLOATING_MAP[key]);
      if(!el) return;
      el.classList.toggle('is-pc-hidden', !prefs[key]);
    });
  }

  applyAccessibility();

  // --- Root elements (absent on pages that somehow don't include the partial — bail quietly) ---
  var root = document.querySelector('[data-personalisation]');
  if(!root) { applyFloatingVisibility(); return; }

  var overlay = root.querySelector('[data-pc-overlay]');
  var drawer = root.querySelector('[data-pc-drawer]');
  var closeBtn = root.querySelector('[data-pc-close]');
  var tabs = root.querySelectorAll('[data-pc-tab]');
  var panels = root.querySelectorAll('[data-pc-panel]');
  var triggers = document.querySelectorAll('[data-pc-trigger]');

  function activateTab(key){
    if(!key) return;
    var tabBtn = root.querySelector('[data-pc-tab="' + key + '"]');
    if(!tabBtn) return;
    tabs.forEach(function(t){ t.classList.toggle('is-active', t === tabBtn); t.setAttribute('aria-selected', String(t === tabBtn)); });
    panels.forEach(function(p){ p.classList.toggle('is-active', p.getAttribute('data-pc-panel') === key); });
  }
  function openDrawer(openTabKey){
    overlay.hidden = false; drawer.hidden = false;
    requestAnimationFrame(function(){ overlay.classList.add('is-visible'); drawer.classList.add('is-open'); });
    document.body.classList.add('pc-lock');
    activateTab(openTabKey);
    loadNotificationsTabIfNeeded();
    loadSecurityTabIfNeeded();
  }
  function closeDrawer(){
    overlay.classList.remove('is-visible'); drawer.classList.remove('is-open');
    document.body.classList.remove('pc-lock');
    setTimeout(function(){ overlay.hidden = true; drawer.hidden = true; }, 350);
  }
  // A trigger can request a specific tab open directly (e.g. a "Prayer
  // Times" quick-access link jumping straight to the Islamic
  // Preferences tab where the live Hijri/prayer widget actually lives)
  // via data-pc-open-tab="<tab key>"; plain triggers open to whatever
  // tab was last active, unchanged.
  triggers.forEach(function(btn){
    btn.addEventListener('click', function(){ openDrawer(btn.getAttribute('data-pc-open-tab')); });
  });
  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer(); });

  tabs.forEach(function(tabBtn){
    tabBtn.addEventListener('click', function(){
      var key = tabBtn.getAttribute('data-pc-tab');
      tabs.forEach(function(t){ t.classList.toggle('is-active', t === tabBtn); t.setAttribute('aria-selected', String(t === tabBtn)); });
      panels.forEach(function(p){ p.classList.toggle('is-active', p.getAttribute('data-pc-panel') === key); });
    });
  });

  // --- Generic segmented / radio-group control: [data-pc-set] wraps
  // buttons with data-value + role="radio"; works for both the pill
  // .pc-segmented control and the .pc-office-row list. ---
  root.querySelectorAll('[data-pc-set]').forEach(function(group){
    var key = group.getAttribute('data-pc-set');
    var buttons = group.querySelectorAll('[role="radio"]');
    buttons.forEach(function(btn){
      var value = btn.getAttribute('data-value');
      btn.classList.toggle('is-active', prefs[key] === value);
      btn.setAttribute('aria-checked', String(prefs[key] === value));
      if(btn.disabled) return;
      btn.addEventListener('click', function(){
        prefs[key] = value;
        buttons.forEach(function(b){
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-checked', String(active));
        });
        savePrefs(prefs);
        applyAccessibility();
        if(key === 'dateFormat' || key === 'timeFormat'){ renderHijriDate(); fetchPrayerTimes(); }
        if(key === 'favouriteSchool'){ renderFavouriteLink(); }
      });
    });
  });

  // --- Generic on/off switch: [data-pc-toggle] ---
  root.querySelectorAll('[data-pc-toggle]').forEach(function(sw){
    var key = sw.getAttribute('data-pc-toggle');
    sw.classList.toggle('is-on', !!prefs[key]);
    sw.setAttribute('aria-checked', String(!!prefs[key]));
    sw.addEventListener('click', function(){
      prefs[key] = !prefs[key];
      sw.classList.toggle('is-on', prefs[key]);
      sw.setAttribute('aria-checked', String(prefs[key]));
      savePrefs(prefs);
      applyFloatingVisibility();
      renderIslamicStrip();
      if(key === 'islamicEvents'){
        if(typeof todayHijri !== 'undefined' && todayHijri) renderIslamicEvent(todayHijri);
        renderJumuahReminder();
      }
    });
  });

  applyFloatingVisibility();

  // --- The spoken introduction: play it on request ---
  // Browsers will not produce sound without a gesture, and a press is a
  // gesture, so this always works where the automatic playing may not.
  (function(){
    var btn = root.querySelector('[data-pc-intro-play]');
    var state = root.querySelector('[data-pc-intro-state]');
    if(!btn) return;
    var AR = STRIP_LANG === 'ar';
    function say(msg){ if(state) state.textContent = msg || ''; }
    function label(playing){
      btn.textContent = playing
        ? (AR ? 'إيقاف' : 'Stop')
        : (AR ? 'استماع الكلمة' : 'Play the introduction');
    }
    btn.addEventListener('click', function(){
      var intro = window.SHRS_INTRO;
      if(!intro){ say(AR ? 'التسجيل غير متاح على هذه الصفحة.' : 'The recording is not available on this page.'); return; }
      if(intro.speaking()){ intro.stop(); label(false); say(''); return; }
      if(prefs.spokenIntro === 'off'){
        prefs.spokenIntro = 'on';
        savePrefs(prefs); applyAccessibility(); syncControls();
      }
      say(AR ? 'جارٍ التشغيل…' : 'Playing…');
      label(true);
      Promise.resolve(intro.play()).then(function(ok){
        if(!ok){ label(false); say(AR ? 'تعذّر التشغيل.' : 'It would not play.'); return; }
        var poll = window.setInterval(function(){
          if(intro.speaking()) return;
          window.clearInterval(poll); label(false); say('');
        }, 400);
      });
    });
  })();

  // --- Reconciler: keep this module's copy of the preferences true ---
  // Other modules write to the same store (the livery invitation, the
  // portal theme switch), and another tab can write to it too. Whenever
  // that happens, re-read, adopt the change, and put every control in
  // the panel back in step with it. The panel is the mirror of the
  // preference store; it must never be allowed to become an older copy
  // of it, because the next click would write that older copy back.
  function syncControls(){
    root.querySelectorAll('[data-pc-set]').forEach(function(group){
      var key = group.getAttribute('data-pc-set');
      group.querySelectorAll('[role="radio"]').forEach(function(btn){
        var on = prefs[key] === btn.getAttribute('data-value');
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-checked', String(on));
      });
    });
    root.querySelectorAll('[data-pc-toggle]').forEach(function(sw){
      var key = sw.getAttribute('data-pc-toggle');
      sw.classList.toggle('is-on', !!prefs[key]);
      sw.setAttribute('aria-checked', String(!!prefs[key]));
    });
  }
  function adoptExternalPrefs(){
    var fresh = loadPrefs();
    var moved = false;
    Object.keys(fresh).forEach(function(k){
      if(prefs[k] !== fresh[k]){ prefs[k] = fresh[k]; moved = true; }
    });
    if(!moved) return;
    applyAccessibility();
    applyFloatingVisibility();
    syncControls();
  }
  document.addEventListener('sultan:personalisation-changed', function(){
    if(writingOwnPrefs) return;
    adoptExternalPrefs();
  });
  window.addEventListener('storage', function(e){
    if(e.key && e.key !== PREFS_KEY) return;
    adoptExternalPrefs();
  });

  // ================================================================
  // Islamic Preferences — Hijri date (tabular/"Kuwaiti algorithm"
  // civil calendar, a documented arithmetic approximation) + prayer
  // times (Aladhan calculation API, Muslim World League method).
  // Both are estimates, not moon-sighting-verified — disclosed in the
  // panel itself, not hidden in a footnote nobody reads.
  // ================================================================
  var HIJRI_MONTHS_EN = ['Muharram','Safar',"Rabi' al-Awwal","Rabi' al-Thani",'Jumada al-Awwal','Jumada al-Thani','Rajab',"Sha'ban",'Ramadan','Shawwal',"Dhu al-Qi'dah","Dhu al-Hijjah"];
  var HIJRI_MONTHS_AR = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];

  function gregorianToJD(y, m, d){
    return Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4)
      + Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12)
      - Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4)
      + d - 32075;
  }
  function jdToHijri(jdIn){
    var jd = jdIn - 1948440 + 10632;
    var n = Math.floor((jd - 1) / 10631);
    jd = jd - 10631 * n + 354;
    var j = Math.floor((10985 - jd) / 5316) * Math.floor((50 * jd) / 17719) + Math.floor(jd / 5670) * Math.floor((43 * jd) / 15238);
    jd = jd - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    var month = Math.floor((24 * jd) / 709);
    var day = jd - Math.floor((709 * month) / 24);
    var year = 30 * n + j - 30;
    return { year: year, month: month, day: day };
  }
  function hijriToJD(year, month, day){
    return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + 1948440 - 385;
  }
  function todayJD(){
    var now = new Date();
    return gregorianToJD(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  function gregorianLabel(){
    var now = new Date();
    return now.toLocaleDateString(STRIP_LANG === 'ar' ? 'ar' : 'en', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderHijriDate(){
    var el = root.querySelector('[data-pc-hijri-date]');
    var stripEl = document.querySelectorAll('[data-pc-strip-hijri]');
    if(!el && !stripEl.length) return;
    var h = jdToHijri(todayJD());
    var names = STRIP_LANG === 'ar' ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
    var hijriText = h.day + ' ' + (names[h.month - 1] || '') + ' ' + h.year + 'H';
    var text = prefs.dateFormat === 'gregorian' ? gregorianLabel()
      : prefs.dateFormat === 'both' ? (hijriText + ' · ' + gregorianLabel())
      : hijriText;
    if(el) el.textContent = hijriText; // the preview card is always the Hijri date specifically
    var hijriIcon = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" class="pc-strip-icon"><path d="M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
    stripEl.forEach(function(s){ s.innerHTML = prefs.islamicHijriCalendar ? hijriIcon + '<span>' + text + '</span>' : ''; });
    return h;
  }

  function nextHijriOccurrence(todayH, jdToday, month, day){
    var year = todayH.year;
    var jd = hijriToJD(year, month, day);
    if(jd < jdToday){ year += 1; jd = hijriToJD(year, month, day); }
    return jd;
  }

  function renderIslamicEvent(todayH){
    var row = root.querySelector('[data-pc-islamic-event-row]');
    var valueEl = root.querySelector('[data-pc-islamic-event]');
    if(!row || !valueEl) return;
    if(!prefs.islamicEvents){ row.hidden = true; return; }

    var jd = todayJD();
    var candidates = [
      { label: STRIP_LANG === 'ar' ? 'رمضان' : 'Ramadan', month: 9, day: 1 },
      { label: STRIP_LANG === 'ar' ? 'عيد الفطر' : 'Eid al-Fitr', month: 10, day: 1 },
      { label: STRIP_LANG === 'ar' ? 'عيد الأضحى' : 'Eid al-Adha', month: 12, day: 10 },
    ].map(function(c){
      var occJd = nextHijriOccurrence(todayH, jd, c.month, c.day);
      return { label: c.label, daysAway: occJd - jd };
    }).sort(function(a, b){ return a.daysAway - b.daysAway; });

    var soonest = candidates[0];
    if(soonest.daysAway <= 45){
      var phrase = STRIP_LANG === 'ar'
        ? soonest.label + ' خلال ' + soonest.daysAway + ' يوم'
        : soonest.label + ' in ' + soonest.daysAway + ' day' + (soonest.daysAway === 1 ? '' : 's');
      valueEl.textContent = phrase;
      row.hidden = false;
    } else {
      row.hidden = true;
    }
  }

  function parseHM(hm){
    var parts = (hm || '').split(':');
    var d = new Date();
    d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
    return d;
  }

  var lastPrayerTimings = null;
  var prayerIcon = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" class="pc-strip-icon"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  function renderPrayerTimes(timings){
    lastPrayerTimings = timings || null;
    var el = root.querySelector('[data-pc-next-prayer]');
    var stripEls = document.querySelectorAll('[data-pc-strip-prayer]');
    if(!timings){
      if(el) el.textContent = STRIP_LANG === 'ar' ? 'غير متاح حاليًا' : 'Not available right now';
      stripEls.forEach(function(s){ s.innerHTML = ''; });
      return;
    }
    var order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    var labelsAr = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
    var now = new Date();
    var next = null;
    for(var i = 0; i < order.length; i++){
      var t = parseHM(timings[order[i]]);
      if(t > now){ next = { name: order[i], time: t }; break; }
    }
    if(!next) next = { name: 'Fajr', time: parseHM(timings.Fajr) }; // all passed — tomorrow's Fajr (same clock time)
    var label = STRIP_LANG === 'ar' ? labelsAr[next.name] : next.name;
    var timeStr = next.time.toLocaleTimeString(STRIP_LANG === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit', hour12: prefs.timeFormat === '12h' });
    var diffMs = next.time - now;
    if(diffMs < 0) diffMs += 24 * 3600 * 1000;
    var diffMin = Math.max(0, Math.round(diffMs / 60000));
    var hh = Math.floor(diffMin / 60), mm = diffMin % 60;
    var countdown = STRIP_LANG === 'ar'
      ? (hh > 0 ? hh + 'س ' : '') + mm + 'د'
      : (hh > 0 ? hh + 'h ' : '') + mm + 'm';
    var text = label + ' · ' + timeStr;
    if(el) el.textContent = text;
    stripEls.forEach(function(s){
      s.innerHTML = prefs.islamicPrayerTimes
        ? prayerIcon + '<span>' + text + ' <span class="pc-strip-countdown">(' + countdown + (STRIP_LANG === 'ar' ? ' متبقية' : ' left') + ')</span></span>'
        : '';
    });
  }

  /* The prayer times are CALCULATED, not fetched — see js/prayer-times.js
     for the algorithm and for why.

     This used to be a single request to api.aladhan.com with no
     fallback: if that server was slow, down, blocked by an ad-blocker
     or unreachable on a weak connection, the .catch emptied the element
     and the next prayer silently vanished from the top of every page.
     On a school built around the five daily prayers that is the last
     line that should ever be allowed to disappear, and it was the only
     one with a single point of failure.

     The same Muslim World League method the old request asked for
     (method=3 — Fajr 18 degrees, Isha 17) is now computed locally, so
     the numbers are unchanged for anyone already reading them, present
     on the first paint rather than a second later, correct offline,
     and no longer bought at the price of sending every visitor's
     coordinates to a third party on every page view. */
  function fetchPrayerTimes(){
    var lib = window.SHRSPrayerTimes;
    if(!lib){ renderPrayerTimes(null); return; }
    var custom = prefs.islamicCoords;
    var coords = custom || SCHOOL_COORDS;
    var now = new Date();
    /* The offset that applies AT THOSE COORDINATES. For the school that
       is Africa/Lagos, read from the platform's own tz database rather
       than hard-coded as +1; for a reader who has set their own place,
       their own clock is the right one to use. */
    var tz = custom ? undefined : lib.zoneOffset('Africa/Lagos', now);
    try {
      renderPrayerTimes(lib.timingsFor(now, coords.lat, coords.lng, { tzOffset: tz }));
    } catch(err) {
      renderPrayerTimes(null);
    }
  }

  /* Re-derived on a slow tick so the countdown stays live, the strip
     rolls on to the next prayer as each one passes, and the whole set
     turns over at midnight without a reload. It is pure arithmetic —
     no request, nothing to fail — so it can simply be redone rather
     than cached and invalidated. */
  window.setInterval(fetchPrayerTimes, 30000);

  // Live clock + prayer-countdown ticker for the topbar strip. The
  // countdown re-derives from the last-fetched timings (no re-fetch
  // needed every second — Aladhan's timings don't change intra-day).
  function renderClock(){
    var els = document.querySelectorAll('[data-pc-strip-clock]');
    if(!els.length) return;
    var now = new Date();
    var timeStr = now.toLocaleTimeString(STRIP_LANG === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: prefs.timeFormat === '12h' });
    els.forEach(function(s){ s.textContent = timeStr; });
  }
  renderClock();

  // "Today's Adhkar" quick-access link — shows Morning or Evening
  // depending on the visitor's local clock (a UI heuristic for which
  // litany to surface first, not a fiqh ruling on exact timing), and
  // links straight to that section of the Adhkar Centre.
  var sunIcon = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" class="pc-strip-icon"><circle cx="12" cy="15" r="5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 3v3M4.5 8l1.8 1.8M19.5 8l-1.8 1.8M2 20h20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var moonIcon = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" class="pc-strip-icon"><path d="M20 14.5A8 8 0 1110 3.2 6.5 6.5 0 0020 14.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  function renderAdhkarLink(){
    var els = document.querySelectorAll('[data-pc-adhkar-link]');
    if(!els.length) return;
    var isMorning = new Date().getHours() < 12;
    var label = STRIP_LANG === 'ar'
      ? (isMorning ? 'أذكار الصباح' : 'أذكار المساء')
      : (isMorning ? 'Morning Adhkār' : 'Evening Adhkār');
    var icon = isMorning ? sunIcon : moonIcon;
    var period = isMorning ? 'morning' : 'evening';
    els.forEach(function(a){
      var base = a.getAttribute('href').split('#')[0];
      a.href = base + '#' + period;
      a.innerHTML = icon + '<span>' + label + '</span>';
    });
  }
  renderAdhkarLink();

  setInterval(function(){
    renderClock();
    if(lastPrayerTimings) renderPrayerTimes(lastPrayerTimings);
    renderAdhkarLink();
  }, 1000);

  function renderIslamicStrip(){
    var strip = document.querySelector('[data-pc-islamic-strip]');
    if(!strip) return;
    strip.classList.toggle('is-visible', !!(prefs.islamicPrayerTimes || prefs.islamicHijriCalendar));
  }

  var locateBtn = root.querySelector('[data-pc-locate]');
  if(locateBtn){
    locateBtn.addEventListener('click', function(){
      if(!navigator.geolocation){
        locateBtn.textContent = STRIP_LANG === 'ar' ? 'تحديد الموقع غير متاح في هذا المتصفح' : 'Location isn’t available in this browser';
        return;
      }
      var original = locateBtn.textContent;
      locateBtn.textContent = STRIP_LANG === 'ar' ? 'جارٍ تحديد الموقع…' : 'Locating…';
      navigator.geolocation.getCurrentPosition(function(pos){
        prefs.islamicCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        savePrefs(prefs);
        locateBtn.textContent = original;
        fetchPrayerTimes();
      }, function(){
        locateBtn.textContent = STRIP_LANG === 'ar' ? 'تعذّر تحديد الموقع — تم استخدام موقع المدرسة' : 'Couldn’t get your location — using the school’s location';
        setTimeout(function(){ locateBtn.textContent = original; }, 3000);
      }, { timeout: 8000 });
    });
  }

  // Real Hijri-month calendar grid — no fabricated events, only the two
  // states that are actually true for every visitor: today, and Friday.
  function daysInHijriMonth(year, month){
    var nextMonth = month === 12 ? 1 : month + 1;
    var nextYear = month === 12 ? year + 1 : year;
    return hijriToJD(nextYear, nextMonth, 1) - hijriToJD(year, month, 1);
  }
  function renderHijriCalendar(todayH){
    var container = root.querySelector('[data-pc-hijri-calendar]');
    if(!container || !todayH) return;
    var daysCount = daysInHijriMonth(todayH.year, todayH.month);
    var jdToday = todayJD();
    var firstDayJd = hijriToJD(todayH.year, todayH.month, 1);
    var firstDayWeekday = ((new Date().getDay() - (jdToday - firstDayJd)) % 7 + 7) % 7;

    var dowLabels = STRIP_LANG === 'ar' ? ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمعة', 'سبت'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    var html = '<div class="pc-hcal-dow">' + dowLabels.map(function(d){ return '<span>' + d + '</span>'; }).join('') + '</div>';
    html += '<div class="pc-hcal-grid">';
    for (var i = 0; i < firstDayWeekday; i++) html += '<span class="pc-hcal-cell is-empty"></span>';
    for (var day = 1; day <= daysCount; day++) {
      var weekday = (firstDayWeekday + (day - 1)) % 7;
      var cls = 'pc-hcal-cell' + (day === todayH.day ? ' is-today' : '') + (weekday === 5 ? ' is-friday' : '');
      html += '<span class="' + cls + '">' + day + '</span>';
    }
    html += '</div>';
    var names = STRIP_LANG === 'ar' ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
    var monthLabel = (names[todayH.month - 1] || '') + ' ' + todayH.year + 'H';
    container.innerHTML = '<div class="pc-hcal-month">' + monthLabel + '</div>' + html;
  }

  var todayHijri = renderHijriDate();
  if(todayHijri) renderIslamicEvent(todayHijri);
  if(todayHijri) renderHijriCalendar(todayHijri);
  fetchPrayerTimes();
  renderIslamicStrip();

  // ================================================================
  // Verse / Hadith of the Day — shared data, see js/reflections-data.js
  // for the source set and the reasoning against reproducing Qur'anic
  // Arabic script from memory. Shown in both language editions pending
  // review by the school's own Islamic scholars — see
  // docs/personalisation-centre.md.
  // ================================================================
  var REFL = window.SHRS_REFLECTIONS;
  function renderVerseHadith(){
    if (!REFL) return;
    var doy = REFL.dayOfYear();
    var verse = REFL.VERSES[doy % REFL.VERSES.length];
    var hadith = REFL.HADITH[doy % REFL.HADITH.length];
    var vTrans = root.querySelector('[data-pc-verse-translation]');
    var vRef = root.querySelector('[data-pc-verse-ref]');
    var hText = root.querySelector('[data-pc-hadith-text]');
    var hRef = root.querySelector('[data-pc-hadith-ref]');
    if(vTrans) vTrans.textContent = '“' + verse.en + '”';
    if(vRef) vRef.textContent = verse.ref;
    if(hText) hText.textContent = '“' + hadith.en + '”';
    if(hRef) hRef.textContent = hadith.ref;
  }
  renderVerseHadith();

  // Today's Adhkar widget — current period (by local clock) + progress
  // read from the same localStorage key the Adhkar Centre page writes to
  // (js/adhkar.js). Anonymous/local only; no account needed.
  function renderAdhkarWidget(){
    var periodEl = root.querySelector('[data-pc-adhkar-period]');
    if(!periodEl) return;
    var isMorning = new Date().getHours() < 12;
    var period = isMorning ? 'morning' : 'evening';
    var periodItems = (window.SHRS_ADHKAR && window.SHRS_ADHKAR[period]) ? window.SHRS_ADHKAR[period] : [];
    var total = periodItems.length || 9;
    var read = 0;
    try{
      var raw = localStorage.getItem('shrsAdhkarProgress');
      var data = raw ? JSON.parse(raw) : null;
      var today = new Date().toISOString().slice(0, 10);
      if(data && data.date === today && data.doneIds){
        read = periodItems.filter(function(it){ return data.doneIds.indexOf(it.id) !== -1; }).length;
      }
    }catch(e){ read = 0; }
    periodEl.textContent = isMorning
      ? (STRIP_LANG === 'ar' ? 'أذكار الصباح' : 'Morning Adhkār')
      : (STRIP_LANG === 'ar' ? 'أذكار المساء' : 'Evening Adhkār');
    var bar = root.querySelector('[data-pc-adhkar-progress-bar]');
    var pct = total ? Math.round((read / total) * 100) : 0;
    if(bar) bar.style.width = pct + '%';
    var progLabel = root.querySelector('[data-pc-adhkar-progress-label]');
    if(progLabel) progLabel.textContent = read + ' / ' + total + (STRIP_LANG === 'ar' ? ' تمّت قراءتها اليوم' : ' read today');
    var link = root.querySelector('[data-pc-adhkar-continue]');
    if(link){
      var base = link.getAttribute('href').split('#')[0];
      link.href = base + '#' + period;
    }
  }
  renderAdhkarWidget();

  // --- Friday (Jumu'ah) reminder — real, needs no push infra: just
  // checks the visitor's local day of week. ---
  function renderJumuahReminder(){
    var row = root.querySelector('[data-pc-jumuah-row]');
    var textEl = root.querySelector('[data-pc-jumuah-text]');
    if(!row || !textEl) return;
    if(!prefs.islamicEvents || new Date().getDay() !== 5){ row.hidden = true; return; }
    textEl.textContent = STRIP_LANG === 'ar'
      ? 'اليوم الجمعة — لا تنسَ صلاة الجمعة وسورة الكهف.'
      : "It's Jumu'ah — don't forget Friday prayer and Surah Al-Kahf.";
    row.hidden = false;
  }
  renderJumuahReminder();

  // ================================================================
  // Notifications tab — signed-in guardians only.
  // ================================================================
  var NOTIF_TYPE_LABELS = STRIP_LANG === 'ar'
    ? { type_attendance: 'الحضور', type_results: 'النتائج الدراسية', type_fees: 'الرسوم', type_announcements: 'إعلانات المدرسة', type_events: 'الفعاليات', type_emergency: 'التنبيهات الطارئة' }
    : { type_attendance: 'Attendance', type_results: 'Academic Results', type_fees: 'Tuition & Fees', type_announcements: 'School Announcements', type_events: 'Events', type_emergency: 'Emergency Alerts' };
  var CHANNEL_LABELS = STRIP_LANG === 'ar'
    ? { channel_website: 'الموقع الإلكتروني', channel_email: 'البريد الإلكتروني', channel_whatsapp: 'واتساب', channel_sms: 'رسائل نصية' }
    : { channel_website: 'Website', channel_email: 'Email', channel_whatsapp: 'WhatsApp', channel_sms: 'SMS' };
  var SIGN_IN_NOTICE = STRIP_LANG === 'ar'
    ? '<p class="pc-notice">سجّل الدخول إلى بوابة أولياء الأمور لإدارة تفضيلات الإشعارات. <a href="/portal/login/">تسجيل الدخول →</a></p>'
    : '<p class="pc-notice">Sign in to the Parent Portal to manage notification preferences. <a href="/portal/login/">Sign in →</a></p>';

  var notificationsLoaded = false;
  function loadNotificationsTabIfNeeded(){
    if(notificationsLoaded) return;
    var body = root.querySelector('[data-pc-notifications-body]');
    if(!body) return;
    notificationsLoaded = true;
    fetch('/api/portal/notifications/preferences', { credentials: 'same-origin' })
      .then(function(res){
        if(res.status === 401){ body.innerHTML = SIGN_IN_NOTICE; return null; }
        if(!res.ok) throw new Error('bad status');
        return res.json();
      })
      .then(function(data){
        if(!data) return;
        renderNotificationsForm(body, data.preferences || {});
      })
      .catch(function(){
        body.innerHTML = '<p class="pc-notice">' + (STRIP_LANG === 'ar' ? 'تعذّر تحميل التفضيلات الآن.' : 'Could not load preferences right now.') + '</p>';
      });
  }

  // Push is a real per-device browser subscription (Push API), not just
  // a stored boolean like the other three "coming soon" channels — so
  // its toggle drives an actual permission request + pushManager
  // subscribe/unsubscribe + backend round-trip, rendered separately
  // from the generic channel switches below and skipped entirely on
  // browsers/deployments where it can't work (no Push API support, or
  // the school hasn't generated VAPID keys yet — see
  // scripts/generate-vapid-keys.js).
  function urlBase64ToUint8Array(base64url){
    var raw = atob(base64url.replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for(var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function pushSupported(){
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function renderPushRow(container, initiallyOn, state){
    var liveBadge = STRIP_LANG === 'ar' ? 'مُفعّل' : 'Live';
    var label = STRIP_LANG === 'ar' ? 'إشعارات الدفع (على هذا الجهاز)' : 'Push Notifications (this device)';
    var row = document.createElement('div');
    row.className = 'pc-toggle-row';
    row.innerHTML = '<div><span class="pc-option-title">' + label + '</span> <span class="pc-badge">' + liveBadge + '</span></div>' +
      '<button type="button" class="pc-switch' + (initiallyOn ? ' is-on' : '') + '" data-push-switch role="switch" aria-checked="' + initiallyOn + '"><span class="pc-switch-knob"></span></button>';
    container.appendChild(row);
    var statusEl = document.createElement('p');
    statusEl.className = 'pc-form-status';
    statusEl.hidden = true;
    statusEl.setAttribute('data-push-status', '');
    container.appendChild(statusEl);

    var sw = row.querySelector('[data-push-switch]');
    function setStatus(msg, isError){
      statusEl.hidden = false;
      statusEl.className = 'pc-form-status ' + (isError ? 'is-error' : 'is-success');
      statusEl.textContent = msg;
    }
    sw.addEventListener('click', function(){
      var turningOn = !sw.classList.contains('is-on');
      sw.disabled = true;
      (turningOn ? subscribeToPush() : unsubscribeFromPush())
        .then(function(){
          sw.classList.toggle('is-on');
          sw.setAttribute('aria-checked', sw.classList.contains('is-on'));
          state.channel_push = sw.classList.contains('is-on');
          setStatus(
            sw.classList.contains('is-on')
              ? (STRIP_LANG === 'ar' ? 'تم تفعيل الإشعارات على هذا الجهاز.' : 'Push notifications enabled on this device.')
              : (STRIP_LANG === 'ar' ? 'تم إيقاف الإشعارات على هذا الجهاز.' : 'Push notifications turned off on this device.'),
            false
          );
        })
        .catch(function(err){
          setStatus(err && err.message ? err.message : (STRIP_LANG === 'ar' ? 'تعذّر تنفيذ الإجراء.' : 'Could not complete that action.'), true);
        })
        .then(function(){ sw.disabled = false; });
    });
  }

  function subscribeToPush(){
    return fetch('/api/portal/push-public-key').then(function(res){ return res.json(); })
      .then(function(data){
        if(!data.publicKey) throw new Error(STRIP_LANG === 'ar' ? 'إشعارات الدفع غير مُهيّأة بعد على هذا الموقع.' : 'Push notifications are not configured on this site yet.');
        if(Notification.permission === 'denied') throw new Error(STRIP_LANG === 'ar' ? 'تم حظر إذن الإشعارات في المتصفح.' : 'Notification permission is blocked in your browser settings.');
        return navigator.serviceWorker.ready.then(function(reg){
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.publicKey) });
        });
      })
      .then(function(subscription){
        return fetch('/api/portal/push-subscribe', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        }).then(function(res){ if(!res.ok) throw new Error(); });
      });
  }

  function unsubscribeFromPush(){
    return navigator.serviceWorker.ready
      .then(function(reg){ return reg.pushManager.getSubscription(); })
      .then(function(subscription){
        if(!subscription) return null;
        var endpoint = subscription.endpoint;
        return subscription.unsubscribe().then(function(){
          return fetch('/api/portal/push-subscribe', {
            method: 'DELETE', credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint: endpoint }),
          });
        });
      });
  }

  function renderNotificationsForm(body, p){
    var liveBadge = STRIP_LANG === 'ar' ? 'مُفعّل' : 'Live';
    var soonBadge = STRIP_LANG === 'ar' ? 'قريبًا' : 'Coming soon';
    var channelsHtml = ['channel_website', 'channel_email', 'channel_whatsapp', 'channel_sms'].map(function(key){
      var isWebsite = key === 'channel_website';
      var checked = isWebsite ? true : !!p[key];
      return '<div class="pc-toggle-row"><div><span class="pc-option-title">' + CHANNEL_LABELS[key] + '</span> <span class="pc-badge">' + (isWebsite ? liveBadge : soonBadge) + '</span></div>' +
        '<button type="button" class="pc-switch' + (checked ? ' is-on' : '') + '" data-notif-field="' + key + '" role="switch" aria-checked="' + checked + '"' + (isWebsite ? ' disabled title="Always on — this is what powers your in-portal notification bell"' : '') + '><span class="pc-switch-knob"></span></button></div>';
    }).join('');
    var typesHtml = Object.keys(NOTIF_TYPE_LABELS).map(function(key){
      var checked = p[key] !== false;
      return '<div class="pc-toggle-row"><div><span class="pc-option-title">' + NOTIF_TYPE_LABELS[key] + '</span></div>' +
        '<button type="button" class="pc-switch' + (checked ? ' is-on' : '') + '" data-notif-field="' + key + '" role="switch" aria-checked="' + checked + '"><span class="pc-switch-knob"></span></button></div>';
    }).join('');
    var saveLabel = STRIP_LANG === 'ar' ? 'حفظ التفضيلات' : 'Save Preferences';

    body.innerHTML =
      '<h4 class="pc-option-title" style="display:block;margin-bottom:6px;">' + (STRIP_LANG === 'ar' ? 'قنوات التواصل' : 'Delivery Channels') + '</h4>' + channelsHtml +
      '<div data-push-row-container></div>' +
      '<h4 class="pc-option-title" style="display:block;margin:18px 0 6px;">' + (STRIP_LANG === 'ar' ? 'أنواع الإشعارات' : 'Notification Types') + '</h4>' + typesHtml +
      '<button type="button" class="btn btn-gold" data-notif-save style="margin-top:16px;">' + saveLabel + '</button>' +
      '<p class="pc-form-status" data-notif-status hidden></p>';

    var state = Object.assign({}, p);

    if(pushSupported()){
      navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); })
        .then(function(subscription){
          renderPushRow(body.querySelector('[data-push-row-container]'), !!subscription, state);
        })
        .catch(function(){});
    }

    body.querySelectorAll('[data-notif-field]').forEach(function(sw){
      if(sw.disabled) return;
      sw.addEventListener('click', function(){
        var key = sw.getAttribute('data-notif-field');
        state[key] = !sw.classList.contains('is-on');
        sw.classList.toggle('is-on');
        sw.setAttribute('aria-checked', sw.classList.contains('is-on'));
      });
    });
    body.querySelector('[data-notif-save]').addEventListener('click', function(){
      var statusEl = body.querySelector('[data-notif-status]');
      var payload = Object.assign({}, state, { channel_website: true, language: STRIP_LANG });
      fetch('/api/portal/notifications/preferences', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function(res){ return res.json().then(function(d){ return { ok: res.ok, d: d }; }); })
        .then(function(r){
          statusEl.hidden = false;
          statusEl.className = 'pc-form-status ' + (r.ok ? 'is-success' : 'is-error');
          statusEl.textContent = r.ok ? (STRIP_LANG === 'ar' ? 'تم الحفظ.' : 'Saved.') : (r.d && r.d.error) || 'Error';
        }).catch(function(){
          statusEl.hidden = false; statusEl.className = 'pc-form-status is-error';
          statusEl.textContent = STRIP_LANG === 'ar' ? 'تعذّر الحفظ الآن.' : 'Could not save right now.';
        });
    });
  }

  // ================================================================
  // Security & Privacy tab — change password (signed-in) + privacy
  // request form (always available, public).
  // ================================================================
  var securityLoaded = false;
  function loadSecurityTabIfNeeded(){
    if(securityLoaded) return;
    var body = root.querySelector('[data-pc-security-body]');
    if(!body) return;
    securityLoaded = true;
    fetch('/api/portal/me', { credentials: 'same-origin' })
      .then(function(res){ return res.status === 200 ? res.json() : null; })
      .then(function(data){
        if(!data){
          body.innerHTML = SIGN_IN_NOTICE;
          return;
        }
        renderChangePasswordForm(body);
      })
      .catch(function(){ body.innerHTML = SIGN_IN_NOTICE; });
  }

  function renderChangePasswordForm(body){
    var t = STRIP_LANG === 'ar'
      ? { title: 'تغيير كلمة المرور', current: 'كلمة المرور الحالية', next: 'كلمة المرور الجديدة (10 أحرف على الأقل)', submit: 'تحديث كلمة المرور',
          dlTitle: 'تنزيل بياناتي', dlDesc: 'نسخة من بياناتك وبيانات أبنائك المسجّلة لدينا، بصيغة JSON قابلة للقراءة.', dlBtn: 'تنزيل البيانات (JSON)' }
      : { title: 'Change Password', current: 'Current password', next: 'New password (10+ characters)', submit: 'Update Password',
          dlTitle: 'Download My Data', dlDesc: 'A copy of your and your children\'s records held with us, as readable JSON.', dlBtn: 'Download Data (JSON)' };
    body.innerHTML =
      '<div class="pc-card"><div class="pc-card-head"><span class="pc-option-title">' + t.title + '</span></div>' +
      '<form class="pc-form" data-pc-password-form>' +
      '<input type="password" name="currentPassword" placeholder="' + t.current + '" autocomplete="current-password" required />' +
      '<input type="password" name="newPassword" placeholder="' + t.next + '" autocomplete="new-password" required minlength="10" data-password-strength />' +
      '<button type="submit" class="btn btn-gold">' + t.submit + '</button>' +
      '<p class="pc-form-status" data-pc-password-status hidden></p>' +
      '</form></div>' +
      '<div class="pc-card"><div class="pc-card-head"><span class="pc-option-title">' + t.dlTitle + '</span></div>' +
      '<p class="pc-option-desc">' + t.dlDesc + '</p>' +
      '<button type="button" class="btn btn-outline" data-pc-export-btn style="margin-top:10px;">' + t.dlBtn + '</button></div>';

    var exportBtn = body.querySelector('[data-pc-export-btn]');
    exportBtn.addEventListener('click', function(){
      var original = exportBtn.textContent;
      exportBtn.textContent = STRIP_LANG === 'ar' ? 'جارٍ التحضير…' : 'Preparing…';
      fetch('/api/portal/export-data', { credentials: 'same-origin' })
        .then(function(res){ return res.json(); })
        .then(function(data){
          var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = 'shrs-my-data.json';
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
          exportBtn.textContent = original;
        })
        .catch(function(){ exportBtn.textContent = original; });
    });

    body.querySelector('[data-pc-password-form]').addEventListener('submit', function(e){
      e.preventDefault();
      var form = e.target;
      var statusEl = form.querySelector('[data-pc-password-status]');
      var fd = new FormData(form);
      fetch('/api/portal/change-password', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') }),
      }).then(function(res){ return res.json().then(function(d){ return { ok: res.ok, d: d }; }); })
        .then(function(r){
          statusEl.hidden = false;
          statusEl.className = 'pc-form-status ' + (r.ok ? 'is-success' : 'is-error');
          statusEl.textContent = r.ok ? (STRIP_LANG === 'ar' ? 'تم تحديث كلمة المرور.' : 'Password updated.') : ((r.d && r.d.error) || 'Error');
          if(r.ok) form.reset();
        }).catch(function(){
          statusEl.hidden = false; statusEl.className = 'pc-form-status is-error';
          statusEl.textContent = STRIP_LANG === 'ar' ? 'تعذّر التحديث الآن.' : 'Could not update right now.';
        });
    });
  }

  var privacyForm = root.querySelector('[data-pc-privacy-form]');
  if(privacyForm){
    privacyForm.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(privacyForm);
      var statusEl = privacyForm.querySelector('[data-pc-privacy-status]');
      fetch('/api/portal/privacy-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fullName: fd.get('fullName'), email: fd.get('email'),
          requestType: fd.get('requestType'), details: fd.get('details'),
        }),
      }).then(function(res){ return res.json().then(function(d){ return { ok: res.ok, d: d }; }); })
        .then(function(r){
          statusEl.hidden = false;
          statusEl.className = 'pc-form-status ' + (r.ok ? 'is-success' : 'is-error');
          statusEl.textContent = r.ok
            ? (STRIP_LANG === 'ar' ? 'تم إرسال طلبك — سيتواصل معك أحد أفراد الطاقم قريبًا.' : 'Your request has been sent — a staff member will follow up shortly.')
            : ((r.d && r.d.error) || 'Error');
          if(r.ok) privacyForm.reset();
        }).catch(function(){
          statusEl.hidden = false; statusEl.className = 'pc-form-status is-error';
          statusEl.textContent = STRIP_LANG === 'ar' ? 'تعذّر الإرسال الآن.' : 'Could not send right now.';
        });
    });
  }

  // ================================================================
  // Dashboard — Favourite School + Recently Viewed. Recently Viewed is
  // automatic (no bookmark button needed on every page): every page
  // records itself to a small localStorage history on load. Device-local
  // only, same as every other preference here — not synced across
  // devices, which is an honest limitation, not a bug.
  // ================================================================
  var RECENT_KEY = 'shrsRecentlyViewed';
  var MAX_RECENT = 8;
  (function recordVisit(){
    try{
      var raw = window.localStorage.getItem(RECENT_KEY);
      var list = raw ? JSON.parse(raw) : [];
      var url = location.pathname;
      list = list.filter(function(item){ return item.url !== url; });
      list.unshift({ url: url, title: document.title.split(' — ')[0], visitedAt: Date.now() });
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
    }catch(err){ /* storage unavailable — dashboard just shows nothing */ }
  })();

  function renderRecentList(){
    var container = root.querySelector('[data-pc-recent-list]');
    if(!container) return;
    var list = [];
    try{ list = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]'); }catch(err){}
    list = list.filter(function(item){ return item.url !== location.pathname; }); // don't list the current page
    if(!list.length){
      container.innerHTML = '<p class="pc-notice">' + (STRIP_LANG === 'ar' ? 'ستظهر هنا الصفحات التي تزورها.' : 'Pages you visit will appear here.') + '</p>';
      return;
    }
    container.innerHTML = '<div class="pc-lang-list">' + list.map(function(item){
      return '<a class="pc-lang-row" href="' + item.url + '"><span class="pc-lang-name" style="font-size:0.92rem;">' + item.title + '</span></a>';
    }).join('') + '</div>';
  }
  renderRecentList();

  var FAVOURITE_SCHOOL_URLS = {
    en: { 'nursery-primary': '/academics/nursery-primary/', 'royal-college': '/academics/royal-college/', 'quran-college': '/academics/quran-college/', 'arabic-islamic-studies': '/academics/arabic-islamic-studies/' },
    ar: { 'nursery-primary': '/ar/academics/nursery-primary/', 'royal-college': '/ar/academics/royal-college/', 'quran-college': '/ar/academics/quran-college/', 'arabic-islamic-studies': '/ar/academics/arabic-islamic-studies/' },
  };
  function renderFavouriteLink(){
    var link = root.querySelector('[data-pc-favourite-link]');
    if(!link || !prefs.favouriteSchool) return;
    var url = FAVOURITE_SCHOOL_URLS[STRIP_LANG][prefs.favouriteSchool];
    if(!url) return;
    link.href = url; link.hidden = false;
  }
  renderFavouriteLink();

  // ================================================================
  // Quick Access — default landing page redirect. The actual instant,
  // no-flash redirect runs from the inline blocking script in
  // partials/head.html (before first paint); this is just a fallback
  // for the rare case that script didn't run (e.g. cached HTML from
  // before this feature shipped).
  // ================================================================
  (function landingPageFallback(){
    if(prefs.landingPage === 'home') return;
    var path = location.pathname;
    var isHome = path === '/' || path === '/ar/';
    if(!isHome) return;
    var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    var targets = {
      en: { portal: '/portal/login/', admissions: '/admission/', quran: '/academics/quran-college/' },
      ar: { portal: '/portal/login/', admissions: '/ar/admission/', quran: '/ar/academics/quran-college/' },
    };
    var target = targets[lang][prefs.landingPage];
    if(target) location.replace(target);
  })();
})();
