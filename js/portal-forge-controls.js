// Shared cockpit-style control widgets for the portal's 3D hero
// consoles (Certificate Forge, Registry Hall) — a swipeable toggle
// switch and a click/keyboard rotary dial. Written once here and
// imported by both scene files instead of duplicated, since both are
// already ES modules.
'use strict';

// A real switch (role="switch", keyboard-operable, click-toggle) whose
// thumb also tracks a pointer drag for a genuine swipe feel — the drag
// is an enhancement on top of the click/keyboard toggle, never a
// replacement for it. --pfc-thumb-frac is set from here alone (during
// a drag AND at rest) so the two never fight over the thumb's position.
export function makeSwitch(el, opts) {
  if (opts && opts.disabled) {
    el.disabled = true;
    el.setAttribute('aria-checked', 'false');
    el.style.setProperty('--pfc-thumb-frac', '0');
    var disabledStateEl = el.querySelector('.pfc-switch-state');
    if (disabledStateEl) disabledStateEl.textContent = (opts && opts.offLabel) || 'OFF';
    return { get checked() { return false; }, set: function () {} };
  }

  var checked = !!(opts && opts.initial);
  var track = el.querySelector('.pfc-switch-track');
  var stateEl = el.querySelector('.pfc-switch-state');
  var onLabel = (opts && opts.onLabel) || 'ON';
  var offLabel = (opts && opts.offLabel) || 'OFF';
  var dragging = false;

  function render() {
    el.setAttribute('aria-checked', String(checked));
    el.classList.toggle('is-on', checked);
    el.style.setProperty('--pfc-thumb-frac', checked ? '1' : '0');
    if (stateEl) stateEl.textContent = checked ? onLabel : offLabel;
  }
  function setChecked(v, fromUser) {
    var changed = checked !== v;
    checked = v;
    render();
    if (changed && fromUser && opts && opts.onChange) opts.onChange(checked);
  }
  render();

  el.addEventListener('click', function () {
    if (dragging) return; // the drag's pointerup already decided the state
    setChecked(!checked, true);
  });
  el.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setChecked(!checked, true); }
  });

  el.addEventListener('pointerdown', function (e) {
    if (!track || (e.button !== undefined && e.button > 0)) return;
    var startX = e.clientX, moved = false, trackWidth = track.clientWidth || 1;
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
    function onMove(ev) {
      var dx = ev.clientX - startX;
      if (Math.abs(dx) > 4 && !moved) { moved = true; dragging = true; el.classList.add('is-dragging'); }
      if (!moved) return;
      var frac = Math.max(0, Math.min(1, (checked ? 1 : 0) + dx / trackWidth));
      el.style.setProperty('--pfc-thumb-frac', String(frac));
    }
    function onUp(ev) {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      el.classList.remove('is-dragging');
      if (moved) {
        var dx = ev.clientX - startX;
        var frac = Math.max(0, Math.min(1, (checked ? 1 : 0) + dx / trackWidth));
        setChecked(frac >= 0.5, true);
      }
      // Defer clearing `dragging` so the click event this same
      // interaction fires (pointerup precedes click) sees it and
      // skips its own toggle.
      setTimeout(function () { dragging = false; }, 0);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  return {
    get checked() { return checked; },
    set: function (v) { setChecked(v, false); },
  };
}

// A rotary dial backed by a real (visually hidden but focusable)
// <input type="range">, so keyboard and assistive tech get a native
// slider; the visual face's needle and detents are pure decoration
// kept in sync with the input's value. Clicking the face advances to
// the next position, same action the arrow keys already offer.
export function makeDial(el, opts) {
  var input = el.querySelector('input[type="range"]');
  var needle = el.querySelector('.pfc-dial-needle');
  var labelEl = opts && opts.labelEl;
  var labels = (opts && opts.labels) || [];
  var angles = (opts && opts.angles) || [-42, 0, 42];
  var ticks = el.querySelectorAll('.pfc-dial-tick');

  function render() {
    var v = Number(input.value);
    if (needle) needle.style.transform = 'translateX(-50%) rotate(' + angles[v] + 'deg)';
    if (labelEl) labelEl.textContent = labels[v] || '';
    ticks.forEach(function (t, i) { t.classList.toggle('is-active', i === v); });
  }
  render();

  input.addEventListener('input', function () {
    render();
    if (opts && opts.onChange) opts.onChange(Number(input.value));
  });
  el.addEventListener('click', function (e) {
    if (e.target === input) return;
    var max = Number(input.max) || (labels.length - 1);
    input.value = String((Number(input.value) + 1) % (max + 1));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  return { get value() { return Number(input.value); } };
}
