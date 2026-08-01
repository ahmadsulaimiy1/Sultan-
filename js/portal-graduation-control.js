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
  var timelineEl = document.querySelector('[data-gcc-timeline]');
  var detailResultEl = document.querySelector('[data-gcc-detail-result]');
  var stageTemplate = document.getElementById('gcc-timeline-stage-template');

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
    td.colSpan = 6; td.textContent = message;
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
