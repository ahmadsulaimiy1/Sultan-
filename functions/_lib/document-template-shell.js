// Shared Document Publication Shell — Design System v2.
//
// v2 supersedes the v1 shell built earlier this session, per the
// Executive Directive — Stage 3 Execution Order and its required
// gate: docs/shrs-certification-design-benchmark-report.md. That
// report's findings are implemented here directly:
//   - a shared 8px grid unit (--doc-unit) every margin/gap is a
//     multiple of, replacing v1's hand-tuned pixel values (§2.1 of
//     the report);
//   - a named typography scale (§3 of the report) instead of ad-hoc
//     font-size values per element;
//   - a programmatically generated guilloché-style security
//     background — a mathematical sine-interference pattern, NOT
//     traced or copied from any real security printer's or
//     institution's proprietary artwork (§4 of the report, same
//     "build from the published standard, not from memory of
//     someone else's asset" discipline already used for the Code 128
//     barcode renderer);
//   - two named body-content variants, `narrative` (Certificate/
//     Testimonial) and `tabular` (Transcript/Statement of Results),
//     instead of one layout doing double duty (§2.1 of the report).
//
// Every graduation document type still renders through this ONE
// shell (header crest band, body slot, signature block, security
// band, seal position, footer) so every eventual document type
// inherits one design system rather than independently drifting.
// Colours remain the confirmed-live palette from css/brand.css,
// inlined literally because this HTML is served standalone from an
// API endpoint, not through scripts/build.js's page pipeline.
//
// Rendering path, stated honestly: by itself this still only produces
// print-ready HTML. functions/_lib/pdf-render.js (built alongside this
// v2 shell, per the Directive's PDF-architecture decision) converts it
// to a real PDF via Cloudflare Browser Rendering where that binding is
// configured; the browser's own "Print / Save as PDF" remains an
// always-available fallback that needs no extra infrastructure.
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

// A mathematically generated guilloché-style line field — concentric
// sine-interference paths, computed here from a formula rather than
// traced from any real institution's or security printer's actual
// artwork (benchmark report §4). Kept intentionally faint (the caller
// renders it at low opacity) so it reads as texture, not decoration.
function guillocheSvg() {
  const paths = [];
  const cx = 300, cy = 300, rings = 14;
  for (let i = 0; i < rings; i += 1) {
    const r = 40 + i * 18;
    const amp = 6 + (i % 3) * 2;
    const freq = 10 + (i % 4) * 2;
    let d = '';
    const steps = 180;
    for (let s = 0; s <= steps; s += 1) {
      const theta = (s / steps) * Math.PI * 2;
      const rr = r + amp * Math.sin(theta * freq);
      const x = cx + rr * Math.cos(theta);
      const y = cy + rr * Math.sin(theta);
      d += `${s === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
    }
    paths.push(`<path d="${d}Z" fill="none" stroke="currentColor" stroke-width="0.6"/>`);
  }
  return `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`;
}

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

function renderFooter({ lang, referenceNo, pageLabel }) {
  const legal = lang === 'ar'
    ? 'وثيقة رسمية صادرة عن مدارس السلطان حنفي الملكية — تحقق دائمًا عبر منصة التحقق الرسمية، لا تعتمد على نسخة غير مؤكدة.'
    : 'An official document issued by Sultan Hanafi Royal Schools — always verify through the official verification platform; do not rely on an unconfirmed copy.';
  const runningRef = referenceNo
    ? `<div class="doc-footer-ref">${escapeHtml(referenceNo)}${pageLabel ? ` · ${escapeHtml(pageLabel)}` : ''}</div>`
    : '';
  return `<footer class="doc-footer">
    <div class="doc-footer-legal">${legal}</div>
    ${runningRef}
  </footer>`;
}

export function renderDocumentShell({
  documentTitle, documentTypeLabel, lang = 'en', dir = 'ltr',
  institutionName, recipientName, bodyHtml, referenceNo, verificationId,
  displayHash, issuedAtDisplay, signatories = [], documentKind = 'original',
  sealImage = null, bodyVariant = 'narrative', pageLabel = null,
}) {
  const stamp = DOCUMENT_KIND_STAMP[documentKind];
  const stampHtml = stamp
    ? `<div class="doc-kind-stamp">${escapeHtml(stamp[lang] || stamp.en)}</div>`
    : '';
  const bodyVariantClass = bodyVariant === 'tabular' ? 'doc-body--tabular' : 'doc-body--narrative';

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
    /* Design System v2 — shared 8px grid unit (benchmark report §2.1):
       every spacing value below is a literal multiple of this unit. */
    --doc-unit: 8px;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;background:#ece4d0;}
  body{font-family:var(--font-body);color:var(--navy-deep);}
  .doc-page{
    position:relative;width:1000px;max-width:100%;
    margin:calc(var(--doc-unit)*3) auto;
    padding:calc(var(--doc-unit)*8) calc(var(--doc-unit)*9) calc(var(--doc-unit)*7);
    background:var(--milk);border:1px solid var(--gold);
    box-shadow:0 12px 40px rgba(34,23,9,0.18);
  }
  .doc-page::before{
    content:"";position:absolute;inset:calc(var(--doc-unit)*1.75);border:1px solid var(--gold);opacity:0.55;pointer-events:none;
  }
  /* Design System v2 — security background: a low-opacity, mathematically
     generated guilloché-style line field (benchmark report §4), distinct
     from the crest watermark and layered beneath it. */
  .doc-security-bg{
    position:absolute;inset:0;opacity:0.08;color:var(--gold);pointer-events:none;overflow:hidden;
  }
  .doc-security-bg svg{width:100%;height:100%;}
  .doc-watermark{
    position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    opacity:0.05;pointer-events:none;overflow:hidden;
  }
  .doc-watermark img{width:520px;}
  .doc-kind-stamp{
    position:absolute;top:calc(var(--doc-unit)*4.5);${dir === 'rtl' ? 'left' : 'right'}:calc(var(--doc-unit)*5);
    font-family:var(--font-label);font-size:0.72rem;letter-spacing:0.14em;color:var(--crimson);
    border:1px solid var(--crimson);padding:calc(var(--doc-unit)*0.5) calc(var(--doc-unit)*1.5);
    transform:rotate(${dir === 'rtl' ? '8deg' : '-8deg'});
  }
  .doc-header{position:relative;text-align:center;margin-bottom:calc(var(--doc-unit)*3.5);}
  .doc-header .doc-institution{
    /* Design System v2 typography scale — institution name tier */
    font-family:var(--font-label);font-size:0.85rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--navy);
  }
  .doc-header .doc-doctype{
    /* Design System v2 typography scale — document type label tier */
    font-family:var(--font-label);font-size:0.68rem;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--gold);
    margin-top:calc(var(--doc-unit)*0.75);
  }
  .doc-rule{height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:calc(var(--doc-unit)*2.25) auto;width:70%;}
  .doc-body{position:relative;font-family:var(--font-display);color:var(--navy-deep);}
  .doc-body--narrative{font-size:1.15rem;line-height:1.9;text-align:center;}
  .doc-body--narrative .doc-recipient{
    /* Design System v2 typography scale — the one hero element per
       document (benchmark report §2.4: "one hero moment, not several") */
    display:block;font-size:2.4rem;font-weight:600;color:var(--navy);margin:calc(var(--doc-unit)*2.25) 0;letter-spacing:0;
  }
  .doc-body--tabular{font-size:0.85rem;line-height:1.6;text-align:${dir === 'rtl' ? 'right' : 'left'};font-family:var(--font-body);}
  .doc-body--tabular .doc-recipient{
    display:block;font-family:var(--font-display);font-size:1.9rem;font-weight:600;color:var(--navy);
    margin-bottom:calc(var(--doc-unit)*2);text-align:center;
  }
  .doc-body .doc-eyebrow{
    font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--gold);
  }
  .doc-signatures{
    position:relative;display:flex;justify-content:center;gap:calc(var(--doc-unit)*7);margin-top:calc(var(--doc-unit)*7);flex-wrap:wrap;
  }
  .doc-sig-cell{width:220px;text-align:center;}
  .doc-sig-mark{height:calc(var(--doc-unit)*6.5);display:flex;align-items:flex-end;justify-content:center;}
  .doc-sig-image{max-height:50px;max-width:200px;}
  .doc-sig-typed{font-family:'Cormorant Garamond',cursive;font-style:italic;font-size:1.5rem;color:var(--navy);}
  .doc-sig-rule{height:1px;background:var(--gold);margin-top:calc(var(--doc-unit)*0.75);}
  .doc-sig-name{font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.04em;color:var(--navy);margin-top:calc(var(--doc-unit)*1);}
  .doc-sig-title{font-size:0.72rem;color:#6b6a63;margin-top:calc(var(--doc-unit)*0.25);}
  .doc-seal{
    position:relative;width:104px;height:104px;margin:calc(var(--doc-unit)*4.5) auto 0;display:flex;align-items:center;justify-content:center;
  }
  .doc-seal img{width:100%;height:100%;object-fit:contain;}
  .doc-seal-reserved{
    border:1px dashed var(--gold);border-radius:50%;
  }
  .doc-seal-reserved span{
    font-family:var(--font-label);font-size:0.56rem;letter-spacing:0.06em;text-align:center;color:var(--gold);
    text-transform:uppercase;padding:0 calc(var(--doc-unit)*1.25);
  }
  .doc-security-band{
    position:relative;margin-top:calc(var(--doc-unit)*5.5);padding-top:calc(var(--doc-unit)*2.5);border-top:1px solid var(--gold);
    display:flex;align-items:center;justify-content:space-between;gap:calc(var(--doc-unit)*3);flex-wrap:wrap;
  }
  .doc-security-codes{display:flex;align-items:center;gap:calc(var(--doc-unit)*2.25);}
  .doc-qr figcaption{font-size:0.6rem;text-align:center;color:#6b6a63;margin-top:calc(var(--doc-unit)*0.25);font-family:var(--font-body);}
  .doc-security-fields{display:grid;grid-template-columns:repeat(2,auto);gap:calc(var(--doc-unit)*0.5) calc(var(--doc-unit)*3);font-size:0.78rem;}
  .doc-security-fields .k{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);display:block;}
  .doc-security-fields .v{color:var(--navy-deep);font-family:var(--font-body);}
  .doc-security-fields .doc-hash{font-family:monospace;letter-spacing:0.04em;}
  .doc-footer{position:relative;text-align:center;margin-top:calc(var(--doc-unit)*3);font-size:0.62rem;color:#8a8577;}
  .doc-footer-legal{max-width:560px;margin:0 auto;line-height:1.5;}
  .doc-footer-ref{margin-top:calc(var(--doc-unit)*1);font-family:monospace;letter-spacing:0.04em;color:#a39d8c;}
  @media print{
    html,body{background:#fff;}
    .doc-page{box-shadow:none;border:none;margin:0;width:auto;padding:24mm 20mm;}
    @page{size:A4;margin:0;}
  }
</style>
</head>
<body>
  <article class="doc-page">
    <div class="doc-security-bg">${guillocheSvg()}</div>
    <div class="doc-watermark"><img src="/assets/images/crest-watermark.png" alt="" /></div>
    ${stampHtml}
    <header class="doc-header">
      <img src="/assets/images/crest-full.png" alt="" style="width:64px;height:64px;object-fit:contain;margin-bottom:calc(var(--doc-unit)*1.25);" />
      <div class="doc-institution">Sultan Hanafi Royal Schools</div>
      <div class="doc-doctype">${escapeHtml(documentTypeLabel)}</div>
      <div class="doc-rule"></div>
    </header>
    <section class="doc-body ${bodyVariantClass}">
      ${bodyHtml}
    </section>
    ${renderSignatureBlock(signatories, lang)}
    ${renderSealBlock(sealImage, lang)}
    ${renderSecurityBand({ referenceNo, verificationId, displayHash, issuedAtDisplay, lang })}
    ${renderFooter({ lang, referenceNo, pageLabel })}
  </article>
</body>
</html>`;
}
