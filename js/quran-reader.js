// SHRS Digital Qur'an Centre — reader UI. Renders js/quran-data.js into
// a surah list + reading pane. Every surah in the data file is currently
// unverified (see the provenance note at the top of that file) — this
// script keeps a persistent, impossible-to-miss notice on screen for
// that reason, and never claims "verified" itself; verification is a
// human, off-site step (checking against a printed Mushaf or Tanzil.net),
// not something this code can determine.
(function () {
  var root = document.querySelector('[data-quran-reader]');
  if (!root || !window.SHRS_QURAN) return;
  var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  var data = window.SHRS_QURAN.surahs;

  var STRINGS = {
    en: {
      pending: 'Pending scholarly verification — not yet confirmed against a printed Mushaf.',
      verses: 'verses', selectSurah: 'Select a surah', translation: 'Translation',
    },
    ar: {
      pending: 'قيد التحقق العلمي — لم يُؤكَّد بعد مقارنةً بمصحف مطبوع.',
      verses: 'آية', selectSurah: 'اختر سورة', translation: 'الترجمة',
    },
  };
  var t = STRINGS[lang];

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function surahListHtml() {
    return data.map(function (s) {
      return (
        '<button type="button" class="qr-surah-item" data-qr-surah="' + s.number + '">' +
        '<span class="qr-surah-num">' + s.number + '</span>' +
        '<span class="qr-surah-names"><span class="qr-surah-ar">' + escapeHtml(s.nameArabic) + '</span>' +
        '<span class="qr-surah-en">' + escapeHtml(s.nameTransliteration) + ' — ' + escapeHtml(s.nameTranslation) + '</span></span>' +
        '<span class="qr-surah-count">' + s.verses.length + ' ' + t.verses + '</span>' +
        '</button>'
      );
    }).join('');
  }

  function renderSurah(surah) {
    var pane = root.querySelector('[data-qr-pane]');
    if (!pane) return;
    var versesHtml = surah.verses.map(function (v) {
      return (
        '<div class="qr-verse">' +
        '<div class="qr-verse-arabic" lang="ar" dir="rtl">' + escapeHtml(v.ar) + ' <span class="qr-ayah-num">' + v.n + '</span></div>' +
        '<div class="qr-verse-translation">' + escapeHtml(v.en) + '</div>' +
        '</div>'
      );
    }).join('');
    pane.innerHTML =
      '<div class="qr-pane-notice"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 8v5M12 16.2v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' + escapeHtml(t.pending) + '</div>' +
      '<h3 class="qr-pane-title"><span lang="ar" dir="rtl">' + escapeHtml(surah.nameArabic) + '</span> — ' + escapeHtml(surah.nameTransliteration) + ' <span class="qr-pane-subtitle">(' + escapeHtml(surah.nameTranslation) + ')</span></h3>' +
      '<div class="qr-verses">' + versesHtml + '</div>';
    root.querySelectorAll('.qr-surah-item').forEach(function (btn) {
      btn.classList.toggle('is-active', Number(btn.getAttribute('data-qr-surah')) === surah.number);
    });
  }

  function init() {
    var listEl = root.querySelector('[data-qr-list]');
    if (listEl) listEl.innerHTML = surahListHtml();
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-qr-surah]');
      if (!btn) return;
      var num = Number(btn.getAttribute('data-qr-surah'));
      var surah = data.filter(function (s) { return s.number === num; })[0];
      if (surah) renderSurah(surah);
    });
    renderSurah(data[0]);
  }

  init();
})();
