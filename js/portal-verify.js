(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var successEl = document.querySelector('[data-portal-success]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var nameEl = document.querySelector('[data-portal-name]');
  var codeCardEl = document.querySelector('[data-portal-code-card]');
  var codeForm = document.querySelector('[data-portal-code-form]');
  var codeErrorEl = document.querySelector('[data-portal-code-error]');
  var codeSubmitBtn = document.querySelector('[data-portal-code-submit]');

  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || '';
  var prefillEmail = params.get('email') || '';
  if(prefillEmail && codeForm){ codeForm.email.value = prefillEmail; }

  async function runLinkVerify(){
    try{
      var res = await fetch('/api/portal/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token }),
      });
      var data = await res.json().catch(function(){ return {}; });
      loadingEl.hidden = true;
      if(!res.ok){
        // Both verification methods are always offered — a failed/expired
        // link isn't a dead end, the code from the same email still works.
        errorMessageEl.textContent = data.error || 'This link is invalid or has expired.';
        errorEl.hidden = false;
        codeCardEl.hidden = false;
        return;
      }
      nameEl.textContent = data.fullName || '';
      successEl.hidden = false;
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = 'Could not reach the portal — please check your connection and try again.';
      errorEl.hidden = false;
      codeCardEl.hidden = false;
    }
  }

  if(token){
    runLinkVerify();
  }else{
    loadingEl.hidden = true;
    codeCardEl.hidden = false;
  }

  if(codeForm){
    codeForm.addEventListener('submit', async function(e){
      e.preventDefault();
      codeErrorEl.classList.remove('is-visible');
      codeSubmitBtn.disabled = true;
      var originalLabel = codeSubmitBtn.textContent;
      codeSubmitBtn.textContent = 'Verifying…';

      try{
        var res = await fetch('/api/portal/verify-by-code', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: codeForm.email.value.trim(), code: codeForm.code.value.trim() }),
        });
        var data = await res.json().catch(function(){ return {}; });
        if(!res.ok){
          codeErrorEl.textContent = data.error || 'Something went wrong — please try again.';
          codeErrorEl.classList.add('is-visible');
          codeSubmitBtn.disabled = false;
          codeSubmitBtn.textContent = originalLabel;
          return;
        }
        codeCardEl.hidden = true;
        errorEl.hidden = true;
        nameEl.textContent = data.fullName || '';
        successEl.hidden = false;
      }catch(err){
        codeErrorEl.textContent = 'Could not reach the portal — please check your connection and try again.';
        codeErrorEl.classList.add('is-visible');
        codeSubmitBtn.disabled = false;
        codeSubmitBtn.textContent = originalLabel;
      }
    });
  }
})();
