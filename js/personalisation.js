(function(){
  var PREFS_KEY = 'shrsPersonalisation';
  var STRIP_LANG = document.documentElement.lang === 'ar' ? 'ar' : 'en';

  var DEFAULTS = {
    textSize: 'medium',
    theme: 'royal',
    accent: 'royal-gold',
    readingMode: 'standard',
    textDensity: 'comfortable',
    motion: 'standard',
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
  function savePrefs(prefs){
    try{ window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }catch(err){ /* storage unavailable — preferences just won't persist */ }
    document.dispatchEvent(new CustomEvent('sultan:personalisation-changed', { detail: prefs }));
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
    html.setAttribute('data-pc-text', prefs.textSize);
    html.setAttribute('data-pc-motion', prefs.motion);
    html.setAttribute('data-pc-accent', prefs.accent);
    html.setAttribute('data-pc-reading', prefs.readingMode);
    html.setAttribute('data-pc-text-density', prefs.textDensity);
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

  function openDrawer(){
    overlay.hidden = false; drawer.hidden = false;
    requestAnimationFrame(function(){ overlay.classList.add('is-visible'); drawer.classList.add('is-open'); });
    document.body.classList.add('pc-lock');
    loadNotificationsTabIfNeeded();
    loadSecurityTabIfNeeded();
  }
  function closeDrawer(){
    overlay.classList.remove('is-visible'); drawer.classList.remove('is-open');
    document.body.classList.remove('pc-lock');
    setTimeout(function(){ overlay.hidden = true; drawer.hidden = true; }, 350);
  }
  triggers.forEach(function(btn){ btn.addEventListener('click', openDrawer); });
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
    stripEl.forEach(function(s){ s.textContent = prefs.islamicHijriCalendar ? '🌙 ' + text : ''; });
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

  function renderPrayerTimes(timings){
    var el = root.querySelector('[data-pc-next-prayer]');
    var stripEls = document.querySelectorAll('[data-pc-strip-prayer]');
    if(!timings){
      if(el) el.textContent = STRIP_LANG === 'ar' ? 'غير متاح حاليًا' : 'Not available right now';
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
    var text = label + ' · ' + timeStr;
    if(el) el.textContent = text;
    stripEls.forEach(function(s){ s.textContent = prefs.islamicPrayerTimes ? '🕌 ' + text : ''; });
  }

  function fetchPrayerTimes(){
    var coords = prefs.islamicCoords || SCHOOL_COORDS;
    var url = 'https://api.aladhan.com/v1/timings/' + Math.floor(Date.now() / 1000)
      + '?latitude=' + coords.lat + '&longitude=' + coords.lng + '&method=3';
    fetch(url).then(function(res){
      if(!res.ok) throw new Error('bad status');
      return res.json();
    }).then(function(data){
      renderPrayerTimes(data && data.data && data.data.timings);
    }).catch(function(){
      renderPrayerTimes(null);
    });
  }

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

  var todayHijri = renderHijriDate();
  if(todayHijri) renderIslamicEvent(todayHijri);
  fetchPrayerTimes();
  renderIslamicStrip();

  // ================================================================
  // Verse / Hadith of the Day — a small, deliberately conservative set:
  // only extremely well-established, agreed-upon (Bukhari & Muslim)
  // hadith and widely-known verses, English translation + citation only
  // (no attempt to reproduce Qur'anic Arabic script from memory — the
  // risk of a transcription error in sacred text outweighs the value of
  // showing it here; families can verify against any Mushaf using the
  // citation given). Shown in both language editions pending review by
  // the school's own Islamic scholars — see docs/personalisation-centre.md.
  // ================================================================
  var VERSES = [
    { en: 'Allah does not burden a soul beyond that it can bear.', ref: "Qur'an 2:286" },
    { en: 'And whoever fears Allah, He will make a way out for him, and will provide for him from where he does not expect.', ref: "Qur'an 65:2-3" },
    { en: 'So, verily, with hardship, there is relief. Verily, with hardship, there is relief.', ref: "Qur'an 94:5-6" },
    { en: 'O you who believe, seek help through patience and prayer. Indeed, Allah is with the patient.', ref: "Qur'an 2:153" },
    { en: 'My Lord, increase me in knowledge.', ref: "Qur'an 20:114" },
    { en: 'Verily, in the remembrance of Allah do hearts find rest.', ref: "Qur'an 13:28" },
  ];
  var HADITH = [
    { en: 'Actions are judged by intentions, and every person will get the reward according to what he has intended.', ref: 'Sahih al-Bukhari & Sahih Muslim' },
    { en: 'None of you truly believes until he loves for his brother what he loves for himself.', ref: 'Sahih al-Bukhari & Sahih Muslim' },
    { en: 'Whoever believes in Allah and the Last Day should speak good or remain silent.', ref: 'Sahih al-Bukhari & Sahih Muslim' },
    { en: 'The best among you are those who have the best manners and character.', ref: 'Sahih al-Bukhari' },
    { en: 'A good word is charity.', ref: 'Sahih al-Bukhari & Sahih Muslim' },
  ];
  function dayOfYear(){
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }
  function renderVerseHadith(){
    var doy = dayOfYear();
    var verse = VERSES[doy % VERSES.length];
    var hadith = HADITH[doy % HADITH.length];
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
      '<h4 class="pc-option-title" style="display:block;margin:18px 0 6px;">' + (STRIP_LANG === 'ar' ? 'أنواع الإشعارات' : 'Notification Types') + '</h4>' + typesHtml +
      '<button type="button" class="btn btn-gold" data-notif-save style="margin-top:16px;">' + saveLabel + '</button>' +
      '<p class="pc-form-status" data-notif-status hidden></p>';

    var state = Object.assign({}, p);
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
      '<input type="password" name="currentPassword" placeholder="' + t.current + '" required />' +
      '<input type="password" name="newPassword" placeholder="' + t.next + '" required minlength="10" />' +
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
