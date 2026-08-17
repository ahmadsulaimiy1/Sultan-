#!/usr/bin/env node
/* ===========================================================================
   META BUILD — the sixteen pages that were not describing themselves
   ===========================================================================

   MEASURED ACROSS THE 42 PUBLIC PAGES:

       7 pages   no <link rel="canonical">
       7 pages   no og:image
       6 pages   no meta description at all
       9 titles  over 60 characters — truncated in a result
       6 descs   over 160 characters — truncated in a result

   All six prospectus editions and the application form were affected: the
   pages a parent is sent a link to, and the page an admission is completed
   on. A page with no description lets Google invent one from the body copy,
   and a page with no canonical invites every tracking parameter and trailing
   variant to become a separate URL competing with itself.

   One title was publishing an internal marker to the open web:

       "Sultan Hanafi Royal Schools — Flagship Prospectus (Production Draft v1.0)"

   ON THE WRITING. The descriptions below are written, not generated. Each one
   says what the page contains in the words a parent would use, inside the
   ~155 characters a result actually shows. A description is not a ranking
   factor; it is the sentence that decides whether the click happens.

       node scripts/meta-build.mjs [--dry]
   =========================================================================== */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ORIGIN = 'https://shroyalschools.com';
const DRY = process.argv.includes('--dry');

/* [ path, title | null, description | null ]
   null keeps what the page already has. Titles are rewritten only where the
   existing one is truncated in a result or leaks something internal. */
const PAGES = [
  ['/prospectus/',
   'Prospectus — Sultan Hanafi Royal Schools',
   'The prospectus of Sultan Hanafi Royal Schools, Ikorodu: six editions covering the institution, its campus, student life, the digital campus and the masterplan.'],

  ['/prospectus/definitive/',
   'The Flagship Publication — Sultan Hanafi Royal Schools',
   'The institutional record of Sultan Hanafi Royal Schools — its founding, governance, academic standard and the man it is named for, Anofi Aliu Akano.'],

  ['/prospectus/aspirational/',
   'The Aspirational Edition — Sultan Hanafi Royal Schools',
   'Where extraordinary is formed: the young people Sultan Hanafi Royal Schools is forming, one character at a time. An edition on ambition, conduct and outcome.'],

  ['/prospectus/masterplan/',
   'The Institutional Masterplan — Sultan Hanafi Royal Schools',
   'Governance, infrastructure and record at Sultan Hanafi Royal Schools, Ikorodu — for parents, regulators, partners and donors who want to see the institution.'],

  ['/prospectus/digital-campus/',
   'The Digital Campus Edition — Sultan Hanafi Royal Schools',
   'How Sultan Hanafi Royal Schools is building the digital infrastructure of a school preparing students for 2050 — one real system at a time.'],

  ['/prospectus/student-experience/',
   null,
   'What a Tuesday morning actually feels like at Sultan Hanafi Royal Schools — assembly, lessons, the Qur’an circle, boarding and the hours in between.'],

  ['/admission/apply/',
   null,
   'Apply to Sultan Hanafi Royal Schools, Ikorodu. Ten steps: the programme, your child, your family, their schooling, health, Qur’an and Arabic, and the documents.'],

  /* Over-length only — the page describes itself well, at the wrong length. */
  ['/', 'Sultan Hanafi Royal Schools — Ikorodu, Lagos State',
   'A hybrid Islamic and secular school in Ikorodu, Lagos: Nursery and Primary, Royal College, Islamic and Arabic Studies, Qur’an College and online learning.'],

  ['/about/', null,
   'The founding, governance and standard of Sultan Hanafi Royal Schools — a hybrid Islamic and secular institution in Ikorodu, Lagos State, established July 2016.'],

  ['/academics/', null,
   'The five institutions of Sultan Hanafi Royal Schools: Nursery and Primary, Royal College, Islamic and Arabic Studies, Qur’an College, and Online Learning.'],

  ['/curriculum/', null,
   'How the Nigerian and Islamic curricula are taught together at Sultan Hanafi Royal Schools — subjects, assessment, and how the two streams meet in one timetable.'],

  ['/policies/', null,
   'The published policies of Sultan Hanafi Royal Schools: safeguarding, admissions, conduct, data protection, fees and complaints — in full, in plain language.'],

  ['/verify-graduation-document/', null,
   'Verify a Sultan Hanafi Royal Schools graduation document. Enter the reference printed on the certificate to confirm it was issued by the institution.'],

  ['/academics/arabic-islamic-studies/',
   'Islamic & Arabic Studies — Sultan Hanafi Royal Schools', null],

  ['/academics/online-distance-learning/',
   'Online & Distance Learning — Sultan Hanafi Royal Schools', null],

  ['/foundation/',
   'The Sultan Zakariya Hanafi Foundation — SHRS', null],
];

/* og:image is a per-page picture where the page has one, and the crest where
   it does not — never a blank, because a link shared to WhatsApp with no
   image is the commonest way a school link dies in a parents' group. And in
   this market WhatsApp IS the distribution channel. */
const DEFAULT_OG = ORIGIN + '/assets/images/campus/campus-frontage.jpg';

function setTag(html, re, tag) {
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', tag + '\n</head>');
}

let touched = 0;
const report = [];

for (const [url, title, desc] of PAGES) {
  const file = join(ROOT, url, 'index.html');
  if (!existsSync(file)) { console.error('MISSING PAGE: ' + url); process.exit(1); }
  const before = readFileSync(file, 'utf8');
  let html = before;
  const did = [];

  if (title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
    did.push(`title ${title.length}ch`);
  }
  if (desc) {
    html = setTag(html, /<meta name="description" content="[^"]*"\s*\/?>/,
                  `<meta name="description" content="${desc}">`);
    /* og:description and twitter:description exist to be the same sentence.
       Letting them drift is how a page says one thing in a result and another
       when it is shared. */
    html = setTag(html, /<meta property="og:description" content="[^"]*"\s*\/?>/,
                  `<meta property="og:description" content="${desc}">`);
    html = setTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
                  `<meta name="twitter:description" content="${desc}">`);
    did.push(`desc ${desc.length}ch`);
  }
  if (!/rel="canonical"/.test(html)) {
    html = html.replace('</head>', `<link rel="canonical" href="${ORIGIN}${url}">\n</head>`);
    did.push('canonical');
  }
  if (!/property="og:image"/.test(html)) {
    html = html.replace('</head>',
      `<meta property="og:image" content="${DEFAULT_OG}">\n` +
      `<meta name="twitter:card" content="summary_large_image">\n</head>`);
    did.push('og:image');
  }

  if (html !== before) {
    touched++;
    if (!DRY) writeFileSync(file, html);
    report.push([url, did.join(', ')]);
  }
}

for (const [url, did] of report) console.log(`  ${url.padEnd(38)} ${did}`);
console.log(`\n${DRY ? 'would touch' : 'repaired'}: ${touched} pages`);

/* Prove it, rather than assert it. */
const SKIP = new Set(['.git', 'node_modules', 'portal', 'dist', 'scripts', 'functions',
  'partials', 'sql', 'lib', 'offline', 'ar', 'fr', 'yo', 'i18n', 'css', 'js',
  'assets', 'brand', 'docs', 'mobile-app', 'pages']);
const { readdirSync, statSync } = await import('node:fs');
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, out); else if (n === 'index.html') out.push(f);
  }
  return out;
}
const all = walk(ROOT);
const bad = { canonical: 0, og: 0, desc: 0, longTitle: 0, longDesc: 0 };
for (const f of all) {
  const h = readFileSync(f, 'utf8');
  if (!/rel="canonical"/.test(h)) bad.canonical++;
  if (!/property="og:image"/.test(h)) bad.og++;
  const d = (h.match(/<meta name="description" content="([^"]*)/) || [])[1];
  if (!d) bad.desc++; else if (d.length > 160) bad.longDesc++;
  const t = (h.match(/<title>([^<]*)/) || [])[1] || '';
  if (t.length > 60) bad.longTitle++;
}
console.log(`\nafter, across ${all.length} public pages:`);
console.log(`  no canonical ${bad.canonical}   no og:image ${bad.og}   no description ${bad.desc}` +
            `   title>60 ${bad.longTitle}   desc>160 ${bad.longDesc}`);
