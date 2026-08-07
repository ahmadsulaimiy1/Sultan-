/* The Governance Library register.
   Two behaviours, both progressive: without this file the register is a
   complete, readable index of all twenty-five instruments, and every row
   is a working anchor into the instrument itself. With it, the register
   can be searched and filtered, and following a row opens the instrument
   it points to rather than leaving the reader at a collapsed heading. */
(function () {
  'use strict';

  function init() {
    var root = document.querySelector('[data-policy-library]');
    if (!root) return;

    var search = root.querySelector('[data-plib-search]');
    var chips = Array.prototype.slice.call(root.querySelectorAll('[data-plib-cat]'));
    var rows = Array.prototype.slice.call(root.querySelectorAll('[data-plib-item]'));
    var empty = root.querySelector('[data-plib-empty]');
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-plib-group]'));
    var cat = 'all';

    function apply() {
      var q = (search && search.value || '').trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (row) {
        var okCat = cat === 'all' || row.getAttribute('data-cat') === cat;
        var okQ = !q || row.getAttribute('data-text').indexOf(q) !== -1;
        var on = okCat && okQ;
        row.hidden = !on;
        if (on) shown += 1;
      });
      if (empty) empty.hidden = shown !== 0;
      // The instruments themselves follow the same filter, so the page a
      // reader scrolls through matches the register they just narrowed.
      groups.forEach(function (g) {
        g.hidden = !(cat === 'all' || g.getAttribute('data-plib-group') === cat);
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        cat = chip.getAttribute('data-plib-cat');
        chips.forEach(function (c) { c.classList.toggle('is-on', c === chip); });
        apply();
      });
    });

    if (search) search.addEventListener('input', apply);

    // Following a row opens the instrument rather than dropping the reader
    // onto a closed accordion head.
    rows.forEach(function (row) {
      row.addEventListener('click', function () {
        var id = row.getAttribute('href');
        if (!id || id.charAt(0) !== '#') return;
        var target = document.querySelector(id);
        if (!target) return;
        var head = target.querySelector('.policy-head');
        if (head && head.getAttribute('aria-expanded') !== 'true') head.click();
      });
    });

    // A direct link from elsewhere on the site (/policies/#policy-SD-04)
    // should also arrive with the instrument open.
    function openFromHash() {
      if (!location.hash) return;
      var target = document.querySelector(location.hash);
      if (!target || !target.classList.contains('policy')) return;
      var head = target.querySelector('.policy-head');
      if (head && head.getAttribute('aria-expanded') !== 'true') head.click();
    }
    window.addEventListener('hashchange', openFromHash);
    openFromHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
