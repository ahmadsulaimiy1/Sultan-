// Tajweed Compliance Framework — staff UI over the permission-checked
// API (functions/api/portal/staff/tajweed-compliance.js). Same
// "Operational Framework Ready" presentation pattern as the prior
// frameworks.
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
  var listEl = document.querySelector('[data-sg-cases-list]');
  var emptyEl = document.querySelector('[data-sg-cases-empty]');

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

  function render(data) {
    statusTitleEl.textContent = 'Tajweed Compliance Status: ' + data.framework.status;
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
    data.framework.categories.forEach(function (c) {
      var li = el('li');
      li.appendChild(el('strong', null, c.label + ': '));
      li.appendChild(document.createTextNode(c.description));
      categoriesEl.appendChild(li);
    });

    listEl.innerHTML = '';
    if (!data.assessments.length) { emptyEl.hidden = false; return; }
    emptyEl.hidden = true;
    data.assessments.forEach(function (a) {
      var card = el('div', 'registrar-approval-card');
      card.appendChild(el('div', 'registrar-approval-head', (a.student || 'Student #' + a.id) + ' — ' + a.category));
      card.appendChild(el('div', 'registrar-approval-meta', a.complianceLevel + ' · ' + a.cycle + ' · ' + formatDate(a.assessedAt)));
      if (a.remediationPlan) card.appendChild(el('div', 'registrar-approval-meta', 'Remediation plan: ' + a.remediationPlan));
      listEl.appendChild(card);
    });
  }

  async function load() {
    try {
      var res = await fetch('/api/portal/staff/tajweed-compliance', { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Your account does not include Tajweed-compliance visibility.');
      render(data);
    } catch (err) {
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Tajweed Compliance Framework.';
      errorEl.hidden = false;
      contentEl.hidden = true;
    }
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
      load();
    } catch (err) {
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Tajweed Compliance Framework.';
      errorEl.hidden = false;
    }
  })();
})();
