(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  var classListEl = document.querySelector('[data-class-list]');
  var classListEmptyEl = document.querySelector('[data-class-list-empty]');

  var rosterCard = document.querySelector('[data-roster-card]');
  var rosterTitleEl = document.querySelector('[data-roster-title]');
  var rosterMetaEl = document.querySelector('[data-roster-meta]');
  var rosterHeadEl = document.querySelector('[data-roster-head]');
  var rosterBodyEl = document.querySelector('[data-roster-body]');
  var termInput = document.querySelector('[data-term-input]');
  var saveRowEl = document.querySelector('[data-save-row]');
  var rosterResultEl = document.querySelector('[data-roster-result]');

  var currentClassId = null;
  var currentRoster = null;

  var assignmentsCard = document.querySelector('[data-assignments-card]');
  var assignmentsMetaEl = document.querySelector('[data-assignments-meta]');
  var assignmentSubjectSelect = document.querySelector('[data-assignment-subject]');
  var assignmentTitleInput = document.querySelector('[data-assignment-title]');
  var assignmentDueInput = document.querySelector('[data-assignment-due]');
  var assignmentMaxInput = document.querySelector('[data-assignment-max]');
  var assignmentInstructionsInput = document.querySelector('[data-assignment-instructions]');
  var assignmentCreateBtn = document.querySelector('[data-assignment-create-btn]');
  var assignmentFormResultEl = document.querySelector('[data-assignment-form-result]');
  var assignmentListEl = document.querySelector('[data-assignment-list]');
  var assignmentListEmptyEl = document.querySelector('[data-assignment-list-empty]');
  var gradingPanel = document.querySelector('[data-grading-panel]');
  var gradingTitleEl = document.querySelector('[data-grading-title]');
  var gradingBodyEl = document.querySelector('[data-grading-body]');
  var gradingSaveBtn = document.querySelector('[data-grading-save-btn]');
  var gradingResultEl = document.querySelector('[data-grading-result]');
  var currentGradingAssignmentId = null;

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  function showResult(message, ok){
    rosterResultEl.hidden = false;
    rosterResultEl.textContent = message;
    rosterResultEl.className = 'registrar-form-result ' + (ok ? 'is-ok' : 'is-error');
  }

  function renderClassList(classes){
    classListEl.innerHTML = '';
    if(!classes.length){
      classListEmptyEl.hidden = false;
      return;
    }
    classListEmptyEl.hidden = true;
    classes.forEach(function(c){
      var card = el('button', 'teacher-class-card');
      card.type = 'button';
      card.appendChild(el('div', 'teacher-class-name', c.className + ' — ' + c.institution));
      var tags = el('div', 'teacher-class-tags');
      if(c.isClassTeacher) tags.appendChild(el('span', 'portal-programme-chip is-primary', 'Class Teacher'));
      c.subjects.forEach(function(s){ tags.appendChild(el('span', 'portal-programme-chip', s)); });
      card.appendChild(tags);
      card.appendChild(el('div', 'teacher-class-count', c.studentCount + ' student' + (c.studentCount === 1 ? '' : 's')));
      card.addEventListener('click', function(){ loadRoster(c.classId); });
      classListEl.appendChild(card);
    });
  }

  function buildRosterTable(data){
    rosterHeadEl.innerHTML = '';
    rosterBodyEl.innerHTML = '';
    saveRowEl.innerHTML = '';

    var headers = ['Student', 'Admission No.'];
    if(data.isClassTeacher) headers.push('Present', 'Total');
    data.subjects.forEach(function(s){ headers.push(s + ' CA', s + ' Exam'); });
    headers.forEach(function(h){ rosterHeadEl.appendChild(el('th', null, h)); });

    data.students.forEach(function(s){
      var tr = document.createElement('tr');
      tr.dataset.studentId = s.id;
      tr.appendChild(el('td', null, s.fullName));
      tr.appendChild(el('td', null, s.admissionNo));

      if(data.isClassTeacher){
        var present = document.createElement('td');
        var presentInput = document.createElement('input');
        presentInput.type = 'number'; presentInput.min = '0'; presentInput.dataset.field = 'present';
        if(s.attendance) presentInput.value = s.attendance.daysPresent;
        present.appendChild(presentInput);
        tr.appendChild(present);

        var total = document.createElement('td');
        var totalInput = document.createElement('input');
        totalInput.type = 'number'; totalInput.min = '0'; totalInput.dataset.field = 'total';
        if(s.attendance) totalInput.value = s.attendance.daysTotal;
        total.appendChild(totalInput);
        tr.appendChild(total);
      }

      data.subjects.forEach(function(subject){
        var existing = (s.results || []).find(function(r){ return r.subject === subject; });
        var ca = document.createElement('td');
        var caInput = document.createElement('input');
        caInput.type = 'number'; caInput.min = '0'; caInput.step = '0.5'; caInput.dataset.field = 'ca-' + subject;
        if(existing && existing.ca_score != null) caInput.value = existing.ca_score;
        ca.appendChild(caInput);
        tr.appendChild(ca);

        var exam = document.createElement('td');
        var examInput = document.createElement('input');
        examInput.type = 'number'; examInput.min = '0'; examInput.step = '0.5'; examInput.dataset.field = 'exam-' + subject;
        if(existing && existing.exam_score != null) examInput.value = existing.exam_score;
        exam.appendChild(examInput);
        tr.appendChild(exam);
      });

      rosterBodyEl.appendChild(tr);
    });

    if(data.isClassTeacher){
      var attBtn = el('button', 'portal-submit teacher-save-btn', 'Save Attendance');
      attBtn.type = 'button';
      attBtn.addEventListener('click', saveAttendance);
      saveRowEl.appendChild(attBtn);
    }
    data.subjects.forEach(function(subject){
      var scoreBtn = el('button', 'portal-submit teacher-save-btn', 'Save ' + subject + ' Scores');
      scoreBtn.type = 'button';
      scoreBtn.addEventListener('click', function(){ saveScores(subject); });
      saveRowEl.appendChild(scoreBtn);
    });
  }

  function readRows(){
    return Array.prototype.slice.call(rosterBodyEl.querySelectorAll('tr'));
  }

  async function saveAttendance(){
    rosterResultEl.hidden = true;
    var term = termInput.value.trim();
    if(!term){ showResult('Enter a term first.', false); return; }
    var records = [];
    readRows().forEach(function(tr){
      var present = tr.querySelector('[data-field="present"]');
      var total = tr.querySelector('[data-field="total"]');
      if(present && total && present.value !== '' && total.value !== ''){
        records.push({ studentId: Number(tr.dataset.studentId), daysPresent: Number(present.value), daysTotal: Number(total.value) });
      }
    });
    if(!records.length){ showResult('Enter at least one student\'s attendance before saving.', false); return; }
    try{
      var res = await fetch('/api/portal/staff/teacher/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: currentClassId, term: term, records: records }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not save attendance.');
      showResult('Attendance saved for ' + data.saved + ' student(s), ' + data.term + '.', true);
    }catch(err){
      showResult((err && err.message) || 'Could not save attendance.', false);
    }
  }

  async function saveScores(subject){
    rosterResultEl.hidden = true;
    var term = termInput.value.trim();
    if(!term){ showResult('Enter a term first.', false); return; }
    var records = [];
    readRows().forEach(function(tr){
      var ca = tr.querySelector('[data-field="ca-' + subject + '"]');
      var exam = tr.querySelector('[data-field="exam-' + subject + '"]');
      if((ca && ca.value !== '') || (exam && exam.value !== '')){
        records.push({
          studentId: Number(tr.dataset.studentId),
          caScore: ca && ca.value !== '' ? ca.value : null,
          examScore: exam && exam.value !== '' ? exam.value : null,
        });
      }
    });
    if(!records.length){ showResult('Enter at least one student\'s score before saving.', false); return; }
    try{
      var res = await fetch('/api/portal/staff/teacher/assessments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: currentClassId, term: term, subject: subject, records: records }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not save scores.');
      showResult('Saved ' + data.subject + ' for ' + data.saved + ' student(s), ' + data.term + '.', true);
    }catch(err){
      showResult((err && err.message) || 'Could not save scores.', false);
    }
  }

  async function loadRoster(classId){
    currentClassId = classId;
    rosterResultEl.hidden = true;
    try{
      var res = await fetch('/api/portal/staff/teacher/roster?classId=' + encodeURIComponent(classId));
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load that class roster.');
      currentRoster = data;
      rosterTitleEl.textContent = data.class.name + ' — ' + data.class.institution;
      rosterMetaEl.textContent = data.currentTerm ? 'Current term on file: ' + data.currentTerm : 'No current term is set for the school yet — enter one below.';
      termInput.value = data.currentTerm || '';
      buildRosterTable(data);
      rosterCard.hidden = false;
      rosterCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

      assignmentSubjectSelect.innerHTML = '';
      data.subjects.forEach(function(s){
        var opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        assignmentSubjectSelect.appendChild(opt);
      });
      gradingPanel.hidden = true;
      assignmentsCard.hidden = false;
      loadAssignments(classId);
    }catch(err){
      showResult((err && err.message) || 'Could not load that class roster.', false);
      rosterCard.hidden = false;
    }
  }

  function formatDue(dueAt){
    if(!dueAt) return 'No due date';
    var d = new Date(dueAt);
    return 'Due ' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderAssignmentList(classId, assignments){
    var forClass = assignments.filter(function(a){ return a.class_id === classId; });
    assignmentListEl.innerHTML = '';
    if(!forClass.length){
      assignmentListEmptyEl.hidden = false;
      assignmentsMetaEl.textContent = '';
      return;
    }
    assignmentListEmptyEl.hidden = true;
    assignmentsMetaEl.textContent = forClass.length + ' assignment' + (forClass.length === 1 ? '' : 's') + ' set for this class';
    forClass.forEach(function(a){
      var row = el('div', 'teacher-class-card');
      row.appendChild(el('div', 'teacher-class-name', a.subject + ' — ' + a.title));
      var tags = el('div', 'teacher-class-tags');
      tags.appendChild(el('span', 'portal-programme-chip', formatDue(a.due_at)));
      tags.appendChild(el('span', 'portal-programme-chip', a.submitted_count + ' of ' + a.roster_size + ' submitted'));
      tags.appendChild(el('span', 'portal-programme-chip', a.graded_count + ' graded'));
      row.appendChild(tags);
      var gradeBtn = el('button', 'portal-submit teacher-save-btn', 'Open & Grade');
      gradeBtn.type = 'button';
      gradeBtn.addEventListener('click', function(){ loadGrading(a.id, a.subject + ' — ' + a.title); });
      row.appendChild(gradeBtn);
      assignmentListEl.appendChild(row);
    });
  }

  async function loadAssignments(classId){
    try{
      var res = await fetch('/api/portal/staff/teacher/assignments');
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load assignments.');
      renderAssignmentList(classId, data.assignments || []);
    }catch(err){
      assignmentsMetaEl.textContent = (err && err.message) || 'Could not load assignments.';
    }
  }

  assignmentCreateBtn.addEventListener('click', async function(){
    assignmentFormResultEl.hidden = true;
    var term = termInput.value.trim();
    var subject = assignmentSubjectSelect.value;
    var title = assignmentTitleInput.value.trim();
    if(!term){ assignmentFormResultEl.hidden = false; assignmentFormResultEl.className = 'registrar-form-result is-error'; assignmentFormResultEl.textContent = 'Enter a term in the roster section above first.'; return; }
    if(!subject || !title){ assignmentFormResultEl.hidden = false; assignmentFormResultEl.className = 'registrar-form-result is-error'; assignmentFormResultEl.textContent = 'Subject and title are required.'; return; }
    try{
      var res = await fetch('/api/portal/staff/teacher/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: currentClassId, subject: subject, term: term, title: title,
          instructions: assignmentInstructionsInput.value.trim() || null,
          maxScore: assignmentMaxInput.value || 100,
          dueAt: assignmentDueInput.value ? new Date(assignmentDueInput.value).toISOString() : null,
        }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not set that assignment.');
      assignmentFormResultEl.hidden = false; assignmentFormResultEl.className = 'registrar-form-result is-ok'; assignmentFormResultEl.textContent = 'Assignment set.';
      assignmentTitleInput.value = ''; assignmentDueInput.value = ''; assignmentInstructionsInput.value = '';
      loadAssignments(currentClassId);
    }catch(err){
      assignmentFormResultEl.hidden = false; assignmentFormResultEl.className = 'registrar-form-result is-error';
      assignmentFormResultEl.textContent = (err && err.message) || 'Could not set that assignment.';
    }
  });

  async function loadGrading(assignmentId, title){
    currentGradingAssignmentId = assignmentId;
    gradingResultEl.hidden = true;
    gradingTitleEl.textContent = 'Grade — ' + title;
    gradingPanel.hidden = false;
    gradingPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try{
      var res = await fetch('/api/portal/staff/teacher/assignment-grading?assignmentId=' + encodeURIComponent(assignmentId));
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load submissions.');
      gradingBodyEl.innerHTML = '';
      (data.roster || []).forEach(function(r){
        var tr = document.createElement('tr');
        tr.dataset.studentId = r.student_id;
        tr.appendChild(el('td', null, r.full_name));
        var subTd = document.createElement('td');
        subTd.className = 'portal-assignment-desc';
        subTd.textContent = r.submission_text ? r.submission_text : (r.status === 'not_submitted' || !r.status ? 'Not submitted' : r.status);
        tr.appendChild(subTd);
        var scoreTd = document.createElement('td');
        var scoreInput = document.createElement('input');
        scoreInput.type = 'number'; scoreInput.min = '0'; scoreInput.step = '0.5'; scoreInput.dataset.field = 'score';
        if(r.score != null) scoreInput.value = r.score;
        scoreTd.appendChild(scoreInput);
        tr.appendChild(scoreTd);
        var fbTd = document.createElement('td');
        var fbInput = document.createElement('input');
        fbInput.type = 'text'; fbInput.dataset.field = 'feedback';
        if(r.teacher_feedback) fbInput.value = r.teacher_feedback;
        fbTd.appendChild(fbInput);
        tr.appendChild(fbTd);
        gradingBodyEl.appendChild(tr);
      });
    }catch(err){
      gradingResultEl.hidden = false; gradingResultEl.className = 'registrar-form-result is-error';
      gradingResultEl.textContent = (err && err.message) || 'Could not load submissions.';
    }
  }

  gradingSaveBtn.addEventListener('click', async function(){
    gradingResultEl.hidden = true;
    var records = [];
    Array.prototype.slice.call(gradingBodyEl.querySelectorAll('tr')).forEach(function(tr){
      var score = tr.querySelector('[data-field="score"]');
      var feedback = tr.querySelector('[data-field="feedback"]');
      if((score && score.value !== '') || (feedback && feedback.value !== '')){
        records.push({ studentId: Number(tr.dataset.studentId), score: score.value !== '' ? score.value : null, teacherFeedback: feedback.value || null });
      }
    });
    if(!records.length){ gradingResultEl.hidden = false; gradingResultEl.className = 'registrar-form-result is-error'; gradingResultEl.textContent = 'Enter at least one score or comment before saving.'; return; }
    try{
      var res = await fetch('/api/portal/staff/teacher/assignment-grading', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: currentGradingAssignmentId, records: records }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not save grades.');
      gradingResultEl.hidden = false; gradingResultEl.className = 'registrar-form-result is-ok';
      gradingResultEl.textContent = 'Saved grades for ' + data.saved + ' student(s).';
      loadAssignments(currentClassId);
    }catch(err){
      gradingResultEl.hidden = false; gradingResultEl.className = 'registrar-form-result is-error';
      gradingResultEl.textContent = (err && err.message) || 'Could not save grades.';
    }
  });

  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/staff/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/staff/login/';
  });

  // Institutional Intelligence — same pattern as js/portal-founder-dashboard.js's
  // Briefing/Alerts/Timeline: plain sentences and rows over fields already
  // computed above, nothing fabricated, a line simply omitted when its
  // figure isn't available.
  function alertRow(label, count, detail){
    var row = el('div', 'pfd-alert-row' + (count > 0 ? ' has-attention' : ' is-quiet'));
    var left = el('div');
    left.appendChild(el('div', 'pfd-alert-label', label));
    if(detail) left.appendChild(el('div', 'pfd-alert-detail', detail));
    row.appendChild(left);
    row.appendChild(el('div', 'pfd-alert-count', String(count)));
    return row;
  }

  function renderTeacherBriefing(classCount, studentCount, pending, pendingClasses){
    var mount = document.querySelector('[data-teacher-briefing]');
    if(!mount) return;
    var sentences = ['You teach ' + classCount + ' class' + (classCount === 1 ? '' : 'es') +
      ', ' + studentCount + ' student' + (studentCount === 1 ? '' : 's') + ' in total.'];
    if(pending > 0){
      sentences.push(pending + ' submission' + (pending === 1 ? '' : 's') + ' across ' +
        pendingClasses + ' assignment' + (pendingClasses === 1 ? '' : 's') + ' await grading.');
    }else{
      sentences.push('Nothing is currently awaiting your grading.');
    }
    mount.textContent = sentences.join(' ');
  }

  function renderTeacherAlerts(pending, pendingClasses){
    var mount = document.querySelector('[data-teacher-alerts]');
    if(!mount) return;
    mount.innerHTML = '';
    mount.appendChild(alertRow('Assignments Awaiting Grading', pending,
      pending > 0 ? 'Across ' + pendingClasses + ' assignment' + (pendingClasses === 1 ? '' : 's') + '.' : 'Everything set so far has been graded.'));
  }

  function renderTeacherTimeline(assignments){
    var mount = document.querySelector('[data-teacher-timeline]');
    if(!mount) return;
    if(!assignments.length){
      mount.innerHTML = '<div class="portal-empty">No assignments set yet — this fills in as soon as you set one.</div>';
      return;
    }
    var events = [];
    assignments.forEach(function(a){
      events.push({ at: a.created_at, label: a.subject + ' — ' + a.title + ' set', category: a.class_name + ' · ' + a.institution });
      if(a.due_at) events.push({ at: a.due_at, label: a.subject + ' — ' + a.title + ' due', category: a.class_name + ' · ' + a.institution });
    });
    events.sort(function(x, y){ return new Date(y.at) - new Date(x.at); });
    var now = Date.now();
    mount.innerHTML = events.slice(0, 8).map(function(ev){
      var when = new Date(ev.at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
      var isNew = Math.abs(now - new Date(ev.at).getTime()) < 24 * 60 * 60 * 1000;
      return '<div class="pfd-alert-row">'
        + '<div><div class="pfd-alert-label"><span class="pfd-timeline-dot" aria-hidden="true"></span>' + ev.label + (isNew ? '<span class="pfd-timeline-new">New</span>' : '') + '</div><div class="pfd-alert-detail">' + ev.category + '</div></div>'
        + '<div class="pfd-alert-count" style="font-size:0.82rem;color:var(--ink-soft);">' + when + '</div>'
        + '</div>';
    }).join('');
  }

  (async function init(){
    try{
      var meRes = await fetch('/api/portal/staff/me');
      if(meRes.status === 401){
        window.location.href = '/portal/staff/login/';
        return;
      }
      var meData = await meRes.json();
      if(!meRes.ok) throw new Error(meData.error || 'Could not load your staff session.');

      var classesRes = await fetch('/api/portal/staff/teacher/classes');
      var classesData = await classesRes.json();
      if(!classesRes.ok) throw new Error(classesData.error || 'Could not load your classes.');

      renderClassList(classesData.classes);
      loadingEl.hidden = true;
      contentEl.hidden = false;

      var execClasses = document.querySelector('[data-exec-stat="classes"]');
      var execStudents = document.querySelector('[data-exec-stat="students"]');
      var execPendingGrading = document.querySelector('[data-exec-stat="pending-grading"]');
      var studentCount = classesData.classes.reduce(function(a, c){ return a + Number(c.studentCount || 0); }, 0);
      if(execClasses) execClasses.textContent = classesData.classes.length;
      if(execStudents) execStudents.textContent = studentCount;

      try{
        var allAssignRes = await fetch('/api/portal/staff/teacher/assignments');
        var allAssignData = await allAssignRes.json();
        if(allAssignRes.ok){
          var assignments = allAssignData.assignments || [];
          var pending = assignments.reduce(function(a, x){
            return a + Math.max(0, Number(x.submitted_count || 0) - Number(x.graded_count || 0));
          }, 0);
          var pendingClasses = assignments.filter(function(x){
            return (Number(x.submitted_count || 0) - Number(x.graded_count || 0)) > 0;
          }).length;
          if(execPendingGrading) execPendingGrading.textContent = pending;
          renderTeacherBriefing(classesData.classes.length, studentCount, pending, pendingClasses);
          renderTeacherAlerts(pending, pendingClasses);
          renderTeacherTimeline(assignments);
        }
      }catch(e){ /* stat pill and widgets stay at their default state */ }
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Teacher Portal.';
      errorEl.hidden = false;
    }
  })();
})();
