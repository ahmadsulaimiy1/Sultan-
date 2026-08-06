/**
 * Every identifier printed on a stage certificate must reach its own row.
 *
 *     node scripts/test-verify-identifiers.mjs
 *
 * This test exists because five of the seven did not. An acceptance audit
 * executed the parsers against the numbers actually engraved on the 2026
 * sheets and found that the Student ID, the verification code (dashed and
 * undashed), the Code 128-C barcode payload, the archive path and the
 * document id all returned null — so the public verifier skipped the stage
 * branch entirely and answered {ok:true, found:false}. A graduate typing
 * the number under the QR code on their own certificate was told no such
 * certificate exists, and no verification_log row was written to show it
 * had ever been asked.
 *
 * There is no database here. The `sql` tag is stubbed the same way
 * scripts/issue-certificate-batch.mjs stubs it (sequenceStub), except that
 * this stub READS the generated query — it applies the real WHERE clause to
 * fixture rows and throws on any predicate it does not recognise. A
 * resolver that quietly changes its query shape therefore fails here rather
 * than passing against a stub that agrees with whatever it is given.
 *
 * The fixture rows are the thirteen certificates as published in
 * docs/graduation-registers/*.json — real serials, real content hashes,
 * real Student IDs. Nothing is generated, and no hash is recomputed: this
 * test never needs DOCUMENT_HASH_SECRET and cannot alter an issued number.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseStageCertificateIdentifier, resolveStageCertificateIdentifier,
  displayStageCertificateNo,
} from '../functions/_lib/certificate-serial.js';
import { formatStudentIdentityNo } from '../functions/_lib/identity-no.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const readText = (p) => readFileSync(join(ROOT, p), 'utf8');

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) { console.log(`  ok    ${name}`); return; }
  failures++;
  console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
};
// Every resolution result is reported through this, so a resolver that
// stops recognising an identifier altogether shows up as a FAIL like any
// other defect rather than crashing the run on a null.
const outcomeOf = (res) => (res ? `${res.outcome}, ${res.rows.length} row(s)` : 'not an identifier at all');

// ── The sql stub ────────────────────────────────────────────────────────
// Neon's driver is a tagged template: sql`… ${v} …` arrives as
// (strings, ...params) and must resolve to { rows }. Rather than pattern-
// match on "which resolver called me", this executes the query it was
// handed: the WHERE clause is split into conjuncts and each one is turned
// into a predicate over the fixture rows, consuming placeholders in the
// order they appear. Anything unrecognised throws, so an untested lookup
// path cannot silently return an empty result and read as "not found".
function likeToRegExp(pattern) {
  // LIKE semantics, not regex: _ is exactly one character, % is any run,
  // and everything else is literal. The pattern is anchored on both sides
  // because that is what makes the six-digit sequence unable to match a
  // longer one that merely ends in those digits.
  const body = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/_/g, '.').replace(/%/g, '.*');
  return new RegExp(`^${body}$`);
}

const yearOf = (issuedAt) => Number(String(issuedAt).slice(0, 4));

function fixtureSql(rows) {
  const queries = [];
  const tag = async (strings, ...params) => {
    const text = strings.join(' ? ').replace(/\s+/g, ' ').trim();
    queries.push({ text, params });
    if (!/FROM stage_certificates sc\b/.test(text)) {
      throw new Error(`test-verify-identifiers: unexpected table in query: ${text}`);
    }
    const [, afterWhere] = text.split(/\bWHERE\b/);
    if (!afterWhere) throw new Error(`test-verify-identifiers: query has no WHERE: ${text}`);
    const [predicateText, orderText] = afterWhere.split(/\bORDER BY\b/);

    let next = 0;
    const predicates = predicateText.split(/\bAND\b/).map((raw) => {
      const clause = raw.trim();
      const value = params[next];
      const take = () => { next++; return value; };
      if (/^sc\.serial_no = \?$/.test(clause)) { const v = take(); return (r) => r.serial_no === v; }
      if (/^sc\.serial_no LIKE \?$/.test(clause)) { const re = likeToRegExp(take()); return (r) => re.test(r.serial_no); }
      if (/^sc\.student_identity_no = \?$/.test(clause)) { const v = take(); return (r) => r.student_identity_no === v; }
      if (/^left\(lower\(sc\.content_hash\), 12\) = \?$/.test(clause)) {
        const v = take();
        return (r) => String(r.content_hash).toLowerCase().slice(0, 12) === v;
      }
      if (/^sc\.id = \?$/.test(clause)) { const v = take(); return (r) => Number(r.id) === Number(v); }
      if (/^EXTRACT\(YEAR FROM sc\.issued_at\)::int = \?$/.test(clause)) {
        const v = take();
        return (r) => yearOf(r.issued_at) === Number(v);
      }
      if (/^upper\(sc\.programme_code\) = \?$/.test(clause)) {
        const v = take();
        return (r) => String(r.programme_code).toUpperCase() === v;
      }
      throw new Error(`test-verify-identifiers: unrecognised predicate "${clause}" in: ${text}`);
    });
    if (next !== params.length) {
      throw new Error(`test-verify-identifiers: ${params.length} parameters but ${next} consumed: ${text}`);
    }

    let matched = rows.filter((r) => predicates.every((p) => p(r)));
    if (orderText) {
      const order = orderText.trim();
      if (order !== 'sc.issued_at DESC, sc.id DESC') {
        throw new Error(`test-verify-identifiers: unrecognised ORDER BY "${order}"`);
      }
      matched = matched.slice().sort((a, b) =>
        (a.issued_at < b.issued_at ? 1 : a.issued_at > b.issued_at ? -1 : b.id - a.id));
    }
    return { rows: matched };
  };
  tag.queries = queries;
  return tag;
}

// ── Fixture rows: the certificates as actually issued ───────────────────
const REGISTERS = [
  'docs/graduation-registers/2026-08-08-IDD-000042.json',
  'docs/graduation-registers/2026-08-08-IBT-000035.json',
];
const certificates = [];
for (const path of REGISTERS) {
  const reg = readJson(path);
  for (const e of reg.entries) {
    certificates.push({
      register: path,
      entry: e,
      row: {
        id: e.certId,
        serial_no: e.serialNo,
        student_identity_no: e.identityNo,
        student_full_name: e.studentEn,
        student_full_name_ar: e.studentAr,
        programme_code: reg.programme,
        programme_label_en: reg.programmeLabelEn,
        academic_year: reg.academicYear,
        content_hash: e.contentHash,
        issued_at: reg.issuedAt,
        // Stored and hashed, never returned by the verifier — carried on the
        // fixture row precisely so the grade-leak gate below has something
        // real to leak if the response shape ever regresses.
        grade_en: e.gradeEn || 'Excellent',
        revoked_at: null,
      },
    });
  }
}
const rows = certificates.map((c) => c.row);
const IDD = certificates.filter((c) => c.row.programme_code === 'IDD');

console.log(`Certificate identifier resolution — ${certificates.length} issued certificates `
  + `(${IDD.length} I’dādiyyah, ${certificates.length - IDD.length} Ibtidā’iyyah)\n`);

// Derived from the register, never hardcoded. The serial's 5-character tail is
// the head of the content hash, so it MOVES whenever the signing key rotates —
// a literal here turns a correct key rotation into a red test and tells you
// nothing about whether resolution works.
const IDD_REGISTER = JSON.parse(
  readFileSync('docs/graduation-registers/2026-08-08-IDD-000042.json', 'utf8'));
check('the six I’dādiyyah certificates are the ones under audit',
  IDD.length === 6
    && IDD.map((c) => c.row.serial_no).join(',')
       === IDD_REGISTER.entries.map((e) => e.serialNo).join(','),
  IDD.map((c) => c.row.serial_no).join(', '));

// ── Every printed identifier, for every certificate ─────────────────────
// The forms below are exactly what the sheet carries: the engraved number
// on the face, and the five identifiers on the verification plate.
function identifiersFor({ entry, row }) {
  const printed = displayStageCertificateNo(row.serial_no);          // SHRS-CERT-IDD-000042-A775E
  const noTail = printed.replace(/-[0-9A-F]{5}$/, '');               // SHRS-CERT-IDD-000042
  const undashed = entry.verifyCode.replace(/-/g, '');               // A775E1948527
  return {
    serial: row.serial_no,
    'serial (lower case)': row.serial_no.toLowerCase(),
    'printed number': printed,
    'printed number without check tail': noTail,
    'printed number (lower case)': printed.toLowerCase(),
    'student ID': row.student_identity_no,
    'verification code (dashed)': entry.verifyCode,
    'verification code (undashed)': undashed,
    'verification code (lower case)': entry.verifyCode.toLowerCase(),
    'verification code (spaced)': entry.verifyCode.replace(/-/g, ' '),
    'barcode payload': `${yearOf(row.issued_at)}${String(row.id).padStart(6, '0')}`,
    'archive reference': entry.archiveRef,
    'document id': entry.documentId,
  };
}

const FORM_COUNT = Object.keys(identifiersFor(certificates[0])).length;
const sql = fixtureSql(rows);
let resolvedAll = true;
const misses = [];
for (const cert of certificates) {
  for (const [form, value] of Object.entries(identifiersFor(cert))) {
    const res = await resolveStageCertificateIdentifier(sql, value);
    const ok = res && res.outcome === 'resolved'
      && res.rows.length === 1
      && res.rows[0].serial_no === cert.row.serial_no;
    if (!ok) {
      resolvedAll = false;
      misses.push(`${cert.row.serial_no} via ${form} (${value}) → `
        + (!res ? 'not an identifier at all' : `${res.outcome}, ${res.rows.length} row(s)`));
    }
  }
}
check(`all ${FORM_COUNT} printed forms × ${certificates.length} certificates select the identical serial`,
  resolvedAll, misses.slice(0, 6).join(' | '));

// The certificate numbers, Student IDs and content hashes as published are
// the input to this test, so a resolver cannot "fix" a lookup by changing
// one. Restated as an assertion so the register stays the authority.
check('published identifiers are unchanged by resolution',
  certificates.every((c) => c.row.serial_no === c.entry.serialNo
    && c.row.student_identity_no === c.entry.identityNo
    && c.row.content_hash === c.entry.contentHash));

// ── Wrong numbers must find nothing ─────────────────────────────────────
const first = IDD[0];
const bumpHex = (ch) => '0123456789ABCDEF'['0123456789ABCDEF'.indexOf(ch.toUpperCase()) ^ 1];

const wrongTail = (() => {
  const printed = displayStageCertificateNo(first.row.serial_no);
  return printed.slice(0, -1) + bumpHex(printed.slice(-1));
})();
const wrongTailRes = await resolveStageCertificateIdentifier(sql, wrongTail);
check(`a wrong check tail selects nothing (${wrongTail})`,
  wrongTailRes && wrongTailRes.outcome === 'not_found' && wrongTailRes.rows.length === 0,
  outcomeOf(wrongTailRes));

const wrongCode = first.entry.verifyCode.slice(0, -1) + bumpHex(first.entry.verifyCode.slice(-1));
const wrongCodeRes = await resolveStageCertificateIdentifier(sql, wrongCode);
check(`a wrong verification code selects nothing (${wrongCode})`,
  wrongCodeRes && wrongCodeRes.outcome === 'not_found' && wrongCodeRes.rows.length === 0,
  outcomeOf(wrongCodeRes));

const wrongYear = `2025${String(first.row.id).padStart(6, '0')}`;
const wrongYearRes = await resolveStageCertificateIdentifier(sql, wrongYear);
check(`a barcode payload with the wrong year selects nothing (${wrongYear})`,
  wrongYearRes && wrongYearRes.outcome === 'not_found' && wrongYearRes.rows.length === 0,
  outcomeOf(wrongYearRes));

const wrongStage = first.entry.archiveRef.replace('/IDD/', '/IBT/');
const wrongStageRes = await resolveStageCertificateIdentifier(sql, wrongStage);
check(`an archive path with the wrong stage selects nothing (${wrongStage})`,
  wrongStageRes && wrongStageRes.outcome === 'not_found' && wrongStageRes.rows.length === 0,
  outcomeOf(wrongStageRes));

// A mistyped Student ID must be rejected on its check digit, before any
// query runs — otherwise a typo becomes a lookup that can land on a
// different student's certificate.
const badId = first.row.student_identity_no.slice(0, 14)
  + String((Number(first.row.student_identity_no[14]) + 1) % 10);
const queriesBefore = sql.queries.length;
const badIdRes = await resolveStageCertificateIdentifier(sql, badId);
check(`a Student ID failing its check digit is refused without a query (${badId})`,
  badIdRes === null && sql.queries.length === queriesBefore);

// ── Shape separation ────────────────────────────────────────────────────
// Nothing is guessed: each printed form is recognised as its own kind.
const EXPECTED_KIND = {
  serial: 'serial',
  'serial (lower case)': 'serial',
  'printed number': 'printed_no',
  'printed number without check tail': 'printed_no',
  'printed number (lower case)': 'printed_no',
  'student ID': 'student_id',
  'verification code (dashed)': 'verify_code',
  'verification code (undashed)': 'verify_code',
  'verification code (lower case)': 'verify_code',
  'verification code (spaced)': 'verify_code',
  'barcode payload': 'archive_barcode',
  'archive reference': 'archive_ref',
  'document id': 'document_id',
};
const kindMisreads = [];
for (const cert of certificates) {
  for (const [form, value] of Object.entries(identifiersFor(cert))) {
    const parsed = parseStageCertificateIdentifier(value);
    if (!parsed || parsed.kind !== EXPECTED_KIND[form]) {
      kindMisreads.push(`${value} read as ${parsed ? parsed.kind : 'nothing'}, expected ${EXPECTED_KIND[form]}`);
    }
  }
}
check('every printed form is recognised as its own kind', kindMisreads.length === 0,
  kindMisreads.slice(0, 4).join(' | '));

check('a reference from another document family is left alone',
  parseStageCertificateIdentifier('SHRS-HFZ-2026-000012') === null
  && parseStageCertificateIdentifier('SHRS-GRD-CERT-2026-000004') === null
  && parseStageCertificateIdentifier('') === null);

// ── Multiplicity policy ─────────────────────────────────────────────────
// Six of the seven identifiers name ONE document, so several matches is a
// fault and must fail closed. The Student ID names a PERSON, and one
// person may hold an Ibtida'iyyah AND an I'dadiyyah certificate.
//
// The rows below are SYNTHETIC — a fictitious student, a Student ID from
// far outside the issued range, and invented serials. No real graduate
// holds two certificates (checked: the two registers share no Student ID
// and no name), and this test must not imply otherwise.
const twoStageId = formatStudentIdentityNo(900_001);
const twoStageRows = [
  { id: 9001, serial_no: 'SHRS-CERT-IBT-2023-009001-AAAAA', student_identity_no: twoStageId,
    student_full_name: 'Test Student', programme_code: 'IBT', content_hash: 'aaaaa'.padEnd(64, '0'),
    issued_at: '2023-08-08', revoked_at: null },
  { id: 9002, serial_no: 'SHRS-CERT-IDD-2026-009002-BBBBB', student_identity_no: twoStageId,
    student_full_name: 'Test Student', programme_code: 'IDD', content_hash: 'bbbbb'.padEnd(64, '0'),
    issued_at: '2026-08-08', revoked_at: null },
];
const twoStageSql = fixtureSql([...rows, ...twoStageRows]);
const twoStage = await resolveStageCertificateIdentifier(twoStageSql, twoStageId);
check('a Student ID held by two stages returns the set, not one of them',
  twoStage && twoStage.outcome === 'multiple' && twoStage.personScoped && twoStage.rows.length === 2,
  outcomeOf(twoStage));
check('the set is ordered newest first, so the holder reads their latest certificate at the top',
  twoStage && twoStage.rows[0].serial_no === 'SHRS-CERT-IDD-2026-009002-BBBBB');

// Two certificates under one Student ID but in two different names is not
// a two-stage graduate — it is a broken record, and falls closed again.
const mismatchedSql = fixtureSql([...rows,
  twoStageRows[0], { ...twoStageRows[1], student_full_name: 'Different Person' }]);
const mismatched = await resolveStageCertificateIdentifier(mismatchedSql, twoStageId);
check('one Student ID over two different names is a fault, not a set',
  mismatched && mismatched.outcome === 'ambiguous', outcomeOf(mismatched));

// A printed number is engraved without its year, so two rows sharing a
// programme and sequence collapse to one engraved number. The global
// sequence forbids it; if it ever happens the verifier must refuse.
const collidedSql = fixtureSql([...rows,
  { id: 9101, serial_no: 'SHRS-CERT-IDD-2027-000042-CCCCC', student_identity_no: '999999999999999',
    student_full_name: 'Other Student', programme_code: 'IDD', content_hash: 'ccccc'.padEnd(64, '0'),
    issued_at: '2027-08-08', revoked_at: null }]);
const collided = await resolveStageCertificateIdentifier(collidedSql, 'SHRS-CERT-IDD-000042');
check('a printed number matching two rows fails closed rather than guessing',
  collided && collided.outcome === 'ambiguous' && !collided.personScoped,
  outcomeOf(collided));

// Same rule for the verification code: a 12-hex collision is a 48-bit
// event, so if it is ever seen it is tampering or duplication, not luck.
// The twin is built FROM the first certificate's real hash, so the collision is
// genuine under whatever key signed it rather than pinned to one era's digest.
const victim = IDD[0].row;
const victimPrefix = victim.content_hash.slice(0, 16);
const victimCode = victim.content_hash.slice(0, 12).toUpperCase()
  .replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3');
const hashTwinSql = fixtureSql([...rows,
  { id: 9102, serial_no: `SHRS-CERT-IDD-2027-009102-${victim.serial_no.slice(-5)}`,
    student_identity_no: '999999999999998',
    student_full_name: 'Other Student', programme_code: 'IDD',
    content_hash: victimPrefix + '0'.repeat(48), issued_at: '2027-08-08', revoked_at: null }]);
const hashTwin = await resolveStageCertificateIdentifier(hashTwinSql, victimCode);
check('a colliding verification code fails closed rather than guessing',
  hashTwin && hashTwin.outcome === 'ambiguous' && !hashTwin.personScoped,
  outcomeOf(hashTwin));

// ── The grade must never leave the building ─────────────────────────────
// Editorial Bible §1.5: grade_en is stored and hashed, but the certificate
// and its public attestation certify COMPLETION. The verifier selects
// sc.* (the integrity check has to rehash the stored grade), so nothing
// but this response shape stands between the column and the public — and
// this change added a SECOND response shape (the Student ID disambiguation
// list), which is why the rule is re-asserted here and not left to
// scripts/verify-register-import.mjs, where it is also checked as part of
// deciding whether a register may be imported.
// Comments are stripped first — the file explains the rule in prose, and a
// gate that reads its own documentation as a violation is no gate.
const verifySource = readText('functions/api/certificates/verify.js');
const verifyCode = verifySource
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((line) => line.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
const gradeHits = verifyCode.split('\n')
  .map((line, i) => ({ line: line.trim(), n: i + 1 }))
  .filter((l) => /grade/i.test(l.line));
check('functions/api/certificates/verify.js returns no grade field',
  gradeHits.length === 0,
  gradeHits.map((l) => `line ${l.n}: ${l.line}`).join(' | '));

// ── The DDL the lookups depend on ───────────────────────────────────────
// sql/schema.sql and setup.js are two copies of one schema, and the
// expression index only works if it is written exactly as the query writes
// its predicate — so the predicate, the index and its mirror are asserted
// against each other rather than eyeballed.
const schemaSql = readText('sql/schema.sql');
const setupJs = readText('functions/api/portal/setup.js');
// Matched as whole CREATE INDEX statements, not as loose substrings: both
// files explain these indexes in prose directly above them, and a gate
// that a comment can satisfy would have passed with the index deleted.
const HASH_PREFIX_INDEX = /CREATE INDEX IF NOT EXISTS idx_stage_certificates_hash_prefix ON stage_certificates \(left\(lower\(content_hash\), 12\)\)/;
const IDENTITY_INDEX = /CREATE INDEX IF NOT EXISTS idx_stage_certificates_identity_no ON stage_certificates\(student_identity_no\)/;
check('the content-hash prefix index exists in both schema copies',
  HASH_PREFIX_INDEX.test(schemaSql) && HASH_PREFIX_INDEX.test(setupJs));
check('the Student ID index exists in both schema copies',
  IDENTITY_INDEX.test(schemaSql) && IDENTITY_INDEX.test(setupJs));
check('the index expression matches the predicate the resolver emits',
  sql.queries.some((q) => q.text.includes('left(lower(sc.content_hash), 12)')));
for (const outcome of ['ambiguous', 'multiple']) {
  check(`verification_log accepts the '${outcome}' outcome in both schema copies`,
    new RegExp(`CHECK \\(outcome IN \\([^)]*'${outcome}'`).test(schemaSql)
    && new RegExp(`CHECK \\(outcome IN \\([^)]*'${outcome}'`).test(setupJs));
}

console.log(`\n${failures ? `${failures} FAILED` : 'every printed identifier resolves'}`);
process.exit(failures ? 1 : 0);
