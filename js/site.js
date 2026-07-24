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

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const statBands = document.querySelectorAll('.stat-band');
  if(statBands.length){
    const animateNum = (el)=>{
      const target = parseInt(el.dataset.count, 10);
      if(Number.isNaN(target)) return;
      const suffix = el.dataset.suffix || '';
      if(reduceMotion){ el.textContent = target + suffix; return; }
      const duration = 1200;
      const start = performance.now();
      const step = (now)=>{
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if(p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const statIO = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.querySelectorAll('.num[data-count]').forEach(animateNum);
          statIO.unobserve(e.target);
        }
      });
    }, {threshold:0.3});
    statBands.forEach(el=>statIO.observe(el));
  }

  document.querySelectorAll('.contact-form').forEach(form=>{
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    const successText = form.dataset.successText || originalText;
    const errorText = form.dataset.errorText || 'Error — please try again.';
    let resetTimer;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      clearTimeout(resetTimer);
      btn.disabled = true;
      btn.textContent = form.dataset.sendingText || originalText;
      try{
        const endpoint = form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
        const res = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if(!res.ok) throw new Error('bad status ' + res.status);
        btn.textContent = successText;
        form.reset();
        resetTimer = setTimeout(()=>{ btn.textContent = originalText; btn.disabled = false; }, 6000);
      }catch(err){
        btn.textContent = errorText;
        btn.disabled = false;
        resetTimer = setTimeout(()=>{ btn.textContent = originalText; }, 6000);
      }
    });
  });
