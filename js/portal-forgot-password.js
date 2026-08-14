(function(){
  var formCard = document.querySelector('[data-portal-form-card]');
  var successCard = document.querySelector('[data-portal-success-card]');
  var form = document.querySelector('[data-portal-forgot-form]');
  var errorEl = document.querySelector('[data-portal-error]');
  var submitBtn = document.querySelector('[data-portal-submit]');
  if(!form) return;

  // Staff and guardians are separate account tables with separate reset
  // endpoints, but the form, the states and the copy are identical. Each
  // page names its own endpoint; the guardian page predates the
  // attribute, so its path remains the default.
  var endpoint = form.getAttribute('data-portal-forgot-endpoint') || '/api/portal/forgot-password';

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    errorEl.classList.remove('is-visible');
    submitBtn.disabled = true;
    var originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';

    var email = form.email.value.trim();

    try{
      var res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email }),
      });
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
