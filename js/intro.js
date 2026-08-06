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
  var VOLUME = 0.62;

  function silenced() {
    try { return localStorage.getItem(SOUND_KEY) === 'off'; } catch (e) { return false; }
  }
  function played() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return true; }
  }
  function markPlayed() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  if (silenced() || played()) return;

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

  function release() {
    if (fired) return;
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

  EVENTS.forEach(function (ev) {
    window.addEventListener(ev, release, { capture: true, passive: true });
  });

  // Silencing the interface silences this too, mid-sentence.
  window.addEventListener('shrs:sound-off', stop);
  window.addEventListener('pagehide', stop);

  // Courtesy: a voice should not keep talking into a tab nobody is looking at.
  document.addEventListener('visibilitychange', function () {
    if (stopped || !fired) return;
    if (document.hidden) { try { audio.pause(); } catch (e) {} }
    else if (!silenced()) { try { audio.play().catch(function () {}); } catch (e) {} }
  });
})();
