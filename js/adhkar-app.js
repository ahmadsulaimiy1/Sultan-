// Adhkar Centre application — renders js/adhkar-data.js into the page
// shell in pages/adhkar.html/.ar.html: priority panel, quick time-boxed
// modes, category browser, search, the Smart Tasbih Counter (prescribed-
// count stopping, sound/vibration, six real visual themes), Arabic TTS
// via the browser's built-in speech engine, a live session dashboard,
// favourites, and a small local achievement/streak system for anonymous
// visitors. No account needed — everything here is localStorage-only;
// the separate, server-backed Family Adhkar tracking lives in the
// Parent Portal (js/portal-dashboard.js).
(function () {
  var root = document.querySelector('[data-adk-app]');
  if (!root || !window.SHRS_ADHKAR) return;

  var DATA = window.SHRS_ADHKAR;
  var LANG = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  var RTL = document.documentElement.dir === 'rtl';

  var STORAGE_KEY = 'shrsAdhkarProgress';
  var FAV_KEY = 'shrsAdhkarFavourites';
  var SETTINGS_KEY = 'shrsAdhkarSettings';

  var T = {
    en: {
      priorityHead: 'Priority Adhkār', dailyEssentials: 'Daily Essentials', dailyEssentialsSub: "Today's core litany",
      greatestProtection: 'Greatest Protection', greatestProtectionSub: 'Qur’an & Sunnah protection texts',
      mostRewarding: 'Most Rewarding', mostRewardingSub: 'Istighfār — turning back to Allah',
      mostRecommended: 'Most Recommended', mostRecommendedSub: 'Ṣalawāt upon the Prophet ﷺ',
      items: 'items', min: 'min',
      quick2: '2-Minute', quick5: '5-Minute', quick10: '10-Minute', quickFull: 'Complete',
      essentials: 'Essentials', session: 'Session',
      searchPlaceholder: 'Search adhkār by name or meaning…',
      favourites: 'Favourites', noFavourites: 'No favourites yet — tap the ♡ on any adhkār to save it here.',
      noResults: 'No adhkār match your search.',
      sessionCompleted: 'Completed', sessionRemaining: 'Remaining', sessionPercent: 'Progress',
      sessionTimeLeft: 'Time Remaining', sessionClose: 'Close',
      recite: 'Recite', of: 'of', tapToCount: 'Tap or swipe to count', recited: 'Recited', target: 'target',
      completeBadge: 'Recited ✓ — prescribed count reached',
      prev: 'Previous', next: 'Next', reset: 'Reset count',
      sound: 'Sound', vibration: 'Vibration', theme: 'Theme', voice: 'Voice',
      play: 'Play', pause: 'Pause', loop: 'Loop', autoAdvance: 'Auto-Advance', autoCount: 'Auto-Count with Voice',
      speed: 'Speed', noVoice: 'Your device doesn’t offer an Arabic voice yet — the text above still works for reading along.',
      themeRoyal: 'Royal Coffee & Gold', themeMadinah: 'Madinah Marble', themeMakkah: 'Makkah Black & Gold',
      themeEmerald: 'Emerald Islamic', themeDesert: 'Desert Parchment', themeExecutive: 'Contemporary Executive',
      close: 'Close', settings: 'Settings',
      streakLabel: 'day streak', noStreak: 'Start today', achievements: 'Achievements',
      achv3: '3-Day Consistency', achv7: '7-Day Consistency', achv30: '30-Day Consistency', achvFirst: 'First Completion',
      estReading: 'Est. reading time',
      recentlyViewed: 'Recently Viewed',
    },
    ar: {
      priorityHead: 'الأذكار ذات الأولوية', dailyEssentials: 'أذكار اليوم', dailyEssentialsSub: 'الورد الأساسي لليوم',
      greatestProtection: 'أعظم الحماية', greatestProtectionSub: 'نصوص الحماية من القرآن والسنة',
      mostRewarding: 'الأعظم أجراً', mostRewardingSub: 'الاستغفار — الرجوع إلى الله',
      mostRecommended: 'الأكثر استحباباً', mostRecommendedSub: 'الصلاة على النبي ﷺ',
      items: 'ذكراً', min: 'د',
      quick2: 'دقيقتان', quick5: '٥ دقائق', quick10: '١٠ دقائق', quickFull: 'كامل',
      essentials: 'أساسي', session: 'جلسة',
      searchPlaceholder: 'ابحث عن ذكر بالاسم أو المعنى…',
      favourites: 'المفضلة', noFavourites: 'لا توجد مفضلة بعد — اضغط ♡ على أي ذكر لحفظه هنا.',
      noResults: 'لا توجد أذكار مطابقة لبحثك.',
      sessionCompleted: 'أُنجز', sessionRemaining: 'متبقٍ', sessionPercent: 'التقدم',
      sessionTimeLeft: 'الوقت المتبقي', sessionClose: 'إغلاق',
      recite: 'اذكر', of: 'من', tapToCount: 'اضغط أو اسحب للعدّ', recited: 'قراءة', target: 'العدد المطلوب',
      completeBadge: 'تمّت القراءة ✓ — بلغ العدد المطلوب',
      prev: 'السابق', next: 'التالي', reset: 'إعادة العدّ',
      sound: 'الصوت', vibration: 'الاهتزاز', theme: 'المظهر', voice: 'الصوت المسموع',
      play: 'تشغيل', pause: 'إيقاف', loop: 'تكرار', autoAdvance: 'انتقال تلقائي', autoCount: 'عدّ تلقائي مع الصوت',
      speed: 'السرعة', noVoice: 'جهازك لا يوفر صوتاً عربياً حالياً — النص أعلاه لا يزال متاحاً للقراءة.',
      themeRoyal: 'ملكي بنّي وذهبي', themeMadinah: 'رخام المدينة', themeMakkah: 'مكة أسود وذهبي',
      themeEmerald: 'زمردي إسلامي', themeDesert: 'صحراوي', themeExecutive: 'تنفيذي معاصر',
      close: 'إغلاق', settings: 'الإعدادات',
      streakLabel: 'يوماً متتالياً', noStreak: 'ابدأ اليوم', achievements: 'الإنجازات',
      achv3: 'انتظام ٣ أيام', achv7: 'انتظام ٧ أيام', achv30: 'انتظام ٣٠ يوماً', achvFirst: 'أول إنجاز',
      estReading: 'وقت القراءة المقدّر',
      recentlyViewed: 'شوهد مؤخراً',
    },
  }[LANG];

  var ICONS = {
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 3v3M4.5 8l1.8 1.8M19.5 8l-1.8 1.8M2 20h20" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1110 3.2 6.5 6.5 0 0020 14.5z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    'moon-stars': '<svg viewBox="0 0 24 24"><path d="M17 13.8A6.6 6.6 0 019.2 6a6.6 6.6 0 108.9 12.9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M19 3l.6 1.6L21 5l-1.4.6L19 7l-.6-1.4L17 5l1.4-.4z" fill="currentColor"/></svg>',
    sunrise: '<svg viewBox="0 0 24 24"><path d="M4 18h16M6 18a6 6 0 0112 0M12 8V4M6 9l1.5 1.5M18 9l-1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-9z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    mosque: '<svg viewBox="0 0 24 24"><path d="M4 21v-6a8 8 0 1116 0v6M4 21h16M9 21v-4a3 3 0 016 0v4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="4" r="1" fill="currentColor"/></svg>',
    prayer: '<svg viewBox="0 0 24 24"><path d="M12 3v18M7 21h10M5 7h14M5 7L2 13a3 3 0 006 0L5 7zm14 0l-3 6a3 3 0 006 0l-3-6z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    travel: '<svg viewBox="0 0 24 24"><path d="M3 13l7-2 4-7 2 1-2 6.5 6.5-1.5 1 2-7 3.5-2 6-2-1 1-4.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9.5-8.8C1 8 2.5 5 5.8 5c2 0 3.3 1.1 4.2 2.4C11 6.1 12.3 5 14.3 5c3.3 0 4.8 3 3.3 6.2C15 15.6 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    hands: '<svg viewBox="0 0 24 24"><path d="M6 12V6a2 2 0 014 0v5M10 11V4a2 2 0 014 0v7M14 11V5a2 2 0 014 0v8c0 4-2.5 7-6 7s-6-2-7-5l-1.5-3a1.6 1.6 0 012.6-1.8L8 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.4-.6z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    fav: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9.5-8.8C1 8 2.5 5 5.8 5c2 0 3.3 1.1 4.2 2.4C11 6.1 12.3 5 14.3 5c3.3 0 4.8 3 3.3 6.2C15 15.6 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    speaker: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M17 8.5a5 5 0 010 7" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    vibrate: '<svg viewBox="0 0 24 24"><rect x="8" y="4" width="8" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3 9v6M21 9v6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M20 20l-4.3-4.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7V5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>',
    medal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M9 3l3 5 3-5M9 3l1.5 4.5M15 3l-1.5 4.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  };

  var THEME_LIST = [
    { id: 'royal', color: '#C6A15B', labelKey: 'themeRoyal' },
    { id: 'madinah', color: '#3F6B4E', labelKey: 'themeMadinah' },
    { id: 'makkah', color: '#D4AF37', labelKey: 'themeMakkah' },
    { id: 'emerald', color: '#6FC29A', labelKey: 'themeEmerald' },
    { id: 'desert', color: '#8B6A2E', labelKey: 'themeDesert' },
    { id: 'executive', color: '#B9BEC7', labelKey: 'themeExecutive' },
  ];

  // ---------- storage helpers ----------
  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function getProgress() {
    var data;
    try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { data = null; }
    var today = todayStr();
    if (!data || data.date !== today) {
      var completedDates = (data && data.completedDates) || [];
      data = { date: today, doneIds: [], counts: {}, completedDates: completedDates };
    }
    if (!data.completedDates) data.completedDates = [];
    return data;
  }
  function saveProgress(p) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) {} }

  function getFavourites() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveFavourites(list) { try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {} }
  function toggleFavourite(id) {
    var list = getFavourites();
    var i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
    saveFavourites(list);
    return list.indexOf(id) !== -1;
  }

  function getSettings() {
    var d = { sound: true, vibration: true, theme: 'royal', ttsRate: 1, ttsVoiceURI: '', autoAdvance: false, autoCount: false, loop: false };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { return d; }
  }
  function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }
  var settings = getSettings();

  // ---------- time / formatting ----------
  function fmtMinutes(seconds) {
    var m = Math.max(1, Math.round(seconds / 60));
    return m + ' ' + T.min;
  }
  function isMorningNow() { return new Date().getHours() < 12; }
  function todaysPeriodId() { return isMorningNow() ? 'morning' : 'evening'; }

  // ---------- sound + vibration ----------
  var audioCtx = null;
  function beep(freq, dur) {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) { /* Web Audio unavailable — silently skip */ }
  }
  function tapSound() { beep(660, 0.09); }
  function completeSound() { beep(880, 0.14); setTimeout(function () { beep(1180, 0.18); }, 110); }
  function vibrate(pattern) {
    if (!settings.vibration || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) {}
  }

  // ---------- Web Speech (Arabic TTS) ----------
  var arabicVoices = [];
  function loadVoices() {
    if (!window.speechSynthesis) return;
    var all = window.speechSynthesis.getVoices();
    arabicVoices = all.filter(function (v) { return /^ar/i.test(v.lang); });
  }
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  var currentUtterance = null;
  function speak(text, onEnd) {
    if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    u.rate = settings.ttsRate || 1;
    var voice = arabicVoices.filter(function (v) { return v.voiceURI === settings.ttsVoiceURI; })[0] || arabicVoices[0];
    if (voice) u.voice = voice;
    u.onend = function () { if (onEnd) onEnd(); };
    currentUtterance = u;
    window.speechSynthesis.speak(u);
  }
  function stopSpeaking() { if (window.speechSynthesis) window.speechSynthesis.cancel(); }

  // ---------- session / counter state ----------
  var state = {
    session: null, // {items:[...], sourceLabel, budgetSeconds}
    sessionIndex: 0,
    counterItem: null,
    counterCount: 0,
    ttsPlaying: false,
  };

  function itemLabel(item) { return item.title[LANG] || item.title.en; }

  function buildQuickSession(budgetSeconds) {
    var period = todaysPeriodId();
    var pool = DATA.itemsByCategory(period);
    if (!budgetSeconds) return { items: pool, sourceLabel: T.dailyEssentials };
    var picked = [];
    var used = 0;
    for (var i = 0; i < pool.length; i++) {
      if (used + pool[i].seconds > budgetSeconds && picked.length > 0) continue;
      picked.push(pool[i]);
      used += pool[i].seconds;
      if (used >= budgetSeconds) break;
    }
    return { items: picked, sourceLabel: T.dailyEssentials };
  }

  function startSession(items, label) {
    state.session = { items: items, sourceLabel: label };
    state.sessionIndex = 0;
    renderSessionDashboard();
  }
  function closeSession() {
    state.session = null;
    renderSessionDashboard();
  }

  // ---------- achievements ----------
  function computeStreak(dates) {
    var set = {};
    dates.forEach(function (d) { set[d] = true; });
    var dayMs = 86400000;
    var cursor = new Date(todayStr() + 'T00:00:00Z');
    if (!set[cursor.toISOString().slice(0, 10)]) cursor = new Date(cursor.getTime() - dayMs);
    var streak = 0;
    while (set[cursor.toISOString().slice(0, 10)]) { streak++; cursor = new Date(cursor.getTime() - dayMs); }
    return streak;
  }

  function checkAndRecordDailyCompletion() {
    var p = getProgress();
    var period = todaysPeriodId();
    var pool = DATA.itemsByCategory(period);
    var allDone = pool.every(function (it) { return p.doneIds.indexOf(it.id) !== -1; });
    if (allDone && p.completedDates.indexOf(p.date) === -1) {
      p.completedDates.push(p.date);
      saveProgress(p);
    }
  }

  // ============================================================
  // RENDERING
  // ============================================================

  function renderPriorityPanel() {
    var mount = root.querySelector('[data-adk-priority]');
    if (!mount) return;
    var period = todaysPeriodId();
    var cards = [
      { icon: ICONS[period === 'morning' ? 'sun' : 'moon'], title: T.dailyEssentials, sub: T.dailyEssentialsSub, catId: period },
      { icon: ICONS.shield, title: T.greatestProtection, sub: T.greatestProtectionSub, catId: 'protection' },
      { icon: ICONS.hands, title: T.mostRewarding, sub: T.mostRewardingSub, catId: 'forgiveness' },
      { icon: ICONS.star, title: T.mostRecommended, sub: T.mostRecommendedSub, catId: 'salawat' },
    ];
    var html = '<p class="adk-priority-head">' + esc(T.priorityHead) + '</p><div class="adk-priority-grid">';
    cards.forEach(function (c) {
      var items = DATA.itemsByCategory(c.catId);
      var secs = DATA.categoryTotalSeconds(c.catId);
      var sample = items[0];
      var previewHTML = sample
        ? '<p class="apc-arabic" lang="ar" dir="rtl">' + sample.arabic + '</p>' +
          '<p class="apc-translation">' + esc(LANG === 'ar' ? sample.translation.ar : sample.translation.en) + '</p>'
        : '';
      html += '<button type="button" class="adk-priority-card" data-open-category="' + c.catId + '">' +
        c.icon + '<h4>' + esc(c.title) + '</h4><p>' + esc(c.sub) + '</p>' +
        previewHTML +
        '<span class="apc-count">' + items.length + ' ' + esc(T.items) + ' · ' + fmtMinutes(secs) + '</span></button>';
    });
    html += '</div>';
    mount.innerHTML = html;
    mount.querySelectorAll('[data-open-category]').forEach(function (btn) {
      btn.addEventListener('click', function () { openCategory(btn.getAttribute('data-open-category')); });
    });
  }

  function renderQuickModes() {
    var mount = root.querySelector('[data-adk-quick-modes]');
    if (!mount) return;
    var period = todaysPeriodId();
    var fullSeconds = DATA.categoryTotalSeconds(period);
    var modes = [
      { key: '2min', time: '2', label: T.quick2, budget: 120 },
      { key: '5min', time: '5', label: T.quick5, budget: 300 },
      { key: '10min', time: '10', label: T.quick10, budget: 600 },
      { key: 'full', time: Math.max(1, Math.round(fullSeconds / 60)), label: T.quickFull, budget: 0 },
    ];
    mount.innerHTML = modes.map(function (m) {
      return '<button type="button" class="adk-quick-btn" data-quick-mode="' + m.key + '">' +
        '<span class="aqb-time">' + m.time + '&nbsp;' + esc(T.min) + '</span>' +
        '<span class="aqb-label">' + esc(m.label) + ' ' + esc(T.essentials) + '</span></button>';
    }).join('');
    mount.querySelectorAll('[data-quick-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-quick-mode');
        var mode = modes.filter(function (m) { return m.key === key; })[0];
        var session = buildQuickSession(mode.budget);
        startSession(session.items, mode.label + ' ' + T.essentials);
        renderCategoryContent(period, session.items, mode.label + ' — ' + (period === 'morning' ? T.dailyEssentials : T.dailyEssentials));
        scrollToContent();
      });
    });
  }

  function renderCategoryNav() {
    var mount = root.querySelector('[data-adk-cat-nav]');
    if (!mount) return;
    mount.innerHTML = DATA.categories.map(function (c) {
      return '<button type="button" class="adk-cat-btn" data-cat="' + c.id + '">' + ICONS[c.icon] + '<span>' + esc(c.label[LANG]) + '</span></button>';
    }).join('');
    mount.querySelectorAll('[data-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () { openCategory(btn.getAttribute('data-cat')); });
    });
  }

  function markActiveCategoryBtn(catId) {
    root.querySelectorAll('[data-cat]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-cat') === catId);
    });
  }

  function openCategory(catId) {
    var cat = DATA.categories.filter(function (c) { return c.id === catId; })[0];
    var items = DATA.itemsByCategory(catId);
    startSession(items, cat ? cat.label[LANG] : catId);
    renderCategoryContent(catId, items, cat ? cat.label[LANG] : catId);
    markActiveCategoryBtn(catId);
    scrollToContent();
  }

  function scrollToContent() {
    var el = root.querySelector('[data-adk-content]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function itemCardHTML(item, idx) {
    var p = getProgress();
    var isDone = p.doneIds.indexOf(item.id) !== -1;
    var favs = getFavourites();
    var isFav = favs.indexOf(item.id) !== -1;
    return '<div class="adk-item' + (isDone ? ' is-done' : '') + '" data-item-id="' + item.id + '">' +
      '<div class="adk-item-head">' +
      '<span class="adk-num">' + String(idx + 1).padStart(2, '0') + '</span>' +
      '<h3>' + esc(itemLabel(item)) + '</h3>' +
      (item.repeat > 1 ? '<span class="adk-repeat">×' + item.repeat + '</span>' : '') +
      '<button type="button" class="adk-fav-btn' + (isFav ? ' is-fav' : '') + '" data-fav-toggle="' + item.id + '" aria-label="favourite">' + ICONS.fav + '</button>' +
      '</div>' +
      '<p class="adk-arabic-preview" lang="ar" dir="rtl">' + item.arabic + '</p>' +
      '<p class="adk-translation-preview">' + esc(LANG === 'ar' ? item.translation.ar : item.translation.en) + '</p>' +
      '</div>';
  }

  function renderCategoryContent(catId, items, label) {
    var mount = root.querySelector('[data-adk-content]');
    if (!mount) return;
    var secs = items.reduce(function (s, i) { return s + i.seconds; }, 0);
    var catMeta = DATA.categories.filter(function (c) { return c.id === catId; })[0];
    var icon = catMeta ? ICONS[catMeta.icon] : ICONS.star;
    var html = '<div class="adk-section-head">' + icon + '<h2>' + esc(label) + '</h2>' +
      '<span class="adk-section-time">' + items.length + ' ' + esc(T.items) + ' · ' + esc(T.estReading) + ': ' + fmtMinutes(secs) + '</span></div>';
    if (!items.length) {
      html += '<div class="adk-item-empty">' + esc(T.noResults) + '</div>';
    } else {
      html += '<div class="adk-list">' + items.map(itemCardHTML).join('') + '</div>';
    }
    mount.innerHTML = html;
    wireContentEvents(items);
  }

  function wireContentEvents(items) {
    var mount = root.querySelector('[data-adk-content]');
    mount.querySelectorAll('[data-fav-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isFav = toggleFavourite(btn.getAttribute('data-fav-toggle'));
        btn.classList.toggle('is-fav', isFav);
      });
    });
    mount.querySelectorAll('[data-item-id]').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-item-id');
        var idx = items.map(function (i) { return i.id; }).indexOf(id);
        if (!state.session || state.session.items !== items) state.session = { items: items, sourceLabel: '' };
        state.sessionIndex = Math.max(0, idx);
        openCounter();
      });
    });
  }

  function renderSearch() {
    var input = root.querySelector('[data-adk-search]');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (!q) { renderPriorityPanel(); markActiveCategoryBtn(''); return; }
      var matches = DATA.items.filter(function (it) {
        var hay = (itemLabel(it) + ' ' + it.translation.en + ' ' + (it.translation.ar || '') + ' ' + it.arabic).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      renderCategoryContent('search', matches, T.searchPlaceholder.replace('…', '') + ' "' + input.value.trim() + '"');
      state.session = { items: matches, sourceLabel: 'search' };
      scrollToContent();
    });
  }

  // ---------- session dashboard ----------
  var RING_R = 36;
  var RING_C = 2 * Math.PI * RING_R;
  function renderSessionDashboard() {
    var mount = root.querySelector('[data-adk-session]');
    if (!mount) return;
    if (!state.session) { mount.hidden = true; return; }
    var items = state.session.items;
    var p = getProgress();
    var doneCount = items.filter(function (i) { return p.doneIds.indexOf(i.id) !== -1; }).length;
    var total = items.length;
    var pct = total ? Math.round((doneCount / total) * 100) : 0;
    var remainingSecs = items.filter(function (i) { return p.doneIds.indexOf(i.id) === -1; }).reduce(function (s, i) { return s + i.seconds; }, 0);
    var offset = RING_C - (pct / 100) * RING_C;
    mount.hidden = false;
    mount.innerHTML =
      '<div class="adk-sd-ring"><svg viewBox="0 0 84 84">' +
      '<circle class="sd-track" cx="42" cy="42" r="' + RING_R + '"/>' +
      '<circle class="sd-fill" cx="42" cy="42" r="' + RING_R + '" stroke-dasharray="' + RING_C + '" stroke-dashoffset="' + offset + '"/>' +
      '</svg><span class="sd-pct">' + pct + '%</span></div>' +
      '<div class="adk-sd-stats">' +
      '<div class="adk-sd-stat"><span class="label">' + esc(T.sessionCompleted) + '</span><span class="value">' + doneCount + ' ' + esc(T.of) + ' ' + total + '</span></div>' +
      '<div class="adk-sd-stat"><span class="label">' + esc(T.sessionRemaining) + '</span><span class="value">' + (total - doneCount) + '</span></div>' +
      '<div class="adk-sd-stat"><span class="label">' + esc(T.sessionTimeLeft) + '</span><span class="value">' + fmtMinutes(Math.max(remainingSecs, 0)) + '</span></div>' +
      '</div>' +
      '<button type="button" class="adk-sd-close" data-session-close>' + esc(T.sessionClose) + '</button>';
    mount.querySelector('[data-session-close]').addEventListener('click', closeSession);
  }

  // ============================================================
  // COUNTER MODAL
  // ============================================================
  function counterModalShell() {
    return '' +
      '<div class="adk-counter-card" data-theme="' + settings.theme + '">' +
      '  <div class="adk-ctr-topbar">' +
      '    <div><div class="ctr-cat" data-ctr-cat></div><div class="ctr-pos" data-ctr-pos></div></div>' +
      '    <div class="adk-ctr-btns">' +
      '      <button type="button" class="adk-ctr-icon-btn" data-ctr-fav aria-label="favourite">' + ICONS.fav + '</button>' +
      '      <button type="button" class="adk-ctr-icon-btn" data-ctr-settings aria-label="settings">' + ICONS.gear + '</button>' +
      '      <button type="button" class="adk-ctr-icon-btn" data-ctr-close aria-label="close">' + ICONS.close + '</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="adk-ctr-body">' +
      '    <div class="adk-ctr-title" data-ctr-title></div>' +
      '    <p class="adk-ctr-arabic" data-ctr-arabic lang="ar" dir="rtl"></p>' +
      '    <p class="adk-ctr-translit" data-ctr-translit></p>' +
      '    <p class="adk-ctr-translation" data-ctr-translation></p>' +
      '    <p class="adk-ctr-meta" data-ctr-meta></p>' +
      '    <div class="adk-ctr-dial-wrap">' +
      '      <div class="adk-ctr-dial" data-ctr-dial>' +
      '        <svg viewBox="0 0 180 180"><circle class="ctr-track" cx="90" cy="90" r="78"/><circle class="ctr-fill" cx="90" cy="90" r="78" data-ctr-fill/></svg>' +
      '        <div class="adk-ctr-dial-inner"><span class="ctr-count" data-ctr-count>0</span><span class="ctr-target" data-ctr-target></span></div>' +
      '      </div>' +
      '    </div>' +
      '    <p class="adk-ctr-tap-hint">' + esc(T.tapToCount) + '</p>' +
      '    <p class="adk-ctr-complete-badge" data-ctr-badge>' + esc(T.completeBadge) + '</p>' +
      '    <div class="adk-ctr-controls">' +
      '      <button type="button" class="adk-ctr-icon-btn" data-ctr-sound aria-label="sound">' + ICONS.speaker + '</button>' +
      '      <button type="button" class="adk-ctr-icon-btn" data-ctr-vibrate aria-label="vibration">' + ICONS.vibrate + '</button>' +
      '      <button type="button" class="adk-ctr-icon-btn" data-ctr-tts-toggle aria-label="voice">' + ICONS.play + '</button>' +
      '      <button type="button" class="adk-ctr-reset" data-ctr-reset>' + esc(T.reset) + '</button>' +
      '    </div>' +
      '    <div class="adk-ctr-tts" data-ctr-tts-panel hidden>' +
      '      <div class="adk-ctr-tts-row">' +
      '        <select data-ctr-voice></select>' +
      '        <label style="font-size:0.72rem;display:flex;align-items:center;gap:5px;"><input type="checkbox" data-ctr-loop /> ' + esc(T.loop) + '</label>' +
      '        <label style="font-size:0.72rem;display:flex;align-items:center;gap:5px;"><input type="checkbox" data-ctr-autocount /> ' + esc(T.autoCount) + '</label>' +
      '        <label style="font-size:0.72rem;display:flex;align-items:center;gap:5px;"><input type="checkbox" data-ctr-autoadvance /> ' + esc(T.autoAdvance) + '</label>' +
      '      </div>' +
      '      <p class="adk-ctr-tts-note" data-ctr-tts-note></p>' +
      '    </div>' +
      '    <div class="adk-theme-grid" data-ctr-theme-grid hidden></div>' +
      '  </div>' +
      '  <div class="adk-ctr-nav">' +
      '    <button type="button" class="adk-ctr-nav-btn" data-ctr-prev>' + ICONS.prev + esc(T.prev) + '</button>' +
      '    <button type="button" class="adk-ctr-nav-btn" data-ctr-next>' + esc(T.next) + ICONS.next + '</button>' +
      '  </div>' +
      '</div>';
  }

  function ensureModal() {
    var modal = root.querySelector('[data-adk-counter-modal]');
    if (!modal.querySelector('.adk-counter-card')) modal.innerHTML = counterModalShell();
    return modal;
  }

  function openCounter() {
    var modal = ensureModal();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    wireCounterEvents(modal);
    renderCounterItem();
  }
  function closeCounter() {
    var modal = root.querySelector('[data-adk-counter-modal]');
    modal.hidden = true;
    document.body.style.overflow = '';
    stopSpeaking();
    state.ttsPlaying = false;
    renderSessionDashboard();
  }

  function currentSessionItems() { return state.session ? state.session.items : []; }

  function renderCounterItem() {
    var items = currentSessionItems();
    var item = items[state.sessionIndex];
    if (!item) { closeCounter(); return; }
    state.counterItem = item;
    var p = getProgress();
    state.counterCount = p.counts[item.id] || 0;
    var isDone = p.doneIds.indexOf(item.id) !== -1;
    if (isDone) state.counterCount = item.repeat;

    var modal = root.querySelector('[data-adk-counter-modal]');
    var card = modal.querySelector('.adk-counter-card');
    card.setAttribute('data-theme', settings.theme);
    modal.querySelector('[data-ctr-cat]').textContent = state.session && state.session.sourceLabel ? state.session.sourceLabel : '';
    modal.querySelector('[data-ctr-pos]').textContent = (state.sessionIndex + 1) + ' ' + T.of + ' ' + items.length;
    modal.querySelector('[data-ctr-title]').textContent = itemLabel(item);
    modal.querySelector('[data-ctr-arabic]').textContent = item.arabic;
    var translitEl = modal.querySelector('[data-ctr-translit]');
    if (LANG === 'ar') { translitEl.hidden = true; } else { translitEl.hidden = false; translitEl.textContent = item.transliteration; }
    modal.querySelector('[data-ctr-translation]').textContent = LANG === 'ar' ? item.translation.ar : item.translation.en;
    modal.querySelector('[data-ctr-meta]').textContent = (LANG === 'ar' ? item.reference.ar : item.reference.en) + ' · ' + (LANG === 'ar' ? item.virtue.ar : item.virtue.en);

    var favBtn = modal.querySelector('[data-ctr-fav]');
    favBtn.classList.toggle('is-on', getFavourites().indexOf(item.id) !== -1);

    modal.querySelector('[data-ctr-sound]').classList.toggle('is-on', settings.sound);
    modal.querySelector('[data-ctr-vibrate]').classList.toggle('is-on', settings.vibration);

    modal.querySelector('[data-ctr-prev]').disabled = state.sessionIndex === 0;
    modal.querySelector('[data-ctr-next]').disabled = state.sessionIndex === items.length - 1;

    updateDial(false);
    populateVoiceSelect(modal);
  }

  function updateDial(animate) {
    var modal = root.querySelector('[data-adk-counter-modal]');
    var item = state.counterItem;
    var dial = modal.querySelector('[data-ctr-dial]');
    var fill = modal.querySelector('[data-ctr-fill]');
    var countEl = modal.querySelector('[data-ctr-count]');
    var targetEl = modal.querySelector('[data-ctr-target]');
    var badge = modal.querySelector('[data-ctr-badge]');
    var r = 78, c = 2 * Math.PI * r;
    fill.setAttribute('stroke-dasharray', c);
    var pct = Math.min(1, state.counterCount / item.repeat);
    fill.setAttribute('stroke-dashoffset', c - pct * c);
    countEl.textContent = state.counterCount;
    targetEl.textContent = T.of + ' ' + item.repeat + ' ' + T.target;
    var isComplete = state.counterCount >= item.repeat;
    dial.classList.toggle('is-complete', isComplete);
    badge.style.display = isComplete ? 'block' : 'none';
  }

  function incrementCounter() {
    var item = state.counterItem;
    if (!item || state.counterCount >= item.repeat) return;
    state.counterCount++;
    var p = getProgress();
    p.counts[item.id] = state.counterCount;
    var justCompleted = state.counterCount >= item.repeat;
    if (justCompleted && p.doneIds.indexOf(item.id) === -1) p.doneIds.push(item.id);
    saveProgress(p);
    updateDial(true);
    if (justCompleted) {
      completeSound();
      vibrate([40, 60, 40, 60, 80]);
      checkAndRecordDailyCompletion();
      renderSessionDashboard();
      if (settings.autoAdvance) setTimeout(goNext, 1200);
    } else {
      tapSound();
      vibrate(25);
    }
  }

  function goPrev() { if (state.sessionIndex > 0) { state.sessionIndex--; stopSpeaking(); renderCounterItem(); } }
  function goNext() {
    var items = currentSessionItems();
    if (state.sessionIndex < items.length - 1) { state.sessionIndex++; stopSpeaking(); renderCounterItem(); }
    else { closeCounter(); }
  }

  function populateVoiceSelect(modal) {
    var select = modal.querySelector('[data-ctr-voice]');
    var note = modal.querySelector('[data-ctr-tts-note]');
    loadVoices();
    if (!arabicVoices.length) {
      select.innerHTML = '';
      select.disabled = true;
      note.textContent = T.noVoice;
      return;
    }
    select.disabled = false;
    note.textContent = '';
    select.innerHTML = arabicVoices.map(function (v) {
      return '<option value="' + v.voiceURI + '">' + v.name + ' (' + v.lang + ')</option>';
    }).join('');
    if (settings.ttsVoiceURI) select.value = settings.ttsVoiceURI;
  }

  function playTTS() {
    var item = state.counterItem;
    if (!item) return;
    state.ttsPlaying = true;
    var modal = root.querySelector('[data-adk-counter-modal]');
    modal.querySelector('[data-ctr-tts-toggle]').innerHTML = ICONS.pause;
    modal.querySelector('[data-ctr-tts-toggle]').classList.add('is-on');
    function onEnd() {
      if (!state.ttsPlaying) return;
      if (settings.autoCount) incrementCounter();
      var shouldRepeat = (settings.loop || settings.autoCount) && state.counterCount < item.repeat;
      if (shouldRepeat) {
        speak(item.arabic, onEnd);
      } else {
        stopTTSUI();
        if (settings.autoAdvance && state.counterCount >= item.repeat) goNext();
      }
    }
    speak(item.arabic, onEnd);
  }
  function stopTTSUI() {
    state.ttsPlaying = false;
    var modal = root.querySelector('[data-adk-counter-modal]');
    if (!modal) return;
    var btn = modal.querySelector('[data-ctr-tts-toggle]');
    if (btn) { btn.innerHTML = ICONS.play; btn.classList.remove('is-on'); }
  }
  function toggleTTS() {
    if (state.ttsPlaying) { stopSpeaking(); stopTTSUI(); } else { playTTS(); }
  }

  function renderThemeGrid(modal) {
    var grid = modal.querySelector('[data-ctr-theme-grid]');
    grid.innerHTML = THEME_LIST.map(function (t) {
      return '<div class="adk-theme-swatch' + (settings.theme === t.id ? ' is-active' : '') + '" data-theme-pick="' + t.id + '">' +
        '<span class="swatch-dot" style="background:' + t.color + '"></span><span>' + esc(T[t.labelKey]) + '</span></div>';
    }).join('');
    grid.querySelectorAll('[data-theme-pick]').forEach(function (sw) {
      sw.addEventListener('click', function () {
        settings.theme = sw.getAttribute('data-theme-pick');
        saveSettings(settings);
        modal.querySelector('.adk-counter-card').setAttribute('data-theme', settings.theme);
        renderThemeGrid(modal);
      });
    });
  }

  var wired = false;
  function wireCounterEvents(modal) {
    if (wired) return;
    wired = true;
    var dial = modal.querySelector('[data-ctr-dial]');
    dial.addEventListener('click', incrementCounter);
    var touchStartX = null;
    dial.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    dial.addEventListener('touchend', function (e) {
      if (touchStartX == null) return;
      var dx = (e.changedTouches[0].clientX - touchStartX);
      if (Math.abs(dx) > 24) incrementCounter();
      touchStartX = null;
    }, { passive: true });

    modal.querySelector('[data-ctr-close]').addEventListener('click', closeCounter);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeCounter(); });
    modal.querySelector('[data-ctr-prev]').addEventListener('click', goPrev);
    modal.querySelector('[data-ctr-next]').addEventListener('click', goNext);
    modal.querySelector('[data-ctr-reset]').addEventListener('click', function () {
      state.counterCount = 0;
      var p = getProgress();
      delete p.counts[state.counterItem.id];
      var i = p.doneIds.indexOf(state.counterItem.id);
      if (i !== -1) p.doneIds.splice(i, 1);
      saveProgress(p);
      updateDial(true);
      renderSessionDashboard();
    });
    modal.querySelector('[data-ctr-fav]').addEventListener('click', function (e) {
      var isFav = toggleFavourite(state.counterItem.id);
      e.currentTarget.classList.toggle('is-on', isFav);
    });
    modal.querySelector('[data-ctr-sound]').addEventListener('click', function (e) {
      settings.sound = !settings.sound; saveSettings(settings);
      e.currentTarget.classList.toggle('is-on', settings.sound);
    });
    modal.querySelector('[data-ctr-vibrate]').addEventListener('click', function (e) {
      settings.vibration = !settings.vibration; saveSettings(settings);
      e.currentTarget.classList.toggle('is-on', settings.vibration);
    });
    modal.querySelector('[data-ctr-tts-toggle]').addEventListener('click', toggleTTS);
    modal.querySelector('[data-ctr-settings]').addEventListener('click', function () {
      var ttsPanel = modal.querySelector('[data-ctr-tts-panel]');
      var themeGrid = modal.querySelector('[data-ctr-theme-grid]');
      var show = ttsPanel.hidden;
      ttsPanel.hidden = !show;
      themeGrid.hidden = !show;
      if (show) renderThemeGrid(modal);
    });
    modal.querySelector('[data-ctr-voice]').addEventListener('change', function (e) {
      settings.ttsVoiceURI = e.target.value; saveSettings(settings);
    });
    modal.querySelector('[data-ctr-loop]').addEventListener('change', function (e) {
      settings.loop = e.target.checked; saveSettings(settings);
    });
    modal.querySelector('[data-ctr-autocount]').addEventListener('change', function (e) {
      settings.autoCount = e.target.checked; saveSettings(settings);
    });
    modal.querySelector('[data-ctr-autoadvance]').addEventListener('change', function (e) {
      settings.autoAdvance = e.target.checked; saveSettings(settings);
    });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') closeCounter();
      if (e.key === 'ArrowRight') RTL ? goPrev() : goNext();
      if (e.key === 'ArrowLeft') RTL ? goNext() : goPrev();
      if (e.key === ' ') { e.preventDefault(); incrementCounter(); }
    });
  }

  function esc(s) { return String(s == null ? '' : s); }

  // ---------- init ----------
  function init() {
    renderPriorityPanel();
    renderQuickModes();
    renderCategoryNav();
    renderSearch();
    renderSessionDashboard();
    // Default landing content: today's period, shown immediately.
    var period = todaysPeriodId();
    var items = DATA.itemsByCategory(period);
    startSession(items, DATA.categories.filter(function (c) { return c.id === period; })[0].label[LANG]);
    renderCategoryContent(period, items, DATA.categories.filter(function (c) { return c.id === period; })[0].label[LANG]);
    markActiveCategoryBtn(period);
  }

  init();
})();
