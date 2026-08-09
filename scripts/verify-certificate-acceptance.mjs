#!/usr/bin/env node
/**
 * PRODUCTION ACCEPTANCE for certificate verification.
 *
 *   Against the live site (the only run that counts as acceptance):
 *     node scripts/verify-certificate-acceptance.mjs --base https://shroyalschools.com
 *
 *   Rehearsal against a local Postgres, running the REAL endpoint code:
 *     node --import ./scripts/_lib/neon-pg-register.mjs \
 *          scripts/verify-certificate-acceptance.mjs --local postgres://…/db
 *
 * WHAT THIS IS FOR. Thirteen certificates are in circulation and none of
 * them resolved publicly, because minting a document and creating its record
 * are two different acts and only the first had happened. A successful SQL
 * import does not prove the second act worked. Only asking the public
 * endpoint what a holder asks it proves that. So this script asks — for every
 * number printed on every sheet, and for the QR payload itself.
 *
 * IT IS ALSO A TEST OF WHAT THE PAGE SAYS WHEN IT DOES NOT KNOW. The failure
 * battery below deliberately feeds nonsense, near-misses, tampered records
 * and unknown states, and asserts the one rule that must never bend: no
 * unknown or ambiguous state may present as a valid credential. The public
 * page prints "Genuine — active credential" on exactly one condition,
 * `status === 'active'` (js/certificate-verify.js), so that is the field
 * asserted here.
 *
 * IT SENDS ONLY NUMBERS ALREADY PRINTED on documents in circulation, and it
 * writes nothing — except in --local mode, where the tamper and revocation
 * cases mutate a scratch database and put it back.
 *
 * THE MODE MATTERS AND IS REPORTED. A --local pass proves the code is
 * correct given a correctly imported database. It proves NOTHING about
 * production: not its data, not its secrets, not its deployment. The final
 * line says which was run, and a local run is reported as NOT VERIFIED LIVE.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { displayStageCertificateNo } from '../functions/_lib/certificate-serial.js';

const argv = process.argv.slice(2);
const argOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const BASE = argOf('--base');
const LOCAL = argOf('--local');
if (!BASE && !LOCAL) {
  console.error('  Give --base <origin> for the real acceptance run, or --local <postgres-url> to rehearse.');
  process.exit(2);
}

const DIR = 'docs/graduation-registers';
const entries = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json') && /^\d{4}-/.test(x))) {
  const reg = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  for (const e of reg.entries || []) entries.push({ file: f, programme: reg.programme, ...e });
}
entries.sort((a, b) => a.serialNo.localeCompare(b.serialNo));
if (!entries.length) { console.error(`  No published registers in ${DIR}.`); process.exit(2); }

// ── The transport. Both modes answer the same question; only the wire differs.
let ask;
if (LOCAL) {
  const mod = await import('../functions/api/certificates/verify.js');
  // env carries only DATABASE_URL by default. No signing secret is invented
  // here, ever: a rehearsal that supplies a made-up key would report every
  // certificate intact and prove the opposite of what it claims. Whatever
  // keys the operator has really exported are passed through as-is.
  const env = { DATABASE_URL: LOCAL };
  // DOCUMENT_HASH_KEY_VERSION travels with the keys and is not optional.
  // verificationKey() treats "the document's version equals the CURRENT
  // version" as the case that reads DOCUMENT_HASH_SECRET, so leaving the
  // version unset (it defaults to 1) makes the endpoint check the v1
  // Ibtida'iyyah certificates against the v2 key and report them as
  // MISMATCHED — the public page then tells seven graduands their genuine
  // documents do not match their signature. Forgetting to forward it here
  // reproduced exactly that, which is how the deployment requirement was
  // found; it is forwarded now so the rehearsal tests the real configuration.
  for (const k of Object.keys(process.env)) {
    if (k.startsWith('DOCUMENT_HASH_')) env[k] = process.env[k];
  }
  ask = async (ref) => {
    const request = new Request(`https://local.test/api/certificates/verify?ref=${encodeURIComponent(ref)}`);
    const res = await mod.onRequestGet({ request, env });
    const text = await res.text();
    try { return { httpStatus: res.status, ...JSON.parse(text) }; }
    catch { return { badResponse: `HTTP ${res.status} — ${text.slice(0, 120)}` }; }
  };
} else {
  const origin = BASE.replace(/\/$/, '');
  ask = async (ref) => {
    try {
      const res = await fetch(`${origin}/api/certificates/verify?ref=${encodeURIComponent(ref)}`,
        { headers: { accept: 'application/json' } });
      const text = await res.text();
      try { return { httpStatus: res.status, ...JSON.parse(text) }; }
      catch {
        return { badResponse: `HTTP ${res.status} ${res.headers.get('content-type') || ''}`
          + ` — ${text.slice(0, 120).replace(/\s+/g, ' ')}` };
      }
    } catch (err) { return { transportError: err && err.message ? err.message : String(err) }; }
  };
}

// ── Identifiers, exactly as they appear on the sheet ──────────────────────
// The QR code is included as a first-class case rather than assumed
// equivalent to the serial: the payload is a URL, the短 /v/ route rewrites it
// to ?ref=, and a holder pointing a phone at the code exercises that path and
// not the one a typist exercises.
function refFromQr(qrUrl) {
  if (!qrUrl) return null;
  const m = /\/v\/([^/?#]+)/.exec(qrUrl);
  if (m) return decodeURIComponent(m[1]);
  try { return new URL(qrUrl).searchParams.get('ref'); } catch { return null; }
}

function identifiersFor(e) {
  const printed = displayStageCertificateNo(e.serialNo);
  const out = [
    ['full serial', e.serialNo],
    ['engraved number', printed],
    ['engraved, no check tail', printed.replace(/-[0-9A-F]{5}$/, '')],
    ['document id', e.documentId],
    ['archive reference', e.archiveRef],
  ];
  if (e.verifyCode) {
    out.push(['verification code (as printed)', e.verifyCode]);
    out.push(['verification code (ungrouped)', e.verifyCode.replace(/[\s-]/g, '')]);
  }
  if (e.certId) {
    // Code 128-C holder barcode: <year><id6>, padded to an even 16 digits with
    // a leading zero, which undoBarcodePadding() strips.
    out.push(['archive barcode', `0${new Date(e.issuedAt || '2026-01-01').getUTCFullYear()}${String(e.certId).padStart(6, '0')}`.slice(-10)]);
  }
  const qr = refFromQr(e.qrUrl);
  if (qr) out.push(['QR payload', qr]);
  return out.filter(([, v]) => v);
}

// ── What a correct answer looks like for a document in circulation ────────
//
// Returns null, or { stage, why }. The STAGE matters and the two must never
// be collapsed. 'resolve' means the number did not reach its record — the
// missing-import failure. 'attest' means it reached the right record and the
// endpoint then declined to attest to it, which on a genuine certificate is
// almost always a deployment gap (a signing key absent from the environment),
// not a fault in the document. Reporting the second as "NOT RESOLVED" would
// send an operator hunting the database when the answer is in the secrets.
function judge(e, label, r) {
  const R = (why) => ({ stage: 'resolve', why });
  const A = (why) => ({ stage: 'attest', why });
  if (r.transportError) return R(`could not reach the endpoint — ${r.transportError}`);
  if (r.badResponse) return R(r.badResponse);
  if (r.error) return R(r.error);
  if (r.found === false) {
    return R(r.referenceRecognised
      ? 'recognised as an SHRS number, but NO RECORD is on file'
      : 'not recognised as an SHRS number at all');
  }
  if (r.kind === 'student_certificate_index') {
    // A Student ID names a person, and a person may hold several
    // certificates. That is a correct academic record, not a verdict, and it
    // must never be rendered as one — but this certificate has to be in it.
    if (r.status === 'active') return A('an index of several certificates reported itself as an active credential');
    const held = (r.matches || []).some((m) => m.certificateNo === displayStageCertificateNo(e.serialNo));
    return held ? null : R('index returned, but this certificate is not in it');
  }
  // Cross-checks. Resolving to SOMETHING is not the test; resolving to the
  // right child, award and number is.
  if (r.serialNo !== e.serialNo) return R(`resolved to ${r.serialNo}, not this certificate`);
  if (r.certificateNo !== displayStageCertificateNo(e.serialNo)) return R(`engraved number reported as ${r.certificateNo}`);
  if (r.recipientName !== e.studentEn) return R(`names ${r.recipientName}, certificate names ${e.studentEn}`);
  if (e.studentAr && r.recipientNameAr !== e.studentAr) return R('Arabic name disagrees with the certificate');
  if (r.studentIdentityNo !== e.identityNo) return R(`Student ID reported as ${r.studentIdentityNo}`);
  if (e.programme && r.programmeCode !== e.programme) return R(`programme reported as ${r.programmeCode}`);
  // The grade must never appear in a public attestation. It is a Transcript
  // field; a certificate certifies completion.
  if (r.grade_en || r.gradeEn || r.grade) return R('the public attestation leaked a grade');
  if (e.revoked) return r.status === 'revoked' ? null : A(`revoked certificate reports status "${r.status}"`);
  if (r.status === 'integrity_check_failed') {
    return A('resolved to the right record, but the endpoint will not attest to it '
      + '(integrity_check_failed — on a genuine certificate this is almost always a '
      + 'signing key missing from the deployment, not a bad document)');
  }
  if (r.status !== 'active') return A(`resolved but reports status "${r.status}"`);
  return null;
}

console.log(`\n  CERTIFICATE VERIFICATION — PRODUCTION ACCEPTANCE`);
console.log(`  ${entries.length} issued certificate(s) · ${LOCAL ? 'LOCAL REHEARSAL (real endpoint, local database)' : `LIVE: ${BASE}`}\n`);

// ── 1. Every identifier of every certificate ──────────────────────────────
const table = [];
let anyFail = false;
for (const e of entries) {
  const checks = identifiersFor(e);
  const failures = [];
  let qrResolved = null;
  let numberResolved = null;
  let lastStatus = null;
  let attestOnly = false;
  let resolveFailed = false;
  for (const [label, ref] of checks) {
    const r = await ask(ref);
    if (r.status) lastStatus = r.status;
    const v = judge(e, label, r);
    if (v) failures.push(`${label}: ${v.why}`);
    // Resolution and attestation are scored separately, so a deployment gap
    // does not masquerade in this table as a certificate that cannot be found.
    const resolved = !v || v.stage === 'attest';
    if (v && v.stage === 'attest') attestOnly = true;
    if (v && v.stage === 'resolve') resolveFailed = true;
    if (label === 'QR payload') qrResolved = resolved;
    if (label === 'engraved number') numberResolved = resolved;
  }
  const pass = failures.length === 0;
  // "Resolved" means no identifier failed to reach this certificate's record.
  // Attestation failures leave resolution intact by definition.
  const resolvedAll = !resolveFailed;
  if (!pass) anyFail = true;
  table.push({
    no: e.serialNo.split('-')[4], student: e.studentEn,
    qr: qrResolved === null ? '—' : qrResolved ? 'PASS' : 'FAIL',
    lookup: numberResolved === null ? '—' : numberResolved ? 'PASS' : 'FAIL',
    record: resolvedAll ? 'PASS' : 'FAIL',
    status: pass ? (e.revoked ? 'revoked' : 'active')
      : resolvedAll ? `NOT ATTESTED (${lastStatus || 'unknown'})` : 'NOT RESOLVED',
    checks: checks.length, failures,
  });
  console.log(`    ${pass ? '·' : '✗'} ${e.serialNo}  ${e.studentEn}${pass ? `   all ${checks.length} identifiers resolve` : ''}`);
  // An attestation gap is one fact about the certificate, not one per
  // identifier — printing it nine times buries it.
  const shown = attestOnly && resolvedAll ? [failures[0]] : failures;
  for (const f of shown) console.log(`        ${f}`);
  if (shown.length < failures.length) {
    console.log(`        (the same on all ${failures.length} identifiers — one record, one gap)`);
  }
}

// ── 2. The failure battery ────────────────────────────────────────────────
// Every one of these must fail CLOSED. The rule under test is single and
// absolute: nothing here may come back as an active credential.
console.log('\n  FAILURE STATES\n');
const sample = entries[0];
const printed = displayStageCertificateNo(sample.serialNo);
const cases = [
  ['nonexistent but well-formed SHRS number', 'SHRS-CERT-IBT-2026-009999-ABCDE',
    (r) => r.found === false && r.referenceRecognised === true],
  ['malformed / not an SHRS number', 'not-a-certificate-number',
    (r) => r.found === false && r.referenceRecognised === false],
  ['empty reference', '',
    (r) => r.httpStatus === 400 && !!r.error],
  ['right number, WRONG anti-forgery check tail', printed.replace(/-[0-9A-F]{5}$/, '-00000'),
    (r) => r.found === false],
  ['SQL-ish injection in the reference', "' OR 1=1 --",
    (r) => r.found === false || !!r.error],
  ['verification code one hex digit off',
    (sample.verifyCode || '').replace(/[\s-]/g, '').replace(/.$/, (c) => (c === '0' ? '1' : '0')),
    (r) => r.found === false],
  ['an unpadded 15-digit number that is not a valid Student ID', '999999999999999',
    (r) => r.found === false],
];
for (const [name, ref, ok] of cases) {
  const r = await ask(ref);
  const genuine = r.status === 'active';
  const passed = ok(r) && !genuine;
  if (!passed) anyFail = true;
  console.log(`    ${passed ? '·' : '✗'} ${name}`
    + (passed ? '' : `  → ${JSON.stringify({ found: r.found, status: r.status, recognised: r.referenceRecognised, error: r.error, http: r.httpStatus })}`));
}

// Multiple-match: a Student ID held by a child with more than one certificate.
{
  const counts = new Map();
  for (const e of entries) counts.set(e.identityNo, (counts.get(e.identityNo) || 0) + 1);
  const dup = [...counts].find(([, n]) => n > 1);
  if (dup) {
    const r = await ask(dup[0]);
    const passed = r.kind === 'student_certificate_index' && r.status !== 'active';
    if (!passed) anyFail = true;
    console.log(`    ${passed ? '·' : '✗'} Student ID held by ${dup[1]} certificates — returns an index, never a verdict`);
  } else {
    console.log('    · Student ID multiple-match — no child in this cohort holds two certificates; case not exercisable');
  }
}

// Tampered record and revocation are state changes, so they are exercised
// only against a scratch database, never against production.
if (LOCAL) {
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({ connectionString: LOCAL });
  const target = entries[0].serialNo;
  const before = (await pool.query('SELECT student_full_name, revoked_at, revocation_note FROM stage_certificates WHERE serial_no = $1', [target])).rows[0];
  try {
    await pool.query("UPDATE stage_certificates SET student_full_name = 'Tampered Name' WHERE serial_no = $1", [target]);
    const r = await ask(target);
    const passed = r.status !== 'active';
    if (!passed) anyFail = true;
    console.log(`    ${passed ? '·' : '✗'} tampered record (name altered in the database) — reports "${r.status}", not a valid credential`);
    await pool.query('UPDATE stage_certificates SET student_full_name = $2 WHERE serial_no = $1', [target, before.student_full_name]);

    await pool.query("UPDATE stage_certificates SET revoked_at = now(), revocation_note = 'acceptance test' WHERE serial_no = $1", [target]);
    const rv = await ask(target);
    const revOk = rv.status === 'revoked' && rv.status !== 'active';
    if (!revOk) anyFail = true;
    console.log(`    ${revOk ? '·' : '✗'} revoked certificate — reports "${rv.status}"`);
  } finally {
    await pool.query('UPDATE stage_certificates SET student_full_name = $2, revoked_at = $3, revocation_note = $4 WHERE serial_no = $1',
      [target, before.student_full_name, before.revoked_at, before.revocation_note]);
    await pool.end();
  }
}

// ── 3. The table ──────────────────────────────────────────────────────────
console.log('\n  ACCEPTANCE TABLE\n');
const w = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(`    ${w('Certificate', 12)}${w('Student', 30)}${w('QR', 6)}${w('Number Lookup', 15)}${w('Record', 8)}Status`);
console.log(`    ${'-'.repeat(12)}${'-'.repeat(30)}${'-'.repeat(6)}${'-'.repeat(15)}${'-'.repeat(8)}${'-'.repeat(14)}`);
for (const r of table) {
  console.log(`    ${w(r.no, 12)}${w(r.student, 30)}${w(r.qr, 6)}${w(r.lookup, 15)}${w(r.record, 8)}${r.status}`);
}

console.log();
if (anyFail) {
  const missing = table.filter((t) => t.failures.some((f) => f.includes('NO RECORD')));
  if (missing.length) {
    console.error(`  ${missing.length} certificate(s) fail because the number is recognised and no record`);
    console.error('  exists. That is a MISSING IMPORT, not a broken document. Import');
    console.error('  docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql and re-run.\n');
  }
  console.error(LOCAL ? '  REHEARSAL FAILED — and NOT VERIFIED LIVE.\n' : '  ACCEPTANCE FAILED.\n');
  process.exit(1);
}
if (LOCAL) {
  console.log('  Rehearsal passed: the real endpoint, against a correctly imported database,');
  console.log('  resolves every identifier on every issued certificate and fails closed on');
  console.log('  every unknown state.\n');
  console.log('  *** NOT VERIFIED LIVE. *** This proves the code, not production. Acceptance');
  console.log('  requires: node scripts/verify-certificate-acceptance.mjs --base https://shroyalschools.com\n');
  process.exit(0);
}
console.log(`  ACCEPTED — all ${table.length} issued certificate(s) verify on the live public endpoint,`);
console.log('  on every identifier they print and on their QR payload, and every unknown');
console.log('  state fails closed.\n');
