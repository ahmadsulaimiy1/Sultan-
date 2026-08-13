// Institutional Administration Centre — the premium UI over
// functions/api/portal/admin/staff.js (Office/Appointment/Meeting/
// Document/Committee/Governance management) requested by the Founder,
// Head of Schools & Administrator directive so "The Founder should not need API calls for
// ordinary administration." Deliberately kept on the same bootstrap
// sysadmin-token model as the API it wraps — see that file's header
// comment for why. The token is entered once per browser tab
// (sessionStorage, cleared on close), never hard-coded, never sent
// anywhere but this same-origin API.
(function () {
  'use strict';

  var TOKEN_KEY = 'shrs_sysadmin_token';
  var state = { offices: [], selected: null, token: null };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Founder Override Directive ("Eliminate PowerShell Role Assignment"):
    // a real signed-in staff session with Manage-Users authority is now
    // the primary path (see admin/staff.js's resolveAuth) — try that
    // silently first, with same-origin fetch() sending the session
    // cookie automatically. Only fall back to the sysadmin-token gate
    // (still the disaster-recovery/bootstrap path) if no session exists
    // or it lacks the required grant.
    tryLoad(function (ok) {
      if (!ok) {
        var stored = sessionStorage.getItem(TOKEN_KEY);
        if (stored) {
          state.token = stored;
          tryLoad();
        } else {
          // Falling back to the token gate has two very different
          // causes, and showing the same bare token box for both leaves
          // a signed-in officer with no idea why their account was not
          // enough. Ask who they are and say so.
          explainWhyLocked();
        }
      }
    });
    var gateForm = document.getElementById('admin-gate-form');
    if (gateForm) gateForm.addEventListener('submit', onGateSubmit);
    var lockBtn = document.getElementById('admin-lock-btn');
    if (lockBtn) lockBtn.addEventListener('click', lock);
    var newOfficeBtn = document.getElementById('admin-new-office-btn');
    if (newOfficeBtn) newOfficeBtn.addEventListener('click', function () { renderNewOfficeForm(); });
    var newStaffBtn = document.getElementById('admin-new-staff-btn');
    if (newStaffBtn) newStaffBtn.addEventListener('click', function () { renderNewStaffForm(); });
    var staffDirBtn = document.getElementById('admin-staff-directory-btn');
    if (staffDirBtn) staffDirBtn.addEventListener('click', function () { renderStaffDirectory(); });
    var authorityBtn = document.getElementById('admin-authority-register-btn');
    if (authorityBtn) authorityBtn.addEventListener('click', function () { renderAuthorityRegister(); });
    var accessBtn = document.getElementById('admin-staff-access-btn');
    if (accessBtn) accessBtn.addEventListener('click', function () { renderStaffAccess(); });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return d; }
  }

  function showGate(errorMsg) {
    var gate = document.getElementById('admin-gate');
    var shell = document.getElementById('admin-shell');
    if (gate) gate.hidden = false;
    if (shell) shell.hidden = true;
    var err = document.getElementById('admin-gate-error');
    if (err) err.textContent = errorMsg || '';
  }
  // `staff_records: MU` is held by SYSADMIN and EXE only. A Registrar
  // or Principal signing in here is correctly refused, but silently —
  // so name the account, name the roles that would work, and say the
  // token is not the intended answer for a person who already has an
  // account.
  function explainWhyLocked() {
    fetch('/api/portal/staff/me', { headers: { accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (me) {
        if (!me || !me.staff) { showGate(); return; }
        var codes = (me.roles || []).map(function (r) { return r.roleCode; });
        var who = me.staff.fullName || 'You';
        showGate(
          who + ' is signed in' + (codes.length ? ' as ' + codes.join(', ') : ' with no active role') +
          ', which does not include Manage Users. This page needs a Head of Schools (EXE) or ' +
          'System Administrator (SYSADMIN) account. Ask one of them to grant your account that role, ' +
          'or sign in as one — the token below is only for before any account exists.'
        );
      })
      .catch(function () { showGate(); });
  }

  function lock() {
    sessionStorage.removeItem(TOKEN_KEY);
    state.token = null;
    state.offices = [];
    state.selected = null;
    showGate();
  }
  function onGateSubmit(e) {
    e.preventDefault();
    var input = document.getElementById('admin-gate-token');
    var val = input && input.value.trim();
    if (!val) return;
    state.token = val;
    tryLoad(function (ok) {
      if (ok) { sessionStorage.setItem(TOKEN_KEY, val); }
      else { state.token = null; showGate('That token was rejected. Check it and try again.'); }
    });
  }

  function apiGet(view, params) {
    var qs = new URLSearchParams(Object.assign({ view: view }, params || {}));
    return fetch('/api/portal/admin/staff?' + qs.toString(), {
      headers: { 'x-sysadmin-token': state.token, accept: 'application/json' },
    }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; }); });
  }
  function apiPost(action, body) {
    return fetch('/api/portal/admin/staff', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sysadmin-token': state.token },
      body: JSON.stringify(Object.assign({ action: action }, body || {})),
    }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; }); });
  }

  function tryLoad(cb) {
    apiGet('offices').then(function (r) {
      if (!r.ok) { if (cb) cb(false); else showGate(r.data && r.data.error); return; }
      state.offices = r.data.offices || [];
      document.getElementById('admin-gate').hidden = true;
      document.getElementById('admin-shell').hidden = false;
      renderOfficeList();
      renderEmptyRightPanel();
      if (cb) cb(true);
    }).catch(function () { if (cb) cb(false); else showGate('Could not reach the administration API.'); });
  }

  var LAYER_LABELS = {
    governance: 'Governance', academic: 'Academic', school_leadership: 'School Leadership',
    operational: 'Operational', institutional_services: 'Institutional Services',
  };

  function renderOfficeList() {
    var el = document.getElementById('admin-office-list');
    if (!el) return;
    var byLayer = {};
    state.offices.forEach(function (o) { (byLayer[o.layer || 'other'] = byLayer[o.layer || 'other'] || []).push(o); });
    var order = ['governance', 'academic', 'school_leadership', 'operational', 'institutional_services', 'other'];
    el.innerHTML = order.filter(function (k) { return byLayer[k]; }).map(function (layerKey) {
      var rows = byLayer[layerKey].map(function (o) {
        var filled = o.appointments.filter(function (a) { return !a.isVacant; }).length;
        return '<div class="admin-office-row" data-office-id="' + o.id + '">'
          + '<span class="aor-name">' + esc(o.name) + '</span>'
          + (o.officeKind === 'committee' ? '<span class="aor-badge">Committee</span>' : '')
          + '<span class="aor-meta">' + filled + '/' + o.appointments.length + ' seats filled</span>'
          + '</div>';
      }).join('');
      return '<details class="admin-layer-group" open><summary>' + esc(LAYER_LABELS[layerKey] || layerKey) + '</summary>' + rows + '</details>';
    }).join('');
    el.querySelectorAll('.admin-office-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var id = Number(row.dataset.officeId);
        var office = state.offices.filter(function (o) { return o.id === id; })[0];
        if (office) selectOffice(office);
      });
    });
  }

  function renderEmptyRightPanel() {
    var el = document.getElementById('admin-right-panel');
    if (el) el.innerHTML = '<div class="portal-child-card"><div class="portal-child-head"><h2>Select an office</h2><div class="meta">Choose an office on the left, or use "+ New Office" / "+ New Staff" above.</div></div></div>';
  }

  function statusEl(id, msg, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'admin-form-status' + (msg ? (ok ? ' is-ok' : ' is-err') : '');
  }

  // ================================================================
  // Staff Access — check an account's state, and re-issue its
  // activation link.
  //
  // `create-login` was reachable from exactly one place: the New Staff
  // form, as the last step of creating somebody. For a staff member who
  // already existed there was no screen at all, so the only way to give
  // them a fresh link was a hand-written curl carrying the sysadmin
  // token. That is precisely the case that arises most — a link used, a
  // link expired, a link superseded — and it is the case that had no
  // button. This is that button.
  //
  // It reads `login-status` first and says plainly what the account's
  // state is, because "the link does not work" has several quite
  // different causes and only one of them is answered by issuing another
  // link. Someone who has already set a password needs to be told to
  // sign in, not handed a new link.
  // ================================================================
  var ACCESS_STATE_COPY = {
    'active': ['Active', 'The password is set. This person should sign in — a new link is not needed, and issuing one does not disturb the password they already have.'],
    'active-with-open-reset': ['Active, with a reset outstanding', 'The password is set and a reset link is also open. Either will let them in.'],
    'awaiting-activation': ['Waiting to be activated', 'A live link is outstanding. It is the only one that works — every earlier link is already dead.'],
    'link-expired': ['Link expired', 'The link passed its expiry. Issue a fresh one below.'],
    'link-used-or-superseded': ['No live link', 'No password and no live link: the link was used, or replaced by a newer one that was never opened. Issue a fresh one below.'],
    'no-account': ['No login yet', 'No login has ever been created for this staff member. Issuing one below creates it.'],
  };

  function accessCard(staff) {
    return '<div class="portal-child-card">'
      + '<div class="portal-child-head"><h2>Staff Access</h2>'
      + '<div class="meta">Check whether an account is active, and issue a fresh activation link. Issuing a link cancels every earlier one &mdash; the account holds a single token, so always send the newest.</div></div>'
      + '<form class="admin-form" id="access-find-form"><div class="admin-form-grid">'
      + '<div class="admin-field"><label>Find a staff member</label>'
      + '<input name="q" placeholder="Name or Staff ID" value="' + esc(staff || '') + '" autocomplete="off" /></div>'
      + '</div><div class="admin-form-actions"><button type="submit" class="btn-outline">Search</button>'
      + '<span class="admin-form-status" id="access-status"></span></div></form>'
      + '<div id="access-results" style="padding:0 26px 20px;"></div>'
      + '</div>';
  }

  function renderStaffAccess(prefill) {
    var el = document.getElementById('admin-right-panel');
    el.innerHTML = accessCard(prefill);
    document.getElementById('access-find-form').addEventListener('submit', function (e) {
      e.preventDefault();
      accessSearch(new FormData(e.target).get('q'));
    });
    if (prefill) accessSearch(prefill);
  }

  function accessSearch(q) {
    q = (q || '').toString().trim();
    if (!q) { statusEl('access-status', 'Type a name or a Staff ID.', false); return; }
    statusEl('access-status', 'Searching…', true);
    apiGet('staff', { q: q }).then(function (r) {
      if (!r.ok) { statusEl('access-status', (r.data && r.data.error) || 'Could not search.', false); return; }
      var list = (r.data && r.data.staff) || [];
      statusEl('access-status', list.length ? list.length + ' found' : 'Nobody matched that.', Boolean(list.length));
      var out = document.getElementById('access-results');
      if (!list.length) { out.innerHTML = ''; return; }
      out.innerHTML = list.map(function (s) {
        return '<div class="admin-office-row" data-access-row="' + esc(s.staffNo) + '" style="display:block;">'
          + '<strong>' + esc(s.fullName) + '</strong> &nbsp;<code>' + esc(s.staffNo) + '</code>'
          + '<div class="meta">' + esc(s.positionTitle || '') + (s.officeName ? ' &middot; ' + esc(s.officeName) : '')
          + ' &middot; ' + esc(s.status) + (s.email ? ' &middot; ' + esc(s.email) : ' &middot; no email on file') + '</div>'
          + '<div style="margin-top:8px;"><button type="button" class="btn-outline" data-access-check="' + esc(s.staffNo) + '">Check access</button></div>'
          + '<div data-access-detail="' + esc(s.staffNo) + '"></div>'
          + '</div>';
      }).join('');
      out.querySelectorAll('[data-access-check]').forEach(function (b) {
        b.addEventListener('click', function () { accessCheck(b.getAttribute('data-access-check')); });
      });
    });
  }

  function accessCheck(staffNo) {
    var box = document.querySelector('[data-access-detail="' + staffNo + '"]');
    if (!box) return;
    box.innerHTML = '<div class="meta" style="margin-top:10px;">Checking…</div>';
    apiPost('login-status', { staffNo: staffNo }).then(function (r) {
      if (!r.ok) {
        box.innerHTML = '<div class="meta" style="margin-top:10px;">' + esc((r.data && r.data.error) || 'Could not check.') + '</div>';
        return;
      }
      var d = r.data || {};
      var copy = ACCESS_STATE_COPY[d.state] || [d.state, d.advice || ''];
      var expires = d.linkExpires ? new Date(d.linkExpires).toLocaleString('en-GB') : null;
      box.innerHTML = '<div class="portal-empty" style="margin-top:10px;text-align:left;">'
        + '<strong>' + esc(copy[0]) + '</strong><br>' + esc(copy[1])
        + (expires ? '<br><span class="meta">Link expires ' + esc(expires) + '</span>' : '')
        + (d.lockedUntil ? '<br><span class="meta">Locked until ' + esc(new Date(d.lockedUntil).toLocaleString('en-GB')) + '</span>' : '')
        + '<div style="margin-top:12px;"><button type="button" class="btn-gold" data-access-issue="' + esc(staffNo) + '">Issue a fresh activation link</button>'
        + ' <span class="admin-form-status" data-access-issue-status="' + esc(staffNo) + '"></span></div>'
        + '<div data-access-link="' + esc(staffNo) + '"></div></div>';
      var btn = box.querySelector('[data-access-issue]');
      if (btn) btn.addEventListener('click', function () { accessIssue(staffNo, btn); });
    });
  }

  function accessIssue(staffNo, btn) {
    // Named plainly, because it is not reversible in the way people
    // expect: the previous link stops working the instant this returns.
    if (!window.confirm('Issue a fresh activation link for ' + staffNo + '?\n\nAny link already sent to this person will stop working immediately.')) return;
    btn.disabled = true;
    var st = document.querySelector('[data-access-issue-status="' + staffNo + '"]');
    if (st) { st.textContent = 'Issuing…'; st.className = 'admin-form-status'; }
    apiPost('create-login', { staffNo: staffNo }).then(function (r) {
      btn.disabled = false;
      var out = document.querySelector('[data-access-link="' + staffNo + '"]');
      if (!r.ok || !r.data || !r.data.activationLink) {
        if (st) { st.textContent = (r.data && r.data.error) || 'Could not issue a link.'; st.className = 'admin-form-status is-err'; }
        return;
      }
      if (st) { st.textContent = 'Issued.'; st.className = 'admin-form-status is-ok'; }
      // The endpoint returns a path. What gets sent to a person has to be
      // the whole address, or they cannot open it — so it is assembled
      // here rather than left for whoever is copying it to remember.
      var full = window.location.origin + r.data.activationLink;
      var days = r.data.expiresInDays;
      // .admin-field so the box takes the panel's own ink and ground — a
      // bare input outside it renders as a white slab on the dark card.
      out.innerHTML = '<div class="admin-field" style="margin-top:12px;">'
        + '<label>Send this to ' + esc(staffNo) + '</label>'
        + '<input readonly value="' + esc(full) + '" data-access-copy="' + esc(staffNo) + '" style="font-family:monospace;font-size:12px;" />'
        + '<div style="margin-top:8px;"><button type="button" class="btn-outline" data-access-copybtn="' + esc(staffNo) + '">Copy</button>'
        + ' <span class="meta">Valid ' + esc(days || 7) + ' days, single use'
        + (r.data.alreadyHadPassword ? '. This account already had a password — the old one still works until this link is opened.' : '.')
        + ' Any earlier link is now dead.</span></div></div>';
      var input = out.querySelector('[data-access-copy]');
      var copyBtn = out.querySelector('[data-access-copybtn]');
      if (copyBtn) copyBtn.addEventListener('click', function () {
        input.select();
        // execCommand is deprecated but is the only path that works
        // without a secure-context clipboard permission prompt; the
        // async API is tried first and this catches the rest.
        var done = function () { copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(input.value).then(done, function () { try { document.execCommand('copy'); done(); } catch (err) {} });
        } else { try { document.execCommand('copy'); done(); } catch (err) {} }
      });
    });
  }

  // ---- Office detail (selected office) ----
  function selectOffice(office) {
    state.selected = office;
    document.querySelectorAll('.admin-office-row').forEach(function (r) {
      r.classList.toggle('is-selected', Number(r.dataset.officeId) === office.id);
    });
    var el = document.getElementById('admin-right-panel');
    var showResolutions = office.officeType === 'governance';
    el.innerHTML =
      '<div class="portal-child-card">'
      + '<div class="portal-child-head"><h2>' + esc(office.name) + '</h2><div class="meta">' + esc(office.officeType) + ' &middot; ' + esc((office.layer || '').replace(/_/g, ' ')) + (office.parentOfficeName ? ' &middot; reports to ' + esc(office.parentOfficeName) : '') + '</div></div>'
      + '<nav class="office-tabs" role="tablist" style="margin:0 26px 20px;">'
      + '<button type="button" class="office-tab is-active" data-tab="content">Governance Content</button>'
      + '<button type="button" class="office-tab" data-tab="appointments">Appointments</button>'
      + '<button type="button" class="office-tab" data-tab="meetings">Meetings</button>'
      + '<button type="button" class="office-tab" data-tab="documents">Documents</button>'
      + (showResolutions ? '<button type="button" class="office-tab" data-tab="resolutions">Resolutions</button>' : '')
      + (showResolutions ? '<button type="button" class="office-tab" data-tab="action-items">Action Items</button>' : '')
      + '</nav>'
      + '<div class="office-panel is-active" id="admin-panel-content"></div>'
      + '<div class="office-panel" id="admin-panel-appointments"></div>'
      + '<div class="office-panel" id="admin-panel-meetings"></div>'
      + '<div class="office-panel" id="admin-panel-documents"></div>'
      + (showResolutions ? '<div class="office-panel" id="admin-panel-resolutions"></div>' : '')
      + (showResolutions ? '<div class="office-panel" id="admin-panel-action-items"></div>' : '')
      + '</div>';

    var tabs = el.querySelectorAll('.office-tab');
    var panels = el.querySelectorAll('.office-panel');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        panels.forEach(function (p) { p.classList.remove('is-active'); });
        tab.classList.add('is-active');
        var panel = document.getElementById('admin-panel-' + tab.dataset.tab);
        if (panel) panel.classList.add('is-active');
        loadTab(tab.dataset.tab);
      });
    });
    loadTab('content');
  }

  function loadTab(tab) {
    var office = state.selected;
    if (tab === 'content') return renderContentTab(office);
    if (tab === 'appointments') return renderAppointmentsTab(office);
    if (tab === 'meetings') {
      apiGet('meetings', { officeName: office.name }).then(function (r) {
        renderMeetingsTab(office, r.ok ? r.data.meetings : []);
      });
      return;
    }
    if (tab === 'documents') {
      apiGet('documents', { officeName: office.name }).then(function (r) {
        renderDocumentsTab(office, r.ok ? r.data.documents : []);
      });
      return;
    }
    if (tab === 'resolutions') {
      apiGet('resolutions', { officeName: office.name }).then(function (r) {
        renderResolutionsTab(office, r.ok ? r.data.resolutions : []);
      });
      return;
    }
    if (tab === 'action-items') {
      apiGet('action-items', { officeName: office.name }).then(function (r) {
        renderActionItemsTab(office, r.ok ? r.data.actionItems : []);
      });
      return;
    }
  }

  function renderContentTab(office) {
    var el = document.getElementById('admin-panel-content');
    if (!el) return;
    el.innerHTML =
      '<form class="admin-form" id="content-form">'
      + '<p class="template-framework-note" style="padding:0 0 14px;">Leave a field blank to keep showing the generic template on the public portal. Enter real, Board/Executive-adopted text to replace it — this appears immediately, with no redesign.</p>'
      + '<div class="admin-field" style="margin-bottom:14px;"><label>Strategic Priorities (one per line)</label><textarea name="strategicPriorities">' + esc(office.strategicPriorities || '') + '</textarea></div>'
      + '<div class="admin-field" style="margin-bottom:14px;"><label>Annual Objectives (one per line)</label><textarea name="annualObjectives">' + esc(office.annualObjectives || '') + '</textarea></div>'
      + '<div class="admin-form-actions"><button type="submit" class="btn-gold">Save Content</button><span class="admin-form-status" id="content-form-status"></span></div>'
      + '</form>';
    document.getElementById('content-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      apiPost('update-office-content', {
        officeName: office.name,
        strategicPriorities: fd.get('strategicPriorities') || null,
        annualObjectives: fd.get('annualObjectives') || null,
      }).then(function (r) {
        if (r.ok) {
          office.strategicPriorities = fd.get('strategicPriorities') || null;
          office.annualObjectives = fd.get('annualObjectives') || null;
          statusEl('content-form-status', 'Saved.', true);
        } else statusEl('content-form-status', r.data.error || 'Could not save.', false);
      });
    });
  }

  function renderAppointmentsTab(office) {
    var el = document.getElementById('admin-panel-appointments');
    if (!el) return;
    var rows = office.appointments.map(function (a) {
      return '<tr class="' + (a.isVacant ? 'is-vacant' : '') + '">'
        + '<td>' + esc(a.title) + (a.isActing ? ' (Acting)' : '') + '</td>'
        + '<td>' + (a.isVacant ? 'Vacant — Awaiting Appointment' : esc(a.staffName) + ' (' + esc(a.staffNo) + ')') + '</td>'
        + '<td>' + esc(a.notes || '—') + '</td>'
        + '<td>' + (a.isVacant ? '' : '<button type="button" class="btn-outline admin-end-appt" data-id="' + a.id + '" style="font-size:0.7rem;padding:5px 10px;">End</button>') + '</td>'
        + '</tr>';
    }).join('') || '<tr><td colspan="4">No seats recorded yet.</td></tr>';
    el.innerHTML =
      '<div style="padding:20px 26px 0;overflow-x:auto;"><table class="admin-table"><thead><tr><th>Seat</th><th>Holder</th><th>Notes</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<form class="admin-form" id="appt-form">'
      + '<div class="admin-form-grid">'
      + '<div class="admin-field"><label>Appointment Title</label><input name="appointmentTitle" required /></div>'
      + '<div class="admin-field"><label>Staff No. (blank = vacant seat)</label><input name="staffNo" /></div>'
      + '<div class="admin-field is-checkbox"><input type="checkbox" name="isPrimary" id="appt-primary" checked /><label for="appt-primary">Primary seat</label></div>'
      + '<div class="admin-field is-checkbox"><input type="checkbox" name="isActing" id="appt-acting" /><label for="appt-acting">Acting appointment</label></div>'
      + '<div class="admin-field"><label>Notes</label><input name="notes" /></div>'
      + '</div>'
      + '<div class="admin-form-actions"><button type="submit" class="btn-gold">Add Appointment</button><span class="admin-form-status" id="appt-form-status"></span></div>'
      + '</form>';
    document.getElementById('appt-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      apiPost('create-appointment', {
        officeName: office.name, appointmentTitle: fd.get('appointmentTitle'),
        staffNo: fd.get('staffNo') || undefined, isPrimary: !!fd.get('isPrimary'), isActing: !!fd.get('isActing'),
        notes: fd.get('notes') || undefined,
      }).then(function (r) {
        if (r.ok) { statusEl('appt-form-status', 'Added. Reloading…', true); tryLoad(function () { selectOffice(state.offices.filter(function (o) { return o.id === office.id; })[0]); document.querySelector('.office-tab[data-tab="appointments"]').click(); }); }
        else statusEl('appt-form-status', r.data.error || 'Could not add.', false);
      });
    });
    el.querySelectorAll('.admin-end-appt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('End this appointment?')) return;
        apiPost('end-appointment', { appointmentId: Number(btn.dataset.id) }).then(function (r) {
          if (r.ok) tryLoad(function () { selectOffice(state.offices.filter(function (o) { return o.id === office.id; })[0]); document.querySelector('.office-tab[data-tab="appointments"]').click(); });
        });
      });
    });
  }

  function renderMeetingsTab(office, meetings) {
    var el = document.getElementById('admin-panel-meetings');
    if (!el) return;
    var rows = (meetings || []).map(function (m) {
      return '<tr><td>' + esc(m.title) + '</td><td>' + fmtDate(m.meetingDate) + '</td><td>' + esc(m.status) + '</td></tr>';
    }).join('') || '<tr><td colspan="3">No meetings recorded yet.</td></tr>';
    el.innerHTML =
      '<div style="padding:20px 26px 0;overflow-x:auto;"><table class="admin-table"><thead><tr><th>Title</th><th>Date</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<form class="admin-form" id="meeting-form">'
      + '<div class="admin-form-grid">'
      + '<div class="admin-field"><label>Title</label><input name="title" required /></div>'
      + '<div class="admin-field"><label>Date</label><input type="date" name="meetingDate" required /></div>'
      + '<div class="admin-field"><label>Status</label><select name="status"><option value="scheduled">Scheduled</option><option value="held">Held</option><option value="cancelled">Cancelled</option></select></div>'
      + '<div class="admin-field"><label>Agenda</label><textarea name="agendaText"></textarea></div>'
      + '</div>'
      + '<div class="admin-form-actions"><button type="submit" class="btn-gold">Add Meeting</button><span class="admin-form-status" id="meeting-form-status"></span></div>'
      + '</form>';
    document.getElementById('meeting-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      apiPost('create-meeting', {
        officeName: office.name, title: fd.get('title'), meetingDate: fd.get('meetingDate'),
        status: fd.get('status'), agendaText: fd.get('agendaText') || undefined,
      }).then(function (r) {
        if (r.ok) { statusEl('meeting-form-status', 'Added.', true); loadTab('meetings'); }
        else statusEl('meeting-form-status', r.data.error || 'Could not add.', false);
      });
    });
  }

  function renderDocumentsTab(office, documents) {
    var el = document.getElementById('admin-panel-documents');
    if (!el) return;
    var rows = (documents || []).map(function (d) {
      return '<tr><td>' + esc(d.title) + '</td><td>' + (d.externalUrl ? '<a href="' + esc(d.externalUrl) + '" target="_blank" rel="noopener">Link</a>' : '—') + '</td><td>' + fmtDate(d.createdAt) + '</td></tr>';
    }).join('') || '<tr><td colspan="3">No documents recorded yet.</td></tr>';
    el.innerHTML =
      '<div style="padding:20px 26px 0;overflow-x:auto;"><table class="admin-table"><thead><tr><th>Title</th><th>Link</th><th>Added</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<form class="admin-form" id="doc-form">'
      + '<div class="admin-form-grid">'
      + '<div class="admin-field"><label>Title</label><input name="title" required /></div>'
      + '<div class="admin-field"><label>External URL</label><input name="externalUrl" type="url" /></div>'
      + '<div class="admin-field"><label>Description</label><input name="description" /></div>'
      + '</div>'
      + '<div class="admin-form-actions"><button type="submit" class="btn-gold">Add Document</button><span class="admin-form-status" id="doc-form-status"></span></div>'
      + '</form>';
    document.getElementById('doc-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      apiPost('create-document', {
        officeName: office.name, title: fd.get('title'),
        externalUrl: fd.get('externalUrl') || undefined, description: fd.get('description') || undefined,
      }).then(function (r) {
        if (r.ok) { statusEl('doc-form-status', 'Added.', true); loadTab('documents'); }
        else statusEl('doc-form-status', r.data.error || 'Could not add.', false);
      });
    });
  }

  function renderResolutionsTab(office, resolutions) {
    var el = document.getElementById('admin-panel-resolutions');
    if (!el) return;
    var rows = (resolutions || []).map(function (r) {
      return '<tr><td>' + esc(r.resolutionNumber || '—') + '</td><td>' + esc(r.title) + '</td><td>' + esc(r.status) + '</td></tr>';
    }).join('') || '<tr><td colspan="3">No resolutions recorded yet.</td></tr>';
    el.innerHTML =
      '<div style="padding:20px 26px 0;overflow-x:auto;"><table class="admin-table"><thead><tr><th>No.</th><th>Title</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<form class="admin-form" id="res-form">'
      + '<div class="admin-form-grid">'
      + '<div class="admin-field"><label>Resolution Number</label><input name="resolutionNumber" placeholder="GV-R-2026-01" /></div>'
      + '<div class="admin-field"><label>Title</label><input name="title" required /></div>'
      + '<div class="admin-field"><label>Status</label><select name="status"><option value="draft">Draft</option><option value="adopted">Adopted</option><option value="rescinded">Rescinded</option></select></div>'
      + '<div class="admin-field"><label>Summary</label><textarea name="summaryText"></textarea></div>'
      + '</div>'
      + '<div class="admin-form-actions"><button type="submit" class="btn-gold">Add Resolution</button><span class="admin-form-status" id="res-form-status"></span></div>'
      + '</form>';
    document.getElementById('res-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      apiPost('create-resolution', {
        officeName: office.name, resolutionNumber: fd.get('resolutionNumber') || undefined,
        title: fd.get('title'), status: fd.get('status'), summaryText: fd.get('summaryText') || undefined,
      }).then(function (r) {
        if (r.ok) { statusEl('res-form-status', 'Added.', true); loadTab('resolutions'); }
        else statusEl('res-form-status', r.data.error || 'Could not add.', false);
      });
    });
  }

  // Board Papers Centre — action items: a traceable owner + due date for a
  // decision made in a meeting or resolution, not just prose in minutes_text.
  function renderActionItemsTab(office, actionItems) {
    var el = document.getElementById('admin-panel-action-items');
    if (!el) return;
    var rows = (actionItems || []).map(function (a) {
      return '<tr class="' + (a.isOverdue ? 'is-overdue' : '') + '"><td>' + esc(a.title) + '</td><td>'
        + (a.owner ? esc(a.owner.fullName) : '—') + '</td><td>' + (a.dueDate ? fmtDate(a.dueDate) : '—') + '</td><td>'
        + esc(a.isOverdue ? 'overdue' : a.status.replace('_', ' ')) + '</td></tr>';
    }).join('') || '<tr><td colspan="4">No action items recorded yet.</td></tr>';
    el.innerHTML =
      '<div style="padding:20px 26px 0;overflow-x:auto;"><table class="admin-table"><thead><tr><th>Title</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<form class="admin-form" id="ai-form">'
      + '<div class="admin-form-grid">'
      + '<div class="admin-field"><label>Title</label><input name="title" required /></div>'
      + '<div class="admin-field"><label>Owner Staff No. (optional)</label><input name="ownerStaffNo" /></div>'
      + '<div class="admin-field"><label>Due Date</label><input type="date" name="dueDate" /></div>'
      + '<div class="admin-field"><label>Status</label><select name="status"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select></div>'
      + '<div class="admin-field"><label>Description</label><textarea name="description"></textarea></div>'
      + '</div>'
      + '<div class="admin-form-actions"><button type="submit" class="btn-gold">Add Action Item</button><span class="admin-form-status" id="ai-form-status"></span></div>'
      + '</form>';
    document.getElementById('ai-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      apiPost('create-action-item', {
        officeName: office.name, title: fd.get('title'), ownerStaffNo: fd.get('ownerStaffNo') || undefined,
        dueDate: fd.get('dueDate') || undefined, status: fd.get('status'), description: fd.get('description') || undefined,
      }).then(function (r) {
        if (r.ok) { statusEl('ai-form-status', 'Added.', true); loadTab('action-items'); }
        else statusEl('ai-form-status', r.data.error || 'Could not add.', false);
      });
    });
  }

  // ---- New Office / New Staff (not office-scoped) ----
  var OFFICE_TYPES = ['governance', 'executive', 'academic', 'support'];
  function renderNewOfficeForm() {
    document.querySelectorAll('.admin-office-row').forEach(function (r) { r.classList.remove('is-selected'); });
    var el = document.getElementById('admin-right-panel');
    el.innerHTML =
      '<div class="portal-child-card"><div class="portal-child-head"><h2>New Office</h2><div class="meta">Adds a real office to the Organisational Directory. Static portal pages are generated separately (node scripts/build-office-portals.js) once a slug/layer are added to scripts/office-portal-config.js.</div></div>'
      + '<form class="admin-form" id="new-office-form">'
      + '<div class="admin-form-grid">'
      + '<div class="admin-field"><label>Name</label><input name="name" required /></div>'
      + '<div class="admin-field"><label>Office Type</label><select name="officeType">' + OFFICE_TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select></div>'
      + '<div class="admin-field"><label>Parent Office (optional)</label><input name="parentOfficeName" list="admin-office-names" /></div>'
      + '<div class="admin-field"><label>Description</label><textarea name="description"></textarea></div>'
      + '</div>'
      + '<datalist id="admin-office-names">' + state.offices.map(function (o) { return '<option value="' + esc(o.name) + '">'; }).join('') + '</datalist>'
      + '<div class="admin-form-actions"><button type="submit" class="btn-gold">Create Office</button><span class="admin-form-status" id="new-office-form-status"></span></div>'
      + '</form></div>';
    document.getElementById('new-office-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      apiPost('create-office', {
        name: fd.get('name'), officeType: fd.get('officeType'),
        parentOfficeName: fd.get('parentOfficeName') || undefined, description: fd.get('description') || undefined,
      }).then(function (r) {
        if (r.ok) { statusEl('new-office-form-status', 'Created. Reloading…', true); tryLoad(); }
        else statusEl('new-office-form-status', r.data.error || 'Could not create.', false);
      });
    });
  }

  function renderNewStaffForm() {
    document.querySelectorAll('.admin-office-row').forEach(function (r) { r.classList.remove('is-selected'); });
    var el = document.getElementById('admin-right-panel');
    el.innerHTML =
      '<div class="portal-child-card"><div class="portal-child-head"><h2>New Staff Record</h2><div class="meta">Creates a real personnel record. Staff never choose their own password — this generates an activation link, exactly like every other login on this platform.</div></div>'
      + '<form class="admin-form" id="new-staff-form">'
      + '<div class="admin-form-grid">'
      + '<div class="admin-field"><label>Full Name</label><input name="fullName" required /></div>'
      + '<div class="admin-field"><label>Preferred Name</label><input name="preferredName" /></div>'
      + '<div class="admin-field"><label>Email (optional — enables OTP login)</label><input name="email" type="email" /></div>'
      + '<div class="admin-field"><label>Office</label><select name="officeName" required><option value="">Select an office…</option>'
        + state.offices.map(function (o) { return '<option value="' + esc(o.name) + '">' + esc(o.name) + '</option>'; }).join('')
        + '</select></div>'
      + '<div class="admin-field"><label>Position Title</label><select name="positionTitle" required><option value="">Select a position…</option>'
        + POSITION_TITLES.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('')
        + '<option value="__other">Other — type it below</option></select></div>'
      + '<div class="admin-field" id="new-staff-other-title-field" style="display:none;"><label>Position Title (other)</label><input name="positionTitleOther" /></div>'
      + '<div class="admin-field"><label>Date Joined</label><input name="dateJoined" type="date" required /></div>'
      + '</div>'
      + '<p class="admin-form-status" style="opacity:.8;">The Staff ID is issued by the institution, not typed here — it is built from the office, institution and join date in the form SHRS-UNIT-OFFICE-DDMMYY-000001, and shown once the record is created. Board and Chief Executive seats take their reserved SHRS-BOT / SHRS-CEO numbers instead.</p>'
      + '<div class="admin-form-actions"><button type="submit" class="btn-gold">Create Staff Record</button><span class="admin-form-status" id="new-staff-form-status"></span></div>'
      + '</form>'
      + '<div id="new-staff-activation" style="padding:0 26px 20px;"></div>'
      + '</div>';
    var titleSel = document.querySelector('#new-staff-form [name="positionTitle"]');
    if (titleSel) titleSel.addEventListener('change', function () {
      var other = document.getElementById('new-staff-other-title-field');
      if (other) other.style.display = titleSel.value === '__other' ? '' : 'none';
    });
    document.getElementById('new-staff-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var title = fd.get('positionTitle');
      if (title === '__other') title = (fd.get('positionTitleOther') || '').toString().trim();
      // No staffNo is sent: the server issues it. The number it returns
      // is what every later call uses, so nothing here has to guess it.
      apiPost('create-staff', {
        fullName: fd.get('fullName'), preferredName: fd.get('preferredName') || undefined,
        email: fd.get('email') || undefined, officeName: fd.get('officeName') || undefined,
        positionTitle: title || undefined, dateJoined: fd.get('dateJoined') || undefined,
      }).then(function (r) {
        if (!r.ok) { statusEl('new-staff-form-status', r.data.error || 'Could not create.', false); return; }
        var staffNo = r.data.staffNo;
        statusEl('new-staff-form-status', 'Staff ID issued: ' + staffNo + '. Generating activation link…', true);
        apiPost('create-login', { staffNo: staffNo }).then(function (r2) {
          var out = document.getElementById('new-staff-activation');
          if (r2.ok && r2.data.activationLink) {
            out.innerHTML = '<div class="portal-empty" style="border-color:var(--gold);">'
              + '<strong>Staff ID:</strong> <code>' + esc(staffNo) + '</code><br><br>'
              + 'Activation link (send this to the staff member):<br><code style="word-break:break-all;">' + esc(r2.data.activationLink) + '</code></div>';
          } else if (out) {
            out.innerHTML = '<div class="portal-empty">Staff record created as <code>' + esc(staffNo) + '</code>, but the activation link could not be generated: ' + esc((r2.data && r2.data.error) || 'unknown error') + '</div>';
          }
        });
      });
    });
  }

  // ================================================================
  // Staff Directory — Founder Override Directive ("Eliminate PowerShell
  // Role Assignment"). Ordinary institutional onboarding (grant/revoke
  // role, suspend/activate, view permission summary, view audit trail)
  // now happens here instead of a curl/PowerShell call against
  // admin/staff.js directly.
  // ================================================================
  var ROLE_LABELS = {
    EXE: 'Executive (EXE)', PRIN: 'Principal / Head Teacher', VP: 'Vice Principal',
    REG: 'Registrar', AREG: 'Assistant Registrar', ADM: 'Admissions Officer',
    FIN: 'Finance Officer', TCH: 'Teacher', MUH: 'Muhaffiz/Muhaffizah',
    ARB: 'Islamic and Arabic Studies Instructor', 'QC-OFF': "Qur'an College Officer",
    SA: 'Student Affairs Officer', BRD: 'Boarding Officer', ICT: 'ICT Administrator',
    SYSADMIN: 'System Administrator', DSL: 'Designated Safeguarding Lead',
  };
  var ROLE_CODES = Object.keys(ROLE_LABELS);

  // Position titles are what a person is called; roles are what the
  // system lets them do. They are related but not the same, so this is
  // its own list rather than a reuse of ROLE_LABELS — a Vice Principal
  // (Academic) and a Vice Principal (Administration) share one role
  // code and are not the same job. "Other" stays available because no
  // fixed list survives contact with a real staffroom.
  var POSITION_TITLES = [
    'Head of Schools & Administrator',
    'Chairman, Board of Governors',
    'Member, Board of Governors',
    'Registrar', 'Assistant Registrar',
    'Principal', 'Head Teacher', 'Vice Principal (Academic)', 'Vice Principal (Administration)',
    'Admissions Officer', 'Finance Officer', 'Bursar',
    'Teacher', 'Head of Department', 'Class Teacher', 'Subject Teacher',
    'Muhaffiz / Muhaffizah', 'Islamic and Arabic Studies Instructor',
    'Student Affairs Officer', 'Boarding Officer', 'Designated Safeguarding Lead',
    'ICT Administrator', 'System Administrator',
    'Librarian', 'Examinations Officer', 'Communications Officer',
    'Human Resources Officer', 'Administrative Assistant',
  ];

  // Founder Authority Framework — a chronological, read-only register
  // over appointments/staff_roles/delegations (functions/api/portal/
  // admin/authority-register.js). No new writes happen here; this view
  // only makes traceable what the existing "+ New Staff", "Grant Role",
  // and the session-authenticated Delegation System already write.
  var AUTHORITY_CATEGORY_LABEL = {
    appointment: 'Appointment', role: 'Role', executive_authority: 'Executive Authority', delegation: 'Delegation',
  };
  function fetchAuthorityRegister(params) {
    var qs = new URLSearchParams(params || {});
    return fetch('/api/portal/admin/authority-register?' + qs.toString(), {
      headers: { 'x-sysadmin-token': state.token, accept: 'application/json' },
    }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; }); });
  }

  function renderAuthorityRegister() {
    var el = document.getElementById('admin-right-panel');
    if (!el) return;
    el.innerHTML =
      '<div class="portal-child-card">'
      + '<div class="portal-child-head"><h2>Authority Register</h2><div class="meta">Every appointment, role grant/revocation, and delegation, merged into one traceable record — "who did what, when, why." Executive (EXE) grants and revocations are marked separately: only an existing Executive may touch that role.</div></div>'
      + '<div style="padding:0 26px 16px;display:flex;gap:10px;">'
      + '<input type="text" id="authority-staff-filter" placeholder="Filter by Staff No. (optional)" style="flex:1;padding:10px 12px;border:1px solid var(--line);background:var(--portal-card);font-family:inherit;font-size:0.9rem;color:var(--ink);" />'
      + '<button type="button" class="btn-outline" id="authority-filter-btn">Filter</button>'
      + '</div>'
      + '<div id="authority-register-list" style="padding:0 26px 20px;">Loading…</div>'
      + '</div>';

    function run() {
      var staffNo = document.getElementById('authority-staff-filter').value.trim();
      var listEl = document.getElementById('authority-register-list');
      listEl.textContent = 'Loading…';
      fetchAuthorityRegister(staffNo ? { staffNo: staffNo } : {}).then(function (r) {
        if (!r.ok) { listEl.innerHTML = '<div class="portal-empty">' + esc((r.data && r.data.error) || 'Could not load the Authority Register.') + '</div>'; return; }
        var events = r.data.events || [];
        if (!events.length) { listEl.innerHTML = '<div class="portal-empty">No authority events recorded yet.</div>'; return; }
        listEl.innerHTML = events.map(function (e) {
          var isExe = e.category === 'executive_authority';
          return '<div class="admin-office-row" style="cursor:default;align-items:flex-start;flex-direction:column;gap:4px;'
            + (isExe ? 'border-inline-start:3px solid var(--gold-bright,var(--gold));' : '') + '">'
            + '<div style="display:flex;gap:8px;align-items:center;">'
            + '<span class="aor-badge">' + esc(AUTHORITY_CATEGORY_LABEL[e.category] || e.category) + '</span>'
            + '<span class="aor-badge" style="opacity:.75;">' + esc(e.action) + '</span>'
            + '<span style="margin-inline-start:auto;font-size:0.76rem;color:var(--ink-soft);">' + esc(fmtDate(e.at)) + '</span>'
            + '</div>'
            + '<div style="font-size:0.9rem;">' + esc(e.summary) + '</div>'
            + (e.reason ? '<div style="font-size:0.8rem;color:var(--ink-soft);font-style:italic;">Reason: ' + esc(e.reason) + '</div>' : '')
            + '</div>';
        }).join('');
      });
    }
    document.getElementById('authority-filter-btn').addEventListener('click', run);
    document.getElementById('authority-staff-filter').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    run();
  }

  function renderStaffDirectory(q) {
    var el = document.getElementById('admin-right-panel');
    if (!el) return;
    el.innerHTML =
      '<div class="portal-child-card">'
      + '<div class="portal-child-head"><h2>Staff Directory</h2><div class="meta">Grant/revoke roles, suspend/activate accounts, view permission summaries and the audit trail — no PowerShell required.</div></div>'
      + '<div style="padding:0 26px 16px;display:flex;gap:10px;">'
      + '<input type="search" id="staff-dir-search" placeholder="Search by name or Staff No." value="' + esc(q || '') + '" style="flex:1;padding:10px 12px;border:1px solid var(--line);background:var(--portal-card);font-family:inherit;font-size:0.9rem;color:var(--ink);" />'
      + '<button type="button" class="btn-outline" id="staff-dir-search-btn">Search</button>'
      + '</div>'
      + '<div id="staff-dir-list" style="padding:0 26px 10px;">Loading…</div>'
      + '</div>'
      + '<div id="staff-dir-detail" style="margin-top:20px;"></div>';

    function runSearch() {
      var query = document.getElementById('staff-dir-search').value.trim();
      apiGet('staff', query ? { q: query } : {}).then(function (r) {
        var listEl = document.getElementById('staff-dir-list');
        if (!listEl) return;
        if (!r.ok) { listEl.innerHTML = '<div class="portal-empty">' + esc(r.data.error || 'Could not load staff.') + '</div>'; return; }
        var rows = (r.data.staff || []);
        if (!rows.length) { listEl.innerHTML = '<div class="portal-empty">No staff records match.</div>'; return; }
        listEl.innerHTML = '<table class="admin-table"><thead><tr><th>Staff No.</th><th>Name</th><th>Position</th><th>Roles</th><th>Status</th></tr></thead><tbody>'
          + rows.map(function (s) {
            var roleBadges = (s.roles || []).map(function (rl) { return '<span class="aor-badge">' + esc(rl.roleName || rl.roleCode) + '</span>'; }).join(' ') || '<span style="color:var(--ink-soft);">No roles</span>';
            return '<tr class="admin-office-row" data-staff-no="' + esc(s.staffNo) + '"><td>' + esc(s.staffNo) + '</td><td>' + esc(s.preferredName || s.fullName) + '</td><td>' + esc(s.positionTitle || '—') + '</td><td>' + roleBadges + '</td><td>' + esc(s.status) + '</td></tr>';
          }).join('') + '</tbody></table>';
        listEl.querySelectorAll('tr[data-staff-no]').forEach(function (row) {
          row.addEventListener('click', function () { renderStaffDetail(row.dataset.staffNo); });
        });
      });
    }
    document.getElementById('staff-dir-search-btn').addEventListener('click', runSearch);
    document.getElementById('staff-dir-search').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });
    runSearch();
  }

  function renderStaffDetail(staffNo) {
    var detailEl = document.getElementById('staff-dir-detail');
    if (!detailEl) return;
    apiGet('staff', { q: staffNo }).then(function (r) {
      if (!r.ok || !(r.data.staff || []).length) { detailEl.innerHTML = '<div class="portal-empty">Could not load that staff record.</div>'; return; }
      var s = (r.data.staff || []).filter(function (x) { return x.staffNo === staffNo; })[0] || r.data.staff[0];
      var roleRows = (s.roles || []).map(function (rl) {
        return '<div class="admin-office-row" style="cursor:default;"><span>' + esc(rl.roleName || rl.roleCode)
          + (rl.institutionName ? ' — ' + esc(rl.institutionName) : '') + (rl.officeName ? ' (' + esc(rl.officeName) + ')' : '')
          + '</span><button type="button" class="btn-outline" data-revoke-role-id="' + rl.staffRoleId + '" style="margin-inline-start:auto;padding:4px 10px;font-size:0.72rem;">Revoke</button></div>';
      }).join('') || '<div class="portal-empty">No active roles.</div>';
      var statusToggleLabel = s.status === 'active' ? 'Suspend' : 'Activate';
      var statusToggleValue = s.status === 'active' ? 'suspended' : 'active';

      detailEl.innerHTML =
        '<div class="portal-child-card">'
        + '<div class="portal-child-head"><h2>' + esc(s.preferredName || s.fullName) + '</h2><div class="meta">' + esc(s.staffNo) + ' &middot; ' + esc(s.positionTitle || 'No position title') + ' &middot; Status: ' + esc(s.status) + '</div></div>'
        + '<div style="padding:0 26px 20px;">'
        + '<h4 style="font-family:\'Cinzel\',\'Amiri\',serif;font-size:0.78rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px;">Active Roles</h4>'
        + roleRows
        + '<form id="staff-detail-grant-form" style="margin-top:16px;">'
        + '<div class="admin-form-grid">'
        + '<div class="admin-field"><label>Grant Role</label><select name="roleCode">' + ROLE_CODES.map(function (c) { return '<option value="' + c + '">' + esc(ROLE_LABELS[c]) + '</option>'; }).join('') + '</select></div>'
        + '<div class="admin-field"><label>Institution (optional)</label><input name="institutionName" list="admin-institution-names" /></div>'
        + '<div class="admin-field"><label>Office (optional)</label><input name="officeName" list="admin-office-names" /></div>'
        + '<div class="admin-field"><label>Reason</label><input name="reason" placeholder="Why is this being granted?" /></div>'
        + '</div>'
        + '<datalist id="admin-institution-names">'
        + ['Nursery and Primary School', 'Royal College', 'Islamic and Arabic Studies', "Qur'an College"].map(function (n) { return '<option value="' + esc(n) + '">'; }).join('')
        + '</datalist>'
        + '<datalist id="admin-office-names">' + state.offices.map(function (o) { return '<option value="' + esc(o.name) + '">'; }).join('') + '</datalist>'
        + '<div class="admin-form-actions"><button type="submit" class="btn-gold">Grant Role</button><span class="admin-form-status" id="staff-detail-grant-status"></span></div>'
        + '</form>'
        + '<div class="admin-form-actions" style="margin-top:18px;flex-wrap:wrap;">'
        + '<button type="button" class="btn-outline" id="staff-detail-status-btn">' + statusToggleLabel + ' This Account</button>'
        + '<button type="button" class="btn-outline" id="staff-detail-permissions-btn">View Permission Summary</button>'
        + '<button type="button" class="btn-outline" id="staff-detail-audit-btn">View Audit Trail</button>'
        + '</div>'
        + '<div id="staff-detail-output" style="margin-top:14px;"></div>'
        + '</div></div>';

      detailEl.querySelectorAll('[data-revoke-role-id]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!window.confirm('Revoke this role assignment?')) return;
          apiPost('revoke-role', { staffRoleId: Number(btn.dataset.revokeRoleId), reason: 'Revoked via Staff Directory' }).then(function (r) {
            if (!r.ok) { window.alert(r.data.error || 'Could not revoke that role.'); return; }
            renderStaffDetail(staffNo);
          });
        });
      });

      document.getElementById('staff-detail-grant-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        apiPost('grant-role', {
          staffNo: staffNo, roleCode: fd.get('roleCode'),
          institutionName: fd.get('institutionName') || undefined, officeName: fd.get('officeName') || undefined,
          reason: fd.get('reason') || undefined,
        }).then(function (r) {
          if (!r.ok) { statusEl('staff-detail-grant-status', r.data.error || 'Could not grant that role.', false); return; }
          statusEl('staff-detail-grant-status', 'Role granted.', true);
          renderStaffDetail(staffNo);
        });
      });

      document.getElementById('staff-detail-status-btn').addEventListener('click', function () {
        if (!window.confirm(statusToggleLabel + ' ' + (s.preferredName || s.fullName) + '\'s account?')) return;
        apiPost('update-staff-status', { staffNo: staffNo, status: statusToggleValue }).then(function (r) {
          if (!r.ok) { window.alert(r.data.error || 'Could not update status.'); return; }
          renderStaffDetail(staffNo);
        });
      });

      document.getElementById('staff-detail-permissions-btn').addEventListener('click', function () {
        apiGet('permissions', { staffNo: staffNo }).then(function (r) {
          var out = document.getElementById('staff-detail-output');
          if (!r.ok) { out.innerHTML = '<div class="portal-empty">' + esc(r.data.error || 'Could not load permissions.') + '</div>'; return; }
          var grants = r.data.grants || [];
          out.innerHTML = '<h4 style="font-family:\'Cinzel\',\'Amiri\',serif;font-size:0.78rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px;">Effective Permission Grants</h4>'
            + (grants.length ? '<table class="admin-table"><thead><tr><th>Role</th><th>Source</th><th>Institution</th></tr></thead><tbody>'
              + grants.map(function (g) { return '<tr><td>' + esc(ROLE_LABELS[g.roleCode] || g.roleCode) + '</td><td>' + esc(g.source) + '</td><td>' + (g.institutionId ? 'Institution #' + g.institutionId : 'All') + '</td></tr>'; }).join('')
              + '</tbody></table>' : '<div class="portal-empty">No effective grants — this account can perform no permission-gated actions.</div>');
        });
      });

      document.getElementById('staff-detail-audit-btn').addEventListener('click', function () {
        apiGet('audit-log', { staffNo: staffNo }).then(function (r) {
          var out = document.getElementById('staff-detail-output');
          if (!r.ok) { out.innerHTML = '<div class="portal-empty">' + esc(r.data.error || 'Could not load the audit trail.') + '</div>'; return; }
          var entries = r.data.entries || [];
          out.innerHTML = '<h4 style="font-family:\'Cinzel\',\'Amiri\',serif;font-size:0.78rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px;">Audit Trail</h4>'
            + (entries.length ? '<table class="admin-table"><thead><tr><th>When</th><th>Event</th><th>By</th><th>Reason</th></tr></thead><tbody>'
              + entries.map(function (a) {
                return '<tr><td>' + fmtDate(a.createdAt) + '</td><td>' + esc(a.eventType) + '</td><td>' + (a.actor ? esc(a.actor.fullName) : '—') + '</td><td>' + esc(a.reason || '—') + '</td></tr>';
              }).join('') + '</tbody></table>' : '<div class="portal-empty">No audit entries yet for this staff member.</div>');
        });
      });
    });
  }
})();
