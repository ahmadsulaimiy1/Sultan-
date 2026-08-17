/* ===========================================================================
   ACADEMIC INTELLIGENCE — the dashboard's live charts
   ===========================================================================

   Listens for the payload portal-dashboard.js already fetched (one request,
   one source of truth) and draws from it.

   EVERY SERIES HERE IS REAL. attendance, fees, term_results and the Qur'an
   count all come from the database rows the API returns. Where a child has no
   record yet the chart renders an empty state naming what is missing rather
   than a placeholder curve — a parent looking at an attendance line has no
   way to tell an illustration from a record, and a portal shown to
   accreditation panels cannot afford the ambiguity. Where the API marks a
   payload isSampleData, every card says so on its face.
   =========================================================================== */
(function () {
  'use strict';

  var C = window.SHRSChart;
  if (!C) return;

  var GOLD = '#B08D45', COFFEE = '#4E3B22', STEEL = '#5B7A94', CHAMP = '#E3C88A';

  function mount(id) { return document.querySelector('[data-cmd-chart="' + id + '"]'); }

  /* Terms are ordered by what they are, never by the order the API returned
     them in: the query sorts by updated_at, so row zero is the most recently
     EDITED result, which is not the same thing as the latest term. */
  var TERM_RANK = { first: 1, second: 2, third: 3 };
  function termRank(t) {
    return TERM_RANK[String(t || '').toLowerCase().split(' ')[0]] || 99;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function setText(id, v) {
    var n = document.querySelector('[data-cmd-stat="' + id + '"]');
    if (n) n.textContent = v;
  }

  function sampleFlag(on) {
    if (!on) return;
    document.querySelectorAll('[data-cmd-sample]').forEach(function (n) {
      n.textContent = 'Sample data — not a live record';
      n.hidden = false;
    });
  }

  /* Attendance: present against the days actually recorded this term. */
  function attendance(children) {
    var m = mount('attendance');
    if (!m) return;
    var rec = children.filter(function (c) {
      return c.attendance && Number(c.attendance.days_total) > 0;
    });
    if (!rec.length) {
      C.empty(m, 'Attendance not yet recorded',
        'The register for this term has not been posted. This meter fills the ' +
        'day the first mark is entered.');
      setText('attendance', '—');
      return;
    }
    var present = rec.reduce(function (a, c) { return a + Number(c.attendance.days_present || 0); }, 0);
    var total = rec.reduce(function (a, c) { return a + Number(c.attendance.days_total || 0); }, 0);
    var pct = Math.round((present / total) * 100);
    C.ring(m, {
      value: pct, max: 100, color: pct >= 90 ? GOLD : (pct >= 75 ? CHAMP : STEEL),
      display: pct + '%', sub: present + ' of ' + total + ' days',
      title: 'Attendance', size: 148
    });
    setText('attendance', pct + '%');
    setText('attendance-note', rec.length > 1
      ? 'Across ' + rec.length + ' children · ' + (rec[0].attendance.term || 'this term')
      : (rec[0].attendance.term || 'This term'));
  }

  /* Fees: what has been paid against what was billed. Composition, so a
     donut — the two parts are a whole, which a line could not show. */
  function fees(children) {
    var m = mount('fees');
    if (!m) return;
    var billed = 0, paid = 0, any = false;
    children.forEach(function (c) {
      if (!c.fees) return;
      any = true;
      billed += Number(c.fees.amount_due || 0);
      paid += Number(c.fees.amount_paid || 0);
    });
    if (!any || billed <= 0) {
      C.empty(m, 'No fees billed', 'Nothing is outstanding. Invoices appear here once the bursary posts them.');
      setText('fees', '—');
      return;
    }
    var outstanding = Math.max(0, billed - paid);
    var fmt = function (v) {
      return '₦' + Number(v).toLocaleString('en-NG', { maximumFractionDigits: 0 });
    };
    C.donut(m, {
      segments: [
        { label: 'Paid', value: Math.round(paid), color: GOLD },
        { label: 'Outstanding', value: Math.round(outstanding), color: STEEL }
      ],
      display: Math.round((paid / billed) * 100) + '%',
      title: 'Fees', size: 148, stroke: 16, format: fmt
    });
    setText('fees', fmt(outstanding));
    setText('fees-note', outstanding > 0
      ? fmt(paid) + ' paid of ' + fmt(billed)
      : 'Settled in full — ' + fmt(paid));
  }

  /* Subject performance for the most recent term. One bar per subject, so a
     parent can see at a glance which subject is carrying and which is not. */
  function subjects(children) {
    var m = mount('subjects');
    if (!m) return;
    var rows = [];
    children.forEach(function (c) { (c.results || []).forEach(function (r) { rows.push(r); }); });
    if (!rows.length) {
      C.empty(m, 'No results published',
        'Subject scores appear here as soon as the term results are released ' +
        'by the Office of the Registrar.');
      return;
    }
    var latest = rows.map(function (r) { return r.term; })
      .sort(function (a, b) { return termRank(b) - termRank(a); })[0];
    var here = rows.filter(function (r) { return r.term === latest; });
    if (!here.length) here = rows;
    here = here.slice(0, 9);

    /* One subject is a point, not a performance. Drawing a line through it
       would produce an empty-looking chart frame, which reads as breakage. */
    if (here.length < 2) {
      C.empty(m, 'Only one subject published for ' + (latest || 'this term'),
        'The comparison draws itself once the rest of the subject scores are ' +
        'released.');
      setText('average', Math.round(Number(here[0].total_score)) + '%');
      setText('average-note', plural(1, 'subject', 'subjects') + ' · ' + (latest || ''));
      return;
    }
    C.line(m, {
      labels: here.map(function (r) { return r.subject; }),
      series: [{
        name: latest || 'Latest term',
        values: here.map(function (r) { return Number(r.total_score); }),
        color: GOLD
      }],
      min: 0, max: 100, px: 168, title: 'Subject performance — ' + (latest || ''),
      format: function (v) { return Math.round(v) + '%'; }
    });
    var avg = here.reduce(function (a, r) { return a + Number(r.total_score || 0); }, 0) / here.length;
    setText('average', Math.round(avg) + '%');
    setText('average-note', plural(here.length, 'subject', 'subjects') + ' · ' +
      (latest || 'latest term'));
  }

  /* Term trend — only drawn when there is more than one term to compare.
     A "trend" through a single point is a decoration, not a trend. */
  function trend(children) {
    var m = mount('trend');
    if (!m) return;
    var byTerm = {};
    children.forEach(function (c) {
      (c.results || []).forEach(function (r) {
        if (!r.term) return;
        (byTerm[r.term] = byTerm[r.term] || []).push(Number(r.total_score || 0));
      });
    });
    var terms = Object.keys(byTerm);
    if (terms.length < 2) {
      C.empty(m, 'One term on record',
        terms.length
          ? 'A trend needs at least two terms. This curve draws itself when the ' +
            'next set of results is published.'
          : 'Academic history appears here once results have been published.');
      return;
    }
    terms.sort(function (a, b) {
      var ra = termRank(a), rb = termRank(b);
      return ra === rb ? String(a).localeCompare(String(b)) : ra - rb;
    });
    C.line(m, {
      labels: terms,
      series: [{
        name: 'Term average',
        values: terms.map(function (t) {
          var v = byTerm[t];
          return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
        }),
        color: GOLD
      }],
      min: 0, max: 100, px: 168, title: 'Academic trend',
      format: function (v) { return Math.round(v) + '%'; }
    });
  }

  /* Qur'an memorisation against the thirty ajzāʾ. */
  function quran(children) {
    var m = mount('quran');
    if (!m) return;
    var juz = children.reduce(function (a, c) { return a + Number(c.juzVerifiedCount || 0); }, 0);
    if (!juz) {
      C.empty(m, 'No juzʾ verified yet',
        'Verified memorisation is recorded by the Qurʾan College and appears here.');
      setText('quran', '—');
      return;
    }
    C.ring(m, {
      value: Math.min(juz, 30), max: 30, color: CHAMP,
      display: juz + '/30', sub: 'ajzāʾ verified', title: 'Qurʾan', size: 148
    });
    setText('quran', String(juz));
  }

  function render(data) {
    var children = data.children || [];
    sampleFlag(!!data.isSampleData ||
      children.some(function (c) { return c.isSampleData; }));

    try { attendance(children); } catch (e) { console.error('[charts] attendance', e); }
    try { fees(children); }       catch (e) { console.error('[charts] fees', e); }
    try { subjects(children); }   catch (e) { console.error('[charts] subjects', e); }
    try { trend(children); }      catch (e) { console.error('[charts] trend', e); }
    try { quran(children); }      catch (e) { console.error('[charts] quran', e); }

    var section = document.querySelector('[data-cmd-intelligence]');
    if (section) section.hidden = false;
    // The panel was display:none until now, so its cards have never been
    // observed. Without this they stay at opacity 0 — invisible, not merely
    // un-animated.
    if (C.reveal) C.reveal();
  }

  document.addEventListener('shrs:portal-data', function (ev) {
    if (ev.detail) render(ev.detail);
  });
})();
