/* ===================================================================
   SHRS Digital Credential — interaction
   -------------------------------------------------------------------
   Gives the CSS card its behaviour: it turns on its own, can be caught
   and spun by hand, flips on command, and — when a verification comes
   back from the school's own record — stops being decorative and takes
   that record's data.

   The card never asserts anything on its own. It only ever mirrors what
   the live verification result already says, so it cannot show a
   credential as genuine that the endpoint has not confirmed.
   =================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.idc').forEach(function (card) {
    var ry = 0, rx = 8, dragging = false, lastX = 0, lastY = 0, resume = null, raf = null;

    function paint() {
      raf = null;
      card.style.setProperty('--idc-ry', ry.toFixed(1) + 'deg');
      card.style.setProperty('--idc-rx', rx.toFixed(1) + 'deg');
      // the foil is lit from a fixed source, so its angle must answer to
      // the card's rotation rather than staying put
      card.style.setProperty('--idc-foil', (105 + ry * 0.9).toFixed(0) + 'deg');
    }
    function schedule() { if (raf === null) raf = requestAnimationFrame(paint); }

    function start(e) {
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      card.classList.add('is-held', 'is-manual');
      if (resume) { clearTimeout(resume); resume = null; }
      if (card.setPointerCapture && e.pointerId !== undefined) {
        try { card.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }
    function move(e) {
      if (!dragging) return;
      ry += (e.clientX - lastX) * 0.45;
      rx = Math.max(-22, Math.min(22, rx - (e.clientY - lastY) * 0.22));
      lastX = e.clientX; lastY = e.clientY;
      schedule();
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      card.classList.remove('is-held');
      // hand the card back to its own rotation, from wherever it was left
      if (!reduce) {
        resume = setTimeout(function () {
          card.style.removeProperty('--idc-ry');
          card.style.removeProperty('--idc-rx');
          card.classList.remove('is-manual');
          ry = 0; rx = 8;
        }, 2600);
      }
    }

    card.addEventListener('pointerdown', start);
    card.addEventListener('pointermove', move, { passive: true });
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('pointerleave', end);

    // keyboard: the card is a figure, not a control, but arrow keys should
    // still turn it for anyone who cannot drag
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 30 : 12;
      if (e.key === 'ArrowLeft')      { ry -= step; }
      else if (e.key === 'ArrowRight'){ ry += step; }
      else if (e.key === 'ArrowUp')   { rx = Math.max(-22, rx - 6); }
      else if (e.key === 'ArrowDown') { rx = Math.min(22, rx + 6); }
      else return;
      e.preventDefault();
      card.classList.add('is-manual');
      schedule();
    });

    // flip control
    var flip = document.querySelector('[data-idc-flip]');
    if (flip) {
      flip.addEventListener('click', function () {
        card.classList.add('is-manual');
        ry += 180;
        schedule();
        if (resume) clearTimeout(resume);
        if (!reduce) {
          resume = setTimeout(function () {
            card.style.removeProperty('--idc-ry');
            card.style.removeProperty('--idc-rx');
            card.classList.remove('is-manual');
            ry = 0; rx = 8;
          }, 6000);
        }
      });
    }
  });

  /* ---- mirror a live verification onto the card ----
     The result panel is rendered by js/identity-verify.js from the
     school's endpoint. We read what it printed rather than calling the
     endpoint again, so the card can never disagree with the verdict
     shown beneath it. */
  var result = document.querySelector('[data-identity-verify-result]');
  var card = document.querySelector('.idc');
  if (!result || !card) return;

  function textOfField(label) {
    var fields = result.querySelectorAll('.cert-verify-field');
    for (var i = 0; i < fields.length; i++) {
      var k = fields[i].querySelector('.k'), v = fields[i].querySelector('.v');
      if (k && v && k.textContent.toLowerCase().indexOf(label) !== -1) return v.textContent.trim();
    }
    return '';
  }
  function setField(sel, value) {
    var el = card.querySelector(sel);
    if (el && value) el.textContent = value;
  }

  new MutationObserver(function () {
    var name   = textOfField('name');
    var idNo   = textOfField('identity');
    var status = textOfField('status');
    if (!name && !idNo && !status) return;

    setField('[data-idc-name]', name);
    setField('[data-idc-no]', idNo);
    setField('[data-idc-status]', status);

    // Whitelist, deliberately: only an explicitly active record turns the
    // card green. Anything unrecognised stays neutral rather than
    // inheriting the reassuring state.
    var s = (status || '').toLowerCase();
    card.classList.remove('is-live', 'is-revoked');
    if (/\bactive\b|\bgenuine\b|\bvalid\b/.test(s)) card.classList.add('is-live');
    else if (/revok|expir|invalid|tamper/.test(s)) card.classList.add('is-revoked');
  }).observe(result, { childList: true, subtree: true });
})();
