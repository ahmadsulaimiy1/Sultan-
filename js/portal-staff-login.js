(function(){
  var form = document.querySelector('[data-portal-login-form]');
  var errorEl = document.querySelector('[data-portal-error]');
  var submitBtn = document.querySelector('[data-portal-submit]');
  var otpForm = document.querySelector('[data-portal-otp-form]');
  var otpHint = document.querySelector('[data-otp-hint]');
  var otpSubmitBtn = document.querySelector('[data-portal-otp-submit]');
  var otpCancel = document.querySelector('[data-otp-cancel]');
  if(!form) return;

  var pendingLoginToken = null;

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    errorEl.classList.remove('is-visible');
    submitBtn.disabled = true;
    var originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Signing in…';

    var staffNo = form.staffNo.value.trim();
    var password = form.password.value;

    try{
      var res = await fetch('/api/portal/staff/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ staffNo: staffNo, password: password }),
      });
      var data = await res.json().catch(function(){ return {}; });
      if(!res.ok){
        errorEl.textContent = data.error || 'Something went wrong — please try again.';
        errorEl.classList.add('is-visible');
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        return;
      }
      if(data.otpRequired){
        pendingLoginToken = data.loginToken;
        otpHint.textContent = 'We’ve emailed a 6-digit code to ' + (data.maskedEmail || 'your inbox') + '. Enter it below to finish signing in.';
        form.hidden = true;
        otpForm.hidden = false;
        otpForm.code.focus();
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        return;
      }
      window.location.href = '/portal/staff/identity/';
    }catch(err){
      errorEl.textContent = 'Could not reach the portal — please check your connection and try again.';
      errorEl.classList.add('is-visible');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  if(otpForm){
    otpForm.addEventListener('submit', async function(e){
      e.preventDefault();
      errorEl.classList.remove('is-visible');
      otpSubmitBtn.disabled = true;
      var originalLabel = otpSubmitBtn.textContent;
      otpSubmitBtn.textContent = 'Verifying…';

      try{
        var res = await fetch('/api/portal/verify-otp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ loginToken: pendingLoginToken, code: otpForm.code.value.trim() }),
        });
        var data = await res.json().catch(function(){ return {}; });
        if(!res.ok){
          errorEl.textContent = data.error || 'Something went wrong — please try again.';
          errorEl.classList.add('is-visible');
          otpSubmitBtn.disabled = false;
          otpSubmitBtn.textContent = originalLabel;
          return;
        }
        window.location.href = '/portal/staff/identity/';
      }catch(err){
        errorEl.textContent = 'Could not reach the portal — please check your connection and try again.';
        errorEl.classList.add('is-visible');
        otpSubmitBtn.disabled = false;
        otpSubmitBtn.textContent = originalLabel;
      }
    });
  }

  if(otpCancel){
    otpCancel.addEventListener('click', function(e){
      e.preventDefault();
      window.location.reload();
    });
  }
})();
