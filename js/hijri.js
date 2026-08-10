/* ===================================================================
   THE HIJRI CALENDAR
   -------------------------------------------------------------------
   The tabular ("Kuwaiti algorithm") civil Hijri calendar: a documented
   arithmetic approximation, not a moon-sighting. Every place on the
   site that prints a Hijri date says so where it prints it.

   This lived inside js/personalisation.js, which is 1,072 lines and
   returns at its second statement on any page without the
   Personalisation Centre in it. That was fine while the date band was
   only ever on the marketing pages. It stopped being fine the moment
   the Digital Campus wanted the same band: the choice was to load the
   whole preference engine into a sign-in page, or to copy fifteen
   lines of arithmetic into a second file and let the two drift.

   Neither. The arithmetic is its own file now and both callers share
   it. personalisation.js keeps the preference handling and the strip
   it already owned; portal-chrome.js asks the same object for the same
   number. One algorithm, one place to correct it.
   =================================================================== */
(function () {
  'use strict';

  var MONTHS_EN = ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhu al-Qi'dah", "Dhu al-Hijjah"];
  var MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى',
    'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

  function gregorianToJD(y, m, d) {
    return Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4)
      + Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12)
      - Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4)
      + d - 32075;
  }

  function jdToHijri(jdIn) {
    var jd = jdIn - 1948440 + 10632;
    var n = Math.floor((jd - 1) / 10631);
    jd = jd - 10631 * n + 354;
    var j = Math.floor((10985 - jd) / 5316) * Math.floor((50 * jd) / 17719)
      + Math.floor(jd / 5670) * Math.floor((43 * jd) / 15238);
    jd = jd - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
      - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    var month = Math.floor((24 * jd) / 709);
    var day = jd - Math.floor((709 * month) / 24);
    var year = 30 * n + j - 30;
    return { year: year, month: month, day: day };
  }

  function hijriToJD(year, month, day) {
    return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354
      + Math.floor((3 + 11 * year) / 30) + 1948440 - 385;
  }

  function todayJD() {
    var now = new Date();
    return gregorianToJD(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  function monthNames(lang) {
    return lang === 'ar' ? MONTHS_AR : MONTHS_EN;
  }

  // "27 Safar 1448H" — the form the masthead band has always printed.
  function label(lang, h) {
    var d = h || jdToHijri(todayJD());
    return d.day + ' ' + (monthNames(lang)[d.month - 1] || '') + ' ' + d.year + 'H';
  }

  window.SHRSHijri = {
    MONTHS_EN: MONTHS_EN,
    MONTHS_AR: MONTHS_AR,
    gregorianToJD: gregorianToJD,
    jdToHijri: jdToHijri,
    hijriToJD: hijriToJD,
    todayJD: todayJD,
    monthNames: monthNames,
    today: function () { return jdToHijri(todayJD()); },
    label: label
  };
})();
