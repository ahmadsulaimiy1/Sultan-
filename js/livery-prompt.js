/* ===================================================================
   THE LIVERY INVITATION
   -------------------------------------------------------------------
   Shown once, on a first arrival, and never again once it has been
   answered either way. Three rules govern it:

   1. It waits. Nothing appears while a visitor is still reading the
      first screen; the invitation arrives after they have settled, not
      across the thing they came for.
   2. It is live. Moving across a swatch recolours the page underneath
      immediately, and moving away puts it back — the choice is made by
      seeing rather than by reading a label.
   3. It never traps. Escape, the scrim and the second button all close
      it, and closing it counts as an answer.

   It writes to the same preference store as the Personalisation Centre,
   so the two can never disagree.
   =================================================================== */
(function () {
  var KEY = 'shrsPersonalisation';
  var root = document.querySelector('[data-livery-prompt]');
  if (!root) return;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function save(patch) {
    var p = load();
    Object.keys(patch).forEach(function (k) { p[k] = patch[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('sultan:personalisation-changed', { detail: p }));
  }

  var prefs = load();
  // Answered before, or arriving with a livery already chosen: say nothing.
  if (prefs.liveryPromptSeen || (prefs.livery && prefs.livery !== 'pearl')) return;
  // A visitor who has told us they want less motion is not shown a
  // modal that fades in over their reading, either.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && prefs.motion === 'reduced') { save({ liveryPromptSeen: true }); return; }

  var html = document.documentElement;
  var grid = root.querySelector('[data-lvp-grid]');
  var chosen = prefs.livery || 'pearl';
  var settled = chosen;

  function paint(v) { html.setAttribute('data-pc-livery', v); }

  function open() {
    root.hidden = false;
    // Two frames, so the transition has a starting state to run from.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.add('is-open'); });
    });
    var first = grid.querySelector('button.is-active') || grid.querySelector('button');
    if (first) first.focus({ preventScroll: true });
    document.addEventListener('keydown', onKey);
  }
  function close(answer) {
    root.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    window.setTimeout(function () { root.hidden = true; }, 460);
    save({ livery: answer, liveryPromptSeen: true });
    paint(answer);
  }
  function onKey(e) {
    if (e.key === 'Escape') { close(settled); return; }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var btns = Array.prototype.slice.call(grid.querySelectorAll('button'));
    var i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    var next = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
    next.focus(); select(next);
  }

  function select(btn) {
    grid.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
    settled = btn.getAttribute('data-value');
    paint(settled);
  }

  grid.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (b) select(b);
  });
  // Preview on hover, and restore what was actually selected on leaving.
  grid.addEventListener('mouseover', function (e) {
    var b = e.target.closest('button'); if (b) paint(b.getAttribute('data-value'));
  });
  grid.addEventListener('mouseleave', function () { paint(settled); });
  grid.addEventListener('focusin', function (e) {
    var b = e.target.closest('button'); if (b) paint(b.getAttribute('data-value'));
  });

  root.querySelector('[data-lvp-accept]').addEventListener('click', function () { close(settled); });
  root.querySelector('[data-lvp-dismiss]').addEventListener('click', function () { close('pearl'); });
  root.querySelector('[data-lvp-scrim]').addEventListener('click', function () { close(settled); });

  /* IT NO LONGER LETS ITSELF IN. This waited eight seconds, or for a scroll
     past the fold, and then opened itself over the page behind a scrim. All
     three rules at the head of this file were written to make that intrusion
     polite — it waits, it previews live, it never traps — and all three are
     true, and it was still a panel a reader had to deal with before they
     could carry on reading, on an arrival, to answer a question they had not
     asked.

     The answer to "let me change how this looks" is a control, not an
     interruption. js/edition-toggle.js puts one in the masthead from the
     first paint, and the liveries themselves live in the Personalisation
     Centre, one tap away on every page.

     The panel is kept and everything it does still works — the swatches, the
     live preview, the keyboard walk — because it is a good way to choose a
     livery. It is reachable now rather than unavoidable: anything that wants
     it calls window.SHRSLiveryPrompt(). Nothing calls it on its own. */
  var fired = false;
  window.SHRSLiveryPrompt = function () {
    if (fired) return; fired = true;
    open();
  };
})();
