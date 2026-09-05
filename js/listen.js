/* ===================================================================
   THE READER — the school's pages, read aloud
   -------------------------------------------------------------------
   The site had one recording: a forty-second spoken welcome, played
   once on a first arrival. Everything else on it was silent. This puts
   a voice on every page instead.

   It reads the page's own prose — its headings and its paragraphs, in
   the order they are set — using the speech synthesiser already built
   into the browser. Nothing is fetched, nothing is sent anywhere, and
   it works with the network off.

   Four things govern the design.

   1. It reads what is written, not what is around it. Navigation,
      breadcrumbs, the footer, forms, code, the identity card's machine
      line and every aside are skipped; a reader who asked to be read to
      wants the page, not the furniture.
   2. It shows where it is. The passage being spoken is lit as it is
      spoken, so a reader can follow with their eyes, look away, and
      find their place again on return.
   3. It is escapable at every moment. The bar carries stop as plainly
      as it carries play, Escape stops it, and leaving the page stops it
      — a voice must never follow a reader out of the room.
   4. It speaks the page's own language. The utterance is tagged with
      the document's language and matched to an installed voice for it,
      so the Arabic pages are read in Arabic where the device has an
      Arabic voice, and are left silent rather than read in the wrong
      accent where it does not.

   Absent SpeechSynthesis, the control is never built and the page is
   exactly as it was.
   =================================================================== */
(function () {
  'use strict';

  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

  var PREFS_KEY = 'shrsPersonalisation_v2';
  var DOC_LANG = (document.documentElement.lang || 'en').toLowerCase();

  var STRINGS = {
    en: { open: 'Listen to this page', listen: 'Listen', playing: 'Reading', pause: 'Pause',
          resume: 'Resume', stop: 'Stop', speed: 'Speed', close: 'Close the reader',
          nothing: 'There is nothing to read on this page.',
          novoice: 'This device has no voice installed for this language.',
          done: 'Finished.' },
    ar: { open: 'استمع إلى هذه الصفحة', listen: 'استماع', playing: 'جارٍ القراءة', pause: 'إيقاف مؤقت',
          resume: 'متابعة', stop: 'إيقاف', speed: 'السرعة', close: 'إغلاق القارئ',
          nothing: 'لا يوجد نص لقراءته في هذه الصفحة.',
          novoice: 'لا يوجد صوت مثبَّت على هذا الجهاز لهذه اللغة.',
          done: 'انتهت القراءة.' },
    yo: { open: 'Fetí sí ojú-ìwé yìí', listen: 'Fetísílẹ̀', playing: 'Ń kà', pause: 'Dúró',
          resume: 'Tẹ̀síwájú', stop: 'Dá dúró', speed: 'Ìyára', close: 'Ti òǹkàwé pa',
          nothing: 'Kò sí ohun tí a lè kà ní ojú-ìwé yìí.',
          novoice: 'Ẹ̀rọ yìí kò ní ohùn fún èdè yìí.',
          done: 'Ó parí.' },
    fr: { open: 'Écouter cette page', listen: 'Écouter', playing: 'Lecture', pause: 'Pause',
          resume: 'Reprendre', stop: 'Arrêter', speed: 'Vitesse', close: 'Fermer le lecteur',
          nothing: 'Il n’y a rien à lire sur cette page.',
          novoice: 'Cet appareil n’a aucune voix installée pour cette langue.',
          done: 'Terminé.' }
  };
  var T = STRINGS[DOC_LANG.slice(0, 2)] || STRINGS.en;

  function prefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function disabled() { return prefs().readAloud === 'off'; }

  // --- What counts as the page ---------------------------------------
  // Everything the school wrote, and nothing the site put around it.
  var SKIP_CLOSEST = 'header,footer,nav,form,aside,figure,table,' +
    '[data-personalisation],[data-livery-prompt],[data-adk-app],' +
    '.breadcrumbs,.ann-ribbon,.topbar,.assistant-root,.whatsapp-float,' +
    '.pc-islamic-strip,.mobile-nav-ribbon,.mobile-quick-row,.foot-dashboard,' +
    '.idc-mrz,.plib-code,.rg-figures,.search-panel,.to-top';
  var TAKE = 'h1,h2,h3,p,li,blockquote';

  function collect() {
    var out = [];
    var nodes = document.querySelectorAll(TAKE);
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.closest(SKIP_CLOSEST)) return;
      if (el.getAttribute('aria-hidden') === 'true') return;
      if (el.closest('[hidden]')) return;
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      // A list item whose parent paragraph is already taken would be read
      // twice; only ever take the outermost of a nested pair.
      if (out.length && out[out.length - 1].el.contains(el)) return;
      var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length < 12) return;
      out.push({ el: el, text: text });
    });
    return out;
  }

  // --- A voice for the page's own language ---------------------------
  var voices = [];
  function loadVoices() { try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
  loadVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  function pickVoice() {
    if (!voices.length) loadVoices();
    var want = DOC_LANG.slice(0, 2);
    var exact = voices.filter(function (v) { return (v.lang || '').toLowerCase() === DOC_LANG; });
    if (exact.length) return exact[0];
    var near = voices.filter(function (v) { return (v.lang || '').toLowerCase().slice(0, 2) === want; });
    return near.length ? near[0] : null;
  }

  // --- The bar --------------------------------------------------------
  var bar, btnPlay, btnStop, label, meter, rate = 1, idx = -1, passages = [], lit = null;
  var speaking = false, paused = false;
  var fastFails = 0;

  function build() {
    bar = document.createElement('div');
    bar.className = 'lsn-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', T.open);
    bar.hidden = true;
    bar.innerHTML =
      '<div class="lsn-inner">' +
        '<span class="lsn-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
        '<button type="button" class="lsn-btn lsn-play"></button>' +
        '<button type="button" class="lsn-btn lsn-stop">' + T.stop + '</button>' +
        '<span class="lsn-label" role="status" aria-live="polite"></span>' +
        '<span class="lsn-meter" aria-hidden="true"><i></i></span>' +
        '<label class="lsn-rate">' + T.speed +
          '<select class="lsn-rate-sel">' +
            '<option value="0.85">0.85&times;</option>' +
            '<option value="1" selected>1&times;</option>' +
            '<option value="1.25">1.25&times;</option>' +
            '<option value="1.5">1.5&times;</option>' +
          '</select>' +
        '</label>' +
        '<button type="button" class="lsn-close" aria-label="' + T.close + '">&times;</button>' +
      '</div>';
    document.body.appendChild(bar);
    btnPlay = bar.querySelector('.lsn-play');
    btnStop = bar.querySelector('.lsn-stop');
    label = bar.querySelector('.lsn-label');
    meter = bar.querySelector('.lsn-meter i');

    btnPlay.addEventListener('click', toggle);
    btnStop.addEventListener('click', function () { stop(); say(''); });
    bar.querySelector('.lsn-close').addEventListener('click', function () { stop(); close(); });
    bar.querySelector('.lsn-rate-sel').addEventListener('change', function (e) {
      rate = parseFloat(e.target.value) || 1;
      if (speaking) { var at = idx; stop(); idx = at - 1; next(); }
    });
    setPlayLabel();
  }

  function setPlayLabel() {
    btnPlay.textContent = !speaking ? T.listen : (paused ? T.resume : T.pause);
    bar.classList.toggle('is-speaking', speaking && !paused);
  }
  function say(msg) { if (label) label.textContent = msg || ''; }

  function open() {
    if (!bar) build();
    bar.hidden = false;
    requestAnimationFrame(function () { bar.classList.add('is-open'); });
    document.documentElement.classList.add('has-reader');
  }
  function close() {
    if (!bar) return;
    bar.classList.remove('is-open');
    window.setTimeout(function () { bar.hidden = true; }, 420);
    document.documentElement.classList.remove('has-reader');
  }

  function light(el) {
    if (lit) lit.classList.remove('lsn-lit');
    lit = el || null;
    if (!lit) return;
    lit.classList.add('lsn-lit');
    var r = lit.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 120) {
      try { lit.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      catch (e) { lit.scrollIntoView(); }
    }
  }

  function next() {
    idx += 1;
    if (idx >= passages.length) { stop(); say(T.done); return; }
    var p = passages[idx];
    light(p.el);
    if (meter) meter.style.transform = 'scaleX(' + ((idx + 1) / passages.length).toFixed(4) + ')';
    var u = new SpeechSynthesisUtterance(p.text);
    u.lang = DOC_LANG;
    u.rate = rate;
    u.pitch = 1;
    var v = pickVoice();
    if (v) u.voice = v;

    // A device with no voice for this language does not refuse: it
    // accepts the utterance and ends it immediately. Left alone, the
    // reader would race the whole page in silence and announce that it
    // had finished. Two implausibly short passages in a row is the
    // signature of that, and it is reported as what it is.
    var began = (window.performance && performance.now) ? performance.now() : Date.now();
    function ended() {
      if (!speaking || paused) return;
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var tooFast = p.text.length > 40 && (now - began) < 260;
      fastFails = tooFast ? fastFails + 1 : 0;
      if (fastFails >= 2) { stop(); say(T.novoice); return; }
      next();
    }
    u.onend = ended;
    u.onerror = ended;
    try { window.speechSynthesis.speak(u); }
    catch (e) { stop(); say(T.novoice); }
  }

  function start() {
    passages = collect();
    if (!passages.length) { open(); say(T.nothing); return; }
    if (!pickVoice() && voices.length) { open(); say(T.novoice); return; }
    open();
    speaking = true; paused = false; idx = -1; fastFails = 0;
    say(T.playing);
    setPlayLabel();
    try { window.speechSynthesis.cancel(); } catch (e) {}
    next();
  }
  function stop() {
    speaking = false; paused = false; idx = -1; fastFails = 0;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    light(null);
    if (meter) meter.style.transform = 'scaleX(0)';
    if (bar) setPlayLabel();
  }
  function toggle() {
    if (!speaking) { start(); return; }
    if (paused) { paused = false; try { window.speechSynthesis.resume(); } catch (e) {} say(T.playing); }
    else { paused = true; try { window.speechSynthesis.pause(); } catch (e) {} say(T.pause); }
    setPlayLabel();
  }

  // --- The control in the masthead ------------------------------------
  function mount() {
    var trigger = document.querySelector('[data-listen-toggle]');
    if (!trigger) return;
    if (disabled()) { trigger.hidden = true; return; }
    trigger.hidden = false;
    trigger.addEventListener('click', function () {
      if (!bar || bar.hidden) { start(); return; }
      if (speaking) { stop(); close(); } else { close(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && speaking) { stop(); say(''); }
    });
    // A voice must never follow a reader out of the room.
    window.addEventListener('pagehide', stop);
    window.addEventListener('beforeunload', stop);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && speaking && !paused) {
        paused = true;
        try { window.speechSynthesis.pause(); } catch (err) {}
        setPlayLabel();
      }
    });
    // The Personalisation Centre can retire it mid-visit.
    document.addEventListener('sultan:personalisation-changed', function () {
      if (disabled()) { stop(); close(); trigger.hidden = true; }
      else trigger.hidden = false;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
