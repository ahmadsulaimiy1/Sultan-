// Organisational Chart Engine — renders the real office hierarchy
// returned by /api/portal/staff/org-chart.js as a collapsible tree.
// Only offices with a real, already-published reporting line (see
// that endpoint's comments) are nested; every other office renders in
// an honest "reporting line not yet documented" section instead of a
// guessed position in the tree. No chart library — pure CSS
// connectors + native <details> semantics for collapse state.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', init);

  var LAYER_LABELS = {
    governance: 'Governance', academic: 'Academic', school_leadership: 'School Leadership',
    operational: 'Operational', institutional_services: 'Institutional Services',
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var lastData = null;

  function init() {
    load();
    var expandBtn = document.getElementById('oc-expand-all');
    var collapseBtn = document.getElementById('oc-collapse-all');
    var printBtn = document.getElementById('oc-print');
    var exportBtn = document.getElementById('oc-export-json');
    if (expandBtn) expandBtn.addEventListener('click', function () { setAllCollapsed(false); });
    if (collapseBtn) collapseBtn.addEventListener('click', function () { setAllCollapsed(true); });
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
    if (exportBtn) exportBtn.addEventListener('click', exportJson);
  }

  function load() {
    var errorEl = document.getElementById('oc-error');
    var shellEl = document.getElementById('oc-shell');
    fetch('/api/portal/staff/org-chart', { headers: { accept: 'application/json' } })
      .then(function (res) {
        if (res.status === 401) { window.location.href = '/portal/staff/login/'; return null; }
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        if (!r) return;
        if (!r.ok) throw new Error(r.data.error || 'Could not load the organisational chart.');
        lastData = r.data;
        render(r.data);
        if (shellEl) shellEl.hidden = false;
      })
      .catch(function (err) {
        if (errorEl) { errorEl.hidden = false; errorEl.querySelector('[data-error-message]').textContent = err.message; }
      });
  }

  function render(data) {
    var boardIndex = data.roots.findIndex(function (r) { return r.slug === 'board-of-trustees'; });
    var board = boardIndex >= 0 ? data.roots[boardIndex] : null;
    var others = data.roots.filter(function (r, i) { return i !== boardIndex; });

    var treeEl = document.getElementById('oc-tree');
    if (treeEl) {
      treeEl.innerHTML = board ? '<ul class="orgchart-tree">' + nodeLi(board) + '</ul>'
        : '<div class="portal-empty">No governance root office found.</div>';
    }

    var otherEl = document.getElementById('oc-other-list');
    var otherSection = document.getElementById('oc-other-section');
    if (otherEl && otherSection) {
      if (!others.length) { otherSection.hidden = true; }
      else {
        otherSection.hidden = false;
        var byLayer = {};
        others.forEach(function (o) { (byLayer[o.layer] = byLayer[o.layer] || []).push(o); });
        otherEl.innerHTML = Object.keys(byLayer).map(function (layerKey) {
          var cards = byLayer[layerKey].map(cardHtml).join('');
          return '<div class="office-index-layer"><h3>' + esc(LAYER_LABELS[layerKey] || layerKey) + '</h3>'
            + '<div class="orgchart-other-grid">' + cards + '</div></div>';
        }).join('');
      }
    }

    setText('oc-total-offices', String(data.totalOffices));
  }

  // Cards for leaf nodes are real links (<a>) straight to the office
  // portal. Cards for nodes with children can't also be a toggle
  // button — <a>/<button> can't validly nest another interactive
  // element — so those render as a non-link, clickable card (toggles
  // collapse) plus a small explicit "View Office" link that stops
  // propagation so it navigates instead of toggling.
  function cardHtml(node, asToggle) {
    var vacant = !node.primarySeat || !node.primarySeat.holderName;
    var holderLine = node.primarySeat
      ? (vacant ? 'Vacant — Awaiting Appointment' : esc(node.primarySeat.holderName))
      : 'No seat recorded';
    var meta = node.staffCount + ' staff' + (node.children && node.children.length ? ' &middot; ' + node.children.length + ' reports' : '');
    var inner = '<div class="oc-name">' + esc(node.name) + '</div>'
      + '<div class="oc-holder' + (vacant ? ' is-vacant' : '') + '">' + holderLine + '</div>'
      + '<div class="oc-meta">' + meta + '</div>';
    if (asToggle) {
      inner += '<a class="oc-view-link" href="/portal/office/' + esc(node.slug) + '/" data-oc-view-link>View Office &rarr;</a>';
      return '<div class="orgchart-card' + (vacant ? ' is-vacant' : '') + ' orgchart-node-toggle" role="button" tabindex="0" aria-expanded="true">' + inner + '</div>';
    }
    return '<a class="orgchart-card' + (vacant ? ' is-vacant' : '') + '" href="/portal/office/' + esc(node.slug) + '/">' + inner + '</a>';
  }

  function nodeLi(node) {
    var hasChildren = node.children && node.children.length;
    var card = cardHtml(node, hasChildren);
    var childrenHtml = hasChildren
      ? '<ul class="orgchart-children">' + node.children.map(nodeLi).join('') + '</ul>'
      : '';
    return '<li data-node-id="' + node.id + '">' + card + childrenHtml + '</li>';
  }

  // Delegate toggle clicks (tree is re-rendered wholesale, so bind once on the container)
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-oc-view-link]')) return; // let the nav link through
    var toggle = e.target.closest && e.target.closest('.orgchart-node-toggle');
    if (!toggle) return;
    e.preventDefault();
    toggleNode(toggle);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var toggle = e.target.closest && e.target.closest('.orgchart-node-toggle');
    if (!toggle) return;
    e.preventDefault();
    toggleNode(toggle);
  });
  function toggleNode(toggle) {
    var li = toggle.closest('li');
    var childrenUl = li && li.querySelector(':scope > .orgchart-children');
    if (!childrenUl) return;
    var collapsed = childrenUl.style.display === 'none';
    childrenUl.style.display = collapsed ? '' : 'none';
    toggle.setAttribute('aria-expanded', String(collapsed));
  }

  function setAllCollapsed(collapsed) {
    document.querySelectorAll('.orgchart-children').forEach(function (ul) {
      ul.style.display = collapsed ? 'none' : '';
    });
    document.querySelectorAll('.orgchart-node-toggle').forEach(function (btn) {
      btn.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  function exportJson() {
    if (!lastData) return;
    var blob = new Blob([JSON.stringify(lastData, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'shrs-org-chart.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
