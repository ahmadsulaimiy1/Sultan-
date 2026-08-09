/* ===================================================================
   THE PRAYER TIMES, CALCULATED HERE
   -------------------------------------------------------------------
   The next prayer went missing from the top of every page, and the
   reason was not a layout bug. It was this, in personalisation.js:

       fetch('https://api.aladhan.com/v1/timings/...')
         .catch(function(){ renderPrayerTimes(null); });

   and renderPrayerTimes(null) empties the element. One request to one
   third-party server, no fallback of any kind. If that server is slow,
   down, blocked by an ad-blocker or a corporate proxy, or simply
   unreachable on a weak mobile connection — which in Lagos is an
   ordinary Tuesday — the single most religiously significant line on a
   school built around the five daily prayers silently disappears.

   IT SHOULD NEVER HAVE BEEN A NETWORK CALL. Prayer times are not data
   that has to be looked up; they are ASTRONOMY. Given a date and a
   pair of coordinates, the sun's position is a calculation, and it is
   the same calculation Aladhan was running on our behalf. Doing it
   here means the times are:

     · always present — no request to fail, and correct on the very
       first paint rather than a second later
     · correct offline, which matters for a site installed as an app
     · free of a third party, who was being sent the visitor's
       coordinates on every page view for a sum anyone can compute

   THE METHOD is the Muslim World League standard — Fajr at 18° and
   Isha at 17° below the horizon — which is what `method=3` in the old
   request asked for, so the numbers do not move for anyone who was
   already reading them. Asr is taken at the Shafi'i shadow ratio of 1,
   as MWL specifies. Sunrise and Maghrib use the standard 0.833° for
   atmospheric refraction and the sun's own width.

   The algorithm is the classical one (Meeus, as published by
   PrayTimes.org): mean anomaly and longitude of the sun, corrected to
   apparent longitude, giving declination and the equation of time;
   then each prayer as an hour-angle from solar noon.

   Everything below works in DEGREES rather than radians, because
   every published formula for this does, and translating them into
   radians in your head is how sign errors get in.
   =================================================================== */
(function (global) {
  'use strict';

  var D = Math.PI / 180;
  function sin(d) { return Math.sin(d * D); }
  function cos(d) { return Math.cos(d * D); }
  function tan(d) { return Math.tan(d * D); }
  function asin(x) { return Math.asin(x) / D; }
  function acos(x) { return Math.acos(x) / D; }
  function atan2(y, x) { return Math.atan2(y, x) / D; }
  function atan(x) { return Math.atan(x) / D; }

  /* Wrap into [0,24) — used on hour values that can fall either side. */
  function fixHour(h) { h = h - 24 * Math.floor(h / 24); return h < 0 ? h + 24 : h; }

  /* Julian Day for 00:00 UT of the given civil date. */
  function julian(year, month, day) {
    if (month <= 2) { year -= 1; month += 12; }
    var A = Math.floor(year / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716))
         + Math.floor(30.6001 * (month + 1))
         + day + B - 1524.5;
  }

  /* The sun's declination and the equation of time, for a Julian Day. */
  function sunPosition(jd) {
    var d = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * d);        // mean anomaly
    var q = fixAngle(280.459 + 0.98564736 * d);        // mean longitude
    var L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g)); // apparent longitude
    var e = 23.439 - 0.00000036 * d;                   // obliquity of the ecliptic
    var RA = atan2(cos(e) * sin(L), cos(L)) / 15;      // right ascension, hours
    return {
      declination: asin(sin(e) * sin(L)),
      equationOfTime: q / 15 - fixHour(RA)             // hours
    };
  }
  function fixAngle(a) { a = a - 360 * Math.floor(a / 360); return a < 0 ? a + 360 : a; }

  /* Compute the five prayers, plus sunrise, for a date and place.

     opts.tzOffset is the offset in hours that applies AT THOSE
     COORDINATES — not the reader's own. A visitor in London looking up
     the school's prayer times wants Ikorodu's clock, not theirs. */
  function timesFor(date, lat, lng, opts) {
    opts = opts || {};
    var fajrAngle = opts.fajrAngle === undefined ? 18 : opts.fajrAngle;
    var ishaAngle = opts.ishaAngle === undefined ? 17 : opts.ishaAngle;
    var asrFactor = opts.asrFactor === undefined ? 1 : opts.asrFactor;
    var tz = opts.tzOffset;
    if (tz === undefined || tz === null) tz = -date.getTimezoneOffset() / 60;

    var jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate());
    var sun = sunPosition(jd);
    var decl = sun.declination;

    /* Solar noon at this longitude, expressed on the local clock. */
    var dhuhr = 12 + tz - lng / 15 - sun.equationOfTime;

    /* The hour angle at which the sun sits `angle` degrees below the
       horizon. Returns null inside the polar circles, where the sun
       may never reach that depression at all — a real case that must
       not come back as NaN and be printed as one. */
    function hourAngle(angle) {
      var x = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
      if (x > 1 || x < -1) return null;
      return acos(x) / 15;
    }

    /* Asr: when an object's shadow equals its own length times the
       factor, plus the shadow it casts at noon. */
    function asrAngle(factor) {
      return -atan(1 / (factor + tan(Math.abs(lat - decl))));
    }

    function before(a) { return a === null ? null : dhuhr - a; }
    function after(a) { return a === null ? null : dhuhr + a; }

    return {
      Fajr: before(hourAngle(fajrAngle)),
      Sunrise: before(hourAngle(0.833)),
      Dhuhr: dhuhr,
      Asr: after(hourAngle(asrAngle(asrFactor))),
      Maghrib: after(hourAngle(0.833)),
      Isha: after(hourAngle(ishaAngle))
    };
  }

  /* "16.75" -> "16:45". Rounded to the nearest minute, which is what
     every published table does, and carried over midnight properly. */
  function toHM(hours) {
    if (hours === null || isNaN(hours)) return null;
    var t = fixHour(hours + 0.5 / 60);
    var h = Math.floor(t);
    var m = Math.floor((t - h) * 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* The same shape personalisation.js already consumes from the API —
     an object of "HH:MM" strings — so nothing downstream has to change
     to stop depending on the network. */
  function timingsFor(date, lat, lng, opts) {
    var t = timesFor(date, lat, lng, opts);
    var out = {};
    Object.keys(t).forEach(function (k) {
      var s = toHM(t[k]);
      if (s) out[k] = s;
    });
    return out;
  }

  /* The offset in hours that a named zone is on for a given date, read
     from the platform's own tz database rather than hard-coded — so it
     stays right if a country changes its offset, and handles daylight
     saving anywhere it applies. Africa/Lagos has never observed it,
     but the school is not the only place this can be pointed at. */
  function zoneOffset(zone, date) {
    try {
      var dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      var p = {};
      dtf.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
      var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day,
                           +p.hour % 24, +p.minute, +p.second);
      return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000) / 60;
    } catch (e) {
      return null;
    }
  }

  global.SHRSPrayerTimes = {
    timingsFor: timingsFor,
    timesFor: timesFor,
    toHM: toHM,
    zoneOffset: zoneOffset
  };
})(typeof window !== 'undefined' ? window : this);
