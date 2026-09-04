// Boarding Intelligence Framework — staff UI over the permission-checked
// API (functions/api/portal/staff/boarding-intelligence.js). Same
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
  var welfareListEl = document.querySelector('[data-welfare-list]');
  var welfareEmptyEl = document.querySelector('[data-welfare-empty]');
  var roomCheckListEl = document.querySelector('[data-roomcheck-list]');
  var roomCheckEmptyEl = document.querySelector('[data-roomcheck-empty]');

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
  function formatDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return d; }
  }

  function render(data) {
    statusTitleEl.textContent = 'Boarding Intelligence Status: ' + data.framework.status;
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
    data.framework.welfareCategories.forEach(function (c) {
      var li = el('li');
      li.appendChild(el('strong', null, c.label + ': '));
      li.appendChild(document.createTextNode(c.description));
      categoriesEl.appendChild(li);
    });

    welfareListEl.innerHTML = '';
    if (!data.welfareLogs.length) { welfareEmptyEl.hidden = false; }
    else {
      welfareEmptyEl.hidden = true;
      data.welfareLogs.forEach(function (w) {
        var card = el('div', 'registrar-approval-card');
        var head = el('div', 'registrar-approval-head');
        head.appendChild(el('span', null, (w.student || 'Student #' + w.id) + ' — ' + w.category));
        var badge = el('span', 'registrar-sample-badge');
        badge.hidden = false;
        badge.textContent = w.status;
        head.appendChild(badge);
        card.appendChild(head);
        card.appendChild(el('div', 'registrar-approval-meta', w.severity + ' · ' + formatDateTime(w.recordedAt)));
        card.appendChild(el('div', 'registrar-approval-meta', w.notes));
        welfareListEl.appendChild(card);
      });
    }

    roomCheckListEl.innerHTML = '';
    if (!data.roomChecks.length) { roomCheckEmptyEl.hidden = false; }
    else {
      roomCheckEmptyEl.hidden = true;
      data.roomChecks.forEach(function (r) {
        var card = el('div', 'registrar-approval-card');
        card.appendChild(el('div', 'registrar-approval-head', (r.student || 'Student #' + r.id) + ' — ' + formatDate(r.checkDate) + ' — ' + (r.present ? 'Present' : 'Absent')));
        if (r.notes) card.appendChild(el('div', 'registrar-approval-meta', r.notes));
        roomCheckListEl.appendChild(card);
      });
    }
  }

  async function load() {
    try {
      var res = await fetch('/api/portal/staff/boarding-intelligence', { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Your account does not include boarding-intelligence visibility.');
      render(data);
    } catch (err) {
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Boarding Intelligence Framework.';
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
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Boarding Intelligence Framework.';
      errorEl.hidden = false;
    }
  })();
})();
