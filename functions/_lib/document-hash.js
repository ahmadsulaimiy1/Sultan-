// Content-hash tamper-evidence for the Stage 3 Graduation Document
// ecosystem (docs/shrs-master-graduation-document-specification.md §3.5).
// HMAC-SHA256 over a canonical, versioned field set — using Node's
// `crypto` module via `nodejs_compat` (wrangler.toml), the same
// synchronous convention functions/_lib/otp.js and session.js already
// use in this Cloudflare Pages Functions runtime, rather than the
// Web Crypto `crypto.subtle` async API.
//
// The secret lives only in a Cloudflare environment variable
// (DOCUMENT_HASH_SECRET), never in the repository — same discipline as
// SESSION_SECRET. This module fails loudly if it's unset rather than
// silently hashing with an empty/predictable key.
import crypto from 'node:crypto';

// `fields` is a plain object; canonicalized as a stable, sorted-key JSON
// string so the same logical content always hashes identically
// regardless of the order its caller happened to build the object in.
function canonicalize(fields) {
  const sortedKeys = Object.keys(fields).sort();
  const ordered = {};
  for (const key of sortedKeys) ordered[key] = fields[key];
  return JSON.stringify(ordered);
}

// ── Key versioning ──────────────────────────────────────────────────────
// A signing key must be replaceable without invalidating what it already
// signed. A certificate is a permanent document: rotating the secret with no
// version recorded would make every previously issued certificate report
// "integrity check failed" — the system publicly calling genuine documents
// forgeries, which is worse than the compromise that prompted the rotation.
//
// So each document records the key version that signed it, and verification
// uses THAT key rather than whatever key happens to be current.
//
//   DOCUMENT_HASH_SECRET        the key that signs NEW documents
//   DOCUMENT_HASH_KEY_VERSION   which version that key is (integer, default 1)
//   DOCUMENT_HASH_SECRET_V<n>   a retired key, kept ONLY to verify its own era
//
// Retired keys are supplied through the environment like any other secret and
// are never written into this repository. That is not ceremony: version 1 is
// the development literal that was committed in plaintext and used to sign the
// 2026-08-08 batches, and re-committing it here — even labelled "retired" —
// would reinstate the exact pattern this versioning exists to end, and would
// read to a future maintainer as an acceptable practice.
const RETIRED_KEYS = {
  1: 'The development literal committed in plaintext at '
    + 'scripts/issue-certificate-batch.mjs:355 and used to sign the '
    + '2026-08-08 Ibtida’iyyah batch. Anyone with repository access can '
    + 'compute a matching serial suffix under it, so it must never sign again. '
    + 'Supply it as DOCUMENT_HASH_SECRET_V1 so those certificates keep '
    + 'verifying permanently.',
};

export function currentKeyVersion(env) {
  const raw = env.DOCUMENT_HASH_KEY_VERSION;
  if (raw === undefined || raw === null || raw === '') return 1;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`DOCUMENT_HASH_KEY_VERSION must be a positive integer, got "${raw}".`);
  }
  return n;
}

// The key that signs NEW documents. Refuses outright to sign with a retired
// version — a fail-closed that cannot be argued with at 2am.
function signingKey(env) {
  const version = currentKeyVersion(env);
  if (RETIRED_KEYS[version]) {
    throw new Error(`DOCUMENT_HASH_KEY_VERSION is ${version}, which is RETIRED and must never `
      + `sign a new document. ${RETIRED_KEYS[version]}`);
  }
  if (!env.DOCUMENT_HASH_SECRET) {
    throw new Error('DOCUMENT_HASH_SECRET is not configured — cannot compute a document content hash.');
  }
  return { key: env.DOCUMENT_HASH_SECRET, version };
}

// The key that verifies a document signed under `version`. Returns null rather
// than throwing when a retired key simply is not configured, because that is a
// DEPLOYMENT gap, not evidence of tampering, and the two must never be reported
// to the public as the same thing.
function verificationKey(env, version) {
  const current = currentKeyVersion(env);
  if (version === current) return env.DOCUMENT_HASH_SECRET || null;
  return env[`DOCUMENT_HASH_SECRET_V${version}`] || null;
}

export function computeDocumentHash(env, fields) {
  const { key, version } = signingKey(env);
  const fullHash = crypto.createHmac('sha256', key).update(canonicalize(fields)).digest('hex');
  return { fullHash, displayHash: fullHash.slice(0, 12), keyVersion: version };
}

// Recomputes the hash from the SAME field set a document was originally
// issued with (read back from graduation_documents / its snapshot
// tables) and compares against the stored content_hash — the actual
// tamper check the public verification endpoint runs on every request.
// Timing-safe by construction (fixed-length hex digests compared via
// crypto.timingSafeEqual), matching this project's standing rule
// against non-constant-time comparisons on security-relevant values.
// `keyVersion` is the version recorded ON THE DOCUMENT, not the current one.
// It defaults to 1 for rows written before versioning existed.
//
// Returns { ok, reason }. The reason matters: 'mismatch' means the record does
// not match its signature and is a real tamper signal; 'key_unavailable' means
// the retired key for this document's era is not configured in this
// environment, which is an operator's problem and must NEVER be shown to the
// public as a failed integrity check.
export function verifyDocumentHash(env, fields, storedFullHash, keyVersion = 1) {
  const version = Number(keyVersion) || 1;
  const key = verificationKey(env, version);
  if (!key) {
    return {
      ok: false,
      reason: 'key_unavailable',
      detail: `No key configured for document hash version ${version}`
        + (RETIRED_KEYS[version] ? ` (retired: set DOCUMENT_HASH_SECRET_V${version})` : ''),
    };
  }
  const fullHash = crypto.createHmac('sha256', key).update(canonicalize(fields)).digest('hex');
  const a = Buffer.from(fullHash, 'utf8');
  const b = Buffer.from(String(storedFullHash || ''), 'utf8');
  if (a.length !== b.length) return { ok: false, reason: 'mismatch' };
  return crypto.timingSafeEqual(a, b)
    ? { ok: true, reason: 'match' }
    : { ok: false, reason: 'mismatch' };
}

// Hashes a verifier's IP address for verification_log storage (spec
// §5.3 — raw IPs are never kept). SHA-256, not HMAC: this value is
// never compared against a secret-keyed input, only used to spot
// repeated-IP patterns in the institution's own anomaly review, so a
// plain, unkeyed digest is the correct (and simpler) tool here.
export function hashIpAddress(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(String(ip)).digest('hex');
}
