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
    }catch(err){
      showResult((err && err.message) || 'Could not load that class roster.', false);
      rosterCard.hidden = false;
    }
  }

  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/staff/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/staff/login/';
  });

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
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Teacher Portal.';
      errorEl.hidden = false;
    }
  })();
})();
