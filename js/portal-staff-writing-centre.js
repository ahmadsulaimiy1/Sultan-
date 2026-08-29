// Writing Centre — office-scoped AI drafting, revision, and issuance of
// institutional correspondence (see correspondence-types.js for the
// full document-type list). Session gate matches every other staff
// page (see portal-staff-documents.js); everything else is this page's
// own draft -> revise -> save -> preview/export -> issue flow, plus
// search, against functions/api/portal/staff/documents/
// {draft,revise,save,get,render,issue,list}.js.
(function () {
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  var officeSelect = document.querySelector('[data-wc-office]');
  var typeSelect = document.querySelector('[data-wc-type]');
  var toneSelect = document.querySelector('[data-wc-tone]');
  var recipientNameInput = document.querySelector('[data-wc-recipient-name]');
  var recipientRoleInput = document.querySelector('[data-wc-recipient-role]');
  var notesArea = document.querySelector('[data-wc-notes]');
  var generateBtn = document.querySelector('[data-wc-generate-btn]');
  var generateStatus = document.querySelector('[data-wc-generate-status]');

  var draftSections = document.querySelectorAll('[data-wc-draft-section]');
  var titleInput = document.querySelector('[data-wc-title]');
  var subjectInput = document.querySelector('[data-wc-subject]');
  var signatoryNameInput = document.querySelector('[data-wc-signatory-name]');
  var signatoryTitleInput = document.querySelector('[data-wc-signatory-title]');
  var bodyEl = document.querySelector('[data-wc-body]');
  var saveBtn = document.querySelector('[data-wc-save-btn]');
  var previewBtn = document.querySelector('[data-wc-preview-btn]');
  var pdfBtn = document.querySelector('[data-wc-pdf-btn]');
  var mdBtn = document.querySelector('[data-wc-md-btn]');
  var txtBtn = document.querySelector('[data-wc-txt-btn]');
  var issueBtn = document.querySelector('[data-wc-issue-btn]');
  var draftStatus = document.querySelector('[data-wc-draft-status]');
  var clarifyEl = document.querySelector('[data-wc-clarify]');
  var clarifyQuestionsEl = document.querySelector('[data-wc-clarify-questions]');

  var customInstructionInput = document.querySelector('[data-wc-custom-instruction]');
  var targetLangInput = document.querySelector('[data-wc-target-lang]');
  var targetTypeSelect = document.querySelector('[data-wc-target-type]');
  var applyRevisionBtn = document.querySelector('[data-wc-apply-revision]');
  var undoRevisionBtn = document.querySelector('[data-wc-undo-revision]');
  var reviseStatus = document.querySelector('[data-wc-revise-status]');
  var quickActionBtns = document.querySelectorAll('[data-wc-quick]');
  var lastBodyHtml = null;

  var listEl = document.querySelector('[data-wc-list]');
  var searchInput = document.querySelector('[data-wc-search]');
  var searchBtn = document.querySelector('[data-wc-search-btn]');
  var searchClearBtn = document.querySelector('[data-wc-search-clear]');
  var exportBtns = [previewBtn, pdfBtn, mdBtn, txtBtn];

  var currentId = null;

  function showDraftSection() {
    draftSections.forEach(function (el) { el.hidden = false; });
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  async function fetchJson(url, options) {
    var res = await fetch(url, options);
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  async function loadList(query) {
    listEl.innerHTML = '<p class="registrar-field-note" style="padding:14px 20px;">Loading…</p>';
    try {
      var url = '/api/portal/staff/documents/list' + (query ? '?q=' + encodeURIComponent(query) : '');
      var data = await fetchJson(url);
      officeSelect.innerHTML = data.offices.map(function (o) {
        return '<option value="' + o.id + '">' + escapeHtml(o.name) + '</option>';
      }).join('');
      if (!data.offices.length) {
        listEl.innerHTML = '<p class="registrar-field-note" style="padding:14px 20px;">You do not currently hold an office, so there is nothing to draft on behalf of yet.</p>';
        generateBtn.disabled = true;
        return;
      }
      if (!data.documents.length) {
        listEl.innerHTML = '<p class="registrar-field-note" style="padding:14px 20px;">' + (query ? 'No documents match "' + escapeHtml(query) + '".' : 'No documents yet.') + '</p>';
        return;
      }
      listEl.innerHTML = data.documents.map(function (d) {
        var statusLabel = d.status === 'issued' ? 'Issued' : d.status === 'draft' ? 'Draft' : 'Revoked';
        var when = d.issuedAt ? new Date(d.issuedAt) : new Date(d.updatedAt);
        var actions = '<button type="button" class="registrar-btn" data-wc-open="' + d.id + '">Open</button> '
          + '<button type="button" class="registrar-btn" data-wc-preview="' + d.id + '">Preview</button>';
        return '<div class="registrar-approval-row">'
          + '<div><strong>' + escapeHtml(d.title || '(untitled)') + '</strong><br>'
          + '<span class="registrar-field-note">' + escapeHtml(d.officeName) + ' &middot; ' + escapeHtml(d.documentType) + ' &middot; ' + statusLabel
          + (d.referenceNo ? ' &middot; ' + escapeHtml(d.referenceNo) : '') + ' &middot; ' + when.toISOString().slice(0, 10) + '</span></div>'
          + '<div>' + actions + '</div>'
          + '</div>';
      }).join('');
      listEl.querySelectorAll('[data-wc-preview]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          window.open('/api/portal/staff/documents/render?id=' + btn.getAttribute('data-wc-preview'), '_blank');
        });
      });
      listEl.querySelectorAll('[data-wc-open]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = Number(btn.getAttribute('data-wc-open'));
          var doc = data.documents.find(function (d) { return d.id === id; });
          if (!doc || doc.status !== 'draft') {
            window.open('/api/portal/staff/documents/render?id=' + id, '_blank');
            return;
          }
          openExistingDraft(id);
        });
      });
    } catch (err) {
      listEl.innerHTML = '<p class="registrar-field-note" style="padding:14px 20px;">Could not load documents: ' + err.message + '</p>';
    }
  }

  async function openExistingDraft(id) {
    draftStatus.textContent = 'Loading draft #' + id + '…';
    try {
      var full = await fetchJson('/api/portal/staff/documents/get?id=' + id);
      currentId = full.id;
      officeSelect.value = String(full.officeId);
      typeSelect.value = full.documentType;
      toneSelect.value = full.tone || 'professional';
      recipientNameInput.value = full.recipientName || '';
      recipientRoleInput.value = full.recipientRole || '';
      notesArea.value = full.sourceNotes || '';
      titleInput.value = full.title || '';
      subjectInput.value = full.subject || '';
      signatoryNameInput.value = full.signatoryName || '';
      signatoryTitleInput.value = full.signatoryTitle || '';
      bodyEl.innerHTML = full.bodyHtml || '';
      exportBtns.forEach(function (b) { b.disabled = false; });
      issueBtn.disabled = full.status !== 'draft';
      lastBodyHtml = null;
      undoRevisionBtn.disabled = true;
      reviseStatus.textContent = '';
      showDraftSection();
      draftStatus.textContent = 'Loaded draft #' + id + ' — edit below, then Save.';
      window.scrollTo({ top: draftSections[0].offsetTop - 20, behavior: 'smooth' });
    } catch (err) {
      draftStatus.textContent = err.message;
    }
  }

  generateBtn.addEventListener('click', async function () {
    var notes = notesArea.value.trim();
    if (!notes) { generateStatus.textContent = 'Paste some notes first.'; return; }
    generateBtn.disabled = true;
    generateStatus.textContent = 'Drafting…';
    clarifyEl.hidden = true;
    try {
      var data = await fetchJson('/api/portal/staff/documents/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          officeId: Number(officeSelect.value),
          documentType: typeSelect.value,
          tone: toneSelect.value,
          recipientName: recipientNameInput.value.trim(),
          recipientRole: recipientRoleInput.value.trim(),
          notes: notes,
        }),
      });
      if (data.needsInfo) {
        clarifyQuestionsEl.innerHTML = data.questions.map(function (q) {
          return '<li>' + escapeHtml(q) + '</li>';
        }).join('');
        clarifyEl.hidden = false;
        generateStatus.textContent = 'A few questions below before it can draft this.';
        return;
      }
      currentId = null;
      titleInput.value = data.title || '';
      subjectInput.value = data.subject || '';
      signatoryNameInput.value = '';
      signatoryTitleInput.value = '';
      bodyEl.innerHTML = data.bodyHtml || '';
      exportBtns.forEach(function (b) { b.disabled = true; });
      issueBtn.disabled = true;
      lastBodyHtml = null;
      undoRevisionBtn.disabled = true;
      reviseStatus.textContent = '';
      showDraftSection();
      draftStatus.textContent = 'Drafted. Review, add a signatory, then Save.';
      generateStatus.textContent = 'Draft ready below.';
      window.scrollTo({ top: draftSections[0].offsetTop - 20, behavior: 'smooth' });
    } catch (err) {
      generateStatus.textContent = err.message;
    } finally {
      generateBtn.disabled = false;
    }
  });

  saveBtn.addEventListener('click', async function () {
    saveBtn.disabled = true;
    draftStatus.textContent = 'Saving…';
    try {
      var data = await fetchJson('/api/portal/staff/documents/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: currentId,
          officeId: Number(officeSelect.value),
          documentType: typeSelect.value,
          tone: toneSelect.value,
          title: titleInput.value.trim(),
          subject: subjectInput.value.trim(),
          recipientName: recipientNameInput.value.trim(),
          recipientRole: recipientRoleInput.value.trim(),
          sourceNotes: notesArea.value.trim(),
          bodyHtml: bodyEl.innerHTML,
          signatoryName: signatoryNameInput.value.trim(),
          signatoryTitle: signatoryTitleInput.value.trim(),
        }),
      });
      currentId = data.id;
      exportBtns.forEach(function (b) { b.disabled = false; });
      issueBtn.disabled = false;
      draftStatus.textContent = 'Saved as draft #' + currentId + '.';
      loadList();
    } catch (err) {
      draftStatus.textContent = err.message;
    } finally {
      saveBtn.disabled = false;
    }
  });

  previewBtn.addEventListener('click', function () {
    if (!currentId) return;
    window.open('/api/portal/staff/documents/render?id=' + currentId, '_blank');
  });
  pdfBtn.addEventListener('click', function () {
    if (!currentId) return;
    window.open('/api/portal/staff/documents/render?id=' + currentId + '&format=pdf', '_blank');
  });
  mdBtn.addEventListener('click', function () {
    if (!currentId) return;
    window.open('/api/portal/staff/documents/render?id=' + currentId + '&format=markdown', '_blank');
  });
  txtBtn.addEventListener('click', function () {
    if (!currentId) return;
    window.open('/api/portal/staff/documents/render?id=' + currentId + '&format=text', '_blank');
  });

  async function applyRevision(payload) {
    var current = bodyEl.innerHTML.trim();
    if (!current) { reviseStatus.textContent = 'There is nothing in the body to revise yet.'; return; }
    payload.bodyHtml = current;
    payload.currentDocumentType = typeSelect.value;
    applyRevisionBtn.disabled = true;
    quickActionBtns.forEach(function (b) { b.disabled = true; });
    reviseStatus.textContent = 'Revising…';
    try {
      var data = await fetchJson('/api/portal/staff/documents/revise', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      lastBodyHtml = current;
      bodyEl.innerHTML = data.bodyHtml || '';
      undoRevisionBtn.disabled = false;
      reviseStatus.textContent = 'Revised — remember to Save.';
    } catch (err) {
      reviseStatus.textContent = err.message;
    } finally {
      applyRevisionBtn.disabled = false;
      quickActionBtns.forEach(function (b) { b.disabled = false; });
    }
  }

  quickActionBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyRevision({ quickAction: btn.getAttribute('data-wc-quick') });
    });
  });

  applyRevisionBtn.addEventListener('click', function () {
    var instruction = customInstructionInput.value.trim();
    var targetLang = targetLangInput.value.trim();
    var targetDocumentType = targetTypeSelect.value;
    if (!instruction && !targetLang && !targetDocumentType) {
      reviseStatus.textContent = 'Write an instruction, a language, or a target document type first.';
      return;
    }
    applyRevision({ instruction: instruction, targetLang: targetLang, targetDocumentType: targetDocumentType || null });
  });

  undoRevisionBtn.addEventListener('click', function () {
    if (lastBodyHtml === null) return;
    bodyEl.innerHTML = lastBodyHtml;
    lastBodyHtml = null;
    undoRevisionBtn.disabled = true;
    reviseStatus.textContent = 'Reverted to the previous version.';
  });

  issueBtn.addEventListener('click', async function () {
    if (!currentId) return;
    if (!signatoryNameInput.value.trim()) {
      draftStatus.textContent = 'A signatory name is required before issuing.';
      return;
    }
    if (!window.confirm('Issue this document? It will be assigned a permanent reference number and can no longer be edited.')) return;
    issueBtn.disabled = true;
    draftStatus.textContent = 'Issuing…';
    try {
      var data = await fetchJson('/api/portal/staff/documents/issue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: currentId }),
      });
      draftStatus.textContent = 'Issued as ' + data.referenceNo + '.';
      previewBtn.disabled = false;
      issueBtn.disabled = true;
      loadList();
    } catch (err) {
      draftStatus.textContent = err.message;
      issueBtn.disabled = false;
    }
  });

  async function load() {
    try {
      var res = await fetch('/api/portal/staff/me');
      if (res.status === 401) {
        window.location.href = '/portal/staff/login/';
        return;
      }
      if (!res.ok) {
        var data = await res.json().catch(function () { return {}; });
        throw new Error(data.error || 'Could not load this page.');
      }
      loadingEl.hidden = true;
      contentEl.hidden = false;
      await loadList();
    } catch (err) {
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load this page.';
      errorEl.hidden = false;
    }
  }

  logoutBtn.addEventListener('click', async function () {
    try { await fetch('/api/portal/staff/logout', { method: 'POST' }); } catch (err) {}
    window.location.href = '/portal/staff/login/';
  });

  searchBtn.addEventListener('click', function () {
    loadList(searchInput.value.trim());
  });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); loadList(searchInput.value.trim()); }
  });
  searchClearBtn.addEventListener('click', function () {
    searchInput.value = '';
    loadList();
  });

  load();
})();
