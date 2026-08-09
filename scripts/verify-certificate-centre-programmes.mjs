#!/usr/bin/env node
/**
 * The Certificate Generation Centre's programme picker must offer exactly the
 * programmes the issuing engine knows — no more, no fewer, under the engraved
 * names.
 *
 *     node scripts/verify-certificate-centre-programmes.mjs
 *
 * Two different failures live here and only one of them is obvious.
 *
 * A MISSING option is a stage that cannot be issued at all. The endpoint rejects
 * a programme code it does not recognise, so a stage absent from this list has
 * no route to a certificate through the Registrar's Office — which is exactly
 * what kept Tamhīdiyyah off the screen after the award itself was confirmed,
 * locked and rolled into the engine.
 *
 * A WRONG LABEL is worse, because nothing fails. The list read
 * "I'dādiyyah — Preparatory Stage"; I'dādiyyah is the INTERMEDIATE stage, and
 * Tamhīdiyyah is the preparatory one. A registrar looking for the preparatory
 * award would have found that line, selected it, and conferred the wrong award
 * on a real child — with every downstream gate passing, because the roster, the
 * numbering and the hash would all have been correct for the programme actually
 * chosen. No amount of cryptography catches a right answer to the wrong
 * question.
 *
 * So the label is checked against PROGRAMMES too, not just the code.
 */
import { readFileSync } from 'node:fs';
import { PROGRAMMES } from '../functions/_lib/certificate-serial.js';

const PAGE = 'portal/staff/certificate-centre/index.html';
const html = readFileSync(PAGE, 'utf8');

// The picker only — other selects on the page are not programme lists.
const block = html.slice(html.indexOf('data-cert-programme'));
const options = [...block.slice(0, block.indexOf('</select>')).matchAll(
  /<option value="([A-Z0-9]{2,4})"[^>]*>([^<]+)<\/option>/g)]
  .map((m) => ({ code: m[1], label: m[2].trim() }));

const known = Object.keys(PROGRAMMES);
const faults = [];

for (const code of known) {
  if (!options.some((o) => o.code === code)) {
    faults.push(`${code} is a known programme but is NOT in the picker — `
      + 'it cannot be issued through the Registrar’s Office at all.');
  }
}
for (const o of options) {
  if (!known.includes(o.code)) {
    faults.push(`"${o.code}" is offered in the picker but the issuing engine does not `
      + 'know it — selecting it returns an error rather than a certificate.');
    continue;
  }
  // The label must carry the programme's own stage name. Compared on the
  // stage word rather than the whole string, because the picker legitimately
  // adds the code in brackets and the engine's label does not.
  const stage = PROGRAMMES[o.code].labelEn.split('—').pop().trim();
  if (!o.label.toLowerCase().includes(stage.toLowerCase())) {
    faults.push(`${o.code} is labelled "${o.label}" but the engraved wording is `
      + `"${PROGRAMMES[o.code].labelEn}". A registrar picks by the words, not the code.`);
  }
}

console.log('\n  CERTIFICATE GENERATION CENTRE — programme picker\n');
for (const o of options) {
  const ok = known.includes(o.code) ? '·' : '✗';
  console.log(`    ${ok} ${o.code.padEnd(5)} ${o.label}`);
}
console.log();
if (faults.length) {
  console.error(`  FAILED — ${faults.length} fault(s):`);
  for (const f of faults) console.error(`    ✗ ${f}`);
  console.error();
  process.exit(1);
}
console.log(`  PASSED — ${options.length} programme(s), matching the issuing engine `
  + 'exactly, under the engraved names.\n');
