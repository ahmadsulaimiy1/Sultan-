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
// Locale maths (which prefix owns which language, how a URL in one language
// maps to the same page in another) lives in lib/i18n.js and is shipped
// verbatim to the browser by buildLocaleRuntime() below, so the live
// switcher can never disagree with the build about where a translation is.
const I18N = require(path.join(ROOT, 'lib/i18n.js'));
const DICTS = {};
I18N.codes().forEach((code) => {
  const file = path.join(ROOT, 'i18n', `${code}.json`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const clean = {};
  Object.keys(raw).forEach((k) => { if (k.charAt(0) !== '_') clean[k] = raw[k]; });
  DICTS[code] = clean;
});
// Shorthand used throughout page assembly: t('nav.academics', 'yo').
function t(key, lang, vars) {
  return I18N.translate(DICTS, lang, key, vars);
}
// Used only to make og:*/canonical tags absolute, since social-media
// crawlers won't reliably resolve relative URLs. Update once the site
// has a confirmed production domain.
const SITE_ORIGIN = 'https://shroyalschools.com';

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

/* --- FAQ structured data -------------------------------------------------
   A page carrying a [data-faq] accordion gets a schema.org FAQPage block
   generated FROM that accordion, not written alongside it. Hand-authored
   JSON-LD is the classic silent drift: the visible answer is edited, the
   structured copy is not, and the search engine is then quoting a version
   of the school's fee policy that no longer exists on the page. Generating
   it at build time makes that impossible — and it means a translated
   accordion produces translated structured data with no second source.

   Anything that fails to parse is skipped rather than guessed at. */
function withFaqSchema(html) {
  if (html.indexOf('data-faq') < 0) return html;
  const strip = (s) => s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  const items = [];
  const detail = /<details\b[^>]*>([\s\S]*?)<\/details>/g;
  let m;
  while ((m = detail.exec(html)) !== null) {
    const inner = m[1];
    const q = /<summary\b[^>]*>([\s\S]*?)<\/summary>/.exec(inner);
    const a = /<div class="faq-a"[^>]*>([\s\S]*?)<\/div>/.exec(inner);
    if (!q || !a) continue;
    const question = strip(q[1]);
    const answer = strip(a[1]);
    if (!question || !answer) continue;
    items.push({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    });
  }
  if (!items.length) return html;
  const block = '\n<script type="application/ld+json">'
    + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items })
        .replace(/</g, '\\u003c')
    + '</script>\n';
  return html + block;
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

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

/* A page is a homepage if its output IS the locale root. Derived from the
   path rather than matched against a growing list of slugs ('home',
   'home-ar', 'home-yo', 'home-fr', …), which is the sort of list that gets
   a new language added to it three releases late. */
function isHomeSlug(page) {
  return I18N.neutralPath('/' + page.output.replace(/index\.html$/, '')) === '/';
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
  yo: { jumpMorning: 'Ka Àdhkār Àárọ̀', jumpEvening: 'Ka Àdhkār Ìrọ̀lẹ́', morningHead: 'Àdhkār Àárọ̀', eveningHead: 'Àdhkār Ìrọ̀lẹ́', repeatLabel: 'Àtúnsọ' },
  fr: { jumpMorning: 'Lire les Adhkār du matin', jumpEvening: 'Lire les Adhkār du soir', morningHead: 'Adhkār du matin', eveningHead: 'Adhkār du soir', repeatLabel: 'Répétitions' },
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
  if (isHomeSlug(page)) return '';
  const locale = I18N.get(lang);
  const home = locale.pathPrefix ? locale.pathPrefix + '/' : '/';
  const homeLabel = t('breadcrumb.home', lang);
  const url = '/' + page.output.replace(/index\.html$/, '');
  // Strip the locale prefix so the segments line up across every edition —
  // derived from the registry rather than a literal '/ar', so a new
  // language needs no change here.
  const rel = I18N.neutralPath(url);
  const segs = rel.split('/').filter(Boolean);

  const byPath = new Map(
    manifest
      .filter((pg) => (pg.lang || 'en') === lang)
      .map((pg) => ['/' + pg.output.replace(/index\.html$/, ''), pg])
  );

  const crumbs = [{ href: home, label: homeLabel }];
  let acc = locale.pathPrefix;
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
    // The chevron points the way the script reads, so it follows direction
    // rather than the specific language.
    const chevron = locale.dir === 'rtl' ? '\u2039' : '\u203A';
    const sep = i === 0 ? '' : `<span class="bc-sep" aria-hidden="true">${chevron}</span>`;
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

  return `<nav class="breadcrumbs" aria-label="${escapeHtml(t('breadcrumb.label', lang))}">
  <div class="wrap">${items}</div>
</nav>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
`;
}

/* Reads a chrome partial in the requested language, falling back to the
   default locale's file when that language has no hand-authored copy yet.
   The fallback is what lets a new locale be added to the registry and build
   immediately — in the default language's chrome, but building, linked and
   switchable — instead of the build crashing on a missing file. Anything
   still falling back is reported at the end of the run so the gap is
   visible rather than silently permanent. */
const partialFallbacks = new Map();
function readPartial(name, lang) {
  /* Preference order, most specific first:
       1. partials/<name>.tpl.html   — the language-neutral template. One file
          serves every locale, with {{t:key}} resolved from that locale's
          dictionary. This is the target state for all chrome.
       2. partials/<name>.<lang>.html — a hand-authored copy for one language.
          The pre-existing Arabic partials; still honoured so nothing that
          works today stops working, and so a locale can override the
          template wholesale when a straight string swap isn't enough.
       3. partials/<name>.html        — the default language's copy.
     A template beats a hand-authored copy because the template is the one
     that cannot drift: fixing a link in .tpl.html fixes it in all four
     languages, whereas the same fix in header.html silently leaves
     header.ar.html behind — which is how the Arabic nav ended up shipping an
     untranslated "Create a Parent Account" before this change. */
  const tpl = path.join(PARTIALS, `${name}.tpl.html`);
  if (fs.existsSync(tpl)) {
    return renderTemplate(fs.readFileSync(tpl, 'utf8'), lang);
  }
  const localised = path.join(PARTIALS, `${name}.${lang}.html`);
  if (lang !== I18N.defaultCode() && fs.existsSync(localised)) {
    return fs.readFileSync(localised, 'utf8');
  }
  if (lang !== I18N.defaultCode()) {
    const key = `${lang}:${name}`;
    partialFallbacks.set(key, (partialFallbacks.get(key) || 0) + 1);
  }
  return read(`partials/${name}.html`);
}

/* Resolves {{t:some.key}} against a locale's dictionary.
 *
 * Dictionary values are PLAIN TEXT, so they are HTML-escaped on the way in.
 * This matters for the ampersand: "Press & News" and "Day & Boarding" are
 * stored with a literal &, and emitting that raw produces invalid HTML —
 * harmless for "& News", but "&copy" or "&times" in a future string would be
 * silently parsed as an entity and render as © or ×. Escaping also keeps the
 * output byte-identical to the hand-authored partials, which wrote &amp;.
 *
 * The escape covers text and attribute contexts alike (" included), since a
 * token can appear in either and over-escaping a quote in body text is
 * invisible to the reader. A value that must carry real markup does not
 * belong in a dictionary — put it in the template. */
const missingKeys = new Set();
function renderTemplate(tpl, lang) {
  return tpl.replace(/\{\{t:([\w.]+)\}\}/g, (whole, key) => {
    const value = I18N.translate(DICTS, lang, key);
    if (value.charAt(0) === '⟦') { missingKeys.add(`${lang}:${key}`); return whole; }
    return escapeAttr(value);
  });
}

function buildPage(page, manifest) {
  const lang = page.lang || I18N.defaultCode();
  const locale = I18N.get(lang);
  // Direction follows the language, from the registry. The manifest may
  // still carry `dir` for the existing Arabic entries; the registry wins so
  // the two can never contradict each other.
  const dir = locale.dir;

  const pagePath = '/' + page.output.replace(/index\.html$/, '');
  const head = fillTokens(read('partials/head.html'), {
    TITLE: page.title,
    DESCRIPTION: page.description,
    OG_URL: `${SITE_ORIGIN}${pagePath}`,
    OG_IMAGE: `${SITE_ORIGIN}/assets/images/apple-touch-icon.png`,
  });
  /* The legacy {{ALT_HREF}} token addressed "the other language" — a question
     that only has an answer while there are exactly two. The real N-way
     choice now lives in the switcher, but the token still appears in the
     personalisation panel and the <noscript> fallback, so it must resolve to
     a DIFFERENT edition than the current one. Resolving it to the default
     locale unconditionally would point an English page at itself, turning
     that link into a no-op. So: the default locale if we are not already in
     it, otherwise the first other locale — which reproduces the previous
     behaviour exactly (en -> /ar/, ar -> /). */
  const otherLocale = lang === I18N.defaultCode()
    ? (I18N.locales().find((l) => l.code !== I18N.defaultCode()) || I18N.get(lang)).code
    : I18N.defaultCode();
  const altHref = page.altHref || I18N.resolvedPathFor(pagePath, otherLocale);
  const topbar = fillTokens(readPartial('topbar', lang), { ALT_HREF: altHref });
  const header = readPartial('header', lang);
  const announcementRibbon = readPartial('announcement-ribbon', lang);
  const content = withFaqSchema(fillTokens(read(page.contentFile), {
    ADHKAR_STATIC: renderAdhkarStatic(lang),
  }));
  const footer = readPartial('footer', lang);
  const assistant = readPartial('assistant', lang);
  const search = readPartial('search', lang);
  const personalisation = fillTokens(readPartial('personalisation', lang), {
    ALT_HREF: altHref,
  });

  /* hreflang — one alternate per locale plus x-default, not a single
     "the other one". Search engines use this set to serve the right edition
     to the right reader and to understand that these URLs are translations
     rather than duplicate content; emitting only one of three alternates
     leaves the rest looking like unrelated thin pages. Every locale is
     listed including this one, which is what the spec asks for (a complete,
     self-referential set on every page). */
  const altTag = I18N.locales().filter((l) => {
    if (!I18N.hasPage(pagePath, l.code)) return false;
    // An hreflang alternate is a promise to a search engine that the target
    // is THIS page in that language. A page whose body is still English is
    // not that, so it is left out until it is — otherwise the tag sends a
    // French searcher to English text and tells Google the two are
    // equivalent. The switcher still offers it, because a human who asks for
    // French should get the French navigation and the notice explaining the
    // rest; a crawler making an equivalence claim is a different matter.
    return !untranslatedBodies.has(`${l.code}:${I18N.neutralPath(pagePath)}`);
  }).map((l) => {
    const href = SITE_ORIGIN + I18N.pathFor(pagePath, l.code);
    return `<link rel="alternate" hreflang="${l.hreflang}" href="${href}" />\n`;
  }).join('') +
    `<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN + I18N.pathFor(pagePath, I18N.defaultCode())}" />\n`;

  // The homepage "elevation" layer — figures/counters band, testimonial
  // swiper, admissions-journey band, 3D card tilt and motion — is homepage
  // ONLY by design: css/elevate.css deliberately restyles shared elements
  // (institution cards, header, footer), so loading it elsewhere would alter
  // every page. elevate.js/elevate-motion.js no-op when their markup is
  // absent, but we still gate all three on the home page to keep other pages
  // untouched, exactly as the source package intended.
  // Both homepages, not only the English one. The Arabic page carries the
  // same bands — the figures rail, the testimonial swiper, the admissions
  // journey, the Wird cards — and without this layer they rendered in an
  // older, plainer state: the Wird labels lost their dark pill and sat as
  // bright gold on parchment at 1.17:1, and the two languages drifted
  // visibly apart. The gate is on the homepage, not on the language.
  const isHome = isHomeSlug(page);
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
  // The masthead and colophon layer is the last stylesheet on every
  // page, deliberately. It restyles furniture that brand.css, elevate.css
  // and prestige.css all have their own rules for at the same specificity,
  // so the only thing that decides the winner is source order.
  // The homepage's own layer — the golden thread down the margin, the
  // illuminated section heads, the constellation and the lit arrival.
  // It is not homepage-only any more: any long page can ask for it with
  // homefx:true in the manifest, and it must load after prestige.css,
  // which is why it rides here rather than in extraCss.
  const wantsHomefx = isHome || page.homefx === true;
  const homefxHead = wantsHomefx
    ? '<link rel="stylesheet" href="/css/homefx.css">\n' : '';
  const homefxScript = wantsHomefx
    ? '<script src="/js/homefx.js" defer></script>\n' : '';

  // The story layer — the drawn instruments on the long narrative pages
  // (the quartered shield, the CLEVER rosette, the chain of
  // accountability, the escalation, the numbered undertakings). It reads
  // its labels out of the cards already on the page, so it must load
  // after prestige.css and after homefx.css, which is why it rides here
  // rather than in extraCss. Opt in with story:true in the manifest.
  const wantsStory = page.story === true;
  const storyHead = wantsStory ? '<link rel="stylesheet" href="/css/story.css">\n' : '';
  const storyScript = wantsStory ? '<script src="/js/story.js" defer></script>\n' : '';

  const mastheadHead = '<link rel="stylesheet" href="/css/masthead.css">\n';
  // The armorial — the house's metalwork. It restyles the three pieces of
  // furniture the whole site is built from (the icon mount, the hero
  // medallion and the card) as struck and chased objects rather than
  // drawn boxes. It ships on EVERY page, deliberately: the complaint it
  // answers is that the site read as correct and anonymous, and a fix
  // applied to eight pages would leave the other hundred and thirty-five
  // exactly as they were. It changes no layout and repaints no glyph —
  // see the rules at the head of css/armorial.css.
  const armorialHead = '<link rel="stylesheet" href="/css/armorial.css">\n';
  const listenHead = '<link rel="stylesheet" href="/css/listen.css">\n'
    + '<link rel="stylesheet" href="/css/clock.css">\n';

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
  const robotsTag = page.noindex
    ? `<meta name="robots" content="noindex,${page.untranslatedBody ? 'follow' : 'nofollow'}" />\n`
    : '';
  const breadcrumbs = buildBreadcrumbs(page, manifest, lang);
  const bodyAttr = page.bodyClass ? ` class="${page.bodyClass}"` : '';
  const extraCss = (page.extraCss || [])
    .map((href) => `<link rel="stylesheet" href="${href}">\n`).join('');
  const headScripts = (page.headScripts || [])
    .map((src) => `<script src="${src}"></script>\n`).join('');
  const extraScripts = (page.extraScripts || [])
    .map((src) => `<script src="${src}" defer></script>\n`).join('');

  /* The AI assistant's knowledge base is a per-language data file, and only
     English and Arabic have one written. Referencing /js/assistant-data.yo.js
     would 404 and leave the assistant silently empty on Yoruba pages, so we
     fall back to the default locale's corpus — the assistant answers in
     English on those pages, which is honest and useful, rather than not at
     all. Drop in assistant-data.yo.js and this picks it up with no change. */
  const assistantLang = fs.existsSync(path.join(ROOT, `js/assistant-data.${lang}.js`))
    ? lang
    : I18N.defaultCode();

  // data-locale gives CSS a stable hook for per-language typography without
  // re-deriving the language from `lang` in every selector (see css/i18n.css),
  // and gives the runtime switcher something to flip on an instant switch.
  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}" data-locale="${lang}">
<head>
${head}${robotsTag}<link rel="stylesheet" href="/css/i18n.css">
${extraCss}${elevateHead}${prestigeHead}${idcardHead}${mastheadHead}${armorialHead}${homefxHead}${storyHead}${listenHead}${altTag}${headScripts}</head>
<body${bodyAttr}>

${topbar}
${header}
${announcementRibbon}
${breadcrumbs}${renderPartialNotice(page, lang)}${content}
${footer}
${assistant}
${search}
${personalisation}

<script src="/js/locale-registry.js"></script>
<script src="/js/i18n-core.js"></script>
<script src="/js/i18n.js" defer></script>
<script src="/js/adhkar-data.js" defer></script>
<script src="/js/reflections-data.js" defer></script>
<script src="/js/portal-password-toggle.js" defer></script>
<script src="/js/portal-password-strength.js" defer></script>
<script src="/js/personalisation.js" defer></script>
<script src="/js/livery-prompt.js" defer></script>
<script src="/js/atelier.js" defer></script>
<script src="/js/regalia.js" defer></script>
<script src="/js/site.js" defer></script>
<script src="/js/adhkar-app.js" defer></script>
<script src="/js/announcements.js" defer></script>
<script src="/js/assistant-data.${assistantLang}.js" defer></script>
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
<script src="/js/listen.js" defer></script>
<script src="/js/footer-live.js" defer></script>
<script src="/js/mega.js" defer></script>
<script src="/js/edge.js" defer></script>
<script src="/js/clock.js" defer></script>
${elevateScripts}${prestigeScripts}${idcardScripts}${homefxScript}${storyScript}${extraScripts}
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

/* Which neutral paths each locale lacks, relative to the union of every
   page built. Feeds I18N.hasPage()/resolvedPathFor() in both the build and
   the browser, so neither ever links to a translation that was not built. */
function computeMissingPages(manifest) {
  const byLocale = new Map();
  const union = new Set();
  manifest.forEach((page) => {
    const lang = page.lang || I18N.defaultCode();
    const neutral = I18N.neutralPath('/' + page.output.replace(/index\.html$/, ''));
    union.add(neutral);
    if (!byLocale.has(lang)) byLocale.set(lang, new Set());
    byLocale.get(lang).add(neutral);
  });
  const missing = {};
  I18N.codes().forEach((code) => {
    const have = byLocale.get(code) || new Set();
    const absent = Array.from(union).filter((p) => !have.has(p)).sort();
    if (absent.length) {
      missing[code] = absent;
      console.log(`locale "${code}" has no edition of: ${absent.join(', ')}`);
    }
  });
  return missing;
}

/* Ships the locale registry and the shared i18n core to the browser.
 *
 * lib/i18n.js is copied rather than re-implemented so the switcher's idea of
 * "the Yoruba URL for this page" is byte-for-byte the build's. Both land in
 * js/ so they pick up the existing content-hash cache-busting for free —
 * versionAssets() only rewrites /css/ and /js/ URLs. Both are generated, so
 * they are regenerated on every build and must not be hand-edited. */
function buildLocaleRuntime(manifest) {
  const registry = JSON.parse(read('i18n/locales.json'));
  // Teach this process's own copy of the core which editions exist, so
  // buildPage()'s altHref and hreflang decisions match what the browser will
  // compute from the same map below.
  const missingPages = computeMissingPages(manifest);
  I18N.setAvailability(missingPages);
  const slim = {
    defaultLocale: registry.defaultLocale,
    // The registry's _comment block is documentation for maintainers; there
    // is no reason to send it to every visitor.
    locales: registry.locales.filter((l) => l.enabled !== false),
    // Per-locale list of neutral paths that locale does NOT have, computed
    // from the manifest that was actually built. Ships as an exception list
    // because most pages exist in every language: /portal/select/ has no
    // Arabic edition, and without this the switcher would offer a link to
    // /ar/portal/select/, which 404s.
    missing: missingPages,
  };
  const banner = '/* GENERATED by scripts/build.js from i18n/locales.json — do not edit. */\n';
  fs.writeFileSync(
    path.join(ROOT, 'js/locale-registry.js'),
    banner + 'window.__SHRS_LOCALES__=' + JSON.stringify(slim) + ';\n'
  );
  const core = fs.readFileSync(path.join(ROOT, 'lib/i18n.js'), 'utf8');
  fs.writeFileSync(
    path.join(ROOT, 'js/i18n-core.js'),
    '/* GENERATED by scripts/build.js from lib/i18n.js — do not edit. */\n' + core
  );
  console.log(`locale runtime: ${slim.locales.length} locales -> js/locale-registry.js, js/i18n-core.js`);
}

/* Names every chrome partial still being served in the default language on
   a translated page. Without this the fallback is invisible: the page builds,
   looks finished, and quietly shows English navigation above Yoruba prose. */
function reportPartialFallbacks() {
  if (!partialFallbacks.size) return;
  const byLang = new Map();
  partialFallbacks.forEach((count, key) => {
    const [lang, name] = key.split(':');
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang).push(`${name} (${count} page${count === 1 ? '' : 's'})`);
  });
  console.log('\ni18n chrome still falling back to the default language:');
  byLang.forEach((names, lang) => {
    console.log(`  ${lang}: ${names.sort().join(', ')}`);
  });
  console.log('  -> add partials/<name>.<lang>.html to translate these.\n');
}

/* Derives the page list for any locale that has no hand-authored entries.
 *
 * The manifest names 36 English pages and 35 Arabic ones, each written by
 * hand. Requiring the same for Yoruba and French would mean 70 more entries
 * before a single page could exist — and until they did, the hreflang tags
 * and the language switcher would both point at URLs that 404, which is
 * worse for a reader and for a crawler than an honest interim page.
 *
 * So a locale with no entries of its own inherits the default locale's page
 * list: same slugs, same URLs under its own prefix, fully translated chrome
 * (nav, topbar, footer, breadcrumbs, search), and the default language's
 * body content behind a translated notice saying exactly that. As real
 * translations land, a hand-authored entry for that page overrides the
 * derived one — matching on output path — and the notice disappears for
 * that page alone.
 *
 * Arabic is unaffected: it has its own entries, so nothing is derived for it.
 */
function expandManifestForLocales(manifest) {
  const defaultCode = I18N.defaultCode();
  const authored = new Set(manifest.map((p) => p.output));
  const base = manifest.filter((p) => (p.lang || defaultCode) === defaultCode);
  const derived = [];

  I18N.locales().forEach((locale) => {
    if (locale.code === defaultCode) return;
    const hasOwn = manifest.some((p) => (p.lang || defaultCode) === locale.code);
    if (hasOwn) return;

    base.forEach((page) => {
      const neutral = '/' + page.output.replace(/index\.html$/, '');
      const target = I18N.pathFor(neutral, locale.code).replace(/^\//, '') + 'index.html';
      if (authored.has(target)) return;
      derived.push(Object.assign({}, page, {
        slug: `${page.slug}-${locale.code}`,
        output: target,
        lang: locale.code,
        dir: locale.dir,
        altHref: neutral,
        // Flags the body as still being in the default language, which is
        // what renders the notice. Removing this field (by authoring a real
        // entry) removes the notice, the noindex, and the hreflang exclusion
        // together, for that page alone.
        untranslatedBody: true,
        /* Kept out of the search index until the prose is genuinely in this
           language. The page is ~90% identical to its English original, so
           indexing it would put 72 near-duplicate URLs into competition with
           the pages they were copied from, and would land a Yoruba searcher
           on English prose. `follow` is deliberate: the links on the page are
           real and should still be crawled, and the English original is
           reachable through them. */
        noindex: true,
      }));
    });
    console.log(`derived ${base.length} page(s) for locale "${locale.code}" (chrome translated, body pending)`);
  });

  return manifest.concat(derived);
}

/* The notice shown above default-language body content on a derived page.
   Deliberately visible rather than a quiet <meta>: a reader who switched to
   Yoruba and met English prose should be told why, and given one click back
   to the edition that reads properly. */
const untranslatedBodies = new Set();
function recordUntranslatedBodies(manifest) {
  manifest.forEach((page) => {
    if (!page.untranslatedBody) return;
    const lang = page.lang || I18N.defaultCode();
    untranslatedBodies.add(`${lang}:${I18N.neutralPath('/' + page.output.replace(/index\.html$/, ''))}`);
  });
}

function renderPartialNotice(page, lang) {
  if (!page.untranslatedBody) return '';
  const href = I18N.pathFor('/' + page.output.replace(/index\.html$/, ''), I18N.defaultCode());
  return `<aside class="i18n-partial-notice" role="note">
  <div class="wrap">
    <strong>${escapeHtml(t('i18n.partial.title', lang))}</strong>
    <p>${escapeHtml(t('i18n.partial.body', lang))}</p>
    <a href="${href}" hreflang="${I18N.defaultCode()}">${escapeHtml(t('i18n.partial.cta', lang))}</a>
  </div>
</aside>
`;
}

function main() {
  /* Parity gate, before anything is written. A key missing from one
     dictionary renders as ⟦nav.academics⟧ on a live page, and the page still
     "builds" — so the only place to catch it is here, loudly, before the
     output exists. Runs in-process rather than as a separate npm step so it
     cannot be skipped by building directly. */
  const check = require('child_process').spawnSync(
    process.execPath, [path.join(__dirname, 'i18n-check.js')],
    { encoding: 'utf8' }
  );
  process.stdout.write(check.stdout || '');
  if (check.status !== 0) {
    process.stderr.write(check.stderr || '');
    console.error('\nBuild aborted: translation dictionaries are not in parity.');
    process.exit(1);
  }

  const manifest = expandManifestForLocales(JSON.parse(read('pages/manifest.json')));
  // Must run before any page is rendered: it loads the availability map into
  // the shared core, which buildPage() then consults for altHref and hreflang.
  recordUntranslatedBodies(manifest);
  buildLocaleRuntime(manifest);
  manifest.forEach((page) => buildPage(page, manifest));
  buildSearchIndex(manifest);
  versionAllHtml();
  updateServiceWorkerVersion();
  reportPartialFallbacks();
  if (missingKeys.size) {
    console.error('\nTemplate keys with no translation (left as literal tokens):');
    Array.from(missingKeys).sort().forEach((k) => console.error(`  ${k}`));
    process.exit(1);
  }
}

main();
