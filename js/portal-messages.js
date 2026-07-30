// Institutional Messaging (guardian side) — a real, threaded
// correspondence channel with a specific office. Deliberately separate
// from the AI Assistant widget: the audit flagged "Parent Messages = AI
// Chat" as a real gap (a parent expecting to reach a person and getting
// a generative assistant instead), and this is the fix — persisted
// threads a staff member actually reads and answers, not a chat log.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', init);

  var STATUS_LABEL = { open: 'Awaiting Reply', answered: 'Answered', closed: 'Closed' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return iso; }
  }

  function init() {
    var mount = document.getElementById('portal-messages-mount');
    if (!mount) return;
    mount.hidden = false;
    var state = { view: 'list', offices: [], threads: [], activeThreadId: null };

    Promise.all([
      fetch('/api/portal/messages/offices', { headers: { accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : { offices: [] }; }),
      fetch('/api/portal/messages/list', { headers: { accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : { threads: [] }; }),
    ]).then(function (results) {
      state.offices = results[0].offices || [];
      state.threads = results[1].threads || [];
      renderList(mount, state);
    }).catch(function () {
      mount.innerHTML = '<p class="registrar-hint">Could not load your messages right now.</p>';
    });
  }

  function refreshList(mount, state) {
    fetch('/api/portal/messages/list', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { threads: [] }; })
      .then(function (data) { state.threads = data.threads || []; renderList(mount, state); });
  }

  function renderList(mount, state) {
    state.view = 'list';
    var rows = state.threads.length
      ? state.threads.map(function (t) {
          return '<button type="button" class="registrar-approval-row" data-open-thread="' + t.id + '" style="width:100%;text-align:left;cursor:pointer;">' +
            '<div><strong>' + esc(t.subject) + '</strong><div class="meta">' + esc(t.officeName) + ' · ' + formatDateTime(t.lastMessageAt) + '</div></div>' +
            '<span class="registrar-sample-badge" style="background:' + statusColor(t.status) + ';">' + esc(STATUS_LABEL[t.status] || t.status) + '</span>' +
          '</button>';
        }).join('')
      : '<p class="registrar-hint">No messages yet — use "New Message" to write to any office directly.</p>';

    mount.innerHTML =
      '<div class="portal-child-head" style="display:flex;justify-content:space-between;align-items:center;">' +
        '<h2>Institutional Messaging</h2>' +
        '<button type="button" class="portal-submit" data-new-message style="width:auto;padding:8px 16px;">+ New Message</button>' +
      '</div>' +
      '<p class="registrar-hint" style="padding:0 20px;">Write directly to an office and get a real reply from staff — separate from the AI Assistant, which answers general questions but does not reach a person.</p>' +
      '<div style="padding:0 20px 16px;">' + rows + '</div>';

    mount.querySelector('[data-new-message]').addEventListener('click', function () { renderCompose(mount, state); });
    Array.prototype.forEach.call(mount.querySelectorAll('[data-open-thread]'), function (btn) {
      btn.addEventListener('click', function () { renderThread(mount, state, Number(btn.getAttribute('data-open-thread'))); });
    });
  }

  function statusColor(status) {
    if (status === 'answered') return 'rgba(47,111,79,0.85)';
    if (status === 'closed') return 'rgba(90,90,90,0.75)';
    return 'rgba(180,140,30,0.9)';
  }

  function renderCompose(mount, state) {
    state.view = 'compose';
    var options = state.offices.map(function (o) { return '<option value="' + o.id + '">' + esc(o.name) + '</option>'; }).join('');
    mount.innerHTML =
      '<div class="portal-child-head"><h2>New Message</h2></div>' +
      '<form data-compose-form class="registrar-form-grid" style="padding:0 20px 16px;">' +
        '<div class="portal-field"><label>Office</label><select data-compose-office required><option value="">Select an office…</option>' + options + '</select></div>' +
        '<div class="portal-field"><label>Subject</label><input type="text" data-compose-subject maxlength="200" required /></div>' +
        '<div class="portal-field registrar-field-wide"><label>Message</label><textarea data-compose-body rows="5" maxlength="8000" required></textarea></div>' +
        '<div style="display:flex;gap:10px;">' +
          '<button type="submit" class="portal-submit registrar-form-submit" style="width:auto;">Send</button>' +
          '<button type="button" class="portal-text-btn" data-compose-cancel>Cancel</button>' +
        '</div>' +
        '<div class="registrar-form-result" data-compose-result hidden></div>' +
      '</form>';

    mount.querySelector('[data-compose-cancel]').addEventListener('click', function () { renderList(mount, state); });
    mount.querySelector('[data-compose-form]').addEventListener('submit', function (e) {
      e.preventDefault();
      var officeId = Number(mount.querySelector('[data-compose-office]').value);
      var subject = mount.querySelector('[data-compose-subject]').value.trim();
      var body = mount.querySelector('[data-compose-body]').value.trim();
      var resultBox = mount.querySelector('[data-compose-result]');
      fetch('/api/portal/messages/create', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ officeId: officeId, subject: subject, body: body }),
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (!res.ok) {
            resultBox.hidden = false;
            resultBox.textContent = res.data.error || 'Could not send that message.';
            return;
          }
          refreshList(mount, state);
        }).catch(function () {
          resultBox.hidden = false;
          resultBox.textContent = 'Could not reach the server — please try again.';
        });
    });
  }

  function renderThread(mount, state, threadId) {
    state.view = 'thread';
    state.activeThreadId = threadId;
    fetch('/api/portal/messages/thread?id=' + threadId, { headers: { accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.thread) { renderList(mount, state); return; }
        var t = data.thread;
        var messagesHtml = data.messages.map(function (m) {
          var who = m.senderType === 'guardian' ? 'You' : (m.staffName ? esc(m.staffName) + ' · ' + esc(t.officeName) : esc(t.officeName));
          return '<div class="registrar-timeline-item"><div class="meta">' + who + ' · ' + formatDateTime(m.createdAt) + '</div><p style="margin:4px 0 0;white-space:pre-wrap;">' + esc(m.body) + '</p></div>';
        }).join('');

        var replyHtml = t.status === 'closed'
          ? '<p class="registrar-hint">This thread has been closed by ' + esc(t.officeName) + '. Send a new message if you still need help.</p>'
          : '<form data-thread-reply-form class="registrar-form-grid">' +
              '<div class="portal-field registrar-field-wide"><label>Reply</label><textarea data-reply-body rows="3" maxlength="8000" required></textarea></div>' +
              '<button type="submit" class="portal-submit registrar-form-submit" style="width:auto;">Send Reply</button>' +
              '<div class="registrar-form-result" data-reply-result hidden></div>' +
            '</form>';

        mount.innerHTML =
          '<div class="portal-child-head"><button type="button" class="portal-back-link" data-thread-back style="background:none;border:none;cursor:pointer;">← All Messages</button>' +
            '<h2 style="margin-top:8px;">' + esc(t.subject) + '</h2><div class="meta">' + esc(t.officeName) + ' · ' + esc(STATUS_LABEL[t.status] || t.status) + '</div></div>' +
          '<div class="registrar-timeline" style="padding:0 20px;">' + messagesHtml + '</div>' +
          '<div style="padding:16px 20px;">' + replyHtml + '</div>';

        mount.querySelector('[data-thread-back]').addEventListener('click', function () { refreshList(mount, state); });
        var replyForm = mount.querySelector('[data-thread-reply-form]');
        if (replyForm) {
          replyForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var body = mount.querySelector('[data-reply-body]').value.trim();
            var resultBox = mount.querySelector('[data-reply-result]');
            fetch('/api/portal/messages/reply', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ threadId: threadId, body: body }),
            }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
              .then(function (res) {
                if (!res.ok) { resultBox.hidden = false; resultBox.textContent = res.data.error || 'Could not send that reply.'; return; }
                renderThread(mount, state, threadId);
              }).catch(function () { resultBox.hidden = false; resultBox.textContent = 'Could not reach the server — please try again.'; });
          });
        }
      });
  }
})();
