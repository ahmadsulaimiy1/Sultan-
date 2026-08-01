// Renders docs/exports/SHRS-Constitution-Flagship-v6.0.html to PDF via
// headless Chromium (Playwright), print-to-PDF — not a docx export, per
// Drafting Note 11's own description of what a flagship edition requires.
// Requires the `playwright-core` npm package (not a project dependency —
// installed on demand) plus the pre-installed Chromium at
// /opt/pw-browsers, matching this environment's browser setup.
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'exports', 'SHRS-Governance-Charter-Flagship-v7.0.html');
const OUT = path.join(ROOT, 'docs', 'exports', 'SHRS-Governance-Charter-Flagship-v7.0.pdf');
// Intermediate, header/footer-free render of the same document, used only to
// supply page 1 (the cover) to the merge step below — see the note at the
// bottom of this file for why the cover cannot simply have headerFooter
// turned off on its own.
const OUT_NOHEADER = path.join(ROOT, 'docs', 'exports', '.SHRS-Governance-Charter-Flagship-v7.0.noheader.pdf');
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
    The Governance Charter of Sultan Hanafi Royal Schools — Draft v7.0 (Not Yet Effective)
  </div>`;
const FOOTER_TEMPLATE = `
  <div style="width:100%; height:0.4in; margin:0; background:#ffffff; box-sizing:border-box;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
    font-family:'Cinzel',Georgia,serif; font-size:7px; letter-spacing:0.04em;
    color:#8a7550; text-align:center; padding-bottom:8px;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>`;

// Chromium's print pipeline applies one headerTemplate/footerTemplate to
// every page of a single page.pdf() call — there is no per-page toggle and
// no way to compute a genuinely dynamic Part/Chapter title per page at
// print time (see Drafting Note 12). That means the cover page 1 receives
// the same running header and "Page 1 of N" footer as every body page,
// which is a real, confirmed defect: a cover is not paginated content.
// The fix used here is a two-render merge, not a CSS trick: render the
// whole document once with headers/footers off (to source a clean page 1)
// and once with them on (for every other page), then splice page 1 from
// the first render onto pages 2..N of the second. This is the smallest
// honest fix available with this tool; it does not solve the harder,
// still-open problem of a genuinely dynamic per-Part/Chapter running
// header, which needs the pypdf/reportlab overlay described in the
// Drafting Notes as not-yet-built.
async function render(outPath, withHeaderFooter) {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  await page.goto('file://' + SRC, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: outPath,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: withHeaderFooter ? HEADER_TEMPLATE : '<span></span>',
    footerTemplate: withHeaderFooter ? FOOTER_TEMPLATE : '<span></span>',
    // Margin is identical in both renders — including the no-header one —
    // so the content area (and therefore every .page's layout) is pixel-
    // identical between the two PDFs; only the header/footer template
    // content differs. displayHeaderFooter stays true even for the "off"
    // render so an empty template renders as blank space rather than
    // Chromium collapsing the margin and reflowing the page.
    margin: { top: '0.4in', bottom: '0.4in', left: '0in', right: '0in' },
  });
  await browser.close();
}

async function main() {
  await render(OUT_NOHEADER, false);
  await render(OUT, true);
  console.log('Rendered both passes; merge page 1 with scripts/merge-constitution-cover.py');
}

main().catch((e) => { console.error(e); process.exit(1); });
