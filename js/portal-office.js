// Institutional Portal Ecosystem — one renderer, instantiated by every
// office portal page via <body data-office-slug="...">. Fetches
// /api/portal/staff/office/{slug} and renders the 11 original modules
// plus the Level 3 Institutional Framework additions (Strategic
// Priorities, Annual Objectives, Committees, Resolutions, KPI shells).
// Every module that has no real backing data yet (Reports, most
// Analytics, Notifications) says so plainly instead of inventing
// content — see docs/institutional-portal-architecture.md. Strategic
// Priorities/Annual Objectives are the one exception with a middle
// state: a clearly-labelled generic TEMPLATE (never asserted as real)
// shown until an admin sets the office's actual adopted content.
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
    renderCommittees(data);
    renderDirectory(data);
    renderResponsibilities(data);
    renderStrategicPriorities(data);
    renderAnnualObjectives(data);
    renderDocuments(data);
    renderReports(data);
    renderAnalytics(data);
    renderWorkflow(data);
    renderNotifications(data);
    renderMeetings(data);
    renderResolutions(data);
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

  // Committees — only rendered (and the block only shown) for offices
  // that actually have committee sub-offices, e.g. Board of Trustees.
  function renderCommittees(data) {
    var section = document.getElementById('committees-section');
    var el = document.getElementById('committees-list');
    if (!section || !el) return;
    if (!data.committees || !data.committees.length) { section.hidden = true; return; }
    section.hidden = false;
    el.innerHTML = data.committees.map(function (c) {
      return '<a class="office-committee-card" href="/portal/office/' + esc(c.slug) + '/">'
        + '<span class="occ-name">' + esc(c.name) + '</span>'
        + '<span class="occ-meta">View committee &rarr;</span></a>';
    }).join('');
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

  // Strategic Priorities / Annual Objectives — a real, admin-editable
  // field per office (offices.strategic_priorities/annual_objectives).
  // NULL is the default state for every office right now, so this
  // renders a generic, clearly-labelled planning scaffold instead of a
  // blank tab — it is explicitly NOT institution-specific content, and
  // says so. Once an admin sets the real field via
  // update-office-content, that replaces the template with no redesign.
  function genericPriorities(officeName) {
    return [
      'Maintain accurate, up-to-date records for ' + officeName + '’s activities and communicate them clearly to staff and stakeholders.',
      'Align ' + officeName + '’s work with the wider institutional strategy set by the Executive and Board of Trustees.',
      'Identify and close the highest-priority gaps in ' + officeName + '’s current operations.',
    ];
  }
  function genericObjectives(officeName) {
    return [
      'Complete a full review of ' + officeName + '’s current responsibilities and confirm them with the Executive.',
      'Establish real, working meeting and reporting rhythms for ' + officeName + '.',
      'Set the first set of institution-specific, adopted priorities to replace this template.',
    ];
  }
  function renderTemplateField(panelBodyId, storedValue, generatedList) {
    var el = document.getElementById(panelBodyId);
    if (!el) return;
    if (storedValue) {
      el.innerHTML = '<ul class="priority-list">' + String(storedValue).split(/\n+/).filter(Boolean).map(function (line) {
        return '<li class="priority-item is-adopted">' + esc(line) + '</li>';
      }).join('') + '</ul>';
      return;
    }
    el.innerHTML = '<span class="template-framework-badge">Template &mdash; Pending Adoption</span>'
      + '<p class="template-framework-note">This is a generic institutional planning scaffold, generated for structural completeness. It has not been reviewed or adopted by this office or the Board of Trustees. Real, adopted content will replace it once set through the administration panel.</p>'
      + '<ul class="priority-list">' + generatedList.map(function (line) {
        return '<li class="priority-item">' + esc(line) + '</li>';
      }).join('') + '</ul>';
  }
  function renderStrategicPriorities(data) {
    renderTemplateField('priorities-panel-body', data.office.strategicPriorities, genericPriorities(data.office.name));
  }
  function renderAnnualObjectives(data) {
    renderTemplateField('objectives-panel-body', data.office.annualObjectives, genericObjectives(data.office.name));
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

  // Module 7 — Analytics (real where it exists; a labelled KPI-widget
  // shell — not invented numbers — everywhere else, per the Founder &
  // CEO's Level 3 framework directive: the visual framework should
  // exist even before real figures do).
  var KPI_SHELL_LABELS = ['Active Items', 'This Month', 'Pending Review', 'Completion Rate'];
  function kpiGraphShell() {
    return '<div class="kpi-graph-shell" aria-hidden="true"><span style="height:22%"></span><span style="height:38%"></span>'
      + '<span style="height:18%"></span><span style="height:44%"></span><span style="height:26%"></span></div>';
  }
  function renderAnalytics(data) {
    var el = document.getElementById('analytics-panel-body');
    if (!el) return;
    if (data.office.slug === 'executive') {
      el.innerHTML = '<div class="portal-empty">Institution-wide analytics for this office live in the full <a href="/portal/founder/">Executive Command Centre</a>, not duplicated here.</div>';
      return;
    }
    var grid = '<div class="kpi-grid">' + KPI_SHELL_LABELS.map(function (label) {
      return '<div class="kpi-tile"><div class="kpi-label">' + esc(label) + '</div>'
        + '<div class="kpi-value is-placeholder">No data available</div>' + kpiGraphShell() + '</div>';
    }).join('') + '</div>';
    el.innerHTML = grid + '<div class="portal-empty">These are placeholder KPI slots, not real figures &mdash; no analytics pipeline is configured for this office yet. Real, working analytics exist today in the Founder Dashboard (institution-wide) and the Registrar/Finance offices (their own real data).</div>';
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

  // Resolutions — a governance-register concept, so the tab itself is
  // only shown for governance-layer offices (Board of Trustees and its
  // committees); everywhere else it's hidden entirely rather than
  // shown as a meaningless empty tab.
  function renderResolutions(data) {
    var tabBtn = document.querySelector('.office-tab[data-tab="resolutions"]');
    if (tabBtn) tabBtn.hidden = data.office.officeType !== 'governance';
    var el = document.getElementById('resolutions-list');
    if (!el) return;
    if (!data.resolutions || !data.resolutions.length) {
      el.innerHTML = '<div class="portal-empty">No resolutions recorded for this office yet.</div>';
      return;
    }
    el.innerHTML = data.resolutions.map(function (r) {
      return '<div class="office-resolution-row status-' + esc(r.status) + '">'
        + (r.resolutionNumber ? '<span class="orr-number">' + esc(r.resolutionNumber) + '</span>' : '')
        + '<span class="orr-title">' + esc(r.title) + '</span>'
        + '<span class="orr-status">' + esc(r.status) + '</span>'
        + (r.summaryText ? '<span class="orr-summary">' + esc(r.summaryText) + '</span>' : '') + '</div>';
    }).join('');
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
