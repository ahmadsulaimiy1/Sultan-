(function(){
  var form = document.querySelector('[data-portal-set-password-form]');
  var errorEl = document.querySelector('[data-portal-error]');
  var submitBtn = document.querySelector('[data-portal-submit]');
  var introEl = document.querySelector('[data-portal-intro]');
  if(!form) return;

  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || '';
  if(!token){
    introEl.textContent = 'This link is missing its activation token.';
    form.hidden = true;
    errorEl.textContent = 'Please use the exact link the school sent you, or contact the school for a new one.';
    errorEl.classList.add('is-visible');
    return;
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    errorEl.classList.remove('is-visible');

    var password = form.password.value;
    var confirm = form.confirm.value;
    if(password !== confirm){
      errorEl.textContent = 'Passwords do not match.';
      errorEl.classList.add('is-visible');
      return;
    }

    submitBtn.disabled = true;
    var originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Setting password…';

    try{
      var res = await fetch('/api/portal/student/set-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token, password: password }),
      });
      var data = await res.json().catch(function(){ return {}; });
      if(!res.ok){
        errorEl.textContent = data.error || 'Something went wrong — please try again.';
        errorEl.classList.add('is-visible');
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        return;
      }
      window.location.href = '/portal/student/dashboard/';
    }catch(err){
      errorEl.textContent = 'Could not reach the portal — please check your connection and try again.';
      errorEl.classList.add('is-visible');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
