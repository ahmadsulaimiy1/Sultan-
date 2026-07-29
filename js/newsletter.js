// Footer newsletter signup — progressive enhancement over a plain form.
// See functions/api/portal/newsletter/subscribe.js for the honest scope
// note (real subscriber list, no bulk-send system behind it yet).
(function () {
  'use strict';
  var isAr = document.documentElement.lang === 'ar';
  var MSG = {
    sending: isAr ? 'جارٍ الإرسال…' : 'Sending…',
    done: isAr ? 'تم الاشتراك بنجاح. شكرًا لكم.' : 'Subscribed. Thank you.',
    invalid: isAr ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.',
    error: isAr ? 'تعذّر الاشتراك. حاول مرة أخرى لاحقًا.' : 'Could not subscribe. Please try again later.',
  };

  document.addEventListener('submit', function (e) {
    var form = e.target.closest && e.target.closest('[data-newsletter-form]');
    if (!form) return;
    e.preventDefault();
    var container = form.closest('.foot-newsletter') || form.parentElement || form;
    var input = form.querySelector('[data-newsletter-email]');
    var status = container.querySelector('[data-newsletter-status]');
    var btn = form.querySelector('[data-newsletter-submit]');
    var email = input ? input.value.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (status) { status.textContent = MSG.invalid; status.className = 'foot-newsletter-status is-error'; }
      return;
    }
    if (btn) btn.disabled = true;
    if (status) { status.textContent = MSG.sending; status.className = 'foot-newsletter-status'; }
    fetch('/api/portal/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email }),
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (res.ok && res.data && res.data.ok) {
          if (status) { status.textContent = MSG.done; status.className = 'foot-newsletter-status is-success'; }
          form.reset();
        } else {
          if (status) { status.textContent = (res.data && res.data.error) || MSG.error; status.className = 'foot-newsletter-status is-error'; }
        }
      })
      .catch(function () {
        if (status) { status.textContent = MSG.error; status.className = 'foot-newsletter-status is-error'; }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  });
})();
