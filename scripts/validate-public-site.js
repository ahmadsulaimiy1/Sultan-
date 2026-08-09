/* The gate that stands between a corrupted build and the public site.
 *
 * This exists because of a real incident, not a hypothetical one: a merge
 * conflict was committed into partials/head.html, the build propagated it into
 * 149 published pages' <head>, and four stylesheets were dropped from every
 * public page. The build reported success throughout. Nothing in the pipeline
 * was looking.
 *
 * So the build now refuses. Every check below is one the incident would have
 * failed, plus the neighbouring failures of the same kind — a page missing its
 * language, an Arabic page that forgot it reads right to left, a script tag
 * pointing at a file that is not there.
 *
 * The rule is: FAIL, do not warn. A warning in a build log is a thing nobody
 * reads until a parent tells them the site looks broken.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.wrangler', 'dist', 'docs', 'scripts', 'functions', 'lib', 'sql', 'pages', 'partials', 'assets', 'capacitor', 'mobile-app']);

/* Two documents in the estate legitimately do NOT carry the sitewide chrome,
 * and the gate has to know which rather than being loosened for everyone.
 *
 *   offline/       must work when nothing else on the device does, so it
 *                  depends on no external stylesheet or script at all. That is
 *                  the whole point of it; requiring the locale runtime here
 *                  would break the one page that has to survive without one.
 *   prospectus/    print publications, not site pages. They still owe the
 *                  reader a language, a direction, a title and a viewport —
 *                  they simply do not run the site's interface.
 *
 * mobile-app/ is skipped entirely above: it is the Capacitor bootstrap shim,
 * a build input rather than a published page.
 */
const STANDALONE = [/^offline\//, /^prospectus\//];
function isStandalone(rel) {
  return STANDALONE.some((re) => re.test(rel));
}

// Present on every page the build emits (partials/head.html + build.js).
// A page missing one of these is a page that will render unstyled or without
// its language runtime — exactly the incident's symptom.
const REQUIRED_STYLESHEETS = ['/css/brand.css', '/css/i18n.css'];
const REQUIRED_SCRIPTS = ['/js/locale-registry.js', '/js/i18n-core.js', '/js/i18n.js', '/js/shrs-connectivity.js'];

const RTL_LOCALES = new Set(['ar']);
const LOCALE_PREFIXES = { '/ar/': 'ar', '/yo/': 'yo', '/fr/': 'fr' };

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function localeOf(rel) {
  for (const prefix in LOCALE_PREFIXES) {
    if (('/' + rel).startsWith(prefix)) return LOCALE_PREFIXES[prefix];
  }
  return 'en';
}

function assetExists(url) {
  const clean = url.split('?')[0].split('#')[0];
  if (!clean.startsWith('/')) return true;           // external or relative — not ours to check
  return fs.existsSync(path.join(ROOT, clean));
}

function validate() {
  const files = walk(ROOT);
  const failures = [];
  const fail = (file, message) => failures.push({ file: path.relative(ROOT, file), message });

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const html = fs.readFileSync(file, 'utf8');
    const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [])[1];

    // 1. The incident itself.
    if (/^<{7} |^={7}$|^>{7} /m.test(html)) {
      fail(file, 'unresolved merge conflict markers');
    }

    // 2. A <head> that never closed will swallow the page's content.
    if (!/<head[^>]*>/i.test(html)) { fail(file, 'no <head>'); continue; }
    if (!head) { fail(file, '<head> is not closed'); continue; }

    // 3. Identity and language.
    const htmlTag = (html.match(/<html[^>]*>/i) || [''])[0];
    const lang = (htmlTag.match(/\blang="([^"]+)"/i) || [])[1];
    const dir = (htmlTag.match(/\bdir="([^"]+)"/i) || [])[1];
    if (!lang) fail(file, '<html> has no lang');
    if (!dir) fail(file, '<html> has no dir');
    const expectedLang = localeOf(rel);
    if (lang && lang.slice(0, 2) !== expectedLang) {
      fail(file, `lang="${lang}" but the path says ${expectedLang}`);
    }
    const expectedDir = RTL_LOCALES.has(expectedLang) ? 'rtl' : 'ltr';
    if (dir && dir !== expectedDir) fail(file, `dir="${dir}" but ${expectedLang} reads ${expectedDir}`);

    // 4. Metadata a published page must carry.
    if (!/<title>[^<]{3,}<\/title>/i.test(head)) fail(file, 'no usable <title>');
    if (!/<meta[^>]+name="viewport"/i.test(head)) fail(file, 'no viewport meta');
    if (!/<meta[^>]+charset=/i.test(head)) fail(file, 'no charset meta');
    const standalone = isStandalone(rel);
    const isPortal = rel.includes('portal/') || standalone;
    if (!isPortal && !/<meta[^>]+name="description"[^>]+content="[^"]{10,}"/i.test(head)) {
      fail(file, 'no meaningful meta description');
    }

    // 5. Unrendered template tokens — a page that shipped with {{TITLE}} in it.
    const token = html.match(/\{\{[A-Z_]+\}\}/);
    if (token) fail(file, `unrendered template token ${token[0]}`);

    // 6. Every same-origin stylesheet and script must exist on disk.
    for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/gi)) {
      if (!assetExists(m[1])) fail(file, `stylesheet not found: ${m[1]}`);
    }
    for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/gi)) {
      if (!assetExists(m[1])) fail(file, `script not found: ${m[1]}`);
    }

    // 7. The sitewide chrome. This is the check that would have caught the
    //    incident on its first build rather than on a parent's phone.
    if (!standalone) {
      for (const css of REQUIRED_STYLESHEETS) {
        if (!html.includes(css)) fail(file, `missing required stylesheet ${css}`);
      }
      for (const js of REQUIRED_SCRIPTS) {
        if (!html.includes(js)) fail(file, `missing required script ${js}`);
      }
    }
  }

  // 8. The language resources the offline shell precaches. A missing one is a
  //    language that silently stops working with no signal.
  for (const code of ['en', 'ar', 'yo', 'fr']) {
    const p = path.join(ROOT, 'i18n', `${code}.json`);
    if (!fs.existsSync(p)) failures.push({ file: `i18n/${code}.json`, message: 'locale dictionary missing' });
    else {
      try {
        const keys = Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')));
        if (keys.length < 50) failures.push({ file: `i18n/${code}.json`, message: `only ${keys.length} keys — looks truncated` });
      } catch (e) {
        failures.push({ file: `i18n/${code}.json`, message: 'is not valid JSON' });
      }
    }
  }

  // 9. The self-hosted Yoruba face. Without it ẹ, ọ and ṣ fall back to system
  //    fonts and a Yoruba page breaks at the letters that carry meaning.
  for (const font of ['charis-sil-yoruba-400-normal.woff2', 'charis-sil-yoruba-700-normal.woff2']) {
    if (!fs.existsSync(path.join(ROOT, 'assets', 'fonts', font))) {
      failures.push({ file: `assets/fonts/${font}`, message: 'Yoruba webfont missing' });
    }
  }

  return { files: files.length, failures };
}

function run({ silent = false } = {}) {
  const { files, failures } = validate();
  if (!failures.length) {
    if (!silent) console.log(`public-site gate: ${files} pages checked, all sound`);
    return true;
  }
  console.error(`\npublic-site gate FAILED — ${failures.length} problem(s) across ${files} pages:\n`);
  const shown = failures.slice(0, 40);
  for (const f of shown) console.error(`  ${f.file}: ${f.message}`);
  if (failures.length > shown.length) console.error(`  … and ${failures.length - shown.length} more`);
  console.error('\nRefusing to publish. A partially corrupted public site is worse than a failed build.\n');
  return false;
}

module.exports = { validate, run };

if (require.main === module) {
  process.exit(run() ? 0 : 1);
}
