(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var helloEl = document.querySelector('[data-portal-hello]');
  var nameEl = document.querySelector('[data-portal-name]');
  var metaEl = document.querySelector('[data-portal-meta]');
  var programmesEl = document.querySelector('[data-portal-programmes]');
  var statusEl = document.querySelector('[data-portal-status]');
  var attendanceValueEl = document.querySelector('[data-portal-attendance-value]');
  var attendanceLabelEl = document.querySelector('[data-portal-attendance-label]');
  var feeValueEl = document.querySelector('[data-portal-fee-value]');
  var feeLabelEl = document.querySelector('[data-portal-fee-label]');
  var resultsEl = document.querySelector('[data-portal-results]');
  var hifzCardEl = document.querySelector('[data-portal-hifz]');
  var hifzStageEl = document.querySelector('[data-portal-hifz-stage]');
  var hifzStageDescEl = document.querySelector('[data-portal-hifz-stage-desc]');
  var hifzCountEl = document.querySelector('[data-portal-hifz-count]');
  var juzGridEl = document.querySelector('[data-portal-juz-grid]');
  var ijazahEl = document.querySelector('[data-portal-ijazah]');
  var logoutBtn = document.querySelector('[data-portal-logout]');
  var assignmentsListEl = document.querySelector('[data-assignments-list]');
  var assignmentsEmptyEl = document.querySelector('[data-assignments-empty]');
  var submissionFormEl = document.querySelector('[data-submission-form]');
  var submissionTitleEl = document.querySelector('[data-submission-title]');
  var submissionTextEl = document.querySelector('[data-submission-text]');
  var submissionSaveBtn = document.querySelector('[data-submission-save-btn]');
  var submissionResultEl = document.querySelector('[data-submission-result]');
  var currentSubmissionAssignmentId = null;
  var execStatAttendanceEl = document.querySelector('[data-exec-stat-attendance]');
  var execStatFeeEl = document.querySelector('[data-exec-stat-fee]');
  var execStatProgrammesEl = document.querySelector('[data-exec-stat-programmes]');
  var execStatHifzEl = document.querySelector('[data-exec-stat-hifz]');

  var JUZ_STATUS_LABEL = {
    not_started: 'Not started',
    memorising: 'Memorising',
    completed_pending_review: 'Pending review',
    verified: 'Verified',
  };

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  function formatCurrency(amount){
    var n = Number(amount || 0);
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  function formatDate(iso){
    if(!iso) return null;
    try{ return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch(e){ return iso; }
  }

  function renderResults(results){
    resultsEl.innerHTML = '';
    if(!results || !results.length){
      resultsEl.appendChild(el('p', null, 'No results recorded yet.'));
      return;
    }
    var table = document.createElement('table');
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Term', 'Subject', 'CA', 'Exam', 'Total', 'Comment'].forEach(function(h){
      headRow.appendChild(el('th', null, h));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    var byTerm = {};
    results.forEach(function(r){
      var row = document.createElement('tr');
      [r.term, r.subject, r.ca_score, r.exam_score, r.total_score, r.teacher_comment || '—'].forEach(function(v){
        row.appendChild(el('td', null, v == null ? '—' : String(v)));
      });
      tbody.appendChild(row);
      if(r.total_score != null){
        if(!byTerm[r.term]) byTerm[r.term] = [];
        byTerm[r.term].push(Number(r.total_score));
      }
    });
    // A term average is a plain arithmetic mean of recorded totals for
    // that term — real, computed from the same rows shown above, never
    // a separately-fabricated figure.
    Object.keys(byTerm).forEach(function(term){
      var scores = byTerm[term];
      var avg = scores.reduce(function(a,b){ return a+b; }, 0) / scores.length;
      var row = document.createElement('tr');
      row.className = 'transcript-average-row';
      row.appendChild(el('td', null, term));
      row.appendChild(el('td', null, 'Term Average'));
      var avgCell = el('td', null, avg.toFixed(1));
      avgCell.colSpan = 4;
      row.appendChild(avgCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    var scrollWrap = el('div', 'portal-results-scroll');
    scrollWrap.appendChild(table);
    resultsEl.appendChild(scrollWrap);

    var islamicNote = el('p', 'transcript-unavailable', 'Islamic and Arabic Studies transcript: not yet tracked separately in the Digital Campus — the School of Islamic and Arabic Studies does not yet have its own assessment records here (see the Registrar for paper records in the meantime).');
    resultsEl.appendChild(islamicNote);
  }

  function renderHifz(hifz){
    if(!hifz){
      hifzCardEl.hidden = true;
      return;
    }
    hifzCardEl.hidden = false;
    hifzStageEl.textContent = 'Stage ' + hifz.stageNumber + ' of 5 — ' + (hifz.stageLabel || '');
    hifzStageDescEl.textContent = hifz.stageDescription || '';
    hifzCountEl.textContent = hifz.juzVerifiedCount + ' of 30 Juz’ verified';

    juzGridEl.innerHTML = '';
    (hifz.juzGrid || []).forEach(function(j){
      var box = el('div', 'portal-juz-box is-' + j.status, String(j.juzNumber));
      var title = 'Juz’ ' + j.juzNumber + ' — ' + (JUZ_STATUS_LABEL[j.status] || j.status);
      if(j.muhaffizName) title += ' — ' + j.muhaffizName;
      box.title = title;
      juzGridEl.appendChild(box);
    });

    ijazahEl.innerHTML = '';
    if(hifz.ijazahRecords && hifz.ijazahRecords.length){
      var head = el('h3', null, 'Ijazah Register');
      head.style.marginTop = '18px';
      ijazahEl.appendChild(head);
      hifz.ijazahRecords.forEach(function(rec){
        var card = el('div', 'portal-ijazah-card' + (rec.revoked_at ? ' is-revoked' : ''));
        var refDiv = el('div', 'pij-ref');
        var refLink = document.createElement('a');
        refLink.href = '/verify-certificate/?ref=' + encodeURIComponent(rec.reference_no);
        refLink.target = '_blank'; refLink.rel = 'noopener';
        refLink.textContent = 'Reference ' + rec.reference_no + ' — verify →';
        refDiv.appendChild(refLink);
        card.appendChild(refDiv);
        card.appendChild(el('div', 'pij-scope', rec.certified_scope || 'Ijazah'));
        card.appendChild(el('div', 'pij-meta', 'Granted ' + rec.granted_date + (rec.examining_scholars ? ' · Examined by ' + rec.examining_scholars : '')));
        if(rec.revoked_at){
          card.appendChild(el('div', 'pij-revoked', 'Revoked' + (rec.revocation_note ? ': ' + rec.revocation_note : '')));
        }
        ijazahEl.appendChild(card);
      });
    }
  }

  function openSubmission(assignmentId, title){
    currentSubmissionAssignmentId = assignmentId;
    submissionTitleEl.textContent = 'Answering: ' + title;
    submissionTextEl.value = '';
    submissionResultEl.hidden = true;
    submissionFormEl.hidden = false;
    submissionFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderAssignments(assignments){
    assignmentsListEl.innerHTML = '';
    if(!assignments || !assignments.length){
      assignmentsEmptyEl.hidden = false;
      return;
    }
    assignmentsEmptyEl.hidden = true;
    assignments.forEach(function(a){
      var card = el('div', 'portal-assignment-card');
      card.appendChild(el('h4', null, a.subject + ' — ' + a.title));
      var dueText = a.due_at ? 'Due ' + new Date(a.due_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No due date';
      card.appendChild(el('div', 'meta', dueText));
      if(a.instructions) card.appendChild(el('p', 'portal-assignment-desc', a.instructions));

      var status = a.status || 'not_submitted';
      if(status === 'graded'){
        card.appendChild(el('div', 'portal-programme-chip is-primary', 'Graded: ' + a.score + ' / ' + a.max_score));
        if(a.teacher_feedback) card.appendChild(el('p', 'portal-assignment-desc', 'Feedback: ' + a.teacher_feedback));
      } else if(status === 'submitted' || status === 'late'){
        card.appendChild(el('div', 'portal-programme-chip', (status === 'late' ? 'Submitted late' : 'Submitted') + ' — awaiting grade'));
        var editBtn = el('button', 'portal-submit teacher-save-btn', 'Update Submission');
        editBtn.type = 'button';
        editBtn.addEventListener('click', function(){ openSubmission(a.id, a.subject + ' — ' + a.title); });
        card.appendChild(editBtn);
      } else {
        var submitBtn = el('button', 'portal-submit teacher-save-btn', 'Submit');
        submitBtn.type = 'button';
        submitBtn.addEventListener('click', function(){ openSubmission(a.id, a.subject + ' — ' + a.title); });
        card.appendChild(submitBtn);
      }
      assignmentsListEl.appendChild(card);
    });
  }

  async function loadAssignments(){
    try{
      var res = await fetch('/api/portal/student/assignments');
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load assignments.');
      renderAssignments(data.assignments || []);
    }catch(err){
      assignmentsEmptyEl.hidden = false;
      assignmentsEmptyEl.textContent = (err && err.message) || 'Could not load assignments right now.';
    }
  }

  submissionSaveBtn.addEventListener('click', async function(){
    submissionResultEl.hidden = true;
    var text = submissionTextEl.value.trim();
    if(!text){ submissionResultEl.hidden = false; submissionResultEl.className = 'registrar-form-result is-error'; submissionResultEl.textContent = 'Write your answer before submitting.'; return; }
    try{
      var res = await fetch('/api/portal/student/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: currentSubmissionAssignmentId, submissionText: text }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not submit your answer.');
      submissionResultEl.hidden = false; submissionResultEl.className = 'registrar-form-result is-ok';
      submissionResultEl.textContent = data.status === 'late' ? 'Submitted (marked late).' : 'Submitted.';
      loadAssignments();
    }catch(err){
      submissionResultEl.hidden = false; submissionResultEl.className = 'registrar-form-result is-error';
      submissionResultEl.textContent = (err && err.message) || 'Could not submit your answer.';
    }
  });

  async function load(){
    try{
      var res = await fetch('/api/portal/student/me', { headers: { 'accept': 'application/json' } });
      if(res.status === 401){
        window.location.href = '/portal/student/login/';
        return;
      }
      var data = await res.json().catch(function(){ return {}; });
      if(!res.ok){
        throw new Error(data.error || 'Could not load your dashboard.');
      }

      helloEl.textContent = 'Welcome, ' + data.fullName;
      nameEl.textContent = data.fullName;
      metaEl.textContent = data.admissionNo;

      programmesEl.innerHTML = '';
      (data.enrolments || []).forEach(function(en){
        var label = [en.institution, en.className].filter(Boolean).join(' · ');
        var chip = el('span', 'portal-programme-chip' + (en.isPrimary ? ' is-primary' : ''), label);
        programmesEl.appendChild(chip);
      });
      if(execStatProgrammesEl) execStatProgrammesEl.textContent = (data.enrolments || []).length;

      if(data.status && data.status !== 'active'){
        statusEl.hidden = false;
        statusEl.textContent = data.status.charAt(0).toUpperCase() + data.status.slice(1);
      }

      if(data.attendance && data.attendance.days_total > 0){
        var pct = Math.round((data.attendance.days_present / data.attendance.days_total) * 100);
        attendanceValueEl.textContent = pct + '%';
        attendanceLabelEl.textContent = data.attendance.days_present + ' / ' + data.attendance.days_total + ' days · ' + data.attendance.term;
        if(execStatAttendanceEl) execStatAttendanceEl.textContent = pct + '%';
      }

      if(data.fees){
        var balance = Number(data.fees.amount_due || 0) - Number(data.fees.amount_paid || 0);
        feeValueEl.textContent = balance > 0 ? formatCurrency(balance) + ' due' : 'Paid in full';
        feeLabelEl.textContent = formatCurrency(data.fees.amount_paid) + ' of ' + formatCurrency(data.fees.amount_due) + ' · ' + data.fees.term;
        if(execStatFeeEl) execStatFeeEl.textContent = balance > 0 ? 'Due' : 'Paid';
      }

      if(execStatHifzEl) execStatHifzEl.textContent = data.hifz ? ('Stage ' + data.hifz.stageNumber + ' / 5') : 'N/A';

      renderResults(data.results);
      renderHifz(data.hifz);
      loadAssignments();

      var financeMount = document.querySelector('[data-finance-mount]');
      if(financeMount && window.SHRSFinance){
        window.SHRSFinance.render(financeMount, data.finance);
      }

      var idCardMount = document.querySelector('[data-id-card-mount]');
      if(idCardMount && window.SHRSIdCard){
        window.SHRSIdCard.render(idCardMount, {
          kind: 'student',
          fullName: data.fullName,
          identityNo: data.identityNo,
          roleLabel: 'Student',
          subtitle: [data.institution, data.className].filter(Boolean).join(' · '),
          status: data.status,
          details: [
            { label: 'Admission No.', value: data.admissionNo },
            { label: 'Academic Session', value: data.academicSession },
            { label: 'Admission Date', value: formatDate(data.admissionDate) },
          ],
        });
      }

      loadingEl.hidden = true;
      contentEl.hidden = false;
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load your dashboard.';
      errorEl.hidden = false;
    }
  }

  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/student/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/student/login/';
  });

  load();
})();
