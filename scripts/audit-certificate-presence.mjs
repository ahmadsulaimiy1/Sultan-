#!/usr/bin/env node
/**
 * READ-ONLY forensic audit: does ANY database record exist for a given
 * certificate sequence number, regardless of programme code?
 *
 * Ordinary verification (scripts/verify-certificate-acceptance.mjs) asks
 * "does THIS exact printed number resolve?" — useful once you know what's
 * printed. This script asks a different, prior question: "does row id N
 * exist in stage_certificates AT ALL, under any programme?" It does this via
 * the archive-barcode identifier shape (`<year><seq6>`, e.g. "2026000048"),
 * which resolves by `sc.id = seq AND year(issued_at) = year` — the ONE
 * lookup path in functions/_lib/certificate-serial.js that does not require
 * knowing or guessing the programme code first.
 *
 * This assumes the row's primary key `id` equals its certificate sequence
 * number, which is true for every row this project has ever inserted (see
 * docs/graduation-registers/2026-08-08-IBT-000035.sql's explicit `id` column).
 * If that convention was ever violated, this script would under-report —
 * that limitation is stated in its own output, not hidden.
 *
 * Writes nothing. Sends one GET per candidate sequence number to the public,
 * unauthenticated verification endpoint — the same one any parent's browser
 * calls.
 *
 *     node scripts/audit-certificate-presence.mjs --base https://shroyalschools.com --from 1 --to 120
 */
const argv = process.argv.slice(2);
const argOf = (flag, def) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : def; };
const BASE = argOf('--base', null);
const FROM = Number(argOf('--from', '1'));
const TO = Number(argOf('--to', '120'));
const YEAR = argOf('--year', '2026');

if (!BASE) {
  console.error('Give --base <origin>, e.g. --base https://shroyalschools.com');
  process.exit(2);
}

async function askRef(ref) {
  const res = await fetch(`${BASE}/api/certificates/verify?ref=${encodeURIComponent(ref)}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return { ref, httpStatus: res.status, error: `non-JSON response (${ct})` };
  }
  const data = await res.json();
  return { ref, httpStatus: res.status, data };
}

async function main() {
  console.log(`CERTIFICATE PRESENCE AUDIT — ${BASE}`);
  console.log(`Sequence range checked: ${FROM}–${TO}, year ${YEAR}`);
  console.log(`Method: archive-barcode identifier (year + zero-padded seq), which resolves by row id`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  const found = [];
  const notFound = [];
  const errors = [];

  for (let seq = FROM; seq <= TO; seq++) {
    const ref = `${YEAR}${String(seq).padStart(6, '0')}`;
    let result;
    try {
      result = await askRef(ref);
    } catch (e) {
      errors.push({ seq, ref, error: String(e && e.message || e) });
      console.log(`  seq ${String(seq).padStart(6, '0')}  ERROR  ${e}`);
      continue;
    }
    if (result.error) {
      errors.push({ seq, ref, error: result.error, httpStatus: result.httpStatus });
      console.log(`  seq ${String(seq).padStart(6, '0')}  ERROR  ${result.error} (HTTP ${result.httpStatus})`);
      continue;
    }
    const d = result.data;
    if (d.found) {
      found.push({ seq, ref, kind: d.kind, certificateNo: d.certificateNo, recipientName: d.recipientName, programmeCode: d.programmeCode, status: d.status, integrity: d.integrity });
      console.log(`  seq ${String(seq).padStart(6, '0')}  FOUND  ${d.certificateNo || '(no display no.)'}  ${d.recipientName || ''}  programme=${d.programmeCode || d.kind}  status=${d.status}  integrity=${d.integrity || 'n/a'}`);
    } else {
      notFound.push({ seq, ref });
    }
  }

  console.log('');
  console.log(`SUMMARY: ${found.length} found, ${notFound.length} not found, ${errors.length} errors, out of ${TO - FROM + 1} checked`);
  console.log('');
  console.log('=== FOUND (JSON) ===');
  console.log(JSON.stringify(found, null, 2));
  console.log('');
  console.log('=== NOT FOUND seq list ===');
  console.log(notFound.map((n) => n.seq).join(', '));
  if (errors.length) {
    console.log('');
    console.log('=== ERRORS (JSON) ===');
    console.log(JSON.stringify(errors, null, 2));
  }
}

main();
