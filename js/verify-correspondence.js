(function () {
  var input = document.getElementById('ref-input');
  var btn = document.getElementById('verify-btn');
  var resultEl = document.getElementById('result');

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  function showResult(cls, html) {
    resultEl.className = 'result show ' + cls;
    resultEl.innerHTML = html;
  }

  async function verify() {
    var ref = input.value.trim();
    if (!ref) return;
    btn.disabled = true;
    showResult('', '<p>Checking…</p>');
    try {
      var res = await fetch('/api/correspondence/verify?ref=' + encodeURIComponent(ref));
      var data = await res.json();
      if (!res.ok || data.error) {
        showResult('invalid', '<div class="result-title">Could not verify</div><p>' + escapeHtml((data && data.error) || 'Something went wrong.') + '</p>');
        return;
      }
      if (!data.found) {
        showResult('invalid', '<div class="result-title">Not found</div><p>No document matches this reference number. Check it against the printed copy and try again.</p>');
        return;
      }
      if (!data.contentVerified) {
        showResult('invalid', '<div class="result-title">Could not confirm authenticity</div><p>This reference number exists, but its content could not be verified against the original record. Please contact the school directly.</p>');
        return;
      }
      if (data.status === 'revoked') {
        showResult('revoked', '<div class="result-title">Revoked</div>'
          + '<div class="result-row"><span>Document</span><span>' + escapeHtml(data.documentTypeLabel) + '</span></div>'
          + '<div class="result-row"><span>Issuing Office</span><span>' + escapeHtml(data.officeName) + '</span></div>'
          + '<div class="result-row"><span>Reference</span><span>' + escapeHtml(data.referenceNo) + '</span></div>'
          + '<p style="margin-top:10px;">This document was genuinely issued by the school but has since been revoked and should not be relied upon.</p>');
        return;
      }
      showResult('valid', '<div class="result-title">Genuine — issued by Sultan Hanafi Royal Schools</div>'
        + '<div class="result-row"><span>Document</span><span>' + escapeHtml(data.documentTypeLabel) + '</span></div>'
        + '<div class="result-row"><span>Issuing Office</span><span>' + escapeHtml(data.officeName) + '</span></div>'
        + '<div class="result-row"><span>Institution</span><span>' + escapeHtml(data.institutionName) + '</span></div>'
        + '<div class="result-row"><span>Reference</span><span>' + escapeHtml(data.referenceNo) + '</span></div>'
        + '<div class="result-row"><span>Issued</span><span>' + escapeHtml(new Date(data.issuedAt).toISOString().slice(0, 10)) + '</span></div>');
    } catch (err) {
      showResult('invalid', '<div class="result-title">Could not verify</div><p>Please try again shortly.</p>');
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener('click', verify);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') verify(); });

  var params = new URLSearchParams(location.search);
  var prefilled = params.get('ref');
  if (prefilled) {
    input.value = prefilled;
    verify();
  }
})();
