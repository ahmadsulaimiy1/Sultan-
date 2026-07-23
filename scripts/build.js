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
  const head = fillTokens(read('partials/head.html'), {
    TITLE: page.title,
    DESCRIPTION: page.description,
  });
  const topbar = read('partials/topbar.html');
  const header = read('partials/header.html');
  const content = read(page.contentFile);
  const footer = read('partials/footer.html');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head}</head>
<body>

${topbar}
${header}
${content}
${footer}

<script src="/js/site.js" defer></script>

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
