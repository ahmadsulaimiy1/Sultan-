// The Staff Desk — the read side of four tables that previously only
// had a write side (see functions/api/portal/staff/desk.js for the
// audit that produced this page). Same shell, session and error
// handling as every other staff module here.
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  var SECTIONS = [
    { key: 'escalations', mount: '[data-desk-escalations]', empty: '[data-desk-escalations-empty]', count: '[data-desk-escalations-count]' },
    { key: 'notifications', mount: '[data-desk-notifications]', empty: '[data-desk-notifications-empty]', count: '[data-desk-notifications-count]' },
    { key: 'privacyRequests', mount: '[data-desk-privacy]', empty: '[data-desk-privacy-empty]', count: null },
    { key: 'authAudit', mount: '[data-desk-auth]', empty: '[data-desk-auth-empty]', count: null },
  ];

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function formatWhen(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch (e) { return iso; }
  }

  // A section the signed-in role may not see says so, rather than
  // showing an empty list that reads as "nothing has happened".
  function renderRestricted(mountEl, emptyEl, reason) {
    mountEl.innerHTML = '';
    emptyEl.textContent = reason;
    emptyEl.hidden = false;
  }

  function renderEscalations(section, mountEl, emptyEl, countEl) {
    if (countEl) countEl.textContent = section.open ? section.open + ' open' : 'None open';
    mountEl.innerHTML = '';
    if (!section.items.length) {
      emptyEl.textContent = 'Nobody has asked for a person yet.';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    section.items.forEach(function (e) {
      var card = el('div', 'registrar-approval-card');
      card.appendChild(el('div', 'registrar-approval-head', e.topicLabel + (e.status === 'open' ? '' : ' — ' + e.status)));
      card.appendChild(el('div', 'registrar-approval-meta',
        (e.channel === 'whatsapp' ? 'WhatsApp' : 'Website assistant') + ' · ' + formatWhen(e.createdAt)));
      card.appendChild(el('p', 'registrar-hint', e.summary));
      card.appendChild(el('div', 'registrar-approval-meta',
        e.contact ? 'Contact: ' + e.contact : 'No contact details were given.'));
      if (e.handledByName) {
        card.appendChild(el('div', 'registrar-approval-meta', 'Handled by ' + e.handledByName + ' · ' + formatWhen(e.handledAt)));
      }
      if (e.status === 'open') {
        var btn = el('button', 'portal-topbar-link', 'Mark handled');
        btn.type = 'button';
        btn.addEventListener('click', function () {
          btn.disabled = true;
          act({ action: 'close-escalation', id: e.id });
        });
        card.appendChild(btn);
      }
      mountEl.appendChild(card);
    });
  }

  function renderNotifications(section, mountEl, emptyEl, countEl) {
    if (countEl) countEl.textContent = section.unread ? section.unread + ' unread' : 'All read';
    mountEl.innerHTML = '';
    if (!section.items.length) {
      emptyEl.textContent = 'You have no notifications.';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    section.items.forEach(function (n) {
      var card = el('div', 'registrar-approval-card');
      card.appendChild(el('div', 'registrar-approval-head', n.title + (n.readAt ? '' : ' · new')));
      card.appendChild(el('div', 'registrar-approval-meta', n.category + ' · ' + formatWhen(n.createdAt)));
      card.appendChild(el('p', 'registrar-hint', n.message));
      if (n.actionUrl) {
        var link = el('a', 'portal-back-link', 'Open');
        link.href = n.actionUrl;
        card.appendChild(link);
      }
      if (!n.readAt) {
        var btn = el('button', 'portal-topbar-link', 'Mark read');
        btn.type = 'button';
        btn.addEventListener('click', function () {
          btn.disabled = true;
          act({ action: 'read-notification', id: n.id });
        });
        card.appendChild(btn);
      }
      mountEl.appendChild(card);
    });
  }

  function renderPrivacy(section, mountEl, emptyEl) {
    mountEl.innerHTML = '';
    if (!section.items.length) {
      emptyEl.textContent = 'No data-protection requests have been submitted.';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    section.items.forEach(function (p) {
      var card = el('div', 'registrar-approval-card');
      card.appendChild(el('div', 'registrar-approval-head', p.requestType + ' — ' + p.fullName));
      card.appendChild(el('div', 'registrar-approval-meta', p.email + ' · ' + formatWhen(p.createdAt)));
      if (p.details) card.appendChild(el('p', 'registrar-hint', p.details));
      mountEl.appendChild(card);
    });
  }

  function renderAuth(section, mountEl, emptyEl) {
    mountEl.innerHTML = '';
    if (!section.items.length) {
      emptyEl.textContent = 'No failed sign-ins or lockouts have been recorded.';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    section.items.forEach(function (a) {
      var row = el('div', 'registrar-approval-card');
      row.appendChild(el('div', 'registrar-approval-head', a.event.replace(/_/g, ' ')));
      row.appendChild(el('div', 'registrar-approval-meta',
        a.actorType + ' · ' + (a.identifier || 'unknown identifier') + ' · ' + formatWhen(a.createdAt)));
      mountEl.appendChild(row);
    });
  }

  function render(data) {
    SECTIONS.forEach(function (s) {
      var section = data[s.key];
      var mountEl = document.querySelector(s.mount);
      var emptyEl = document.querySelector(s.empty);
      var countEl = s.count ? document.querySelector(s.count) : null;
      if (!section || !mountEl || !emptyEl) return;
      if (!section.visible) {
        if (countEl) countEl.textContent = 'Restricted';
        renderRestricted(mountEl, emptyEl, section.reason);
        return;
      }
      if (s.key === 'escalations') renderEscalations(section, mountEl, emptyEl, countEl);
      else if (s.key === 'notifications') renderNotifications(section, mountEl, emptyEl, countEl);
      else if (s.key === 'privacyRequests') renderPrivacy(section, mountEl, emptyEl);
      else renderAuth(section, mountEl, emptyEl);
    });
  }

  async function act(payload) {
    try {
      var res = await fetch('/api/portal/staff/desk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      await load();
    } catch (err) {
      errorMessageEl.textContent = 'That action did not go through. Please try again.';
      errorEl.hidden = false;
    }
  }

  async function load() {
    try {
      var res = await fetch('/api/portal/staff/desk', { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not load your desk.');
      render(data);
    } catch (err) {
      errorMessageEl.textContent = (err && err.message) || 'Could not load your desk.';
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
      errorMessageEl.textContent = (err && err.message) || 'Could not load your desk.';
      errorEl.hidden = false;
    }
  })();
})();
