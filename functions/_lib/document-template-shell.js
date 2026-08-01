// Shared Document Publication Shell — Master Graduation Document
// Specification §2 (Publication Architecture), §9-§11 (Visual Identity,
// Typography, Paper). Every graduation document type renders through
// this ONE shell (header crest band, body slot, signature block,
// security band, seal position, footer) so 19 eventual document types
// inherit one design system rather than independently drifting. Colours
// are the confirmed-live palette from css/brand.css, inlined literally
// (not linked) because this HTML is served standalone from an API
// endpoint, not through scripts/build.js's page pipeline.
//
// Rendering path, stated honestly: this produces print-ready HTML —
// the browser's own "Print / Save as PDF" is the only way to get a PDF
// from it today. The real triggered/batch rendering pipeline (spec
// §6.2) is gated on the client's still-open infrastructure decision
// (spec §22); nothing here claims to already be that pipeline.
//
// The institutional seal is NEVER fabricated (standing project rule,
// spec §12) — sealImage is only ever rendered if a real asset is
// supplied by the caller; absent that, a clearly-labelled reserved
// position is shown instead of an invented mark.

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DOCUMENT_KIND_STAMP = {
  certified_copy: { en: 'CERTIFIED TRUE COPY', ar: 'نسخة طبق الأصل معتمدة' },
  duplicate: { en: 'DUPLICATE', ar: 'نسخة مكررة' },
};

function renderSignatureBlock(signatories, lang) {
  if (!signatories || !signatories.length) return '';
  const cells = signatories.map((s) => {
    const mark = s.signatureType === 'uploaded_image' && s.imageData
      ? `<img class="doc-sig-image" src="${escapeHtml(s.imageData)}" alt="${escapeHtml(s.staffName)}" />`
      : `<span class="doc-sig-typed">${escapeHtml(s.typedName || s.staffName)}</span>`;
    return `<div class="doc-sig-cell">
      <div class="doc-sig-mark">${mark}</div>
      <div class="doc-sig-rule"></div>
      <div class="doc-sig-name">${escapeHtml(s.staffName)}</div>
      <div class="doc-sig-title">${escapeHtml(s.titleLine || s.label)}</div>
    </div>`;
  }).join('');
  return `<div class="doc-signatures">${cells}</div>`;
}

function renderSealBlock(sealImage, lang) {
  if (sealImage) {
    return `<div class="doc-seal"><img src="${escapeHtml(sealImage)}" alt="${lang === 'ar' ? 'الختم الرسمي' : 'Institutional Seal'}" /></div>`;
  }
  const label = lang === 'ar' ? 'موضع الختم الرسمي — محجوز' : 'Institutional Seal — Reserved';
  return `<div class="doc-seal doc-seal-reserved"><span>${escapeHtml(label)}</span></div>`;
}

function renderSecurityBand({ referenceNo, verificationId, displayHash, issuedAtDisplay, lang }) {
  const t = lang === 'ar'
    ? { ref: 'الرقم المرجعي', ver: 'رقم التحقق', hash: 'بصمة المحتوى', issued: 'تاريخ الإصدار', scan: 'امسح للتحقق' }
    : { ref: 'Reference No.', ver: 'Verification ID', hash: 'Content Hash', issued: 'Issued', scan: 'Scan to verify' };
  return `<div class="doc-security-band">
    <div class="doc-security-codes">
      <figure class="doc-qr">
        <img src="/api/graduation-documents/qr?ref=${encodeURIComponent(referenceNo)}" alt="QR" width="96" height="96" />
        <figcaption>${escapeHtml(t.scan)}</figcaption>
      </figure>
      <figure class="doc-barcode">
        <img src="/api/graduation-documents/barcode?ref=${encodeURIComponent(referenceNo)}" alt="Barcode" height="46" />
      </figure>
    </div>
    <div class="doc-security-fields">
      <div><span class="k">${t.ref}</span><span class="v">${escapeHtml(referenceNo)}</span></div>
      <div><span class="k">${t.ver}</span><span class="v">${escapeHtml(verificationId)}</span></div>
      <div><span class="k">${t.issued}</span><span class="v">${escapeHtml(issuedAtDisplay)}</span></div>
      <div><span class="k">${t.hash}</span><span class="v doc-hash">${escapeHtml(displayHash)}</span></div>
    </div>
  </div>`;
}

export function renderDocumentShell({
  documentTitle, documentTypeLabel, lang = 'en', dir = 'ltr',
  institutionName, recipientName, bodyHtml, referenceNo, verificationId,
  displayHash, issuedAtDisplay, signatories = [], documentKind = 'original',
  sealImage = null,
}) {
  const stamp = DOCUMENT_KIND_STAMP[documentKind];
  const stampHtml = stamp
    ? `<div class="doc-kind-stamp">${escapeHtml(stamp[lang] || stamp.en)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(documentTitle)} — ${escapeHtml(recipientName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --navy:#3B2A1D; --navy-deep:#221709; --gold:#C6A15B; --gold-bright:#E9CE8A;
    --ivory:#F7EEDF; --cream:#F1E4C8; --milk:#FCFAF6; --parchment:#EAE0C0; --crimson:#7C1F2E;
    --font-display:'Cormorant Garamond','Amiri',serif;
    --font-label:'Cinzel','Amiri',serif;
    --font-body:'Inter','Cairo',sans-serif;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;background:#ece4d0;}
  body{font-family:var(--font-body);color:var(--navy-deep);}
  .doc-page{
    position:relative;width:1000px;max-width:100%;margin:24px auto;padding:64px 72px 56px;
    background:var(--milk);border:1px solid var(--gold);
    box-shadow:0 12px 40px rgba(34,23,9,0.18);
  }
  .doc-page::before{
    content:"";position:absolute;inset:14px;border:1px solid var(--gold);opacity:0.55;pointer-events:none;
  }
  .doc-watermark{
    position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    opacity:0.05;pointer-events:none;overflow:hidden;
  }
  .doc-watermark img{width:520px;}
  .doc-kind-stamp{
    position:absolute;top:36px;${dir === 'rtl' ? 'left' : 'right'}:40px;
    font-family:var(--font-label);font-size:0.72rem;letter-spacing:0.14em;color:var(--crimson);
    border:1px solid var(--crimson);padding:4px 12px;transform:rotate(${dir === 'rtl' ? '8deg' : '-8deg'});
  }
  .doc-header{position:relative;text-align:center;margin-bottom:28px;}
  .doc-header .doc-institution{
    font-family:var(--font-label);font-size:0.82rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--navy);
  }
  .doc-header .doc-doctype{
    font-family:var(--font-label);font-size:0.68rem;letter-spacing:0.22em;text-transform:uppercase;color:var(--gold);
    margin-top:6px;
  }
  .doc-rule{height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:18px auto;width:70%;}
  .doc-body{position:relative;font-family:var(--font-display);font-size:1.18rem;line-height:1.9;color:var(--navy-deep);text-align:center;}
  .doc-body .doc-recipient{
    display:block;font-size:2.1rem;font-weight:600;color:var(--navy);margin:18px 0;
  }
  .doc-body .doc-eyebrow{
    font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--gold);
  }
  .doc-signatures{
    position:relative;display:flex;justify-content:center;gap:56px;margin-top:56px;flex-wrap:wrap;
  }
  .doc-sig-cell{width:220px;text-align:center;}
  .doc-sig-mark{height:52px;display:flex;align-items:flex-end;justify-content:center;}
  .doc-sig-image{max-height:50px;max-width:200px;}
  .doc-sig-typed{font-family:'Cormorant Garamond',cursive;font-style:italic;font-size:1.6rem;color:var(--navy);}
  .doc-sig-rule{height:1px;background:var(--gold);margin-top:6px;}
  .doc-sig-name{font-family:var(--font-label);font-size:0.72rem;letter-spacing:0.04em;color:var(--navy);margin-top:8px;}
  .doc-sig-title{font-size:0.72rem;color:#6b6a63;margin-top:2px;}
  .doc-seal{
    position:relative;width:104px;height:104px;margin:36px auto 0;display:flex;align-items:center;justify-content:center;
  }
  .doc-seal img{width:100%;height:100%;object-fit:contain;}
  .doc-seal-reserved{
    border:1px dashed var(--gold);border-radius:50%;
  }
  .doc-seal-reserved span{
    font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.06em;text-align:center;color:var(--gold);
    text-transform:uppercase;padding:0 10px;
  }
  .doc-security-band{
    position:relative;margin-top:44px;padding-top:20px;border-top:1px solid var(--gold);
    display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;
  }
  .doc-security-codes{display:flex;align-items:center;gap:18px;}
  .doc-qr figcaption{font-size:0.6rem;text-align:center;color:#6b6a63;margin-top:2px;font-family:var(--font-body);}
  .doc-security-fields{display:grid;grid-template-columns:repeat(2,auto);gap:4px 24px;font-size:0.78rem;}
  .doc-security-fields .k{font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);display:block;}
  .doc-security-fields .v{color:var(--navy-deep);font-family:var(--font-body);}
  .doc-security-fields .doc-hash{font-family:monospace;letter-spacing:0.04em;}
  .doc-footer{position:relative;text-align:center;margin-top:24px;font-size:0.66rem;color:#8a8577;}
  @media print{
    html,body{background:#fff;}
    .doc-page{box-shadow:none;border:none;margin:0;width:auto;padding:24mm 20mm;}
    @page{size:A4;margin:0;}
  }
</style>
</head>
<body>
  <article class="doc-page">
    <div class="doc-watermark"><img src="/assets/images/crest-watermark.png" alt="" /></div>
    ${stampHtml}
    <header class="doc-header">
      <img src="/assets/images/crest-full.png" alt="" style="width:64px;height:64px;object-fit:contain;margin-bottom:10px;" />
      <div class="doc-institution">Sultan Hanafi Royal Schools</div>
      <div class="doc-doctype">${escapeHtml(documentTypeLabel)}</div>
      <div class="doc-rule"></div>
    </header>
    <section class="doc-body">
      ${bodyHtml}
    </section>
    ${renderSignatureBlock(signatories, lang)}
    ${renderSealBlock(sealImage, lang)}
    ${renderSecurityBand({ referenceNo, verificationId, displayHash, issuedAtDisplay, lang })}
    <footer class="doc-footer">
      ${lang === 'ar' ? 'هذه وثيقة رسمية صادرة عن مدارس السلطان حنفي الملكية.' : 'This is an official document issued by Sultan Hanafi Royal Schools.'}
    </footer>
  </article>
</body>
</html>`;
}
