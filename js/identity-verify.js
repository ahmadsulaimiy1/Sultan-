// Public Digital Identity verification page. Looks up an SHRS identity
// number against the live record via GET /api/identity/verify — no
// auth, no fabricated results: "not found" is shown exactly as plainly
// as a valid record. Mirrors js/certificate-verify.js.
(function () {
  var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  var STRINGS = {
    en: {
      valid: 'Genuine — active record', notfound: 'No SHRS identity found with that number',
      kindStudent: 'Student', kindGuardian: 'Parent / Guardian', kindStaff: 'Staff', role: 'Role',
      name: 'Full Name', identityNo: 'Identity No.', status: 'Status',
      institution: 'Institution', className: 'Class', position: 'Position',
      checking: 'Checking…', error: 'Could not complete verification right now — please try again shortly.',
    },
    ar: {
      valid: 'أصلي — سجل ساري', notfound: 'لم يُعثر على هوية بهذا الرقم في مدارس السلطان حنفي الملكية',
      kindStudent: 'طالب', kindGuardian: 'ولي أمر', kindStaff: 'موظف', role: 'الصفة',
      name: 'الاسم الكامل', identityNo: 'رقم الهوية', status: 'الحالة',
      institution: 'المؤسسة', className: 'الصف', position: 'المنصب',
      checking: 'جارٍ التحقق…', error: 'تعذّر إتمام التحقق الآن — يرجى المحاولة مرة أخرى بعد قليل.',
    },
  };
  var t = STRINGS[lang];
  var KIND_LABEL = { student: t.kindStudent, guardian: t.kindGuardian, staff: t.kindStaff };

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
    var rows = '';
    rows += field(t.identityNo, data.identityNo);
    rows += field(t.name, data.fullName);
    rows += field(t.role, KIND_LABEL[data.kind] || '');
    if (data.kind === 'student') {
      rows += field(t.institution, data.institution);
      rows += field(t.className, data.className);
    }
    if (data.kind === 'staff') {
      rows += field(t.position, data.positionTitle);
      rows += field(t.institution, data.institution);
    }
    rows += field(t.status, data.status);

    resultEl.innerHTML =
      '<div class="cert-verify-result is-valid">' +
      '<span class="cert-verify-badge ok">' + t.valid + '</span>' +
      rows +
      '</div>';
  }

  function init() {
    var form = document.querySelector('[data-identity-verify-form]');
    var input = document.querySelector('[data-identity-verify-input]');
    var resultEl = document.querySelector('[data-identity-verify-result]');
    if (!form || !input || !resultEl) return;

    var params = new URLSearchParams(window.location.search);
    var prefill = params.get('id');
    if (prefill) {
      input.value = prefill;
      runVerify(prefill);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var idNo = input.value.trim();
      if (idNo) runVerify(idNo);
    });

    function runVerify(idNo) {
      resultEl.innerHTML = '<p class="cert-verify-note">' + t.checking + '</p>';
      fetch('/api/identity/verify?id=' + encodeURIComponent(idNo))
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
