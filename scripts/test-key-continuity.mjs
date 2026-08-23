/**
 * Does scripts/verify-key-continuity.mjs actually catch the incident it was
 * built to catch?
 *
 *     node scripts/test-key-continuity.mjs
 *
 * The 2026-08-06/16 incident (docs/certificate-key-deployment.md §7) was a
 * version number that silently stopped matching the value behind it — this
 * runs the real checker script, as a subprocess, against synthetic keys and
 * a fixture manifest (KEY_FINGERPRINT_MANIFEST), so it never touches the
 * real production key and cannot be satisfied by a re-implementation that
 * quietly agrees with itself.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = 'scripts/verify-key-continuity.mjs';
const DEV_SECRET = 'batch-issuance-development-secret';
const fp = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) { console.log(`  ok    ${name}`); return; }
  failures++;
  console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
};

const dir = mkdtempSync(join(tmpdir(), 'key-continuity-test-'));
const SYNTHETIC_SECRET = 'a synthetic key, never used to sign anything real';
const manifestPath = join(dir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify({
  versions: {
    1: { fingerprint: null },
    2: { fingerprint: fp(SYNTHETIC_SECRET), recordedAt: 'test fixture' },
  },
}));

function run(env) {
  try {
    const out = execFileSync('node', [SCRIPT], {
      env: { ...process.env, KEY_FINGERPRINT_MANIFEST: manifestPath, ...env },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

// ── v1: the known development literal passes; anything else fails ─────────
{
  const r = run({ DOCUMENT_HASH_SECRET_V1: DEV_SECRET });
  check('v1 matching the known development literal exits clean', r.code === 0);
  check('v1 match is reported as OK, not a problem', /v1\s+OK/.test(r.out) && !/PROBLEM/.test(r.out));
}
{
  const r = run({ DOCUMENT_HASH_SECRET_V1: 'not the development literal' });
  check('v1 NOT matching the development literal fails', r.code === 1);
  check('v1 mismatch is reported as MISMATCH', /v1\s+MISMATCH/.test(r.out));
}

// ── v2: the exact shape of the real incident — right version, wrong value ──
{
  const r = run({ DOCUMENT_HASH_SECRET: SYNTHETIC_SECRET, DOCUMENT_HASH_KEY_VERSION: '2' });
  check('v2 matching its recorded fingerprint exits clean', r.code === 0);
  check('v2 match names the recorded fingerprint', r.out.includes(fp(SYNTHETIC_SECRET)));
}
{
  const r = run({ DOCUMENT_HASH_SECRET: 'a rotated value, same version number', DOCUMENT_HASH_KEY_VERSION: '2' });
  check('the 2026-08-06/16 incident shape (right version, wrong value) is caught', r.code === 1);
  check('the incident is reported as a MISMATCH naming both fingerprints',
    /v2\s+MISMATCH/.test(r.out) && r.out.includes(fp(SYNTHETIC_SECRET)));
  check('the failure message points at the real remediation, not "fix the manifest"',
    /DOCUMENT_HASH_KEY_VERSION forward/.test(r.out));
}

// ── An undeployed version is reported, not silently ignored ───────────────
{
  const r = run({ DOCUMENT_HASH_SECRET: 'brand new key material', DOCUMENT_HASH_KEY_VERSION: '3' });
  check('a version with no manifest entry is flagged UNRECORDED, not skipped', /v3\s+UNRECORDED/.test(r.out));
  check('an unrecorded version alone is not itself a failure (first deploy is not an incident)', r.code === 0);
}

// ── No key configured at all refuses outright ──────────────────────────────
{
  const r = run({});
  check('no key configured at all is REJECTED, not silently passed', r.code === 1 && /REJECTED/.test(r.out));
}

rmSync(dir, { recursive: true, force: true });

console.log(`\n${failures ? `${failures} FAILED` : 'the continuity checker catches its own incident'}`);
process.exit(failures ? 1 : 0);
