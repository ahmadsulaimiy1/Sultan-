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

  function renderResults(results, offline){
    resultsEl.innerHTML = '';
    if(!results || !results.length){
      resultsEl.appendChild(el('p', null, offline
        ? 'Your results are not saved on this device. Reconnect to see them.'
        : 'No results recorded yet.'));
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

  function renderHifz(hifz, offline){
    if(!hifz){
      if(offline){
        // Hiding it would say "you are not a Qur'an College student". Showing
        // an empty grid would say "no Juz' is verified". Neither is known here.
        hifzCardEl.hidden = false;
        hifzStageEl.textContent = 'Not saved on this device';
        hifzStageDescEl.textContent = 'Your Hifz progress will appear when you reconnect.';
        hifzCountEl.textContent = '';
        if(juzGridEl) juzGridEl.innerHTML = '';
        if(ijazahEl) ijazahEl.innerHTML = '';
        return;
      }
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

  async function fetchDashboard(){
    if(window.SHRSPortalOffline){
      return window.SHRSPortalOffline.view('portal.student.dashboard', '/api/portal/student/me');
    }
    var res = await fetch('/api/portal/student/me', { headers: { 'accept': 'application/json' } });
    var body = await res.json().catch(function(){ return {}; });
    return { ok: res.ok, status: res.status, data: body, source: 'network', syncedAt: Date.now(), isLive: true };
  }

  async function load(){
    try{
      var result = await fetchDashboard();
      if(result.status === 401){
        window.location.href = '/portal/student/login/';
        return;
      }
      // Assembled from the copy held on this device. That copy carries who you
      // are and where you are enrolled; it deliberately does not carry your
      // marks, your fees or your Juz' grid (js/shrs-offline-policy.js §9), so
      // each of those panels has to say so in its own words rather than sit
      // empty and be read as "nothing recorded".
      var offline = result.source === 'cache';
      var data = result.data || {};
      if(!result.ok){
        if(window.SHRSPortalOffline && result.source === 'locked'){
          throw new Error(window.SHRSPortalOffline.lockedMessage('en'));
        }
        if(window.SHRSPortalOffline && result.source === 'unavailable'){
          throw new Error(window.SHRSPortalOffline.unavailableMessage('en'));
        }
        throw new Error(data.error || 'Could not load your dashboard.');
      }
      if(window.SHRSPortalOffline){
        window.SHRSPortalOffline.stamp(document.querySelector('[data-portal-freshness]'), result, 'en');
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
      } else if(offline){
        feeValueEl.textContent = '—';
        feeLabelEl.textContent = 'Not saved on this device';
        if(execStatFeeEl) execStatFeeEl.textContent = '—';
      }

      // 'N/A' is a claim about enrolment. Offline it would be a guess, so the
      // stat says nothing rather than the wrong thing.
      if(execStatHifzEl) execStatHifzEl.textContent = data.hifz ? ('Stage ' + data.hifz.stageNumber + ' / 5') : (offline ? '—' : 'N/A');

      renderResults(data.results, offline);
      renderHifz(data.hifz, offline);

      var financeMount = document.querySelector('[data-finance-mount]');
      if(financeMount && window.SHRSFinance && !offline){
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
