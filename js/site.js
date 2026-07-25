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

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.getAttribute('data-pc-motion') === 'reduced';
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

  // Mobile mega-menu accordion — each nav-drop panel is now large
  // (icon + description + links), so on mobile only one opens at a time
  // instead of every panel sitting permanently expanded.
  document.querySelectorAll('.nav-drop-toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const drop = btn.closest('.nav-drop');
      const isOpen = drop.classList.contains('open');
      document.querySelectorAll('.nav-drop.open').forEach(d=>{
        d.classList.remove('open');
        const t = d.querySelector('.nav-drop-toggle');
        if(t) t.setAttribute('aria-expanded','false');
      });
      if(!isOpen){
        drop.classList.add('open');
        btn.setAttribute('aria-expanded','true');
      }
    });
  });

  // Floating "Apply Now" — reveals after the visitor scrolls past the
  // opening section; suppressed entirely on the Admission page itself,
  // where the CTA would just be pointing at the page already open.
  document.querySelectorAll('.apply-float').forEach(el=>{
    if(/\/admission\/?($|\?)/.test(location.pathname)){ el.remove(); return; }
    const reveal = ()=>{ el.classList.toggle('is-visible', window.scrollY > 420); };
    reveal();
    window.addEventListener('scroll', reveal, {passive:true});
  });

  // Active-page indicator across the mega-menu — picks the longest matching
  // internal href among every link inside a nav-drop panel (preferring the
  // dropdown's own trigger on ties), so a sub-page like /about/governance/
  // lights up "Governance" rather than the shorter "/about/" of "Discover SHRS".
  (function(){
    const path = location.pathname.replace(/index\.html$/, '');
    const candidates = [];
    document.querySelectorAll('.nav-drop').forEach(drop=>{
      const trigger = drop.querySelector('.nav-drop-trigger');
      drop.querySelectorAll('a[href]').forEach(a=>{
        const href = a.getAttribute('href');
        if(!href || href.startsWith('http') || href.startsWith('#')) return;
        candidates.push({ href, el: drop, isTrigger: a === trigger });
      });
    });
    document.querySelectorAll('.navlinks > a[href]').forEach(a=>{
      const href = a.getAttribute('href');
      if(!href || href.startsWith('http')) return;
      candidates.push({ href, el: a, isTrigger: true });
    });
    const matches = candidates.filter(c=> path === c.href || (c.href !== '/' && path.startsWith(c.href)));
    if(matches.length){
      matches.sort((a,b)=> (b.href.length - a.href.length) || (b.isTrigger - a.isTrigger));
      matches[0].el.classList.add('is-active');
    }
  })();

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
