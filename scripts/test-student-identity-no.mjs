/**
 * Properties the permanent Student Identity Number must hold.
 *
 *     node scripts/test-student-identity-no.mjs
 *
 * The pattern test here exists because it caught a real defect. The first
 * multiplier chosen for the keyed permutation was 617283945671, which sits
 * within a whisker of 5e13/81 — and 1/81 = 0.012345679…, so its small
 * multiples inherited that expansion directly. Sequence 18 produced
 * 711111110220782 and sequence 20 produced 713456789134204: numbers that
 * look invented rather than issued, on a permanent institutional record.
 * Nothing in the collision or check-digit tests could see it, because
 * mathematically nothing was wrong. Only looking at the digits finds it.
 */
import {
  formatStudentIdentityNo, isValidStudentIdentityNo,
} from '../functions/_lib/identity-no.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) { console.log(`  ok    ${name}`); return; }
  failures++;
  console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
};

const N = 200_000;
const ids = [];
for (let seq = 1; seq <= N; seq++) ids.push(formatStudentIdentityNo(seq));

console.log(`Student Identity Number — ${N.toLocaleString()} sequence values\n`);

check('every number is exactly 15 digits',
  ids.every((v) => /^\d{15}$/.test(v)),
  ids.find((v) => !/^\d{15}$/.test(v)));

check('no collisions', new Set(ids).size === N,
  `${N - new Set(ids).size} duplicates`);

check('check digit validates', ids.every(isValidStudentIdentityNo));

// A wrong digit anywhere must be rejected, which is the whole point of the
// check digit on a number a registrar will retype from a printed card.
const sample = formatStudentIdentityNo(4242);
let caught = 0, tried = 0;
for (let i = 0; i < 15; i++) {
  for (let d = 0; d <= 9; d++) {
    if (String(d) === sample[i]) continue;
    tried++;
    if (!isValidStudentIdentityNo(sample.slice(0, i) + d + sample.slice(i + 1))) caught++;
  }
}
check(`all ${tried} single-digit typos rejected`, caught === tried, `${tried - caught} slipped through`);

check('deterministic across calls',
  ids.every((v, i) => v === formatStudentIdentityNo(i + 1)));

check('institution prefix is constant', ids.every((v) => v.startsWith('71')));

// Consecutive intakes must not sit next to each other, or two cards from the
// same class reveal the order they were issued in.
let minGap = Infinity;
for (let i = 1; i < 2000; i++) {
  minGap = Math.min(minGap, Math.abs(Number(BigInt(ids[i].slice(2, 14)) - BigInt(ids[i - 1].slice(2, 14)))));
}
check('consecutive intakes are far apart', minGap > 1_000_000_000,
  `smallest gap ${minGap.toLocaleString()}`);

// ── The digit-pattern test ──────────────────────────────────────────────
// A patterned body is not a mathematical fault and cannot be eliminated:
// roughly 1.9% of genuinely random 12-digit numbers contain a run like this,
// and real national identity numbers contain them too. What matters is that
// the generator produces them at CHANCE and not far above it. The retired
// multiplier ran at 9.1%, nearly five times chance, which is what made its
// output look fabricated.
const PATTERN = /(\d)\1{4,}|0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210|(\d{3})\2/;
const CHANCE = 1.86;                      // measured over 400,000 random bodies
const rate = ids.filter((v) => PATTERN.test(v.slice(2, 14))).length / N * 100;
check(`digit patterns occur at chance (${rate.toFixed(2)}% vs ${CHANCE}% expected)`,
  rate < CHANCE * 1.35,
  `${(rate / CHANCE).toFixed(1)}x chance — the permutation has visible decimal structure`);

// The early sequence values matter most: they are the school's first
// students, and they are exactly where the retired multiplier failed worst.
const early = ids.slice(0, 600).filter((v) => PATTERN.test(v.slice(2, 14))).length / 600 * 100;
check(`the first 600 students are clean too (${early.toFixed(2)}%)`,
  early < CHANCE * 1.35,
  `${(early / CHANCE).toFixed(1)}x chance in the low-sequence range`);

// No structural year field. Incidental year-like runs are unavoidable in any
// numeric identifier and carry no information; a year FIELD would.
const withYearRun = ids.filter((v) => /(19|20)\d{2}/.test(v)).length;
// A random 4-digit window is 19xx or 20xx exactly 2% of the time, so the
// threshold has to sit above chance or the test fires on noise — it did, at
// 2%, on the first run. 3.5% is comfortably above chance and still well
// below what a real embedded year field would produce.
const atFixedOffset = [...Array(9).keys()].some((i) =>
  ids.filter((v) => /^(19|20)\d{2}$/.test(v.slice(2 + i, 6 + i))).length > N * 0.035);
check('no year appears at any fixed position', !atFixedOffset,
  `${(withYearRun / N * 100).toFixed(1)}% contain an incidental year-like run, which is expected`);

console.log(`\n${failures ? `${failures} FAILED` : 'all properties hold'}`);
process.exit(failures ? 1 : 0);
