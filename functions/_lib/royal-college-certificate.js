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
// Three metals, not one. A single gold reads as a template; a security
// engraver lays a yellow gold against a red gold against a pale one, and the
// difference between them is most of what makes an engraved border look
// struck rather than printed.
const PAPER = '#F6EFE1';
const PAPER_DEEP = '#EDE2CC';
const GOLD = '#A8863F';        // yellow gold — the working metal
const GOLD_DEEP = '#7A5C21';   // its shadow
const GOLD_PALE = '#D8BC7C';   // pale gold — highlights and counter-lines
const GOLD_RED = '#B0763A';    // red gold — the second metal, for contrast bands
// Crimson and navy, used STRUCTURALLY. The crimson carries a whole band of the
// border and every roundel; the navy is hairlines, bead rules and small
// grounds only. The Founder rejected v1.1's large navy corner blocks and he was
// right — navy at that scale fights the paper. At hairline weight it does the
// opposite: it gives the gold an edge to sit against.
// Crimson is retired at v2.1. It was introduced at v1.3 on the Founder's brief
// for "flashy crimson", and withdrawn on his later reading of the proof: on a
// gold ground it fought the metal rather than accenting it. The sheet now runs
// two inks — gold and navy — plus the paper.
const NAVY = '#1A2338';
const NAVY_SOFT = '#2E3C5C';
const NAVY_DEEP = '#0F1728';   // the border mass at its darkest
const NAVY_RICH = '#22335A';   // and where the light crosses it
const INK = '#2B2417';        // body text
const INK_SOFT = '#5A4E37';
const MICRO_INK = '#8B7440';

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
// ── THE BORDER, AND WHY IT IS THIS DEEP ─────────────────────────────────────
// v1.2 and v1.3 both drew the border as concentric ribbons on cream — a ring of
// pale bands. The Founder's verdict was two out of ten: "I don't like the shapes
// you're putting in the air and the angle of each border of the square… I have
// expected you to design more heavy border certificate, not just the flat one."
//
// That is a correct reading, and the reference he supplied says exactly what is
// missing. A heavy border is not a wider ring of hairlines; it is a SOLID,
// SATURATED, PATTERNED MASS — deep navy carrying a gold Islamic khatam
// tessellation, with the field cut out of it on a large radius so the corner is
// never a right angle. Weight comes from value contrast, not from stroke width,
// and the corner problem disappears when there is no corner.
//
// The mass is drawn as one path — outer rounded rectangle plus inner rounded
// rectangle, filled even-odd — so the head, the foot and the two sides are
// literally the same object. There is no join anywhere on the sheet, which is
// why the depth no longer has to be equal on all four sides: 8mm at the head
// and foot, 11.8mm at the sides, as the landscape proportion wants.
//
// v2.0 ran that mass at twice this depth. The Founder's call was to halve it and
// let the sheet breathe — a narrower band of worked metal against a wide, open,
// lightly patterned field, which is the more confident of the two documents.
//
// The inner edge is set by the type it has to clear: the emblem row starts at
// 21.5mm, the seal ends at 190mm, and the signature block reaches out to 30mm.
//
// Every value below is a distance from the sheet edge, in mm.
export const RC_RULES = {
  edge: 2.0,          // outer gold keyline
  body: 3.4,          // where the gold mass begins
  fieldH: 11.4,       // the mass's inner edge, head and foot — 8mm of metal
  fieldV: 15.2,       // the mass's inner edge, at the two sides — 11.8mm
  fieldR: 8.0,        // and the radius that inner edge turns on
  railH: 6.1,         // horizontal microtext rail, struck on the mass
  railV: 6.1,         // vertical microtext rail
  bossH: 7.4,         // head/foot centre ornament
  bossV: 9.3,         // side medallion — the centre of the side mass
  khatam: 3.9,        // the tessellation's cell — finer, for a finer band
};

// A number inside an RTL sentence is a PROTECTED LEFT-TO-RIGHT SEGMENT. Without
// that protection the bidi algorithm reorders the run at the paragraph's
// direction and "2025 – 2026" prints as "2026 – 2025" — which it did, on every
// Arabic citation in this batch. A reversed academic session is not a
// typographic blemish; it is the certificate stating the wrong years.
//
// U+2066 LRI … U+2069 PDI, the Unicode isolate characters, rather than CSS
// alone: they travel with the text into the PDF, into a copy-paste, and into
// any downstream tool, none of which read our stylesheet.
const LRI = '\u2066'; const PDI = '\u2069';
function ltr(s) { return `${LRI}${s}${PDI}`; }
// Arabic-Indic digits, for numerals set inside Arabic prose. Display only —
// the register keeps the Western form, so nothing machine-readable changes.
function arDigits(s) { return String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]); }

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
function rosette(cx, cy, R, petals, amp, steps = 380) {
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
// SAMPLING DENSITY IS A FILE-SIZE DECISION, and on this sheet it is a large
// one: the guilloche net alone is seven systems of five strands, regenerated
// per certificate and inlined thirteen times into one press file. At 2.6
// points per millimetre the 13-page PDF came out at 103MB. 1.5 puts a point
// every 0.67mm on a curve whose shortest cycle is 37mm — 55 points per cycle,
// smooth past what 600 DPI can resolve — and takes the file to a size a
// printer will accept by email.
// `cycles` is how many times each strand crosses the band over its whole run.
// It defaults to 7, which is what the approved Junior Secondary sheet uses and
// must not change. A long border run needs far more: at 7 cycles over a 287mm
// edge the wave period is 41mm, and the band reads as a few lazy swoops rather
// than as engine-turning. The plate border passes its own value.
function lathe(x, y, len, h, strands, stroke, opacity, vertical = false, cycles = 7) {
  const out = [];
  const steps = Math.max(64, Math.round(len * Math.max(1.5, cycles / 3)));
  for (let s = 0; s < strands; s++) {
    const phase = (s / strands) * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * len;
      const v = (h / 2) * Math.sin((u / len) * Math.PI * 2 * cycles + phase)
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

// The void pantograph. Two screens of the same ink at different rulings: the
// fine one disappears on a photocopier, the coarse one survives, so a copy
// carries the word the original does not show.
function voidPantograph(uid) {
  return `<g opacity="0.5">
    <rect x="${RC_RULES.fieldV}" y="88" width="${W - 2 * RC_RULES.fieldV}" height="34" fill="url(#rcFine${uid})"/>
    <text x="148.5" y="112" font-family="Cinzel, serif" font-size="17" font-weight="800"
      letter-spacing="7" text-anchor="middle" fill="url(#rcCoarse${uid})" opacity="0.55">VOID</text>
  </g>`;
}

// The security thread. Windows: short, frequent and low-contrast. The first cut
// used 2.7 x 5.4mm at 9.4mm centres, which read on the proof as a column of
// pale capsules rather than as a thread surfacing through paper.
function securityThread(x, y0, y1, serial, uid, side) {
  const windows = [];
  const step = 6.2;
  for (let y = y0 + 2.4; y < y1 - 2.4; y += step) {
    windows.push(`<rect x="${(x - 0.72).toFixed(2)}" y="${y.toFixed(2)}" width="1.44" height="2.9" rx="0.28"
      fill="url(#rcThread${uid})" stroke="${GOLD_DEEP}" stroke-width="0.07" opacity="0.6"/>`);
  }
  const micro = `${serial} · SHRS ROYAL COLLEGE · `.repeat(5);
  return `<g>
    <path d="M ${x} ${y0} V ${y1}" stroke="${GOLD_DEEP}" stroke-width="0.5" opacity="0.26"/>
    <path d="M ${x} ${y0} V ${y1}" stroke="url(#rcThread${uid})" stroke-width="0.34" opacity="0.72"/>
    ${windows.join('')}
    <path id="rcThreadT${uid}${side}" d="M ${x + 1.9} ${y1} L ${x + 1.9} ${y0}" fill="none"/>
    <text font-family="Inter, sans-serif" font-size="${(0.85 * PT).toFixed(3)}"
      letter-spacing="${(0.26 * PT).toFixed(3)}" fill="${MICRO_INK}">
      <textPath href="#rcThreadT${uid}${side}" startOffset="0">${esc(micro)}</textPath></text>
  </g>`;
}


// ─────────────────────────────────────────────────────────────────────────────
// THE BORDER MASS
//
// One path, not four runs: the outer rounded rectangle and the inner rounded
// rectangle in a single even-odd fill. The head, the foot and both sides are
// the same object, so nothing meets anything, and the inner edge turns the
// corner on an 11.5mm radius rather than at ninety degrees.
// ─────────────────────────────────────────────────────────────────────────────
function rr(x, y, w, h, r) {
  return `M ${(x + r).toFixed(2)} ${y.toFixed(2)} H ${(x + w - r).toFixed(2)}`
    + ` A ${r} ${r} 0 0 1 ${(x + w).toFixed(2)} ${(y + r).toFixed(2)}`
    + ` V ${(y + h - r).toFixed(2)} A ${r} ${r} 0 0 1 ${(x + w - r).toFixed(2)} ${(y + h).toFixed(2)}`
    + ` H ${(x + r).toFixed(2)} A ${r} ${r} 0 0 1 ${x.toFixed(2)} ${(y + h - r).toFixed(2)}`
    + ` V ${(y + r).toFixed(2)} A ${r} ${r} 0 0 1 ${(x + r).toFixed(2)} ${y.toFixed(2)} Z`;
}

function outerRing(inset, r) {
  return rr(inset, inset, W - 2 * inset, H - 2 * inset, r);
}

function innerRing(dx, dy, r) {
  return rr(RC_RULES.fieldV + dx, RC_RULES.fieldH + dy,
    W - 2 * (RC_RULES.fieldV + dx), H - 2 * (RC_RULES.fieldH + dy), r);
}

function massPath(outInset, outR, inDx, inDy, inR) {
  return `${outerRing(outInset, outR)} ${innerRing(inDx, inDy, inR)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE KHATAM TESSELLATION
//
// The eight-point star of Islamic geometry, {8/3}, on a square lattice, with a
// concentric octagon inside each star and a struck lozenge in every interstice.
// Gold on navy, at hairline weight — this is the layer that makes the mass read
// as worked metal rather than as a printed block of colour.
//
// Emitted as real vector paths, and only for the cells the mass actually
// touches. An SVG <pattern> would be rasterised into the PDF whatever it holds;
// generating 1,500 cells and clipping them would be honest but wasteful.
// ─────────────────────────────────────────────────────────────────────────────
function khatamField() {
  const c = RC_RULES.khatam;
  const R = c * 0.545;
  const idx = [0, 3, 6, 1, 4, 7, 2, 5];
  const star = []; const oct = []; const pip = [];
  const insideMass = (x, y) => (
    x < RC_RULES.fieldV + c || x > W - RC_RULES.fieldV - c
    || y < RC_RULES.fieldH + c || y > H - RC_RULES.fieldH - c);
  for (let gy = 0; gy <= H + c; gy += c) {
    for (let gx = 0; gx <= W + c; gx += c) {
      if (!insideMass(gx, gy)) continue;
      const p = [];
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + Math.PI / 8;
        p.push([gx + R * Math.cos(a), gy + R * Math.sin(a)]);
      }
      star.push(`M${idx.map((i) => `${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)}`).join('L')}Z`);
      const q = p.map(([px, py]) => [gx + (px - gx) * 0.46, gy + (py - gy) * 0.46]);
      oct.push(`M${q.map(([px, py]) => `${px.toFixed(2)} ${py.toFixed(2)}`).join('L')}Z`);
      const h = c * 0.2; const mx = gx + c / 2; const my = gy + c / 2;
      pip.push(`M ${mx.toFixed(2)} ${(my - h).toFixed(2)} L ${(mx + h).toFixed(2)} ${my.toFixed(2)}`
        + ` L ${mx.toFixed(2)} ${(my + h).toFixed(2)} L ${(mx - h).toFixed(2)} ${my.toFixed(2)} Z`);
    }
  }
  return `<path d="${star.join(' ')}" fill="none" stroke="${GOLD_PALE}" stroke-width="0.3" opacity="0.5"
      transform="translate(0.3 0.3)"/>
    <path d="${star.join(' ')}" fill="none" stroke="#5E4415" stroke-width="0.26" opacity="0.72"/>
    <path d="${oct.join(' ')}" fill="none" stroke="#6B4E19" stroke-width="0.15" opacity="0.5"/>
    <path d="${pip.join(' ')}" fill="#5E4415" fill-opacity="0.26"
      stroke="#4A3510" stroke-width="0.12" stroke-opacity="0.6"/>`;
}

// A khatam wash across the open field: the border's own star, at three times
// the scale and a twentieth of the weight. It gives the paper a premium ground
// to sit on without taking any weight off the type — the field stays open, and
// the pattern is there when the sheet is tilted to the light.
function khatamWash() {
  const c = 15.6;
  const R = c * 0.545;
  const idx = [0, 3, 6, 1, 4, 7, 2, 5];
  const star = []; const oct = [];
  for (let gy = RC_RULES.fieldH + 4; gy <= H - RC_RULES.fieldH - 2; gy += c) {
    for (let gx = RC_RULES.fieldV + 4; gx <= W - RC_RULES.fieldV - 2; gx += c) {
      const p = [];
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + Math.PI / 8;
        p.push([gx + R * Math.cos(a), gy + R * Math.sin(a)]);
      }
      star.push(`M${idx.map((i) => `${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)}`).join('L')}Z`);
      const q = p.map(([px, py]) => [gx + (px - gx) * 0.44, gy + (py - gy) * 0.44]);
      oct.push(`M${q.map(([px, py]) => `${px.toFixed(2)} ${py.toFixed(2)}`).join('L')}Z`);
    }
  }
  return `<g opacity="0.16">
    <path d="${star.join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.1"/>
    <path d="${oct.join(' ')}" fill="none" stroke="${GOLD_DEEP}" stroke-width="0.08"/>
  </g>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE LOBED MEDALLION
//
// Twelve lobes, gold rim, crimson ground, a gold rosette engraved on the
// crimson, a navy pip. Struck on the mass at the centre of each side, and in a
// smaller size at the head and foot — the rhythm the reference uses to stop a
// long run of pattern from reading as wallpaper.
// ─────────────────────────────────────────────────────────────────────────────
function lobedMedallion(cx, cy, R, uid, lobes = 12) {
  // A closed run of quadratics through the twelve vertices, each bowed out.
  const path = [];
  for (let k = 0; k <= lobes; k++) {
    const a = (k / lobes) * Math.PI * 2 - Math.PI / 2;
    const x = cx + R * 0.84 * Math.cos(a); const y = cy + R * 0.84 * Math.sin(a);
    if (k === 0) { path.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`); continue; }
    const am = a - Math.PI / lobes;
    const mx = cx + R * 1.14 * Math.cos(am); const my = cy + R * 1.14 * Math.sin(am);
    path.push(`Q ${mx.toFixed(2)} ${my.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  path.push('Z');
  return `<g>
    <path d="${path.join(' ')}" fill="url(#rcFoilD${uid})" stroke="${NAVY_DEEP}" stroke-width="0.3"/>
    <circle cx="${cx}" cy="${cy}" r="${(R * 0.78).toFixed(2)}" fill="none" stroke="${NAVY}" stroke-width="0.16" opacity="0.7"/>
    <circle cx="${cx}" cy="${cy}" r="${(R * 0.7).toFixed(2)}" fill="${NAVY_DEEP}"/>
    <circle cx="${cx}" cy="${cy}" r="${(R * 0.7).toFixed(2)}" fill="none" stroke="${GOLD_PALE}" stroke-width="0.3"/>
    <g opacity="0.95">${medallion(cx, cy, R * 0.09, 0.13, 1, '#F0DDAC')}</g>
    <circle cx="${cx}" cy="${cy}" r="${(R * 0.14).toFixed(2)}" fill="${NAVY_DEEP}"/>
    <circle cx="${cx}" cy="${cy}" r="${(R * 0.14).toFixed(2)}" fill="none" stroke="${GOLD_PALE}" stroke-width="0.16"/>
  </g>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE CORNER JEWEL
//
// Two earlier cuts of this were freehand: first a radiating palm spray, then a
// bezier vine. Both read as crude — drawn ornament that is nearly right is
// worse than no ornament at all, and neither belonged to the geometry of the
// border it sat against.
//
// So the corner takes the border's own language instead: the same eight-point
// khatam star, struck as a jewel where the gold fillet turns its radius, with a
// crimson boss at the centre and a pendant of three diminishing lozenges
// trailing inward on the diagonal. It is disciplined, it repeats a motif the
// eye has already learned from the mass, and it is drawn from a construction
// rather than by hand.
// ─────────────────────────────────────────────────────────────────────────────
function khatamStar(cx, cy, R, rot = 0) {
  const idx = [0, 3, 6, 1, 4, 7, 2, 5];
  const p = [];
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + rot;
    p.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
  }
  return `M${idx.map((i) => `${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)}`).join('L')}Z`;
}

function cornerJewel(cx, cy, dx, dy, uid) {
  const R = 4.1;
  const u = Math.SQRT1_2;
  const pend = [[7.4, 1.2], [10.8, 0.85], [13.6, 0.56]].map(([d, r]) => {
    const px = cx + dx * d * u; const py = cy + dy * d * u;
    return `<path d="M ${px.toFixed(2)} ${(py - r).toFixed(2)} L ${(px + r).toFixed(2)} ${py.toFixed(2)}`
      + ` L ${px.toFixed(2)} ${(py + r).toFixed(2)} L ${(px - r).toFixed(2)} ${py.toFixed(2)} Z"
      fill="none" stroke="${GOLD}" stroke-width="0.17" opacity="0.85"/>`
      + `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${(r * 0.3).toFixed(2)}"
      fill="${NAVY}" opacity="0.7"/>`;
  }).join('');
  return `<g>
    <path d="${khatamStar(cx, cy, R, Math.PI / 8)}" fill="url(#rcFoilD${uid})"
      stroke="${NAVY_DEEP}" stroke-width="0.26"/>
    <path d="${khatamStar(cx, cy, R * 0.72, 0)}" fill="none" stroke="${GOLD_PALE}"
      stroke-width="0.15" opacity="0.9"/>
    <circle cx="${cx}" cy="${cy}" r="${(R * 0.38).toFixed(2)}" fill="${NAVY_DEEP}"/>
    <circle cx="${cx}" cy="${cy}" r="${(R * 0.38).toFixed(2)}" fill="none"
      stroke="${GOLD_PALE}" stroke-width="0.18"/>
    <circle cx="${cx}" cy="${cy}" r="${(R * 0.13).toFixed(2)}" fill="${GOLD_PALE}"/>
    ${pend}
  </g>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE SECURITY PLATE BORDER — Senior Secondary
//
// This is the Founder's own artwork, rebuilt. His instruction was that the
// border is not to be redesigned: it may only be brought up to press
// resolution, either by upscaling the file or by drawing it again so that the
// result reads as an upgrade of the same plate.
//
// Upscaling is not available. The supplied file is 1080 x 708 px. Laid on a
// 297mm sheet that is 92 DPI, and 300 DPI needs a 3.25x enlargement —
// enlargement cannot invent the hairline filigree or the microtext, so the
// ornament would come back soft and the microtext would print as grey mush.
// A soft border on a certificate does not read as a large photograph; it reads
// as a photocopy, which is the one impression this document must never give.
// So this takes the second route he authorised, and draws the same plate as
// true vector — sharp at 300 DPI, at 600, at any size.
//
// The geometry is MEASURED off his artwork rather than invented. Scanning a
// clear column of the supplied file (clear of the corner block and of the
// centre medallion) gives the depth of every band from the sheet edge, and
// those measurements are the PLATE table below. The earlier cut of this file
// did not do that: it read the artwork as a mood and drew a different border,
// which is the substitution the Founder rejected. Every number here can be
// re-derived from the file; none of it is taste.
//
// The plate, edge inwards, is: a gold rule at the trim; a microtext rail on
// bare paper; a gold rule; a broad engine-turned band; the heavy gold frame
// rule; a navy counter-rule. Four stepped corner brackets in navy and gold sit
// on top of it, carrying a girih lattice, and a gold khatam medallion straddles
// the frame at the middle of each run.
//
// What is NOT reproduced, and why: the artwork's own lettering names the
// School of Islamic & Arabic Studies, and carries specimen numbers
// (SHRS-IBT-2025-0000001, 4X78-9K2M-P6QZ) and the domain verify.shrschools.ng.
// This is a Royal College award, its numbers are real, and its domain is
// shroyalschools.com. The plate is his; the words are this document's own.
// ─────────────────────────────────────────────────────────────────────────────

// Depths in mm from the sheet edge. Measured off the supplied artwork at
// 3.636 px/mm (1080 px across a 297mm sheet).
const PLATE = {
  trim: 1.5,                    // gold rule at the trim edge
  railT: 2.2, railB: 4.5,       // microtext rail — bare paper, engraved caps
  bandT: 5.0, bandB: 9.6,       // engine-turned band
  frame: 10.2,                  // the heavy gold frame rule
  counter: 11.5,                // navy counter-rule inside it
  corner: 5.0,                  // outer edge of the corner brackets
  reach: 34.0,                  // how far each bracket arm runs
  arm: 4.5,                     // bracket thickness along the arm
};

// One stepped Moorish shoulder, in sheet coordinates for the top-left corner.
// The staircase is symmetric about the 45-degree diagonal, which is what lets
// the same path serve all four corners under a reflection and is why this
// border needs no corner patch — the fault the Founder called "patched" in the
// first design round.
function plateBracketPath() {
  const { corner: o, reach: r, arm } = PLATE;
  const step = [[o + arm, r], [o + arm, 27], [15, 27], [15, 21.5], [21.5, 21.5],
    [21.5, 15], [27, 15], [27, o + arm], [r, o + arm]];
  return `M ${r} ${o} L ${o} ${o} L ${o} ${r} `
    + step.map(([x, y]) => `L ${x} ${y}`).join(' ') + ' Z';
}

// The four corner transforms. The top-left path is authored once; the other
// three are reflections of it, so they cannot drift out of agreement.
const PLATE_CORNERS = [
  '', `translate(${W} 0) scale(-1 1)`, `translate(0 ${H}) scale(1 -1)`,
  `translate(${W} ${H}) scale(-1 -1)`,
];

function plateBracket(uid, i) {
  const d = plateBracketPath();
  const { corner: o, reach: r } = PLATE;
  // The girih that fills the shoulder. Real paths on a square lattice, clipped
  // to the bracket — NOT an SVG <pattern> fill, which the PDF writer rasterises
  // whatever it contains and which is what put an earlier press proof at 102 MB.
  //
  // Three registers, because ONE register is wallpaper. A first cut of this
  // drew a single grid of identical stars at a 5.5mm pitch, and the proof came
  // back reading as tiled bathroom tile — the "looks like template" the Founder
  // has rejected twice. Real girih is an interlace: a primary star at each cell
  // centre, a smaller secondary star on each lattice node between them, and
  // strapwork tying the two together so the eye reads one continuous ribbon
  // rather than repeated units. At a 3.1mm pitch the whole shoulder carries
  // roughly ninety intersecting figures, which is the density of the artwork.
  const cells = [];
  const CELL = 3.1;
  for (let x = o - CELL; x < r + CELL; x += CELL) {
    for (let y = o - CELL; y < r + CELL; y += CELL) {
      const cx = x + CELL / 2, cy = y + CELL / 2;
      cells.push(`<path d="${khatamStar(cx, cy, CELL * 0.47, Math.PI / 8)}"
        fill="none" stroke="${GOLD_PALE}" stroke-width="0.13" opacity="0.9"/>`);
      cells.push(`<path d="${khatamStar(x, y, CELL * 0.24, 0)}"
        fill="none" stroke="${GOLD}" stroke-width="0.1" opacity="0.75"/>`);
      // Strapwork: the diagonals that carry the eye from one figure to the next.
      cells.push(`<path d="M ${x} ${cy} L ${cx} ${y} M ${cx} ${y + CELL} L ${x + CELL} ${cy}"
        fill="none" stroke="${GOLD_PALE}" stroke-width="0.08" opacity="0.5"/>`);
    }
  }
  return `<g transform="${PLATE_CORNERS[i]}">
    <clipPath id="rcBrk${uid}${i}"><path d="${d}"/></clipPath>
    <path d="${d}" fill="url(#rcNavyG${uid})"/>
    <g clip-path="url(#rcBrk${uid}${i})">${cells.join('')}</g>
    <path d="${d}" fill="none" stroke="url(#rcFoil)" stroke-width="0.75"/>
    <path d="${d}" fill="none" stroke="${GOLD_PALE}" stroke-width="0.16" opacity="0.7"/>
  </g>`;
  // No finial closes the arm. An earlier cut set a gold star just past each
  // arm's end, and on the proof the two stars sat on the guilloche band with
  // the lathe strands running visibly through them — an ornament floating on
  // top of another feature rather than resolving it. The house rule this file
  // already records applies: ornament that is nearly right is worse than none.
  // The arms simply end, which is what the artwork does.
}

function plateBorder(uid, serial) {
  // The ornament is no longer drawn here. It is the Founder's own plate,
  // built by scripts/build-plate-border.py and laid in as
  // assets/images/certificates/ss-border-plate.png behind this SVG.
  //
  // Everything this function used to draw — corner brackets, girih, guilloche
  // band, frame rules, medallions — was a redraw, and a redraw of a locked
  // masterwork is a different border no matter how carefully it is measured.
  // The Founder rejected two of them and was right both times. What remains
  // here is the one thing the plate cannot carry: the microtext rail, which on
  // his artwork names another school and quotes specimen numbers, and which
  // has to say this document's own name and this document's own serial.
  //
  // The plate's rail is knocked back to bare paper at build time, so this text
  // lands on clean stock in exactly the channel the artwork reserves for it.
  const P = PLATE;
  const s = esc(serial);
  const railFs = (0.9 * PT).toFixed(3);
  const hText = ('SULTAN HANAFI ROYAL SCHOOLS · SULTAN HANAFI ROYAL COLLEGE · '
    + `CERTIFICATE OF AUTHENTICITY · VERIFIED ACADEMIC CREDENTIAL · ${s} · `).repeat(4);
  const vText = (`SULTAN HANAFI ROYAL COLLEGE · SENIOR SECONDARY · ${s} · `).repeat(6);
  const railY = ((P.railT + P.railB) / 2 + 0.32).toFixed(2);
  const rail = (transform) => `<text transform="${transform}" font-family="Cinzel, serif"
    font-size="${railFs}" letter-spacing="${(0.3 * PT).toFixed(3)}" fill="${INK}"
    text-anchor="middle" opacity="0.88">`;
  return `
  ${rail(`translate(${W / 2} ${railY})`)}${hText}</text>
  ${rail(`translate(${W / 2} ${(H - +railY + 0.64).toFixed(2)})`)}${hText}</text>
  ${rail(`translate(${railY} ${H / 2}) rotate(-90)`)}${vText}</text>
  ${rail(`translate(${(W - +railY + 0.64).toFixed(2)} ${H / 2}) rotate(90)`)}${vText}</text>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPEN SECURITY FIELD — Senior Secondary, borderless
//
// The Founder's ruling is that the sheet carries no border body at all. That
// removes the thing most certificates lean on for authority, so the security
// has to carry the document instead — which is the right way round anyway.
// A heavy border is decoration a copier reproduces perfectly. Everything below
// is a feature that BEHAVES: it fails, or changes, or disappears when the sheet
// is copied, scanned, or altered.
//
// THE RULE THIS FILE KEEPS, AND WHY IT MATTERS MORE HERE THAN ANYWHERE ELSE
// Nothing on this sheet is a PICTURE of a security feature. No printed
// rectangle captioned "hologram", no rainbow patch, no "security fibre window",
// no badge reading GENUINE. Those were on the specimen artwork and they are
// deliberately absent. A verifier who tilts a printed hologram and sees nothing
// move has learned that this institution prints imitations, and every real
// feature on the sheet loses its authority at the same moment. The Founder
// asked for the most trusted certificate in the world; the trusted ones are
// trusted because every mark on them survives being tested.
//
// WHAT IS HERE, AND WHAT EACH ONE ACTUALLY DOES
//   Guilloche net        Interference curves. A scan-and-reprint loses the fine
//                        strands first and the net visibly coarsens.
//   Iris rails           Split-fountain printing: one ink unit, two inks blended
//                        across the run. A copier separates to CMYK and cannot
//                        rebuild the blend; a desktop printer bands it.
//   Void pantograph      Two screens at different rulings. The fine screen drops
//                        out on a photocopier and VOID appears in the copy.
//   Latent panel         Two line screens at 45 degrees to each other. Flat on,
//                        it is a grey panel; at a raking angle the word steps
//                        forward. Survives no copier.
//   Anti-scan screen     A ruling chosen to beat against common scanner sampling
//                        and throw moiré into any reproduction.
//   Microtext, 3 scales  0.9pt and 1.2pt. Below the resolution of every office
//                        copier; reads cleanly under a x10 loupe.
//   UV motifs            Printed in ink near-invisible in daylight, fluorescing
//                        at 365nm. Shown pale here so the press knows where they
//                        go; the ink swaps at plate-making.
//   Security threads     Serialised, running the full height of the sheet.
//   Fibres               Deterministic from the serial, so a reissue that
//                        differs is a reissue that can be spotted.
//   Serial repetition    The certificate number appears eleven times, in
//                        microtext, in the threads, in the cartouche, in the QR
//                        payload and in the archive barcode. Altering one is
//                        visible against the other ten.
//
// The glow the Founder asked for is the iris and the guilloche doing their
// work, not an effect laid over the top. On press these are metallic and
// pearlescent inks; on screen they read as light moving across the sheet.
// ─────────────────────────────────────────────────────────────────────────────
function openSecurityField(uid, serial, prog = {}) {
  const s = esc(serial);
  const ACC = prog.accent || GOLD_DEEP;
  const out = [];

  // ── The guilloche net, full bleed ──────────────────────────────────────────
  // Rosettes on a staggered lattice, three sizes, so the density varies across
  // the sheet the way an engine-turned plate does. A regular grid would read as
  // wallpaper; the offset rows are what make it a net.
  const net = [];
  for (let row = 0, y = 6; y < H; y += 21, row++) {
    for (let x = (row % 2 ? 16.5 : 6); x < W; x += 33) {
      const k = (row + Math.round(x)) % 3;
      net.push(`<path d="${rosette(x, y, [9.5, 7.2, 11.4][k], [11, 9, 13][k], [1.25, 1.0, 1.45][k])}"
        fill="none" stroke="${GOLD_DEEP}" stroke-width="0.055"/>`);
    }
  }
  out.push(`<g opacity="${prog.accent ? 0.28 : 0.2}">${net.join('')}</g>`);

  // ── Iris rails ─────────────────────────────────────────────────────────────
  // Head and foot, gold running to navy through a warm middle. Split-fountain
  // is one of the few features that is cheap to print and genuinely hard to
  // reproduce, because the blend is made by the press, not by the file.
  out.push(`<g opacity="0.5">
    <rect x="0" y="7.5" width="${W}" height="3.4" fill="url(#rcIrisRail${uid})"/>
    <rect x="0" y="${H - 10.9}" width="${W}" height="3.4" fill="url(#rcIrisRail${uid})"/>
    ${prog.accent ? `<rect x="0" y="7.5" width="${W}" height="3.4" fill="${ACC}" opacity="0.42"/>
    <rect x="0" y="${H - 10.9}" width="${W}" height="3.4" fill="${ACC}" opacity="0.42"/>` : ''}
  </g>
  <g opacity="0.42">
    ${lathe(0, 9.2, W, 3.0, 14, 0.05, 1, false, 58)}
    ${lathe(0, H - 9.2, W, 3.0, 14, 0.05, 1, false, 58)}
  </g>`);

  // ── The latent panel ───────────────────────────────────────────────────────
  // Two screens crossing at 45 degrees, with SHRS knocked through one of them.
  // Flat on it is an even grey; at a raking angle one screen catches the light
  // and the word lifts out of the other. This is an intaglio effect and it is
  // specified as intaglio on the press sheet — printed flat it is only a panel.
  const lat = [];
  for (let i = 0; i < 46; i++) {
    lat.push(`<path d="M ${118 + i * 0.62} 186.4 L ${118 + i * 0.62 + 3.2} 183.2"
      stroke="${GOLD_DEEP}" stroke-width="0.09"/>`);
  }
  out.push(`<g opacity="0.3">
    <clipPath id="rcLat${uid}"><rect x="118" y="183.2" width="28.5" height="3.2"/></clipPath>
    <g clip-path="url(#rcLat${uid})">${lat.join('')}</g>
    <text x="132.2" y="185.9" font-family="Cinzel, serif" font-size="${(3.4 * PT).toFixed(2)}"
      font-weight="700" letter-spacing="${(0.9 * PT).toFixed(2)}" fill="${PAPER}"
      text-anchor="middle">SHRS</text>
  </g>`);

  // ── Anti-scan screen ───────────────────────────────────────────────────────
  // A 0.31mm ruling across the citation block. It prints as a flat tint and
  // beats against the sampling grid of a flatbed scanner, so a scan carries
  // moiré banding the original does not have.
  const scan = [];
  for (let y = 88; y < 132; y += 0.31) {
    scan.push(`M 40 ${y.toFixed(2)} H 257`);
  }
  out.push(`<path d="${scan.join(' ')}" stroke="${GOLD_DEEP}" stroke-width="0.026" opacity="0.3"/>`);

  // ── Microtext rules, three scales ──────────────────────────────────────────
  // These replace the border as the thing that frames the page. At 0.9pt the
  // rule reads as a hairline at arm's length and as a sentence under a loupe,
  // which is exactly the test a registrar is trained to make.
  const micro = (y, fs, txt, op) => `<text x="${W / 2}" y="${y}" font-family="Cinzel, serif"
    font-size="${(fs * PT).toFixed(3)}" letter-spacing="${(0.3 * PT).toFixed(3)}"
    fill="${MICRO_INK}" text-anchor="middle" opacity="${op}">${txt}</text>`;
  const line1 = `SULTAN HANAFI ROYAL SCHOOLS · SULTAN HANAFI ROYAL COLLEGE · OFFICE OF THE REGISTRAR · ${s} · `;
  const line2 = `CERTIFICATE OF AUTHENTICITY · VERIFIED ACADEMIC CREDENTIAL · ${s} · `;
  out.push(micro(5.6, 1.2, esc(line1.repeat(3)), 0.8));
  out.push(micro(13.6, 0.9, esc(line2.repeat(4)), 0.72));
  out.push(micro(H - 13.2, 0.9, esc(line2.repeat(4)), 0.72));
  out.push(micro(H - 5.2, 1.2, esc(line1.repeat(3)), 0.8));
  // Vertical, at both trims.
  out.push(`<text transform="translate(5.4 ${H / 2}) rotate(-90)" font-family="Cinzel, serif"
    font-size="${(0.9 * PT).toFixed(3)}" letter-spacing="${(0.3 * PT).toFixed(3)}"
    fill="${MICRO_INK}" text-anchor="middle" opacity="0.7">${esc(line2.repeat(3))}</text>
  <text transform="translate(${W - 5.4} ${H / 2}) rotate(90)" font-family="Cinzel, serif"
    font-size="${(0.9 * PT).toFixed(3)}" letter-spacing="${(0.3 * PT).toFixed(3)}"
    fill="${MICRO_INK}" text-anchor="middle" opacity="0.7">${esc(line2.repeat(3))}</text>`);

  // ── UV cluster ─────────────────────────────────────────────────────────────
  out.push(`<g opacity="0.85">${[[26, 40], [271, 40], [26, 170], [271, 170],
    [148.5, 32], [148.5, 178], [64, 150], [233, 150]]
    .map(([x, y]) => uvMotif(x, y, 3.0)).join('')}</g>`);

  // ── The ceremonial register ────────────────────────────────────────────────
  // Everything above is a security feature that happens to be beautiful. This
  // is the one layer that is there for ceremony, and it is still generated
  // rather than drawn: corner fans and a wreath, both built from the same
  // rosette engine as the guilloche, at a scale the eye reads as ornament.
  //
  // Generated, not freehand, for a reason this file has learned twice. Two
  // earlier certificates carried hand-drawn ornament — a palm spray, then a
  // bezier vine — and both read as crude at print size and had to come out.
  // A figure from a parametric curve is either right or obviously wrong; a
  // freehand one is usually nearly right, and nearly right is worse than none.
  const fans = [];
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]]) {
    const arcs = [];
    for (let r = 15; r <= 41; r += 3.25) {
      arcs.push(`<path d="M ${r} 0 A ${r} ${r} 0 0 1 0 ${r}" fill="none"
        stroke="${ACC}" stroke-width="${(0.16 - (r - 15) * 0.0022).toFixed(3)}"/>`);
    }
    // The ribs that turn a set of arcs into a fan.
    for (let i = 1; i < 9; i++) {
      const a = (i / 9) * (Math.PI / 2);
      arcs.push(`<path d="M ${(15 * Math.cos(a)).toFixed(2)} ${(15 * Math.sin(a)).toFixed(2)}
        L ${(41 * Math.cos(a)).toFixed(2)} ${(41 * Math.sin(a)).toFixed(2)}"
        stroke="${ACC}" stroke-width="0.08"/>`);
    }
    arcs.push(`<path d="${rosette(26, 26, 6.4, 9, 1.05)}" fill="none"
      stroke="${ACC}" stroke-width="0.13"/>`);
    fans.push(`<g transform="translate(${cx} ${cy}) scale(${sx} ${sy})">${arcs.join('')}</g>`);
  }
  out.push(`<g opacity="${prog.accent ? 0.55 : 0.3}">${fans.join('')}</g>`);

  // The wreath behind the recipient's name — twenty-four rosettes on a ring,
  // which is a laurel at reading distance and a guilloche under a loupe.
  const wreath = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    wreath.push(`<path d="${rosette(148.5 + 46 * Math.cos(a), 96 + 21 * Math.sin(a), 4.2, 7, 0.8)}"
      fill="none" stroke="${ACC}" stroke-width="0.075"/>`);
  }
  out.push(`<g opacity="${prog.accent ? 0.4 : 0.22}">${wreath.join('')}</g>`);

  return out.join('\n  ');
}

// ─────────────────────────────────────────────────────────────────────────────
// THE GROUND
// ─────────────────────────────────────────────────────────────────────────────
function groundSvg(serial, uid, style = 'ring', groundProg = {}) {
  // The Qur’an College sheet has a ground already: the Founder's own artwork,
  // supplied whole with the instruction not to tweak it. Painting a guilloche
  // net, an iris rail and a microtext wash over it would be tweaking it — so
  // this returns nothing and the artwork is the ground. The security work does
  // not disappear; it moves into the furniture, where it is on OUR ink and can
  // be read, decoded and checked. See the note on RC_PROGRAMMES.QUR.
  if (style === 'quran') return '';
  const s = esc(serial);
  const R = RC_RULES;
  const vText = `SULTAN HANAFI ROYAL COLLEGE · JUNIOR SECONDARY GRADUATION · ${s} · `;
  const vReps = Math.ceil(150 / (vText.length * 1.38)) + 1;
  const hText = `SULTAN HANAFI ROYAL SCHOOLS · SULTAN HANAFI ROYAL COLLEGE · CERTIFICATE OF AUTHENTICITY · VERIFIED ACADEMIC CREDENTIAL · ${s} · `;
  const hReps = Math.ceil(285 / (hText.length * 1.42)) + 1;
  const microFs = (0.9 * PT).toFixed(3);
  const microTrack = (0.34 * PT).toFixed(3);
  // The mass, as a single even-odd path, and the same shape inset by 1.6mm so
  // the tessellation never runs into the fillets.
  const MASS = massPath(R.body, 4.2, 0, 0, R.fieldR);
  const MASS_IN = massPath(R.body + 1.7, 3.4, -1.6, -1.6, R.fieldR + 1.2);
  // The corner jewel sits on the 45-degree point of the inner edge's radius.
  const JX = R.fieldV + R.fieldR - R.fieldR * Math.SQRT1_2;
  const JY = R.fieldH + R.fieldR - R.fieldR * Math.SQRT1_2;

  return `<svg class="rc-ground" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Three metals. The flat gradient is the working gold; the deep one is
         what a struck cartouche looks like when the light crosses it. -->
    <linearGradient id="rcFoil" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0" stop-color="#8A6A2A"/><stop offset="0.18" stop-color="#E4C982"/>
      <stop offset="0.34" stop-color="#9A7A32"/><stop offset="0.52" stop-color="#F0DCA6"/>
      <stop offset="0.7" stop-color="#96762F"/><stop offset="0.86" stop-color="#DEC27B"/>
      <stop offset="1" stop-color="#7E6027"/>
    </linearGradient>
    <!-- The split-fountain rail. Two inks blended by the press across the
         run — a copier separates to CMYK and cannot rebuild the blend. -->
    <linearGradient id="rcIrisRail${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8A6A2A"/><stop offset="0.14" stop-color="#D8BC7C"/>
      <stop offset="0.3" stop-color="#B0763A"/><stop offset="0.46" stop-color="#E4C982"/>
      <stop offset="0.58" stop-color="#2E3C5C"/><stop offset="0.72" stop-color="#22335A"/>
      <stop offset="0.86" stop-color="#C9A45C"/><stop offset="1" stop-color="#7A5C21"/>
    </linearGradient>
    <linearGradient id="rcFoilD${uid}" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#F2E0AE"/><stop offset="0.22" stop-color="#C9A45C"/>
      <stop offset="0.5" stop-color="#B0763A"/><stop offset="0.74" stop-color="#E0C384"/>
      <stop offset="1" stop-color="#7A5C21"/>
    </linearGradient>
    <!-- The bands are ribbons, not lines on paper: each carries its own ground
         so it reads as a body of colour with the lathe engraved into it. -->
    <linearGradient id="rcCrimsonGround${uid}" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#E7C3BC"/><stop offset="0.42" stop-color="#F4DED6"/>
      <stop offset="1" stop-color="#DCB2AA"/>
    </linearGradient>
    <linearGradient id="rcGoldGround${uid}" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0" stop-color="#EEDFBB"/><stop offset="0.45" stop-color="#F8EFD6"/>
      <stop offset="1" stop-color="#E4CE9E"/>
    </linearGradient>
    <radialGradient id="rcRoundel${uid}" cx="0.36" cy="0.3" r="0.85">
      <stop offset="0" stop-color="#C2515D" stop-opacity="0.85"/>
      <stop offset="0.55" stop-color="#9A2432" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#6E1520" stop-opacity="0.75"/>
    </radialGradient>
    <linearGradient id="rcThread${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C9A96A"/><stop offset="0.28" stop-color="#F0DFB2"/>
      <stop offset="0.58" stop-color="#A98446"/><stop offset="1" stop-color="#E2C98F"/>
    </linearGradient>
    <linearGradient id="rcIris${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#B8933F" stop-opacity="0"/>
      <stop offset="0.2" stop-color="#B8933F" stop-opacity="0.20"/>
      <stop offset="0.5" stop-color="#9A2432" stop-opacity="0.15"/>
      <stop offset="0.8" stop-color="#B8933F" stop-opacity="0.20"/>
      <stop offset="1" stop-color="#B8933F" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="rcIrisFade${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000"/><stop offset="0.28" stop-color="#fff"/>
      <stop offset="0.72" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
    </linearGradient>
    <mask id="rcIrisMask${uid}"><rect x="0" y="54" width="${W}" height="26" fill="url(#rcIrisFade${uid})"/></mask>
    <radialGradient id="rcVignette${uid}" cx="0.5" cy="0.44" r="0.8">
      <stop offset="0" stop-color="#FFFCF4" stop-opacity="0.92"/>
      <stop offset="0.58" stop-color="${PAPER}" stop-opacity="0"/>
      <stop offset="1" stop-color="#D8C9AC" stop-opacity="0.46"/>
    </radialGradient>
    <pattern id="rcFine${uid}" width="0.34" height="0.34" patternUnits="userSpaceOnUse" patternTransform="rotate(52)">
      <rect width="0.34" height="0.1" fill="${GOLD_DEEP}" opacity="0.13"/></pattern>
    <pattern id="rcCoarse${uid}" width="0.9" height="0.9" patternUnits="userSpaceOnUse" patternTransform="rotate(52)">
      <rect width="0.9" height="0.3" fill="${GOLD_DEEP}" opacity="0.13"/></pattern>
    <linearGradient id="rcNavyG${uid}" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${NAVY_RICH}"/><stop offset="0.45" stop-color="${NAVY}"/>
      <stop offset="1" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
    <linearGradient id="rcMass${uid}" x1="0" y1="0" x2="0.62" y2="1">
      <stop offset="0" stop-color="#8A6A28"/><stop offset="0.09" stop-color="#E7CE8C"/>
      <stop offset="0.2" stop-color="#B08F45"/><stop offset="0.32" stop-color="#F3E3B4"/>
      <stop offset="0.44" stop-color="#A6842F"/><stop offset="0.57" stop-color="#EBD59A"/>
      <stop offset="0.7" stop-color="#9C7B2C"/><stop offset="0.84" stop-color="#E2C583"/>
      <stop offset="1" stop-color="#7E6027"/>
    </linearGradient>
    <linearGradient id="rcMassSheen${uid}" x1="0" y1="0" x2="1" y2="0.55">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/>
      <stop offset="0.34" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="0.66" stop-color="#FFF8E4" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#4A3510" stop-opacity="0.18"/>
    </linearGradient>
    <clipPath id="rcMassClip${uid}"><path d="${MASS_IN}" clip-rule="evenodd"/></clipPath>
    <path id="rcRailT${uid}" d="M 10 ${R.railH} H 287"/>
    <path id="rcRailB${uid}" d="M 10 ${H - R.railH} H 287"/>
    <path id="rcRailL${uid}" d="M ${R.railV} ${H - 10} L ${R.railV} 10"/>
    <path id="rcRailR${uid}" d="M ${W - R.railV} 10 L ${W - R.railV} ${H - 10}"/>
  </defs>

  <!-- Paper. Flat vector: exact at any resolution. -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#rcVignette${uid})"/>

  <!-- ── THE GUILLOCHE NET ────────────────────────────────────────────────────
       Gold systems crossing the whole field, with a crimson counter-system
       under them. Two inks in the ground, not one: the crimson is what a
       colour copier reproduces as a muddy brown and a scanner loses first. -->
  <g opacity="0.24">
    ${lathe(28, 52, 241, 7.2, 5, 0.075, 0.55)}
    ${lathe(28, 78, 241, 9.0, 5, 0.075, 0.5)}
    ${lathe(28, 104, 241, 10.4, 5, 0.075, 0.44)}
    ${lathe(28, 130, 241, 9.0, 5, 0.075, 0.5)}
    ${lathe(28, 156, 241, 7.2, 5, 0.075, 0.55)}
  </g>
  <g opacity="0.16">
    ${lathe(24, 66, 249, 5.6, 3, 0.07, 1).replace(new RegExp(GOLD_DEEP, 'g'), NAVY_SOFT)}
    ${lathe(24, 143, 249, 5.6, 3, 0.07, 1).replace(new RegExp(GOLD_DEEP, 'g'), NAVY_SOFT)}
  </g>

  ${khatamWash()}

  <!-- Intaglio medallions, gold: one large behind the citation, two flanking. -->
  <g opacity="0.15">${medallion(148.5, 96, 4.4, 0.085, 1)}</g>
  <g opacity="0.1">${medallion(148.5, 96, 2.7, 0.08, 1)}</g>
  <g opacity="0.1">${medallion(62, 104, 1.55, 0.08, 1, NAVY_SOFT)}</g>
  <g opacity="0.1">${medallion(235, 104, 1.55, 0.08, 1, NAVY_SOFT)}</g>

  <rect x="${R.fieldV}" y="54" width="${W - 2 * R.fieldV}" height="26"
    fill="url(#rcIris${uid})" mask="url(#rcIrisMask${uid})"/>

  ${voidPantograph(uid)}

  ${style === 'open' ? openSecurityField(uid, serial, groundProg)
    : style === 'plate' ? plateBorder(uid, serial) : `  <!-- ── THE BORDER MASS ──────────────────────────────────────────────────────
       A saturated navy body carrying a gold khatam tessellation, cut out on an
       11.5mm radius so the field's corner is a curve and not an angle. 16mm at
       the head and foot, 23.5mm at the sides. One path: no joins, no mitres,
       nothing patched over a corner. -->
  <path d="${MASS}" fill-rule="evenodd" fill="url(#rcMass${uid})"/>
  <g clip-path="url(#rcMassClip${uid})">${khatamField()}</g>
  <path d="${MASS}" fill-rule="evenodd" fill="url(#rcMassSheen${uid})"/>

  <!-- Fillets. Gold against navy on both edges of the mass, with a hairline
       counter-line inboard of each and a crimson keyline on the field side. -->
  <path d="${outerRing(R.edge, 3.0)}" fill="none" stroke="${NAVY}" stroke-width="0.5"/>
  <path d="${outerRing(R.body, 4.2)}" fill="none" stroke="${NAVY_DEEP}" stroke-width="0.85"/>
  <path d="${outerRing(R.body + 1.1, 3.6)}" fill="none" stroke="${GOLD_PALE}" stroke-width="0.2" opacity="0.75"/>
  <path d="${innerRing(-2.2, -2.2, R.fieldR + 1.7)}" fill="none" stroke="${GOLD_PALE}" stroke-width="0.2" opacity="0.75"/>
  <path d="${innerRing(-1.2, -1.2, R.fieldR + 0.9)}" fill="none" stroke="${NAVY_DEEP}" stroke-width="0.85"/>
  <path d="${innerRing(0.2, 0.2, R.fieldR - 0.1)}" fill="none" stroke="url(#rcFoil)" stroke-width="1.1"/>
  <path d="${innerRing(1.5, 1.5, R.fieldR - 1.1)}" fill="none" stroke="${NAVY}" stroke-width="0.3" opacity="0.85"/>
  <path d="${innerRing(2.3, 2.3, R.fieldR - 1.8)}" fill="none" stroke="${GOLD_DEEP}" stroke-width="0.12" opacity="0.55"/>

  <!-- Microtext rails, struck on the mass in pale gold. Solid ink, never an
       opacity: an opacity on type this small becomes a screen percentage at
       separation and is the first thing to drop out on press. -->
  <g font-family="Inter, sans-serif" font-weight="400"
     font-size="${microFs}" letter-spacing="${microTrack}" fill="#5E4415">
    <text><textPath href="#rcRailT${uid}" startOffset="0">${esc(hText.repeat(hReps))}</textPath></text>
    <text><textPath href="#rcRailB${uid}" startOffset="0">${esc(hText.repeat(hReps))}</textPath></text>
    <text><textPath href="#rcRailL${uid}" startOffset="0">${esc(vText.repeat(vReps))}</textPath></text>
    <text><textPath href="#rcRailR${uid}" startOffset="0">${esc(vText.repeat(vReps))}</textPath></text>
  </g>

  <!-- Lobed medallions: the two sides at full size, the head and foot smaller.
       They break the run of pattern, and they carry the third ink. -->
  ${lobedMedallion(R.bossV, H / 2, 5.6, uid)}
  ${lobedMedallion(W - R.bossV, H / 2, 5.6, uid)}
  ${lobedMedallion(W / 2, R.bossH, 4.3, uid, 10)}
  ${lobedMedallion(W / 2, H - R.bossH, 4.3, uid, 10)}

  <!-- Corner jewels, struck where the gold fillet turns its radius, each with a
       pendant of three diminishing lozenges trailing in on the diagonal. -->
  ${cornerJewel(JX, JY, 1, 1, uid)}
  ${cornerJewel(W - JX, JY, -1, 1, uid)}
  ${cornerJewel(JX, H - JY, 1, -1, uid)}
  ${cornerJewel(W - JX, H - JY, -1, -1, uid)}

`}

  <!-- Security threads, in the field's quiet margin, symmetric about centre. -->
  ${securityThread(23.6, 44, 134, serial, uid, 'L')}
  ${securityThread(W - 23.6, 44, 134, serial, uid, 'R')}

  ${fibres(serial)}

  ${[[54, 86], [243, 86], [54, 138], [243, 138], [148.5, 42], [148.5, 152]]
    .map(([cx, cy]) => uvMotif(cx, cy)).join('')}
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE INSTITUTIONAL SEAL — the real one
//
// This is assets/images/certificates/official-seal.png, the struck gold seal
// already carried by the v1.0 certificates, at print resolution. It is not a
// drawing of the seal and it is not a new seal: it is the institution's own
// die, and the Founder's instruction is that it stays that way and takes only
// a line of added text.
//
// An earlier cut of this file replaced it with a vector redraw, on a note
// claiming the raster seal named the School of Islamic & Arabic Studies in its
// ring. That note was wrong, and it is worth recording why so the mistake is
// not repeated: the ring naming the School of Islamic & Arabic Studies is on
// the SPECIMEN ARTWORK supplied as the border reference, not on this asset.
// The asset's own ring reads SULTAN HANAFI ROYAL SCHOOLS above and
// مدارس السلطان حنفي الملكية below — the institution, not one of its schools —
// which is exactly right for a Royal College award. A misread of one image
// was allowed to retire the real seal of the institution.
//
// The added text sits BELOW the die, on its own engraved ribbon. Nothing is
// printed over the seal face: overprinting a struck seal is what a forger does
// to repurpose one, and a registrar is trained to look for it.
// ─────────────────────────────────────────────────────────────────────────────
// The ribbon names the ISSUING SCHOOL. It was hardcoded to the Royal College,
// which is correct for JSS and SS and wrong for Primary — and a seal captioned
// with a school that did not issue the award is the kind of internal
// contradiction a registrar reads as a forged document. The school now comes
// from the programme, like every other institutional string on the sheet.
function sealPlate(school, programmeEn) {
  return `<figure class="rc-seal-plate">
    <img class="rc-seal-die" src="/assets/images/certificates/official-seal-print.png"
      alt="Official seal of Sultan Hanafi Royal Schools"/>
    <figcaption class="rc-seal-ribbon">
      <span class="rc-seal-ribbon-t">${esc(school)}</span>
      ${school.toLowerCase().includes(String(programmeEn).toLowerCase()) ? ''
        : `<span class="rc-seal-ribbon-b">${esc(programmeEn)}</span>`}
    </figcaption>
  </figure>`;
}

// Retained for the Junior Secondary sheet, which the Founder has already
// approved and signed off; changing its seal now would alter an approved
// layout. New programmes take sealPlate() above.
function sealSvg(uid, code = 'JSS') {
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
      fill="#F7EBC6" text-anchor="middle" letter-spacing="0.35">${esc(code)}</text>
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
  // THE SYMBOL DECLARES ITS OWN PHYSICAL SIZE. Without width/height in
  // millimetres the SVG is elastic, and whatever box the layout gives it
  // rescales the X-dimension — which is how the archive barcode ended up at an
  // effective 0.214mm and, after that was fixed by widening the slot, how the
  // holder barcode ended up at 0.236mm and failed at 150 DPI in exactly the
  // same way. A slot cannot get this wrong if the symbol is not elastic.
  return `<svg viewBox="0 0 ${x.toFixed(2)} ${height}" width="${x.toFixed(2)}mm" height="${height}mm"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" shape-rendering="crispEdges">${bars.join('')}</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGRAVED PANELS
// One generator, so every panel on the sheet is cut the same way: lathe ground,
// a bevel, and a hairline keyline.
// ─────────────────────────────────────────────────────────────────────────────
// A short engine-turned strip, for the bilingual sheet's citation rule.
// ── THE BILINGUAL PAIR ──────────────────────────────────────────────────────
// One component for every English/Arabic pair on the sheet, so the rule is
// stated once and cannot drift between blocks. The Founder's audit found
// exactly that drift: names paired on one sheet and stacked on another, and
// English sitting above Arabic in one block while Arabic sat above English in
// the next. A shared component makes that class of inconsistency impossible
// rather than merely unlikely.
//
// DEFAULT: side by side on one baseline, English left, Arabic right.
// EXCEPTION: where the pair genuinely cannot fit on one line — the award
// citation, whose English runs to sixty-seven characters — it stacks, and when
// it stacks ARABIC GOES ABOVE. Never the other way.
function biPair(en, ar, cls = '', stacked = false) {
  const a = `<span class="bp-ar" dir="rtl" lang="ar">${esc(ar)}</span>`;
  const e = `<span class="bp-en">${esc(en)}</span>`;
  if (stacked) return `<div class="rc-bipair rc-bipair-stack ${cls}">${a}${e}</div>`;
  return `<div class="rc-bipair ${cls}">${e}<span class="bp-div"><i></i></span>${a}</div>`;
}

function latheStrip(uid) {
  const w = 150; const h = 3.4;
  return `<svg class="rc-lathe-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g opacity="0.72">${lathe(2, h / 2, w - 4, h - 1.2, 5, 0.07, 1, false, 34)}</g>
  <path d="M 0 ${h / 2} H 6" stroke="${GOLD}" stroke-width="0.12" opacity="0.8"/>
  <path d="M ${w - 6} ${h / 2} H ${w}" stroke="${GOLD}" stroke-width="0.12" opacity="0.8"/>
  <path d="M ${w / 2 - 1.1} ${h / 2} l 1.1 -1.1 l 1.1 1.1 l -1.1 1.1 Z" fill="${GOLD}" opacity="0.9"/>
</svg>`;
}

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
function numberCartouche(displayNo, fullSerial, uid, school = 'Sultan Hanafi Royal College') {
  const w = 62; const h = 18;
  // The microtext rail names the ISSUING SCHOOL. It was hardcoded to the
  // Royal College, which put that school's name in microtext on the foot of
  // every Primary certificate already issued and would have put it on these.
  // It is 0.78pt and almost nobody will read it — which is exactly why it has
  // to be right: a security feature nobody checks is worthless, and one that
  // contradicts the sheet when somebody finally does is worse than none.
  const micro = `${fullSerial} · ${school.toUpperCase()} · `.repeat(8);
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
    border: 'ring',
    signatory: {
      name: 'Dr. Adegoke Musa Olatunji',
      role: 'Principal, Sultan Hanafi Royal College',
      ink: '/assets/images/certificates/signature-royal-college-principal.svg',
    },
  },
  SS: {
    code: 'SS',
    labelEn: 'Senior Secondary School · SS 1 – SS 3',
    school: 'Sultan Hanafi Royal College',
    title: 'Certificate of Graduation',
    // NOT "West African Senior School Certificate" and NOT "Senior School
    // Certificate". Those are national awards made by WAEC and NECO on their
    // own examinations; a school certificate borrowing either name would claim
    // an authority this institution does not hold. This certifies what the
    // College can certify: completion of its own senior programme.
    award: 'Senior Secondary School Graduation Certificate',
    stageEn: 'the three-year Senior Secondary School programme',
    progressesTo: 'tertiary study',
    border: 'open',
    signatory: {
      name: 'Dr. Adegoke Musa Olatunji',
      role: 'Principal, Sultan Hanafi Royal College',
      ink: '/assets/images/certificates/signature-royal-college-principal.svg',
    },
  },
  PRY: {
    code: 'PRY',
    // The site names this school "Sultan Hanafi Nursery and Primary School" —
    // "and", not an ampersand — and that is the name used here.
    labelEn: 'Primary School',
    school: 'Sultan Hanafi Nursery and Primary School',
    title: 'Certificate of Graduation',
    // NOT "First School Leaving Certificate" and NOT "Primary School Leaving
    // Certificate". Both are national awards made by a state examination
    // board on its own examination, and a school certificate borrowing either
    // name would claim an authority this institution does not hold. The same
    // rule already governs JSS (not "Basic Education Certificate") and SS (not
    // "WASSCE"), and it governs this sheet.
    award: 'Primary School Graduation Certificate',
    // No year count. The published prospectus for this school states its range
    // as "Ages 2 to 10" and nowhere states a number of primary years, so
    // "the six-year Primary School programme" would be invented — and an
    // invented number on a permanent record is exactly the error the Founder
    // said must never appear. Add the range the moment it is confirmed.
    stageEn: 'the Primary School programme',
    progressesTo: 'the Junior Secondary School',
    border: 'open',
    // Warm metal. The Royal College sheets run gold on navy; this school's own
    // identity on the site is terracotta (css/brand.css --terracotta #C9784B),
    // so the Primary sheet runs gold warmed toward copper. It reads as its own
    // award at a glance, which is the point: a parent holding this and an
    // Ibtida'iyyah certificate must never wonder which school issued which.
    accent: '#C9784B',
    // The office changed hands: Mrs. Mariam Tope Anofi-AbdulKareem is Head Teacher,
    // and the signature the Founder supplied is HERS. It was briefly attached
    // to the outgoing Head Teacher's name here, which is the one error this
    // file must never make — a signature under the wrong name is not a naming
    // slip, it is a document attesting that someone signed a thing they did
    // not sign. Both were corrected together, and nothing was printed in
    // between; the Primary sheets are re-issued from this entry.
    //
    // The signature is knocked out to transparent ink (paper removed, stroke
    // weight preserved) so it sits on the guilloche as ink rather than as a
    // white card pasted over the field.
    signatory: {
      name: 'Mrs. Mariam Tope Anofi-AbdulKareem',
      role: 'Head Teacher, Nursery and Primary School',
      ink: '/assets/images/certificates/signature-head-teacher.png',
    },
  },
  QUR: {
    code: 'QUR',
    labelEn: 'Hifz of the Glorious Qur’an',
    school: 'Sultan Hanafi Qur’an College',
    // The College's own motto, taken from its own crest — the Arabic band
    // beneath the open muṣḥaf reads الشعار (al-shiʿār, "the motto") and then
    // this line. Nothing here is composed: it is transcribed from the emblem
    // the Founder supplied, which is the only Arabic on this sheet that was
    // not written by a human and handed over for engraving.
    mottoAr: 'القرآن يعلو ولا يعلى',
    // ── THE ARABIC HALF ─────────────────────────────────────────────────────
    // This sheet is BILINGUAL, not English with Arabic ornament on it. The
    // Founder's standard is the frozen Ibtidā'iyyah / I'dādiyyah master, where
    // every institutional line carries its Arabic beside it, and he is right
    // that a mostly-English Qur'an College certificate does not meet it.
    //
    // PROVENANCE MATTERS MORE THAN FLUENCY HERE. Every string below is one of
    // three things, and nothing else:
    //
    //   (a) TRANSCRIBED from the frozen master, character for character —
    //       functions/_lib/stage-certificate-template.js, which is under the
    //       v1.0 freeze and already printed on issued certificates. The
    //       institution, the nation, the place, the certifying sentence, the
    //       field labels and the Chairman's name and office all come from
    //       there. They are not retranslated: two SHRS certificates disagreeing
    //       about how the institution writes its own name in Arabic is worse
    //       than either wording alone.
    //   (b) TRANSCRIBED from the College's own crest — its Arabic name and its
    //       motto, read off the emblem the Founder supplied.
    //   (c) DERIVED from the master's own sentence pattern by replacing only
    //       the stage clause: "قد أتمّ بنجاحٍ متطلبات …" becomes "قد أتمّ
    //       بنجاحٍ حفظ …". The frame is the institution's; the Hifz clause is
    //       the only new Arabic on this sheet, and it is flagged for the
    //       Mudeer's confirmation in the delivery note rather than presented
    //       as settled.
    //
    // Nothing here is a name. Personal names in Arabic are never generated —
    // see the note at nameAr in sheetHtml.
    ar: {
      nation: 'جمهورية نيجيريا الاتحادية · حكومة ولاية لاغوس',
      institution: 'مدارس السلطان حنفي الملكية',
      school: 'كلية السلطان حنفي للقرآن',
      place: 'إكورودو، لاغوس، نيجيريا',
      // The certifying sentence, transcribed from the frozen master, plus the
      // student noun it governs. Arabic inflects for the person named, and a
      // certificate that says الطالب over a young woman's name has got her
      // grammatically wrong on a document she keeps for life.
      intro: 'تشهد إدارة مدارس السلطان حنفي الملكية بأن',
      studentM: 'الطالب',
      studentF: 'الطالبة',
      signatoryRole: 'المدير، كلية السلطان حنفي للقرآن',
      chairmanName: 'د. زكريا أولانريوجو حنفي',
      chairmanRole: 'رئيس مجلس الإدارة',
      awardLabel: 'الشهادة الممنوحة',
      session: 'العام الدراسي',
      date: 'تاريخ الإصدار',
      hijri: 'التاريخ الهجري',
      placeLabel: 'مكان الإصدار',
      sid: 'الرقم التعريفي للطالب',
      verify: 'التحقق من الشهادة',
      docId: 'رقم الوثيقة',
      code: 'رمز التحقق',
      archive: 'المرجع الأرشيفي',
      holder: 'حامل الشهادة',
      document: 'الوثيقة',
      seal: 'الختم الرسمي',
      certNo: 'رقم الشهادة',
    },
    // This programme is the first to award TWO different things in one batch.
    // Two students completed the whole Qur’an; one has memorised ten juz’.
    // Those are different achievements and they may not share a title, an
    // award line or a citation — a Ten Juz’ sheet reading "Certificate of
    // Completion" would overstate a child's accomplishment on a permanent
    // record, and a completion sheet reading "Ten Juz’" would rob one of
    // hers. So the wording is per STUDENT, selected by cert.award_variant, and
    // the batch refuses to render a QUR sheet that names no variant.
    variants: {
      COMPLETE: {
        title: 'Certificate of Completion',
        titleAr: 'شهادة إتمام حفظ القرآن الكريم',
        labelEn: 'Hifz of the Glorious Qur’an · Thirty Juz’',
        labelAr: 'ثلاثون جزءًا',
        award: 'Completion of the Memorisation of the Glorious Qur’an (Thirty Juz’)',
        awardAr: 'إتمام حفظ القرآن الكريم كاملًا — ثلاثون جزءًا',
        // The master's sentence with only its stage clause replaced.
        stageAr: 'حفظ القرآن الكريم كاملًا — ثلاثين جزءًا —',
        progressesToArM: 'وأُجيزَ لهُ التقدّم لامتحان الإجازة بالكلية',
        progressesToArF: 'وأُجيزَ لها التقدّم لامتحان الإجازة بالكلية',
        stageEn: 'the memorisation of the entire Glorious Qur’an, thirty juz’,',
        // NOT "and is hereby granted the Ijazah". The College's own published
        // pathway makes the Ijazah a separate award, made after examination by
        // named scholars (academics-quran-college.html, Stage 4) and governed
        // by IQ-02. Completing the memorisation is what this certificate can
        // attest; admission to that examination is what follows from it.
        progressesTo: 'the Ijazah examination of the College',
      },
      JUZ10: {
        title: 'Certificate of Achievement',
        titleAr: 'شهادة حفظ عشرة أجزاء',
        labelEn: 'Hifz of the Glorious Qur’an · Ten Juz’',
        labelAr: 'من القرآن الكريم',
        award: 'Memorisation of Ten Juz’ of the Glorious Qur’an',
        awardAr: 'حفظ عشرة أجزاء من القرآن الكريم',
        stageAr: 'حفظ عشرة أجزاء من القرآن الكريم',
        progressesToArM: 'ويواصل برنامج الحفظ بالكلية',
        progressesToArF: 'وتواصل برنامج الحفظ بالكلية',
        stageEn: 'the memorisation of ten juz’ of the Glorious Qur’an',
        progressesTo: 'the continuing Hifz programme of the College',
      },
    },
    // The Founder supplied the sheet artwork and said not to tweak it. So this
    // programme draws no ground of its own: groundSvg returns nothing for
    // 'quran' and the artwork is laid in full-bleed beneath the content. Every
    // security element on this sheet therefore lives in the FURNITURE — the
    // verification plate, the two Code 128 symbols, the engraved cartouche,
    // the real QR in the slot his artwork reserves for one, and the check tail
    // struck into his own laurel disc — and not as a wash printed over his
    // work. That is the only reading of "use this background, don't tweak it"
    // that also satisfies "as many security elements as possible".
    border: 'quran',
    signatory: {
      name: 'Imam Ahmad Sulaimiy',
      // Supplied by the Founder, 2026-08-07. It was absent until he wrote it,
      // and the line stayed Latin rather than being transliterated — this is
      // the line above a man's signature.
      nameAr: 'الإمام أحمد السليمي',
      role: 'Principal (Mudeer), Sultan Hanafi Qur’an College',
      // Written in blue. It is kept blue rather than converted to the black
      // the other two specimens use: blue ink on a printed sheet is what a
      // wet original signature looks like, and flattening it to black would
      // make three different people's hands look like one plate.
      ink: '/assets/images/certificates/signature-quran-mudeer.png',
    },
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
  // A programme may award more than one thing. Where it does, the wording is
  // resolved per certificate and the variant is REQUIRED — defaulting to the
  // first entry would silently print "Certificate of Completion" over a child
  // who has memorised ten juz’, which is the one error on this sheet that
  // cannot be corrected after a ceremony.
  let award = prog;
  if (prog.variants) {
    const key = String(cert.award_variant || '').toUpperCase();
    if (!key) {
      throw new Error(`royal-college-certificate: programme ${prog.code} awards `
        + `${Object.keys(prog.variants).join(' and ')}, and this certificate names neither `
        + '— refusing to print rather than guess which award a student earned');
    }
    if (!prog.variants[key]) {
      throw new Error(`royal-college-certificate: programme ${prog.code} has no award variant "${key}"`);
    }
    award = { ...prog, ...prog.variants[key] };
  }
  const serial = String(cert.serial_no || '');
  const m = serial.match(/^SHRS-CERT-([A-Z0-9]{2,4})-(\d{4})-(\d{6})-([0-9A-F]{5})$/);
  if (!m) {
    throw new Error(`royal-college-certificate: serial "${serial}" is not in the issuable format, so no certificate number can be engraved`);
  }
  const [, code, year, seq, tail] = m;
  // The engraved number KEEPS its five-character check tail. An earlier cut of
  // this master printed SHRS-CERT-JSS-000048, dropping it — the same mistake
  // certificate-serial.js records at displayStageCertificateNo and warns
  // against by name, and it was reintroduced here. The tail is the first five
  // hex characters of this certificate's own HMAC, so it is what makes the
  // printed number self-authenticating: a verifier holding the paper can check
  // it against the verification plate's code, whose first five characters ARE
  // this tail, with no database at all. Dropping it also meant the public
  // verification page returned a longer number than the sheet carried, which
  // is exactly what a verifier reads as a discrepancy.
  const displayNo = `SHRS-CERT-${code}-${seq}-${tail}`;
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
  // The Arabic form of the holder's name, and ONLY where a human supplied one.
  // It is never transliterated here and never will be: an engraved name is the
  // one field on this document that belongs entirely to the person named, and
  // a machine's guess at how their family writes it in Arabic is not their
  // name. A student whose Arabic form has not been given prints in Latin
  // alone, which is complete and correct, rather than in an invented Arabic.
  const nameAr = String(cert.student_name_ar || '').trim();
  // On a bilingual programme the Arabic name is a REQUIRED FIELD, not an
  // optional extra. Without it one graduate's sheet falls back to a centred
  // English line while her classmates carry a matched pair, and a graduating
  // class whose certificates do not match is not a class — it is three
  // documents that happen to share a date. The fix is never to invent the
  // Arabic; it is to refuse to print until a human supplies it.
  if (prog.ar && !nameAr) {
    throw new Error(`royal-college-certificate: ${serial} (${nameEn}) has no Arabic name, and `
      + `${prog.code} is a bilingual award — every sheet in the batch must carry the same `
      + 'matched name pair. Supply the Arabic form; it will never be transliterated here.');
  }
  const studentId = String(cert.student_identity_no || '').trim();
  if (!/^\d{15}$/.test(studentId)) {
    throw new Error(`royal-college-certificate: ${serial} carries "${studentId}" where a 15-digit Student ID belongs`);
  }
  // A second Code 128-C, carrying the permanent Student ID. The archive
  // barcode identifies the DOCUMENT; this one identifies the HOLDER, and a
  // sheet whose two codes disagree with the register is a sheet assembled from
  // parts of two certificates. Code 128-C needs an even-length payload and the
  // Student ID is 15 digits, so it is left-padded — the pad is stripped by the
  // reader, and the register records the unpadded number.
  const idBarcode = code128cSvg(`0${studentId}`,
    prog.border === 'quran' ? { unit: 0.44, height: 6.8 } : { unit: 0.38, height: 5.5 });
  const session = String(cert.academic_year || '').replace('/', ' – ');
  if (!session) throw new Error(`royal-college-certificate: ${serial} has no academic session`);
  const issued = formatDateEn(cert.issued_at);
  // The Hijri date is SNAPSHOTTED by the issuer, never recomputed here — the
  // same rule the frozen master follows, so the printed sheet and the
  // Registrar's record can never disagree about which day this was. A sheet
  // whose runtime lacked the calendar would otherwise print a different date
  // from the one in the register.
  const hijriEn = String(cert.issued_at_hijri || '').trim();
  const hijriAr = String(cert.issued_at_hijri_ar || '').trim()
    .replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
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

  const isQuran = prog.border === 'quran';
  // The Arabic half of the sheet, present only for a programme that declares
  // one. Programmes that do not are untouched by every branch below.
  const AR = prog.ar || null;
  // The verb agrees with the graduate. Taken from the frozen master's own rule
  // (stage-certificate-template.js, Bible §13.10): أتمّت for a woman, أتمّ for
  // a man. A certificate that says أتمّ over a young woman's name has got her
  // grammatically wrong on a document she keeps for life.
  // ONE place decides, and every Arabic form on the sheet agrees with it: the
  // verb of completion, the student noun in the certifying sentence, and the
  // clause that says what follows. Scattering the test would let one of them
  // drift out of agreement on a single student's sheet, which is exactly the
  // class of error nobody proof-reads for.
  const isFemale = String(cert.student_sex || '').toLowerCase() === 'female';
  const arDone = isFemale ? 'أتمّت' : 'أتمّ';
  const arStudent = AR ? (isFemale ? AR.studentF : AR.studentM) : '';
  const arNext = isFemale ? award.progressesToArF : award.progressesToArM;
  // The Founder's sheet artwork, laid edge to edge under everything. It is his
  // file enlarged for press and otherwise untouched — see
  // scripts/build-quran-assets.py, which also states plainly what a 92 DPI
  // source can and cannot give back at 600.
  const plateBg = isQuran
    ? '<img class="rc-plate-bg" src="/assets/images/certificates/quran-sheet-plate.jpg" alt="" />'
    : '';
  // The artwork carries a laurel-wreathed disc at the head, left blank. It is
  // a seal position, so it is struck rather than decorated: the five hex
  // characters engraved here ARE the first five of this certificate's own
  // HMAC, the same five that close the printed number and open the
  // verification code. A verifier holding the paper can read the tail off the
  // seal, read it off the number, and off the plate, and see three
  // independent places agree — with no database at all.
  const laurelDie = isQuran ? `
  <div class="rc-qdie">
    <span class="rc-qdie-k">SHRS · Registrar</span>
    <span class="rc-qdie-v">${esc(tail)}</span>
  </div>` : '';
  // And a blank gold medallion at the foot, likewise a seal position. Struck
  // with the institution's mark rather than covered with a second seal image,
  // which would hide the artwork the Founder asked to keep.
  const footDie = isQuran ? `
  <div class="rc-qmedal">
    <span class="rc-qmedal-k" dir="rtl" lang="ar">${esc(AR.seal)}</span>
    <span class="rc-qmedal-m">SHRS</span>
    <span class="rc-qmedal-k">Official Seal</span>
  </div>` : '';

  return `<section class="sheet" data-serial="${esc(serial)}" data-stage="${esc(code)}"
  data-border="${esc(prog.border || 'ring')}" data-ar="${nameAr ? '1' : '0'}">
  ${groundSvg(serial, uid, prog.border || 'ring', prog)}
  ${plateBg}${laurelDie}${footDie}


  <!-- ── HEAD ────────────────────────────────────────────────────────────────
       Three emblems on one baseline: Nigeria left, the institutional crest
       centred on the page, Lagos State right — the same three, in the same
       order, that the v1.0 master carries. -->
  <div class="rc-emblems">
    <img class="rc-em rc-em-side" src="/assets/images/crests/nigeria-coat-of-arms.png" alt="" />
    <img class="rc-em rc-em-mid" src="/assets/images/crests/shrs-institutional-crest.png" alt="" />${isQuran ? `
    <!-- The College's own crest, supplied by the Founder, set on the same
         baseline as the other three rather than dropped in a corner: this is
         its award and the emblem row is where a sheet says whose it is. -->
    <img class="rc-em rc-em-mid" src="/assets/images/certificates/quran-college-crest.png" alt="" />` : ''}
    <img class="rc-em rc-em-side" src="/assets/images/crests/lagos-state-arms.png" alt="" />
  </div>
  ${AR ? `
  <!-- Four pairs, four baselines, one component. -->
  ${biPair('Federal Republic of Nigeria · Lagos State', AR.nation, 'rc-p-nation')}
  ${biPair(INSTITUTION, AR.institution, 'rc-p-inst')}
  ${biPair(prog.school, AR.school, 'rc-p-school')}
  ${biPair(place, AR.place, 'rc-p-place')}` : `
  <div class="rc-nation">Federal Republic of Nigeria <span class="rc-dot">·</span> Lagos State</div>
  <div class="rc-inst">${esc(INSTITUTION)}</div>
  <div class="rc-school">${esc(prog.school)}</div>
  <div class="rc-place">${esc(place)}</div>`}

  <!-- ── TITLE ───────────────────────────────────────────────────────────── -->
  ${AR && award.titleAr ? `
  <!-- The two titles share one baseline, divided by a gold rule struck down
       the sheet's own centre: neither language is the caption of the other. -->
  <div class="rc-bititle">
    <h1 class="rc-title rc-title-en">${esc(award.title)}</h1>
    <span class="rc-bidiv"><i></i></span>
    <div class="rc-title-ar" dir="rtl" lang="ar">${esc(award.titleAr)}</div>
  </div>
  <div class="rc-subtitle"><span dir="rtl" lang="ar">${esc(award.labelAr)}</span>
    <span class="rc-dot">·</span> ${esc(award.labelEn)}</div>` : `
  <div class="rc-titlewrap">
    <span class="rc-rule rc-rule-l"></span>
    <h1 class="rc-title">${esc(award.title)}</h1>
    <span class="rc-rule rc-rule-r"></span>
  </div>
  <div class="rc-subtitle">${esc(award.labelEn)}</div>`}
  ${prog.mottoAr ? `<div class="rc-motto" dir="rtl" lang="ar">${esc(prog.mottoAr)}</div>` : ''}

  <!-- ── CITATION ────────────────────────────────────────────────────────── -->
  ${AR ? `
  <!-- Intro and name both run as PAIRS on one baseline, English left, Arabic
       right, at the same rank. Stacked, the second language reads as a caption
       of the first; paired, neither is subordinate — and the holder's name, the
       one line on this sheet that is entirely hers, is the line where that
       matters most. -->
  <div class="rc-bilede">
    <div class="rc-lede rc-lede-en">This is to certify that</div>
    <span class="rc-bidiv rc-bidiv-sm"><i></i></span>
    <div class="rc-lede rc-lede-ar" dir="rtl" lang="ar">${esc(`${AR.intro} ${arStudent}`)}</div>
  </div>` : `<div class="rc-lede">This is to certify that</div>`}
  ${AR ? `
  <div class="rc-biname">
    <div class="rc-name rc-name-en" style="font-size:${Math.min(20, namePt)}pt">${esc(nameEn)}</div>
    <span class="rc-bidiv rc-bidiv-name"><i></i></span>
    <div class="rc-namear" dir="rtl" lang="ar">${esc(nameAr)}</div>
  </div>` : `<div class="rc-name" style="font-size:${namePt}pt">${esc(nameEn)}</div>`}
  ${isQuran ? `
  <!-- A real microtext rule, not a hairline that looks like one: the full
       serial repeated at the 0.90pt press floor, directly under the name. At
       reading distance it is a rule; under a loupe it is this certificate's own
       number, and a photocopier resolves it to a broken grey line. It sits
       under the NAME because the name is what a forger changes. -->
  <div class="rc-microrule">${esc(`${serial} · `.repeat(9))}</div>` : ''}
  <div class="rc-namerule"><span></span><i></i><span></span></div>
  <div class="rc-sid">${AR ? `<span dir="rtl" lang="ar">${esc(AR.sid)}</span> <span class="rc-dot">·</span> ` : ''}Student Identity Number <b>${esc(studentId)}</b></div>

  ${AR && award.stageAr ? `
  <!-- The citation runs in two columns rather than two stacked paragraphs.
       Stacked, the pair costs about 26mm of a field that has 138mm in it
       altogether; side by side it costs 14mm, and — the reason that matters
       more — neither reading order is made to wait for the other. A reader of
       either language meets the sentence at the same height on the sheet. -->
  <div class="rc-bibody">
    <p class="rc-body rc-body-en">has satisfactorily completed ${esc(award.stageEn)}
      at ${esc(prog.school)} for the academic session ${esc(session)}, has met in full
      the academic and conduct requirements of the institution, and is hereby
      graduated and admitted to ${esc(award.progressesTo)}.</p>
    <span class="rc-bidiv rc-bidiv-tall"><i></i></span>
    <p class="rc-body rc-body-ar" dir="rtl" lang="ar">قد ${esc(arDone)} بنجاحٍ
      ${esc(award.stageAr)} في العام الدراسي
      <bdi class="rc-arnum" dir="ltr">${esc(ltr(arDigits(session)))}</bdi>، وفقًا للمناهج المعتمدة
      والمعايير الأكاديمية المعمول بها في الكلية، ${esc(arNext)}.</p>
  </div>` : `
  <p class="rc-body">has satisfactorily completed ${esc(award.stageEn)} at ${esc(prog.school)}
  for the academic session ${esc(session)}, has met in full the academic and conduct
  requirements of the institution, and is hereby graduated and admitted to
  ${esc(award.progressesTo)}.</p>`}

  ${isQuran ? `
  <!-- An engine-turned rule between the citation and the award. It is a real
       lathe — an interfering pair of sine strands solved at 0.07mm — so it
       cannot be redrawn by hand and does not survive a scan-and-reprint
       cleanly. Ours, on our own ink, above the Founder's field rather than
       across it. -->
  <div class="rc-lathebar">${latheStrip(uid)}</div>` : ''}
  <div class="rc-award">
    ${AR ? biPair('Award Conferred', AR.awardLabel, 'rc-award-k') : '<span class="rc-award-k">Award Conferred</span>'}
    <!-- The only stacked pair on this sheet, and only because sixty-seven
         characters of English will not share a 193mm line with its Arabic.
         Stacked, ARABIC LEADS — the Founder's rule, and the right one on a
         certificate whose subject is the Qur'an. -->
    ${AR && award.awardAr
      ? `<span class="rc-award-ar" dir="rtl" lang="ar">${esc(award.awardAr)}</span>
    <span class="rc-award-v">${esc(award.award)}</span>`
      : `<span class="rc-award-v">${esc(award.award)}</span>`}
  </div>

  ${isQuran ? `  <!-- The two Code 128-C symbols take the bare cream the artwork leaves on
       either side of its foot medallion. The document code goes one side, the
       holder code the other, so a scanner sweeping the foot cannot pick up
       both in one pass and report the wrong one. -->
  <div class="rc-qbars rc-qbars-holder">${idBarcode}<b><span dir="rtl" lang="ar">${esc(AR.holder)}</span> · Holder</b></div>
  <div class="rc-qbars rc-qbars-doc">${barcode}<b><span dir="rtl" lang="ar">${esc(AR.document)}</span> · Document</b></div>` : `<div class="rc-ledger">
    <div class="rc-lg"><span>Academic Session</span><b>${esc(session)}</b></div>
    <div class="rc-lg"><span>Date of Award</span><b>${esc(issued)}</b></div>
    <div class="rc-lg"><span>Place of Issue</span><b>${esc(place)}</b></div>
  </div>`}

  <!-- ── SIGNATURES ──────────────────────────────────────────────────────────
       Both specimens are now on file. The Principal's arrived on 2026-08-06 as
       a 120 x 86 px photograph of a signature written light-on-dark; it is
       traced to vector by scripts/trace-signature.py, so its edges are crisp at
       any resolution and it carries no background of its own. Tracing does not
       add information — the stroke shape is as faithful as that photograph and
       no more — and a higher-resolution capture would be worth re-running the
       one command for. -->
  <!-- Both officers carry their office in both scripts. The NAMES are a
       different matter: the Chairman's Arabic name is transcribed from the
       frozen master, where it is already printed on issued certificates; the
       Mudeer's has never been written down by anyone here, so his line stays
       Latin until the College supplies it. An Arabic name assembled by
       transliteration is not a rendering of a man's name, it is a guess at
       it — and this is the line above his signature. -->
  <div class="rc-sig rc-sig-l">
    ${prog.signatory.ink
      ? `<img class="rc-sig-ink" src="${esc(prog.signatory.ink)}" alt="" />`
      : '<div class="rc-sig-ink rc-sig-ink-blank"></div>'}
    <div class="rc-sig-line"></div>
    ${AR && prog.signatory.nameAr
      ? `${biPair(prog.signatory.name, prog.signatory.nameAr, 'rc-sig-name')}
    ${biPair(prog.signatory.role, AR.signatoryRole, 'rc-sig-role')}`
      : `<div class="rc-sig-name">${esc(prog.signatory.name)}</div>
    <div class="rc-sig-role">${esc(prog.signatory.role)}</div>`}
  </div>
  <div class="rc-sig rc-sig-r">
    <img class="rc-sig-ink" src="/assets/images/certificates/signature-chairman.png" alt="" />
    <div class="rc-sig-line"></div>
    ${AR
      ? `${biPair('Dr. Zakariya Olanrewaju Anofi', AR.chairmanName, 'rc-sig-name')}
    ${biPair('Chairman, Board of Governors', AR.chairmanRole, 'rc-sig-role')}`
      : `<div class="rc-sig-name">Dr. Zakariya Olanrewaju Anofi</div>
    <div class="rc-sig-role">Chairman, Board of Governors</div>`}
  </div>

  <!-- ── AUTHENTICATION BAND ─────────────────────────────────────────────────
       The grid is the supplied artwork's own: QR, certificate number, seal,
       then the verification plate, left to right along the foot of the sheet.
       The pair on the left (22–124mm) and the plate on the right (173–276mm)
       are symmetric about the sheet centre. -->
  <div class="rc-qr">${isQuran ? `
    <!-- The artwork reserves a gold-framed 17.6mm square at the foot and fills
         it with a specimen pattern. A printed certificate carrying a QR that
         resolves to nothing is worse than one carrying none: a parent who
         scans it and gets nowhere learns that this institution prints
         ornaments shaped like verification. So the specimen is replaced by
         this certificate's real payload, at the exact size and position the
         artwork reserved — no plaque of ours, because his frame is already
         there. -->
    <div class="rc-qr-img">${qrSvgMarkup}</div>` : `
    ${plaque(26, 28, `qr${uid}`)}
    <div class="rc-qr-cap">Verify Authenticity</div>
    <div class="rc-qr-img">${qrSvgMarkup}</div>
    <div class="rc-qr-foot">Scan QR Code</div>`}
  </div>

  <!-- ── DUAL SERIAL ─────────────────────────────────────────────────────────
       A banknote carries its serial twice, in a contrasting ink, at opposite
       corners: two chances to read it, and a disagreement between the two is
       the first thing an examiner looks for. Terracotta rather than gold, so it
       reads as a serial and not as ornament.
       It sits IN THE ENGINE-TURNED BAND, not in the field. The first cut put it
       at the top-left of the field, where it ran straight under the Nigerian
       coat of arms — the band is where a banknote carries its serial anyway,
       and it is the one strip of this sheet with nothing else competing for
       it. -->
  <div class="rc-serial rc-serial-tr">${esc(serial)}</div>
  <div class="rc-serial rc-serial-bl">${esc(serial)}</div>

  <div class="rc-cnwrap">${numberCartouche(displayNo, serial, uid, prog.school)}</div>

  ${isQuran ? '<!-- No seal plate: this sheet has two struck seal positions of its own,\n       and a third pasted over the artwork would be one seal too many. -->'
    : `<div class="rc-sealwrap${prog.border === 'open' ? ' is-die' : ''}">${
      prog.border === 'open' ? sealPlate(prog.school, prog.labelEn.split(' · ')[0]) : sealSvg(uid, prog.code)}</div>`}

  <div class="rc-plate">
    ${isQuran ? '<!-- No plaque. The artwork is already engine-turned under this strip;\n         a panel of ours on top of it reads as a sticker, and a stretched one\n         (92x28mm of viewBox into a 173x13.6mm box) reads as a mistake. -->'
    : plaque(92, 28, `vp${uid}`)}
    <div class="rc-plate-head"><span class="rc-plate-mark">SHRS</span>Certificate Verification</div>
    <div class="rc-plate-grid">
      ${AR ? `<div class="rc-pf"><span><i dir="rtl" lang="ar">${esc(AR.date)}</i> · Date of Award</span><b>${esc(issued)}</b></div>` : ''}
      ${AR && hijriAr ? `<div class="rc-pf"><span><i dir="rtl" lang="ar">${esc(AR.hijri)}</i> · Hijri Date</span><b class="rc-pf-ar" dir="rtl" lang="ar"><bdi dir="rtl">${esc(hijriAr)}</bdi></b></div>` : ''}
      <div class="rc-pf"><span>${AR ? `<i dir="rtl" lang="ar">${esc(AR.docId)}</i> · ` : ''}Document ID</span><b>${esc(docId)}</b></div>
      <div class="rc-pf"><span>${AR ? `<i dir="rtl" lang="ar">${esc(AR.code)}</i> · ` : ''}Verification Code</span><b>${esc(verifyCode)}</b></div>
      <div class="rc-pf"><span>${AR ? `<i dir="rtl" lang="ar">${esc(AR.archive)}</i> · ` : ''}Archive Reference</span><b>${esc(archiveRef)}</b></div>
      <div class="rc-pf"><span>${AR ? `<i dir="rtl" lang="ar">${esc(AR.sid)}</i> · ` : ''}Student Identity No.</span><b>${esc(studentId)}</b></div>
    </div>
    <div class="rc-plate-bar">${barcode}</div>
    <div class="rc-plate-bar2">${idBarcode}</div>
    <div class="rc-plate-micro">${esc(microSerial)}</div>
    <div class="rc-plate-void">shroyalschools.com/verify-certificate
      <span class="rc-plate-dot">·</span> Void if altered, erased or reproduced</div>
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
/* Amiri, for the two Arabic lines on the Qur'an College sheet: the College's
   own motto and — where a human has supplied one — the holder's name. The
   files are the Arabic cuts, self-hosted like every other face here, because a
   press machine that cannot reach the network must still set the name. */
@font-face{font-family:'Amiri';src:url('/assets/fonts/amiri-arabic-400-normal.woff2') format('woff2');font-weight:400;font-style:normal;font-display:block}
@font-face{font-family:'Amiri';src:url('/assets/fonts/amiri-arabic-700-normal.woff2') format('woff2');font-weight:700;font-style:normal;font-display:block}
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
.rc-emblems{position:absolute;left:0;right:0;top:21.5mm;height:12.5mm;
  display:flex;align-items:flex-end;justify-content:center;gap:56mm}
.rc-em{display:block;object-fit:contain}
.rc-em-side{height:11.2mm;width:auto;opacity:0.93}
.rc-em-mid{height:12.5mm;width:auto}
.rc-nation{position:absolute;left:0;right:0;top:35.4mm;text-align:center;
  font-family:'Cinzel',serif;font-size:6.2pt;font-weight:400;letter-spacing:0.26em;
  color:${INK_SOFT};text-transform:uppercase}
.rc-dot{color:${GOLD};padding:0 0.35em}
.rc-inst{position:absolute;left:0;right:0;top:39.4mm;text-align:center;
  font-family:'Cinzel',serif;font-size:12.6pt;font-weight:800;letter-spacing:0.15em;
  color:${GOLD_DEEP};text-transform:uppercase}
.rc-school{position:absolute;left:0;right:0;top:46mm;text-align:center;
  font-family:'Cinzel',serif;font-size:9pt;font-weight:700;letter-spacing:0.19em;
  color:${INK};text-transform:uppercase}
.rc-place{position:absolute;left:0;right:0;top:51.2mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:5.8pt;font-weight:400;letter-spacing:0.2em;
  color:${INK_SOFT};text-transform:uppercase}

/* ── TITLE ────────────────────────────────────────────────────────────── */
.rc-titlewrap{position:absolute;left:40mm;right:40mm;top:55.4mm;height:12mm;
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
.rc-subtitle{position:absolute;left:0;right:0;top:68.6mm;text-align:center;
  font-family:'Cinzel',serif;font-size:7.6pt;font-weight:400;letter-spacing:0.3em;
  color:${INK_SOFT};text-transform:uppercase}

/* ── CITATION ─────────────────────────────────────────────────────────── */
.rc-lede{position:absolute;left:0;right:0;top:75mm;text-align:center;
  font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;
  font-size:11.4pt;letter-spacing:0.045em;color:${INK_SOFT}}
.rc-name{position:absolute;left:52mm;right:52mm;top:80mm;height:13mm;
  display:flex;align-items:center;justify-content:center;text-align:center;
  font-family:'Cormorant Garamond',serif;font-weight:700;letter-spacing:0.035em;
  color:#241D10;white-space:nowrap;text-shadow:0 0.16mm 0 rgba(255,252,242,0.9)}
.rc-namerule{position:absolute;left:82mm;right:82mm;top:93.8mm;height:2mm;
  display:flex;align-items:center;gap:2.4mm}
.rc-namerule span{flex:1;height:0.28mm;background:linear-gradient(90deg,rgba(168,134,63,0),${GOLD})}
.rc-namerule span:last-child{background:linear-gradient(270deg,rgba(168,134,63,0),${GOLD})}
.rc-namerule i{width:1.5mm;height:1.5mm;background:${GOLD};transform:rotate(45deg)}
.rc-sid{position:absolute;left:0;right:0;top:96.4mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:6pt;font-weight:400;letter-spacing:0.16em;
  color:${INK_SOFT};text-transform:uppercase}
.rc-sid b{font-weight:600;color:${INK};letter-spacing:0.12em}
.rc-body{position:absolute;left:60mm;right:60mm;top:100mm;margin:0;text-align:center;
  font-family:'Cormorant Garamond',serif;font-weight:500;font-size:11.4pt;line-height:1.6;
  letter-spacing:0.012em;color:${INK}}

.rc-award{position:absolute;left:62mm;right:62mm;top:121mm;height:10mm;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.9mm}
.rc-award-k{font-family:'Inter',sans-serif;font-size:5.6pt;font-weight:400;
  letter-spacing:0.34em;color:${GOLD_DEEP};text-transform:uppercase}
.rc-award-v{font-family:'Cinzel',serif;font-size:11pt;font-weight:700;
  letter-spacing:0.07em;color:${INK};text-transform:uppercase;white-space:nowrap}

.rc-ledger{position:absolute;left:48mm;right:48mm;top:132mm;height:8.5mm;
  display:flex;align-items:stretch;justify-content:space-between}
.rc-lg{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:0.8mm;border-left:0.2mm solid rgba(168,134,63,0.4)}
.rc-lg:first-child{border-left:0}
.rc-lg span{font-family:'Inter',sans-serif;font-size:5.2pt;font-weight:400;
  letter-spacing:0.24em;color:${INK_SOFT};text-transform:uppercase}
.rc-lg b{font-family:'Cormorant Garamond',serif;font-size:10pt;font-weight:600;
  letter-spacing:0.02em;color:${INK}}

/* ── SIGNATURES ───────────────────────────────────────────────────────── */
.rc-sig{position:absolute;top:141.5mm;width:60mm;text-align:center}
.rc-sig-l{left:30mm}
.rc-sig-r{right:30mm}
.rc-sig-ink{display:block;height:10mm;width:auto;max-width:52mm;margin:0 auto -1.4mm;
  object-fit:contain;mix-blend-mode:multiply}
.rc-sig-line{height:0.3mm;background:linear-gradient(90deg,rgba(122,92,33,0),${GOLD_DEEP} 18%,${GOLD_DEEP} 82%,rgba(122,92,33,0))}
.rc-sig-name{margin-top:1.3mm;font-family:'Cormorant Garamond',serif;font-size:9.4pt;
  font-weight:600;letter-spacing:0.02em;color:${INK}}
.rc-sig-role{margin-top:0.5mm;font-family:'Inter',sans-serif;font-size:5.2pt;font-weight:400;
  letter-spacing:0.19em;color:${INK_SOFT};text-transform:uppercase}

/* ── AUTHENTICATION BAND ──────────────────────────────────────────────── */
.rc-plaque-bg{position:absolute;left:0;top:0;width:100%;height:100%}
.rc-qr{position:absolute;left:34mm;top:160mm;width:26mm;height:28mm}
.rc-qr-cap{position:absolute;left:0;right:0;top:1.5mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:4.5pt;font-weight:600;letter-spacing:0.13em;
  color:${MICRO_INK};text-transform:uppercase}
.rc-qr-img{position:absolute;left:4.2mm;top:4.6mm;width:17.6mm;height:17.6mm}
.rc-qr-img svg{display:block;width:100%;height:100%}
.rc-qr-foot{position:absolute;left:0;right:0;bottom:1.3mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:4.5pt;font-weight:400;letter-spacing:0.13em;
  color:${MICRO_INK};text-transform:uppercase}

.rc-cnwrap{position:absolute;left:64mm;top:165mm;width:62mm;height:18mm}
.rc-cn{display:block;width:100%;height:100%}

.rc-sealwrap{position:absolute;left:129.5mm;top:152mm;width:38mm;height:38mm}
/* Both signature blocks sit on ONE baseline whether or not a signature image
   exists. The Head Teacher has no signature on file, so her block had no ink
   image, collapsed upward, and printed several millimetres above the
   Chairman's — two signatories at two different heights, which reads as a
   pasted-in signature rather than a co-signed document. The ink slot keeps its
   height when empty. */
.rc-sig-ink-blank{height:10mm;width:52mm;margin:0 auto -1.4mm}
.rc-sig-role{text-wrap:balance}

.rc-seal-svg{display:block;width:100%;height:100%;
  filter:drop-shadow(0 0.35mm 0.6mm rgba(64,46,12,0.28))}

/* The struck die, plus the one line of added text the Founder allowed. The
   wrapper is taller than the SVG seal's because the ribbon hangs below the
   die — nothing is printed across the seal face. */
.rc-sealwrap.is-die{top:148mm;height:46mm}
.rc-seal-plate{margin:0;display:flex;flex-direction:column;align-items:center}
.rc-seal-die{display:block;width:36mm;height:auto;
  filter:drop-shadow(0 0.4mm 0.7mm rgba(64,46,12,0.34))}
.rc-seal-ribbon{margin-top:1.1mm;text-align:center;line-height:1.25}
.rc-seal-ribbon-t,.rc-seal-ribbon-b{display:block;font-family:'Cinzel',serif;
  color:${GOLD_DEEP};text-transform:uppercase}
.rc-seal-ribbon-t{font-size:4.4pt;font-weight:700;letter-spacing:0.16em}
.rc-seal-ribbon-b{font-size:3.8pt;font-weight:600;letter-spacing:0.2em;
  color:${MICRO_INK};margin-top:0.35mm}

.rc-plate{position:absolute;left:171mm;top:160mm;width:92mm;height:28mm}
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
.rc-plate-bar{position:absolute;left:3.2mm;top:18.4mm}
.rc-plate-bar2{position:absolute;left:39.4mm;top:19.1mm}
.rc-plate-bar svg,.rc-plate-bar2 svg{display:block}
.rc-plate-micro{position:absolute;left:3.4mm;right:3.4mm;bottom:3.4mm;overflow:hidden;
  white-space:nowrap;font-family:'Inter',sans-serif;font-size:0.9pt;font-weight:400;
  letter-spacing:0.34pt;color:${MICRO_INK}}
.rc-serial{position:absolute;font-family:'Inter',sans-serif;font-size:5.8pt;font-weight:600;
  letter-spacing:0.12em;color:#F3E2B4;white-space:nowrap;
  padding:0.4mm 2.2mm;border-radius:0.5mm;
  border:0.18mm solid rgba(216,188,124,0.55);
  background:linear-gradient(180deg,rgba(34,51,90,0.85),rgba(15,23,40,0.9))}
.rc-serial-tr{right:46mm;top:5.4mm}
.rc-serial-bl{left:46mm;bottom:5.4mm}

/* The plate border does not carry these two tabs at all.
   On the ring border they are the only repeat of the serial away from the
   cartouche, so they earn their place. On the plate they did not: a navy
   lozenge landed on top of the microtext rail and the engine-turned band, so
   a panel sat over two security features and read as a sticker applied after
   printing. Engraving them into the field instead moved the problem rather
   than fixing it — at any inset that cleared the border they clipped at the
   trim. They are dropped here because they are redundant on this sheet and
   not because they were awkward to place: the plate's own microtext rail
   already repeats the full serial around all four edges, and the number also
   appears in the cartouche, the verification panel, the QR payload and the
   archive barcode. Six occurrences is not fewer than seven in any way a
   verifier can use. */
.sheet[data-border="open"] .rc-serial{display:none}

/* The Founder's plate, laid edge to edge behind everything. It is a 300 DPI
   enlargement of his artwork, 9-sliced so the corner castings are never
   distorted — see scripts/build-plate-border.py for how it is built and for
   an honest note on what a 92 DPI source can and cannot give back. */
/* Its own layer, not a background on .sheet: the ground SVG paints a
   full-bleed paper rectangle, so a background set on the sheet is covered by
   the very first thing drawn over it. The plate sits above the ground and
   below every piece of content. */
.rc-plate-bg{position:absolute;left:0;top:0;width:297mm;height:210mm;
  z-index:0;pointer-events:none}

/* ══ THE QUR’AN COLLEGE SHEET ═══════════════════════════════════════════════
   Every position below is MEASURED off the Founder's artwork, not chosen by
   eye. The file is 1080x768; an occupancy scan of it gives the clear cream
   window, the two blank seal discs and the specimen QR's exact footprint, and
   those measurements — converted at 297mm/1080px and 210mm/768px — are what
   the numbers here are. That is why the content never crowds his ornament and
   never sits on the ribbon rosettes: it was never allowed to.

     clear head band   y 26–36   x 64–228   (between the two ribbon rosettes)
     clear main field  y 42–162  x 42–255
     specimen QR slot  x 203.7–221.3  y 167.0–184.6   (17.6mm square)
     head laurel disc  centre (31.4, 44.6)  free bore ~13mm
     foot gold disc    centre (148.7, 181.4)  flat face ~20.6mm
     foot pockets      x 66–132 and x 164–199, y 166–186
   ─────────────────────────────────────────────────────────────────────────── */
.sheet[data-border="quran"]{background:#FBF7EE}
/* The artwork, edge to edge, under everything and over nothing. */
.sheet[data-border="quran"] .rc-plate-bg{object-fit:fill}
.sheet[data-border="quran"] .rc-serial{display:none}
.sheet[data-border="quran"] .rc-ledger{display:none}

/* ── THE BILINGUAL PAIR ── one rule, every pair ─────────────────────────
   English left, Arabic right, one baseline, a struck lozenge between them.
   The two halves are given EQUAL FLEX and mirrored alignment, so the divider
   sits on the sheet's own centre line and neither language can grow into the
   other's half. Optical sizing is per pair — Amiri sets smaller per point than
   the Latin faces, so every pair states both sizes rather than one. */
.rc-bipair{position:absolute;left:0;right:0;display:flex;align-items:baseline;
  justify-content:center;gap:2.6mm}
.rc-bipair .bp-en{flex:1;text-align:right;white-space:nowrap}
.rc-bipair .bp-ar{flex:1;text-align:left;font-family:'Amiri',serif;direction:rtl;
  white-space:nowrap}
.rc-bipair .bp-div{position:relative;width:1.2mm;flex:0 0 auto;align-self:center;
  display:flex;align-items:center;justify-content:center}
.rc-bipair .bp-div i{width:1mm;height:1mm;background:${GOLD};transform:rotate(45deg);
  opacity:0.85}
/* The one stacked pair, and Arabic leads it. */
.rc-bipair-stack{flex-direction:column;align-items:center;gap:0.6mm}
.rc-bipair-stack .bp-en,.rc-bipair-stack .bp-ar{flex:none;text-align:center}

/* ── HEAD ── four pairs, four baselines ───────────────────────────────── */
.sheet[data-border="quran"] .rc-emblems{top:22.4mm;height:9.4mm;gap:8mm}
.sheet[data-border="quran"] .rc-em-side{height:8.8mm}
.sheet[data-border="quran"] .rc-em-mid{height:9.4mm}
.rc-p-nation{top:33.2mm}
.rc-p-nation .bp-en{font-family:'Cinzel',serif;font-size:5.2pt;font-weight:400;
  letter-spacing:0.2em;color:${INK_SOFT};text-transform:uppercase}
.rc-p-nation .bp-ar{font-size:6.8pt;font-weight:400;color:${INK_SOFT}}
.rc-p-inst{top:38.2mm}
.rc-p-inst .bp-en{font-family:'Cinzel',serif;font-size:9.6pt;font-weight:800;
  letter-spacing:0.13em;color:${GOLD_DEEP};text-transform:uppercase}
.rc-p-inst .bp-ar{font-size:11pt;font-weight:700;color:${GOLD_DEEP}}
.rc-p-school{top:44.4mm}
.rc-p-school .bp-en{font-family:'Cinzel',serif;font-size:7pt;font-weight:700;
  letter-spacing:0.15em;color:${INK};text-transform:uppercase}
.rc-p-school .bp-ar{font-size:8.6pt;font-weight:700;color:${INK}}
.rc-p-place{top:49.6mm}
.rc-p-place .bp-en{font-family:'Inter',sans-serif;font-size:4.9pt;letter-spacing:0.18em;
  color:${INK_SOFT};text-transform:uppercase}
.rc-p-place .bp-ar{font-size:6pt;color:${INK_SOFT}}

/* ── TITLE ── */
.rc-bititle{position:absolute;left:52mm;right:52mm;top:54.4mm;height:11.2mm;
  display:flex;align-items:center;gap:5mm}
.rc-title-en{flex:1;margin:0;text-align:right;font-family:'Cinzel',serif;
  font-size:12.6pt;font-weight:800;letter-spacing:0.055em;color:${GOLD_DEEP};
  text-transform:uppercase;line-height:1.1;
  text-shadow:0 0.2mm 0 rgba(255,252,242,0.85)}
.rc-title-ar{flex:1;text-align:left;font-family:'Amiri',serif;font-size:15.4pt;
  font-weight:700;color:${GOLD_DEEP};line-height:1.25;
  text-shadow:0 0.2mm 0 rgba(255,252,242,0.85)}
.rc-bidiv{position:relative;width:1.5mm;align-self:stretch;display:flex;
  align-items:center;justify-content:center;flex:0 0 auto}
.rc-bidiv::before{content:'';position:absolute;top:0.6mm;bottom:0.6mm;width:0.22mm;
  background:linear-gradient(180deg,rgba(168,134,63,0),${GOLD} 26%,${GOLD} 74%,rgba(168,134,63,0))}
.rc-bidiv i{position:relative;width:1.5mm;height:1.5mm;background:${GOLD};
  transform:rotate(45deg)}
.sheet[data-border="quran"] .rc-subtitle{top:66.4mm;font-size:6.4pt;letter-spacing:0.2em}
.sheet[data-border="quran"] .rc-subtitle [lang="ar"]{font-family:'Amiri',serif;
  font-size:8pt;letter-spacing:0}
.rc-motto{position:absolute;left:0;right:0;text-align:center;
  font-family:'Amiri','Scheherazade New',serif;font-size:9.4pt;font-weight:400;
  color:${GOLD_DEEP};line-height:1.4}
.sheet[data-border="quran"] .rc-motto{top:70mm}

/* ── CITATION, as a two-column composition ─────────────────────────────── */
.rc-bilede{position:absolute;left:56mm;right:56mm;top:74.4mm;height:5.2mm;
  display:flex;align-items:center;gap:4mm}
.rc-bilede .rc-lede{position:static;flex:1;top:auto}
.rc-lede-en{text-align:right}
.rc-lede-ar{text-align:left;font-family:'Amiri',serif;font-style:normal;
  font-weight:400;font-size:8.6pt}
.sheet[data-border="quran"] .rc-bilede .rc-lede{font-size:9pt}
.rc-bidiv-sm{width:1.2mm;height:3.4mm;align-self:center}
.rc-bidiv-sm i{width:1.1mm;height:1.1mm}

/* The name: English left, Arabic right, one baseline, equal rank. */
.rc-biname{position:absolute;left:42mm;right:42mm;top:80mm;height:13mm;
  display:flex;align-items:center;gap:5mm}
.rc-biname .rc-name{position:static;flex:1;height:auto;justify-content:flex-end;
  left:auto;right:auto;top:auto}
.rc-namear{position:absolute;left:62mm;right:62mm;text-align:center;
  font-family:'Amiri',serif;font-weight:700;color:#241D10;line-height:1.2}
/* 23pt against the Latin's 20: Amiri's letterforms sit smaller per point than
   Cormorant's, so matching the NUMBER would have made the Arabic the junior
   of the pair on the one line where neither may be. Matched by eye at the
   printed size, then measured — the two now occupy the same cap height. */
.rc-biname .rc-namear{position:static;flex:1;text-align:left;font-size:23pt;
  line-height:1.15;text-shadow:0 0.16mm 0 rgba(255,252,242,0.9)}
.rc-bidiv-name{width:1.8mm;height:9mm;align-self:center}
.rc-bidiv-name i{width:1.9mm;height:1.9mm}
/* Fallback: a holder with no Arabic name on file keeps the centred single
   line — the band is not padded out with a blank half. */


/* Microtext: the serial at the 0.90pt press floor, under the name. */
.rc-microrule{position:absolute;left:52mm;right:52mm;top:93.6mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:0.9pt;letter-spacing:0.32pt;
  color:${MICRO_INK};white-space:nowrap;overflow:hidden;text-overflow:clip;
  opacity:0.9}
.sheet[data-border="quran"] .rc-namerule{top:95mm;left:96mm;right:96mm}
.sheet[data-border="quran"] .rc-sid{top:96.6mm;font-size:5.4pt}
.sheet[data-border="quran"] .rc-sid [lang="ar"]{font-family:'Amiri',serif;font-size:6.6pt;
  letter-spacing:0}
/* No Arabic name on file: the rule and the identity line close up rather than
   leaving a hole where a name should be. */



/* The citation, two columns. Stacked it costs 26mm of a 138mm field; side by
   side it costs 14, and neither reader is made to wait for the other. */
.rc-bibody{position:absolute;left:43mm;right:43mm;top:101.8mm;height:16mm;
  display:flex;align-items:flex-start;gap:3.6mm}

.rc-bibody .rc-body{position:static;margin:0;font-size:7.9pt;line-height:1.42;
  color:${INK}}
.rc-body-en{flex:1.24}
.rc-body-ar{flex:1}
.rc-body-en{text-align:left;hyphens:auto}
.rc-body-ar{text-align:right;font-family:'Amiri',serif;font-size:8.4pt;line-height:1.58}
.rc-arnum{unicode-bidi:isolate;direction:ltr;font-family:'Amiri',serif}
.rc-bidiv-tall{width:1.5mm;height:15mm}

/* ── AWARD ── */
/* The engine-turned rule, then the award. */
.rc-lathebar{position:absolute;left:73.5mm;width:150mm;top:118.8mm;height:2.6mm}
.rc-lathe-svg{display:block;width:100%;height:100%}
.sheet[data-border="quran"] .rc-award{top:122.4mm;left:52mm;right:52mm;height:12mm;gap:0.5mm}
/* A pair set in flow inside a flex column must be told to take the full
   measure, or it shrinks to its content and wraps a two-word label onto
   two lines — which "AWARD CONFERRED" duly did. */
.sheet[data-border="quran"] .rc-award .rc-bipair{position:static;width:100%;gap:2mm}
.rc-award-k .bp-en{font-family:'Inter',sans-serif;font-size:4.4pt;letter-spacing:0.24em;
  color:${GOLD_DEEP};text-transform:uppercase}
.rc-award-k .bp-ar{font-size:5.6pt;color:${GOLD_DEEP}}

.sheet[data-border="quran"] .rc-award-v{font-size:8.2pt;letter-spacing:0.045em}
.rc-award-ar{font-family:'Amiri',serif;font-size:8.2pt;font-weight:700;color:${INK};
  direction:rtl;line-height:1.1}

/* ── SIGNATURES + PARTICULARS ── the ledger sits between the two officers,
   which buys the height a bilingual sheet needs at its foot. */
/* x 60 and x 236, not x 41: below y 161 the artwork's clear field starts at
   59.4mm on the left, and a signature block set to the sheet's own margins
   would have printed the Mudeer's office over the gold swoosh. */
/* 146.8, not lower: the signature block measures 16.8mm from its ink to the
   foot of the Arabic office line, and the artwork's QR slot begins at 166.1mm.
   The layout gate measured the collision at 149.2 and was right — a signature
   box reaching into the QR is a scan failure waiting for the first parent who
   tries it. */
.sheet[data-border="quran"] .rc-sig{top:147.4mm;width:74mm}
.sheet[data-border="quran"] .rc-sig-l{left:56mm;right:auto}
.sheet[data-border="quran"] .rc-sig-r{right:56mm;left:auto}
.sheet[data-border="quran"] .rc-sig-ink{height:5mm;max-width:44mm;margin-bottom:-0.7mm}
.sheet[data-border="quran"] .rc-sig-name{margin-top:0.1mm;font-size:7.2pt}
/* Inside a signature block the pairs sit in flow, not absolutely. */
.rc-sig .rc-bipair{position:static;width:100%;margin-top:0.5mm;gap:2mm}
.rc-sig-name .bp-en{font-family:'Cormorant Garamond',serif;font-size:7.6pt;
  font-weight:600;color:${INK}}
.rc-sig-name .bp-ar{font-size:8.4pt;font-weight:700;color:${INK}}
.rc-sig-role .bp-en{font-family:'Inter',sans-serif;font-size:3.5pt;
  letter-spacing:0.07em;color:${INK_SOFT};text-transform:uppercase;line-height:1.3}
.rc-sig-role .bp-ar{font-size:4.6pt;color:${INK_SOFT};line-height:1.3}
.rc-sig .rc-bipair .bp-div i{width:0.8mm;height:0.8mm}
.sheet[data-border="quran"] .rc-sig-role{margin-top:0.3mm;font-size:3.7pt;
  letter-spacing:0.08em;white-space:nowrap}


/* ── VERIFICATION PLATE ── */
/* Five fields, each with its Arabic label above its English one. It sits ABOVE
   the signatures rather than below them, because the artwork's bottom-left
   swoosh eats the field from x 0 to 59mm below y 161 — a plate at the foot
   would have had to start inside the ornament. Measured, not guessed. */
.sheet[data-border="quran"] .rc-plate{left:52mm;width:193mm;top:136.6mm;height:9.4mm}
.sheet[data-border="quran"] .rc-plate-head,
.sheet[data-border="quran"] .rc-plate-bar,
.sheet[data-border="quran"] .rc-plate-bar2,
.sheet[data-border="quran"] .rc-plate-void{display:none}
.sheet[data-border="quran"] .rc-plate-grid{position:absolute;left:0;right:0;top:0;
  display:grid;grid-template-columns:repeat(6,1fr);gap:0 2.2mm}
.sheet[data-border="quran"] .rc-plate-micro{position:absolute;left:0;right:0;bottom:0;
  text-align:center;white-space:nowrap;overflow:hidden}
.sheet[data-border="quran"] .rc-pf span{font-size:3.8pt;letter-spacing:0.06em}
.sheet[data-border="quran"] .rc-pf span i{font-family:'Amiri',serif;font-size:4.8pt;
  font-style:normal;letter-spacing:0;text-transform:none;unicode-bidi:isolate}
.sheet[data-border="quran"] .rc-pf b{font-size:6.3pt;white-space:nowrap}
.rc-pf-ar{font-family:'Amiri',serif;font-size:6.9pt;unicode-bidi:isolate}

/* ── FOOT ── the artwork's own bottom band, used as it was drawn. */
.sheet[data-border="quran"] .rc-cnwrap{left:64mm;width:66mm;top:167.2mm;height:12.4mm}
.rc-qbars{position:absolute;text-align:center}
.rc-qbars svg{display:block;margin:0 auto}
.rc-qbars b{display:block;font-family:'Inter',sans-serif;font-size:3.4pt;
  letter-spacing:0.08em;color:${INK_SOFT};text-transform:uppercase;margin-top:0.3mm}
.rc-qbars b [lang="ar"]{font-family:'Amiri',serif;font-size:4.6pt;letter-spacing:0}
.rc-qbars-holder{left:64mm;width:66mm;top:180mm}
.rc-qbars-doc{left:163mm;width:36mm;top:170mm}
/* The real QR, over a knockout of bare paper, at the exact size and place the
   artwork reserved (measured: x 203.98–221.58mm, y 166.98–184.55mm). */
.sheet[data-border="quran"] .rc-qr{left:203mm;top:166.1mm;width:19.6mm;height:19.6mm;
  background:#F7F1E4;box-shadow:0 0 0 0.15mm rgba(247,241,228,1)}
.sheet[data-border="quran"] .rc-qr-img{position:absolute;width:17.6mm;height:17.6mm;
  left:1mm;top:0.88mm}
.sheet[data-border="quran"] .rc-qr-img svg{width:17.6mm;height:17.6mm;display:block}

/* The two blank seal discs in the artwork, struck. Lettering only — his discs
   are already there and better than anything redrawn. */
.rc-qdie{position:absolute;left:24.4mm;top:39.4mm;width:14mm;height:11mm;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;line-height:1}
.rc-qdie-k{font-family:'Inter',sans-serif;font-size:2.9pt;letter-spacing:0.09em;
  color:#243050;text-transform:uppercase;opacity:0.95}
.rc-qdie-v{font-family:'Cinzel',serif;font-size:8.2pt;font-weight:800;
  letter-spacing:0.1em;color:#1A2338;margin-top:0.5mm}
.rc-qmedal{position:absolute;left:138.4mm;top:172.2mm;width:20.6mm;height:15mm;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;line-height:1}
.rc-qmedal-k{font-family:'Inter',sans-serif;font-size:2.8pt;letter-spacing:0.11em;
  color:#7A5C21;text-transform:uppercase;opacity:0.9}
.rc-qmedal-k[lang="ar"]{font-family:'Amiri',serif;font-size:4.4pt;letter-spacing:0;
  text-transform:none;direction:rtl}
.rc-qmedal-m{font-family:'Cinzel',serif;font-size:8.6pt;font-weight:800;
  letter-spacing:0.09em;color:#6B4E18;margin:0.4mm 0;
  text-shadow:0 0.14mm 0 rgba(255,246,214,0.75)}

.rc-plate-void{position:absolute;left:0;right:0;bottom:1mm;text-align:center;
  font-family:'Inter',sans-serif;font-size:4.2pt;font-weight:400;letter-spacing:0.1em;
  color:${MICRO_INK};text-transform:uppercase}
.rc-plate-dot{color:${GOLD};padding:0 0.2em}
</style>
</head><body>
${sheetsHtml}
</body></html>`;
}
