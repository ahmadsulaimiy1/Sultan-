(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var helloEl = document.querySelector('[data-portal-hello]');
  var childrenEl = document.querySelector('[data-portal-children]');
  var logoutBtn = document.querySelector('[data-portal-logout]');
  var notificationsEl = document.querySelector('[data-portal-notifications]');
  var notificationsListEl = document.querySelector('[data-portal-notifications-list]');
  var notificationsClearBtn = document.querySelector('[data-portal-notifications-clear]');
  var adhkarCardEl = document.querySelector('[data-portal-adhkar]');
  var adhkarStreakEl = document.querySelector('[data-portal-adhkar-streak]');
  var adhkarBtns = document.querySelectorAll('[data-portal-adhkar-btn]');

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
    if(child.status && child.status !== 'active'){
      var statusLabel = child.status.charAt(0).toUpperCase() + child.status.slice(1);
      head.appendChild(el('span', 'portal-status-badge', statusLabel));
    }
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

    if(child.hifz){
      var hifzSnap = el('div', 'portal-child-hifz-snapshot');
      hifzSnap.appendChild(el('span', 'phs-badge', 'Stage ' + child.hifz.stageNumber + ' of 5 — ' + (child.hifz.stageLabel || '')));
      hifzSnap.appendChild(el('span', null, child.hifz.juzVerifiedCount + ' of 30 Juz’ verified'));
      card.appendChild(hifzSnap);
    }

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

  function renderNotifications(notifications){
    notificationsListEl.innerHTML = '';
    if(!notifications || !notifications.length){
      notificationsEl.hidden = true;
      return;
    }
    notifications.forEach(function(n){
      var li = document.createElement('li');
      li.textContent = n.message;
      notificationsListEl.appendChild(li);
    });
    notificationsEl.hidden = false;
  }

  var adhkarWindowsEl = document.querySelector('[data-portal-adhkar-windows]');
  var adhkarAchvEl = document.querySelector('[data-portal-adhkar-achv]');

  function renderAdhkarCard(status){
    if(!adhkarCardEl) return;
    adhkarStreakEl.textContent = status.streak > 0
      ? status.streak + (status.streak === 1 ? ' day' : ' days') + ' streak'
      : 'No streak yet';
    adhkarBtns.forEach(function(btn){
      var period = btn.getAttribute('data-portal-adhkar-btn');
      var done = !!status.today[period];
      var stateEl = btn.querySelector('[data-portal-adhkar-state="' + period + '"]');
      btn.classList.toggle('is-done', done);
      if(stateEl) stateEl.textContent = done ? 'Done today ✓' : 'Mark done';
    });

    if(adhkarWindowsEl && status.windows){
      adhkarWindowsEl.innerHTML = '';
      [['7 Days', status.windows.last7, 7], ['30 Days', status.windows.last30, 30], ['90 Days', status.windows.last90, 90]].forEach(function(w){
        var box = el('div', 'paw-box');
        box.appendChild(el('div', 'paw-value', w[1] + ' / ' + w[2]));
        box.appendChild(el('div', 'paw-label', w[0] + ' active'));
        adhkarWindowsEl.appendChild(box);
      });
    }

    if(adhkarAchvEl && status.achievements){
      adhkarAchvEl.innerHTML = '';
      status.achievements.forEach(function(a){
        var badge = el('div', 'portal-achv-badge' + (a.earned ? ' is-earned' : ''));
        badge.appendChild(el('span', null, a.label.en));
        adhkarAchvEl.appendChild(badge);
      });
    }

    adhkarCardEl.hidden = false;
  }

  async function loadAdhkar(){
    if(!adhkarCardEl) return;
    try{
      var res = await fetch('/api/portal/adhkar', { headers: { 'accept': 'application/json' } });
      if(!res.ok) return; // non-fatal — the rest of the dashboard still works
      var status = await res.json();
      renderAdhkarCard(status);
    }catch(err){
      // non-fatal
    }
  }

  adhkarBtns.forEach(function(btn){
    btn.addEventListener('click', async function(){
      if(btn.classList.contains('is-done') || btn.disabled) return;
      var period = btn.getAttribute('data-portal-adhkar-btn');
      btn.disabled = true;
      try{
        var res = await fetch('/api/portal/adhkar', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ period: period }),
        });
        if(res.ok) await loadAdhkar();
      }catch(err){
        // leave as-is; visitor can retry
      }
      btn.disabled = false;
    });
  });

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
      renderNotifications(data.notifications);
      loadAdhkar();

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

  notificationsClearBtn.addEventListener('click', async function(){
    notificationsClearBtn.disabled = true;
    try{
      await fetch('/api/portal/notifications/read', { method: 'POST' });
      notificationsEl.hidden = true;
      notificationsListEl.innerHTML = '';
    }catch(err){
      // leave the list as-is; user can retry
    }
    notificationsClearBtn.disabled = false;
  });

  load();
})();
