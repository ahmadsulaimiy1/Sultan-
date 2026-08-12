// Founding Officers — opens the school's portals for the first time.
//
// THE PROBLEM THIS SOLVES
//
// /api/portal/admin/staff accepts either a staff session or an
// x-sysadmin-token header. The Admin Centre UI only ever sends cookies.
// So creating a staff account requires a staff account that already has
// staff_records: MU — and the only account setup seeds is a sample
// Teacher, which holds no such grant.
//
// The result: no interface in this project could create the first
// Registrar, Principal, Founder or System Administrator. Every portal
// gated behind those roles — the Registrar portal, the Newsroom, the
// Founder Dashboard, Safeguarding, and the Desk's system sections —
// was unreachable by anyone, forever, without curl.
//
// This page is the missing hand: the same endpoint, with the header the
// Admin Centre never sent. It creates nothing the Admin Centre couldn't,
// and once a Registrar or Founder account exists, the Admin Centre is
// the right place to work and this page should not be needed again.
//
// TWO THINGS IT DELIBERATELY WILL NOT DO
//
// It does not invent people. Every name, staff number and email is typed
// by the school. No officer of this institution is named by software.
//
// It does not set passwords. Each account is created without one and
// issued a single-use activation link, which the school gives to that
// person so they choose their own. No password passes through this page,
// and the token you paste is held in memory only — never stored, never
// sent anywhere but this school's own endpoint, and gone on reload.
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var tokenEl = document.querySelector('[data-fo-token]');
  var listEl = document.querySelector('[data-fo-list]');
  var noticeEl = document.querySelector('[data-fo-notice]');

  // Office names must match sql/schema.sql's seeded offices.name exactly
  // — the endpoint resolves them by name, and a near-miss silently
  // leaves the staff member with no office rather than erroring.
  var SLOTS = [
    { role: 'REG', staffNo: 'SHR-STF-0001', title: 'Registrar', office: "Registrar's Office",
      opens: 'Registrar portal, Newsroom, family escalations, examination readiness' },
    { role: 'EXE', staffNo: 'SHR-STF-0002', title: 'Head of Schools & Administrator', office: 'Head of Schools / Administrator',
      opens: 'Founder Dashboard, institution-wide oversight, every office view' },
    { role: 'SYSADMIN', staffNo: 'SHR-STF-0003', title: 'System Administrator', office: 'ICT Office',
      opens: 'Admin Centre, access logs, data-protection requests' },
    { role: 'DSL', staffNo: 'SHR-STF-0004', title: 'Designated Safeguarding Lead', office: 'Student Affairs',
      opens: 'Safeguarding Intelligence Framework' },
    { role: 'PRIN', staffNo: 'SHR-STF-0005', title: 'Head Teacher, Basic School', office: 'Head Teacher — Sultan Hanafi Basic School',
      opens: 'Behaviour, teacher performance, and that institution’s office' },
    { role: 'PRIN', staffNo: 'SHR-STF-0006', title: 'Principal, Secular College', office: 'Principal — Sultan Hanafi Secular College',
      opens: 'Behaviour, teacher performance, and that institution’s office' },
    { role: 'PRIN', staffNo: 'SHR-STF-0007', title: 'Principal, Islamiyyah College', office: 'Office of the Principal, Sultan Hanafi Islamiyyah College',
      opens: 'Arabic fluency, and that institution’s office' },
    { role: 'PRIN', staffNo: 'SHR-STF-0008', title: "Principal, Qur'an College", office: "Office of the Principal, Sultan Hanafi Qur'an College",
      opens: 'Tajwīd compliance, ḥifẓ oversight, and that institution’s office' },
    { role: 'FIN', staffNo: 'SHR-STF-0009', title: 'Finance Officer', office: 'Finance Office',
      opens: 'Fee records and the finance views' },
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

  function token() {
    return (tokenEl.value || '').trim();
  }

  async function call(payload) {
    var res = await fetch('/api/portal/admin/staff', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sysadmin-token': token() },
      body: JSON.stringify(payload),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ').');
    return data;
  }

  function field(labelText, name, placeholder, type) {
    var wrap = el('div', 'nr-field');
    var id = 'fo-' + name + '-' + Math.random().toString(36).slice(2, 8);
    var label = el('label', null, labelText);
    label.setAttribute('for', id);
    var input = document.createElement('input');
    input.id = id;
    input.type = type || 'text';
    input.setAttribute('data-field', name);
    if (placeholder) input.placeholder = placeholder;
    wrap.appendChild(label);
    wrap.appendChild(input);
    return wrap;
  }

  function renderSlot(slot) {
    var card = el('div', 'nr-item');
    card.setAttribute('data-status', 'draft');

    var head = el('div', 'nr-item-head');
    head.appendChild(el('span', 'nr-chip nr-chip--category', slot.role));
    head.appendChild(el('span', 'nr-chip nr-chip--draft', 'not opened'));
    card.appendChild(head);

    card.appendChild(el('h3', 'nr-item-title', slot.title));
    card.appendChild(el('p', 'nr-item-summary', 'Opens: ' + slot.opens));
    card.appendChild(el('div', 'nr-item-meta', slot.office));

    var row = el('div', 'nr-row');
    row.appendChild(field('Full name', 'fullName', 'As it should appear on record'));
    row.appendChild(field('Staff ID', 'staffNo', slot.staffNo));
    row.appendChild(field('Email', 'email', 'name@shroyalschools.com', 'email'));
    card.appendChild(row);

    var result = el('p', 'nr-field-hint');
    result.hidden = true;

    var actions = el('div', 'nr-actions');
    var btn = el('button', 'nr-btn nr-btn--primary', 'Open this office');
    btn.type = 'button';
    btn.addEventListener('click', async function () {
      var get = function (n) {
        var input = card.querySelector('[data-field="' + n + '"]');
        return (input.value || '').trim();
      };
      var fullName = get('fullName');
      var staffNo = get('staffNo') || slot.staffNo;
      var email = get('email');

      if (!token()) { notify('Paste the System Administrator token at the top of this page first.', true); return; }
      if (!fullName) { notify('This office needs a real person’s name. Nothing here is filled in for you.', true); return; }

      btn.disabled = true;
      try {
        await call({
          action: 'create-staff',
          staffNo: staffNo,
          fullName: fullName,
          email: email || null,
          positionTitle: slot.title,
          officeName: slot.office,
        });
        // Role scope is left school-wide on purpose: a founding grant
        // should not silently narrow itself to an institution nobody
        // has chosen yet. Narrow it in the Admin Centre once the
        // institutions each officer covers are settled.
        await call({ action: 'grant-role', staffNo: staffNo, roleCode: slot.role });
        var login = await call({ action: 'create-login', staffNo: staffNo });

        head.querySelector('.nr-chip--draft').className = 'nr-chip nr-chip--published';
        head.querySelector('.nr-chip--published').textContent = 'opened';
        card.setAttribute('data-status', 'published');

        result.hidden = false;
        result.textContent = '';
        result.appendChild(document.createTextNode('Activation link for ' + fullName + ' — single use, expires. Send it to them; they choose their own password: '));
        var link = el('strong', null, window.location.origin + login.activationLink);
        result.appendChild(link);
        notify('Opened ' + slot.title + '. Give ' + fullName + ' the activation link below.', false);
        btn.textContent = 'Re-issue activation link';
        btn.disabled = false;
      } catch (err) {
        notify((err && err.message) || 'That did not go through.', true);
        btn.disabled = false;
      }
    });
    actions.appendChild(btn);
    card.appendChild(actions);
    card.appendChild(result);
    return card;
  }

  SLOTS.forEach(function (slot) { listEl.appendChild(renderSlot(slot)); });
  loadingEl.hidden = true;
  contentEl.hidden = false;

  // No staff session is required to reach this page — that is the whole
  // point, since no account exists yet. The endpoint itself is what
  // checks the token, so nothing here is a security boundary.
  var logoutBtn = document.querySelector('[data-portal-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      try { await fetch('/api/portal/staff/logout', { method: 'POST' }); } catch (err) {}
      window.location.href = '/portal/staff/login/';
    });
  }
  if (errorEl && errorMessageEl) { errorEl.hidden = true; }
})();
