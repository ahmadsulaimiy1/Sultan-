// Measure each letter block at the sheet's own measure, so pagination is
// decided by what was written rather than by a fixed table. Writes
// assets/block-heights.json in millimetres.
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
// resolve playwright-core from wherever it is installed on this machine, so
// the build does not depend on where node_modules happens to live
function load() {
  const tries = [() => require('playwright-core')];
  const extra = process.env.PLAYWRIGHT_PATH;
  if (extra) tries.push(() => require(path.join(extra, 'playwright-core')));
  for (const dir of (process.env.NODE_PATH || '').split(':').filter(Boolean))
    tries.push(() => require(path.join(dir, 'playwright-core')));
  for (const t of tries) { try { return t(); } catch (e) {} }
  throw new Error('playwright-core not found; set PLAYWRIGHT_PATH to its node_modules');
}
const { chromium } = load();
const EXE = require('child_process')
  .execSync("ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1").toString().trim();
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
  await p.goto('file://' + path.join(ROOT, '_probe.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  const mm = await p.evaluate(() => {
    const pg = document.querySelector('.page');
    const MM = pg.getBoundingClientRect().width / 210;
    return [...pg.querySelectorAll('.blk')].map(el => {
      const r = el.getBoundingClientRect();
      const mb = parseFloat(getComputedStyle(el.firstElementChild || el).marginBottom) || 0;
      return +((r.height + mb) / MM).toFixed(2);
    });
  });
  fs.writeFileSync(path.join(ROOT, 'assets', 'block-heights.json'), JSON.stringify(mm));
  console.log('measured', mm.length, 'blocks');
  await b.close();
})().catch(e => { console.error('measure failed:', e.message); process.exit(1); });
