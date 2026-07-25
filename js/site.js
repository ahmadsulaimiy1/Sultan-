  // Homepage "Today's Reflection" — one dhikr picked from the current
  // period's list (js/adhkar-data.js), varying by visit rather than
  // showing the same fixed entry every time.
  (function(){
    var teaser = document.querySelector('[data-adhkar-teaser]');
    if(!teaser || !window.SHRS_ADHKAR) return;
    var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    var isMorning = new Date().getHours() < 12;
    var list = isMorning ? window.SHRS_ADHKAR.morning : window.SHRS_ADHKAR.evening;
    var item = list[Math.floor(Math.random() * list.length)];
    var translation = lang === 'ar' ? item.translation.ar : item.translation.en;
    var reference = lang === 'ar' ? item.reference.ar : item.reference.en;
    var arabic = document.createElement('p');
    arabic.className = 'at-arabic';
    arabic.lang = 'ar';
    arabic.dir = 'rtl';
    arabic.textContent = item.arabic;
    var translationEl = document.createElement('p');
    translationEl.className = 'at-translation';
    translationEl.textContent = translation;
    var refEl = document.createElement('span');
    refEl.className = 'at-ref';
    refEl.textContent = reference;
    teaser.appendChild(arabic);
    teaser.appendChild(translationEl);
    teaser.appendChild(refEl);
  })();

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

  // Policies page — "Print / Download as PDF". The print stylesheet
  // (css/brand.css, @media print) forces every accordion open and hides
  // site chrome regardless of on-screen state, so this just triggers
  // the browser's native print dialog — "Save as PDF" is a standard
  // destination option there, no separate PDF-generation service needed.
  document.querySelectorAll('[data-print-policies]').forEach(btn=>{
    btn.addEventListener('click', ()=>window.print());
  });

  // Policy Related Documents cross-links — a link like #policy-SW-01
  // (from another policy's Related Documents list, or shared directly)
  // opens that policy's accordion entry and scrolls to it, since it's
  // collapsed by default and a plain anchor jump alone wouldn't reveal
  // its content.
  function openPolicyFromHash(){
    var id = location.hash.replace('#', '');
    if(!id.startsWith('policy-')) return;
    var item = document.getElementById(id);
    if(!item || !item.classList.contains('policy')) return;
    var head = item.querySelector('.policy-head');
    var body = item.querySelector('.policy-body');
    if(!head || !body) return;
    document.querySelectorAll('.policy').forEach(p=>{
      p.classList.remove('open');
      p.querySelector('.policy-body').style.maxHeight = null;
      p.querySelector('.policy-head').setAttribute('aria-expanded','false');
    });
    item.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 60 + 'px';
    head.setAttribute('aria-expanded','true');
    item.scrollIntoView({ behavior: 'smooth', block: 'start' });
    item.classList.add('is-highlighted');
    setTimeout(()=>item.classList.remove('is-highlighted'), 1700);
  }
  if(document.querySelector('.policies')){
    if(location.hash) setTimeout(openPolicyFromHash, 60);
    window.addEventListener('hashchange', openPolicyFromHash);
  }

  // Homepage hero title — typewriter reveal. Width is measured from the
  // rendered element (not guessed from character count), so it works
  // correctly regardless of the serif display face's proportional metrics.
  const reduceMotionPref = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.hero-type').forEach(el=>{
    if(reduceMotionPref) return;
    const target = el.getBoundingClientRect().width;
    el.classList.add('js-type');
    el.style.width = '0px';
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{ el.style.width = target + 'px'; });
    });
    el.addEventListener('transitionend', function done(e){
      if(e.propertyName !== 'width') return;
      el.classList.add('is-done');
      el.removeEventListener('transitionend', done);
    });
  });

  // threshold:0.12 means a .reveal target needs 12% of ITS OWN height
  // visible to fire — for a single section far taller than ~8x the
  // viewport (a long reference/list page, not a normal "card" section),
  // that ratio is mathematically unreachable and the section stays
  // opacity:0 forever. Don't put .reveal on a section that tall; split
  // it or drop the class (as pages/adhkar.html does).
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
