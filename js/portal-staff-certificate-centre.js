// Certificate Generation Centre — staff UI over
// /api/portal/staff/registrar/stage-certificates (Certificate
// Generation Directive, 2026-08-05). Same conventions as
// portal-staff-registrar.js: data-attribute DOM lookups, session
// bootstrap via /api/portal/staff/me, and no client-side authority —
// every action is permission-checked server-side.
(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');

  var programmeEl = document.querySelector('[data-cert-programme]');
  var academicYearEl = document.querySelector('[data-cert-academic-year]');
  var issuedAtEl = document.querySelector('[data-cert-issued-at]');
  var descriptionEl = document.querySelector('[data-cert-description]');
  var placeEnEl = document.querySelector('[data-cert-place-en]');
  var placeArEl = document.querySelector('[data-cert-place-ar]');

  var rosterFileEl = document.querySelector('[data-cert-roster-file]');
  var rosterTextEl = document.querySelector('[data-cert-roster-text]');
  var rosterCountEl = document.querySelector('[data-cert-roster-count]');
  var previewBtn = document.querySelector('[data-cert-preview-btn]');
  var previewListEl = document.querySelector('[data-cert-preview-list]');
  var generateRowEl = document.querySelector('[data-cert-generate-row]');
  var generateBtn = document.querySelector('[data-cert-generate-btn]');
  var generateResultEl = document.querySelector('[data-cert-generate-result]');
  var resultsListEl = document.querySelector('[data-cert-results-list]');

  var batchesRefreshBtn = document.querySelector('[data-cert-batches-refresh]');
  var batchesListEl = document.querySelector('[data-cert-batches-list]');

  var registerSearchEl = document.querySelector('[data-cert-register-search]');
  var registerLookupBtn = document.querySelector('[data-cert-register-lookup]');
  var registerListEl = document.querySelector('[data-cert-register-list]');
  var registerResultEl = document.querySelector('[data-cert-register-result]');

  var API = '/api/portal/staff/registrar/stage-certificates';
  var lastValidatedRows = null;
  var qualityProfileEl = document.querySelector('[data-cert-quality-profile]');
  function qualityProfile(){
    return (qualityProfileEl && qualityProfileEl.value) || 'high';
  }

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  function showResult(target, ok, message){
    target.hidden = false;
    target.textContent = message;
    target.className = 'registrar-form-result ' + (ok ? 'is-ok' : 'is-error');
  }

  async function post(payload){
    var res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    var data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  // generate_batch alone streams newline-delimited JSON — one real event
  // per student as the server actually issues them, not a bulk response
  // at the end (see functions/api/portal/staff/registrar/stage-certificates.js).
  // Every parsed line is re-broadcast as a DOM CustomEvent so the Certificate
  // Forge 3D scene (js/portal-cert-forge-3d.js) can animate against the
  // school's real issuance, not a fixed-duration loop of its own — this
  // file has no dependency on that scene existing (plain document-level
  // events, not a module import), so the portal still works if WebGL is
  // unavailable and the 3D module never loads.
  function broadcast(type, detail){
    document.dispatchEvent(new CustomEvent('sultan:cert-generate-' + type, { detail: detail || {} }));
  }

  async function postGenerateBatch(payload){
    broadcast('start', { total: payload.rows.length });
    var res;
    try{
      res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }catch(err){
      broadcast('end', { ok: false });
      throw err;
    }
    if(!res.ok || !res.body || !res.body.getReader){
      // Validation failures (bad programme, missing fields, no authority)
      // never reach the streaming branch server-side — they return a
      // plain JSON error body instead, same shape the rest of this file
      // already expects. A body-less/unreadable response falls back the
      // same way, so an environment without a streaming fetch body still
      // gets a correct (just unanimated) result rather than a hang.
      var data = {};
      try{ data = await res.json(); }catch(err){}
      broadcast('end', { ok: res.ok });
      if(!res.ok) throw new Error(data.error || 'Request failed.');
      return data;
    }
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    var finalEvent = null;
    var streamErrorMessage = null;
    try{
      for(;;){
        var chunk = await reader.read();
        if(chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop();
        for(var i = 0; i < lines.length; i++){
          var line = lines[i].trim();
          if(!line) continue;
          var event;
          try{ event = JSON.parse(line); }catch(parseErr){ continue; }
          broadcast('progress', event);
          if(event.type === 'row' && generateBtn){
            // The button is the truthful progress meter: this count is the
            // number of students the server has actually finished, not a
            // timer's guess.
            generateBtn.textContent = 'Generating… ' + (event.index + 1) + ' of ' + event.total;
          }
          if(event.type === 'batch_done') finalEvent = event;
          else if(event.type === 'error') streamErrorMessage = event.error;
        }
      }
    }finally{
      broadcast('end', { ok: !!finalEvent && !streamErrorMessage });
    }
    if(streamErrorMessage) throw new Error(streamErrorMessage);
    if(!finalEvent) throw new Error('The connection closed before the batch finished — check the register before retrying, some certificates may already be issued.');
    return finalEvent;
  }

  // ── Roster parsing ────────────────────────────────────────────────
  // Accepts comma/semicolon/tab separated lines; a first line that
  // mentions "name" is treated as a header. Column order:
  // English Name, Arabic Name, Sex, Grade EN, Grade AR, Admission No.
  function parseRoster(text){
    var lines = String(text || '').split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
    if(!lines.length) return [];
    var first = lines[0].toLowerCase();
    if(first.indexOf('name') !== -1 && (first.indexOf('english') !== -1 || first.indexOf('grade') !== -1 || first.indexOf('sex') !== -1)){
      lines = lines.slice(1);
    }
    return lines.map(function(line){
      var delim = line.indexOf('\t') !== -1 ? '\t' : (line.indexOf(';') !== -1 ? ';' : ',');
      var parts = line.split(delim).map(function(p){ return p.trim(); });
      return {
        fullName: parts[0] || '',
        fullNameAr: parts[1] || '',
        sex: parts[2] || '',
        gradeEn: parts[3] || '',
        gradeAr: parts[4] || '',
        admissionNo: parts[5] || '',
      };
    });
  }

  function rosterFromInputs(){
    var rows = parseRoster(rosterTextEl.value);
    rosterCountEl.textContent = rows.length ? (rows.length + ' student' + (rows.length === 1 ? '' : 's') + ' in roster') : '';
    return rows;
  }

  if(rosterFileEl){
    rosterFileEl.addEventListener('change', function(){
      var file = rosterFileEl.files && rosterFileEl.files[0];
      if(!file) return;
      var reader = new FileReader();
      reader.onload = function(){
        rosterTextEl.value = String(reader.result || '');
        rosterFromInputs();
      };
      reader.readAsText(file);
    });
  }
  if(rosterTextEl){
    rosterTextEl.addEventListener('input', function(){ rosterFromInputs(); });
  }

  // ── Preview ───────────────────────────────────────────────────────
  var STATUS_LABEL = {
    matched: 'Matched to existing student',
    new: 'New — student record will be created',
    ambiguous: 'Ambiguous name',
    admission_no_not_found: 'Admission number not found',
    invalid: 'Invalid row',
  };

  function renderPreview(preview){
    previewListEl.innerHTML = '';
    var table = el('table', 'registrar-history-table');
    var thead = el('thead');
    var hr = el('tr');
    ['#', 'English Name', 'Arabic Name', 'Sex', 'Grade', 'Match', 'Note'].forEach(function(h){ hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr); table.appendChild(thead);
    var tbody = el('tbody');
    var blocked = 0;
    preview.forEach(function(row, i){
      var tr = el('tr');
      tr.appendChild(el('td', null, String(i + 1)));
      tr.appendChild(el('td', null, row.fullName || '—'));
      var arTd = el('td', null, row.fullNameAr || '—'); arTd.dir = 'rtl'; tr.appendChild(arTd);
      tr.appendChild(el('td', null, row.sex || '—'));
      tr.appendChild(el('td', null, row.gradeEn || '—'));
      var ok = row.matchStatus === 'matched' || row.matchStatus === 'new';
      if(!ok || row.existingSerial) blocked += (ok && row.existingSerial) ? 0 : (ok ? 0 : 1);
      var matchTd = el('td', null, STATUS_LABEL[row.matchStatus] || row.matchStatus);
      matchTd.style.color = ok ? 'var(--portal-ok, #2E7D32)' : 'var(--portal-danger, #B3261E)';
      tr.appendChild(matchTd);
      tr.appendChild(el('td', null, row.problem || (row.matchedIdentityNo ? ('Student ID: ' + row.matchedIdentityNo) : '')));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    previewListEl.appendChild(table);
    return blocked;
  }

  if(previewBtn){
    previewBtn.addEventListener('click', async function(){
      generateResultEl.hidden = true;
      resultsListEl.innerHTML = '';
      lastValidatedRows = null;
      generateRowEl.style.display = 'none';
      var rows = rosterFromInputs();
      if(!rows.length){ showResult(generateResultEl, false, 'Paste or upload a roster first.'); return; }
      previewBtn.disabled = true;
      previewBtn.textContent = 'Validating…';
      try{
        var data = await post({
          action: 'preview_roster',
          programmeCode: programmeEl.value,
          academicYear: academicYearEl.value.trim(),
          rows: rows,
        });
        var blockedCount = renderPreview(data.preview);
        lastValidatedRows = rows;
        generateRowEl.style.display = 'block';
        if(blockedCount > 0){
          showResult(generateResultEl, false, blockedCount + ' row(s) need attention before they can be issued — they will be reported as failed if you generate now.');
        }
      }catch(err){
        showResult(generateResultEl, false, err.message);
      }finally{
        previewBtn.disabled = false;
        previewBtn.textContent = 'Preview & Validate Roster';
      }
    });
  }

  // ── Generate ─────────────────────────────────────────────────────
  function renderResults(data){
    resultsListEl.innerHTML = '';
    var table = el('table', 'registrar-history-table');
    var thead = el('thead');
    var hr = el('tr');
    ['#', 'Student', 'Status', 'Certificate Serial', 'Student ID', 'Actions'].forEach(function(h){ hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr); table.appendChild(thead);
    var tbody = el('tbody');
    data.results.forEach(function(row, i){
      var tr = el('tr');
      tr.appendChild(el('td', null, String(i + 1)));
      tr.appendChild(el('td', null, row.fullName || '—'));
      var st = el('td', null, row.status + (row.problem ? ' — ' + row.problem : ''));
      st.style.color = row.status === 'issued' ? 'var(--portal-ok, #2E7D32)' : (row.status === 'skipped' ? 'var(--gold, #9C7A35)' : 'var(--portal-danger, #B3261E)');
      tr.appendChild(st);
      tr.appendChild(el('td', null, row.serialNo || '—'));
      tr.appendChild(el('td', null, row.studentIdentityNo || '—'));
      var actions = el('td');
      if(row.status === 'issued'){
        var profile = qualityProfile();
        var view = el('a', 'text-link', 'Open');
        view.href = row.viewUrl; view.target = '_blank'; view.rel = 'noopener';
        actions.appendChild(view);
        actions.appendChild(document.createTextNode(' '));
        var pdf = el('a', 'text-link', 'PDF');
        pdf.href = (row.pdfUrl || row.viewUrl + '&format=pdf'); pdf.target = '_blank'; pdf.rel = 'noopener';
        actions.appendChild(pdf);
        actions.appendChild(document.createTextNode(' '));
        var png = el('a', 'text-link', 'PNG');
        png.href = (row.pngUrl || row.viewUrl + '&format=png') + '&quality=' + profile;
        png.target = '_blank'; png.rel = 'noopener';
        actions.appendChild(png);
        actions.appendChild(document.createTextNode(' '));
        var verify = el('a', 'text-link', 'Verify');
        verify.href = row.verifyUrl; verify.target = '_blank'; verify.rel = 'noopener';
        actions.appendChild(verify);
      }
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    resultsListEl.appendChild(table);
  }

  if(generateBtn){
    generateBtn.addEventListener('click', async function(){
      if(!lastValidatedRows){ showResult(generateResultEl, false, 'Preview the roster first.'); return; }
      if(!academicYearEl.value.trim() || !issuedAtEl.value){
        showResult(generateResultEl, false, 'Academic year and issue date are required.');
        return;
      }
      if(!window.confirm('Issue certificates for this cohort now? Each student receives a permanent serial number. This is an audit-logged act of certificate authority.')) return;
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating…';
      try{
        var data = await postGenerateBatch({
          action: 'generate_batch',
          programmeCode: programmeEl.value,
          academicYear: academicYearEl.value.trim(),
          issuedAt: issuedAtEl.value,
          placeEn: placeEnEl.value.trim(),
          placeAr: placeArEl.value.trim(),
          description: descriptionEl.value.trim(),
          rows: lastValidatedRows,
        });
        showResult(generateResultEl, true,
          'Batch ' + data.batchNo + ' — ' + data.issued + ' issued, ' + data.studentsCreated + ' new student record(s), '
          + data.skipped + ' skipped, ' + data.failed + ' failed.');
        renderResults(data);
        var printAll = el('a', 'registrar-btn', 'Open Full Batch for Printing (' + data.issued + ' certificates)');
        printAll.href = data.batchPrintUrl; printAll.target = '_blank'; printAll.rel = 'noopener';
        printAll.style.display = 'inline-block'; printAll.style.margin = '10px 8px 10px 20px';
        resultsListEl.appendChild(printAll);
        // The combined batch PDF — every certificate of the batch in
        // issuance order, compiled server-side; nobody merges PDFs by
        // hand.
        var batchPdf = el('a', 'registrar-btn', 'Combined Batch PDF (issuance order)');
        batchPdf.href = data.batchPrintUrl + '&format=pdf'; batchPdf.target = '_blank'; batchPdf.rel = 'noopener';
        batchPdf.style.display = 'inline-block'; batchPdf.style.margin = '10px 8px';
        resultsListEl.appendChild(batchPdf);
        loadBatches();
      }catch(err){
        showResult(generateResultEl, false, err.message);
      }finally{
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Certificates for This Cohort';
      }
    });
  }

  // ── Batches ──────────────────────────────────────────────────────
  async function loadBatches(){
    batchesListEl.innerHTML = '';
    try{
      var data = await post({ action: 'list_batches' });
      if(!data.batches.length){
        batchesListEl.appendChild(el('p', 'registrar-field-note', 'No certificate batches issued yet.'));
        return;
      }
      var table = el('table', 'registrar-history-table');
      var thead = el('thead');
      var hr = el('tr');
      ['Batch No', 'Programme', 'Academic Year', 'Issued', 'Certificates', 'Print'].forEach(function(h){ hr.appendChild(el('th', null, h)); });
      thead.appendChild(hr); table.appendChild(thead);
      var tbody = el('tbody');
      data.batches.forEach(function(b){
        var tr = el('tr');
        tr.appendChild(el('td', null, b.batchNo));
        tr.appendChild(el('td', null, b.programmeCode));
        tr.appendChild(el('td', null, b.academicYear));
        tr.appendChild(el('td', null, b.issuedAt));
        tr.appendChild(el('td', null, b.activeCount + ' active / ' + b.certificateCount + ' total'));
        var td = el('td');
        var open = el('a', 'text-link', 'Open All');
        open.href = b.printUrl; open.target = '_blank'; open.rel = 'noopener';
        td.appendChild(open);
        td.appendChild(document.createTextNode(' '));
        var pdf = el('a', 'text-link', 'PDF');
        pdf.href = b.printUrl + '&format=pdf'; pdf.target = '_blank'; pdf.rel = 'noopener';
        td.appendChild(pdf);
        tr.appendChild(td);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      batchesListEl.appendChild(table);
    }catch(err){
      batchesListEl.appendChild(el('p', 'registrar-field-note', err.message));
    }
  }
  if(batchesRefreshBtn) batchesRefreshBtn.addEventListener('click', loadBatches);

  // ── Register + revoke ────────────────────────────────────────────
  async function loadRegister(){
    registerListEl.innerHTML = '';
    registerResultEl.hidden = true;
    try{
      var data = await post({ action: 'list_register', search: registerSearchEl.value.trim() });
      if(!data.certificates.length){
        registerListEl.appendChild(el('p', 'registrar-field-note', 'No certificates found.'));
        return;
      }
      var table = el('table', 'registrar-history-table');
      var thead = el('thead');
      var hr = el('tr');
      ['Serial No', 'Student', 'Student ID', 'Programme', 'Year', 'Grade', 'Status', 'Actions'].forEach(function(h){ hr.appendChild(el('th', null, h)); });
      thead.appendChild(hr); table.appendChild(thead);
      var tbody = el('tbody');
      data.certificates.forEach(function(c){
        var tr = el('tr');
        tr.appendChild(el('td', null, c.serialNo));
        tr.appendChild(el('td', null, c.studentFullName));
        tr.appendChild(el('td', null, c.studentIdentityNo || '—'));
        tr.appendChild(el('td', null, c.programmeCode));
        tr.appendChild(el('td', null, c.academicYear));
        tr.appendChild(el('td', null, c.gradeEn || '—'));
        var st = el('td', null, c.status === 'revoked' ? ('Revoked — ' + (c.revocationNote || '')) : 'Active');
        st.style.color = c.status === 'revoked' ? 'var(--portal-danger, #B3261E)' : 'var(--portal-ok, #2E7D32)';
        tr.appendChild(st);
        var td = el('td');
        var open = el('a', 'text-link', 'Open');
        open.href = API + '?serial=' + encodeURIComponent(c.serialNo);
        open.target = '_blank'; open.rel = 'noopener';
        td.appendChild(open);
        td.appendChild(document.createTextNode(' '));
        var pdf = el('a', 'text-link', 'PDF');
        pdf.href = API + '?serial=' + encodeURIComponent(c.serialNo) + '&format=pdf';
        pdf.target = '_blank'; pdf.rel = 'noopener';
        td.appendChild(pdf);
        td.appendChild(document.createTextNode(' '));
        var verify = el('a', 'text-link', 'Verify');
        verify.href = '/verify-certificate/?ref=' + encodeURIComponent(c.serialNo);
        verify.target = '_blank'; verify.rel = 'noopener';
        td.appendChild(verify);
        if(c.status !== 'revoked'){
          td.appendChild(document.createTextNode(' '));
          var revoke = el('button', 'text-link', 'Revoke');
          revoke.type = 'button';
          revoke.style.color = 'var(--portal-danger, #B3261E)';
          revoke.style.background = 'none'; revoke.style.border = 'none'; revoke.style.cursor = 'pointer'; revoke.style.padding = '0';
          revoke.addEventListener('click', async function(){
            var note = window.prompt('Revocation note (required — recorded permanently and shown to public verifiers):');
            if(!note || !note.trim()) return;
            try{
              await post({ action: 'revoke', serialNo: c.serialNo, revocationNote: note.trim() });
              showResult(registerResultEl, true, c.serialNo + ' revoked.');
              loadRegister();
            }catch(err){
              showResult(registerResultEl, false, err.message);
            }
          });
          td.appendChild(revoke);
        }
        tr.appendChild(td);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      registerListEl.appendChild(table);
    }catch(err){
      showResult(registerResultEl, false, err.message);
    }
  }
  if(registerLookupBtn) registerLookupBtn.addEventListener('click', loadRegister);
  if(registerSearchEl) registerSearchEl.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); loadRegister(); } });

  // ── Session bootstrap ────────────────────────────────────────────
  (async function init(){
    try{
      var res = await fetch('/api/portal/staff/me');
      if(res.status === 401){
        window.location.href = '/portal/staff/login/';
        return;
      }
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load your staff session.');
      loadingEl.hidden = true;
      contentEl.hidden = false;
      if(window.SHRSExecArrival){
        window.SHRSExecArrival.play({
          key: 'certificate-centre',
          icon: '<path d="M12 3l7 4v5c0 4.4-3 8-7 9-4-1-7-4.6-7-9V7l7-4z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M9.5 12l1.8 1.8 3.4-3.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
          title: 'Certificate Generation Centre',
          tagline: 'Credential Issuance Authority',
          greeting: 'Serial engine and verification register are operational.',
        });
      }
      // Default the issue date to today.
      if(issuedAtEl && !issuedAtEl.value){
        issuedAtEl.value = new Date().toISOString().slice(0, 10);
      }
      loadBatches();
      loadRegister();
    }catch(err){
      loadingEl.hidden = true;
      errorEl.hidden = false;
      if(errorMessageEl) errorMessageEl.textContent = err.message;
    }
  })();

  var logoutBtn = document.querySelector('[data-portal-logout]');
  if(logoutBtn){
    logoutBtn.addEventListener('click', async function(){
      try{ await fetch('/api/portal/staff/logout', { method: 'POST' }); }catch(e){ /* ignore */ }
      window.location.href = '/portal/staff/login/';
    });
  }
})();
