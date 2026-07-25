(function(){
  var TOKEN_KEY = 'shrs_founder_token';

  var gateEl = document.querySelector('[data-founder-gate]');
  var gateForm = document.querySelector('[data-founder-token-form]');
  var gateError = document.querySelector('[data-founder-error]');
  var gateSubmit = document.querySelector('[data-founder-submit]');
  var contentEl = document.querySelector('[data-founder-content]');
  var errorCardEl = document.querySelector('[data-founder-error-card]');
  var errorMessageEl = document.querySelector('[data-founder-error-message]');
  var clearBtn = document.querySelector('[data-founder-clear]');
  var generatedEl = document.querySelector('[data-founder-generated]');

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  function statTile(label, value){
    var tile = el('div', 'portal-stat');
    tile.appendChild(el('div', 'label', label));
    tile.appendChild(el('div', 'value', value));
    return tile;
  }

  function bar(label, count, max){
    var wrap = el('div', 'pfd-bar-row');
    wrap.appendChild(el('div', 'pfd-bar-label', label + ' — ' + count));
    var track = el('div', 'pfd-bar-track');
    var fill = el('div', 'pfd-bar-fill');
    fill.style.width = (max > 0 ? Math.max(3, Math.round((count / max) * 100)) : 0) + '%';
    track.appendChild(fill);
    wrap.appendChild(track);
    return wrap;
  }

  function formatCurrency(amount){
    var n = Number(amount || 0);
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  function render(data){
    generatedEl.textContent = 'Generated ' + new Date(data.generatedAt).toLocaleString();

    var statusStatsEl = document.querySelector('[data-founder-status-stats]');
    statusStatsEl.innerHTML = '';
    statusStatsEl.appendChild(statTile('Active students', data.students.totalActive));
    Object.keys(data.students.byStatus).forEach(function(status){
      if(status === 'active') return;
      var label = status.charAt(0).toUpperCase() + status.slice(1);
      statusStatsEl.appendChild(statTile(label, data.students.byStatus[status]));
    });

    var institutionBarsEl = document.querySelector('[data-founder-institution-bars]');
    institutionBarsEl.innerHTML = '';
    var maxInst = Math.max.apply(null, data.students.byInstitution.map(function(i){ return i.count; }).concat([1]));
    data.students.byInstitution.forEach(function(i){
      institutionBarsEl.appendChild(bar(i.institution, i.count, maxInst));
    });

    document.querySelector('[data-founder-dual-note]').textContent =
      data.students.dualEnrolledCount + ' student(s) currently enrolled in more than one programme at once.';

    var attendanceStatsEl = document.querySelector('[data-founder-attendance-stats]');
    attendanceStatsEl.innerHTML = '';
    attendanceStatsEl.appendChild(statTile('Average attendance', data.attendance.averagePercent != null ? data.attendance.averagePercent + '%' : '—'));
    attendanceStatsEl.appendChild(statTile('Students with recorded attendance', data.attendance.studentsWithRecordedAttendance));
    attendanceStatsEl.appendChild(statTile('Registered guardians', data.guardians.total));

    var hifzStatsEl = document.querySelector('[data-founder-hifz-stats]');
    hifzStatsEl.innerHTML = '';
    hifzStatsEl.appendChild(statTile('Hifz-enrolled students', data.hifz.enrolledCount));
    hifzStatsEl.appendChild(statTile("Juz' verified (school-wide)", data.hifz.juzVerifiedTotal + ' / ' + (data.hifz.enrolledCount * 30)));
    hifzStatsEl.appendChild(statTile('Ijazahs currently granted', data.hifz.ijazahsCurrentlyGranted));

    var stageBarsEl = document.querySelector('[data-founder-stage-bars]');
    stageBarsEl.innerHTML = '';
    var maxStage = Math.max.apply(null, data.hifz.stageBreakdown.map(function(s){ return s.count; }).concat([1]));
    data.hifz.stageBreakdown.forEach(function(s){
      stageBarsEl.appendChild(bar('Stage ' + s.stageNumber + ' — ' + s.label, s.count, maxStage));
    });

    var feeStatsEl = document.querySelector('[data-founder-fee-stats]');
    feeStatsEl.innerHTML = '';
    feeStatsEl.appendChild(statTile('Total due (latest term on file)', formatCurrency(data.fees.totalDue)));
    feeStatsEl.appendChild(statTile('Total paid', formatCurrency(data.fees.totalPaid)));
    feeStatsEl.appendChild(statTile('Outstanding', formatCurrency(data.fees.totalOutstanding)));
    document.querySelector('[data-founder-fee-note]').textContent = data.fees.note;

    var unavailableEl = document.querySelector('[data-founder-unavailable]');
    unavailableEl.innerHTML = '';
    (data.notYetAvailable || []).forEach(function(item){
      var row = el('div', 'pfd-unavailable-row');
      row.appendChild(el('strong', null, item.label));
      row.appendChild(el('span', null, ' — ' + item.reason));
      unavailableEl.appendChild(row);
    });

    gateEl.hidden = true;
    errorCardEl.hidden = true;
    contentEl.hidden = false;
    clearBtn.hidden = false;
  }

  async function load(token){
    try{
      var res = await fetch('/api/portal/founder/dashboard', { headers: { 'x-founder-token': token, 'accept': 'application/json' } });
      var data = await res.json().catch(function(){ return {}; });
      if(!res.ok){
        sessionStorage.removeItem(TOKEN_KEY);
        gateEl.hidden = false;
        contentEl.hidden = true;
        gateError.textContent = data.error || 'Could not load the dashboard.';
        gateError.classList.add('is-visible');
        gateSubmit.disabled = false;
        gateSubmit.textContent = 'View Dashboard';
        return;
      }
      render(data);
    }catch(err){
      gateError.textContent = 'Could not reach the portal — please check your connection and try again.';
      gateError.classList.add('is-visible');
      gateSubmit.disabled = false;
      gateSubmit.textContent = 'View Dashboard';
    }
  }

  gateForm.addEventListener('submit', function(e){
    e.preventDefault();
    gateError.classList.remove('is-visible');
    var token = gateForm.token.value.trim();
    if(!token) return;
    gateSubmit.disabled = true;
    gateSubmit.textContent = 'Loading…';
    sessionStorage.setItem(TOKEN_KEY, token);
    load(token);
  });

  clearBtn.addEventListener('click', function(){
    sessionStorage.removeItem(TOKEN_KEY);
    contentEl.hidden = true;
    clearBtn.hidden = true;
    gateEl.hidden = false;
    gateForm.reset();
  });

  var stored = sessionStorage.getItem(TOKEN_KEY);
  if(stored){
    load(stored);
  }
})();
