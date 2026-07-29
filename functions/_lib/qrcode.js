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
export function qrSvg(text, { width = 220, margin = 2 } = {}) {
  const qrData = qrCore.create(text, { errorCorrectionLevel: 'M' });
  return svgRenderer.render(qrData, { width, margin });
}
