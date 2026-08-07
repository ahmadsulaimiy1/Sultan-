/* ===================================================================
   THE SCHOOL, RIGHT NOW
   -------------------------------------------------------------------
   A live panel at the head of the colophon: the time in Ikorodu, and
   whether the offices are open at this moment.

   The hours are the ones published on the Contact page, to the clock,
   and they are the only source this reads:

     Monday – Wednesday   07:30 – 18:00
     Thursday & Friday    07:30 – 16:00
     Saturday & Sunday    09:00 – 15:00

   Two rules govern it.

   1. It states only what it knows. It reports the offices' published
      hours against the current time; it does not claim a member of
      staff is at the desk, and out of term the Contact page's own note
      about which offices remain staffed is the authority.
   2. It asks nobody anything. The time comes from the visitor's own
      device, converted to Lagos time by the browser's timezone
      database. Nothing is fetched and nothing is sent.

   Where Intl has no timezone support the panel removes itself rather
   than show a time that might be an hour out.
   =================================================================== */
(function () {
  'use strict';

  var panel = document.querySelector('[data-now-panel]');
  if (!panel) return;

  var ZONE = 'Africa/Lagos';
  var LANG = (document.documentElement.lang || 'en').toLowerCase();

  // Confirm the browser can actually do the conversion before showing
  // anything. A wrong time on an institution's own page is worse than
  // no time at all.
  try {
    new Intl.DateTimeFormat('en', { timeZone: ZONE }).format(new Date());
  } catch (e) { panel.remove(); return; }

  // minutes from midnight, [open, close]; index is the JS day number.
  var HOURS = [
    [540, 900],   // Sunday      09:00 – 15:00
    [450, 1080],  // Monday      07:30 – 18:00
    [450, 1080],  // Tuesday
    [450, 1080],  // Wednesday
    [450, 960],   // Thursday    07:30 – 16:00
    [450, 960],   // Friday
    [540, 900]    // Saturday    09:00 – 15:00
  ];

  // The five strings this file needs are rendered into the panel's own
  // attributes by the build, in whichever of the four languages the page
  // is in, rather than duplicated in a dictionary here that would drift.
  var STR = {
    open: panel.getAttribute('data-s-open') || 'Open',
    closed: panel.getAttribute('data-s-closed') || 'Closed',
    closesIn: panel.getAttribute('data-s-closes') || 'Closes in {t}',
    opensIn: panel.getAttribute('data-s-opens') || 'Opens in {t}',
    opensOn: panel.getAttribute('data-s-openson') || 'Opens {d} at {t}'
  };

  var elClock = panel.querySelector('[data-now-clock]');
  var elDate = panel.querySelector('[data-now-date]');
  var elState = panel.querySelector('[data-now-state]');
  var elStateText = panel.querySelector('[data-now-state-text]');
  var elNext = panel.querySelector('[data-now-next]');
  var elHours = panel.querySelector('[data-now-hours]');

  function parts(now) {
    var f = new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit',
      second: '2-digit', hour12: false
    });
    var got = {};
    f.formatToParts(now).forEach(function (p) { got[p.type] = p.value; });
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      day: days[got.weekday],
      h: parseInt(got.hour, 10) % 24,
      m: parseInt(got.minute, 10),
      s: parseInt(got.second, 10)
    };
  }

  function hhmm(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    var suffix = h < 12 ? 'am' : 'pm';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    // Minutes are always shown, including :00 — the Contact page publishes
    // these same hours as "7:30 am – 6:00 pm", and the two must match.
    if (LANG.slice(0, 2) === 'en') return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + suffix;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function gap(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h && m) return h + ' h ' + m + ' m';
    if (h) return h + ' h';
    return m + ' m';
  }
  function dayName(d) {
    var ref = new Date(Date.UTC(2024, 0, 7 + d)); // 7 Jan 2024 was a Sunday
    try { return new Intl.DateTimeFormat(LANG, { weekday: 'long', timeZone: 'UTC' }).format(ref); }
    catch (e) { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d]; }
  }

  function tick() {
    var now = new Date();
    var p = parts(now);
    var mins = p.h * 60 + p.m;

    elClock.textContent = (p.h < 10 ? '0' : '') + p.h + ':' + (p.m < 10 ? '0' : '') + p.m
      + ':' + (p.s < 10 ? '0' : '') + p.s;
    try {
      elDate.textContent = new Intl.DateTimeFormat(LANG, {
        timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long'
      }).format(now);
    } catch (e) { elDate.textContent = ''; }

    var today = HOURS[p.day];
    elHours.textContent = hhmm(today[0]) + ' – ' + hhmm(today[1]);

    var isOpen = mins >= today[0] && mins < today[1];
    panel.classList.toggle('is-open-now', isOpen);
    panel.classList.toggle('is-closed-now', !isOpen);
    elState.setAttribute('data-state', isOpen ? 'open' : 'closed');
    elStateText.textContent = isOpen ? STR.open : STR.closed;

    if (isOpen) {
      elNext.textContent = STR.closesIn.replace('{t}', gap(today[1] - mins));
      return;
    }
    if (mins < today[0]) {
      elNext.textContent = STR.opensIn.replace('{t}', gap(today[0] - mins));
      return;
    }
    // After close: the next day that opens, which on these hours is
    // always tomorrow — the institution is open seven days a week.
    var d = (p.day + 1) % 7;
    elNext.textContent = STR.opensOn.replace('{d}', dayName(d)).replace('{t}', hhmm(HOURS[d][0]));
  }

  tick();
  var timer = window.setInterval(tick, 1000);
  // A clock in a tab nobody is looking at is a wasted wake-up.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { window.clearInterval(timer); timer = null; }
    else if (!timer) { tick(); timer = window.setInterval(tick, 1000); }
  });
})();
