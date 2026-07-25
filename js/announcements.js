// Institutional Announcement & Communication System — client-side
// rendering for three independent, optional surfaces (ribbon, homepage
// hero + countdown, /announcements/ archive). Every surface's HTML
// already carries a real, deliberate empty state server-side (see
// scripts/build.js's announcement-ribbon partial and pages/home.html's
// .ann-hero markup); this script only replaces that default when the
// public GET /api/portal/announcements/list endpoint actually returns
// published content. If the fetch fails or the API is unreachable, the
// static default stays exactly as written — no spinner, no blank box,
// no error message shown to a visitor. No fabricated content is ever
// generated client-side.
(function () {
  var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  var dir = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';

  var CATEGORY_LABELS = {
    en: {
      admissions: 'Admissions', events: 'Events', academic_notices: 'Academic Notices',
      quran_college: "Qur'an College", arabic_studies: 'Arabic Studies',
      scholarships: 'Scholarships', parent_notices: 'Parent Notices', general: 'General',
    },
    ar: {
      admissions: 'القبول', events: 'الفعاليات', academic_notices: 'إشعارات أكاديمية',
      quran_college: 'كلية القرآن الكريم', arabic_studies: 'الدراسات العربية',
      scholarships: 'المنح الدراسية', parent_notices: 'إشعارات لأولياء الأمور', general: 'عام',
    },
  };
  var STRINGS = {
    en: {
      venue: 'Venue', archived: 'Archived', archiveEmptyTitle: 'No notices to show yet',
      archiveEmptyBody: 'Nothing has been published in this category yet. Check back soon, or browse another category above.',
      countdownEmpty: 'No upcoming scheduled events.', days: 'Days', hours: 'Hrs', mins: 'Mins',
    },
    ar: {
      venue: 'المكان', archived: 'مؤرشف', archiveEmptyTitle: 'لا توجد إشعارات بعد',
      archiveEmptyBody: 'لم يُنشر أي إعلان في هذا التصنيف بعد. تحقق مرة أخرى قريباً، أو تصفّح تصنيفاً آخر أعلاه.',
      countdownEmpty: 'لا توجد فعاليات قادمة مجدولة.', days: 'يوم', hours: 'ساعة', mins: 'دقيقة',
    },
  };
  var t = STRINGS[lang];
  var catLabel = function (c) { return (CATEGORY_LABELS[lang] || CATEGORY_LABELS.en)[c] || c; };
  var archiveHref = lang === 'ar' ? '/ar/announcements/' : '/announcements/';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function fetchAnnouncements(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch('/api/portal/announcements/list' + qs, { headers: { accept: 'application/json' } })
      .then(function (res) { if (!res.ok) throw new Error('bad status'); return res.json(); })
      .catch(function () { return null; });
  }

  // ---------- Ribbon ----------
  function initRibbon() {
    var track = document.querySelector('[data-ann-ribbon-track]');
    if (!track) return;
    fetchAnnouncements({ limit: 12 }).then(function (data) {
      if (!data || !data.ok || !data.items.length) return; // static "No active announcements." stays as-is
      var empty = track.querySelector('[data-ann-ribbon-empty]');
      if (empty) empty.remove();
      data.items.forEach(function (item) {
        var a = document.createElement('a');
        a.className = 'ann-item' + (item.eventDate ? ' is-event' : '');
        a.href = item.actionUrl || (archiveHref + '#ann-' + item.id);
        if (item.actionUrl) { a.target = '_blank'; a.rel = 'noopener'; }
        a.innerHTML =
          '<span class="ai-dot" aria-hidden="true"></span>' +
          '<span class="ai-cat">' + escapeHtml(catLabel(item.category)) + '</span>' +
          '<span class="ai-title">' + escapeHtml(item.title) + '</span>';
        track.appendChild(a);
      });
    });
  }

  // ---------- Homepage hero + countdown ----------
  var countdownTimer = null;

  function renderCountdownEmpty(box) {
    box.innerHTML = '<p class="ann-countdown-empty">' + escapeHtml(t.countdownEmpty) + '</p>';
  }

  function renderCountdown(box, targetDate) {
    function tick() {
      var now = new Date();
      var diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        renderCountdownEmpty(box);
        if (countdownTimer) clearInterval(countdownTimer);
        return;
      }
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);
      box.innerHTML =
        '<div class="ann-countdown-unit"><span class="ann-countdown-num">' + days + '</span><span class="ann-countdown-label">' + escapeHtml(t.days) + '</span></div>' +
        '<span class="ann-countdown-sep">·</span>' +
        '<div class="ann-countdown-unit"><span class="ann-countdown-num">' + hours + '</span><span class="ann-countdown-label">' + escapeHtml(t.hours) + '</span></div>' +
        '<span class="ann-countdown-sep">·</span>' +
        '<div class="ann-countdown-unit"><span class="ann-countdown-num">' + mins + '</span><span class="ann-countdown-label">' + escapeHtml(t.mins) + '</span></div>';
    }
    tick();
    countdownTimer = setInterval(tick, 60000);
  }

  function parseEventDateTime(eventDate, eventTime) {
    // event_time is free text ("10:00 AM") entered by staff, not a
    // strict format — best-effort parse; falls back to midnight of
    // event_date (still a meaningful countdown target) if it doesn't
    // match the common "H:MM AM/PM" shape.
    var d = new Date(eventDate + 'T00:00:00');
    if (eventTime) {
      var m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/.exec(eventTime);
      if (m) {
        var h = parseInt(m[1], 10);
        var mins = parseInt(m[2], 10);
        var ap = m[3] ? m[3].toUpperCase() : null;
        if (ap === 'PM' && h < 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
        d.setHours(h, mins, 0, 0);
      }
    }
    return d;
  }

  function initHero() {
    var panel = document.querySelector('[data-ann-hero-panel]');
    var countdownBox = document.querySelector('[data-ann-countdown]');
    if (!panel && !countdownBox) return;
    fetchAnnouncements({}).then(function (data) {
      var featured = data && data.ok ? data.featured : null;
      if (panel && featured) {
        var content = panel.querySelector('.ann-hero-content');
        if (!content) {
          content = document.createElement('div');
          content.className = 'ann-hero-content';
          panel.appendChild(content);
        }
        var metaBits = [];
        if (featured.venue) {
          metaBits.push('<span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="9" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>' + escapeHtml(featured.venue) + '</span>');
        }
        if (featured.eventDate) {
          metaBits.push('<span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' + escapeHtml(formatDate(featured.eventDate)) + (featured.eventTime ? ' · ' + escapeHtml(featured.eventTime) : '') + '</span>');
        }
        content.innerHTML =
          '<div class="ann-hero-media">' + (featured.imageUrl ? '<img src="' + escapeHtml(featured.imageUrl) + '" alt="" loading="lazy">' : '') + '</div>' +
          '<div class="ann-hero-body">' +
          '<span class="ann-hero-cat">' + escapeHtml(catLabel(featured.category)) + '</span>' +
          '<h3>' + escapeHtml(featured.title) + '</h3>' +
          '<p class="ann-hero-summary">' + escapeHtml(featured.summary) + '</p>' +
          (metaBits.length ? '<div class="ann-hero-meta">' + metaBits.join('') + '</div>' : '') +
          (featured.actionUrl && featured.actionLabel ? '<a class="btn btn-gold" href="' + escapeHtml(featured.actionUrl) + '">' + escapeHtml(featured.actionLabel) + '</a>' : '') +
          '</div>';
        panel.classList.add('has-content');
      }
      if (countdownBox) {
        if (featured && featured.eventDate) {
          renderCountdown(countdownBox, parseEventDateTime(featured.eventDate, featured.eventTime));
        } // else the static "No upcoming scheduled events." markup stays untouched
      }
    });
  }

  // ---------- Archive page ----------
  function initArchive() {
    var list = document.querySelector('[data-ann-archive-list]');
    if (!list) return;
    var filterBar = document.querySelector('[data-ann-archive-filters]');
    var activeCategory = null;

    function cardHtml(item) {
      var metaBits = [];
      if (item.venue) metaBits.push('<span>' + escapeHtml(t.venue) + ': ' + escapeHtml(item.venue) + '</span>');
      if (item.eventDate) metaBits.push('<span>' + escapeHtml(formatDate(item.eventDate)) + (item.eventTime ? ' · ' + escapeHtml(item.eventTime) : '') + '</span>');
      return (
        '<article class="ann-archive-card' + (item.status === 'archived' ? ' is-archived' : '') + '" id="ann-' + item.id + '">' +
        '<span class="ann-hero-cat">' + escapeHtml(catLabel(item.category)) + '</span>' +
        '<h4>' + escapeHtml(item.title) + '</h4>' +
        '<p>' + escapeHtml(item.summary) + '</p>' +
        (metaBits.length ? '<div class="ann-archive-meta">' + metaBits.join('') + '</div>' : '') +
        (item.status === 'archived' ? '<span class="ann-archive-status">' + escapeHtml(t.archived) + '</span>' : '') +
        (item.actionUrl && item.actionLabel ? '<a class="text-link" href="' + escapeHtml(item.actionUrl) + '">' + escapeHtml(item.actionLabel) + ' →</a>' : '') +
        '</article>'
      );
    }

    function renderEmpty() {
      list.innerHTML =
        '<div class="ann-archive-empty"><h4>' + escapeHtml(t.archiveEmptyTitle) + '</h4><p>' + escapeHtml(t.archiveEmptyBody) + '</p></div>';
    }

    function load() {
      var params = { includeArchived: 'true', limit: '60' };
      if (activeCategory) params.category = activeCategory;
      list.setAttribute('aria-busy', 'true');
      fetchAnnouncements(params).then(function (data) {
        list.removeAttribute('aria-busy');
        if (!data || !data.ok || !data.items.length) { renderEmpty(); return; }
        list.innerHTML = data.items.map(cardHtml).join('');
      });
    }

    if (filterBar) {
      filterBar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-ann-filter]');
        if (!btn) return;
        filterBar.querySelectorAll('.ann-filter-btn').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        activeCategory = btn.getAttribute('data-ann-filter') || null;
        load();
      });
    }
    load();
  }

  initRibbon();
  initHero();
  initArchive();
})();
