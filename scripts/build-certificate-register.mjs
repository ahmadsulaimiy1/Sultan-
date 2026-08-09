// Builds and signs the offline certificate register.
//
// WHAT THIS DOES NOT DO, deliberately:
//   · It does not generate a key. The production key pair is the Founder's to
//     create and hold; a script that mints one invites it being minted twice,
//     or in a place it should not exist. See docs/shrs-certificate-offline.md
//     for the one openssl command that makes it.
//   · It does not print the private key, ever, in any mode.
//   · It does not read, alter, re-mint or renumber a single certificate. It
//     reads serial numbers and statuses and writes a signed list of digests.
//   · It does not touch DOCUMENT_HASH_SECRET. The register proves the school
//     published the list; it does not prove a certificate's integrity, and it
//     must never be able to.
//
// Usage:
//   CERT_REGISTER_PRIVATE_KEY=<base64 pkcs8>  DATABASE_URL=...  node scripts/build-certificate-register.mjs
//   node scripts/build-certificate-register.mjs --selftest     (no key, no database)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'verify-certificate', 'register.json');
const KEY_ID = process.env.CERT_REGISTER_KEY_ID || 'shrs-cert-v1';

/* The canonical form. This must agree BYTE FOR BYTE with canonicalBytes() in
 * js/shrs-certificate-offline.js — keys sorted at every level, no whitespace.
 * The fixture at the bottom pins both halves to the same string so a change to
 * either is caught here rather than as a mysterious signature failure on a
 * parent's phone. */
function canonicalise(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalise).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort()
      .map((k) => JSON.stringify(k) + ':' + canonicalise(value[k]))
      .join(',') + '}';
  }
  return JSON.stringify(value === undefined ? null : value);
}

function normaliseSerial(input) {
  return String(input || '').toUpperCase().replace(/\s+/g, '').trim();
}

function serialDigest(serial) {
  return crypto.createHash('sha256').update(normaliseSerial(serial), 'utf8').digest('hex').slice(0, 32);
}

function loadPrivateKey() {
  const raw = process.env.CERT_REGISTER_PRIVATE_KEY;
  if (!raw) {
    console.error('CERT_REGISTER_PRIVATE_KEY is not set.');
    console.error('Refusing to write an unsigned register: an unsigned register is one');
    console.error('every device will reject, and shipping one looks like a broken');
    console.error('deployment rather than a missing secret.');
    process.exit(2);
  }
  try {
    return crypto.createPrivateKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'pkcs8' });
  } catch (e) {
    console.error('CERT_REGISTER_PRIVATE_KEY is not a base64 PKCS#8 Ed25519 key.');
    process.exit(2);
  }
}

function sign(register, privateKey) {
  const bytes = Buffer.from(canonicalise(register), 'utf8');
  const signature = crypto.sign(null, bytes, privateKey);  // null algorithm = Ed25519
  return { ...register, signature: signature.toString('base64') };
}

async function readCertificates() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set — there is nothing to build a register from.');
    process.exit(2);
  }
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  // Serial and status only. Nothing about a child, and no content hash: the
  // register answers "was this issued", never "is this authentic".
  return sql`
    SELECT serial_no, status, issued_at
      FROM stage_certificates
     ORDER BY serial_no`;
}

/* ── The fixture that pins both implementations together ─────────────────── */

const FIXTURE = {
  version: 1,
  issuedAt: 1754697600000,
  keyId: 'shrs-cert-test',
  algorithm: 'Ed25519',
  entries: [{ h: 'abc', s: 'valid', d: '2026-08-08' }],
};
export const FIXTURE_CANONICAL =
  '{"algorithm":"Ed25519","entries":[{"d":"2026-08-08","h":"abc","s":"valid"}],'
  + '"issuedAt":1754697600000,"keyId":"shrs-cert-test","version":1}';

function selftest() {
  const produced = canonicalise(FIXTURE);
  if (produced !== FIXTURE_CANONICAL) {
    console.error('Canonical form has drifted.');
    console.error('  expected: ' + FIXTURE_CANONICAL);
    console.error('  produced: ' + produced);
    console.error('The browser half will reject every register this script signs.');
    process.exit(1);
  }
  // A throwaway pair, used only to prove sign/verify round-trips here. It is
  // never written to disk and never printed.
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const signed = sign(FIXTURE, privateKey);
  const ok = crypto.verify(null, Buffer.from(canonicalise(FIXTURE), 'utf8'),
    publicKey, Buffer.from(signed.signature, 'base64'));
  console.log(ok ? '  ✓ canonical form pinned, and sign/verify round-trips'
    : '  ✗ sign/verify failed');
  process.exit(ok ? 0 : 1);
}

async function main() {
  if (process.argv.includes('--selftest')) return selftest();

  const privateKey = loadPrivateKey();
  const rows = await readCertificates();
  const register = {
    version: 1,
    issuedAt: Date.now(),
    keyId: KEY_ID,
    algorithm: 'Ed25519',
    entries: rows.map((r) => ({
      h: serialDigest(r.serial_no),
      s: String(r.status || 'valid').toLowerCase() === 'revoked' ? 'revoked' : 'valid',
      d: r.issued_at ? new Date(r.issued_at).toISOString().slice(0, 10) : null,
    })),
  };

  if (!register.entries.length) {
    console.error('No certificates found. Refusing to publish an empty register,');
    console.error('which every device would read as "no certificate is recorded".');
    process.exit(2);
  }

  const signed = sign(register, privateKey);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(signed));

  // The public half, so the operator can pin it in TRUSTED_KEYS. Printing a
  // PUBLIC key is safe by definition; the private half is never touched here.
  const spki = crypto.createPublicKey(privateKey).export({ format: 'der', type: 'spki' }).toString('base64');
  console.log(`register written: ${path.relative(ROOT, OUT)}`);
  console.log(`  entries: ${register.entries.length}`);
  console.log(`  revoked: ${register.entries.filter((e) => e.s === 'revoked').length}`);
  console.log(`  keyId:   ${KEY_ID}`);
  console.log(`  public key (pin this in js/shrs-certificate-offline.js):\n    ${spki}`);
}

// Only when run directly. The acceptance test imports FIXTURE_CANONICAL from
// this file to pin the browser's canonical form to the signer's, and an
// unguarded main() would refuse-and-exit the moment it was imported.
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
