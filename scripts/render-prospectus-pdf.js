// Generic HTML -> PDF renderer for prospectus/brochure editions. Each
// edition's .spread sections are already designed for print (A4,
// page-break-after:always, @media print rules in css/prospectus*.css),
// so this is a straightforward print-to-PDF via headless Chromium —
// no dynamic-header overlay needed (brochures carry their own folio
// marks in-page, unlike the Constitution's running-header system).
//
// Usage: node scripts/render-prospectus-pdf.js <src.html (site-relative)> <out.pdf (relative to prospectus/exports/)>
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

const [, , SRC_ARG, OUT_ARG] = process.argv;
if (!SRC_ARG || !OUT_ARG) {
  console.error('Usage: node scripts/render-prospectus-pdf.js <src.html> <out.pdf>');
  process.exit(1);
}
const OUT_DIR = path.join(ROOT, 'prospectus', 'exports');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = path.join(OUT_DIR, OUT_ARG);

// The prospectus pages use site-root-absolute paths ("/css/...",
// "/assets/..."), which don't resolve under file:// — serve the repo
// root over plain HTTP for the duration of the render, same as a real
// static-file deployment would.
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(ROOT, urlPath);
      if (urlPath.endsWith('/')) filePath = path.join(filePath, 'index.html');
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const server = await startServer();
  const port = server.address().port;
  const urlPath = '/' + path.relative(ROOT, path.join(ROOT, SRC_ARG));
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}${urlPath}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
  });
  await browser.close();
  server.close();
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
