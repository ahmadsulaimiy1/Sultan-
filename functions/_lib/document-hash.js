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

export function computeDocumentHash(env, fields) {
  if (!env.DOCUMENT_HASH_SECRET) {
    throw new Error('DOCUMENT_HASH_SECRET is not configured — cannot compute a document content hash.');
  }
  const fullHash = crypto.createHmac('sha256', env.DOCUMENT_HASH_SECRET)
    .update(canonicalize(fields)).digest('hex');
  return { fullHash, displayHash: fullHash.slice(0, 12) };
}

// Recomputes the hash from the SAME field set a document was originally
// issued with (read back from graduation_documents / its snapshot
// tables) and compares against the stored content_hash — the actual
// tamper check the public verification endpoint runs on every request.
// Timing-safe by construction (fixed-length hex digests compared via
// crypto.timingSafeEqual), matching this project's standing rule
// against non-constant-time comparisons on security-relevant values.
export function verifyDocumentHash(env, fields, storedFullHash) {
  const { fullHash } = computeDocumentHash(env, fields);
  const a = Buffer.from(fullHash, 'utf8');
  const b = Buffer.from(String(storedFullHash || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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
