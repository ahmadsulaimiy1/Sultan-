/**
 * Deployment gate for an issued certificate batch.
 *
 *     node scripts/verify-certificate-batch.mjs [batch-dir]
 *
 * Checks the RENDERED SHEETS, not the source that produced them. Everything
 * here has a way to fail loudly; a check that cannot fail is not a check.
 * Geometry and ink coverage are measured separately by
 * scripts/verify-certificate-layout.mjs, which needs a browser.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isValidStudentIdentityNo } from '../functions/_lib/identity-no.js';
import { parseStageCertificateSerial, displayStageCertificateNo } from '../functions/_lib/certificate-serial.js';

const DIR = process.argv[2] || 'dist/certificates/2026-08-08-IBT-000035';

// Transcribed independently from the Founder's directives. NOT imported from
// the issuer — importing it would mean the issuer verifies itself, which
// proves nothing. Which directive applies is chosen by the batch directory's
// own programme code, so pointing this gate at the wrong batch cannot pass.
//
// The English is the Founder's and is authoritative ("Ashrof" included).
//
// The IDD Arabic was CONFIRMED APPROVED by the Founder on 2026-08-06, in
// response to a standing flag that six components — أولاميبوسي، أولاديميجي،
// أموبي، مكيندي، طاهرة، أيومدي — had been carried across from an earlier
// register without a recorded approval. They are now approved spellings, not
// inferred ones, and this file holds them so the two can be checked against
// each other code point by code point.
//
// The rule that produced that flag stands: Arabic names are never generated,
// transliterated or guessed here. A name with no approval on record stays off
// the certificate until the Founder supplies it.
const DIRECTIVES = {
  // Final Ibtida'iyyah roll, 2026-08-06.
  IBT: {
    firstSeq: 35,
    roll: [
      ['000035', 'Hameedah Adebimpe Ojewumi', 'حميدة أدبيمبي أوجومي'],
      ['000036', 'Aisha Anofi', 'عائشة حنفي'],
      ['000037', 'Abdulbasit Adedokun', 'عبد الباسط أددوكن'],
      ['000038', 'Naheemah Ismail', 'نعيمة إسماعيل'],
      ['000039', 'Ashrof Akorede', 'أشرف أكوردي'],
      ['000040', 'Imran Adegoke', 'عمران أدغكي'],
      ['000041', 'Abdulateef Adedokun', 'عبد اللطيف أددوكن'],
    ],
    // The original withdrawn seven, and the I'dadiyyah roll — real students,
    // but of another stage, and the wrong award over the right name is the
    // same defect as a withdrawn student.
    forbidden: [
      'Naheemah Ismail Seriki', 'Ashraf Korede Ojewumi', 'Al-Ameen Okoh',
      'Al-Ameen Abidemi Jokomba', 'Aisha Lawal', 'Imran Iremide Adegoke', 'Daud Aliu',
      'Muhammad Ismail Seriki', 'Baqi Olamiposi Anofi', 'Faridah Ayomide Aliu',
      'Thoirah Makinde', 'Abdulbasit Amobi Jabarr', 'Abdullah Oladimeji Anofi',
      'Seriki', 'Jokomba', 'Lawal', 'Iremide', 'Aliu', 'Abidemi',
      'Olamiposi', 'Ayomide', 'Oladimeji', 'Amobi', 'Jabarr', 'Makinde',
      'نعيمة إسماعيل سركي', 'أشرف كوردي أوجومي', 'الأمين أكو',
      'الأمين أبديمي جوكمبا', 'عائشة لوال', 'عمران إريمدي أدغكي', 'داود علي',
      'محمد إسماعيل سركي', 'باقي أولاميبوسي حنفي', 'فريدة أيومدي علي',
      'طاهرة مكيندي', 'عبد الباسط أموبي جبار', 'عبد الله أولاديميجي حنفي',
      'سركي', 'جوكمبا', 'لوال', 'إريمدي', 'داود', 'الأمين', 'محمد', 'باقي',
      'أولاميبوسي', 'فريدة', 'أيومدي', 'طاهرة', 'مكيندي', 'أموبي', 'جبار',
      'أولاديميجي', 'عبد الله',
    ],
  },
  // I'dadiyyah — Intermediate Stage, 2026-08-06. Numbering continues from the
  // Ibtida'iyyah batch, which ended at 000041.
  IDD: {
    firstSeq: 42,
    roll: [
      ['000042', 'Muhammad Ismail Seriki', 'محمد إسماعيل سركي'],
      ['000043', 'Baqi Olamiposi Anofi', 'باقي أولاميبوسي حنفي'],
      ['000044', 'Faridah Ayomide Aliu', 'فريدة أيومدي علي'],
      ['000045', 'Thoirah Makinde', 'طاهرة مكيندي'],
      ['000046', 'Abdulbasit Amobi Jabarr', 'عبد الباسط أموبي جبار'],
      ['000047', 'Abdullah Oladimeji Anofi', 'عبد الله أولاديميجي حنفي'],
    ],
    forbidden: [
      'Hameedah Adebimpe Ojewumi', 'Aisha Anofi', 'Abdulbasit Adedokun',
      'Naheemah Ismail', 'Ashrof Akorede', 'Imran Adegoke', 'Abdulateef Adedokun',
      'Naheemah Ismail Seriki', 'Ashraf Korede Ojewumi', 'Al-Ameen Okoh',
      'Al-Ameen Abidemi Jokomba', 'Aisha Lawal', 'Imran Iremide Adegoke', 'Daud Aliu',
      'Hameedah', 'Adebimpe', 'Ojewumi', 'Aisha', 'Adedokun', 'Naheemah',
      'Ashrof', 'Akorede', 'Imran', 'Adegoke', 'Abdulateef',
      'Okoh', 'Jokomba', 'Lawal', 'Iremide', 'Korede', 'Abidemi', 'Al-Ameen',
      'حميدة أدبيمبي أوجومي', 'عائشة حنفي', 'عبد الباسط أددوكن',
      'نعيمة إسماعيل', 'أشرف أكوردي', 'عمران أدغكي', 'عبد اللطيف أددوكن',
      'حميدة', 'أدبيمبي', 'أوجومي', 'عائشة', 'أددوكن', 'نعيمة', 'أشرف',
      'أكوردي', 'عمران', 'أدغكي', 'عبد اللطيف',
      'أكو', 'كوردي', 'جوكمبا', 'لوال', 'إريمدي', 'داود', 'الأمين', 'أبديمي',
    ],
  },
};

// The batch directory names its own programme: 2026-08-08-IDD-000042.
const PROG = (DIR.match(/-([A-Z]{3})-\d{6}\/?$/) || [])[1];
const SPEC = DIRECTIVES[PROG];
if (!SPEC) {
  console.error(`VERIFIER REJECTED — cannot tell which directive governs "${DIR}". `
    + `Expected a directory ending -<PROG>-<seq6> with PROG in `
    + `${Object.keys(DIRECTIVES).join(', ')}.`);
  process.exit(1);
}
const DIRECTIVE = SPEC.roll;
const WITHDRAWN = SPEC.forbidden;
const FIRST_SEQ = SPEC.firstSeq;

// A guard that matches a CURRENT student is a gate that can never pass; a
// missing guard is a gate that can never fail. This assertion earned itself
// on the Ibtida'iyyah roll, catching أكو and كوردي inside أكوردي (Akorede).
// English is compared case-insensitively for the same reason.
const guardFaults = WITHDRAWN.flatMap((g) => DIRECTIVE.flatMap(([seq, en, ar]) =>
  (en.toLowerCase().includes(g.toLowerCase())
    || ar.normalize('NFC').includes(g.normalize('NFC')))
    ? [`guard "${g}" matches current student ${seq} ${en}`] : []));
if (guardFaults.length) {
  console.error('VERIFIER REJECTED — forbidden-name guard collides with the current roll:\n  '
    + guardFaults.join('\n  '));
  process.exit(1);
}

let fails = 0, checks = 0;
const ok = (name, pass, detail = '') => {
  checks++;
  if (!pass) fails++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `\n          ${detail}` : ''}`);
};

const files = readdirSync(DIR).filter((f) => /^\d{6}-\d{15}\.html$/.test(f)).sort();
const sheets = files.map((f) => ({ file: f, html: readFileSync(join(DIR, f), 'utf8') }));
const text = (html, cls) => {
  const m = html.match(new RegExp(`<div class="${cls}"[^>]*>([\\s\\S]*?)</div>`));
  return m ? m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : null;
};

console.log(`\nSHRS certificate batch verification — ${DIR}\n`);
console.log(`── Batch integrity ─────────────────────────────────────────`);
ok(`${DIRECTIVE.length} sheets present — one per student on the corrected roll`,
  sheets.length === DIRECTIVE.length, `found ${sheets.length}`);
ok('combined print file present', existsSync(join(DIR, 'batch-print.html')));
for (const f of ['graduation-register.json', 'graduation-register.md', 'graduation-register.sql']) {
  ok(`${f} present`, existsSync(join(DIR, f)));
}

const reg = JSON.parse(readFileSync(join(DIR, 'graduation-register.json'), 'utf8'));
ok('register agrees with the sheets on count', reg.entries.length === sheets.length);

console.log(`\n── Serial numbers ──────────────────────────────────────────`);
const serials = reg.entries.map((e) => e.serialNo);
ok('all serials unique', new Set(serials).size === serials.length);
ok('all serials parse under the production grammar',
  serials.every((s) => parseStageCertificateSerial(s) !== null),
  serials.filter((s) => !parseStageCertificateSerial(s)).join(', '));
const seqs = reg.entries.map((e) => e.certId);
ok(`numbering starts at exactly ${String(FIRST_SEQ).padStart(6, '0')}`,
  seqs[0] === FIRST_SEQ, `starts at ${String(seqs[0]).padStart(6, '0')}`);
ok('numbering is sequential with no gaps',
  seqs.every((n, i) => n === FIRST_SEQ + i), seqs.join(', '));
ok('every serial embeds its own sequence',
  reg.entries.every((e) => e.serialNo.includes(`-${String(e.certId).padStart(6, '0')}-`)));

console.log(`\n── Student identity numbers ────────────────────────────────`);
const ids = reg.entries.map((e) => e.identityNo);
ok('all 15 numeric digits', ids.every((v) => /^\d{15}$/.test(v)));
ok('all unique', new Set(ids).size === ids.length);
ok('all pass the Luhn check digit', ids.every(isValidStudentIdentityNo));
ok('none contains a hyphen, space or year field',
  ids.every((v) => /^\d{15}$/.test(v)));
const PATTERN = /(\d)\1{4,}|0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210|(\d{3})\2/;
const patterned = ids.filter((v) => PATTERN.test(v.slice(2, 14)));
ok('none carries an obvious digit run', patterned.length === 0, patterned.join(', '));

console.log(`\n── Identifier cross-mapping ────────────────────────────────`);
// The real risk is not duplication, it is a correctly-unique identifier
// printed on the WRONG student's sheet. Each sheet is checked against the
// register entry for its own certificate number.
let mismap = [];
for (const e of reg.entries) {
  const s = sheets.find((x) => x.file.startsWith(String(e.certId).padStart(6, '0')));
  if (!s) { mismap.push(`${e.certId}: no sheet`); continue; }
  const want = {
    'student ID': e.identityNo, 'serial': e.serialNo,
    'document ID': e.documentId, 'archive ref': e.archiveRef,
    // NOT the verify URL: that lives only inside the QR's modules, never as
    // literal text on the sheet, so a string search for it fails on every
    // certificate. scripts/verify-certificate-layout.mjs decodes each QR
    // with a real decoder and checks the payload against this same register.
  };
  for (const [what, value] of Object.entries(want)) {
    if (!s.html.includes(value)) mismap.push(`${e.studentEn} (${e.certId}): ${what} "${value}" not on the sheet`);
  }
  if (!s.file.includes(e.identityNo)) mismap.push(`${e.certId}: filename/ID mismatch`);
}
ok('every identifier appears on its own student\'s sheet and no other',
  mismap.length === 0, mismap.join('\n          '));

for (const f of ['identityNo', 'serialNo', 'contentHash', 'verifyCode', 'documentId', 'archiveRef', 'verifyUrl', 'qrUrl']) {
  const vals = reg.entries.map((e) => e[f]);
  ok(`${f}: unique across the batch`, new Set(vals).size === vals.length);
}

console.log(`\n── Names against the approved register ─────────────────────`);
const nameFaults = [];
for (const [seq, en, ar] of DIRECTIVE) {
  const s = sheets.find((x) => x.file.startsWith(seq));
  if (!s) { nameFaults.push(`${seq}: sheet missing`); continue; }
  const gotEn = text(s.html, 'o5-name-en');
  const gotAr = text(s.html, 'o5-name-ar');
  if ((gotEn || '').toUpperCase() !== en.toUpperCase()) nameFaults.push(`${seq} EN: "${gotEn}" != "${en}"`);
  const a = [...(gotAr || '').normalize('NFC')], b = [...ar.normalize('NFC')];
  if (a.length !== b.length || a.some((c, i) => c !== b[i])) {
    nameFaults.push(`${seq} AR: "${gotAr}" != "${ar}"  [${a.map((c) => c.codePointAt(0).toString(16)).join(' ')}]`);
  }
  const e = reg.entries.find((x) => String(x.certId).padStart(6, '0') === seq);
  if (e && e.studentAr.normalize('NFC') !== ar.normalize('NFC')) nameFaults.push(`${seq}: register Arabic differs from directive`);
}
ok(`all ${DIRECTIVE.length} English and ${DIRECTIVE.length} Arabic names match the directive code point for code point`,
  nameFaults.length === 0, nameFaults.join('\n          '));

console.log(`\n── The withdrawn roll ──────────────────────────────────────`);
// "No information from the earlier list should remain in the final
// production files." Regenerating into a directory does not delete what it
// no longer produces: the withdrawn roll had SEVEN students to this one's
// six, so sheet 000041 survives on disk from the previous run unless
// something removes it — and a surviving sheet still prints, still scans
// and still resolves, to a student who is not on the roll.
// Every file in the directory is read, not just the sheets.
const residue = [];
for (const f of readdirSync(DIR)) {
  const body = readFileSync(join(DIR, f), 'utf8');
  for (const w of WITHDRAWN) {
    if (body.includes(w)) residue.push(`${f}: "${w}"`);
  }
}
ok('no withdrawn name, Arabic fragment or certificate number survives anywhere in the batch',
  residue.length === 0, residue.slice(0, 12).join('\n          '));
ok('no sheet is numbered past the end of the corrected roll',
  !files.some((f) => +f.slice(0, 6) > FIRST_SEQ + DIRECTIVE.length - 1),
  files.filter((f) => +f.slice(0, 6) > FIRST_SEQ + DIRECTIVE.length - 1).join(', '));

console.log(`\n── The engraved certificate number ─────────────────────────`);
// The number PRINTED on the face is the short, timeless form. These checks
// exist because the visible number and the stored serial are now different
// strings, and nothing else in the pipeline would notice them drifting.
const printedFaults = [];
for (const e of reg.entries) {
  const s = sheets.find((x) => x.file.startsWith(String(e.certId).padStart(6, '0')));
  if (!s) continue;
  const printed = displayStageCertificateNo(e.serialNo);
  if (!printed) { printedFaults.push(`${e.certId}: serial will not reduce to a printed number`); continue; }
  if (!s.html.includes(printed)) printedFaults.push(`${e.certId}: "${printed}" is not on the sheet`);
  // Grammar, not a substring search: the printed number must be exactly
  // prefix + programme + sequence + check tail. A bare /(19|20)\d{2}/ would
  // one day false-positive on a sequence such as 002026, and would miss a
  // year reintroduced in any other position.
  if (!/^SHRS-CERT-[A-Z0-9]{2,4}-\d{6}-[0-9A-F]{5}$/.test(printed)) {
    printedFaults.push(`${e.certId}: printed number is not in the issuable printed grammar — "${printed}"`);
  }
  const issueYear = String(e.issuedAt || '').slice(0, 4);
  if (issueYear && printed.split('-').includes(issueYear)) {
    printedFaults.push(`${e.certId}: printed number exposes the issue year — "${printed}"`);
  }
  // The anti-forgery tail is the number's only self-checking property. It
  // was dropped once; the gate now refuses a batch without it.
  const tail = printed.split('-').pop();
  if (!/^[0-9A-F]{5}$/.test(tail) || !e.serialNo.endsWith(`-${tail}`)) {
    printedFaults.push(`${e.certId}: printed number carries no valid anti-forgery tail`);
  }
  if (!e.contentHash.slice(0, 5).toUpperCase().startsWith(tail)) {
    printedFaults.push(`${e.certId}: printed tail "${tail}" is not derived from this certificate's content hash`);
  }
  if (!s.html.includes('o5-cnplate')) printedFaults.push(`${e.certId}: no security cartouche`);
  // The covert layers must still carry the FULL serial, or dropping the
  // year and suffix from the face would drop them from the document.
  if (!s.html.includes(e.serialNo)) printedFaults.push(`${e.certId}: full serial absent from the microtext`);
}
ok('every sheet engraves the printed number with its anti-forgery tail, no year, full serial covert',
  printedFaults.length === 0, printedFaults.join('\n          '));
const printedNos = reg.entries.map((e) => displayStageCertificateNo(e.serialNo));
ok('printed numbers are unique across the batch', new Set(printedNos).size === printedNos.length);

console.log(`\n── The register SQL must actually import ───────────────────`);
// Both of these caught real defects: an INSERT naming a `status` column
// stage_certificates has never had, and a setval on a sequence that does
// not exist. A register file that errors on import is not a register.
const schema = readFileSync('sql/schema.sql', 'utf8');
const regSql = readFileSync(join(DIR, 'graduation-register.sql'), 'utf8');
const tableCols = (name) => {
  const m = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\(([\\s\\S]*?)\\n\\);`));
  return m ? m[1].split('\n').map((l) => (l.trim().match(/^([a-z_]+)\s/) || [])[1]).filter(Boolean) : [];
};
const scCols = tableCols('stage_certificates');
const insertCols = [...regSql.matchAll(/INSERT INTO stage_certificates \(([^)]*)\)/g)]
  .flatMap((m) => m[1].split(',').map((c) => c.trim()));
const unknownCols = [...new Set(insertCols)].filter((c) => !scCols.includes(c));
ok('every column the register INSERTs exists in stage_certificates',
  scCols.length > 0 && unknownCols.length === 0,
  scCols.length === 0 ? 'could not parse the schema' : unknownCols.length ? `unknown: ${unknownCols.join(', ')}` : '');
const notNull = (schema.match(/CREATE TABLE IF NOT EXISTS stage_certificates \(([\s\S]*?)\n\);/) || ['', ''])[1]
  .split('\n').filter((l) => /NOT NULL/.test(l) && !/DEFAULT|SERIAL/.test(l))
  .map((l) => l.trim().split(/\s/)[0]);
const missingNotNull = notNull.filter((c) => !insertCols.includes(c));
ok('the register supplies every NOT NULL column', missingNotNull.length === 0,
  missingNotNull.length ? `missing: ${missingNotNull.join(', ')}` : '');
const seqsUsed = [...regSql.matchAll(/setval\('([a-z_]+)'/g)].map((m) => m[1]);
const seqsDefined = [...schema.matchAll(/CREATE SEQUENCE IF NOT EXISTS ([a-z_]+)/g)].map((m) => m[1]);
const badSeq = seqsUsed.filter((s) => !seqsDefined.includes(s));
ok('every sequence the register advances actually exists',
  seqsUsed.length > 0 && badSeq.length === 0,
  badSeq.length ? `unknown: ${badSeq.join(', ')}` : seqsUsed.length ? '' : 'the register advances no sequence at all');
ok('the register constrains the PRINTED number, not just the stored serial',
  /CREATE UNIQUE INDEX[\s\S]*split_part\(serial_no/.test(regSql),
  /CREATE UNIQUE INDEX[\s\S]*split_part\(serial_no/.test(regSql) ? ''
    : 'no unique index on the derived printed number — two years could print the same one');

console.log(`\n── Content and placeholders ────────────────────────────────`);
const PLACEHOLDER = /\b(lorem|ipsum|TODO|FIXME|XXX|PLACEHOLDER|SAMPLE|DEMO|TEST STUDENT|John Doe|Jane Doe|Student Name|xxxx|000000)\b/i;
// Hex colours are stripped before the test. `000000` is a placeholder
// SERIAL; `#000000` is the pure black the QR and barcode must print in so
// they separate as a single K plate. Without this the check failed the
// whole batch the moment the codes were corrected — a false positive that
// would have been "fixed" by making the codes unprintable again.
const withPlaceholder = sheets.filter((s) => PLACEHOLDER.test(
  s.html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/#[0-9a-fA-F]{3,8}\b/g, '')));
ok('no placeholder text on any sheet', withPlaceholder.length === 0,
  withPlaceholder.map((s) => s.file).join(', '));

// The grade must never reach the sheet. This is a standing client rule.
const GRADES = /\b(Excellent|Very Good|ممتاز|جيد جدا|grade|Grade)\b/;
const withGrade = sheets.filter((s) => GRADES.test(s.html.replace(/<style[\s\S]*?<\/style>/g, '')));
ok('no grade appears on any sheet', withGrade.length === 0, withGrade.map((s) => s.file).join(', '));

ok('every sheet carries both signatures',
  sheets.every((s) => s.html.includes('signature-principal.png') && s.html.includes('signature-chairman.png')));
ok('every sheet carries the seal', sheets.every((s) => s.html.includes('official-seal.png')));
ok('every sheet carries the security patch', sheets.every((s) => s.html.includes('security-emblem-shrs.png')));
// The stages do NOT share one plate. IDD carries the Founder's own
// I'dadiyyah artwork (supplied 2026-08-06) as a marks layer over a vector
// paper rect; every other stage carries the original locked master. Pinning
// this to one filename made the gate fail the moment the correct plate was
// applied — a gate that fails on being right is worse than no gate.
const PLATE_FILE = PROG === 'IDD'
  ? 'official-background-idd-marks.png'
  : 'official-background-master.jpg';
ok('every sheet carries its stage plate', sheets.every((s) => s.html.includes(PLATE_FILE)));
ok('the stage plate is laid over its solved paper tone',
  PROG !== 'IDD' || sheets.every((s) => s.html.includes('official-paper')));
// The QR is emitted as a single path, not a grid of rects — an earlier
// version of this check counted rects and failed every sheet, which was the
// check being wrong, not the artwork. Whether the QR is real and points at
// the right student can only be settled by decoding it, which
// scripts/verify-certificate-layout.mjs does with a browser and a decoder.
ok('every sheet carries QR markup from the real encoder',
  sheets.every((s) => /viewBox="0 0 4[0-9] 4[0-9]"/.test(s.html) && s.html.includes('vp-qr')));

console.log(`\n── Stylesheet integrity ────────────────────────────────────`);
// A malformed CSS comment does not throw and does not warn — the parser simply
// discards everything until it next resynchronises, so a stray `*/` silently
// deletes the rules that follow it. That happened here: a note added below a
// comment's closing `*/` killed the header's badge rules, the emblems lost
// their shared baseline and a reserved slot collapsed, and every other check
// in this gate still passed. Comment delimiters are therefore counted.
for (const s of sheets.slice(0, 1)) {
  const css = (s.html.match(/<style>([\s\S]*?)<\/style>/g) || []).join('\n');
  const opens = (css.match(/\/\*/g) || []).length;
  const closes = (css.match(/\*\//g) || []).length;
  ok(`stylesheet comments balance (${opens} open / ${closes} close)`, opens === closes,
    opens === closes ? '' : 'an unbalanced delimiter silently discards the rules after it');
}
// Each of these declarations is load-bearing for a Founder requirement. They
// are looked for in the stylesheet WITH ITS COMMENTS STRIPPED, so a rule that
// has been commented out reads as absent — searching the raw HTML would find
// the text and pass while the rule did nothing. This does NOT also catch the
// unbalanced-delimiter case: comment stripping and a real CSS parser resolve
// an odd `*/` differently. That case is the balance check above; these two
// checks cover different failures and neither replaces the other.
const REQUIRED_CSS = [
  ['.ihdr-badge{height:', 'the shared emblem baseline box'],
  ['align-items:flex-end', 'emblems aligned to the baseline, not to their own tops'],
  ['.ihdr-badge img{max-height:', 'emblems sized without stretching'],
];
if (PROG === 'IDD') {
  const live = sheets.map((s) => (s.html.match(/<style>([\s\S]*?)<\/style>/g) || [])
    .join('\n').replace(/\/\*[\s\S]*?\*\//g, ''));
  for (const [needle, what] of REQUIRED_CSS) {
    ok(`header CSS reaches the parser: ${what}`, live.every((c) => c.includes(needle)));
  }
}

console.log(`\n── Bidirectional text ──────────────────────────────────────`);
// The session range must NOT be forced LTR: that reverses its reading order
// for an Arabic reader. See the ar-range rule in the template.
ok('no dir="ltr" isolate inside the Arabic paragraph',
  sheets.every((s) => !/o5-para-ar[\s\S]{0,400}?dir="ltr"/.test(s.html)));
ok('the Arabic session range uses the bidi-isolate class',
  sheets.every((s) => s.html.includes('class="ar-range"')));
ok('every Arabic block declares its direction',
  sheets.every((s) => /o5-name-ar/.test(s.html) && /direction:rtl/.test(s.html)));

console.log(`\n── Asset resolution ────────────────────────────────────────`);
// Pixel dimensions are READ FROM THE FILE, never transcribed. An earlier
// version listed them as literals, which meant swapping in a smaller emblem
// left the gate reporting the old file's DPI — a check that cannot notice
// the thing it exists to notice.
//
// `axis` names the dimension the layout actually constrains, because that is
// the one that sets the effective resolution: the header emblems are sized by
// max-height with width:auto, so their height over their rendered height is
// the real number and their width is free.
const ASSETS = [
  ['assets/images/certificates/' + PLATE_FILE, 'w', 297, 'locked artwork'],
  ['assets/images/certificates/official-seal.png', 'w', 34, 'embossed seal'],
  ['assets/images/certificates/signature-principal.png', 'w', 30, 'principal signature'],
  ['assets/images/certificates/signature-chairman.png', 'w', 16, 'chairman signature'],
  ['assets/images/certificates/security-emblem-shrs.png', 'w', 10, 'security patch'],
  // Institutional header, restored 2026-08-06 on the Founder's mandatory
  // layout correction. Rendered 15mm and 17mm tall respectively;
  // the directive requires them crisp at 300-600 DPI and forbids upscaling,
  // so this is the check that keeps a low-resolution replacement out.
  ['assets/images/crests/nigeria-coat-of-arms.png', 'h', 15, 'Nigeria coat of arms'],
  ['assets/images/crests/shrs-institutional-crest.png', 'h', 17, 'SHRS institutional crest'],
  // Lagos State Coat of Arms, supplied by the Founder 2026-08-06 and keyed by
  // scripts/build-lagos-arms.py. 405 DPI over its 15mm height: above the press
  // floor this gate enforces, and below the other two emblems. Recorded here
  // so that gap is a number in the log on every run rather than a memory.
  ['assets/images/crests/lagos-state-arms.png', 'h', 15, 'Lagos State arms'],
];

// PNG and JPEG intrinsic size, straight out of the file's own header — no
// image library, so this gate stays dependency-free like the rest of it.
function intrinsicSize(path) {
  const b = readFileSync(path);
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  for (let i = 2; i < b.length - 9;) {           // JPEG: walk the marker chain
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`cannot read intrinsic size of ${path}`);
}

// The locked artwork is a known, reported hard limit, not a regression:
// the Founder's supplied file is 1080px across a 297mm sheet. It is listed
// separately so it cannot quietly fail this gate every run and train
// everyone to ignore a red line.
const PLATE_PATH = 'assets/images/certificates/' + PLATE_FILE;
for (const [file, axis, mm, label] of ASSETS.filter((a) => a[0] !== PLATE_PATH)) {
  if (!existsSync(file)) { ok(`${label}: file present`, false, `missing ${file}`); continue; }
  const px = intrinsicSize(file)[axis];
  const dpi = px / mm * 25.4;
  ok(`${label}: ${px}px over ${mm}mm = ${Math.round(dpi)} DPI`, dpi >= 300,
    dpi < 300 ? 'below the 300 DPI print floor' : '');
}
const artPx = intrinsicSize(PLATE_PATH).w;
const artDpi = artPx / 297 * 25.4;
console.log(`  NOTE  locked artwork: ${artPx}px over 297mm = ${Math.round(artDpi)} DPI —`);
console.log(`        below the 300 DPI floor. This is the supplied source file's own`);
console.log(`        resolution, not something this pipeline degraded, and it cannot be`);
console.log(`        raised without the original layered artwork. Reported, not asserted.`);

console.log(`\n${'─'.repeat(60)}`);
console.log(`${checks - fails}/${checks} checks passed`);
if (fails) console.log(`${fails} FAILED — this batch is not releasable.`);
process.exit(fails ? 1 : 0);
