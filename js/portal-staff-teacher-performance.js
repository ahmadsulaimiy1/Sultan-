// Teacher Performance Framework — staff UI over the permission-checked
// API (functions/api/portal/staff/teacher-performance.js). Same
// "Operational Framework Ready" presentation pattern as Safeguarding
// and Behaviour Management.
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');
  var statusTitleEl = document.querySelector('[data-sg-status-title]');
  var currentRecordsEl = document.querySelector('[data-sg-current-records]');
  var capabilitiesEl = document.querySelector('[data-sg-capabilities]');
  var domainsEl = document.querySelector('[data-sg-domains]');
  var obsListEl = document.querySelector('[data-obs-list]');
  var obsEmptyEl = document.querySelector('[data-obs-empty]');
  var pdListEl = document.querySelector('[data-pd-list]');
  var pdEmptyEl = document.querySelector('[data-pd-empty]');
  var reviewListEl = document.querySelector('[data-review-list]');
  var reviewEmptyEl = document.querySelector('[data-review-empty]');

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

  function renderFramework(data) {
    statusTitleEl.textContent = 'Teacher Performance Status: ' + data.framework.status;
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

    domainsEl.innerHTML = '';
    data.framework.observationDomains.forEach(function (d) {
      var li = el('li');
      li.appendChild(el('strong', null, d.label + ': '));
      li.appendChild(document.createTextNode(d.description));
      domainsEl.appendChild(li);
    });

    obsListEl.innerHTML = '';
    if (!data.observations.length) { obsEmptyEl.hidden = false; }
    else {
      obsEmptyEl.hidden = true;
      data.observations.forEach(function (o) {
        var card = el('div', 'registrar-approval-card');
        card.appendChild(el('div', 'registrar-approval-head', o.observationNo + ' — ' + (o.teacher || 'Teacher') + ' — ' + o.category));
        card.appendChild(el('div', 'registrar-approval-meta', 'Observed ' + formatDate(o.observedAt) + ' by ' + (o.observer || '—') + ' · ' + o.status + (o.rating ? ' · ' + o.rating : '')));
        card.appendChild(el('div', 'registrar-approval-meta', o.notes));
        obsListEl.appendChild(card);
      });
    }

    pdListEl.innerHTML = '';
    if (!data.pdRecords.length) { pdEmptyEl.hidden = false; }
    else {
      pdEmptyEl.hidden = true;
      data.pdRecords.forEach(function (p) {
        var card = el('div', 'registrar-approval-card');
        card.appendChild(el('div', 'registrar-approval-head', p.title));
        card.appendChild(el('div', 'registrar-approval-meta', (p.provider ? p.provider + ' · ' : '') + (p.hours ? p.hours + ' hrs · ' : '') + formatDate(p.completedAt)));
        pdListEl.appendChild(card);
      });
    }

    reviewListEl.innerHTML = '';
    if (!data.reviews.length) { reviewEmptyEl.hidden = false; }
    else {
      reviewEmptyEl.hidden = true;
      data.reviews.forEach(function (r) {
        var card = el('div', 'registrar-approval-card');
        card.appendChild(el('div', 'registrar-approval-head', r.reviewNo + ' — ' + (r.teacher || 'Teacher') + ' — ' + r.reviewPeriod));
        card.appendChild(el('div', 'registrar-approval-meta', r.status + (r.overallRating ? ' · ' + r.overallRating : '')));
        if (r.growthAreas) card.appendChild(el('div', 'registrar-approval-meta', 'Growth areas: ' + r.growthAreas));
        reviewListEl.appendChild(card);
      });
    }
  }

  async function loadFramework() {
    try {
      var res = await fetch('/api/portal/staff/teacher-performance', { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Your account does not include teacher-performance visibility.');
      renderFramework(data);
    } catch (err) {
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Teacher Performance Framework.';
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
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Teacher Performance Framework.';
      errorEl.hidden = false;
    }
  })();
})();
