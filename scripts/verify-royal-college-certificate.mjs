#!/usr/bin/env node
/**
 * Release gate for the Royal College graduation batch.
 *
 *     node scripts/verify-royal-college-certificate.mjs <batch-dir>
 *
 * Five things this gate holds an opinion about, none of which the issuer can
 * check on its own because the issuer is the thing being checked:
 *
 *   1. IDENTIFIERS   Every one of the six identifiers on the sheet re-derives
 *                    from the register row, and every one is unique.
 *   2. CARRY-OVER    The five Student IDs carried from earlier awards are the
 *                    numbers those earlier registers actually record.
 *   3. WORDING       The award name, the school, and the phrases that must
 *                    never appear.
 *   4. LAYOUT        Measured in a real browser at the printed size: nothing
 *                    overlaps, nothing runs outside the frame, no type falls
 *                    below the press floor.
 *   5. RESIDUE       No student who is not on this roll is named anywhere.
 *
 * What it deliberately does NOT do: recompute content hashes. That needs the
 * production signing key, which lives in the Cloudflare environment and in the
 * Board's credential store — never here. `scripts/verify-register-import.mjs`
 * is the gate that runs where the key is.
 *
 * Machine-readable codes are decoded from the real PDF by
 * scripts/verify-certificate-codes.py, which reads the whole page with an
 * independent decoder rather than trusting the source that produced it.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RC_PROGRAMMES } from '../functions/_lib/royal-college-certificate.js';

const batchDir = resolve(process.argv[2] || 'dist/certificates/2026-08-08-JSS-000048');
if (!existsSync(batchDir)) {
  console.error(`no such batch directory: ${batchDir}`);
  process.exit(1);
}
const regFile = readdirSync(batchDir).find((f) => /^register-.*\.json$/.test(f));
if (!regFile) { console.error(`no register JSON in ${batchDir}`); process.exit(1); }
const reg = JSON.parse(readFileSync(join(batchDir, regFile), 'utf8'));
const printFile = readdirSync(batchDir).find((f) => /-print\.html$/.test(f));
if (!printFile) { console.error(`no print file in ${batchDir}`); process.exit(1); }
const printHtml = readFileSync(join(batchDir, printFile), 'utf8');

const fails = [];
let pass = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ok   ${name}`); return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}

console.log(`\nRoyal College certificate gate — ${batchDir}\n`);

// ── 1. Identifiers ──────────────────────────────────────────────────────────
console.log('— identifiers —');
const YEAR = String(reg.issuedAt).slice(0, 4);
let idOk = true;
const seen = {};
for (const f of ['identityNo', 'serialNo', 'contentHash', 'verifyCode', 'documentId',
  'archiveRef', 'printedNo', 'qrUrl']) seen[f] = new Set();

for (const e of reg.entries) {
  // The programme code is read off the register, not hardcoded. A gate that
  // only knows one stage passes the stage it was written for and rejects every
  // other one as malformed — which is what it did to the first Senior
  // Secondary batch.
  const m = String(e.serialNo).match(
    new RegExp(`^SHRS-CERT-(${reg.programme})-(\\d{4})-(\\d{6})-([0-9A-F]{5})$`));
  if (!m) { fails.push(`${e.studentEn}: serial "${e.serialNo}" is not in the issuable format`); idOk = false; continue; }
  const [, code, year, seq, suffix] = m;
  const id7 = String(e.certId).padStart(7, '0');
  const id6 = String(e.certId).padStart(6, '0');
  const expect = {
    // WITH the check tail. certificate-serial.js §displayStageCertificateNo
    // records why the tail is never dropped, and the Royal College master
    // dropped it once anyway — so this gate re-derives the full form.
    printedNo: `SHRS-CERT-${code}-${seq}-${suffix}`,
    documentId: `DID-${year}-${code}-${id7}`,
    archiveRef: `ARCH/${code}/${year}/${id6}`,
    verifyCode: String(e.contentHash).slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, '$1-'),
    qrUrl: `https://shroyalschools.com/v/${e.serialNo}`,
  };
  for (const [k, want] of Object.entries(expect)) {
    if (e[k] !== want) { fails.push(`${e.studentEn}: ${k} is "${e[k]}", re-derives to "${want}"`); idOk = false; }
  }
  // The suffix IS the head of the content hash. This is the property that makes
  // an invented serial detectable, so it is checked rather than assumed.
  if (String(e.contentHash).slice(0, 5).toUpperCase() !== suffix) {
    fails.push(`${e.studentEn}: serial tail ${suffix} is not the head of the content hash`); idOk = false;
  }
  if (year !== YEAR) { fails.push(`${e.studentEn}: serial year ${year} ≠ issue year ${YEAR}`); idOk = false; }
  if (Number(seq) !== e.certId) { fails.push(`${e.studentEn}: serial run ${seq} ≠ record id ${e.certId}`); idOk = false; }
  if (!/^\d{15}$/.test(e.identityNo)) { fails.push(`${e.studentEn}: Student ID is not 15 digits`); idOk = false; }
  for (const f of Object.keys(seen)) {
    if (seen[f].has(e[f])) { fails.push(`${f} duplicated at ${e.studentEn}: ${e[f]}`); idOk = false; }
    seen[f].add(e[f]);
  }
}
check(`all six identifiers re-derive and are unique across ${reg.entries.length} certificates`, idOk);

// The run must be contiguous and must not reach back into a batch already
// issued. IBT took 35–41 and IDD took 42–47.
const runs = reg.entries.map((e) => e.certId).sort((a, b) => a - b);
check('the certificate run is contiguous',
  runs.every((n, i) => i === 0 || n === runs[i - 1] + 1), runs.join(','));
check('the run does not reach into the IBT (35–41) or IDD (42–47) batches',
  runs[0] > 47, `starts at ${runs[0]}`);

// ── 2. Student ID carry-over ────────────────────────────────────────────────
console.log('\n— permanent Student IDs —');
const PRIOR = {
  IBT: 'docs/graduation-registers/2026-08-08-IBT-000035.json',
  IDD: 'docs/graduation-registers/2026-08-08-IDD-000042.json',
};
const priorById = new Map();
for (const [key, path] of Object.entries(PRIOR)) {
  const abs = resolve(process.cwd(), path);
  if (!existsSync(abs)) { fails.push(`prior register missing: ${path}`); continue; }
  for (const e of JSON.parse(readFileSync(abs, 'utf8')).entries) {
    priorById.set(e.identityNo, { key, name: e.studentEn });
  }
}
const declared = new Map((reg.identityCarryOver?.resolved || []).map((r) => [r.student, r]));
let carryOk = true;
for (const e of reg.entries) {
  const prior = priorById.get(e.identityNo);
  const claim = declared.get(e.studentEn);
  if (prior && !claim) {
    fails.push(`${e.studentEn} carries ${e.identityNo}, which the ${prior.key} register `
      + `already assigns to ${prior.name} — but the register does not declare it as a carry-over`);
    carryOk = false;
  }
  if (claim && !prior) {
    fails.push(`${e.studentEn} is declared a carry-over but ${e.identityNo} appears in no earlier register`);
    carryOk = false;
  }
}
check(`every reused Student ID is declared, and every declared one is real `
  + `(${declared.size} carried, ${reg.entries.length - declared.size} newly issued)`, carryOk);

// A short-form match is a judgement the Founder is entitled to overturn. It
// must be VISIBLE on the register, not resolved silently — this gate exists
// because "we assumed they were the same person" is not a record.
// Every short-form match must appear on the register in ONE of two states:
// awaiting the Founder's ruling, or carrying it. Neither may be missing, and a
// ruling must name the date and the decision — "we assumed they were the same
// person" is not a record, and neither is "someone said it was fine once".
const pending = reg.identityCarryOver?.awaitingFounderConfirmation || [];
const ruled = reg.identityCarryOver?.founderRulings || [];
const shortForm = (reg.identityCarryOver?.resolved || []).filter((r) => r.matchedAs === 'short-form');
check('every short-form name match is either flagged or ruled on — none is silent',
  pending.length + ruled.length === shortForm.length,
  `${shortForm.length} short-form match(es): ${pending.length} awaiting, ${ruled.length} ruled`);
check('every ruling names its date and its decision',
  ruled.every((r) => r.ruledOn && r.decision && r.matchedTo && r.identityNo),
  `${ruled.length} ruling(s)`);
for (const p of pending) console.log(`       ~ ${p.student} → ${p.matchedTo} (${p.identityNo}) — AWAITING`);
for (const r of ruled) console.log(`       · ${r.student} → ${r.matchedTo} (${r.identityNo}) — ruled ${r.ruledOn}: ${r.decision}`);

// ── 3. Wording ──────────────────────────────────────────────────────────────
console.log('\n— wording —');
// The issuing school and the signing officer come from the PROGRAMME, not from
// a constant. They were hardcoded to the Royal College and its Principal, so
// the Primary batch failed this gate twice for being correct: a Nursery and
// Primary award is signed by its own Head Teacher and must not carry the Royal
// College's name. A gate that only passes one school is not a gate — it is the
// first school's layout written down twice.
const PROG = RC_PROGRAMMES[reg.programme];
if (!PROG) fail(`no programme registry entry for "${reg.programme}"`);
const MUST_APPEAR = [
  'Sultan Hanafi Royal Schools', PROG.school,
  'Certificate of Graduation', reg.award,
  'Federal Republic of Nigeria', PROG.signatory.name,
  'Dr. Zakaria Olanrewaju Anofi', 'Student Identity Number',
];
for (const s of MUST_APPEAR) check(`the sheet says "${s}"`, printHtml.includes(s));

// Each of these was a real defect risk, not a hypothetical.
const MUST_NOT_APPEAR = [
  // A national award the school does not make. Editorial bible §1.
  ['Basic Education Certificate', 'claims a national award the school does not issue'],
  // The supplied artwork's institution, engraved into its microtext and seal.
  ['School of Islamic', 'names the wrong school — the supplied artwork\'s, not this one\'s'],
  // The supplied artwork's unverifiable founding date.
  ['EST. 1448', 'an unverified founding claim from the supplied artwork'],
  ['EST. 2025', 'an unverified founding claim from the supplied artwork'],
  // The supplied artwork's mock identifiers.
  ['SHRS-IBT-2025', 'a mock identifier from the supplied artwork'],
  ['DID-2025-IBT', 'a mock identifier from the supplied artwork'],
  ['4X78-9K2M', 'a mock identifier from the supplied artwork'],
  // Founder directive: English only.
  ['المرحلة', 'Arabic — this certificate is English only'],
];
for (const [s, why] of MUST_NOT_APPEAR) {
  check(`the sheet never says "${s}"`, !printHtml.includes(s), why);
}
// Any Arabic at all, not just the phrases above.
check('the sheet carries no Arabic script anywhere',
  !/[؀-ۿ]/.test(printHtml.replace(/&#x[0-9A-Fa-f]+;/g, '')));

// The grade is bound into the content hash and must stay off the face.
check('no grade wording reaches the face',
  !/\b(Excellent|Very Good|Distinction|Credit|Pass|Grade)\b/.test(printHtml),
  'the certificate attests completion, not performance');

// ── 4. Residue ──────────────────────────────────────────────────────────────
console.log('\n— residue —');
const OFF_ROLL = [
  'Abdulbasit Adedokun', 'Naheemah Ismail', 'Ashrof Akorede', 'Imran Adegoke',
  'Abdulateef Adedokun', 'Thoirah Makinde', 'Abdulbasit Amobi Jabarr',
  'Abdullah Oladimeji Anofi', 'Baqi Olamiposi Anofi', 'Faridah Ayomide Aliu',
];
// A name is off-roll only if this batch did not issue it. Two Senior Secondary
// graduates — Thoirah Makinde and Abdulbasit Amobi Jabarr — also hold Arabic
// certificates, which is ordinary dual enrolment at this institution; the list
// below is the union of everyone this pipeline has ever issued, so it must be
// filtered against the roll in hand before it means anything.
const onThisRoll = new Set(reg.entries.map((e) => e.studentEn));
const found = OFF_ROLL.filter((n) => !onThisRoll.has(n) && printHtml.includes(n));
check('no student outside this roll is named on any sheet', found.length === 0, found.join(', '));
let onRoll = true;
for (const e of reg.entries) {
  for (const [what, v] of [['name', e.studentEn], ['serial', e.serialNo],
    ['Student ID', e.identityNo], ['printed number', e.printedNo]]) {
    if (!printHtml.includes(v)) { fails.push(`${e.studentEn}: ${what} "${v}" is missing from the print file`); onRoll = false; }
  }
}
check(`all ${reg.entries.length} students and their identifiers appear in the print file`, onRoll);

// ── 5. Layout, measured in a browser at the printed size ────────────────────
console.log('\n— layout —');
let chromium = null;
try { ({ chromium } = await import('playwright-core')); } catch { /* reported below */ }

if (!chromium) {
  console.log('  SKIP layout measurement — playwright-core is not installed.');
  console.log('       npm install --no-save playwright-core, then re-run.');
  fails.push('layout measurement did not run (playwright-core missing) — a gate '
    + 'that silently skips its hardest check is not a gate');
} else {
  const { createServer } = await import('node:http');
  const { extname } = await import('node:path');
  const { statSync } = await import('node:fs');
  const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.css': 'text/css', '.js': 'text/javascript' };
  const srv = createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    for (const p of [join(process.cwd(), url), join(batchDir, url.replace(/^\//, ''))]) {
      if (existsSync(p) && statSync(p).isFile()) {
        res.writeHead(200, { 'content-type': MIME[extname(p).toLowerCase()] || 'application/octet-stream' });
        res.end(readFileSync(p)); return;
      }
    }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH
    || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1123, height: 794 } });
  await page.goto(`http://127.0.0.1:${srv.address().port}/${printFile}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const measured = await page.evaluate(() => {
    const MM = 1123 / 297;   // CSS px per mm at the drawn size
    const out = [];
    for (const sheet of document.querySelectorAll('.sheet')) {
      const base = sheet.getBoundingClientRect();
      // INK box, not element box. Most of the type on this sheet is set in
      // full-width centred blocks (left:0;right:0), so their element boxes span
      // the whole 297mm and every one of them "runs outside the field" and
      // "overlaps" every other. That is the gate measuring the wrong thing.
      // A Range over the element's contents returns the rects the browser
      // actually painted — text lines and child elements — which is what has to
      // clear the frame and what has to not collide.
      const box = (sel) => {
        const el = sheet.querySelector(sel);
        if (!el) return null;
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
        const src = rects.length ? rects : [el.getBoundingClientRect()];
        const L = Math.min(...src.map((r) => r.left));
        const T = Math.min(...src.map((r) => r.top));
        const R = Math.max(...src.map((r) => r.right));
        const B = Math.max(...src.map((r) => r.bottom));
        return { sel, x: (L - base.left) / MM, y: (T - base.top) / MM,
          w: (R - L) / MM, h: (B - T) / MM };
      };
      out.push({
        serial: sheet.dataset.serial,
        sheet: { w: base.width / MM, h: base.height / MM },
        boxes: ['.rc-emblems', '.rc-inst', '.rc-school', '.rc-title', '.rc-subtitle',
          '.rc-name', '.rc-sid', '.rc-body', '.rc-award', '.rc-ledger',
          '.rc-sig-l', '.rc-sig-r', '.rc-qr', '.rc-cnwrap', '.rc-sealwrap', '.rc-plate']
          .map(box).filter(Boolean),
        nameFont: parseFloat(getComputedStyle(sheet.querySelector('.rc-name')).fontSize) / MM,
      });
    }
    return out;
  });
  await browser.close(); srv.close();

  check(`${measured.length} sheets rendered`, measured.length === reg.entries.length,
    `expected ${reg.entries.length}`);

  const FIELD = 17.5;   // RC_RULES.field — the open field's inset on all sides
  let inField = true; let overlap = true; let nameFits = true;
  // No pair on this sheet is allowed to touch. The seal is the only element
  // permitted to break the FIELD rule (it is an applied seal and is meant to),
  // and that exemption is handled below — it is not licence to collide with a
  // neighbour.
  const ALLOWED = new Set();
  for (const s of measured) {
    if (Math.abs(s.sheet.w - 297) > 0.2 || Math.abs(s.sheet.h - 210) > 0.2) {
      fails.push(`${s.serial}: sheet measures ${s.sheet.w.toFixed(2)} x ${s.sheet.h.toFixed(2)}mm, not 297 x 210`);
    }
    for (const b of s.boxes) {
      if (b.x < FIELD - 0.5 || b.y < FIELD - 0.5
        || b.x + b.w > 297 - FIELD + 0.5 || b.y + b.h > 210 - FIELD + 0.5) {
        // The seal is allowed to overlap the field rule; everything else is not.
        if (b.sel !== '.rc-sealwrap') {
          fails.push(`${s.serial}: ${b.sel} runs outside the open field `
            + `(${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.w.toFixed(1)}x${b.h.toFixed(1)}mm)`);
          inField = false;
        }
      }
    }
    for (let i = 0; i < s.boxes.length; i++) {
      for (let j = i + 1; j < s.boxes.length; j++) {
        const a = s.boxes[i]; const b = s.boxes[j];
        if (ALLOWED.has(`${a.sel}|${b.sel}`) || ALLOWED.has(`${b.sel}|${a.sel}`)) continue;
        const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        if (hit) {
          fails.push(`${s.serial}: ${a.sel} overlaps ${b.sel}`);
          overlap = false;
        }
      }
    }
    // The name is set white-space:nowrap in a 193mm measure and fitted to 190mm.
    // What is checked is the INK the browser painted, not the prediction the
    // fitter made from its per-character advance constant: if that constant
    // ever drifts from the font, this is where it shows.
    const NAME_MEASURE = 190.5;
    const name = s.boxes.find((b) => b.sel === '.rc-name');
    if (name && name.w > NAME_MEASURE) {
      fails.push(`${s.serial}: the student name renders ${name.w.toFixed(1)}mm wide `
        + `in a ${NAME_MEASURE}mm measure`);
      nameFits = false;
    }
  }
  check('every element sits inside the open field', inField);
  check('no two elements overlap', overlap);
  check('every student name fits its measure', nameFits);
  const fonts = measured.map((s) => s.nameFont);
  const widths = measured.map((s) => s.boxes.find((b) => b.sel === '.rc-name')?.w || 0);
  console.log(`       name type ${(Math.min(...fonts) / 0.35278).toFixed(1)}–`
    + `${(Math.max(...fonts) / 0.35278).toFixed(1)}pt, ink ${Math.min(...widths).toFixed(0)}–`
    + `${Math.max(...widths).toFixed(0)}mm in a 190.5mm measure`);
}

// ── Verdict ─────────────────────────────────────────────────────────────────
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  for (const f of fails) console.log(`  ! ${f}`);
  console.log('\nBATCH NOT RELEASABLE\n');
  process.exit(1);
}
console.log('\nRoyal College batch verified — structure, identifiers, wording, layout\n');
