(function(){
  var formCard = document.querySelector('[data-portal-form-card]');
  var successCard = document.querySelector('[data-portal-success-card]');
  var form = document.querySelector('[data-portal-register-form]');
  var errorEl = document.querySelector('[data-portal-error]');
  var submitBtn = document.querySelector('[data-portal-submit]');
  var successNameEl = document.querySelector('[data-portal-success-name]');
  var successMessageEl = document.querySelector('[data-portal-success-message]');
  var devLinkWrap = document.querySelector('[data-portal-dev-link]');
  var devLinkHref = document.querySelector('[data-portal-dev-link-href]');
  if(!form) return;

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    errorEl.classList.remove('is-visible');
    submitBtn.disabled = true;
    var originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Creating account…';

    var payload = {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      password: form.password.value,
    };

    try{
      var res = await fetch('/api/portal/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json().catch(function(){ return {}; });
      if(!res.ok){
        errorEl.textContent = data.error || 'Something went wrong — please try again.';
        errorEl.classList.add('is-visible');
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        return;
      }

      successNameEl.textContent = data.fullName;
      if(data.verificationSent){
        successMessageEl.textContent = 'Your account has been created and you are signed in. We\'ve sent a verification link to your email — please confirm it when you can.';
      } else {
        successMessageEl.textContent = 'Your account has been created and you are signed in.';
        if(data.verificationLink){
          devLinkWrap.hidden = false;
          devLinkHref.href = data.verificationLink;
          devLinkHref.textContent = data.verificationLink;
        }
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
