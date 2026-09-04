// Behaviour Management Framework — staff UI over the permission-checked
// API (functions/api/portal/staff/behaviour.js). Same "Operational
// Framework Ready" presentation pattern as Safeguarding
// (js/portal-staff-safeguarding.js).
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  var statusTitleEl = document.querySelector('[data-sg-status-title]');
  var currentRecordsEl = document.querySelector('[data-sg-current-records]');
  var capabilitiesEl = document.querySelector('[data-sg-capabilities]');
  var meritEl = document.querySelector('[data-sg-merit]');
  var demeritEl = document.querySelector('[data-sg-demerit]');
  var listEl = document.querySelector('[data-sg-cases-list]');
  var emptyEl = document.querySelector('[data-sg-cases-empty]');
  var reportToggleBtn = document.querySelector('[data-sg-report-toggle]');
  var reportFormEl = document.querySelector('[data-sg-report-form]');
  var reportCancelBtn = document.querySelector('[data-sg-report-cancel]');
  var reportCategorySelect = document.querySelector('[data-sg-report-category]');
  var reportStudentInput = document.querySelector('[data-sg-report-student]');
  var reportSummaryInput = document.querySelector('[data-sg-report-summary]');
  var reportResultEl = document.querySelector('[data-sg-report-result]');

  var STATUS_LABEL = {
    recorded: 'Recorded', under_review: 'Under Review', intervention: 'Intervention',
    resolved: 'Resolved', escalated: 'Escalated',
  };

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return iso; }
  }

  function renderFramework(data) {
    statusTitleEl.textContent = 'Behaviour Management Status: ' + data.framework.status;
    currentRecordsEl.textContent = 'Current Records: ' + data.currentRecords;
    var execRecords = document.querySelector('[data-exec-stat="records"]');
    if (execRecords) execRecords.textContent = data.currentRecords;

    capabilitiesEl.innerHTML = '';
    data.framework.subCapabilities.forEach(function (cap) {
      var tile = el('div', 'sg-capability-tile');
      tile.appendChild(el('div', 'sg-capability-label', cap.label));
      tile.appendChild(el('div', 'sg-capability-desc', cap.description));
      capabilitiesEl.appendChild(tile);
    });

    meritEl.innerHTML = '';
    demeritEl.innerHTML = '';
    data.framework.categories.forEach(function (cat) {
      var li = el('li');
      li.appendChild(el('strong', null, cat.label + ' (' + (cat.points >= 0 ? '+' : '') + cat.points + '): '));
      li.appendChild(document.createTextNode(cat.description));
      (cat.kind === 'merit' ? meritEl : demeritEl).appendChild(li);
      var opt = document.createElement('option');
      opt.value = cat.code; opt.textContent = cat.label;
      if (reportCategorySelect) reportCategorySelect.appendChild(opt);
    });

    renderIncidents(data.incidents || []);
  }

  function renderIncidents(incidents) {
    listEl.innerHTML = '';
    if (!incidents.length) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    incidents.forEach(function (item) {
      var card = el('div', 'registrar-approval-card');
      var head = el('div', 'registrar-approval-head');
      head.appendChild(el('span', null, item.incidentNo + ' — ' + (item.student ? item.student.fullName : 'Student #' + item.id) + ' — ' + item.category.label));
      var badge = el('span', 'registrar-sample-badge');
      badge.hidden = false;
      badge.textContent = STATUS_LABEL[item.status] || item.status;
      head.appendChild(badge);
      card.appendChild(head);
      card.appendChild(el('div', 'registrar-approval-meta', 'Recorded ' + formatDateTime(item.occurredAt) + (item.severity ? ' · Severity: ' + item.severity : '')));
      card.appendChild(el('div', 'registrar-approval-meta', item.description));
      listEl.appendChild(card);
    });
  }

  async function loadFramework() {
    try {
      var res = await fetch('/api/portal/staff/behaviour', { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Your account does not include behaviour-management visibility.');
      renderFramework(data);
    } catch (err) {
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Behaviour Management Framework.';
      errorEl.hidden = false;
      contentEl.hidden = true;
    }
  }

  if (reportToggleBtn) reportToggleBtn.addEventListener('click', function () { reportFormEl.hidden = !reportFormEl.hidden; });
  if (reportCancelBtn) reportCancelBtn.addEventListener('click', function () { reportFormEl.hidden = true; });
  if (reportFormEl) {
    reportFormEl.addEventListener('submit', async function (evt) {
      evt.preventDefault();
      reportResultEl.hidden = true;
      try {
        var res = await fetch('/api/portal/staff/behaviour', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'record-incident', studentId: parseInt(reportStudentInput.value, 10),
            categoryCode: reportCategorySelect.value, description: reportSummaryInput.value,
          }),
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || 'Could not record this incident.');
        reportResultEl.hidden = false;
        reportResultEl.className = 'registrar-form-result is-ok';
        reportResultEl.textContent = 'Recorded as ' + data.incidentNo + '.';
        reportSummaryInput.value = ''; reportStudentInput.value = '';
        loadFramework();
      } catch (err) {
        reportResultEl.hidden = false;
        reportResultEl.className = 'registrar-form-result is-error';
        reportResultEl.textContent = (err && err.message) || 'Could not reach the server — please try again.';
      }
    });
  }

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
      loadFramework();
    } catch (err) {
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Behaviour Management Framework.';
      errorEl.hidden = false;
    }
  })();
})();
