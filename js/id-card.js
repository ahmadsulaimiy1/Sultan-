// Digital Identity System — the shared Digital ID Card component
// (SHRS Imperial Digital Campus Directive, Priority 2; rebuilt under the
// "Digital Identity System — Imperial Prestige Directive"). One renderer
// used by the student, guardian, staff, and (Founder & CEO) dashboards —
// same navy/gold institutional card language, real CSS 3D geometry
// instead of a flat rectangle: a front face (identity/QR/monogram) and a
// back face (verification QR, contact/role detail, terms), joined at a
// real edge, auto-rotating slowly between them and drag/tilt-interactive.
// Monogram instead of a fabricated photo, matching the Faculty
// Directory's fc-mono convention. Never invents a field: an unset detail
// is simply omitted, never replaced with a placeholder.
(function (global) {
  function initials(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var REDUCED_MOTION = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Institutional Identity Number labelling (SHRS Master Identity
  // Architecture Directive) — the Founder & CEO's card calls it an
  // Executive Credential Number; every other staff card calls it an
  // Institutional Identity Number. Student/guardian numbers weren't
  // addressed by that directive, so they keep the existing generic
  // label rather than being renamed unprompted.
  var IDNO_LABEL_BY_KIND = {
    founder: 'Executive Credential Number',
    staff: 'Institutional Identity Number',
  };

  function detailsHtml(details) {
    var rows = (details || []).filter(function (d) { return d && d.value; });
    if (!rows.length) return '';
    return '<div class="id-card-details">' + rows.map(function (d) {
      return '<div class="id-card-detail"><span class="k">' + esc(d.label) + '</span><span class="v">' + esc(d.value) + '</span></div>';
    }).join('') + '</div>';
  }

  // opts: { kind, themeKey, fullName, identityNo, roleLabel, subtitle,
  // status, emptyText, details: [{label, value}, ...] } — `details` is
  // an open-ended list of extra real fields; entries with no value are
  // skipped rather than shown as "—". `themeKey` picks the card's colour
  // scheme and defaults from `kind` when the caller doesn't supply a
  // more specific one (e.g. a staff member in the Registrar's Office).
  function render(container, opts) {
    if (!container) return;
    opts = opts || {};
    if (!opts.identityNo) {
      container.innerHTML = '<p class="identity-empty">' +
        esc(opts.emptyText || 'Your digital ID card is being prepared — check back after your next sign-in.') +
        '</p>';
      return;
    }

    var kind = opts.kind || 'student';
    var isFounder = kind === 'founder';
    var themeKey = opts.themeKey || (kind === 'guardian' ? 'parent' : kind);
    var qrSrc = '/api/identity/qr?id=' + encodeURIComponent(opts.identityNo);
    var verifyHref = '/verify-identity/?id=' + encodeURIComponent(opts.identityNo);
    var idnoLabel = IDNO_LABEL_BY_KIND[kind] || 'Identity Number';

    var frontHtml =
      '<div class="id-card-face id-card-front">' +
        (isFounder ? '<div class="id-card-crest-watermark" aria-hidden="true"></div>' : '') +
        '<div class="id-card-sheen" aria-hidden="true"></div>' +
        '<div class="id-card-face-body">' +
          '<div class="id-card-topline">' +
            '<span class="id-card-brand">Sultan Hanafi Royal Schools</span>' +
            (isFounder ? '<span class="id-card-founder-ribbon">Founder &amp; CEO</span>' : '') +
          '</div>' +
          '<div class="id-card-main">' +
            '<div class="id-card-mono"><span>' + esc(initials(opts.fullName)) + '</span></div>' +
            '<div class="id-card-info">' +
              (opts.roleLabel ? '<div class="id-card-role">' + esc(opts.roleLabel) + '</div>' : '') +
              '<div class="id-card-name">' + esc(opts.fullName) + '</div>' +
              (opts.subtitle ? '<div class="id-card-subtitle">' + esc(opts.subtitle) + '</div>' : '') +
            '</div>' +
          '</div>' +
          '<div class="id-card-idno-block">' +
            '<span class="id-card-idno-label">' + esc(idnoLabel) + '</span>' +
            '<span class="id-card-no">' + esc(opts.identityNo) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    var backHtml =
      '<div class="id-card-face id-card-back">' +
        '<div class="id-card-face-body">' +
          '<div class="id-card-qr-block">' +
            '<img class="id-card-qr" src="' + qrSrc + '" alt="Identity verification QR code" width="88" height="88" loading="lazy" />' +
            '<span class="id-card-qr-caption">Scan to verify</span>' +
          '</div>' +
          detailsHtml(opts.details) +
          (opts.status ? '<div class="id-card-status-line"><span class="k">Status</span><span class="v">' + esc(opts.status) + '</span></div>' : '') +
          (isFounder ? '<div class="id-card-signature" aria-hidden="true">Founder &amp; Chief Executive Officer</div>' : '') +
        '</div>' +
        '<div class="id-card-face-footer">' +
          '<span>Sultan Hanafi Royal Schools</span>' +
          '<a href="' + verifyHref + '" target="_blank" rel="noopener">Verify &rarr;</a>' +
        '</div>' +
      '</div>';

    container.innerHTML =
      '<div class="id-card-3d role-' + esc(kind) + ' theme-' + esc(themeKey) + '" data-id-card-kind="' + esc(kind) + '" tabindex="0" ' +
           'role="group" aria-label="' + esc(opts.fullName || 'Digital ID card') + ', double-tap or press Enter to flip">' +
        '<div class="id-card-inner">' + frontHtml + backHtml + '</div>' +
      '</div>';

    var stage = container.querySelector('.id-card-3d');
    var inner = container.querySelector('.id-card-inner');
    if (stage && inner) initInteraction(stage, inner);
  }

  // Real 3D mechanics, deliberately restrained per the directive's own
  // closing guidance ("cinematic elegance, not maximum movement"): a
  // slow continuous auto-rotation between the front and back faces (one
  // full turn roughly every 75 seconds — a luxury-watch-advert pace, not
  // a spin), pausable on hover, interruptible by drag/tilt, snapping
  // gently back to whichever face is nearest when released. Fully
  // disabled under prefers-reduced-motion, where the card stays flat on
  // its front face.
  function initInteraction(stage, inner) {
    if (REDUCED_MOTION) return;
    var angle = 0;
    var dragging = false;
    var paused = false;
    var startX = 0;
    var startAngle = 0;
    var AUTO_DEG_PER_MS = 360 / 75000;
    var lastTs = null;

    function apply() {
      inner.style.transform = 'rotateY(' + angle + 'deg)';
    }

    function frame(ts) {
      if (!document.body.contains(stage)) return; // this card was replaced/removed — stop looping
      if (lastTs == null) lastTs = ts;
      var dt = ts - lastTs;
      lastTs = ts;
      if (!dragging && !paused) {
        angle += AUTO_DEG_PER_MS * dt;
        apply();
      }
      requestAnimationFrame(frame);
    }

    function nearestFaceAngle(a) {
      var mod = ((a % 360) + 360) % 360;
      var nearFront = mod <= 90 || mod >= 270;
      return nearFront ? Math.round(a / 360) * 360 : Math.round((a - 180) / 360) * 360 + 180;
    }

    function snapTo(target) {
      stage.classList.add('is-snapping');
      angle = target;
      apply();
      setTimeout(function () { stage.classList.remove('is-snapping'); }, 480);
    }

    function onPointerDown(e) {
      dragging = true;
      stage.classList.add('is-dragging');
      startX = e.clientX;
      startAngle = angle;
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* unsupported — drag still works via move/up */ }
    }
    function onPointerMove(e) {
      if (!dragging) return;
      angle = startAngle + (e.clientX - startX) * 0.45;
      apply();
    }
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('is-dragging');
      try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* no-op */ }
      snapTo(nearestFaceAngle(angle));
    }

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('dblclick', function () { snapTo(angle + 180); });
    stage.addEventListener('pointerenter', function () { paused = true; stage.classList.add('is-hovering'); });
    stage.addEventListener('pointerleave', function () { if (!dragging) paused = false; stage.classList.remove('is-hovering'); });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { paused = true; snapTo(angle - 30); }
      else if (e.key === 'ArrowRight') { paused = true; snapTo(angle + 30); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); paused = true; snapTo(angle + 180); }
    });

    requestAnimationFrame(frame);
  }

  global.SHRSIdCard = { render: render };
})(window);
