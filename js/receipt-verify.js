// Public receipt verification page. Looks up a receipt number against
// the live Finance Office record via GET /api/finance/verify-receipt —
// no auth, no fabricated results. Mirrors js/certificate-verify.js and
// js/identity-verify.js.
(function () {
  var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  var STRINGS = {
    en: {
      valid: 'Genuine — active receipt', revoked: 'This receipt has been revoked',
      notfound: 'No receipt found with that number',
      recipient: 'Recipient', institution: 'Institution', invoiceNo: 'Invoice No.', term: 'Term',
      amount: 'Amount', method: 'Payment Method', paidAt: 'Paid On', receiptNo: 'Receipt No.',
      revokedNote: 'Revocation note', checking: 'Checking…',
      error: 'Could not complete verification right now — please try again shortly.',
    },
    ar: {
      valid: 'أصلي — إيصال ساري', revoked: 'تم إلغاء هذا الإيصال',
      notfound: 'لم يُعثر على إيصال بهذا الرقم',
      recipient: 'الاسم', institution: 'المؤسسة', invoiceNo: 'رقم الفاتورة', term: 'الفصل الدراسي',
      amount: 'المبلغ', method: 'طريقة الدفع', paidAt: 'تاريخ الدفع', receiptNo: 'رقم الإيصال',
      revokedNote: 'ملاحظة الإلغاء', checking: 'جارٍ التحقق…',
      error: 'تعذّر إتمام التحقق الآن — يرجى المحاولة مرة أخرى بعد قليل.',
    },
  };
  var t = STRINGS[lang];
  var METHOD_LABEL = {
    cash: lang === 'ar' ? 'نقداً' : 'Cash', bank_transfer: lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
    cheque: lang === 'ar' ? 'شيك' : 'Cheque', pos: 'POS', other: lang === 'ar' ? 'أخرى' : 'Other',
  };

  function formatCurrency(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  function field(k, v) {
    if (!v) return '';
    return '<div class="cert-verify-field"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
  }

  function render(resultEl, data) {
    if (!data.found) {
      resultEl.innerHTML =
        '<div class="cert-verify-result is-notfound">' +
        '<span class="cert-verify-badge notfound">' + t.notfound + '</span>' +
        '</div>';
      return;
    }
    var isRevoked = data.status === 'revoked';
    var rows = '';
    rows += field(t.receiptNo, data.receiptNo);
    rows += field(t.recipient, data.recipientName);
    rows += field(t.institution, data.institution);
    rows += field(t.invoiceNo, data.invoiceNo);
    rows += field(t.term, data.term);
    rows += field(t.amount, formatCurrency(data.amount));
    rows += field(t.method, METHOD_LABEL[data.paymentMethod] || data.paymentMethod);
    rows += field(t.paidAt, data.paidAt);
    if (isRevoked && data.revocationNote) rows += field(t.revokedNote, data.revocationNote);

    resultEl.innerHTML =
      '<div class="cert-verify-result ' + (isRevoked ? 'is-revoked' : 'is-valid') + '">' +
      '<span class="cert-verify-badge ' + (isRevoked ? 'revoked' : 'ok') + '">' + (isRevoked ? t.revoked : t.valid) + '</span>' +
      rows +
      '</div>';
  }

  function init() {
    var form = document.querySelector('[data-receipt-verify-form]');
    var input = document.querySelector('[data-receipt-verify-input]');
    var resultEl = document.querySelector('[data-receipt-verify-result]');
    if (!form || !input || !resultEl) return;

    var params = new URLSearchParams(window.location.search);
    var prefill = params.get('ref');
    if (prefill) {
      input.value = prefill;
      runVerify(prefill);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ref = input.value.trim();
      if (ref) runVerify(ref);
    });

    function runVerify(ref) {
      resultEl.innerHTML = '<p class="cert-verify-note">' + t.checking + '</p>';
      fetch('/api/finance/verify-receipt?ref=' + encodeURIComponent(ref))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.error) throw new Error(data.error);
          render(resultEl, data);
        })
        .catch(function () {
          resultEl.innerHTML = '<p class="cert-verify-note">' + t.error + '</p>';
        });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
