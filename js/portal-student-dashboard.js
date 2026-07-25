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
    results.forEach(function(r){
      var row = document.createElement('tr');
      [r.term, r.subject, r.ca_score, r.exam_score, r.total_score, r.teacher_comment || '—'].forEach(function(v){
        row.appendChild(el('td', null, v == null ? '—' : String(v)));
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    var scrollWrap = el('div', 'portal-results-scroll');
    scrollWrap.appendChild(table);
    resultsEl.appendChild(scrollWrap);
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
        card.appendChild(el('div', 'pij-ref', 'Reference ' + rec.reference_no));
        card.appendChild(el('div', 'pij-scope', rec.certified_scope || 'Ijazah'));
        card.appendChild(el('div', 'pij-meta', 'Granted ' + rec.granted_date + (rec.examining_scholars ? ' · Examined by ' + rec.examining_scholars : '')));
        if(rec.revoked_at){
          card.appendChild(el('div', 'pij-revoked', 'Revoked' + (rec.revocation_note ? ': ' + rec.revocation_note : '')));
        }
        ijazahEl.appendChild(card);
      });
    }
  }

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

      if(data.status && data.status !== 'active'){
        statusEl.hidden = false;
        statusEl.textContent = data.status.charAt(0).toUpperCase() + data.status.slice(1);
      }

      if(data.attendance && data.attendance.days_total > 0){
        var pct = Math.round((data.attendance.days_present / data.attendance.days_total) * 100);
        attendanceValueEl.textContent = pct + '%';
        attendanceLabelEl.textContent = data.attendance.days_present + ' / ' + data.attendance.days_total + ' days · ' + data.attendance.term;
      }

      if(data.fees){
        var balance = Number(data.fees.amount_due || 0) - Number(data.fees.amount_paid || 0);
        feeValueEl.textContent = balance > 0 ? formatCurrency(balance) + ' due' : 'Paid in full';
        feeLabelEl.textContent = formatCurrency(data.fees.amount_paid) + ' of ' + formatCurrency(data.fees.amount_due) + ' · ' + data.fees.term;
      }

      renderResults(data.results);
      renderHifz(data.hifz);

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
