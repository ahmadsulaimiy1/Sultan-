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
// js/adhkar-data.js's IIFE is written as `(function(global){...})(typeof
// window !== 'undefined' ? window : this)` — under Node's CommonJS wrapper,
// top-level `this` is `module.exports`, so requiring it here hands back
// `{ SHRS_ADHKAR: {...} }` with zero changes to the browser file itself.
const SHRS_ADHKAR = require(path.join(ROOT, 'js/adhkar-data.js')).SHRS_ADHKAR;
// Used only to make og:*/canonical tags absolute, since social-media
// crawlers won't reliably resolve relative URLs. Update once the site
// has a confirmed production domain.
const SITE_ORIGIN = 'https://shroyalschools.com';

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function fillTokens(template, tokens) {
  return Object.entries(tokens).reduce(
    (out, [key, value]) => out.split(`{{${key}}}`).join(value),
    template
  );
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Real, server-rendered content for the Adhkar Centre's Morning and
// Evening lists — the two primary daily categories — so the words
// themselves are present in the page's raw HTML and survive JavaScript
// being blocked, failing, or simply not having loaded yet. js/adhkar-app.js
// hides this block once it successfully mounts the full interactive
// experience on top of it; if that never happens, this stays visible.
// Content-first, enhancement-second — not the other way around.
const ADHKAR_STATIC_STRINGS = {
  en: { jumpMorning: 'Read Morning Adhkār', jumpEvening: 'Read Evening Adhkār', morningHead: 'Morning Adhkār', eveningHead: 'Evening Adhkār', repeatLabel: 'Repeat' },
  ar: { jumpMorning: 'اقرأ أذكار الصباح', jumpEvening: 'اقرأ أذكار المساء', morningHead: 'أذكار الصباح', eveningHead: 'أذكار المساء', repeatLabel: 'التكرار' },
};

function renderAdhkarStaticSection(items, lang, headingText, anchorId) {
  const cards = items.map((item) => {
    const title = escapeHtml(item.title[lang] || item.title.en);
    const translit = item.transliteration ? `<p class="adk-static-translit">${escapeHtml(item.transliteration)}</p>` : '';
    const translation = item.translation ? `<p class="adk-static-translation">${escapeHtml(item.translation[lang] || item.translation.en)}</p>` : '';
    const reference = item.reference ? `<p class="adk-static-ref">${escapeHtml(item.reference[lang] || item.reference.en)}</p>` : '';
    const repeatBadge = item.repeat > 1 ? `<span class="adk-static-repeat">${escapeHtml(ADHKAR_STATIC_STRINGS[lang].repeatLabel)} ×${item.repeat}</span>` : '';
    return `<article class="adk-static-item">
      <h4>${title} ${repeatBadge}</h4>
      <p class="adk-static-arabic" lang="ar" dir="rtl">${escapeHtml(item.arabic)}</p>
      ${translit}${translation}${reference}
    </article>`;
  }).join('\n');
  return `<div class="adk-static-section" id="${anchorId}">
    <h3>${escapeHtml(headingText)}</h3>
    <div class="adk-static-list">${cards}</div>
  </div>`;
}

function renderAdhkarStatic(lang) {
  const s = ADHKAR_STATIC_STRINGS[lang] || ADHKAR_STATIC_STRINGS.en;
  const morning = SHRS_ADHKAR.itemsByCategory('morning');
  const evening = SHRS_ADHKAR.itemsByCategory('evening');
  return `<div class="adk-static-fallback" data-adk-static>
    <div class="adk-static-jump">
      <a href="#adhkar-static-morning" class="adk-static-jump-btn">${escapeHtml(s.jumpMorning)}</a>
      <a href="#adhkar-static-evening" class="adk-static-jump-btn">${escapeHtml(s.jumpEvening)}</a>
    </div>
    ${renderAdhkarStaticSection(morning, lang, s.morningHead, 'adhkar-static-morning')}
    ${renderAdhkarStaticSection(evening, lang, s.eveningHead, 'adhkar-static-evening')}
  </div>`;
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
  const announcementRibbon = read(`partials/announcement-ribbon${suffix}.html`);
  const content = fillTokens(read(page.contentFile), {
    ADHKAR_STATIC: renderAdhkarStatic(lang),
  });
  const footer = read(`partials/footer${suffix}.html`);
  const assistant = read(`partials/assistant${suffix}.html`);
  const search = read(`partials/search${suffix}.html`);
  const personalisation = fillTokens(read(`partials/personalisation${suffix}.html`), {
    ALT_HREF: page.altHref || (lang === 'ar' ? '/' : '/ar/'),
  });

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
${announcementRibbon}
${content}
${footer}
${assistant}
${search}
${personalisation}

<script src="/js/adhkar-data.js" defer></script>
<script src="/js/personalisation.js" defer></script>
<script src="/js/site.js" defer></script>
<script src="/js/adhkar-app.js" defer></script>
<script src="/js/announcements.js" defer></script>
<script src="/js/assistant-data.${lang}.js" defer></script>
<script src="/js/assistant.js" defer></script>
<script src="/js/whatsapp-float.js" defer></script>
<script src="/js/search.js" defer></script>

</body>
</html>
`;

  const outPath = path.join(ROOT, page.output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`built ${page.output} (${(html.length / 1024).toFixed(1)} KB)`);
}

// A lightweight client-side search index — just title/description per
// page, split by language so the search box only ever surfaces results
// in the language the visitor is already reading. No backend, no
// external search service; small enough to fetch in full on first use.
function buildSearchIndex(manifest) {
  const byLang = {};
  manifest.forEach((page) => {
    const lang = page.lang || 'en';
    const url = '/' + page.output.replace(/index\.html$/, '');
    (byLang[lang] = byLang[lang] || []).push({
      title: page.title,
      description: page.description,
      url,
    });
  });
  Object.entries(byLang).forEach(([lang, items]) => {
    const outPath = path.join(ROOT, `search-index.${lang}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items));
    console.log(`built search-index.${lang}.json (${items.length} pages)`);
  });
}

function main() {
  const manifest = JSON.parse(read('pages/manifest.json'));
  manifest.forEach(buildPage);
  buildSearchIndex(manifest);
}

main();
