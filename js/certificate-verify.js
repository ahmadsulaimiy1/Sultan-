// Public Certificate & Ijazah verification page. Looks up a reference
// number against the live Registrar record via GET /api/certificates/verify
// — no auth, no fabricated results: "not found" and "revoked" are shown
// exactly as plainly as a valid, active credential.
(function () {
  var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  var STRINGS = {
    en: {
      valid: 'Genuine — active credential', revoked: 'This credential has been revoked',
      notfound: 'No certificate or Ijazah found with that reference number',
      integrityFailed: 'Integrity check failed — this record does not match its cryptographic signature. Contact the Registrar.',
      recipient: 'Recipient', credential: 'Credential', scope: 'Scope', examiners: 'Examining Scholars',
      issued: 'Issued', reference: 'Reference No.', revokedNote: 'Revocation note', checking: 'Checking…',
      studentId: 'Student ID', institution: 'Institution', academicYear: 'Academic Year',
      grade: 'Grade', hijri: 'Hijri Date', integrity: 'Integrity',
      integrityIntact: 'Intact — cryptographic hash and serial suffix verified',
      error: 'Could not complete verification right now — please try again shortly.',
    },
    ar: {
      valid: 'أصلية — بيانات اعتماد سارية', revoked: 'تم إلغاء هذه الشهادة/الإجازة',
      notfound: 'لم يُعثر على شهادة أو إجازة بهذا الرقم المرجعي',
      integrityFailed: 'فشل فحص السلامة — لا يطابق هذا السجل توقيعه التشفيري. يرجى التواصل مع مكتب المسجّل.',
      recipient: 'الاسم', credential: 'الشهادة', scope: 'النطاق', examiners: 'العلماء الممتحنون',
      issued: 'تاريخ الإصدار', reference: 'الرقم المرجعي', revokedNote: 'ملاحظة الإلغاء', checking: 'جارٍ التحقق…',
      studentId: 'الرقم الأكاديمي الدائم', institution: 'المؤسسة', academicYear: 'العام الدراسي',
      grade: 'التقدير', hijri: 'التاريخ الهجري', integrity: 'سلامة الوثيقة',
      integrityIntact: 'سليمة — تم التحقق من البصمة التشفيرية ولاحقة الرقم التسلسلي',
      error: 'تعذّر إتمام التحقق الآن — يرجى المحاولة مرة أخرى بعد قليل.',
    },
  };
  var t = STRINGS[lang];

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
    var integrityFailed = data.status === 'integrity_check_failed';
    var badgeClass = integrityFailed || isRevoked ? 'revoked' : 'ok';
    var badgeText = integrityFailed ? t.integrityFailed : isRevoked ? t.revoked : t.valid;
    var rows = '';
    rows += field(t.reference, data.referenceNo);
    var recipient = data.recipientName;
    if (lang === 'ar' && data.recipientNameAr) recipient = data.recipientNameAr;
    else if (data.recipientNameAr) recipient = data.recipientName + ' — ' + data.recipientNameAr;
    rows += field(t.recipient, recipient);
    rows += field(t.credential, (lang === 'ar' && data.credentialTypeAr) ? data.credentialTypeAr : data.credentialType);
    if (data.kind === 'ijazah') {
      rows += field(t.scope, data.certifiedScope);
      rows += field(t.examiners, data.examiningScholars);
    }
    if (data.kind === 'stage_certificate') {
      rows += field(t.studentId, data.studentIdentityNo);
      rows += field(t.institution, data.institutionName);
      rows += field(t.academicYear, data.academicYear);
    }
    rows += field(t.issued, data.issuedAt);
    if (data.kind === 'stage_certificate' && data.issuedAtHijri) rows += field(t.hijri, data.issuedAtHijri);
    if (data.kind === 'stage_certificate' && !integrityFailed) rows += field(t.integrity, t.integrityIntact);
    if (isRevoked && data.revocationNote) rows += field(t.revokedNote, data.revocationNote);

    resultEl.innerHTML =
      '<div class="cert-verify-result ' + ((isRevoked || integrityFailed) ? 'is-revoked' : 'is-valid') + '">' +
      '<span class="cert-verify-badge ' + badgeClass + '">' + badgeText + '</span>' +
      rows +
      '</div>';
  }

  function init() {
    var form = document.querySelector('[data-cert-verify-form]');
    var input = document.querySelector('[data-cert-verify-input]');
    var resultEl = document.querySelector('[data-cert-verify-result]');
    if (!form || !input || !resultEl) return;

    // /verify-certificate/?ref=... deep-links (e.g. from a QR code) run
    // the lookup automatically on load.
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
      fetch('/api/certificates/verify?ref=' + encodeURIComponent(ref))
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
