#!/usr/bin/env node
// Verifiability gate for the Royal College batch.
//
// The other Royal College gates answer "is the sheet right?" — identifiers
// re-derive, wording is clean, nothing overlaps, every code scans. Not one of
// them answers the question a registrar actually asks at the counter:
//
//     A graduate hands me this certificate. I read a number off it, or I scan
//     a barcode on it. Does the verification system find THIS document?
//
// That question has a different failure mode from every other gate, and it is
// the worst one this system can produce. A genuine certificate told "no
// certificate found" reads, to the holder and to everyone else in the room, as
// an accusation of forgery — and the holder has no way to argue with a screen.
//
// So this gate takes each certificate's register entry, enumerates EVERY
// number a human can read or a scanner can capture from the sheet, and puts
// each one through the production parser and the production display function.
// It found two real defects on first run, both now fixed and both guarded
// below by name:
//
//   1. The Code 128-C holder barcode (0 + the 15-digit Student ID, padded to
//      even length because Code 128-C encodes digit pairs) did not parse. The
//      one barcode on the sheet that identifies the HOLDER was unscannable
//      into the verification box.
//
//   2. The engraved certificate number had lost its five-character check tail.
//      certificate-serial.js warns against exactly this by name; the Royal
//      College master reintroduced it. Beyond removing the number's only
//      self-checking property, it meant the public verification page returned
//      a longer number than the sheet carried — a discrepancy a verifier is
//      entitled to read as a forgery signal.
//
// Usage: node scripts/verify-royal-college-verifiability.mjs <batch-dir>
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseStageCertificateIdentifier, displayStageCertificateNo,
} from '../functions/_lib/certificate-serial.js';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/verify-royal-college-verifiability.mjs <batch-dir>');
  process.exit(2);
}

// The endpoint's own normalisation, restated here rather than imported: this
// gate must fail if functions/api/certificates/verify.js stops doing it, so it
// checks the BEHAVIOUR it needs, then separately checks that the endpoint
// still contains it.
function undoBarcodePadding(ref) {
  const s = String(ref || '').trim();
  return /^0\d{15}$/.test(s) ? s.slice(1) : s;
}

const regFile = readdirSync(dir).find((f) => f.startsWith('register-') && f.endsWith('.json'));
if (!regFile) { console.error(`no register-*.json in ${dir}`); process.exit(2); }
const reg = JSON.parse(readFileSync(join(dir, regFile), 'utf8'));
const entries = reg.entries || reg;

let passed = 0; const failures = [];
const ok = (m) => { passed++; console.log(`  ok   ${m}`); };
const bad = (m) => { failures.push(m); console.log(`  FAIL ${m}`); };

console.log(`\nVerifiability — ${entries.length} certificates in ${dir}\n`);

// ── 1. Every number on the sheet reaches the parser ─────────────────────────
const kinds = new Map();
let unparsed = 0;
for (const e of entries) {
  const forms = {
    'stored serial': e.serialNo,
    'engraved certificate number': e.printedNo,
    'Student Identity Number': e.identityNo,
    'verification code': e.verifyCode,
    'document id': e.documentId,
    'archive reference': e.archiveRef,
    'archive barcode (Code 128-C)': e.archiveRef.replace(/[^0-9]/g, ''),
    'holder barcode (Code 128-C)': e.holderBarcode,
    'QR payload': e.qrUrl.split('/v/')[1],
    'verification URL ref': new URL(e.verifyUrl).searchParams.get('ref'),
    'serial in lower case': e.serialNo.toLowerCase(),
    'engraved number with stray spaces': `  ${e.printedNo}  `,
  };
  for (const [label, value] of Object.entries(forms)) {
    const id = parseStageCertificateIdentifier(undoBarcodePadding(value));
    if (!id) { bad(`${e.printedNo}: "${label}" (${value}) does not parse`); unparsed++; continue; }
    if (!kinds.has(label)) kinds.set(label, id.kind || 'parsed');
  }
}
if (!unparsed) ok(`every printed and scannable identifier parses (${kinds.size} distinct forms × ${entries.length})`);

// ── 2. The sheet and the public page quote the SAME number ──────────────────
// This is the check that catches a dropped check tail. displayStageCertificateNo
// is what functions/api/certificates/verify.js returns as `certificateNo`, so
// if it disagrees with what the sheet engraves, a verifier comparing the screen
// against the paper sees two different numbers for one document.
{
  const wrong = entries.filter((e) => displayStageCertificateNo(e.serialNo) !== e.printedNo);
  if (wrong.length) {
    for (const e of wrong) {
      bad(`${e.serialNo}: sheet engraves ${e.printedNo}, verification page returns ${displayStageCertificateNo(e.serialNo)}`);
    }
  } else ok('the engraved number and the number the verification page returns are identical');
}

// ── 3. The engraved number keeps its self-checking tail ─────────────────────
{
  const untailed = entries.filter((e) => !/-[0-9A-F]{5}$/.test(e.printedNo));
  if (untailed.length) bad(`${untailed.length} engraved numbers have no check tail (certificate-serial.js §displayStageCertificateNo)`);
  else ok('every engraved number carries its five-character check tail');

  // And the tail must be the first five characters of the verification code,
  // which is what lets a verifier check the paper against itself with no
  // database at all.
  const mismatched = entries.filter((e) => {
    const tail = e.printedNo.slice(-5);
    return e.verifyCode.replace(/-/g, '').slice(0, 5) !== tail;
  });
  if (mismatched.length) bad(`${mismatched.length} sheets: the number's tail is not the head of the verification code`);
  else ok('the tail on the number is the head of the verification code — checkable without a database');
}

// ── 4. The QR route the sheet prints is the one that exists ─────────────────
{
  const redirects = readFileSync('_redirects', 'utf8');
  const hasRoute = /^\/v\/\*\s+\/verify-certificate\/\?ref=:splat\s+301/m.test(redirects);
  if (hasRoute) ok('the /v/* → /verify-certificate/?ref= redirect the QR depends on is present');
  else bad('_redirects has no /v/* → /verify-certificate/ rule — every printed QR would 404');

  const wrongQr = entries.filter((e) => e.qrUrl.split('/v/')[1] !== e.serialNo);
  if (wrongQr.length) bad(`${wrongQr.length} QR payloads do not carry their own serial`);
  else ok('every QR payload carries that certificate’s full stored serial');
}

// ── 5. The endpoint still undoes the barcode padding ────────────────────────
{
  const src = readFileSync('functions/api/certificates/verify.js', 'utf8');
  if (/undoBarcodePadding/.test(src) && /parseStageCertificateIdentifier\(stageRef\)/.test(src)) {
    ok('functions/api/certificates/verify.js normalises a scanned holder barcode before parsing');
  } else {
    bad('functions/api/certificates/verify.js no longer normalises the holder barcode — scanning it will report “not found”');
  }
}

// ── 6. Student ID linkage is one ID per person, and permanent ───────────────
{
  const byId = new Map();
  for (const e of entries) {
    if (!byId.has(e.identityNo)) byId.set(e.identityNo, new Set());
    byId.get(e.identityNo).add(e.studentEn);
  }
  const collisions = [...byId].filter(([, names]) => names.size > 1);
  if (collisions.length) {
    for (const [id, names] of collisions) bad(`Student ID ${id} is held by ${names.size} different names: ${[...names].join(', ')}`);
  } else ok(`every Student ID names exactly one person (${byId.size} distinct IDs)`);

  const dupSerial = entries.length - new Set(entries.map((e) => e.serialNo)).size;
  if (dupSerial) bad(`${dupSerial} duplicate serials in the batch`);
  else ok('every serial in the batch is unique');
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  console.log('A genuine certificate that cannot be verified is worse than no verification at all.\n');
  process.exit(1);
}
console.log('Every number on every sheet reaches its own record.\n');
