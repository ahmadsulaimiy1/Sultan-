#!/usr/bin/env node
/**
 * Reconcile the Registrar's roll of 2 July 2026 against the certificate rolls.
 *
 *     node scripts/reconcile-registrar-roll.mjs
 *
 * TWO OFFICIAL ROLLS OF THE SAME CEREMONY EXIST AND THEY DISAGREE.
 *
 *   · The Registrar's "Notice of the 2026 Combined Graduation Ceremony",
 *     2 July 2026 (DOC-20260703-WA0002.pdf) — SEVEN categories, 45 awards.
 *   · The Founder's rolls of 6–7 August 2026, on which the Ibtidā'iyyah and
 *     I'dādiyyah certificate batches were MINTED AND PUBLISHED and on which
 *     the four outstanding batches are defined — SIX programmes, 40 awards.
 *
 * A certificate is a permanent record. Choosing between these two lists is not
 * a decision this pipeline may make: guessing wrong either denies a child a
 * certificate at their own graduation, or confers an award on a child who did
 * not earn it, or engraves the wrong school on one who did.
 *
 * So this script decides nothing. It prints every difference, exactly, with the
 * consequence of each, so the Founder and the Registrar can rule on a complete
 * picture rather than on a recollection.
 *
 * Name matching is deliberately conservative. Two entries are treated as the
 * same person only when their first AND last name-parts agree after case and
 * punctuation are normalised — so "Hameedah Ojewumi" and "Hameedah Adebimpe
 * Ojewumi" are one child, while "Ashrof Ojewumi" and "Ashrof Akorede" are
 * reported as unmatched rather than quietly merged. Anything the script cannot
 * decide it prints; it never resolves.
 */
import { readFileSync } from 'node:fs';

// ── The Registrar's roll, transcribed verbatim from the notice ──────────────
// Column headings are the Registrar's own, including "Quran college",
// "Ibtidaiyah", "Idadiyah" and the lower-case "fatih". Spelling is NOT
// normalised here: the whole purpose is to show what each document says.
const REGISTRAR = {
  'Basic 5': ['Aisha Lawal', 'Al-ameen Okoh', 'Ashraf Ojewumi', 'Daud Aliu',
    'Imran Adegoke', 'Naheemah Ismail'],
  'JSS 3': ['Abdulrahman Abdullah', 'Aisha Anofi', 'Allison Ganiyah',
    'Ameerah Abdulhafeez', 'Ameerah Durodola', 'Anisa Jokumba', 'Baqi Anofi',
    'Fareedah Aliu', 'Fateemah Ibrahim', 'Fawaz Owolabi', 'Hameedah Ojewumi',
    'Jubril Lawal', 'Muhammad Ismail', 'Radiah Apatira', "Sa'ad Sanusi"],
  'SSS 3': ['Abdulbasit Jabarr', 'Aisha Shode', 'Mazeed Hassan-Murtala',
    'Thoirah Makinde'],
  'Quran college': ['Aisha Anofi', 'Baqi Anofi', 'Sofiah Anofi', 'Zainab Anofi'],
  'Islamiyyah (Tamyidi)': ['Abdulbasit Adedokun', 'Muhammad fatih'],
  Ibtidaiyah: ['Abdulateef Adedokun', 'Aisha Anofi', 'Ameerah Abdulhafeez',
    'Ashrof Ojewumi', 'Fareedah Aliu', 'Hameedah Ojewumi', 'Imran Adegoke',
    'Muhammad Ismail', 'Naheemah Ismaeel'],
  Idadiyah: ['Abdullah Anofi', 'Balogun Yaseer', 'Baqi Anofi', 'Basit Jabarr',
    'Thoirah Makinde'],
};

// Which certificate programme each of the Registrar's columns maps to.
// "Islamiyyah (Tamyidi)" maps to NOTHING: no Tamyīdī award exists anywhere in
// this institution's certificate system. That is a finding, not an oversight
// in this table.
const MAP = {
  'Basic 5': 'PRY', 'JSS 3': 'JSS', 'SSS 3': 'SS', 'Quran college': 'QUR',
  Ibtidaiyah: 'IBT', Idadiyah: 'IDD', 'Islamiyyah (Tamyidi)': null,
};

// The Founder's rulings on this reconciliation, as given. Each records what was
// decided AND what the decision does not reach, because a ruling that settles
// an identity does not thereby settle a spelling, and a stage that exists does
// not thereby have approved wording.
const RULINGS = [
  {
    date: '2026-08-08',
    on: 'Islamiyyah (Tamyidi) — does the stage exist?',
    ruled: 'Yes. "Tamheediy" — the preparatory stage. Registered as TMH in '
      + 'functions/_lib/certificate-serial.js.',
    open: [
      'The engraved English and Arabic wording. Provisional, not approved.',
      'Whether Abdulbasit Adedokun belongs to TMH as the Registrar has him, or '
        + 'to IBT as certificate 000037 — ALREADY MINTED — has him.',
      'The spelling of "Muhammad fatih", as the notice sets it.',
      'A serial range. TMH would continue after QUR at 000075.',
    ],
  },
  {
    date: '2026-08-08',
    on: 'Ashrof / Naheemah — one child each, or several?',
    ruled: 'They are one. Student ID carry-overs applied to the Primary roll.',
    open: [
      'WHICH SPELLING IS ENGRAVED. Three exist for each child.',
      'Whether certificates 000038 and 000039 — already minted under '
        + '"Naheemah Ismail" and "Ashrof Akorede" — must be revoked and reissued.',
    ],
  },
];

const PUBLISHED = {
  IBT: 'docs/graduation-registers/2026-08-08-IBT-000035.json',
  IDD: 'docs/graduation-registers/2026-08-08-IDD-000042.json',
};

// The August rolls, read from the issuing script rather than retyped.
const SRC = readFileSync('scripts/issue-royal-college-batch.mjs', 'utf8');
const a = SRC.indexOf('const ROLLS = {};');
const b = SRC.indexOf('const ROLL = ROLLS[BATCH];');
// eslint-disable-next-line no-new-func
const ROLLS = new Function(`${SRC.slice(a, b)}\nreturn ROLLS;`)();

const august = (code) => (PUBLISHED[code]
  ? JSON.parse(readFileSync(PUBLISHED[code], 'utf8')).entries.map((e) => e.studentEn)
  : (ROLLS[code] || []).map((r) => r.en));

const parts = (n) => n.toLowerCase().replace(/[^a-z\s-]/g, '').split(/[\s-]+/).filter(Boolean);
const key = (n) => { const p = parts(n); return `${p[0]}|${p[p.length - 1]}`; };

const rows = [];
let regTotal = 0;
let augTotal = 0;

for (const [col, names] of Object.entries(REGISTRAR)) {
  const code = MAP[col];
  const aug = code ? august(code) : [];
  regTotal += names.length;
  const regKeys = new Map(names.map((n) => [key(n), n]));
  const augKeys = new Map(aug.map((n) => [key(n), n]));

  const onlyReg = names.filter((n) => !augKeys.has(key(n)));
  const onlyAug = aug.filter((n) => !regKeys.has(key(n)));
  const spelt = names.filter((n) => augKeys.has(key(n)) && augKeys.get(key(n)) !== n)
    .map((n) => [n, augKeys.get(key(n))]);

  rows.push({ col, code, names, aug, onlyReg, onlyAug, spelt });
}
for (const code of ['PRY', 'JSS', 'SS', 'QUR', 'IBT', 'IDD']) augTotal += august(code).length;

const line = (s = '') => console.log(s);
line();
line('  REGISTRAR’S NOTICE, 2 JULY 2026        vs        THE ROLLS OF 6–7 AUGUST 2026');
line('  ────────────────────────────────────────────────────────────────────────────');
line('  COLUMN                  → PROG   JUL   AUG   STATE');
for (const r of rows) {
  const same = !r.onlyReg.length && !r.onlyAug.length;
  const state = !r.code ? 'NO SUCH CERTIFICATE PROGRAMME'
    : same ? (r.spelt.length ? 'same people, spellings differ' : 'IDENTICAL')
      : 'DIFFERENT PEOPLE';
  line(`  ${r.col.padEnd(22)} → ${(r.code || '—').padEnd(5)} ${String(r.names.length).padStart(4)}`
    + `  ${String(r.code ? r.aug.length : 0).padStart(4)}   ${state}`);
}
line(`  ${''.padEnd(30)} ${String(regTotal).padStart(4)}  ${String(augTotal).padStart(4)}`);

line();
line('  ── ON THE REGISTRAR’S ROLL, ON NO CERTIFICATE ROLL ─────────────────────────');
line('     Each of these is a child who would receive NO certificate for that award.');
let missing = 0;
for (const r of rows) {
  for (const n of r.onlyReg) {
    missing += 1;
    line(`     ${r.col.padEnd(22)} ${n}`);
  }
}
if (!missing) line('     (none)');

line();
line('  ── ON A CERTIFICATE ROLL, ON NO REGISTRAR COLUMN ───────────────────────────');
line('     Each of these is an award the Registrar’s notice does not record.');
let extra = 0;
for (const r of rows) {
  for (const n of r.onlyAug) {
    extra += 1;
    const issued = PUBLISHED[r.code] ? '  ← ALREADY MINTED AND PUBLISHED' : '';
    line(`     ${r.col.padEnd(22)} ${n}${issued}`);
  }
}
if (!extra) line('     (none)');

line();
line('  ── SAME PERSON, DIFFERENT SPELLING ─────────────────────────────────────────');
line('     The certificate spelling is engraved and hashed into its number.');
let spelt = 0;
for (const r of rows) {
  for (const [j, g] of r.spelt) {
    spelt += 1;
    const issued = PUBLISHED[r.code] ? '  [MINTED]' : '';
    line(`     ${(r.code || '—').padEnd(5)} Registrar: ${j.padEnd(26)} Certificate: ${g}${issued}`);
  }
}
if (!spelt) line('     (none)');

line();
line('  ── POSSIBLY THE SAME CHILD UNDER TWO FAMILY NAMES ──────────────────────────');
line('     Given name matches; family name does not. Not resolved here — but if any');
line('     of these IS one child, a permanent record carries the wrong name.');
let maybe = 0;
for (const r of rows) {
  for (const n of r.onlyReg) {
    const g = parts(n)[0];
    for (const m of r.onlyAug) {
      if (parts(m)[0] !== g) continue;
      maybe += 1;
      const issued = PUBLISHED[r.code] ? '  ← ONE OF THESE IS ALREADY MINTED' : '';
      line(`     ${(r.code || '—').padEnd(5)} Registrar: ${n.padEnd(24)} Certificate: ${m}${issued}`);
    }
  }
}
if (!maybe) line('     (none)');

line();
// Two counts, because they answer two different questions and only one of them
// is the one the pipeline acts on. The LOOSE count merges any two entries
// sharing a first and last name-part; the STRICT count is distinct full names,
// which is what the certificate system mints Student IDs against. The gap
// between them is exactly the set of short-form ambiguities the pipeline
// refuses to resolve without a ruling.
const strict = (list) => new Set(list).size;
const loose = (list) => new Set(list.map(key)).size;
const regAll = Object.values(REGISTRAR).flat();
const augAll = ['PRY', 'JSS', 'SS', 'QUR', 'IBT', 'IDD'].flatMap(august);
line(`  Registrar’s notice: ${regTotal} awards · ${strict(regAll)} distinct names `
  + `· ${loose(regAll)} distinct children if short forms are merged.`);
line(`  Certificate rolls:  ${augTotal} awards · ${strict(augAll)} distinct names `
  + `· ${loose(augAll)} distinct children if short forms are merged.`);
line('  The certificate system mints one permanent Student ID per DISTINCT NAME.');
line();
line('  ── RULINGS GIVEN, AND WHAT EACH LEAVES OPEN ────────────────────────────────');
for (const r of RULINGS) {
  line(`     ${r.date}  ${r.on}`);
  line(`                 RULED: ${r.ruled}`);
  for (const o of r.open) line(`                 STILL OPEN: ${o}`);
}

line();
line('  THIS SCRIPT RESOLVES NOTHING. Both documents are official. The later one');
line('  carries the Founder’s written rulings and has already been minted for two');
line('  stages; the earlier one is the notice the parents were sent. Which governs');
line('  is a ruling for the Founder and the Registrar, and it must be made before');
line('  the four outstanding batches are signed.');
line();
