/**
 * Import gate for an emitted graduation register.
 *
 *     DOCUMENT_HASH_SECRET=... node scripts/verify-register-import.mjs [file.sql ...]
 *
 * Answers one question: if a registrar runs this SQL against the live
 * database, will the six certificates it seeds VERIFY? Nothing else in the
 * pipeline asks it. scripts/verify-certificate-batch.mjs checks the rendered
 * sheets against the Founder's roll, and the issuer's own gates check the
 * roll against itself — but the register SQL is a separate artefact, written
 * by hand-maintained column lists, and it is the only one the public verifier
 * will ever read from.
 *
 * It failed that question. The INSERT column list omitted grade_en, which is
 * one of the seven fields the content hash is taken over, so importing it
 * would have left grade_en NULL and made every certificate in the batch report
 * 'integrity check failed' to anyone who looked it up — six correct documents
 * called forgeries by their own registry, with nothing wrong with the paper.
 *
 * So the hash is recomputed here from the INSERT's OWN column values, through
 * the production code the public endpoint runs (verifyStageCertificateIntegrity),
 * not through a re-implementation that could drift into agreeing with a broken
 * file. Any hashed column dropped from the column list fails this gate, not
 * only the one that was actually dropped.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { verifyStageCertificateIntegrity, parseStageCertificateSerial, certificateHashFields, isoDateOnly } from '../functions/_lib/certificate-serial.js';
import { createHmac } from 'node:crypto';
import { computeDocumentHash } from '../functions/_lib/document-hash.js';
import { formatStudentIdentityNo, isValidStudentIdentityNo } from '../functions/_lib/identity-no.js';

const REGISTER_DOCS = 'docs/graduation-registers';
const DIST_CERTIFICATES = 'dist/certificates';

// ── Which secret ────────────────────────────────────────────────────────
// The gate is worthless without saying which key it verified under: the same
// register verifies under the key it was issued with and fails under every
// other, so "PASS" alone does not tell a reader whether the file is sound or
// whether they simply held the matching key.
//
// The key itself is NEVER printed — this script is run in terminals, CI logs
// and pasted into reports. It is identified by a SHA-256 fingerprint, which is
// enough to compare two runs without disclosing anything. The one key named in
// full is the development literal, because naming it is the point: it is not a
// secret, it is a defect, and six production certificates were minted under it.
const DEVELOPMENT_SECRET = 'batch-issuance-development-secret';
const SECRET = process.env.DOCUMENT_HASH_SECRET;
if (!SECRET) {
  console.error('VERIFIER REJECTED — DOCUMENT_HASH_SECRET is not set.\n'
    + '  This gate recomputes HMAC-SHA256 content hashes; with no key there is\n'
    + '  nothing to recompute and a pass would mean nothing. Set it to the key\n'
    + '  the register under test was issued under.');
  process.exit(1);
}
// The whole key set, not just the current secret. This gate verifies rows from
// EVERY era — a register signed under a retired key must still be checkable —
// so it needs the version marker and every DOCUMENT_HASH_SECRET_V<n> the
// operator has configured. Passing only the current secret silently reported
// pre-rotation registers as hash mismatches, which reads as tampering.
const env = { DOCUMENT_HASH_SECRET: SECRET };
env.DOCUMENT_HASH_KEY_VERSION = process.env.DOCUMENT_HASH_KEY_VERSION;
for (const [k, v] of Object.entries(process.env)) {
  if (/^DOCUMENT_HASH_SECRET_V\d+$/.test(k)) env[k] = v;
}
const fingerprint = createHash('sha256').update(SECRET).digest('hex').slice(0, 16);
const isDevSecret = SECRET === DEVELOPMENT_SECRET;

// ── SQL reading ─────────────────────────────────────────────────────────
// A real scanner rather than a split(','), because the values legitimately
// contain commas ('Ikorodu, Lagos, Nigeria') and doubled-quote escapes, and a
// parser that mis-splits a row would compare the wrong field against the wrong
// column and report a hash mismatch that is its own fault.
function scanParenthesised(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const c = text[i];
    if (c === "'") {
      i++;
      while (i < text.length) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") { i++; } else break;
        }
        i++;
      }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return { body: text.slice(openIndex + 1, i), end: i }; }
  }
  return null;
}

function splitSqlValues(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && /[\s,]/.test(text[i])) i++;
    if (i >= text.length) break;
    if (text[i] === "'") {
      let v = '';
      i++;
      while (i < text.length) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") { v += "'"; i += 2; continue; }
          i++; break;
        }
        v += text[i++];
      }
      out.push(v);
    } else {
      let v = '';
      while (i < text.length && !/[\s,)]/.test(text[i])) v += text[i++];
      out.push(/^NULL$/i.test(v) ? null : v);
    }
  }
  return out;
}

// Each INSERT becomes a snake_case object — the same shape a
// `SELECT * FROM stage_certificates` row arrives in — so it can be handed
// straight to the production integrity check with no translation layer.
function parseCertificateInserts(sqlText) {
  const rows = [];
  const re = /INSERT\s+INTO\s+stage_certificates\s*\(/gi;
  let m;
  while ((m = re.exec(sqlText))) {
    const cols = scanParenthesised(sqlText, re.lastIndex - 1);
    if (!cols) continue;
    const after = sqlText.slice(cols.end);
    const vOpen = after.search(/VALUES\s*\(/i);
    if (vOpen < 0) continue;
    const vals = scanParenthesised(after, after.indexOf('(', vOpen));
    if (!vals) continue;
    const names = cols.body.split(',').map((s) => s.trim());
    const values = splitSqlValues(vals.body);
    const row = {};
    names.forEach((n, i) => { row[n] = values[i]; });
    row.__columns = names;
    rows.push(row);
  }
  return rows;
}

// setval targets, in both spellings the registers use: a literal sequence name
// and pg_get_serial_sequence(table, column). The captured integer is the floor
// the statement guarantees — GREATEST(MAX(id), 47) can only land higher than
// its literal, never lower, so comparing against the literal is sound.
function parseSetvals(sqlText) {
  const out = [];
  const re = /setval\s*\(\s*(?:'([a-z_]+)'|pg_get_serial_sequence\s*\(\s*'([a-z_]+)'\s*,\s*'([a-z_]+)'\s*\))\s*,/gi;
  let m;
  while ((m = re.exec(sqlText))) {
    const rest = scanParenthesised(sqlText, sqlText.indexOf('(', m.index));
    const literals = (rest ? rest.body : '').match(/(?<![\w.])\d+(?![\w.])/g) || [];
    out.push({
      target: m[1] || `${m[2]}.${m[3]}`,
      floor: literals.length ? Math.max(...literals.map(Number)) : null,
    });
  }
  return out;
}

// ── Targets ─────────────────────────────────────────────────────────────
// Default is every published register plus its build output. docs/ is the
// register of record and dist/ is what the issuer just wrote; both are checked
// AND compared, because a docs copy that has drifted from its dist twin is a
// register nobody can reproduce. Orphan dist directories from superseded runs
// are deliberately not swept up — they have no docs counterpart because they
// are not registers of record.
function defaultTargets() {
  const targets = [];
  for (const f of readdirSync(REGISTER_DOCS).filter((n) => n.endsWith('.sql')).sort()) {
    targets.push(join(REGISTER_DOCS, f));
    const twin = join(DIST_CERTIFICATES, basename(f, '.sql'), 'graduation-register.sql');
    if (existsSync(twin)) targets.push(twin);
  }
  return targets;
}

const TARGETS = process.argv.slice(2).length ? process.argv.slice(2) : defaultTargets();

let fails = 0, checks = 0;
const ok = (name, pass, detail = '') => {
  checks++;
  if (!pass) fails++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `\n          ${detail}` : ''}`);
};

console.log('\nSHRS graduation register import verification\n');
console.log('── Signing key ─────────────────────────────────────────────');
console.log(`  Secret read from DOCUMENT_HASH_SECRET, SHA-256 fingerprint ${fingerprint}.`);
if (isDevSecret) {
  console.log('  This IS the literal \'batch-issuance-development-secret\' that the issuer');
  console.log('  used to fall back to. The 2026-08-08 batches were minted under it, so it');
  console.log('  is the only key they can verify under until the Founder rules on');
  console.log('  re-minting. Verifying here is not endorsing it.');
} else {
  console.log('  Not the known development literal.');
}

// Recompute a row's digest under the key version recorded ON THE ROW. This
// cannot go through computeDocumentHash: that is the SIGNING path and refuses
// retired versions outright, which is correct for issuance and useless for a
// diagnostic about an already-issued row.
function recomputeUnderRowKey(env, row, fields) {
  const v = Number(row.hash_key_version) || 1;
  const key = v === Number(env.DOCUMENT_HASH_KEY_VERSION || 1)
    ? env.DOCUMENT_HASH_SECRET
    : env[`DOCUMENT_HASH_SECRET_V${v}`];
  if (!key) return `(no key configured for version ${v})`;
  const sortedKeys = Object.keys(fields).sort();
  const ordered = {};
  for (const k of sortedKeys) ordered[k] = fields[k];
  return createHmac('sha256', key).update(JSON.stringify(ordered)).digest('hex');
}

for (const file of TARGETS) {
  console.log(`\n── ${file} ─────────────────────────────────`);
  if (!existsSync(file)) { ok('file present', false, `missing ${file}`); continue; }
  const text = readFileSync(file, 'utf8');
  const rows = parseCertificateInserts(text);
  ok('register contains stage_certificates rows', rows.length > 0, `parsed ${rows.length}`);
  if (!rows.length) continue;

  // ── The hash, recomputed from this file's own values ───────────────────
  const hashFaults = [];
  for (const row of rows) {
    const parsed = parseStageCertificateSerial(row.serial_no);
    if (!parsed) { hashFaults.push(`${row.serial_no}: serial does not parse`); continue; }
    const { hashValid, suffixValid, reason, detail } = verifyStageCertificateIntegrity(env, row);
    if (!hashValid && reason === 'key_unavailable') {
      // Not a tamper signal — the retired key for this row's era simply is not
      // configured here. Say so plainly instead of reporting a mismatch, which
      // would send the reader looking for a corrupted register that is fine.
      hashFaults.push(`${row.serial_no}: ${detail}`);
    } else if (!hashValid) {
      // Print what the file's values actually hash to. A bare "mismatch" sends
      // the reader hunting; the recomputed digest next to the stored one names
      // the fault immediately — and the field set is echoed so a missing column
      // shows as the empty string it became.
      //
      // Recomputed under THIS ROW's key, not the current signing key: a row
      // signed by a retired version can never be re-signed (signing refuses),
      // so the diagnostic has to verify, not sign.
      const got = recomputeUnderRowKey(env, row, certificateHashFields({
        serialBase: parsed.serialBase,
        studentIdentityNo: row.student_identity_no,
        studentFullName: row.student_full_name,
        programmeCode: row.programme_code,
        academicYear: row.academic_year,
        gradeEn: row.grade_en,
        issuedAt: isoDateOnly(row.issued_at),
      }));
      hashFaults.push(`${row.serial_no} (${row.student_full_name}): row hashes to ${got}, `
        + `stored ${row.content_hash}` + (row.grade_en === undefined
          ? ' — grade_en is not in the INSERT column list' : ''));
    } else if (!suffixValid) {
      hashFaults.push(`${row.serial_no}: hash is correct but the serial suffix does not derive from it`);
    }
  }
  ok(`all ${rows.length} rows re-hash to their stored content_hash and printed suffix`,
    hashFaults.length === 0, hashFaults.join('\n          '));

  // Named separately from the hash check even though the hash check subsumes
  // it, because "grade_en is missing" is the diagnosis a reader needs, and a
  // hash mismatch alone does not say which of seven fields moved.
  const hashedColumns = ['serial_no', 'student_identity_no', 'student_full_name',
    'programme_code', 'academic_year', 'grade_en', 'issued_at'];
  const missing = hashedColumns.filter((c) => rows.some((r) => r[c] === undefined));
  ok('every hashed field is present in the INSERT column list',
    missing.length === 0, missing.length ? `absent: ${missing.join(', ')}` : '');

  // ── Sequences ─────────────────────────────────────────────────────────
  // Three sequences feed the identifiers on these rows and all three must end
  // up past this batch, or the Registrar's next action collides with it.
  const setvals = parseSetvals(text);
  const at = (target) => setvals.find((s) => s.target === target);
  const maxId = Math.max(...rows.map((r) => Number(r.id)));
  const maxSerialSeq = Math.max(...rows.map((r) => Number(parseStageCertificateSerial(r.serial_no).serialBase.slice(-6))));

  const serialSeq = at('stage_certificate_serial_seq');
  ok('stage_certificate_serial_seq is advanced past the batch',
    Boolean(serialSeq) && serialSeq.floor >= maxSerialSeq,
    !serialSeq ? 'no setval for it — the Registrar would re-issue these numbers'
      : serialSeq.floor < maxSerialSeq ? `set to ${serialSeq.floor}, batch ends at ${maxSerialSeq}` : '');

  // The one the register omitted. id is supplied explicitly by every INSERT
  // above, which does not advance a SERIAL's sequence — and because the
  // archive reference and the Code 128 payload both derive from cert.id while
  // the engraved number derives from the serial sequence, a stale id sequence
  // prints a certificate whose barcode names a different record.
  const idSeq = at('stage_certificates.id');
  ok('stage_certificates.id sequence is advanced past the batch',
    Boolean(idSeq) && idSeq.floor >= maxId,
    !idSeq ? 'no setval for it — the next certificate issued through the Registrar UI '
      + 'gets a low id, and its archive reference and barcode stop matching its number'
      : idSeq.floor < maxId ? `set to ${idSeq.floor}, batch ends at ${maxId}` : '');

  // student_identity_seq's value cannot be read off an identity_no by
  // inspection — the number is a keyed permutation of the sequence
  // (identity-no.js) — so it is checked forward instead: every ID in the file
  // must be one the production generator produces at or below the claimed
  // high-water mark. Cheap because these registers end in the low tens.
  const identityNos = [...text.matchAll(/identity_no\s*=\s*'(\d{15})'/g)].map((m) => m[1]);
  ok('every seeded student ID passes the Luhn check digit',
    identityNos.length > 0 && identityNos.every(isValidStudentIdentityNo),
    identityNos.filter((v) => !isValidStudentIdentityNo(v)).join(', '));
  const identitySeq = at('student_identity_seq');
  if (!identitySeq) {
    ok('student_identity_seq is advanced past the batch', false,
      'no setval for it — the registrar would re-issue these permanent numbers');
  } else {
    const reachable = new Set();
    for (let s = 1; s <= Math.min(identitySeq.floor, 100_000); s++) reachable.add(formatStudentIdentityNo(s));
    const unreachable = identityNos.filter((v) => !reachable.has(v));
    ok(`student_identity_seq (${identitySeq.floor}) covers every student ID seeded here`,
      unreachable.length === 0,
      unreachable.length ? `not produced at or below ${identitySeq.floor}: ${unreachable.join(', ')}` : '');
  }
}

// ── docs/ against dist/ ─────────────────────────────────────────────────
// The published register and the issuer's output must be the same file, or
// the register of record is something no run of the issuer reproduces.
if (!process.argv.slice(2).length) {
  console.log('\n── Published register vs. issuer output ────────────────────');
  for (const f of readdirSync(REGISTER_DOCS).sort()) {
    const twin = join(DIST_CERTIFICATES, f.replace(/\.[a-z]+$/, ''), 'graduation-register' + f.slice(f.lastIndexOf('.')));
    if (!existsSync(twin)) { ok(`${f}: has a build output in ${DIST_CERTIFICATES}`, false, `missing ${twin}`); continue; }
    ok(`${f} is byte-identical to ${twin}`,
      readFileSync(join(REGISTER_DOCS, f)).equals(readFileSync(twin)));
  }
}

// ── The grade must not leak ─────────────────────────────────────────────
// Asserted HERE because this gate's own fix is what makes it live: until the
// register carried grade_en, no imported certificate had a grade for the
// public endpoint to leak. Editorial Bible §1.5 — the certificate attests
// completion, not performance; the grade is hashed and stored, and belongs to
// the Transcript. Comments are stripped first: verify.js documents the rule in
// prose, and a gate that trips on its own explanation is a gate people delete.
const PUBLIC_VERIFIER = 'functions/api/certificates/verify.js';
const verifierCode = readFileSync(PUBLIC_VERIFIER, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
console.log('\n── Public verification must never carry the grade ──────────');
ok(`${PUBLIC_VERIFIER} reads no grade column`, !/grade/i.test(verifierCode),
  (verifierCode.match(/^.*grade.*$/gim) || []).join('\n          '));

console.log(`\n${'─'.repeat(60)}`);
console.log(`${checks - fails}/${checks} checks passed  (key fingerprint ${fingerprint}${isDevSecret ? ', the development literal' : ''})`);
if (fails) console.log(`${fails} FAILED — these registers must not be imported.`);
process.exit(fails ? 1 : 0);
