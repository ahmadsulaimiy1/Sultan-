// Shared Digital Identity ID card renderer (SHRS Imperial Digital
// Campus Directive, Priority 2) — one component used on the student
// dashboard, guardian dashboard, and staff "My Identity" page, so the
// card looks and behaves identically everywhere it appears.
//
// Deliberately built only from fields the *me.js endpoints actually
// return (identityNo, fullName, a role/subtitle line, a status word).
// No photo — a monogram, matching the Faculty Directory's fc-mono
// convention — and no fabricated fields (house, blood group, digital
// wallet number, library/transport/hostel status): those systems don't
// exist yet, so nothing here pretends they do (see
// docs/digital-identity-system.md).
(function (global) {
  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // opts: { kind, fullName, identityNo, roleLabel, subtitle, status,
  // emptyText, details: [{label, value}, ...] } — `details` is an
  // open-ended list of extra real fields (admission date, academic
  // session, department, linked children, relationship, etc.); entries
  // with no value are skipped rather than shown as "—", since an empty
  // dash on an ID card reads as a missing/broken field, not an
  // intentionally omitted one.
  function render(container, opts) {
    if (!container) return;
    opts = opts || {};
    if (!opts.identityNo) {
      container.innerHTML = '<p class="identity-empty">' +
        esc(opts.emptyText || 'Your digital ID card is being prepared — check back after your next sign-in.') +
        '</p>';
      return;
    }
    var qrSrc = '/api/identity/qr?id=' + encodeURIComponent(opts.identityNo);
    var verifyHref = '/verify-identity/?id=' + encodeURIComponent(opts.identityNo);
    var details = (opts.details || []).filter(function (d) { return d && d.value; });
    var detailsHtml = details.length
      ? '<div class="id-card-details">' + details.map(function (d) {
          return '<div class="id-card-detail"><span class="k">' + esc(d.label) + '</span><span class="v">' + esc(d.value) + '</span></div>';
        }).join('') + '</div>'
      : '';
    var roleClass = opts.kind === 'guardian' ? ' role-guardian' : opts.kind === 'staff' ? ' role-staff' : opts.kind === 'founder' ? ' role-founder' : '';
    container.innerHTML =
      '<div class="id-card' + roleClass + '" data-id-card-kind="' + esc(opts.kind || '') + '">' +
        '<div class="id-card-body">' +
          '<div class="id-card-mono">' + esc(initials(opts.fullName)) + '</div>' +
          '<div class="id-card-info">' +
            (opts.roleLabel ? '<div class="id-card-role">' + esc(opts.roleLabel) + '</div>' : '') +
            '<div class="id-card-name">' + esc(opts.fullName) + '</div>' +
            (opts.subtitle ? '<div class="id-card-subtitle">' + esc(opts.subtitle) + '</div>' : '') +
            '<div class="id-card-no">' + esc(opts.identityNo) + '</div>' +
          '</div>' +
          '<img class="id-card-qr" src="' + qrSrc + '" alt="Identity verification QR code" width="72" height="72" />' +
        '</div>' +
        detailsHtml +
        '<div class="id-card-footer">' +
          '<span>Sultan Hanafi Royal Schools' + (opts.status ? ' &middot; ' + esc(opts.status) : '') + '</span>' +
          '<a href="' + verifyHref + '" target="_blank" rel="noopener">Verify &rarr;</a>' +
        '</div>' +
      '</div>';
  }

  global.SHRSIdCard = { render: render };
})(window);
