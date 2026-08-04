(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var bodyEl = document.querySelector('[data-gcc-body]');
  var summaryEl = document.getElementById('gcc-summary');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  var queueListEl = document.querySelector('[data-gcc-queue]');
  var rosterTableBody = document.querySelector('[data-gcc-roster] tbody');
  var searchEl = document.querySelector('[data-gcc-search]');
  var statusFilterEl = document.querySelector('[data-gcc-status-filter]');
  var refreshBtn = document.querySelector('[data-gcc-refresh]');

  var detailHeadEl = document.querySelector('[data-gcc-detail-head]');
  var detailCardEl = document.querySelector('[data-gcc-detail]');
  var detailNameEl = document.querySelector('[data-gcc-detail-name]');
  var detailCloseBtn = document.querySelector('[data-gcc-detail-close]');
  var financeSignalEl = document.querySelector('[data-gcc-finance-signal]');
  var signalsEl = document.querySelector('[data-gcc-signals]');
  var registerFormsEl = document.querySelector('[data-gcc-register-forms]');
  var timelineEl = document.querySelector('[data-gcc-timeline]');
  var detailResultEl = document.querySelector('[data-gcc-detail-result]');
  var stageTemplate = document.getElementById('gcc-timeline-stage-template');

  var bulkBarEl = document.querySelector('[data-gcc-bulk-bar]');
  var bulkCountEl = document.querySelector('[data-gcc-bulk-count]');
  var bulkStageEl = document.querySelector('[data-gcc-bulk-stage]');
  var bulkActionEl = document.querySelector('[data-gcc-bulk-action]');
  var bulkNoteEl = document.querySelector('[data-gcc-bulk-note]');
  var bulkApplyBtn = document.querySelector('[data-gcc-bulk-apply]');
  var bulkStatusEl = document.querySelector('[data-gcc-bulk-status]');
  var selectAllEl = document.querySelector('[data-gcc-select-all]');

  // Mirrors functions/_lib/graduation-workflow.js's STAGE_DEFINITIONS —
  // a small, stable list duplicated here only for the bulk-action stage
  // picker's option labels; the server is the sole source of truth for
  // which stage a bulk decision is actually validated against.
  var BULK_STAGE_OPTIONS = [
    { code: 'academic', label: 'Academic Department' },
    { code: 'examinations', label: 'Examinations & Records' },
    { code: 'finance', label: 'Finance & Accounts' },
    { code: 'disciplinary', label: 'Disciplinary Clearance' },
    { code: 'library', label: 'Library Clearance' },
    { code: 'ict', label: 'ICT Clearance' },
    { code: 'principal', label: 'Principal' },
    { code: 'vp_academic', label: 'Vice Principal (Academic)' },
    { code: 'vp_administration', label: 'Vice Principal (Administration)' },
    { code: 'founder', label: 'Founder & CEO' },
  ];
  bulkStageEl.innerHTML = BULK_STAGE_OPTIONS.map(function(s){ return '<option value="' + s.code + '">' + s.label + '</option>'; }).join('');

  var selectedRecordIds = {};

  function updateBulkBar(){
    var ids = Object.keys(selectedRecordIds).filter(function(id){ return selectedRecordIds[id]; });
    bulkBarEl.style.display = ids.length ? 'flex' : 'none';
    bulkCountEl.textContent = ids.length + ' selected';
  }

  var rosterCache = [];

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  function formatDate(iso){
    if(!iso) return '—';
    try{ return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch(e){ return iso; }
  }

  var STATUS_LABEL = {
    draft: 'Draft', submitted: 'Submitted', under_review: 'Under review',
    verified: 'In clearance', locked: 'Locked',
  };

  async function loadQueue(){
    queueListEl.innerHTML = '';
    queueListEl.appendChild(el('p', 'registrar-approvals-empty', 'Loading…'));
    try{
      var res = await fetch('/api/portal/staff/graduation-clearances');
      var data = await res.json();
      if(!res.ok){ queueListEl.innerHTML = ''; queueListEl.appendChild(el('p', 'registrar-approvals-empty', data.error || 'Could not load your pending actions.')); return; }
      renderQueue(data.queue || []);
    }catch(err){
      queueListEl.innerHTML = '';
      queueListEl.appendChild(el('p', 'registrar-approvals-empty', 'Could not load your pending actions.'));
    }
  }

  function renderQueue(items){
    queueListEl.innerHTML = '';
    if(!items.length){
      queueListEl.appendChild(el('p', 'registrar-approvals-empty', 'Nothing is currently awaiting your decision.'));
      return;
    }
    items.forEach(function(item){
      var card = el('div', 'registrar-approval-card');
      var head = el('div', 'registrar-approval-head');
      head.appendChild(el('span', null, item.fullName + ' — ' + item.stageLabel));
      head.appendChild(el('span', null, item.institutionName || 'Institution not set'));
      card.appendChild(head);
      card.appendChild(el('div', 'registrar-approval-meta', 'Admission No. ' + (item.admissionNo || '—') + ' · Session ' + item.graduationSession));
      var openBtn = el('button', 'registrar-approval-approve', 'Open →');
      openBtn.type = 'button';
      openBtn.addEventListener('click', function(){ openDetail(item.recordId); });
      var actions = el('div', 'registrar-approval-actions');
      actions.appendChild(openBtn);
      card.appendChild(actions);
      queueListEl.appendChild(card);
    });
  }

  async function loadRoster(){
    rosterTableBody.innerHTML = '';
    rosterTableBody.appendChild(rosterRow(null, 'Loading…'));
    try{
      var res = await fetch('/api/portal/staff/graduation-clearances?all=1');
      var data = await res.json();
      if(!res.ok){
        rosterTableBody.innerHTML = '';
        rosterTableBody.appendChild(rosterRow(null, data.error || 'Your role does not have authority to view the full roster.'));
        summaryEl.textContent = 'You can still act on items in "My Pending Actions" above.';
        return;
      }
      rosterCache = data.roster || [];
      summaryEl.textContent = rosterCache.length + ' graduating student' + (rosterCache.length === 1 ? '' : 's') + ' tracked for the 8 August 2026 ceremony.';
      renderRoster();
    }catch(err){
      rosterTableBody.innerHTML = '';
      rosterTableBody.appendChild(rosterRow(null, 'Could not load the roster.'));
    }
  }

  function rosterRow(_, message){
    var tr = document.createElement('tr');
    tr.className = 'gcc-empty-row';
    var td = document.createElement('td');
    td.colSpan = 7; td.textContent = message;
    tr.appendChild(td);
    return tr;
  }

  function renderRoster(){
    var query = (searchEl.value || '').trim().toLowerCase();
    var statusFilter = statusFilterEl.value;
    var filtered = rosterCache.filter(function(r){
      if(statusFilter && r.status !== statusFilter) return false;
      if(!query) return true;
      return (r.fullName || '').toLowerCase().indexOf(query) !== -1 || (r.admissionNo || '').toLowerCase().indexOf(query) !== -1;
    });
    rosterTableBody.innerHTML = '';
    if(!filtered.length){
      rosterTableBody.appendChild(rosterRow(null, 'No graduation records match that search/filter.'));
      return;
    }
    filtered.forEach(function(r){
      var tr = document.createElement('tr');
      tr.addEventListener('click', function(){ openDetail(r.id); });

      var selectTd = document.createElement('td');
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!selectedRecordIds[r.id];
      checkbox.addEventListener('click', function(evt){ evt.stopPropagation(); });
      checkbox.addEventListener('change', function(){ selectedRecordIds[r.id] = checkbox.checked; updateBulkBar(); });
      selectTd.appendChild(checkbox);
      tr.appendChild(selectTd);

      var nameTd = document.createElement('td');
      nameTd.appendChild(el('div', 'gcc-roster-name', r.preferredCertificateName || r.fullName));
      nameTd.appendChild(el('div', 'gcc-roster-sub', 'Adm. No. ' + (r.admissionNo || '—')));
      tr.appendChild(nameTd);

      var instTd = document.createElement('td');
      instTd.textContent = r.institutionName || '—';
      tr.appendChild(instTd);

      var statusTd = document.createElement('td');
      var pill = el('span', 'gcc-status-pill', STATUS_LABEL[r.status] || r.status);
      if(r.status === 'locked') pill.classList.add('is-locked');
      statusTd.appendChild(pill);
      tr.appendChild(statusTd);

      var stageTd = document.createElement('td');
      stageTd.textContent = r.currentStage ? r.currentStage.label : (r.status === 'locked' ? 'Complete' : '—');
      tr.appendChild(stageTd);

      var progressTd = document.createElement('td');
      if(r.totalStages){
        var track = el('span', 'gcc-progress-track');
        var fill = el('span', 'gcc-progress-fill');
        fill.style.width = Math.round((r.clearedCount / r.totalStages) * 100) + '%';
        track.appendChild(fill);
        progressTd.appendChild(track);
        progressTd.appendChild(document.createTextNode(r.clearedCount + '/' + r.totalStages));
      } else {
        progressTd.textContent = '—';
      }
      tr.appendChild(progressTd);

      var linkTd = document.createElement('td');
      linkTd.textContent = 'View →';
      tr.appendChild(linkTd);

      rosterTableBody.appendChild(tr);
    });
  }

  async function openDetail(recordId){
    detailHeadEl.hidden = false;
    detailCardEl.hidden = false;
    detailResultEl.hidden = true;
    timelineEl.innerHTML = '';
    timelineEl.appendChild(el('p', 'registrar-approvals-empty', 'Loading…'));
    detailNameEl.textContent = 'Loading…';
    detailCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try{
      var res = await fetch('/api/portal/staff/graduation-clearances?recordId=' + encodeURIComponent(recordId));
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load this graduation record.');
      renderDetail(data);
    }catch(err){
      timelineEl.innerHTML = '';
      detailNameEl.textContent = 'Could not load record';
      timelineEl.appendChild(el('p', 'registrar-approvals-empty', (err && err.message) || 'Could not load this graduation record.'));
    }
  }

  function renderDetail(data){
    var record = data.record;
    detailNameEl.textContent = (record.preferred_certificate_name || record.full_name) + ' — ' + (record.institution_name || 'Institution not set');

    if(data.financeSignal && data.financeSignal.length){
      financeSignalEl.hidden = false;
      financeSignalEl.innerHTML = '';
      financeSignalEl.appendChild(el('strong', null, 'Outstanding balance on file: '));
      financeSignalEl.appendChild(document.createTextNode(data.financeSignal.map(function(inv){ return inv.invoice_no + ' (' + inv.term + ', ' + inv.status + ')'; }).join(', ')));
    } else {
      financeSignalEl.hidden = true;
    }

    renderSignals(data);
    renderRegisterForms(record.student_id, function(){ openDetail(record.id); });
    timelineEl.innerHTML = '';
    data.stages.forEach(function(stage){
      var node = stageTemplate.content.firstElementChild.cloneNode(true);
      node.className = 'gcc-stage-row is-' + stage.status;
      if(stage.canDecideNow) node.classList.add('is-current');

      node.querySelector('.gcc-stage-label').textContent = stage.label;
      var badge = node.querySelector('.gcc-stage-status-badge');
      badge.textContent = stage.status === 'not_applicable' ? 'Not required' : stage.status.replace('_', ' ');

      var metaBits = [];
      if(!stage.isBlocking) metaBits.push('Non-blocking');
      if((stage.status === 'pending' || stage.status === 'correction_requested') && stage.hasAppointee === false) metaBits.push('Vacant — awaiting appointment');
      if(stage.decidedAt) metaBits.push((stage.status === 'cleared' ? 'Cleared' : 'Decided') + ' ' + formatDate(stage.decidedAt));
      if(stage.decisionNote) metaBits.push('"' + stage.decisionNote + '"');
      node.querySelector('.gcc-stage-meta').textContent = metaBits.join(' · ');

      var actionsEl = node.querySelector('.gcc-stage-actions');
      if(stage.canDecideNow){
        var noteInput = document.createElement('input');
        noteInput.type = 'text'; noteInput.placeholder = 'Note (required for correction/return)';
        actionsEl.appendChild(noteInput);

        var clearBtn = el('button', 'registrar-approval-approve', 'Clear');
        clearBtn.type = 'button';
        clearBtn.addEventListener('click', function(){ decide(record.id, stage.code, 'clear', noteInput.value.trim() || null); });
        actionsEl.appendChild(clearBtn);

        var correctionBtn = el('button', 'registrar-approval-reject', 'Request Correction');
        correctionBtn.type = 'button';
        correctionBtn.addEventListener('click', function(){
          if(!noteInput.value.trim()){ showDetailResult(false, 'Enter what needs correcting first.'); return; }
          decide(record.id, stage.code, 'request_correction', noteInput.value.trim());
        });
        actionsEl.appendChild(correctionBtn);

        var earlierStages = data.stages.filter(function(s){ return s.sequencePosition < stage.sequencePosition; });
        if(earlierStages.length){
          var returnSelect = document.createElement('select');
          var placeholderOpt = document.createElement('option');
          placeholderOpt.value = ''; placeholderOpt.textContent = 'Return to…';
          returnSelect.appendChild(placeholderOpt);
          earlierStages.forEach(function(s){
            var opt = document.createElement('option');
            opt.value = s.code; opt.textContent = s.label;
            returnSelect.appendChild(opt);
          });
          actionsEl.appendChild(returnSelect);
          var returnBtn = el('button', 'registrar-btn', 'Return');
          returnBtn.type = 'button';
          returnBtn.addEventListener('click', function(){
            if(!returnSelect.value){ showDetailResult(false, 'Choose which earlier stage to return this record to.'); return; }
            if(!noteInput.value.trim()){ showDetailResult(false, 'A reason is required to return this record to an earlier stage.'); return; }
            decide(record.id, stage.code, 'return_to_stage', noteInput.value.trim(), returnSelect.value);
          });
          actionsEl.appendChild(returnBtn);
        }
      }
      timelineEl.appendChild(node);
    });

    if(!record.requires_founder_review){
      var founderRow = data.stages.find(function(s){ return s.code === 'founder'; });
      if(founderRow && founderRow.status === 'not_applicable'){
        var escalateWrap = el('div', 'registrar-field-note');
        escalateWrap.style.padding = '4px 0 0';
        var escalateBtn = el('button', 'registrar-btn', 'Escalate to Founder review');
        escalateBtn.type = 'button';
        escalateBtn.addEventListener('click', function(){
          var reason = prompt('Reason for escalating this graduation record to the Founder & CEO:');
          if(reason == null) return;
          decide(record.id, 'founder', 'escalate_to_founder', reason.trim() || null);
        });
        escalateWrap.appendChild(escalateBtn);
        timelineEl.appendChild(escalateWrap);
      }
    }
  }

  function renderSignals(data){
    signalsEl.innerHTML = '';
    var blocks = [];
    if(data.disciplinarySignal && data.disciplinarySignal.length){
      blocks.push(el('div', 'gcc-signal-chip is-warn', 'Disciplinary: ' + data.disciplinarySignal.length + ' open case' + (data.disciplinarySignal.length === 1 ? '' : 's') + ' — ' + data.disciplinarySignal.map(function(c){ return c.case_type; }).join(', ')));
    }
    if(data.librarySignal && data.librarySignal.length){
      blocks.push(el('div', 'gcc-signal-chip is-warn', 'Library: ' + data.librarySignal.length + ' outstanding loan/fine — ' + data.librarySignal.map(function(l){ return l.item_title; }).join(', ')));
    }
    if(data.ictSignal){
      var ict = data.ictSignal;
      var ictBits = [];
      if(ict.outstandingAssets && ict.outstandingAssets.length) ictBits.push(ict.outstandingAssets.length + ' issued asset(s) not yet returned');
      if(!ict.hasIdentityCard) ictBits.push('no institutional identity number on file');
      if(ictBits.length) blocks.push(el('div', 'gcc-signal-chip is-warn', 'ICT: ' + ictBits.join('; ')));
    }
    blocks.forEach(function(b){ signalsEl.appendChild(b); });
  }

  // Register data-entry (Conditional Approval directive items 3-5): a
  // staff member reviewing this record's Disciplinary/Library/ICT
  // signal can also feed the underlying register directly, from the
  // same screen — 403s honestly if their office/role doesn't hold the
  // corresponding authority (Behaviour, Library, or ICT office).
  var REGISTER_FORMS = [
    { key: 'disciplinary', label: 'Record a disciplinary case', endpoint: '/api/portal/staff/disciplinary-cases',
      fields: [
        { name: 'caseType', label: 'Case type', type: 'select', options: ['warning', 'suspension', 'commendation', 'behavioural_report', 'investigation', 'other'] },
        { name: 'severity', label: 'Severity (optional)', type: 'select', options: ['', 'minor', 'moderate', 'serious'] },
        { name: 'description', label: 'Description', type: 'text' },
      ], action: 'report', bodyKey: 'studentId' },
    { key: 'library', label: 'Record a library loan', endpoint: '/api/portal/staff/library-loans',
      fields: [
        { name: 'itemTitle', label: 'Item title', type: 'text' },
        { name: 'itemRef', label: 'Item reference (optional)', type: 'text' },
        { name: 'borrowedAt', label: 'Borrowed on', type: 'date' },
        { name: 'dueAt', label: 'Due back (optional)', type: 'date' },
      ], action: 'record_loan', bodyKey: 'studentId' },
    { key: 'ict', label: 'Issue an ICT asset', endpoint: '/api/portal/staff/issued-devices',
      fields: [
        { name: 'assetType', label: 'Asset type', type: 'select', options: ['device', 'id_card', 'access_credential', 'other'] },
        { name: 'description', label: 'Description', type: 'text' },
        { name: 'serialOrRef', label: 'Serial/reference (optional)', type: 'text' },
        { name: 'issuedAt', label: 'Issued on', type: 'date' },
      ], action: 'issue', bodyKey: 'studentId' },
  ];

  function renderRegisterForms(studentId, onSaved){
    registerFormsEl.innerHTML = '';
    REGISTER_FORMS.forEach(function(cfg){
      var wrap = el('div', 'gcc-register-form-wrap');
      var toggleBtn = el('button', 'registrar-btn', '+ ' + cfg.label);
      toggleBtn.type = 'button';
      var formEl = document.createElement('div');
      formEl.hidden = true;
      formEl.style.padding = '10px 0 4px';
      var inputs = {};
      cfg.fields.forEach(function(f){
        var fieldWrap = el('div', 'registrar-field');
        var label = el('label', null, f.label);
        formEl.appendChild(label);
        var input;
        if(f.type === 'select'){
          input = document.createElement('select');
          f.options.forEach(function(opt){
            var optEl = document.createElement('option');
            optEl.value = opt; optEl.textContent = opt ? opt.replace(/_/g, ' ') : '—';
            input.appendChild(optEl);
          });
        } else {
          input = document.createElement('input');
          input.type = f.type;
        }
        formEl.appendChild(input);
        inputs[f.name] = input;
      });
      var statusEl = el('span', 'registrar-field-note');
      var saveBtn = el('button', 'registrar-btn is-primary', 'Save');
      saveBtn.type = 'button';
      saveBtn.addEventListener('click', async function(){
        var payload = { action: cfg.action };
        payload[cfg.bodyKey] = studentId;
        cfg.fields.forEach(function(f){ payload[f.name] = inputs[f.name].value.trim() || null; });
        statusEl.textContent = 'Saving…';
        saveBtn.disabled = true;
        try{
          var res = await fetch(cfg.endpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          });
          var data = await res.json();
          if(!res.ok) throw new Error(data.error || 'Could not save that record.');
          statusEl.textContent = 'Saved.';
          cfg.fields.forEach(function(f){ inputs[f.name].value = ''; });
          if(onSaved) onSaved();
        }catch(err){
          statusEl.textContent = (err && err.message) || 'Could not save that record.';
        }finally{
          saveBtn.disabled = false;
        }
      });
      formEl.appendChild(saveBtn);
      formEl.appendChild(statusEl);
      toggleBtn.addEventListener('click', function(){ formEl.hidden = !formEl.hidden; });
      wrap.appendChild(toggleBtn);
      wrap.appendChild(formEl);
      registerFormsEl.appendChild(wrap);
    });
  }

  function showDetailResult(ok, message){
    detailResultEl.hidden = false;
    detailResultEl.textContent = message;
    detailResultEl.className = 'registrar-form-result ' + (ok ? 'is-ok' : 'is-error');
  }

  async function decide(recordId, stageCode, action, note, targetStageCode){
    detailResultEl.hidden = true;
    try{
      var payload = { graduationRecordId: recordId, stageCode: stageCode, action: action, note: note || null };
      if(targetStageCode) payload.targetStageCode = targetStageCode;
      var res = await fetch('/api/portal/staff/graduation-clearances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not complete that action.');
      var message = data.chainComplete ? 'Cleared — every institutional clearance is now complete and the record has locked.'
        : data.escalated ? 'Escalated to the Founder & CEO.'
        : data.status === 'returned' ? 'Returned to an earlier stage.'
        : data.status === 'correction_requested' ? 'Correction requested — the guardian has been notified.'
        : 'Updated.';
      showDetailResult(true, message);
      openDetail(recordId);
      loadRoster();
      loadQueue();
    }catch(err){
      showDetailResult(false, (err && err.message) || 'Could not complete that action.');
    }
  }

  detailCloseBtn.addEventListener('click', function(){
    detailHeadEl.hidden = true;
    detailCardEl.hidden = true;
  });
  searchEl.addEventListener('input', renderRoster);
  statusFilterEl.addEventListener('change', renderRoster);
  refreshBtn.addEventListener('click', function(){ loadRoster(); loadQueue(); });

  selectAllEl.addEventListener('change', function(){
    rosterCache.forEach(function(r){ selectedRecordIds[r.id] = selectAllEl.checked; });
    renderRoster();
    updateBulkBar();
  });

  bulkApplyBtn.addEventListener('click', async function(){
    var ids = Object.keys(selectedRecordIds).filter(function(id){ return selectedRecordIds[id]; }).map(Number);
    if(!ids.length) return;
    var bulkAction = bulkActionEl.value;
    var note = bulkNoteEl.value.trim();
    if(bulkAction === 'request_correction' && !note){
      bulkStatusEl.textContent = 'A correction note is required.';
      return;
    }
    bulkStatusEl.textContent = 'Applying to ' + ids.length + ' record(s)…';
    bulkApplyBtn.disabled = true;
    try{
      var res = await fetch('/api/portal/staff/graduation-clearances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_decide', graduationRecordIds: ids, stageCode: bulkStageEl.value,
          bulkAction: bulkAction, note: note || null,
        }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not complete the bulk action.');
      var succeeded = (data.results || []).filter(function(r){ return r.ok; }).length;
      var failed = (data.results || []).length - succeeded;
      bulkStatusEl.textContent = succeeded + ' updated' + (failed ? ', ' + failed + ' failed (check individual records)' : '') + '.';
      selectedRecordIds = {};
      selectAllEl.checked = false;
      bulkNoteEl.value = '';
      updateBulkBar();
      loadRoster();
      loadQueue();
    }catch(err){
      bulkStatusEl.textContent = (err && err.message) || 'Could not complete the bulk action.';
    }finally{
      bulkApplyBtn.disabled = false;
    }
  });
  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/staff/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/staff/login/';
  });

  (async function init(){
    try{
      var res = await fetch('/api/portal/staff/me');
      if(res.status === 401){ window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load your staff session.');

      loadingEl.hidden = true;
      contentEl.hidden = false;
      bodyEl.hidden = false;

      await Promise.all([loadQueue(), loadRoster()]);

      var params = new URLSearchParams(window.location.search);
      var deepLinkId = Number(params.get('recordId'));
      if(Number.isInteger(deepLinkId) && deepLinkId > 0) openDetail(deepLinkId);
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Graduation Control Centre.';
      errorEl.hidden = false;
    }
  })();
})();
