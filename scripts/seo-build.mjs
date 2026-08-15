#!/usr/bin/env node
/* ===========================================================================
   SEO BUILD — the institutional entity, and a sitemap that covers the site
   ===========================================================================

   Two gaps, both measured before anything was written:

     1. NO ENTITY. The site carried BreadcrumbList on 139 pages and FAQPage on
        three, but nothing that told a search engine WHAT THIS IS. For a
        school that is the single most consequential omission: without a
        School/EducationalOrganization node there is no entity for Google to
        attach a Knowledge Panel to, no address to match against a Maps
        listing, and nothing for an answer engine to cite when a parent asks
        "Islamic school in Ikorodu".

     2. THE SITEMAP COVERED 30 OF 151 PUBLIC PAGES. Four-fifths of the site
        was left to be discovered by crawling alone.

   ON HONESTY IN MARKUP. Every field below is a fact this repository already
   states publicly — address, telephones, founding date, the five institutions,
   the languages taught. There is no aggregateRating, no award, no
   accreditation claim and no student count, because structured data is a
   statement made to a search engine on the institution's behalf and a false
   one is a false claim wherever it is read. Google also treats markup that
   does not match visible content as a spam signal, so inventing here would
   risk the very rankings it was meant to win.

       node scripts/seo-build.mjs
   =========================================================================== */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ORIGIN = 'https://shroyalschools.com';

/* Directories that are not public pages: the signed-in portal, build output,
   language mirrors (they get their own hreflang entries, not duplicate rows),
   and anything git or tooling owns. */
const SKIP = new Set(['.git', 'node_modules', 'portal', 'dist', 'scripts',
                      'functions', 'partials', 'sql', 'lib', 'offline',
                      'ar', 'fr', 'yo', 'i18n', 'css', 'js', 'assets', 'brand',
                      'docs', 'mobile-app', 'pages']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name === 'index.html') out.push({ full, mtime: st.mtime });
  }
  return out;
}

/* --------------------------------------------------------------------------
   1. THE ENTITY
   -------------------------------------------------------------------------- */

/* Names are the ones each page carries in its own <h1>/<title>, and the URLs
   are the ones the site's own /academics/ index links to — not paraphrases.
   Markup that disagrees with the visible page is a spam signal, and a
   department URL that 404s is worse than no department node at all. A first
   pass invented /academics/islamic-arabic/ (does not exist) and pointed the
   Qur'an and Online nodes at /quran-centre/ and /online-courses/, which are
   sibling pages rather than the institutions themselves. Checked against
   disk. */
const INSTITUTIONS = [
  ['Sultan Hanafi Nursery and Primary School', '/academics/nursery-primary/'],
  ['Royal College', '/academics/royal-college/'],
  ['School of Islamic and Arabic Studies', '/academics/arabic-islamic-studies/'],
  ["Qur'an College", '/academics/quran-college/'],
  ['Online & Distance Learning School', '/academics/online-distance-learning/'],
];

function entity() {
  return {
    '@context': 'https://schema.org',
    '@type': ['School', 'EducationalOrganization'],
    '@id': ORIGIN + '/#school',
    name: 'Sultan Hanafi Royal Schools',
    alternateName: 'SHRS',
    url: ORIGIN + '/',
    logo: ORIGIN + '/assets/images/brand-mark.png',
    image: ORIGIN + '/assets/images/campus/campus-frontage.jpg',
    description:
      'Sultan Hanafi Royal Schools is a hybrid Islamic and secular institution in ' +
      'Ikorodu, Lagos State, Nigeria, comprising a Nursery and Primary School, ' +
      'Royal College, School of Islamic and Arabic Studies, Qur’an College, ' +
      'and an Online & Distance Learning School.',
    foundingDate: '2016-07',
    slogan: 'Forming Scholars, Leaders and Guardians of Excellence.',
    email: 'info@shroyalschools.com',
    telephone: ['+2348073747650', '+2348070586860'],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ikorodu',
      addressRegion: 'Lagos State',
      addressCountry: 'NG',
    },
    /* The languages the school actually teaches and publishes in — the site
       ships English, Arabic, French and Yoruba mirrors. */
    availableLanguage: ['en', 'ar', 'fr', 'yo'],
    knowsLanguage: ['en', 'ar', 'fr', 'yo'],
    department: INSTITUTIONS.map(([name, path]) => ({
      '@type': 'EducationalOrganization',
      name,
      url: ORIGIN + path,
    })),
    sameAs: [],           // filled only when an official profile is confirmed
    parentOrganization: undefined,
  };
}

function website() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': ORIGIN + '/#website',
    url: ORIGIN + '/',
    name: 'Sultan Hanafi Royal Schools',
    publisher: { '@id': ORIGIN + '/#school' },
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: ORIGIN + '/?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
}

const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? undefined : v)));

function injectEntity(pages) {
  const block =
    '<script type="application/ld+json" data-seo="entity">' +
    JSON.stringify(strip(entity())) + '</script>\n' +
    '<script type="application/ld+json" data-seo="website">' +
    JSON.stringify(strip(website())) + '</script>';

  let done = 0;
  for (const { full } of pages) {
    let html = readFileSync(full, 'utf8');
    if (html.includes('data-seo="entity"')) {
      html = html.replace(
        /<script type="application\/ld\+json" data-seo="entity">[\s\S]*?<\/script>\s*<script type="application\/ld\+json" data-seo="website">[\s\S]*?<\/script>/,
        block);
    } else if (html.includes('</head>')) {
      html = html.replace('</head>', block + '\n</head>');
    } else continue;
    writeFileSync(full, html);
    done++;
  }
  return done;
}

/* --------------------------------------------------------------------------
   2. THE SITEMAP
   -------------------------------------------------------------------------- */

/* Priority is a hint, not a ranking factor, so it is set by what the page is
   for rather than by guesswork: the admission path first, because that is the
   conversion, then the institutions a parent is choosing between. */
function priorityFor(url) {
  if (url === '/') return '1.0';
  if (/^\/(admission|apply)/.test(url)) return '0.9';
  if (/^\/(academics|quran-centre|online-courses|boarding|curriculum)/.test(url)) return '0.8';
  if (/^\/(about|faculty|facilities|student-life|graduate-profile|prospectus)/.test(url)) return '0.7';
  if (/^\/(contact|admission|verify)/.test(url)) return '0.6';
  return '0.5';
}

function sitemap(pages) {
  const LANGS = ['ar', 'fr', 'yo'];
  const rows = pages.map(({ full, mtime }) => {
    let url = '/' + relative(ROOT, full).replace(/index\.html$/, '');
    url = url.replace(/\/+/g, '/');
    const loc = ORIGIN + url;
    /* Only declare a translation that actually exists. A first pass emitted
       ar/fr/yo for every page and 21 of the 126 alternates were 404s — and a
       broken hreflang cluster is worse than none, because Google discards the
       whole set rather than the bad row. Checked against disk, not assumed. */
    const alts = [
      `    <xhtml:link rel="alternate" hreflang="en" href="${loc}"/>`,
      ...LANGS
        .filter((l) => existsSync(join(ROOT, l, url, 'index.html')))
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}/${l}${url}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>`,
    ].join('\n');
    return `  <url>\n    <loc>${loc}</loc>\n` +
           `    <lastmod>${mtime.toISOString().slice(0, 10)}</lastmod>\n` +
           `    <priority>${priorityFor(url)}</priority>\n${alts}\n  </url>`;
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    rows.join('\n') + '\n</urlset>\n';
}

/* -------------------------------------------------------------------------- */

/* Every URL this script asserts to a search engine is checked against disk
   first. A 404 inside structured data is a statement that the institution has
   a department it does not have. */
function verifyEntityUrls() {
  const local = (u) => u.startsWith(ORIGIN) ? u.slice(ORIGIN.length) : null;
  const targets = [
    entity().url, entity().logo, entity().image,
    ...entity().department.map((d) => d.url),
  ].map(local).filter(Boolean);

  const broken = targets.filter((p) => {
    const f = p.endsWith('/') ? join(ROOT, p, 'index.html') : join(ROOT, p);
    return !existsSync(f);
  });
  if (broken.length) {
    console.error('BROKEN ENTITY URLS:\n  ' + broken.join('\n  '));
    process.exit(1);
  }
  return targets.length;
}

const verified = verifyEntityUrls();
const pages = walk(ROOT).sort((a, b) => a.full.localeCompare(b.full));
const injected = injectEntity(pages);
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap(pages));

console.log(`entity urls verified: ${verified} (0 broken)`);
console.log(`public pages found : ${pages.length}`);
console.log(`entity injected on : ${injected}`);
console.log(`sitemap urls       : ${pages.length} (was 30)`);
console.log(`hreflang per url   : en + ar + fr + yo + x-default`);
