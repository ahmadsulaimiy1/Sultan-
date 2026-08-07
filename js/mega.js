/* ===================================================================
   THE RIBBON, OPENED
   -------------------------------------------------------------------
   The eight plates across the masthead were eight links. Everything
   under them — the sub-sections, their one-line descriptions, the
   featured callout for each — already existed, but only inside the
   full-menu drawer, two clicks away and behind a panel that covers the
   page.

   This puts that index under the ribbon itself. Addressing a plate
   opens a panel beneath it carrying that section's own children, and
   the plate keeps a lit edge while its panel is open, so the masthead
   reads as the institution's index rather than as a toolbar.

   Nothing is duplicated. The panels are cloned from the drawer's own
   markup at the moment they are first opened, so there is one source
   for the navigation in every language and it cannot drift.

   Four rules govern it.

   1. It never traps. Escape closes it and returns the focus to the
      plate; a press outside closes it; scrolling closes it.
   2. It never opens by accident. A pointer must rest on a plate for a
      moment before it opens, and leaving the whole region closes it
      after a grace period long enough to cross the gap between the
      plate and its panel.
   3. It never covers the page on a phone. Below the width at which the
      ribbon becomes a row, none of this is built and the drawer
      remains the way through — which is right on a small screen.
   4. It never takes the link away. Every plate is still a link to its
      own section; opening the panel is what hovering does, not what
      clicking does.
   =================================================================== */
(function () {
  'use strict';

  var MIN_WIDTH = 861;      // the width at which the ribbon becomes a row
  var OPEN_DELAY = 130;     // rest this long on a plate before it opens
  var CLOSE_DELAY = 220;    // grace to cross from the plate to the panel

  var ribbon = document.querySelector('.mobile-nav-ribbon');
  var drawer = document.querySelector('.navlinks');
  if (!ribbon || !drawer) return;

  var mq = window.matchMedia('(min-width:' + MIN_WIDTH + 'px)');
  var mega, current = null, openTimer = null, closeTimer = null;
  var built = false;
  // Escape closes the panel and gives the focus back to the plate it came
  // from. Focusing the plate is itself one of the ways the panel opens, so
  // without this the panel would close and reopen in the same tick and
  // Escape would appear to do nothing at all.
  var returningFocus = false;

  // Each plate is matched to the drawer entry with the same destination,
  // so the mapping is the markup's own and survives a nav rewrite.
  function panelFor(tile) {
    var href = tile.getAttribute('href');
    if (!href) return null;
    var trigger = drawer.querySelector('.nav-drop-trigger[href="' + href + '"]');
    if (!trigger) return null;
    var drop = trigger.closest('.nav-drop');
    return drop ? drop.querySelector('.nav-drop-panel') : null;
  }

  function build() {
    if (built) return;
    built = true;
    mega = document.createElement('div');
    mega.className = 'mh-mega';
    mega.setAttribute('role', 'region');
    mega.hidden = true;
    mega.innerHTML = '<div class="mh-mega-inner"></div>';
    ribbon.insertAdjacentElement('afterend', mega);

    mega.addEventListener('pointerenter', function () { clearTimeout(closeTimer); });
    mega.addEventListener('pointerleave', scheduleClose);
    mega.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { var t = current; close(); giveBack(t); }
    });
  }

  function open(tile) {
    var source = panelFor(tile);
    if (!source) { close(); return; }
    build();
    clearTimeout(closeTimer);
    if (current === tile && !mega.hidden) return;

    var inner = mega.querySelector('.mh-mega-inner');
    inner.innerHTML = '';
    // A clone, so the drawer keeps its own copy intact and nothing in
    // here can be left in a state the drawer then inherits.
    var clone = source.cloneNode(true);
    clone.removeAttribute('class');
    clone.className = 'mh-mega-body';
    clone.removeAttribute('hidden');
    inner.appendChild(clone);

    Array.prototype.forEach.call(ribbon.children, function (el) {
      el.classList.toggle('is-open', el === tile);
    });
    current = tile;
    mega.hidden = false;
    mega.setAttribute('aria-label', (tile.textContent || '').trim());
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { mega.classList.add('is-open'); });
    });
  }

  function close() {
    if (!mega || mega.hidden) { current = null; return; }
    mega.classList.remove('is-open');
    Array.prototype.forEach.call(ribbon.children, function (el) { el.classList.remove('is-open'); });
    current = null;
    window.setTimeout(function () {
      if (!mega.classList.contains('is-open')) {
        mega.hidden = true;
        var inner = mega.querySelector('.mh-mega-inner');
        if (inner) inner.innerHTML = '';
      }
    }, 320);
  }

  function giveBack(tile) {
    if (!tile) return;
    returningFocus = true;
    try { tile.focus({ preventScroll: true }); } catch (e) { tile.focus(); }
    window.setTimeout(function () { returningFocus = false; }, 0);
  }

  function scheduleClose() {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(close, CLOSE_DELAY);
  }

  function attach() {
    Array.prototype.forEach.call(ribbon.children, function (tile) {
      if (tile.hasAttribute('data-mega-bound')) return;
      tile.setAttribute('data-mega-bound', '');
      if (!panelFor(tile)) return;

      tile.addEventListener('pointerenter', function () {
        if (!mq.matches) return;
        clearTimeout(closeTimer);
        clearTimeout(openTimer);
        openTimer = window.setTimeout(function () { open(tile); }, OPEN_DELAY);
      });
      tile.addEventListener('pointerleave', function () {
        clearTimeout(openTimer);
        scheduleClose();
      });
      tile.addEventListener('focus', function () {
        if (!mq.matches || returningFocus) return;
        clearTimeout(closeTimer);
        open(tile);
      });
      tile.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowDown' && current === tile && mega && !mega.hidden) {
          var first = mega.querySelector('a,button');
          if (first) { e.preventDefault(); first.focus(); }
        }
      });
    });
  }

  attach();

  document.addEventListener('pointerdown', function (e) {
    if (!mega || mega.hidden) return;
    if (mega.contains(e.target) || ribbon.contains(e.target)) return;
    close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mega && !mega.hidden) {
      var t = current; close(); giveBack(t);
    }
  });
  // Reading is not browsing: the first scroll puts it away.
  window.addEventListener('scroll', function () {
    if (mega && !mega.hidden) close();
  }, { passive: true });
  // Below the row width the drawer is the way through, and anything
  // already open belongs to a layout that no longer exists.
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () {
    if (!mq.matches) close();
  });
})();
