(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var helloEl = document.querySelector('[data-portal-hello]');
  var childrenEl = document.querySelector('[data-portal-children]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

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

  function renderChild(child){
    var card = el('div', 'portal-child-card');

    var head = el('div', 'portal-child-head');
    var title = el('h2', null, child.fullName);
    head.appendChild(title);
    var metaParts = [child.admissionNo];
    if(child.institution) metaParts.push(child.institution);
    if(child.className) metaParts.push(child.className);
    head.appendChild(el('div', 'meta', metaParts.join(' · ')));
    if(/^DEMO/i.test(child.admissionNo || '')){
      head.appendChild(el('span', 'portal-demo-flag', 'Sample data — not a real record'));
    }
    card.appendChild(head);

    var stats = el('div', 'portal-stats');

    var attStat = el('div', 'portal-stat');
    attStat.appendChild(el('div', 'label', 'Attendance'));
    if(child.attendance && child.attendance.days_total > 0){
      var pct = Math.round((child.attendance.days_present / child.attendance.days_total) * 100);
      attStat.appendChild(el('div', 'value', pct + '%'));
      attStat.appendChild(el('div', 'label', child.attendance.days_present + ' / ' + child.attendance.days_total + ' days · ' + child.attendance.term));
    } else {
      attStat.appendChild(el('div', 'value', '—'));
      attStat.appendChild(el('div', 'label', 'Not yet recorded'));
    }
    stats.appendChild(attStat);

    var feeStat = el('div', 'portal-stat');
    feeStat.appendChild(el('div', 'label', 'Fee Status'));
    if(child.fees){
      var balance = Number(child.fees.amount_due || 0) - Number(child.fees.amount_paid || 0);
      feeStat.appendChild(el('div', 'value', balance > 0 ? formatCurrency(balance) + ' due' : 'Paid in full'));
      feeStat.appendChild(el('div', 'label', formatCurrency(child.fees.amount_paid) + ' of ' + formatCurrency(child.fees.amount_due) + ' · ' + child.fees.term));
    } else {
      feeStat.appendChild(el('div', 'value', '—'));
      feeStat.appendChild(el('div', 'label', 'Not yet recorded'));
    }
    stats.appendChild(feeStat);

    card.appendChild(stats);

    var resultsWrap = el('div', 'portal-results');
    resultsWrap.appendChild(el('h3', null, 'Latest Term Results'));
    if(child.results && child.results.length){
      var table = document.createElement('table');
      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      ['Term', 'Subject', 'CA', 'Exam', 'Total', 'Comment'].forEach(function(h){
        headRow.appendChild(el('th', null, h));
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      var tbody = document.createElement('tbody');
      child.results.forEach(function(r){
        var row = document.createElement('tr');
        [r.term, r.subject, r.ca_score, r.exam_score, r.total_score, r.teacher_comment || '—'].forEach(function(v){
          row.appendChild(el('td', null, v == null ? '—' : String(v)));
        });
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      var scrollWrap = el('div', 'portal-results-scroll');
      scrollWrap.appendChild(table);
      resultsWrap.appendChild(scrollWrap);
    } else {
      resultsWrap.appendChild(el('p', null, 'No results recorded yet.'));
    }
    card.appendChild(resultsWrap);

    return card;
  }

  async function load(){
    try{
      var res = await fetch('/api/portal/me', { headers: { 'accept': 'application/json' } });
      if(res.status === 401){
        window.location.href = '/portal/login/';
        return;
      }
      var data = await res.json().catch(function(){ return {}; });
      if(!res.ok){
        throw new Error(data.error || 'Could not load your dashboard.');
      }

      helloEl.textContent = 'Welcome, ' + data.fullName;
      childrenEl.innerHTML = '';
      if(data.children && data.children.length){
        data.children.forEach(function(child){ childrenEl.appendChild(renderChild(child)); });
      } else {
        childrenEl.appendChild(el('div', 'portal-empty', 'No children are linked to your account yet. Contact the school office if this seems wrong.'));
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
    try{ await fetch('/api/portal/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/login/';
  });

  load();
})();
