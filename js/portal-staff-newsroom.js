// Newsroom — the staff UI over functions/api/portal/admin/announcements.js.
//
// That endpoint has had seven actions since it was written and no way to
// reach any of them without curl, which meant the school could not post
// its own notice. This is that missing hand: compose, publish, feature,
// pull back, archive.
//
// Every action is one explicit request, matching the endpoint's own
// refusal to do implicit upserts. Nothing is optimistic — the list is
// re-read after each action, so what the editor sees is what the
// database says, never what this page hoped happened.
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');
  var listEl = document.querySelector('[data-nr-list]');
  var emptyEl = document.querySelector('[data-nr-empty]');
  var countEl = document.querySelector('[data-nr-count]');
  var noticeEl = document.querySelector('[data-nr-notice]');
  var formEl = document.querySelector('[data-nr-form]');
  var categoryEl = document.querySelector('[data-nr-category]');
  var formTitleEl = document.querySelector('[data-nr-form-title]');
  var formNoteEl = document.querySelector('[data-nr-form-note]');
  var editingEl = document.querySelector('[data-nr-editing]');
  var editingTitleEl = document.querySelector('[data-nr-editing-title]');
  var submitEl = document.querySelector('[data-nr-submit]');
  var cancelEl = document.querySelector('[data-nr-cancel]');

  // The id being edited, or null when composing. The endpoint has carried
  // an `update` action since it was written and nothing ever called it,
  // so a typo in a published notice could only be met with archive and
  // rewrite — which starts a new row, abandons the RSVP count, and leaves
  // the wrong wording standing in a record that is never deleted.
  var editingId = null;

  // Every field the composer can write. Kept in one place because edit
  // mode has to fill them, clear them, and read them back.
  var FIELDS = ['category', 'title', 'summary', 'body', 'venue', 'eventDate',
                'eventTime', 'actionLabel', 'actionUrl', 'imageUrl'];

  var CATEGORY_LABELS = {
    admissions: 'Admissions',
    events: 'Events',
    academic_notices: 'Academic Notice',
    quran_college: "Qur'ān College",
    arabic_studies: 'Arabic & Islamic Studies',
    scholarships: 'Scholarships',
    parent_notices: 'Parent Notice',
    general: 'General',
  };

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function formatDate(iso) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return String(iso); }
  }

  function notify(message, isError) {
    noticeEl.textContent = message;
    noticeEl.hidden = !message;
    // Tone is an attribute, not an inline colour — the stylesheet owns
    // every colour on this page for the reason its header explains.
    if (isError) noticeEl.setAttribute('data-tone', 'error');
    else noticeEl.removeAttribute('data-tone');
  }

  function button(label, className, handler) {
    var b = el('button', 'nr-btn' + (className ? ' ' + className : ''), label);
    b.type = 'button';
    b.addEventListener('click', function () { handler(b); });
    return b;
  }

  function setField(name, value) {
    var input = formEl.elements[name];
    if (input) input.value = value == null ? '' : String(value);
  }

  // An event_date comes back as a timestamp; <input type="date"> only
  // accepts YYYY-MM-DD, and silently shows nothing if given anything else
  // — which would read as "this notice has no date" and clear a real one
  // on the next save.
  function dateForInput(v) {
    if (!v) return '';
    var s = String(v);
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
  }

  function stopEditing() {
    editingId = null;
    formEl.reset();
    if (formTitleEl) formTitleEl.textContent = 'Write an announcement';
    if (formNoteEl) formNoteEl.textContent = 'Saved as a draft first';
    if (editingEl) editingEl.hidden = true;
    if (submitEl) submitEl.textContent = 'Save as draft';
    if (cancelEl) cancelEl.hidden = true;
  }

  function startEditing(item) {
    editingId = item.id;
    FIELDS.forEach(function (k) {
      setField(k, k === 'eventDate' ? dateForInput(item.eventDate) : item[k]);
    });
    if (formTitleEl) formTitleEl.textContent = 'Edit this announcement';
    if (formNoteEl) {
      formNoteEl.textContent = item.status === 'published'
        ? 'Live — your change shows at once' : 'Draft';
    }
    if (editingTitleEl) editingTitleEl.textContent = item.title;
    if (editingEl) editingEl.hidden = false;
    if (submitEl) submitEl.textContent = 'Save changes';
    if (cancelEl) cancelEl.hidden = false;
    if (formEl.scrollIntoView) formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var first = formEl.elements.title;
    if (first && first.focus) first.focus();
  }

  function renderItem(item) {
    var card = el('div', 'nr-item');
    card.setAttribute('data-status', item.status);
    card.setAttribute('data-featured', String(Boolean(item.isFeatured)));

    var head = el('div', 'nr-item-head');
    head.appendChild(el('span', 'nr-chip nr-chip--category', CATEGORY_LABELS[item.category] || item.category));
    head.appendChild(el('span', 'nr-chip nr-chip--' + item.status, item.status));
    if (item.isFeatured) head.appendChild(el('span', 'nr-chip nr-chip--featured', 'Homepage hero'));
    card.appendChild(head);

    card.appendChild(el('h3', 'nr-item-title', item.title));
    card.appendChild(el('p', 'nr-item-summary', item.summary));

    var meta = [];
    if (item.eventDate) meta.push(formatDate(item.eventDate) + (item.eventTime ? ' · ' + item.eventTime : ''));
    if (item.venue) meta.push(item.venue);
    meta.push(item.publishedAt ? 'Published ' + formatDate(item.publishedAt) : 'Not yet published');
    card.appendChild(el('div', 'nr-item-meta', meta.join(' · ')));

    var actions = el('div', 'nr-actions');
    // Editing is offered in every status, including archived: the archive
    // is permanent, so a mistake left in it is left there for good.
    actions.appendChild(button('Edit', null, function () { startEditing(item); }));
    if (item.status !== 'published') {
      // An archived item can be published again — the endpoint allows
      // it and it is a real need ("run last year's notice again"). But
      // a bare "Publish" on something already archived reads as a
      // mistake, so it says what it is actually doing.
      var archived = item.status === 'archived';
      actions.appendChild(button(archived ? 'Restore and publish' : 'Publish', 'nr-btn--primary', function (b) {
        b.disabled = true;
        act({ action: 'publish', id: item.id },
          archived ? 'Restored and published. It is back on the site.' : 'Published. It is now on the site.');
      }));
    }
    if (item.status === 'published') {
      actions.appendChild(button('Pull back to draft', null, function (b) {
        b.disabled = true;
        act({ action: 'unpublish', id: item.id }, 'Pulled back. It is off the site and editable again.');
      }));
      if (item.isFeatured) {
        actions.appendChild(button('Clear from hero', null, function (b) {
          b.disabled = true;
          act({ action: 'unfeature', id: item.id }, 'Cleared from the homepage hero.');
        }));
      } else {
        actions.appendChild(button('Make homepage hero', null, function (b) {
          b.disabled = true;
          act({ action: 'feature', id: item.id }, 'This is now the homepage hero. Any previous hero was cleared.');
        }));
      }
    }
    if (item.status !== 'archived') {
      actions.appendChild(button('Archive', 'nr-btn--quiet', function (b) {
        if (!window.confirm('Archive "' + item.title + '"? It stays in the record permanently and comes off the live list.')) return;
        b.disabled = true;
        act({ action: 'archive', id: item.id }, 'Archived. It remains in the record.');
      }));
    }
    card.appendChild(actions);
    return card;
  }

  function render(data) {
    var items = data.items || [];
    if (countEl) {
      var live = items.filter(function (i) { return i.status === 'published'; }).length;
      var drafts = items.filter(function (i) { return i.status === 'draft'; }).length;
      countEl.textContent = live + ' live · ' + drafts + ' draft' + (drafts === 1 ? '' : 's');
    }

    // Categories come from the endpoint so the two lists can never
    // drift apart — the CHECK constraint on the column is the truth.
    if (categoryEl && !categoryEl.options.length && data.categories) {
      data.categories.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c;
        opt.textContent = CATEGORY_LABELS[c] || c;
        categoryEl.appendChild(opt);
      });
    }

    listEl.innerHTML = '';
    if (!items.length) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    items.forEach(function (item) { listEl.appendChild(renderItem(item)); });
  }

  async function act(payload, successMessage) {
    try {
      var res = await fetch('/api/portal/admin/announcements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return false; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) { notify(data.error || 'That did not go through.', true); await load(); return false; }
      notify(successMessage, false);
      await load();
      return true;
    } catch (err) {
      notify('That did not go through — please check your connection and try again.', true);
      await load();
      return false;
    }
  }

  async function load() {
    try {
      var res = await fetch('/api/portal/admin/announcements', { headers: { accept: 'application/json' } });
      if (res.status === 401) { window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not load the newsroom.');
      render(data);
    } catch (err) {
      errorMessageEl.textContent = (err && err.message) || 'Could not load the newsroom.';
      errorEl.hidden = false;
      contentEl.hidden = true;
    }
  }

  if (formEl) {
    formEl.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(formEl);
      var editing = editingId != null;
      var payload = editing ? { action: 'update', id: editingId } : { action: 'create' };
      FIELDS.forEach(function (k) {
        var v = (fd.get(k) || '').toString().trim();
        // On create, an empty field is simply not sent — the column keeps
        // its default. On update, an empty field is sent as '', which the
        // endpoint reads as "clear this"; that is the whole point of an
        // editor, and it is why the two modes cannot share one rule.
        if (v) payload[k] = v;
        else if (editing) payload[k] = '';
      });
      if (!payload.category || !payload.title || !payload.summary) {
        notify('A category, a title and a summary are the three things every announcement needs.', true);
        return;
      }
      var submitBtn = submitEl || formEl.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      // Created as a draft, always — the endpoint enforces this, and it is
      // the right default: nothing reaches families by accident.
      var ok = await act(payload, editing
        ? 'Saved. The change is live wherever this announcement already appears.'
        : 'Saved as a draft. Read it once more, then publish it.');
      // Only clear the composer once the work is safely stored. A failed
      // save that emptied the form would cost the editor everything they
      // had just written, which is the worst moment to lose it.
      if (ok) stopEditing();
      if (submitBtn) submitBtn.disabled = false;
    });
  }

  if (cancelEl) {
    cancelEl.addEventListener('click', function () {
      stopEditing();
      notify('Edit abandoned. Nothing was changed.', false);
    });
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
      errorMessageEl.textContent = (err && err.message) || 'Could not load the newsroom.';
      errorEl.hidden = false;
    }
  })();
})();
