(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var successEl = document.querySelector('[data-portal-success]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var nameEl = document.querySelector('[data-portal-name]');

  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || '';

  async function run(){
    if(!token){
      loadingEl.hidden = true;
      errorMessageEl.textContent = 'This link is missing its verification token — please use the exact link from your email.';
      errorEl.hidden = false;
      return;
    }
    try{
      var res = await fetch('/api/portal/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token }),
      });
      var data = await res.json().catch(function(){ return {}; });
      loadingEl.hidden = true;
      if(!res.ok){
        errorMessageEl.textContent = data.error || 'This link is invalid or has expired.';
        errorEl.hidden = false;
        return;
      }
      nameEl.textContent = data.fullName || '';
      successEl.hidden = false;
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = 'Could not reach the portal — please check your connection and try again.';
      errorEl.hidden = false;
    }
  }

  run();
})();
