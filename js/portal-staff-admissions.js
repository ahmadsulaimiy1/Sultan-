// Admissions Review Centre — a real staff-facing UI over the
// permission-checked list/decide API that already existed
// (functions/api/portal/staff/admissions-applications.js) but had no
// page calling it. Every action here (Review/Approve/Reject/Request
// Additional Information/View History) maps to a real, audited status
// change — never a separate fabricated workflow.
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');
  var listEl = document.querySelector('[data-admissions-list]');
  var emptyEl = document.querySelector('[data-admissions-empty]');
  var filterEl = document.querySelector('[data-admissions-filter]');

  var STATUS_LABEL = {
    submitted: 'Submitted', under_review: 'Under Review', waitlisted: 'Waitlisted',
    offered: 'Offered', admitted: 'Admitted', declined: 'Declined', withdrawn: 'Withdrawn',
  };
  var STATUS_ORDER = ['submitted', 'under_review', 'waitlisted', 'offered', 'admitted', 'declined', 'withdrawn'];
  var allApplications = [];

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }
  function formatDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return iso; }
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return iso; }
  }

  async function loadApplications() {
    try {
      var res = await fetch('/api/portal/staff/admissions-applications', { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        listEl.innerHTML = '';
        emptyEl.hidden = false;
        emptyEl.textContent = data.error || 'Your account cannot review admissions applications.';
        return;
      }
      allApplications = data.applications || [];
      renderList();
      renderExecStats();
    } catch (err) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.textContent = 'Could not load applications right now.';
    }
  }

  function alertRow(label, count, detail) {
    var row = el('div', 'pfd-alert-row' + (count > 0 ? ' has-attention' : ' is-quiet'));
    var left = el('div');
    left.appendChild(el('div', 'pfd-alert-label', label));
    if (detail) left.appendChild(el('div', 'pfd-alert-detail', detail));
    row.appendChild(left);
    row.appendChild(el('div', 'pfd-alert-count', String(count)));
    return row;
  }

  function renderExecStats() {
    var totalEl = document.querySelector('[data-exec-stat="total"]');
    var awaitingEl = document.querySelector('[data-exec-stat="awaiting"]');
    var admittedEl = document.querySelector('[data-exec-stat="admitted"]');
    var awaiting = allApplications.filter(function (a) { return a.status === 'submitted' || a.status === 'under_review'; }).length;
    var admitted = allApplications.filter(function (a) { return a.status === 'admitted'; }).length;
    if (totalEl) totalEl.textContent = allApplications.length;
    if (awaitingEl) awaitingEl.textContent = awaiting;
    if (admittedEl) admittedEl.textContent = admitted;

    var briefingEl = document.querySelector('[data-admissions-briefing]');
    if (briefingEl) {
      var sentences = [allApplications.length + ' application(s) are on file, ' + admitted + ' admitted so far.'];
      sentences.push(awaiting > 0 ? awaiting + ' await a decision.' : 'Nothing is currently awaiting a decision.');
      briefingEl.textContent = sentences.join(' ');
    }

    var alertsMount = document.querySelector('[data-admissions-alerts]');
    if (alertsMount) {
      alertsMount.innerHTML = '';
      alertsMount.appendChild(alertRow('Awaiting Decision', awaiting,
        awaiting > 0 ? 'Submitted or under review — see the queue below.' : 'Nothing outstanding.'));
    }

    var timelineMount = document.querySelector('[data-admissions-timeline]');
    if (timelineMount) {
      var dated = allApplications.filter(function (a) { return a.submittedAt; })
        .slice().sort(function (x, y) { return new Date(y.submittedAt) - new Date(x.submittedAt); });
      if (!dated.length) {
        timelineMount.innerHTML = '<div class="portal-empty">No dated applications on file yet.</div>';
      } else {
        var now = Date.now();
        timelineMount.innerHTML = dated.slice(0, 8).map(function (a) {
          var when = new Date(a.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          var isNew = Math.abs(now - new Date(a.submittedAt).getTime()) < 24 * 60 * 60 * 1000;
          return '<div class="pfd-alert-row">'
            + '<div><div class="pfd-alert-label"><span class="pfd-timeline-dot" aria-hidden="true"></span>' + (a.fullName || 'Application') + ' submitted' + (isNew ? '<span class="pfd-timeline-new">New</span>' : '') + '</div><div class="pfd-alert-detail">' + (STATUS_LABEL[a.status] || a.status) + '</div></div>'
            + '<div class="pfd-alert-count" style="font-size:0.82rem;color:var(--ink-soft);">' + when + '</div>'
            + '</div>';
        }).join('');
      }
    }

    var chartMount = document.querySelector('[data-pipeline-chart]');
    if (chartMount && window.SHRSChart) {
      var counts = {};
      STATUS_ORDER.forEach(function (s) { counts[s] = 0; });
      allApplications.forEach(function (a) { if (counts[a.status] != null) counts[a.status] += 1; });
      var colors = { submitted: '#B08D45', under_review: '#E3C88A', waitlisted: '#5B7A94', offered: '#4E3B22', admitted: '#2F6F4F', declined: '#8A8A8A', withdrawn: '#8A8A8A' };
      var segments = STATUS_ORDER.filter(function (s) { return counts[s] > 0; }).map(function (s) {
        return { label: STATUS_LABEL[s], value: counts[s], color: colors[s] };
      });
      window.SHRSChart.donut(chartMount, {
        segments: segments, display: String(allApplications.length),
        title: 'Admissions pipeline', size: 148, stroke: 16,
      });
    }
  }

  function renderList() {
    var filter = filterEl.value;
    var items = allApplications.filter(function (a) {
      if (!filter) return true;
      if (filter === '_awaiting') return a.status === 'submitted' || a.status === 'under_review';
      return a.status === filter;
    });
    listEl.innerHTML = '';
    if (!items.length) {
      emptyEl.hidden = false;
      emptyEl.textContent = 'No applications match this filter.';
      return;
    }
    emptyEl.hidden = true;
    items.forEach(function (item) { listEl.appendChild(renderCard(item)); });
  }

  function renderCard(item) {
    var card = el('div', 'registrar-approval-card');
    var head = el('div', 'registrar-approval-head');
    head.appendChild(el('span', null, item.applicantChildName + ' — ' + (item.institution || 'No institution specified')));
    var badge = el('span', 'registrar-sample-badge');
    badge.hidden = false;
    badge.style.background = item.status === 'admitted' ? 'rgba(47,111,79,0.85)'
      : item.status === 'declined' || item.status === 'withdrawn' ? 'rgba(90,90,90,0.75)'
      : item.status === 'offered' ? 'rgba(65,97,140,0.9)' : 'rgba(180,140,30,0.9)';
    badge.textContent = STATUS_LABEL[item.status] || item.status;
    head.appendChild(badge);
    card.appendChild(head);

    card.appendChild(el('div', 'registrar-approval-meta',
      'Desired class: ' + (item.desiredClass || '—') + ' · Submitted ' + formatDate(item.submittedAt) + (item.updatedAt !== item.submittedAt ? ' · Last updated ' + formatDate(item.updatedAt) : '')));
    if (item.notes) card.appendChild(el('div', 'registrar-approval-meta', 'Guardian notes: ' + item.notes));
    if (item.decisionNote) card.appendChild(el('div', 'registrar-approval-meta', 'Latest decision note: ' + item.decisionNote));

    var actions = el('div', 'registrar-approval-actions');
    var select = document.createElement('select');
    select.style.cssText = 'padding:6px 10px;border:1px solid var(--line);border-radius:4px;font-size:0.82rem;';
    STATUS_ORDER.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s; opt.textContent = STATUS_LABEL[s];
      if (s === item.status) opt.selected = true;
      select.appendChild(opt);
    });
    var noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.placeholder = 'Decision note — visible to the guardian';
    actions.appendChild(select);
    actions.appendChild(noteInput);

    var resultEl = el('div', 'registrar-form-result');
    resultEl.hidden = true;

    function submitStatus(status, requireNote) {
      var note = noteInput.value.trim();
      if (requireNote && !note) {
        resultEl.hidden = false;
        resultEl.className = 'registrar-form-result is-error';
        resultEl.textContent = 'A note is required for this action, so the guardian knows what is needed.';
        return;
      }
      decide(item.id, status, note, resultEl);
    }

    var approveBtn = el('button', 'registrar-approval-approve', 'Approve (Offer)');
    approveBtn.type = 'button';
    approveBtn.addEventListener('click', function () { submitStatus('offered', false); });

    var rejectBtn = el('button', 'registrar-approval-reject', 'Decline');
    rejectBtn.type = 'button';
    rejectBtn.addEventListener('click', function () { submitStatus('declined', false); });

    var infoBtn = el('button', 'registrar-approval-approve', 'Request More Info');
    infoBtn.type = 'button';
    infoBtn.style.background = 'var(--oxford-navy)';
    infoBtn.style.borderColor = 'var(--oxford-navy)';
    infoBtn.addEventListener('click', function () { submitStatus('under_review', true); });

    var saveBtn = el('button', 'registrar-approval-approve', 'Save Status');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', function () { submitStatus(select.value, false); });

    actions.appendChild(approveBtn);
    actions.appendChild(infoBtn);
    actions.appendChild(rejectBtn);
    actions.appendChild(saveBtn);
    card.appendChild(actions);
    card.appendChild(resultEl);

    if (item.history && item.history.length) {
      var historyToggle = el('button', 'registrar-approval-approve', 'View History (' + item.history.length + ')');
      historyToggle.type = 'button';
      historyToggle.style.background = 'none';
      historyToggle.style.color = 'var(--navy)';
      historyToggle.style.border = '1px solid var(--line)';
      var historyEl = el('div', 'registrar-timeline');
      historyEl.hidden = true;
      item.history.forEach(function (h) {
        var row = el('div', 'registrar-timeline-row');
        row.appendChild(el('div', 'registrar-timeline-type', (h.previousStatus ? STATUS_LABEL[h.previousStatus] || h.previousStatus : '—') + ' → ' + (h.newStatus ? STATUS_LABEL[h.newStatus] || h.newStatus : '—')));
        if (h.reason) row.appendChild(el('div', 'registrar-timeline-reason', h.reason));
        row.appendChild(el('div', 'registrar-timeline-meta', (h.actorName || 'A staff member') + ' · ' + formatDateTime(h.occurredAt)));
        historyEl.appendChild(row);
      });
      historyToggle.addEventListener('click', function () { historyEl.hidden = !historyEl.hidden; });
      card.appendChild(historyToggle);
      card.appendChild(historyEl);
    }

    return card;
  }

  async function decide(applicationId, status, decisionNote, resultEl) {
    resultEl.hidden = true;
    try {
      var res = await fetch('/api/portal/staff/admissions-applications', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'update-status', applicationId: applicationId, status: status, decisionNote: decisionNote || null }),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        resultEl.hidden = false;
        resultEl.className = 'registrar-form-result is-error';
        resultEl.textContent = data.error || 'Could not update that application.';
        return;
      }
      resultEl.hidden = false;
      resultEl.className = 'registrar-form-result is-ok';
      resultEl.textContent = 'Updated to ' + (STATUS_LABEL[status] || status) + '.';
      loadApplications();
    } catch (err) {
      resultEl.hidden = false;
      resultEl.className = 'registrar-form-result is-error';
      resultEl.textContent = 'Could not reach the server — please try again.';
    }
  }

  filterEl.addEventListener('change', renderList);

  logoutBtn.addEventListener('click', async function () {
    try { await fetch('/api/portal/staff/logout', { method: 'POST' }); } catch (err) {}
    window.location.href = '/portal/staff/login/';
  });

  (async function init() {
    try {
      var res = await fetch('/api/portal/staff/me');
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load your staff session.');
      loadingEl.hidden = true;
      contentEl.hidden = false;
      loadApplications();
    } catch (err) {
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || "Could not load the Admissions Review Centre.";
      errorEl.hidden = false;
    }
  })();
})();
