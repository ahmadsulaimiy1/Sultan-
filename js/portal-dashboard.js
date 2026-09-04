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
  var verifyBanner = document.querySelector('[data-portal-verify-banner]');
  var resendVerifyBtn = document.querySelector('[data-portal-resend-verify]');
  var verifyGateEl = document.querySelector('[data-portal-verify-gate]');
  var resendVerifyGateBtn = document.querySelector('[data-portal-resend-verify-gate]');
  var applicationsListEl = document.querySelector('[data-portal-applications-list]');
  var welcomePctLabelEl = document.querySelector('[data-welcome-pct-label]');
  var welcomeProgressFillEl = document.querySelector('[data-welcome-progress-fill]');
  var welcomeIdentityStatusEl = document.querySelector('[data-welcome-identity-status]');
  var welcomeEmailStatusEl = document.querySelector('[data-welcome-email-status]');
  var welcomeMobileStatusEl = document.querySelector('[data-welcome-mobile-status]');
  var welcomeInterestsStatusEl = document.querySelector('[data-welcome-interests-status]');
  var welcomeContactsStatusEl = document.querySelector('[data-welcome-contacts-status]');
  var welcomeNextStepEl = document.querySelector('[data-welcome-next-step]');
  var execStatCompletionEl = document.querySelector('[data-exec-stat-completion]');
  var execStatChildrenEl = document.querySelector('[data-exec-stat-children]');
  var execStatNotificationsEl = document.querySelector('[data-exec-stat-notifications]');
  var execStatApplicationsEl = document.querySelector('[data-exec-stat-applications]');
  var checklistEl = document.querySelector('[data-dashboard-checklist]');
  var checklistListEl = document.querySelector('[data-dashboard-checklist-list]');

  var CHECKLIST_ITEMS = [
    { key: 'emailVerified', label: 'Verify your email address', check: function(d){ return !!d.emailVerified; } },
    { key: 'emergencyContacts', label: 'Add your emergency contacts', check: function(d){ return !!d.sections.emergencyContacts; } },
    { key: 'educationalInterests', label: 'Select your educational interests', check: function(d){ return !!d.sections.educationalInterests; } },
    { key: 'personal', label: 'Complete your personal profile', check: function(d){ return !!d.sections.personal; } },
  ];

  function renderChecklist(data){
    if(!checklistEl || !checklistListEl) return;
    checklistListEl.innerHTML = '';
    var pending = CHECKLIST_ITEMS.filter(function(item){ return !item.check(data); });
    if(!pending.length){
      checklistEl.hidden = true;
      return;
    }
    pending.forEach(function(item){
      var li = document.createElement('li');
      var lock = document.createElement('span');
      lock.className = 'lock-icon';
      lock.setAttribute('aria-hidden', 'true');
      lock.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" width="14" height="14"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
      li.appendChild(lock);
      li.appendChild(document.createTextNode(item.label));
      var link = document.createElement('a');
      link.href = '/portal/profile/';
      link.textContent = 'Complete →';
      li.appendChild(link);
      checklistListEl.appendChild(li);
    });
    checklistEl.hidden = false;
  }

  function renderWelcomePanel(data){
    welcomePctLabelEl.textContent = data.profileCompletionPct + '% complete';
    welcomeProgressFillEl.style.width = data.profileCompletionPct + '%';
    if(window.SHRSOnboarding) window.SHRSOnboarding.applyBandClass(welcomeProgressFillEl, data.profileCompletionPct);
    // Identity (KYC/biometric) verification does not exist yet — this is
    // an honest "Pending" state, not a fabricated pass, per the Phase 1A
    // decision to gate real KYC at admission confirmation, not sign-up.
    welcomeIdentityStatusEl.textContent = 'Pending';
    welcomeEmailStatusEl.textContent = data.emailVerified ? 'Verified' : 'Not Verified';
    // No SMS/WhatsApp OTP provider is wired up yet — mobile_verified_at
    // can never be set today, so this says so rather than showing a
    // silent "Not Verified" that implies the feature exists and failed.
    welcomeMobileStatusEl.textContent = 'Not Yet Available';
    welcomeInterestsStatusEl.textContent = data.sections.educationalInterests ? 'Completed' : 'Not Selected';
    welcomeContactsStatusEl.textContent = data.sections.emergencyContacts ? 'Completed' : 'Missing';
    welcomeNextStepEl.textContent = data.recommendedNextStep;

    if(execStatCompletionEl) execStatCompletionEl.textContent = data.profileCompletionPct + '%';
    if(execStatChildrenEl) execStatChildrenEl.textContent = data.existingChildrenCount || 0;
    if(execStatNotificationsEl) execStatNotificationsEl.textContent = (data.notifications || []).length;

    renderChecklist(data);
  }

  var APPLICATION_STATUS_LABEL = {
    submitted: 'Submitted', under_review: 'Under Review', waitlisted: 'Waitlisted',
    offered: 'Offer Made', admitted: 'Admitted', declined: 'Not Successful', withdrawn: 'Withdrawn',
  };

  function formatDate(iso){
    if(!iso) return '';
    try{ return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch(e){ return iso; }
  }

  function renderApplications(applications){
    if(execStatApplicationsEl) execStatApplicationsEl.textContent = (applications || []).length;
    applicationsListEl.innerHTML = '';
    if(!applications || !applications.length){
      applicationsListEl.appendChild(el('p', 'portal-empty', 'No enquiries or applications submitted yet — once you apply, you can track its progress here.'));
      return;
    }
    applications.forEach(function(app){
      var card = el('div', 'portal-application-card');
      card.appendChild(el('h4', null, app.applicantChildName));
      var metaBits = [];
      if(app.institution) metaBits.push(app.institution);
      if(app.desiredClass) metaBits.push(app.desiredClass);
      metaBits.push('Submitted ' + formatDate(app.submittedAt));
      card.appendChild(el('div', 'portal-application-meta', metaBits.join(' · ')));
      if(app.decisionNote) card.appendChild(el('div', 'portal-application-meta', app.decisionNote));
      card.appendChild(el('span', 'portal-application-status', APPLICATION_STATUS_LABEL[app.status] || app.status));
      applicationsListEl.appendChild(card);
    });
  }

  async function loadApplications(){
    try{
      var res = await fetch('/api/portal/admissions-applications');
      var data = await res.json().catch(function(){ return {}; });
      if(res.ok) renderApplications(data.applications);
    }catch(err){ /* leave empty state */ }
  }

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
    head.appendChild(el('div', 'meta', child.admissionNo));
    if(child.enrolments && child.enrolments.length){
      var programmes = el('div', 'portal-programmes');
      child.enrolments.forEach(function(en){
        var label = [en.institution, en.className].filter(Boolean).join(' · ');
        var chip = el('span', 'portal-programme-chip' + (en.isPrimary ? ' is-primary' : ''), label);
        programmes.appendChild(chip);
      });
      head.appendChild(programmes);
    }
    if(child.status && child.status !== 'active'){
      var statusLabel = child.status.charAt(0).toUpperCase() + child.status.slice(1);
      head.appendChild(el('span', 'portal-status-badge', statusLabel));
    }
    if(child.isSampleData){
      head.appendChild(el('span', 'portal-demo-flag', 'Sample Institutional Record — not a real record'));
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

    // Read-only coursework summary — counts only, no assignment text or
    // grading here; the child's own Student Portal is where they answer
    // and see feedback.
    if(child.assignmentsSummary && (child.assignmentsSummary.upcomingDueCount > 0 || child.assignmentsSummary.recentlyGradedCount > 0)){
      var assignSnap = el('div', 'portal-child-hifz-snapshot');
      if(child.assignmentsSummary.upcomingDueCount > 0){
        assignSnap.appendChild(el('span', 'phs-badge', child.assignmentsSummary.upcomingDueCount + ' assignment' + (child.assignmentsSummary.upcomingDueCount === 1 ? '' : 's') + ' due soon'));
      }
      if(child.assignmentsSummary.recentlyGradedCount > 0){
        assignSnap.appendChild(el('span', null, child.assignmentsSummary.recentlyGradedCount + ' graded in the last 2 weeks'));
      }
      card.appendChild(assignSnap);
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

    if(window.SHRSFinance){
      var financeWrap = el('div', 'portal-finance-wrap');
      window.SHRSFinance.render(financeWrap, child.finance);
      card.appendChild(financeWrap);
    }

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

      // Hard gate: no dashboard content renders until email is
      // verified. Only the account owner's own resend-verification
      // action is available here — see docs/parent-portal.md's
      // "Multi-factor authentication" section for why the account is
      // still signed in at this point (the gate page itself needs a
      // session to call resend-verification and to know who to greet).
      if(!data.emailVerified){
        loadingEl.hidden = true;
        contentEl.hidden = true;
        verifyGateEl.hidden = false;
        var gateMsgEl = document.querySelector('[data-portal-verify-gate-message]');
        if(gateMsgEl && data.email){
          gateMsgEl.textContent = 'A verification code and a verification link have both been sent to ' + data.email + ' — use whichever is easier. Need a new one?';
        }
        return;
      }

      helloEl.textContent = 'Welcome, ' + (data.title ? data.title + ' ' : '') + (data.preferredName || data.fullName);
      renderWelcomePanel(data);
      renderNotifications(data.notifications);

      // The payload is already here, so the intelligence panel listens rather
      // than fetching /me a second time.
      document.dispatchEvent(new CustomEvent('shrs:portal-data', { detail: data }));


      var idCardMount = document.querySelector('[data-id-card-mount]');
      if(idCardMount && window.SHRSIdCard){
        var linkedChildren = (data.children || []).map(function(c){
          return c.fullName + (c.relationship ? ' (' + c.relationship + ')' : '');
        }).join(', ');
        window.SHRSIdCard.render(idCardMount, {
          kind: 'guardian',
          fullName: (data.title ? data.title + ' ' : '') + data.fullName,
          identityNo: data.identityNo,
          roleLabel: 'Parent / Guardian',
          status: data.emailVerified ? 'Verified' : 'Unverified',
          details: [
            { label: 'Linked Children', value: linkedChildren },
          ],
        });
      }
      loadAdhkar();
      loadApplications();
      verifyBanner.hidden = !!data.emailVerified;

      childrenEl.innerHTML = '';
      if(data.children && data.children.length){
        data.children.forEach(function(child){ childrenEl.appendChild(renderChild(child)); });
      } else {
        // .portal-empty's dark ink-soft text needs a light card behind
        // it — bare on this page's dark background it's illegible, the
        // same contrast bug already fixed once for .account-status-banner.
        var emptyCard = el('div', 'portal-child-card');
        emptyCard.appendChild(el('div', 'portal-empty', 'No children are linked to your account yet. If you\'ve just registered, this is expected — submit an admissions enquiry above, or contact the school office once your child is enrolled.'));
        childrenEl.appendChild(emptyCard);
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

  async function resendVerification(btn){
    btn.disabled = true;
    var originalLabel = btn.textContent;
    btn.textContent = 'Sending…';
    try{
      var res = await fetch('/api/portal/resend-verification', { method: 'POST' });
      var data = await res.json().catch(function(){ return {}; });
      if(res.ok && data.verificationSent){
        btn.textContent = 'Sent!';
      } else if(res.ok && data.verificationLink){
        btn.textContent = 'Link ready (see console)';
        console.log('Verification link (email not configured):', data.verificationLink);
      } else {
        btn.textContent = originalLabel;
        btn.disabled = false;
      }
    }catch(err){
      btn.textContent = originalLabel;
      btn.disabled = false;
    }
  }

  resendVerifyBtn.addEventListener('click', function(){ resendVerification(resendVerifyBtn); });
  if(resendVerifyGateBtn){
    resendVerifyGateBtn.addEventListener('click', function(){ resendVerification(resendVerifyGateBtn); });
  }

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
