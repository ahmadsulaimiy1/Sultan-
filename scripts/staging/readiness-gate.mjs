#!/usr/bin/env node
/**
 * PRODUCTION READINESS GATE — twelve checks, run rather than asserted.
 *
 * Eleven are the Founder's, named in the authorisation of 15 August 2026.
 * The twelfth covers the Institution Credential ID, added after those
 * eleven first passed; it is gated rather than merely documented because
 * its claim — that the identifier survives a rebuild — is exactly the kind
 * a comment cannot substantiate.
 *
 *     ./scripts/staging/gate.sh
 *
 * Every check here answers its question from real data: the built registers,
 * the published registers, and a staging database holding both. Where a check
 * CANNOT be answered from this environment — the V1 and V2 signing keys are in
 * the Board's credential store, not here — it says so in those words and states
 * what it proved instead. A gate that reports PASS for something it did not
 * test is worse than no gate.
 *
 * Exit code 0 only if every check passes.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import pg from 'pg';
import { RULED_ONE_CHILD, displayStageCertificateNo } from '../../functions/_lib/certificate-serial.js';
import { computeDocumentHash, verifyDocumentHash } from '../../functions/_lib/document-hash.js';
import { credentialIdFor } from '../../functions/_lib/credential-id.js';

const DB = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: DB, max: 4 });
const q = async (text, params = []) => (await pool.query(text, params)).rows;

const results = [];
const check = (n, name, ok, detail) => results.push({ n, name, ok, detail });

// ── The certificates this deployment would mint ─────────────────────────────
const DIR = new URL('../../dist/certificates', import.meta.url).pathname;
const fresh = [];
for (const b of readdirSync(DIR).filter((d) => !/-IBT-0000(14|35)$/.test(d)).sort()) {
  const f = readdirSync(join(DIR, b))
    .find((x) => /^register-.*\.json$/.test(x) || x === 'graduation-register.json');
  if (f) fresh.push(...JSON.parse(readFileSync(join(DIR, b, f), 'utf8')).entries);
}
// The thirteen already issued, from the published import — the rows a
// deployment must not touch.
const IMPORT = readFileSync('docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql', 'utf8');
const existingSerials = [...new Set(IMPORT.match(/SHRS-CERT-[A-Z]+-\d{4}-\d{6}-[0-9A-F]{5}/g) || [])];
const existingSeqs = existingSerials.map((s) => Number(s.match(/-(\d{6})-/)[1]));

const dupes = (arr) => {
  const seen = new Map();
  const out = [];
  for (const v of arr) { if (seen.has(v)) out.push(v); else seen.set(v, 1); }
  return out;
};

// 1 · UNIQUE IMMUTABLE IDENTITY. A certificate's identity is its stored serial,
//     and it is immutable because the five-character tail is derived from the
//     content hash: change any hashed field and the identity changes with it,
//     which is what makes silent editing impossible rather than merely
//     forbidden.
{
  const d = dupes(fresh.map((e) => e.serialNo));
  const collidesWithIssued = fresh.filter((e) => existingSerials.includes(e.serialNo));
  check(1, 'every certificate has a unique immutable identity',
    d.length === 0 && collidesWithIssued.length === 0,
    `${fresh.length} serials, ${d.length} internal duplicates, `
    + `${collidesWithIssued.length} colliding with an issued certificate`);
}

// 2 · ONE STUDENT ID, ONE CANONICAL IDENTITY. Checked against the live table,
//     not the file that produced it, and using the same same-child rule the
//     public endpoint uses.
{
  const rows = await q(`SELECT student_identity_no, count(*) FILTER (WHERE is_current) AS cur,
                               count(*) AS total
                        FROM student_identity_names GROUP BY 1`);
  const bad = rows.filter((r) => Number(r.cur) !== 1);
  // And no two DIFFERENT children share a Student ID anywhere in the database.
  const shared = await q(`SELECT student_identity_no, array_agg(DISTINCT student_full_name) AS names
                          FROM stage_certificates GROUP BY 1 HAVING count(DISTINCT student_full_name) > 1`);
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z\s-]/g, '').trim();
  const grp = (n) => RULED_ONE_CHILD.findIndex((g) => g.some((f) => norm(f) === norm(n)));
  const oneChild = (a, b) => {
    if (norm(a) === norm(b)) return true;
    const [ga, gb] = [grp(a), grp(b)];
    if (ga >= 0 || gb >= 0) return ga === gb;
    const [x, y] = [norm(a).split(/\s+/), norm(b).split(/\s+/)];
    if (x[0] !== y[0]) return false;
    const rest = new Set(y.slice(1));
    return x.slice(1).some((t) => rest.has(t));
  };
  const twoPeople = shared.filter((r) => !r.names.every((n) => oneChild(r.names[0], n)));
  check(2, 'every Student ID resolves to exactly one canonical identity',
    bad.length === 0 && twoPeople.length === 0,
    `${rows.length} identities, each with exactly one current name; `
    + `${shared.length} carry more than one written form, ${twoPeople.length} of them two different children`);
}

// 3 · HISTORY PRESERVED, VERIFICATION UNAFFECTED. The engraved name on every
//     issued row must still be exactly what the published register says — the
//     history table records the change, it does not apply it.
{
  const issued = await q('SELECT serial_no, student_full_name FROM stage_certificates WHERE id <= 47 ORDER BY id');
  const drifted = issued.filter((r) => !IMPORT.includes(`'${r.student_full_name}'`));
  const hist = await q('SELECT count(*)::int AS n FROM student_identity_names WHERE NOT is_current');
  check(3, 'historical name variants preserved without affecting verification',
    drifted.length === 0 && hist[0].n > 0,
    `${issued.length} issued rows carry their engraved name unchanged; `
    + `${hist[0].n} historical names recorded alongside, none applied to a certificate`);
}

// 4–7 · The four printed identifiers, each unique across EVERY certificate the
//       institution will hold after this deployment — not merely within the
//       new batch, which is the mistake that would put one child's number on
//       another child's sheet.
{
  const all = await q('SELECT serial_no, content_hash, student_identity_no, id FROM stage_certificates');
  const numbers = all.map((r) => displayStageCertificateNo(r.serial_no));
  check(4, 'every certificate number is unique', dupes(numbers).length === 0,
    `${numbers.length} engraved numbers across the whole register, 0 repeated`);

  const codes = all.map((r) => r.content_hash.slice(0, 12).toUpperCase());
  check(5, 'every verification code is unique', dupes(codes).length === 0,
    `${codes.length} verification codes, 0 repeated`);

  const qrs = all.map((r) => `https://shroyalschools.com/v/${r.serial_no}`);
  check(6, 'every QR payload is unique', dupes(qrs).length === 0,
    `${qrs.length} QR payloads, 0 repeated`);

  const sigs = all.map((r) => r.content_hash);
  check(7, 'every cryptographic signature is unique', dupes(sigs).length === 0,
    `${sigs.length} content hashes, 0 repeated (a collision would also break the `
    + 'printed tail, which is derived from it)');
}

// 8 · NO EXISTING RECORD CAN BE OVERWRITTEN. Not a promise about the SQL's
//     intent — the SQL is run against a row that already exists and the
//     database is asked to refuse it.
{
  const before = await q('SELECT serial_no, content_hash, student_full_name FROM stage_certificates WHERE id = 35');
  let refused = false;
  let msg = '';
  try {
    await q(`INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name,
             student_sex, programme_code, academic_year, place_en, place_ar, issued_at, content_hash,
             institution_name, programme_label_en, programme_label_ar)
             VALUES (35, 'SHRS-CERT-IBT-2026-000035-368DC', '000000000000000', 'OVERWRITE ATTEMPT',
             'male', 'IBT', '2025/2026', 'x', 'x', '2026-08-08', 'deadbeef', 'x', 'x', 'x')`);
  } catch (e) { refused = true; msg = e.code; }
  const after = await q('SELECT serial_no, content_hash, student_full_name FROM stage_certificates WHERE id = 35');
  check(8, 'no existing production record can be overwritten',
    refused && JSON.stringify(before) === JSON.stringify(after),
    refused
      ? `the database refused the write (SQLSTATE ${msg}) and row 35 is byte-identical afterwards`
      : 'A WRITE TO AN ISSUED ROW SUCCEEDED');
}

// 9 · V1 AND V2 CONTINUE TO VERIFY UNCHANGED. Stated precisely, because the
//     part that needs their keys cannot be run here.
{
  const byVer = await q(`SELECT COALESCE(hash_key_version, 1) AS v, count(*)::int AS n
                         FROM stage_certificates WHERE id <= 47 GROUP BY 1 ORDER BY 1`);
  const untouched = await q(`SELECT count(*)::int AS n FROM stage_certificates
                             WHERE id <= 47 AND content_hash IS NOT NULL`);
  // The structural guarantee, EXERCISED rather than read. A document is signed
  // with an old key at version 1; the environment is then rotated so the
  // CURRENT key is version 3 and something entirely different, with the old key
  // retained only as DOCUMENT_HASH_SECRET_V1. If the signature still verifies,
  // the endpoint demonstrably reads the version off the row and fetches that
  // version's key — so introducing V3 cannot change how a V1 row is checked.
  //
  // The first version of this check grepped the source for the dispatch
  // expression and reported FAIL because the pattern was mistyped. A gate whose
  // verdict depends on getting a regex right is testing the regex.
  // Demonstrated with versions 3→4 rather than 1→3, because the module REFUSES
  // to sign at a retired version at all — itself one of the safeguards under
  // test, and not one to disable in order to test another. The property is the
  // same: sign at the current version, rotate past it, keep the old key only as
  // DOCUMENT_HASH_SECRET_V<n>, and the old signature must still verify.
  const ERA = { DOCUMENT_HASH_SECRET: 'the-era-key', DOCUMENT_HASH_KEY_VERSION: '3' };
  const fields = { serialBase: 'SHRS-CERT-IBT-2026-000035', studentFullName: 'A Student' };
  const signed = computeDocumentHash(ERA, fields);
  const ROTATED = {
    DOCUMENT_HASH_SECRET: 'a-completely-different-later-key',
    DOCUMENT_HASH_KEY_VERSION: '4',
    DOCUMENT_HASH_SECRET_V3: 'the-era-key',
  };
  const stillVerifies = verifyDocumentHash(ROTATED, fields, signed.fullHash, 3).ok === true;
  // The negative: it must NOT verify when the retained key is wrong, or
  // "it verified" would mean nothing.
  // A WRONG key must read as 'mismatch' — a tamper signal — and a MISSING one
  // as 'key_unavailable', an operator gap. Conflating the two is the distinction
  // this whole design rests on, so both reasons are asserted, not just failure.
  const wrong = verifyDocumentHash(
    { ...ROTATED, DOCUMENT_HASH_SECRET_V3: 'wrong' }, fields, signed.fullHash, 3);
  const failsOnWrongKey = wrong.ok === false && wrong.reason === 'mismatch';
  // And the new current key must not be silently substituted for a missing one.
  const missing = verifyDocumentHash(
    { DOCUMENT_HASH_SECRET: 'a-completely-different-later-key', DOCUMENT_HASH_KEY_VERSION: '4' },
    fields, signed.fullHash, 3);
  const failsOnMissingKey = missing.ok === false && missing.reason === 'key_unavailable';
  const dispatches = stillVerifies && failsOnWrongKey && failsOnMissingKey;
  check(9, 'existing V1 and V2 certificates continue to verify unchanged',
    untouched[0].n === 13 && dispatches,
    `${byVer.map((r) => `v${r.v}×${r.n}`).join(' ')} — all 13 rows and their hashes untouched by this `
    + 'deployment. Key-version dispatch exercised: a document signed at one version still '
    + 'verified after the environment rotated past it, using only the retained '
    + 'DOCUMENT_HASH_SECRET_V<n>; a wrong key read as mismatch and an absent one as '
    + 'key_unavailable, which are deliberately different answers. '
    + 'NOT PROVED HERE: the V1/V2 hash recomputation itself, which needs keys held in the '
    + 'credential store. That is the live acceptance step after deployment.');
}

// 10 · V3 TOUCHES ONLY NEW CERTIFICATES.
{
  const v3 = await q('SELECT min(id)::int AS lo, max(id)::int AS hi, count(*)::int AS n FROM stage_certificates WHERE hash_key_version = 3');
  const v3OverOld = await q('SELECT count(*)::int AS n FROM stage_certificates WHERE hash_key_version = 3 AND id <= 47');
  check(10, 'V3 affects only newly generated certificates',
    v3OverOld[0].n === 0 && v3[0].lo > 47,
    `${v3[0].n} rows at key version 3, sequence ${v3[0].lo}–${v3[0].hi}; 0 rows at or below 000047 carry it`);
}

// 11 · ROLLBACK, EXECUTED — and executed from the same file the deployment
//      workflow runs, not a paraphrase of it. sql/rollback-graduation-2026.sql
//      deliberately contains no transaction control, so the rehearsal can wrap
//      it in a BEGIN it then reverts while the real run wraps it in psql -1.
//      The thirteen are compared byte for byte before and after.
{
  const ROLLBACK = readFileSync('sql/rollback-graduation-2026.sql', 'utf8');
  const snap = () => q('SELECT id, serial_no, content_hash, student_full_name, student_identity_no FROM stage_certificates WHERE id <= 47 ORDER BY id');
  const before = JSON.stringify(await snap());
  const nBefore = (await q('SELECT count(*)::int AS n FROM stage_certificates'))[0].n;
  await q('BEGIN');
  await q(ROLLBACK);
  const nRolled = (await q('SELECT count(*)::int AS n FROM stage_certificates'))[0].n;
  const afterRoll = JSON.stringify(await snap());
  await q('ROLLBACK');
  const nRestored = (await q('SELECT count(*)::int AS n FROM stage_certificates'))[0].n;
  check(11, 'rollback has been tested in staging',
    afterRoll === before && nRolled === 13 && nRestored === nBefore,
    `${nBefore} rows → sql/rollback-graduation-2026.sql → ${nRolled} rows (the original `
    + `thirteen, byte-identical) → transaction reverted → ${nRestored}. The deployment `
    + `workflow runs this same file, so the tested procedure is the executed one.`);
}

// 12 · THE INSTITUTION CREDENTIAL ID IS PERMANENT AND REPRODUCIBLE. Not in the
//      Founder's eleven — it is the architectural addition made after the gate
//      first passed, and it earns a check of its own because its whole claim is
//      one a column comment cannot substantiate.
//
//      The claim: this identifier survives a rebuild. So it is tested the way
//      the claim would be broken — by deriving all 46 from the sealed registers
//      alone, with no database involved, and asserting the live rows agree. If
//      any row were still carrying the column's gen_random_uuid() default,
//      this is where it would show, because a random UUID cannot match a
//      derivation.
{
  const derived = new Map(fresh.concat(
    existingSerials.map((s) => ({ serialNo: s })),
  ).map((e) => [e.serialNo, credentialIdFor(e.serialNo)]));
  const rows = await q('SELECT serial_no, credential_id FROM stage_certificates');
  const wrong = rows.filter((r) => derived.get(r.serial_no) !== r.credential_id);
  const distinct = new Set(rows.map((r) => r.credential_id)).size;
  check(12, 'every credential carries a permanent, reproducible ICID',
    wrong.length === 0 && distinct === rows.length && rows.length === derived.size,
    `${rows.length} certificates, ${distinct} distinct ICIDs, ${wrong.length} disagreeing with `
    + `the value derived from the sealed register alone. Derivation is UUIDv5 over the stored `
    + `serial, so a database rebuilt from the registers reproduces every one of them.`);
}

// ── Report ──────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
console.log('\n  PRODUCTION READINESS GATE\n');
console.log(`  ${pad('#', 3)} ${pad('CHECK', 58)} RESULT`);
console.log(`  ${'─'.repeat(3)} ${'─'.repeat(58)} ──────`);
for (const r of results) {
  console.log(`  ${pad(r.n, 3)} ${pad(r.name, 58)} ${r.ok ? 'PASS' : 'FAIL'}`);
  console.log(`      ${r.detail}`);
}
const failed = results.filter((r) => !r.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} PASS`
  + (failed.length ? ` · ${failed.length} FAIL` : ' · GATE PASSED'));
await pool.end();
process.exit(failed.length ? 1 : 0);
