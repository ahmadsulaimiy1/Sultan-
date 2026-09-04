// Safeguarding Intelligence Framework — staff UI over the
// permission-checked API (functions/api/portal/staff/safeguarding.js).
// Renders the "Operational Framework Ready" status honestly, with a
// real seeded taxonomy and — where the account is DSL-scoped, not
// aggregate-only — the real (currently empty) case register.
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  var statusTitleEl = document.querySelector('[data-sg-status-title]');
  var currentRecordsEl = document.querySelector('[data-sg-current-records]');
  var capabilitiesEl = document.querySelector('[data-sg-capabilities]');
  var categoriesEl = document.querySelector('[data-sg-categories]');
  var riskLevelsEl = document.querySelector('[data-sg-risk-levels]');
  var casesCardEl = document.querySelector('[data-sg-cases-card]');
  var casesListEl = document.querySelector('[data-sg-cases-list]');
  var casesEmptyEl = document.querySelector('[data-sg-cases-empty]');
  var reportToggleBtn = document.querySelector('[data-sg-report-toggle]');
  var reportFormEl = document.querySelector('[data-sg-report-form]');
  var reportCancelBtn = document.querySelector('[data-sg-report-cancel]');
  var reportCategorySelect = document.querySelector('[data-sg-report-category]');
  var reportSummaryInput = document.querySelector('[data-sg-report-summary]');
  var reportResultEl = document.querySelector('[data-sg-report-result]');

  var STATUS_LABEL = {
    reported: 'Reported', under_review: 'Under Review', early_help: 'Early Help',
    referred_external: 'Referred (External)', resolved: 'Resolved', closed: 'Closed',
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
    statusTitleEl.textContent = 'Safeguarding Intelligence Status: ' + data.framework.status;
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

    categoriesEl.innerHTML = '';
    data.framework.categories.forEach(function (cat) {
      var li = el('li');
      li.appendChild(el('strong', null, cat.label + ': '));
      li.appendChild(document.createTextNode(cat.description));
      categoriesEl.appendChild(li);
      var opt = document.createElement('option');
      opt.value = cat.code; opt.textContent = cat.label;
      if (reportCategorySelect) reportCategorySelect.appendChild(opt);
    });

    riskLevelsEl.innerHTML = '';
    data.framework.riskLevels.forEach(function (rl) {
      var li = el('li');
      li.appendChild(el('strong', null, rl.label + ': '));
      li.appendChild(document.createTextNode(rl.description));
      riskLevelsEl.appendChild(li);
    });

    if (data.scope !== 'aggregate') {
      casesCardEl.hidden = false;
      renderCases(data.cases || []);
    }
  }

  function renderCases(cases) {
    casesListEl.innerHTML = '';
    if (!cases.length) {
      casesEmptyEl.hidden = false;
      return;
    }
    casesEmptyEl.hidden = true;
    cases.forEach(function (c) {
      var card = el('div', 'registrar-approval-card');
      var head = el('div', 'registrar-approval-head');
      head.appendChild(el('span', null, c.caseNo + ' — ' + c.category.label));
      var badge = el('span', 'registrar-sample-badge');
      badge.hidden = false;
      badge.textContent = STATUS_LABEL[c.status] || c.status;
      head.appendChild(badge);
      card.appendChild(head);
      card.appendChild(el('div', 'registrar-approval-meta', 'Reported ' + formatDateTime(c.reportedAt) + (c.riskLevel ? ' · Risk: ' + c.riskLevel.label : ' · Risk: not yet assessed')));
      card.appendChild(el('div', 'registrar-approval-meta', c.summary));
      casesListEl.appendChild(card);
    });
  }

  async function loadFramework() {
    try {
      var res = await fetch('/api/portal/staff/safeguarding', { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Your account does not include safeguarding visibility.');
      renderFramework(data);
    } catch (err) {
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Safeguarding Intelligence Framework.';
      errorEl.hidden = false;
      contentEl.hidden = true;
    }
  }

  if (reportToggleBtn) {
    reportToggleBtn.addEventListener('click', function () { reportFormEl.hidden = !reportFormEl.hidden; });
  }
  if (reportCancelBtn) {
    reportCancelBtn.addEventListener('click', function () { reportFormEl.hidden = true; });
  }
  if (reportFormEl) {
    reportFormEl.addEventListener('submit', async function (evt) {
      evt.preventDefault();
      reportResultEl.hidden = true;
      try {
        var res = await fetch('/api/portal/staff/safeguarding', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'report-case', categoryCode: reportCategorySelect.value, summary: reportSummaryInput.value }),
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || 'Could not report this case.');
        reportResultEl.hidden = false;
        reportResultEl.className = 'registrar-form-result is-ok';
        reportResultEl.textContent = 'Reported as ' + data.caseNo + '.';
        reportSummaryInput.value = '';
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
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Safeguarding Intelligence Framework.';
      errorEl.hidden = false;
    }
  })();
})();
