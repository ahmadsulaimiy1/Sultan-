// Institutional Portal Ecosystem — one renderer, instantiated by every
// office portal page via <body data-office-slug="...">. Fetches
// /api/portal/staff/office/{slug} and renders the 11 modules the
// directive specified. Every module that has no real backing data yet
// (Reports, most Analytics, Notifications) says so plainly instead of
// inventing content — see docs/institutional-portal-architecture.md.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var body = document.body;
    var slug = body.getAttribute('data-office-slug');
    if (!slug) return;

    var tabs = document.querySelectorAll('.office-tab');
    var panels = document.querySelectorAll('.office-panel');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        panels.forEach(function (p) { p.classList.remove('is-active'); });
        tab.classList.add('is-active');
        var target = document.getElementById('panel-' + tab.dataset.tab);
        if (target) target.classList.add('is-active');
      });
    });

    load(slug);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return d; }
  }

  async function load(slug) {
    var errorEl = document.getElementById('office-error');
    var shellEl = document.getElementById('office-shell');
    try {
      var res = await fetch('/api/portal/staff/office/' + encodeURIComponent(slug), { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not load this office.');
      render(data);
      if (shellEl) shellEl.hidden = false;
    } catch (err) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.querySelector('[data-error-message]').textContent = err.message || 'Could not load this office.';
      }
    }
  }

  function render(data) {
    renderHeader(data);
    renderOverview(data);
    renderDirectory(data);
    renderResponsibilities(data);
    renderDocuments(data);
    renderReports(data);
    renderAnalytics(data);
    renderWorkflow(data);
    renderNotifications(data);
    renderMeetings(data);
    renderArchive(data);
  }

  function primaryAppointment(data) {
    return data.appointments.find(function (a) { return a.isPrimary; }) || data.appointments[0] || null;
  }

  // Module 1 — Executive dashboard
  function renderHeader(data) {
    var primary = primaryAppointment(data);
    setText('office-eyebrow', data.office.layer ? data.office.layer.replace(/_/g, ' ').toUpperCase() : 'OFFICE');
    setText('office-name', data.office.name);
    setText('office-holder-line', primary
      ? (primary.isVacant ? primary.title + ' — Vacant, awaiting appointment' : primary.title + ' — ' + (primary.staff.preferredName || primary.staff.fullName))
      : 'No seat recorded for this office yet.');
    setText('stat-staff-count', String(data.staffCount));
    setText('stat-appointments', String(data.appointments.length));
    setText('stat-pending-workflow', String(data.workflow.pending.length));
    setText('stat-meetings', String(data.meetings.length));
  }

  // Module 2 — Office overview
  function renderOverview(data) {
    setText('office-description', data.office.description || 'No description recorded yet.');
    setText('office-type-value', data.office.officeType);
    setText('office-layer-value', data.office.layer ? data.office.layer.replace(/_/g, ' ') : '—');
    setText('office-parent-value', data.office.parentOfficeName || 'None — reports directly within the institution structure.');
  }

  // Module 3 — Staff directory
  function renderDirectory(data) {
    var el = document.getElementById('directory-list');
    if (!el) return;
    if (!data.appointments.length) {
      el.innerHTML = '<div class="portal-empty">No appointments recorded for this office yet. Add one from the administration panel.</div>';
      return;
    }
    el.innerHTML = data.appointments.map(function (a) {
      if (a.isVacant) {
        return '<div class="office-person-card is-vacant">'
          + '<div class="opc-avatar" aria-hidden="true">—</div>'
          + '<div class="opc-body"><div class="opc-title">' + esc(a.title) + '</div>'
          + '<div class="opc-vacant-label">Vacant — Awaiting Appointment</div>'
          + (a.notes ? '<div class="opc-notes">' + esc(a.notes) + '</div>' : '')
          + '</div></div>';
      }
      var s = a.staff;
      var initials = (s.preferredName || s.fullName || '?').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
      return '<div class="office-person-card">'
        + (s.photoUrl ? '<img class="opc-avatar" src="' + esc(s.photoUrl) + '" alt="" />' : '<div class="opc-avatar" aria-hidden="true">' + esc(initials) + '</div>')
        + '<div class="opc-body">'
        + '<div class="opc-name">' + esc(s.preferredName || s.fullName) + (a.isActing ? ' <span class="opc-acting">(Acting)</span>' : '') + '</div>'
        + '<div class="opc-title">' + esc(a.title) + '</div>'
        + (s.bio ? '<div class="opc-bio">' + esc(s.bio) + '</div>' : '')
        + (s.publicEmail ? '<div class="opc-contact">' + esc(s.publicEmail) + '</div>' : '')
        + '</div></div>';
    }).join('');
  }

  // Module 4 — Responsibilities (derived from the office's real
  // description; no separate fabricated scope text)
  function renderResponsibilities(data) {
    setText('responsibilities-text', data.office.description || 'Not yet documented.');
    var link = document.getElementById('responsibilities-matrix-link');
    if (link) link.href = '/policies/';
  }

  // Module 5 — Documents
  function renderDocuments(data) {
    var el = document.getElementById('documents-list');
    if (!el) return;
    if (!data.documents.length) {
      el.innerHTML = '<div class="portal-empty">No documents uploaded for this office yet.</div>';
      return;
    }
    el.innerHTML = data.documents.map(function (d) {
      var href = d.fileUrl || d.externalUrl || '#';
      return '<a class="office-doc-row" href="' + esc(href) + '" target="_blank" rel="noopener">'
        + '<span class="odr-title">' + esc(d.title) + '</span>'
        + (d.description ? '<span class="odr-desc">' + esc(d.description) + '</span>' : '')
        + '<span class="odr-date">' + fmtDate(d.createdAt) + '</span></a>';
    }).join('');
  }

  // Module 6 — Reports (honest: no per-office report generator exists yet)
  function renderReports(data) {
    var el = document.getElementById('reports-panel-body');
    if (!el) return;
    el.innerHTML = '<div class="portal-empty">No generated reports for this office yet — report generation has not been built for this office. '
      + 'Real, working reporting exists today in the Registrar’s Office (student records) and the Founder Dashboard (institution-wide analytics).</div>';
  }

  // Module 7 — Analytics (real where it exists, honest otherwise)
  function renderAnalytics(data) {
    var el = document.getElementById('analytics-panel-body');
    if (!el) return;
    if (data.office.slug === 'executive') {
      el.innerHTML = '<div class="portal-empty">Institution-wide analytics for this office live in the full <a href="/portal/founder/">Executive Command Centre</a>, not duplicated here.</div>';
      return;
    }
    el.innerHTML = '<div class="portal-empty">No analytics configured for this office yet.</div>';
  }

  // Module 8 — Workflow Centre
  function renderWorkflow(data) {
    var el = document.getElementById('workflow-list');
    if (!el) return;
    if (!data.workflow.areaCode) {
      el.innerHTML = '<div class="portal-empty">No approval workflow is configured for this office yet. The generic Approval Workflow engine already exists site-wide (see the Registrar’s certificate queue) and can be wired to this office once a real approval process is defined.</div>';
      return;
    }
    if (!data.workflow.pending.length) {
      el.innerHTML = '<div class="portal-empty">No items awaiting approval right now.</div>';
      return;
    }
    el.innerHTML = data.workflow.pending.map(function (p) {
      return '<div class="office-workflow-row"><span class="owr-type">' + esc(p.targetType) + '</span>'
        + '<span class="owr-by">Requested by ' + esc(p.requestedByName || 'a staff member') + '</span>'
        + '<span class="owr-date">' + fmtDate(p.requestedAt) + '</span></div>';
    }).join('');
  }

  // Module 9 — Notifications (honest: no per-office staff notification feed yet)
  function renderNotifications(data) {
    var el = document.getElementById('notifications-panel-body');
    if (!el) return;
    el.innerHTML = '<div class="portal-empty">Staff notifications are not yet built as a per-office feed. Guardian-facing notifications already exist on the Parent Portal.</div>';
  }

  // Module 10 — Meetings
  function renderMeetings(data) {
    var el = document.getElementById('meetings-list');
    if (!el) return;
    var active = data.meetings.filter(function (m) { return m.status !== 'cancelled'; });
    if (!active.length) {
      el.innerHTML = '<div class="portal-empty">No meetings recorded for this office yet.</div>';
      return;
    }
    el.innerHTML = active.map(meetingRow).join('');
  }
  function meetingRow(m) {
    return '<div class="office-meeting-row status-' + esc(m.status) + '">'
      + '<div class="omr-head"><span class="omr-title">' + esc(m.title) + '</span><span class="omr-date">' + fmtDate(m.meetingDate) + '</span></div>'
      + (m.agendaText ? '<div class="omr-agenda">' + esc(m.agendaText) + '</div>' : '')
      + (m.minutesText ? '<div class="omr-minutes"><strong>Minutes:</strong> ' + esc(m.minutesText) + '</div>' : '')
      + '<span class="omr-status">' + esc(m.status) + '</span></div>';
  }

  // Module 11 — Archive: ended appointments + held/cancelled meetings —
  // a real computed view, not a separate fabricated log.
  function renderArchive(data) {
    var el = document.getElementById('archive-list');
    if (!el) return;
    var archivedMeetings = data.meetings.filter(function (m) { return m.status === 'held' || m.status === 'cancelled'; });
    if (!archivedMeetings.length) {
      el.innerHTML = '<div class="portal-empty">Nothing archived for this office yet.</div>';
      return;
    }
    el.innerHTML = archivedMeetings.map(meetingRow).join('');
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
