/* ===================================================================
   The spoken introduction
   -------------------------------------------------------------------
   Plays the school's recorded introduction once when a visitor arrives.
   No player, no controls, nothing on screen.

   Two things govern the design.

   First, timing. Every modern browser refuses to let a page produce
   sound before the visitor has interacted with it. That rule cannot be
   worked around. So the recording is armed at load and released on the
   very first gesture — tap, click, key, scroll, touch — whichever comes
   first. A visitor hears it as they begin to engage with the page,
   which is also the more courteous moment for it.

   Second, length. This is a forty-second introduction rather than a
   two-second chime, so it must always be escapable: the interface sound
   toggle stops it mid-sentence with a short fade, it pauses when the tab
   loses focus and resumes when it returns, and it plays once per
   browsing session rather than on every page.

   Failure is silent by design. If the files are missing or the browser
   still declines, nothing is logged at the visitor and nothing appears.
   =================================================================== */
(function () {
  'use strict';

  var SOURCES = [
    { src: '/assets/audio/sultan-intro.m4a', type: 'audio/mp4' },
    { src: '/assets/audio/sultan-intro.mp3', type: 'audio/mpeg' }
  ];
  var SESSION_KEY = 'shrsIntroPlayed';
  var SOUND_KEY = 'shrsSound';
  var VOICE_KEY = 'shrsIntroVoice';   // the introduction's own switch
  var VOLUME = 0.62;

  // The introduction has its own preference now, so a visitor who wants
  // the interface quiet does not thereby lose the school's voice, and a
  // visitor who wants the voice off keeps the rest. Either being off
  // silences it; both must be on for it to speak.
  function silenced() {
    try {
      if (localStorage.getItem(VOICE_KEY) === 'off') return true;
      return localStorage.getItem(SOUND_KEY) === 'off';
    } catch (e) { return false; }
  }
  function played() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return true; }
  }
  function markPlayed() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  var audio = document.createElement('audio');
  audio.preload = 'none';           // nothing is fetched until it is wanted
  audio.volume = VOLUME;
  audio.setAttribute('aria-hidden', 'true');
  SOURCES.forEach(function (s) {
    // let the browser pick the format it actually supports
    if (audio.canPlayType && !audio.canPlayType(s.type)) return;
    var el = document.createElement('source');
    el.src = s.src; el.type = s.type;
    audio.appendChild(el);
  });
  if (!audio.childNodes.length) return;

  var fired = false, stopped = false, fade = null;
  var EVENTS = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];

  function detach() {
    EVENTS.forEach(function (ev) { window.removeEventListener(ev, release, true); });
  }

  // A hard stop on a human voice is jarring; ease it out instead.
  function stop() {
    if (stopped) return;
    stopped = true;
    if (fade) clearInterval(fade);
    fade = setInterval(function () {
      audio.volume = Math.max(0, audio.volume - 0.06);
      if (audio.volume <= 0.01) {
        clearInterval(fade); fade = null;
        try { audio.pause(); audio.currentTime = 0; } catch (e) {}
      }
    }, 45);
  }

  function release(e) {
    if (fired) return;
    // A press inside the Personalisation Centre is not an arrival. It is
    // most often a press on the Centre's own play button, and letting it
    // count as the first gesture meant the recording started here and was
    // then immediately stopped by the button's own toggle — the voice
    // spoke for a quarter of a second and gave up.
    var t = e && e.target;
    if (t && t.closest && t.closest('[data-personalisation],[data-livery-prompt]')) return;
    fired = true;
    detach();
    if (silenced()) return;
    audio.preload = 'auto';
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(markPlayed).catch(function () { /* declined or absent — stay quiet */ });
    } else {
      markPlayed();
    }
  }

  // Arm the automatic release only if this is a first arrival and the
  // visitor has not silenced it. The recording itself stays built either
  // way, so the Personalisation Centre can play it on request.
  if (!silenced() && !played()) {
    EVENTS.forEach(function (ev) {
      window.addEventListener(ev, release, { capture: true, passive: true });
    });
  } else {
    detach();
  }

  // Played on request from the Personalisation Centre. A deliberate
  // press is a gesture, so it needs none of the arming above; it also
  // starts from the beginning and at full volume however the automatic
  // playing ended.
  function replay() {
    stopped = false; fired = true;
    if (fade) { clearInterval(fade); fade = null; }
    detach();
    audio.preload = 'auto';
    audio.volume = VOLUME;
    try { audio.currentTime = 0; } catch (e) {}
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      return p.then(function () { markPlayed(); return true; }).catch(function () { return false; });
    }
    markPlayed();
    return Promise.resolve(true);
  }

  // The Centre's own handle on the recording. Kept deliberately small:
  // play it, stop it, and say whether it is speaking.
  window.SHRS_INTRO = {
    play: replay,
    stop: stop,
    speaking: function () { return !audio.paused && !audio.ended; }
  };
  document.dispatchEvent(new CustomEvent('shrs:intro-ready'));

  // Silencing the interface silences this too, mid-sentence.
  window.addEventListener('shrs:sound-off', stop);
  window.addEventListener('shrs:intro-off', stop);
  window.addEventListener('pagehide', stop);

  // Courtesy: a voice should not keep talking into a tab nobody is looking at.
  document.addEventListener('visibilitychange', function () {
    if (stopped || !fired) return;
    if (document.hidden) { try { audio.pause(); } catch (e) {} }
    else if (!silenced()) { try { audio.play().catch(function () {}); } catch (e) {} }
  });
})();
