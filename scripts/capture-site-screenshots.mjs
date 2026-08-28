// Captures full-site screenshots of the local dev build for use in report/
// documentation decks. Requires `playwright-core` plus a locally installed
// Chromium build (set CHROME_PATH below), and a dev server already running
// at BASE_URL.
//
// Usage: BASE_URL=http://127.0.0.1:8791 OUT_DIR=./shots node scripts/capture-site-screenshots.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.env.OUT_DIR || join(process.cwd(), 'shots');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8791';
const CHROME_PATH = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const routes = [
['home','/'],['home-ar','/ar/'],['about','/about/'],['governance','/about/governance/'],
['academics-hub','/academics/'],['academics-royal-college','/academics/royal-college/'],
['academics-quran-college','/academics/quran-college/'],['academics-arabic-islamic','/academics/arabic-islamic-studies/'],
['academics-nursery-primary','/academics/nursery-primary/'],['academics-online','/academics/online-distance-learning/'],
['admission','/admission/'],['admission-apply','/admission/apply/'],['faculty','/faculty/'],['facilities','/facilities/'],
['student-life','/student-life/'],['boarding','/boarding/'],['digital-campus','/digital-campus/'],
['strategic-plan','/strategic-plan/'],['curriculum','/curriculum/'],['graduate-profile','/graduate-profile/'],
['policies','/policies/'],['announcements','/announcements/'],['academic-calendar','/academic-calendar/'],
['adhkar','/adhkar/'],['quran-centre','/quran-centre/'],['foundation','/foundation/'],['alumni-portal','/alumni-portal/'],
['gallery','/gallery/'],['press','/press/'],['marketplace','/marketplace/'],['online-courses','/online-courses/'],
['contact','/contact/'],['verify-hub','/verify/'],['verify-certificate','/verify-certificate/'],
['verify-identity','/verify-identity/'],['verify-receipt','/verify-receipt/'],
['verify-graduation-document','/verify-graduation-document/'],
['portal-select','/portal/select/'],['portal-login','/portal/login/'],['portal-register','/portal/register/'],
['portal-apply','/portal/apply/'],['portal-dashboard','/portal/dashboard/'],['portal-founder','/portal/founder/'],
['portal-graduation','/portal/graduation/'],
];

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  args: ['--no-sandbox','--no-proxy-server','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-domain-reliability','--disable-sync'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 2300 } });
const page = await ctx.newPage();
await page.route('**/*', (route) => { const u = route.request().url(); return u.startsWith(BASE) ? route.continue() : route.abort(); });
let ok = 0, fail = 0;
for (const [name, path] of routes) {
  try {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 6000 });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: join(OUT, name + '.png'), timeout: 6000 });
    ok++; console.log('  ok', name);
  } catch (e) { console.error('  FAIL', name, String(e.message).split(String.fromCharCode(10))[0]); fail++; }
}
console.log('  captured ' + ok + ' / ' + routes.length + ' (' + fail + ' failed)');
await browser.close();
