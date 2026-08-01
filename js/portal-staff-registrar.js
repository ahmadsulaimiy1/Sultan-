(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  var searchForm = document.querySelector('[data-registrar-search-form]');
  var searchAdmissionNoEl = document.querySelector('[data-search-admission-no]');
  var searchErrorEl = document.querySelector('[data-search-error]');
  var recordEl = document.querySelector('[data-registrar-record]');

  var enrolForm = document.querySelector('[data-registrar-enrol-form]');
  var enrolResultEl = document.querySelector('[data-enrol-result]');

  var lifecycleForm = document.querySelector('[data-lifecycle-form]');
  var lifecycleActionEl = document.querySelector('[data-lifecycle-action]');
  var lifecycleInstitutionField = document.querySelector('[data-lifecycle-institution-field]');
  var lifecycleClassField = document.querySelector('[data-lifecycle-class-field]');
  var lifecycleResultEl = document.querySelector('[data-lifecycle-result]');

  var certIssueForm = document.querySelector('[data-certificate-issue-form]');
  var certRevokeForm = document.querySelector('[data-certificate-revoke-form]');
  var certResultEl = document.querySelector('[data-certificate-result]');

  var pendingApprovalsListEl = document.querySelector('[data-pending-approvals-list]');
  var pendingApprovalsResultEl = document.querySelector('[data-pending-approvals-result]');

  var graduationStatusFilterEl = document.querySelector('[data-graduation-status-filter]');
  var graduationRefreshBtn = document.querySelector('[data-graduation-refresh]');
  var graduationRecordsListEl = document.querySelector('[data-graduation-records-list]');
  var graduationRecordsResultEl = document.querySelector('[data-graduation-records-result]');

  var attendanceForm = document.querySelector('[data-attendance-form]');
  var attendanceResultEl = document.querySelector('[data-attendance-result]');

  var assessmentForm = document.querySelector('[data-assessment-form]');
  var assessmentResultEl = document.querySelector('[data-assessment-result]');

  var currentAdmissionNo = null;

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  function formatDate(iso){
    if(!iso) return '—';
    try{ return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch(e){ return iso; }
  }

  function showResult(target, ok, message){
    target.hidden = false;
    target.textContent = message;
    target.className = 'registrar-form-result ' + (ok ? 'is-ok' : 'is-error');
  }

  // Certificate issuance gets its own richer result — the reference
  // number plus a QR code and verification link the school can print
  // straight onto the physical certificate, not just a plain-text
  // confirmation string like the other registrar forms use.
  function showCertificateIssued(referenceNo, verifyUrl, qrUrl){
    certResultEl.hidden = false;
    certResultEl.className = 'registrar-form-result is-ok registrar-cert-issued';
    certResultEl.innerHTML = '';
    var text = el('div', 'registrar-cert-issued-text');
    text.appendChild(el('strong', null, 'Certificate issued — reference ' + referenceNo + '.'));
    var link = document.createElement('a');
    link.href = verifyUrl; link.target = '_blank'; link.rel = 'noopener';
    link.className = 'text-link';
    link.textContent = 'Open the public verification page →';
    text.appendChild(document.createElement('br'));
    text.appendChild(link);
    certResultEl.appendChild(text);
    var img = document.createElement('img');
    img.src = qrUrl; img.alt = 'QR code linking to the verification page for ' + referenceNo;
    img.className = 'registrar-cert-qr';
    img.width = 96; img.height = 96;
    certResultEl.appendChild(img);
  }

  // Pending Certificate Approvals — visible to any signed-in staff
  // member, since this page has no role-conditional hiding anywhere
  // (the server is what actually enforces who can decide one, the same
  // discipline every other action on this page already follows). A 403
  // here just means this account can't decide approvals, not that
  // something is broken — rendered as the honest empty list, not an
  // error banner.
  async function loadPendingApprovals(){
    try{
      var res = await fetch('/api/portal/staff/registrar/certificates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_pending' }),
      });
      var data = await res.json();
      if(!res.ok){
        pendingApprovalsListEl.innerHTML = '';
        pendingApprovalsListEl.appendChild(el('p', 'registrar-approvals-empty', data.error || 'Your account cannot decide certificate approvals.'));
        return;
      }
      renderPendingApprovals(data.pending || []);
    }catch(err){
      pendingApprovalsListEl.innerHTML = '';
      pendingApprovalsListEl.appendChild(el('p', 'registrar-approvals-empty', 'Could not load pending approvals.'));
    }
  }

  function renderPendingApprovals(items){
    pendingApprovalsListEl.innerHTML = '';
    if(!items.length){
      pendingApprovalsListEl.appendChild(el('p', 'registrar-approvals-empty', 'No certificates awaiting approval.'));
      return;
    }
    items.forEach(function(item){
      var card = el('div', 'registrar-approval-card');
      card.dataset.approvalId = item.id;
      var head = el('div', 'registrar-approval-head');
      head.appendChild(el('span', null, item.certificateType + ' — ' + item.studentFullName));
      head.appendChild(el('span', null, formatDate(item.issuedAt)));
      card.appendChild(head);
      card.appendChild(el('div', 'registrar-approval-meta', 'Requested by ' + (item.requestedByName || 'a staff member') + ' on ' + formatDate(item.requestedAt) + (item.referenceNo ? ' · Reference: ' + item.referenceNo : '')));
      var actions = el('div', 'registrar-approval-actions');
      var noteInput = document.createElement('input');
      noteInput.type = 'text'; noteInput.placeholder = 'Note (optional for approve, recommended for reject)';
      actions.appendChild(noteInput);
      var approveBtn = el('button', 'registrar-approval-approve', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', function(){ decideApproval(item.id, 'approve', noteInput.value.trim()); });
      var rejectBtn = el('button', 'registrar-approval-reject', 'Reject');
      rejectBtn.type = 'button';
      rejectBtn.addEventListener('click', function(){ decideApproval(item.id, 'reject', noteInput.value.trim()); });
      actions.appendChild(approveBtn);
      actions.appendChild(rejectBtn);
      card.appendChild(actions);
      pendingApprovalsListEl.appendChild(card);
    });
  }

  async function decideApproval(approvalId, action, note){
    pendingApprovalsResultEl.hidden = true;
    try{
      var res = await fetch('/api/portal/staff/registrar/certificates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action, approvalId: approvalId, note: note || null }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not record that decision.');
      pendingApprovalsResultEl.hidden = false;
      pendingApprovalsResultEl.innerHTML = '';
      if(data.status === 'approved'){
        pendingApprovalsResultEl.className = 'registrar-form-result is-ok registrar-cert-issued';
        var text = el('div', 'registrar-cert-issued-text');
        text.appendChild(el('strong', null, 'Approved — certificate issued, reference ' + data.referenceNo + '.'));
        var link = document.createElement('a');
        link.href = data.verifyUrl; link.target = '_blank'; link.rel = 'noopener';
        link.className = 'text-link';
        link.textContent = 'Open the public verification page →';
        text.appendChild(document.createElement('br'));
        text.appendChild(link);
        pendingApprovalsResultEl.appendChild(text);
        var img = document.createElement('img');
        img.src = data.qrUrl; img.alt = 'QR code linking to the verification page for ' + data.referenceNo;
        img.className = 'registrar-cert-qr';
        img.width = 96; img.height = 96;
        pendingApprovalsResultEl.appendChild(img);
      }else{
        pendingApprovalsResultEl.className = 'registrar-form-result is-ok';
        pendingApprovalsResultEl.textContent = 'Rejected — no certificate was created.';
      }
      loadPendingApprovals();
    }catch(err){
      pendingApprovalsResultEl.className = 'registrar-form-result is-error';
      pendingApprovalsResultEl.textContent = (err && err.message) || 'Could not record that decision.';
      pendingApprovalsResultEl.hidden = false;
    }
  }

  function eventLabel(type){
    var labels = {
      enrolment: 'Enrolled', promotion: 'Promoted', transfer: 'Transferred',
      withdrawal: 'Withdrawn', graduation: 'Graduated', reinstatement: 'Reinstated',
    };
    return labels[type] || type;
  }

  var GRADUATION_STATUS_LABEL = {
    draft: 'Draft (not yet submitted)', submitted: 'Submitted', under_review: 'Under review',
    verified: 'Verified', locked: 'Locked',
  };

  async function loadGraduationRecords(){
    graduationRecordsListEl.innerHTML = '';
    graduationRecordsListEl.appendChild(el('p', 'registrar-approvals-empty', 'Loading…'));
    try{
      var status = graduationStatusFilterEl.value;
      var url = '/api/portal/staff/registrar/graduation' + (status ? '?status=' + encodeURIComponent(status) : '');
      var res = await fetch(url);
      var data = await res.json();
      if(!res.ok){
        graduationRecordsListEl.innerHTML = '';
        graduationRecordsListEl.appendChild(el('p', 'registrar-approvals-empty', data.error || 'Your account cannot view graduation records.'));
        return;
      }
      renderGraduationRecords(data.records || []);
    }catch(err){
      graduationRecordsListEl.innerHTML = '';
      graduationRecordsListEl.appendChild(el('p', 'registrar-approvals-empty', 'Could not load graduation records.'));
    }
  }

  function renderGraduationRecords(items){
    graduationRecordsListEl.innerHTML = '';
    if(!items.length){
      graduationRecordsListEl.appendChild(el('p', 'registrar-approvals-empty', 'No graduation records match that filter.'));
      return;
    }
    items.forEach(function(item){
      var card = el('div', 'registrar-approval-card');
      var head = el('div', 'registrar-approval-head');
      head.appendChild(el('span', null, (item.preferredCertificateName || item.fullName) + ' — ' + (item.institutionName || 'Institution not set')));
      head.appendChild(el('span', null, GRADUATION_STATUS_LABEL[item.status] || item.status));
      card.appendChild(head);
      var metaBits = [
        'Admission No. ' + (item.admissionNo || '—'),
        'Session ' + item.graduationSession,
        item.submittedAt ? 'Submitted ' + formatDate(item.submittedAt) : 'Not yet submitted',
      ];
      if(!item.nameSpellingConfirmed) metaBits.push('Name spelling not yet confirmed by guardian');
      if(item.correctionNote) metaBits.push('Open correction note: "' + item.correctionNote + '"');
      card.appendChild(el('div', 'registrar-approval-meta', metaBits.join(' · ')));

      var actions = el('div', 'registrar-approval-actions');
      if(item.status === 'submitted' || item.status === 'under_review'){
        var reviewBtn = el('button', 'registrar-approval-approve', 'Mark Under Review');
        reviewBtn.type = 'button';
        reviewBtn.addEventListener('click', function(){ graduationAction(item.id, 'mark_under_review'); });
        actions.appendChild(reviewBtn);

        var noteInput = document.createElement('input');
        noteInput.type = 'text'; noteInput.placeholder = 'Correction needed (required to request)';
        actions.appendChild(noteInput);
        var correctionBtn = el('button', 'registrar-approval-reject', 'Request Correction');
        correctionBtn.type = 'button';
        correctionBtn.addEventListener('click', function(){
          var note = noteInput.value.trim();
          if(!note){ showResult(graduationRecordsResultEl, false, 'Enter what needs correcting first.'); return; }
          graduationAction(item.id, 'request_correction', { correctionNote: note });
        });
        actions.appendChild(correctionBtn);

        var verifyBtn = el('button', 'registrar-approval-approve', 'Mark Verified');
        verifyBtn.type = 'button';
        verifyBtn.addEventListener('click', function(){ graduationAction(item.id, 'mark_verified'); });
        actions.appendChild(verifyBtn);
      } else if(item.status === 'verified'){
        var trackLink = document.createElement('a');
        trackLink.href = '/portal/staff/graduation-control/?recordId=' + item.id;
        trackLink.className = 'text-link'; trackLink.textContent = 'Track institutional clearance →';
        actions.appendChild(trackLink);
      } else if(item.status === 'locked'){
        actions.appendChild(el('span', 'registrar-approval-meta', 'Locked — every institutional clearance is complete.'));
        var issueBtn = el('button', 'registrar-approval-approve', 'Issue Alumni Registration Certificate');
        issueBtn.type = 'button';
        issueBtn.addEventListener('click', function(){ issueAlumniRegistration(item.id, issueBtn); });
        actions.appendChild(issueBtn);
      }
      if(actions.childNodes.length) card.appendChild(actions);
      graduationRecordsListEl.appendChild(card);
    });
  }

  async function graduationAction(recordId, action, extra){
    graduationRecordsResultEl.hidden = true;
    try{
      var payload = Object.assign({ action: action, recordId: recordId }, extra || {});
      var res = await fetch('/api/portal/staff/registrar/graduation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not complete that action.');
      showResult(graduationRecordsResultEl, true, 'Updated — status is now "' + (GRADUATION_STATUS_LABEL[data.status] || data.status) + '".');
      loadGraduationRecords();
    }catch(err){
      showResult(graduationRecordsResultEl, false, (err && err.message) || 'Could not complete that action.');
    }
  }

  graduationRefreshBtn.addEventListener('click', loadGraduationRecords);
  graduationStatusFilterEl.addEventListener('change', loadGraduationRecords);

  async function issueAlumniRegistration(recordId, triggerBtn){
    graduationRecordsResultEl.hidden = true;
    if(triggerBtn){ triggerBtn.disabled = true; }
    try{
      var res = await fetch('/api/portal/staff/registrar/graduation-documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'issue_alumni_registration', recordId: recordId }),
      });
      var data = await res.json();
      if(!res.ok){
        if(data.referenceNo){
          showResult(graduationRecordsResultEl, false, data.error + ' Reference: ' + data.referenceNo);
        } else {
          throw new Error(data.error || 'Could not issue that document.');
        }
        return;
      }
      var msg = document.createElement('span');
      msg.textContent = 'Issued — reference ' + data.referenceNo + '. ';
      var viewLink = document.createElement('a');
      viewLink.href = data.viewUrl; viewLink.target = '_blank'; viewLink.rel = 'noopener';
      viewLink.className = 'text-link'; viewLink.textContent = 'View / print →';
      var pdfLink = document.createElement('a');
      pdfLink.href = data.viewUrl + '&format=pdf'; pdfLink.target = '_blank'; pdfLink.rel = 'noopener';
      pdfLink.className = 'text-link'; pdfLink.style.marginLeft = '12px';
      pdfLink.textContent = 'Download PDF →';
      pdfLink.title = 'Requires Browser Rendering to be enabled on the Cloudflare account — falls back to an error if not yet configured.';
      graduationRecordsResultEl.innerHTML = '';
      graduationRecordsResultEl.className = 'registrar-form-result is-ok';
      graduationRecordsResultEl.appendChild(msg);
      graduationRecordsResultEl.appendChild(viewLink);
      graduationRecordsResultEl.appendChild(pdfLink);
      graduationRecordsResultEl.hidden = false;
    }catch(err){
      showResult(graduationRecordsResultEl, false, (err && err.message) || 'Could not issue that document.');
    }finally{
      if(triggerBtn){ triggerBtn.disabled = false; }
    }
  }

  function renderTimeline(events){
    var wrap = document.querySelector('[data-record-timeline]');
    wrap.innerHTML = '';
    if(!events.length){
      wrap.appendChild(el('p', 'identity-empty', 'No lifecycle events recorded yet.'));
      return;
    }
    events.forEach(function(ev){
      var row = el('div', 'registrar-timeline-row');
      var head = el('div', 'registrar-timeline-head');
      head.appendChild(el('span', 'registrar-timeline-type', eventLabel(ev.eventType)));
      head.appendChild(el('span', 'registrar-timeline-date', formatDate(ev.effectiveDate)));
      row.appendChild(head);
      if(ev.from || ev.to){
        var move = [];
        if(ev.from) move.push(ev.from.className + ' (' + ev.from.institution + ')');
        if(ev.to) move.push(ev.to.className + ' (' + ev.to.institution + ')');
        row.appendChild(el('div', 'registrar-timeline-move', move.join(' → ')));
      }
      if(ev.reason) row.appendChild(el('div', 'registrar-timeline-reason', ev.reason));
      var meta = [];
      if(ev.decidedBy) meta.push('Decided by ' + ev.decidedBy);
      if(ev.approvedBy) meta.push('Approved by ' + ev.approvedBy);
      if(meta.length) row.appendChild(el('div', 'registrar-timeline-meta', meta.join(' · ')));
      wrap.appendChild(row);
    });
  }

  function renderCertificates(certs){
    var wrap = document.querySelector('[data-record-certificates]');
    wrap.innerHTML = '';
    if(!certs.length){
      wrap.appendChild(el('p', 'identity-empty', 'No certificates issued yet.'));
      return;
    }
    certs.forEach(function(c){
      var card = el('div', 'portal-ijazah-card' + (c.revokedAt ? ' is-revoked' : ''));
      var refDiv = el('div', 'pij-ref');
      var refLink = document.createElement('a');
      refLink.href = '/verify-certificate/?ref=' + encodeURIComponent(c.referenceNo);
      refLink.target = '_blank'; refLink.rel = 'noopener';
      refLink.textContent = c.referenceNo + ' — verify →';
      refDiv.appendChild(refLink);
      card.appendChild(refDiv);
      card.appendChild(el('div', 'pij-scope', c.certificateType));
      card.appendChild(el('div', 'pij-meta', 'Issued ' + formatDate(c.issuedAt)));
      if(c.revokedAt){
        var rev = el('div', 'pij-revoked', 'Revoked ' + formatDate(c.revokedAt) + (c.revocationNote ? ' — ' + c.revocationNote : ''));
        card.appendChild(rev);
      }
      wrap.appendChild(card);
    });
  }

  function renderHifz(hifz){
    var card = document.querySelector('[data-record-hifz-card]');
    var wrap = document.querySelector('[data-record-hifz]');
    if(!hifz){ card.hidden = true; return; }
    card.hidden = false;
    wrap.innerHTML = '';
    wrap.appendChild(el('span', 'portal-hifz-stage-badge', 'Stage ' + hifz.stageNumber + ': ' + hifz.stageLabel));
  }

  function renderResults(results){
    var tbody = document.querySelector('[data-record-results]');
    var wrap = document.querySelector('[data-record-results-wrap]');
    var empty = document.querySelector('[data-record-results-empty]');
    tbody.innerHTML = '';
    if(!results.length){
      wrap.hidden = true; empty.hidden = false;
      return;
    }
    wrap.hidden = false; empty.hidden = true;
    results.forEach(function(r){
      var tr = document.createElement('tr');
      [r.term, r.subject, r.ca_score, r.exam_score, r.total_score, r.teacher_comment || '—'].forEach(function(val){
        var td = document.createElement('td');
        td.textContent = val == null ? '—' : val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function renderRecord(data){
    currentAdmissionNo = data.student.admissionNo;
    document.querySelector('[data-record-name]').textContent = data.student.fullName;
    document.querySelector('[data-record-meta]').textContent = data.student.admissionNo;
    document.querySelector('[data-record-institution]').textContent = data.student.primaryInstitution || '—';
    document.querySelector('[data-record-class]').textContent = data.student.primaryClass || '—';
    document.querySelector('[data-record-status]').textContent = data.student.status.charAt(0).toUpperCase() + data.student.status.slice(1);
    document.querySelector('[data-record-created]').textContent = formatDate(data.student.createdAt);
    document.querySelector('[data-record-sample-badge]').hidden = !data.student.isSampleData;

    var enrolWrap = document.querySelector('[data-record-enrolments]');
    enrolWrap.innerHTML = '';
    data.enrolments.forEach(function(e){
      enrolWrap.appendChild(el('span', 'portal-programme-chip' + (e.isPrimary ? ' is-primary' : ''), e.className + ' — ' + e.institution));
    });

    var guardiansWrap = document.querySelector('[data-record-guardians]');
    guardiansWrap.innerHTML = '';
    if(data.guardians.length){
      var head = el('div', 'registrar-guardians-head', 'Guardians');
      guardiansWrap.appendChild(head);
      data.guardians.forEach(function(g){
        guardiansWrap.appendChild(el('div', 'registrar-guardian-row', g.fullName + ' (' + g.relationship + ') — ' + g.email));
      });
    }

    var standingWrap = document.querySelector('[data-record-standing]');
    standingWrap.innerHTML = '';
    var attStat = el('div', 'portal-stat');
    attStat.appendChild(el('div', 'label', 'Attendance'));
    var attValueEl = el('div', 'value', '');
    attStat.appendChild(attValueEl);
    standingWrap.appendChild(attStat);
    var termStat = el('div', 'portal-stat');
    termStat.appendChild(el('div', 'label', 'Latest Term'));
    termStat.appendChild(el('div', 'value', data.academicStanding.latestTerm || '—'));
    standingWrap.appendChild(termStat);
    var avgStat = el('div', 'portal-stat');
    avgStat.appendChild(el('div', 'label', 'Term Average'));
    var avgValueEl = el('div', 'value', '');
    avgStat.appendChild(avgValueEl);
    standingWrap.appendChild(avgStat);
    var attFinal = data.academicStanding.attendancePct != null ? data.academicStanding.attendancePct + '%' : '—';
    var avgFinal = data.academicStanding.latestTermAverage != null ? String(data.academicStanding.latestTermAverage) : '—';
    if(window.SHRSExecArrival && window.SHRSExecArrival.animateValue){
      window.SHRSExecArrival.animateValue(attValueEl, attFinal);
      window.SHRSExecArrival.animateValue(avgValueEl, avgFinal);
    }else{
      attValueEl.textContent = attFinal;
      avgValueEl.textContent = avgFinal;
    }

    renderResults(data.results);
    renderTimeline(data.lifecycleEvents);
    renderCertificates(data.certificates);
    renderHifz(data.hifz);

    recordEl.hidden = false;
  }

  searchForm.addEventListener('submit', async function(e){
    e.preventDefault();
    searchErrorEl.hidden = true;
    recordEl.hidden = true;
    var admissionNo = searchAdmissionNoEl.value.trim();
    if(!admissionNo) return;
    try{
      var res = await fetch('/api/portal/staff/registrar/student?admissionNo=' + encodeURIComponent(admissionNo));
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load that student record.');
      renderRecord(data);
    }catch(err){
      searchErrorEl.hidden = false;
      searchErrorEl.textContent = (err && err.message) || 'Could not load that student record.';
    }
  });

  enrolForm.addEventListener('submit', async function(e){
    e.preventDefault();
    enrolResultEl.hidden = true;
    var payload = {
      applicationId: Number(document.querySelector('[data-enrol-application-id]').value),
      admissionNo: document.querySelector('[data-enrol-admission-no]').value.trim(),
      institution: document.querySelector('[data-enrol-institution]').value.trim(),
      className: document.querySelector('[data-enrol-class-name]').value.trim(),
    };
    try{
      var res = await fetch('/api/portal/staff/registrar/enrol', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not enrol that student.');
      showResult(enrolResultEl, true, 'Enrolled — Institutional Student Number ' + data.admissionNo + '. Look them up above to view the new record.');
      enrolForm.reset();
    }catch(err){
      showResult(enrolResultEl, false, (err && err.message) || 'Could not enrol that student.');
    }
  });

  lifecycleActionEl.addEventListener('change', function(){
    var needsClass = lifecycleActionEl.value === 'promote' || lifecycleActionEl.value === 'transfer';
    lifecycleInstitutionField.hidden = !needsClass;
    lifecycleClassField.hidden = !needsClass;
    var reasonInput = lifecycleForm.querySelector('[data-lifecycle-reason]');
    reasonInput.required = lifecycleActionEl.value !== 'graduate';
  });

  lifecycleForm.addEventListener('submit', async function(e){
    e.preventDefault();
    lifecycleResultEl.hidden = true;
    if(!currentAdmissionNo){
      showResult(lifecycleResultEl, false, 'Look up a student first.');
      return;
    }
    var payload = {
      action: lifecycleActionEl.value,
      admissionNo: currentAdmissionNo,
      reason: lifecycleForm.querySelector('[data-lifecycle-reason]').value.trim() || null,
      effectiveDate: lifecycleForm.querySelector('[data-lifecycle-effective-date]').value || null,
    };
    if(payload.action === 'promote' || payload.action === 'transfer'){
      payload.toInstitution = lifecycleForm.querySelector('[data-lifecycle-institution]').value.trim();
      payload.toClassName = lifecycleForm.querySelector('[data-lifecycle-class-name]').value.trim();
    }
    try{
      var res = await fetch('/api/portal/staff/registrar/lifecycle-events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not record that event.');
      showResult(lifecycleResultEl, true, 'Recorded. Refreshing this student\'s timeline…');
      lifecycleForm.reset();
      lifecycleActionEl.dispatchEvent(new Event('change'));
      var res2 = await fetch('/api/portal/staff/registrar/student?admissionNo=' + encodeURIComponent(currentAdmissionNo));
      var data2 = await res2.json();
      if(res2.ok) renderRecord(data2);
    }catch(err){
      showResult(lifecycleResultEl, false, (err && err.message) || 'Could not record that event.');
    }
  });

  attendanceForm.addEventListener('submit', async function(e){
    e.preventDefault();
    attendanceResultEl.hidden = true;
    if(!currentAdmissionNo){
      showResult(attendanceResultEl, false, 'Look up a student first.');
      return;
    }
    var payload = {
      admissionNo: currentAdmissionNo,
      term: attendanceForm.querySelector('[data-attendance-term]').value.trim(),
      daysPresent: Number(attendanceForm.querySelector('[data-attendance-present]').value),
      daysTotal: Number(attendanceForm.querySelector('[data-attendance-total]').value),
    };
    try{
      var res = await fetch('/api/portal/staff/registrar/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not save that attendance record.');
      showResult(attendanceResultEl, true, 'Attendance saved for ' + data.term + '.');
      attendanceForm.reset();
      var res2 = await fetch('/api/portal/staff/registrar/student?admissionNo=' + encodeURIComponent(currentAdmissionNo));
      var data2 = await res2.json();
      if(res2.ok) renderRecord(data2);
    }catch(err){
      showResult(attendanceResultEl, false, (err && err.message) || 'Could not save that attendance record.');
    }
  });

  assessmentForm.addEventListener('submit', async function(e){
    e.preventDefault();
    assessmentResultEl.hidden = true;
    if(!currentAdmissionNo){
      showResult(assessmentResultEl, false, 'Look up a student first.');
      return;
    }
    var payload = {
      admissionNo: currentAdmissionNo,
      term: assessmentForm.querySelector('[data-assessment-term]').value.trim(),
      subject: assessmentForm.querySelector('[data-assessment-subject]').value.trim(),
      caScore: assessmentForm.querySelector('[data-assessment-ca]').value || null,
      examScore: assessmentForm.querySelector('[data-assessment-exam]').value || null,
      teacherComment: assessmentForm.querySelector('[data-assessment-comment]').value.trim() || null,
    };
    try{
      var res = await fetch('/api/portal/staff/registrar/assessments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not save that assessment record.');
      showResult(assessmentResultEl, true, 'Saved ' + data.subject + ' for ' + data.term + ' — total ' + data.totalScore + '.');
      assessmentForm.reset();
      var res2 = await fetch('/api/portal/staff/registrar/student?admissionNo=' + encodeURIComponent(currentAdmissionNo));
      var data2 = await res2.json();
      if(res2.ok) renderRecord(data2);
    }catch(err){
      showResult(assessmentResultEl, false, (err && err.message) || 'Could not save that assessment record.');
    }
  });

  certIssueForm.addEventListener('submit', async function(e){
    e.preventDefault();
    certResultEl.hidden = true;
    if(!currentAdmissionNo){
      showResult(certResultEl, false, 'Look up a student first.');
      return;
    }
    var payload = {
      action: 'issue',
      admissionNo: currentAdmissionNo,
      certificateType: certIssueForm.querySelector('[data-cert-type]').value.trim(),
      referenceNo: certIssueForm.querySelector('[data-cert-reference]').value.trim(),
      issuedAt: certIssueForm.querySelector('[data-cert-issued-at]').value || null,
    };
    try{
      var res = await fetch('/api/portal/staff/registrar/certificates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not submit that certificate request.');
      showResult(certResultEl, true, data.message || 'Submitted — awaiting Principal approval.');
      certIssueForm.reset();
      loadPendingApprovals();
    }catch(err){
      showResult(certResultEl, false, (err && err.message) || 'Could not submit that certificate request.');
    }
  });

  certRevokeForm.addEventListener('submit', async function(e){
    e.preventDefault();
    certResultEl.hidden = true;
    var payload = {
      action: 'revoke',
      referenceNo: certRevokeForm.querySelector('[data-revoke-reference]').value.trim(),
      revocationNote: certRevokeForm.querySelector('[data-revoke-note]').value.trim(),
    };
    try{
      var res = await fetch('/api/portal/staff/registrar/certificates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not revoke that certificate.');
      showResult(certResultEl, true, 'Certificate revoked.');
      certRevokeForm.reset();
      if(currentAdmissionNo){
        var res2 = await fetch('/api/portal/staff/registrar/student?admissionNo=' + encodeURIComponent(currentAdmissionNo));
        var data2 = await res2.json();
        if(res2.ok) renderRecord(data2);
      }
    }catch(err){
      showResult(certResultEl, false, (err && err.message) || 'Could not revoke that certificate.');
    }
  });

  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/staff/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/staff/login/';
  });

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
          key: 'registrar',
          icon: '<rect x="4" y="3" width="16" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
          title: "Registrar's Office",
          tagline: 'Registry Headquarters',
          greeting: 'Registry systems are operational.',
        });
      }
      // Imperial Luxury Experience Directive — scripted typewriter chain
      // for the resting header greeting, plays once per browser session.
      var registrarGreetingEl = document.getElementById('cc-greeting');
      if(registrarGreetingEl && window.SHRSExecArrival && window.SHRSExecArrival.typewriteChain){
        var registrarTypeKey = 'shrs_typewriter_registrar';
        var registrarLines = ['Registry systems verified.', 'Admissions intelligence updated.', 'Student records operational.'];
        if(!sessionStorage.getItem(registrarTypeKey)){
          sessionStorage.setItem(registrarTypeKey, '1');
          window.SHRSExecArrival.typewriteChain(registrarGreetingEl, registrarLines, { pause: 850 });
        }else{
          registrarGreetingEl.textContent = registrarLines[registrarLines.length - 1];
        }
      }
      loadPendingApprovals();
      loadGraduationRecords();
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Registrar\'s Office.';
      errorEl.hidden = false;
    }
  })();
})();
