(function(){
  var root = document.querySelector('[data-whatsapp]');
  if(!root) return;
  var toggleBtn = root.querySelector('[data-whatsapp-toggle]');
  var menu = root.querySelector('[data-whatsapp-menu]');

  function open(){
    menu.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('keydown', onKeydown);
  }
  function close(){
    menu.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('keydown', onKeydown);
  }
  function onOutsideClick(e){
    if(!root.contains(e.target)) close();
  }
  function onKeydown(e){
    if(e.key === 'Escape') close();
  }

  toggleBtn.addEventListener('click', function(e){
    e.stopPropagation();
    menu.hidden ? open() : close();
  });

  // Hide entirely while the AI assistant panel covers the screen
  // (open + not minimized), so the two floating controls never overlap.
  document.addEventListener('sultan:chat-covering', function(e){
    root.classList.toggle('is-hidden', !!(e.detail && e.detail.covering));
    if(e.detail && e.detail.covering) close();
  });
})();
