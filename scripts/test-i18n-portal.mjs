#!/usr/bin/env node
/* End-to-end checks for portal (instant-mode) language switching.
 *
 *   node scripts/build.js && node scripts/build-office-portals.js
 *   python3 -m http.server 8811 &
 *   node scripts/test-i18n-portal.mjs [http://localhost:8811]
 *
 * The portal's whole reason for switching in place rather than navigating is
 * that a portal page holds live state: a session, fetched data, a half-filled
 * form. So the assertions here are less about the words changing and more
 * about what must NOT change — the URL, and the reader's work.
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8811';
const failures = [];
const check = (cond, msg) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + msg);
  if (!cond) failures.push(msg);
};

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium',
});
const page = await (await browser.newContext()).newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

/* Portal screens run entrance animations (prestige.js / motion.js). Playwright
   refuses to click a moving target, so settle the page before interacting —
   otherwise the run fails with "element is not stable" on a control that is
   perfectly fine, and the real assertions never get to run. */
async function openSwitcher() {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600);
  await page.locator('.lang-switch > summary').click();
}

// --- sign-in screen: the switcher must work BEFORE authentication ---------
await page.goto(`${BASE}/portal/login/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-locale-option]', { state: 'attached', timeout: 8000 });
check(true, 'switcher renders on the sign-in screen (before any session exists)');

const marked = await page.locator('[data-i18n]').count();
check(marked > 0, `sign-in screen carries data-i18n (${marked} elements)`);

const urlBefore = page.url();
await openSwitcher();
await page.locator('[data-locale-option="yo"]').click();
await page.waitForTimeout(900);

check(page.url() === urlBefore, 'instant switch does not navigate (URL unchanged)');
check(await page.getAttribute('html', 'lang') === 'yo', 'html lang flipped to yo in place');
check(await page.getAttribute('html', 'data-locale') === 'yo', 'data-locale flipped in place');

// --- direction flips without a reload ------------------------------------
await openSwitcher();
await page.locator('[data-locale-option="ar"]').click();
await page.waitForTimeout(900);
check(await page.getAttribute('html', 'dir') === 'rtl',
  'switching to Arabic flips direction to RTL with no reload');
check(page.url() === urlBefore, 'still no navigation after a second switch');

// --- the reader's work survives ------------------------------------------
const input = page.locator('input[type="email"], input[name="email"], input#email').first();
if (await input.count()) {
  await input.fill('parent@example.com');
  await openSwitcher();
  await page.locator('[data-locale-option="fr"]').click();
  await page.waitForTimeout(800);
  check(await input.inputValue() === 'parent@example.com',
    'an open form keeps its value across a language switch');
} else {
  console.log('  SKIP  no email field on this screen');
}

// --- office portal: the generated pages ----------------------------------
await page.goto(`${BASE}/portal/office/academic-affairs/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-locale-option]', { state: 'attached', timeout: 8000 });
const officeMarked = await page.locator('[data-i18n]').count();
check(officeMarked > 10, `office portal page carries data-i18n (${officeMarked} elements)`);

await openSwitcher();
await page.locator('[data-locale-option="ar"]').click();
await page.waitForTimeout(900);
const tab = await page.evaluate(() => {
  const el = document.querySelector('[data-i18n="portal.analytics"]');
  return el ? el.textContent.trim() : null;
});
check(tab === 'التحليلات', `office tab label translated in place (${tab})`);

const yoruba = await page.evaluate(async () => {
  const r = await fetch('/i18n/yo.json');
  const d = await r.json();
  return d['portal.workflowCentre'];
});
check(/Ìlànà/.test(yoruba || ''), `Yoruba dictionary is fetchable at runtime (${yoruba})`);

check(pageErrors.length === 0,
  `no uncaught page errors${pageErrors.length ? ': ' + pageErrors.slice(0, 2).join(' | ') : ''}`);

console.log('\n' + (failures.length ? `${failures.length} FAILURE(S)` : 'all checks passed'));
await browser.close();
process.exit(failures.length ? 1 : 0);
