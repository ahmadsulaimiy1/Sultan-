// Renders docs/exports/SHRS-Constitution-Flagship-v6.0.html to PDF via
// headless Chromium (Playwright), print-to-PDF — not a docx export, per
// Drafting Note 11's own description of what a flagship edition requires.
// Requires the `playwright-core` npm package (not a project dependency —
// installed on demand) plus the pre-installed Chromium at
// /opt/pw-browsers, matching this environment's browser setup.
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'exports', 'SHRS-Constitution-Flagship-v6.0.html');
const OUT = path.join(ROOT, 'docs', 'exports', 'SHRS-Constitution-Flagship-v6.0.pdf');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// The reserved margin strip Chromium allocates for header/footer has no
// default white background of its own — without an explicit one here it
// renders as a near-black default, visibly mismatched against every page
// (see docs/exports/fcov-01-bottom.jpg from the first render). Both
// templates fill the full margin box with white and force colour-adjust
// so the fill actually prints.
const HEADER_TEMPLATE = `
  <div style="width:100%; height:0.4in; margin:0; background:#ffffff; box-sizing:border-box;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
    font-family:'Cinzel',Georgia,serif; font-size:6.5px; letter-spacing:0.06em;
    text-transform:uppercase; color:#8a7550; text-align:center; padding-top:8px;">
    The Constitution of Sultan Hanafi Royal Schools — Draft v6.0 (Not Yet Effective)
  </div>`;
const FOOTER_TEMPLATE = `
  <div style="width:100%; height:0.4in; margin:0; background:#ffffff; box-sizing:border-box;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
    font-family:'Cinzel',Georgia,serif; font-size:7px; letter-spacing:0.04em;
    color:#8a7550; text-align:center; padding-bottom:8px;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>`;

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  await page.goto('file://' + SRC, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: OUT,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: HEADER_TEMPLATE,
    footerTemplate: FOOTER_TEMPLATE,
    margin: { top: '0.4in', bottom: '0.4in', left: '0in', right: '0in' },
  });
  await browser.close();
  console.log('Wrote', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
