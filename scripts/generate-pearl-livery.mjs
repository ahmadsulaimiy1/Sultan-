#!/usr/bin/env node
// Generates the Pearl livery (Theme VII, the flagship default) from the
// Royal Gold block in css/liveries.css — the same way the other five
// liveries were produced, by a per-token transfer over the house
// palette, not by hand-setting ~330 RGB values.
//
// Deliberately NOT the "hold relative luminance constant" transfer the
// file's own header describes for Coffee/Sapphire/Emerald/Garnet/
// Obsidian. Those five exist so a reader can pick a different hue at
// the *same* visual weight as the house livery. Pearl is not another
// preference alongside Royal Gold — it is the founder's flagship
// replacement for it, and the brief was explicit: brighter and whiter
// than any existing livery holds, not just a different colour at the
// same brightness. So this script trades luminance-preservation for
// three rules, applied per token:
//
//   PAPER  (the named p1-p6/mk family, or anything already very light)
//          -> pushed to true white/off-white, desaturated hard.
//   INK    (anything already dark) -> stays dark, for contrast; only a
//          faint hue shift so body text doesn't visibly change weight.
//   GOLD/BRONZE/EMERALD (the named accent family, or any mid-tone
//          colourful token) -> rotated fully onto the site's own
//          --crimson (#7C1F2E, css/brand.css) and enriched — this is
//          the "royal red accent" the founder asked for, applied
//          site-wide through the token system rather than hand-patched
//          per component.
//
// Usage: node scripts/generate-pearl-livery.mjs
// Prints the two new blocks (light + dark) to stdout; paste-replace
// the existing Pearl blocks in css/liveries.css if the source Royal
// block ever changes and Pearl needs regenerating to match.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVERIES = readFileSync(path.join(ROOT, 'css/liveries.css'), 'utf8');

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = 0; s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hsl2rgb(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Anchor hue: the site's own --crimson (#7C1F2E, css/brand.css) — Pearl's
// red must match the brand crimson already defined, not invent a new one.
const [ANCHOR_H] = rgb2hsl(0x7C, 0x1F, 0x2E);

const PAPER_NAMES = new Set(['p1','p2','p3','p4','p5','p6','mk','w00','w02','w03','w05','w06','w15','w17','w19','w25','w26','w36','w38','w40','w41','w43','w46','w50','w51']);
const GOLD_NAMES = new Set(['g','gb','gd','gl','gl2','gl3','gl4','gp','gt','gt2','gt3','gt4','gt5','bz','bzb','em','w116','w220','w221']);

function transformToken(name, r, g, b) {
  const [h, s, l] = rgb2hsl(r, g, b);
  let nh, ns, nl;
  if (PAPER_NAMES.has(name)) {
    nh = ANCHOR_H; ns = Math.min(s * 0.08, 0.035); nl = Math.min(0.99, l + (1 - l) * 0.85);
  } else if (GOLD_NAMES.has(name)) {
    nh = ANCHOR_H; ns = Math.min(1, s * 1.05 + 0.15); nl = l;
  } else if (l >= 0.80) {
    nh = ANCHOR_H; ns = Math.min(s * 0.12, 0.05); nl = Math.min(0.99, l + (1 - l) * 0.7);
  } else if (l <= 0.28) {
    nh = ANCHOR_H; ns = Math.min(s * 0.6, 0.24); nl = l;
  } else if (s < 0.12) {
    nh = ANCHOR_H; ns = Math.min(s, 0.08); nl = l;
  } else {
    nh = ANCHOR_H; ns = Math.min(1, s * 1.0 + 0.12); nl = l * 0.96;
  }
  return hsl2rgb(nh, ns, nl);
}

function parseBlock(selectorRe) {
  const m = selectorRe.exec(LIVERIES);
  if (!m) throw new Error('block not found: ' + selectorRe);
  const start = m.index + m[0].length;
  const end = LIVERIES.indexOf('\n}', start);
  const body = LIVERIES.slice(start, end);
  const tokens = [];
  const re = /--lv-([a-z0-9]+):\s*([\d,]+);/g;
  let tm;
  while ((tm = re.exec(body))) {
    const [r, g, b] = tm[2].split(',').map(Number);
    tokens.push({ name: tm[1], r, g, b });
  }
  return tokens;
}

function formatBlock(selector, comment, tokens) {
  const parts = tokens.map((t) => {
    const [r, g, b] = transformToken(t.name, t.r, t.g, t.b);
    return `--lv-${t.name}:${r},${g},${b};`;
  });
  let lines = []; let cur = '  ';
  for (const p of parts) {
    if ((cur + p).length > 78) { lines.push(cur.trimEnd()); cur = '  '; }
    cur += p + ' ';
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return `${comment}\n${selector}{\n${lines.join('\n')}\n}`;
}

const lightTokens = parseBlock(/:root, :root\[data-pc-livery="royal"\]\{/);
const darkTokens = parseBlock(/:root\[data-pc-theme="dark"\], :root\[data-pc-theme="dark"\]\[data-pc-livery="royal"\]\{/);

console.log(formatBlock(
  ':root[data-pc-livery="pearl"]',
  '/* Pearl — Theme VII, the flagship livery. */',
  lightTokens,
));
console.log();
console.log(formatBlock(
  ':root[data-pc-theme="dark"][data-pc-livery="pearl"]',
  '/* Midnight — Pearl */',
  darkTokens,
));
