  document.querySelectorAll('.policy-head').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const item = btn.parentElement;
      const body = item.querySelector('.policy-body');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.policy').forEach(p=>{
        p.classList.remove('open');
        p.querySelector('.policy-body').style.maxHeight = null;
        p.querySelector('.policy-head').setAttribute('aria-expanded','false');
      });
      if(!isOpen){
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 60 + 'px';
        btn.setAttribute('aria-expanded','true');
      }
    });
  });
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:0.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
  document.querySelectorAll('.stagger').forEach(el=>io.observe(el));
