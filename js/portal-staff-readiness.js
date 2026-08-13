// Readiness — one page that answers "why is this still shut".
//
// It reads /api/portal/readiness, which returns whether each secret is
// SET, never its value. Nothing on this page can leak a credential
// because nothing on this page is ever given one.
//
// If no staff account exists yet there is no session to authenticate
// with, so the page falls back to asking for PORTAL_SYSADMIN_TOKEN —
// the same bootstrap credential the Admin Centre uses, held in memory
// only and gone on reload.
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var noticeEl = document.querySelector('[data-rd-notice]');
  var gateEl = document.querySelector('[data-rd-gate]');
  var tokenEl = document.querySelector('[data-rd-token]');
  var gateBtn = document.querySelector('[data-rd-unlock]');
  var summaryEl = document.querySelector('[data-rd-summary]');
  var secretsEl = document.querySelector('[data-rd-secrets]');
  var countsEl = document.querySelector('[data-rd-counts]');

  var token = null;

  var SUMMARY = [
    { key: 'portalsOpen', label: 'Portals open', yes: 'Someone can sign in.', no: 'Nobody can sign in yet — no account has a password set, or the core secrets are missing.' },
    { key: 'someoneCanAdminister', label: 'Someone can administer', yes: 'A Head of Schools or System Administrator account exists.', no: 'No EXE or SYSADMIN account exists, so the Admin Centre still needs the token.' },
    { key: 'emailWorks', label: 'Email delivers', yes: 'Verification, resets, login codes and escalations will send.', no: 'No email has ever been delivered. Needs RESEND_API_KEY and EMAIL_FROM_ADDRESS.' },
    { key: 'assistantWorks', label: 'Assistant answers', yes: 'The assistant is live on the website.', no: 'The assistant returns "not configured" to everyone. Needs ANTHROPIC_API_KEY.' },
    { key: 'whatsappWorks', label: 'WhatsApp answers', yes: 'The WhatsApp webhook will reply.', no: 'WhatsApp is not answering. Needs both ANTHROPIC_API_KEY and TWILIO_AUTH_TOKEN.' },
    { key: 'pushWorks', label: 'Push notifications', yes: 'Families with notifications on will be reached.', no: 'Web push is dark. Needs all three VAPID values.' },
  ];

  var COUNTS = [
    ['staff', 'Staff records'],
    ['staffWithLogin', 'Staff who can sign in'],
    ['administrators', 'EXE / SYSADMIN accounts'],
    ['registrars', 'Registrar accounts'],
    ['guardians', 'Guardian accounts'],
    ['students', 'Students'],
    ['announcementsPublished', 'Announcements published'],
    ['openEscalations', 'Families waiting for a person'],
  ];

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function notify(message, isError) {
    noticeEl.textContent = message;
    noticeEl.hidden = !message;
    if (isError) noticeEl.setAttribute('data-tone', 'error');
    else noticeEl.removeAttribute('data-tone');
  }

  function render(data) {
    gateEl.hidden = true;

    summaryEl.innerHTML = '';
    SUMMARY.forEach(function (s) {
      var ok = Boolean(data.readiness[s.key]);
      var card = el('div', 'nr-item');
      card.setAttribute('data-status', ok ? 'published' : 'draft');
      var head = el('div', 'nr-item-head');
      head.appendChild(el('span', 'nr-chip nr-chip--' + (ok ? 'published' : 'draft'), ok ? 'working' : 'shut'));
      card.appendChild(head);
      card.appendChild(el('h3', 'nr-item-title', s.label));
      card.appendChild(el('p', 'nr-item-summary', ok ? s.yes : s.no));
      summaryEl.appendChild(card);
    });

    secretsEl.innerHTML = '';
    var groups = {};
    data.secrets.forEach(function (s) { (groups[s.group] = groups[s.group] || []).push(s); });
    Object.keys(groups).forEach(function (group) {
      var block = el('div', 'nr-item');
      var missing = groups[group].filter(function (s) { return !s.set && !s.optional; }).length;
      block.setAttribute('data-status', missing ? 'draft' : 'published');
      var head = el('div', 'nr-item-head');
      head.appendChild(el('span', 'nr-chip nr-chip--category', group));
      head.appendChild(el('span', 'nr-chip nr-chip--' + (missing ? 'draft' : 'published'),
        missing ? missing + ' missing' : 'complete'));
      block.appendChild(head);
      groups[group].forEach(function (s) {
        var row = el('div', 'nr-item-meta');
        row.textContent = (s.set ? '✓ ' : '· ') + s.name + (s.optional ? ' (optional)' : '') + (s.set ? ' — set' : ' — not set');
        block.appendChild(row);
        if (!s.set) block.appendChild(el('p', 'nr-item-summary', s.blocks));
      });
      secretsEl.appendChild(block);
    });

    countsEl.innerHTML = '';
    if (!data.database.linked) {
      countsEl.appendChild(el('p', 'nr-note', 'No database is linked, so there is nothing to count. Set DATABASE_URL first.'));
    } else if (!data.database.reachable) {
      countsEl.appendChild(el('p', 'nr-note', data.database.error || 'The database did not answer.'));
    } else {
      COUNTS.forEach(function (pair) {
        var v = data.counts ? data.counts[pair[0]] : null;
        var row = el('div', 'nr-item-meta');
        row.textContent = pair[1] + ': ' + (v === null || v === undefined ? 'table not present yet' : v);
        countsEl.appendChild(row);
      });
    }

    notify(data.note, false);
    contentEl.hidden = false;
  }

  async function load() {
    var headers = { accept: 'application/json' };
    if (token) headers['x-sysadmin-token'] = token;
    var res = await fetch('/api/portal/readiness', { headers: headers });
    var data = await res.json().catch(function () { return {}; });

    if (res.status === 503 && data.configured === false) {
      loadingEl.hidden = true;
      contentEl.hidden = true;
      errorMessageEl.textContent = data.message;
      errorEl.hidden = false;
      return;
    }
    if (res.status === 403 || res.status === 401) {
      loadingEl.hidden = true;
      gateEl.hidden = false;
      if (token) notify('That token was not accepted.', true);
      return;
    }
    if (!res.ok) throw new Error(data.error || 'Could not read readiness.');
    loadingEl.hidden = true;
    render(data);
  }

  gateBtn.addEventListener('click', function () {
    var v = (tokenEl.value || '').trim();
    if (!v) { notify('Paste the token first.', true); return; }
    token = v;           // memory only — never stored, gone on reload
    tokenEl.value = '';
    load().catch(function (err) {
      errorMessageEl.textContent = (err && err.message) || 'Could not read readiness.';
      errorEl.hidden = false;
    });
  });

  load().catch(function (err) {
    loadingEl.hidden = true;
    errorMessageEl.textContent = (err && err.message) || 'Could not read readiness.';
    errorEl.hidden = false;
  });
})();
