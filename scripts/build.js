#!/usr/bin/env node
// Static site build: assembles pages/manifest.json entries from the
// shared partials/ (head, topbar, header, footer) plus each page's own
// content file, and writes the finished HTML to the project root.
//
// Usage: node scripts/build.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// --- Cache-busting -------------------------------------------------------
// The CSS/JS filenames are stable (/css/brand.css, /js/site.js, …), which is
// friendly to edit but means a browser or CDN (this site sits behind
// Cloudflare) can keep serving an OLD copy from the same URL long after a
// deploy — the classic "I published but it still looks the same" problem.
// The fix is a content fingerprint: every local CSS/JS URL gets a ?v=<hash>
// derived from that file's bytes. The URL only changes when the file
// changes, so an unchanged file still caches hard (fast), while a changed
// one becomes a brand-new URL that no cache can answer stale.
const _assetVersionCache = new Map();
function assetVersion(rootRelUrl) {
  if (_assetVersionCache.has(rootRelUrl)) return _assetVersionCache.get(rootRelUrl);
  let v = '';
  try {
    const abs = path.join(ROOT, rootRelUrl.replace(/^\//, ''));
    v = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex').slice(0, 10);
  } catch (e) {
    // Referenced file not present (optional/locale-specific script) — leave
    // the URL untouched rather than fail the build.
    v = '';
  }
  _assetVersionCache.set(rootRelUrl, v);
  return v;
}

// Rewrites src="/js/x.js" and href="/css/x.css" to carry their content hash.
// It strips any existing ?v=… first and re-adds the current one, so it is
// idempotent AND self-correcting: running it again on already-versioned HTML
// re-hashes to the same value if the file is unchanged, or updates the stamp
// if the file changed. That lets us run it over every page on every build.
function versionAssets(html) {
  return html.replace(
    /(\s(?:src|href)=")(\/(?:css|js)\/[^"?#]+\.(?:css|js))(?:\?v=[0-9a-f]+)?(")/g,
    (match, pre, url, post) => {
      const v = assetVersion(url);
      return v ? `${pre}${url}?v=${v}${post}` : `${pre}${url}${post}`;
    }
  );
}

// Applies versionAssets to every .html file in the site — not just the pages
// this script generates, but also the hand-authored ones (portal, prospectus,
// verification screens) that are served as-is. Without this, those pages would
// keep pointing at unversioned /css & /js URLs and could be served stale by a
// browser or CDN after a deploy.
function versionAllHtml() {
  const SKIP = new Set(['node_modules', '.git', '.wrangler', 'dist', 'build']);
  let count = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      if (SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const before = fs.readFileSync(full, 'utf8');
        const after = versionAssets(before);
        if (after !== before) {
          fs.writeFileSync(full, after);
          count += 1;
        }
      }
    }
  }
  walk(ROOT);
  console.log(`cache-busting: fingerprinted asset URLs across ${count} html file(s)`);
}

// The service worker caches assets by URL and only drops old caches when its
// CACHE_VERSION string changes. Tie that string to a fingerprint of every
// css/js file so a content change automatically retires the old cache on the
// next visit — no manual version bump, no stale installed-PWA copies.
function updateServiceWorkerVersion() {
  const swPath = path.join(ROOT, 'sw.js');
  let sw;
  try {
    sw = fs.readFileSync(swPath, 'utf8');
  } catch (e) {
    return; // no service worker in this checkout — nothing to do
  }
  const hash = crypto.createHash('md5');
  ['css', 'js'].forEach((sub) => {
    const dir = path.join(ROOT, sub);
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => /\.(css|js)$/.test(f)).sort();
    } catch (e) { /* directory absent — skip */ }
    files.forEach((f) => {
      hash.update(f);
      hash.update(fs.readFileSync(path.join(dir, f)));
    });
  });
  const version = 'shrs-pwa-' + hash.digest('hex').slice(0, 10);
  const updated = sw.replace(/shrs-pwa-[A-Za-z0-9]+/g, version);
  if (updated !== sw) {
    fs.writeFileSync(swPath, updated);
    console.log(`service worker cache version -> ${version}`);
  } else {
    console.log(`service worker cache version unchanged (${version})`);
  }
}
// -------------------------------------------------------------------------

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


// --- Breadcrumbs ---------------------------------------------------------
// Every serious institutional site tells the reader where in the building
// they are standing. The trail is derived from the page's own output path
// against the manifest, so it needs no per-page authoring and can never
// drift from the URL it describes: /academics/quran-college/ becomes
// Home › Academics › Sultan Hanafi Qur'an College. It also emits
// schema.org BreadcrumbList, which is what puts the trail into a search
// result rather than a bare URL.
function buildBreadcrumbs(page, manifest, lang) {
  if (page.slug === 'home' || page.slug === 'home-ar') return '';
  const home = lang === 'ar' ? '/ar/' : '/';
  const homeLabel = lang === 'ar' ? 'الرئيسية' : 'Home';
  const url = '/' + page.output.replace(/index\.html$/, '');
  // strip the locale prefix so the segments line up in both editions
  const rel = lang === 'ar' ? url.replace(/^\/ar/, '') : url;
  const segs = rel.split('/').filter(Boolean);

  const byPath = new Map(
    manifest
      .filter((pg) => (pg.lang || 'en') === lang)
      .map((pg) => ['/' + pg.output.replace(/index\.html$/, ''), pg])
  );

  const crumbs = [{ href: home, label: homeLabel }];
  let acc = lang === 'ar' ? '/ar' : '';
  segs.forEach((seg, i) => {
    acc += '/' + seg + '/';
    const match = byPath.get(acc);
    const last = i === segs.length - 1;
    // A page's own <title> is written for a browser tab ("… — Sultan Hanafi
    // Royal Schools"); the trail wants only the leaf of it.
    let label = match
      ? match.title.split(/\s+[—|]\s+/)[0]
      : seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (last) label = page.title.split(/\s+[—|]\s+/)[0];
    crumbs.push({ href: last ? null : acc, label });
  });

  const items = crumbs.map((c, i) => {
    const sep = i === 0 ? '' : `<span class="bc-sep" aria-hidden="true">${lang === 'ar' ? '\u2039' : '\u203A'}</span>`;
    const body = c.href
      ? `<a href="${c.href}">${escapeHtml(c.label)}</a>`
      : `<span aria-current="page">${escapeHtml(c.label)}</span>`;
    return sep + body;
  }).join('');

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: SITE_ORIGIN + (c.href || '/' + page.output.replace(/index\.html$/, '')),
    })),
  };

  return `<nav class="breadcrumbs" aria-label="${lang === 'ar' ? 'مسار التنقل' : 'Breadcrumb'}">
  <div class="wrap">${items}</div>
</nav>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
`;
}

function buildPage(page, manifest) {
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

  // The homepage "elevation" layer — figures/counters band, testimonial
  // swiper, admissions-journey band, 3D card tilt and motion — is homepage
  // ONLY by design: css/elevate.css deliberately restyles shared elements
  // (institution cards, header, footer), so loading it elsewhere would alter
  // every page. elevate.js/elevate-motion.js no-op when their markup is
  // absent, but we still gate all three on the home page to keep other pages
  // untouched, exactly as the source package intended.
  const isHome = page.slug === 'home';
  const elevateHead = isHome
    ? '<link rel="stylesheet" href="/css/elevate.css">\n'
    : '';
  const elevateScripts = isHome
    ? '<script src="/js/elevate.js" defer></script>\n<script src="/js/elevate-motion.js" defer></script>\n'
    : '';

  // The "prestige" flagship layer (luxury interior-page design system +
  // scroll-reveal, animated counters and self-drawing SVG charts) loads
  // only on pages that opt in with prestige:true in the manifest, so it
  // never weighs on or restyles pages that don't use it.
  const isPrestige = page.prestige === true;
  // The rotating credential ships only where a credential is the subject.
  const isIdCard = page.idcard === true;
  const idcardHead = isIdCard ? '<link rel="stylesheet" href="/css/idcard.css">\n' : '';
  const idcardScripts = isIdCard ? '<script src="/js/idcard.js" defer></script>\n' : '';
  const prestigeHead = isPrestige
    ? '<link rel="stylesheet" href="/css/prestige.css">\n<link rel="stylesheet" href="/css/motion.css">\n'
    : '';
  const prestigeScripts = isPrestige
    ? '<script src="/js/prestige.js" defer></script>\n<script src="/js/motion.js" defer></script>\n'
    : '';

  // --- Per-page extras -----------------------------------------------
  // Added so that pages which are NOT part of the public marketing site
  // — the Digital Campus Gateway is the first — can still be assembled
  // from the same partials and therefore carry the same real header and
  // real footer as every other page, instead of being hand-authored with
  // a stub top bar. Each field is optional; a page that sets none of them
  // builds exactly as before.
  //   noindex     — keep the page out of search engines
  //   bodyClass   — a class on <body> (the gateway needs .portal-body)
  //   extraCss    — stylesheets appended after the standard head
  //   headScripts — render-blocking scripts (theme flash prevention)
  //   extraScripts— deferred scripts appended after the standard set
  const robotsTag = page.noindex ? '<meta name="robots" content="noindex" />\n' : '';
  const breadcrumbs = buildBreadcrumbs(page, manifest, lang);
  const bodyAttr = page.bodyClass ? ` class="${page.bodyClass}"` : '';
  const extraCss = (page.extraCss || [])
    .map((href) => `<link rel="stylesheet" href="${href}">\n`).join('');
  const headScripts = (page.headScripts || [])
    .map((src) => `<script src="${src}"></script>\n`).join('');
  const extraScripts = (page.extraScripts || [])
    .map((src) => `<script src="${src}" defer></script>\n`).join('');

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
${head}${robotsTag}${extraCss}${elevateHead}${prestigeHead}${idcardHead}${altTag}${headScripts}</head>
<body${bodyAttr}>

${topbar}
${header}
${announcementRibbon}
${breadcrumbs}${content}
${footer}
${assistant}
${search}
${personalisation}

<script src="/js/adhkar-data.js" defer></script>
<script src="/js/reflections-data.js" defer></script>
<script src="/js/portal-password-toggle.js" defer></script>
<script src="/js/portal-password-strength.js" defer></script>
<script src="/js/personalisation.js" defer></script>
<script src="/js/site.js" defer></script>
<script src="/js/adhkar-app.js" defer></script>
<script src="/js/announcements.js" defer></script>
<script src="/js/assistant-data.${lang}.js" defer></script>
<script src="/js/assistant.js" defer></script>
<script src="/js/whatsapp-float.js" defer></script>
<script src="/js/institution-carousel.js" defer></script>
<script src="/js/marketplace.js" defer></script>
<script src="/js/certificate-verify.js" defer></script>
<script src="/js/identity-verify.js" defer></script>
<script src="/js/receipt-verify.js" defer></script>
<script src="/js/graduation-document-verify.js" defer></script>
<script src="/js/graduate-profile.js" defer></script>
<script src="/js/search.js" defer></script>
<script src="/js/admission-journey.js" defer></script>
<script src="/js/policies.js" defer></script>
<script src="/js/site-chrome.js" defer></script>
<script src="/js/pwa-install.js" defer></script>
<script src="/js/intro.js" defer></script>
${elevateScripts}${prestigeScripts}${idcardScripts}${extraScripts}
</body>
</html>
`;

  const outPath = path.join(ROOT, page.output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`built ${page.output} (${(html.length / 1024).toFixed(1)} KB)`);
}

// Strips tags/entities down to plain text, for indexing a page's actual
// body content rather than just its title/description. Deliberately
// simple (no HTML parser dependency) — good enough for a substring
// search index, not for anything that needs to preserve structure.
function htmlToPlainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// A lightweight client-side search index — title/description PLUS the
// page's actual body text (stripped of markup), split by language so the
// search box only ever surfaces results in the language the visitor is
// already reading. This is what lets a query like "Qur'an" or
// "Mathematics" surface pages that merely *mention* the term in their
// content, not just pages whose title/description happens to contain it —
// the whole point being "search the website", not "search the menu".
// Still no backend, no external search service; the index is larger now
// but still small enough to fetch in full on first use.
function buildSearchIndex(manifest) {
  const byLang = {};
  manifest.forEach((page) => {
    const lang = page.lang || 'en';
    const url = '/' + page.output.replace(/index\.html$/, '');
    let body = '';
    try {
      const contentPath = path.join(ROOT, page.contentFile);
      body = htmlToPlainText(fs.readFileSync(contentPath, 'utf8')).slice(0, 4000);
    } catch (e) {
      // Content file missing/unreadable — index still works with just
      // title/description for this page rather than failing the build.
    }
    (byLang[lang] = byLang[lang] || []).push({
      title: page.title,
      description: page.description,
      body,
      url,
    });
  });
  Object.entries(byLang).forEach(([lang, items]) => {
    const outPath = path.join(ROOT, `search-index.${lang}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items));
    const kb = (JSON.stringify(items).length / 1024).toFixed(1);
    console.log(`built search-index.${lang}.json (${items.length} pages, ${kb} KB)`);
  });
}

function main() {
  const manifest = JSON.parse(read('pages/manifest.json'));
  manifest.forEach((page) => buildPage(page, manifest));
  buildSearchIndex(manifest);
  versionAllHtml();
  updateServiceWorkerVersion();
}

main();
