// Academic Stage Certificate — ROYAL FLAGSHIP EDITION v3.
//
// Governed entirely by docs/shrs-certificate-editorial-bible.md
// (Editorial Bible v1.0, 2026-08-05). Every design decision below cites
// its rule. Departures from v2, per the Bible's internal critique:
//   §1.3/§2.2 — institutional text is flat engraved ink; metallic foil
//               belongs to the student's name alone.
//   §3.1      — Cinzel (inscriptional capitals), never Cinzel Decorative.
//   §3.2      — Arabic titles in Amiri (classical Naskh); ruqʿah-register
//               display faces prohibited.
//   §3.5      — institutional names on single lines, never broken.
//   §1.5      — NO performance grade anywhere on the face (client
//               mandate): the certificate certifies completion; grades
//               live on the Transcript / Statement of Results.
//   §4.2/§5.3 — whitespace ≥ 40%; ornament stays out of the content
//               field except sanctioned backgrounds.
//   §6.1      — guilloché rosettes back the identity plaque and the
//               seal, banknote-fashion.
//   §6.2      — microtext (perimeter ring + a rule beneath the name)
//               carries the LIVE serial.
//   §7.1      — the name is layered foil: metallic gradient + foil
//               grain clipped to the letterforms + engraved hairline +
//               emboss relief.
//   §9.1      — the QR/verification block sits in the footline corner,
//               never in the ceremonial field.
//
// Data contract unchanged: `cert` is a stage_certificates row. The
// grade_en/grade_ar columns remain stored (transcript-bound data and
// part of the integrity hash) — they simply never render here (§1.5).

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Arabic grammatical forms keyed off the student's sex (Bible §13.10).
function arForms(sex) {
  if (String(sex || '').toLowerCase() === 'female') {
    return { student: 'الطالبة', completion: 'لإتمامها' };
  }
  return { student: 'الطالب', completion: 'لإتمامه' };
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
// Security-print geometry (Bible §5.2, §6.1) — parametric epitrochoid
// guilloché and constructed khatam stars; nothing hand-drawn or stock.
// ─────────────────────────────────────────────────────────────────────

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

// Interleaved sine-strand guilloché band; horizontal or vertical.
function guillocheBand(x, y, len, h, strands, stroke, opacity, vertical = false) {
  const paths = [];
  for (let s = 0; s < strands; s++) {
    const phase = (s / strands) * Math.PI * 2;
    const amp = h * 0.42;
    const pts = [];
    const steps = Math.round(len / 0.9);
    for (let i = 0; i <= steps; i++) {
      const along = (i / steps) * len;
      const wave = amp * Math.sin((i / steps) * Math.PI * 2 * (len / 14) + phase);
      const px = vertical ? x + h / 2 + wave : x + along;
      const py = vertical ? y + along : y + h / 2 + wave;
      pts.push((i ? 'L' : 'M') + px.toFixed(2) + ' ' + py.toFixed(2));
    }
    paths.push(`<path d="${pts.join('')}" fill="none" stroke="${stroke}" stroke-width="0.07" opacity="${opacity}"/>`);
  }
  return paths.join('');
}

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
    <circle cx="${cx}" cy="${cy}" r="7.4" fill="url(#goldMetal)" stroke="#3A2A18" stroke-width="0.26"/>
    <circle cx="${cx}" cy="${cy}" r="6.9" fill="none" stroke="#5C431F" stroke-width="0.11" stroke-dasharray="0.32 0.32"/>
    <path d="${star(6.0, 2.7, 0)}" fill="#3A2A18"/>
    <path d="${star(4.6, 2.0, Math.PI / 8)}" fill="url(#goldMetal)"/>
    <circle cx="${cx}" cy="${cy}" r="1.25" fill="#7A1F2B"/>
    <circle cx="${cx}" cy="${cy}" r="0.45" fill="#F1E3B2"/>
  </g>`;
}

// Engraved frame layer (Bible §5.1): trim hairline → coffee band →
// arabesque strapwork → crimson pinstripe → WIDE ivory margin → fine
// double rule; guilloché wave bands on all four sides (§6.1); serial
// microtext perimeter ring (§6.2); khatam corner medallions.
function frameSvg(serial) {
  const W = 297, H = 209.5;
  const micro = `SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL ACADEMIC CREDENTIAL · ${serial} · `.repeat(6);
  const m = 10.4;
  const microPath = `M ${m + 2} ${m} H ${W - m} V ${H - m} H ${m} V ${m + 1} Z`;
  return `<svg class="frame" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="goldMetal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8C6516"/><stop offset="0.28" stop-color="#D9B44A"/>
      <stop offset="0.5" stop-color="#F3E3AC"/><stop offset="0.72" stop-color="#C49A2C"/>
      <stop offset="1" stop-color="#6E5013"/>
    </linearGradient>
    <pattern id="strapwork" width="7" height="7" patternUnits="userSpaceOnUse">
      <rect width="7" height="7" fill="#3A2A18"/>
      <g fill="none" stroke="#C49A2C" stroke-width="0.3">
        <path d="M0 3.5 L1.75 1.75 L3.5 3.5 L1.75 5.25 Z M3.5 3.5 L5.25 1.75 L7 3.5 L5.25 5.25 Z"/>
        <path d="M1.75 0 L3.5 1.75 M3.5 1.75 L5.25 0 M1.75 7 L3.5 5.25 M3.5 5.25 L5.25 7"/>
      </g>
      <circle cx="3.5" cy="3.5" r="0.95" fill="none" stroke="#8C6516" stroke-width="0.16"/>
      <circle cx="3.5" cy="3.5" r="0.3" fill="#7A1F2B"/>
    </pattern>
    <path id="microring" d="${microPath}"/>
  </defs>

  <rect x="2.4" y="2.4" width="${W - 4.8}" height="${H - 4.8}" fill="none" stroke="#8C6516" stroke-width="0.16"/>
  <rect x="3.3" y="3.3" width="${W - 6.6}" height="${H - 6.6}" fill="none" stroke="#3A2A18" stroke-width="1.9"/>
  <rect x="4.4" y="4.4" width="${W - 8.8}" height="${H - 8.8}" fill="none" stroke="#D9B44A" stroke-width="0.2"/>
  <rect x="5.1" y="5.1" width="${W - 10.2}" height="${H - 10.2}" fill="none" stroke="url(#strapwork)" stroke-width="3"/>
  <rect x="6.75" y="6.75" width="${W - 13.5}" height="${H - 13.5}" fill="none" stroke="#B8860B" stroke-width="0.15"/>
  <rect x="8.3" y="8.3" width="${W - 16.6}" height="${H - 16.6}" fill="none" stroke="#7A1F2B" stroke-width="0.28"/>

  <text font-family="Inter, sans-serif" font-size="0.8" letter-spacing="0.13" fill="#6E5013" opacity="0.58">
    <textPath href="#microring">${escapeHtml(micro)}</textPath>
  </text>

  <!-- guilloché wave bands, all four sides (§6.1) -->
  ${guillocheBand(16, 11.6, W - 32, 1.9, 3, '#8C6516', 0.45)}
  ${guillocheBand(16, H - 13.4, W - 32, 1.9, 3, '#8C6516', 0.45)}
  ${guillocheBand(11.6, 16, H - 32, 1.9, 3, '#8C6516', 0.45, true)}
  ${guillocheBand(H > 0 ? W - 13.4 : 0, 16, H - 32, 1.9, 3, '#8C6516', 0.45, true)}

  <!-- wide ivory margin, then the fine double rule (§5.1) -->
  <rect x="13.6" y="13.6" width="${W - 27.2}" height="${H - 27.2}" fill="none" stroke="#8C6516" stroke-width="0.4"/>
  <rect x="14.7" y="14.7" width="${W - 29.4}" height="${H - 29.4}" fill="none" stroke="#8C6516" stroke-width="0.13"/>

  ${cornerMedallion(10.4, 10.4)}
  ${cornerMedallion(W - 10.4, 10.4)}
  ${cornerMedallion(W - 10.4, H - 10.4)}
  ${cornerMedallion(10.4, H - 10.4)}

  <!-- central prestige field, ≤5% opacity (§5.3) -->
  <g>${guillocheMedallion(W / 2, H / 2 + 18, 46, '#4B3420', 0.032)}</g>
</svg>`;
}

// Parchment grain (Bible §10.2 — premium paper feel).
const PARCHMENT = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360">
    <filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
    <feColorMatrix values="0 0 0 0 0.29  0 0 0 0 0.21  0 0 0 0 0.12  0 0 0 0.05 0"/></filter>
    <rect width="360" height="360" filter="url(#p)"/></svg>`
);

// Foil grain — layered into the name's letterforms (Bible §7.1).
const FOILGRAIN = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="11"/>
    <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.1  0 0 0 0.16 0"/></filter>
    <rect width="120" height="120" filter="url(#g)"/></svg>`
);

// Guilloché rosette backing for identity panels (Bible §6.1).
function panelRosette(w, h, scale, opacity) {
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" class="panel-rosette" aria-hidden="true">
    ${guillocheMedallion(w / 2, h / 2, scale, '#8C6516', opacity)}
  </svg>`;
}

// Gold award medallion (client-mandated masthead element): milled edge,
// engraved guilloché ring, sunburst, real crest, crimson/navy ribbons.
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
  <path d="M35 74 L27 122 L41 112 L50 126 L50 84 Z" fill="url(#ribbonA)" stroke="#4A1119" stroke-width="0.6"/>
  <path d="M65 74 L73 122 L59 112 L50 126 L50 84 Z" fill="url(#ribbonB)" stroke="#10182A" stroke-width="0.6"/>
  <path d="M35 74 L27 122 L41 112 L50 126 L50 84 Z" fill="none" stroke="#D9B44A" stroke-width="0.35" opacity="0.6"/>
  <path d="M65 74 L73 122 L59 112 L50 126 L50 84 Z" fill="none" stroke="#D9B44A" stroke-width="0.35" opacity="0.6"/>
  <circle cx="50" cy="46" r="41" fill="url(#mgold)" stroke="#5C431F" stroke-width="1"/>
  <circle cx="50" cy="46" r="41" fill="none" stroke="#3A2A18" stroke-width="1.6" stroke-dasharray="1.25 1.05" opacity="0.65"/>
  <circle cx="50" cy="46" r="37.4" fill="url(#mgold2)" stroke="#6E5013" stroke-width="0.5"/>
  <g transform="translate(50,46)">${guillocheMedallion(0, 0, 33, '#5C431F', 0.5)}</g>
  <circle cx="50" cy="46" r="27.5" fill="url(#mgold)" stroke="#5C431F" stroke-width="0.6"/>
  <g stroke="#6E5013" stroke-width="0.5" opacity="0.75">
    ${Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return `<line x1="${(50 + 22 * Math.cos(a)).toFixed(1)}" y1="${(46 + 22 * Math.sin(a)).toFixed(1)}" x2="${(50 + 27 * Math.cos(a)).toFixed(1)}" y2="${(46 + 27 * Math.sin(a)).toFixed(1)}"/>`;
    }).join('')}
  </g>
  <circle cx="50" cy="46" r="21.5" fill="#FDF6E3" stroke="#8C6516" stroke-width="0.8"/>
  <image href="/assets/images/crests/shrs-institutional-crest.png" x="32" y="28" width="36" height="36" preserveAspectRatio="xMidYMid meet"/>
  <ellipse cx="37" cy="26" rx="12" ry="5" fill="#FFFDF2" opacity="0.14" transform="rotate(-28 37 26)"/>
</svg>`;
}

// Blind-embossed seal (Bible §6.4): colourless relief, engraved ring
// lettering, crest in low relief, guilloché-backed.
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
  <circle cx="60" cy="60" r="54" fill="none" stroke="#96825A" stroke-width="1.6" opacity="1"/>
  <circle cx="60" cy="60" r="48.5" fill="none" stroke="#FFFDF2" stroke-width="1.1" opacity="0.95"/>
  <circle cx="60" cy="60" r="47" fill="none" stroke="#A8946A" stroke-width="1.1" opacity="1"/>
  <g transform="translate(60,60)">${guillocheMedallion(0, 0, 43, '#96825A', 0.75)}</g>
  <text font-family="Cinzel, serif" font-size="7.1" letter-spacing="1.9" fill="#8C7A52" opacity="1">
    <textPath href="#sealRing" startOffset="2">SULTAN HANAFI ROYAL SCHOOLS ✦ OFFICIAL SEAL ✦</textPath>
  </text>
  <circle cx="60" cy="60" r="31" fill="none" stroke="#FFFDF2" stroke-width="1" opacity="0.95"/>
  <circle cx="60" cy="60" r="30" fill="none" stroke="#A8946A" stroke-width="1" opacity="1"/>
  <image href="/assets/images/crests/shrs-institutional-crest.png" x="35" y="35" width="50" height="50"
    preserveAspectRatio="xMidYMid meet" opacity="0.5" style="filter:sepia(0.9) saturate(0.45) brightness(1.05) contrast(0.9);"/>
</svg>`;
}

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

function themedQr(qrSvgMarkup, dark = '#3B2A14', light = '#FDF6E3') {
  return String(qrSvgMarkup || '')
    .replace(/#ffffff/gi, light)
    .replace(/#000000/gi, dark);
}

// ── OFFICIAL BACKGROUND SLOT (Final Creative Direction, 2026-08-05) ──
// The client's own premium certificate background/border is to be used
// EXACTLY as provided — not redesigned, not re-bordered. As of this
// build the file has not yet arrived in the repository. When it does:
//   1. save it as  assets/images/certificates/official-background.png
//      (or .jpg) at A4-landscape proportions, and
//   2. set OFFICIAL_BACKGROUND to its public path below.
// The template then renders the supplied artwork full-bleed and
// suppresses its own constructed frame, band, and parchment layers —
// only the content, name foil, and security apparatus are composed on
// top, inside the safe area.
const OFFICIAL_BACKGROUND = '/assets/images/certificates/official-background.jpg';

// Measured geometry of the official paper (1080×708 source, fractions
// of the sheet) — the artwork's own designated functional zones:
//   logo lockup      x 0.40–0.60, y 0.00–0.23  (keep clear)
//   QR square        x 0.300–0.335, y 0.829–0.882 (real QR overlays it)
//   "SERIAL NO."     label ~x 0.66, y 0.845 (kept as printed)
//   placeholder serial "SHRS-0000001" x 0.650–0.716, y 0.862–0.887
//     (patched and replaced with the live serial)
//   gold seal        x 0.437–0.556, y 0.777–0.949 (kept untouched)
// The source is 1.525:1 vs A4-landscape 1.414:1 — rendered full-bleed
// (object-fit:fill, ≈8% vertical stretch; every element preserved,
// nothing cropped). A native-A4 or higher-resolution master from the
// client slots in with zero code change.

function sheetHtml(args) {
  if (OFFICIAL_BACKGROUND) return sheetHtmlOfficial(args);
  return sheetHtmlConstructed(args);
}

function sheetHtmlOfficial({ cert, qrSvgMarkup, verifyUrl }) {
  const ar = arForms(cert.student_sex);
  const displayHash = String(cert.content_hash || '').slice(0, 12).toUpperCase();
  const verifyCode = displayHash.replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3');
  const year = new Date(String(cert.issued_at).slice(0, 10)).getUTCFullYear();
  const docId = `DID-${year}-${escapeHtml(cert.programme_code || 'IBT')}-${String(cert.id || 0).padStart(7, '0')}`;
  const issuedDDMM = (() => {
    const d = String(cert.issued_at).slice(0, 10).split('-');
    return `${d[2]} / ${d[1]} / ${d[0]}`;
  })();
  const nameEn = escapeHtml(cert.student_full_name);
  const nameAr = escapeHtml(cert.student_full_name_ar || '');
  const serial = escapeHtml(cert.serial_no);
  const studentId = escapeHtml(cert.student_identity_no || '—');
  const session = escapeHtml(String(cert.academic_year || '').replace('/', ' – '));
  const hijriAr = escapeHtml(cert.issued_at_hijri_ar || cert.issued_at_hijri || '');
  const arCompleted = String(cert.student_sex || '').toLowerCase() === 'female' ? 'أتمت' : 'أتم';

  const enRow = (label, value) => `<div class="f-row en"><span class="f-label">${label}</span><span class="f-lead"></span><span class="f-value">${value}</span></div>`;
  const arRow = (label, value) => `<div class="f-row ar"><span class="f-value">${value}</span><span class="f-lead"></span><span class="f-label">${label}</span></div>`;

  return `<div class="sheet sheet--official">
  <img class="official-bg" src="${OFFICIAL_BACKGROUND}" alt="" />

  <div class="o2-intro-en">This is to certify that</div>
  <div class="o2-intro-ar">تشهد إدارة مدارس السلطان حنفي الملكية بأن</div>

  <div class="o2-name-en foil-text">${nameEn}</div>
  <div class="o2-name-ar foil-text">${nameAr}</div>

  <div class="o2-para-en">has successfully completed the requirements of the
    Ibtidā&rsquo;iyyah (Primary) stage in accordance with the approved curriculum
    and academic standards of the School.</div>
  <div class="o2-para-ar">قد ${arCompleted} بنجاحٍ متطلبات المرحلة الإبتدائية وفقًا
    للمناهج المعتمدة والمعايير الأكاديمية المعمول بها في المدرسة.</div>

  <div class="o2-fields-en">
    ${enRow('Programme / Level', 'Ibtidā&rsquo;iyyah (Primary)')}
    ${enRow('Academic Session', session)}
    ${enRow('Certificate Number', serial)}
    ${enRow('Student ID', studentId)}
  </div>
  <div class="o2-fields-ar">
    ${arRow('البرنامج / المستوى', 'المرحلة الإبتدائية')}
    ${arRow('السنة الدراسية', session)}
    ${arRow('رقم الشهادة', serial)}
    ${arRow('الرقم التعريفي للطالب', studentId)}
  </div>

  <div class="o2-dates-en">
    ${enRow('Date of Issue', issuedDDMM)}
    ${enRow('Place of Issue', escapeHtml(cert.place_en || 'Ikorodu, Lagos, Nigeria'))}
  </div>
  <div class="o2-dates-ar">
    ${arRow('تاريخ الإصدار', issuedDDMM)}
    ${arRow('مكان الإصدار', escapeHtml(cert.place_ar || 'لاغوس، نيجيريا'))}
  </div>

  <div class="o2-hijri">
    <div class="o2-hijri-k">التاريخ الهجري</div>
    <div class="o2-hijri-v">${hijriAr}</div>
  </div>

  <div class="o2-sig o2-sig-1">
    <div class="o2-sig-line"></div>
    <div class="o2-sig-en">Registrar</div>
    <div class="o2-sig-seal">(Official Seal) · المسجّلة</div>
  </div>
  <div class="o2-sig o2-sig-2">
    <div class="o2-sig-line"></div>
    <div class="o2-sig-en">Principal / Head of School</div>
    <div class="o2-sig-seal">(Official Seal) · رئيس المدرسة</div>
  </div>
  <div class="o2-sig o2-sig-3">
    <div class="o2-sig-line"></div>
    <div class="o2-sig-en">Chairman, Board of Governors</div>
    <div class="o2-sig-seal">(Official Seal) · رئيس مجلس الإدارة</div>
  </div>

  <div class="o2-qr">${themedQr(qrSvgMarkup, '#221A10', '#FFFFFF')}</div>
  <div class="o2-verify"><span class="vt">Verification</span>
    Certificate No. <b>${serial}</b><span class="sep">·</span>
    Document ID <b>${docId}</b><span class="sep">·</span>
    Code <b>${verifyCode}</b><span class="sep">·</span>
    Verify online <b>shroyalschools.com/verify-certificate</b></div>

  <div class="o2-void">Issued without alteration or erasure — any tampering voids this certificate · أي تعديلٍ أو تغييرٍ يجعل هذه الشهادة لاغية</div>
</div>`;
}

function sheetHtmlConstructed({ cert, qrSvgMarkup, verifyUrl }) {
  const ar = arForms(cert.student_sex);
  const displayHash = String(cert.content_hash || '').slice(0, 12).toUpperCase();
  const gregEn = formatGregorianEn(cert.issued_at);
  const gregAr = formatGregorianAr(cert.issued_at);
  const hijriEn = cert.issued_at_hijri || '';
  const hijriAr = cert.issued_at_hijri_ar || '';
  const nameEn = escapeHtml(cert.student_full_name);
  const nameAr = escapeHtml(cert.student_full_name_ar || '');
  const placeEn = escapeHtml(cert.place_en || 'Ikorodu, Lagos State, Nigeria');
  const placeAr = escapeHtml(cert.place_ar || 'مدينة إكورودو، ولاية لاغوس، نيجيريا');
  const serial = escapeHtml(cert.serial_no);
  const studentId = escapeHtml(cert.student_identity_no || '—');
  const academicYear = escapeHtml(cert.academic_year);
  const stageAr = escapeHtml(cert.programme_label_ar || 'المرحلة الابتدائية');
  // Microtext rule beneath the name carries the live serial (§6.2).
  const nameMicro = escapeHtml(`· ${cert.serial_no} `.repeat(14));

  return `<div class="sheet">
  ${OFFICIAL_BACKGROUND
    ? `<img class="official-bg" src="${OFFICIAL_BACKGROUND}" alt="" />`
    : `${frameSvg(cert.serial_no)}
  <div class="grain"></div>
  <div class="watermark"><img src="/assets/images/crest-watermark.png" alt="" /></div>`}

  <div class="inner">

    <!-- ═══ MASTHEAD (Bible §4.1 — client architecture, disciplined) ═══ -->
    <div class="masthead">
      <div class="mast-left">
        <div class="crest-row">
          <img class="crest-img" src="/assets/images/crests/nigeria-coat-of-arms.png" alt="Federal Republic of Nigeria" />
          <img class="crest-img" src="/assets/images/crests/shrs-institutional-crest.png" alt="Sultan Hanafi Royal Schools" />
        </div>
        <div class="state-en">Federal Republic of Nigeria</div>
        <div class="inst-en">Sultan Hanafi Royal Schools</div>
        <div class="school-en">School of Islamic &amp; Arabic Studies</div>
      </div>

      <div class="mast-centre"></div>

      <div class="mast-right">
        <div class="honor-row">
          <div class="id-plaque">
            ${panelRosette(200, 80, 55, 0.35)}
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
            <div class="holo-edge" title="optically variable strip"></div>
          </div>
          <div class="medallion">${awardMedallion()}</div>
        </div>
        <div class="state-ar">جمهورية نيجيريا الاتحادية</div>
        <div class="inst-ar">مدارس السلطان حنفي الملكية</div>
        <div class="school-ar">قسم الدراسات الإسلامية والعربية</div>
      </div>
    </div>

    <!-- ═══ TITLE BAND — EN left · AR right (Bible §4.1) ═══ -->
    <div class="titles">
      <div class="title-en">
        <div class="t-en-1">Certificate of Ibtidā&rsquo;iyyah</div>
        <div class="t-en-2">Foundational Stage Completion</div>
      </div>
      <div class="title-divider">
        <div class="td-diamond"></div><div class="td-line"></div><div class="td-diamond"></div>
      </div>
      <div class="title-ar">
        <div class="t-ar-1">شهادة إتمام المرحلة الإبتدائية</div>
        <div class="t-ar-2"><span dir="rtl">العام الدراسي ${academicYear}</span> · Academic Year ${academicYear}</div>
      </div>
    </div>

    <!-- ═══ CONFERRAL + FOIL NAME (Bible §7.1 — the single peak) ═══ -->
    <div class="conferral">
      <span class="conf-en">This certificate is proudly conferred upon</span>
      <span class="conf-sep">✦</span>
      <span class="conf-ar">تُمنح هذه الشهادة بكل فخرٍ واعتزاز إلى ${ar.student}</span>
    </div>
    <div class="name-block">
      ${flourish(false)}
      <div class="name-stack">
        <div class="name-en foil-text">${nameEn}</div>
        <div class="name-ar foil-text">${nameAr}</div>
        <div class="name-micro">${nameMicro}</div>
      </div>
      ${flourish(true)}
    </div>

    <!-- ═══ CITATION — completion only, no grade (Bible §1.5) ═══ -->
    <div class="citation">
      <div class="cite en">
        In recognition of the successful completion of the prescribed programme of the
        <strong>Ibtidā&rsquo;iyyah — Foundational Stage</strong> in the Islamic and Arabic
        disciplines, pursuant to the School&rsquo;s approved curriculum, at ${placeEn}.
        <span class="datesline">Given this <strong>${gregEn}</strong>${hijriEn ? `, corresponding to <strong>${escapeHtml(hijriEn)}</strong>` : ''}.</span>
      </div>
      <div class="cite ar">
        وذلك ${ar.completion} متطلبات البرنامج المقرر <strong>${stageAr}</strong>
        في علوم الدراسات الإسلامية والعربية وفق المناهج المعتمدة لدى المدرسة، في ${placeAr}.
        <span class="datesline">حُرِّرت هذه الشهادة في <strong>${gregAr}</strong>${hijriAr ? ` الموافق <strong>${escapeHtml(hijriAr)}</strong>` : ''}.</span>
      </div>
    </div>

    <!-- ═══ EXECUTION — signatures flanking the seal (Bible §8) ═══ -->
    <div class="execution">
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-en">Registrar</div>
        <div class="sig-ar">المسجّلة</div>
      </div>
      <div class="seal-wrap">${embossedSeal()}</div>
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-en">Head of the School</div>
        <div class="sig-ar">رئيس المدرسة</div>
      </div>
    </div>

    <!-- ═══ SECURITY FOOTLINE — verification at the administrative
         edge (Bible §9.1) ═══ -->
    <div class="footline">
      <div class="void-note">
        <span class="ar">أي تعديلٍ أو تغييرٍ يجعل هذه الشهادة لاغية</span>
        <span class="en">Any alteration or modification renders this certificate void</span>
      </div>
      <div class="verify-block">
        <div class="verify-data">
          <span class="int-label">Document Integrity — HMAC-SHA-256</span>
          <span class="int-hash">${displayHash}</span>
          <span class="int-url">${escapeHtml(verifyUrl || '')}</span>
          <span class="int-caption">Scan to verify · امسح للتحقق</span>
        </div>
        <div class="qr-frame">${themedQr(qrSvgMarkup)}</div>
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
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Amiri:ital,wght@0,400;0,700;1,400&family=Kufam:wght@400;600;700&family=Reem+Kufi:wght@400;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --espresso:#221A10; --coffee:#3A2A18; --umber:#4B3420;
    --gold-deep:#6E5013; --gold:#8C6516; --gold-mid:#B8860B;
    --gold-bright:#D4AF37; --gold-pale:#F1E3B2;
    --ivory:#FBF4E4; --cream:#F6EDD8; --paper:#FDF6E3;
    --crimson:#7A1F2B; --navy:#1F2A44;
    --en-display:'Cinzel',serif;
    --en-text:'Cormorant Garamond',serif;
    --ar-display:'Kufam','Amiri',sans-serif; /* client final direction: Kufic display for major Arabic titles */
    --ar-text:'Amiri',serif;
    --ar-label:'Reem Kufi',sans-serif;
    --utility:'Inter',sans-serif;
    --foil:linear-gradient(100deg,#A87E1E 0%,#C99E35 18%,#E8CC74 34%,#FBF0C4 47%,#FFFBE8 50%,#FBF0C4 53%,#E8CC74 66%,#C99E35 82%,#9C721A 100%);
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:A4 landscape;margin:0;}
  html,body{background:#CDC3AC;}
  body{font-family:var(--en-text);color:var(--espresso);-webkit-print-color-adjust:exact;print-color-adjust:exact;}

  .sheet{
    position:relative;width:297mm;height:209.5mm;margin:0 auto;overflow:hidden;
    background:radial-gradient(ellipse 130% 100% at 50% 38%, #FDF7E6 0%, #F9F0DA 55%, #F1E5C8 100%);
    page-break-after:always;
  }
  @media screen{ .sheet{margin:24px auto;box-shadow:0 30px 80px rgba(24,17,8,.5);} }

  .frame{position:absolute;inset:0;width:100%;height:100%;}
  .official-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;}

  /* ═══ OFFICIAL-PAPER COMPOSITION v2 — the client's LOCKED
     production master (Final Flagship Execution Directive): the
     artwork renders untouched; only the approved data fields compose
     into its zones, per the annotated layout master. Positions in mm
     on the 297×209.5 sheet. ═══ */
  .sheet--official{background:#FFFFFF;}
  .o2-intro-en{position:absolute;top:96mm;left:42mm;width:100mm;text-align:center;
    font-family:var(--en-text);font-style:italic;font-size:9.8pt;color:#4B3420;}
  .o2-intro-ar{position:absolute;top:95.6mm;right:42mm;width:100mm;text-align:center;direction:rtl;
    font-family:var(--ar-text);font-size:10.4pt;font-weight:700;color:#4B3420;}

  .o2-name-en{position:absolute;top:102.5mm;left:38mm;width:106mm;text-align:center;
    font-family:var(--en-display);font-size:16.5pt;font-weight:700;letter-spacing:1.8px;line-height:1.15;}
  .o2-name-ar{position:absolute;top:102mm;right:38mm;width:106mm;text-align:center;direction:rtl;
    font-family:var(--ar-text);font-size:15.5pt;font-weight:700;line-height:1.3;
    -webkit-text-stroke:0.38px rgba(92,67,31,.55);}

  .o2-para-en{position:absolute;top:113.5mm;left:42mm;width:99mm;
    font-family:var(--en-text);font-size:9.4pt;line-height:1.5;color:#3A2A18;text-align:center;}
  .o2-para-ar{position:absolute;top:113.5mm;right:42mm;width:99mm;direction:rtl;
    font-family:var(--ar-text);font-size:10pt;line-height:1.65;color:#3A2A18;text-align:center;}

  .f-row{display:flex;align-items:baseline;gap:1.6mm;margin-bottom:2mm;}
  .f-label{font-family:var(--en-text);font-size:8.2pt;font-weight:600;color:#4B3420;white-space:nowrap;}
  .f-row.ar .f-label{font-family:var(--ar-text);font-size:8.8pt;font-weight:700;}
  .f-lead{flex:1;border-bottom:0.3mm dotted #B08A2E;transform:translateY(-0.7mm);}
  .f-value{font-family:var(--utility);font-size:7.4pt;font-weight:600;letter-spacing:.2px;color:#221A10;white-space:nowrap;}
  .f-row.ar{direction:rtl;}
  .f-row.ar .f-value{direction:ltr;}

  .o2-fields-en{position:absolute;top:130mm;left:42mm;width:99mm;}
  .o2-fields-ar{position:absolute;top:130mm;right:42mm;width:99mm;}
  .o2-dates-en{position:absolute;top:154mm;left:42mm;width:80mm;}
  .o2-dates-ar{position:absolute;top:154mm;right:42mm;width:80mm;}

  .o2-hijri{position:absolute;top:153mm;left:128mm;width:41mm;text-align:center;
    border:0.35mm solid #B08A2E;background:rgba(253,248,238,.92);padding:1.3mm 2mm;}
  .o2-hijri-k{font-family:var(--ar-text);font-size:7.6pt;font-weight:700;color:#4B3420;}
  .o2-hijri-v{font-family:var(--ar-text);font-size:8.6pt;font-weight:700;color:#221A10;margin-top:.5mm;direction:rtl;}

  .o2-sig{position:absolute;top:169.8mm;width:40mm;text-align:center;}
  .o2-sig-1{left:41mm;}
  .o2-sig-2{left:84mm;}
  .o2-sig-3{left:167mm;width:36mm;}
  .o2-sig-line{width:34mm;height:0.25mm;margin:0 auto;background:linear-gradient(90deg,transparent,#4B3420 15%,#4B3420 85%,transparent);}
  .o2-sig-en{font-family:var(--en-display);font-size:6.6pt;font-weight:600;letter-spacing:.9px;text-transform:uppercase;color:#221A10;margin-top:1.2mm;line-height:1.3;}
  .o2-sig-seal{font-family:var(--en-text);font-style:italic;font-size:5.6pt;color:#6E5013;margin-top:.5mm;}

  .o2-qr{position:absolute;left:204.3mm;top:174.4mm;width:26mm;height:22.6mm;background:#FFFFFF;
    display:flex;align-items:center;justify-content:center;}
  .o2-qr svg{width:20.8mm;height:20.8mm;display:block;}
  .o2-verify{position:absolute;left:44mm;top:185.6mm;width:154mm;
    font-family:var(--utility);font-size:4.6pt;color:#221A10;line-height:1.5;}
  .o2-verify .vt{font-family:var(--en-display);font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6E5013;margin-right:1.4mm;}
  .o2-verify b{font-weight:600;}
  .o2-verify .sep{color:#B08A2E;padding:0 1mm;}

  .o2-void{position:absolute;left:44mm;top:190.6mm;width:154mm;
    font-family:var(--en-text);font-style:italic;font-size:4.7pt;color:#7A1F2B;line-height:1.4;}

  /* ═══ Masthead ═══ */
  .masthead{display:grid;grid-template-columns:88mm 1fr 96mm;align-items:start;column-gap:3mm;}
  .mast-left{text-align:left;}
  .mast-right{text-align:right;}
  .crest-row{display:flex;gap:5mm;align-items:center;height:18mm;margin-bottom:2mm;}
  .crest-img{height:16.5mm;width:auto;object-fit:contain;
    filter:contrast(1.18) saturate(1.25) drop-shadow(0 0.5mm 0.6mm rgba(58,42,24,.32));}
  /* §3.1/§3.5 — engraved flat ink, single-line institutional name.
     Final Creative Direction 2026-08-05: the NATIONAL line carries
     greater typographic authority than the institutional lines. */
  .state-en{font-family:var(--en-display);font-size:10.2pt;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--espresso);white-space:nowrap;}
  .inst-en{font-family:var(--en-display);font-size:11pt;font-weight:700;letter-spacing:1px;color:var(--umber);margin-top:1.4mm;white-space:nowrap;}
  .school-en{font-family:var(--en-display);font-size:7.3pt;font-weight:600;letter-spacing:2.2px;text-transform:uppercase;color:var(--gold-deep);margin-top:1.3mm;}

  .honor-row{display:flex;justify-content:flex-end;align-items:flex-start;gap:3.5mm;height:21.5mm;margin-bottom:1.8mm;}
  .medallion{width:21mm;filter:drop-shadow(0 0.8mm 1.1mm rgba(34,26,16,.35));}
  .medallion-svg{width:100%;height:auto;display:block;}

  /* §6.1 — plaque backed by a guilloché rosette; §6.5 — holo edge */
  .id-plaque{position:relative;display:inline-block;padding:0.9mm;overflow:hidden;
    background:linear-gradient(135deg,#8C6516,#D9B44A 30%,#F3E3AC 50%,#C49A2C 72%,#6E5013);
    box-shadow:0 0.5mm 1mm rgba(34,26,16,.3), inset 0 0.2mm 0.3mm rgba(255,250,230,.8);}
  .panel-rosette{position:absolute;inset:0.9mm;width:calc(100% - 1.8mm);height:calc(100% - 1.8mm);}
  .plaque-inner{position:relative;background:linear-gradient(180deg,rgba(253,247,230,.88),rgba(246,237,216,.88));padding:1.5mm 3.2mm 1.9mm;border:0.15mm solid #8C6516;}
  .plaque-row{display:flex;align-items:baseline;justify-content:space-between;gap:3.5mm;}
  .plaque-k{font-family:var(--en-display);font-size:4.9pt;font-weight:600;letter-spacing:1.3px;text-transform:uppercase;color:var(--navy);white-space:nowrap;}
  .plaque-v{font-family:var(--utility);font-size:6.4pt;font-weight:600;letter-spacing:.3px;color:var(--espresso);white-space:nowrap;}
  .plaque-rule{height:0.2mm;margin:0.9mm 0;background:linear-gradient(90deg,transparent,#B8860B 20%,#B8860B 80%,transparent);}
  .holo-edge{position:absolute;left:0.9mm;right:0.9mm;bottom:0;height:1.5mm;
    background:
      repeating-linear-gradient(115deg, rgba(255,255,255,.34) 0 0.6mm, rgba(255,255,255,0) 0.6mm 1.6mm),
      linear-gradient(100deg,#8C6516 0%,#D9B44A 18%,#EDEDEA 38%,#FFFDF5 50%,#C9CCCF 62%,#D4AF37 82%,#6E5013 100%);}

  /* Final Creative Direction: national line dominant; Kufic display
     (Kufam) for the major Arabic lines, Amiri retained for text. */
  .state-ar{font-family:var(--ar-display);font-size:10.5pt;font-weight:700;line-height:1.6;color:var(--espresso);white-space:nowrap;}
  .inst-ar{font-family:var(--ar-display);font-size:11pt;font-weight:600;line-height:1.7;color:var(--umber);margin-top:1mm;white-space:nowrap;}
  .school-ar{font-family:var(--ar-text);font-size:9.4pt;font-weight:700;color:var(--gold-deep);margin-top:.6mm;}

  /* ═══ Title band ═══ */
  .titles{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;column-gap:6mm;margin-top:4.2mm;}
  .title-en{text-align:right;}
  .t-en-1{font-family:var(--en-display);font-size:15.5pt;font-weight:700;letter-spacing:2.6px;color:var(--espresso);text-transform:uppercase;}
  .t-en-2{font-family:var(--en-text);font-style:italic;font-size:10.5pt;font-weight:600;letter-spacing:1.1px;color:var(--umber);margin-top:1mm;}
  .title-divider{display:flex;flex-direction:column;align-items:center;gap:1mm;height:13mm;justify-content:center;}
  .td-line{width:0.25mm;flex:1;background:linear-gradient(180deg,transparent,#8C6516,transparent);}
  .td-diamond{width:1.9mm;height:1.9mm;background:var(--crimson);transform:rotate(45deg);}
  .title-ar{text-align:left;direction:rtl;}
  .t-ar-1{font-family:var(--ar-display);font-size:14.5pt;font-weight:700;line-height:1.65;color:var(--espresso);}
  .t-ar-2{font-family:var(--en-text);font-style:italic;font-size:9pt;color:var(--umber);margin-top:.6mm;direction:ltr;text-align:left;}
  .t-ar-2 span{font-family:var(--ar-text);font-style:normal;}

  /* ═══ Conferral + foil name ═══ */
  .conferral{display:flex;justify-content:center;gap:6mm;margin-top:4.6mm;align-items:baseline;}
  .conf-en{font-family:var(--en-text);font-style:italic;font-size:10.5pt;color:var(--umber);}
  .conf-sep{color:var(--gold-mid);font-size:7pt;}
  .conf-ar{font-family:var(--ar-text);font-size:11.5pt;color:var(--umber);direction:rtl;}

  .name-block{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;column-gap:4mm;margin-top:2mm;}
  .flourish{width:100%;max-width:32mm;height:4mm;justify-self:end;}
  .flourish.flip{transform:scaleX(-1);justify-self:start;}
  .name-stack{text-align:center;}
  /* §7.1 — layered foil: grain + metallic gradient clipped to the
     letterforms, engraved hairline, emboss relief */
  .foil-text{
    background-image:url("${FOILGRAIN}"),var(--foil);
    background-size:34mm,100%;
    -webkit-background-clip:text;background-clip:text;color:transparent;
    -webkit-text-stroke:0.3px rgba(92,67,31,.5);
    filter:drop-shadow(0 0.2mm 0 rgba(255,250,225,.85)) drop-shadow(0 0.55mm 0.5mm rgba(46,32,16,.55));
  }
  .name-en{font-family:var(--en-display);font-size:26pt;font-weight:700;letter-spacing:2.8px;line-height:1.1;}
  .name-ar{font-family:var(--ar-text);font-size:19.5pt;font-weight:700;margin-top:1.2mm;direction:rtl;}
  /* §6.2 — serial microtext rule beneath the name */
  .name-micro{margin:1.8mm auto 0;max-width:132mm;white-space:nowrap;overflow:hidden;
    font-family:var(--utility);font-size:2.9pt;letter-spacing:.35px;color:var(--gold-deep);opacity:.6;
    border-top:0.15mm solid rgba(140,101,22,.4);padding-top:.5mm;}

  /* ═══ Citation ═══ */
  .citation{display:grid;grid-template-columns:1fr 1fr;column-gap:10mm;margin-top:2mm;flex:1;align-content:center;}
  .cite{line-height:1.62;color:var(--umber);}
  .cite.en{font-family:var(--en-text);font-size:10.8pt;text-align:left;}
  .cite.ar{font-family:var(--ar-text);font-size:11.6pt;line-height:1.8;text-align:right;direction:rtl;}
  .cite strong{color:var(--espresso);}
  .cite .datesline{display:block;margin-top:1.4mm;font-size:.93em;}

  /* ═══ Execution ═══ */
  .execution{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;column-gap:8mm;margin-top:1mm;}
  .sig{text-align:center;padding-bottom:2.5mm;}
  .sig-line{width:52mm;height:0.25mm;margin:0 auto;background:linear-gradient(90deg,transparent,#4B3420 15%,#4B3420 85%,transparent);}
  .sig-en{font-family:var(--en-display);font-size:7.8pt;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--espresso);margin-top:1.4mm;}
  .sig-ar{font-family:var(--ar-text);font-size:10.8pt;font-weight:700;color:var(--umber);margin-top:.2mm;}
  .seal-wrap{width:33mm;}
  .seal-svg{width:100%;height:auto;display:block;}

  /* ═══ Footline (Bible §9.1) ═══ */
  .footline{display:flex;justify-content:space-between;align-items:flex-end;margin-top:1.6mm;
    border-top:0.2mm solid rgba(140,101,22,.55);padding-top:1.3mm;}
  .void-note{font-size:6.4pt;color:var(--crimson);}
  .void-note .ar{font-family:var(--ar-text);font-weight:700;display:block;direction:rtl;text-align:left;}
  .void-note .en{font-family:var(--en-text);font-style:italic;display:block;margin-top:.2mm;}
  .verify-block{display:flex;align-items:flex-end;gap:2.6mm;}
  .verify-data{text-align:right;font-family:var(--utility);}
  .int-label{display:block;font-size:4.9pt;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold-deep);}
  .int-hash{display:block;font-size:6.6pt;font-weight:600;letter-spacing:1px;color:var(--espresso);}
  .int-url{display:block;font-size:5pt;color:var(--umber);}
  .int-caption{display:block;font-size:4.7pt;letter-spacing:.8px;text-transform:uppercase;color:var(--gold-deep);margin-top:.3mm;}
  .qr-frame{width:13.5mm;height:13.5mm;padding:0.8mm;background:#FDF6E3;
    border:0.3mm solid #8C6516;outline:0.13mm solid #C49A2C;outline-offset:0.4mm;}
  .qr-frame svg{width:100%;height:100%;display:block;}

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
