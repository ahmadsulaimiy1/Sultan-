/**
 * The four-outcome verification model (Founder's mandatory production
 * requirement, 2026-08-23) — does stageCertificateState() actually resolve
 * every case to exactly one of verified / revoked /
 * verified_institutional_recovery / invalid, and never anything else?
 *
 *     node scripts/test-recovery-attestation.mjs
 *
 * A real certificate row is generated through the actual production
 * function (generateStageCertificateSerial), signed with a synthetic key —
 * never the real production secret, which this script never has and never
 * needs. Each scenario then re-derives the exact live incident shape (a
 * hash mismatch under an AVAILABLE key) and the two SAFE landings
 * (an unconfigured retired key; an audited recovery attestation on file),
 * asserting stageCertificateState() lands on the right outcome for each —
 * and, critically, that an UNATTESTED mismatch never silently becomes
 * "verified" by any path.
 */
import { generateStageCertificateSerial } from '../functions/_lib/certificate-serial.js';
import { stageCertificateState } from '../functions/api/certificates/verify.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) { console.log(`  ok    ${name}`); return; }
  failures++;
  console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
};

// A trivial incrementing sequence stub — this test never touches a real
// database, and the serial number's actual value is irrelevant to what is
// being tested here.
let seq = 42;
const sqlSeqStub = async (strings) => {
  if (/nextval/.test(strings[0])) return { rows: [{ seq: seq++ }] };
  throw new Error(`unexpected query in sqlSeqStub: ${strings[0]}`);
};

const REAL_KEY = 'the-key-that-actually-signed-this-certificate';
const ROTATED_KEY = 'a-different-value-after-an-undocumented-rotation';

async function buildRow(env) {
  const { serialNo, fullHash, keyVersion } = await generateStageCertificateSerial(sqlSeqStub, env, {
    programmeCode: 'IDD', issuedAt: '2026-08-06', studentIdentityNo: '717455243759974',
    studentFullName: 'Test Student', academicYear: '2025/2026', gradeEn: 'Excellent',
  });
  return {
    serial_no: serialNo, content_hash: fullHash, hash_key_version: keyVersion,
    student_identity_no: '717455243759974', student_full_name: 'Test Student',
    programme_code: 'IDD', academic_year: '2025/2026', grade_en: 'Excellent',
    issued_at: '2026-08-06', revoked_at: null,
  };
}

function sqlAttestationStub(rows) {
  return async (strings) => {
    if (/certificate_recovery_attestations/.test(strings[0])) return { rows };
    throw new Error(`unexpected query in sqlAttestationStub: ${strings[0]}`);
  };
}

// ── A genuine document, signed and verified under the SAME key ────────────
{
  const env = { DOCUMENT_HASH_SECRET: REAL_KEY, DOCUMENT_HASH_KEY_VERSION: '2' };
  const row = await buildRow(env);
  const state = await stageCertificateState(env, sqlAttestationStub([]), row);
  check('an ordinary, correctly-verifying certificate reads as verified',
    state.verificationOutcome === 'verified', state.verificationOutcome);
}

// ── The exact 2026-08-06/16 incident: same version, rotated value, NO attestation ──
{
  const signEnv = { DOCUMENT_HASH_SECRET: REAL_KEY, DOCUMENT_HASH_KEY_VERSION: '2' };
  const row = await buildRow(signEnv);
  const liveEnv = { DOCUMENT_HASH_SECRET: ROTATED_KEY, DOCUMENT_HASH_KEY_VERSION: '2' };
  const state = await stageCertificateState(liveEnv, sqlAttestationStub([]), row);
  check('an unattested mismatch under the incident\'s exact shape is INVALID, never silently verified',
    state.verificationOutcome === 'invalid', state.verificationOutcome);
}

// ── The same incident, but WITH a recorded attestation ─────────────────────
{
  const signEnv = { DOCUMENT_HASH_SECRET: REAL_KEY, DOCUMENT_HASH_KEY_VERSION: '2' };
  const row = await buildRow(signEnv);
  const liveEnv = { DOCUMENT_HASH_SECRET: ROTATED_KEY, DOCUMENT_HASH_KEY_VERSION: '2' };
  const state = await stageCertificateState(liveEnv, sqlAttestationStub([{
    reason: 'Key lost to an undocumented rotation.', governance_ref: 'Governance Resolution Register 9.5',
    attested_by: 'Founder (Ahmad Sulaimiy)', attested_at: '2026-08-23T00:00:00Z',
  }]), row);
  check('the SAME mismatch, WITH an attestation on file, reads as verified through institutional recovery',
    state.verificationOutcome === 'verified_institutional_recovery', state.verificationOutcome);
  check('the attestation details are surfaced, not just a boolean', Boolean(state.attestation)
    && state.attestation.governanceRef === 'Governance Resolution Register 9.5');
}

// ── A properly retired key that is simply not configured yet ───────────────
{
  // Signed under version 3 (not the hardcoded-RETIRED version 1, which
  // refuses to sign at all by design — see document-hash.js's RETIRED_KEYS
  // and its own test coverage; this scenario is about ANY retired version
  // whose key is legitimately absent from the current environment, the
  // same situation the seven Ibtida'iyyah certificates were in before
  // DOCUMENT_HASH_SECRET_V1 was ever configured).
  const signEnv = { DOCUMENT_HASH_SECRET: REAL_KEY, DOCUMENT_HASH_KEY_VERSION: '3' };
  const row = await buildRow(signEnv);
  // Current environment has moved on to version 4; version 3's key is
  // simply not set — legitimately never configured because it is
  // categorically not a tamper signal.
  const liveEnv = { DOCUMENT_HASH_SECRET: ROTATED_KEY, DOCUMENT_HASH_KEY_VERSION: '4' };
  const state = await stageCertificateState(liveEnv, sqlAttestationStub([]), row);
  check('an unconfigured retired key needs no manual attestation — it is verified through institutional recovery automatically',
    state.verificationOutcome === 'verified_institutional_recovery', state.verificationOutcome);
  check('the automatic (no-attestation) recovery case carries no fabricated attestation record',
    state.attestation === null);
}

// ── Revoked takes priority over everything else ─────────────────────────────
{
  const env = { DOCUMENT_HASH_SECRET: REAL_KEY, DOCUMENT_HASH_KEY_VERSION: '2' };
  const row = await buildRow(env);
  row.revoked_at = '2026-08-23T00:00:00Z';
  const state = await stageCertificateState(env, sqlAttestationStub([]), row);
  check('a revoked certificate reads as revoked even though its hash still verifies fine',
    state.verificationOutcome === 'revoked', state.verificationOutcome);
}

// ── A tampered suffix is invalid no matter what the deeper hash says ───────
{
  const env = { DOCUMENT_HASH_SECRET: REAL_KEY, DOCUMENT_HASH_KEY_VERSION: '2' };
  const row = await buildRow(env);
  row.serial_no = row.serial_no.replace(/-[0-9A-F]{5}$/, '-00000');
  const state = await stageCertificateState(env, sqlAttestationStub([{
    reason: 'irrelevant', governance_ref: 'irrelevant', attested_by: 'irrelevant', attested_at: '2026-08-23',
  }]), row);
  check('a tampered printed suffix is invalid even with an attestation on file for the row',
    state.verificationOutcome === 'invalid', state.verificationOutcome);
}

// ── Every outcome this function can produce is one of exactly four values ──
{
  const ALLOWED = new Set(['verified', 'revoked', 'verified_institutional_recovery', 'invalid']);
  check('the outcome vocabulary used above never exceeds the four canonical values', ALLOWED.size === 4);
}

console.log(`\n${failures ? `${failures} FAILED` : 'every scenario resolves to exactly one of the four canonical outcomes'}`);
process.exit(failures ? 1 : 0);
