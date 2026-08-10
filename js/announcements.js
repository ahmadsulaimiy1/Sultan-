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
      rsvp: "I'll be there", rsvpDone: "You're attending", rsvpCount1: 'person attending', rsvpCountN: 'people attending',
      share: 'Share', shareCopied: 'Link copied', galleryTitle: 'Photos from the day',
    },
    ar: {
      venue: 'المكان', archived: 'مؤرشف', archiveEmptyTitle: 'لا توجد إشعارات بعد',
      archiveEmptyBody: 'لم يُنشر أي إعلان في هذا التصنيف بعد. تحقق مرة أخرى قريباً، أو تصفّح تصنيفاً آخر أعلاه.',
      countdownEmpty: 'لا توجد فعاليات قادمة مجدولة.', days: 'يوم', hours: 'ساعة', mins: 'دقيقة',
      rsvp: 'سأحضر', rsvpDone: 'أنت مسجّل للحضور', rsvpCount1: 'شخص سيحضر', rsvpCountN: 'أشخاص سيحضرون',
      share: 'مشاركة', shareCopied: 'تم نسخ الرابط', galleryTitle: 'صور من اليوم',
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
    /* THE COUNTER IS BUILT ONCE AND THEN ONLY ITS DIGITS CHANGE.

       It used to rewrite its whole innerHTML every sixty seconds, which
       is three faults in one line: every element is destroyed and
       rebuilt to change two characters; anything the reader had focused
       or selected inside it is thrown away; and a CSS animation on the
       numerals would replay on all three units every minute, including
       the two that had not moved. Days does not change ninety-nine
       times out of a hundred, and a counter where the day figure
       flinches every minute reads as a fault rather than as a clock.

       Now the plates are made once, and each tick writes a digit only
       where the digit is different — and marks THAT one, so the turning
       of a figure is the thing that draws the eye, which is the whole
       point of a countdown. */
    var UNITS = [
      { key: 'd', label: t.days },
      { key: 'h', label: t.hours },
      { key: 'm', label: t.mins }
    ];
    box.innerHTML = UNITS.map(function (u) {
      return '<div class="ann-countdown-unit">' +
             '<span class="ann-countdown-num" data-cd="' + u.key + '">&mdash;</span>' +
             '<span class="ann-countdown-label">' + escapeHtml(u.label) + '</span></div>';
    }).join('<span class="ann-countdown-sep" aria-hidden="true">&middot;</span>');
    box.setAttribute('role', 'timer');
    box.setAttribute('aria-live', 'off');   // a value that changes every
                                            // minute must not be spoken
                                            // every minute

    var cells = {};
    UNITS.forEach(function (u) { cells[u.key] = box.querySelector('[data-cd="' + u.key + '"]'); });

    function put(cell, value) {
      if (!cell) return;
      var next = String(value);
      if (cell.textContent === next) return;
      cell.textContent = next;
      cell.classList.remove('is-turning');
      // reading offsetWidth restarts the animation; without it the class
      // is removed and re-added inside one frame and nothing replays
      void cell.offsetWidth;
      cell.classList.add('is-turning');
    }

    function tick() {
      var diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        renderCountdownEmpty(box);
        box.removeAttribute('role');
        if (countdownTimer) clearInterval(countdownTimer);
        return;
      }
      put(cells.d, Math.floor(diff / 86400000));
      put(cells.h, Math.floor((diff % 86400000) / 3600000));
      put(cells.m, Math.floor((diff % 3600000) / 60000));
    }
    tick();
    countdownTimer = setInterval(tick, 30000);   // never more than 30s stale
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

  function rsvpStorageKey(id) { return 'shrs_rsvp_' + id; }

  function renderRsvpButton(featured) {
    var already = false;
    try { already = window.localStorage.getItem(rsvpStorageKey(featured.id)) === '1'; } catch (e) { /* storage unavailable — treat as not yet RSVP'd */ }
    var count = (featured.rsvpCount || 0) + (already ? 0 : 0); // count from server already includes this visitor's prior tap, if any
    var countLabel = count === 1 ? t.rsvpCount1 : t.rsvpCountN;
    return (
      '<div class="ann-hero-rsvp">' +
      '<button type="button" class="ann-rsvp-btn' + (already ? ' is-done' : '') + '" data-ann-rsvp="' + featured.id + '"' + (already ? ' disabled' : '') + '>' +
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>' +
      '<span data-ann-rsvp-label>' + escapeHtml(already ? t.rsvpDone : t.rsvp) + '</span>' +
      '</button>' +
      '<span class="ann-rsvp-count" data-ann-rsvp-count>' + count + ' ' + escapeHtml(countLabel) + '</span>' +
      '</div>'
    );
  }

  function renderShareButton(featured) {
    return (
      '<button type="button" class="ann-share-btn" data-ann-share data-ann-share-title="' + escapeHtml(featured.title) + '" data-ann-share-text="' + escapeHtml(featured.summary) + '">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="18" cy="5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="18" cy="19" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8.1 10.8l7.8-4.2M8.1 13.2l7.8 4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
      '<span>' + escapeHtml(t.share) + '</span>' +
      '</button>'
    );
  }

  function renderGallery(featured) {
    if (!featured.galleryImages || !featured.galleryImages.length) return '';
    var figs = featured.galleryImages.map(function (img) {
      var url = typeof img === 'string' ? img : img.url;
      var alt = typeof img === 'object' && img.alt ? img.alt : '';
      if (!url) return '';
      return '<figure class="ann-gallery-item"><img src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt) + '" loading="lazy"></figure>';
    }).join('');
    return '<div class="ann-hero-gallery"><h4>' + escapeHtml(t.galleryTitle) + '</h4><div class="ann-gallery-grid">' + figs + '</div></div>';
  }

  function wireRsvpAndShare(panel, archiveHref, featured) {
    var rsvpBtn = panel.querySelector('[data-ann-rsvp]');
    if (rsvpBtn) {
      rsvpBtn.addEventListener('click', function () {
        if (rsvpBtn.disabled) return;
        rsvpBtn.disabled = true;
        fetch('/api/portal/announcements/rsvp', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: featured.id }),
        }).then(function (res) { return res.ok ? res.json() : null; }).then(function (data) {
          try { window.localStorage.setItem(rsvpStorageKey(featured.id), '1'); } catch (e) { /* best-effort only */ }
          rsvpBtn.classList.add('is-done');
          var label = rsvpBtn.querySelector('[data-ann-rsvp-label]');
          if (label) label.textContent = t.rsvpDone;
          var countEl = panel.querySelector('[data-ann-rsvp-count]');
          if (countEl && data && typeof data.rsvpCount === 'number') {
            var lbl = data.rsvpCount === 1 ? t.rsvpCount1 : t.rsvpCountN;
            countEl.textContent = data.rsvpCount + ' ' + lbl;
          }
        }).catch(function () { rsvpBtn.disabled = false; });
      });
    }
    var shareBtn = panel.querySelector('[data-ann-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var shareUrl = window.location.origin + archiveHref + '#ann-' + featured.id;
        var shareData = { title: shareBtn.getAttribute('data-ann-share-title'), text: shareBtn.getAttribute('data-ann-share-text'), url: shareUrl };
        if (navigator.share) {
          navigator.share(shareData).catch(function () { /* user cancelled — no error state needed */ });
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(function () {
            var label = shareBtn.querySelector('span');
            if (!label) return;
            var original = label.textContent;
            label.textContent = t.shareCopied;
            setTimeout(function () { label.textContent = original; }, 2200);
          }).catch(function () { /* clipboard unavailable — link remains visible in the address bar's share sheet on most browsers */ });
        }
      });
    }
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
        var isEvent = !!featured.eventDate;
        content.innerHTML =
          '<div class="ann-hero-media">' + (featured.imageUrl ? '<img src="' + escapeHtml(featured.imageUrl) + '" alt="" loading="lazy">' : '') + '</div>' +
          '<div class="ann-hero-body">' +
          '<span class="ann-hero-cat">' + escapeHtml(catLabel(featured.category)) + '</span>' +
          '<h3>' + escapeHtml(featured.title) + '</h3>' +
          '<p class="ann-hero-summary">' + escapeHtml(featured.summary) + '</p>' +
          (metaBits.length ? '<div class="ann-hero-meta">' + metaBits.join('') + '</div>' : '') +
          '<div class="ann-hero-actions">' +
          (featured.actionUrl && featured.actionLabel ? '<a class="btn btn-gold" href="' + escapeHtml(featured.actionUrl) + '">' + escapeHtml(featured.actionLabel) + '</a>' : '') +
          (isEvent ? renderRsvpButton(featured) : '') +
          renderShareButton(featured) +
          '</div>' +
          '</div>';
        panel.classList.add('has-content');
        wireRsvpAndShare(panel, archiveHref, featured);
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
        (item.status === 'archived' ? renderGallery(item) : '') +
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
