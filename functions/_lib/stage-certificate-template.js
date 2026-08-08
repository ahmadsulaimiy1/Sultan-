import { displayStageCertificateNo } from './certificate-serial.js';

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
// A4 landscape is 297 x 210mm. This frame was drawn on 209.5 for a long time —
// the Editorial Bible §4.1 records "A4 landscape (297 × 209.5 mm)", which is
// simply wrong about A4 — and the half-millimetre showed up on paper: rendered
// onto a real A4 page (Chromium's is 209.89mm tall) every sheet carried a
// 0.34mm strip of bare paper across the full 297mm foot, measured off the press
// PDF at 300 DPI. It abutted near-black at the left and crimson at the right,
// so it printed as a pale hairline along the bottom of a premium document.
//
// The half-millimetre was also splitting the sheet into two coordinate systems:
// certificate-ground.js and certificate-plate.js have always drawn on h=210, so
// the paper, guilloche and microtext layers were being squashed 0.24% to fit a
// 209.5mm box while this frame alone was not. Moving to a true 210 removes the
// strip AND the squash, and leaves every absolutely-positioned element — all
// of which are placed in mm from the top — exactly where it was.
function frameSvg(serial) {
  const W = 297, H = 210;
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

// Engraved title cartouche. Drawn in millimetre units so every stroke is a
// real press width and the whole frame stays vector at any output size.
// The device is deliberately spare: a doubled hairline above and below,
// each interrupted at centre by a lozenge, each turning a short bracket
// tick at its ends. The lozenge is the same mark already used on the
// credential band and the name rule, so the page speaks one ornamental
// language instead of three.
function titleFrameSvg(w, h) {
  const c = w / 2;
  const GAP = 5.6;          // centre interruption, where the lozenge sits
  const IN = 0.85;          // companion hairline offset
  const TICK = 3.1;         // bracket turn at each end
  const GOLD = '#8A6A24';
  const FAINT = 'rgba(169,138,60,.82)';
  const lozenge = (x, y, r) =>
    `<path d="M${x} ${(y - r).toFixed(2)} L${(x + r).toFixed(2)} ${y} L${x} ${(y + r).toFixed(2)} L${(x - r).toFixed(2)} ${y} Z"
       fill="${GOLD}"/>`;
  const rule = (y, dir) => `
    <path d="M0.11 ${y} H${(c - GAP / 2).toFixed(2)} M${(c + GAP / 2).toFixed(2)} ${y} H${(w - 0.11).toFixed(2)}"
      stroke="${GOLD}" stroke-width="0.22" fill="none"/>
    <path d="M0.11 ${y} v${dir * TICK} M${(w - 0.11).toFixed(2)} ${y} v${dir * TICK}"
      stroke="${GOLD}" stroke-width="0.22" fill="none"/>
    <path d="M${(2.4).toFixed(2)} ${(y + dir * IN).toFixed(2)} H${(c - GAP / 2 - 1.2).toFixed(2)}
             M${(c + GAP / 2 + 1.2).toFixed(2)} ${(y + dir * IN).toFixed(2)} H${(w - 2.4).toFixed(2)}"
      stroke="${FAINT}" stroke-width="0.07" fill="none"/>
    ${lozenge(c, y, 0.85)}
    ${lozenge(2.4, y, 0.5)}${lozenge(w - 2.4, y, 0.5)}`;
  return `<svg class="o9-frame" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" shape-rendering="geometricPrecision">
    ${rule(0.11, 1)}
    ${rule(h - 0.11, -1)}
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

// ── TAMHĪDIYYAH REGALIA ─────────────────────────────────────────────
// Founder's instruction, 8 August 2026: the Tamhīdiyyah certificate should
// "look like those of Ibtidā'iyyah, but more flashy."
//
// Both halves of that matter. It is the SAME document family — same plate,
// same border architecture, same measured grid — so nothing below moves an
// element, changes a size, or touches a shared rule. It is an additive layer,
// rendered only when the programme code is TMH, and every element sits in
// space this sheet already leaves empty. The Ibtidā'iyyah and I'dādiyyah
// sheets render byte for byte as before; that is not a hope, it is what
// scoping the whole layer behind one code test buys.
//
// The empty space is real and was measured on a rendered proof, not assumed.
// The name band runs y 103–120mm and carries only two lines of type and a
// centre lozenge; the ground either side of the names, x 30–60 and x 237–267,
// carries no ink at all. Those are the regions the regalia occupies.
//
// FOUR ADDITIONS, in the order they read:
//   1  a guilloché halo behind the name pair — banknote engraving at whisper
//      opacity, so the name sits on worked ground rather than plain field
//   2  gold corner brackets framing the name band, drawn as engraved rules
//      rather than a box, so the band is bounded without being caged
//   3  illuminated palmettes flanking the title, mirrored about the centre
//   4  a sixteen-ray star on the name rule — the stage identifier, on the
//      same principle the Founder set for I'dādiyyah's khatam: one ornament
//      distinguishes the stage, and the family still reads as one family
//
// Everything is vector. There is no raster in this layer, so it holds at any
// press resolution, and no new colour enters the sheet — every value is drawn
// from the existing gold ramp.
function tmhRegalia() {
  // Halo: two interfering rosettes on the name band's own centre line, at the
  // opacity the plaque grounds already use, so it reads as worked paper rather
  // than as a graphic sitting on top of one.
  const halo = `<svg class="tmh-halo" viewBox="0 0 240 26" xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    ${guillocheMedallion(70, 13, 12.5, '#8C6516', 0.30)}
    ${guillocheMedallion(170, 13, 12.5, '#8C6516', 0.30)}
    ${guillocheBand(94, 11.9, 52, 2.2, 4, '#8C6516', 0.42)}
  </svg>`;
  // Brackets: an L of two hairlines at each corner of the band, the outer
  // heavier than the inner, which is how an engraved corner is cut.
  const bracket = (cls) => `<span class="tmh-br ${cls}"><i></i><b></b>`
    + '<i class="in"></i><b class="in"></b><em></em></span>';
  // Palmettes: a single path, mirrored. Drawn from the same lobe geometry as
  // the corner medallions so it belongs to this sheet's ornament vocabulary.
  const palmette = (flip) => `<svg class="tmh-palm${flip ? ' flip' : ''}"
    viewBox="0 0 46 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="none" stroke="#A9862F" stroke-width="0.42" stroke-linecap="round">
      <path d="M2 7 C 10 7, 13 2.4, 19 2.4 C 24 2.4, 25.4 5.2, 23 6.6
               C 20.6 8, 17.4 6.4, 18.6 4.2"/>
      <path d="M2 7 C 10 7, 13 11.6, 19 11.6 C 24 11.6, 25.4 8.8, 23 7.4
               C 20.6 6, 17.4 7.6, 18.6 9.8"/>
      <path d="M25.5 7 C 31 7, 33.5 3.6, 38 3.6 C 41.6 3.6, 42.6 5.7, 40.9 6.7"/>
      <path d="M25.5 7 C 31 7, 33.5 10.4, 38 10.4 C 41.6 10.4, 42.6 8.3, 40.9 7.3"/>
    </g>
    <circle cx="24.4" cy="7" r="1.05" fill="#B8912F"/>
    <circle cx="43.4" cy="7" r="0.62" fill="#B8912F"/>
  </svg>`;
  return `${halo}
  ${bracket('tmh-br-tl')}${bracket('tmh-br-tr')}${bracket('tmh-br-bl')}${bracket('tmh-br-br')}
  ${palmette(false)}${palmette(true)}`;
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
// official-background-clean.jpg = the client's locked artwork with ONE
// authorised change (Founder release-gate directive): the duplicated
// school-name lines directly beneath the centre logo are removed —
// "Keep only the official logo." The untouched original remains at
// official-background.jpg.
// official-background-master.jpg is derived from the untouched original by
// scripts/certificate-artwork.py, which lifts every line of baked-in text out
// of the raster so it can be re-set as live vector type. Re-run that script
// if a press-resolution original ever replaces the source.
const OFFICIAL_BACKGROUND = '/assets/images/certificates/official-background-master.jpg';

// ── PER-STAGE PLATES ────────────────────────────────────────────────
// The stages do NOT share one background. The Founder supplied a distinct
// I'dadiyyah plate on 2026-08-06 — a different composition entirely, with
// corner ribbon swags, vertical holographic strips, a central mandala
// watermark, a gold wax seal at the foot and a baked QR block. Rendering it
// under the Ibtida'iyyah layout, or the reverse, prints the wrong document.
//
// The I'dadiyyah entry is the marks layer, not a flat JPEG: the paper beneath
// it is the vector PAPER colour below, so the sheet's largest area carries no
// resolution at all. The two compose to the supplied artwork within 0.05 of
// 255 — see functions/_lib/certificate-plate.js and
// docs/certificate-ground-vector.md §0.
const STAGE_PLATE = {
  IDD: {
    src: '/assets/images/certificates/official-background-idd-marks.png',
    paper: '#F4ECDF',
  },
};

function plateFor(progCode) {
  return STAGE_PLATE[String(progCode || '').toUpperCase()] || null;
}

// Per-document microtext for a stage plate (Founder directive, 2026-08-06:
// "activate the live serial-number microtext").
//
// The plate's own microtext is decorative and identical on every sheet. These
// two rails carry the LIVE serial, so a sheet copied from another student's
// certificate contradicts itself in its own border.
//
// Placement is measured, not chosen: y 68mm and y 115mm carry 0.00% plate ink
// across x 40-257mm and clear every content box — name ends 112.5, name rule
// starts 117.7, basmala ends 60, title starts 79.8.
//
// The lower rail was first put at y 117, which cleared the name rule by 0.10mm.
// That is inside a commercial press's registration tolerance, so on a real run
// the two could touch. It is now at 115: 1.9mm clear above, 2.1mm below. A
// collision audit that only checks the elements you remembered to list will
// miss this class of defect — the audit now sweeps every element in the sheet.
//
// The ids are namespaced per sheet. batch-print.html puts all six certificates
// in ONE document, so a fixed id would make every sheet's textPath resolve to
// the first sheet's path — six certificates all printing student one's serial
// in their microtext, which is exactly the failure this feature exists to
// prevent.
// The paper the plate's marks sit on (Founder directive, 2026-08-06: "it should
// resemble premium certificate stock rather than digitally coloured paper").
//
// This is the one part of §1 and §4 that is genuinely available. The plate's
// ORNAMENT — its gold, guilloche, holographic strips — is 92 DPI raster and
// cannot be sharpened without inventing detail. But the paper beneath it is not
// raster at all: the ink key lifted the artwork's paper out, leaving a flat
// colour rect. Flat is precisely what "digitally coloured" looks like. So the
// texture goes in here, as true vector, at any resolution.
//
// Everything is deterministic from the serial, so a reprint of the same
// certificate is the same sheet, and two students never share a fibre map.
// Solid light ink throughout, never an opacity: on strokes this fine an opacity
// becomes a screen percentage at separation and drops out first on press.
function stagePaperTextureSvg(paper, seed, uid) {
  let s = 0;
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  // Cotton fibres, in the tints a real security substrate carries. Kept to a
  // handful of levels off the paper so they read as substrate, not as specks.
  const tints = ['#E7DCCB', '#E3DACD', '#EADDC8', '#E1DBD0', '#EBDCCE'];
  let fibres = '';
  for (let i = 0; i < 320; i++) {
    const x = rnd() * 297, y = rnd() * 210;
    const a = rnd() * Math.PI * 2, len = 1.1 + rnd() * 2.9;
    const bow = (rnd() - 0.5) * 1.2;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const mx = (x + x2) / 2 - Math.sin(a) * bow, my = (y + y2) / 2 + Math.cos(a) * bow;
    fibres += `<path d="M${x.toFixed(2)} ${y.toFixed(2)} Q${mx.toFixed(2)} ${my.toFixed(2)} `
      + `${x2.toFixed(2)} ${y2.toFixed(2)}" fill="none" stroke="${tints[i % tints.length]}" `
      + `stroke-width="0.09"/>`;
  }
  const g = `pt-${uid}`;
  return `<svg class="o5-plate-paper" viewBox="0 0 297 210" xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true">
    <defs>
      <radialGradient id="${g}-tone" cx="0.5" cy="0.47" r="0.80">
        <stop offset="0" stop-color="#F7F1E6"/><stop offset="0.58" stop-color="${paper}"/>
        <stop offset="1" stop-color="#EFE5D2"/>
      </radialGradient>
      <!-- Cotton laid texture: two fine rulings crossing off both 0 and 45
           degrees, so they beat against a copier's screen angles instead of
           aligning with them. 0.07mm is the press floor for a screen stroke. -->
      <pattern id="${g}-laid" width="0.62" height="0.62" patternUnits="userSpaceOnUse"
        patternTransform="rotate(11)">
        <line x1="0" y1="0" x2="0" y2="0.62" stroke="#EDE4D4" stroke-width="0.07"/>
        <line x1="0" y1="0" x2="0.62" y2="0" stroke="#F0E8D9" stroke-width="0.07"/>
      </pattern>
      <!-- Anti-copy tint at a third angle (§4). -->
      <pattern id="${g}-anti" width="0.44" height="0.44" patternUnits="userSpaceOnUse"
        patternTransform="rotate(69)">
        <line x1="0" y1="0" x2="0" y2="0.44" stroke="#EEE5D5" stroke-width="0.07"/>
      </pattern>
    </defs>
    <rect width="297" height="210" fill="url(#${g}-tone)"/>
    <rect width="297" height="210" fill="url(#${g}-laid)"/>
    <rect width="297" height="210" fill="url(#${g}-anti)"/>
    <g>${fibres}</g>
  </svg>`;
}

function stagePlateMicrotextSvg(serial, uid) {
  const micro = `SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL ACADEMIC RECORD · ${serial} · `;
  const body = escapeHtml(micro.repeat(4));
  const a = `pm-a-${uid}`, b = `pm-b-${uid}`;
  // Solid light ink, never an opacity: an opacity on type this small becomes a
  // screen percentage at separation and is the first thing to drop on press.
  return `<svg class="o5-plate-micro" viewBox="0 0 297 210" xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true">
    <defs><path id="${a}" d="M40 68 H257"/><path id="${b}" d="M40 115 H257"/></defs>
    <text font-family="Inter, sans-serif" font-size="0.318" letter-spacing="0.02" fill="#A6905E"
      ><textPath href="#${a}" xlink:href="#${a}">${body}</textPath></text>
    <text font-family="Inter, sans-serif" font-size="0.282" letter-spacing="0.03" fill="#B09A68"
      ><textPath href="#${b}" xlink:href="#${b}">${body}</textPath></text>
  </svg>`;
}

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

// ─────────────────────────────────────────────────────────────────────
// Engraved credential-plaque ground (Final Refinement directive):
// ivory archival field, woven micro-guilloché at whisper opacity,
// double hairline gold rules, corner ornaments, SHRS microtext along
// the base. Pure vector, generated per plaque size, so the engraving
// stays crisp at any print resolution — no digital gradients.
// ─────────────────────────────────────────────────────────────────────
// Code 128 (subset C) linear barcode for the authentication station's
// archival reference — real, standards-compliant encoding of real data
// (validated against the python-barcode reference encoder), never a
// decorative fake. Input must be an even-length digit string.
const C128 = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 '
  + '221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 '
  + '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 '
  + '212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 '
  + '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 '
  + '231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 '
  + '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 '
  + '112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 '
  + '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 '
  + '214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 '
  + '114131 311141 411131 211412 211214 211232').split(' ');
const C128_STOP = '2331112';
function code128cWidths(digits) {
  // Subset C encodes digit PAIRS. Given an odd or non-numeric payload it
  // used to absorb the stray character as pair value 0 and return a valid
  // checksum over a corrupted number — a barcode that scans cleanly and
  // says the wrong thing is worse than one that fails.
  if (!/^[0-9]+$/.test(digits)) throw new Error(`Code128-C: non-numeric payload "${digits}"`);
  if (digits.length % 2) throw new Error(`Code128-C: odd-length payload "${digits}"`);
  const vals = [105];
  for (let i = 0; i < digits.length; i += 2) vals.push(parseInt(digits.slice(i, i + 2), 10));
  let ck = vals[0];
  for (let i = 1; i < vals.length; i++) ck += vals[i] * i;
  vals.push(ck % 103);
  return vals.map((v) => C128[v]).join('') + C128_STOP;
}
function code128cSvg(digits) {
  const widths = code128cWidths(digits);
  let total = 0;
  for (const ch of widths) total += +ch;
  let x = 0, bar = true, rects = '';
  for (const ch of widths) {
    const w = +ch;
    if (bar) rects += `<rect x="${x}" y="0" width="${w}" height="10" fill="#000000"/>`;
    x += w;
    bar = !bar;
  }
  return `<svg viewBox="0 0 ${total} 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

// (retired) enclosed credential-bar ground — superseded by the open
// letterpress ledger band of the o8 system.
function barGroundSvg(w, h, dividers) {
  const rows = 4;
  let weave = '';
  for (let r = 0; r < rows; r++) {
    const y0 = 1.7 + (r + 0.5) * ((h - 3.4) / rows);
    for (const ph of [0, Math.PI]) {
      const steps = Math.round(w / 0.7);
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const x = 1.7 + (i / steps) * (w - 3.4);
        const y = y0 + 0.72 * Math.sin((i / steps) * Math.PI * 2 * (w / 7.5) + ph);
        pts.push((i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2));
      }
      weave += `<path d="${pts.join('')}" fill="none" stroke="#B08A2E" stroke-width="0.05" opacity="0.13"/>`;
    }
  }
  const sep = dividers.map((x) => `
    <line x1="${x}" y1="2.1" x2="${x}" y2="${h - 2.1}" stroke="#9A7A2C" stroke-width="0.09" opacity="0.8"/>
    <rect x="${x - 0.5}" y="1.15" width="1" height="1" transform="rotate(45 ${x} 1.65)" fill="none" stroke="#8A6A24" stroke-width="0.09"/>
    <rect x="${x - 0.5}" y="${h - 2.15}" width="1" height="1" transform="rotate(45 ${x} ${h - 1.65})" fill="none" stroke="#8A6A24" stroke-width="0.09"/>`).join('');
  const flourish = (cx, cy, sx, sy) => `
    <path d="M ${cx} ${cy + sy * 1.6} Q ${cx} ${cy} ${cx + sx * 1.6} ${cy}" fill="none" stroke="#8A6A24" stroke-width="0.12"/>
    <path d="M ${cx + sx * 0.4} ${cy + sy * 2.3} Q ${cx + sx * 0.4} ${cy + sy * 0.4} ${cx + sx * 2.3} ${cy + sy * 0.4}" fill="none" stroke="#A98A3C" stroke-width="0.08"/>
    <circle cx="${cx + sx * 0.4}" cy="${cy + sy * 0.4}" r="0.22" fill="#8A6A24"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" rx="0.8" fill="#FBF4E4" opacity="0.55"/>
    ${weave}
    <rect x="0.3" y="0.3" width="${w - 0.6}" height="${h - 0.6}" rx="0.65" fill="none" stroke="#8A6A24" stroke-width="0.18" opacity="0.9"/>
    <rect x="0.95" y="0.95" width="${w - 1.9}" height="${h - 1.9}" rx="0.4" fill="none" stroke="#A98A3C" stroke-width="0.08" opacity="0.85"/>
    ${sep}
    ${flourish(1.7, 1.7, 1, 1)}${flourish(w - 1.7, 1.7, -1, 1)}${flourish(1.7, h - 1.7, 1, -1)}${flourish(w - 1.7, h - 1.7, -1, -1)}
    <text x="${w / 2}" y="${h - 0.72}" text-anchor="middle" font-family="sans-serif" font-size="0.8"
      letter-spacing="0.16" fill="#8A6A24" opacity="0.32">SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL ACADEMIC RECORD · GUILLOCHE · MICROTEXT · QR VERIFICATION · CRYPTOGRAPHIC SERIAL</text>
  </svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}')`;
}

// NOTE (Founder-supplied SHRS security emblem, image 3).
// The device in that photograph is already on this sheet. It was shot off
// the printed artwork, and a chroma-variance scan finds the same iridescent
// band still there: 4.21 a*-variance where it sits against 0.73 on plain
// paper — six times the local hue spread, which is what an optically-
// variable ink reads as and warm paper does not. Compositing a second copy
// over it would duplicate an existing security feature rather than add one,
// and would sit one hologram on top of another. The restored artwork is
// kept at assets/images/certificates/security-emblem-shrs.png for the
// Founder's own use; it is deliberately not placed on the certificate.

function plaqueGroundSvg(w, h, corner = 'rosette') {
  const rows = Math.max(3, Math.round(h / 2.8));
  let weave = '';
  for (let r = 0; r < rows; r++) {
    const y0 = 2.1 + (r + 0.5) * ((h - 4.2) / rows);
    for (const ph of [0, Math.PI]) {
      const steps = Math.round(w / 0.7);
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const x = 2.1 + (i / steps) * (w - 4.2);
        const y = y0 + 0.85 * Math.sin((i / steps) * Math.PI * 2 * (w / 7.5) + ph);
        pts.push((i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2));
      }
      weave += `<path d="${pts.join('')}" fill="none" stroke="#B08A2E" stroke-width="0.055" opacity="0.15"/>`;
    }
  }
  const cornerMark = (cx, cy) => {
    if (corner === 'diamond') {
      return `<rect x="${(cx - 0.62).toFixed(2)}" y="${(cy - 0.62).toFixed(2)}" width="1.24" height="1.24"
        transform="rotate(45 ${cx} ${cy})" fill="none" stroke="#8A6A24" stroke-width="0.11"/>
        <circle cx="${cx}" cy="${cy}" r="0.22" fill="#8A6A24" opacity="0.8"/>`;
    }
    let petals = '';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      petals += `<circle cx="${(cx + 0.92 * Math.cos(a)).toFixed(2)}" cy="${(cy + 0.92 * Math.sin(a)).toFixed(2)}"
        r="0.3" fill="none" stroke="#8A6A24" stroke-width="0.085"/>`;
    }
    return petals + `<circle cx="${cx}" cy="${cy}" r="0.26" fill="#8A6A24" opacity="0.8"/>`;
  };
  const c = 2.15;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" rx="0.9" fill="#FCF6E8" opacity="0.9"/>
    ${weave}
    <rect x="0.32" y="0.32" width="${w - 0.64}" height="${h - 0.64}" rx="0.7" fill="none" stroke="#8A6A24" stroke-width="0.2"/>
    <rect x="1.05" y="1.05" width="${w - 2.1}" height="${h - 2.1}" rx="0.45" fill="none" stroke="#A98A3C" stroke-width="0.09"/>
    ${cornerMark(c, c)}${cornerMark(w - c, c)}${cornerMark(c, h - c)}${cornerMark(w - c, h - c)}
    <text x="${w / 2}" y="${h - 1.62}" text-anchor="middle" font-family="sans-serif" font-size="0.92"
      letter-spacing="0.14" fill="#8A6A24" opacity="0.3">SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL RECORD</text>
  </svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}')`;
}

// ─────────────────────────────────────────────────────────────────────
// CERTIFICATE NUMBER SECURITY CARTOUCHE (lower-left)
// ─────────────────────────────────────────────────────────────────────
// Placement is dictated by the paper, not by taste. A chroma scan of the
// locked artwork finds an optically-variable strip already printed in the
// lower left — a*/b* spread 3.8-4.6 / 4.7-6.7 against a 0.77 / 3.10 plain-
// paper baseline — occupying x 60-120mm, y 185.6-196.2mm, with the
// artwork's own microtext rules immediately above (y 183.2-184.8) and
// below (y 196.2-197.5). That is 60mm wide: the same width as the
// verification plate on the opposite side. The original artwork plainly
// reserved a panel here.
//
// So the cartouche is drawn AROUND those devices rather than over them.
// Its frame lands at x 59-121, y 172.2-197.5 — the verification plate's
// exact width and vertical band — and the paper's own hologram becomes the
// panel's integrated bottom edge, the paper's own microtext becomes the
// panel's microtext bands. This is the only reading of "part of the paper
// itself, not pasted on top" that is literally true, and it repeats the
// lesson already recorded above: do not composite a second hologram over a
// hologram the sheet already carries.
//
// Everything new therefore lives in the clean field y 0-11 (absolute
// 172.2-183.2), measured at 1-9% ink coverage and plain-paper chroma.
//
// PRINT LIMITS, stated so nobody has to guess later:
//   · structural strokes are >= 0.10mm and screen strokes >= 0.07mm. The
//     first pass used 0.045-0.05mm, which is below what a commercial press
//     holds on this stock; a security screen that breaks up has stopped
//     being a control. On UNCOATED stock the floor rises to ~0.15mm, so
//     the printer must be told the stock before this goes to plate.
//   · fine linework carries SOLID light ink, never an opacity value. An
//     opacity on a hairline becomes a screen percentage at separation and
//     a screened hairline is the first thing to drop out on press.
//   · microtext is 0.90pt on the ring and 0.75pt on the repeats. 0.6pt is
//     the absolute floor and only on COATED stock at 300+ lpi; on uncoated
//     it fills in and becomes a grey line carrying no information
//   · the anti-copy screen runs 0.48mm pitch (~53 lpi) at 8 degrees, off
//     both 0 and 45 so it clashes with standard copier screen angles
//   · the latent panel is COVERAGE-MATCHED, not merely angle-shifted:
//     0.05mm on a 0.34mm pitch against 0.10mm on a 0.68mm pitch is the
//     same 0.147 ink fraction, so the two read as one tone flat-on, while
//     a copier's threshold treats a coarse ruling and a fine one
//     differently. An angle change ALONE was tried first and measured
//     1.05x separation on a simulated copy — i.e. none. See the honesty
//     note in docs/certificate-number-cartouche.md: this is the one
//     feature here that software cannot finish proving, and it needs a
//     press proof run through a real copier before anyone relies on it.
// Nothing here claims to be UV ink, security fibre, or hot-stamped foil:
// those need a press pass, a paper mill and a stamping die respectively.
// The UV crosshairs are REGISTRATION MARKS showing a UV unit where to lay
// down, not fluorescence — see docs/certificate-number-cartouche.md.

// ── Shared security vocabulary ──────────────────────────────────────
// Both engraved stations — the certificate-number cartouche (lower left)
// and the verification module (lower right) — are built from these, so
// they read as one authentication system rather than two separate boxes.

// PRINTED fibre simulation. Real security fibres are embedded in the
// sheet at the paper mill and cannot be printed; these are the printed
// analogue that certificate printers use — short, randomly-angled hairs
// in restrained optical tints, laid UNDER the engraving so they read as
// part of the substrate. Labelled honestly in
// docs/certificate-number-cartouche.md as printed, not embedded.
//
// The scatter is deterministic — seeded from the serial — so a reprint of
// the same certificate is identical to the original, which matters: a
// document whose "random" security layer changes between prints cannot be
// compared against an archive copy.
function securityFibres(w, h, seed, count = 26) {
  // Small deterministic LCG. Math.random() would make every reprint differ.
  let s = 0;
  for (let i = 0; i < String(seed).length; i++) s = (s * 31 + String(seed).charCodeAt(i)) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const tints = ['#C9A8C4', '#A8BFD4', '#C6C29B', '#D3B4A6', '#A9C9BC'];
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = rnd() * h;
    const a = rnd() * Math.PI, len = 0.9 + rnd() * 1.8;
    const dx = Math.cos(a) * len, dy = Math.sin(a) * len;
    const c = tints[Math.floor(rnd() * tints.length)];
    // A gentle curve, not a straight tick — a fibre lying on paper bends.
    const mx = x + dx / 2 - dy * 0.16, my = y + dy / 2 + dx * 0.16;
    out += `<path d="M${x.toFixed(2)} ${y.toFixed(2)} Q${mx.toFixed(2)} ${my.toFixed(2)} ${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}"`
      + ` fill="none" stroke="${c}" stroke-width="0.11" stroke-linecap="round" opacity="0.5"/>`;
  }
  return out;
}

// UV registration motif — a crosshair in a lobed rosette. These are MARKS
// telling a UV unit where to lay down; they are not fluorescent ink and do
// not glow. Drawn in a cool tint so a proofer can see them and a printer
// can move them to their own separation.
// Solid light ink, pre-composited. These crosshairs used to be #B9A9CE
// strokes of 0.07-0.08mm inside a <g opacity="0.62"> — hairlines AT the
// press floor, then screened to 62%. That breaks the same rule §5 states:
// fine linework carries solid light ink, never an opacity, because an
// opacity on a hairline becomes a halftone percentage at separation and a
// screened hairline is the first thing to drop off press. A registration
// mark that drops out cannot register anything.
// #B9A9CE at 62% over the panel's cream ground composites to this value, so
// the appearance is unchanged and only the separation behaviour differs.
const UV_INK = '#D2C8DE';

function uvMotif(cx, cy, r = 1.15) {
  let petals = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    petals += `<circle cx="${(cx + r * 0.62 * Math.cos(a)).toFixed(2)}" cy="${(cy + r * 0.62 * Math.sin(a)).toFixed(2)}"`
      + ` r="${(r * 0.3).toFixed(2)}" fill="none" stroke="${UV_INK}" stroke-width="0.07"/>`;
  }
  return `<g>${petals}
    <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${UV_INK}" stroke-width="0.08"/>
    <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${UV_INK}" stroke-width="0.08"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.2).toFixed(2)}" fill="${UV_INK}"/></g>`;
}

// Iridescent wash — the restrained optical-variability cue. Kept to a
// 6-8% alpha sweep so it reads as a sheen on the paper rather than as
// colour; the directive asks for sophistication without a colourful
// certificate.
function iridescentWash(id, deg = 18) {
  return `<linearGradient id="${id}" gradientTransform="rotate(${deg})">
    <stop offset="0" stop-color="#C9A8C4" stop-opacity="0.10"/>
    <stop offset="0.28" stop-color="#A8BFD4" stop-opacity="0.07"/>
    <stop offset="0.55" stop-color="#C6C29B" stop-opacity="0.05"/>
    <stop offset="0.78" stop-color="#D3B4A6" stop-opacity="0.07"/>
    <stop offset="1" stop-color="#A9C9BC" stop-opacity="0.10"/>
  </linearGradient>`;
}

// Fine parallel line screen as a tiling pattern — one <pattern> element
// instead of several thousand <line> elements, and genuinely resolution
// independent. `deg` is the screen angle; two screens differing by ~74deg
// at identical weight are what makes a latent image work.
function screenPattern(id, deg, pitch, stroke, colour, opacity) {
  return `<pattern id="${id}" width="${pitch}" height="${pitch}" patternUnits="userSpaceOnUse"
    patternTransform="rotate(${deg})">
    <line x1="0" y1="-0.1" x2="0" y2="${pitch + 0.1}" stroke="${colour}"
      stroke-width="${stroke}" opacity="${opacity}"/>
  </pattern>`;
}

// The cartouche outline: ogee-arched ends and chamfered corners, so it
// reads as an engraved plate and not as a rounded rectangle. `inset`
// shrinks it concentrically for the inner rules and the microtext ring.
function cartouchePath(w, h, inset) {
  const x0 = inset, x1 = w - inset, y0 = inset, y1 = h - inset;
  const e = 4.6 - inset * 0.55;          // how far the ogee tip reaches out
  const c = 2.2 - inset * 0.5;           // top/bottom corner chamfer
  const my = h / 2;
  return [
    `M ${(x0 + e + c).toFixed(2)} ${y0.toFixed(2)}`,
    `L ${(x1 - e - c).toFixed(2)} ${y0.toFixed(2)}`,
    `L ${(x1 - e).toFixed(2)} ${(y0 + c).toFixed(2)}`,
    `C ${(x1 - e * 0.15).toFixed(2)} ${(y0 + c + 1.4).toFixed(2)} ${x1.toFixed(2)} ${(my - 2.6).toFixed(2)} ${x1.toFixed(2)} ${my.toFixed(2)}`,
    `C ${x1.toFixed(2)} ${(my + 2.6).toFixed(2)} ${(x1 - e * 0.15).toFixed(2)} ${(y1 - c - 1.4).toFixed(2)} ${(x1 - e).toFixed(2)} ${(y1 - c).toFixed(2)}`,
    `L ${(x1 - e - c).toFixed(2)} ${y1.toFixed(2)}`,
    `L ${(x0 + e + c).toFixed(2)} ${y1.toFixed(2)}`,
    `L ${(x0 + e).toFixed(2)} ${(y1 - c).toFixed(2)}`,
    `C ${(x0 + e * 0.15).toFixed(2)} ${(y1 - c - 1.4).toFixed(2)} ${x0.toFixed(2)} ${(my + 2.6).toFixed(2)} ${x0.toFixed(2)} ${my.toFixed(2)}`,
    `C ${x0.toFixed(2)} ${(my - 2.6).toFixed(2)} ${(x0 + e * 0.15).toFixed(2)} ${(y0 + c + 1.4).toFixed(2)} ${(x0 + e).toFixed(2)} ${(y0 + c).toFixed(2)}`,
    'Z',
  ].join(' ');
}

// Engraved volute — a quarter scroll with a bud, mirrored into each
// corner by the sx/sy signs.
function volute(cx, cy, sx, sy) {
  return `<g fill="none" stroke="#8A6A24" stroke-linecap="round">
    <path d="M ${cx} ${cy + sy * 2.9} C ${cx} ${cy + sy * 0.9} ${cx + sx * 0.9} ${cy} ${cx + sx * 2.9} ${cy}"
      stroke-width="0.13"/>
    <path d="M ${cx + sx * 0.55} ${cy + sy * 3.5} C ${cx + sx * 0.55} ${cy + sy * 1.15} ${cx + sx * 1.15} ${cy + sy * 0.55} ${cx + sx * 3.5} ${cy + sy * 0.55}"
      stroke-width="0.075" stroke="#A98A3C"/>
    <path d="M ${cx + sx * 1.5} ${cy + sy * 1.5} c ${sx * 0.85} ${sy * -0.1} ${sx * 1.0} ${sy * 0.55} ${sx * 0.25} ${sy * 0.9}"
      stroke-width="0.07" stroke="#A98A3C"/>
    <circle cx="${cx + sx * 0.55}" cy="${cy + sy * 0.55}" r="0.2" fill="#8A6A24" stroke="none"/>
  </g>`;
}

// Khatam boss for the head of the cartouche: an eight-point star in the
// same constructed vocabulary as the frame's corner medallions, at the
// scale a seated ornament can occupy without breaching the top rule.
function cartoucheBoss(cx, cy, r) {
  const star = (r1, r2, rot) => {
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const rr = i % 2 === 0 ? r1 : r2;
      const a = (i / 16) * Math.PI * 2 + rot;
      pts.push((i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2));
    }
    return pts.join('') + 'Z';
  };
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FBF4E4" stroke="#8A6A24" stroke-width="0.13"/>
    <path d="${star(r * 0.86, r * 0.4, 0)}" fill="url(#cnGold)" stroke="#6E5013" stroke-width="0.05"/>
    <path d="${star(r * 0.6, r * 0.26, Math.PI / 8)}" fill="#5C431F" opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.17).toFixed(2)}" fill="url(#cnGold)" stroke="#6E5013" stroke-width="0.05"/>
  </g>`;
}

// The panel. `displayNo` is the timeless printed number
// (SHRS-CERT-IBT-000035); `fullSerial` is the full database serial and is
// what the microtext and the microscopic repeats carry, so the covert
// layer still binds the sheet to the year and the HMAC suffix even though
// the visible number does not show them.
// NOTE ON UNITS — this viewBox is 62x25.3 with one user unit = one
// millimetre, so every font-size below is in MILLIMETRES, not points. That
// is not obvious and it has already caused one defect: passing a point
// value straight through set the number at 126.6mm across a 62mm panel.
// PT is the conversion, and sizes are written as `n * PT` wherever the
// intent is a typographic size, so the number in the source is the number
// a printer would name.
const PT = 0.35278;

// FIGURE STYLE FOR THE ENGRAVED NUMBER — one switch, deliberately.
// 'oldstyle' is the Premium Certificate Number directive's explicit
// instruction and is Cormorant Garamond's DEFAULT (the family ships text
// figures and exposes `lnum` to get lining, not `onum` to get oldstyle —
// verified against the binaries: cap height 625, while 3/4/5/7/9 descend
// to -275, 6 rises to 661, 8 to 574, and 0/1/2 sit at x-height).
//
// The cost is real and is recorded here rather than discovered later: at
// x-height the zeros in a run like 000035 read as lower-case o's, which is
// why this file's identifier band uses lining figures (see .bg-v-id). On a
// number a registrar may transcribe from print, that is a transcription
// risk, not only a matter of taste. Set this to 'lining' to switch; both
// render from the same font with no other change.
const CN_FIGURE_STYLE = 'oldstyle';

function certificateNumberCartoucheSvg({ displayNo, fullSerial, numberEm, tracking }) {
  const W = 62, H = 25.3;
  const FIELD = 11;                      // clean paper; below this the artwork's own devices run
  // Repeat counts are sized to the RUN LENGTH, not picked by feel. The
  // ring path is ~165mm around and Inter sets ~0.14mm per character at
  // 0.72pt, so ~1180 characters are needed to close the ring; at 5 repeats
  // the text died out along the top edge and left three sides bare. The
  // repeat bands are ~16mm slots at 0.75pt (~0.146mm/char), so 3 repeats
  // of a 32-character serial fills one without overrunning it. (This said
  // 0.58pt/4 repeats, written when BOTH bands were 0.58pt. The left band was
  // later raised to the 0.75pt press floor and the right one was missed —
  // the stale comment is how that survived review.)
  const micro = `${fullSerial} · SULTAN HANAFI ROYAL SCHOOLS · `.repeat(16);
  const repeats = `${fullSerial} `.repeat(3);
  const numY = 9.55, numX = W / 2;

  return `<svg class="cn-plate" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="cnGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8C6516"/><stop offset="0.3" stop-color="#D9B44A"/>
      <stop offset="0.52" stop-color="#F3E3AC"/><stop offset="0.74" stop-color="#C49A2C"/>
      <stop offset="1" stop-color="#6E5013"/>
    </linearGradient>
    ${iridescentWash('cnIris', 14)}
    <linearGradient id="cnDebossT" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6E5013" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#6E5013" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="cnDebossB" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FFFDF6" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFDF6" stop-opacity="0"/>
    </linearGradient>

    ${screenPattern('cnCopy', 8, 0.48, 0.07, '#D8CBAC', 1)}
    ${screenPattern('cnLatent', 82, 0.96, 0.14, '#D8CBAC', 1)}
    <path id="cnRing" d="${cartouchePath(W, H, 1.55)}"/>
    <clipPath id="cnField"><rect x="0" y="0" width="${W}" height="${FIELD}"/></clipPath>
    <clipPath id="cnInner"><path d="${cartouchePath(W, H, 0.75)}"/></clipPath>
  </defs>

  <!-- 1. paper tint: barely there, so the engraving reads as incised into
          the sheet rather than sitting on a card laid over it -->
  <path d="${cartouchePath(W, H, 0)}" fill="#FDF8EC" opacity="0.42"/>

  <g clip-path="url(#cnInner)">
    <!-- 2. anti-copy screen across the clean field only; the artwork's own
            hologram below must not be screened over -->
    <g clip-path="url(#cnField)">
      <!-- printed fibre simulation and the iridescent wash sit UNDER the
           engraving, so they read as the substrate rather than as marks
           laid on top of it -->
      ${securityFibres(W, FIELD, fullSerial, 22)}
      <rect x="0" y="0" width="${W}" height="${FIELD}" fill="url(#cnIris)"/>
      <rect x="0" y="0" width="${W}" height="${FIELD}" fill="url(#cnCopy)"/>
      <!-- 3. latent panel: identical ink weight, 74deg apart. Flat-on it
              disappears into the screen; at a raking angle, and on a
              photocopy, SHRS separates out of the ground. -->
      <text x="${numX}" y="7.9" text-anchor="middle" font-family="Cinzel, serif"
        font-weight="700" font-size="${(21 * PT).toFixed(2)}" letter-spacing="1.0" fill="url(#cnLatent)">SHRS</text>
      <!-- 4. engine-turned rosette behind the number (epitrochoid, the same
              lathe geometry as the frame's medallions) -->
      <g opacity="0.5">${guillocheMedallion(numX, numY - 1.5, 7.6, '#9A7A2C', 0.4)}</g>
      <g opacity="0.34">${guillocheMedallion(numX, numY - 1.5, 4.3, '#8C6516', 0.5)}</g>
      <g opacity="0.26">${guillocheMedallion(numX - 20, numY - 1.6, 3.1, '#9A7A2C', 0.45)}</g>
      <g opacity="0.26">${guillocheMedallion(numX + 20, numY - 1.6, 3.1, '#9A7A2C', 0.45)}</g>
    </g>
  </g>

  <!-- 4b. impression depth: a dark lip under the top wall and a pale lip
           above the bottom one. This is what an impressed panel does to
           light; a box-shadow would make it read as a card lying on top. -->
  <g clip-path="url(#cnInner)">
    <rect x="0" y="0" width="${W}" height="2.2" fill="url(#cnDebossT)"/>
    <rect x="0" y="${H - 1.8}" width="${W}" height="1.8" fill="url(#cnDebossB)"/>
  </g>

  <!-- 5. guilloche lathe band inside the top edge, stopped short of the
          boss so the two do not overprint -->
  ${guillocheBand(10.5, 0.85, 17, 1.2, 3, '#8C6516', 0.4)}
  ${guillocheBand(W - 27.5, 0.85, 17, 1.2, 3, '#8C6516', 0.4)}

  <!-- 6. engraved double rule: heavy outer, hairline inner -->
  <path d="${cartouchePath(W, H, 0)}" fill="none" stroke="#8A6A24" stroke-width="0.26"/>
  <path d="${cartouchePath(W, H, 0.75)}" fill="none" stroke="#A98A3C" stroke-width="0.10"/>

  <!-- 7. microtext ring following the cartouche itself, carrying the FULL
          serial — the covert layer keeps the year and the HMAC suffix that
          the visible number deliberately drops -->
  <text font-family="Inter, sans-serif" font-size="${(0.9 * PT).toFixed(3)}" letter-spacing="0.02"
    fill="#AC996C"><textPath href="#cnRing">${escapeHtml(micro)}</textPath></text>

  <!-- 8. corner volutes -->
  ${volute(6.4, 2.0, 1, 1)}${volute(W - 6.4, 2.0, -1, 1)}

  <!-- 9. bilingual label pair, set as one optically centred group the way
          every other label on this sheet is (.bg-l): English, a lozenge,
          then the Arabic. The two are placed at fixed centres rather than
          anchored to the panel edges — anchoring the Arabic to the right
          wall pushed it straight through the frame on the first run,
          because an RTL run with text-anchor:end measures from its own
          logical end, not the visual one. -->
  <text x="24.6" y="4.5" text-anchor="middle" font-family="Cinzel, serif" font-weight="700"
    font-size="${(4.6 * PT).toFixed(3)}" letter-spacing="0.42" fill="#6E5013">CERTIFICATE NUMBER</text>
  <rect x="${(39.2 - 0.42).toFixed(2)}" y="${(4.1 - 0.42).toFixed(2)}" width="0.84" height="0.84"
    transform="rotate(45 39.2 4.1)" fill="none" stroke="#A98A3C" stroke-width="0.08"/>
  <text x="45.6" y="4.62" text-anchor="middle" font-family="Amiri, serif" font-weight="700"
    font-size="${(5.6 * PT).toFixed(3)}" fill="#7A5F1E" opacity="0.92"
    direction="rtl">&#1585;&#1602;&#1605; &#1575;&#1604;&#1588;&#1607;&#1575;&#1583;&#1577;</text>

  <!-- 10. the number, twice: a light copy offset down-right is the wall of
           the incision, the dark copy is the engraved stroke itself. That
           pairing is what reads as letterpress rather than as flat type. -->
  <g font-family="'Cormorant Garamond', Garamond, serif" font-weight="600"
     font-size="${numberEm}" letter-spacing="${tracking}" text-anchor="middle"
     font-kerning="normal"
     style="font-variant-ligatures:none;${CN_FIGURE_STYLE === 'lining' ? "font-feature-settings:'lnum' 1;font-variant-numeric:lining-nums;" : ''}">
    <text x="${(numX + 0.17).toFixed(2)}" y="${(numY + 0.17).toFixed(2)}" fill="#C9B98E" opacity="0.85">${escapeHtml(displayNo)}</text>
    <text x="${numX}" y="${numY}" fill="#241B10">${escapeHtml(displayNo)}</text>
  </g>

  <!-- 11. hairline shelf under the number, stopped short at both ends so it
           reads as an engraved rule and not as an underline -->
  <line x1="${numX - 23}" y1="10.62" x2="${numX + 23}" y2="10.62" stroke="#A98A3C" stroke-width="0.10"/>
  <circle cx="${numX - 24.4}" cy="10.62" r="0.24" fill="none" stroke="#8A6A24" stroke-width="0.08"/>
  <circle cx="${numX + 24.4}" cy="10.62" r="0.24" fill="none" stroke="#8A6A24" stroke-width="0.08"/>

  <!-- 12. microscopic serial repeats — a second covert layer, at a
           different size and rhythm from the ring so a forger who notices
           and reproduces one still misses the other. Split either side of
           the boss along the head of the plate: BELOW the number is not
           available, because y>11 is the artwork's own microtext band and
           overprinting it would destroy a device the paper already has. -->
  <text x="19" y="2.78" text-anchor="middle" font-family="Inter, sans-serif"
    font-size="${(0.75 * PT).toFixed(3)}" letter-spacing="0.01" fill="#C1AE84">${escapeHtml(repeats)}</text>
  <!-- The mirror of the band above, and it must be identical to it. It was
       0.58pt at fill #8A6A24 with opacity 0.52 — two separate breaches of
       this file's own press limits (§5): below the 0.75pt floor for repeats,
       and a screened tint where fine linework must carry SOLID light ink.
       #8A6A24 at 52% over the cream field composites to ≈#C0AD83, which is
       within a shade of the left band's solid #C1AE84 — so the two looked
       the same on screen and separated completely differently. At 0.58pt an
       Inter stem is ~0.017mm against a 0.085mm halftone cell at 300 lpi, so
       the glyphs would have been rebuilt from whichever dot centres fell
       inside them: a dotted grey rail, not letterforms, carrying none of the
       serial it exists to carry. -->
  <text x="${W - 19}" y="2.78" text-anchor="middle" font-family="Inter, sans-serif"
    font-size="${(0.75 * PT).toFixed(3)}" letter-spacing="0.01" fill="#C1AE84">${escapeHtml(repeats)}</text>

  <!-- 13. seated khatam boss; it interrupts the inner rule at the head of
           the cartouche without breaching the top edge, because the
           signature block above ends 1mm away -->
  ${cartoucheBoss(numX, 1.62, 1.5)}

  <!-- 14. UV registration crosshairs (marks for a UV pass, not UV ink) -->
  ${uvMotif(4.2, 2.5)}${uvMotif(W - 4.2, 2.5)}
</svg>`;
}

// ── VERIFICATION MODULE GROUND (lower right) ────────────────────────
// The directive asks the verification station to become the certificate's
// security hub rather than a labelled box. It is therefore built from the
// same primitives as the number cartouche — same screen pitch, same
// microtext size, same volutes, same fibre scatter, same UV motifs — and
// drawn as an INLINE svg rather than a CSS background so its microtext is
// real vector text a loupe can resolve, not a rasterised data URI.
//
// It is a rectangle with canted corners rather than the cartouche's ogee
// ends: the two stations are siblings, not twins. The number panel is the
// ceremonial one and carries the shaped outline; this one is the
// instrument panel and stays square, which is also what lets it hold a
// QR, a barcode and four data rows without wasting width on curves.
function verificationGroundSvg(w, h, serial) {
  const micro = `${serial} · SULTAN HANAFI ROYAL SCHOOLS · VERIFIED RECORD · `.repeat(14);
  const c = 2.1;
  const frame = (inset) => {
    const x0 = inset, y0 = inset, x1 = w - inset, y1 = h - inset, k = c - inset * 0.5;
    return `M ${x0 + k} ${y0} L ${x1 - k} ${y0} L ${x1} ${y0 + k} L ${x1} ${y1 - k}`
      + ` L ${x1 - k} ${y1} L ${x0 + k} ${y1} L ${x0} ${y1 - k} L ${x0} ${y0 + k} Z`;
  };
  return `<svg class="vp-ground" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    ${iridescentWash('vpIris', 200)}
    <linearGradient id="vpDebossT" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6E5013" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#6E5013" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="vpDebossB" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FFFDF6" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFDF6" stop-opacity="0"/>
    </linearGradient>

    ${screenPattern('vpCopy', 8, 0.48, 0.07, '#D8CBAC', 1)}
    <path id="vpRing" d="${frame(1.5)}"/>
    <clipPath id="vpInner"><path d="${frame(0.7)}"/></clipPath>
  </defs>

  <path d="${frame(0)}" fill="#FDF8EC" opacity="0.5"/>
  <g clip-path="url(#vpInner)">
    ${securityFibres(w, h, serial, 24)}
    <rect width="${w}" height="${h}" fill="url(#vpIris)"/>
    <rect width="${w}" height="${h}" fill="url(#vpCopy)"/>
    <g opacity="0.30">${guillocheMedallion(w * 0.30, h * 0.5, 9.5, '#9A7A2C', 0.45)}</g>
    <g opacity="0.24">${guillocheMedallion(w * 0.78, h * 0.5, 7.2, '#8C6516', 0.5)}</g>
    <!-- Scanning bay. The locked artwork carries a dark geometric ornament
         directly under this column — measured, not guessed: hiding this whole
         ground layer makes it MORE prominent, so it is the artwork's, not
         ours. The QR itself is unaffected (its field is opaque white) but
         "Scan to Verify" was gold type over that ornament and barely read.
         A single soft field lifts the column clear without flattening the
         rest of the plate, which is what keeps the panel sitting in the paper
         rather than on it. Not decoration: the scan instruction is the one
         line on this plate a stranger has to be able to read. -->
    <rect x="${(w - 20.4).toFixed(2)}" y="1.15" width="18.6" height="${(h - 2.3).toFixed(2)}"
      rx="0.8" fill="#FBF6E9" opacity="0.82"/>
  </g>

  <g clip-path="url(#vpInner)">
    <rect x="0" y="0" width="${w}" height="2.2" fill="url(#vpDebossT)"/>
    <rect x="0" y="${h - 1.8}" width="${w}" height="1.8" fill="url(#vpDebossB)"/>
  </g>
  <path d="${frame(0)}" fill="none" stroke="#8A6A24" stroke-width="0.26"/>
  <path d="${frame(0.7)}" fill="none" stroke="#A98A3C" stroke-width="0.10"/>
  <text font-family="Inter, sans-serif" font-size="${(0.9 * PT).toFixed(3)}" letter-spacing="0.02"
    fill="#AC996C"><textPath href="#vpRing">${escapeHtml(micro)}</textPath></text>
  <!-- ONE volute, in the only clear ground this plate has: the gap between the
       SHRS roundel and the VERIFICATION heading.
       There were two. The second sat at y = h - 2.4 and drew its curl straight
       through "Void if altered or erased" — an ornament across the clause that
       makes the document voidable. Moving it to the header's right end simply
       moved the collision onto التحقق من الشهادة, which is the answer: unlike
       the number cartouche, this plate has no empty field to put a second
       flourish in. Every square millimetre carries an identifier, a code or a
       clause. So it is removed rather than relocated — the plate is already
       bracketed by the canted engraved frame, the microtext ring, two guilloche
       medallions and the UV motifs, and nothing here may sit on top of text. -->
  ${volute(5.6, 2.4, 1, 1)}
  ${uvMotif(3.2, h / 2)}${uvMotif(w - 1.9, h / 2, 0.95)}
</svg>`;
}

// The award named on the certificate, per programme. This used to be baked
// into the background raster, which meant every sheet — I'dādiyyah and
// Thanawiyyah included — printed the word "IBTIDA'I'YYAH". The title is now
// live type driven by the certificate's own programme code.
// Note the Arabic: ابتدائية carries hamzat waṣl, so the definite form is
// written الابتدائية, bare. The artwork's الإبتدائية was an orthographic
// error and is corrected here.
// Transliteration is written as base letter + U+0304 COMBINING MACRON, and
// the hamza/ʿayn as U+2019/U+2018, because a cmap probe of all fourteen
// self-hosted binaries found U+0100, U+0101, U+02BE and U+02BF in NONE of
// them, while U+0304 is in twelve and U+2018/U+2019 in twelve. Spelled the
// obvious way, two characters of the award name silently fell out of Cinzel
// into whatever serif the print host happened to have.
const STAGE = {
  // Tamh\u012bdiyyah \u2014 the preparatory stage. Confirmed by the Founder on 8 August
  // 2026 and locked in functions/_lib/certificate-serial.js on the same terms
  // as IBT and IDD; the wording here is that wording, not a second rendering
  // of it. \u062a\u0645\u0647\u064a\u062f\u064a\u0629 takes hamzat qa\u1e6d\u02bf on no letter and is written \u0627\u0644\u062a\u0645\u0647\u064a\u062f\u064a\u0629 in
  // the definite form.
  TMH: { term: 'Tamh\u012bdiyyah', gloss: 'Preparatory Stage Completion',
    ar: '\u0627\u0644\u0645\u0631\u062d\u0644\u0629 \u0627\u0644\u062a\u0645\u0647\u064a\u062f\u064a\u0629',
    bodyEn: 'Tamh\u012bdiyyah (Preparatory)', bodyAr: '\u0627\u0644\u0645\u0631\u062d\u0644\u0629 \u0627\u0644\u062a\u0645\u0647\u064a\u062f\u064a\u0629' },
  IBT: { term: 'Ibtida\u0304\u2019iyyah', gloss: 'Primary Stage Completion',
    ar: 'المرحلة الابتدائية',
    bodyEn: 'Ibtida\u0304\u2019iyyah (Primary)', bodyAr: 'المرحلة الابتدائية' },
  IDD: { term: 'I\u2018da\u0304diyyah', gloss: 'Intermediate Stage Completion',
    ar: 'المرحلة الإعدادية',
    bodyEn: 'I\u2018da\u0304diyyah (Intermediate)', bodyAr: 'المرحلة الإعدادية' },
  THN: { term: 'Tha\u0304nawiyyah', gloss: 'Secondary Stage Completion',
    ar: 'المرحلة الثانوية',
    bodyEn: 'Tha\u0304nawiyyah (Secondary)', bodyAr: 'المرحلة الثانوية' },
};

function sheetHtmlOfficial({ cert, qrSvgMarkup, verifyUrl }) {
  const displayHash = String(cert.content_hash || '').slice(0, 12).toUpperCase();
  const verifyCode = displayHash.replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3');
  const year = new Date(String(cert.issued_at).slice(0, 10)).getUTCFullYear();
  if (!Number.isFinite(year)) throw new Error(`Certificate ${cert.serial_no} has an unusable issued_at: ${cert.issued_at}`);
  const docId = `DID-${year}-${escapeHtml(cert.programme_code || 'IBT')}-${String(cert.id || 0).padStart(7, '0')}`;
  const nameEn = escapeHtml(cert.student_full_name);
  const nameAr = escapeHtml(cert.student_full_name_ar || '');
  const serial = escapeHtml(cert.serial_no);
  const studentId = escapeHtml(cert.student_identity_no || '—');
  const session = escapeHtml(String(cert.academic_year || '').replace('/', ' – '));
  const gregEn = formatGregorianEn(cert.issued_at);
  const hijriAr = escapeHtml(cert.issued_at_hijri_ar || '');
  const arCompleted = String(cert.student_sex || '').toLowerCase() === 'female' ? 'أتمت' : 'أتم';
  // Display-only Arabic-Indic digits for the Hijri line (the snapshotted
  // DB value is unchanged; this is typography, not data).
  const hijriArDisplay = hijriAr.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
  const placeEn = escapeHtml(cert.place_en || 'Ikorodu, Lagos, Nigeria');
  const placeAr = escapeHtml(cert.place_ar || 'إكورودو، لاغوس، نيجيريا');

  // Credential plaque field: bilingual micro-label row, then the value.
  const pField = (en, arb, val, small = '') => `<div class="p-field">
    <div class="p-label"><span class="p-l-en">${en}</span><span class="p-l-ar" dir="rtl">${arb}</span></div>
    <div class="p-value${small}">${val}</div>
  </div>`;
  // ── Name typesetting (measured, not guessed) ──────────────────────
  // The name pair is the visual heart, so it is fitted per certificate
  // rather than set at one fixed size: a long name must never overflow
  // its 114mm half or collide with the opposite script. Coefficients
  // are derived from rendered measurement of this exact type at this
  // exact tracking (EN ≈ 0.2497mm per char per pt; AR ≈ 0.1357), and
  // the Arabic is fitted to ~88% of the English extent because Naskh
  // sets denser than tracked Latin capitals — matching *extent* rather
  // than point size is what makes the two read as equals.
  const FIT_MM = 106;
  const fitPt = (text, mmPerCharPt, maxPt, minPt) => {
    const n = Math.max(1, String(text || '').trim().length);
    return Math.max(minPt, Math.min(maxPt, +(FIT_MM / (n * mmPerCharPt)).toFixed(2)));
  };
  const nameEnPt = fitPt(cert.student_full_name, 0.2497, 19.5, 11);
  const nameArPt = fitPt(cert.student_full_name_ar, 0.1357 / 0.72, 21.5, 13);
  const vpGround = verificationGroundSvg(62, 25.3, String(cert.serial_no));
  const microSerial = `${serial} · `.repeat(6);
  // ── The engraved certificate number ───────────────────────────────
  // The face carries the timeless form; the cartouche's covert layers
  // carry the full serial. A serial that will not reduce is a bug, not a
  // formatting edge case — it means the number about to be printed is not
  // one this system issued, so stop the press rather than print a blank.
  const displayNo = displayStageCertificateNo(cert.serial_no);
  if (!displayNo) {
    throw new Error(`stage-certificate-template: serial "${cert.serial_no}" is not in the issuable format, so no certificate number can be engraved`);
  }
  // Fitted the way the name is: measured mm-per-character-per-point for
  // this exact face, so a future four-letter programme code cannot push
  // the number into the cartouche wall. 0.1847 was derived from Cormorant
  // Garamond 600's own advance widths (11 caps at ~0.60em, 6 oldstyle
  // figures at ~0.50em, 3 hyphens at ~0.29em over a 20-character string)
  // and is re-measured in the browser by scripts/verify-certificate-layout.
  // The cartouche viewBox is in MILLIMETRES, so the fit solves for an em
  // size in mm, not a point size — passing points straight through set the
  // number 126.6mm wide inside a 62mm panel on the first run.
  //
  // The advance is summed from the string's OWN composition rather than a
  // flat per-character mean, because the printed number is not homogeneous:
  // it mixes capitals, oldstyle figures and hyphens in a ratio that changes
  // with the format. A mean calibrated on the 20-character form silently
  // mis-sized the 26-character one. Per-class values are Cormorant Garamond
  // 600's own advances, scaled by 0.961 — the measured ratio of rendered
  // extent to predicted on this exact face at this exact tracking.
  const CN_ADVANCE = (s) => [...s].reduce((a, c) =>
    a + (c === '-' ? 0.279 : /\d/.test(c) ? 0.481 : 0.577), 0);
  const CN_WIDTH_MM = 53;
  const CN_TRACK = 0.20;
  const cnLen = displayNo.length;
  const cnEm = Math.max(2.6, Math.min(4.45,
    +(((CN_WIDTH_MM - (cnLen - 1) * CN_TRACK) / CN_ADVANCE(displayNo)).toFixed(3))));
  const cnCartouche = certificateNumberCartoucheSvg({
    displayNo, fullSerial: String(cert.serial_no),
    numberEm: cnEm, tracking: `${CN_TRACK}`,
  });
  // Archival reference: registry path + a real Code 128 barcode of the
  // numeric archive number (year + record id).
  // The eye read ARCH/IBT/2026/0000001 (id padded to 7) while the scanner
  // read 202600000001 (padded to 8) — one record, two identifiers. Both now
  // derive from the same 6-digit run, giving an even-length numeric payload.
  // A missing registry entry must stop the press, not guess. PROGRAMMES is
  // advertised as a one-line addition, so a fourth code would otherwise mint
  // a correct serial and print the wrong award over it.
  const progCode = String(cert.programme_code || '').toUpperCase();
  const stage = STAGE[progCode];
  if (!stage) throw new Error(`stage-certificate-template: no title wording for programme code "${progCode}"`);
  const archSeq = String(cert.id || 0).padStart(6, '0');
  const archiveRef = `ARCH/${escapeHtml(progCode)}/${year}/${archSeq}`;
  const archiveDigits = `${year}${archSeq}`;
  const archiveBarcode = code128cSvg(archiveDigits);
  const titleFrame = titleFrameSvg(202, 13.8);

  return `<div class="sheet sheet--official" data-stage="${escapeHtml(progCode)}">
  ${(() => {
    const plate = plateFor(progCode);
    // The stage plate is a marks layer with a transparent ground, so the paper
    // it was solved against has to be laid under it — without that rect the
    // sheet prints on white and every mark sits at the wrong density.
    return plate
      ? `<div class="official-paper" style="background:${plate.paper}"></div>
  ${stagePaperTextureSvg(plate.paper, cert.serial_no, archSeq)}
  <img class="official-bg" src="${plate.src}" alt="" />
  ${stagePlateMicrotextSvg(cert.serial_no, archSeq)}`
      : `<img class="official-bg" src="${OFFICIAL_BACKGROUND}" alt="" />`;
  })()}

  <div class="o5-basmala">&#xFDFD;</div>

  ${progCode === 'TMH' ? tmhRegalia() : ''}

  ${plateFor(progCode) ? `<!-- Institutional header, three emblems (Founder directive, mandatory).
       Nigeria left, SHRS crest centred on the page, Lagos right. The three
       share one baseline at y 41.6mm and sit at x 66.5 / 148.5 / 230.5 — equal
       82mm optical spacing, symmetric about the sheet centre. Each text block
       is centred on its own emblem.
       LAGOS EMBLEM: the Coat of Arms supplied by the Founder, 2026-08-06. It
       is 223x239px after its white background box was keyed out, which over a
       15mm emblem is 405 DPI — above the 300 DPI press floor, but below the
       Nigerian arms' 743. It is placed at its own size and aspect anyway,
       because matching the Nigerian emblem's presence was the instruction and
       upscaling a STATE EMBLEM to match its sharpness is the invented detail
       the directive forbids. A larger original is the only real fix, and needs
       no code change: scripts/build-lagos-arms.py re-runs over it. -->
  <div class="ihdr">
    <div class="ihdr-col ihdr-ng">
      <div class="ihdr-badge"><img src="/assets/images/crests/nigeria-coat-of-arms.png"
        alt="Federal Republic of Nigeria" /></div>
      <div class="h-ar">جمهورية نيجيريا الاتحادية</div>
      <div class="h-en">Federal Republic of Nigeria</div>
      <div class="h-ar h-ar-2">مدارس السلطان حنفي الملكية</div>
      <div class="h-en h-en-2">Sultan Hanafi Royal Schools</div>
      <div class="h-ar h-ar-3">قسم الدراسات الإسلامية والعربية</div>
      <div class="h-en h-en-3">School of Islamic &amp; Arabic Studies</div>
    </div>
    <div class="ihdr-col ihdr-shrs">
      <div class="ihdr-badge ihdr-badge--lead"><img
        src="/assets/images/crests/shrs-institutional-crest.png"
        alt="Sultan Hanafi Royal Schools" /></div>
    </div>
    <div class="ihdr-col ihdr-lg">
      <div class="ihdr-badge"><img src="/assets/images/crests/lagos-state-arms.png"
        alt="Lagos State" /></div>
      <div class="h-ar">حكومة ولاية لاغوس</div>
      <div class="h-ar h-ar-3">وزارة التعليم الأساسي والثانوي</div>
      <div class="h-en h-en-3">Ministry of Basic and Secondary Education</div>
    </div>
  </div>` : `<div class="hdr hdr-l">
    <div class="h-ar">جمهورية نيجيريا الاتحادية</div>
    <div class="h-en">Federal Republic of Nigeria</div>
    <div class="h-ar h-ar-2">مدارس السلطان حنفي الملكية</div>
    <div class="h-en h-en-2">Sultan Hanafi Royal Schools</div>
    <div class="h-ar h-ar-3">قسم الدراسات الإسلامية والعربية</div>
    <div class="h-en h-en-3">School of Islamic &amp; Arabic Studies</div>
  </div>`}
  ${plateFor(progCode) ? '' : `<div class="hdr hdr-r">
    <div class="h-ar">حكومة ولاية لاغوس</div>
    <div class="h-en">Lagos State Government</div>
    <div class="h-ar h-ar-2">وزارة التعليم الأساسي والثانوي</div>
    <div class="h-en h-en-3">Ministry of Basic and Secondary Education</div>
  </div>`}

  <div class="o9-title">
    ${titleFrame}
    <div class="o9-half o9-en">
      <div class="o9-l1">Certificate of ${stage.term}</div>
      <div class="o9-l2">${stage.gloss}</div>
    </div>
    <div class="o9-half o9-ar">
      <div class="o9-l1">شهادة إتمام ${stage.ar}</div>
    </div>
  </div>

  <div class="o5-intro-en">This is to certify that</div>
  <div class="o5-intro-ar">تشهد إدارة مدارس السلطان حنفي الملكية بأن</div>

  <div class="o5-name-en" style="font-size:${nameEnPt}pt">${nameEn}</div>
  <div class="o5-name-ar" style="font-size:${nameArPt}pt">${nameAr}</div>
  <div class="o5-name-rule"><b></b><span></span><i></i><span></span><b></b></div>

  <img class="o5-seal" src="/assets/images/certificates/official-seal.png" alt="" />

  <!-- Set to THREE lines for every stage, deliberately. There are 16.8mm
       between this paragraph's top (121.4mm) and the particulars band
       (138.2mm) — enough for three 10pt/1.5 lines with 1.4mm to spare, and
       not four.
       The longer wording this replaced ("...the requirements of the...") set
       in three lines for Ibtidā'iyyah but FOUR for I'dādiyyah, whose stage
       name is two characters longer, and the fourth line ran straight
       through the band's gold rule on all six sheets. Ibtidā'iyyah had only
       escaped because ITS fourth line was the single short word "School.",
       which happened to end left of the band's left edge at 62.5mm — the
       layout was passing by luck, not by design.
       Measured, not guessed: at this measure Ibtidā'iyyah, I'dādiyyah and
       Thānawiyyah all now set in three lines, ink bottom 136.8mm. Re-measure
       before lengthening this sentence or adding a fourth stage. -->
  <div class="o5-para-en">has successfully completed the
    ${stage.bodyEn} stage in the ${session} academic session,
    in accordance with the approved curriculum and academic standards
    of the School.</div>
  <div class="o5-para-ar">قد ${arCompleted} بنجاحٍ متطلبات ${stage.bodyAr}
    في العام الدراسي <span class="ar-range">${session}</span>، وفقًا للمناهج
    المعتمدة والمعايير الأكاديمية المعمول بها في المدرسة.</div>

  <div class="o8-band">
    <div class="band-in">
      <div class="bg"><div class="bg-l"><span class="p-l-en">Student ID</span><span class="p-l-ar" dir="rtl">الرقم التعريفي للطالب</span></div>
        <div class="bg-v bg-v-id">${studentId}</div></div>
      <i class="band-di"></i>
      <div class="bg"><div class="bg-l"><span class="p-l-en">Date of Issue</span><span class="p-l-ar" dir="rtl">تاريخ الإصدار</span></div>
        <div class="bg-v bg-v-sm">${gregEn} <span class="p-dot">·</span> <span dir="rtl">${hijriArDisplay}</span></div></div>
      <i class="band-di"></i>
      <div class="bg"><div class="bg-l"><span class="p-l-en">Place of Issue</span><span class="p-l-ar" dir="rtl">مكان الإصدار</span></div>
        <div class="bg-v bg-v-sm">${placeEn} <span class="p-dot">·</span> <span dir="rtl">${placeAr}</span></div></div>
    </div>
    <div class="band-micro">SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL ACADEMIC RECORD · GUILLOCHE · MICROTEXT · QR VERIFICATION · CRYPTOGRAPHIC SERIAL</div>
  </div>

  <img class="o5-holo" src="/assets/images/certificates/security-emblem-shrs.png" alt="" />

  <div class="o5-cnplate">${cnCartouche}</div>

  <div class="o5-vplate">
    ${vpGround}
    <div class="vp-text">
      <div class="vp-head"><span class="vp-mark">SHRS</span><span class="p-l-en">Verification</span><span class="p-l-ar" dir="rtl">التحقق من الشهادة</span></div>
      <div class="vp-row vp-id">${docId} <span class="p-dot">·</span> ${verifyCode}</div>
      <div class="vp-row vp-url">shroyalschools.com/verify-certificate</div>
      <div class="vp-row vp-id">Archive ${archiveRef}</div>
      <div class="vp-micro">${escapeHtml(microSerial)}</div>
      <div class="vp-barcode">${archiveBarcode}</div>
      <div class="vp-void">Void if altered or erased <span class="p-dot">·</span> <span dir="rtl">لاغيةٌ عند أي كشطٍ أو تعديل</span></div>
    </div>
    <div class="vp-qrcol">
      <div class="vp-qr">${qrSvgMarkup}</div>
      <div class="vp-scan">Scan to Verify</div>
    </div>
  </div>

  <div class="o5-sig o5-sig-1">
    <img class="o5-sig-ink" src="/assets/images/certificates/signature-principal.png" alt="" />
    <div class="o5-sig-line"></div>
    <div class="o5-sig-name" dir="rtl">الشيخ أبو بكر صلاح</div>
    <div class="o5-sig-en">Principal &amp; Head of School</div>
    <div class="o5-sig-ar">رئيس المدرسة</div>
  </div>
  <div class="o5-sig o5-sig-2">
    <img class="o5-sig-ink" src="/assets/images/certificates/signature-chairman.png" alt="" />
    <div class="o5-sig-line"></div>
    <div class="o5-sig-name" dir="rtl">د. زكريا أولانريوجو حنفي</div>
    <div class="o5-sig-en">Chairman, Board of Governors</div>
    <div class="o5-sig-ar">رئيس مجلس الإدارة</div>
  </div>
</div>`;
}

function sheetHtmlConstructed({ cert, qrSvgMarkup, verifyUrl }) {
  const ar = arForms(cert.student_sex);
  // Same programme lookup as the official sheet. This fallback had the stage
  // hardcoded to Ibtidāʾiyyah and spelled الإبتدائية with a hamza it does not
  // take, so if the artwork path ever failed it would have printed both the
  // wrong award and a misspelling.
  const stage = STAGE[String(cert.programme_code || 'IBT').toUpperCase()] || STAGE.IBT;
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
        <div class="t-en-1">Certificate of ${stage.term}</div>
        <div class="t-en-2">${stage.gloss}</div>
      </div>
      <div class="title-divider">
        <div class="td-diamond"></div><div class="td-line"></div><div class="td-diamond"></div>
      </div>
      <div class="title-ar">
        <div class="t-ar-1">شهادة إتمام ${stage.ar}</div>
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
        <strong>${stage.bodyEn} Stage</strong> in the Islamic and Arabic
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
        <div class="sig-ar">المسجّل</div>
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
<style>
/* Self-hosted fonts (assets/fonts/): the certificate's typography must
   not depend on a third-party CDN — a blocked fonts request silently
   degrades every Arabic glyph to a system fallback, which is exactly
   the failure the release-gate review caught. Same files serve the
   browser preview, the BROWSER-binding PDF, and local print review. */
@font-face{font-family:'Amiri';font-style:normal;font-weight:400;font-display:block;src:url('/assets/fonts/amiri-arabic-400-normal.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC;}
@font-face{font-family:'Amiri';font-style:normal;font-weight:700;font-display:block;src:url('/assets/fonts/amiri-arabic-700-normal.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC;}
@font-face{font-family:'Amiri';font-style:normal;font-weight:400;font-display:block;src:url('/assets/fonts/amiri-latin-400-normal.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Amiri';font-style:normal;font-weight:700;font-display:block;src:url('/assets/fonts/amiri-latin-700-normal.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Cinzel';font-style:normal;font-weight:400;font-display:block;src:url('/assets/fonts/cinzel-latin-400-normal.woff2') format('woff2');}
@font-face{font-family:'Cinzel';font-style:normal;font-weight:700;font-display:block;src:url('/assets/fonts/cinzel-latin-700-normal.woff2') format('woff2');}
@font-face{font-family:'Cinzel';font-style:normal;font-weight:800;font-display:block;src:url('/assets/fonts/cinzel-latin-800-normal.woff2') format('woff2');}
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;font-display:block;src:url('/assets/fonts/cormorant-garamond-latin-500-normal.woff2') format('woff2');}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:500;font-display:block;src:url('/assets/fonts/cormorant-garamond-latin-500-italic.woff2') format('woff2');}
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:600;font-display:block;src:url('/assets/fonts/cormorant-garamond-latin-600-normal.woff2') format('woff2');}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:600;font-display:block;src:url('/assets/fonts/cormorant-garamond-latin-600-italic.woff2') format('woff2');}
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:700;font-display:block;src:url('/assets/fonts/cormorant-garamond-latin-700-normal.woff2') format('woff2');}
@font-face{font-family:'Inter';font-style:normal;font-weight:400;font-display:block;src:url('/assets/fonts/inter-latin-400-normal.woff2') format('woff2');}
@font-face{font-family:'Inter';font-style:normal;font-weight:600;font-display:block;src:url('/assets/fonts/inter-latin-600-normal.woff2') format('woff2');}
</style>
<style>
  :root{
    --espresso:#221A10; --coffee:#3A2A18; --umber:#4B3420;
    --gold-deep:#6E5013; --gold:#8C6516; --gold-mid:#B8860B;
    --gold-bright:#D4AF37; --gold-pale:#F1E3B2;
    --ivory:#FBF4E4; --cream:#F6EDD8; --paper:#FDF6E3;
    --crimson:#7A1F2B; --navy:#1F2A44;
    --en-display:'Cinzel',serif;
    --en-text:'Cormorant Garamond',serif;
    --ar-display:'Amiri',serif; /* self-hosted; major AR titles are printed in the locked artwork */
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
    position:relative;width:297mm;height:210mm;margin:0 auto;overflow:hidden;
    background:radial-gradient(ellipse 130% 100% at 50% 38%, #FDF7E6 0%, #F9F0DA 55%, #F1E5C8 100%);
    page-break-after:always;
  }
  @media screen{ .sheet{margin:24px auto;box-shadow:0 30px 80px rgba(24,17,8,.5);} }

  .frame{position:absolute;inset:0;width:100%;height:100%;}
  .official-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;}
  /* Vector paper under a stage plate's marks layer. Flat colour, so it has no
     resolution — the sheet's largest area is the one thing about the supplied
     92 DPI artwork that CAN be made resolution-free. */
  .official-paper{position:absolute;inset:0;}
  .o5-plate-micro{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
  .o5-plate-paper{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}

  /* ═══ OFFICIAL-PAPER EDITORIAL COMPOSITION v3 ═══
     The locked artwork carries the identity; this layer is EDITORIAL
     only (Final Execution Directive): recomposed hierarchy —
     institution (printed) → certificate (printed) → STUDENT (foil
     pair, one centrepiece) → single bilingual data grid (no duplicated
     facts) → execution → administrative verification. Arabic flows
     right-aligned with full ligatures; nothing compressed, clipped, or
     stated twice. Positions in mm on the 297×210 sheet. */
  .sheet--official{background:#FFFFFF;}

  /* ============ o5 FLAGSHIP MASTER (official artwork) ============ */
  /* Gold-foil name treatment: engraved gradient fill, hairline bronze
     edge, top-light bevel and under-shade for emboss depth. */
  .o5-name-en,.o5-name-ar{
    /* Hot-foil stamping, letterpress register: deep champagne gold
       (never bright yellow), fine engraved edge, and the soft shade a
       blind emboss casts — no glow, no plastic reflection. */
    /* Real hot-foil is mostly medium-dark metal with ONE narrow
       specular streak — not a pale body inside a dark outline. The
       stops keep ~70% of every letter in the deep 0x6B–0x8E range so
       the name carries genuine ink weight against cream paper, with
       the bright band confined to 46–54%. A heavy edge stroke was
       tried and rejected: it read as outlined text, not stamped foil. */
    /* Final direction: "the name should stand out because of its
       craftsmanship and placement, not simply because it is brighter."
       So the whole ramp is pulled ~15% darker and the specular band
       narrowed from #DCC68C to #C4A758 — the name gains ink weight against
       the cream while losing glare. Struck foil on cotton is a dark metal
       with one bright edge, not a yellow letter. */
    background:linear-gradient(102deg,#3A2906 0%,#4E3A0D 12%,#654D15 26%,#82661F 39%,
      #A98A34 46%,#C4A758 50%,#A98A34 54%,#82661F 61%,#654D15 74%,#4E3A0D 88%,#3A2906 100%);
    -webkit-background-clip:text;background-clip:text;color:transparent;
    -webkit-text-stroke:.26px rgba(42,29,4,.6);
    text-shadow:0 .26mm .28mm rgba(48,32,6,.34), 0 -0.09mm 0 rgba(255,252,242,.42);
  }
  /* ── Institutional header, re-set as live type ────────────────────
     These eight lines were originally baked into the background raster
     at ~92 DPI, which is why no typographic instruction could sharpen
     them. They are now cleared from the artwork (crests, logo, border
     and all security printing untouched) and set as vector type at the
     measured original positions, so they render crisp at any output
     resolution. National lines carry more authority than institutional
     ones, per the standing creative direction. */
  .hdr{position:absolute;text-align:center;}
    /* Blocks are centred on each crest's measured optical axis, not on a
     bounding box. The Lagos shield's ink sits at 214.4mm (every row from
     y66 to y130 agrees within 0.4mm once the wax rosette at x863-963 is
     excluded from the measurement); the block had been at 219.0mm, 4.6mm
     to its right. The Nigerian arms sit at 77.3mm against a block at
     77.8mm. */
  .hdr-l{left:54.2mm;width:46.2mm;top:35.3mm;}
  .hdr-r{left:189.9mm;width:49mm;top:35.9mm;}
  .h-ar{font-family:var(--ar-text);font-weight:700;direction:rtl;color:#2F2A3E;
    font-size:8.6pt;line-height:1.28;white-space:nowrap;}
  .h-en{font-family:var(--en-display);font-weight:700;text-transform:uppercase;
    color:#2A3145;font-size:5.5pt;letter-spacing:.62px;line-height:1.3;
    white-space:nowrap;margin-top:.25mm;}
  .h-ar-2{margin-top:1.5mm;font-size:9.4pt;}
  .h-en-2{font-size:5.9pt;letter-spacing:.72px;}
  .h-ar-3{margin-top:1.5mm;font-size:8.2pt;color:#3A3247;}
  .h-en-3{font-size:5.1pt;letter-spacing:.42px;color:#39405A;}
  .hdr-r .h-ar{font-size:9pt;}
  .hdr-r .h-ar-2{font-size:8.8pt;margin-top:1.85mm;}
  .hdr-r .h-en-3{margin-top:1.05mm;font-size:4.6pt;letter-spacing:.28px;}

  /* ── Institutional header, three emblems ──────────────────────────────
     Emblem BOTTOMS share one baseline at 42.5mm — flex-end, not a fixed
     top, because the crest is deliberately taller than the two state arms
     and aligning tops would leave it floating. Columns are 56mm wide,
     centred on 66.5 / 148.5 / 230.5: exactly 82mm apart and symmetric
     about the sheet centre, so the crest is centred on the page and the
     other two are mirror-placed about it. */
  .ihdr{position:absolute;top:24.6mm;left:0;width:297mm;height:29mm;
    display:flex;justify-content:center;align-items:flex-start;}
  .ihdr-col{width:56mm;text-align:center;}
  .ihdr-ng{margin-right:26mm;}
  .ihdr-lg{margin-left:26mm;}
  /* One badge box height for all three, images aligned to its FOOT. Giving the
     centre badge a taller box instead put the emblem bottoms 2.01mm apart —
     aligning inside boxes of different heights does not align across them. The
     crest is still the larger emblem; it now grows upward from the shared
     baseline rather than pushing its own floor down.

     The emblems were briefly cut to 12.8/14.6mm, when the four institutional
     lines sat in the CENTRE column and were being squeezed between the plate's
     top ornament above and the basmala below. They now sit under the Nigerian
     arms, and the left column's x-range (38.5-94.5mm) does not meet the
     basmala's ink (119-184mm) at all — so that floor no longer applies and the
     emblems are back at full size.

     They are placed at their own aspect and never stretched: the source files
     are 492x439 and 520x476, so at 15mm and 17mm they land at 743 and 711 DPI.
     No upscaling, no sharpening. */
  .ihdr-badge{height:17mm;display:flex;align-items:flex-end;justify-content:center;
    margin-bottom:1.3mm;}
  .ihdr-badge img{max-height:15mm;max-width:24mm;width:auto;object-fit:contain;}
  .ihdr-badge--lead img{max-height:17mm;max-width:27mm;}
  /* LEADING, set by measurement. The Nigerian column carries six lines to the
     Lagos column's three, which reads as weight on the left of the page. The
     brief was to close that by tightening this block rather than padding the
     Lagos side with text nobody approved.

     Reducing line-height turned out to be the WRONG lever, and measuring said
     so: shrinking an Arabic line's box does not move its descenders, it only
     lets the English line beneath rise into them. Every candidate that cut the
     leading drove the Arabic-to-English ink gap NEGATIVE — actual overlap.
     Worse, the setting first shipped was already at 0.18mm there, which fills
     in on press.

     So the block is tightened where it has room (the Arabic-to-Arabic joins)
     and OPENED where it did not (the two Arabic-descender-to-English-capital
     pairs), and the departmental pair drops a little in size — weight, not just
     height, is what reads as left-heavy. Net: minimum ink separation 0.18mm ->
     0.71mm and depth 19.01mm -> 18.74mm. Safer and shorter, not one or other.

     Per-line ink extents are measured, never inferred from the box: an Arabic
     line's dots sit clear of its body, so scanning the column for ink bands
     counts 7 bands for 6 lines. Each line is rendered alone instead. */
  .ihdr .h-ar{font-size:7.6pt;line-height:1.35;}
  .ihdr .h-en{font-size:5.2pt;letter-spacing:.5px;margin-top:0;}
  .ihdr .h-ar-2{margin-top:0;font-size:8.4pt;}
  .ihdr .h-en-2{font-size:5.6pt;letter-spacing:.62px;margin-top:1.05mm;}
  .ihdr .h-ar-3{margin-top:.2mm;font-size:6.2pt;}
  .ihdr .h-en-3{margin-top:.88mm;font-size:4.4pt;letter-spacing:.3px;}

  /* Basmala: Amiri's classical single-glyph calligraphic form (U+FDFD),
     charcoal, no effects — a dignified spiritual header in the quiet
     band beneath the official logo. */
  .o5-basmala{position:absolute;top:54.2mm;left:5mm;right:0;text-align:center;
    font-family:var(--ar-text);font-weight:400;font-size:16pt;color:#262014;line-height:1;}
  /* ── Title cartouche, re-set as live type ─────────────────────────
     Both titles, the two rules and the corner scrolls were baked into the
     artwork at ~92 DPI, and the English half was hardcoded to Ibtidāʾiyyah
     — every I'dādiyyah and Thanawiyyah sheet would have printed a false
     award. The zone is now cleared from the raster and rebuilt as vector.

     The crowding the Founder identified had a specific cause: the cartouche
     was drawn for two lines and three were being set inside it, because
     "This is to certify that" sat below the bottom rule's y-position but
     above the rule itself. The intro now clears the frame entirely.

     Both scripts carry the same structure — document type on the dominant
     line, stage on the subordinate — so the two halves balance as equals
     rather than one half carrying an extra line the other lacks. */
  .o9-title{position:absolute;left:47.5mm;top:79.6mm;width:202mm;height:13.8mm;}
  .o9-frame{position:absolute;inset:0;display:block;}
  .o9-half{position:absolute;top:0;height:100%;width:94mm;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.15mm;}
  .o9-en{left:0;}
  .o9-ar{right:0;direction:rtl;gap:.9mm;}
  /* 12.6pt on 2.0px sets the English line at 84.4mm inside a 94mm half.
     At the 13.4pt/2.9px first tried it measured 95.0mm and broke out past
     the left rule — the frame is the constraint, not the type. */
  .o9-l1{font-family:var(--en-display);font-weight:700;font-size:12.6pt;
    letter-spacing:2px;text-transform:uppercase;color:#241B10;line-height:1;
    white-space:nowrap;
    /* Engraved, not embossed: a hairline of paper-white above the stroke
       and a soft umber shade below is what an intaglio bite looks like. */
    text-shadow:0 -0.055mm 0 rgba(255,252,243,.62), 0 .085mm .1mm rgba(58,40,12,.24);}
  .o9-l2{font-family:var(--en-display);font-weight:400;font-size:7.1pt;
    letter-spacing:2.1px;text-transform:uppercase;color:#6E5013;line-height:1;
    white-space:nowrap;}
  /* Naskh carries its diacritics and descenders well outside the line box,
     so at line-height 1 the two Arabic lines overlapped by 2.3mm and the
     upper one broke above the top rule. The measured ink box is what has
     to be centred, not the line box — hence explicit leading here and the
     optical nudge below rather than relying on flex centring. */
  .o9-ar .o9-l1{font-family:var(--ar-text);font-size:16.2pt;letter-spacing:0;
    line-height:1;color:#241B10;}
  .o9-ar .o9-l2{font-family:var(--ar-text);font-weight:700;font-size:9pt;
    letter-spacing:0;line-height:1;color:#6E5013;}

  .o5-intro-en{position:absolute;top:96.4mm;left:38mm;width:106mm;text-align:center;
    font-family:var(--en-text);font-style:italic;font-weight:500;font-size:10pt;
    letter-spacing:.5px;color:#4B3420;}
  .o5-intro-ar{position:absolute;top:94.2mm;right:38mm;width:106mm;text-align:center;direction:rtl;
    font-family:var(--ar-text);font-size:10pt;color:#4B3420;}
  /* Generous air above and below the name pair — the visual heart of
     the certificate must never be crowded by intro or body text. */
  /* The student name is the visual centre (Founder directive, 2026-08-06).
     Tracking 2.4 -> 3.1px: at display size the tighter setting read as a
     word, not as a name cut into the sheet. Both blocks moved down 0.7mm,
     which is optical centring rather than taste — the gap above measured
     3.5mm against 5.2mm below, so the name sat visibly high in its own
     field. It is now 4.2 / 4.5, and the 0.8mm offset between the Latin and
     Arabic blocks is preserved because their baselines differ. */
  .o5-name-en{position:absolute;top:105.1mm;left:34mm;width:114mm;text-align:center;
    font-family:var(--en-display);font-weight:700;letter-spacing:3.1px;
    white-space:nowrap;line-height:1.15;}
  .o5-name-ar{position:absolute;top:104.3mm;right:34mm;width:114mm;text-align:center;direction:rtl;
    font-family:var(--ar-text);font-weight:700;white-space:nowrap;line-height:1.08;}
  .o5-name-rule{position:absolute;top:117.4mm;left:70mm;right:70mm;display:flex;align-items:center;gap:2.2mm;}
  .o5-name-rule span{flex:1;height:.3mm;background:linear-gradient(90deg,transparent,#B08A2E 22%,#B08A2E 78%,transparent);}
  .o5-name-rule i{width:2mm;height:2mm;background:linear-gradient(135deg,#D8B25A,#8A6A24);transform:rotate(45deg);}
  .o5-name-rule b{width:1.15mm;height:1.15mm;border:.14mm solid #A98A3C;transform:rotate(45deg);
    background:none;flex:0 0 auto;}
  /* ============ TAMHĪDIYYAH REGALIA (TMH only) ============ */
  /* Every rule in this block is prefixed with the stage selector, so it cannot
     reach the Ibtidā'iyyah or I'dādiyyah sheets even by accident. Positions are
     in the same mm grid as everything above and were checked against a rendered
     proof, not estimated: the name band's ink runs y 103.6–119.2 and x 60–237,
     and nothing here enters that box. */

  /* 1 · Guilloché halo behind the name pair. z-index 0 puts it under the type
        (which is in the default stacking order above it) and over the plate. */
  .sheet[data-stage="TMH"] .tmh-halo{
    position:absolute;left:28mm;top:99.6mm;width:241mm;height:26mm;z-index:0;
    pointer-events:none;}

  /* 2 · Corner brackets. Two hairlines rather than a box: an engraved corner is
        cut, not drawn, and a closed rectangle around a name reads as a form
        field. The outer arm is the heavier of the two, as a burin leaves it. */
  .sheet[data-stage="TMH"] .tmh-br{position:absolute;width:9mm;height:9mm;z-index:0;}
  .sheet[data-stage="TMH"] .tmh-br i,
  .sheet[data-stage="TMH"] .tmh-br b{position:absolute;display:block;
    background:linear-gradient(90deg,#B08A2E,rgba(176,138,46,0));}
  .sheet[data-stage="TMH"] .tmh-br i{width:11mm;height:.32mm;top:0;left:0;}
  .sheet[data-stage="TMH"] .tmh-br b{width:.32mm;height:9mm;top:0;left:0;
    background:linear-gradient(180deg,#B08A2E,rgba(176,138,46,0));}
  /* The inner cut, set in 0.9mm and run shorter — the proportion a burin
     leaves when a corner is doubled. */
  .sheet[data-stage="TMH"] .tmh-br i.in{width:6.4mm;height:.2mm;top:.9mm;left:.9mm;}
  .sheet[data-stage="TMH"] .tmh-br b.in{width:.2mm;height:5.2mm;top:.9mm;left:.9mm;
    background:linear-gradient(180deg,#B08A2E,rgba(176,138,46,0));}
  /* The pip where the two cuts meet. */
  .sheet[data-stage="TMH"] .tmh-br em{position:absolute;top:-.55mm;left:-.55mm;
    width:1.35mm;height:1.35mm;transform:rotate(45deg);
    background:linear-gradient(135deg,#E6CE8E,#B08A2E 55%,#8A6A24);}
  .sheet[data-stage="TMH"] .tmh-br-tl{left:30mm;top:100.4mm;}
  .sheet[data-stage="TMH"] .tmh-br-tr{right:30mm;top:100.4mm;transform:scaleX(-1);}
  .sheet[data-stage="TMH"] .tmh-br-bl{left:30mm;top:115.6mm;transform:scaleY(-1);}
  .sheet[data-stage="TMH"] .tmh-br-br{right:30mm;top:115.6mm;transform:scale(-1,-1);}

  /* 3 · Palmettes flanking the title. They sit OUTSIDE the title frame's own
        202mm box (which starts at x 47.5), in the 17mm of clear ground the
        sheet leaves at each side of it. */
  .sheet[data-stage="TMH"] .tmh-palm{position:absolute;top:84.4mm;
    width:26mm;height:8mm;z-index:0;opacity:.92;}
  .sheet[data-stage="TMH"] .tmh-palm:not(.flip){left:19.5mm;}
  .sheet[data-stage="TMH"] .tmh-palm.flip{right:19.5mm;transform:scaleX(-1);}

  /* 4 · The stage identifier: a sixteen-ray star struck on the name rule, where
        Ibtidā'iyyah carries a lozenge and I'dādiyyah an eight-point khatam. One
        ornament tells the stages apart; the family still reads as one family. */
  .sheet[data-stage="TMH"] .o5-name-rule i{
    width:3.5mm;height:3.5mm;transform:none;
    background:radial-gradient(circle at 38% 34%,#F0DCA4 0%,#C9A74A 30%,#B08A2E 58%,#8A6A24 100%);
    clip-path:polygon(50% 0%,55.6% 21.5%,69.1% 3.8%,66.4% 26.1%,84.6% 14.6%,
      74.5% 34.6%,95.1% 30.9%,78.5% 44.6%,100% 50%,78.5% 55.4%,95.1% 69.1%,
      74.5% 65.4%,84.6% 85.4%,66.4% 73.9%,69.1% 96.2%,55.6% 78.5%,50% 100%,
      44.4% 78.5%,30.9% 96.2%,33.6% 73.9%,15.4% 85.4%,25.5% 65.4%,4.9% 69.1%,
      21.5% 55.4%,0% 50%,21.5% 44.6%,4.9% 30.9%,25.5% 34.6%,15.4% 14.6%,
      33.6% 26.1%,30.9% 3.8%,44.4% 21.5%);}

  /* STAGE IDENTIFIER (Founder suggestion, 2026-08-06): keep one border
     architecture across the stages and distinguish them by ONE ornament, so
     the institution reads as a single family and the stage is still legible
     at a glance. Ibtida'iyyah keeps the lozenge; I'dadiyyah takes an eight-
     point khatam — the plate's own motif language, not a new vocabulary.
     One element, no layout change, nothing else differs. */
  .sheet[data-stage="IDD"] .o5-name-rule i{
    width:2.5mm;height:2.5mm;transform:none;
    background:linear-gradient(150deg,#E4C377,#B08A2E 46%,#8A6A24);
    clip-path:polygon(50% 0%,58.04% 30.6%,85.36% 14.64%,69.4% 41.96%,100% 50%,
      69.4% 58.04%,85.36% 85.36%,58.04% 69.4%,50% 100%,41.96% 69.4%,
      14.64% 85.36%,30.6% 58.04%,0% 50%,30.6% 41.96%,14.64% 14.64%,41.96% 30.6%);}
  .o5-para-en{position:absolute;top:121.4mm;left:42mm;width:98mm;
    font-family:var(--en-text);font-weight:500;font-size:10pt;line-height:1.5;color:#332514;text-align:left;}
  .o5-para-ar{position:absolute;top:121mm;right:42mm;width:98mm;direction:rtl;
    font-family:var(--ar-text);font-size:10pt;line-height:1.55;color:#332514;text-align:right;}
  /* Official embossed brass seal (client-supplied artwork, used as provided).
     It is the ONLY seal on the sheet: the I'dadiyyah plate carried its own
     blank gold rosette and ribbon mount, and the two never registered — the
     overlay sat 7.91mm lower and was 8.70mm wider, so 4.59mm of the printed
     disc crowned above it and the printed ribbons emerged below. That reads as
     one seal printed twice out of register. The mount is cleared from the plate
     by scripts/remove-plate-seal-mount.py and the marks layer re-solved.

     SIZE AND POSITION ARE THE COMPOSITION, not a preference. The seal shares a
     band with the certificate-number plaque (y 172.2-197.5) and the
     verification plaque (y 171.8-197.1), and the clear corridor between the
     signature blocks' feet (y 170.8) and the plate's bottom ornament band
     (y 199.0) is 28.2mm. At 26mm it sits centred in that corridor with 1.3mm
     of air above and below, level with both plaques — three devices on one
     line. The earlier 34mm could not fit the corridor at any height: it either
     rose into the signatures or bit into the border band.

     x stays on 148.50mm, the page's own axis, which is also where the SHRS
     crest sits in the header. Its gaps to the two plaques are unequal (14.5mm
     left, 7.5mm right) because THE PLAQUES are not symmetric about the page
     centre; moving the seal to split that gap would take the sheet's principal
     device off the axis to disguise someone else's asymmetry.

     Two stacked shadows read as contact rather than as a filter: a tight dark
     one where the metal meets the paper, and a wider soft one for the lift of
     the emboss. */
  .o5-seal{position:absolute;left:135.5mm;top:172.14mm;width:26mm;height:auto;
    filter:drop-shadow(0 .18mm .22mm rgba(48,32,8,.42))
           drop-shadow(0 .75mm 1.15mm rgba(56,38,8,.22));}

  /* Credential plaques: engraved vector grounds (plaqueGroundSvg) —
     ivory field, micro-guilloché, hairline rules, corner ornaments,
     SHRS microtext. Printed into the paper: no drop shadows, only a
     whisper of blind-emboss relief. */
  /* Open letterpress ledger band — the credential line is set BETWEEN
     engraved rules, not inside a box: double hairline rules above and
     below, no side borders, no fill, diamond separators. Metadata is
     typography pressed into the paper, never a form. */
  /* Three cells, not four: the Certificate Number left this band for its
     own engraved cartouche in the lower left. The band was narrowed from
     205mm to 172mm at the same centre so the remaining three sit at a
     comfortable measure instead of drifting apart to fill a width that
     was sized for four. */
  .o8-band{position:absolute;left:62.5mm;width:172mm;top:138.2mm;}
  .band-in{position:relative;display:flex;align-items:stretch;justify-content:space-between;
    gap:2mm;padding:1.6mm 2mm 1.7mm;
    border-top:.2mm solid #8A6A24;border-bottom:.2mm solid #8A6A24;}
  .band-in::before{content:'';position:absolute;left:0;right:0;top:.5mm;
    border-top:.08mm solid rgba(169,138,60,.85);}
  .band-in::after{content:'';position:absolute;left:0;right:0;bottom:.5mm;
    border-bottom:.08mm solid rgba(169,138,60,.85);}
  .bg{display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:.6mm;min-width:0;}
  .bg-l{display:flex;gap:1.6mm;align-items:baseline;}
  .p-l-en{font-family:var(--en-display);font-weight:700;font-size:4pt;letter-spacing:.9px;
    text-transform:uppercase;color:#6E5013;}
  .p-l-ar{font-family:var(--ar-text);font-weight:700;font-size:5pt;color:#6E5013;}
  /* Values in the engraved serif — never a UI face on the document.
     FIGURE STYLE IS SPLIT BY ROLE, the way a type foundry sets a
     credential: alphanumeric identifiers take LINING + TABULAR figures
     so the digits stand at cap height beside the capitals (oldstyle
     figures there collapse to x-height and 000001 reads as oooooi —
     genuinely ambiguous when a verifier transcribes it), while dates
     set in prose keep the elegant oldstyle default. */
  .bg-v{font-family:var(--en-text);font-weight:700;font-size:7.2pt;color:#221A10;
    letter-spacing:.4px;text-align:center;white-space:nowrap;line-height:1.25;}
  /* Identifiers are set in the inscriptional face, not the text face.
     Measured from the font binaries: Cormorant's hyphen is 102 units
     tall on a 269 width centred at y=205 — a thick calligraphic stroke
     sitting at x-height, which reads as a slash inside an all-caps
     serial. Cinzel's is 67 on 316 centred at y=291: a flat bar at
     cap-centre. Cinzel is an all-capitals face, so its figures are
     cap-height lining by design. Kerning is disabled because the
     auto-kern pairs (notably R-T) collapsed to 1px against a 10-13px
     tracking norm, producing a visible stumble mid-serial. */
  .bg-v-id{font-family:var(--en-display);font-weight:700;font-size:6.1pt;
    letter-spacing:.35px;font-kerning:none;font-variant-ligatures:none;}
  .bg-v-sm{font-size:6.6pt;letter-spacing:.2px;}
  .bg-v span[dir="rtl"]{font-family:var(--ar-text);font-size:105%;}
  .bg-v .p-dot,.vp-row .p-dot,.vp-void .p-dot{color:#B08A2E;padding:0 .45mm;}
  .band-di{align-self:center;width:1.6mm;height:1.6mm;flex:0 0 auto;
    background:linear-gradient(135deg,#C9A64F,#8A6A24);transform:rotate(45deg);opacity:.85;}
  .band-micro{text-align:center;font-family:var(--utility);font-size:2.3pt;
    letter-spacing:.35px;color:rgba(138,106,36,.75);margin-top:.6mm;white-space:nowrap;overflow:hidden;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 6%,#000 94%,transparent 100%);
    mask-image:linear-gradient(90deg,transparent 0,#000 6%,#000 94%,transparent 100%);}
  /* Certificate Number security cartouche — lower left, mirroring the
     verification plate's width and vertical band. The frame is positioned
     so the artwork's OWN optically-variable strip (measured at x 60-120mm,
     y 185.6-196.2) and its microtext rules fall inside it: the panel
     adopts the paper's security devices instead of printing new ones over
     them. Nothing is drawn below y=11mm inside the panel for that reason.
     No background-image and no box-shadow — a card with a drop shadow is
     exactly the "pasted on top" look this must not have. */
  .o5-cnplate{position:absolute;left:59mm;top:172.2mm;width:62mm;height:25.3mm;}
  .cn-plate{display:block;width:100%;height:100%;overflow:visible;}

  /* Verification plate: an engraved institutional module built into the
     certificate's bottom-right verification zone — Document ID, code,
     verify address and void clause beside the QR, which sits framed
     inside the plate rather than floating on the paper. */
  /* Sized from the paper, not by eye: the band between the seal and the
     right-hand border ornament is clear from 173.5mm to 245mm across and
     from 173.4mm to 200mm down (measured on the master at 8% ink
     density). At 58 x 23.6mm the Document ID line overflowed its column
     by 2.1mm and was hard-clipped by the QR, and the URL and archive
     rows sat flush against both edges. 62 x 25.2mm still leaves ~9.5mm
     of clear paper to the ornament and ~1.4mm to the ribbon corner. */
  /* Top raised from 173.4mm: at the old position the plate's bottom-right
     corner crossed the navy ribbon, whose leading edge runs 199.5mm at
     x=230 to 197.9mm at x=235, and the 0.9-opacity plaque ground let the
     ribbon tint show through it. */
  /* Bottom padding cut from 3.1mm to 1.5mm and the row gaps tightened, to
     buy the Code 128 the bar height it needs. At 2.7mm the barcode decoded
     only at 600 DPI — ZXing could not read it at 200 or 300, which is where
     a phone or an office scanner actually works. Scanners need bar length
     to acquire a scan line; the rule of thumb is 15% of symbol length, so
     30mm of symbol wants ~4.5mm of bar. */
  .o5-vplate{position:absolute;left:169mm;top:171.8mm;width:62mm;height:25.3mm;
    box-sizing:border-box;padding:1.7mm 2mm 1.5mm 2.8mm;
    display:flex;align-items:center;gap:1.4mm;}
  .vp-ground{position:absolute;inset:0;width:100%;height:100%;display:block;
    pointer-events:none;}
  .o5-vplate > *:not(.vp-ground){position:relative;}
  .vp-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:.18mm;}
  .vp-head{display:flex;justify-content:space-between;align-items:center;gap:1mm;margin-bottom:.3mm;}
  .vp-head .p-l-en{font-size:4.3pt;}
  .vp-head .p-l-ar{font-size:5.4pt;}
  .vp-mark{flex:0 0 auto;width:3.5mm;height:3.5mm;border:.13mm solid #8A6A24;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-family:var(--en-display);font-weight:700;font-size:2.4pt;letter-spacing:.3px;color:#6E5013;
    box-shadow:inset 0 0 0 .3mm rgba(169,138,60,.25);}
  .vp-row{font-family:var(--en-text);font-weight:600;font-size:5.4pt;color:#221A10;
    white-space:nowrap;line-height:1.3;letter-spacing:.2px;}
  .vp-id{font-family:var(--en-display);font-weight:700;font-size:4.6pt;
    letter-spacing:.25px;font-kerning:none;font-variant-ligatures:none;}
  .vp-url{font-weight:700;font-size:5.1pt;color:#4B3420;letter-spacing:.2px;}
  /* Bottom margin measured, not guessed: the void clause's Arabic carries
     tanwīn above the Latin cap height, and by pixel diff its ink reached
     192.76mm against the barcode's 192.95mm — a 0.19mm overlap into the
     bars. 0.9mm below the barcode clears it. */
  .vp-barcode{height:5.4mm;margin:.25mm 0 .7mm;background:#FFFDF4;
    border-top:.09mm solid rgba(138,106,36,.55);border-bottom:.09mm solid rgba(138,106,36,.55);
    padding:.25mm 3.4mm;box-sizing:content-box;width:31mm;}
  .vp-barcode svg{width:31mm;height:5.4mm;display:block;}
  /* Genuine microprint rail: the live serial repeated at microtext
     size — a real security-print device, not decoration. */
  /* The repeat was hard-clipping mid-letterform at the right edge,
     leaving a sliced half-glyph. Masked so the rail fades out instead
     of being guillotined. */
  .vp-micro{font-family:var(--utility);font-size:2.5pt;letter-spacing:.25px;
    color:rgba(138,106,36,.8);white-space:nowrap;overflow:hidden;line-height:1.5;
    -webkit-mask-image:linear-gradient(90deg,#000 0,#000 88%,transparent 100%);
    mask-image:linear-gradient(90deg,#000 0,#000 88%,transparent 100%);}
  .vp-void{font-family:var(--en-text);font-style:italic;font-size:4.4pt;color:#7A1F2B;
    white-space:nowrap;line-height:1.25;}
  .vp-void span[dir="rtl"]{font-family:var(--ar-text);font-style:normal;font-size:4.9pt;}
  .vp-qrcol{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:.55mm;}
  /* The symbol carries its own ISO/IEC 18004 four-module quiet zone, so the
     plate adds only a hairline of padding and the code takes the rest of the
     room. 49 modules across 16.7mm is a 0.341mm module pitch — 4.0 pixels at
     300 DPI, comfortably above the ~0.25mm floor for phone capture. Do not
     shrink this without re-running the decode gate. */
  /* The white field is not decoration — Code contrast requires it, and the
     symbol's own four-module quiet zone lives inside the SVG. The engraved
     rule and corner brackets are what stop it reading as a sticker. */
  .vp-qr{width:17.2mm;height:17.2mm;background:#FFFFFF;
    border:.18mm solid #8A6A24;box-sizing:border-box;padding:.1mm;
    display:flex;align-items:center;justify-content:center;position:relative;}
  .vp-qr::before,.vp-qr::after{content:'';position:absolute;width:2.4mm;height:2.4mm;
    border:.18mm solid #A98A3C;}
  .vp-qr::before{left:-.9mm;top:-.9mm;border-right:0;border-bottom:0;}
  .vp-qr::after{right:-.9mm;bottom:-.9mm;border-left:0;border-top:0;}
  .vp-qr svg{width:16.7mm;height:16.7mm;display:block;}
  .vp-scan{font-family:var(--en-display);font-weight:700;font-size:3.4pt;
    letter-spacing:1px;text-transform:uppercase;color:#6E5013;}

  /* Signature court: three columns anchoring the page; the centre
     column signs directly above the printed gold seal. */
  /* Two signatories, not three (Founder directive: the Registrar's block is
     withdrawn — the Registrar's Office still issues the certificate, and
     still signs the register, but does not sign the face).
     The court is rebuilt around that rather than having a station deleted
     out of it: two stations at 88.5 and 208.5mm, whose centres (117 and
     180mm) sit 31.5mm either side of the sheet's optical centre at 148.5mm,
     with the seal filling the space between them. Three evenly-spaced
     stations with the middle one removed would have left a 73.5mm hole and
     pushed the outer two into the margins. */
  /* SHRS optically-variable patch. Position measured, not chosen by eye.
     The Founder asked for the lower-right corner; there is no paper left
     there. Ink density in that corner runs 0.42-0.43 with the navy ribbon
     at 0.15-0.26 (border ornament and ribbon), and the only quiet ground is
     a 9mm ribbon between the verification plate and the border — too narrow
     for a credible patch. The lower LEFT, vacated by the withdrawn
     Registrar station, measures 0.022: the quietest ground on the lower
     half of the sheet. Placing the patch there mirrors the verification
     plate across the centred seal, so the two authentication devices
     bracket it instead of both crowding one corner, and it fills the space
     the third signature left rather than leaving a hole.
     Multiply blend so the guilloche shows through it the way a real hot-
     stamped foil patch lets the underlying print read at most angles. */
  .o5-holo{position:absolute;left:78mm;top:174.5mm;width:15mm;height:15mm;
    background-size:100% 100%;background-repeat:no-repeat;
    mix-blend-mode:multiply;opacity:.88;
    filter:drop-shadow(0 .12mm .18mm rgba(60,68,80,.28));}

  /* The SHRS security patch, in the lower-right corner as directed.
     I reported that the corner had no clear paper and the Founder
     reaffirmed the placement, so the room is made rather than the request
     refused: the verification plate moves 4.5mm left (still 3.5mm clear of
     the seal), which opens a 12mm channel between the plate's new right
     edge at 231mm and the border's inner edge, measured at 245.3mm. The
     patch takes 10mm of it with 1mm of register either side.
     Multiply-blended, because a hot-stamped foil patch lets the guilloche
     beneath it read at most viewing angles, and given the same contact
     shadow as the seal so the two devices sit on the paper alike. */
  .o5-holo{position:absolute;left:233mm;top:178mm;width:10mm;height:auto;
    mix-blend-mode:multiply;opacity:.82;
    filter:drop-shadow(0 .1mm .16mm rgba(52,58,70,.26));}

  /* Academic session inside Arabic text (Founder correction).
     The span used to carry dir="ltr", which locked the whole range into
     Latin order: on the sheet it read 2025 - 2026 left to right, so a
     reader coming from the right met 2026 first and the session appeared
     to run backwards. Removing the isolate hands the range to the Unicode
     bidi algorithm, which keeps each numeral internally left-to-right
     while ordering the pair right-to-left with the sentence. Measured in
     the browser: with the isolate the RTL reader meets 2026 first, without
     it 2025 first. The source data stays chronological (2025 - 2026); only
     the rendering changes. isolate keeps the range from disturbing the
     Arabic around it. */
  .ar-range{unicode-bidi:isolate;}

  .o5-sig{position:absolute;top:150.9mm;width:57mm;text-align:center;}
  .o5-sig-1{left:79.5mm;}
  .o5-sig-2{left:160.5mm;}
  /* The real signatures, photographed by the Founder and lifted to ink-only
     artwork by scripts/certificate-signatures.py. They sit in the signing
     space and rest on the rule the way a written signature does, rather
     than floating above it as a pasted-on graphic. Sized by HEIGHT, not
     width: the two marks have very different proportions (3.10:1 and
     1.61:1) and matching their widths would make one tower over the other.
     Multiply-blended so the rule and the paper grain read through the
     stroke, as ink on paper does. */
  .o5-sig-ink{position:absolute;left:50%;bottom:calc(100% - 8.4mm);
    transform:translateX(-50%);height:8.6mm;width:auto;
    mix-blend-mode:multiply;opacity:.94;}
  /* The signing rule is a guide, not a form field. It was a 0.34mm near-black
     bar — the "generic underline" the Founder rejected. It is now a 0.1mm
     gold hairline that fades to nothing over the outer quarter at each end
     and is closed by a lozenge terminal, so it reads as engraving and all
     but disappears once a signature is written across it. */
  /* 38mm, not 45: the rule is now signed across, and a real signature
     should fill most of the space it is written in. The principal's mark is
     26.7mm at the height these are set to, which reads as 70% of a 38mm
     rule and as a thin 59% of a 45mm one. */
  .o5-sig-line{position:relative;width:38mm;height:.1mm;margin:8.9mm auto 0;
    background:linear-gradient(90deg,transparent,rgba(138,106,36,.62) 25%,
      rgba(138,106,36,.62) 75%,transparent);}
  .o5-sig-line::before,.o5-sig-line::after{content:'';position:absolute;top:50%;
    width:.9mm;height:.9mm;margin-top:-0.45mm;transform:rotate(45deg);
    border:.08mm solid rgba(138,106,36,.72);}
  .o5-sig-line::before{left:-1.6mm;}
  .o5-sig-line::after{right:-1.6mm;}
  /* Four levels per station, diploma convention: signing space, printed
     name, English office, Arabic office. The name is the largest text in
     the block but is deliberately set below the student name's weight —
     a signatory must never compete with the graduate. */
  /* The printed name is Arabic (Founder directive: the signature block
     must match the rest of the bilingual sheet). That means the Arabic
     display face, not Cinzel, and an Arabic optical size — Amiri's
     x-height sits far below a Latin cap, so 6.9pt Cinzel and 6.9pt Amiri
     are nowhere near the same apparent size. 9.6pt matches the weight the
     Latin name carried. letter-spacing is removed outright: spacing out
     Arabic breaks the joins between letters. */
  .o5-sig-name{font-family:var(--ar-display);font-weight:700;font-size:9.2pt;
    direction:rtl;color:#241B10;margin-top:.9mm;line-height:1.1;white-space:nowrap;
    text-shadow:0 -0.04mm 0 rgba(255,252,243,.5);}
  .o5-sig-en{font-family:var(--en-display);font-weight:400;font-size:5.4pt;letter-spacing:.85px;
    text-transform:uppercase;color:#6E5013;margin-top:.55mm;line-height:1.3;white-space:nowrap;}
  .o5-sig-ar{font-family:var(--ar-text);font-weight:700;font-size:8.2pt;color:#3A2A18;
    margin-top:.1mm;direction:rtl;line-height:1.15;}


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
