#!/usr/bin/env node
// Static site build: assembles pages/manifest.json entries from the
// shared partials/ (head, topbar, header, footer) plus each page's own
// content file, and writes the finished HTML to the project root.
//
// Usage: node scripts/build.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PARTIALS = path.join(ROOT, 'partials');
const PAGES = path.join(ROOT, 'pages');
// Used only to make og:*/canonical tags absolute, since social-media
// crawlers won't reliably resolve relative URLs. Update once the site
// has a confirmed production domain.
const SITE_ORIGIN = 'https://shroyalschools.ng';

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function fillTokens(template, tokens) {
  return Object.entries(tokens).reduce(
    (out, [key, value]) => out.split(`{{${key}}}`).join(value),
    template
  );
}

function buildPage(page) {
  const lang = page.lang || 'en';
  const dir = page.dir || 'ltr';
  // Arabic (or any future locale) pages use their own chrome partials —
  // nav labels, footer copy, etc. can't be shared text across languages
  // the way CSS/JS/images are. Falls back to the English partial name
  // (no suffix) for locales that don't need their own file.
  const suffix = lang === 'en' ? '' : `.${lang}`;

  const pagePath = '/' + page.output.replace(/index\.html$/, '');
  const head = fillTokens(read('partials/head.html'), {
    TITLE: page.title,
    DESCRIPTION: page.description,
    OG_URL: `${SITE_ORIGIN}${pagePath}`,
    OG_IMAGE: `${SITE_ORIGIN}/assets/images/apple-touch-icon.png`,
  });
  const topbar = fillTokens(read(`partials/topbar${suffix}.html`), {
    ALT_HREF: page.altHref || (lang === 'ar' ? '/' : '/ar/'),
  });
  const header = read(`partials/header${suffix}.html`);
  const content = read(page.contentFile);
  const footer = read(`partials/footer${suffix}.html`);
  const assistant = read(`partials/assistant${suffix}.html`);

  // hreflang alternate — points at this page's translation counterpart,
  // or a sensible fallback (e.g. the other language's homepage) when
  // the specific page hasn't been translated yet
  const altTag = page.altHref
    ? `<link rel="alternate" hreflang="${page.altLang || (lang === 'ar' ? 'en' : 'ar')}" href="${page.altHref}" />\n`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
${head}${altTag}</head>
<body>

${topbar}
${header}
${content}
${footer}
${assistant}

<script src="/js/site.js" defer></script>
<script src="/js/assistant-data.${lang}.js" defer></script>
<script src="/js/assistant.js" defer></script>
<script src="/js/whatsapp-float.js" defer></script>

</body>
</html>
`;

  const outPath = path.join(ROOT, page.output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`built ${page.output} (${(html.length / 1024).toFixed(1)} KB)`);
}

function main() {
  const manifest = JSON.parse(read('pages/manifest.json'));
  manifest.forEach(buildPage);
}

main();
