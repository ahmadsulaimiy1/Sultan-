#!/usr/bin/env node
/**
 * Key continuity gate — did DOCUMENT_HASH_SECRET actually stay the key it
 * claims to be?
 *
 *     DOCUMENT_HASH_SECRET=... DOCUMENT_HASH_KEY_VERSION=... \
 *       [DOCUMENT_HASH_SECRET_V1=... DOCUMENT_HASH_SECRET_V2=... ...] \
 *       node scripts/verify-key-continuity.mjs
 *
 * WHY THIS EXISTS. On 2026-08-06 a 64-byte production key was generated,
 * fingerprinted (24bb0f683233486a), and used to sign six I'dadiyyah
 * certificates as hash_key_version 2 — the full account is
 * docs/certificate-key-deployment.md. Sometime before 2026-08-16,
 * DOCUMENT_HASH_SECRET on Cloudflare was overwritten with a DIFFERENT value
 * while DOCUMENT_HASH_KEY_VERSION stayed at 2 — not the documented rotation
 * procedure (§4 of that file), which requires moving the old value to
 * DOCUMENT_HASH_SECRET_V2 and bumping the version FIRST. The result: six
 * genuine, unaltered certificates started reporting integrity_check_failed
 * to the public — the school's own verifier calling its own documents
 * forgeries — and nothing caught it until someone looked.
 *
 * Nothing in the deploy pipeline asked "is the key I am about to serve
 * verification with still the key that signed what is already out there?"
 * This script asks exactly that, against the one thing that is safe to
 * record without exposing the secret itself: its SHA-256 fingerprint,
 * first 16 hex characters, in docs/certificate-key-fingerprints.json.
 *
 * Run this after every deploy that could touch DOCUMENT_HASH_SECRET or
 * DOCUMENT_HASH_KEY_VERSION, and any time a rotation is performed — not
 * only when one is suspected. A check nobody runs is not a check.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Overridable so scripts/test-key-continuity.mjs can point this at a fixture
// manifest with synthetic fingerprints, rather than needing the real
// production key to exercise the match/mismatch logic.
const MANIFEST_PATH = process.env.KEY_FINGERPRINT_MANIFEST || 'docs/certificate-key-fingerprints.json';
const DEVELOPMENT_SECRET_V1 = 'batch-issuance-development-secret';

const fp = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

const currentVersionRaw = process.env.DOCUMENT_HASH_KEY_VERSION;
const currentVersion = currentVersionRaw === undefined || currentVersionRaw === ''
  ? 1 : Number(currentVersionRaw);
if (!Number.isInteger(currentVersion) || currentVersion < 1) {
  console.error(`REJECTED — DOCUMENT_HASH_KEY_VERSION must be a positive integer, `
    + `got "${currentVersionRaw}".`);
  process.exit(1);
}

// Every key this environment actually holds, keyed by the version it signs
// or verifies under: DOCUMENT_HASH_SECRET for the current version, plus
// every DOCUMENT_HASH_SECRET_V<n> present.
const held = new Map();
if (process.env.DOCUMENT_HASH_SECRET) held.set(currentVersion, process.env.DOCUMENT_HASH_SECRET);
for (const [k, v] of Object.entries(process.env)) {
  const m = /^DOCUMENT_HASH_SECRET_V(\d+)$/.exec(k);
  if (m && v) held.set(Number(m[1]), v);
}

if (!held.size) {
  console.error('REJECTED — no DOCUMENT_HASH_SECRET or DOCUMENT_HASH_SECRET_V<n> is set. '
    + 'There is nothing to check continuity of.');
  process.exit(1);
}

let problems = 0;
let checked = 0;
const notes = [];

for (const [version, secret] of [...held.entries()].sort((a, b) => a[0] - b[0])) {
  const entry = manifest.versions[String(version)];
  if (version === 1) {
    // Version 1 is the known-public development literal, not a fingerprint
    // entry — checked by direct comparison, the same way document-hash.js's
    // RETIRED_KEYS and this repo's own tests already identify it.
    const matches = secret === DEVELOPMENT_SECRET_V1;
    notes.push(`  v1  ${matches ? 'OK — matches the known development literal' : 'MISMATCH'}`);
    checked += 1;
    if (!matches) problems += 1;
    continue;
  }
  const live = fp(secret);
  if (!entry || !entry.fingerprint) {
    notes.push(`  v${version}  UNRECORDED — live fingerprint ${live}. `
      + `Add {"fingerprint": "${live}", "recordedAt": "<today>", ...} to `
      + `${MANIFEST_PATH} under "${version}" if this is the FIRST time this `
      + 'version has been deployed. If this version was already recorded '
      + 'and you are seeing this instead of a match line below, the '
      + `manifest is missing an entry it should have — stop and investigate `
      + 'before treating this as routine.');
    checked += 1;
    continue;
  }
  const matches = live === entry.fingerprint;
  notes.push(`  v${version}  ${matches ? `OK — matches recorded ${entry.fingerprint}`
    : `MISMATCH — recorded ${entry.fingerprint}, live key fingerprints as ${live}. `
      + 'This is the exact failure mode of 2026-08-06/16: the value behind this '
      + 'version changed without the version number changing. Every document '
      + 'signed under this version will now report a false hash mismatch. Do '
      + 'NOT treat this as "fix the manifest" — the manifest recorded the key '
      + 'that actually signed real documents. Restore the correct key, or if '
      + 'it is genuinely lost, bump DOCUMENT_HASH_KEY_VERSION forward so this '
      + 'version reports key_unavailable (an honest gap) instead of a mismatch '
      + '(a false tamper signal) — see docs/certificate-key-deployment.md §7.'}`);
  checked += 1;
  if (!matches) problems += 1;
}

console.log(`Key continuity — ${held.size} key(s) held, current version ${currentVersion}\n`);
console.log(notes.join('\n'));
console.log(`\n${checked - problems}/${checked} versions confirmed unchanged since they were recorded.`);
if (problems) {
  console.error(`\n${problems} PROBLEM(S) — see above. This is not routine drift; `
    + 'it means already-issued certificates are affected right now.');
  process.exit(1);
}
console.log('\nNo drift detected.');
