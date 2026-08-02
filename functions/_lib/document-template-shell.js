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
