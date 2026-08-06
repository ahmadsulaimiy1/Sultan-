// Certificate ground — the border and background, drawn as TRUE VECTOR.
//
// WHY THIS EXISTS
// The supplied master artwork is a 1080x772 JPEG. Over a 297x210mm sheet that
// is 92.4 DPI. The directive asks for "minimum 300 DPI, preferably 600" and
// "perfectly sharp vector edges" — and there is no way to get either by
// enlarging that file. Measured on it: only 17% of its spectral energy sits
// inside 12% of Nyquist, so there is no latent fine detail to recover, and an
// AI upscale would manufacture precisely the "AI artifacts, blurry gradients,
// inconsistent textures" the directive rules out.
//
// So the plate is REDRAWN rather than enlarged — which is what a security
// printer actually does. Everything here is constructed geometry: epitrochoid
// guilloche, parametric rosettes, real <textPath> microtext, engraved rules.
// It has no resolution. It is exact at 300 DPI, at 600, and at 2400.
//
// WHAT THIS IS, STATED PLAINLY — READ BEFORE USING IT
// This is NOT a faithful rebuild of the supplied plate, and it must not be
// described as one. The band positions below were taken by scanning a single
// mid-row and mid-column of the artwork for edges and assuming the result was
// a symmetric rectangular frame. Rendered side by side against the source that
// assumption is plainly wrong: the supplied plate is not a set of nested
// rectangles. It carries navy-and-gold ribbon swags across all four corners, a
// red wax medallion, a laurel-wreath badge, VERTICAL holographic strips down
// the left and right edges only, an allover guilloche mesh rather than a
// central rosette, two Islamic mandala medallions low left and low right,
// scattered SHRS shield micro-marks, the Nigerian and Lagos State coats of
// arms, the institutional crest, and a QR block baked into the background.
//
// So the directive's "do not change the overall composition" is NOT satisfied
// by this file. What it does deliver is a genuinely resolution-free, press-
// legal ground in the same visual family: real epitrochoid guilloche, real
// <textPath> microtext, engraved rules, solid-ink hairlines throughout. It is
// a redrawn plate offered for approval, not a drop-in replacement, and
// certificate-template.js is deliberately NOT wired to it.
//
// WHY A FAITHFUL REBUILD IS NOT A DRAWING JOB
// The ribbons, the wax seal and the laurel badge are photographic objects with
// cloth folds and specular highlights; the two coats of arms are official
// state emblems. None can be derived from a 92 DPI JPEG without inventing
// detail, and approximating a state emblem is not a thing to do quietly.
// A faithful rebuild needs either the layered original or an explicit brief.
// See docs/certificate-ground-vector.md for the ledger and the measurements.
//
// WORDING RULE: the only text in this file is the institution's own name and
// "OFFICIAL ACADEMIC RECORD", both already approved and already printed on the
// sheet, plus the live serial. No new claim, slogan or title is introduced.

const PT = 0.35278; // mm per point — this file's user unit is the millimetre

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Fine linework carries SOLID light ink, never an opacity value. At separation
// an opacity on a hairline becomes a screen percentage, and a screened hairline
// is the first thing to drop out on press. So every pale tone in this file is
// pre-mixed against the paper and emitted as a flat hex — the ink is specified,
// not a tint of it. `strength` is how far from the paper towards the ink.
const PAPER = [0xF4, 0xEC, 0xDC];
function tint(hex, strength) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return '#' + c.map((v, i) => Math.max(0, Math.min(255,
    Math.round(PAPER[i] + (v - PAPER[i]) * strength)))
    .toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Epitrochoid — the lathe curve every real guilloche is cut from. R is the
// fixed wheel, r the rolling wheel, p the pen offset. R and r coprime gives a
// closed figure that only repeats after r/gcd turns, which is what makes the
// pattern expensive to copy by eye.
// The lobe count is R/gcd(R,r) — that is what separates lathe work from
// scribble. The first draft used ratios like 7:3, which close after ten loose
// loops and render as scrawl across the sheet; a real rose engine runs a large
// coprime R against a small r to cut sixty-odd fine petals. The step count is
// therefore derived from the lobe count, not fixed: at a flat 1440 steps a
// 61-lobe figure gets 23 points per petal and comes out faceted.
function epitrochoid(cx, cy, R, r, p) {
  const lobes = R / gcd(R, r);
  const steps = Math.max(720, Math.round(lobes * 28));
  const k = (R + r) / r;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * (r / gcd(R, r));
    const x = (R + r) * Math.cos(t) - p * Math.cos(k * t);
    const y = (R + r) * Math.sin(t) - p * Math.sin(k * t);
    // 0.01mm — a tenth of the finest line the press holds, so rounding here
    // cannot show, and it keeps the plate about half the size.
    d += `${i ? 'L' : 'M'}${(cx + x).toFixed(2)} ${(cy + y).toFixed(2)}`;
  }
  return d + 'Z';
}

function gcd(a, b) { a = Math.round(a); b = Math.round(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }

// A rosette is several counter-phased lathe passes, not one curve. Real
// guilloche gets its depth from passes that cross at incommensurate angles.
// R and r coprime, so the figure only closes after r turns — that is what makes
// the pattern expensive to copy by eye, and it is why the ratios below are
// primes rather than round numbers. Lobe count is R/gcd(R,r), which is the
// first column.
const LATHE = [
  [11, 2, 2.3], [17, 3, 3.4], [23, 4, 4.6], [31, 5, 5.7],
  [43, 6, 6.9], [61, 7, 8], [73, 8, 9], [89, 9, 11],
];

// A rosette is several counter-phased lathe passes, not one curve — real
// guilloche gets its depth from passes that cross at incommensurate angles.
//
// The spec is chosen BY SCALE, not fixed. A rose engine cuts at a roughly
// constant petal pitch; a fixed 61-lobe figure is correct across a 96mm sheet
// field and collapses into an illegible smudge on a 5mm medallion, which is
// exactly what the first render did to the four mid-edge medallions. Aiming
// for a ~3mm petal pitch at the outer radius keeps every rosette on the plate
// cut at the same visual grain.
function rosette(cx, cy, scale, ink, width, strength, passes = 3) {
  const want = (2 * Math.PI * scale) / 3.0;
  let base = 0;
  for (let i = 1; i < LATHE.length; i++) {
    if (Math.abs(LATHE[i][0] - want) < Math.abs(LATHE[base][0] - want)) base = i;
  }
  const stroke = tint(ink, strength);
  let out = '';
  for (let i = 0; i < passes; i++) {
    // Neighbouring specs, so the passes are close in grain but never in phase.
    const [R, r, p] = LATHE[Math.max(0, Math.min(LATHE.length - 1, base - i))];
    const s = scale / (R + r + p);   // outer radius lands on `scale`
    out += `<path d="${epitrochoid(cx, cy, R * s, r * s, p * s)}" fill="none" `
      + `stroke="${stroke}" stroke-width="${width}" `
      + `transform="rotate(${((i * 360) / (passes * 7)).toFixed(2)} ${cx} ${cy})"/>`;
  }
  return out;
}

// Islamic geometric star — the ground's own motif language, constructed from
// an n-fold rotation rather than drawn freehand, so every point is exact.
function starPolygon(cx, cy, n, rOuter, rInner, rot = 0) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n + rot;
    const rr = i % 2 ? rInner : rOuter;
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(3)} ${(cy + rr * Math.sin(a)).toFixed(3)}`;
  }
  return d + 'Z';
}

// The central watermark: concentric n-fold rosettes, the geometry of a khatam.
// Softly embossed by drawing a pale copy offset down-right under the ink copy,
// which is how a real blind emboss reads — a shadow wall on one side, a lit
// wall on the other, no drop shadow.
function watermark(cx, cy, R) {
  const rings = [
    { n: 16, ro: R, ri: R * 0.74, w: 0.30 },
    { n: 12, ro: R * 0.80, ri: R * 0.55, w: 0.26 },
    { n: 12, ro: R * 0.58, ri: R * 0.34, w: 0.22 },
    { n: 8, ro: R * 0.36, ri: R * 0.18, w: 0.20 },
  ];
  const draw = (dx, dy, ink, strength) => {
    const colour = tint(ink, strength);
    return rings.map((g, i) =>
      `<path d="${starPolygon(cx + dx, cy + dy, g.n, g.ro, g.ri, i * 0.13)}" fill="none" `
      + `stroke="${colour}" stroke-width="${g.w}"/>`).join('')
      + `<circle cx="${cx + dx}" cy="${cy + dy}" r="${(R * 0.12).toFixed(2)}" fill="none" `
      + `stroke="${colour}" stroke-width="0.22"/>`;
  };
  // Deliberately near the threshold of visibility. This sits directly behind
  // the student's name and the body paragraph; the first render had it at
  // 0.13 ink strength and it read as a graphic competing with the text, not
  // as a watermark in the sheet.
  return `<g>${draw(0.30, 0.30, '#FFFFFF', 0.34)}${draw(0, 0, '#8C7A55', 0.055)}
    ${rosette(cx, cy, R * 0.92, '#8C7A55', 0.12, 0.05, 3)}</g>`;
}

// Deterministic paper fibres. A real security substrate carries fibres in a
// few tints; the LCG keeps them identical between runs so two printings of
// the same plate are the same plate.
function fibres(w, h, seed, count) {
  let s = 0;
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const tints = ['#C9B6D8', '#B8C9D8', '#D8C9B0', '#C0D0BC', '#D6BCC2']
    .map((c) => tint(c, 0.34));
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = rnd() * h;
    const a = rnd() * Math.PI * 2, len = 1.4 + rnd() * 3.4;
    const bow = (rnd() - 0.5) * 1.5;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const mx = (x + x2) / 2 - Math.sin(a) * bow, my = (y + y2) / 2 + Math.cos(a) * bow;
    out += `<path d="M${x.toFixed(2)} ${y.toFixed(2)} Q${mx.toFixed(2)} ${my.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}"`
      + ` fill="none" stroke="${tints[i % tints.length]}" stroke-width="0.09"/>`;
  }
  return out;
}

// An anti-copy line screen. Set off both 0 and 45 degrees so it beats against
// a copier's own screen angles instead of aligning with them. Stroke width is
// held at or above the 0.07mm screen floor and the ink is pre-tinted, so the
// pattern never needs an opacity on the element that fills with it.
//
// NOTE ON NAMING: these are anti-copy screens, NOT a latent image. A latent
// image needs a coarse and a fine ruling at matched ink fraction with a shape
// defined between them; that construction lives in the number cartouche and is
// still unproven there (see docs/certificate-number-cartouche.md §4). Nothing
// in this file should be described to the printer as latent.
function screen(id, deg, pitch, width, ink, strength) {
  return `<pattern id="${id}" width="${pitch}" height="${pitch}" patternUnits="userSpaceOnUse"
    patternTransform="rotate(${deg})">
    <line x1="0" y1="0" x2="0" y2="${pitch}" stroke="${tint(ink, strength)}" stroke-width="${width}"/>
  </pattern>`;
}

// Engraved gold rule: a lit edge above, the ink, and a shadow wall below.
// Three solid strokes, never one stroke with an opacity — a screened hairline
// is the first thing to drop off press.
function engravedRule(x, y, w, h, weight) {
  return `<rect x="${x}" y="${(y - weight * 0.75).toFixed(2)}" width="${w}" height="${h + weight * 1.5}"
      fill="none" stroke="#F6E9C4" stroke-width="${(weight * 0.45).toFixed(3)}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none"
      stroke="url(#goldEngrave)" stroke-width="${weight}"/>
    <rect x="${(x + weight * 0.6).toFixed(2)}" y="${(y + weight * 0.6).toFixed(2)}"
      width="${(w - weight * 1.2).toFixed(2)}" height="${(h - weight * 1.2).toFixed(2)}"
      fill="none" stroke="${tint('#6E5013', 0.55)}" stroke-width="${(weight * 0.3).toFixed(3)}"/>`;
}

// A corner engraving: quarter rosette under a constructed knot, mirrored into
// each corner by transform so all four are provably identical.
function cornerEngraving(size) {
  const s = size;
  let arcs = '';
  for (let i = 1; i <= 6; i++) {
    const r = (s * i) / 7;
    arcs += `<path d="M0 ${r.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${r.toFixed(2)} 0"
      fill="none" stroke="${tint('#A6862C', 0.72)}" stroke-width="${(0.14 + i * 0.012).toFixed(3)}"/>`;
  }
  return `<g>${arcs}
    <path d="${starPolygon(s * 0.42, s * 0.42, 8, s * 0.20, s * 0.10)}" fill="none"
      stroke="#8C6516" stroke-width="0.20"/>
    <path d="${starPolygon(s * 0.42, s * 0.42, 8, s * 0.13, s * 0.065, 0.39)}" fill="none"
      stroke="#C49A2C" stroke-width="0.14"/>
    <circle cx="${(s * 0.42).toFixed(2)}" cy="${(s * 0.42).toFixed(2)}" r="${(s * 0.035).toFixed(2)}" fill="#8C6516"/>
    ${rosette(s * 0.42, s * 0.42, s * 0.30, '#A6862C', 0.10, 0.42, 2)}</g>`;
}

/**
 * The full ground. Returns a self-contained SVG string whose user unit is the
 * millimetre, so it places 1:1 on an A4-landscape sheet and can be rasterised
 * to any DPI without a resampling step.
 *
 * `serial` only feeds the microtext rails; pass the certificate's own serial
 * to make the ground per-document, or the institution name alone for a
 * generic plate.
 */
export function certificateGroundSvg({ w = 297, h = 210, serial = '', seed = 'SHRS' } = {}) {
  const micro = `SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL ACADEMIC RECORD${serial ? ` · ${serial}` : ''} · `;
  const ringOuter = micro.repeat(26);
  const ringInner = micro.repeat(20);

  // Taken off the supplied artwork (mm from the sheet edge) by single-scanline
  // edge detection. See the header: this reads a rectangular frame that the
  // source does not actually have, so these are the geometry of THIS plate,
  // not a transcription of the supplied one.
  const B = {
    hair: 4.7,        // outer gold hairline
    bandO: 10.2,      // engraved ornamental band, outer edge
    bandI: 14.0,      // engraved ornamental band, inner edge
    stripO: 21.7,     // iridescent security strip, outer edge
    stripI: 28.1,     // iridescent security strip, inner edge
    ruleA: 32.7,      // inner double rule, outer
    ruleB: 36.3,      // inner double rule, inner
  };
  const inset = (v) => ({ x: v, y: v, w: w - v * 2, h: h - v * 2 });
  const r = (v) => { const q = inset(v); return `x="${q.x}" y="${q.y}" width="${q.w.toFixed(2)}" height="${q.h.toFixed(2)}"`; };

  const microRing = (v) => `M ${v + 3} ${v} H ${w - v} V ${h - v} H ${v} V ${v} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"
  width="${w}mm" height="${h}mm" role="img" aria-hidden="true">
<defs>
  <linearGradient id="goldEngrave" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7A5A16"/><stop offset="0.22" stop-color="#C9A238"/>
    <stop offset="0.44" stop-color="#F2E2A8"/><stop offset="0.58" stop-color="#D8BC5E"/>
    <stop offset="0.74" stop-color="#B98F26"/><stop offset="1" stop-color="#6E5013"/>
  </linearGradient>
  <linearGradient id="goldWarm" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#E9D08F"/><stop offset="0.5" stop-color="#B98F26"/>
    <stop offset="1" stop-color="#E4CB8A"/>
  </linearGradient>
  <linearGradient id="goldCool" x1="1" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#D9CFA4"/><stop offset="0.5" stop-color="#A89246"/>
    <stop offset="1" stop-color="#DED3A6"/>
  </linearGradient>
  <linearGradient id="iris" x1="0" y1="0" x2="1" y2="0.35">
    <stop offset="0" stop-color="#E7D9E8"/><stop offset="0.18" stop-color="#D8E2F0"/>
    <stop offset="0.36" stop-color="#DFEDE2"/><stop offset="0.54" stop-color="#F2E8D4"/>
    <stop offset="0.72" stop-color="#EADCE8"/><stop offset="0.88" stop-color="#D9E4F2"/>
    <stop offset="1" stop-color="#E9DFE6"/>
  </linearGradient>
  <radialGradient id="paperTone" cx="0.5" cy="0.46" r="0.78">
    <stop offset="0" stop-color="#FBF6EA"/><stop offset="0.62" stop-color="#F4ECDC"/>
    <stop offset="1" stop-color="#EADFC9"/>
  </radialGradient>
  ${screen('antiCopy', 8, 0.42, 0.07, '#CBB894', 0.39)}
  ${screen('antiCopyB', 53, 0.44, 0.07, '#C6B08A', 0.28)}
  ${screen('bandEngrave', 68, 0.30, 0.08, '#7C601C', 1)}
  <path id="ringO" d="${microRing(8.7)}"/>
  <path id="ringI" d="${microRing(38.6)}"/>
</defs>

<!-- 1. the sheet: ivory security paper with a warm centre falloff -->
<rect width="${w}" height="${h}" fill="url(#paperTone)"/>

<!-- 2. anti-copy fine-line field, full bleed -->
<rect width="${w}" height="${h}" fill="url(#antiCopy)"/>

<!-- 3. radial engraving field — four lathe passes at sheet scale -->
${rosette(w / 2, h / 2, 118, '#8C6516', 0.13, 0.055, 4)}

<!-- 4. softly embossed central watermark -->
${watermark(w / 2, h * 0.5, 52)}

<!-- 5. paper fibres -->
${fibres(w, h, seed, 150)}

<!-- 6. border architecture, at the measured insets -->
<rect ${r(B.hair)} fill="none" stroke="url(#goldWarm)" stroke-width="0.35"/>
<rect ${r(B.hair + 1.1)} fill="none" stroke="#8C6516" stroke-width="0.12"/>

<!-- ornamental band: guilloche strapwork between two engraved rules -->
<g>
  ${engravedRule(B.bandO, B.bandO, w - B.bandO * 2, h - B.bandO * 2, 0.5)}
  <rect ${r((B.bandO + B.bandI) / 2)} fill="none" stroke="url(#goldCool)"
    stroke-width="${(B.bandI - B.bandO - 1).toFixed(2)}"/>
  <rect ${r((B.bandO + B.bandI) / 2)} fill="none" stroke="url(#bandEngrave)"
    stroke-width="${(B.bandI - B.bandO - 1).toFixed(2)}"/>
  ${engravedRule(B.bandI, B.bandI, w - B.bandI * 2, h - B.bandI * 2, 0.42)}
</g>

<!-- 7. iridescent security strip -->
<g>
  <rect ${r((B.stripO + B.stripI) / 2)} fill="none" stroke="url(#iris)"
    stroke-width="${(B.stripI - B.stripO).toFixed(2)}"/>
  <rect ${r((B.stripO + B.stripI) / 2)} fill="none" stroke="url(#antiCopyB)"
    stroke-width="${(B.stripI - B.stripO).toFixed(2)}"/>
  <rect ${r(B.stripO)} fill="none" stroke="#B39A5E" stroke-width="0.13"/>
  <rect ${r(B.stripI)} fill="none" stroke="#B39A5E" stroke-width="0.13"/>
</g>

<!-- 8. inner double rule closing the margin -->
<rect ${r(B.ruleA)} fill="none" stroke="url(#goldWarm)" stroke-width="0.38"/>
<rect ${r(B.ruleB)} fill="none" stroke="#8C6516" stroke-width="0.12"/>

<!-- 9. microtext rails — approved wording only -->
<text font-family="Inter, sans-serif" font-size="${(0.9 * PT).toFixed(3)}"
  letter-spacing="0.02" fill="#A6905E">
  <textPath href="#ringO">${esc(ringOuter)}</textPath></text>
<text font-family="Inter, sans-serif" font-size="${(0.8 * PT).toFixed(3)}"
  letter-spacing="0.03" fill="#B09A68">
  <textPath href="#ringI">${esc(ringInner)}</textPath></text>

<!-- 10. corner engravings, one construction mirrored four ways -->
<g transform="translate(${B.bandI + 0.6} ${B.bandI + 0.6})">${cornerEngraving(17)}</g>
<g transform="translate(${w - B.bandI - 0.6} ${B.bandI + 0.6}) scale(-1 1)">${cornerEngraving(17)}</g>
<g transform="translate(${w - B.bandI - 0.6} ${h - B.bandI - 0.6}) scale(-1 -1)">${cornerEngraving(17)}</g>
<g transform="translate(${B.bandI + 0.6} ${h - B.bandI - 0.6}) scale(1 -1)">${cornerEngraving(17)}</g>

<!-- 11. engraved security medallions at the mid-edges -->
${rosette(w / 2, B.bandI + 1.9, 5.4, '#8C6516', 0.11, 0.5, 3)}
${rosette(w / 2, h - B.bandI - 1.9, 5.4, '#8C6516', 0.11, 0.5, 3)}
${rosette(B.bandI + 1.9, h / 2, 5.4, '#8C6516', 0.11, 0.5, 3)}
${rosette(w - B.bandI - 1.9, h / 2, 5.4, '#8C6516', 0.11, 0.5, 3)}

<!-- 12. registration ornaments — solid ink, never a screened hairline -->
${[[w / 2, B.hair + 2.6], [w / 2, h - B.hair - 2.6], [B.hair + 2.6, h / 2], [w - B.hair - 2.6, h / 2]]
    .map(([x, y]) => `<g><circle cx="${x}" cy="${y}" r="1.15" fill="none" stroke="#C6B48A" stroke-width="0.1"/>
      <line x1="${x - 1.8}" y1="${y}" x2="${x + 1.8}" y2="${y}" stroke="#C6B48A" stroke-width="0.1"/>
      <line x1="${x}" y1="${y - 1.8}" x2="${x}" y2="${y + 1.8}" stroke="#C6B48A" stroke-width="0.1"/>
      <circle cx="${x}" cy="${y}" r="0.26" fill="#C6B48A"/></g>`).join('')}
</svg>`;
}
