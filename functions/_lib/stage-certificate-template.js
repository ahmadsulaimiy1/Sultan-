// Academic Stage Certificate — ROYAL FLAGSHIP EDITION (v2).
//
// Client design authority directive, 2026-08-05: the certificate must
// read as a professionally engraved, luxury-printed royal academic
// credential — not a generated template. This module is therefore an
// ATELIER PIECE rendered through the automated pipeline: every visual
// element below is constructed geometry (parametric guilloché rosettes,
// arabesque strapwork, engraved frames, microtext rings, metallic
// gradients, parchment grain via SVG turbulence), not stock decoration.
//
// STRICT PALETTE (client brand, no green anywhere):
//   Rich Coffee Brown  #3A2A18 / #4B3420 / espresso #221A10
//   Deep Royal Gold    #6E5013 → #8C6516 → #B8860B → #D4AF37 → #F1E3B2
//   Warm Cream/Ivory   #FBF4E4 / #F6EDD8 / #FDF6E3
//   Crimson (limited)  #7A1F2B
//   Navy (minimal)     #1F2A44
//
// Composition (client-specified):
//   Upper LEFT:  Nigeria coat of arms + SHRS crest, above
//                Federal Republic of Nigeria / Sultan Hanafi Royal
//                Schools / School of Islamic & Arabic Studies
//   Upper RIGHT: gold award medallion + engraved certificate-ID plaque,
//                above جمهورية نيجيريا الاتحادية / مدارس السلطان حنفي
//                الملكية / قسم الدراسات الإسلامية والعربية
//   Titles side by side — English left, Arabic right.
//   Student name: realistic gold-foil, embossed, the central prestige
//   element. Security apparatus: guilloché field + border microtext
//   carrying the live serial + blind-embossed seal + gold/silver
//   holographic foil strip + QR verification cartouche + HMAC line.
//
// Typography: Arabic — Aref Ruqaa (display), Amiri (text), Reem Kufi /
// Kufam (labels). English — Cinzel / Cinzel Decorative (engraved
// display), Cormorant Garamond (text). All loaded as real fonts.
//
// Data contract unchanged: `cert` is a stage_certificates row; nothing
// on the document is improvised at render time.

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function arForms(sex) {
  if (String(sex || '').toLowerCase() === 'female') {
    return { student: 'الطالبة', completion: 'لإتمامها', achieving: 'وحصولها' };
  }
  return { student: 'الطالب', completion: 'لإتمامه', achieving: 'وحصوله' };
}

function formatGregorianEn(isoDate) {
  const d = new Date(String(isoDate).slice(0, 10) + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return String(isoDate);
  const day = d.getUTCDate();
  const ordinal = (n) => {
    if (n % 100 >= 11 && n % 100 <= 13) return 'th';
    return ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th';
  };
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${day}${ordinal(day)} ${months[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
}

function formatGregorianAr(isoDate) {
  const d = new Date(String(isoDate).slice(0, 10) + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return String(isoDate);
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}م`;
}

// ─────────────────────────────────────────────────────────────────────
// Engraving geometry — real parametric curves, the way security
// printers build guilloché: epitrochoid rosettes and interleaved
// sine bands, stroked at hairline weights.
// ─────────────────────────────────────────────────────────────────────

// One epitrochoid rosette path (spirograph family).
function rosettePath(cx, cy, R, r, p, steps = 720) {
  const pts = [];
  const k = (R - r) / r;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * r / gcd(R, r);
    const x = cx + (R - r) * Math.cos(t) + p * Math.cos(k * t);
    const y = cy + (R - r) * Math.sin(t) - p * Math.sin(k * t);
    pts.push((i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2));
  }
  return pts.join('');
}
function gcd(a, b) { a = Math.round(a); b = Math.round(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }

// A layered guilloché medallion (several rosettes superimposed).
function guillocheMedallion(cx, cy, scale, stroke, opacity) {
  const layers = [
    [scale * 1.00, scale * 0.31, scale * 0.42],
    [scale * 0.94, scale * 0.23, scale * 0.55],
    [scale * 0.82, scale * 0.41, scale * 0.28],
  ];
  return layers.map(([R, r, p]) =>
    `<path d="${rosettePath(cx, cy, R, r, p)}" fill="none" stroke="${stroke}" stroke-width="0.07" opacity="${opacity}"/>`
  ).join('');
}

// Interleaved sine-band guilloché (border wave), horizontal.
function guillocheBand(x, y, w, h, strands, stroke, opacity) {
  const paths = [];
  for (let s = 0; s < strands; s++) {
    const phase = (s / strands) * Math.PI * 2;
    const amp = h * 0.42;
    const pts = [];
    const steps = Math.round(w / 0.9);
    for (let i = 0; i <= steps; i++) {
      const px = x + (i / steps) * w;
      const py = y + h / 2 + amp * Math.sin((i / steps) * Math.PI * 2 * (w / 14) + phase);
      pts.push((i ? 'L' : 'M') + px.toFixed(2) + ' ' + py.toFixed(2));
    }
    paths.push(`<path d="${pts.join('')}" fill="none" stroke="${stroke}" stroke-width="0.07" opacity="${opacity}"/>`);
  }
  return paths.join('');
}

// Eight-fold khatam corner medallion — engraved gold on brown.
function cornerMedallion(cx, cy) {
  const star = (r1, r2, rot) => {
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? r1 : r2;
      const a = (i / 16) * Math.PI * 2 + rot;
      pts.push((i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2));
    }
    return pts.join('') + 'Z';
  };
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="8.6" fill="url(#goldMetal)" stroke="#3A2A18" stroke-width="0.28"/>
    <circle cx="${cx}" cy="${cy}" r="8.0" fill="none" stroke="#5C431F" stroke-width="0.12" stroke-dasharray="0.35 0.35"/>
    <path d="${star(7.0, 3.2, 0)}" fill="#3A2A18"/>
    <path d="${star(5.4, 2.4, Math.PI / 8)}" fill="url(#goldMetal)"/>
    <circle cx="${cx}" cy="${cy}" r="1.5" fill="#7A1F2B"/>
    <circle cx="${cx}" cy="${cy}" r="0.55" fill="#F1E3B2"/>
  </g>`;
}

// The full engraved frame layer: one SVG covering the sheet (units=mm).
// Carries the coffee band, arabesque strapwork band, hairlines, corner
// medallions, border guilloché, and the serial microtext ring.
function frameSvg(serial) {
  const W = 297, H = 209.5;
  const micro = `SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL ACADEMIC CREDENTIAL · ${serial} · `.repeat(6);
  // Rectangular path for microtext, clockwise, inset 11.1mm.
  const m = 11.1;
  const microPath = `M ${m + 2} ${m} H ${W - m} V ${H - m} H ${m} V ${m + 1} Z`;
  return `<svg class="frame" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="goldMetal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8C6516"/><stop offset="0.28" stop-color="#D9B44A"/>
      <stop offset="0.5" stop-color="#F3E3AC"/><stop offset="0.72" stop-color="#C49A2C"/>
      <stop offset="1" stop-color="#6E5013"/>
    </linearGradient>
    <linearGradient id="goldMetalV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#B8860B"/><stop offset="0.5" stop-color="#EBD48C"/>
      <stop offset="1" stop-color="#8C6516"/>
    </linearGradient>
    <pattern id="strapwork" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#3A2A18"/>
      <g fill="none" stroke="#C49A2C" stroke-width="0.32">
        <path d="M0 4 L2 2 L4 4 L2 6 Z M4 4 L6 2 L8 4 L6 6 Z"/>
        <path d="M2 0 L4 2 M4 2 L6 0 M2 8 L4 6 M4 6 L6 8"/>
      </g>
      <g fill="none" stroke="#8C6516" stroke-width="0.18">
        <circle cx="4" cy="4" r="1.1"/>
        <path d="M0 0 L1 1 M8 0 L7 1 M0 8 L1 7 M8 8 L7 7"/>
      </g>
      <circle cx="4" cy="4" r="0.34" fill="#7A1F2B"/>
    </pattern>
    <path id="microring" d="${microPath}"/>
  </defs>

  <!-- outer hairline on the paper edge -->
  <rect x="2.6" y="2.6" width="${W - 5.2}" height="${H - 5.2}" fill="none" stroke="#8C6516" stroke-width="0.18"/>

  <!-- coffee foundation band -->
  <rect x="3.6" y="3.6" width="${W - 7.2}" height="${H - 7.2}" fill="none" stroke="#3A2A18" stroke-width="2.3"/>
  <rect x="2.9" y="2.9" width="${W - 5.8}" height="${H - 5.8}" fill="none" stroke="#B8860B" stroke-width="0.14"/>
  <rect x="4.9" y="4.9" width="${W - 9.8}" height="${H - 9.8}" fill="none" stroke="#D9B44A" stroke-width="0.22"/>

  <!-- arabesque strapwork band -->
  <rect x="5.6" y="5.6" width="${W - 11.2}" height="${H - 11.2}" fill="none" stroke="url(#strapwork)" stroke-width="3.6"/>
  <rect x="7.55" y="7.55" width="${W - 15.1}" height="${H - 15.1}" fill="none" stroke="#B8860B" stroke-width="0.16"/>

  <!-- crimson pinstripe + gold double rule -->
  <rect x="9.2" y="9.2" width="${W - 18.4}" height="${H - 18.4}" fill="none" stroke="#7A1F2B" stroke-width="0.32"/>
  <rect x="10.1" y="10.1" width="${W - 20.2}" height="${H - 20.2}" fill="none" stroke="#8C6516" stroke-width="0.42"/>
  <rect x="12.2" y="12.2" width="${W - 24.4}" height="${H - 24.4}" fill="none" stroke="#8C6516" stroke-width="0.14"/>

  <!-- serial microtext ring (anti-counterfeit, legible under magnification) -->
  <text font-family="Inter, sans-serif" font-size="0.85" letter-spacing="0.14" fill="#6E5013" opacity="0.62">
    <textPath href="#microring">${escapeHtml(micro)}</textPath>
  </text>

  <!-- border guilloché waves top & bottom inside the double rule -->
  ${guillocheBand(14, 12.8, W - 28, 2.2, 3, '#8C6516', 0.5)}
  ${guillocheBand(14, H - 15.0, W - 28, 2.2, 3, '#8C6516', 0.5)}

  <!-- corner medallions -->
  ${cornerMedallion(11.6, 11.6)}
  ${cornerMedallion(W - 11.6, 11.6)}
  ${cornerMedallion(W - 11.6, H - 11.6)}
  ${cornerMedallion(11.6, H - 11.6)}

  <!-- central guilloché prestige field, visible on close inspection —
       kept low, behind the citation, clear of the foil name -->
  <g>${guillocheMedallion(W / 2, H / 2 + 26, 48, '#4B3420', 0.038)}</g>
</svg>`;
}

// Parchment grain — SVG turbulence as a data URI (premium paper feel).
const PARCHMENT = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360">
    <filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
    <feColorMatrix values="0 0 0 0 0.29  0 0 0 0 0.21  0 0 0 0 0.12  0 0 0 0.055 0"/></filter>
    <rect width="360" height="360" filter="url(#p)"/></svg>`
);

// Foil grain — subtle metallic texture for foil surfaces.
const FOILGRAIN = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="11"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.8  0 0 0 0.10 0"/></filter>
    <rect width="120" height="120" filter="url(#g)"/></svg>`
);

// The premium gold award medallion — engraved metal, milled edge,
// guilloché ring, khatam star, real SHRS crest at centre, ribbon.
function awardMedallion() {
  return `<svg viewBox="0 0 100 128" xmlns="http://www.w3.org/2000/svg" class="medallion-svg" aria-hidden="true">
  <defs>
    <radialGradient id="mgold" cx="0.36" cy="0.3" r="0.95">
      <stop offset="0" stop-color="#F7EBC0"/><stop offset="0.35" stop-color="#DDBB55"/>
      <stop offset="0.7" stop-color="#B8860B"/><stop offset="1" stop-color="#6E5013"/>
    </radialGradient>
    <radialGradient id="mgold2" cx="0.5" cy="0.42" r="0.8">
      <stop offset="0" stop-color="#FBF2CF"/><stop offset="0.55" stop-color="#D9B44A"/>
      <stop offset="1" stop-color="#8C6516"/>
    </radialGradient>
    <linearGradient id="ribbonA" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8E2735"/><stop offset="1" stop-color="#5E1620"/>
    </linearGradient>
    <linearGradient id="ribbonB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#26324F"/><stop offset="1" stop-color="#161F33"/>
    </linearGradient>
  </defs>
  <!-- ribbons -->
  <path d="M35 74 L27 122 L41 112 L50 126 L50 84 Z" fill="url(#ribbonA)" stroke="#4A1119" stroke-width="0.6"/>
  <path d="M65 74 L73 122 L59 112 L50 126 L50 84 Z" fill="url(#ribbonB)" stroke="#10182A" stroke-width="0.6"/>
  <path d="M35 74 L27 122 L41 112 L50 126 L50 84 Z" fill="none" stroke="#D9B44A" stroke-width="0.35" opacity="0.6"/>
  <path d="M65 74 L73 122 L59 112 L50 126 L50 84 Z" fill="none" stroke="#D9B44A" stroke-width="0.35" opacity="0.6"/>
  <!-- milled edge -->
  <circle cx="50" cy="46" r="41" fill="url(#mgold)" stroke="#5C431F" stroke-width="1"/>
  <circle cx="50" cy="46" r="41" fill="none" stroke="#3A2A18" stroke-width="1.6" stroke-dasharray="1.25 1.05" opacity="0.65"/>
  <circle cx="50" cy="46" r="37.4" fill="url(#mgold2)" stroke="#6E5013" stroke-width="0.5"/>
  <!-- engraved guilloché ring -->
  <g transform="translate(50,46)">
    ${guillocheMedallion(0, 0, 33, '#5C431F', 0.5)}
  </g>
  <circle cx="50" cy="46" r="27.5" fill="url(#mgold)" stroke="#5C431F" stroke-width="0.6"/>
  <!-- sunburst -->
  <g stroke="#6E5013" stroke-width="0.5" opacity="0.75">
    ${Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return `<line x1="${(50 + 22 * Math.cos(a)).toFixed(1)}" y1="${(46 + 22 * Math.sin(a)).toFixed(1)}" x2="${(50 + 27 * Math.cos(a)).toFixed(1)}" y2="${(46 + 27 * Math.sin(a)).toFixed(1)}"/>`;
    }).join('')}
  </g>
  <circle cx="50" cy="46" r="21.5" fill="#FDF6E3" stroke="#8C6516" stroke-width="0.8"/>
  <!-- crest -->
  <image href="/assets/images/crests/shrs-institutional-crest.png" x="32" y="28" width="36" height="36" preserveAspectRatio="xMidYMid meet"/>
  <!-- highlight sweep -->
  <ellipse cx="37" cy="26" rx="13" ry="5.5" fill="#FFFDF2" opacity="0.16" transform="rotate(-28 37 26)"/>
</svg>`;
}

// Blind-embossed seal — colourless relief with circular engraved text
// and the crest in low-relief, per the security-document brief.
function embossedSeal() {
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" class="seal-svg" aria-hidden="true">
  <defs>
    <radialGradient id="embossBase" cx="0.4" cy="0.34" r="0.9">
      <stop offset="0" stop-color="#FCF6E4"/><stop offset="0.6" stop-color="#F3E9CF"/>
      <stop offset="1" stop-color="#E7DABA"/>
    </radialGradient>
    <path id="sealRing" d="M60 15 a45 45 0 1 1 -0.01 0"/>
  </defs>
  <circle cx="60" cy="60" r="56" fill="url(#embossBase)"/>
  <circle cx="60" cy="60" r="56" fill="none" stroke="#FFFDF2" stroke-width="1.8" opacity="0.95"/>
  <circle cx="60" cy="60" r="54" fill="none" stroke="#A08C60" stroke-width="1.5" opacity="0.95"/>
  <circle cx="60" cy="60" r="48.5" fill="none" stroke="#FFFDF2" stroke-width="1.1" opacity="0.9"/>
  <circle cx="60" cy="60" r="47" fill="none" stroke="#BCA77C" stroke-width="1" opacity="0.9"/>
  <g transform="translate(60,60)">${guillocheMedallion(0, 0, 43, '#A8946A', 0.6)}</g>
  <text font-family="Cinzel, serif" font-size="7.1" letter-spacing="1.9" fill="#9D8A60" opacity="1">
    <textPath href="#sealRing" startOffset="2">SULTAN HANAFI ROYAL SCHOOLS ✦ OFFICIAL SEAL ✦</textPath>
  </text>
  <circle cx="60" cy="60" r="31" fill="none" stroke="#FFFDF2" stroke-width="1" opacity="0.9"/>
  <circle cx="60" cy="60" r="30" fill="none" stroke="#B9A276" stroke-width="0.9" opacity="0.9"/>
  <image href="/assets/images/crests/shrs-institutional-crest.png" x="35" y="35" width="50" height="50"
    preserveAspectRatio="xMidYMid meet" opacity="0.42" style="filter:sepia(0.9) saturate(0.4) brightness(1.08) contrast(0.85);"/>
</svg>`;
}

// Ornamental flourish rule beside the student name.
function flourish(flip) {
  return `<svg viewBox="0 0 120 12" xmlns="http://www.w3.org/2000/svg" class="flourish${flip ? ' flip' : ''}" aria-hidden="true">
    <g fill="none" stroke="url(#fg${flip ? 'B' : 'A'})" stroke-width="0.9">
      <defs><linearGradient id="fg${flip ? 'B' : 'A'}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#B8860B" stop-opacity="0"/><stop offset="1" stop-color="#8C6516"/>
      </linearGradient></defs>
      <path d="M2 6 H96"/>
      <path d="M96 6 C102 6 104 2.5 108 2.5 C111 2.5 112 4.4 112 6 C112 7.6 111 9.5 108 9.5 C104 9.5 102 6 96 6"/>
    </g>
    <path d="M114 6 l2.6 -2.6 l2.6 2.6 l-2.6 2.6 Z" fill="#7A1F2B"/>
  </svg>`;
}

// ─────────────────────────────────────────────────────────────────────

export function renderStageCertificate({ cert, qrSvgMarkup, verifyUrl }) {
  const title = `${cert.programme_label_en || 'Stage'} Certificate — ${cert.student_full_name}`;
  return docShell(title, sheetHtml({ cert, qrSvgMarkup, verifyUrl }));
}

export function renderStageCertificateBatch(title, items) {
  return docShell(title, items.map(sheetHtml).join('\n'));
}

// Recolour the QR into the document's engraved brown-on-ivory language.
function themedQr(qrSvgMarkup) {
  return String(qrSvgMarkup || '')
    .replace(/#ffffff/gi, '#FDF6E3')
    .replace(/#000000/gi, '#3B2A14');
}

function sheetHtml({ cert, qrSvgMarkup, verifyUrl }) {
  const ar = arForms(cert.student_sex);
  const displayHash = String(cert.content_hash || '').slice(0, 12).toUpperCase();
  const gregEn = formatGregorianEn(cert.issued_at);
  const gregAr = formatGregorianAr(cert.issued_at);
  const hijriEn = cert.issued_at_hijri || '';
  const hijriAr = cert.issued_at_hijri_ar || '';
  const nameEn = escapeHtml(cert.student_full_name);
  const nameAr = escapeHtml(cert.student_full_name_ar || '');
  const gradeEn = escapeHtml(cert.grade_en || '');
  const gradeAr = escapeHtml(cert.grade_ar || cert.grade_en || '');
  const placeEn = escapeHtml(cert.place_en || 'Ikorodu, Lagos State, Nigeria');
  const placeAr = escapeHtml(cert.place_ar || 'مدينة إكورودو، ولاية لاغوس، نيجيريا');
  const serial = escapeHtml(cert.serial_no);
  const studentId = escapeHtml(cert.student_identity_no || '—');
  const academicYear = escapeHtml(cert.academic_year);
  const stageAr = escapeHtml(cert.programme_label_ar || 'المرحلة الابتدائية');

  return `<div class="sheet">
  ${frameSvg(cert.serial_no)}
  <div class="grain"></div>
  <div class="watermark"><img src="/assets/images/crest-watermark.png" alt="" /></div>

  <div class="inner">

    <!-- ═══ MASTHEAD ═══ -->
    <div class="masthead">
      <div class="mast-left">
        <div class="crest-row">
          <img class="crest-img" src="/assets/images/crests/nigeria-coat-of-arms.png" alt="Federal Republic of Nigeria" />
          <img class="crest-img" src="/assets/images/crests/shrs-institutional-crest.png" alt="Sultan Hanafi Royal Schools" />
        </div>
        <div class="state-en">Federal Republic of Nigeria</div>
        <div class="inst-en">Sultan Hanafi<br/>Royal Schools</div>
        <div class="school-en">School of Islamic &amp; Arabic Studies</div>
      </div>

      <div class="mast-centre">
        <div class="medallion">${awardMedallion()}</div>
      </div>

      <div class="mast-right">
        <div class="id-plaque">
          <div class="plaque-inner">
            <div class="plaque-row">
              <span class="plaque-k">Certificate No.</span>
              <span class="plaque-v">${serial}</span>
            </div>
            <div class="plaque-rule"></div>
            <div class="plaque-row">
              <span class="plaque-k">Student ID</span>
              <span class="plaque-v">${studentId}</span>
            </div>
          </div>
        </div>
        <div class="state-ar">جمهورية نيجيريا الاتحادية</div>
        <div class="inst-ar">مدارس السلطان حنفي الملكية</div>
        <div class="school-ar">قسم الدراسات الإسلامية والعربية</div>
      </div>
    </div>

    <!-- ═══ TITLES — English left, Arabic right ═══ -->
    <div class="titles">
      <div class="title-en">
        <div class="t-en-1">Certificate of Ibtidā&rsquo;iyyah</div>
        <div class="t-en-2">Foundational Stage Completion</div>
      </div>
      <div class="title-divider">
        <div class="td-diamond"></div><div class="td-line"></div><div class="td-diamond"></div>
      </div>
      <div class="title-ar">
        <div class="t-ar-1">شهادة إتمام</div>
        <div class="t-ar-2">المرحلة الإبتدائية</div>
      </div>
    </div>
    <div class="titles-sub">Academic Year ${academicYear} <span class="ts-sep">✦</span> <span dir="rtl">العام الدراسي ${academicYear}</span></div>

    <!-- ═══ CONFERRAL + GOLD-FOIL NAME ═══ -->
    <div class="conferral">
      <span class="conf-en">This certificate is proudly conferred upon</span>
      <span class="conf-ar">تُمنح هذه الشهادة بكل فخرٍ واعتزاز إلى ${ar.student}</span>
    </div>
    <div class="name-block">
      ${flourish(false)}
      <div class="name-stack">
        <div class="name-en foil-text">${nameEn}</div>
        <div class="name-ar foil-text">${nameAr}</div>
      </div>
      ${flourish(true)}
    </div>

    <!-- ═══ CITATION ═══ -->
    <div class="citation">
      <div class="cite en">
        In recognition of the successful completion of the requirements of the
        <strong>Ibtidā&rsquo;iyyah — Foundational Stage</strong>, having attained the grade of
        <span class="grade">${gradeEn}</span> in the Islamic and Arabic disciplines, in accordance
        with the School&rsquo;s approved curriculum, at ${placeEn}.
        <span class="datesline">Given this <strong>${gregEn}</strong>${hijriEn ? `, corresponding to <strong>${escapeHtml(hijriEn)}</strong>` : ''}.</span>
      </div>
      <div class="cite ar">
        وذلك ${ar.completion} متطلبات <strong>${stageAr}</strong> بنجاحٍ وتفوق،
        ${ar.achieving} على تقدير <span class="grade">${gradeAr}</span> في علوم الدراسات
        الإسلامية والعربية وفق المناهج المعتمدة لدى المدرسة، في ${placeAr}.
        <span class="datesline">حُرِّرت هذه الشهادة في <strong>${gregAr}</strong>${hijriAr ? ` الموافق <strong>${escapeHtml(hijriAr)}</strong>` : ''}.</span>
      </div>
    </div>

    <!-- ═══ EXECUTION: signatures · seal · verification ═══ -->
    <div class="execution">
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-en">Registrar</div>
        <div class="sig-ar">المسجّلة</div>
      </div>

      <div class="authority">
        <div class="seal-wrap">
          ${embossedSeal()}
        </div>
        <div class="verify-col">
          <div class="holo-strip"><span>SHRS</span></div>
          <div class="qr-cartouche">
            <div class="qr-frame">${themedQr(qrSvgMarkup)}</div>
            <div class="qr-caption">Scan to Verify · امسح للتحقق</div>
          </div>
        </div>
      </div>

      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-en">Head of the School</div>
        <div class="sig-ar">رئيس المدرسة</div>
      </div>
    </div>

    <!-- ═══ SECURITY FOOTLINE ═══ -->
    <div class="footline">
      <div class="void-note">
        <span class="ar">أي تعديلٍ أو تغييرٍ يجعل هذه الشهادة لاغية</span>
        <span class="en">Any alteration or modification renders this certificate void</span>
      </div>
      <div class="integrity">
        <span class="int-label">Document Integrity — HMAC-SHA-256</span>
        <span class="int-hash">${displayHash}</span>
        <span class="int-url">${escapeHtml(verifyUrl || '')}</span>
      </div>
    </div>
  </div>
</div>`;
}

function docShell(title, sheetsHtml) {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800&family=Cinzel+Decorative:wght@700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Amiri:ital,wght@0,400;0,700;1,400&family=Aref+Ruqaa:wght@400;700&family=Reem+Kufi:wght@400;600&family=Kufam:wght@400;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --espresso:#221A10; --coffee:#3A2A18; --umber:#4B3420;
    --gold-deep:#6E5013; --gold:#8C6516; --gold-mid:#B8860B;
    --gold-bright:#D4AF37; --gold-pale:#F1E3B2;
    --ivory:#FBF4E4; --cream:#F6EDD8; --paper:#FDF6E3;
    --crimson:#7A1F2B; --navy:#1F2A44;
    --en-display:'Cinzel',serif;
    --en-display-dec:'Cinzel Decorative',serif;
    --en-text:'Cormorant Garamond',serif;
    --ar-display:'Aref Ruqaa',serif;
    --ar-text:'Amiri',serif;
    --ar-label:'Reem Kufi',sans-serif;
    --utility:'Inter',sans-serif;
    /* Foil gradient tuned so no glyph ever falls into a near-black end
       stop — the ends stay legible mid-gold, the sheen band sits centre. */
    --foil:linear-gradient(100deg,#A87E1E 0%,#C99E35 18%,#E8CC74 34%,#FBF0C4 47%,#FFFBE8 50%,#FBF0C4 53%,#E8CC74 66%,#C99E35 82%,#9C721A 100%);
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:A4 landscape;margin:0;}
  html,body{background:#CDC3AC;}
  body{font-family:var(--en-text);color:var(--espresso);-webkit-print-color-adjust:exact;print-color-adjust:exact;}

  .sheet{
    position:relative;width:297mm;height:209.5mm;margin:0 auto;overflow:hidden;
    background:
      radial-gradient(ellipse 130% 100% at 50% 38%, #FDF7E6 0%, #F9F0DA 55%, #F1E5C8 100%);
    page-break-after:always;
  }
  @media screen{ .sheet{margin:24px auto;box-shadow:0 30px 80px rgba(24,17,8,.5);} }

  .frame{position:absolute;inset:0;width:100%;height:100%;}
  .grain{position:absolute;inset:0;background-image:url("${PARCHMENT}");background-size:95mm;mix-blend-mode:multiply;pointer-events:none;}
  .watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;}
  .watermark img{width:118mm;opacity:.05;filter:sepia(.65) saturate(.7);}

  .inner{position:absolute;inset:15.5mm 17mm 14.5mm;display:flex;flex-direction:column;}

  /* ═══ Masthead ═══ */
  .masthead{display:grid;grid-template-columns:86mm 1fr 86mm;align-items:start;column-gap:4mm;}
  .mast-left{text-align:left;}
  .mast-right{text-align:right;}
  .crest-row{display:flex;gap:5mm;align-items:center;height:19mm;margin-bottom:1.6mm;}
  .crest-img{height:17.5mm;width:auto;object-fit:contain;
    filter:contrast(1.18) saturate(1.25) drop-shadow(0 0.5mm 0.6mm rgba(58,42,24,.32));}
  .state-en{font-family:var(--en-display);font-size:7.8pt;font-weight:600;letter-spacing:2.6px;text-transform:uppercase;color:var(--umber);}
  .inst-en{font-family:var(--en-display);font-size:16.5pt;font-weight:800;line-height:1.14;margin-top:1mm;
    background:linear-gradient(175deg,#5C431F 0%,#8C6516 45%,#4B3420 100%);
    -webkit-background-clip:text;background-clip:text;color:transparent;}
  .school-en{font-family:var(--en-display);font-size:7.6pt;font-weight:600;letter-spacing:2.2px;text-transform:uppercase;color:var(--crimson);margin-top:1.3mm;}

  .mast-centre{display:flex;justify-content:center;align-items:flex-start;}
  .medallion{width:34mm;margin-top:-1mm;filter:drop-shadow(0 1mm 1.4mm rgba(34,26,16,.35));}
  .medallion-svg{width:100%;height:auto;display:block;}

  .id-plaque{display:inline-block;margin-bottom:1.8mm;padding:1mm;
    background:linear-gradient(135deg,#8C6516,#D9B44A 30%,#F3E3AC 50%,#C49A2C 72%,#6E5013);
    box-shadow:0 0.5mm 1mm rgba(34,26,16,.3), inset 0 0.2mm 0.3mm rgba(255,250,230,.8);}
  .plaque-inner{background:linear-gradient(180deg,#FDF7E6,#F6EDD8);padding:1.6mm 3.4mm;border:0.15mm solid #8C6516;
    background-image:url("${FOILGRAIN}");background-size:30mm;}
  .plaque-row{display:flex;align-items:baseline;justify-content:space-between;gap:4mm;}
  .plaque-k{font-family:var(--en-display);font-size:5.1pt;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:var(--navy);}
  .plaque-v{font-family:var(--utility);font-size:7.4pt;font-weight:600;letter-spacing:.6px;color:var(--espresso);}
  .plaque-rule{height:0.2mm;margin:1mm 0;background:linear-gradient(90deg,transparent,#B8860B 20%,#B8860B 80%,transparent);}

  .state-ar{font-family:var(--ar-label);font-size:8.6pt;color:var(--umber);}
  .inst-ar{font-family:var(--ar-display);font-size:14.5pt;font-weight:700;line-height:1.55;margin-top:.6mm;white-space:nowrap;
    background:linear-gradient(175deg,#5C431F 0%,#8C6516 45%,#4B3420 100%);
    -webkit-background-clip:text;background-clip:text;color:transparent;}
  .school-ar{font-family:var(--ar-text);font-size:9.6pt;font-weight:700;color:var(--crimson);margin-top:1mm;}

  /* ═══ Titles ═══ */
  .titles{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;column-gap:5mm;margin-top:2.6mm;}
  .title-en{text-align:right;}
  .t-en-1{font-family:var(--en-display-dec);font-size:17.5pt;font-weight:700;
    background:var(--foil);-webkit-background-clip:text;background-clip:text;color:transparent;
    -webkit-text-stroke:0.28px rgba(92,67,31,.55);
    filter:drop-shadow(0 0.35mm 0.25mm rgba(58,42,24,.42));}
  .t-en-2{font-family:var(--en-text);font-style:italic;font-size:11pt;font-weight:600;letter-spacing:1.2px;color:var(--umber);margin-top:.4mm;}
  .title-divider{display:flex;flex-direction:column;align-items:center;gap:1mm;height:16mm;justify-content:center;}
  .td-line{width:0.25mm;flex:1;background:linear-gradient(180deg,transparent,#8C6516,transparent);}
  .td-diamond{width:2mm;height:2mm;background:var(--crimson);transform:rotate(45deg);}
  .title-ar{text-align:left;direction:rtl;}
  .t-ar-1{font-family:var(--ar-display);font-size:16pt;font-weight:700;line-height:1.25;
    background:var(--foil);-webkit-background-clip:text;background-clip:text;color:transparent;
    -webkit-text-stroke:0.25px rgba(92,67,31,.5);
    filter:drop-shadow(0 0.35mm 0.25mm rgba(58,42,24,.42));}
  .t-ar-2{font-family:var(--ar-display);font-size:19pt;font-weight:700;line-height:1.3;
    background:var(--foil);-webkit-background-clip:text;background-clip:text;color:transparent;
    -webkit-text-stroke:0.25px rgba(92,67,31,.5);
    filter:drop-shadow(0 0.35mm 0.25mm rgba(58,42,24,.42));}
  .titles-sub{text-align:center;font-family:var(--en-text);font-style:italic;font-size:9pt;color:var(--umber);margin-top:1.2mm;}
  .ts-sep{color:var(--gold-mid);font-style:normal;font-size:7pt;padding:0 2mm;}

  /* ═══ Conferral + gold-foil name ═══ */
  .conferral{display:flex;justify-content:center;gap:10mm;margin-top:2.6mm;align-items:baseline;}
  .conf-en{font-family:var(--en-text);font-style:italic;font-size:10pt;color:var(--umber);}
  .conf-ar{font-family:var(--ar-text);font-size:11pt;color:var(--umber);direction:rtl;}

  .name-block{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;column-gap:4mm;margin-top:1.6mm;}
  .flourish{width:100%;max-width:34mm;height:4mm;justify-self:end;}
  .flourish.flip{transform:scaleX(-1);justify-self:start;}
  .name-stack{text-align:center;}
  .foil-text{
    background:var(--foil);
    -webkit-background-clip:text;background-clip:text;color:transparent;
    -webkit-text-stroke:0.3px rgba(92,67,31,.45);
    filter:drop-shadow(0 0.2mm 0 rgba(255,250,225,.85)) drop-shadow(0 0.55mm 0.5mm rgba(46,32,16,.55));
  }
  .name-en{font-family:var(--en-display);font-size:24.5pt;font-weight:700;letter-spacing:2.5px;line-height:1.1;}
  .name-ar{font-family:var(--ar-text);font-size:19pt;font-weight:700;margin-top:1mm;direction:rtl;
    filter:drop-shadow(0 0.28mm 0 rgba(255,250,225,.9)) drop-shadow(0 0.5mm 0.45mm rgba(46,32,16,.6));}

  /* ═══ Citation ═══ */
  .citation{display:grid;grid-template-columns:1fr 1fr;column-gap:9mm;margin-top:2.4mm;flex:1;align-content:center;}
  .cite{line-height:1.6;color:var(--umber);}
  .cite.en{font-family:var(--en-text);font-size:10.6pt;text-align:left;}
  .cite.ar{font-family:var(--ar-text);font-size:11.4pt;line-height:1.78;text-align:right;direction:rtl;}
  .cite strong{color:var(--espresso);}
  .cite .grade{color:var(--crimson);font-weight:700;}
  .cite .datesline{display:block;margin-top:1.2mm;font-size:.93em;}

  /* ═══ Execution ═══ */
  .execution{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;column-gap:5mm;margin-top:1mm;}
  .sig{text-align:center;padding-bottom:2mm;}
  .sig-line{width:50mm;height:0.25mm;margin:0 auto;background:linear-gradient(90deg,transparent,#4B3420 15%,#4B3420 85%,transparent);}
  .sig-en{font-family:var(--en-display);font-size:7.6pt;font-weight:600;letter-spacing:1.9px;text-transform:uppercase;color:var(--espresso);margin-top:1.3mm;}
  .sig-ar{font-family:var(--ar-text);font-size:10.5pt;font-weight:700;color:var(--umber);margin-top:.2mm;}

  .authority{display:flex;align-items:center;gap:4mm;}
  .seal-wrap{width:32mm;}
  .seal-svg{width:100%;height:auto;display:block;}
  .verify-col{display:flex;flex-direction:column;align-items:center;gap:1.2mm;}
  .holo-strip{width:19mm;height:3.6mm;display:flex;align-items:center;justify-content:center;
    background:
      repeating-linear-gradient(115deg, rgba(255,255,255,.28) 0 0.7mm, rgba(255,255,255,0) 0.7mm 1.9mm),
      linear-gradient(100deg,#8C6516 0%,#D9B44A 18%,#EDEDEA 38%,#FFFDF5 50%,#C9CCCF 62%,#D4AF37 82%,#6E5013 100%);
    border:0.15mm solid #6E5013;box-shadow:inset 0 0.2mm 0.4mm rgba(255,255,255,.75), 0 0.3mm 0.6mm rgba(34,26,16,.3);}
  .holo-strip span{font-family:var(--en-display);font-size:5.4pt;font-weight:700;letter-spacing:2.6px;color:rgba(58,42,24,.72);}
  .qr-cartouche{text-align:center;}
  .qr-frame{width:16.5mm;height:16.5mm;padding:0.9mm;background:#FDF6E3;
    border:0.35mm solid #8C6516;outline:0.15mm solid #C49A2C;outline-offset:0.5mm;}
  .qr-frame svg{width:100%;height:100%;display:block;}
  .qr-caption{font-family:var(--en-display);font-size:4.6pt;font-weight:600;letter-spacing:1.1px;text-transform:uppercase;color:var(--gold-deep);margin-top:.8mm;}

  /* ═══ Footline ═══ */
  .footline{display:flex;justify-content:space-between;align-items:flex-end;margin-top:1.4mm;
    border-top:0.2mm solid rgba(140,101,22,.55);padding-top:1.2mm;}
  .void-note{font-size:6.4pt;color:var(--crimson);}
  .void-note .ar{font-family:var(--ar-text);font-weight:700;display:block;direction:rtl;text-align:left;}
  .void-note .en{font-family:var(--en-text);font-style:italic;display:block;margin-top:.2mm;}
  .integrity{text-align:right;font-family:var(--utility);}
  .int-label{display:block;font-size:5pt;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold-deep);}
  .int-hash{display:block;font-size:6.6pt;font-weight:600;letter-spacing:1px;color:var(--espresso);}
  .int-url{display:block;font-size:5.2pt;color:var(--umber);}

  @media print{
    html,body{background:#FDF6E3;}
    .sheet{box-shadow:none;margin:0;}
  }
</style>
</head>
<body>
${sheetsHtml}
</body>
</html>`;
}
