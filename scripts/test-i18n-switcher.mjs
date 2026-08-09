#!/usr/bin/env node
/* End-to-end checks for the language switcher, run against a served build.
 *
 *   node scripts/build.js
 *   python3 -m http.server 8811 &
 *   node scripts/test-i18n-switcher.mjs [http://localhost:8811]
 *
 * Requires Playwright (`npm i -D playwright`). Exits non-zero on failure so
 * it can gate a deploy.
 *
 * These assertions exist because each one corresponds to a bug this build
 * actually shipped at some point:
 *   - collapsing the <details> on click cancelled the browser's navigation,
 *     so the switcher stored a preference and went nowhere;
 *   - the Yoruba font override was defeated by stylesheets outside brand.css
 *     that still hardcoded 'Cinzel', so headings lost their underdots;
 *   - hreflang advertised /ar/portal/select/, which has no Arabic edition.
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
const ctx = await browser.newContext();
const page = await ctx.newPage();

// --- navigate mode: pre-rendered public pages ---------------------------
await page.goto(`${BASE}/academics/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-locale-option]', { state: 'attached' });
check(await page.locator('[data-locale-option]').count() === 4,
  'switcher offers all four locales');

/* Paint check, not a DOM check.
 *
 * This exists because a DOM-level assertion shipped a broken switcher to
 * production. .topbar carries overflow:hidden to contain its animated
 * shimmer, which clipped the dropdown to the bar's own height: the menu
 * opened showing only "English" and swallowed العربية, Yorùbá and Français.
 * Every option was in the DOM, every option had a real height, and
 * Playwright's isVisible() returned true for all four — because it reports
 * an element's own box, not whether an ancestor clips it away.
 *
 * elementFromPoint at each option's centre is the honest question: is this
 * thing actually on screen where a person could click it? */
await page.locator('.lang-switch > summary').click();
await page.waitForTimeout(400);
const painted = await page.evaluate(() =>
  [...document.querySelectorAll('[data-locale-option)'.replace(')', ']'))].map((a) => {
    const r = a.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { label: a.textContent.trim(), painted: !!hit && (hit === a || a.contains(hit)) };
  }));
check(painted.length === 4 && painted.every((o) => o.painted),
  `all four options are actually painted on screen, not merely in the DOM (${painted.map((o) => o.label + (o.painted ? '' : ' NOT-PAINTED')).join(', ')})`);

/* The control's accessible name.
 *
 * Public pages fetch no dictionary by design, so translate() has nothing to
 * look in and returns its ⟦key⟧ marker. That marker was reaching the
 * aria-label, and a screen reader announced the switcher as
 * "left double bracket a11y dot languageSwitcher". The label now comes from
 * the locale registry, which every page carries. */
const ariaLabel = await page.getAttribute('.lang-switch > summary', 'aria-label');
check(!!ariaLabel && !ariaLabel.includes('\u27E6'),
  `switcher has a real accessible name, not a missing-key marker ("${ariaLabel}")`);

/* Contrast check.
 *
 * Also from a live defect: the Clear edition darkens every topbar link
 * (html[data-pc-theme="light"] .topbar a) at a specificity that outranked the
 * dropdown's own colour, so dark ink landed on the dark panel at 1.97:1 and
 * the four languages read as smudges. Paint alone would not have caught it —
 * the pixels were there, they just could not be read. */
const contrast = await page.evaluate(() => {
  const toRgb = (s) => (s.match(/[\d.]+/g) || ['0', '0', '0']).slice(0, 3).map(Number);
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const menu = document.querySelector('.lang-switch-menu');
  const bg = toRgb(getComputedStyle(menu).backgroundColor);
  return [...document.querySelectorAll('[data-locale-option]')].map((a) => {
    const fg = toRgb(getComputedStyle(a).color);
    const l1 = lum(fg);
    const l2 = lum(bg);
    return {
      label: a.textContent.trim(),
      ratio: +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2),
    };
  });
});
const worst = Math.min(...contrast.map((c) => c.ratio));
check(worst >= 4.5,
  `every language reads at WCAG AA or better against the panel (worst ${worst}:1)`);

await page.locator('[data-locale-option="yo"]').click();
await page.waitForURL('**/yo/academics/', { timeout: 5000 }).catch(() => {});
// waitForURL resolves as soon as the URL changes, which can be before the new
// document has been parsed — querying the DOM at that moment sees the old
// page, or no <body> at all.
await page.waitForLoadState('domcontentloaded');
check(new URL(page.url()).pathname === '/yo/academics/',
  'switching language preserves the page (/academics/ -> /yo/academics/)');
check(await page.getAttribute('html', 'lang') === 'yo', 'html lang=yo after switch');

// Query the DOM directly and normalise: a source file and a test literal can
// hold the same Yoruba text in different Unicode normal forms (NFC vs NFD),
// which compares unequal byte-for-byte while rendering identically.
const labelPresent = await page.evaluate(() => {
  const want = 'Ìgbésí-ayé Akẹ́kọ̀ọ́'.normalize('NFC');
  return [...document.querySelectorAll('a, span, h1, h2, h3')]
    .some((el) => el.textContent.normalize('NFC').includes(want));
});
check(labelPresent, 'Yoruba navigation label present with full diacritics');

// A font that lacks ẹ/ọ/ṣ still "loads"; what proves coverage is that the
// glyphs shape to a non-trivial width in the face we actually selected.
const shapedWidth = await page.evaluate(() => {
  const s = document.createElement('span');
  s.style.cssText = 'font-family:"Charis SIL Yoruba",serif;font-size:40px;position:absolute;visibility:hidden';
  s.textContent = 'ẹ̀ọ́ṣ';
  document.body.appendChild(s);
  const w = s.getBoundingClientRect().width;
  s.remove();
  return w;
});
check(shapedWidth > 10, `underdotted + toned glyphs shape with real outlines (${Math.round(shapedWidth)}px)`);

const headingFont = await page.evaluate(() =>
  getComputedStyle(document.querySelector('h1') || document.body).fontFamily);
check(/Charis SIL Yoruba/.test(headingFont),
  `Yoruba headings use the Yoruba face (${headingFont})`);

// --- deep links ---------------------------------------------------------
await page.goto(`${BASE}/yo/academics/?x=1#section`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-locale-option]', { state: 'attached' });
const frHref = await page.locator('[data-locale-option="fr"]').getAttribute('href');
check(frHref === '/fr/academics/?x=1#section',
  `query string and hash carried across languages (${frHref})`);

// --- pages with no counterpart in a language ----------------------------
await page.goto(`${BASE}/portal/select/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-locale-option]', { state: 'attached' });
const arHref = await page.locator('[data-locale-option="ar"]').getAttribute('href');
check(arHref === '/ar/',
  `a page with no Arabic edition falls back to the Arabic home, not a 404 (${arHref})`);

// --- RTL ----------------------------------------------------------------
await page.goto(`${BASE}/ar/academics/`, { waitUntil: 'domcontentloaded' });
check(await page.getAttribute('html', 'dir') === 'rtl', 'Arabic page renders RTL');
check(await page.getAttribute('html', 'data-locale') === 'ar', 'Arabic page carries data-locale');

// --- preference persistence --------------------------------------------
const stored = await page.evaluate(() => localStorage.getItem('shrsLocale'));
const cookie = (await ctx.cookies()).find((c) => c.name === 'shrs_locale');
check(stored === 'yo', `language preference persisted in localStorage (${stored})`);
check(cookie && cookie.value === 'yo', `language preference mirrored to a cookie (${cookie && cookie.value})`);

// --- instant mode -------------------------------------------------------
const portal = await page.goto(`${BASE}/portal/profile/`, { waitUntil: 'domcontentloaded' })
  .catch(() => null);
if (portal && portal.status() === 200) {
  const n = await page.locator('[data-i18n]').count();
  check(n > 0, `portal page carries data-i18n (${n} elements) -> instant mode eligible`);
} else {
  console.log('  SKIP  portal page not served in this checkout');
}

console.log('\n' + (failures.length ? `${failures.length} FAILURE(S)` : 'all checks passed'));
await browser.close();
process.exit(failures.length ? 1 : 0);
