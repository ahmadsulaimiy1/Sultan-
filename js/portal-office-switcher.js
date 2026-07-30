// Executive Portal Access — the office/role switcher every staff
// session page can mount via <div id="office-switcher-mount"></div> in
// its topbar. Built entirely from the real data functions/api/portal/
// staff/me.js already returns (myOffices from office_appointments,
// roles[] from staff_roles) — no fabricated "executive tier," no
// separate login. A user who holds several real seats/roles sees all
// of them and can jump between them without signing out again, which
// is the actual substance behind "switch office without logging out":
// it was never really about auth, it's about surfacing data that
// already existed but had nowhere to render.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', init);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function init() {
    var mount = document.getElementById('office-switcher-mount');
    if (!mount) return;
    fetch('/api/portal/staff/me', { headers: { accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) { if (data) render(mount, data); })
      .catch(function () {});
  }

  // Deep, purpose-built operational UIs that exist alongside the
  // generic office portal for the same office — surfaced here so
  // landing on the generic page doesn't strand someone who actually
  // needs the real tool. Extend this list as more get built (see
  // docs/institutional-portal-architecture.md's "not yet built" list).
  var DEEP_LINKS_BY_SLUG = {
    registrar: { label: "Registrar Operations", href: '/portal/staff/registrar/' },
    finance: { label: 'Finance Operations', href: '/portal/staff/finance/' },
    admissions: { label: 'Admissions Review Centre', href: '/portal/staff/admissions/' },
    'digital-services': { label: 'Digital Identity Tools', href: '/portal/staff/identity/' },
  };

  function render(mount, data) {
    var surfaces = [];
    var seen = {};
    function add(label, sub, href) {
      if (seen[href]) return;
      seen[href] = true;
      surfaces.push({ label: label, sub: sub || '', href: href });
    }

    (data.myOffices || []).forEach(function (o) {
      add(o.name, o.appointmentTitle + (o.isActing ? ' (Acting)' : ''), '/portal/office/' + o.slug + '/');
      var deep = DEEP_LINKS_BY_SLUG[o.slug];
      if (deep) add(deep.label, 'Operational tools for ' + o.name, deep.href);
    });

    var hasExe = (data.roles || []).some(function (r) { return r.roleCode === 'EXE'; });
    if (hasExe) add('Founder Dashboard', 'Institution-wide analytics', '/portal/founder/');

    // Safeguarding is a Matrix-wide role grant (DSL), not an office
    // appointment — surfaced by role code, same as the EXE check above,
    // since it has no office_appointments seat to drive the loop over
    // myOffices.
    var hasDsl = (data.roles || []).some(function (r) { return r.roleCode === 'DSL'; });
    if (hasDsl) add('Safeguarding Intelligence', 'Designated Safeguarding Lead', '/portal/staff/safeguarding/');

    var myOfficeNames = {};
    (data.myOffices || []).forEach(function (o) { myOfficeNames[o.name] = true; });
    (data.roles || []).forEach(function (r) {
      // Only surface this when the role's office has no matching myOffices
      // entry — i.e. a real role grant that predates (or stands apart
      // from) an actual appointment seat. Once a seat exists, myOffices
      // already covers it above; showing both would just be the same
      // office twice with a misleading "no seat on file" label.
      if (r.office && !myOfficeNames[r.office.name]) {
        add(r.office.name, r.roleName + ' (role grant, no seat on file)', '/portal/staff/offices/');
      }
    });

    if (!surfaces.length) { mount.hidden = true; return; }

    var current = surfaces.filter(function (s) { return window.location.pathname.indexOf(s.href) === 0; })[0];
    var currentLabel = current ? current.label : ((data.staff && (data.staff.preferredName || data.staff.fullName)) || 'My Offices');

    mount.innerHTML =
      '<div class="office-switcher">'
      + '<button type="button" class="office-switcher-toggle" aria-expanded="false">' + esc(currentLabel) + ' <span class="osw-caret">&#9662;</span></button>'
      + '<div class="office-switcher-menu" hidden>'
      + '<div class="osw-heading">My Offices &amp; Roles</div>'
      + surfaces.map(function (s) {
          return '<a class="osw-item' + (s === current ? ' is-current' : '') + '" href="' + esc(s.href) + '">'
            + '<span class="osw-item-label">' + esc(s.label) + '</span>'
            + (s.sub ? '<span class="osw-item-sub">' + esc(s.sub) + '</span>' : '')
            + '</a>';
        }).join('')
      + '</div></div>';

    var toggle = mount.querySelector('.office-switcher-toggle');
    var menu = mount.querySelector('.office-switcher-menu');
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !menu.hidden;
      menu.hidden = open;
      toggle.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('click', function (e) {
      if (!mount.contains(e.target)) { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
    });
    mount.hidden = false;
  }
})();
