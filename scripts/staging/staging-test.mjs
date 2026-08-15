// STAGING VALIDATION — drives the real production verification endpoint
// against a real Postgres holding the real thirteen and the twenty-six
// regenerated certificates.
//
//   ./scripts/staging/run.sh
//
// Nothing here reimplements the endpoint. functions/api/certificates/verify.js
// is imported as-is and called with real Request objects, exactly as Cloudflare
// Pages calls it. The only substitution is the database transport (see
// loader.mjs), because Neon's HTTP driver cannot speak to a local cluster.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { onRequestGet } from '../../functions/api/certificates/verify.js';
import { displayStageCertificateNo } from '../../functions/_lib/certificate-serial.js';
import { close } from './shim-db.mjs';

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  // The scratch key the twenty-six were generated under. NOT a production
  // key, and deliberately so: staging must never hold the signing material
  // that makes a certificate authentic.
  DOCUMENT_HASH_SECRET: process.env.DOCUMENT_HASH_SECRET,
  DOCUMENT_HASH_KEY_VERSION: process.env.DOCUMENT_HASH_KEY_VERSION,
};

const call = async (ref) => {
  const req = new Request(`https://staging.local/api/certificates/verify?ref=${encodeURIComponent(ref)}`);
  const res = await onRequestGet({ request: req, env });
  return { status: res.status, body: await res.json() };
};

let pass = 0; let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ── The twenty-six regenerated certificates ─────────────────────────────
const DIR = new URL('../../dist/certificates', import.meta.url).pathname;
const entries = [];
for (const b of readdirSync(DIR).filter((d) => /-(QUR|TMH|IBT2026|IDD2026|PRY|JSS|SS)-/.test(d)).sort()) {
  const f = readdirSync(join(DIR, b))
    .find((x) => /^register-.*\.json$/.test(x) || x === 'graduation-register.json');
  if (!f) continue;
  for (const e of JSON.parse(readFileSync(join(DIR, b, f), 'utf8')).entries) entries.push(e);
}

console.log(`\nSTAGING VALIDATION — ${entries.length} regenerated certificates + the 13 already issued\n`);

// 1. QR RESOLUTION. The QR encodes /v/<serial>; _redirects rewrites that to
//    ?ref=<serial>. A parent's phone therefore arrives with the stored serial.
console.log('1. QR code path — the payload a parent\'s phone actually sends');
for (const e of entries) {
  const serial = e.qrUrl.replace(/^.*\/v\//, '');
  const r = await call(serial);
  check(`QR ${e.studentEn}`, r.status === 200 && r.body.found === true
    && r.body.status === 'active' && r.body.contentVerified === true,
  `status=${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
}

// 2. MANUAL ENTRY of the number printed on the sheet, tail-less as the Royal
//    College master prints it — the hardest input, because it under-specifies.
console.log('\n2. Manual entry — the number as printed, without its check tail');
for (const e of entries) {
  const tailless = displayStageCertificateNo(e.serialNo).replace(/-[0-9A-F]{5}$/, '');
  const r = await call(tailless);
  check(`typed "${tailless}" (${e.studentEn})`, r.status === 200 && r.body.found === true
    && r.body.serialNo === e.serialNo && r.body.contentVerified === true,
  `got ${r.body.serialNo || r.body.error}`);
}

// 3. THE PRINTED VERIFICATION CODE, as read off the sheet.
console.log('\n3. Printed verification code');
for (const e of entries) {
  const r = await call(e.verifyCode);
  check(`code ${e.verifyCode} (${e.studentEn})`, r.status === 200 && r.body.found === true
    && r.body.serialNo === e.serialNo, `got ${r.body.serialNo || r.body.error}`);
}

// 4. NO REGRESSION for the thirteen already issued. Their rows are the real
//    production rows, imported verbatim. Staging does not hold the v1/v2
//    signing keys — production does — so the hash cannot be recomputed here
//    and the endpoint must say so HONESTLY: found, but signature pending.
//    What is being tested is that adding twenty-six rows did not change how
//    an existing certificate resolves.
console.log('\n4. No regression — the 13 already issued still resolve');
const PRODUCTION_13 = [
  ['SHRS-CERT-IBT-2026-000035-368DC', 'Naheemah Ismail Seriki'],
  ['SHRS-CERT-IBT-2026-000036-B9E10', 'Aisha Anofi'],
  ['SHRS-CERT-IBT-2026-000037-22C49', 'Abdulbasit Adedokun'],
  ['SHRS-CERT-IBT-2026-000038-2944F', 'Naheemah Ismail'],
  ['SHRS-CERT-IBT-2026-000039-518A8', 'Ashrof Akorede'],
  ['SHRS-CERT-IBT-2026-000040-60DAF', 'Imran Adegoke'],
  ['SHRS-CERT-IBT-2026-000041-6F66F', 'Abdulateef Adedokun'],
  ['SHRS-CERT-IDD-2026-000042-56798', 'Muhammad Ismail Seriki'],
  ['SHRS-CERT-IDD-2026-000043-6EEAF', 'Baqi Olamiposi Anofi'],
  ['SHRS-CERT-IDD-2026-000044-8B125', 'Faridah Ayomide Aliu'],
  ['SHRS-CERT-IDD-2026-000045-F546F', 'Thoirah Makinde'],
  ['SHRS-CERT-IDD-2026-000046-7E37A', 'Abdulbasit Amobi Jabarr'],
  ['SHRS-CERT-IDD-2026-000047-CB9F5', 'Abdullah Oladimeji Anofi'],
];
for (const [serial, who] of PRODUCTION_13) {
  const r = await call(serial);
  const ok = r.status === 200 && r.body.found === true && r.body.serialNo === serial
    // Either fully verified (key present) or honestly reported as pending.
    // What must NEVER happen is 'not found' or 'hash_mismatch'.
    && r.body.status !== 'integrity_check_failed';
  check(`${serial} ${who}`, ok,
    `status=${r.body.status} outcome=${r.body.outcome} found=${r.body.found}`);
}

// 5. A NUMBER THAT DOES NOT EXIST must not resolve, and a WRONG CHECK TAIL on
//    a real sequence must not resolve either. Verification that says yes to
//    everything is worth nothing.
console.log('\n5. Negative controls');
const neg1 = await call('SHRS-CERT-JSS-2026-000099-ABCDE');
check('a certificate that does not exist is not found', neg1.body.found !== true,
  JSON.stringify(neg1.body).slice(0, 100));
const real = entries.find((e) => e.serialNo.includes('-JSS-'));
const wrongTail = displayStageCertificateNo(real.serialNo).replace(/-[0-9A-F]{5}$/, '-00000');
const neg2 = await call(wrongTail);
check(`a wrong check tail "${wrongTail}" is not found`, neg2.body.found !== true,
  JSON.stringify(neg2.body).slice(0, 100));
const neg3 = await call('SHRS-CERT-JSS-2026-000066-00000');
check('a forged suffix on a real sequence is not found', neg3.body.found !== true,
  JSON.stringify(neg3.body).slice(0, 100));

// 6. THE STUDENT ID names a PERSON, not a document. A child with two awards
//    must get an index, never a single verdict picked for them.
console.log('\n6. Student ID — a person, not a document');
const twoAwards = entries.filter((e) => e.identityNo === '717988020633236');
if (twoAwards.length) {
  const r = await call('717988020633236');
  check('Aisha Omoshalewa Anofi\'s Student ID returns an index, not one verdict',
    r.body.kind === 'student_certificate_index' || r.body.status === 'multiple_matches',
    `kind=${r.body.kind} status=${r.body.status}`);
}

console.log(`\n${'─'.repeat(64)}`);
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
await close();
process.exit(fail === 0 ? 0 : 1);
