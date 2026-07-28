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
      identityType: form.identityType.value,
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      confirmEmail: form.confirmEmail.value.trim(),
      phone: form.phone.value.trim(),
      whatsappNumber: form.whatsappNumber.value.trim(),
      password: form.password.value,
      confirmPassword: form.confirmPassword.value,
    };

    if(payload.email.toLowerCase() !== payload.confirmEmail.toLowerCase()){
      errorEl.textContent = 'Email address and confirmation do not match.';
      errorEl.classList.add('is-visible');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      return;
    }
    if(payload.password !== payload.confirmPassword){
      errorEl.textContent = 'Password and confirmation do not match.';
      errorEl.classList.add('is-visible');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      return;
    }

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
        successMessageEl.textContent = 'Your account has been created and you are signed in. A verification code and a verification link have both been sent to ' + data.email + ' — use whichever is easier.';
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
