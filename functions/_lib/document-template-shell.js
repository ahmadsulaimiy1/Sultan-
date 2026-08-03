// Shared Document Publication Shell — Design System v4.
//
// v4 implements the "Royal Heritage / Islamic Classical" hybrid
// concept the client selected from the ten-direction deck presented
// under the Final Executive Creative Direction (Phase 4 of that
// process — see docs/shrs-certificate-design-bible.md for the
// governing policy and docs/shrs-certificate-design-system-v4.md for
// the concrete decisions this file implements). It keeps v3's full
// heraldic apparatus (crest masthead, khatam corner rosette, embossed/
// foil seal ring with microtext) — the Royal Heritage half — and
// replaces v3's crosshatch micro-lattice border with a computed girih
// star-and-strap band in a distinct teal accent — the Islamic
// Classical half — so the two systems (heraldic gold, manuscript
// teal) read as deliberately paired, not as one undifferentiated
// gold everywhere. Per the design system doc's own scope note, this
// round rebuilds the shared shell and is verified specifically
// against the Graduation Certificate, the named flagship document;
// every other document type inherits v4 automatically and gets its
// own dedicated visual QA pass in a later round, the same v2→v2.1→v3
// pattern this project has already followed.
//
// What genuinely changed vs. what the original design directive asked
// for but is honestly out of a *shell* redesign's scope, stated
// plainly (the same "no field is improvised, no claim is overstated"
// discipline this project has held to throughout — unchanged from v3,
// restated here because it still governs this file):
//   - Palette, typography system, bespoke border, multi-layer
//     watermark, microtext, embossed/foil seal presentation — all
//     real, all implemented below.
//   - "Digital fingerprint" / "SHA-256 hash" — this document already
//     carries one real HMAC-SHA-256 content hash (document-hash.js);
//     it is labelled honestly with its actual algorithm rather than
//     presented as several different security features that don't
//     actually exist as distinct values.
//   - Duplicate detection, certified-copy/reissue/replacement history,
//     and revocation status are DATA-MODEL features, not rendering
//     features — `documentKind` already supports the certified-copy/
//     duplicate stamp, and `verification_log` already is the audit
//     trail (spec §3.7). Extending the schema for reissue chains and
//     revocation is real future work, tracked in the Master Spec,
//     not fabricated here as text that isn't backed by a real value.
//   - "Invisible registration marks" for offset print registration are
//     normally applied by a print shop's own prepress software against
//     real colour separations — a web shell can't produce a
//     functional one. What's included instead (print-media-only crop
//     ticks) is a real, honest convention: a trim-alignment cue, not a
//     press registration mark pretending to be more than it is.
//   - The faint multi-layer watermark raises the bar against casual
//     screenshot reproduction (compression and re-photography degrade
//     faint layered detail); it does not make screenshotting
//     "impossible," and this file does not claim that it does.
//
// Every graduation document type still renders through this ONE
// shell (header crest band, body slot, signature block, security
// band, seal position, footer) so every document type inherits one
// design system rather than independently drifting. Colours are this
// shell's own palette (below), inlined literally because this HTML is
// served standalone from an API endpoint, not through
// scripts/build.js's page pipeline — it is deliberately NOT the same
// palette as css/brand.css's public-website theme, because a
// government-grade credential and a marketing website are different
// design problems with different audiences.
//
// Rendering path, stated honestly: by itself this still only produces
// print-ready HTML. functions/_lib/pdf-render.js converts it to a
// real PDF via Cloudflare Browser Rendering where that binding is
// configured; the browser's own "Print / Save as PDF" remains an
// always-available fallback that needs no extra infrastructure.
//
// The institutional seal is NEVER fabricated (standing project rule,
// spec §12) — sealImage is only ever rendered if a real asset is
// supplied by the caller; absent that, a clearly-labelled reserved
// position is shown instead of an invented mark.
//
// Masthead assets — assets/images/crests/nigeria-coat-of-arms.png and
// shrs-institutional-crest.png are real, not fabricated: cropped
// directly from the client's own currently-issued Certificate of Good
// Conduct/Moral (Design System v2.1), following this project's
// standing rule for real seal/crest assets (§12). The Nigeria coat of
// arms is the country's public national emblem; the SHRS crest is the
// institution's own mark. No name, ID number, DOB, or photo belonging
// to the real students whose real documents these crests were cropped
// from was stored or reproduced anywhere in this codebase.

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
// artwork. Kept intentionally faint (the caller renders it at low
// opacity) so it reads as texture, not decoration.
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

// A second, larger, even fainter watermark layer — a big geometric
// rosette computed the same way as the corner ornament below, sized
// to sit behind the crest image. Two independently generated layers
// (this rosette + the crest photograph) at different scales and
// opacities is what "multi-layer watermark" means here in practice —
// not a claim that it defeats photography, only that it is genuinely
// two distinct, independently computed layers rather than one image
// relabelled as several security features.
function watermarkRosetteSvg() {
  const cx = 300, cy = 300;
  function starPath(outerR, innerR, points, rotationDeg) {
    let d = '';
    const rot = (rotationDeg * Math.PI) / 180;
    for (let i = 0; i < points * 2; i += 1) {
      const r = i % 2 === 0 ? outerR : innerR;
      const theta = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2 + rot;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
    }
    return `${d}Z`;
  }
  return `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="280" fill="none" stroke="currentColor" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="250" fill="none" stroke="currentColor" stroke-width="0.6"/>
    <path d="${starPath(260, 110, 8, 0)}" fill="none" stroke="currentColor" stroke-width="1"/>
    <path d="${starPath(260, 110, 8, 22.5)}" fill="none" stroke="currentColor" stroke-width="0.7"/>
  </svg>`;
}

// The corner ornament: a khatam — two 8-point stars overlaid at a
// 22.5° offset, the classical Islamic 8-fold interlocking rosette
// construction, plus a bounding ring and a centre point. Fully
// computed from trigonometry, never traced from any reference
// document's border art (the same discipline as guillocheSvg() and
// the barcode-table verification this project has used throughout).
// This replaces v2.1's single-star corner mark with a denser, more
// deliberate motif befitting a government-grade credential.
function khatamOrnamentSvg() {
  const cx = 34, cy = 34;
  function starPath(outerR, innerR, points, rotationDeg) {
    let d = '';
    const rot = (rotationDeg * Math.PI) / 180;
    for (let i = 0; i < points * 2; i += 1) {
      const r = i % 2 === 0 ? outerR : innerR;
      const theta = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2 + rot;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
    }
    return `${d}Z`;
  }
  return `<svg viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="currentColor" stroke-width="0.7" opacity="0.55"/>
    <path d="${starPath(25, 10.5, 8, 0)}" fill="none" stroke="currentColor" stroke-width="1"/>
    <path d="${starPath(25, 10.5, 8, 22.5)}" fill="none" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>
    <circle cx="${cx}" cy="${cy}" r="3" fill="currentColor" opacity="0.75"/>
  </svg>`;
}

// A single tile of a computed girih-family star-and-strap motif,
// encoded as an inline SVG data URI and repeated via plain CSS
// background-repeat on four separate edge strips (see .doc-frame-edge
// below) — the Islamic Classical half of the v4 hybrid (design system
// doc §3), replacing v3's crosshatch lattice with a genuine 8-point
// star construction (the same computed-trigonometry discipline as
// khatamOrnamentSvg() above, at a smaller repeating scale) bordered by
// its own tile edge, evoking the strap-line joins of a real girih
// tessellation without hand-tracing one. Tiled via plain CSS
// background-repeat rather than border-image 9-slice — that technique
// was tried for v3's border band, found to silently degenerate at
// small tile sizes, and replaced after the render-then-inspect
// discipline this project uses before shipping any visual change
// caught the failure; the same proven, simpler technique is reused
// here rather than re-attempting the one already known to be fragile.
function girihTileDataUri(colorHex) {
  const s = 20;
  const cx = s / 2;
  const cy = s / 2;
  const outerR = 8;
  const innerR = 3.4;
  const points = 8;
  let d = '';
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const theta = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}' viewBox='0 0 ${s} ${s}'>`
    + `<path d='${d}Z' fill='none' stroke='${colorHex}' stroke-width='0.7' opacity='0.6'/>`
    + `<rect x='0.5' y='0.5' width='${s - 1}' height='${s - 1}' fill='none' stroke='${colorHex}' stroke-width='0.4' opacity='0.3'/>`
    + `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// A ring of true microprint — real repeated text set on a circular
// path, a genuine security-document technique (not a decorative
// flourish standing in for one). Sized around the seal position so it
// reads at normal viewing distance as a fine engraved ring and only
// resolves as legible text under close inspection or magnification,
// exactly how microprint is meant to function on a real credential.
function microtextRingSvg(labelText, size = 132) {
  const r = size / 2 - 7;
  const cx = size / 2;
  const cy = size / 2;
  const approxCharWidth = 3.7;
  const circumference = 2 * Math.PI * r;
  const unit = `${labelText} • `;
  const repeatCount = Math.max(1, Math.round(circumference / (unit.length * approxCharWidth)));
  const full = escapeHtml(unit.repeat(repeatCount));
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><path id="microtextPath" d="M ${cx - r},${cy} a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 -${2 * r},0" /></defs>
    <text font-size="3.6" letter-spacing="0.6" fill="currentColor" opacity="0.8">
      <textPath href="#microtextPath" startOffset="0">${full}</textPath>
    </text>
  </svg>`;
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

// The seal position now carries an embossed/foil presentation ring
// (a CSS-only radial highlight plus a real microtext ring — see
// microtextRingSvg() above) regardless of whether a real seal image
// is supplied, since that framing is the shell's own design, not part
// of the seal artwork itself. The seal image remains the only thing
// that is ever conditionally real vs. a labelled placeholder.
function renderSealBlock(sealImage, lang) {
  const microtext = microtextRingSvg(lang === 'ar' ? 'مدارس السلطان حنفي الملكية' : 'SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL SEAL');
  const inner = sealImage
    ? `<img src="${escapeHtml(sealImage)}" alt="${lang === 'ar' ? 'الختم الرسمي' : 'Institutional Seal'}" />`
    : `<span>${escapeHtml(lang === 'ar' ? 'موضع الختم الرسمي — محجوز' : 'Institutional Seal — Reserved')}</span>`;
  return `<div class="doc-seal-frame">
    <div class="doc-seal-microtext">${microtext}</div>
    <div class="doc-seal${sealImage ? '' : ' doc-seal-reserved'}">${inner}</div>
  </div>`;
}

function renderSecurityBand({ referenceNo, verificationId, displayHash, issuedAtDisplay, lang }) {
  const t = lang === 'ar'
    ? { ref: 'الرقم المرجعي', ver: 'رقم التحقق', hash: 'البصمة الرقمية (HMAC-SHA-256)', issued: 'تاريخ الإصدار', scan: 'امسح للتحقق' }
    : { ref: 'Reference No.', ver: 'Verification ID', hash: 'Digital Fingerprint (HMAC-SHA-256)', issued: 'Issued', scan: 'Scan to verify' };
  return `<div class="doc-security-band">
    <div class="doc-security-codes">
      <figure class="doc-qr">
        <img src="/api/graduation-documents/qr?ref=${encodeURIComponent(referenceNo)}" alt="QR" width="92" height="92" />
        <figcaption>${escapeHtml(t.scan)}</figcaption>
      </figure>
      <figure class="doc-barcode">
        <img src="/api/graduation-documents/barcode?ref=${encodeURIComponent(referenceNo)}" alt="Barcode" height="44" />
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
    <div class="doc-footer-rule"></div>
    <div class="doc-footer-legal">${legal}</div>
    ${runningRef}
  </footer>`;
}

// referenceNo is the switch between an individually-verifiable
// document (seal + security band rendered) and an institutional
// publication with no per-document numbering (spec §1.1 footnote —
// the Graduation Register specifically). Omit referenceNo for that
// case; both the seal and the QR/barcode/hash band are skipped
// entirely rather than rendered against a number that doesn't exist.
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
  const frameTileUri = girihTileDataUri('#0F5C57');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(documentTitle)} — ${escapeHtml(recipientName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    /* Design System v4 palette — the Royal Heritage / Islamic Classical
       hybrid (docs/shrs-certificate-design-system-v4.md §1). Gold stays
       reserved for the heraldic apparatus (crest, seal, corner
       ornament, signatures); teal is the new manuscript-framing accent
       (the girih border band, the security band); oxblood is spent
       ONLY on exceptional-state stamps (duplicate/certified-copy/
       provisional), never elsewhere, per the Design Bible's §6 reserved-
       alert-colour rule. --gold is kept as the variable NAME (not the
       value) because caller-authored table markup in
       graduation-documents.js and graduation-register.js references
       var(--gold) directly. */
    --espresso:#221A10; --coffee:#4B3420; --gold:#9C7A35; --gold-soft:#C9A356;
    --champagne:#E4D0A0; --ivory:#FBF4E4; --cream:#F2E6CC; --warm-white:#FCF8F0;
    --milk:#FFFEFB; --ground:#F3EEDD; --teal:#0F5C57; --teal-wash:rgba(15,92,87,0.08);
    --sand:#C9BFA0; --navy-accent:#232B35; --oxblood:#6E1F2B;
    --font-display:'Cormorant Garamond','Amiri',serif;
    --font-hero:'Playfair Display','Amiri',serif;
    --font-label:'Cinzel','Amiri',serif;
    --font-body:'Inter','Cairo',sans-serif;
    /* shared 8px grid unit — every spacing value below is a literal
       multiple of this unit. */
    --doc-unit: 8px;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  /* v3 — the page now sits in a dark espresso vault rather than a flat
     tan field, so the ivory document itself reads as the presented
     object (the same convention gallery lighting / a framed diploma
     uses), not just floating on a website-coloured background. */
  body{
    font-family:var(--font-body);color:var(--espresso);
    background:radial-gradient(ellipse at 50% 18%, #3E2B18 0%, #1C1208 60%, #110B05 100%);
  }
  .doc-page{
    position:relative;width:1000px;max-width:100%;
    margin:calc(var(--doc-unit)*5) auto;
    padding:calc(var(--doc-unit)*8) calc(var(--doc-unit)*9) calc(var(--doc-unit)*7);
    background:var(--ground);border:1px solid var(--gold);
    box-shadow:
      0 0 0 5px var(--milk),
      0 0 0 6px var(--champagne),
      0 24px 70px rgba(17,11,5,0.55);
  }
  .doc-page::before{
    content:"";position:absolute;inset:calc(var(--doc-unit)*2.75);border:1px solid var(--gold);opacity:0.5;pointer-events:none;
  }
  /* v4 — the Islamic Classical half of the hybrid: four thin edge
     strips, each tiling a computed girih star-and-strap texture
     (girihTileDataUri()) in the teal accent via plain CSS
     background-repeat, replacing v3's gold crosshatch lattice. This is
     the "micro pattern / fine lines / engraving" border system named
     in the design directive, layered just inside the page edge and
     just outside the (still gold) corner ornaments — the two-colour
     separation is itself a hierarchy device (design system v4 §3):
     gold is the heraldic apparatus, teal is the manuscript framing. */
  .doc-frame-band{position:absolute;inset:calc(var(--doc-unit)*0.75);pointer-events:none;}
  .doc-frame-edge{
    position:absolute;background-image:url("${frameTileUri}");
    background-repeat:repeat;background-size:16px 16px;opacity:0.75;
  }
  .doc-frame-edge--top{top:0;left:0;right:0;height:calc(var(--doc-unit)*1.5);}
  .doc-frame-edge--bottom{bottom:0;left:0;right:0;height:calc(var(--doc-unit)*1.5);}
  .doc-frame-edge--left{top:0;bottom:0;left:0;width:calc(var(--doc-unit)*1.5);}
  .doc-frame-edge--right{top:0;bottom:0;right:0;width:calc(var(--doc-unit)*1.5);}
  /* corner ornaments — computed khatam rosettes (khatamOrnamentSvg()),
     sitting just inside the micro-engraved frame band. */
  .doc-corner{position:absolute;width:44px;height:44px;color:var(--gold);opacity:0.6;pointer-events:none;}
  .doc-corner svg{width:100%;height:100%;}
  .doc-corner--tl{top:calc(var(--doc-unit)*3.25);${dir === 'rtl' ? 'right' : 'left'}:calc(var(--doc-unit)*3.25);}
  .doc-corner--tr{top:calc(var(--doc-unit)*3.25);${dir === 'rtl' ? 'left' : 'right'}:calc(var(--doc-unit)*3.25);}
  .doc-corner--bl{bottom:calc(var(--doc-unit)*3.25);${dir === 'rtl' ? 'right' : 'left'}:calc(var(--doc-unit)*3.25);}
  .doc-corner--br{bottom:calc(var(--doc-unit)*3.25);${dir === 'rtl' ? 'left' : 'right'}:calc(var(--doc-unit)*3.25);}
  /* security background: a low-opacity, mathematically generated
     guilloché-style line field, distinct from the crest watermark and
     the rosette watermark layer, and layered beneath both. */
  .doc-security-bg{
    position:absolute;inset:0;opacity:0.07;color:var(--gold);pointer-events:none;overflow:hidden;
  }
  .doc-security-bg svg{width:100%;height:100%;}
  /* v3 — two independently generated watermark layers: a large
     computed rosette (watermarkRosetteSvg()) plus the real crest
     photograph, at different scales and opacities. See the file-level
     comment for what "multi-layer" honestly means here. */
  .doc-watermark-pattern{
    position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    opacity:0.035;color:var(--coffee);pointer-events:none;overflow:hidden;
  }
  .doc-watermark-pattern svg{width:640px;height:640px;}
  .doc-watermark{
    position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    opacity:0.05;pointer-events:none;overflow:hidden;
  }
  .doc-watermark img{width:480px;}
  .doc-kind-stamp{
    /* oxblood is reserved for exceptional-state stamps ONLY — Design
       Bible §6's reserved-alert-colour rule, so colour alone flags an
       exceptional document without competing with the teal/gold system
       used everywhere else. */
    position:absolute;top:calc(var(--doc-unit)*4.5);${dir === 'rtl' ? 'left' : 'right'}:calc(var(--doc-unit)*5);
    font-family:var(--font-label);font-size:0.72rem;letter-spacing:0.14em;color:var(--oxblood);
    border:1px solid var(--oxblood);padding:calc(var(--doc-unit)*0.5) calc(var(--doc-unit)*1.5);
    transform:rotate(${dir === 'rtl' ? '8deg' : '-8deg'});
  }
  .doc-header{position:relative;text-align:center;margin-bottom:calc(var(--doc-unit)*3.5);}
  .doc-header .doc-crests{
    display:flex;align-items:center;justify-content:center;gap:calc(var(--doc-unit)*3);margin-bottom:calc(var(--doc-unit)*1.5);
  }
  .doc-header .doc-crests img{height:60px;width:auto;object-fit:contain;}
  .doc-header .doc-nation{
    font-family:var(--font-label);font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--sand);
    margin-bottom:calc(var(--doc-unit)*0.5);
  }
  .doc-header .doc-institution{
    font-family:var(--font-label);font-size:0.86rem;letter-spacing:0.19em;text-transform:uppercase;color:var(--coffee);
  }
  .doc-header .doc-doctype{
    font-family:var(--font-label);font-size:0.68rem;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:var(--gold);
    margin-top:calc(var(--doc-unit)*0.75);
  }
  .doc-rule{height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:calc(var(--doc-unit)*2.25) auto;width:70%;}
  .doc-body{position:relative;font-family:var(--font-display);color:var(--espresso);}
  .doc-body--narrative{font-size:1.15rem;line-height:1.9;text-align:center;}
  .doc-body--narrative .doc-recipient{
    /* the one hero element per document — now set in a dedicated
       high-contrast display face (Playfair Display) rather than the
       same serif used for the surrounding prose, so it reads as an
       engraved name-plate, not just a bigger line of body text. */
    display:block;font-family:var(--font-hero);font-weight:700;font-size:2.5rem;color:var(--coffee);
    margin:calc(var(--doc-unit)*2.25) 0;letter-spacing:0.01em;
  }
  .doc-body--tabular{font-size:0.85rem;line-height:1.6;text-align:${dir === 'rtl' ? 'right' : 'left'};font-family:var(--font-body);}
  .doc-body--tabular .doc-recipient{
    display:block;font-family:var(--font-hero);font-weight:700;font-size:2rem;color:var(--coffee);
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
  .doc-sig-typed{font-family:'Cormorant Garamond',cursive;font-style:italic;font-size:1.5rem;color:var(--coffee);}
  .doc-sig-rule{height:1px;background:var(--gold);margin-top:calc(var(--doc-unit)*0.75);}
  .doc-sig-rule::after{content:"";display:block;height:1px;background:var(--sand);margin-top:2px;opacity:0.7;}
  .doc-sig-name{font-family:var(--font-label);font-size:0.62rem;letter-spacing:0.04em;color:var(--coffee);margin-top:calc(var(--doc-unit)*1);}
  .doc-sig-title{font-size:0.72rem;color:#7a7263;margin-top:calc(var(--doc-unit)*0.25);}
  /* v3 — the seal position now carries its own embossed/foil framing
     (a radial highlight simulating a raised/pressed impression) and a
     real microtext ring (microtextRingSvg()) around it, whether or
     not a real seal image is present — the framing is this shell's
     design, independent of whether the seal artwork itself is real. */
  .doc-seal-frame{
    position:relative;width:132px;height:132px;margin:calc(var(--doc-unit)*4.5) auto 0;
  }
  .doc-seal-microtext{position:absolute;inset:0;color:var(--gold);opacity:0.75;pointer-events:none;}
  .doc-seal-microtext svg{width:100%;height:100%;}
  .doc-seal{
    position:absolute;inset:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 35% 30%, var(--champagne) 0%, var(--ivory) 45%, var(--cream) 100%);
    box-shadow:inset 0 2px 5px rgba(36,23,8,0.28), inset 0 -2px 4px rgba(255,254,251,0.6), 0 1px 2px rgba(36,23,8,0.15);
  }
  .doc-seal img{width:78%;height:78%;object-fit:contain;filter:drop-shadow(0 1px 1px rgba(36,23,8,0.25));}
  .doc-seal-reserved{
    border:1px dashed var(--gold);background:none;box-shadow:none;
  }
  .doc-seal-reserved span{
    font-family:var(--font-label);font-size:0.54rem;letter-spacing:0.06em;text-align:center;color:var(--gold);
    text-transform:uppercase;padding:0 calc(var(--doc-unit)*1.5);
  }
  .doc-security-band{
    /* v4 — restyled to the teal half of the hybrid (design system v4
       §4): the verification zone is manuscript-framing territory, not
       heraldic territory, so its rule and wash move off gold. The
       mechanism underneath (hash/QR/barcode/reference fields) and its
       position as the quietest register on the page (Design Bible §4)
       are both unchanged from v3. */
    position:relative;margin-top:calc(var(--doc-unit)*5.5);padding:calc(var(--doc-unit)*2.5) calc(var(--doc-unit)*2);
    background:linear-gradient(180deg,transparent,var(--teal-wash) 35%,var(--teal-wash) 65%,transparent);
    border-top:1px solid var(--teal);border-bottom:1px solid var(--teal);
    display:flex;align-items:center;justify-content:space-between;gap:calc(var(--doc-unit)*3);flex-wrap:wrap;
  }
  .doc-security-codes{display:flex;align-items:center;gap:calc(var(--doc-unit)*2.25);}
  .doc-qr figcaption{font-size:0.6rem;text-align:center;color:#7a7263;margin-top:calc(var(--doc-unit)*0.25);font-family:var(--font-body);}
  .doc-security-fields{display:grid;grid-template-columns:repeat(2,auto);gap:calc(var(--doc-unit)*0.5) calc(var(--doc-unit)*3);font-size:0.78rem;}
  .doc-security-fields .k{font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--teal);display:block;}
  .doc-security-fields .v{color:var(--espresso);font-family:var(--font-body);}
  .doc-security-fields .doc-hash{font-family:monospace;letter-spacing:0.04em;}
  .doc-footer{position:relative;text-align:center;margin-top:calc(var(--doc-unit)*3);font-size:0.62rem;color:#8a8577;}
  .doc-footer-rule{height:1px;background:linear-gradient(90deg,transparent,var(--sand),transparent);width:40%;margin:0 auto calc(var(--doc-unit)*1.5);}
  .doc-footer-legal{max-width:560px;margin:0 auto;line-height:1.5;}
  .doc-footer-ref{margin-top:calc(var(--doc-unit)*1);font-family:monospace;letter-spacing:0.04em;color:#a39d8c;}
  @media print{
    html,body{background:#fff;}
    .doc-page{box-shadow:none;border:none;margin:0;width:auto;padding:24mm 20mm;}
    @page{size:A4;margin:0;}
    /* honest print convention, not a functional press-registration
       system (see file-level comment) — four fine trim-alignment
       ticks just outside the printable area. */
    .doc-crop-tick{position:fixed;width:10mm;height:10mm;pointer-events:none;}
    .doc-crop-tick::before,.doc-crop-tick::after{content:"";position:absolute;background:#000;}
    .doc-crop-tick::before{width:10mm;height:0.2mm;top:5mm;left:0;}
    .doc-crop-tick::after{width:0.2mm;height:10mm;left:5mm;top:0;}
    .doc-crop-tick--tl{top:2mm;left:2mm;}
    .doc-crop-tick--tr{top:2mm;right:2mm;}
    .doc-crop-tick--bl{bottom:2mm;left:2mm;}
    .doc-crop-tick--br{bottom:2mm;right:2mm;}
  }
  @media screen{.doc-crop-tick{display:none;}}
</style>
</head>
<body>
  <div class="doc-crop-tick doc-crop-tick--tl"></div>
  <div class="doc-crop-tick doc-crop-tick--tr"></div>
  <div class="doc-crop-tick doc-crop-tick--bl"></div>
  <div class="doc-crop-tick doc-crop-tick--br"></div>
  <article class="doc-page">
    <div class="doc-frame-band">
      <div class="doc-frame-edge doc-frame-edge--top"></div>
      <div class="doc-frame-edge doc-frame-edge--bottom"></div>
      <div class="doc-frame-edge doc-frame-edge--left"></div>
      <div class="doc-frame-edge doc-frame-edge--right"></div>
    </div>
    <div class="doc-corner doc-corner--tl">${khatamOrnamentSvg()}</div>
    <div class="doc-corner doc-corner--tr">${khatamOrnamentSvg()}</div>
    <div class="doc-corner doc-corner--bl">${khatamOrnamentSvg()}</div>
    <div class="doc-corner doc-corner--br">${khatamOrnamentSvg()}</div>
    <div class="doc-security-bg">${guillocheSvg()}</div>
    <div class="doc-watermark-pattern">${watermarkRosetteSvg()}</div>
    <div class="doc-watermark"><img src="/assets/images/crest-watermark.png" alt="" /></div>
    ${stampHtml}
    <header class="doc-header">
      <div class="doc-crests">
        <img src="/assets/images/crests/nigeria-coat-of-arms.png" alt="" />
        <img src="/assets/images/crests/shrs-institutional-crest.png" alt="" />
      </div>
      <div class="doc-nation">${lang === 'ar' ? 'جمهورية نيجيريا الإتحادية' : 'Federal Republic of Nigeria'}</div>
      <div class="doc-institution">${lang === 'ar' ? 'مدارس السلطان حنفي الملكية' : 'Sultan Hanafi Royal Schools'}</div>
      <div class="doc-doctype">${escapeHtml(documentTypeLabel)}</div>
      <div class="doc-rule"></div>
    </header>
    <section class="doc-body ${bodyVariantClass}">
      ${bodyHtml}
    </section>
    ${renderSignatureBlock(signatories, lang)}
    ${referenceNo ? renderSealBlock(sealImage, lang) : ''}
    ${referenceNo ? renderSecurityBand({ referenceNo, verificationId, displayHash, issuedAtDisplay, lang }) : ''}
    ${renderFooter({ lang, referenceNo, pageLabel })}
  </article>
</body>
</html>`;
}

// ---------------------------------------------------------------------
// JSS Register — "gilt state-credential" shell (new document family).
//
// The client supplied a reference mockup (a "Professional Certificate
// of Completion" + matching transcript pages) and, after a documented
// analysis-and-approval exchange, directed that it become the locked
// master template for JSS-tier documents specifically — a second,
// deliberately distinct register from Design System v4 above, not a
// replacement of it. v4 draws on a collegiate/manuscript vocabulary
// (continuous engraved guilloché+girih, restrained corners); this
// register draws on a "state-issued credential" vocabulary (punctuated
// gilt-frame ornament, a dual real seal, a top-right verification
// cluster, a simulated hologram strip) — the analysis that justified
// keeping both registers, rather than replacing v4, is recorded in the
// conversation and summarised in docs/shrs-master-graduation-document-
// specification.md's build log.
//
// What was decided, and why, before a line of this was written:
//   - The reference's second "Registered, Ministry of Education, Lagos
//     State" seal was NOT reproduced — SHRS has no real, verifiable
//     registration number to print truthfully, and this project never
//     fabricates an institutional claim. Instead, the dual-seal
//     convention is honoured with SHRS's own two REAL seals already on
//     file (document-seals.js): the CEREMONIAL gold medallion and the
//     REG (Registrar) ink stamp — a genuine dual-seal pair, not an
//     invented one.
//   - The hologram strip is a screen/PDF simulation (a computed
//     iridescent gradient + a tiled SVG wordmark), exactly like this
//     project's existing UV-layer honesty note (design bible §10): it
//     reads as a security feature on screen; it only becomes one
//     physically if a print vendor applies real holographic foil.
//   - No third "state" crest was added — SHRS has no real, extracted
//     Lagos State coat-of-arms asset in this codebase (only the real
//     Nigeria coat of arms and the real SHRS crest, both already used
//     in v4's masthead), and inventing or sourcing one was out of
//     scope for this round. The masthead below still carries both real
//     crests; a third can be added later if the client supplies one.
//   - A short, human-typeable "Verification Code" (distinct from the
//     existing long reference number and permanent verification ID) is
//     new to this register and genuinely useful, but is passed in as
//     data by the caller — generating one for real is a small backend
//     addition (not yet built) tracked as future work, the same
//     "named, not faked" discipline as every other pending item in
//     this file.

// Lightens (positive percent) or darkens (negative percent) a #rrggbb
// hex colour by mixing toward white/black — used only to derive the
// highlight/shadow tones dimensional-rendering needs (Category C,
// client-approved: "add realistic engraving, embossing, foil depth,
// highlights, and shadows... do not alter composition"). Never changes
// geometry, only the colour of duplicate/offset strokes already added
// deliberately alongside the original ones, so every element keeps its
// exact existing position and size.
function shadeHex(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + Math.round(255 * percent));
  const g = clamp(((num >> 8) & 0xff) + Math.round(255 * percent));
  const b = clamp((num & 0xff) + Math.round(255 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// A carved corner-bracket flourish — an L-shaped double arc with small
// curled terminals and dots, computed via SVG path/arc commands, not
// traced from the reference's own corner artwork. This is the
// "punctuated ornament" register's corner mark, deliberately different
// from khatamOrnamentSvg()'s star-rosette (v4's continuous-engraving
// register) — see the file header above for why both registers exist.
//
// Dimensional-rendering pass (Category C, approved): the dominant arc
// and the two "rivet" dots are now each traced three times — a darker
// shadow copy offset down-right, the original base stroke, and a
// lighter highlight copy offset up-left — the same highlight/shadow
// logic a real carved or cast ornament reflects under raking light.
// The base geometry (position, size, viewBox) is untouched, so the
// ornament occupies exactly the same 74x74px corner box as before;
// only the rendering gained depth.
function corneFlourishSvg(size = 96, colorHex = '#8A6A22') {
  const s = size;
  const highlight = shadeHex(colorHex, 0.4);
  const shadow = shadeHex(colorHex, -0.35);
  return `<svg viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.6,${s - 5.4} Q6.6,6.6 ${s - 5.4},6.6" fill="none" stroke="${shadow}" stroke-width="3.2" opacity="0.55"/>
    <path d="M5.4,${s - 6.6} Q5.4,5.4 ${s - 6.6},5.4" fill="none" stroke="${highlight}" stroke-width="1.6" opacity="0.6"/>
    <path d="M6,${s - 6} Q6,6 ${s - 6},6" fill="none" stroke="${colorHex}" stroke-width="3.2"/>
    <path d="M6,${s - 6} Q6,${s * 0.4} ${s * 0.4},6" fill="none" stroke="${colorHex}" stroke-width="1.2" opacity="0.6"/>
    <path d="M6,${s - 18} q-11,0 -11,13" fill="none" stroke="${colorHex}" stroke-width="2.2"/>
    <path d="M${s - 18},6 q0,-11 13,-11" fill="none" stroke="${colorHex}" stroke-width="2.2"/>
    <circle cx="6" cy="${s - 6}" r="4.2" fill="${colorHex}"/>
    <circle cx="${s - 6}" cy="6" r="4.2" fill="${colorHex}"/>
    <circle cx="5.3" cy="${s - 6.7}" r="1.3" fill="${highlight}" opacity="0.75"/>
    <circle cx="${s - 6.7}" cy="5.3" r="1.3" fill="${highlight}" opacity="0.75"/>
  </svg>`;
}

// A continuous engraved scroll/vine tile for the full perimeter frame
// band — a denser, richer companion to v4's girihTileDataUri(), used
// here so the border reads as continuously ornamented the whole way
// round (not just decorated at the four corners, which the first pass
// of this register got wrong per the client's correction: "the border
// system has been simplified and lost its premium engraved
// appearance"). Two interleaved wave traces plus small bud/leaf marks
// at each crest, computed from trigonometry exactly like every other
// ornament in this file — never traced from the reference's own
// border artwork.
//
// Dimensional-rendering pass (Category C, approved): the dominant wave
// (d1) is now flanked by a shadow trace (offset +0.4/+0.4, darker) and
// a highlight trace (offset -0.4/-0.4, lighter), the same intaglio
// bevel logic as corneFlourishSvg() above — so the frame band reads as
// an engraved groove under raking light rather than a flat printed
// line. The tile's own width/height (44x22) and the wave's own
// geometry are unchanged, so background-size/position on every
// .jss-frame-edge is pixel-identical to before; only the tile's
// rendered depth changed.
function engravedScrollTileDataUri(colorHex) {
  const w = 44;
  const h = 22;
  const highlight = shadeHex(colorHex, 0.45);
  const shadow = shadeHex(colorHex, -0.4);
  let d1 = '';
  let d1Hi = '';
  let d1Sh = '';
  let d2 = '';
  const buds = [];
  for (let i = 0; i <= w; i += 1) {
    const y1 = 11 + 6 * Math.sin((i / w) * Math.PI * 2);
    const y2 = 11 - 3.5 * Math.sin((i / w) * Math.PI * 2);
    d1 += `${i === 0 ? 'M' : 'L'}${i},${y1.toFixed(1)} `;
    d1Hi += `${i === 0 ? 'M' : 'L'}${(i - 0.4).toFixed(1)},${(y1 - 0.4).toFixed(1)} `;
    d1Sh += `${i === 0 ? 'M' : 'L'}${(i + 0.4).toFixed(1)},${(y1 + 0.4).toFixed(1)} `;
    d2 += `${i === 0 ? 'M' : 'L'}${i},${y2.toFixed(1)} `;
    if (i === Math.round(w * 0.25) || i === Math.round(w * 0.75)) {
      buds.push(`<circle cx="${i}" cy="${y1.toFixed(1)}" r="2.1" fill="${colorHex}" opacity="0.9"/>`);
      buds.push(`<circle cx="${(i - 0.5).toFixed(1)}" cy="${(y1 - 0.5).toFixed(1)}" r="0.8" fill="${highlight}" opacity="0.7"/>`);
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>`
    + `<path d='${d1Sh}' fill='none' stroke='${shadow}' stroke-width='1.4' opacity='0.5'/>`
    + `<path d='${d1Hi}' fill='none' stroke='${highlight}' stroke-width='0.9' opacity='0.55'/>`
    + `<path d='${d1}' fill='none' stroke='${colorHex}' stroke-width='1.4' opacity='0.85'/>`
    + `<path d='${d2}' fill='none' stroke='${colorHex}' stroke-width='0.9' opacity='0.45'/>`
    + buds.join('')
    + `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// A single tile of the simulated hologram strip: the institution's
// initials plus a small computed 8-point star glyph (reusing the same
// star-polygon construction as the corner ornaments, at a tiny scale),
// alternating top-to-bottom and tiled vertically via the same proven
// background-repeat technique as girihTileDataUri() above (not a new,
// riskier method). Denser than the first pass of this register, per
// the client's correction that the strip needed to read as rich/busy
// rather than a thin quiet line. The iridescent sheen itself is pure
// CSS (repeating-linear-gradient), layered on top in the caller's
// markup — this function only supplies the repeating glyph+wordmark
// layer.
function hologramTileDataUri(colorHex) {
  const w = 40;
  // h was 56, too short for a rotated 11px "SHRS" wordmark (~30px of
  // rendered width becomes vertical extent once rotated -90deg) — the
  // glyph overflowed the tile bounds and got cut by the next repeat,
  // rendering as "HRS" with the leading S clipped away. Widened to 76
  // so the full word clears the tile with margin on both sides; the
  // star glyph keeps its own original size/position.
  const h = 76;
  const cx = w / 2;
  const starCy = 14;
  const outerR = 6;
  const innerR = 2.6;
  let starD = '';
  for (let i = 0; i < 16; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const theta = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * Math.cos(theta);
    const y = starCy + r * Math.sin(theta);
    starD += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>`
    + `<path d='${starD}Z' fill='none' stroke='${colorHex}' stroke-width='1' opacity='0.65'/>`
    + `<text x='${cx}' y='${h - 12}' font-family='Georgia,serif' font-size='11' font-weight='700' `
    + `fill='${colorHex}' opacity='0.6' text-anchor='middle' dominant-baseline='middle' `
    + `transform='rotate(-90 ${cx} ${h - 12})'>SHRS</text>`
    + `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Signature + seal now render as ONE unified band (signatory — seal
// cluster — signatory), matching the reference's actual composition,
// where the client correctly flagged the first pass's separate
// stacked rows as reading "disconnected." Seals are enlarged for the
// same reason. Still only ever SHRS's own two real seal assets (see
// the file-header comment) — never a third, invented one.
function renderJssSignatureSealBand({ signatories = [], ceremonialSealImage, registrarSealImage, lang }) {
  const sig = (s) => `<div class="jss-sig-cell">
      <div class="jss-sig-mark">${s.signatureType === 'uploaded_image' && s.imageData
    ? `<img class="jss-sig-image" src="${escapeHtml(s.imageData)}" style="max-height:48px;max-width:190px;" alt="${escapeHtml(s.staffName)}" />`
    : `<span class="jss-sig-typed">${escapeHtml(s.typedName || s.staffName)}</span>`}</div>
      <div class="jss-sig-rule"></div>
      <div class="jss-sig-name">${escapeHtml(s.staffName)}</div>
      <div class="jss-sig-title">${escapeHtml(s.titleLine || s.label)}</div>
    </div>`;
  // Category B (invisible security improvement, per the client's own
  // A/B/C classification): a microtext ring behind each real seal,
  // reusing the same technique already built for Design System v4's
  // own seal presentation. Drawn at inset:0 inside the *existing*
  // 118x118px .jss-seal-cell box — no new pixels are added around the
  // seal, so its visible footprint is unchanged; the ring is a faint
  // (low-opacity) engraved layer under/at the seal's own rim, legible
  // only under close inspection, exactly how microprint is meant to
  // function on a real credential, not a decorative addition.
  const sealRing = (label) => `<div class="jss-seal-ring">${microtextRingSvg(label, 118)}</div>`;
  const sealCell = (img, label) => (img
    ? `<div class="jss-seal-cell">${sealRing(label)}<img src="${escapeHtml(img)}" alt="${escapeHtml(label)}" /></div>`
    : `<div class="jss-seal-cell jss-seal-reserved">${sealRing(label)}<span>${escapeHtml(lang === 'ar' ? 'محجوز' : 'Reserved')}</span></div>`);
  const left = signatories[0] ? sig(signatories[0]) : '<div class="jss-sig-cell"></div>';
  const right = signatories[1] ? sig(signatories[1]) : '<div class="jss-sig-cell"></div>';
  return `<div class="jss-sig-seal-band">
    ${left}
    <div class="jss-seal-pair">
      ${sealCell(ceremonialSealImage, lang === 'ar' ? 'الختم الاحتفالي' : 'Ceremonial Seal')}
      ${sealCell(registrarSealImage, lang === 'ar' ? 'ختم المسجل' : 'Registrar Seal')}
    </div>
    ${right}
  </div>`;
}

function renderJssVerificationCluster({ certificateNo, verificationCode, lang, dir }) {
  const t = lang === 'ar'
    ? { certNo: 'رقم الشهادة', code: 'رمز التحقق', verify: 'للتحقق قم بالمسح:' }
    : { certNo: 'Certificate No.', code: 'Verification Code', verify: 'Verify at:' };
  return `<div class="jss-verify-cluster">
    <div class="jss-verify-fields">
      <div><span class="k">${t.certNo}</span><span class="v">${escapeHtml(certificateNo)}</span></div>
      <div><span class="k">${t.code}</span><span class="v jss-code">${escapeHtml(verificationCode)}</span></div>
    </div>
    <figure class="jss-qr">
      <img src="/api/graduation-documents/qr?ref=${encodeURIComponent(certificateNo)}" alt="QR" width="76" height="76" />
      <figcaption>${escapeHtml(t.verify)}<br/>shroyalschools.ng/verify</figcaption>
    </figure>
  </div>`;
}

// The JSS Certificate — landscape, framed-for-display register. See
// the file-header comment above for the full account of what this
// deliberately does and does not reproduce from the client's reference
// mockup. Sample/placeholder data only in every caller until this
// register gets its own signatory-map + issuance-endpoint wiring
// (tracked as future work, per the header comment above) — the same
// "visual template first, backend wiring named separately" sequencing
// this project has used for every prior document-type round.
export function renderJssCertificateShell({
  documentTypeLabel, lang = 'en', dir = 'ltr', recipientName, idNumber, bodyHtml,
  certificateNo, verificationCode, issuedAtDisplay, issuedLocation, signatories = [],
  ceremonialSealImage = null, registrarSealImage = null,
}) {
  const holoTileUri = hologramTileDataUri('#B8912E');
  const frameTileUri = engravedScrollTileDataUri('#B8912E');
  const leadingEdge = dir === 'rtl' ? 'right' : 'left';
  const trailingEdge = dir === 'rtl' ? 'left' : 'right';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(documentTypeLabel)} — ${escapeHtml(recipientName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root{
    /* JSS register palette — a tighter, two-colour gilt-and-ink system
       (design decision #3 from the approval exchange): gold + espresso
       ink as the primary pair, oxblood reserved for emphasis values
       only (the DISTINCTION-style headline result), no teal — this
       register does not inherit v4's manuscript accent. Brightened
       from the first pass's #8A6A34 to a more saturated antique gold
       (#B8912E) per the client's correction that the register had
       drifted toward a "generic training certificate" look. */
    --jss-ink:#221A0E; --jss-gold:#B8912E; --jss-gold-deep:#8A6A22; --jss-gold-bright:#E4C878;
    --jss-ivory:#FAF3E2; --jss-oxblood:#7C1F2E; --jss-sand:#D8CBA8;
    /* Typographic unification (Category C, approved): the prior
       four-family mix (Cormorant Garamond / Playfair Display / Cinzel /
       Inter) collapses into one disciplined English serif — Cormorant
       Garamond, varied by size/weight/italic only, the same "one family
       carved at different scales" discipline the design report cites at
       Yale and Harvard — plus one disciplined Arabic serif, Amiri.
       Cinzel/Playfair/Inter/Cairo are no longer loaded at all for this
       register (see the trimmed Google Fonts link above), not just
       unreferenced — an honest removal, not a silent leftover. */
    --font-display:'Cormorant Garamond','Amiri',serif;
    --font-hero:'Cormorant Garamond','Amiri',serif;
    --font-label:'Cormorant Garamond','Amiri',serif;
    --font-body:'Cormorant Garamond','Amiri',serif;
    --doc-unit:8px;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    font-family:var(--font-body);color:var(--jss-ink);
    background:radial-gradient(ellipse at 50% 18%, #3E2B18 0%, #1C1208 60%, #110B05 100%);
  }
  .jss-page{
    position:relative;width:1300px;max-width:100%;margin:calc(var(--doc-unit)*4) auto;
    padding:52px 60px 40px;
    background:var(--jss-ivory);
    border:3px solid var(--jss-gold-deep);
    box-shadow:
      inset 0 0 0 3px var(--jss-gold-bright),
      inset 0 0 0 44px var(--jss-ivory),
      inset 0 0 0 47px var(--jss-gold),
      inset 0 0 0 49px var(--jss-gold-bright),
      inset 0 0 0 58px var(--jss-ivory),
      inset 0 0 0 59px var(--jss-gold-deep),
      0 0 0 5px var(--jss-ivory),
      0 24px 70px rgba(17,11,5,0.55);
  }
  /* Continuous engraved frame band (engravedScrollTileDataUri()) — the
     fix for the client's core correction: the border must be
     ornamented the whole way round, not just decorated at the
     corners. Four edge strips, same proven background-repeat
     technique already validated elsewhere in this file. */
  .jss-frame-band{
    position:absolute;inset:14px;pointer-events:none;
    /* Category C, approved (dimensional rendering): a faint inset
       highlight/shadow pair along the whole band reinforces the
       carved-channel read the tile itself now provides — no size or
       position change, box-shadow never affects layout. */
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(34,26,14,0.22);
  }
  .jss-frame-edge{position:absolute;background-image:url("${frameTileUri}");background-repeat:repeat;opacity:0.9;}
  .jss-frame-edge--top{top:0;left:0;right:0;height:22px;background-size:44px 22px;}
  .jss-frame-edge--bottom{bottom:0;left:0;right:0;height:22px;background-size:44px 22px;transform:scaleY(-1);}
  .jss-frame-edge--left{top:0;bottom:0;left:0;width:22px;background-size:22px 44px;}
  .jss-frame-edge--right{top:0;bottom:0;right:0;width:22px;background-size:22px 44px;transform:scaleX(-1);}
  /* punctuated corner ornament — layered ON TOP of the continuous
     frame band for extra density exactly where the reference has it,
     not as a substitute for the band. */
  .jss-corner{position:absolute;width:74px;height:74px;color:var(--jss-gold-deep);opacity:0.95;pointer-events:none;z-index:2;}
  .jss-corner svg{width:100%;height:100%;}
  .jss-corner--tl{top:8px;${leadingEdge}:8px;}
  .jss-corner--tr{top:8px;${trailingEdge}:8px;transform:scaleX(-1);}
  .jss-corner--bl{bottom:8px;${leadingEdge}:8px;transform:scaleY(-1);}
  .jss-corner--br{bottom:8px;${trailingEdge}:8px;transform:scale(-1,-1);}
  /* the simulated hologram/foil security strip — a computed iridescent
     sheen (pure CSS) layered over a tiled SHRS wordmark+star
     (hologramTileDataUri()). Screen/PDF simulation only; see the file
     header comment for the honesty boundary. Widened and deepened per
     the client's correction that the first pass read as too thin. */
  .jss-holo-strip{
    position:absolute;top:66px;bottom:66px;${leadingEdge}:66px;width:40px;z-index:1;
    background:
      repeating-linear-gradient(125deg, rgba(255,255,255,0) 0px, rgba(120,190,255,0.34) 6px, rgba(255,120,220,0.30) 12px, rgba(255,225,120,0.30) 18px, rgba(130,255,190,0.30) 24px, rgba(255,255,255,0) 30px),
      url("${holoTileUri}") repeat, var(--jss-ivory);
    border:1px solid var(--jss-gold-bright);
    /* was 'overlay': against this near-white ivory backdrop, overlay's
       high-luminance branch behaves like 'screen', which washes the
       pastel gradient stops toward white until they're essentially
       invisible. 'multiply' actually imprints the gradient's colour
       onto the light backdrop, producing the intended visible sheen. */
    background-blend-mode:multiply, normal, normal;
  }
  /* Category B (invisible security improvement, per the client's own
     A/B/C classification): a full-field engraved guilloché texture —
     the security-document-analysis doc's #1 finding was that the prior
     passes only textured the border band, leaving the reading field a
     flat empty substrate, unlike a real security document where the
     engraved field runs edge to edge. This does not touch the visible
     identity (layout, colour, typography, borders) the client froze —
     it only adds depth beneath what is already there, at the same low
     opacity discipline already used for v4's own guilloché layer. */
  .jss-security-bg{
    position:absolute;inset:0;opacity:0.05;color:var(--jss-gold-deep);pointer-events:none;overflow:hidden;
  }
  .jss-security-bg svg{width:100%;height:100%;}
  .jss-watermark{
    position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    opacity:0.05;pointer-events:none;overflow:hidden;
  }
  .jss-watermark img{width:520px;}
  .jss-body-wrap{position:relative;margin-${leadingEdge}:64px;padding-${leadingEdge}:calc(var(--doc-unit)*4.5);padding-${trailingEdge}:calc(var(--doc-unit)*5);}
  .jss-masthead{display:flex;align-items:flex-start;justify-content:space-between;gap:calc(var(--doc-unit)*3);flex-wrap:wrap;}
  .jss-crests{display:flex;align-items:center;justify-content:center;gap:calc(var(--doc-unit)*5);flex:1;min-width:300px;}
  .jss-crests img{height:70px;width:auto;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(34,26,14,0.28));}
  .jss-crest-cell{text-align:center;font-family:var(--font-label);font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--jss-ink);}
  .jss-verify-cluster{
    display:flex;align-items:center;gap:calc(var(--doc-unit)*1.5);
    border:1.5px solid var(--jss-gold-deep);border-radius:2px;padding:calc(var(--doc-unit)*1) calc(var(--doc-unit)*1.5);
    background:rgba(184,145,46,0.08);
  }
  .jss-verify-fields{display:flex;flex-direction:column;gap:3px;font-size:0.7rem;}
  .jss-verify-fields .k{font-family:var(--font-label);letter-spacing:0.06em;text-transform:uppercase;color:var(--jss-gold-deep);display:block;font-size:0.58rem;}
  .jss-verify-fields .v{font-family:var(--font-body);color:var(--jss-ink);font-weight:600;font-variant-numeric:lining-nums tabular-nums;}
  .jss-verify-fields .jss-code{letter-spacing:0.03em;}
  .jss-qr{margin:0;text-align:center;}
  .jss-qr figcaption{font-size:0.52rem;color:#6b6357;margin-top:2px;line-height:1.3;}
  .jss-title-band{text-align:center;margin-top:calc(var(--doc-unit)*1.5);}
  .jss-institution{font-family:var(--font-label);font-weight:600;font-size:1.5rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--jss-ink);}
  .jss-doctype{
    font-family:var(--font-hero);font-weight:700;font-size:2.15rem;color:var(--jss-gold-deep);
    margin-top:calc(var(--doc-unit)*0.5);letter-spacing:0.01em;
  }
  .jss-rule{height:2px;background:linear-gradient(90deg,transparent,var(--jss-gold-deep) 15%,var(--jss-gold-bright) 50%,var(--jss-gold-deep) 85%,transparent);margin:calc(var(--doc-unit)*1.5) auto;width:72%;}
  .jss-body{position:relative;text-align:center;font-family:var(--font-display);}
  .jss-body .jss-eyebrow{font-family:var(--font-display);font-style:italic;font-size:1.05rem;color:var(--jss-ink);opacity:0.85;}
  .jss-body .jss-recipient{
    display:block;font-family:var(--font-hero);font-weight:700;font-size:4.1rem;color:var(--jss-ink);
    margin:calc(var(--doc-unit)*1) 0;letter-spacing:0.01em;line-height:1.05;
  }
  .jss-body .jss-recipient-rule{height:1.5px;width:52%;margin:0 auto calc(var(--doc-unit)*1.5);background:linear-gradient(90deg,transparent,var(--jss-gold-deep),transparent);}
  .jss-body .jss-id-line{font-family:var(--font-label);font-size:0.78rem;letter-spacing:0.05em;color:var(--jss-ink);opacity:0.85;margin-bottom:calc(var(--doc-unit)*1.5);}
  .jss-body .jss-id-line b{color:var(--jss-gold-deep);font-variant-numeric:lining-nums tabular-nums;}
  .jss-body .jss-headline{font-size:1.12rem;line-height:1.75;color:var(--jss-ink);max-width:920px;margin:0 auto;}
  .jss-body .jss-award{
    display:block;font-family:var(--font-label);font-weight:600;font-size:1.3rem;letter-spacing:0.05em;
    color:var(--jss-gold-deep);margin:calc(var(--doc-unit)*2) 0 calc(var(--doc-unit)*0.5);text-transform:uppercase;
  }
  .jss-body .jss-award .jss-result{color:var(--jss-oxblood);}
  .jss-body .jss-testimony{font-size:0.86rem;line-height:1.6;color:var(--jss-ink);opacity:0.85;max-width:760px;margin:calc(var(--doc-unit)*2) auto 0;}
  .jss-sig-seal-band{display:flex;align-items:center;justify-content:space-between;gap:calc(var(--doc-unit)*3);margin-top:calc(var(--doc-unit)*4);}
  .jss-sig-cell{width:240px;text-align:center;}
  .jss-sig-mark{height:calc(var(--doc-unit)*6.5);display:flex;align-items:flex-end;justify-content:center;}
  .jss-sig-typed{font-family:'Cormorant Garamond',cursive;font-style:italic;font-size:1.55rem;color:var(--jss-ink);}
  .jss-sig-rule{height:1.5px;background:var(--jss-gold-deep);margin-top:calc(var(--doc-unit)*0.75);}
  .jss-sig-name{font-family:var(--font-label);font-size:0.68rem;color:var(--jss-ink);margin-top:calc(var(--doc-unit)*1);}
  .jss-sig-title{font-size:0.74rem;color:#6b6357;margin-top:2px;}
  .jss-seal-pair{display:flex;align-items:center;justify-content:center;gap:calc(var(--doc-unit)*2.5);}
  .jss-seal-cell{width:118px;height:118px;display:flex;align-items:center;justify-content:center;position:relative;}
  .jss-seal-cell img{
    width:100%;height:100%;object-fit:cover;
    /* The two real seal source photographs each sit on their own plain
       card background (white behind the ceremonial seal, grey behind
       the registrar ink stamp) rather than a transparent field — at
       object-fit:contain that background rendered as a visible square
       card floating on the page, exactly the "flat pasted image" look
       the drop-shadow below was meant to avoid. A circular clip crops
       to the seal's own circular device (both source images are
       circular medallions/stamps well inside their frame), so only the
       real seal artwork shows, no source-photo background — the seal
       artwork itself is unchanged, only how much of its source photo
       is displayed. object-fit switched to cover so the crop fills the
       circle without letterboxing.
       Category C, approved (dimensional rendering): a layered
       drop-shadow — a soft ambient cast shadow plus a tighter contact
       shadow — so the seal reads as a raised/embossed medallion resting
       on the page rather than a flat pasted image. Same 118x118px box,
       same image, no resize. */
    clip-path:circle(47% at 50% 50%);
    filter:drop-shadow(0 4px 6px rgba(34,26,14,0.38)) drop-shadow(0 1px 2px rgba(34,26,14,0.22));
  }
  /* A contained foil/glass sheen highlight, inset within the seal's own
     footprint (never spilling past its edge) — the "foil depth"
     requirement, layered above the seal image and its microtext ring
     via mix-blend-mode so it reads as a lighting effect, not a flat
     white overlay. */
  .jss-seal-cell::after{
    content:'';position:absolute;inset:6px;border-radius:50%;pointer-events:none;
    background:radial-gradient(circle at 32% 26%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 46%);
    mix-blend-mode:overlay;
  }
  .jss-seal-ring{position:absolute;inset:0;color:var(--jss-gold-deep);opacity:0.3;pointer-events:none;}
  .jss-seal-ring svg{width:100%;height:100%;}
  .jss-seal-reserved{border:1.5px dashed var(--jss-gold-deep);border-radius:50%;}
  .jss-seal-reserved span{font-family:var(--font-label);font-size:0.52rem;color:var(--jss-gold-deep);text-transform:uppercase;}
  .jss-footer{
    display:flex;align-items:center;justify-content:space-between;gap:calc(var(--doc-unit)*3);flex-wrap:wrap;
    margin-top:calc(var(--doc-unit)*4);padding-top:calc(var(--doc-unit)*2);border-top:1.5px solid var(--jss-gold-deep);
    font-size:0.68rem;color:#5c5648;
  }
  .jss-footer-issued{text-align:${leadingEdge};}
  .jss-footer-issued b{color:var(--jss-ink);font-variant-numeric:lining-nums tabular-nums;}
  .jss-footer-legal{max-width:460px;flex:none;text-align:${trailingEdge};line-height:1.5;}
  @media print{
    html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .jss-page{box-shadow:none;margin:0;width:auto;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{size:A4 landscape;margin:0;}
  }
</style>
</head>
<body>
  <article class="jss-page">
    <div class="jss-frame-band">
      <div class="jss-frame-edge jss-frame-edge--top"></div>
      <div class="jss-frame-edge jss-frame-edge--bottom"></div>
      <div class="jss-frame-edge jss-frame-edge--left"></div>
      <div class="jss-frame-edge jss-frame-edge--right"></div>
    </div>
    <div class="jss-corner jss-corner--tl">${corneFlourishSvg()}</div>
    <div class="jss-corner jss-corner--tr">${corneFlourishSvg()}</div>
    <div class="jss-corner jss-corner--bl">${corneFlourishSvg()}</div>
    <div class="jss-corner jss-corner--br">${corneFlourishSvg()}</div>
    <div class="jss-security-bg">${guillocheSvg()}</div>
    <div class="jss-holo-strip"></div>
    <div class="jss-watermark"><img src="/assets/images/crest-watermark.png" alt="" /></div>
    <div class="jss-body-wrap">
      <header class="jss-masthead">
        <div class="jss-crests">
          <div class="jss-crest-cell"><img src="/assets/images/crests/nigeria-coat-of-arms.png" alt="" /><div>${lang === 'ar' ? 'جمهورية نيجيريا' : 'Federal Republic of Nigeria'}</div></div>
          <div class="jss-crest-cell"><img src="/assets/images/crests/shrs-institutional-crest.png" alt="" /><div>${lang === 'ar' ? 'مدارس السلطان حنفي الملكية' : 'Sultan Hanafi Royal Schools'}</div></div>
        </div>
        ${renderJssVerificationCluster({ certificateNo, verificationCode, lang, dir })}
      </header>
      <div class="jss-title-band">
        <div class="jss-institution">${lang === 'ar' ? 'مدارس السلطان حنفي الملكية' : 'Sultan Hanafi Royal Schools'}</div>
        <div class="jss-doctype">${escapeHtml(documentTypeLabel)}</div>
        <div class="jss-rule"></div>
      </div>
      <section class="jss-body">
        ${bodyHtml}
      </section>
      ${renderJssSignatureSealBand({ signatories, ceremonialSealImage, registrarSealImage, lang })}
      <footer class="jss-footer">
        <div class="jss-footer-issued">${lang === 'ar' ? 'صدرت بتاريخ' : 'Issued'} <b>${escapeHtml(issuedAtDisplay)}</b>${issuedLocation ? ` · ${escapeHtml(issuedLocation)}` : ''} · <b>${escapeHtml(certificateNo)}</b></div>
        <div class="jss-footer-legal">${lang === 'ar'
    ? 'وثيقة رسمية صادرة عن مدارس السلطان حنفي الملكية — تحقق دائمًا عبر منصة التحقق الرسمية، لا تعتمد على نسخة غير مؤكدة.'
    : 'An official document issued by Sultan Hanafi Royal Schools — always verify through the official verification platform; do not rely on an unconfirmed copy.'}</div>
      </footer>
    </div>
  </article>
</body>
</html>`;
}
