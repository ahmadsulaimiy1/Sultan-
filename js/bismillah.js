/* ===================================================================
   بسم الله الرحمن الرحيم — the opening
   -------------------------------------------------------------------
   Plays the basmala once when a visitor arrives, with no player, no
   controls and nothing on screen.

   An honest note on timing, because it governs the whole design here:
   every modern browser refuses to let a page produce sound before the
   visitor has interacted with it. That rule cannot be worked around,
   and a site that tried would simply be muted. So the recitation is
   armed the moment the page loads and released on the very first
   gesture — a tap, a click, a key, a scroll, a touch — whichever comes
   first. In practice a visitor hears it as they begin to engage with
   the page rather than while it is still loading, which is also the
   more courteous moment for it.

   It plays once per browsing session (sessionStorage), never on a
   route the visitor is only passing back through, and never at all if
   they have silenced the interface sound. Failure is silent by design:
   if the audio file is absent or the browser still declines, nothing
   is logged at the visitor and nothing appears on screen.
   =================================================================== */
(function () {
  'use strict';

  var SRC = '/assets/audio/bismillah.mp3';
  var SESSION_KEY = 'shrsBasmalaPlayed';
  var SOUND_KEY = 'shrsSound';

  function silenced() {
    try { return localStorage.getItem(SOUND_KEY) === 'off'; } catch (e) { return false; }
  }
  function alreadyPlayed() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return true; }
  }
  function markPlayed() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  if (silenced() || alreadyPlayed()) return;

  var audio = new Audio(SRC);
  audio.preload = 'auto';
  audio.volume = 0.55;
  // Never rendered, never focusable, never announced.
  audio.setAttribute('aria-hidden', 'true');

  var fired = false;
  var EVENTS = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];

  function release() {
    if (fired) return;
    fired = true;
    EVENTS.forEach(function (ev) {
      window.removeEventListener(ev, release, true);
    });
    if (silenced()) return;
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(markPlayed).catch(function () {
        // Declined, or the file is not present. Both are fine — the page
        // simply stays quiet.
      });
    } else {
      markPlayed();
    }
  }

  EVENTS.forEach(function (ev) {
    window.addEventListener(ev, release, { capture: true, passive: true, once: false });
  });
})();
