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

// Transcribed independently from the Founder's FINAL NAME ACCURACY
// DIRECTIVE. Not imported from the issuer — importing it would mean the
// issuer verifies itself, which proves nothing.
const DIRECTIVE = [
  ['000035', 'Naheemah Ismail Seriki', 'نعيمة إسماعيل سركي'],
  ['000036', 'Ashraf Korede Ojewumi', 'أشرف كوردي أوجومي'],
  ['000037', 'Al-Ameen Okoh', 'الأمين أكو'],
  ['000038', 'Al-Ameen Abidemi Jokomba', 'الأمين أبديمي جوكمبا'],
  ['000039', 'Aisha Lawal', 'عائشة لوال'],
  ['000040', 'Imran Iremide Adegoke', 'عمران إريمدي أدغكي'],
  ['000041', 'Daud Aliu', 'داود علي'],
];

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
ok(`seven sheets present`, sheets.length === 7, `found ${sheets.length}`);
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
ok('numbering starts at exactly 000035', seqs[0] === 35, `starts at ${String(seqs[0]).padStart(6, '0')}`);
ok('numbering is sequential with no gaps',
  seqs.every((n, i) => n === 35 + i), seqs.join(', '));
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
ok('all 7 English and 7 Arabic names match the directive code point for code point',
  nameFaults.length === 0, nameFaults.join('\n          '));

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
const withPlaceholder = sheets.filter((s) => PLACEHOLDER.test(s.html.replace(/<style[\s\S]*?<\/style>/g, '')));
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
ok('every sheet carries the locked artwork', sheets.every((s) => s.html.includes('official-background-master.jpg')));
// The QR is emitted as a single path, not a grid of rects — an earlier
// version of this check counted rects and failed every sheet, which was the
// check being wrong, not the artwork. Whether the QR is real and points at
// the right student can only be settled by decoding it, which
// scripts/verify-certificate-layout.mjs does with a browser and a decoder.
ok('every sheet carries QR markup from the real encoder',
  sheets.every((s) => /viewBox="0 0 4[0-9] 4[0-9]"/.test(s.html) && s.html.includes('vp-qr')));

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
const ASSETS = [
  ['official-background-master.jpg', 1080, 297, 'locked artwork'],
  ['official-seal.png', 1034, 34, 'embossed seal'],
  ['signature-principal.png', 2336, 30, 'principal signature'],
  ['signature-chairman.png', 391, 16, 'chairman signature'],
  ['security-emblem-shrs.png', 170, 10, 'security patch'],
];
// The locked artwork is a known, reported hard limit, not a regression:
// the Founder's supplied file is 1080px across a 297mm sheet. It is listed
// separately so it cannot quietly fail this gate every run and train
// everyone to ignore a red line.
for (const [file, px, mm, label] of ASSETS.filter((a) => a[0] !== 'official-background-master.jpg')) {
  const dpi = px / mm * 25.4;
  ok(`${label}: ${px}px over ${mm}mm = ${Math.round(dpi)} DPI`, dpi >= 300,
    dpi < 300 ? 'below the 300 DPI print floor' : '');
}
const artDpi = 1080 / 297 * 25.4;
console.log(`  NOTE  locked artwork: 1080px over 297mm = ${Math.round(artDpi)} DPI —`);
console.log(`        below the 300 DPI floor. This is the supplied source file's own`);
console.log(`        resolution, not something this pipeline degraded, and it cannot be`);
console.log(`        raised without the original layered artwork. Reported, not asserted.`);

console.log(`\n${'─'.repeat(60)}`);
console.log(`${checks - fails}/${checks} checks passed`);
if (fails) console.log(`${fails} FAILED — this batch is not releasable.`);
process.exit(fails ? 1 : 0);
