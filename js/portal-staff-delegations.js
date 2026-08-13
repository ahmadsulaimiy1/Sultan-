// Delegation — hand your authority to a colleague for a bounded window.
//
// The engine for this has existed since the Delegation System was built:
// functions/api/portal/staff/delegations.js writes it,
// functions/_lib/permissions.js reads it back as a live grant, and
// /api/portal/staff/me reports both directions. It had no interface, so
// the only way to authorise a Principal to act in your place was curl.
// This is that interface.
//
// What the endpoint enforces, and this page therefore states plainly
// rather than re-implementing:
//   - You can only delegate a role you currently, actively hold.
//     Nobody hands away authority they do not have.
//   - An end date is required and cannot exceed 90 days. There is no
//     open-ended delegation of anything.
//   - A reason is required. "Who, what, why, until when" is the whole
//     point of an auditable delegation.
//   - Only the person who created a delegation can revoke it.
//
// Expiry is computed at read time, not by a scheduled job — this project
// has no cron. So a delegation stops working the moment it lapses even
// if nobody is watching, which is the property that matters.
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');
  var noticeEl = document.querySelector('[data-dg-notice]');
  var roleEl = document.querySelector('[data-dg-role]');
  var formEl = document.querySelector('[data-dg-form]');
  var givenEl = document.querySelector('[data-dg-given]');
  var givenEmptyEl = document.querySelector('[data-dg-given-empty]');
  var heldEl = document.querySelector('[data-dg-held]');
  var heldEmptyEl = document.querySelector('[data-dg-held-empty]');
  var whoEl = document.querySelector('[data-dg-who]');

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function fmt(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch (e) { return String(iso); }
  }

  function notify(message, isError) {
    noticeEl.textContent = message;
    noticeEl.hidden = !message;
    if (isError) noticeEl.setAttribute('data-tone', 'error');
    else noticeEl.removeAttribute('data-tone');
  }

  function renderWho(me) {
    var roles = me.roles || [];
    var parts = [me.staff.fullName];
    if (me.staff.positionTitle) parts.push(me.staff.positionTitle);
    whoEl.textContent = parts.join(' — ');

    // Only roles actually held may be offered. The endpoint refuses
    // anything else; offering it here would only manufacture a 403.
    roleEl.innerHTML = '';
    if (!roles.length) {
      var none = document.createElement('option');
      none.value = '';
      none.textContent = 'You hold no active role to delegate';
      roleEl.appendChild(none);
      roleEl.disabled = true;
      return;
    }
    roles.forEach(function (r) {
      var opt = document.createElement('option');
      opt.value = r.roleCode;
      opt.textContent = r.roleCode + ' — ' + (r.roleName || r.roleCode) +
        (r.institution ? ' (' + r.institution.name + ')' : ' (school-wide)');
      roleEl.appendChild(opt);
    });
  }

  function renderGiven(list) {
    givenEl.innerHTML = '';
    if (!list.length) { givenEmptyEl.hidden = false; return; }
    givenEmptyEl.hidden = true;
    list.forEach(function (d) {
      var card = el('div', 'nr-item');
      card.setAttribute('data-status', 'published');
      var head = el('div', 'nr-item-head');
      head.appendChild(el('span', 'nr-chip nr-chip--category', d.roleCode));
      head.appendChild(el('span', 'nr-chip nr-chip--published', 'active'));
      card.appendChild(head);
      card.appendChild(el('h3', 'nr-item-title', d.delegatedTo.fullName));
      if (d.delegatedTo.positionTitle) card.appendChild(el('p', 'nr-item-summary', d.delegatedTo.positionTitle));
      card.appendChild(el('p', 'nr-item-summary', d.reason));
      card.appendChild(el('div', 'nr-item-meta', 'Until ' + fmt(d.endsAt) + ' · from ' + fmt(d.startsAt)));

      var actions = el('div', 'nr-actions');
      var btn = el('button', 'nr-btn', 'End this now');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        if (!window.confirm('End ' + d.delegatedTo.fullName + '’s ' + d.roleCode + ' authority now?')) return;
        btn.disabled = true;
        act({ action: 'revoke', delegationId: d.id },
          d.delegatedTo.fullName + ' no longer holds that authority.');
      });
      actions.appendChild(btn);
      card.appendChild(actions);
      givenEl.appendChild(card);
    });
  }

  function renderHeld(list) {
    heldEl.innerHTML = '';
    if (!list.length) { heldEmptyEl.hidden = false; return; }
    heldEmptyEl.hidden = true;
    list.forEach(function (d) {
      var card = el('div', 'nr-item');
      card.setAttribute('data-status', 'published');
      var head = el('div', 'nr-item-head');
      head.appendChild(el('span', 'nr-chip nr-chip--category', d.roleCode));
      card.appendChild(head);
      card.appendChild(el('h3', 'nr-item-title', 'Acting for ' + d.delegatedBy.fullName));
      card.appendChild(el('p', 'nr-item-summary', d.reason));
      card.appendChild(el('div', 'nr-item-meta', 'Until ' + fmt(d.endsAt)));
      heldEl.appendChild(card);
    });
  }

  async function act(payload, successMessage) {
    try {
      var res = await fetch('/api/portal/staff/delegations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) { notify(data.error || 'That did not go through.', true); return; }
      notify(successMessage, false);
      await load();
    } catch (err) {
      notify('That did not go through — please check your connection and try again.', true);
    }
  }

  async function load() {
    var res = await fetch('/api/portal/staff/me', { headers: { accept: 'application/json' } });
    if (res.status === 401) { window.location.href = '/portal/staff/login/'; return null; }
    var me = await res.json();
    if (!res.ok) throw new Error(me.error || 'Could not load your identity record.');
    renderWho(me);
    renderGiven(me.delegationsGiven || []);
    renderHeld(me.delegationsHeld || []);
    return me;
  }

  formEl.addEventListener('submit', async function (e) {
    e.preventDefault();
    var fd = new FormData(formEl);
    var endsAtDate = (fd.get('endsAt') || '').toString();
    if (!endsAtDate) { notify('A delegation must say when it ends. There is no open-ended option, deliberately.', true); return; }
    // The date input gives a calendar day; authority should run to the
    // end of that day rather than expiring at midnight as it begins.
    var payload = {
      action: 'create',
      delegateStaffNo: (fd.get('delegateStaffNo') || '').toString().trim(),
      roleCode: (fd.get('roleCode') || '').toString(),
      reason: (fd.get('reason') || '').toString().trim(),
      endsAt: new Date(endsAtDate + 'T23:59:00').toISOString(),
    };
    if (!payload.delegateStaffNo || !payload.roleCode || !payload.reason) {
      notify('Who, what, why and until when — a delegation needs all four.', true);
      return;
    }
    var submitBtn = formEl.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    await act(payload, 'Authority delegated. It ends automatically on the date you set — you do not have to remember to withdraw it.');
    formEl.reset();
    if (submitBtn) submitBtn.disabled = false;
  });

  logoutBtn.addEventListener('click', async function () {
    try { await fetch('/api/portal/staff/logout', { method: 'POST' }); } catch (err) {}
    window.location.href = '/portal/staff/login/';
  });

  (async function init() {
    try {
      await load();
      loadingEl.hidden = true;
      contentEl.hidden = false;
    } catch (err) {
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load your delegations.';
      errorEl.hidden = false;
    }
  })();
})();
