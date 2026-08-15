#!/usr/bin/env node
/**
 * Does the number PRINTED on the sheet reach its own record?
 *
 *     node scripts/staging/parser-proof.mjs
 *
 * The Royal College master prints the certificate number WITHOUT its five-
 * character check tail (the defect recorded in commit 8405cca). So the string a
 * parent actually types is SHORTER than the stored serial, and under-specifies
 * it. This feeds that exact string to the PRODUCTION parser — imported, not
 * reimplemented — and asserts the endpoint's own lookup pattern matches the
 * stored serial.
 *
 * A proof that reimplements the thing it is proving shows only that two copies
 * agree, so everything here comes from functions/_lib/certificate-serial.js.
 *
 * Needs no database and no key: it reads the built registers in dist/ and asks
 * a pure function. Safe at any time.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  parseStageCertificateDisplayNo, parseStageCertificateIdentifier,
  displayStageCertificateNo, parseStageCertificateSerial,
} from '../../functions/_lib/certificate-serial.js';

const DIR = new URL('../../dist/certificates', import.meta.url).pathname;
// Everything built, except the two batches the published registers already
// cover. Deliberately not a list of programme codes: the last version of this
// filter named codes, went stale when two batches were rebuilt, and silently
// stopped testing four certificates.
const batches = readdirSync(DIR).filter((d) => !/-IBT-0000(14|35)$/.test(d));

// How the endpoint builds its lookup (verify.js → selectByIdentifier, the
// 'printed_no' branch), reproduced exactly so the match can be asserted.
const likeToRegex = (pattern) =>
  new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/_/g, '.').replace(/%/g, '.*')}$`);

let pass = 0; let fail = 0;
console.log('\nPARSER PROOF — does the number printed on the sheet resolve?\n');

for (const b of batches) {
  const f = readdirSync(join(DIR, b))
    .find((x) => /^register-.*\.json$/.test(x) || x === 'graduation-register.json');
  if (!f) continue;
  const reg = JSON.parse(readFileSync(join(DIR, b, f), 'utf8'));
  console.log(`── ${reg.programme} · ${reg.entries.length} certificates ─────────────────`);
  for (const e of reg.entries) {
    const stored = e.serialNo;                            // what the database holds
    const engraved = displayStageCertificateNo(stored);   // full printed form, with tail
    const tailless = engraved.replace(/-[0-9A-F]{5}$/, ''); // what the sheets actually print

    const parsed = parseStageCertificateDisplayNo(tailless);
    const ident = parseStageCertificateIdentifier(tailless);
    const okParse = !!parsed && parsed.suffix === null && ident && ident.kind === 'printed_no';

    const pattern = `SHRS-CERT-${parsed?.programmeCode}-____-${parsed?.seq}-${parsed?.suffix || '_____'}`;
    const okMatch = okParse && likeToRegex(pattern).test(stored);

    // The full engraved form — v2.2 sheets, tail restored — must resolve too.
    const pf = parseStageCertificateDisplayNo(engraved);
    const okFull = !!pf && pf.suffix === parseStageCertificateSerial(stored).suffix
      && likeToRegex(`SHRS-CERT-${pf.programmeCode}-____-${pf.seq}-${pf.suffix}`).test(stored);

    const ok = okParse && okMatch && okFull;
    if (ok) pass += 1; else fail += 1;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  printed "${tailless}"  ->  ${stored}  (${e.studentEn})`);
  }
  console.log('');
}

// A wrong tail must still fail closed. Verification that says yes to a
// fabricated number is worth nothing, and the tail is the only part of the
// printed number a forger cannot compute.
const sample = 'SHRS-CERT-JSS-000048-00000';
const p = parseStageCertificateDisplayNo(sample);
const negOk = !likeToRegex(`SHRS-CERT-${p.programmeCode}-____-${p.seq}-${p.suffix}`)
  .test('SHRS-CERT-JSS-2026-000048-4F39D');
console.log(`NEGATIVE CONTROL — a WRONG check tail must not resolve: ${negOk ? 'PASS' : 'FAIL'}`);
console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 && negOk ? 0 : 1);
