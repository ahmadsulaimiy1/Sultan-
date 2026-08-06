// The I'dadiyyah certificate plate — the client's supplied composition,
// rebuilt as a production master rather than replaced.
//
// Source: the I'dadiyyah background supplied 2026-08-06, installed as
// assets/images/certificates/official-background-idd.jpg. The upload carried a
// 10px black letterbox band on its top edge, which is cropped off — left in, it
// would print as a black bar across the head of every certificate.
//
// ── THE CONSTRAINT, MEASURED ─────────────────────────────────────────────────
// The supplied file is 1080x762 over a 297x210mm sheet: 92.4 DPI. Spectrally
// there is no fine detail left to recover. At that sampling every ornamental
// stroke on the plate is about three pixels wide.
//
// That matters more than it first sounds. Redrawing a three-pixel-wide curve as
// vector does not recover the original curve; it invents a plausible one. So a
// true 600 DPI vector reconstruction of THIS artwork cannot be derived from
// THIS file — not for want of effort, but because the information is not
// present. Producing one needs a higher-resolution source, or a redraw briefed
// by whoever owns the design intent.
//
// ── WHAT THIS MODULE THEREFORE DOES ──────────────────────────────────────────
// It splits the sheet the only way that is honest:
//
//   PRESERVED, pixel-exact   Every mark on the plate — the four corner ribbon
//     swags, the laurel badge, the red wax medallion, the gold wax seal, both
//     holographic strips, the holographic roundel, the lock cartouche, the
//     engraved gold frame and its mandala corners, the central mandala
//     watermark, the vertical microtext columns, the shield emblem, the QR
//     block. These come from official-background-idd-marks.png, which is the
//     supplied artwork with its paper solved out (see below). Nothing is
//     redrawn, moved, recoloured or omitted.
//
//   REBUILT, resolution-free   The paper the marks sit on. Flat vector, exact
//     at any DPI, and — because of the solve — indistinguishable from the
//     artwork's own paper.
//
// The marks layer remains 92 DPI. That is stated plainly rather than disguised,
// and it is the one thing a higher-resolution source would fix outright.
//
// ── THE SOLVE, WHICH IS WHY THIS IS A RECONSTRUCTION AND NOT A GUESS ─────────
// Source-over compositing is  out = PAPER*(1-a) + C*a.  The marks layer is not
// keyed by eye; its colour channel is solved from that equation,
// C = (S - PAPER*(1-a)) / a, so that compositing it back over the PAPER rect
// below reproduces the supplied artwork. Measured reconstruction error against
// the source: 0.35 of 255 — under half a level.
//
// CHANGING `PAPER` INVALIDATES THE MARKS LAYER. It was solved against exactly
// this constant; a different paper shifts every mark's density against a ground
// it was not solved for. Regenerate the marks layer if this changes.
//
// ── ADDITIONS ARE OPT-IN, AND OFF BY DEFAULT ─────────────────────────────────
// `microtextRails` adds per-document microtext carrying the live serial — a
// real security gain, since the plate's own microtext is identical on every
// sheet. It is OFF by default: the client asked for their composition rebuilt
// faithfully, so the default output is their plate and nothing else. Turning it
// on is a deliberate choice, not a side effect of using this module.
//
// See docs/certificate-ground-vector.md for the ledger and the measurements.

const PT = 0.35278; // mm per point — this file's user unit is the millimetre

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Median of the artwork's own low-ink pixels. See the solve note above before
// touching this.
export const PAPER = '#F4ECDF';

// Measured off the I'dadiyyah plate on scanlines chosen to miss every object
// (top: x 104-129mm; sides: y 82-94mm). Insets from the sheet edge, in mm.
// Recorded so anything added later lands in real paper rather than on the
// plate's own ornament.
export const PLATE_RULES = {
  frameOuter: 2.8,   // engraved gold frame, outer edge
  frameInner: 9.4,   // engraved gold frame, inner edge (top/bottom)
  bandInner: 22.3,   // decorated band below the frame, inner edge
  stripOuter: 16.5,  // left/right holographic strips, outer edge
  stripInner: 34.7,  // left/right holographic strips, inner edge
  fieldTop: 24.3,    // open field begins
};

/**
 * The full plate. Returns a self-contained SVG string whose user unit is the
 * millimetre, so it places 1:1 on an A4-landscape sheet.
 *
 * `marksHref` must point at official-background-idd-marks.png. It is required
 * and deliberately not defaulted: a plate that silently renders without the
 * client's artwork is exactly the failure this codebase has been bitten by
 * twice — once when a render harness produced a passing PDF of a document
 * missing its background, and again when the first run of this module's own
 * gate reported success on a blank sheet.
 */
export function certificatePlateSvg({
  w = 297, h = 210, serial = '', marksHref, microtextRails = false,
} = {}) {
  if (!marksHref) throw new Error('certificatePlateSvg: marksHref is required');

  let rails = '';
  let defs = '';
  if (microtextRails) {
    // Just inside the innermost rule, in the open field, where this plate
    // carries paper rather than ornament.
    const yTop = PLATE_RULES.fieldTop + 1.2;
    const yBottom = h - yTop;
    const x0 = PLATE_RULES.stripInner + 5.0;
    const x1 = w - x0;
    const micro = `SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL ACADEMIC RECORD${serial ? ` · ${serial}` : ''} · `;
    // ~1.55mm per character at 0.9pt with the letter-spacing below; overshoot
    // and let the path clip rather than leave a gap at the rail's end.
    const reps = Math.max(2, Math.ceil((x1 - x0) / (micro.length * 1.55)) + 1);
    const text = esc(micro.repeat(reps));
    defs = `
  <path id="plRailT" d="M ${x0} ${yTop} H ${x1}"/>
  <path id="plRailB" d="M ${x0} ${yBottom.toFixed(2)} H ${x1}"/>`;
    // Solid light ink, never an opacity: an opacity on type this small becomes
    // a screen percentage at separation and drops out first on press.
    rails = `
<text font-family="Inter, sans-serif" font-size="${(0.9 * PT).toFixed(3)}"
  letter-spacing="0.02" fill="#A6905E">
  <textPath href="#plRailT" xlink:href="#plRailT">${text}</textPath></text>
<text font-family="Inter, sans-serif" font-size="${(0.8 * PT).toFixed(3)}"
  letter-spacing="0.03" fill="#B09A68">
  <textPath href="#plRailB" xlink:href="#plRailB">${text}</textPath></text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" role="img" aria-hidden="true">
<defs>${defs}
</defs>

<!-- 1. the sheet — flat vector, resolution-free, and the exact tone the marks
     layer was solved against -->
<rect width="${w}" height="${h}" fill="${PAPER}"/>

<!-- 2. the client's plate: every mark, at its original position and colour.
     Nothing here is redrawn, moved, recoloured or omitted. -->
<image href="${esc(marksHref)}" xlink:href="${esc(marksHref)}"
  x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/>
${rails}
</svg>`;
}
