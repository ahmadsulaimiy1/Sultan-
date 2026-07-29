// Staff Documents page — purely a session gate. The content on this page
// (duty rosters, exam guidelines, term deadlines) is static and identical
// for every signed-in staff member, so unlike the other staff pages there's
// no per-user data to fetch and render: /api/portal/staff/me is called only
// to confirm a real staff session exists before revealing the page, exactly
// the same gate every other staff page uses.
(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  async function load(){
    try{
      var res = await fetch('/api/portal/staff/me');
      if(res.status === 401){
        window.location.href = '/portal/staff/login/';
        return;
      }
      if(!res.ok){
        var data = await res.json().catch(function(){ return {}; });
        throw new Error(data.error || 'Could not load this page.');
      }
      loadingEl.hidden = true;
      contentEl.hidden = false;
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load this page.';
      errorEl.hidden = false;
    }
  }

  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/staff/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/staff/login/';
  });

  load();
})();
