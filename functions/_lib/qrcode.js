// Thin wrapper around the `qrcode` npm package (Ryan Day, MIT licensed —
// the actual battle-tested Reed-Solomon encoder, not a hand-rolled one)
// for use inside Cloudflare Pages Functions.
//
// Deliberately imports only the two pure-JS pieces that don't touch
// Node's canvas/fs/zlib (qrcode's PNG/canvas renderers need those, and
// aren't guaranteed to work in the Workers runtime even with
// nodejs_compat): the core matrix encoder and the SVG-tag renderer.
// Both are synchronous, dependency-free string/array manipulation.
import qrCore from 'qrcode/lib/core/qrcode.js';
import svgRenderer from 'qrcode/lib/renderer/svg-tag.js';

// Renders `text` (e.g. a verification URL) as a self-contained SVG
// string. errorCorrectionLevel 'M' (~15% recovery) is the package's own
// default and a reasonable middle ground for something printed on a
// certificate — high enough to survive a low-quality photocopy scan,
// without forcing an unnecessarily large/dense code for short URLs.
// Callers issuing higher-security documents (e.g. the Stage 3
// Graduation Document ecosystem — see functions/api/graduation-
// documents/qr.js) can request 'Q' (~25% recovery) instead.
export function qrSvg(text, { width = 220, margin = 2, errorCorrectionLevel = 'M' } = {}) {
  const qrData = qrCore.create(text, { errorCorrectionLevel });
  return svgRenderer.render(qrData, { width, margin });
}

// ─────────────────────────────────────────────────────────────────────
// PRINT-GRADE RENDERER — use this for anything that goes on paper.
// ─────────────────────────────────────────────────────────────────────
// The package's svg-tag renderer draws the symbol as STROKED PATHS with
// no stroke-width attribute, i.e. it relies on the consumer's default.
// A browser resolves that to 1 user unit and the code looks right on
// screen — but through Chromium's print pipeline the modules came out as
// hairlines. Measured on the production PDF: 12.1% dark coverage at
// 300 DPI falling to 5.7% at 1200 DPI, against the 52% the matrix
// actually contains. Coverage that DROPS as resolution rises is the
// signature of a hairline, and neither ZXing nor OpenCV could read the
// result at any resolution. The screen render decoded, so nothing caught
// it until the PDF itself was decoded.
//
// This renderer takes the same battle-tested matrix and emits FILLED
// RECTANGLES. There is no stroke, so there is no renderer-dependent
// width, and horizontally adjacent modules merge into one rect so the
// module edges are continuous rather than butt-jointed.
//
// Defaults follow ISO/IEC 18004:
//   · quiet zone 4 modules (§6.3.8) — the old call site used 2
//   · pure #000000 so the symbol separates as 100% K on a single plate;
//     a warm near-black builds from four plates and any misregistration
//     softens every module edge
//
// `width` is optional. Omit it when the symbol is placed inside sized markup
// (the certificate does this, so the plate controls the module pitch); pass it
// when the SVG is served standalone as image/svg+xml and therefore needs
// intrinsic dimensions of its own.
export function qrSvgForPrint(text, { width, margin = 4, errorCorrectionLevel = 'H', dark = '#000000', light = '#FFFFFF' } = {}) {
  const qrData = qrCore.create(text, { errorCorrectionLevel });
  const { size, data } = qrData.modules;
  const total = size + margin * 2;
  let rects = '';
  for (let y = 0; y < size; y++) {
    let runStart = -1;
    for (let x = 0; x <= size; x++) {
      const on = x < size && !!data[y * size + x];
      if (on && runStart < 0) runStart = x;
      if (!on && runStart >= 0) {
        rects += `<rect x="${runStart + margin}" y="${y + margin}" width="${x - runStart}" height="1"/>`;
        runStart = -1;
      }
    }
  }
  const size2d = width ? `width="${width}" height="${width}" ` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" ${size2d}viewBox="0 0 ${total} ${total}" `
    + `shape-rendering="crispEdges" role="img">`
    + `<rect width="${total}" height="${total}" fill="${light}"/>`
    + `<g fill="${dark}" stroke="none">${rects}</g></svg>`;
}

// Module count for a payload, so a caller can check its printed module
// pitch against the press before committing to a plate size.
export function qrModuleCount(text, { margin = 4, errorCorrectionLevel = 'H' } = {}) {
  return qrCore.create(text, { errorCorrectionLevel }).modules.size + margin * 2;
}
