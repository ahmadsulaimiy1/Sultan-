// Sultan Hanafi Royal College — Junior Secondary Graduation Certificate.
// Certificate System v1.1, programme code JSS. English only, by Founder
// directive of 2026-08-06.
//
// ── WHY THIS IS A SEPARATE MODULE AND NOT A BRANCH IN THE v1.0 TEMPLATE ──────
// stage-certificate-template.js, certificate-serial.js, certificate-plate.js,
// certificate-ground.js and qrcode.js are frozen at Production Release v1.0 and
// their bytes are enforced by scripts/verify-certificate-master.mjs against the
// manifest the Founder signed. Adding a fourth programme to that template would
// have meant editing three frozen files, re-baselining the declaration, and
// giving up the guarantee that the thirteen certificates already issued under
// IBT and IDD are rendered by exactly the code that issued them.
//
// The Royal College award is a different school, a different curriculum and a
// different language policy, so it gets its own master. Nothing here imports a
// frozen render-path file, and nothing here is imported by one; the v1.0 freeze
// gate stays green with this module in the tree, which is the point.
//
// ── WHY THE SUPPLIED ARTWORK IS A BRIEF AND NOT A BACKGROUND ─────────────────
// The Founder supplied a background template (1080x708 px over a 297x210mm
// sheet — 92.4 DPI) and asked for 300-600 DPI output. Those two cannot both be
// satisfied by compositing that file: at 92 DPI every ornamental stroke in it
// is about three pixels wide, and upsampling invents detail rather than
// recovering it. The v1.0 I'dadiyyah plate took the other road — preserving the
// supplied marks pixel-exact and rebuilding only the paper — and is honest that
// its marks layer stays 92 DPI (certificate-plate.js).
//
// This sheet is rebuilt as vector instead, because three things in the supplied
// file could not have gone to press as they stood:
//
//   1. Its border microtext and its seal ring both read SCHOOL OF ISLAMIC &
//      ARABIC STUDIES. This is a Royal College document. On a Royal College
//      certificate that is the wrong institution engraved into the security
//      layer, where it cannot be patched over.
//   2. Its verification row carries mock identifiers — SHRS-IBT-2025-0000001,
//      DID-2025-IBT-0000001, 4X78-9K2M-P6QZ — in a numbering format this
//      system does not issue. Real values would have had to be overprinted
//      exactly on top of fake ones.
//   3. Its two roundels read EST. 1448 A.H. and EST. 2025 C.E. No founding
//      date is established anywhere in the institution's own record, so those
//      are unverified claims and are not reproduced.
//
// So the composition, the grid, the palette and the ornament vocabulary are
// taken from the supplied artwork and rebuilt as true vector: resolution-free,
// exact at 600 DPI or at 1200, with every word on the sheet either the
// institution's own or derived from this certificate's own record.
//
// See docs/shrs-royal-college-certificate-editorial-bible.md for the wording
// rules and scripts/verify-royal-college-certificate.mjs for the gate.

const PT = 0.35278;   // mm per point — the user unit of every SVG here is the mm

// ── Palette, sampled off the supplied artwork ────────────────────────────────
const PAPER = '#F6EFE1';
const PAPER_DEEP = '#EDE2CC';
const GOLD = '#A8863F';
const GOLD_DEEP = '#7A5C21';
const GOLD_LIGHT = '#CBAA63';
const NAVY = '#1B2333';       // the corner cartouche ground
const INK = '#2B2417';        // body text
const INK_SOFT = '#5A4E37';
const MICRO_INK = '#8B7440';
const HOLO = '#CFC6DE';

// The sheet. True A4 landscape — 297 x 210mm, filling the page edge to edge
// under @page{size:A4 landscape;margin:0}. The v1.0 master draws 297 x 209.5
// and leaves a 0.34mm strip of body colour at the foot of the PDF page
// (docs/certificate-press-specification.md); this one has no such strip.
const W = 297;
const H = 210;

// ── The frame grid, in mm from the sheet edge ────────────────────────────────
// Derived from the supplied artwork by measuring its own rules and scaling
// 1080x708 px onto 297x210mm. Recorded as constants because every later
// addition has to land in real paper rather than on top of an ornament, and
// because the layout gate re-measures against exactly these numbers.
export const RC_RULES = {
  microRailTop: 4.6,     // outer microtext rail, top
  microRailBottom: 205.4,
  trim: 7.0,             // trim rule
  frame: 10.5,           // heavy engraved gold frame
  frameInner: 12.6,      // hairline inside it
  vRail: 15.0,           // vertical microtext columns
  field: 17.5,           // open field begins on all four sides
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// GUILLOCHE
// ─────────────────────────────────────────────────────────────────────────────
// A hypotrochoid with the rolling circle's radius set to R/petals, so the curve
// CLOSES after exactly one revolution and draws a clean n-petal rosette.
//
// The first cut of this function took R and r independently and ran the curve
// for r/gcd(R,r) turns. That is the textbook spirograph, and it is what a
// geometric lathe does — but at the ratios chosen it needed dozens of turns and
// rendered as a tangled ball rather than an engraving. Fixing the ratio to an
// integer petal count is the difference between ornament and scribble, and it
// costs nothing in security: the moire that defeats a copier comes from the
// line PITCH, which the concentric bands below still supply.
function rosette(cx, cy, R, petals, amp, steps = 640) {
  const r = R / petals;
  const k = petals - 1;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = (R - r) * Math.cos(t) + amp * Math.cos(k * t);
    const y = (R - r) * Math.sin(t) - amp * Math.sin(k * t);
    pts.push(`${(cx + x).toFixed(2)},${(cy + y).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

// Four concentric rosettes at different petal counts and amplitudes. The
// varying line density across the figure is what a real engraved medallion
// looks like, and it is what a scan-and-reprint loses first.
function medallion(cx, cy, scale, stroke, opacity, colour = GOLD_DEEP) {
  const bands = [[7.6, 13, 1.5], [6.6, 11, 1.35], [5.3, 9, 1.15], [4.0, 7, 0.95]];
  return bands.map(([R, petals, amp]) => `<path d="${rosette(cx, cy, R * scale, petals, amp * scale)}" `
    + `fill="none" stroke="${colour}" stroke-width="${stroke}" opacity="${opacity}"/>`).join('');
}

// Interleaved sine strands. Structural strokes stay at or above 0.10mm and
// screen strokes at or above 0.07mm — the floor the press specification sets
// for this paper.
function lathe(x, y, len, h, strands, stroke, opacity, vertical = false) {
  const out = [];
  const steps = Math.max(80, Math.round(len * 2.6));
  for (let s = 0; s < strands; s++) {
    const phase = (s / strands) * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * len;
      const v = (h / 2) * Math.sin((u / len) * Math.PI * 2 * 7 + phase)
        * Math.cos((u / len) * Math.PI * 2 * 1.5 + phase * 0.5);
      pts.push(vertical
        ? `${(x + v).toFixed(2)},${(y + u).toFixed(2)}`
        : `${(x + u).toFixed(2)},${(y + v).toFixed(2)}`);
    }
    out.push(`<path d="M${pts.join('L')}" fill="none" stroke="${GOLD_DEEP}" `
      + `stroke-width="${stroke}" opacity="${opacity}"/>`);
  }
  return out.join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// THE CORNER CARTOUCHE
// The supplied artwork's four corners are dark blocks carrying a gold
// arabesque. Rebuilt as an eight-point star (khatam) lattice — the geometry the
// rest of the institution's ornament already uses — rather than traced from
// three-pixel strokes that carry no recoverable detail.
// ─────────────────────────────────────────────────────────────────────────────
// 22mm, measured off the supplied artwork (its navy blocks run px 25–105 of
// 1080 over 297mm). The first cut used 32mm, and at that size the bottom
// cartouches ran under the QR module and the verification plate — the whole
// authentication band has to clear them, which is what fixes the size.
const CORNER = 22;
const CORNER_PITCH = 7.3;

function cornerCartouche(x, y, sx, sy, uid) {
  const S = CORNER;
  const g = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = 3.7 + c * CORNER_PITCH;
      const cy = 3.7 + r * CORNER_PITCH;
      const R = 2.9;
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? R : R * 0.415;
        pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
      }
      g.push(`<path d="M${pts.join('L')}Z" fill="none" stroke="${GOLD_LIGHT}" stroke-width="0.16" opacity="0.7"/>`);
      g.push(`<circle cx="${cx}" cy="${cy}" r="1.1" fill="none" stroke="${GOLD}" stroke-width="0.13" opacity="0.58"/>`);
    }
  }
  for (let i = -2; i <= 4; i++) {
    const a = (i * CORNER_PITCH - 4).toFixed(2);
    const b = (i * CORNER_PITCH + S + 4).toFixed(2);
    g.push(`<path d="M ${a} -4 L ${b} ${S + 4}" fill="none" stroke="${GOLD}" stroke-width="0.11" opacity="0.3"/>`);
    g.push(`<path d="M ${a} ${S + 4} L ${b} -4" fill="none" stroke="${GOLD}" stroke-width="0.11" opacity="0.3"/>`);
  }
  return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" clip-path="url(#rcCorner${uid})">
    <rect x="0" y="0" width="${S}" height="${S}" fill="${NAVY}"/>
    <rect x="0" y="0" width="${S}" height="${S}" fill="url(#rcCornerSheen${uid})"/>
    ${g.join('')}
    <path d="M 0.9 ${S} L 0.9 0.9 L ${S} 0.9" fill="none" stroke="${GOLD_LIGHT}" stroke-width="0.5" opacity="0.9"/>
    <path d="M 2.2 ${S} L 2.2 2.2 L ${S} 2.2" fill="none" stroke="${GOLD_DEEP}" stroke-width="0.16" opacity="0.8"/>
  </g>`;
}

// Deterministic pseudo-random security fibres, seeded from the serial with a
// plain LCG: the point is reproducibility, not cryptographic quality. The same
// certificate regenerates identically, so a reissue that differs is a reissue
// that can be spotted.
function fibres(serial) {
  let seed = 0;
  for (const ch of String(serial)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const cols = ['#B8443C', '#2E6E8E', '#C79A2C'];
  const out = [];
  for (let i = 0; i < 36; i++) {
    const x = 22 + rnd() * 253;
    const y = 22 + rnd() * 166;
    const a = rnd() * Math.PI;
    const l = 1.6 + rnd() * 3.4;
    const bow = (rnd() - 0.5) * 1.6;
    out.push(`<path d="M ${x.toFixed(2)} ${y.toFixed(2)} q ${(Math.cos(a) * l / 2 + bow).toFixed(2)} `
      + `${(Math.sin(a) * l / 2 - bow).toFixed(2)} ${(Math.cos(a) * l).toFixed(2)} ${(Math.sin(a) * l).toFixed(2)}" `
      + `fill="none" stroke="${cols[i % 3]}" stroke-width="0.13" opacity="0.28" stroke-linecap="round"/>`);
  }
  return `<g>${out.join('')}</g>`;
}

// UV-reactive motifs. Printed in an ink that is near-invisible in daylight and
// fluoresces under 365nm. Drawn here in a pale lilac so the press proof shows
// where they go; the ink swaps at plate-making (editorial bible, §6).
function uvMotif(cx, cy, r = 3.2) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? r * 0.42 : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `<g class="rc-uv"><path d="M${pts.join('L')}Z" fill="none" stroke="#D2C8DE" stroke-width="0.16" opacity="0.55"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.3).toFixed(2)}" fill="none" stroke="#D2C8DE" stroke-width="0.14" opacity="0.5"/></g>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE GROUND — paper, watermark, guilloche field, frame, microtext rails.
// One SVG covering the whole sheet, regenerated per certificate because the
// microtext rails carry that certificate's own serial: the security layer is
// different on every sheet, which the supplied artwork's fixed microtext is not.
// ─────────────────────────────────────────────────────────────────────────────
function groundSvg(serial, uid) {
  const s = esc(serial);
  const R = RC_RULES;
  const vText = `SULTAN HANAFI ROYAL COLLEGE · JUNIOR SECONDARY GRADUATION · ${s} · `;
  const vReps = Math.ceil(166 / (vText.length * 1.38)) + 1;
  const hText = `SULTAN HANAFI ROYAL SCHOOLS · SULTAN HANAFI ROYAL COLLEGE · CERTIFICATE OF AUTHENTICITY · VERIFIED ACADEMIC CREDENTIAL · ${s} · `;
  const hReps = Math.ceil(285 / (hText.length * 1.42)) + 1;
  const microFs = (0.9 * PT).toFixed(3);
  const microTrack = (0.34 * PT).toFixed(3);

  return `<svg class="rc-ground" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <clipPath id="rcCorner${uid}"><rect x="0" y="0" width="${CORNER}" height="${CORNER}"/></clipPath>
    <linearGradient id="rcCornerSheen${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2C3750"/><stop offset="0.55" stop-color="#161D2A"/>
      <stop offset="1" stop-color="#26314A"/>
    </linearGradient>
    <linearGradient id="rcFoil${uid}" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0" stop-color="#8A6A2A"/><stop offset="0.18" stop-color="#E4C982"/>
      <stop offset="0.34" stop-color="#9A7A32"/><stop offset="0.52" stop-color="#F0DCA6"/>
      <stop offset="0.7" stop-color="#96762F"/><stop offset="0.86" stop-color="#DEC27B"/>
      <stop offset="1" stop-color="#7E6027"/>
    </linearGradient>
    <linearGradient id="rcHolo${uid}" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0" stop-color="#D8CFE6"/><stop offset="0.2" stop-color="#CFE2DC"/>
      <stop offset="0.4" stop-color="#EADCC9"/><stop offset="0.6" stop-color="#D3CBE4"/>
      <stop offset="0.8" stop-color="#CBE0DE"/><stop offset="1" stop-color="#E4D6C6"/>
    </linearGradient>
    <radialGradient id="rcVignette${uid}" cx="0.5" cy="0.44" r="0.8">
      <stop offset="0" stop-color="#FFFCF4" stop-opacity="0.9"/>
      <stop offset="0.6" stop-color="${PAPER}" stop-opacity="0"/>
      <stop offset="1" stop-color="#D9CBAE" stop-opacity="0.42"/>
    </radialGradient>
    <path id="rcRailT${uid}" d="M 6 ${R.microRailTop} H 291"/>
    <path id="rcRailB${uid}" d="M 6 ${R.microRailBottom} H 291"/>
    <path id="rcRailL${uid}" d="M ${R.vRail} 188 L ${R.vRail} 22"/>
    <path id="rcRailR${uid}" d="M ${W - R.vRail} 22 L ${W - R.vRail} 188"/>
  </defs>

  <!-- Paper. Flat vector: exact at any resolution. -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#rcVignette${uid})"/>

  <!-- Guilloche field. The whole open area carries lathe work, not just the
       border: a scan-and-reprint loses the fine strands first. -->
  <g opacity="0.28">
    ${lathe(20, 62, 257, 5.4, 4, 0.075, 0.5)}
    ${lathe(20, 100, 257, 6.2, 4, 0.075, 0.44)}
    ${lathe(20, 138, 257, 5.4, 4, 0.075, 0.5)}
  </g>

  <!-- Central medallion watermark, over the citation. -->
  <g opacity="0.15">${medallion(148.5, 98, 4.2, 0.085, 1)}</g>
  <g opacity="0.1">${medallion(148.5, 98, 2.5, 0.08, 1)}</g>

  <!-- Frame: trim rule, engraved gold frame, two hairlines. -->
  <rect x="${R.trim}" y="${R.trim}" width="${W - 2 * R.trim}" height="${H - 2 * R.trim}"
    fill="none" stroke="url(#rcFoil${uid})" stroke-width="0.8"/>
  <rect x="${R.frame}" y="${R.frame}" width="${W - 2 * R.frame}" height="${H - 2 * R.frame}"
    fill="none" stroke="url(#rcFoil${uid})" stroke-width="1.5"/>
  <rect x="${R.frameInner}" y="${R.frameInner}" width="${W - 2 * R.frameInner}" height="${H - 2 * R.frameInner}"
    fill="none" stroke="${GOLD_DEEP}" stroke-width="0.14" opacity="0.8"/>
  <rect x="${R.field}" y="${R.field}" width="${W - 2 * R.field}" height="${H - 2 * R.field}"
    fill="none" stroke="${GOLD}" stroke-width="0.1" opacity="0.5"/>

  <!-- Guilloche inside the frame band, all four sides. -->
  <g opacity="0.4">
    ${lathe(R.field, R.frameInner + 1.2, W - 2 * R.field, 2.2, 3, 0.07, 1)}
    ${lathe(R.field, H - R.frameInner - 1.2, W - 2 * R.field, 2.2, 3, 0.07, 1)}
    ${lathe(R.frameInner + 1.2, R.field, H - 2 * R.field, 2.2, 3, 0.07, 1, true)}
    ${lathe(W - R.frameInner - 1.2, R.field, H - 2 * R.field, 2.2, 3, 0.07, 1, true)}
  </g>

  <!-- Corner cartouches, drawn over the frame the way the supplied artwork
       has them: the gold rules emerge from the dark blocks. -->
  ${cornerCartouche(R.trim, R.trim, 1, 1, uid)}
  ${cornerCartouche(W - R.trim, R.trim, -1, 1, uid)}
  ${cornerCartouche(R.trim, H - R.trim, 1, -1, uid)}
  ${cornerCartouche(W - R.trim, H - R.trim, -1, -1, uid)}

  <!-- Holographic strips, left and right, as the supplied artwork carries them.
       Printed as a screen tint with a lathe overlay so the sheet still reads
       correctly in flat CMYK wherever the foil is not applied. -->
  ${[20.2, W - 26.2].map((x) => `
  <g>
    <rect x="${x}" y="60" width="6" height="86" rx="1.2" fill="url(#rcHolo${uid})" opacity="0.8"/>
    <rect x="${x}" y="60" width="6" height="86" rx="1.2" fill="none" stroke="${GOLD}" stroke-width="0.14" opacity="0.68"/>
    ${lathe(x + 3, 63, 80, 3.4, 3, 0.07, 0.5, true)}
    ${medallion(x + 3, 80, 0.3, 0.07, 0.45, HOLO)}
    ${medallion(x + 3, 103, 0.3, 0.07, 0.45, HOLO)}
    ${medallion(x + 3, 126, 0.3, 0.07, 0.45, HOLO)}
  </g>`).join('')}

  <!-- Microtext rails. Solid light ink, never an opacity: an opacity on type
       this small becomes a screen percentage at separation and is the first
       thing to drop out on press. -->
  <g font-family="Inter, sans-serif" font-weight="400" fill="${MICRO_INK}"
     font-size="${microFs}" letter-spacing="${microTrack}">
    <text><textPath href="#rcRailT${uid}" startOffset="0">${esc(hText.repeat(hReps))}</textPath></text>
    <text><textPath href="#rcRailB${uid}" startOffset="0">${esc(hText.repeat(hReps))}</textPath></text>
    <text><textPath href="#rcRailL${uid}" startOffset="0">${esc(vText.repeat(vReps))}</textPath></text>
    <text><textPath href="#rcRailR${uid}" startOffset="0">${esc(vText.repeat(vReps))}</textPath></text>
  </g>

  ${fibres(serial)}

  ${[[70, 98], [227, 98], [95, 62], [202, 62]].map(([cx, cy]) => uvMotif(cx, cy)).join('')}
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE INSTITUTIONAL SEAL
// Vector, with the Royal College's own ring text. The v1.0 raster seal
// (assets/images/certificates/official-seal.png) names the School of Islamic &
// Arabic Studies in its ring, so it is the wrong seal for this document and is
// deliberately not reused.
// ─────────────────────────────────────────────────────────────────────────────
function sealSvg(uid) {
  // Ring text is fitted to the ARC LENGTH, not chosen by eye. The first cut set
  // the outer ring at 6.4pt with 1.15 tracking: 27 characters at that advance
  // want ~152 units of path and the semicircle at r=42 offers 132, so the proof
  // came back reading "ULTAN HANAFI ROYAL SCHOOL" — clipped at both ends by
  // text-anchor:middle. These sizes are solved from the arcs below.
  const ringT = 'SULTAN HANAFI ROYAL SCHOOLS';
  const ringB = '✦ SULTAN HANAFI ROYAL COLLEGE ✦';
  const fit = (text, radius, cap) => {
    // Cinzel 700 sets at about 0.70em average advance across capitals.
    const arc = Math.PI * radius * 0.92;   // 8% held back as end margin
    return Math.min(cap, +(arc / (text.length * 0.86)).toFixed(2));
  };
  const fsT = fit(ringT, 42, 6.2);
  const fsB = fit(ringB, 38, 5.4);
  return `<svg class="rc-seal-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="rcSealG${uid}" cx="0.36" cy="0.28" r="0.85">
      <stop offset="0" stop-color="#F7EBC6"/><stop offset="0.38" stop-color="#DEBE78"/>
      <stop offset="0.72" stop-color="#B8934A"/><stop offset="1" stop-color="#8A6A28"/>
    </radialGradient>
    <radialGradient id="rcSealC${uid}" cx="0.4" cy="0.32" r="0.8">
      <stop offset="0" stop-color="#FAF1D6"/><stop offset="0.7" stop-color="#E4CB90"/>
      <stop offset="1" stop-color="#C8A85E"/>
    </radialGradient>
    <!-- Top arc: traced left-to-right OVER the crown, so the text stands upright.
         Bottom arc: traced left-to-right UNDER the seal (sweep 1), which is what
         puts a smile of upright letters along the foot. The first cut used the
         same sweep for both and set the lower legend across the seal's middle,
         through the shield. -->
    <path id="rcSealT${uid}" d="M 50 50 m -42 0 a 42 42 0 0 1 84 0"/>
    <path id="rcSealB${uid}" d="M 50 50 m -38 0 a 38 38 0 0 0 76 0"/>
  </defs>
  <circle cx="50" cy="50" r="48.5" fill="url(#rcSealG${uid})"/>
  <circle cx="50" cy="50" r="48.5" fill="none" stroke="#6E5320" stroke-width="0.8"/>
  <circle cx="50" cy="50" r="45" fill="none" stroke="#FBF1D4" stroke-width="0.55" opacity="0.75"/>
  <circle cx="50" cy="50" r="33" fill="url(#rcSealC${uid})"/>
  <circle cx="50" cy="50" r="33" fill="none" stroke="#6E5320" stroke-width="0.7"/>
  <circle cx="50" cy="50" r="31.2" fill="none" stroke="#FBF1D4" stroke-width="0.45" opacity="0.8"/>
  <g opacity="0.34">${medallion(50, 50, 3.85, 0.28, 1, '#8A6A28')}</g>
  <g font-family="Cinzel, serif" font-weight="700" fill="#5C4516">
    <text font-size="${fsT}" letter-spacing="0.5" text-anchor="middle">
      <textPath href="#rcSealT${uid}" startOffset="50%">${ringT}</textPath></text>
    <text font-size="${fsB}" letter-spacing="0.4" text-anchor="middle">
      <textPath href="#rcSealB${uid}" startOffset="50%">${ringB}</textPath></text>
  </g>
  <g transform="translate(50 45)">
    <path d="M -11 -12 L 11 -12 L 11 4 Q 11 12 0 16.5 Q -11 12 -11 4 Z" fill="#6E5320"/>
    <path d="M -11 -12 L 11 -12 L 11 4 Q 11 12 0 16.5 Q -11 12 -11 4 Z" fill="none" stroke="#FBF1D4" stroke-width="0.65"/>
    <path d="M -7.5 1.2 H 7.5" stroke="#FBF1D4" stroke-width="0.45" opacity="0.75"/>
    <text x="0" y="-1.6" font-family="Cinzel, serif" font-size="5.6" font-weight="800"
      fill="#F7EBC6" text-anchor="middle" letter-spacing="0.4">SHRS</text>
    <text x="0" y="8.4" font-family="Cinzel, serif" font-size="4.6" font-weight="700"
      fill="#F7EBC6" text-anchor="middle" letter-spacing="0.35">JSS</text>
  </g>
  <text x="50" y="76.5" font-family="Cinzel, serif" font-size="3.8" font-weight="700"
    fill="#6E5320" text-anchor="middle" letter-spacing="0.7">OFFICIAL SEAL</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE 128-C
// Subset C only: the payload is always an even-length digit string, which is
// exactly what C encodes, two digits per symbol. Implemented here rather than
// imported so this module has no edge into the frozen render path.
// ─────────────────────────────────────────────────────────────────────────────
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

// Values 0-102 are the data symbols; 103/104/105 are Start A/B/C. The table is
// asserted to be exactly that length at module load, because a Code 128 table
// with one entry missing still encodes — it just encodes the wrong digits, and
// the error surfaces at a scanner in someone's hand rather than here.
if (C128.length !== 106) {
  throw new Error(`royal-college-certificate: the Code 128 table must hold 106 patterns, found ${C128.length}`);
}

function c128Pattern(code) {
  const p = C128[code];
  if (!p) throw new Error(`royal-college-certificate: no Code 128 pattern for value ${code}`);
  return p;
}

// unit is the X-DIMENSION — the width of one narrow bar — in millimetres, and
// it is a scanning parameter, not a styling one. At 0.3mm, fitted into the
// plate's 40 x 5mm slot, the SVG's preserveAspectRatio scaled it down to an
// effective 0.214mm: 1.26 pixels per module at 150 DPI, and
// scripts/verify-certificate-codes.py could not decode a single one of the
// thirteen barcodes off the press PDF at that resolution (every QR decoded at
// every resolution, which is what made the barcode the odd one out). 0.38mm is
// 2.24 pixels at 150 DPI — a phone photograph of a held certificate — and the
// slot below is sized to the symbol so nothing scales it again.
export function code128cSvg(digits, { unit = 0.38, height = 6.5 } = {}) {
  if (!/^\d+$/.test(digits) || digits.length % 2) {
    throw new Error(`royal-college-certificate: Code 128-C needs an even-length digit string, got "${digits}"`);
  }
  const codes = [105];
  for (let i = 0; i < digits.length; i += 2) codes.push(parseInt(digits.slice(i, i + 2), 10));
  let sum = 105;
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103);
  const widths = codes.map(c128Pattern).join('') + C128_STOP;
  let x = 0;
  const bars = [];
  [...widths].forEach((wch, i) => {
    const w = parseInt(wch, 10) * unit;
    if (i % 2 === 0) bars.push(`<rect x="${x.toFixed(3)}" y="0" width="${w.toFixed(3)}" height="${height}" fill="#1A1408"/>`);
    x += w;
  });
  return `<svg viewBox="0 0 ${x.toFixed(2)} ${height}" xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">${bars.join('')}</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGRAVED PANELS
// One generator, so every panel on the sheet is cut the same way: lathe ground,
// a bevel, and a hairline keyline.
// ─────────────────────────────────────────────────────────────────────────────
function plaque(w, h, uid) {
  return `<svg class="rc-plaque-bg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true" preserveAspectRatio="none">
  <defs><linearGradient id="rcPl${uid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FDF8EC"/><stop offset="0.5" stop-color="${PAPER}"/>
    <stop offset="1" stop-color="${PAPER_DEEP}"/></linearGradient></defs>
  <rect x="0.4" y="0.4" width="${(w - 0.8).toFixed(2)}" height="${(h - 0.8).toFixed(2)}" rx="1.1" fill="url(#rcPl${uid})"/>
  <g opacity="0.34">${lathe(1.6, h / 2, w - 3.2, Math.min(3.4, h * 0.4), 3, 0.07, 1)}</g>
  <rect x="0.4" y="0.4" width="${(w - 0.8).toFixed(2)}" height="${(h - 0.8).toFixed(2)}" rx="1.1"
    fill="none" stroke="${GOLD}" stroke-width="0.3"/>
  <rect x="1.2" y="1.2" width="${(w - 2.4).toFixed(2)}" height="${(h - 2.4).toFixed(2)}" rx="0.7"
    fill="none" stroke="${GOLD_DEEP}" stroke-width="0.1" opacity="0.62"/>
</svg>`;
}

// The certificate-number cartouche. The one panel with its own geometry: the
// number is the document's face identity, so the panel carries three covert
// layers under it — a lathe ground, a latent-image screen that photocopies as a
// solid block, and the FULL serial in microtext. The face prints the timeless
// short form; the covert layer keeps the year and the anti-forgery tail.
function numberCartouche(displayNo, fullSerial, uid) {
  const w = 62; const h = 18;
  const micro = `${fullSerial} · SULTAN HANAFI ROYAL COLLEGE · `.repeat(8);
  // Fitted from Cormorant Garamond 600's own advances (caps ~0.577em, oldstyle
  // figures ~0.481em, hyphen ~0.279em) so a longer programme code cannot push
  // the number into the cartouche wall. The viewBox is in MILLIMETRES, so this
  // solves for an em size in mm — not a point size.
  const adv = [...displayNo].reduce((a, c) => a + (c === '-' ? 0.279 : /\d/.test(c) ? 0.481 : 0.577), 0);
  const track = 0.22;
  const em = Math.max(2.4, Math.min(4.3, (49 - (displayNo.length - 1) * track) / adv));
  const outline = `M 2.6 0.6 H ${w - 2.6} L ${w - 0.6} 2.6 V ${h - 2.6} L ${w - 2.6} ${h - 0.6} `
    + `H 2.6 L 0.6 ${h - 2.6} V 2.6 Z`;
  return `<svg class="rc-cn" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="rcCnG${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FEFAF0"/><stop offset="0.52" stop-color="#F8F1E2"/>
      <stop offset="1" stop-color="#EBDFC7"/></linearGradient>
    <pattern id="rcCnScreen${uid}" width="0.5" height="0.5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
      <rect width="0.5" height="0.16" fill="${GOLD_DEEP}" opacity="0.11"/></pattern>
    <path id="rcCnMicro${uid}" d="M 3.4 ${h - 2.1} H ${w - 3.4}"/>
  </defs>
  <path d="${outline}" fill="url(#rcCnG${uid})"/>
  <path d="${outline}" fill="url(#rcCnScreen${uid})"/>
  <g opacity="0.4">${lathe(3, 10.4, w - 6, 4.6, 4, 0.07, 1)}</g>
  <path d="${outline}" fill="none" stroke="${GOLD}" stroke-width="0.34"/>
  <path d="M 3.3 1.6 H ${w - 3.3} L ${w - 1.6} 3.3 V ${h - 3.3} L ${w - 3.3} ${h - 1.6}
    H 3.3 L 1.6 ${h - 3.3} V 3.3 Z" fill="none" stroke="${GOLD_DEEP}" stroke-width="0.1" opacity="0.68"/>
  <text x="${w / 2}" y="4.7" font-family="Cinzel, serif" font-size="${(4.8 * PT).toFixed(3)}"
    font-weight="700" letter-spacing="${(0.9 * PT).toFixed(3)}" fill="#7A5C21" text-anchor="middle">CERTIFICATE NUMBER</text>
  <text x="${w / 2}" y="12.4" font-family="'Cormorant Garamond', serif" font-weight="600"
    font-size="${em.toFixed(3)}" letter-spacing="${track}" font-variant-numeric="oldstyle-nums"
    fill="#2E2413" text-anchor="middle">${esc(displayNo)}</text>
  <text font-family="Inter, sans-serif" font-size="${(0.78 * PT).toFixed(3)}"
    letter-spacing="${(0.16 * PT).toFixed(3)}" fill="${MICRO_INK}">
    <textPath href="#rcCnMicro${uid}" startOffset="0">${esc(micro)}</textPath></text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMME WORDING
// A missing entry stops the press rather than guessing: minting a correct
// serial and printing the wrong award over it is the failure this guard exists
// for, and it is the failure the v1.0 template was bitten by once already.
// ─────────────────────────────────────────────────────────────────────────────
export const RC_PROGRAMMES = {
  JSS: {
    code: 'JSS',
    labelEn: 'Junior Secondary School · JSS 1 – JSS 3',
    school: 'Sultan Hanafi Royal College',
    title: 'Certificate of Graduation',
    // NOT "Basic Education Certificate". That is a national award made on the
    // BECE by the state examination board, not by a school; a school
    // certificate borrowing the name would claim an authority the institution
    // does not hold. See the editorial bible, §2.
    award: 'Junior Secondary School Graduation Certificate',
    stageEn: 'the three-year Junior Secondary School programme',
    progressesTo: 'the Senior Secondary School',
  },
};

const INSTITUTION = 'Sultan Hanafi Royal Schools';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function formatDateEn(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`royal-college-certificate: unusable issue date "${iso}"`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * One certificate sheet.
 *
 * `cert` is a stage_certificates row (or the in-memory equivalent the batch
 * issuer builds). `qrSvgMarkup` must already be rendered — this module never
 * reaches for qrcode.js, so the caller supplies it and the v1.0 freeze gate's
 * render-path walk stays accurate.
 */
export function renderRoyalCollegeCertificate({ cert, qrSvgMarkup }) {
  return docShell(`${cert.student_full_name} — ${cert.serial_no}`,
    sheetHtml({ cert, qrSvgMarkup }));
}

export function renderRoyalCollegeCertificateBatch(title, items) {
  return docShell(title, items.map((it) => sheetHtml(it)).join('\n'));
}

function sheetHtml({ cert, qrSvgMarkup }) {
  if (!qrSvgMarkup) {
    throw new Error('royal-college-certificate: qrSvgMarkup is required — a certificate with no verification QR must not render');
  }
  const prog = RC_PROGRAMMES[String(cert.programme_code || '').toUpperCase()];
  if (!prog) {
    throw new Error(`royal-college-certificate: no award wording for programme code "${cert.programme_code}" — refusing to print`);
  }
  const serial = String(cert.serial_no || '');
  const m = serial.match(/^SHRS-CERT-([A-Z0-9]{2,4})-(\d{4})-(\d{6})-([0-9A-F]{5})$/);
  if (!m) {
    throw new Error(`royal-college-certificate: serial "${serial}" is not in the issuable format, so no certificate number can be engraved`);
  }
  const [, code, year, seq] = m;
  const displayNo = `SHRS-CERT-${code}-${seq}`;
  const uid = seq;

  const hash12 = String(cert.content_hash || '').slice(0, 12).toUpperCase();
  if (hash12.length !== 12) throw new Error(`royal-college-certificate: ${serial} has no usable content hash`);
  const verifyCode = hash12.replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3');

  const recId = Number(cert.id);
  if (!Number.isInteger(recId) || recId <= 0) {
    throw new Error(`royal-college-certificate: ${serial} has no record id, so its Document ID and archive reference cannot be derived`);
  }
  const docId = `DID-${year}-${code}-${String(recId).padStart(7, '0')}`;
  const archSeq = String(recId).padStart(6, '0');
  const archiveRef = `ARCH/${code}/${year}/${archSeq}`;
  const archiveDigits = `${year}${archSeq}`;
  const barcode = code128cSvg(archiveDigits);

  const nameEn = String(cert.student_full_name || '').trim();
  if (!nameEn) throw new Error(`royal-college-certificate: ${serial} has no student name`);
  const studentId = String(cert.student_identity_no || '').trim();
  if (!/^\d{15}$/.test(studentId)) {
    throw new Error(`royal-college-certificate: ${serial} carries "${studentId}" where a 15-digit Student ID belongs`);
  }
  const session = String(cert.academic_year || '').replace('/', ' – ');
  if (!session) throw new Error(`royal-college-certificate: ${serial} has no academic session`);
  const issued = formatDateEn(cert.issued_at);
  const place = String(cert.place_en || 'Ikorodu, Lagos, Nigeria');

  // Name fitting. This is a GUARD, not a stylistic device: every name on the
  // 2026 roll sits at the 30pt cap, because a graduating class whose
  // certificates are typeset at thirteen different sizes looks like thirteen
  // different documents. The fit only engages past about 25 characters, where a
  // name would otherwise run out of its 190mm measure — measured, the longest
  // name on this roll ("Hameedah Adebimpe Ojewumi") renders 142mm.
  // 0.2497mm per character per point is the rendered advance of this exact face
  // at this exact tracking; the layout gate re-measures the painted ink in a
  // browser rather than trusting that constant.
  const FIT_MM = 190;
  const namePt = Math.max(15, Math.min(30,
    +(FIT_MM / (Math.max(1, nameEn.length) * 0.2497)).toFixed(2)));

  const microSerial = `${serial} · `.repeat(7);

  return `<section class="sheet" data-serial="${esc(serial)}" data-stage="${esc(code)}">
  ${groundSvg(serial, uid)}

  <!-- ── HEAD ────────────────────────────────────────────────────────────────
       Three emblems on one baseline: Nigeria left, the institutional crest
       centred on the page, Lagos State right — the same three, in the same
       order, that the v1.0 master carries. -->
  <div class="rc-emblems">
    <img class="rc-em rc-em-side" src="/assets/images/crests/nigeria-coat-of-arms.png" alt="" />
    <img class="rc-em rc-em-mid" src="/assets/images/crests/shrs-institutional-crest.png" alt="" />
    <img class="rc-em rc-em-side" src="/assets/images/crests/lagos-state-arms.png" alt="" />
  </div>
  <div class="rc-nation">Federal Republic of Nigeria <span class="rc-dot">·</span> Lagos State</div>
  <div class="rc-inst">${esc(INSTITUTION)}</div>
  <div class="rc-school">${esc(prog.school)}</div>
  <div class="rc-place">${esc(place)}</div>

  <!-- ── TITLE ───────────────────────────────────────────────────────────── -->
  <div class="rc-titlewrap">
    <span class="rc-rule rc-rule-l"></span>
    <h1 class="rc-title">${esc(prog.title)}</h1>
    <span class="rc-rule rc-rule-r"></span>
  </div>
  <div class="rc-subtitle">${esc(prog.labelEn)}</div>

  <!-- ── CITATION ────────────────────────────────────────────────────────── -->
  <div class="rc-lede">This is to certify that</div>
  <div class="rc-name" style="font-size:${namePt}pt">${esc(nameEn)}</div>
  <div class="rc-namerule"><span></span><i></i><span></span></div>
  <div class="rc-sid">Student Identity Number <b>${esc(studentId)}</b></div>

  <p class="rc-body">has satisfactorily completed ${esc(prog.stageEn)} at ${esc(prog.school)}
  for the academic session ${esc(session)}, has met in full the academic and conduct
  requirements of the institution, and is hereby graduated and admitted to
  ${esc(prog.progressesTo)}.</p>

  <div class="rc-award">
    <span class="rc-award-k">Award Conferred</span>
    <span class="rc-award-v">${esc(prog.award)}</span>
  </div>

  <div class="rc-ledger">
    <div class="rc-lg"><span>Academic Session</span><b>${esc(session)}</b></div>
    <div class="rc-lg"><span>Date of Award</span><b>${esc(issued)}</b></div>
    <div class="rc-lg"><span>Place of Issue</span><b>${esc(place)}</b></div>
  </div>

  <!-- ── SIGNATURES ──────────────────────────────────────────────────────────
       The Chairman's specimen signature is on file and is reproduced. The
       Principal of Royal College has no specimen on file, so his block carries
       a ruled line for wet ink rather than another officer's signature set
       over his name. Editorial bible, §7. -->
  <div class="rc-sig rc-sig-l">
    <div class="rc-sig-ink rc-sig-blank"></div>
    <div class="rc-sig-line"></div>
    <div class="rc-sig-name">Dr. Adegoke Musa Olatunji</div>
    <div class="rc-sig-role">Principal, Sultan Hanafi Royal College</div>
  </div>
  <div class="rc-sig rc-sig-r">
    <img class="rc-sig-ink" src="/assets/images/certificates/signature-chairman.png" alt="" />
    <div class="rc-sig-line"></div>
    <div class="rc-sig-name">Dr. Zakariyyah Olanrewaju Anofi</div>
    <div class="rc-sig-role">Chairman, Board of Governors</div>
  </div>

  <!-- ── AUTHENTICATION BAND ─────────────────────────────────────────────────
       The grid is the supplied artwork's own: QR, certificate number, seal,
       then the verification plate, left to right along the foot of the sheet.
       The pair on the left (22–124mm) and the plate on the right (173–276mm)
       are symmetric about the sheet centre. -->
  <div class="rc-qr">
    ${plaque(26, 28, `qr${uid}`)}
    <div class="rc-qr-cap">Verify Authenticity</div>
    <div class="rc-qr-img">${qrSvgMarkup}</div>
    <div class="rc-qr-foot">Scan QR Code</div>
  </div>

  <div class="rc-cnwrap">${numberCartouche(displayNo, serial, uid)}</div>

  <div class="rc-sealwrap">${sealSvg(uid)}</div>

  <div class="rc-plate">
    ${plaque(92, 28, `vp${uid}`)}
    <div class="rc-plate-head"><span class="rc-plate-mark">SHRS</span>Certificate Verification</div>
    <div class="rc-plate-grid">
      <div class="rc-pf"><span>Document ID</span><b>${esc(docId)}</b></div>
      <div class="rc-pf"><span>Verification Code</span><b>${esc(verifyCode)}</b></div>
      <div class="rc-pf"><span>Archive Reference</span><b>${esc(archiveRef)}</b></div>
      <div class="rc-pf"><span>Student Identity No.</span><b>${esc(studentId)}</b></div>
    </div>
    <div class="rc-plate-bar">${barcode}</div>
    <div class="rc-plate-url">shroyalschools.com/verify-certificate</div>
    <div class="rc-plate-micro">${esc(microSerial)}</div>
    <div class="rc-plate-void">Void if altered, erased or reproduced</div>
  </div>
</section>`;
}

function docShell(title, sheetsHtml) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-500-normal.woff2') format('woff2');font-weight:500;font-style:normal;font-display:block}
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-500-italic.woff2') format('woff2');font-weight:500;font-style:italic;font-display:block}
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-600-normal.woff2') format('woff2');font-weight:600;font-style:normal;font-display:block}
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-600-italic.woff2') format('woff2');font-weight:600;font-style:italic;font-display:block}
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-700-normal.woff2') format('woff2');font-weight:700;font-style:normal;font-display:block}
@font-face{font-family:'Cinzel';src:url('/assets/fonts/cinzel-latin-400-normal.woff2') format('woff2');font-weight:400;font-style:normal;font-display:block}
@font-face{font-family:'Cinzel';src:url('/assets/fonts/cinzel-latin-700-normal.woff2') format('woff2');font-weight:700;font-style:normal;font-display:block}
@font-face{font-family:'Cinzel';src:url('/assets/fonts/cinzel-latin-800-normal.woff2') format('woff2');font-weight:800;font-style:normal;font-display:block}
@font-face{font-family:'Inter';src:url('/assets/fonts/inter-latin-400-normal.woff2') format('woff2');font-weight:400;font-style:normal;font-display:block}
@font-face{font-family:'Inter';src:url('/assets/fonts/inter-latin-600-normal.woff2') format('woff2');font-weight:600;font-style:normal;font-display:block}

@page{size:A4 landscape;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#463F31}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{html,body{background:${PAPER}}}

.sheet{position:relative;width:297mm;height:210mm;margin:0 auto;overflow:hidden;
  background:${PAPER};page-break-after:always;break-after:page;
  font-family:'Cormorant Garamond',Georgia,serif;color:${INK}}
.sheet:last-child{page-break-after:auto;break-after:auto}
.rc-ground{position:absolute;left:0;top:0;width:297mm;height:210mm}
.rc-ground text{white-space:pre}

/* ── HEAD ─────────────────────────────────────────────────────────────── */
.rc-emblems{position:absolute;left:0;right:0;top:19mm;height:14mm;
  display:flex;align-items:flex-end;justify-content:center;gap:56mm}
.rc-em{display:block;object-fit:contain}
.rc-em-side{height:12.4mm;width:auto;opacity:0.93}
.rc-em-mid{height:14mm;width:auto}
.rc-nation{position:absolute;left:0;right:0;top:34.4mm;text-align:center;
  font-family:'Cinzel',serif;font-size:6.2pt;font-weight:400;letter-spacing:0.26em;
  color:${INK_SOFT};text-transform:uppercase}
.rc-dot{color:${GOLD};padding:0 0.35em}
.rc-inst{position:absolute;left:0;right:0;top:38.8mm;text-align:center;
  font-family:'Cinzel',serif;font-size:12.6pt;font-weight:800;letter-spacing:0.15em;
  color:${GOLD_DEEP};text-transform:uppercase}
.rc-school{position:absolute;left:0;right:0;top:45.8mm;text-align:center;
  font-family:'Cinzel',serif;font-size:9pt;font-weight:700;letter-spacing:0.19em;
  color:${INK};text-transform:uppercase}
.rc-place{position:absolute;left:0;right:0;top:51.2mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:5.8pt;font-weight:400;letter-spacing:0.2em;
  color:${INK_SOFT};text-transform:uppercase}

/* ── TITLE ────────────────────────────────────────────────────────────── */
.rc-titlewrap{position:absolute;left:38mm;right:38mm;top:56.4mm;height:12mm;
  display:flex;align-items:center;justify-content:center;gap:6mm}
.rc-title{margin:0;font-family:'Cinzel',serif;font-size:24pt;font-weight:800;
  letter-spacing:0.085em;color:${GOLD_DEEP};text-transform:uppercase;white-space:nowrap;
  text-shadow:0 0.22mm 0 rgba(255,252,242,0.85),0 -0.1mm 0 rgba(90,66,20,0.3)}
.rc-rule{flex:1;height:1.4mm;position:relative}
.rc-rule::before{content:'';position:absolute;left:0;right:0;top:0.5mm;height:0.28mm;
  background:linear-gradient(90deg,rgba(168,134,63,0) 0%,${GOLD} 45%,${GOLD_DEEP} 100%)}
.rc-rule-r::before{background:linear-gradient(270deg,rgba(168,134,63,0) 0%,${GOLD} 45%,${GOLD_DEEP} 100%)}
.rc-rule::after{content:'';position:absolute;top:0.1mm;width:1.3mm;height:1.3mm;
  background:${GOLD};transform:rotate(45deg)}
.rc-rule-l::after{right:0}
.rc-rule-r::after{left:0}
.rc-subtitle{position:absolute;left:0;right:0;top:69.6mm;text-align:center;
  font-family:'Cinzel',serif;font-size:7.6pt;font-weight:400;letter-spacing:0.3em;
  color:${INK_SOFT};text-transform:uppercase}

/* ── CITATION ─────────────────────────────────────────────────────────── */
.rc-lede{position:absolute;left:0;right:0;top:77.2mm;text-align:center;
  font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;
  font-size:11.4pt;letter-spacing:0.045em;color:${INK_SOFT}}
.rc-name{position:absolute;left:52mm;right:52mm;top:83mm;height:13mm;
  display:flex;align-items:center;justify-content:center;text-align:center;
  font-family:'Cormorant Garamond',serif;font-weight:700;letter-spacing:0.035em;
  color:#241D10;white-space:nowrap;text-shadow:0 0.16mm 0 rgba(255,252,242,0.9)}
.rc-namerule{position:absolute;left:82mm;right:82mm;top:96.6mm;height:2mm;
  display:flex;align-items:center;gap:2.4mm}
.rc-namerule span{flex:1;height:0.28mm;background:linear-gradient(90deg,rgba(168,134,63,0),${GOLD})}
.rc-namerule span:last-child{background:linear-gradient(270deg,rgba(168,134,63,0),${GOLD})}
.rc-namerule i{width:1.5mm;height:1.5mm;background:${GOLD};transform:rotate(45deg)}
.rc-sid{position:absolute;left:0;right:0;top:99.6mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:6pt;font-weight:400;letter-spacing:0.16em;
  color:${INK_SOFT};text-transform:uppercase}
.rc-sid b{font-weight:600;color:${INK};letter-spacing:0.12em}
.rc-body{position:absolute;left:58mm;right:58mm;top:105mm;margin:0;text-align:center;
  font-family:'Cormorant Garamond',serif;font-weight:500;font-size:11.4pt;line-height:1.6;
  letter-spacing:0.012em;color:${INK}}

.rc-award{position:absolute;left:62mm;right:62mm;top:126mm;height:10mm;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.9mm}
.rc-award-k{font-family:'Inter',sans-serif;font-size:5.6pt;font-weight:400;
  letter-spacing:0.34em;color:${GOLD_DEEP};text-transform:uppercase}
.rc-award-v{font-family:'Cinzel',serif;font-size:11pt;font-weight:700;
  letter-spacing:0.07em;color:${INK};text-transform:uppercase;white-space:nowrap}

.rc-ledger{position:absolute;left:48mm;right:48mm;top:137mm;height:8.5mm;
  display:flex;align-items:stretch;justify-content:space-between}
.rc-lg{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:0.8mm;border-left:0.2mm solid rgba(168,134,63,0.4)}
.rc-lg:first-child{border-left:0}
.rc-lg span{font-family:'Inter',sans-serif;font-size:5.2pt;font-weight:400;
  letter-spacing:0.24em;color:${INK_SOFT};text-transform:uppercase}
.rc-lg b{font-family:'Cormorant Garamond',serif;font-size:10pt;font-weight:600;
  letter-spacing:0.02em;color:${INK}}

/* ── SIGNATURES ───────────────────────────────────────────────────────── */
.rc-sig{position:absolute;top:146mm;width:60mm;text-align:center}
.rc-sig-l{left:30mm}
.rc-sig-r{right:30mm}
.rc-sig-ink{display:block;height:9mm;width:auto;max-width:50mm;margin:0 auto -0.6mm;
  object-fit:contain;mix-blend-mode:multiply}
.rc-sig-blank{height:9mm;margin-bottom:-0.6mm}
.rc-sig-line{height:0.3mm;background:linear-gradient(90deg,rgba(122,92,33,0),${GOLD_DEEP} 18%,${GOLD_DEEP} 82%,rgba(122,92,33,0))}
.rc-sig-name{margin-top:1.3mm;font-family:'Cormorant Garamond',serif;font-size:9.4pt;
  font-weight:600;letter-spacing:0.02em;color:${INK}}
.rc-sig-role{margin-top:0.5mm;font-family:'Inter',sans-serif;font-size:5.2pt;font-weight:400;
  letter-spacing:0.19em;color:${INK_SOFT};text-transform:uppercase}

/* ── AUTHENTICATION BAND ──────────────────────────────────────────────── */
.rc-plaque-bg{position:absolute;left:0;top:0;width:100%;height:100%}
.rc-qr{position:absolute;left:34mm;top:164mm;width:26mm;height:28mm}
.rc-qr-cap{position:absolute;left:0;right:0;top:1.5mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:4.5pt;font-weight:600;letter-spacing:0.13em;
  color:${MICRO_INK};text-transform:uppercase}
.rc-qr-img{position:absolute;left:4.2mm;top:4.6mm;width:17.6mm;height:17.6mm}
.rc-qr-img svg{display:block;width:100%;height:100%}
.rc-qr-foot{position:absolute;left:0;right:0;bottom:1.3mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:4.5pt;font-weight:400;letter-spacing:0.13em;
  color:${MICRO_INK};text-transform:uppercase}

.rc-cnwrap{position:absolute;left:64mm;top:169mm;width:62mm;height:18mm}
.rc-cn{display:block;width:100%;height:100%}

.rc-sealwrap{position:absolute;left:129.5mm;top:157mm;width:38mm;height:38mm}
.rc-seal-svg{display:block;width:100%;height:100%;
  filter:drop-shadow(0 0.35mm 0.6mm rgba(64,46,12,0.28))}

.rc-plate{position:absolute;left:171mm;top:164mm;width:92mm;height:28mm}
.rc-plate-head{position:absolute;left:0;right:0;top:1.5mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:4.6pt;font-weight:600;letter-spacing:0.2em;
  color:${MICRO_INK};text-transform:uppercase}
.rc-plate-mark{display:inline-block;margin-right:1.4mm;padding:0.15mm 0.9mm;
  border:0.16mm solid ${GOLD};border-radius:0.5mm;font-weight:600;letter-spacing:0.12em;color:${GOLD_DEEP}}
.rc-plate-grid{position:absolute;left:3.4mm;right:3.4mm;top:5.2mm;
  display:grid;grid-template-columns:1fr 1fr;gap:0.9mm 4mm}
.rc-pf{display:flex;flex-direction:column;gap:0.25mm}
.rc-pf span{font-family:'Inter',sans-serif;font-size:4.1pt;font-weight:400;
  letter-spacing:0.15em;color:${MICRO_INK};text-transform:uppercase}
.rc-pf b{font-family:'Cormorant Garamond',serif;font-size:8.6pt;font-weight:600;
  letter-spacing:0.03em;color:${INK};font-variant-numeric:lining-nums tabular-nums}
.rc-plate-bar{position:absolute;left:3.4mm;top:18.4mm;width:35mm;height:6.5mm}
.rc-plate-bar svg{display:block;width:100%;height:100%}
.rc-plate-url{position:absolute;right:3.4mm;top:19.6mm;
  font-family:'Inter',sans-serif;font-size:4.4pt;font-weight:400;letter-spacing:0.06em;
  color:${MICRO_INK}}
.rc-plate-micro{position:absolute;left:3.4mm;right:3.4mm;bottom:3.1mm;overflow:hidden;
  white-space:nowrap;font-family:'Inter',sans-serif;font-size:0.9pt;font-weight:400;
  letter-spacing:0.34pt;color:${MICRO_INK}}
.rc-plate-void{position:absolute;left:0;right:0;bottom:0.9mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:4.2pt;font-weight:400;letter-spacing:0.12em;
  color:${MICRO_INK};text-transform:uppercase}
</style>
</head><body>
${sheetsHtml}
</body></html>`;
}
