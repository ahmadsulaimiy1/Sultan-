// Institutional Onboarding Wizard — shared across /portal/profile/ (full
// staged wizard) and /portal/dashboard/ (colour-banded progress +
// checklist only). Feature-detects which pieces of the DOM are present
// rather than assuming both; each page includes this one script tag.
//
// Design note: this is a presentation/navigation layer only. Every
// existing form on /portal/profile/ keeps its own independent save
// button and POSTs to the same endpoints as before — the wizard adds
// staged visibility, a step rail, and colour-banded completion on top,
// it does not change how or where data is saved. See
// docs/onboarding-experience.md.
(function () {
  var BANDS = [
    { max: 30, key: 'poor', label: 'Registration Started' },
    { max: 60, key: 'basic', label: 'Profile Building' },
    { max: 85, key: 'good', label: 'Verification Pending' },
    { max: 100, key: 'excellent', label: 'Institutionally Verified' },
  ];

  function completionBand(pct) {
    for (var i = 0; i < BANDS.length; i++) {
      if (pct <= BANDS[i].max) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  function applyBandClass(el, pct) {
    if (!el) return;
    var band = completionBand(pct);
    BANDS.forEach(function (b) { el.classList.remove('band-' + b.key); });
    el.classList.add('band-' + band.key);
    return band;
  }

  // Exposed globally so portal-dashboard.js (a different page, loaded
  // independently) can colour-band its own progress bar/badge without
  // duplicating the threshold logic.
  window.SHRSOnboarding = { completionBand: completionBand, applyBandClass: applyBandClass };

  // ---- Confetti: hand-rolled, no external library -----------------
  function fireConfetti(container) {
    var colors = ['#C6A15B', '#E9CE8A', '#3B2A1D', '#F1E4C8', '#7C1F2E'];
    var pieceCount = 60;
    for (var i = 0; i < pieceCount; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      piece.style.animationDuration = (2.2 + Math.random() * 1.2) + 's';
      piece.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
      container.appendChild(piece);
    }
    // Clean up after the animation settles so a long-open tab doesn't
    // accumulate DOM nodes.
    setTimeout(function () {
      container.querySelectorAll('.confetti-piece').forEach(function (p) { p.remove(); });
    }, 4200);
  }

  function showCelebration(profile) {
    var overlay = document.querySelector('[data-wizard-celebration]');
    if (!overlay) return;
    var nameEl = overlay.querySelector('[data-wizard-celebration-name]');
    if (nameEl) nameEl.textContent = profile.preferredName || profile.fullName || '';
    overlay.hidden = false;
    fireConfetti(overlay.querySelector('[data-wizard-confetti-field]') || overlay);
    fetch('/api/portal/onboarding-celebration', { method: 'POST' }).catch(function () {});
    var closeBtn = overlay.querySelector('[data-wizard-celebration-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { window.location.href = '/portal/dashboard/'; }, { once: true });
    }
  }

  var IDENTITY_TYPE_LABELS = {
    parent_guardian: 'Parent / Guardian', applicant: 'Applicant', sponsor: 'Sponsor',
    alumni: 'Alumni', educational_partner: 'Educational Partner', staff_member: 'Staff Member (legacy)',
  };

  function renderIdentitySummary(profile) {
    var nameEl = document.querySelector('[data-wizard-identity-name]');
    var typeEl = document.querySelector('[data-wizard-identity-type]');
    var emailEl = document.querySelector('[data-wizard-identity-email]');
    var phoneEl = document.querySelector('[data-wizard-identity-phone]');
    if (nameEl) nameEl.textContent = (profile.title ? profile.title + ' ' : '') + (profile.fullName || '—');
    if (typeEl) typeEl.textContent = IDENTITY_TYPE_LABELS[profile.identityType] || profile.identityType || '—';
    if (emailEl) emailEl.textContent = profile.email || '—';
    if (phoneEl) phoneEl.textContent = profile.phone || profile.whatsappNumber || '—';
  }

  // ---- Wizard step navigation (profile page only) ------------------
  function initWizard() {
    var root = document.querySelector('[data-wizard]');
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-wizard-step]'));
    if (!steps.length) return;
    var rail = root.querySelector('[data-wizard-rail]');
    var stepLabelEl = root.querySelector('[data-wizard-step-label]');
    var prevBtn = root.querySelector('[data-wizard-prev]');
    var nextBtn = root.querySelector('[data-wizard-next]');
    var current = 0;

    function renderRail() {
      if (!rail) return;
      rail.innerHTML = '';
      steps.forEach(function (step, i) {
        var circle = document.createElement('button');
        circle.type = 'button';
        circle.className = 'wizard-rail-step' + (i === current ? ' is-active' : '') + (step.dataset.wizardDone === 'true' ? ' is-done' : '');
        circle.innerHTML = '<span class="wizard-rail-circle">' + (step.dataset.wizardDone === 'true' ? '✓' : i + 1) + '</span>' +
          '<span class="wizard-rail-label">' + (step.getAttribute('data-wizard-label') || ('Step ' + (i + 1))) + '</span>';
        circle.addEventListener('click', function () { goTo(i); });
        rail.appendChild(circle);
      });
    }

    function render() {
      steps.forEach(function (step, i) { step.hidden = i !== current; });
      if (stepLabelEl) stepLabelEl.textContent = 'Step ' + (current + 1) + ' of ' + steps.length;
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.textContent = current === steps.length - 1 ? 'Finish' : 'Next →';
      renderRail();
      steps[current].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function goTo(i) {
      current = Math.max(0, Math.min(steps.length - 1, i));
      render();
    }

    if (rail) rail.addEventListener('shrs:refresh', render);
    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (current === steps.length - 1) {
        window.location.href = '/portal/dashboard/';
        return;
      }
      goTo(current + 1);
    });

    render();
  }

  // ---- Communication Preferences step (profile page only) ----------
  function initCommunicationPreferences() {
    var form = document.querySelector('[data-wizard-comm-form]');
    if (!form) return;
    var resultEl = document.querySelector('[data-wizard-comm-result]');

    function setValues(prefs) {
      Array.prototype.forEach.call(form.elements, function (field) {
        if (!field.name) return;
        if (field.type === 'checkbox') field.checked = !!prefs[field.name];
        else if (field.name === 'language') field.value = prefs.language || 'en';
      });
    }

    fetch('/api/portal/notifications/preferences')
      .then(function (res) { return res.json(); })
      .then(function (data) { if (data && data.preferences) setValues(data.preferences); })
      .catch(function () {});

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      var payload = {};
      Array.prototype.forEach.call(form.elements, function (field) {
        if (!field.name) return;
        payload[field.name] = field.type === 'checkbox' ? field.checked : field.value;
      });
      fetch('/api/portal/notifications/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (resultEl) {
            resultEl.textContent = data && data.ok ? 'Saved' : (data && data.error) || 'Could not save.';
            resultEl.className = 'profile-form-result ' + (data && data.ok ? 'is-ok' : 'is-error');
          }
        })
        .catch(function () {
          if (resultEl) { resultEl.textContent = 'Could not save.'; resultEl.className = 'profile-form-result is-error'; }
        })
        .finally(function () { submitBtn.disabled = false; });
    });
  }

  // ---- Security & Trust step (read-only status, profile page) ------
  function renderSecurityStatus(profile) {
    var emailEl = document.querySelector('[data-wizard-security-email]');
    var trustEl = document.querySelector('[data-wizard-security-trust]');
    if (emailEl) {
      emailEl.textContent = profile.emailVerified ? 'Verified' : 'Not yet verified';
      emailEl.className = 'value ' + (profile.emailVerified ? 'is-good' : 'is-pending');
    }
    if (trustEl) {
      trustEl.textContent = profile.trustedDeviceCapable ? 'Available on this account' : 'Not yet available';
      trustEl.className = 'value ' + (profile.trustedDeviceCapable ? 'is-good' : 'is-pending');
    }
  }

  // Called by js/portal-profile.js once it has fetched /api/portal/profile,
  // so this file never duplicates that fetch — one source of truth.
  window.SHRSOnboarding.onProfileData = function (profile) {
    var pctBadge = document.querySelector('[data-wizard-pct-badge]');
    var pctLabelEl = document.querySelector('[data-wizard-pct-label]');
    var fillEl = document.querySelector('[data-profile-progress-fill]');
    var band = applyBandClass(fillEl, profile.profileCompletionPct);
    if (pctBadge) { pctBadge.textContent = profile.profileCompletionPct + '%'; applyBandClass(pctBadge, profile.profileCompletionPct); }
    if (pctLabelEl && band) pctLabelEl.textContent = band.label;

    // Mark rail steps done/not-done from the sections the backend
    // already computes — no separate completion logic duplicated here.
    var sectionMap = {
      identity: true, // always "done" — created at registration
      personal: profile.sections && profile.sections.personal,
      contact: profile.sections && profile.sections.contact,
      residential: profile.sections && profile.sections.residential,
      professional: profile.sections && profile.sections.professional,
      family: profile.sections && profile.sections.family,
      emergencyContacts: profile.sections && profile.sections.emergencyContacts,
      educationalInterests: profile.sections && profile.sections.educationalInterests,
    };
    document.querySelectorAll('[data-wizard-step]').forEach(function (step) {
      var key = step.getAttribute('data-wizard-key');
      if (key && sectionMap[key]) step.dataset.wizardDone = 'true';
      else step.dataset.wizardDone = 'false';
    });
    var rail = document.querySelector('[data-wizard-rail]');
    if (rail) rail.dispatchEvent(new Event('shrs:refresh'));

    renderSecurityStatus(profile);
    renderIdentitySummary(profile);

    if (profile.profileCompletionPct >= 100 && !profile.onboardingCelebrationShown) {
      showCelebration(profile);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    initWizard();
    initCommunicationPreferences();
  });
})();
