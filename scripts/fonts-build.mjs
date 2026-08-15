#!/usr/bin/env node
/* ===========================================================================
   FONTS BUILD — bring the typefaces onto this origin
   ===========================================================================

   THE FAULT THIS FIXES. 223 pages carried a render-blocking

       <link href="https://fonts.googleapis.com/css2?family=Cinzel…">

   in <head>. First paint was therefore hostage to a third-party request. It
   is not a theoretical risk: measured in a browser that could not reach
   fonts.googleapis.com, first contentful paint on the home page was
   12,960 ms — nothing on screen at all until the request gave up. The same
   stall happens on any congested cell, any network that filters Google, and
   any moment gstatic is slow.

   68.7% of Nigerian web traffic is mobile and predominantly GSM
   (DataReportal, Digital 2026: Nigeria), so the third-party round trip is
   the request most likely to stall for the exact visitor this site is for.

   WHAT THIS DOES. Downloads the same faces Google serves, stores them under
   /assets/fonts, and generates css/fonts.css with the same unicode-range
   declarations Google uses — so an English reader still downloads only the
   latin subset and the Arabic faces stay unfetched until an Arabic codepoint
   appears. The design does not change; the files are the same files. What
   changes is the origin, the extra DNS + TLS + connection that disappears,
   and the fact that visitors' IPs stop being disclosed to a third party on
   page load.

       node scripts/fonts-build.mjs          regenerate css/fonts.css
       node scripts/fonts-build.mjs --fetch  re-download the faces too

   The manifest is committed so a normal build needs no network.
   =========================================================================== */
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const FONT_DIR = join(ROOT, 'assets/fonts');
const MANIFEST = join(ROOT, 'scripts/fonts.manifest.json');

/* TWO BUNDLES, because 219 pages should not pay for four.

   `core` is the institutional typography — every page uses it. `editions` is
   the bespoke typography of four prospectus editions, which set themselves in
   faces that appear nowhere else on the site. A single stylesheet would put
   6 families of @font-face declarations in front of every visitor for the
   benefit of four pages; @font-face is lazy about the FILES, but the
   declarations themselves are bytes on the render-blocking path. */
const BUNDLES = {
  core: {
    out: 'css/fonts.css',
    title: 'SELF-HOSTED TYPEFACES — the institutional set',
    request:
      'https://fonts.googleapis.com/css2' +
      '?family=Cinzel:wght@400;500;600;700;800' +
      '&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600;1,700' +
      '&family=Inter:wght@400;500;600;700' +
      '&family=Amiri:ital,wght@0,400;0,700;1,400' +
      '&family=Cairo:wght@400;500;600;700' +
      '&display=swap',
  },
  editions: {
    out: 'css/fonts-editions.css',
    title: 'SELF-HOSTED TYPEFACES — the prospectus editions',
    request:
      'https://fonts.googleapis.com/css2' +
      '?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400' +
      '&family=Jost:wght@300;400;500;600;700' +
      '&family=IBM+Plex+Sans:wght@300;400;600;700' +
      '&family=Playfair+Display:ital,wght@0,700;1,700' +
      '&family=Source+Sans+3:wght@400;600;700' +
      '&family=Space+Grotesk:wght@400;500;700' +
      '&display=swap',
  },
};

/* Latin and latin-ext cover English, French and the Latin-script content;
   arabic covers the Qur'anic and Arabic-studies material. Cyrillic, Greek and
   Vietnamese are 41 files this school will never render. */
const KEEP = new Set(['latin', 'latin-ext', 'arabic']);

/* A desktop UA, because Google serves woff2 only to browsers that claim to
   support it — asked as curl, it answers with truetype and the files triple
   in size. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/* Google retired Source Sans Pro in favour of Source Sans 3. The page's CSS
   still names the old family, so the new files are declared under the old
   name — otherwise the @font-face would never match and the page would
   silently fall back to a system sans. */
const ALIAS = { 'Source Sans 3': 'Source Sans Pro' };

async function fetchManifest(REQUEST) {
  const css = await (await fetch(REQUEST, { headers: { 'User-Agent': UA } })).text();
  const parts = css.split(/\/\* ([a-z-]+) \*\/\n/).slice(1);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) {
    const subset = parts[i], block = parts[i + 1];
    if (!KEEP.has(subset)) continue;
    const raw = (block.match(/font-family: *'([^']+)'/) || [])[1];
    const fam = ALIAS[raw] || raw;
    const style = (block.match(/font-style: *([a-z]+)/) || [])[1] || 'normal';
    const wght = (block.match(/font-weight: *([0-9 .]+)/) || [])[1].trim();
    const url = (block.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    const range = (block.match(/unicode-range: *([^;]+);/) || [])[1];
    const slug = `${fam.toLowerCase().replace(/ /g, '-')}-${subset}-` +
                 `${wght.replace(/[ .]/g, '')}-${style}.woff2`;
    out.push({ fam, style, wght, url, range, slug, subset });
  }
  mkdirSync(FONT_DIR, { recursive: true });
  for (const f of out) {
    const buf = Buffer.from(await (await fetch(f.url)).arrayBuffer());
    if (buf.length < 1024) throw new Error(`suspiciously small: ${f.slug}`);
    writeFileSync(join(FONT_DIR, f.slug), buf);
  }
  console.log(`fetched ${out.length} faces`);
  return out;
}

function generate(faces, { out: outPath, title }) {
  /* Latin first so the parser discovers the critical subset first; arabic
     last, because it should not be reached on an English page at all. */
  const ORDER = { latin: 0, 'latin-ext': 1, arabic: 2 };
  faces.sort((a, b) =>
    a.fam.localeCompare(b.fam) ||
    (ORDER[a.subset] - ORDER[b.subset]) ||
    a.style.localeCompare(b.style) ||
    (+a.wght - +b.wght));

  const missing = faces.filter((f) => !existsSync(join(FONT_DIR, f.slug)));
  if (missing.length) {
    console.error('MISSING FONT FILES:\n  ' + missing.map((f) => f.slug).join('\n  ') +
                  '\nRun with --fetch.');
    process.exit(1);
  }

  let css = `/* ===========================================================================
   ${title}
   ===========================================================================

   These faces were fetched from fonts.googleapis.com by a render-blocking
   <link> on 223 pages, which put first paint behind a third-party request.
   Measured with that host unreachable, first contentful paint on the home
   page was 12,960 ms: a blank screen until the request timed out. On a market
   that is 68.7% mobile and mostly GSM, that is the wrong request to depend on.

   Same faces, same versions, same unicode-ranges — so an English reader still
   downloads only the latin subset and the Arabic files stay unfetched until an
   Arabic codepoint appears. Nothing about the design changes. What changes is
   that a second origin, its DNS lookup, its TLS handshake and its ability to
   stall are all gone, the files fall under this site's own immutable
   /assets/* cache rule, and no visitor's IP is disclosed to a third party on
   page load.

   GENERATED by scripts/fonts-build.mjs — do not hand-edit.
   =========================================================================== */\n\n`;

  let fam = '', bytes = 0, latinBytes = 0;
  for (const f of faces) {
    if (f.fam !== fam) { fam = f.fam; css += `/* ---- ${fam} ---- */\n`; }
    const size = statSync(join(FONT_DIR, f.slug)).size;
    bytes += size;
    if (f.subset === 'latin') latinBytes += size;
    css += `@font-face{font-family:'${f.fam}';font-style:${f.style};font-weight:${f.wght};` +
           `font-display:swap;src:url('/assets/fonts/${f.slug}') format('woff2');` +
           `unicode-range:${f.range};}\n`;
  }
  writeFileSync(join(ROOT, outPath), css);

  console.log(`  ${outPath.padEnd(24)} ${String(faces.length).padStart(3)} faces  ` +
              `css ${(Buffer.byteLength(css) / 1024).toFixed(1).padStart(5)} KB  ` +
              `disk ${(bytes / 1024).toFixed(0).padStart(5)} KB  ` +
              `latin ${(latinBytes / 1024).toFixed(0).padStart(4)} KB`);
}

const FETCH = process.argv.includes('--fetch');
const manifest = FETCH ? {} : JSON.parse(readFileSync(MANIFEST, 'utf8'));

for (const [name, bundle] of Object.entries(BUNDLES)) {
  const faces = FETCH ? await fetchManifest(bundle.request) : manifest[name];
  if (!faces) { console.error(`no manifest entry for bundle "${name}" — run --fetch`); process.exit(1); }
  manifest[name] = faces;
  generate(faces, bundle);
}
if (FETCH) writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
console.log(`\nlatin is what an English page can reach; the rest waits for a codepoint that needs it.`);
