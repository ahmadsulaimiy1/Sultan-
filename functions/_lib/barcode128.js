// Code 128 (Subset B) SVG barcode renderer for the Stage 3 Graduation
// Document ecosystem (docs/shrs-master-graduation-document-specification.md
// §3.4, §15) — no barcode-rendering capability existed anywhere in this
// codebase before this file (confirmed by search). No 1D-barcode npm
// package is installed either (only `qrcode`, used by qrcode.js); rather
// than vendor a large new dependency of uncertain Workers-runtime
// compatibility, this reproduces the standard ISO/IEC 15417 Code 128
// bar-pattern table directly — the same 107-symbol table published by
// the MIT-licensed JsBarcode project (github.com/lindell/JsBarcode,
// src/barcodes/CODE128/constants.js), fetched and transcribed verbatim
// rather than typed from memory, precisely because an incorrect
// transcription here would produce a barcode that looks right but does
// not scan — unacceptable on a security document.
//
// Subset B only (ASCII 32–126: space, digits, uppercase, hyphen — every
// character SHRS's own reference numbers ever use), matching this
// project's existing "pure-JS, SVG-out, no canvas" discipline for the
// QR renderer (functions/_lib/qrcode.js) — the same reasoning applies:
// canvas isn't reliably available in the Cloudflare Workers runtime.
const START_B = 104;
const STOP = 106;
const MODULO = 103;

// Index i = symbol value i. Each entry's decimal digits are the module
// widths read left-to-right as alternating bar/space (bar first),
// e.g. 11011001100 -> bar(2) space(1) bar(1) space(2) bar(2) space(1)
// bar(1) space(1) bar(2) space(1) bar(1) ... (module-count encoding, one
// digit per module, 1 = ink, 0 = gap). Entry 106 (STOP) has 13 modules;
// every other entry has 11.
const BARS = [
  11011001100, 11001101100, 11001100110, 10010011000, 10010001100,
  10001001100, 10011001000, 10011000100, 10001100100, 11001001000,
  11001000100, 11000100100, 10110011100, 10011011100, 10011001110,
  10111001100, 10011101100, 10011100110, 11001110010, 11001011100,
  11001001110, 11011100100, 11001110100, 11101101110, 11101001100,
  11100101100, 11100100110, 11101100100, 11100110100, 11100110010,
  11011011000, 11011000110, 11000110110, 10100011000, 10001011000,
  10001000110, 10110001000, 10001101000, 10001100010, 11010001000,
  11000101000, 11000100010, 10110111000, 10110001110, 10001101110,
  10111011000, 10111000110, 10001110110, 11101110110, 11010001110,
  11000101110, 11011101000, 11011100010, 11011101110, 11101011000,
  11101000110, 11100010110, 11101101000, 11101100010, 11100011010,
  11101111010, 11001000010, 11110001010, 10100110000, 10100001100,
  10010110000, 10010000110, 10000101100, 10000100110, 10110010000,
  10110000100, 10011010000, 10011000010, 10000110100, 10000110010,
  11000010010, 11001010000, 11110111010, 11000010100, 10001111010,
  10100111100, 10010111100, 10010011110, 10111100100, 10011110100,
  10011110010, 11110100100, 11110010100, 11110010010, 11011011110,
  11011110110, 11110110110, 10101111000, 10100011110, 10001011110,
  10111101000, 10111100010, 11110101000, 11110100010, 10111011110,
  10111101110, 11101011110, 11110101110, 11010000100, 11010010000,
  11010011100, 1100011101011,
];

// Each BARS[value] number's decimal digits ARE the per-module bits, one
// digit per printed module (1 = ink, 0 = gap) — NOT run-length widths.
// (Verified against the source: concatenating every symbol's digit
// string end-to-end and counting characters for a 7-character test
// payload gives exactly 11*(1 start + 7 data + 1 checksum) + 13 stop =
// 112 module-bits, matching the standard symbol/module-count formula —
// confirms this is a flat per-module bitstring, not width pairs.)
function moduleBits(symbolValue) {
  return String(BARS[symbolValue]).split('').map(Number);
}

// Encodes `text` (ASCII 32–126 only) as a flat array of per-module bits
// (1 = ink, 0 = gap) representing the full symbol: START B + data +
// checksum + STOP, concatenated in printed order.
export function encodeCode128B(text) {
  if (!/^[\x20-\x7E]*$/.test(text)) {
    throw new Error('Code 128 Subset B can only encode ASCII 32–126 characters.');
  }
  const values = text.split('').map((ch) => ch.charCodeAt(0) - 32);
  let checksum = START_B;
  values.forEach((v, i) => { checksum += v * (i + 1); });
  checksum = checksum % MODULO;

  const symbols = [START_B, ...values, checksum, STOP];
  return symbols.flatMap(moduleBits);
}

// Renders `text` as a self-contained SVG string. Walks the per-module
// bitstring left to right, drawing one solid rect per contiguous run of
// ink modules (run-length merged purely to keep the SVG small — a
// scanner reads total ink/gap width per run either way, so this has no
// effect on scannability), each module `unitWidth` px wide, `height` px
// tall, a human-readable caption beneath the bars (spec §15's "read the
// number if the scanner fails" requirement).
export function barcode128Svg(text, { unitWidth = 2, height = 60, margin = 10, showText = true } = {}) {
  const bits = encodeCode128B(text);
  const barsWidth = bits.length * unitWidth;
  const captionHeight = showText ? 18 : 0;
  const svgWidth = barsWidth + margin * 2;
  const svgHeight = height + margin * 2 + captionHeight;

  let rects = '';
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === 1) {
      let runEnd = i;
      while (runEnd < bits.length && bits[runEnd] === 1) runEnd++;
      const x = margin + i * unitWidth;
      const runWidth = (runEnd - i) * unitWidth;
      rects += `<rect x="${x}" y="${margin}" width="${runWidth}" height="${height}" fill="#000"/>`;
      i = runEnd;
    } else {
      i++;
    }
  }

  const caption = showText
    ? `<text x="${svgWidth / 2}" y="${margin + height + 14}" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">${escapeXml(text)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">` +
    `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#fff"/>` +
    rects + caption +
    `</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
