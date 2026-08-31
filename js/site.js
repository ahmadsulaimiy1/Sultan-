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

  // "Today's Wird" widget — reminder card (js/reflections-data.js).
  (function(){
    var box = document.querySelector('[data-wird-reminder]');
    if(!box || !window.SHRS_REFLECTIONS) return;
    var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    var reminder = window.SHRS_REFLECTIONS.todaysReminder();
    var kindLabels = {
      en: { verse: "Qur'an", hadith: 'Hadith' },
      ar: { verse: 'قرآن', hadith: 'حديث' },
    };
    var kindEl = document.createElement('p');
    kindEl.className = 'wr-kind';
    kindEl.textContent = (kindLabels[lang] || kindLabels.en)[reminder.kind];
    var textEl = document.createElement('p');
    textEl.className = 'wr-text';
    textEl.textContent = '“' + reminder.en + '”';
    var refEl2 = document.createElement('span');
    refEl2.className = 'wr-ref';
    refEl2.textContent = reminder.ref;
    box.appendChild(kindEl);
    box.appendChild(textEl);
    box.appendChild(refEl2);
  })();

  document.querySelectorAll('.policy-head').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      // closest('.policy'), not parentElement. The button is now wrapped in an
      // <h4> so the 25 policies are navigable by heading, and parentElement
      // then returns that wrapper rather than the policy: querySelector found
      // no .policy-body, threw, and the accordion stopped opening at all.
      // closest() asks the question that was always meant — which policy is
      // this? — and is indifferent to what sits in between.
      const item = btn.closest('.policy');
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
  /* THE TYPEWRITER, and three things it was getting wrong.

     1. IT MEASURED BEFORE THE FONT ARRIVED. The width was read on the
        fallback face and then frozen as an inline pixel value. When
        Cinzel swapped in — always a moment later — the real text no
        longer fitted the box that had been measured for it, and the end
        of the school's name was cut off by its own animation container.
        It now waits for document.fonts.ready.
     2. IT TYPED AT A FIXED TWENTY-SEVEN STEPS regardless of how many
        letters there were, so the rhythm changed with the language: the
        same animation across a longer or shorter name typed faster or
        slower with no relation to the words. Steps now follow the
        character count, and the duration with it, so it types at a
        constant speed in any language.
     3. IT NEVER LET GO. The inline width stayed after the animation
        finished — see css/atelier.css, which now clears it on .is-done —
        so any later reflow was clipped by a measurement taken at load.

     Under reduced motion nothing types: the name is simply there, which
     is what somebody who asked for less motion asked for. */
  const typeTargets = [].slice.call(document.querySelectorAll('.hero-type'));
  if (typeTargets.length && !reduceMotionPref) {
    const startTyping = () => {
      typeTargets.forEach(el => {
        const chars = (el.textContent || '').trim().length || 1;
        const target = el.getBoundingClientRect().width;
        if (!target) return;                 // never animate to zero width
        const steps = Math.max(8, Math.min(chars, 90));
        const secs = Math.max(.9, Math.min(chars * 0.055, 2.6));
        el.style.setProperty('--type-steps', steps);
        el.style.transitionDuration = secs + 's';
        el.style.transitionTimingFunction = 'steps(' + steps + ', end)';
        el.classList.add('js-type');
        el.style.width = '0px';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { el.style.width = target + 'px'; });
        });
        el.addEventListener('transitionend', function done(e){
          if (e.propertyName !== 'width') return;
          el.classList.add('is-done');
          el.style.width = '';               // hand the width back to layout
          el.removeEventListener('transitionend', done);
        });
      });
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(startTyping).catch(startTyping);
    } else {
      startTyping();
    }
  }

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

  // Full-screen mobile navigation drawer — the "Menu"/"Full Menu"
  // triggers already toggle .navlinks.open via their inline onclick;
  // this only adds what a full-screen takeover additionally needs:
  // page-scroll lock while open, the drawer's own close button, and
  // Escape to dismiss. A MutationObserver (rather than touching the
  // existing onclick handlers) keeps body scroll-lock in sync with
  // whichever trigger opened the drawer.
  (function(){
    var navlinks = document.querySelector('.navlinks');
    if(!navlinks) return;
    var closeBtn = navlinks.querySelector('.nav-drawer-close');
    function isDrawerOpen(){
      return navlinks.classList.contains('open') && window.matchMedia('(max-width:2000px)').matches;
    }
    function closeDrawer(){ navlinks.classList.remove('open'); }
    new MutationObserver(function(){
      document.body.classList.toggle('nav-lock', isDrawerOpen());
    }).observe(navlinks, {attributes:true, attributeFilter:['class']});
    if(closeBtn) closeBtn.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && isDrawerOpen()) closeDrawer();
    });
  })();

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

  // Progressive disclosure for long paragraphs. Mark a block
  // data-readmore (optionally data-readmore-lines="N", default 4) and it
  // clamps to that many lines with a "Read more" toggle that expands it
  // in place — no navigation, no reload, no page getting longer until a
  // reader asks for it to. Opt-in per element, and only actually clamps
  // blocks that overflow their own clamp height, so a short paragraph
  // carrying the attribute by mistake never grows an empty toggle.
  document.querySelectorAll('[data-readmore]').forEach((block) => {
    const lines = block.dataset.readmoreLines || '4';
    block.style.setProperty('--rm-lines', lines);
    requestAnimationFrame(() => {
      if (block.scrollHeight <= block.clientHeight + 4) return;
      const moreText = block.dataset.readmoreMore || 'Read more';
      const lessText = block.dataset.readmoreLess || 'Show less';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'readmore-toggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = `<span class="label">${moreText}</span><span class="arrow" aria-hidden="true">&#8964;</span>`;
      btn.addEventListener('click', () => {
        const open = block.classList.toggle('is-expanded');
        btn.classList.toggle('is-open', open);
        btn.querySelector('.label').textContent = open ? lessText : moreText;
        btn.setAttribute('aria-expanded', String(open));
      });
      block.insertAdjacentElement('afterend', btn);
    });
  });
