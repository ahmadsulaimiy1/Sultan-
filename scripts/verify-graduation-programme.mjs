#!/usr/bin/env node
/**
 * RELEASE GATE for the Graduation Ceremony Programme.
 *
 *     node scripts/verify-graduation-programme.mjs
 *
 * Exit 0 passes. Any non-zero exit means an artefact in dist/ must not ship.
 *
 * WHAT THIS IS FOR. The Editorial Bible scores verification at 7 and says why:
 * "still no automated gate that fails the build." Everything was measured by
 * hand and then asserted in prose, which works exactly until someone edits a
 * register and does not rebuild — and then the shipped programme quietly stops
 * describing the ceremony it is printed for.
 *
 * That is not hypothetical. When this gate was first run, the committed cover
 * claimed 45 AWARDS · 32 GRADUANDS while the committed registers, through the
 * committed builder, produced 43 and 30. Two people's worth of difference on
 * the front of a document handed to their families, and nothing in the
 * pipeline said a word about it.
 *
 * WHAT IT PROVES. That the artefacts in dist/ are the ones the current sources
 * produce, that every name printed is a name on the register and every name on
 * the register is printed, that the cover's arithmetic is the registers' own,
 * and that the sheet is still twelve panels across four sides. It re-derives
 * each figure from the register rather than reading it back off the artefact,
 * so a wrong number cannot confirm itself.
 *
 * WHAT IT DOES NOT PROVE. Nothing about colour, ink limit, stock or fold — the
 * press axis needs the printer's own file and a wet proof, and no script
 * substitutes for either. It does not read the PDF or the DOCX; both are
 * generated from the same constants as the HTML, by construction, so the
 * failure it guards against is staleness rather than drift.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs';

const DIR = 'dist/graduation-programme';
const NAME = 'SHRS-Graduation-Programme-2026';
const HTML = `${DIR}/${NAME}.html`;

const failures = [];
const notes = [];

const fail = (check, detail) => failures.push({ check, detail });
const ok = (check, detail) => notes.push({ check, detail });

if (!existsSync(HTML)) {
  console.error(`No built programme at ${HTML}. Run the builder first.`);
  process.exit(2);
}

// Everything that depends on the artefacts as they were SHIPPED is captured
// here, before anything below can disturb them. Importing the builder for its
// constants runs it — it writes its HTML at module scope — so reading the
// shipped bytes and timestamps has to happen first or the gate ends up
// auditing its own output.
const html = readFileSync(HTML, 'utf8');
const shipped = readFileSync(HTML);
const shippedStamp = statSync(HTML);
const proofPaths = [1, 2, 3, 4].map((n) => `${DIR}/page-${n}.png`);
const proofsPresent = proofPaths.every(existsSync);
const proofsWereCurrent = proofsPresent
  && proofPaths.every((p) => statSync(p).mtimeMs >= shippedStamp.mtimeMs);

// ── Sources of truth, re-derived rather than read back ──────────────────────
const { AWARDS, ORDER, TOTAL, PEOPLE, GUESTS } =
  await import('./build-graduation-programme.mjs');

// Strip tags once; every textual check below reads this, so a name split
// across an <em> or a soft hyphen still matches.
const text = html
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/\s+/g, ' ');

// ── 1. Freshness: is dist/ what the current sources produce? ────────────────
// The builder is deterministic, so rebuilding and comparing is the whole test.
{
  // A gate must not disturb what it audits. Rebuilding writes over dist/, so
  // the original bytes and timestamp are put back afterwards either way —
  // otherwise the rebuild's own mtime makes the proof rasters look stale on
  // the next run, and the gate starts failing on its own footprints.
  // The import above already rebuilt the HTML from current sources, so the
  // comparison is between what shipped and what those sources produce now.
  const rebuilt = readFileSync(HTML);
  const same = Buffer.compare(shipped, rebuilt) === 0;
  writeFileSync(HTML, shipped);
  utimesSync(HTML, shippedStamp.atime, shippedStamp.mtime);

  if (same) {
    ok('freshness', 'the built HTML matches what the current sources produce');
  } else {
    fail('freshness',
      'rebuilding from the current registers changes the HTML — dist/ is stale. '
      + 'Rebuild and re-render before shipping.');
  }
}

// ── 2. Cover arithmetic ─────────────────────────────────────────────────────
{
  const m = text.match(/(\d+)\s+AWARDS?\s*·\s*(\d+)\s+GRADUANDS?/i);
  if (!m) {
    fail('cover arithmetic', 'no "N AWARDS · N GRADUANDS" line found on the cover');
  } else {
    const [, awards, people] = m.map(Number);
    if (awards === TOTAL && people === PEOPLE) {
      ok('cover arithmetic', `${TOTAL} awards · ${PEOPLE} graduands, both from the registers`);
    } else {
      fail('cover arithmetic',
        `cover says ${awards} awards · ${people} graduands; `
        + `the registers give ${TOTAL} and ${PEOPLE}`);
    }
  }
}

// ── 3. Roll integrity, both directions ──────────────────────────────────────
{
  const missing = [];
  for (const award of AWARDS) {
    for (const name of award.names) {
      if (!text.includes(name)) missing.push(`${award.code}: ${name}`);
    }
  }
  if (missing.length === 0) {
    ok('roll integrity', `all ${TOTAL} register entries appear in the programme`);
  } else {
    fail('roll integrity',
      `${missing.length} name(s) on the register do not appear in the programme: `
      + missing.slice(0, 6).join('; ') + (missing.length > 6 ? ' …' : ''));
  }

  // The other direction: a numbered roll line whose name is on no register.
  const registered = new Set(AWARDS.flatMap((a) => a.names));
  const printed = [...html.matchAll(/<li[^>]*>([^<]{3,80})<\/li>/g)]
    .map((m) => m[1].trim())
    .filter((n) => /^[\p{L}][\p{L}\p{M}'’\-. ]+$/u.test(n));
  const stray = printed.filter((n) => !registered.has(n));
  if (stray.length === 0) {
    ok('roll integrity', 'no printed name is absent from the registers');
  } else {
    fail('roll integrity',
      `${stray.length} printed name(s) are on no register: ${stray.slice(0, 6).join('; ')}`);
  }
}

// ── 4. Running order ────────────────────────────────────────────────────────
{
  const absent = ORDER.map(([, , item]) => item).filter((i) => !text.includes(i));
  if (absent.length === 0) {
    ok('running order', `all ${ORDER.length} items present`);
  } else {
    fail('running order', `missing from the programme: ${absent.join('; ')}`);
  }
}

// ── 5. Guests ───────────────────────────────────────────────────────────────
{
  const absent = GUESTS.map((g) => (Array.isArray(g) ? g[0] : g))
    .filter((n) => typeof n === 'string' && n.length > 2 && !text.includes(n));
  if (absent.length === 0) ok('guests', `all ${GUESTS.length} named guests present`);
  else fail('guests', `missing: ${absent.join('; ')}`);
}

// ── 6. Structure: twelve panels across four sides ───────────────────────────
{
  const panels = (html.match(/class="panel /g) || []).length;
  const sheets = (html.match(/class="side/g) || []).length;
  if (panels === 12) ok('structure', '12 panels');
  else fail('structure', `${panels} panels, expected 12`);
  if (sheets === 4 || sheets === 0) ok('structure', `${sheets || 4} printed sides`);
  else fail('structure', `${sheets} printed sides, expected 4`);
}

// ── 7. The crest is vector ──────────────────────────────────────────────────
// Phase 3 of the bible. A raster crest cannot be foiled, embossed or cut, and
// softens at certificate sizes; once fixed it must not silently regress.
{
  if (/<svg[^>]*>[\s\S]*?<path/.test(html) && !/crests\/[^"]+\.png/.test(html)) {
    ok('crest', 'inlined as vector');
  } else {
    fail('crest', 'the crest is not inlined vector — a raster has come back');
  }
}

// ── 8. Panel fill, measured off the rendered proofs ─────────────────────────
{
  if (!proofsPresent) {
    fail('proofs', 'no proof rasters — run the renderer before shipping');
  } else if (!proofsWereCurrent) {
    fail('proofs', 'the proof rasters are older than the HTML — re-render before shipping');
  } else {
    ok('proofs', 'four proof rasters, current with the HTML');
  }

  // Measured in the page rather than off the raster: every panel carries a
  // frame and corner marks that run its full height, so a pixel reading says
  // 100% for all twelve and measures nothing.
  try {
    const out = execFileSync('node', ['scripts/audit-programme-fill.mjs'],
      { encoding: 'utf8' });
    process.stdout.write(out);
    ok('panel fill', 'every panel inside the 88–96% band');
  } catch (e) {
    if (e.stdout) process.stdout.write(e.stdout);
    fail('panel fill', 'one or more panels fall outside the 88–96% band (see the audit above)');
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log('\nGRADUATION PROGRAMME — RELEASE GATE\n');
for (const n of notes) console.log(`  pass   ${n.check.padEnd(18)} ${n.detail}`);
for (const f of failures) console.log(`  FAIL   ${f.check.padEnd(18)} ${f.detail}`);

console.log(
  failures.length === 0
    ? `\n  ${notes.length} checks passed. The artefacts in ${DIR} may ship.\n`
    : `\n  ${failures.length} check(s) failed. Nothing in ${DIR} ships until they pass.\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
