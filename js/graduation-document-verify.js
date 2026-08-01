// Public Graduation Document verification page (Stage 3, spec §5.2).
// Looks up a reference number against the live institutional record via
// GET /api/graduation-documents/verify — no auth, no fabricated results.
(function () {
  var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  var DOCUMENT_TYPE_LABEL = {
    certificate: { en: 'Graduation Certificate', ar: 'شهادة تخرج' },
    transcript: { en: 'Academic Transcript', ar: 'كشف درجات أكاديمي' },
    diploma_supplement: { en: 'Diploma Supplement', ar: 'ملحق الدبلوم' },
    statement_of_results: { en: 'Statement of Results', ar: 'بيان النتائج' },
    provisional_certificate: { en: 'Provisional Certificate', ar: 'شهادة مؤقتة' },
    testimonial: { en: 'Testimonial', ar: 'خطاب توصية' },
    character_certificate: { en: 'Character Certificate', ar: 'شهادة حسن سيرة وسلوك' },
    clearance_certificate: { en: 'Graduation Clearance Certificate', ar: 'شهادة إخلاء طرف التخرج' },
    alumni_registration: { en: 'Alumni Registration Certificate', ar: 'شهادة تسجيل الخريجين' },
    award: { en: 'Award Certificate', ar: 'شهادة تقدير' },
    special_distinction: { en: 'Special Distinction Certificate', ar: 'شهادة تميز خاصة' },
    board_award: { en: 'Board Award', ar: 'جائزة مجلس الأمناء' },
    founder_ceo_award: { en: 'Founder & CEO Award', ar: 'جائزة المؤسس والرئيس التنفيذي' },
    hifz_completion: { en: 'Hifz Completion Certificate', ar: 'شهادة إتمام التحفيظ' },
    islamiyyah_completion: { en: 'Islamiyyah Completion Certificate', ar: 'شهادة إتمام الدراسات الإسلامية' },
  };
  var STRINGS = {
    en: {
      valid: 'Genuine — active document', revoked: 'This document has been revoked',
      mismatch: 'Reference found, but the content does not match the original — do not rely on this document',
      notfound: 'No graduation document found with that reference number',
      recipient: 'Recipient', documentType: 'Document Type', institution: 'Institution', session: 'Graduation Session',
      issued: 'Issued', reference: 'Reference No.', verificationId: 'Verification ID', revokedNote: 'Revocation note',
      checking: 'Checking…', error: 'Could not complete verification right now — please try again shortly.',
      reissue: 'This is a certified copy or duplicate of an original document.',
    },
    ar: {
      valid: 'أصلية — وثيقة سارية', revoked: 'تم إلغاء هذه الوثيقة',
      mismatch: 'تم العثور على الرقم المرجعي، لكن المحتوى لا يطابق الأصل — لا تعتمد على هذه الوثيقة',
      notfound: 'لم يُعثر على وثيقة تخرج بهذا الرقم المرجعي',
      recipient: 'الاسم', documentType: 'نوع الوثيقة', institution: 'المؤسسة', session: 'دورة التخرج',
      issued: 'تاريخ الإصدار', reference: 'الرقم المرجعي', verificationId: 'رقم التحقق', revokedNote: 'ملاحظة الإلغاء',
      checking: 'جارٍ التحقق…', error: 'تعذّر إتمام التحقق الآن — يرجى المحاولة مرة أخرى بعد قليل.',
      reissue: 'هذه نسخة معتمدة أو مكررة من وثيقة أصلية.',
    },
  };
  var t = STRINGS[lang];

  function field(k, v) {
    if (!v) return '';
    return '<div class="cert-verify-field"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
  }

  function documentTypeLabel(type) {
    var entry = DOCUMENT_TYPE_LABEL[type];
    return entry ? entry[lang] : type;
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
    var isMismatch = data.contentVerified === false;
    var badgeClass = isMismatch ? 'notfound' : isRevoked ? 'revoked' : 'ok';
    var badgeText = isMismatch ? t.mismatch : isRevoked ? t.revoked : t.valid;

    var rows = '';
    rows += field(t.reference, data.referenceNo);
    rows += field(t.documentType, documentTypeLabel(data.documentType));
    rows += field(t.recipient, data.recipientName);
    rows += field(t.institution, data.institutionName);
    rows += field(t.session, data.graduationSession);
    rows += field(t.issued, data.issuedAt);
    rows += field(t.verificationId, data.verificationId);
    if (isRevoked && data.revocationNote) rows += field(t.revokedNote, data.revocationNote);

    var reissueNote = data.isReissue ? '<p class="cert-verify-note">' + t.reissue + '</p>' : '';

    resultEl.innerHTML =
      '<div class="cert-verify-result ' + (isMismatch ? 'is-notfound' : isRevoked ? 'is-revoked' : 'is-valid') + '">' +
      '<span class="cert-verify-badge ' + badgeClass + '">' + badgeText + '</span>' +
      rows + reissueNote +
      '</div>';
  }

  function init() {
    var form = document.querySelector('[data-gd-verify-form]');
    var input = document.querySelector('[data-gd-verify-input]');
    var resultEl = document.querySelector('[data-gd-verify-result]');
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
      fetch('/api/graduation-documents/verify?ref=' + encodeURIComponent(ref))
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
