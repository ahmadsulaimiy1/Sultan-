// Digital Graduate Profile public page (Stage 3, spec §1.3 document #10).
// Looks up GET /api/graduation-documents/profile?id=<verificationId> —
// no auth, no name search; the Verification ID itself is the only key,
// per the privacy reasoning documented in functions/api/graduation-
// documents/profile.js.
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
      notfound: 'No graduate profile found with that Verification ID',
      recipient: 'Name', institution: 'Institution', session: 'Graduation Session',
      permanentId: 'Permanent Graduate ID', documentsHeading: 'Issued Documents',
      issued: 'Issued', active: 'Active', revoked: 'Revoked', verify: 'Verify this document →',
      checking: 'Loading…', error: 'Could not load this profile right now — please try again shortly.',
      noDocuments: 'No documents have been issued to this graduate yet.',
    },
    ar: {
      notfound: 'لم يُعثر على ملف خريج بهذا الرقم',
      recipient: 'الاسم', institution: 'المؤسسة', session: 'دورة التخرج',
      permanentId: 'الرقم الدائم للخريج', documentsHeading: 'الوثائق الصادرة',
      issued: 'تاريخ الإصدار', active: 'سارية', revoked: 'ملغاة', verify: 'تحقق من هذه الوثيقة ←',
      checking: 'جارٍ التحميل…', error: 'تعذّر تحميل هذا الملف الآن — يرجى المحاولة مرة أخرى بعد قليل.',
      noDocuments: 'لم تُصدر بعد أي وثائق لهذا الخريج.',
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
    var rows = '';
    rows += field(t.recipient, data.recipientName);
    rows += field(t.institution, data.institutionName);
    rows += field(t.session, data.graduationSession);
    rows += field(t.permanentId, data.permanentGraduateId);

    var docsHtml = '<h3 style="margin-top:24px;">' + t.documentsHeading + '</h3>';
    if (!data.documents || !data.documents.length) {
      docsHtml += '<p class="cert-verify-note">' + t.noDocuments + '</p>';
    } else {
      docsHtml += '<div class="gp-doc-list">' + data.documents.map(function (doc) {
        var statusLabel = doc.status === 'revoked' ? t.revoked : t.active;
        var statusClass = doc.status === 'revoked' ? 'revoked' : 'ok';
        return '<div class="gp-doc-card">' +
          '<span class="cert-verify-badge ' + statusClass + '">' + statusLabel + '</span>' +
          '<div class="gp-doc-title">' + documentTypeLabel(doc.documentType) + '</div>' +
          '<div class="cert-verify-note">' + doc.referenceNo + ' · ' + t.issued + ' ' + doc.issuedAt + '</div>' +
          '<a class="text-link" href="' + doc.verifyUrl + '">' + t.verify + '</a>' +
          '</div>';
      }).join('') + '</div>';
    }

    resultEl.innerHTML =
      '<div class="cert-verify-result is-valid">' + rows + '</div>' + docsHtml;
  }

  function init() {
    var form = document.querySelector('[data-gp-form]');
    var input = document.querySelector('[data-gp-input]');
    var resultEl = document.querySelector('[data-gp-result]');
    if (!form || !input || !resultEl) return;

    var params = new URLSearchParams(window.location.search);
    var prefill = params.get('id');
    if (prefill) {
      input.value = prefill;
      runLookup(prefill);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = input.value.trim();
      if (id) runLookup(id);
    });

    function runLookup(id) {
      resultEl.innerHTML = '<p class="cert-verify-note">' + t.checking + '</p>';
      fetch('/api/graduation-documents/profile?id=' + encodeURIComponent(id))
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
