// Royal Institutional Command Shell — the persistent chrome every
// portal page (all real dashboards, offices, and auth screens) now
// carries, per the Founder & CEO's "Institutional Command Shell"
// directive. Deliberately narrow scope, honestly:
//
// Built now (this file): a real Calendar quick-link in the topbar
// (the public Academic Calendar already exists and is real), and a
// standing footer bar (institution seal, the three real verification
// flows, a computed current academic year, copyright, the real
// Data Protection & Privacy Policy anchor, real admissions contact
// channels, and a system version string).
//
// Deliberately NOT built here, rather than shipped as inert decoration:
// a Global Search across portal data (no cross-portal search backend
// exists yet — building one is a real, separate project, not a topbar
// icon), and a single unified Notifications/Messages bell (both
// concepts already exist today in different, role-specific forms —
// the guardian dashboard's own notifications panel, the Institutional
// Messaging system's per-office inbox — and unifying them into one
// header control needs each of those existing surfaces audited first,
// not guessed at from outside). Sign-out and the Office Switcher
// already exist per-page (js/portal-office-switcher.js,
// [data-office-logout]/[data-founder-clear]) and are left untouched —
// this file adds to the shell, it doesn't replace what's already real.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    addCalendarLink();
    addFooter();
  });

  function addCalendarLink() {
    var topbar = document.querySelector('.portal-topbar');
    if (!topbar || topbar.querySelector('.portal-topbar-calendar')) return;
    var isRtl = document.documentElement.getAttribute('dir') === 'rtl';
    var a = document.createElement('a');
    a.className = 'portal-topbar-calendar';
    a.href = isRtl ? '/ar/academic-calendar/' : '/academic-calendar/';
    a.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>'
      + '<path d="M3.5 9.5h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
      + '<span>' + (isRtl ? 'التقويم الأكاديمي' : 'Academic Calendar') + '</span>';
    topbar.appendChild(a);
  }

  function computeAcademicYear() {
    var now = new Date();
    var y = now.getFullYear();
    // This institution's real school-year boundary is August (the
    // graduation ceremony that closes a year falls in early August) —
    // not an arbitrary calendar-year default.
    return now.getMonth() + 1 >= 8 ? (y + '/' + (y + 1)) : ((y - 1) + '/' + y);
  }

  function addFooter() {
    if (document.querySelector('.portal-shell-footer')) return;
    var main = document.querySelector('main');
    var isRtl = document.documentElement.getAttribute('dir') === 'rtl';
    var footer = document.createElement('footer');
    footer.className = 'portal-shell-footer';
    footer.innerHTML =
      '<img class="portal-shell-footer-seal" src="/assets/images/brand-mark.png" alt="" aria-hidden="true" />'
      + '<div class="portal-shell-footer-links">'
      + '<a href="/verify-certificate/">' + (isRtl ? 'التحقق من شهادة' : 'Verify Certificate') + '</a>'
      + '<a href="/verify-identity/">' + (isRtl ? 'التحقق من الهوية' : 'Verify Identity') + '</a>'
      + '<a href="/verify-receipt/">' + (isRtl ? 'التحقق من إيصال' : 'Verify Receipt') + '</a>'
      + '<a href="/policies/#policy-IT-02">' + (isRtl ? 'إشعار حماية البيانات' : 'Data Protection Notice') + '</a>'
      + '</div>'
      + '<div class="portal-shell-footer-meta">'
      + '<span>' + (isRtl ? 'العام الأكاديمي ' : 'Academic Year ') + computeAcademicYear() + '</span>'
      + '<span>&copy; ' + new Date().getFullYear() + ' Sultan Hanafi Royal Schools</span>'
      + '<span>' + (isRtl ? 'واتساب/هاتف: ' : 'WhatsApp/Phone: ') + '<a href="tel:+2348073747650" style="color:inherit;">+234 807 374 7650</a></span>'
      + '<span>SHRS Digital Campus v1.0.0</span>'
      + '</div>';
    if (main) main.insertAdjacentElement('afterend', footer);
    else document.body.appendChild(footer);
  }
})();
