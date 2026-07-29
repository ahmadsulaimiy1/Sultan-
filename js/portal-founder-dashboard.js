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
    wrap.title = label + ': ' + count + (max > 0 ? ' of ' + max : '');
    wrap.appendChild(el('div', 'pfd-bar-label', label + ' — ' + count));
    var track = el('div', 'pfd-bar-track');
    var fill = el('div', 'pfd-bar-fill');
    fill.style.width = (max > 0 ? Math.max(3, Math.round((count / max) * 100)) : 0) + '%';
    track.appendChild(fill);
    wrap.appendChild(track);
    return wrap;
  }

  // Same bar visual as bar() above, but for currency values — displays
  // a formatted amount while computing the fill ratio from the raw
  // number, since bar() conflates the two.
  function moneyBar(label, amount, max){
    var wrap = el('div', 'pfd-bar-row');
    wrap.title = label + ': ' + formatCurrency(amount);
    wrap.appendChild(el('div', 'pfd-bar-label', label + ' — ' + formatCurrency(amount)));
    var track = el('div', 'pfd-bar-track');
    var fill = el('div', 'pfd-bar-fill');
    fill.style.width = (max > 0 ? Math.max(3, Math.round((amount / max) * 100)) : 0) + '%';
    track.appendChild(fill);
    wrap.appendChild(track);
    return wrap;
  }

  function formatCurrency(amount){
    var n = Number(amount || 0);
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  function formatCurrencyShort(amount){
    var n = Number(amount || 0);
    if(n >= 1000000) return '₦' + (n/1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if(n >= 1000) return '₦' + (n/1000).toFixed(0) + 'k';
    return '₦' + n;
  }

  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var CHART_COLORS = ['var(--chart-1)','var(--chart-2)','var(--chart-3)','var(--chart-4)','var(--chart-5)','var(--chart-6)'];

  // Rounds a data max up to a "clean" axis ceiling (1/2/5/10 × a power of
  // ten) — the same convention Bloomberg/TradingView-style axes use so
  // gridlines land on round figures instead of the raw data's max.
  function niceCeil(n){
    if(!(n > 0)) return 1;
    var pow = Math.pow(10, Math.floor(Math.log(n) / Math.LN10));
    var frac = n / pow;
    var niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
    return niceFrac * pow;
  }

  // Executive-grade inline SVG bar chart — no charting library exists in
  // this codebase (see docs/shrs-design-system.md's Charts section), so
  // this is hand-rolled on the --chart-1..6 design-system tokens, with
  // gridlines against a "nice" axis ceiling, a trend polyline across bar
  // tops, a dashed average-benchmark line, an inline legend, and a native
  // <title> per bar for a zero-JS hover tooltip (works on touch too, via
  // a long-press, unlike a JS-driven tooltip layer).
  function revenueBarChart(rows){
    var width = 640, height = 260;
    var padding = { top: 36, right: 18, bottom: 34, left: 60 };
    var innerW = width - padding.left - padding.right;
    var innerH = height - padding.top - padding.bottom;
    var max = Math.max.apply(null, rows.map(function(r){ return r.total || 0; }).concat([1]));
    var axisMax = niceCeil(max);
    var barGap = 16;
    var barWidth = rows.length ? innerW / rows.length - barGap : 0;
    var avg = rows.reduce(function(s, r){ return s + (r.total || 0); }, 0) / (rows.length || 1);
    var baseY = padding.top + innerH;

    var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="Revenue by month, last ' + rows.length + ' months, average ' + formatCurrencyShort(avg) + '">';

    // Gridlines + y-axis labels, on the rounded axisMax
    var gridSteps = 4;
    for(var g = 0; g <= gridSteps; g++){
      var gv = axisMax * (g / gridSteps);
      var gy = baseY - (gv / axisMax) * innerH;
      svg += '<line x1="' + padding.left + '" y1="' + gy + '" x2="' + (width - padding.right) + '" y2="' + gy + '" stroke="var(--line)" stroke-width="1"' + (g === 0 ? '' : ' stroke-dasharray="2,3"') + '></line>';
      svg += '<text x="' + (padding.left - 10) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="10.5" fill="var(--ink-soft)">' + formatCurrencyShort(gv) + '</text>';
    }

    // Average benchmark line
    var avgY = baseY - (avg / axisMax) * innerH;
    svg += '<line x1="' + padding.left + '" y1="' + avgY + '" x2="' + (width - padding.right) + '" y2="' + avgY + '" stroke="var(--terracotta)" stroke-width="1.4" stroke-dasharray="6,4"><title>6-month average: ' + formatCurrencyShort(avg) + '</title></line>';

    // Bars, value labels, month labels, trend points
    var points = [];
    rows.forEach(function(r, i){
      var barHeight = axisMax > 0 ? ((r.total || 0) / axisMax) * innerH : 0;
      var x = padding.left + i * (barWidth + barGap);
      var y = baseY - barHeight;
      var cx = x + barWidth / 2;
      points.push(cx + ',' + y);
      var parts = String(r.month).split('-');
      var label = MONTH_NAMES[Number(parts[1]) - 1] || r.month;
      svg += '<rect x="' + x + '" y="' + y + '" width="' + Math.max(barWidth, 1) + '" height="' + Math.max(barHeight, 1) + '" fill="' + CHART_COLORS[i % CHART_COLORS.length] + '" rx="4"><title>' + label + ': ' + formatCurrency(r.total || 0) + '</title></rect>';
      svg += '<text x="' + cx + '" y="' + (height - padding.bottom + 18) + '" text-anchor="middle" font-size="11" fill="var(--ink-soft)">' + label + '</text>';
      svg += '<text x="' + cx + '" y="' + (y - 8) + '" text-anchor="middle" font-size="11" font-weight="600" fill="var(--navy)">' + formatCurrencyShort(r.total || 0) + '</text>';
    });

    // Trend polyline across bar tops + point markers
    if(points.length > 1){
      svg += '<polyline points="' + points.join(' ') + '" fill="none" stroke="var(--oxford-navy)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity="0.55"></polyline>';
    }
    points.forEach(function(p){
      var xy = p.split(',');
      svg += '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="2.6" fill="var(--oxford-navy)" opacity="0.7"></circle>';
    });

    // Baseline axis
    svg += '<line x1="' + padding.left + '" y1="' + baseY + '" x2="' + (width - padding.right) + '" y2="' + baseY + '" stroke="var(--navy)" stroke-width="1.2"></line>';

    // Institutional legend (trend + average) — top-right, above the bars
    var legX = width - padding.right;
    svg += '<g font-size="10.5" fill="var(--ink-soft)">'
      + '<circle cx="' + (legX - 116) + '" cy="14" r="3" fill="var(--oxford-navy)"></circle>'
      + '<text x="' + (legX - 108) + '" y="17.5">Trend</text>'
      + '<line x1="' + (legX - 62) + '" y1="14" x2="' + (legX - 48) + '" y2="14" stroke="var(--terracotta)" stroke-width="2" stroke-dasharray="4,3"></line>'
      + '<text x="' + (legX - 44) + '" y="17.5">Average</text>'
      + '</g>';

    svg += '</svg>';
    return svg;
  }

  // Radial completion indicator — used for the school-wide Hifz
  // Completion figure (juz' verified out of enrolled-students × 30).
  // One of the demonstration infographics requested by the Executive
  // Design Directive; built on real founder-dashboard data, not a mock.
  function donutChart(percent, ringLabel, color){
    var size = 176, stroke = 16, r = (size - stroke) / 2, c = size / 2;
    var pct = Math.max(0, Math.min(100, percent));
    var circumference = 2 * Math.PI * r;
    var offset = circumference * (1 - pct / 100);
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="176" height="176" role="img" aria-label="' + ringLabel + ': ' + pct + '%">'
      + '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + stroke + '"></circle>'
      + '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" '
      + 'stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" transform="rotate(-90 ' + c + ' ' + c + ')"><title>' + ringLabel + ': ' + pct + '%</title></circle>'
      + '<text x="' + c + '" y="' + (c - 2) + '" text-anchor="middle" font-size="28" font-weight="700" fill="var(--navy)" font-family="Cinzel, Amiri, serif">' + pct + '%</text>'
      + '<text x="' + c + '" y="' + (c + 20) + '" text-anchor="middle" font-size="10.5" letter-spacing="0.03em" fill="var(--ink-soft)">' + ringLabel.toUpperCase() + '</text>'
      + '</svg>';
  }

  // Two-stage funnel (Invoiced -> Collected) with a taper connector and
  // collection-rate callout — the second demonstration infographic,
  // built on the same real totalInvoiced/totalCollected/collectionRate
  // figures already shown as plain stat tiles above it.
  function collectionFunnel(invoiced, collected, collectionRatePercent){
    var width = 520, height = 176;
    var topW = width - 40, topH = 58, topY = 8;
    var ratio = invoiced > 0 ? Math.max(0, Math.min(1, collected / invoiced)) : 0;
    var botW = Math.max(topW * ratio, 30);
    var botH = 58, botY = topY + topH + 20;
    var topX0 = (width - topW) / 2, topX1 = (width + topW) / 2;
    var botX0 = (width - botW) / 2, botX1 = (width + botW) / 2;
    var midX = width / 2;

    var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="Fee collection funnel: ' + formatCurrencyShort(invoiced) + ' invoiced, ' + formatCurrencyShort(collected) + ' collected">';
    svg += '<rect x="' + topX0 + '" y="' + topY + '" width="' + topW + '" height="' + topH + '" rx="6" fill="var(--oxford-navy)"><title>Total Invoiced: ' + formatCurrency(invoiced) + '</title></rect>';
    svg += '<text x="' + midX + '" y="' + (topY + topH / 2 - 4) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">Invoiced</text>';
    svg += '<text x="' + midX + '" y="' + (topY + topH / 2 + 15) + '" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.85)">' + formatCurrencyShort(invoiced) + '</text>';

    svg += '<polygon points="' + topX0 + ',' + (topY + topH) + ' ' + topX1 + ',' + (topY + topH) + ' ' + botX1 + ',' + botY + ' ' + botX0 + ',' + botY + '" fill="var(--oxford-navy)" opacity="0.22"></polygon>';

    svg += '<rect x="' + botX0 + '" y="' + botY + '" width="' + botW + '" height="' + botH + '" rx="6" fill="var(--gold)"><title>Total Collected: ' + formatCurrency(collected) + '</title></rect>';
    svg += '<text x="' + midX + '" y="' + (botY + botH / 2 - 4) + '" text-anchor="middle" font-size="13" font-weight="700" fill="var(--navy-deep)">Collected</text>';
    svg += '<text x="' + midX + '" y="' + (botY + botH / 2 + 15) + '" text-anchor="middle" font-size="12" fill="var(--navy-deep)">' + formatCurrencyShort(collected) + '</text>';

    if(collectionRatePercent != null){
      svg += '<text x="' + (width - 4) + '" y="' + (botY + botH + 22) + '" text-anchor="end" font-size="12.5" font-weight="700" fill="var(--terracotta)">' + collectionRatePercent + '% collection rate</text>';
    }
    svg += '</svg>';
    return svg;
  }

  function render(data){
    generatedEl.textContent = 'Generated ' + new Date(data.generatedAt).toLocaleString();

    var authStatusEl = document.querySelector('[data-founder-auth-status]');
    if(authStatusEl){
      authStatusEl.textContent = data.authMethod === 'staff_session'
        ? 'Signed in as ' + (data.viewedBy || 'an Executive-role staff account')
        : 'Viewed via the legacy Founder token — sign in with a real Executive-role staff account once one exists.';
    }

    var execStatStudentsEl = document.querySelector('[data-exec-stat-students]');
    var execStatAttendanceEl = document.querySelector('[data-exec-stat-attendance]');
    var execStatGuardiansEl = document.querySelector('[data-exec-stat-guardians]');
    var execStatHifzEl = document.querySelector('[data-exec-stat-hifz]');
    if(execStatStudentsEl) execStatStudentsEl.textContent = data.students.totalActive;
    if(execStatAttendanceEl) execStatAttendanceEl.textContent = data.attendance.averagePercent != null ? data.attendance.averagePercent + '%' : '—';
    if(execStatGuardiansEl) execStatGuardiansEl.textContent = data.guardians.total;
    if(execStatHifzEl) execStatHifzEl.textContent = data.hifz.enrolledCount;

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

    var hifzDonutEl = document.querySelector('[data-founder-hifz-donut]');
    if(hifzDonutEl){
      var totalPossibleJuz = data.hifz.enrolledCount * 30;
      if(totalPossibleJuz > 0){
        var hifzPct = Math.round((data.hifz.juzVerifiedTotal / totalPossibleJuz) * 100);
        hifzDonutEl.innerHTML = '<div class="pfd-infographic-row">'
          + donutChart(hifzPct, "Juz' Verified", 'var(--gold)')
          + '<div class="pfd-infographic-caption"><strong>' + data.hifz.juzVerifiedTotal + ' of ' + totalPossibleJuz + " juz' verified</strong> across " + data.hifz.enrolledCount + ' Hifz-enrolled student(s) school-wide — the theoretical ceiling assumes every enrolled student completes all 30 juz.</div>'
          + '</div>';
      } else {
        hifzDonutEl.innerHTML = '<p class="pfd-note">No Hifz-enrolled students yet.</p>';
      }
    }

    var feeStatsEl = document.querySelector('[data-founder-fee-stats]');
    feeStatsEl.innerHTML = '';
    feeStatsEl.appendChild(statTile('Total due (latest term on file)', formatCurrency(data.fees.totalDue)));
    feeStatsEl.appendChild(statTile('Total paid', formatCurrency(data.fees.totalPaid)));
    feeStatsEl.appendChild(statTile('Outstanding', formatCurrency(data.fees.totalOutstanding)));
    document.querySelector('[data-founder-fee-note]').textContent = data.fees.note;

    if(data.finance){
      var financeStatsEl = document.querySelector('[data-founder-finance-stats]');
      financeStatsEl.innerHTML = '';
      financeStatsEl.appendChild(statTile('Total Invoiced', formatCurrency(data.finance.totalInvoiced)));
      financeStatsEl.appendChild(statTile('Total Collected', formatCurrency(data.finance.totalCollected)));
      financeStatsEl.appendChild(statTile('Collection Rate', data.finance.collectionRatePercent != null ? data.finance.collectionRatePercent + '%' : '—'));
      financeStatsEl.appendChild(statTile('Scholarship Exposure', formatCurrency(data.finance.scholarshipExposure)));

      var funnelEl = document.querySelector('[data-founder-collection-funnel]');
      if(funnelEl){
        funnelEl.innerHTML = data.finance.totalInvoiced > 0
          ? collectionFunnel(data.finance.totalInvoiced, data.finance.totalCollected, data.finance.collectionRatePercent)
          : '<p class="pfd-note">No invoices issued yet.</p>';
      }

      var revenueChartEl = document.querySelector('[data-founder-revenue-chart]');
      if(revenueChartEl){
        revenueChartEl.innerHTML = data.finance.revenueByMonth && data.finance.revenueByMonth.length
          ? revenueBarChart(data.finance.revenueByMonth)
          : '<p class="pfd-note">No recorded payments in the last 6 months yet.</p>';
      }

      var revInstBarsEl = document.querySelector('[data-founder-revenue-institution-bars]');
      if(revInstBarsEl){
        revInstBarsEl.innerHTML = '';
        var maxRevInst = Math.max.apply(null, (data.finance.revenueByInstitution || []).map(function(i){ return i.total; }).concat([1]));
        (data.finance.revenueByInstitution || []).forEach(function(i){
          revInstBarsEl.appendChild(moneyBar(i.institution, i.total, maxRevInst));
        });
        if(!(data.finance.revenueByInstitution || []).length){
          revInstBarsEl.appendChild(el('p', 'pfd-note', 'No recorded payments yet.'));
        }
      }

      var outInstBarsEl = document.querySelector('[data-founder-outstanding-institution-bars]');
      if(outInstBarsEl){
        outInstBarsEl.innerHTML = '';
        var maxOutInst = Math.max.apply(null, (data.finance.outstandingByInstitution || []).map(function(i){ return i.outstanding; }).concat([1]));
        (data.finance.outstandingByInstitution || []).forEach(function(i){
          outInstBarsEl.appendChild(moneyBar(i.institution, i.outstanding, maxOutInst));
        });
        if(!(data.finance.outstandingByInstitution || []).length){
          outInstBarsEl.appendChild(el('p', 'pfd-note', 'No outstanding invoices — every issued invoice on file is fully paid or none exist yet.'));
        }
      }

      var financeNoteEl = document.querySelector('[data-founder-finance-note]');
      if(financeNoteEl) financeNoteEl.textContent = data.finance.note;
    }

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
      var headers = { 'accept': 'application/json' };
      if(token) headers['x-founder-token'] = token;
      var res = await fetch('/api/portal/founder/dashboard', { headers: headers, credentials: 'same-origin' });
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
      gateEl.hidden = true;
      render(data);
    }catch(err){
      gateError.textContent = 'Could not reach the portal — please check your connection and try again.';
      gateError.classList.add('is-visible');
      gateSubmit.disabled = false;
      gateSubmit.textContent = 'View Dashboard';
    }
  }

  // Executive Identity migration: if this browser already holds a
  // signed-in shr_staff_session cookie for a real EXE-role staff
  // account, the dashboard should load directly — no token gate at
  // all. This silent attempt sends no x-founder-token header; a 403
  // here just means "no staff session, or not EXE" and falls through
  // to the existing token-gate flow untouched.
  (async function tryStaffSession(){
    try{
      var res = await fetch('/api/portal/founder/dashboard', { headers: { 'accept': 'application/json' }, credentials: 'same-origin' });
      if(res.ok){
        var data = await res.json();
        gateEl.hidden = true;
        render(data);
      }
    }catch(err){
      // silent — falls through to the token-gate flow below
    }
  })();

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
