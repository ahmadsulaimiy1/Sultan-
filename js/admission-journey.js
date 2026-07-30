// Interactive Admissions Journey — click/tap-to-expand detail on each of
// the 7 flow stages, an FAQ accordion, and (the real interactive part)
// a live progress indicator for signed-in guardians: if the caller has
// an application on file, fetch its real status from the existing
// guardian-facing admissions API and highlight exactly where they stand
// in the journey — never a simulated or hardcoded position.
(function () {
  'use strict';

  function toggleStage(stage) {
    var isOpen = stage.classList.contains('is-expanded');
    stage.classList.toggle('is-expanded', !isOpen);
    stage.setAttribute('aria-expanded', String(!isOpen));
  }

  function initFlowStages() {
    var flow = document.querySelector('[data-adm-flow]');
    if (!flow) return;
    var stages = flow.querySelectorAll('.flow-stage');
    stages.forEach(function (stage) {
      stage.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') return;
        toggleStage(stage);
      });
      stage.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleStage(stage);
        }
      });
    });
  }

  function initFaq() {
    var list = document.querySelector('[data-faq]');
    if (!list) return;
    list.querySelectorAll('.faq-item').forEach(function (item) {
      var btn = item.querySelector('.faq-question');
      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');
        list.querySelectorAll('.faq-item.is-open').forEach(function (other) {
          if (other !== item) { other.classList.remove('is-open'); other.querySelector('.faq-question').setAttribute('aria-expanded', 'false'); }
        });
        item.classList.toggle('is-open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  }

  // status -> which of the 7 stages the applicant currently stands at.
  var STAGE_BY_STATUS = {
    submitted: 5, under_review: 5, waitlisted: 5,
    offered: 6,
    admitted: 7,
    declined: 5, withdrawn: 5,
  };
  var TERMINAL_STATUSES = { declined: true, withdrawn: true };

  var STATUS_LABEL = {
    submitted: 'submitted and awaiting review', under_review: 'under review', waitlisted: 'waitlisted',
    offered: 'offered a place', admitted: 'admitted and enrolled', declined: 'not offered a place this time', withdrawn: 'withdrawn',
  };

  function applyLiveStatus(app, lang) {
    var flow = document.querySelector('[data-adm-flow]');
    var banner = document.querySelector('[data-adm-progress-banner]');
    if (!flow) return;
    var currentStage = STAGE_BY_STATUS[app.status] || 1;
    var isTerminal = TERMINAL_STATUSES[app.status];
    var isAdmitted = app.status === 'admitted';

    flow.querySelectorAll('.flow-stage').forEach(function (stage) {
      var n = parseInt(stage.getAttribute('data-stage'), 10);
      stage.classList.remove('is-complete', 'is-current', 'is-terminal');
      if (isAdmitted) {
        stage.classList.add('is-complete');
      } else if (n < currentStage) {
        stage.classList.add('is-complete');
      } else if (n === currentStage) {
        stage.classList.add(isTerminal ? 'is-terminal' : 'is-current');
      }
    });

    if (banner) {
      var label = STATUS_LABEL[app.status] || app.status;
      var name = app.applicantChildName ? app.applicantChildName + '’s' : 'Your';
      var text = lang === 'ar'
        ? ('طلب ' + (app.applicantChildName || 'ابنكم') + ' حالياً: ' + label + '.')
        : (name + ' application is currently: ' + label + '.');
      banner.textContent = text;
      banner.classList.add('is-visible');
    }
  }

  async function loadLiveStatus() {
    try {
      var res = await fetch('/api/portal/admissions-applications', { headers: { accept: 'application/json' } });
      if (!res.ok) return; // not signed in, or nothing to show — journey stays static
      var data = await res.json();
      if (!data || !data.applications || !data.applications.length) return;
      var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      applyLiveStatus(data.applications[0], lang);
    } catch (err) { /* static journey remains, no error surfaced */ }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFlowStages();
    initFaq();
    loadLiveStatus();
  });
})();
