/* Sultan Hanafi Royal Schools — search that still works with no signal.
 *
 * Two corpora, kept apart on purpose, because they have different owners and
 * different rules:
 *
 *   PUBLIC   the pre-built /search-index.<lang>.json the site already ships.
 *            sw.js holds it stale-while-revalidate, so it is on the device
 *            after one visit and readable for ever after.
 *
 *   PERSONAL the records this device was allowed to keep. Searching these
 *            cannot leak a field that was never cached — the allowlist ran at
 *            write time, so a safeguarding note is not "hidden from search",
 *            it is absent from the device.
 *
 * Every result says where it came from and how old it is. A search that
 * silently returns a fortnight-old answer as though it were live is the same
 * failure as a cached page passing for a live one.
 */
import * as store from './shrs-local-store.js';
import { CACHEABLE_STUDENT_FIELDS, CACHEABLE_CERTIFICATE_FIELDS } from './shrs-offline-policy.js';

export const CORPUS = { PUBLIC: 'public', PERSONAL: 'personal' };

/* Which fields each entity is searched ON. A subset of what is cached, not a
 * superset: a date of birth is legitimately held for identification but is not
 * something to match a free-text query against. */
const SEARCHABLE = {
  student: ['full_name', 'full_name_ar', 'admission_no', 'identity_no', 'class_name', 'programme_code'],
  certificate: ['serial_no', 'student_name', 'programme', 'academic_year'],
};

// Guard rather than comment. If the approved allowlist ever narrows, a field
// searched here that is no longer cached would silently return nothing and
// look like "no results" instead of a broken index.
const CACHEABLE = { student: CACHEABLE_STUDENT_FIELDS, certificate: CACHEABLE_CERTIFICATE_FIELDS };
export function searchableFields(entity) {
  const allowed = CACHEABLE[entity] || [];
  return (SEARCHABLE[entity] || []).filter((f) => allowed.includes(f));
}

function normalise(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip Latin accents; Yoruba tone marks
    .replace(/\s+/g, ' ')
    .trim();
}

// Arabic is normalised separately: alef forms and the tā' marbūṭa are the two
// that break a name search in practice ("عائشة" typed as "عايشة").
function normaliseArabic(s) {
  return String(s == null ? '' : s)
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

function prepare(s) {
  const n = normalise(s);
  return /[؀-ۿ]/.test(s || '') ? normaliseArabic(n) : n;
}

function scoreOne(haystack, needle) {
  if (!haystack || !needle) return 0;
  if (haystack === needle) return 100;
  if (haystack.startsWith(needle)) return 70;
  const at = haystack.indexOf(needle);
  if (at === -1) return 0;
  // A match at a word boundary is worth more than one buried mid-token.
  return haystack[at - 1] === ' ' ? 50 : 25;
}

/* ── Personal records ────────────────────────────────────────────────────── */

export async function searchPersonal(query, entities = ['student', 'certificate']) {
  const needle = prepare(query);
  if (needle.length < 2) return { corpus: CORPUS.PERSONAL, query, results: [], reason: 'query-too-short' };
  if (!store.sessionValid()) return { corpus: CORPUS.PERSONAL, query, results: [], reason: 'locked' };

  const results = [];
  let oldest = 0;
  for (const entity of entities) {
    const fields = searchableFields(entity);
    if (!fields.length) continue;
    for (const row of await store.listRecords(entity)) {
      let best = 0;
      let matchedOn = null;
      for (const field of fields) {
        const s = scoreOne(prepare(row.data[field]), needle);
        if (s > best) { best = s; matchedOn = field; }
      }
      if (!best) continue;
      oldest = oldest ? Math.min(oldest, row.syncedAt) : row.syncedAt;
      results.push({
        entity,
        id: row.id,
        score: best,
        matchedOn,
        // Only the fields searched are returned. The caller renders a result
        // row, not a record, and has to fetch the record to show more.
        preview: fields.reduce((acc, f) => { if (row.data[f] != null) acc[f] = row.data[f]; return acc; }, {}),
        syncedAt: row.syncedAt,
      });
    }
  }
  results.sort((a, b) => b.score - a.score || String(a.preview.full_name || '').localeCompare(String(b.preview.full_name || '')));
  return {
    corpus: CORPUS.PERSONAL,
    query,
    results,
    live: false,                       // always from the device, by design
    oldestSyncedAt: oldest || null,
  };
}

/* ── Public content ──────────────────────────────────────────────────────── */

const indexes = new Map();   // lang -> parsed index

export async function searchPublic(query, lang = 'en') {
  const needle = prepare(query);
  if (needle.length < 2) return { corpus: CORPUS.PUBLIC, query, results: [], reason: 'query-too-short' };

  let index = indexes.get(lang);
  if (!index) {
    try {
      const res = await fetch(`/search-index.${lang}.json`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('index ' + res.status);
      index = await res.json();
      indexes.set(lang, index);
    } catch (e) {
      // No index and no signal. Saying so is the answer; pretending the site
      // has nothing on the subject is not.
      return { corpus: CORPUS.PUBLIC, query, results: [], reason: navigator.onLine ? 'index-unavailable' : 'index-not-on-device' };
    }
  }

  const results = [];
  for (const page of index) {
    const title = scoreOne(prepare(page.title), needle);
    const desc = scoreOne(prepare(page.description), needle) * 0.6;
    const body = prepare(page.body).includes(needle) ? 15 : 0;
    const score = Math.max(title, desc, body);
    if (!score) continue;
    results.push({ url: page.url || page.path, title: page.title, description: page.description, score });
  }
  results.sort((a, b) => b.score - a.score);
  return {
    corpus: CORPUS.PUBLIC,
    query,
    results: results.slice(0, 25),
    live: navigator.onLine,
  };
}

/* ── Both, with an honest label ──────────────────────────────────────────── */

const LABELS = {
  en: { device: 'From this device', live: 'Live', saved: 'Saved copy', none: 'Nothing found on this device' },
  ar: { device: 'من هذا الجهاز', live: 'مباشر', saved: 'نسخة محفوظة', none: 'لا يوجد شيء على هذا الجهاز' },
  yo: { device: 'Láti inú ẹ̀rọ yìí', live: 'Tààrà', saved: 'Ẹ̀dà tí a pamọ́', none: 'Kò sí ohunkóhun lórí ẹ̀rọ yìí' },
  fr: { device: 'Depuis cet appareil', live: 'En direct', saved: 'Copie enregistrée', none: 'Rien trouvé sur cet appareil' },
};

export async function search(query, opts = {}) {
  const lang = LABELS[opts.lang] ? opts.lang : 'en';
  const [pub, personal] = await Promise.all([
    searchPublic(query, lang),
    opts.includePersonal === false
      ? Promise.resolve({ corpus: CORPUS.PERSONAL, results: [] })
      : searchPersonal(query, opts.entities),
  ]);
  const t = LABELS[lang];
  return {
    query,
    lang,
    offline: !navigator.onLine,
    public: { ...pub, label: pub.live ? t.live : t.saved },
    personal: { ...personal, label: t.device },
    empty: pub.results.length === 0 && personal.results.length === 0,
    emptyLabel: t.none,
  };
}
