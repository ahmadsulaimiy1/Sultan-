(function(){
  var formCard = document.querySelector('[data-portal-form-card]');
  var successCard = document.querySelector('[data-portal-success-card]');
  var form = document.querySelector('[data-portal-apply-form]');
  var errorEl = document.querySelector('[data-portal-error]');
  var submitBtn = document.querySelector('[data-portal-submit]');
  if(!form) return;

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    errorEl.classList.remove('is-visible');
    submitBtn.disabled = true;
    var originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Submitting…';

    /* THE ENDPOINT TAKES FOUR FIELDS AND THE FORM NOW ASKS FIFTEEN.
       `admissions_applications` has columns for child, institution, desired
       class and notes, and nothing else — so everything the form learned to
       ask is folded into `notes` under plain headings rather than being
       dropped on the floor or waiting on a schema migration that would have
       to be written, reviewed and run against a live database before a single
       parent got a better form.

       It is deliberately readable, because a Registrar opening this record
       reads it as text. When admissions_applications grows real columns for
       these, lift them out of here one at a time; until then nothing a family
       types is lost, which is the only part that actually matters. */
    function val(name) {
      var el = form.elements[name];
      return el && typeof el.value === 'string' ? el.value.trim() : '';
    }
    var EXTRA = [
      ['Date of birth',        'dob'],
      ['Gender',               'gender'],
      ['Intended start',       'term'],
      ['Day or boarding',      'attendance'],
      ['Telephone / WhatsApp', 'phone'],
      ['Relationship to child','relationship'],
      ['Where the family lives','area'],
      ['Present or last school','prevSchool'],
      ['Class completed there','prevClass'],
      ["Qur'an memorised",     'quran'],
      ['Arabic',               'arabic'],
      ['Health or learning',   'health']
    ];
    var extraLines = EXTRA
      .map(function (pair) { var v = val(pair[1]); return v ? pair[0] + ': ' + v : null; })
      .filter(Boolean);

    var freeNotes = val('notes');
    var notes = extraLines.length
      ? (freeNotes ? freeNotes + '\n\n' : '') + '— Supplied with the application —\n' + extraLines.join('\n')
      : freeNotes;

    var payload = {
      applicantChildName: val('applicantChildName'),
      institutionName: val('institutionName'),
      desiredClass: val('desiredClass'),
      notes: notes,
    };

    if (!payload.applicantChildName || !payload.institutionName) {
      errorEl.textContent = !payload.applicantChildName
        ? 'Please give the child\u2019s full name.'
        : 'Please choose which of the five schools this application is for.';
      errorEl.classList.add('is-visible');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      (form.elements[!payload.applicantChildName ? 'applicantChildName' : 'institutionName'] || {}).focus &&
        form.elements[!payload.applicantChildName ? 'applicantChildName' : 'institutionName'].focus();
      return;
    }

    try{
      var res = await fetch('/api/portal/admissions-applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if(res.status === 401){
        window.location.href = '/portal/login/?next=/portal/apply/';
        return;
      }
      var data = await res.json().catch(function(){ return {}; });
      if(!res.ok){
        errorEl.textContent = data.error || 'Something went wrong — please try again.';
        errorEl.classList.add('is-visible');
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        return;
      }
      formCard.hidden = true;
      successCard.hidden = false;
    }catch(err){
      errorEl.textContent = 'Could not reach the portal — please check your connection and try again.';
      errorEl.classList.add('is-visible');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
