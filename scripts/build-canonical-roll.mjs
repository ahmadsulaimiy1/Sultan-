#!/usr/bin/env node
/**
 * The canonical roll of the Class of 2026.
 *
 *     node scripts/build-canonical-roll.mjs        # print
 *     node scripts/build-canonical-roll.mjs --write # write docs/graduation-registers/canonical-roll-2026.json
 *
 * TWO FOUNDER'S RULINGS OF 8 AUGUST 2026 BUILD THIS FILE, AND ONLY THESE TWO.
 *
 *   1 · "It should be in alignment with the registrar's one. She knows better."
 *       The Registrar's Notice of 2 July 2026 IS the roll. Seven categories,
 *       forty-five awards. Every other list is a working paper.
 *
 *   2 · "If you have seen a longer name for a specific student over the past
 *       time, then you should use the longer one, which means the three names."
 *       For each child, the fullest form of the name that this institution has
 *       ever written down is the one that prints and the one that is engraved.
 *
 * The second ruling is why this script exists rather than a hand-typed list.
 * A child's fullest name is scattered across six sources — the Registrar's
 * notice, two published registers, two issuing scripts and their withdrawal
 * lists. Retyping it would mean choosing by eye, once, and never being able to
 * show the working. Here every variant is collected, clustered, and the fullest
 * chosen by rule, and the whole derivation prints.
 *
 * NOTHING IS INVENTED. The chosen name is always one that appears verbatim in a
 * source; parts are never combined across variants to manufacture a fuller name
 * than any document actually carries.
 */
import { readFileSync, writeFileSync } from 'node:fs';

// ── SOURCE 1 · The Registrar's Notice, 2 July 2026 — THE ROLL ───────────────
// Verbatim, including her column headings and her spellings.
const REGISTRAR = {
  TMH: { col: 'Islamiyyah (Tamyidi)', names: ['Abdulbasit Adedokun', 'Muhammad fatih'] },
  IBT: { col: 'Ibtidaiyah', names: ['Abdulateef Adedokun', 'Aisha Anofi', 'Ameerah Abdulhafeez', 'Ashrof Ojewumi', 'Fareedah Aliu', 'Hameedah Ojewumi', 'Imran Adegoke', 'Muhammad Ismail', 'Naheemah Ismaeel'] },
  IDD: { col: 'Idadiyah', names: ['Abdullah Anofi', 'Balogun Yaseer', 'Baqi Anofi', 'Basit Jabarr', 'Thoirah Makinde'] },
  QUR: { col: 'Quran college', names: ['Aisha Anofi', 'Baqi Anofi', 'Sofiah Anofi', 'Zainab Anofi'] },
  PRY: { col: 'Basic 5', names: ['Aisha Lawal', 'Al-ameen Okoh', 'Ashraf Ojewumi', 'Daud Aliu', 'Imran Adegoke', 'Naheemah Ismail'] },
  JSS: { col: 'JSS 3', names: ['Abdulrahman Abdullah', 'Aisha Anofi', 'Allison Ganiyah', 'Ameerah Abdulhafeez', 'Ameerah Durodola', 'Anisa Jokumba', 'Baqi Anofi', 'Fareedah Aliu', 'Fateemah Ibrahim', 'Fawaz Owolabi', 'Hameedah Ojewumi', 'Jubril Lawal', 'Muhammad Ismail', 'Radiah Apatira', "Sa'ad Sanusi"] },
  SS: { col: 'SSS 3', names: ['Abdulbasit Jabarr', 'Aisha Shode', 'Mazeed Hassan-Murtala', 'Thoirah Makinde'] },
};

// ── SOURCES 2–6 · every other name this institution has written down ────────
// Working papers, used ONLY as a pool of fuller spellings. None of them adds a
// child to the roll or removes one: that is the Registrar's alone.
const pool = [];
const add = (n, where) => { if (n && n.trim()) pool.push({ n: n.trim(), where }); };

for (const [code, f] of Object.entries({
  IBT: 'docs/graduation-registers/2026-08-08-IBT-000035.json',
  IDD: 'docs/graduation-registers/2026-08-08-IDD-000042.json',
})) {
  for (const e of JSON.parse(readFileSync(f, 'utf8')).entries) {
    add(e.studentEn, `published ${code} register`);
  }
}

// The Royal College working papers as they stood on 8 August 2026 — the four
// hand-written rolls the issuing script then carried, and the carry-over
// references beside them. They were read out of that script's source until the
// rolls were rebuilt onto the plan and the lists ceased to exist there.
//
// They are TRANSCRIBED here rather than dropped, because they are the only
// place several children's fullest names were ever written down: "Fatimah
// Desire Ibrahim", "Anisa Opeyemi Jokomba", "Zaynab Zakariya Anofi", "Aisha
// Omoshalewa Anofi", "Naheemah Ismai Seriki" appear in no register and on no
// Registrar's list. Losing them would silently shorten five children's names
// on their own certificates.
//
// This list is CLOSED. It is a record of what those papers said on that day,
// not a roll: it adds no child and removes none, exactly as every other source
// below Source 1. Nothing is ever added to it — a new name is a new document,
// and a new document gets its own source.
const RC_WORKING_PAPERS_2026_08_08 = [
  ['Hameedah Adebimpe Ojewumi', 'JSS issuing roll'],
  ['Muhammad Ismail Seriki', 'JSS issuing roll'],
  ['Fatimah Desire Ibrahim', 'JSS issuing roll'],
  ['Aisha Anofi', 'JSS issuing roll'],
  ['Baqi Anofi', 'JSS issuing roll'],
  ['Baqi Olamiposi Anofi', 'JSS carry-over reference'],
  ["Sa'ad Sanusi", 'JSS issuing roll'],
  ['Fawaz Owolabi', 'JSS issuing roll'],
  ['Radiah Apatira', 'JSS issuing roll'],
  ['Faridah Aliu', 'JSS issuing roll'],
  ['Faridah Ayomide Aliu', 'JSS carry-over reference'],
  ['Anisa Opeyemi Jokomba', 'JSS issuing roll'],
  ['Ameerah Durodola', 'JSS issuing roll'],
  ['Abdulrahman Abdullah', 'JSS issuing roll'],
  ['Ameerah Abdulhafeez', 'JSS issuing roll'],
  ['Thoirah Makinde', 'SS issuing roll'],
  ['Abdulbasit Amobi Jabarr', 'SS issuing roll'],
  ['Aisha Shode', 'SS issuing roll'],
  ['Mazeed Hassan-Murtala', 'SS issuing roll'],
  ['Naheemah Ismai Seriki', 'PRY issuing roll'],
  ['Naheemah Ismail', 'PRY carry-over reference'],
  ['Ashraf Korede Ojewumi', 'PRY issuing roll'],
  ['Ashrof Akorede', 'PRY carry-over reference'],
  ['Al-ameen Okoh', 'PRY issuing roll'],
  ['Al-ameen Abidemi Jokomba', 'PRY issuing roll'],
  ['Aisha Lawal', 'PRY issuing roll'],
  ['Imran Iremide Adegoke', 'PRY issuing roll'],
  ['Daud Aliu', 'PRY issuing roll'],
  ['Zaynab Zakariya Anofi', 'QUR issuing roll'],
  ['Baqi Olamiposi Anofi', 'QUR issuing roll'],
  ['Aisha Omoshalewa Anofi', 'QUR issuing roll'],
];
for (const [n, where] of RC_WORKING_PAPERS_2026_08_08) add(n, where);

// The stage script's rolls AND its withdrawal lists. The withdrawal lists are
// the richest source of fuller spellings in the repository: they exist because
// a name was once on the wrong stage, and they preserve the form it was written
// in at the time.
const stSrc = readFileSync('scripts/issue-certificate-batch.mjs', 'utf8');
for (const m of stSrc.matchAll(/\{\s*en:\s*'([^']+)'/g)) add(m[1], 'stage issuing roll');
for (const m of stSrc.matchAll(/withdrawnEn:\s*\[([^\]]*)\]/g)) {
  for (const q of m[1].matchAll(/'([^']+)'/g)) add(q[1], 'stage withdrawal list');
}

// ── Clustering ──────────────────────────────────────────────────────────────
// Two written forms are the same child when their GIVEN name matches and they
// share at least one further name-part — or when the Founder has ruled them
// one. Anything looser would merge two children who share a common given name,
// which on a certificate is unforgivable; anything tighter would miss exactly
// the cases he ruled on.
// Groups of written forms that are one child. Each is here for a stated
// reason; none is a guess. The rule above cannot catch these because the GIVEN
// name itself is spelled differently between documents, and loosening the rule
// to match near-spellings would risk merging two real children.
const SAME_CHILD = [
  // Ruled by the Founder, 8 August 2026: "They are one."
  { why: 'Founder’s ruling, 8 Aug 2026',
    forms: ['Ashrof Akorede', 'Ashrof Ojewumi', 'Ashraf Ojewumi', 'Ashraf Korede Ojewumi'] },
  { why: 'Founder’s ruling, 8 Aug 2026',
    forms: ['Naheemah Ismail', 'Naheemah Ismaeel', 'Naheemah Ismai Seriki', 'Naheemah Ismail Seriki'] },
  // The Founder corrected this name twice and marked the last form LOCKED.
  { why: 'Founder marked “Zaynab Zakariya Anofi” LOCKED before signing',
    forms: ['Zainab Anofi', 'Zaynab Anofi', 'Zaynab Zakariya Anofi'] },
  // Same family name, same programme, one letter apart in the given name.
  { why: 'Same family name and stage; Fareedah/Faridah is one spelling apart',
    forms: ['Fareedah Aliu', 'Faridah Aliu', 'Faridah Ayomide Aliu'] },
  { why: 'Same family name and stage; Fateemah/Fatimah is one spelling apart',
    forms: ['Fateemah Ibrahim', 'Fatimah Desire Ibrahim'] },
  { why: 'Same given name and stage; Jokumba/Jokomba is one letter apart',
    forms: ['Anisa Jokumba', 'Anisa Opeyemi Jokomba'] },
  // Ruled by the Founder, 8 August 2026: "They are one." Basit is the short
  // form of Abdulbasit, and he holds two awards — I'dādiyyah and Senior
  // Secondary. The rule could not merge these because the given names differ
  // as strings, and it was right not to guess.
  { why: 'Founder’s ruling, 8 Aug 2026 — Basit is Abdulbasit, one boy, two awards',
    forms: ['Basit Jabarr', 'Abdulbasit Jabarr', 'Abdulbasit Amobi Jabarr'] },
];

// Names the Founder has GIVEN, as distinct from names he has chosen between.
// The fullest-form rule can only pick from forms this institution has written
// down; where he supplies the form itself, it governs outright. Recorded here
// rather than edited into the Registrar's transcription, so her document stays
// verbatim and his correction stays visible beside it.
const RULED_FORM = {
  // 8 August 2026: "Yaseer Balogun is the name." The Registrar's notice has the
  // family name standing first; every other name on the roll is
  // given-name-first, and he confirmed the order.
  'Balogun Yaseer': { to: 'Yaseer Balogun',
    why: 'Founder’s ruling, 8 Aug 2026 — name order corrected to given-name-first' },
  // 15 August 2026: "The correct Primary record is Naheemah Ismail. Treat this
  // as the authoritative institutional name. Discard the conflicting 'Naheemah
  // Ismai Seriki' variant unless you find conclusive evidence that it refers to
  // a different student."
  //
  // The evidence was looked for and is not there: every one of the four forms
  // this institution has written down for her — Naheemah Ismaeel, Naheemah
  // Ismail, Naheemah Ismai Seriki, Naheemah Ismail Seriki — clusters to one
  // child, and no source anywhere describes a second. So the ruling is applied,
  // and it is applied to BOTH the forms the Registrar wrote, not only the
  // Primary one, because he ruled on the institutional name and not on a single
  // sheet.
  //
  // It has to be a RULED_FORM rather than a fuller-name choice, because the
  // fullest-form rule of 8 August would otherwise reach past it: it had picked
  // 'Naheemah Ismail Seriki' off the stage withdrawal list — the same working
  // paper that also spells her 'Naheemah Ismai Seriki', the very variant this
  // ruling discards. A form taken from a document whose spelling of the name is
  // now discarded cannot outrank the form the Founder has given.
  //
  // CONSEQUENCE, stated because it changes a certificate that already exists:
  // her minted Ibtidā'iyyah sheet SHRS-CERT-IBT-2026-000038-2944F is engraved
  // 'Naheemah Ismail'. Under the 8 August rule the plan had it REISSUED to the
  // fuller form; under this ruling the engraved name is already the right one,
  // so it is KEPT and the reissue disappears. A certificate in a child's hands
  // stays in her hands.
  'Naheemah Ismaeel': { to: 'Naheemah Ismail',
    why: 'Founder’s ruling, 15 Aug 2026 — the authoritative institutional name' },
  'Naheemah Ismail': { to: 'Naheemah Ismail',
    why: 'Founder’s ruling, 15 Aug 2026 — the authoritative institutional name' },
};
const RULED_ONE = SAME_CHILD.map((g) => g.forms);

// ── Names the Founder has REMOVED from a category ───────────────────────────
// Adding or removing a child is the Registrar's act, with one exception: the
// Founder may rule on it directly, and on 8 August 2026 he did.
//
//     "Only Abdul Basit Adedokun is now in Tamheediyyah."
//
// Her notice lists two under Islamiyyah (Tamyidi). One stands.
//
// The removal is recorded here rather than edited out of her transcription
// above, on the same principle as every other ruling in this file: her document
// stays verbatim, and his correction stays visible beside it. A future reader
// can see both what she wrote and what he decided.
//
// WHAT THIS DOES NOT DO — and the distinction matters to a child. Removing a
// name from a category is not the same as placing it somewhere else. The
// ruling says where Muhammad Fatih is NOT; it does not say where he is. He is
// therefore carried below as UNPLACED, and holds a place on no roll and no
// certificate until that is ruled. He is not silently deleted, and he is not
// silently moved: either would be this pipeline deciding a child's award.
const WITHDRAWN_FROM = {
  QUR: [{
    name: 'Sofiah Anofi',
    why: 'Founder’s ruling, 15 Aug 2026 — "names that are existing but with no '
      + 'verified at all certificate like Anofi Sofiah: there should be no '
      + 'certification for them. They should be omitted."',
    standing: 'OMITTED FOR WANT OF A VERIFIED RECORD. She is on the Registrar’s '
      + 'Qur’an College list and nothing here disputes that she studied. What '
      + 'the institution has never recorded is WHAT SHE WOULD BE CERTIFIED FOR: '
      + 'the Qur’an College confers two distinct awards — complete memorisation, '
      + 'and ten juz’ — and no source states which is hers. Her Arabic name has '
      + 'never been written down either, and this pipeline does not transliterate '
      + 'a child’s name. A certificate would therefore have had to invent both '
      + 'the award and the name on it. The ruling is that no certificate is '
      + 'issued rather than an invented one. Deleting this entry restores her to '
      + 'the roll the moment the Registrar supplies the award and the Arabic '
      + 'form; nothing else has to change, and no number she would have held has '
      + 'been spent.',
    ruledOn: '2026-08-15',
  }],
  TMH: [{
    name: 'Muhammad fatih',
    why: 'Founder’s ruling, 8 Aug 2026 — "Only Abdul Basit Adedokun is now in '
      + 'Tamheediyyah." Omitted outright by the Founder’s ruling of 15 Aug 2026.',
    standing: 'OMITTED. The ruling of 8 August took him off the Tamhīdiyyah '
      + 'roll without saying which stage he is in, so he was carried here as '
      + 'UNPLACED — an open question the preflight raised on every run, waiting '
      + 'for the Registrar or the Founder to place him. On 15 August 2026 the '
      + 'Founder closed it: omit. He is on no roll and receives no certificate '
      + 'in this recovery. That is now a decision on the record, not a gap in '
      + 'it, and the preflight reports it as settled rather than owed. Nothing '
      + 'here says he did not study, and no certificate number has been spent '
      + 'on him: deleting this entry puts him back on the Tamhīdiyyah roll the '
      + 'moment the institution places him.',
    // Distinguishes a closed decision from an open question. The preflight
    // lists these separately, because "we have decided" and "we are waiting"
    // are not the same state and a reader has to be able to tell them apart.
    ruledOn: '2026-08-15',
  }],
};

const norm = (s) => s.toLowerCase().replace(/[^a-z\s-]/g, '').trim();
// Split on WHITESPACE ONLY. A hyphen binds a name, it does not divide one:
// "Al-ameen" is one given name and "Hassan-Murtala" is one family name. An
// earlier cut of this script split on hyphens too, which made the given name
// of both "Al-ameen Okoh" and "Al-ameen Abidemi Jokomba" the token "al" and
// merged two different boys into one child. Two boys, one certificate.
const parts = (s) => norm(s).split(/\s+/).filter(Boolean);
const given = (s) => parts(s)[0];
const rest = (s) => new Set(parts(s).slice(1));

const ruledKey = (n) => {
  const i = RULED_ONE.findIndex((g) => g.includes(n));
  return i < 0 ? null : `ruled:${i}`;
};

function sameChild(a, b) {
  const ra = ruledKey(a); const rb = ruledKey(b);
  if (ra && rb) return ra === rb;
  if (ra || rb) return false;
  if (given(a) !== given(b)) return false;
  const A = rest(a); const B = rest(b);
  for (const x of A) if (B.has(x)) return true;
  return false;
}

// ── For each award on the Registrar's roll, choose the fullest seen form ────
const CODES = ['QUR', 'TMH', 'IBT', 'IDD', 'PRY', 'JSS', 'SS'];
const roll = {};
const derivations = [];

const unplaced = [];
for (const code of CODES) {
  const removed = new Set((WITHDRAWN_FROM[code] || []).map((w) => w.name));
  for (const w of WITHDRAWN_FROM[code] || []) {
    if (!REGISTRAR[code].names.includes(w.name)) {
      console.error(`  "${w.name}" is withdrawn from ${code} but is not on the `
        + 'Registrar’s list for it. A withdrawal that removes nothing is a '
        + 'ruling that has silently stopped applying.');
      process.exit(1);
    }
    unplaced.push({ code, ...w });
  }
  roll[code] = REGISTRAR[code].names.filter((n) => !removed.has(n)).map((asWritten) => {
    const variants = pool.filter((c) => sameChild(asWritten, c.n));
    // The Registrar's own form is always a candidate. Letter case is normalised
    // to the house form — "Muhammad fatih" → "Muhammad Fatih" — because a
    // capital is not a spelling.
    const cased = asWritten.replace(/(^|\s)([a-z])/g,
      (m, p1, p2) => p1 + p2.toUpperCase());
    // A form the Founder has given outright overrides the search entirely.
    const ruled = RULED_FORM[asWritten];
    if (ruled) {
      derivations.push({ code, asWritten, chosen: ruled.to, from: ruled.why,
        seen: [cased] });
      return ruled.to;
    }
    const cands = [{ n: cased, where: "Registrar's notice" }, ...variants];
    // Fullest = most name-parts; ties broken by the longer string, then by
    // preferring a source that is a permanent record.
    const rank = (c) => [parts(c.n).length, c.n.length,
      /register/.test(c.where) ? 1 : 0];
    const best = cands.slice().sort((a, b) => {
      const [x, y] = [rank(a), rank(b)];
      return (y[0] - x[0]) || (y[1] - x[1]) || (y[2] - x[2]);
    })[0];
    if (best.n !== cased || variants.length) {
      derivations.push({
        code, asWritten, chosen: best.n, from: best.where,
        seen: [...new Set([cased, ...variants.map((v) => v.n)])],
      });
    }
    return best.n;
  });
}

// A child removed from every category holds no award anywhere. That is a real
// outcome, not a bookkeeping detail, and it is stated rather than left for a
// reader to notice by counting.
for (const u of unplaced) {
  const stillOn = CODES.filter((c) => roll[c].some((n) => sameChild(u.name, n)));
  u.alsoOn = stillOn;
}

// ── Report ──────────────────────────────────────────────────────────────────
const L = (s = '') => console.log(s);
L();
L('  THE CANONICAL ROLL OF THE CLASS OF 2026');
L('  Registrar’s Notice of 2 July 2026, with every name at its fullest seen form');
L('  ─────────────────────────────────────────────────────────────────────────');
let total = 0;
for (const code of CODES) {
  L(`\n  ${code} · ${REGISTRAR[code].col}  (${roll[code].length})`);
  roll[code].forEach((n, i) => L(`      ${String(i + 1).padStart(2)}. ${n}`));
  total += roll[code].length;
}
L(`\n  ${total} awards`);

const people = [];
for (const code of CODES) {
  for (const n of roll[code]) {
    const g = people.find((p) => p.some((q) => sameChild(q, n)));
    if (g) { if (!g.includes(n)) g.push(n); } else people.push([n]);
  }
}
L(`  ${people.length} distinct children`);
const multi = people.filter((g) => {
  let c = 0; for (const code of CODES) for (const n of roll[code]) if (g.includes(n)) c += 1;
  return c > 1;
});
L(`  ${multi.length} holding more than one award`);

L('\n  ── ON A WORKING PAPER, NOT ON THE REGISTRAR’S ROLL ──────────────────────');
L('     Dropped. The Registrar governs; a working paper cannot add a child.');
const onRoll = CODES.flatMap((c) => roll[c]);
const dropped = [...new Set(pool.map((c) => c.n))]
  .filter((n) => parts(n).length > 1)
  .filter((n) => !onRoll.some((r) => sameChild(r, n)));
if (!dropped.length) L('     (none)');
for (const n of dropped.sort()) {
  const wh = [...new Set(pool.filter((c) => c.n === n).map((c) => c.where))];
  L(`     ${n.padEnd(28)} ${wh.join(', ')}`);
}

L('\n  ── WHERE A FULLER NAME WAS FOUND AND ADOPTED ─────────────────────────────');
const adopted = derivations.filter((d) => d.chosen !== d.asWritten
  && d.chosen !== d.asWritten.replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase()));
if (!adopted.length) L('     (none)');
for (const d of adopted) {
  L(`     ${d.code}  Registrar: ${d.asWritten.padEnd(24)} → ${d.chosen}`);
  L(`           from ${d.from}; also seen as ${d.seen.filter((s) => s !== d.chosen).join(' · ')}`);
}

if (process.argv.includes('--write')) {
  const out = {
    title: 'Canonical roll of the Class of 2026',
    authority: "The Registrar's Notice of the 2026 Combined Graduation Ceremony, "
      + '2 July 2026. Founder’s ruling of 8 August 2026: '
      + '"It should be in alignment with the registrar’s one. She knows better."',
    nameRule: 'Founder’s ruling of 8 August 2026: where a fuller form of a '
      + 'child’s name has ever been written down by this institution, the '
      + 'fuller form is the one that prints and is engraved. No name is '
      + 'assembled from parts of two variants.',
    generatedBy: 'scripts/build-canonical-roll.mjs',
    totals: { awards: total, children: people.length, multipleAwards: multi.length },
    categories: CODES.map((c) => ({
      code: c, registrarColumn: REGISTRAR[c].col, count: roll[c].length, names: roll[c],
    })),
    fullerNamesAdopted: adopted,
    withdrawnByRuling: unplaced,
  };
  writeFileSync('docs/graduation-registers/canonical-roll-2026.json',
    `${JSON.stringify(out, null, 2)}\n`);
  L('\n  → docs/graduation-registers/canonical-roll-2026.json');
}
L();
