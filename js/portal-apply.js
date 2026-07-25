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

    var payload = {
      applicantChildName: form.applicantChildName.value.trim(),
      institutionName: form.institutionName.value,
      desiredClass: form.desiredClass.value.trim(),
      notes: form.notes.value.trim(),
    };

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
