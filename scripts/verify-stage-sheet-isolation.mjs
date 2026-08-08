#!/usr/bin/env node
/**
 * Prove that a stage-scoped change to the certificate template reached only
 * the stage it was scoped to.
 *
 *     node scripts/verify-stage-sheet-isolation.mjs [--ref HEAD] [--stages IBT,IDD]
 *
 * WHY THIS EXISTS. The standing rule on this artwork is absolute: do not modify
 * the Version 1.0 certificate layout. Thirteen certificates are already minted
 * against it, six of them stand, and their sheets have to keep rendering as
 * they were rendered.
 *
 * But a new stage still has to be able to look different. The Founder asked for
 * a Tamhīdiyyah sheet that reads like the Ibtidā'iyyah family "but more flashy",
 * and the way that is done here is an additive layer behind one programme-code
 * test, with every CSS rule prefixed by `[data-stage="TMH"]`.
 *
 * "Every rule is prefixed" is a claim about source. What matters is a claim
 * about OUTPUT: that the other stages' sheets come out of the renderer exactly
 * as before, to the pixel. A prefix typed one character wrong, a selector that
 * matches more than intended, a shared element nudged by an added sibling —
 * none of those show up in a diff of the source you were looking at.
 *
 * So this renders the named stages twice — once from the working tree, once
 * from the template as it stands at a git ref — and compares the rendered
 * sheets byte for byte. It is the only form of the assurance worth having.
 *
 * It renders design proofs, never certificates: it drives
 * scripts/proof-certificate-design.mjs, which signs nothing and cannot reach
 * the signing code.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const REF = arg('ref', 'HEAD');
const STAGES = arg('stages', 'IBT,IDD').split(',').map((s) => s.trim()).filter(Boolean);
const TEMPLATE = 'functions/_lib/stage-certificate-template.js';

// The proof renderer serves the repository root over HTTP, so its output
// directory has to live inside the repository for its own server to reach it.
const OUT = 'dist/_stage-isolation';
const stash = mkdtempSync(join(tmpdir(), 'shrs-isolation-'));
const keep = join(stash, 'working.js');

const render = (dir) => {
  for (const code of STAGES) {
    execFileSync(process.execPath, ['scripts/proof-certificate-design.mjs', code, '--out', dir],
      { stdio: 'ignore' });
  }
};

rmSync(OUT, { recursive: true, force: true });
copyFileSync(TEMPLATE, keep);
let failed = false;
try {
  render(`${OUT}/working`);
  // The template as it stands at the reference commit, and ONLY the template.
  // Everything else — the rolls, the plan, the assets — stays as it is in the
  // working tree, so the comparison isolates this one file's effect. The
  // working copy is restored in the finally block whatever happens here; a
  // crash that left the reference template in place would be a silent revert.
  writeFileSync(TEMPLATE, execFileSync('git', ['show', `${REF}:${TEMPLATE}`]));
  render(`${OUT}/reference`);
} finally {
  copyFileSync(keep, TEMPLATE);
  rmSync(stash, { recursive: true, force: true });
}

const sheets = readdirSync(`${OUT}/reference`).filter((f) => f.endsWith('.png'));
if (!sheets.length) {
  console.error('  NO SHEETS RENDERED — the comparison proved nothing. Check the proof renderer.');
  process.exit(2);
}
console.log(`\n  STAGE ISOLATION — ${STAGES.join(', ')} rendered from the working tree and from ${REF}\n`);
let same = 0;
for (const f of sheets) {
  const a = readFileSync(join(OUT, 'reference', f));
  const b = readFileSync(join(OUT, 'working', f));
  if (a.equals(b)) { same += 1; console.log(`    identical   ${f}`); } else {
    failed = true;
    console.log(`    CHANGED     ${f}   ${a.length} → ${b.length} bytes`);
  }
}
console.log();
if (failed) {
  console.error(`  FAILED — a stage that must not change has changed. The layer is not isolated.\n`);
  process.exit(1);
}
console.log(`  PASSED — all ${same} sheet(s) render identically. `
  + 'The change reached no stage it was not scoped to.\n');
