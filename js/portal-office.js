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

  var PREFERS_REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Prestige Foundation Phase 1, Item 2 (Founder Override Directive):
  // "Six Different Institutional Command Centres," not the Founder
  // dashboard copied six times. Each School Leadership office gets its
  // own mental rename, role-specific greeting, and real-data intelligence
  // summary — never a generic "Welcome back." Crest icons reuse the exact
  // paths already used for each office's own eyebrow icon (see the
  // office's own HTML), so the arrival moment and the resting page read
  // as one identity, not two.
  var PERSONALITY = {
    'head-teacher': {
      tagline: 'Basic Education Operations Centre',
      greeting: 'Basic education operations are active.',
      icon: '<path d="M4 5c2-1.2 5-1.2 8 0v13c-3-1.2-6-1.2-8 0V5zM20 5c-2-1.2-5-1.2-8 0v13c3-1.2 6-1.2 8 0V5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
      summary: function (ops) {
        if (!ops) return null;
        var parts = [ops.students.total + ' pupils'];
        if (ops.attendance.averagePercent != null) parts.push(ops.attendance.averagePercent + '% attendance');
        parts.push(ops.admissionsPipeline.total + ' in admissions pipeline');
        return parts.join(' · ');
      },
    },
    'principal-royal-college': {
      tagline: 'Royal College Academic Command Centre',
      greeting: 'Academic operations are active.',
      icon: '<path d="M12 6L2 10l10 4 10-4-10-4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 12v4.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
      summary: function (ops) {
        if (!ops) return null;
        var parts = [ops.students.total + ' students'];
        if (ops.attendance.averagePercent != null) parts.push(ops.attendance.averagePercent + '% attendance');
        return parts.join(' · ');
      },
    },
    raees: {
      tagline: 'Islamic Academic Leadership Centre',
      greeting: 'Academic leadership systems are ready.',
      typewriterLines: ['Academic leadership systems operational.', 'Arabic and Islamic studies intelligence updated.'],
      icon: '<path d="M15 4a8 8 0 100 16 7 7 0 010-16z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
      summary: function (ops) {
        if (!ops) return null;
        return ops.students.total + ' students · ' + ops.staff.total + ' faculty';
      },
    },
    mudeer: {
      tagline: 'Qur’an Excellence Command Centre',
      greeting: 'Qur’an excellence systems are operational.',
      typewriterLines: ['Qur’an excellence systems operational.', 'Muraja’ah intelligence updated.'],
      icon: '<path d="M15 4a7 7 0 100 14 6 6 0 010-14z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M19 3.2l.6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2z" fill="currentColor" stroke="none"/>',
      summary: function (ops) {
        if (!ops) return null;
        if (ops.hifz) return ops.hifz.enrolledCount + ' Hifz-enrolled · ' + ops.hifz.ijazahsCurrentlyGranted + ' Ijazah(s) granted';
        return ops.students.total + ' students';
      },
    },
  };

  // Imperial Luxury Experience Directive — Ra'ees and Mudeer carry an
  // exact scripted multi-line typewriter greeting (see typewriterLines
  // above); Head Teacher and Principal keep their existing single-line
  // instant greeting since no scripted lines were given for those two.
  function renderPersonality(slug, data) {
    var personality = PERSONALITY[slug];
    if (!personality) return;
    var taglineEl = document.getElementById('cc-tagline');
    var greetingEl = document.getElementById('cc-greeting');
    if (taglineEl) taglineEl.textContent = personality.tagline;
    if (!greetingEl) return;
    if (personality.typewriterLines && window.SHRSExecArrival && window.SHRSExecArrival.typewriteChain) {
      var typeKey = 'shrs_typewriter_' + slug;
      if (!sessionStorage.getItem(typeKey)) {
        sessionStorage.setItem(typeKey, '1');
        window.SHRSExecArrival.typewriteChain(greetingEl, personality.typewriterLines, { pause: 850 });
        return;
      }
      greetingEl.textContent = personality.typewriterLines[personality.typewriterLines.length - 1];
      return;
    }
    greetingEl.textContent = personality.greeting;
  }

  // Executive Arrival Sequence — restrained, not cinematic: title, then a
  // role-specific greeting, then a one-line real intelligence summary
  // (never shown if the office has no operations data yet), then the
  // dashboard itself reveals via the existing staggered on-load animation.
  // Total runtime ~2.4s, matching the Founder Command Centre's own
  // arrival sequence exactly (same CSS keyframes, this office's own
  // atmosphere colour via --atmos-bright). Plays once per browser session
  // per office, and is skipped entirely under prefers-reduced-motion.
  function playArrivalSequence(slug, data) {
    if (PREFERS_REDUCED_MOTION) return;
    var personality = PERSONALITY[slug];
    if (!personality) return;
    var key = 'shrs_office_arrival_' + slug;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    var summary = personality.summary ? personality.summary(data.operations) : null;
    var overlay = document.createElement('div');
    overlay.className = 'exec-arrival';
    overlay.innerHTML =
      '<div class="exec-arrival-crest" aria-hidden="true"><svg viewBox="0 0 24 24" width="64" height="64">' + personality.icon + '</svg></div>' +
      '<div class="exec-arrival-lines">' +
        '<div class="exec-arrival-line l1">' + esc(data.office.name) + '</div>' +
        '<div class="exec-arrival-line l2">' + esc(personality.tagline) + '</div>' +
        '<div class="exec-arrival-line l3">' + esc(personality.greeting) + '</div>' +
      '</div>' +
      (summary ? '<div class="exec-arrival-summary">' + esc(summary) + '</div>' : '');
    document.body.appendChild(overlay);
    overlay.addEventListener('animationend', function (e) { if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); });
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 2800);
  }

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
    var skeletonEl = document.getElementById('office-skeleton');
    try {
      var res = await fetch('/api/portal/staff/office/' + encodeURIComponent(slug), { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not load this office.');
      render(data);
      playArrivalSequence(slug, data);
      if (skeletonEl) skeletonEl.hidden = true;
      if (shellEl) shellEl.hidden = false;
      // Operations Centre, where it exists, is the real answer to "what
      // requires attention right now" for these four offices — it opens
      // by default instead of the generic Dashboard tab.
      if (data.operations) {
        var opsTab = document.querySelector('.office-tab[data-tab="operations"]');
        if (opsTab) opsTab.click();
      }
    } catch (err) {
      if (skeletonEl) skeletonEl.hidden = true;
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.querySelector('[data-error-message]').textContent = err.message || 'Could not load this office.';
      }
    }
  }

  function render(data) {
    renderPersonality(data.office.slug, data);
    renderHeader(data);
    renderOperations(data);
    renderOverview(data);
    renderCommittees(data);
    renderDirectory(data);
    renderResponsibilities(data);
    renderStrategicPriorities(data);
    renderAnnualObjectives(data);
    renderDocuments(data);
    renderMessages(data);
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
    setTextAnimated('stat-staff-count', String(data.staffCount));
    setTextAnimated('stat-appointments', String(data.appointments.length));
    setTextAnimated('stat-pending-workflow', String(data.workflow.pending.length));
    setTextAnimated('stat-meetings', String(data.meetings.length));
  }

  // Operations Centre — real, institution-scoped daily-operations data
  // for the four School Leadership offices (see functions/api/portal/
  // staff/office/[slug].js's `operations` field). Hidden entirely for
  // every other office, since they have no single matching institution
  // to scope by.
  function operationsStatTile(label, value) {
    var tile = document.createElement('div');
    tile.className = 'exec-stat';
    var l = document.createElement('div'); l.className = 'exec-stat-label'; l.textContent = label;
    var v = document.createElement('div'); v.className = 'exec-stat-value';
    tile.appendChild(l); tile.appendChild(v);
    if (window.SHRSExecArrival && window.SHRSExecArrival.animateValue) window.SHRSExecArrival.animateValue(v, value);
    else v.textContent = value;
    return tile;
  }
  function renderOperations(data) {
    var tabBtn = document.querySelector('.office-tab[data-tab="operations"]');
    var ops = data.operations;
    if (tabBtn) tabBtn.hidden = !ops;
    if (!ops) return;

    var statsEl = document.getElementById('operations-stats');
    statsEl.innerHTML = '';
    statsEl.appendChild(operationsStatTile('Active Students', String(ops.students.total)));
    statsEl.appendChild(operationsStatTile('Staff', String(ops.staff.total)));
    statsEl.appendChild(operationsStatTile('Attendance', ops.attendance.averagePercent != null ? ops.attendance.averagePercent + '%' : '—'));
    statsEl.appendChild(operationsStatTile('Admissions in Pipeline', String(ops.admissionsPipeline.total)));

    var hifzSection = document.getElementById('operations-hifz-section');
    if (ops.hifz) {
      hifzSection.hidden = false;
      var hifzStatsEl = document.getElementById('operations-hifz-stats');
      hifzStatsEl.innerHTML = '';
      hifzStatsEl.appendChild(operationsStatTile('Hifz-Enrolled', String(ops.hifz.enrolledCount)));
      hifzStatsEl.appendChild(operationsStatTile('Ijazahs Granted', String(ops.hifz.ijazahsCurrentlyGranted)));
      hifzStatsEl.appendChild(operationsStatTile('Awaiting Examination', String(ops.hifz.awaitingExamination)));
      var hifzBarsEl = document.getElementById('operations-hifz-bars');
      hifzBarsEl.innerHTML = '';
      var maxStage = Math.max.apply(null, ops.hifz.stageBreakdown.map(function (s) { return s.count; }).concat([1]));
      ops.hifz.stageBreakdown.forEach(function (s) {
        var row = document.createElement('div');
        row.style.cssText = 'font-size:0.82rem;padding:4px 0;';
        var pct = maxStage > 0 ? Math.max(3, Math.round((s.count / maxStage) * 100)) : 0;
        row.innerHTML = '<div style="color:var(--ink);font-weight:600;margin-bottom:4px;">Stage ' + s.stageNumber + ' — ' + esc(s.label) + ' — ' + s.count + '</div>'
          + '<div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--gold) 0%,var(--gold-bright) 100%);"></div></div>';
        hifzBarsEl.appendChild(row);
      });
    } else {
      hifzSection.hidden = true;
    }

    var ADMISSIONS_LABEL = { submitted: 'Submitted', under_review: 'Under Review', waitlisted: 'Waitlisted', offered: 'Offered', admitted: 'Admitted', declined: 'Declined', withdrawn: 'Withdrawn' };
    var admissionsEl = document.getElementById('operations-admissions');
    admissionsEl.innerHTML = '';
    if (!ops.admissionsPipeline.total) {
      admissionsEl.innerHTML = '<div class="portal-empty">No admissions applications on file for this school yet.</div>';
    } else {
      Object.keys(ADMISSIONS_LABEL).forEach(function (key) {
        var count = ops.admissionsPipeline.byStatus[key];
        if (!count) return;
        var tile = document.createElement('div');
        tile.className = 'portal-stat';
        tile.innerHTML = '<div class="label">' + ADMISSIONS_LABEL[key] + '</div><div class="value">' + count + '</div>';
        admissionsEl.appendChild(tile);
      });
    }

    // Institutional Capability Frameworks — the Leadership Dashboards
    // retrofit. Each card shows Framework status / Records count /
    // Assigned staff / Last update / Compliance state / Action required,
    // exactly per the Founder's "Leadership Dashboards" directive,
    // instead of leaving these listed as "Not Yet Tracked" now that real
    // infrastructure backs them. A viewer without View rights for that
    // area (e.g. non-DSL staff and Safeguarding) sees a restricted card
    // confirming the framework exists without any record/compliance
    // detail — the same confidentiality-by-omission rule the framework's
    // own page enforces.
    var frameworksSection = document.getElementById('operations-frameworks-section');
    var frameworksEl = document.getElementById('operations-frameworks');
    if (frameworksSection && frameworksEl) {
      frameworksEl.innerHTML = '';
      var frameworks = ops.operationalFrameworks || [];
      if (!frameworks.length) {
        frameworksSection.hidden = true;
      } else {
        frameworksSection.hidden = false;
        frameworks.forEach(function (fw) {
          var card = document.createElement('div');
          card.className = 'registrar-approval-card';
          var head = document.createElement('div');
          head.className = 'registrar-approval-head';
          head.innerHTML = '<span>' + esc(fw.label) + '</span>';
          var badge = document.createElement('span');
          badge.className = 'registrar-sample-badge';
          badge.textContent = fw.status;
          head.appendChild(badge);
          card.appendChild(head);
          if (fw.restricted) {
            card.appendChild(makeMetaRow(fw.restrictedNote || 'Detail is restricted to the owning role.'));
          } else {
            card.appendChild(makeMetaRow('Current Records: ' + fw.recordsCount + '  ·  Assigned Staff: ' + fw.assignedStaff));
            card.appendChild(makeMetaRow('Last Update: ' + (fw.lastUpdate ? formatDate(fw.lastUpdate) : 'No activity yet')));
            card.appendChild(makeMetaRow('Compliance State: ' + fw.complianceState));
            card.appendChild(makeMetaRow('Action Required: ' + fw.actionRequired));
          }
          var link = document.createElement('a');
          link.className = 'portal-back-link';
          link.href = fw.href;
          link.textContent = 'Open ' + fw.label + ' →';
          link.style.cssText = 'display:inline-block;margin-top:6px;';
          card.appendChild(link);
          frameworksEl.appendChild(card);
        });
      }
    }

    var notTrackedEl = document.getElementById('operations-not-tracked');
    notTrackedEl.innerHTML = '';
    if (!ops.notYetTracked.length) {
      notTrackedEl.innerHTML = '<div class="portal-empty" style="padding:0 26px 20px;">Nothing outstanding.</div>';
    } else {
      ops.notYetTracked.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'pfd-unavailable-row';
        row.style.padding = '10px 26px';
        row.innerHTML = '<strong>' + esc(item.label) + '</strong> — ' + esc(item.reason);
        notTrackedEl.appendChild(row);
      });
    }
  }
  function makeMetaRow(text) {
    var row = document.createElement('div');
    row.className = 'registrar-approval-meta';
    row.textContent = text;
    return row;
  }
  function formatDate(iso) {
    try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return iso; }
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

  // Messages — real Institutional Messaging inbox for this office (see
  // functions/api/portal/staff/messages/*.js). Separate from the AI
  // Assistant widget; every thread here is a real family enquiry a
  // staff member reads and answers, gated on actually holding this
  // office (an appointment or a role/delegation grant scoped to it —
  // the same population the Office Switcher already shows).
  var MSG_STATUS_LABEL = { open: 'Awaiting Reply', answered: 'Answered', closed: 'Closed' };
  function renderMessages(data) {
    var el = document.getElementById('office-messages-body');
    if (!el) return;
    var officeId = data.office.id;
    fetch('/api/portal/staff/messages/list?officeId=' + encodeURIComponent(officeId), { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { threads: [] }; })
      .then(function (msgData) { renderMessagesList(el, officeId, msgData.threads || []); })
      .catch(function () { el.innerHTML = '<div class="portal-empty">Could not load messages right now.</div>'; });
  }
  function renderMessagesList(el, officeId, threads) {
    var badge = document.getElementById('messages-tab-badge');
    var needsReply = threads.filter(function (t) { return t.needsReply; }).length;
    if (badge) { badge.hidden = !needsReply; badge.textContent = String(needsReply); }
    if (!threads.length) {
      el.innerHTML = '<div class="portal-empty">No messages from families yet.</div>';
      return;
    }
    el.innerHTML = threads.map(function (t) {
      return '<button type="button" class="registrar-approval-row office-message-row" data-open-office-thread="' + t.id + '" style="width:100%;text-align:left;cursor:pointer;">'
        + '<div><strong>' + esc(t.subject) + '</strong><div class="meta">' + esc(t.guardianName) + ' &middot; ' + fmtDate(t.lastMessageAt) + '</div></div>'
        + '<span class="registrar-sample-badge" style="background:' + (t.needsReply ? 'rgba(180,140,30,0.9)' : t.status === 'closed' ? 'rgba(90,90,90,0.75)' : 'rgba(47,111,79,0.85)') + ';">'
        + esc(t.needsReply ? 'Needs Reply' : (MSG_STATUS_LABEL[t.status] || t.status)) + '</span></button>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('[data-open-office-thread]'), function (btn) {
      btn.addEventListener('click', function () { renderMessageThread(el, officeId, Number(btn.getAttribute('data-open-office-thread'))); });
    });
  }
  function renderMessageThread(el, officeId, threadId) {
    fetch('/api/portal/staff/messages/thread?id=' + threadId, { headers: { accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.thread) { renderMessages({ office: { id: officeId } }); return; }
        var t = data.thread;
        var messagesHtml = data.messages.map(function (m) {
          var who = m.senderType === 'guardian' ? esc(t.guardianName) : (m.staffName ? esc(m.staffName) : 'This office');
          return '<div class="registrar-timeline-item"><div class="meta">' + who + ' &middot; ' + fmtDate(m.createdAt) + '</div><p style="margin:4px 0 0;white-space:pre-wrap;">' + esc(m.body) + '</p></div>';
        }).join('');
        var replyHtml = t.status === 'closed'
          ? '<p class="registrar-hint">This thread is closed.</p>'
          : '<form data-office-reply-form class="registrar-form-grid">'
            + '<div class="portal-field registrar-field-wide"><label>Reply</label><textarea data-office-reply-body rows="3" maxlength="8000" required></textarea></div>'
            + '<div style="display:flex;gap:10px;">'
            + '<button type="submit" class="portal-submit registrar-form-submit" style="width:auto;">Send Reply</button>'
            + '<button type="button" class="registrar-btn-danger portal-submit" data-office-close-thread style="width:auto;">Close Thread</button>'
            + '</div><div class="registrar-form-result" data-office-reply-result hidden></div></form>';
        el.innerHTML = '<button type="button" class="portal-back-link" data-office-thread-back style="background:none;border:none;cursor:pointer;">&larr; All Messages</button>'
          + '<h3 style="margin:12px 0 2px;">' + esc(t.subject) + '</h3>'
          + '<div class="meta" style="padding:0 0 10px;">' + esc(t.guardianName) + ' (' + esc(t.guardianEmail) + ') &middot; ' + esc(MSG_STATUS_LABEL[t.status] || t.status) + '</div>'
          + '<div class="registrar-timeline">' + messagesHtml + '</div>'
          + '<div style="padding-top:12px;">' + replyHtml + '</div>';
        el.querySelector('[data-office-thread-back]').addEventListener('click', function () { renderMessages({ office: { id: officeId } }); });
        var form = el.querySelector('[data-office-reply-form]');
        if (form) {
          form.addEventListener('submit', function (e) {
            e.preventDefault();
            sendOfficeReply(el, officeId, threadId, form.querySelector('[data-office-reply-body]').value.trim(), false);
          });
          form.querySelector('[data-office-close-thread]').addEventListener('click', function () {
            sendOfficeReply(el, officeId, threadId, form.querySelector('[data-office-reply-body]').value.trim(), true);
          });
        }
      });
  }
  function sendOfficeReply(el, officeId, threadId, body, close) {
    fetch('/api/portal/staff/messages/reply', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId: threadId, body: body, close: close }),
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          var resultBox = el.querySelector('[data-office-reply-result]');
          if (resultBox) { resultBox.hidden = false; resultBox.textContent = res.data.error || 'Could not send that reply.'; }
          return;
        }
        renderMessageThread(el, officeId, threadId);
      });
  }

  // Module 6 — Executive Reporting System (Institutional Excellence 2030).
  // Real, period-bounded reports built from this office's own already-
  // real transactional/operational data (see functions/api/portal/staff
  // /reports.js) — never a second, fabricated set of numbers. Offices
  // with no such data honestly say so, same discipline as everywhere
  // else in this portal.
  var REPORT_MONEY_FMT = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
  function fmtMoney(n) { try { return REPORT_MONEY_FMT.format(n); } catch (e) { return '₦' + n; } }
  function fmtCount(n) { return (n || 0).toLocaleString('en-NG'); }

  function reportStatRow(items) {
    return '<div class="kpi-grid">' + items.map(function (it) {
      return '<div class="kpi-tile"><div class="kpi-value">' + esc(it.value) + '</div><div class="kpi-label">' + esc(it.label) + '</div></div>';
    }).join('') + '</div>';
  }

  function reportSectionHtml(slug, payload) {
    var d = payload.data;
    var sections = [];
    if (slug === 'finance' || d.finance) {
      var f = d.finance || d;
      sections.push(
        '<div class="office-group-head">Finance — ' + esc(payload.period.label) + '</div>' +
        reportStatRow([
          { label: 'Invoices Issued', value: fmtCount(f.invoicesIssued.count) },
          { label: 'Amount Invoiced', value: fmtMoney(f.invoicesIssued.totalAmount) },
          { label: 'Payments Received', value: fmtCount(f.paymentsReceived.count) },
          { label: 'Amount Collected', value: fmtMoney(f.paymentsReceived.totalAmount) },
        ]) +
        '<p class="portal-hello-sub" style="margin-top:10px;">' + fmtCount(f.outstandingInvoicesAsOfNow) + ' invoice(s) currently unpaid or partially paid, as of report generation.</p>'
      );
    }
    if (slug === 'registrar' || d.registrar) {
      var r = d.registrar || d;
      var lifecycleLabels = { enrolment: 'Enrolments', promotion: 'Promotions', transfer: 'Transfers', withdrawal: 'Withdrawals', graduation: 'Graduations', reinstatement: 'Reinstatements' };
      var lifecycleItems = Object.keys(lifecycleLabels).map(function (k) {
        return { label: lifecycleLabels[k], value: fmtCount(r.lifecycleEvents[k] || 0) };
      });
      sections.push(
        '<div class="office-group-head">Registrar — ' + esc(payload.period.label) + '</div>' +
        reportStatRow([{ label: 'Certificates Issued', value: fmtCount(r.certificatesIssued) }].concat(lifecycleItems))
      );
    }
    if (slug === 'admissions' || d.admissions) {
      var a = d.admissions || d;
      sections.push(
        '<div class="office-group-head">Admissions — ' + esc(payload.period.label) + '</div>' +
        reportStatRow([
          { label: 'Applications Received', value: fmtCount(a.applicationsReceived) },
          { label: 'Offered', value: fmtCount(a.decisionsRecorded.offered) },
          { label: 'Admitted', value: fmtCount(a.decisionsRecorded.admitted) },
          { label: 'Declined', value: fmtCount(a.decisionsRecorded.declined) },
        ])
      );
    }
    if (d.asOfNow && d.inPeriod) {
      var snap = d.asOfNow;
      var statItems = [
        { label: 'Students (as of now)', value: fmtCount(snap.students ? snap.students.total : snap.activeStudents) },
        { label: 'Staff (as of now)', value: fmtCount(snap.staff ? snap.staff.total : snap.activeStaff) },
      ];
      if (snap.attendanceAveragePercent != null) statItems.push({ label: 'Avg. Attendance', value: snap.attendanceAveragePercent + '%' });
      if (snap.hifzEnrolledCount != null) statItems.push({ label: 'Hifz-Enrolled', value: fmtCount(snap.hifzEnrolledCount) });
      sections.push('<div class="office-group-head">Institution Snapshot — as of report generation</div>' + reportStatRow(statItems));
      var lifecycleLabels2 = { enrolment: 'Enrolments', promotion: 'Promotions', transfer: 'Transfers', withdrawal: 'Withdrawals', graduation: 'Graduations', reinstatement: 'Reinstatements' };
      var flowItems = Object.keys(lifecycleLabels2).map(function (k) {
        return { label: lifecycleLabels2[k], value: fmtCount((d.inPeriod.lifecycleEvents || {})[k] || 0) };
      });
      flowItems.push({ label: 'Admissions Applications', value: fmtCount(d.inPeriod.admissionsApplicationsReceived) });
      sections.push('<div class="office-group-head">Activity — ' + esc(payload.period.label) + '</div>' + reportStatRow(flowItems));
    }
    return sections.join('');
  }

  function renderReports(data) {
    var el = document.getElementById('reports-panel-body');
    if (!el) return;
    var slug = data.office.slug;
    var state = { period: 'monthly', anchor: null };

    function shiftAnchor(direction) {
      var base = state.anchor ? new Date(state.anchor + 'T00:00:00Z') : new Date();
      var y = base.getUTCFullYear(), m = base.getUTCMonth();
      var next;
      if (state.period === 'monthly') next = new Date(Date.UTC(y, m + direction, 1));
      else if (state.period === 'quarterly') next = new Date(Date.UTC(y, m + direction * 3, 1));
      else next = new Date(Date.UTC(y + direction, m, 1));
      state.anchor = next.toISOString().slice(0, 10);
      load();
    }

    function controlsHtml() {
      var types = [['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['annual', 'Annual']];
      return '<div class="office-tabs" role="tablist" aria-label="Report period" style="margin-bottom:14px;">' +
        types.map(function (t) {
          return '<button type="button" class="office-tab' + (state.period === t[0] ? ' is-active' : '') + '" data-report-period="' + t[0] + '">' + t[1] + '</button>';
        }).join('') +
        '<button type="button" class="office-tab" data-report-shift="-1" style="margin-left:auto;">&larr; Previous</button>' +
        '<button type="button" class="office-tab" data-report-shift="1">Next &rarr;</button>' +
        '</div>';
    }

    function bindControls() {
      el.querySelectorAll('[data-report-period]').forEach(function (btn) {
        btn.addEventListener('click', function () { state.period = btn.getAttribute('data-report-period'); load(); });
      });
      el.querySelectorAll('[data-report-shift]').forEach(function (btn) {
        btn.addEventListener('click', function () { shiftAnchor(Number(btn.getAttribute('data-report-shift'))); });
      });
    }

    async function load() {
      el.innerHTML = controlsHtml() + '<div class="portal-empty">Generating report…</div>';
      bindControls();
      try {
        var qs = 'office=' + encodeURIComponent(slug) + '&period=' + encodeURIComponent(state.period) + (state.anchor ? '&anchor=' + state.anchor : '');
        var res = await fetch('/api/portal/staff/reports?' + qs, { headers: { accept: 'application/json' } });
        var payload = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(payload.error || 'Could not generate this report.');
        var body = el.querySelector('.office-tabs') ? el : el; // controls already rendered
        if (!payload.available) {
          el.innerHTML = controlsHtml() + '<div class="portal-empty">' + esc(payload.reason) + '</div>';
          bindControls();
          return;
        }
        el.innerHTML = controlsHtml() +
          '<p class="portal-hello-sub" style="margin-bottom:14px;">Generated ' + fmtDate(payload.generatedAt) + ' &middot; period: ' + esc(payload.period.label) + '</p>' +
          reportSectionHtml(slug, payload);
        bindControls();
      } catch (err) {
        el.innerHTML = controlsHtml() + '<div class="portal-empty">' + esc((err && err.message) || 'Could not generate this report.') + '</div>';
        bindControls();
      }
    }
    load();
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

  // Institutional Pulse (Founder Override Directive, Phase 1 Item 3):
  // every KPI counts up from 0 rather than appearing instantly, using
  // the same shared animateValue already proven on the Founder
  // Dashboard (js/portal-arrival.js). Falls back to setText if the
  // shared module hasn't loaded for some reason.
  function setTextAnimated(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    if (window.SHRSExecArrival && window.SHRSExecArrival.animateValue) window.SHRSExecArrival.animateValue(el, text);
    else el.textContent = text;
  }
})();
