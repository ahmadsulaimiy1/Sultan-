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

  var PREFERS_REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animated count-up: parses a leading/trailing non-numeric prefix and
  // suffix (₦, %, "due", etc.) off the real final value and counts up
  // to it — the number itself is never invented, only its reveal is
  // animated. Falls back to setting the text immediately if the value
  // isn't numeric-shaped or the user has asked for reduced motion.
  function animateValue(target, finalText, duration){
    var m = /^(\D*)([\d,]+)(\D*)$/.exec(String(finalText));
    if(!m || PREFERS_REDUCED_MOTION){
      target.textContent = finalText;
      return;
    }
    var prefix = m[1], suffix = m[3];
    var end = parseInt(m[2].replace(/,/g, ''), 10);
    if(!isFinite(end)){ target.textContent = finalText; return; }
    var start = null, dur = duration || 900;
    function step(ts){
      if(start === null) start = ts;
      var progress = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      target.textContent = prefix + Math.round(end * eased).toLocaleString('en-NG') + suffix;
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function statTile(label, value){
    var tile = el('div', 'portal-stat');
    tile.appendChild(el('div', 'label', label));
    var valueEl = el('div', 'value', '');
    tile.appendChild(valueEl);
    animateValue(valueEl, value);
    return tile;
  }

  // Same tile, with an optional real sparkline + trend-arrow appended —
  // used only where a real short history exists behind the figure.
  function statTileRich(label, value, sparkHtml, trendHtml){
    var tile = el('div', 'portal-stat');
    tile.appendChild(el('div', 'label', label));
    var valueEl = el('div', 'value', '');
    tile.appendChild(valueEl);
    animateValue(valueEl, value);
    if(sparkHtml || trendHtml){
      var extra = el('div', null, '');
      extra.innerHTML = (sparkHtml || '') + (trendHtml || '');
      tile.appendChild(extra);
    }
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
  // this is hand-rolled on a single gold hue (a time series gets one
  // colour, not a categorical rainbow — see the loop below), with
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

    var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="Revenue by month, last ' + rows.length + ' months, average ' + formatCurrencyShort(avg) + '">'
      + '<defs><linearGradient id="pfd-revenue-area" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="var(--oxford-navy)" stop-opacity="0.22"></stop>'
      + '<stop offset="100%" stop-color="var(--oxford-navy)" stop-opacity="0"></stop>'
      + '</linearGradient></defs>';

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

    // First pass: compute bar-top coordinates only, so the gradient area
    // fill can be drawn UNDER the bars (correct paint order) rather than
    // as a translucent overlay on top of them.
    var points = [];
    rows.forEach(function(r, i){
      var barHeight = axisMax > 0 ? ((r.total || 0) / axisMax) * innerH : 0;
      var x = padding.left + i * (barWidth + barGap);
      var y = baseY - barHeight;
      points.push((x + barWidth / 2) + ',' + y);
    });

    // Gradient area fill beneath the trend line — the "smooth curve,
    // gradient overlay" treatment financial terminals use so the trend
    // reads as a continuous movement, not just a dotted connector.
    // Painted before the bars so the bars sit on top of it, not under
    // a translucent wash.
    if(points.length > 1){
      var firstXY = points[0].split(',');
      var lastXY = points[points.length - 1].split(',');
      var areaPath = firstXY[0] + ',' + baseY + ' ' + points.join(' ') + ' ' + lastXY[0] + ',' + baseY;
      svg += '<polygon points="' + areaPath + '" fill="url(#pfd-revenue-area)"></polygon>';
    }

    // Second pass: bars, value labels, month labels. A single time-series
    // metric (revenue over time) gets ONE hue, not a categorical rainbow —
    // CHART_COLORS is for genuinely categorical breakdowns (by institution,
    // by stage) elsewhere on this page. The most recent month is the one
    // moment worth calling out, so it alone gets the brighter tone; every
    // earlier month is the same muted gold.
    rows.forEach(function(r, i){
      var barHeight = axisMax > 0 ? ((r.total || 0) / axisMax) * innerH : 0;
      var x = padding.left + i * (barWidth + barGap);
      var y = baseY - barHeight;
      var cx = x + barWidth / 2;
      var parts = String(r.month).split('-');
      var label = MONTH_NAMES[Number(parts[1]) - 1] || r.month;
      var isLatest = i === rows.length - 1;
      var barFill = isLatest ? 'var(--gold-bright)' : 'var(--gold)';
      var barOpacity = isLatest ? '1' : '0.7';
      svg += '<rect x="' + x + '" y="' + y + '" width="' + Math.max(barWidth, 1) + '" height="' + Math.max(barHeight, 1) + '" fill="' + barFill + '" opacity="' + barOpacity + '" rx="4"><title>' + label + ': ' + formatCurrency(r.total || 0) + '</title></rect>';
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

  // Semi-circular financial-health gauge — a second read on the same
  // collection-rate figure the funnel above already shows, in the
  // register the directive asked for ("financial health gauges").
  // Colour bands mirror the onboarding wizard's existing poor/basic/
  // good/excellent convention (same tokens, same thresholds) rather
  // than inventing a new colour language for "financial health."
  function collectionGauge(percent){
    var size = 200, cx = size / 2, cy = size / 2 + 6, r = 78, stroke = 16;
    var pct = Math.max(0, Math.min(100, percent == null ? 0 : percent));
    var band = pct >= 86 ? { color: 'var(--forest-green)', label: 'Excellent' }
      : pct >= 61 ? { color: 'var(--gold)', label: 'Good' }
      : pct >= 31 ? { color: 'var(--terracotta)', label: 'Basic' }
      : { color: 'var(--crimson)', label: 'Needs Attention' };
    // Semi-circle from 180deg to 0deg (left to right along the top half)
    var circumference = Math.PI * r;
    var offset = circumference * (1 - pct / 100);
    var startX = cx - r, endX = cx + r;
    return '<svg viewBox="0 0 ' + size + ' ' + (size / 2 + 30) + '" width="200" height="' + (size / 2 + 30) + '" role="img" aria-label="Collection rate: ' + pct + '%, ' + band.label + '">'
      + '<path d="M ' + startX + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + endX + ' ' + cy + '" fill="none" stroke="var(--line)" stroke-width="' + stroke + '" stroke-linecap="round"></path>'
      + '<path d="M ' + startX + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + endX + ' ' + cy + '" fill="none" stroke="' + band.color + '" stroke-width="' + stroke + '" stroke-linecap="round" '
      + 'stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"><title>' + band.label + ': ' + pct + '%</title></path>'
      + '<text x="' + cx + '" y="' + (cy - 8) + '" text-anchor="middle" font-size="30" font-weight="700" fill="var(--navy)" font-family="Cinzel, Amiri, serif">' + pct + '%</text>'
      + '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="11" letter-spacing="0.04em" fill="' + band.color + '" font-weight="600">' + band.label.toUpperCase() + '</text>'
      + '</svg>';
  }

  // Tiny inline sparkline for KPI tiles that have a real short history
  // behind them (e.g. 6 months of revenueByMonth) — deliberately not
  // used on single-snapshot figures (attendance %, Hifz counts) since
  // this codebase has no time-series storage for those yet.
  function sparkline(values, color){
    var w = 90, h = 28, pad = 3;
    var max = Math.max.apply(null, values.concat([0.0001]));
    var min = Math.min.apply(null, values.concat([0]));
    var range = (max - min) || 1;
    var stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
    var pts = values.map(function(v, i){
      var x = pad + i * stepX;
      var y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    var lastXY = pts[pts.length - 1].split(',');
    return '<svg class="exec-stat-spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">'
      + '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"></polyline>'
      + '<circle cx="' + lastXY[0] + '" cy="' + lastXY[1] + '" r="2.2" fill="' + color + '"></circle>'
      + '</svg>';
  }

  // Trend-arrow markup (up/down/flat), built from a real two-point
  // comparison — the caller supplies the current and previous real
  // values; this never infers a direction from a single snapshot.
  function trendArrow(current, previous, formatFn){
    if(previous == null || current == null || previous === 0) return '';
    var deltaPct = ((current - previous) / Math.abs(previous)) * 100;
    var dir = deltaPct > 1 ? 'up' : deltaPct < -1 ? 'down' : 'flat';
    var arrow = dir === 'up' ? 'M4 11 L9 5 L14 11 M9 5 V16'
      : dir === 'down' ? 'M4 6 L9 12 L14 6 M9 12 V1'
      : 'M3 9 H15';
    var text = dir === 'flat' ? 'Flat vs last month' : (deltaPct > 0 ? '+' : '') + deltaPct.toFixed(1) + '% vs last month';
    return '<span class="exec-stat-trend is-' + dir + '"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="' + arrow + '"></path></svg>' + text + '</span>';
  }

  // Executive Overview — nine real tiles, per the Founder Command
  // Centre directive's exact structure. Any percentage the API
  // couldn't compute yet (too little underlying data) renders as
  // "—", never a fabricated placeholder number.
  function pct(v){ return v == null ? '—' : v + '%'; }
  function renderOverview(overview){
    var el2 = document.querySelector('[data-founder-overview-stats]');
    if(!el2 || !overview) return;
    var tiles = [
      ['Total Students', overview.totalStudents],
      ['Total Staff', overview.totalStaff],
      ['Total Guardians', overview.totalGuardians],
      ['Total Active Classes', overview.totalActiveClasses],
      ['Total Outstanding Fees', formatCurrency(overview.totalOutstandingFees)],
      ['Attendance Health', pct(overview.attendanceHealthPercent)],
      ['Academic Health', pct(overview.academicHealthPercent)],
      ['Governance Health', pct(overview.governanceHealthPercent)],
      ['Institutional Health Score', overview.institutionalHealthScore != null ? overview.institutionalHealthScore + '/100' : '—'],
    ];
    el2.innerHTML = '';
    tiles.forEach(function(t){
      var tile = el('div', 'exec-stat');
      tile.appendChild(el('div', 'exec-stat-label', t[0]));
      var v = el('div', 'exec-stat-value', '');
      v.textContent = t[1];
      tile.appendChild(v);
      el2.appendChild(tile);
    });
  }

  // Four Schools Overview — one intelligence card per institution, each
  // real: active students, staff, attendance rate, fee collection rate.
  var SCHOOL_ACCENTS = ['var(--gold)', 'var(--forest-green)', 'var(--oxford-navy)', 'var(--terracotta)'];
  function renderSchools(schools){
    var el2 = document.querySelector('[data-founder-schools]');
    if(!el2 || !schools) return;
    el2.innerHTML = '';
    schools.forEach(function(s, i){
      var card = el('div', 'pfd-school-card');
      card.style.setProperty('--school-accent', SCHOOL_ACCENTS[i % SCHOOL_ACCENTS.length]);
      card.appendChild(el('h3', 'pfd-school-name', s.displayName));
      var metrics = el('div', 'pfd-school-metrics');
      [
        ['Active Students', s.activeStudents],
        ['Staff', s.staff],
        ['Attendance', pct(s.attendancePercent)],
        ['Collection Rate', pct(s.collectionRatePercent)],
      ].forEach(function(m){
        var box = el('div', 'pfd-school-metric');
        var v = el('div', 'value', ''); v.textContent = m[1];
        box.appendChild(v);
        box.appendChild(el('div', 'label', m[0]));
        metrics.appendChild(box);
      });
      card.appendChild(metrics);
      el2.appendChild(card);
    });
  }

  // Executive Alerts Centre — every item the directive named, each with
  // a real count where the underlying data exists, and an honest "not
  // yet tracked" note where it doesn't (Staff Matters, System
  // Notifications) rather than a fabricated zero implying nothing is
  // wrong.
  function alertRow(label, count, detail, note){
    var row = el('div', 'pfd-alert-row' + (count > 0 ? ' has-attention' : count === null ? ' is-quiet' : ''));
    var left = el('div');
    left.appendChild(el('div', 'pfd-alert-label', label));
    if(detail) left.appendChild(el('div', 'pfd-alert-detail', detail));
    else if(note) left.appendChild(el('div', 'pfd-alert-detail', note));
    row.appendChild(left);
    row.appendChild(el('div', 'pfd-alert-count', count === null ? 'Not tracked' : String(count)));
    return row;
  }
  function renderAlerts(alerts){
    var el2 = document.querySelector('[data-founder-alerts]');
    if(!el2 || !alerts) return;
    el2.innerHTML = '';
    el2.appendChild(alertRow('Admissions Requiring Approval', alerts.admissionsPending, 'Applications submitted or under review.'));
    el2.appendChild(alertRow('Outstanding Fees', alerts.outstandingInvoices,
      alerts.outstandingInvoices > 0 ? formatCurrency(alerts.outstandingFeesTotal) + ' across all unpaid/partial invoices.' : 'No unpaid or partial invoices on file.'));
    el2.appendChild(alertRow('Governance Deadlines', alerts.governanceMeetingsNext30Days,
      alerts.nextGovernanceMeetingDate ? 'Next scheduled meeting: ' + new Date(alerts.nextGovernanceMeetingDate).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) + '.' : 'No governance meetings scheduled in the next 30 days.'));
    el2.appendChild(alertRow('Staff Matters', null, null, alerts.staffMattersNote));
    el2.appendChild(alertRow('Attendance Concerns', alerts.attendanceConcerns, alerts.attendanceConcernsThreshold));
    el2.appendChild(alertRow('Academic Concerns', alerts.academicConcerns, alerts.academicConcernsThreshold));
    el2.appendChild(alertRow('System Notifications', null, null, alerts.systemNotificationsNote));
  }

  // Strategic Progress Centre — Vision 2035 framework, explicitly
  // labelled as not-yet-adopted (same honest pattern as office
  // Strategic Priorities/Annual Objectives templates).
  var STRATEGIC_ITEMS = [
    ['Vision 2035', 'The Board of Trustees has not yet formally adopted a Vision 2035 statement.'],
    ['Strategic Goals', 'No institution-wide strategic goals have been adopted yet.'],
    ['Key Milestones', 'No milestones have been set against an adopted strategy yet.'],
    ['Institutional Projects', 'No formally tracked institutional projects exist yet.'],
  ];
  function renderStrategicProgress(strategicProgress){
    var el2 = document.querySelector('[data-founder-strategic-progress]');
    if(!el2) return;
    var badge = '<span class="template-framework-badge">Framework Only &mdash; Not Yet Adopted</span>';
    var note = strategicProgress && strategicProgress.note ? strategicProgress.note : '';
    var grid = '<div class="pfd-strategic-grid">' + STRATEGIC_ITEMS.map(function(item){
      return '<div class="pfd-strategic-card"><h3>' + item[0] + '</h3><p>' + item[1] + '</p></div>';
    }).join('') + '</div>';
    el2.innerHTML = badge + '<p class="pfd-note" style="margin-top:10px;">' + note + '</p>' + grid;
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
    if(execStatStudentsEl) animateValue(execStatStudentsEl, data.students.totalActive);
    if(execStatAttendanceEl) animateValue(execStatAttendanceEl, data.attendance.averagePercent != null ? data.attendance.averagePercent + '%' : '—');
    if(execStatGuardiansEl) animateValue(execStatGuardiansEl, data.guardians.total);
    if(execStatHifzEl) animateValue(execStatHifzEl, data.hifz.enrolledCount);

    var execStatCollectionEl = document.querySelector('[data-exec-stat-collection]');
    if(execStatCollectionEl){
      animateValue(execStatCollectionEl, (data.finance && data.finance.collectionRatePercent != null) ? data.finance.collectionRatePercent + '%' : '—');
    }

    // Executive narrative line: one sentence, built only from real
    // figures already on this page — "320 Active Learners" the
    // directive's own example of turning a number into a narrative,
    // not a separately-authored marketing sentence.
    var narrativeEl = document.querySelector('[data-founder-narrative]');
    if(narrativeEl){
      var parts = [data.students.totalActive + ' active learner(s) across the four schools'];
      if(data.hifz.enrolledCount > 0) parts.push(data.hifz.enrolledCount + ' pursuing the Hifz journey');
      if(data.finance && data.finance.totalCollected != null) {
        parts.push(formatCurrency(data.finance.totalCollected) + ' collected against ' + formatCurrency(data.finance.totalInvoiced) + ' invoiced this term');
      }
      narrativeEl.textContent = parts.join(', ') + '.';
    }

    // Institutional Health Score — the server-computed composite
    // (functions/api/portal/founder/dashboard.js: overview.
    // institutionalHealthScore), banded at the same Excellent/Strong/
    // Developing/Attention thresholds as the onboarding wizard's
    // completion bands. Hidden entirely if no real input exists yet,
    // rather than showing a fabricated score.
    var healthEl = document.querySelector('[data-founder-health]');
    var healthLabelEl = document.querySelector('[data-founder-health-label]');
    if(healthEl && healthLabelEl){
      var overview = data.overview || {};
      if(overview.institutionalHealthScore != null){
        var healthScore = overview.institutionalHealthScore;
        var band = healthScore >= 85 ? { cls: 'is-excellent', label: 'Excellent' }
          : healthScore >= 70 ? { cls: 'is-strong', label: 'Strong' }
          : healthScore >= 50 ? { cls: 'is-developing', label: 'Developing' }
          : { cls: 'is-attention', label: 'Needs Attention' };
        healthEl.hidden = false;
        healthEl.className = 'exec-welcome-health ' + band.cls;
        healthLabelEl.textContent = 'Institutional Health: ' + band.label + ' (' + healthScore + '/100 — attendance, fee collection, governance fill)';
      } else {
        healthEl.hidden = true;
      }
    }

    renderOverview(data.overview);
    renderSchools(data.schools);
    renderAlerts(data.alerts);
    renderStrategicProgress(data.strategicProgress);

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
      // Sparkline + real trend arrow only on the one figure that
      // actually has a real per-month series behind it: revenueByMonth
      // tracks payments collected each month, not amounts invoiced each
      // month, so "Total Invoiced" (a running total with no monthly
      // breakdown in this schema) stays a plain tile rather than
      // borrowing a history that belongs to a different figure.
      financeStatsEl.appendChild(statTile('Total Invoiced', formatCurrency(data.finance.totalInvoiced)));
      var months = (data.finance.revenueByMonth || []);
      var lastMonth = months.length ? months[months.length - 1].total : null;
      var prevMonth = months.length > 1 ? months[months.length - 2].total : null;
      if(months.length > 1){
        var values = months.map(function(m){ return m.total || 0; });
        financeStatsEl.appendChild(statTileRich('Total Collected (this month)', formatCurrency(lastMonth),
          sparkline(values, 'var(--gold)'), trendArrow(lastMonth, prevMonth)));
      } else {
        financeStatsEl.appendChild(statTile('Total Collected', formatCurrency(data.finance.totalCollected)));
      }
      financeStatsEl.appendChild(statTile('Collection Rate', data.finance.collectionRatePercent != null ? data.finance.collectionRatePercent + '%' : '—'));
      financeStatsEl.appendChild(statTile('Scholarship Exposure', formatCurrency(data.finance.scholarshipExposure)));

      var funnelEl = document.querySelector('[data-founder-collection-funnel]');
      if(funnelEl){
        funnelEl.innerHTML = data.finance.totalInvoiced > 0
          ? collectionFunnel(data.finance.totalInvoiced, data.finance.totalCollected, data.finance.collectionRatePercent)
          : '<p class="pfd-note">No invoices issued yet.</p>';
      }

      var gaugeEl = document.querySelector('[data-founder-collection-gauge]');
      if(gaugeEl){
        gaugeEl.innerHTML = data.finance.collectionRatePercent != null
          ? '<div class="pfd-gauge-row">' + collectionGauge(data.finance.collectionRatePercent)
            + '<div class="pfd-gauge-caption">A second read on the same collection figure as the funnel above, banded the same way as the onboarding completion score: <strong>86%+ Excellent</strong>, 61–85% Good, 31–60% Basic, below 31% Needs Attention.</div></div>'
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
