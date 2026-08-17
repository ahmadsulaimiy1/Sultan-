#!/usr/bin/env node
/* ===========================================================================
   KEYWORD INTELLIGENCE DATABASE
   ===========================================================================

   READ THIS BEFORE READING THE NUMBERS.

   This machine has no Ahrefs, Semrush, Keyword Planner or Search Console
   connection. It therefore has NO SEARCH VOLUME DATA, and the honest thing
   to do is say so rather than emit a "volume" column full of invented
   integers that would look authoritative and be fiction. Fabricated volume is
   worse than absent volume: it gets planned against.

   So every scored column here is MODELLED, from rules written down below and
   from live SERP evidence gathered during the research phase. `difficulty`
   and `opportunity` are 0–100 estimates produced by a stated function, not
   measurements. The moment Search Console is connected, `--merge-gsc` reads
   real impressions and clicks and replaces the model where reality disagrees.

   WHAT IS REAL EVIDENCE HERE, from SERPs actually inspected:

     - "best schools in Lagos" and its variants are DIRECTORY SERPs. Page one
       is Legit.ng, international-schools-database, nigeriaprivateschools.com,
       NAPPS and EduTimes — listicles, not school websites. Google reads that
       query as "give me a list", and a single school cannot be a list. Ranking
       #1 for it is not an achievable goal; being IN those lists is. This one
       observation should redirect most of the budget that head terms usually
       eat.

     - "Islamic school / tahfiz / hifz Nigeria" SERPs DO rank individual
       school websites — scholarsita.com, nobleguideacademy.com,
       darusalamacademy.com all hold page one. This is the niche where a
       school site is the right answer to the query, and it is where SHRS
       should compete hardest.

     - Ikorodu SERPs are directory-dominated too (edusko, infoisinfo, NAPPS),
       which makes citations a ranking lever rather than a chore.

   The database is for PLANNING TOPICAL COVERAGE. It is not a list of phrases
   to insert into pages. Google rewards helpful, people-first content and
   penalises the mechanical repetition this file could be misused for.

       node scripts/keyword-build.mjs
   =========================================================================== */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

/* -------------------------------------------------------------------------
   GEOGRAPHY — real places, ordered by how close they are to the gate
   ------------------------------------------------------------------------- */

/* Ikorodu communities. Proximity is a Local Pack ranking factor, so the
   nearest names are also the winnable ones. Imowonla is the campus itself. */
const NEIGHBOURHOOD = ['Imowonla', 'Gberigbe', 'Agura', 'Igbogbo', 'Ijede',
  'Ebute Ikorodu', 'Ayangburen', 'Sabo Ikorodu', 'Odogunyan', 'Isawo', 'Owutu',
  'Agric Ikorodu', 'Ipakodo', 'Ita Elewa', 'Aga Ikorodu', 'Bayeku', 'Oreta',
  'Ogolonto', 'Ogijo', 'Majidun', 'Lasunwon', 'Erikorodo'];

/* Lagos mainland and island districts a boarding family might search from. */
const LAGOS_AREA = ['Ikeja', 'Lekki', 'Yaba', 'Surulere', 'Maryland', 'Magodo',
  'Ketu', 'Mile 12', 'Ojota', 'Berger', 'Agege', 'Alimosho', 'Ikotun', 'Egbeda',
  'Shomolu', 'Bariga', 'Ojodu', 'Isolo', 'Festac', 'Ajah', 'Epe', 'Sangotedo',
  'Victoria Island', 'Ikoyi', 'Gbagada', ' Mushin', 'Oshodi'].map((s) => s.trim());

const REGION = ['Ikorodu', 'Lagos', 'Lagos State', 'Lagos Mainland', 'Nigeria',
  'South West Nigeria', 'West Africa'];

/* Diaspora families placing a child in a Nigerian Islamic school — a real and
   under-served segment, and the reason the international pages exist. */
const DIASPORA = ['from UK', 'from USA', 'from Canada', 'from Saudi Arabia',
  'from UAE', 'from Qatar', 'for international students', 'for expatriates'];

/* -------------------------------------------------------------------------
   THE THINGS BEING SEARCHED FOR
   ------------------------------------------------------------------------- */

const SCHOOL_TYPE = [
  ['school', 'core'], ['private school', 'core'], ['schools', 'core'],
  ['nursery school', 'early'], ['primary school', 'early'],
  ['creche', 'early'], ['kindergarten', 'early'], ['nursery and primary school', 'early'],
  ['secondary school', 'secondary'], ['college', 'secondary'],
  ['junior secondary school', 'secondary'], ['senior secondary school', 'secondary'],
  ['boarding school', 'boarding'], ['day school', 'boarding'],
  ['Islamic school', 'islamic'], ['Muslim school', 'islamic'],
  ['Islamiyya school', 'islamic'], ['Arabic school', 'islamic'],
  ['Qur’an school', 'quran'], ['Quran memorisation school', 'quran'],
  ['tahfiz school', 'quran'], ['hifz school', 'quran'], ['Quranic school', 'quran'],
  ['international school', 'intl'], ['British curriculum school', 'intl'],
  ['Cambridge school', 'intl'], ['IGCSE school', 'intl'],
  ['online school', 'online'], ['distance learning school', 'online'],
  ['co-educational school', 'core'], ['mixed school', 'core'],
  ['special needs school', 'sen'], ['inclusive school', 'sen'],
];

/* How a parent qualifies the search. `w` weights commercial value. */
const QUALIFIER = [
  ['best', 3], ['top', 3], ['good', 2], ['affordable', 3], ['cheap', 2],
  ['reputable', 2], ['standard', 2], ['approved', 2], ['registered', 2],
  ['nearest', 3], ['new', 1], ['top rated', 3], ['well known', 1],
  ['low cost', 3], ['quality', 2], ['recommended', 2],
];

/* The questions that decide an admission, in the words parents type. */
const DECISION = [
  ['school fees', 'transactional', 5, 'decision'],
  ['fees per term', 'transactional', 5, 'decision'],
  ['tuition fees', 'transactional', 5, 'decision'],
  ['admission requirements', 'transactional', 5, 'decision'],
  ['how to apply', 'transactional', 5, 'decision'],
  ['application form', 'transactional', 5, 'decision'],
  ['entrance exam', 'commercial', 4, 'consideration'],
  ['entrance examination past questions', 'informational', 2, 'consideration'],
  ['admission list', 'navigational', 3, 'decision'],
  ['admission portal', 'navigational', 4, 'decision'],
  ['contact number', 'navigational', 4, 'decision'],
  ['address', 'navigational', 4, 'decision'],
  ['location', 'navigational', 3, 'decision'],
  ['website', 'navigational', 2, 'consideration'],
  ['reviews', 'commercial', 4, 'consideration'],
  ['ratings', 'commercial', 3, 'consideration'],
  ['requirements for admission', 'transactional', 5, 'decision'],
  ['scholarship', 'commercial', 4, 'consideration'],
  ['bursary', 'commercial', 3, 'consideration'],
  ['payment plan', 'transactional', 4, 'decision'],
  ['mid term admission', 'transactional', 5, 'decision'],
  ['resumption date', 'navigational', 2, 'enrolled'],
  ['academic calendar', 'navigational', 2, 'enrolled'],
  ['uniform', 'informational', 2, 'enrolled'],
  ['school bus', 'commercial', 3, 'consideration'],
  ['transport', 'commercial', 3, 'consideration'],
  ['boarding fees', 'transactional', 5, 'decision'],
  ['hostel', 'commercial', 3, 'consideration'],
  ['results', 'commercial', 3, 'consideration'],
  ['WAEC results', 'commercial', 3, 'consideration'],
  ['university placement', 'commercial', 3, 'consideration'],
];

/* Everything a parent wants to know that is not a transaction. This is where
   topical authority is actually built, and where an answer engine finds
   something worth quoting. */
const TOPIC = [
  // curriculum and academics
  ['Cambridge curriculum vs Nigerian curriculum', 'curriculum'],
  ['IGCSE in Nigeria explained', 'curriculum'],
  ['WAEC vs NECO vs IGCSE', 'curriculum'],
  ['British curriculum in Nigerian schools', 'curriculum'],
  ['Montessori vs traditional teaching', 'curriculum'],
  ['what is the 9-3-4 education system', 'curriculum'],
  ['subjects offered in senior secondary school', 'curriculum'],
  ['STEM education in Nigeria', 'curriculum'],
  ['robotics for secondary school students', 'curriculum'],
  ['coding for children in Nigeria', 'curriculum'],
  ['artificial intelligence in schools', 'curriculum'],
  ['digital literacy for primary pupils', 'curriculum'],
  // islamic education
  ['how hifz is taught', 'islamic'],
  ['how long does it take to memorise the Qur’an', 'islamic'],
  ['tajwid for beginners', 'islamic'],
  ['combining Qur’an memorisation with school', 'islamic'],
  ['difference between Islamiyya and tahfiz', 'islamic'],
  ['what is an ijazah in Qur’an recitation', 'islamic'],
  ['teaching Arabic to Nigerian children', 'islamic'],
  ['Islamic studies curriculum in Nigeria', 'islamic'],
  ['can a child do hifz and Cambridge together', 'islamic'],
  ['sending a child to an Islamic boarding school', 'islamic'],
  ['salah and school timetable', 'islamic'],
  ['halal food in boarding school', 'islamic'],
  // boarding and pastoral
  ['what is boarding school like for a child', 'boarding'],
  ['at what age should a child board', 'boarding'],
  ['boarding school homesickness', 'boarding'],
  ['boarding school safety and supervision', 'boarding'],
  ['what to pack for boarding school', 'boarding'],
  ['visiting day in boarding school', 'boarding'],
  ['boarding school meals and nutrition', 'boarding'],
  ['matron and pastoral care', 'boarding'],
  // safeguarding and welfare
  ['school safeguarding policy Nigeria', 'welfare'],
  ['how schools handle bullying', 'welfare'],
  ['child protection in Nigerian schools', 'welfare'],
  ['school sick bay and first aid', 'welfare'],
  ['school security and access control', 'welfare'],
  ['mental health support for students', 'welfare'],
  ['special educational needs support', 'welfare'],
  ['dyslexia support in Nigerian schools', 'welfare'],
  // choosing a school
  ['how to choose a school for your child', 'choosing'],
  ['questions to ask on a school tour', 'choosing'],
  ['what to look for in a private school', 'choosing'],
  ['signs of a good school', 'choosing'],
  ['is a boarding school worth it', 'choosing'],
  ['how to check if a school is registered in Lagos', 'choosing'],
  ['teacher qualifications to ask about', 'choosing'],
  ['what class size should a school have', 'choosing'],
  ['how to transfer a child to a new school', 'choosing'],
  ['what documents are needed for school admission', 'choosing'],
  // child development
  ['school readiness for a five year old', 'development'],
  ['helping a child settle into a new school', 'development'],
  ['reading at home with a primary child', 'development'],
  ['how to build study habits', 'development'],
  ['character development in schools', 'development'],
  ['leadership training for teenagers', 'development'],
  ['screen time and homework', 'development'],
  ['exam anxiety in teenagers', 'development'],
  // fees and money
  ['average school fees in Lagos', 'money'],
  ['how much is boarding school in Nigeria', 'money'],
  ['paying school fees in instalments', 'money'],
  ['school fees increase and what to do', 'money'],
  ['scholarships for Nigerian students', 'money'],
  ['is private school worth the cost', 'money'],
];

/* -------------------------------------------------------------------------
   THE MODEL — every score below comes from these rules, and nowhere else
   -------------------------------------------------------------------------

   DIFFICULTY. Driven by the breadth of the geography and the presence of a
   superlative, because that is what pulls a query into the directory SERPs
   observed during research. Narrow geography and a specific question are
   easy; "best school in Nigeria" is not winnable by a school website at all,
   and the model says so with a 95+.

   OPPORTUNITY. Deliberately NOT the inverse of difficulty. It is commercial
   value discounted by difficulty, then lifted where SHRS has a real,
   defensible advantage — the Islamic and Qur'an clusters, and Ikorodu — and
   suppressed where the SERP is a list a school cannot join. This is the
   column that should drive the calendar. */

const GEO_BREADTH = {
  neighbourhood: 8, ikorodu: 22, lagos_area: 38, lagos: 62,
  nigeria: 82, region: 74, intl: 55, none: 45,
};

/* DEMAND, 0–10, and the correction that matters most in this file.

   A first run scored "low cost muslim school in aga ikorodu" at 100/100 —
   because it is trivially easy to rank for, and nothing in the model asked
   whether anybody searches it. Easiness without demand is not opportunity, it
   is an empty page. With no volume data available, demand is modelled from
   how many people plausibly search from a place and how naturally the phrase
   is spoken. It is a rough instrument and it is stated as one; its only job is
   to stop the calendar being led by phrases nobody types. */
const GEO_DEMAND = {
  neighbourhood: 1.2, ikorodu: 5.5, lagos_area: 2.4, lagos: 9,
  nigeria: 8.5, region: 5, intl: 2.2, none: 6,
};

/* Where the school genuinely has an edge, evidenced by the SERPs inspected:
   individual school sites DO rank for tahfiz/Islamic queries. */
const ADVANTAGE = { quran: 26, islamic: 22, boarding: 10, early: 6, intl: -6, sen: -4 };

function score(row) {
  const breadth = GEO_BREADTH[row.geoClass] ?? 45;
  let difficulty = breadth;
  if (/\b(best|top|top rated)\b/.test(row.keyword)) difficulty += 18;
  if (row.intent === 'informational') difficulty -= 12;      // question SERPs are softer
  if (row.keyword.split(' ').length >= 7) difficulty -= 14;  // long tail
  if (row.keyword.split(' ').length <= 3) difficulty += 10;
  if (row.cluster === 'brand') difficulty = 3;               // nobody outranks you for your own name
  difficulty = Math.max(2, Math.min(99, Math.round(difficulty)));

  /* A directory SERP cannot be won by a school site. Saying so in the data
     stops the calendar from spending months on it. */
  const directorySerp = difficulty >= 78 && /\b(best|top|schools|list of)\b/.test(row.keyword);

  /* Opportunity is a PRODUCT, not a sum. A sum lets one strong term carry a
     keyword nobody searches; a product means a zero anywhere is a zero
     overall, which is the correct behaviour for "easy but unsearched". */
  const demand = GEO_DEMAND[row.geoClass] ?? 5;
  const value = row.commercial / 5;                    // 0–1
  const winnable = (100 - difficulty) / 100;           // 0–1
  const edge = 1 + (ADVANTAGE[row.cluster] || 0) / 100;

  let opportunity = 100 * Math.pow(demand / 10, 0.6) * Math.pow(value, 0.8)
                        * Math.pow(winnable, 0.7) * edge;
  if (directorySerp) opportunity *= 0.35;    // a list is not a page a school can be
  if (row.cluster === 'brand') opportunity *= 1.35;
  opportunity = Math.max(1, Math.min(100, Math.round(opportunity)));

  return { difficulty, opportunity, directorySerp, demand: +demand.toFixed(1) };
}

/* -------------------------------------------------------------------------
   PAGE ROUTING — every keyword must point at a page that will answer it
   ------------------------------------------------------------------------- */
const PAGE = {
  early: '/academics/nursery-primary/', secondary: '/academics/royal-college/',
  islamic: '/academics/arabic-islamic-studies/', quran: '/academics/quran-college/',
  online: '/academics/online-distance-learning/', boarding: '/boarding/',
  intl: '/curriculum/', core: '/academics/', sen: '/student-life/',
  curriculum: '/curriculum/', welfare: '/policies/', choosing: '/admission/',
  development: '/student-life/', money: '/admission/fees/', brand: '/',
};
const LINKS = {
  early: ['/admission/', '/curriculum/', '/facilities/'],
  secondary: ['/curriculum/', '/graduate-profile/', '/admission/'],
  islamic: ['/academics/quran-college/', '/curriculum/', '/admission/'],
  quran: ['/academics/arabic-islamic-studies/', '/boarding/', '/admission/'],
  boarding: ['/facilities/', '/student-life/', '/admission/'],
  money: ['/admission/', '/admission/apply/', '/contact/'],
  choosing: ['/about/', '/faculty/', '/facilities/', '/contact/'],
  curriculum: ['/academics/', '/graduate-profile/'],
  welfare: ['/policies/', '/boarding/', '/contact/'],
  development: ['/student-life/', '/faculty/'],
  intl: ['/academics/royal-college/', '/admission/'],
  online: ['/online-courses/', '/admission/'],
  core: ['/academics/', '/admission/', '/contact/'],
  sen: ['/policies/', '/contact/'],
  brand: ['/about/', '/admission/', '/contact/'],
};

const FUNNEL = { informational: 'awareness', commercial: 'consideration',
                 transactional: 'decision', navigational: 'decision' };

const rows = [];
const seen = new Set();

function add(keyword, o) {
  const k = keyword.toLowerCase().replace(/\s+/g, ' ').trim();
  if (seen.has(k) || k.length > 90) return;
  seen.add(k);
  const row = { keyword: k, ...o };
  Object.assign(row, score(row));
  row.funnel = FUNNEL[row.intent];
  row.page = PAGE[row.cluster] || '/academics/';
  row.links = (LINKS[row.cluster] || LINKS.core).join(' ');
  row.priority = row.opportunity >= 62 ? 'P1'
               : row.opportunity >= 45 ? 'P2'
               : row.opportunity >= 28 ? 'P3' : 'P4';
  rows.push(row);
}

/* 1 — brand. The cheapest enquiries in the whole database, and the ones a
   split domain quietly loses. */
for (const base of ['Sultan Hanafi Royal Schools', 'Sultan Hanafi School',
                    'SHRS Ikorodu', 'Sultan Hanafi Ikorodu', 'Sultan Hanafi Qur’an College']) {
  add(base, { intent: 'navigational', cluster: 'brand', geoClass: 'ikorodu',
              commercial: 5, entities: 'SHRS', parentIntent: 'find the school itself' });
  for (const [d, intent, comm] of DECISION) {
    add(`${base} ${d}`, { intent, cluster: 'brand', geoClass: 'ikorodu',
        commercial: comm, entities: 'SHRS', parentIntent: `${d} for this school` });
  }
}

/* 2 — school type x geography. The spine of local search. */
for (const [type, cluster] of SCHOOL_TYPE) {
  for (const [places, geoClass] of [[NEIGHBOURHOOD, 'neighbourhood'],
                                    [LAGOS_AREA, 'lagos_area'], [REGION, 'region']]) {
    for (const place of places) {
      const geo = /Nigeria|West Africa/.test(place) ? 'nigeria'
                : place === 'Ikorodu' ? 'ikorodu'
                : /Lagos/.test(place) ? 'lagos' : geoClass;
      add(`${type} in ${place}`, { intent: 'commercial', cluster, geoClass: geo,
          commercial: 4, entities: `${type}; ${place}`,
          parentIntent: `find a ${type} near ${place}` });

      /* Qualifiers are rationed by how people actually speak. Nobody types
         "low cost muslim school in aga ikorodu" — at village scale a parent
         says the type and the place and stops. The superlatives belong to the
         wide geographies, which is exactly where they are hardest to win. */
      const quals = geoClass === 'neighbourhood' ? QUALIFIER.slice(0, 2)
                  : geoClass === 'lagos_area' ? QUALIFIER.slice(0, 5)
                  : QUALIFIER;
      for (const [q, w] of quals) {
        add(`${q} ${type} in ${place}`, { intent: 'commercial', cluster, geoClass: geo,
            commercial: w, entities: `${type}; ${place}`,
            parentIntent: `shortlist a ${type} around ${place}` });
      }
    }
  }
  add(`${type} near me`, { intent: 'commercial', cluster, geoClass: 'ikorodu',
      commercial: 5, entities: type, parentIntent: 'find one close enough to reach' });
}

/* 3 — school type x the decision questions. Where enquiries actually come
   from: a parent asking a specific thing has already decided to act. */
for (const [type, cluster] of SCHOOL_TYPE) {
  for (const [d, intent, comm, stage] of DECISION) {
    for (const place of ['Ikorodu', 'Lagos', 'Nigeria']) {
      const geoClass = place === 'Ikorodu' ? 'ikorodu' : place === 'Lagos' ? 'lagos' : 'nigeria';
      add(`${type} ${d} in ${place}`, { intent, cluster, geoClass, commercial: comm,
          entities: `${type}; ${d}; ${place}`, parentIntent: `${d} — ${stage} stage` });
    }
  }
}

/* 4 — the questions. Topical authority, and the material an answer engine
   can actually quote. */
for (const [topic, cluster] of TOPIC) {
  add(topic, { intent: 'informational', cluster, geoClass: 'none', commercial: 1,
               entities: cluster, parentIntent: 'understand before deciding' });
  for (const pre of ['', 'what is ', 'how to ', 'why ', 'when to ', 'guide to ']) {
    if (pre) add(`${pre}${topic}`, { intent: 'informational', cluster, geoClass: 'none',
        commercial: 1, entities: cluster, parentIntent: 'understand before deciding' });
  }
  for (const place of ['Nigeria', 'Lagos', 'Ikorodu']) {
    add(`${topic} in ${place}`, { intent: 'informational', cluster,
        geoClass: place === 'Ikorodu' ? 'ikorodu' : place === 'Lagos' ? 'lagos' : 'nigeria',
        commercial: 2, entities: `${cluster}; ${place}`,
        parentIntent: 'understand it in their own context' });
  }
}

/* 5 — diaspora. Small, high value, and almost entirely uncontested. */
for (const [type, cluster] of SCHOOL_TYPE.filter(([, c]) =>
       ['islamic', 'quran', 'boarding', 'intl', 'online'].includes(c))) {
  for (const d of DIASPORA) {
    add(`${type} in Nigeria ${d}`, { intent: 'commercial', cluster, geoClass: 'intl',
        commercial: 4, entities: `${type}; diaspora`,
        parentIntent: 'place a child in Nigeria from abroad' });
    add(`boarding ${type} in Lagos ${d}`, { intent: 'commercial', cluster, geoClass: 'intl',
        commercial: 4, entities: `${type}; diaspora`,
        parentIntent: 'place a child in Nigeria from abroad' });
  }
}

/* 6 — comparison and alternative queries. High intent, and the SERP is
   usually thin because schools refuse to write them. */
const RIVALS = ['Greensprings', 'Grange School', 'Corona', 'Dowen College',
  'Chrisland', 'Caleb International', 'Lagos Preparatory', 'NTIC',
  'Scholars International Tahfiz Academy', 'Daarus Salam Tahfidh Academy',
  'Al-Izzah', 'Noble Guide Academy'];
for (const r of RIVALS) {
  add(`${r} alternative`, { intent: 'commercial', cluster: 'choosing', geoClass: 'lagos',
      commercial: 4, entities: r, parentIntent: 'compare against a school they know' });
  add(`${r} school fees`, { intent: 'commercial', cluster: 'money', geoClass: 'lagos',
      commercial: 3, entities: r, parentIntent: 'benchmark the cost' });
  add(`schools like ${r}`, { intent: 'commercial', cluster: 'choosing', geoClass: 'lagos',
      commercial: 4, entities: r, parentIntent: 'find a comparable school' });
}

/* ------------------------------------------------------------------------- */

rows.sort((a, b) => b.opportunity - a.opportunity || a.difficulty - b.difficulty);

const COLS = ['keyword', 'intent', 'funnel', 'cluster', 'geoClass', 'demand',
  'difficulty', 'opportunity', 'commercial', 'directorySerp', 'parentIntent',
  'entities', 'page', 'links', 'priority'];
const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
writeFileSync(join(ROOT, 'docs/keyword-database.csv'),
  COLS.join(',') + '\n' + rows.map((r) => COLS.map((c) => esc(r[c])).join(',')).join('\n') + '\n');

const by = (k) => rows.reduce((a, r) => ((a[r[k]] = (a[r[k]] || 0) + 1), a), {});
const summary = {
  generated_by: 'scripts/keyword-build.mjs',
  volume_data: 'NONE — no keyword tool is connected. difficulty and opportunity are MODELLED, not measured.',
  total: rows.length,
  byPriority: by('priority'), byIntent: by('intent'), byFunnel: by('funnel'),
  byCluster: by('cluster'), byGeo: by('geoClass'),
  directorySerps: rows.filter((r) => r.directorySerp).length,
  top25: rows.slice(0, 25).map((r) => ({ k: r.keyword, opp: r.opportunity, diff: r.difficulty, page: r.page })),
};
writeFileSync(join(ROOT, 'docs/keyword-summary.json'), JSON.stringify(summary, null, 2));

/* -------------------------------------------------------------------------
   THE TOPICAL MAP — generated from the database so the two cannot drift
   ------------------------------------------------------------------------- */
const CLUSTER_TITLE = {
  quran: 'Qur’an, hifz and tajwīd', islamic: 'Islamic and Arabic studies',
  early: 'Nursery and primary', secondary: 'Secondary and Royal College',
  boarding: 'Boarding and pastoral care', intl: 'Cambridge and international curriculum',
  online: 'Online and distance learning', core: 'The school as a whole',
  curriculum: 'Curriculum explained', welfare: 'Safeguarding and welfare',
  choosing: 'Choosing a school', development: 'Child development and learning',
  money: 'Fees, value and scholarships', sen: 'Special educational needs',
  brand: 'Brand and navigational',
};
const PILLAR_NOTE = {
  quran: 'The strongest position available. SERPs for tahfiz and hifz rank individual school sites, not directories — this is where a school page IS the answer to the query.',
  islamic: 'Second strongest, same reason. Competitors here are other schools rather than listicles.',
  money: 'The highest-intent unanswered question in the market, and the page that does not yet exist.',
  choosing: 'Awareness-stage, and the cluster most likely to be quoted by an answer engine.',
  core: 'Mostly directory SERPs. Compete through citations and the Business Profile, not through pages.',
};

const clusters = {};
for (const r of rows) (clusters[r.cluster] ||= []).push(r);

let map = `# Topical Map

Generated by \`scripts/keyword-build.mjs\` from ${rows.length} keywords, so it
cannot drift from the database. Ordered by the total modelled opportunity of
each cluster rather than by keyword count — a large cluster of unwinnable
terms is not a large opportunity.

Every score here is **modelled, not measured**: no keyword tool is connected.
See the header of the generator for the rules and their limits.

| Cluster | Keywords | P1 | Median difficulty | Pillar page |
|---|---:|---:|---:|---|
`;
const ordered = Object.entries(clusters).sort((a, b) =>
  b[1].reduce((s, r) => s + r.opportunity, 0) - a[1].reduce((s, r) => s + r.opportunity, 0));
for (const [c, list] of ordered) {
  const med = list.map((r) => r.difficulty).sort((a, b) => a - b)[Math.floor(list.length / 2)];
  map += `| **${CLUSTER_TITLE[c] || c}** | ${list.length} | ` +
         `${list.filter((r) => r.priority === 'P1').length} | ${med} | \`${PAGE[c] || '—'}\` |\n`;
}
map += `\n---\n\n## Cluster by cluster\n`;
for (const [c, list] of ordered) {
  const p1 = list.filter((r) => r.priority === 'P1')
                 .sort((a, b) => b.opportunity - a.opportunity).slice(0, 10);
  const q = list.filter((r) => r.intent === 'informational').slice(0, 8);
  map += `\n### ${CLUSTER_TITLE[c] || c}\n\n`;
  if (PILLAR_NOTE[c]) map += `${PILLAR_NOTE[c]}\n\n`;
  map += `**Pillar:** \`${PAGE[c] || '—'}\` · **${list.length} keywords** · ` +
         `**${list.filter((r) => r.priority === 'P1').length} at P1**\n\n`;
  if (p1.length) {
    map += `Highest modelled opportunity:\n\n`;
    for (const r of p1) map += `- \`${r.opportunity}\` — ${r.keyword}\n`;
  }
  if (q.length) {
    map += `\nQuestions to answer (the material an answer engine can quote):\n\n`;
    for (const r of q) map += `- ${r.keyword}\n`;
  }
}
writeFileSync(join(ROOT, 'docs/topical-map.md'), map);

console.log(`keywords          : ${rows.length}`);
console.log(`by priority       :`, summary.byPriority);
console.log(`by intent         :`, summary.byIntent);
console.log(`by cluster        :`, Object.entries(summary.byCluster)
  .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join('  '));
console.log(`directory SERPs   : ${summary.directorySerps} flagged unwinnable by a school site`);
console.log(`\ntop 12 by modelled opportunity:`);
for (const r of rows.slice(0, 12)) {
  console.log(`  opp ${String(r.opportunity).padStart(3)}  diff ${String(r.difficulty).padStart(2)}  ` +
              `${r.priority}  ${r.keyword.slice(0, 52).padEnd(52)} -> ${r.page}`);
}
