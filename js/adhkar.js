// Adhkar Centre — "mark as recited" tracking. Anonymous, localStorage-only
// (no account needed), resets daily. Read by the Personalisation Centre's
// "Today's Adhkar" widget (js/personalisation.js) via the same storage key.
(function () {
  var STORAGE_KEY = 'shrsAdhkarProgress';

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function getProgress() {
    var data;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      data = null;
    }
    var today = todayStr();
    if (!data || data.date !== today) data = { date: today, morning: [], evening: [] };
    return data;
  }

  function saveProgress(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage unavailable (private browsing, etc.) — marking
      // simply won't persist across reloads; the button still toggles
      // visually for the current page view.
    }
  }

  var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  var LABEL_MARK = lang === 'ar' ? 'وضع كمقروء' : 'Mark as recited';
  var LABEL_DONE = lang === 'ar' ? 'تمّت القراءة ✓' : 'Recited ✓';

  ['morning', 'evening'].forEach(function (period) {
    var section = document.getElementById(period);
    if (!section) return;
    var items = section.querySelectorAll('.adk-item');
    if (!items.length) return;
    var progress = getProgress();

    items.forEach(function (item, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'adk-mark-btn';
      var isDone = progress[period].indexOf(idx) !== -1;
      btn.textContent = isDone ? LABEL_DONE : LABEL_MARK;
      if (isDone) btn.classList.add('is-done');
      btn.addEventListener('click', function () {
        var p = getProgress();
        var i = p[period].indexOf(idx);
        if (i === -1) {
          p[period].push(idx);
          btn.textContent = LABEL_DONE;
          btn.classList.add('is-done');
        } else {
          p[period].splice(i, 1);
          btn.textContent = LABEL_MARK;
          btn.classList.remove('is-done');
        }
        saveProgress(p);
      });
      item.appendChild(btn);
    });
  });
})();
