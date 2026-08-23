#!/usr/bin/env node
/**
 * Does every certificate this school has issued actually verify in public?
 *
 *     node scripts/verify-issued-certificates-live.mjs [--base https://shroyalschools.com] [--db <postgres-url>]
 *
 * WHY THIS EXISTS, IN ONE SENTENCE: certificates were printed, signed and
 * handed to graduands, and none of them resolved on the public verification
 * page — because minting a certificate and creating its record are two
 * different acts, and nothing checked that the second had happened.
 *
 * The issuing scripts write a document and an SQL file. The SQL file is
 * imported by a human. If that import is skipped, every artefact still looks
 * perfect — the sheet, the register, the press PDF — and the only place the
 * omission shows is the one place the school does not look: a stranger typing
 * the number into the public verifier and being told nothing is there.
 *
 * So this asks the public endpoint, in public, exactly what a holder asks it.
 * It reads the published registers under docs/graduation-registers/ and, for
 * EVERY certificate in them, checks EVERY identifier printed on the sheet:
 * the full serial, the engraved number with and without its check tail, the
 * document id, the archive reference, the verification code and the Student
 * ID. A certificate is only counted good when all of them resolve to it.
 *
 * REGISTER FILES ARE NOT THE WHOLE STORY (Founder's mandatory production
 * requirement, 2026-08-23: regression coverage of "every previously issued
 * certificate", not only the ones that happened to get a sealed register).
 * Certificates issued one at a time through the live Certificate Generation
 * Centre — 000048, 000049, 000050, and everything after — have no register
 * file at all. Pass --db and this ALSO reads every non-revoked serial
 * straight from stage_certificates and checks it, so the register files are
 * a floor, not a ceiling, on what this script covers.
 *
 * It sends nothing but numbers that are already printed on documents in
 * circulation, and it writes nothing (--db only reads). Run it after every
 * issuance, and again after any deployment that touches verification.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { displayStageCertificateNo } from '../functions/_lib/certificate-serial.js';

const argv = process.argv;
const flag = (name) => { const i = argv.indexOf(name); return i > 0 ? argv[i + 1] : null; };
const BASE = (flag('--base') || 'https://shroyalschools.com').replace(/\/$/, '');
const DB_URL = flag('--db');
const DIR = 'docs/graduation-registers';

const entries = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json') && /^\d{4}-/.test(x))) {
  const reg = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  for (const e of reg.entries || []) entries.push({ file: f, ...e });
}

// Every serial the register files did not name, straight from the database
// that actually decides what "issued" means. A minimal identifier set only
// (full serial, engraved number, Student ID) — the register-file entries
// keep checking every identifier a printed sheet carries; these carry the
// three that matter most for a certificate this script has no sheet layout
// for at all.
if (DB_URL) {
  let pg;
  try { ({ default: pg } = await import('pg')); } catch {
    console.error('\n  --db needs node-postgres, a devDependency: run `npm install` first.\n');
    process.exit(2);
  }
  const known = new Set(entries.map((e) => e.serialNo));
  const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
  try {
    const res = await pool.query(
      `SELECT serial_no, student_full_name, student_identity_no
         FROM stage_certificates WHERE revoked_at IS NULL ORDER BY id`);
    for (const row of res.rows) {
      if (known.has(row.serial_no)) continue;
      entries.push({
        file: '(database — no register file)', serialNo: row.serial_no,
        studentEn: row.student_full_name, identityNo: row.student_identity_no,
        minimalCheck: true,
      });
    }
  } finally {
    await pool.end();
  }
}

if (!entries.length) {
  console.error(`  No published registers found in ${DIR}${DB_URL ? ' and none in the database either' : ''}.`);
  process.exit(2);
}

// Every number a holder could reasonably type, in the order they are printed
// on the sheet. The Student ID is deliberately included even though it may
// legitimately return an index of several certificates for one person — that
// is a resolution, not a failure, and the check below treats it as one.
function identifiersFor(e) {
  const printed = displayStageCertificateNo(e.serialNo);
  const out = [
    ['full serial', e.serialNo],
    ['engraved number', printed],
    ['engraved, no check tail', printed.replace(/-[0-9A-F]{5}$/, '')],
    ['document id', e.documentId],
    ['archive reference', e.archiveRef],
  ];
  if (e.verifyCode) out.push(['verification code', e.verifyCode]);
  if (e.identityNo) out.push(['Student ID', e.identityNo]);
  return out.filter(([, v]) => v);
}

async function ask(ref) {
  const url = `${BASE}/api/certificates/verify?ref=${encodeURIComponent(ref)}`;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not JSON — reported below */ }
    // A non-JSON body or a non-200 is its own finding and must NOT be allowed
    // to fall through as a missing field. The first cut of this script did
    // exactly that: an unparseable response became `{}`, which has no
    // `status`, and every certificate was reported as "resolved but reports
    // status undefined" — a wrong diagnosis that pointed at the data when the
    // problem was the transport. A checking tool that misreads a failure is
    // worse than no tool.
    if (!res.ok || body === null) {
      return { badResponse: `HTTP ${res.status} ${res.headers.get('content-type') || ''}`
        + ` — ${text.slice(0, 120).replace(/\s+/g, ' ')}` };
    }
    return { httpStatus: res.status, ...body };
  } catch (err) {
    return { transportError: err && err.message ? err.message : String(err) };
  }
}

console.log(`\n  PUBLIC VERIFICATION — ${entries.length} issued certificate(s) against ${BASE}\n`);

let good = 0;
const faults = [];
for (const e of entries) {
  const checks = identifiersFor(e);
  const bad = [];
  for (const [label, ref] of checks) {
    const r = await ask(ref);
    if (r.transportError) { bad.push(`${label}: could not reach the endpoint — ${r.transportError}`); continue; }
    if (r.badResponse) { bad.push(`${label}: ${r.badResponse}`); continue; }
    if (r.error) { bad.push(`${label}: ${r.error}`); continue; }
    if (r.found === false) {
      // The distinction the endpoint now reports. Both are failures here —
      // this certificate IS issued — but they mean very different things and
      // the operator has to be told which.
      bad.push(r.referenceRecognised
        ? `${label}: recognised as an SHRS number, but NO RECORD is on file`
        : `${label}: not recognised as an SHRS number at all`);
      continue;
    }
    // A Student ID naming several certificates is a correct academic record.
    if (r.kind === 'student_certificate_index') {
      const held = (r.matches || []).some((m) => m.certificateNo
        && String(m.certificateNo).includes(String(e.serialNo).split('-').slice(-2, -1)[0]));
      if (!held) bad.push(`${label}: index returned, but this certificate is not in it`);
      continue;
    }
    if (r.status !== 'active' && !e.revoked) {
      bad.push(`${label}: resolved but reports status "${r.status}"`);
    }
  }
  if (bad.length) {
    faults.push({ e, bad });
    console.log(`    ✗ ${e.serialNo}  ${e.studentEn}`);
    for (const b of bad) console.log(`        ${b}`);
  } else {
    good += 1;
    console.log(`    · ${e.serialNo}  ${e.studentEn}   all ${checks.length} identifiers resolve`);
  }
}

console.log();
if (faults.length) {
  const missing = faults.filter((f) => f.bad.every((b) => b.includes('NO RECORD')));
  console.error(`  FAILED — ${faults.length} of ${entries.length} issued certificate(s) do not verify.\n`);
  if (missing.length) {
    console.error(`  ${missing.length} of them fail the same way: the number is recognised and no`);
    console.error('  record exists. That is a MISSING IMPORT, not a broken document — the');
    console.error('  certificates were minted but their rows were never created. Import');
    console.error('  docs/graduation-registers/<batch>.sql into the live database and re-run.\n');
  }
  process.exit(1);
}
console.log(`  PASSED — all ${good} issued certificate(s) verify on every identifier they print.\n`);
