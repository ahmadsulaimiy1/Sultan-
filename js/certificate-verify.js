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
      notOurs: 'Not a Sultan Hanafi reference number',
      notOursNote: 'This is not one of the number formats Sultan Hanafi Royal Schools '
        + 'issues. Check the number on the document — the certificate number is printed '
        + 'in its own panel at the foot of the sheet, and the verification code beside '
        + 'the QR code will also work.',
      noRecord: 'No record on file for this number',
      noRecordNote: 'This IS a Sultan Hanafi certificate number, and this page holds no '
        + 'record against it. That is a statement about our records, not about your '
        + 'document — nothing here says the certificate is not genuine. If you are '
        + 'holding a certificate issued by the school, please contact the Registrar’s '
        + 'Office with the number and it will be resolved.',
      integrityFailed: 'Integrity check failed — this record does not match its cryptographic signature. Contact the Registrar.',
      indexBadge: 'This is a Student ID, not a certificate number',
      indexNote: 'It identifies a student who holds the credentials below. Verify a single credential by its own certificate number.',
      unknownState: 'This record is in a state this page does not recognise — contact the Registrar’s Office',
      heldCredentials: 'Credentials held', ofRecord: 'Student',
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
      notOurs: 'ليس رقمًا مرجعيًا صادرًا عن مدارس السلطان حنفي',
      notOursNote: 'هذا ليس من صيغ الأرقام التي تصدرها مدارس السلطان حنفي الملكية. '
        + 'يُرجى مراجعة الرقم المدوَّن على الوثيقة؛ فرقم الشهادة مطبوعٌ في لوحته الخاصة '
        + 'أسفل الورقة، ويصلح كذلك رمز التحقق المجاور لرمز الاستجابة السريعة.',
      noRecord: 'لا يوجد سجل مقابل هذا الرقم',
      noRecordNote: 'هذا رقم شهادةٍ صادرٍ عن مدارس السلطان حنفي، ولا يوجد لدى هذه الصفحة '
        + 'سجلٌّ مقابله. وهذا قولٌ عن سجلاتنا لا عن وثيقتك؛ ولا شيء هنا يفيد أن الشهادة '
        + 'غير صحيحة. فإن كنت تحمل شهادةً صادرةً عن المدرسة، فيُرجى مراجعة مكتب المسجِّل '
        + 'بهذا الرقم ليُعالَج الأمر.',
      integrityFailed: 'فشل فحص السلامة — لا يطابق هذا السجل توقيعه التشفيري. يرجى التواصل مع مكتب المسجّل.',
      indexBadge: 'هذا رقم أكاديمي للطالب، وليس رقم شهادة',
      indexNote: 'يشير إلى طالب يحمل الشهادات المدرجة أدناه. للتحقق من شهادة بعينها، استخدم رقم الشهادة الخاص بها.',
      unknownState: 'هذا السجل في حالة لا تعرفها هذه الصفحة — يرجى التواصل مع مكتب المسجّل',
      heldCredentials: 'الشهادات المسجَّلة', ofRecord: 'الطالب',
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
      // TWO DIFFERENT ANSWERS. A number this school does not issue is a
      // different fact from one it does issue and holds no record of, and a
      // graduand holding a genuine certificate must never be shown the first
      // message when the second is true — that reads as "your document is
      // nothing". Neither state asserts anything about the document itself;
      // both say only what this page can honestly say.
      //
      // `referenceRecognised` is absent on an older cached copy of the API
      // response, so undefined falls back to the original single message
      // rather than silently claiming the number is not ours.
      var recognised = data.referenceRecognised === true;
      var unknownShape = data.referenceRecognised === false;
      resultEl.innerHTML =
        '<div class="cert-verify-result is-notfound">' +
        '<span class="cert-verify-badge notfound">'
          + (recognised ? t.noRecord : unknownShape ? t.notOurs : t.notfound) + '</span>' +
        (recognised ? '<p class="cert-verify-note">' + t.noRecordNote + '</p>' : '') +
        (unknownShape ? '<p class="cert-verify-note">' + t.notOursNote + '</p>' : '') +
        '</div>';
      return;
    }
    // A Student ID identifies a PERSON, not a document, so it can match several
    // certificates. The endpoint answers that with kind
    // 'student_certificate_index' and lists them; it is not a verdict on any
    // one credential and must never be badged as though it were.
    if (data.kind === 'student_certificate_index') {
      var recipientIdx = data.recipientName;
      if (lang === 'ar' && data.recipientNameAr) recipientIdx = data.recipientNameAr;
      else if (data.recipientNameAr) recipientIdx = data.recipientName + ' — ' + data.recipientNameAr;
      var held = (data.matches || []).map(function (m) {
        var type = (lang === 'ar' && m.credentialTypeAr) ? m.credentialTypeAr : m.credentialType;
        // Each row carries its OWN status. One revoked credential among several
        // must not be hidden behind the sibling that is still active.
        var mark = m.status === 'active' ? '' : ' — ' + (m.status === 'revoked' ? t.revoked : t.unknownState);
        return field(m.certificateNo, type + ' · ' + m.academicYear + mark);
      }).join('');
      resultEl.innerHTML =
        '<div class="cert-verify-result is-index">' +
        '<span class="cert-verify-badge index">' + t.indexBadge + '</span>' +
        '<p class="cert-verify-note">' + t.indexNote + '</p>' +
        '<div class="cert-verify-fields">' +
        field(t.ofRecord, recipientIdx) + field(t.studentId, data.studentIdentityNo) +
        '</div>' +
        '<div class="cert-verify-fields"><div class="cert-verify-field"><span class="k">' +
        t.heldCredentials + '</span></div>' + held + '</div>' +
        '</div>';
      return;
    }
    var isRevoked = data.status === 'revoked';
    var integrityFailed = data.status === 'integrity_check_failed';
    // WHITELIST, never a blacklist. This read `integrityFailed || isRevoked ?
    // 'revoked' : 'ok'`, which meant any status the page had not been taught
    // about rendered as the green "Genuine — active credential" badge. Adding
    // one status to the endpoint was therefore enough to make an unverified
    // record look verified on a public page. Only 'active' earns the green.
    var isValid = data.status === 'active';
    var badgeClass = isValid ? 'ok' : (integrityFailed || isRevoked) ? 'revoked' : 'unknown';
    var badgeText = isValid ? t.valid
      : integrityFailed ? t.integrityFailed
        : isRevoked ? t.revoked : t.unknownState;
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
