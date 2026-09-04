// Examination Readiness Framework — staff UI over the permission-checked
// shared API (functions/api/portal/staff/exam-readiness.js). One script
// serves both WAEC and NECO pages via <body data-exam-body="WAEC|NECO">,
// same Institutional Capability Framework presentation pattern.
(function () {
  var examBody = document.body.getAttribute('data-exam-body') === 'NECO' ? 'NECO' : 'WAEC';

  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');
  var statusTitleEl = document.querySelector('[data-sg-status-title]');
  var currentRecordsEl = document.querySelector('[data-sg-current-records]');
  var capabilitiesEl = document.querySelector('[data-sg-capabilities]');
  var indicatorsEl = document.querySelector('[data-sg-indicators]');
  var listEl = document.querySelector('[data-sg-cases-list]');
  var emptyEl = document.querySelector('[data-sg-cases-empty]');

  var STATUS_LABEL = { not_registered: 'Not Registered', registered: 'Registered', confirmed: 'Confirmed', sat: 'Sat' };
  var READINESS_LABEL = { on_track: 'On Track', at_risk: 'At Risk', critical: 'Critical' };

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderFramework(data) {
    statusTitleEl.textContent = examBody + ' Readiness Status: ' + data.framework.status;
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

    indicatorsEl.innerHTML = '';
    data.framework.riskIndicators.forEach(function (ind) {
      var li = el('li');
      li.appendChild(el('strong', null, ind.label + ': '));
      li.appendChild(document.createTextNode(ind.description));
      indicatorsEl.appendChild(li);
    });

    listEl.innerHTML = '';
    if (!data.candidates.length) { emptyEl.hidden = false; return; }
    emptyEl.hidden = true;
    data.candidates.forEach(function (c) {
      var card = el('div', 'registrar-approval-card');
      var head = el('div', 'registrar-approval-head');
      head.appendChild(el('span', null, (c.student || 'Candidate #' + c.id) + ' — ' + examBody + ' ' + c.examYear));
      var badge = el('span', 'registrar-sample-badge');
      badge.hidden = false;
      badge.textContent = STATUS_LABEL[c.registrationStatus] || c.registrationStatus;
      head.appendChild(badge);
      card.appendChild(head);
      if (c.subjects.length) {
        card.appendChild(el('div', 'registrar-approval-meta', 'Subjects: ' + c.subjects.map(function (s) { return s.subject + ' (' + (READINESS_LABEL[s.status] || s.status) + ')'; }).join(', ')));
      }
      if (c.openFlags.length) {
        card.appendChild(el('div', 'registrar-approval-meta', 'Open flags: ' + c.openFlags.map(function (f) { return f.indicator; }).join(', ')));
      }
      listEl.appendChild(card);
    });
  }

  async function loadFramework() {
    try {
      var res = await fetch('/api/portal/staff/exam-readiness?examBody=' + examBody, { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Your account does not include examination-readiness visibility.');
      renderFramework(data);
    } catch (err) {
      errorMessageEl.textContent = (err && err.message) || 'Could not load the ' + examBody + ' Readiness Framework.';
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
      loadFramework();
    } catch (err) {
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load the ' + examBody + ' Readiness Framework.';
      errorEl.hidden = false;
    }
  })();
})();
