// Universal show/hide toggle for every password field across the
// portal — registration, all three logins, all three set-password
// pages, and the Personalisation Centre's change-password form (whose
// fields are injected into the DOM after the panel opens, not present
// at page load — hence the MutationObserver, not just a one-time scan).
// Include this one script tag on any page with a password field; no
// other wiring needed.
(function(){
  var EYE_OPEN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  var EYE_CLOSED = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 3l18 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10.6 5.2A11 11 0 0112 5c7 0 10.5 7 10.5 7a15.6 15.6 0 01-3.4 4.3M6.6 6.7C3.4 8.9 1.5 12 1.5 12s3.5 7 10.5 7a10.4 10.4 0 004.2-.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><path d="M9.9 9.9a3 3 0 004.2 4.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  function wrap(input){
    if(input.dataset.pwToggled) return;
    input.dataset.pwToggled = '1';

    var wrapSpan = document.createElement('span');
    wrapSpan.className = 'pw-toggle-wrap';
    input.parentNode.insertBefore(wrapSpan, input);
    wrapSpan.appendChild(input);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle-btn';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = EYE_OPEN;
    wrapSpan.appendChild(btn);

    btn.addEventListener('click', function(){
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = showing ? EYE_OPEN : EYE_CLOSED;
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      btn.setAttribute('aria-pressed', showing ? 'false' : 'true');
    });
  }

  function scan(root){
    var inputs = root.querySelectorAll ? root.querySelectorAll('input[type="password"]') : [];
    for(var i = 0; i < inputs.length; i++){ wrap(inputs[i]); }
  }

  scan(document);

  var observer = new MutationObserver(function(mutations){
    for(var i = 0; i < mutations.length; i++){
      var added = mutations[i].addedNodes;
      for(var j = 0; j < added.length; j++){
        var node = added[j];
        if(node.nodeType !== 1) continue;
        if(node.matches && node.matches('input[type="password"]')) wrap(node);
        else scan(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
