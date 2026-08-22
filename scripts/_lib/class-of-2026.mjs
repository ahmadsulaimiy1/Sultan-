/**
 * The Class of 2026 roll, as the issuing scripts must see it.
 *
 * Until 8 August 2026 each issuing script carried its own hard-coded list of
 * names, its own first-certificate number and its own first-Student-ID number.
 * That worked while there was one roll. There is no longer one roll: the
 * Registrar's Notice of 2 July became authoritative, thirteen certificates had
 * already been minted against a different list, and every name now stands at
 * its fullest recorded form. Three hand-maintained copies of that reconciliation
 * would disagree within a week — and the way they would disagree is by printing
 * one child's permanent number on another child's certificate.
 *
 * So there is one source now. docs/graduation-registers/reissue-plan-2026.json
 * is computed by scripts/plan-certificate-reissue.mjs from the canonical roll
 * and the published registers; this module reads it and returns, per batch, the
 * exact rows to issue — name, certificate number, permanent Student ID, and
 * where each came from. The issuing scripts keep every gate they had; what they
 * no longer keep is a private opinion about who is graduating.
 *
 * WHAT LIVES HERE RATHER THAN IN THE PLAN
 *
 * Three facts about each child are institutional records, not consequences of
 * the reconciliation, so they cannot be computed and are held here with their
 * provenance:
 *
 *   sex            drives the wording on the sheet. Recorded where a published
 *                  register or an approved roll states it. NEVER inferred from a
 *                  name — the batch is held instead, exactly as it is held for a
 *                  missing Arabic name.
 *   Arabic name    read from the published registers by EXACT name, never
 *                  derived. A form approved for "Naheemah Ismail" is not a form
 *                  approved for "Naheemah Ismail Seriki".
 *   awardVariant   which Qur'an College award was earned. There is no default:
 *                  a Ten Juz' sheet headed "Certificate of Completion" would
 *                  overstate a child's achievement on a permanent record.
 */
import { readFileSync } from 'node:fs';

export const PLAN = JSON.parse(
  readFileSync('docs/graduation-registers/reissue-plan-2026.json', 'utf8'));

// Certificates issued through the live Certificate Generation Centre AFTER
// this plan was first computed (8 August), for matters unrelated to the
// Class of 2026 roll — ordinary one-off issuances. Their certificate numbers
// and Student IDs are real and already held by real children, so anything
// that reasons about the global sequence (the plan generator's own
// allocation, and the preflight's contiguity check) must treat these as
// legitimately spent rather than as a gap or a name to reconcile. This is
// the one place both read it from, so a later one-off issuance only needs
// updating here.
export const ALSO_ISSUED_LIVE = [
  { certificateSeq: 48, studentEn: 'Muhammad Awwal', identityNo: '716922466886710' },
  { certificateSeq: 49, studentEn: 'Abdulsamad Musa Al-Ameen', identityNo: '710167004074504' },
  { certificateSeq: 50, studentEn: 'Abdulsamad Musa Al-Ameen', identityNo: '710167004074504' },
];

// The registers this roll's Arabic names and carried Student IDs are read from.
export const REGISTERS = {
  IBT: 'docs/graduation-registers/2026-08-08-IBT-000035.json',
  IDD: 'docs/graduation-registers/2026-08-08-IDD-000042.json',
};
const registerCache = new Map();
function register(key) {
  if (!registerCache.has(key)) {
    registerCache.set(key, JSON.parse(readFileSync(REGISTERS[key], 'utf8')));
  }
  return registerCache.get(key);
}

// ── Sex ─────────────────────────────────────────────────────────────────────
// Each entry names where the fact came from. Five children on the Registrar's
// roll appear in no earlier SHRS record at all, and for those the honest value
// is absent — the Registrar states it, or the batch waits.
const SEX = {
  'Hameedah Adebimpe Ojewumi': ['female', 'IBT register'],
  'Aisha Omoshalewa Anofi': ['female', 'IBT register (as Aisha Anofi) · Qur’an College roll'],
  'Abdulbasit Adedokun': ['male', 'IBT register'],
  'Naheemah Ismail Seriki': ['female', 'IBT register (as Naheemah Ismail) · Primary roll'],
  'Ashraf Korede Ojewumi': ['male', 'IBT register (as Ashrof Akorede) · Primary roll'],
  'Imran Iremide Adegoke': ['male', 'IBT register (as Imran Adegoke) · Primary roll'],
  'Abdulateef Adedokun': ['male', 'IBT register'],
  'Muhammad Ismail Seriki': ['male', 'IDD register'],
  'Baqi Olamiposi Anofi': ['male', 'IDD register'],
  'Faridah Ayomide Aliu': ['female', 'IDD register'],
  'Thoirah Makinde': ['female', 'IDD register'],
  'Abdulbasit Amobi Jabarr': ['male', 'IDD register'],
  'Abdullah Oladimeji Anofi': ['male', 'IDD register'],
  'Fatimah Desire Ibrahim': ['female', 'Junior Secondary roll, 2026-08-06'],
  "Sa'ad Sanusi": ['male', 'Junior Secondary roll, 2026-08-06'],
  'Fawaz Owolabi': ['male', 'Junior Secondary roll, 2026-08-06'],
  'Radiah Apatira': ['female', 'Junior Secondary roll, 2026-08-06'],
  'Anisa Opeyemi Jokomba': ['female', 'Junior Secondary roll, 2026-08-06'],
  'Ameerah Durodola': ['female', 'Junior Secondary roll, 2026-08-06'],
  'Abdulrahman Abdullah': ['male', 'Junior Secondary roll, 2026-08-06'],
  'Ameerah Abdulhafeez': ['female', 'Junior Secondary roll, 2026-08-06'],
  'Aisha Shode': ['female', 'Senior Secondary roll, 2026-08-07'],
  'Mazeed Hassan-Murtala': ['male', 'Senior Secondary roll, 2026-08-07'],
  'Al-ameen Okoh': ['male', 'Primary roll, 2026-08-07'],
  'Aisha Lawal': ['female', 'Primary roll, 2026-08-07'],
  'Daud Aliu': ['male', 'Primary roll, 2026-08-07'],
  'Zaynab Zakariya Anofi': ['female', 'Qur’an College roll, 2026-08-07'],
  // These three reached this pipeline on the Registrar's Notice of 2 July 2026
  // with no sex recorded anywhere. The Founder ruled all three on 22 August
  // 2026, from the conventions of the names themselves: "Yaseer"/Yasir is a
  // male Arabic name with no female form; "Jubril" is the Nigerian Muslim
  // rendering of Jibril (Gabriel), given only to boys; "Ganiyah" carries the
  // Arabic feminine "-iyyah" ending (as in Ghaniyyah), paired with "Allison"
  // as the given name.
  'Yaseer Balogun': ['male', 'Founder’s ruling, 2026-08-22 — the name admits no female form'],
  'Allison Ganiyah': ['female', 'Founder’s ruling, 2026-08-22 — from the feminine "-iyyah" ending'],
  'Jubril Lawal': ['male', 'Founder’s ruling, 2026-08-22 — Jibril/Gabriel, given only to boys'],
  // NOT RECORDED — Muhammad Fatih is withdrawn from every roll by a separate
  // ruling (see canonical-roll-2026.json) and never reaches this pipeline as
  // a graduand, so his sex is moot rather than outstanding.
};

// ── Arabic names approved outside the published registers ───────────────────
// Entries are here rather than in a register because each was ruled for a
// sheet that has not yet been minted. The Founder ruled the first on 7 August
// 2026 against this pipeline's own proposal, which he did not adopt.
//
// The five ruled 22 August 2026 were proposed BY this pipeline (standard
// Arabic components reused byte-for-byte from an already-approved register —
// Ojewumi, Adegoke, Ismail, Seriki, Imran, Ashraf all carry across unchanged
// from IBT-000035 / IDD-000042) and adopted by the Founder as his ruling.
// Three components have no institutional precedent because they are Yoruba,
// not Arabic — Korede, Iremide, and Balogun — and are transliterated
// phonetically, in the same register-name style already used for Adebimpe,
// Adedokun, Adegoke and Akorede. A phonetic transliteration is a spelling
// choice, not a fact to get right or wrong the way a sex or an identity is;
// the Founder’s adoption of it is what makes it the engraved form.
const APPROVED_AR = {
  'Aisha Omoshalewa Anofi': {
    ar: 'عائشة أمشالوا حنفي',
    source: 'ruled by the Founder, 2026-08-07, for the Qur’an College roll',
    pipelineProposed: 'عائشة أوموشاليوا حنفي',
    note: 'The Founder’s form differs from the proposal and governs. A family’s '
      + 'own spelling of its own name is not a pattern to be extrapolated.',
  },
  'Ameerah Abdulhafeez': {
    ar: 'أميرة عبد الحفيظ',
    source: 'ruled by the Founder, 2026-08-22 — standard Arabic, no transliteration choice to make',
  },
  'Ashraf Korede Ojewumi': {
    ar: 'أشرف كوريدي أوجومي',
    source: 'ruled by the Founder, 2026-08-22, adopting this pipeline’s proposal',
    note: 'Ashraf and Ojewumi carry across unchanged from IBT-000035 (there spelled '
      + 'for "Ashrof Akorede" and "Hameedah ... Ojewumi"). Korede — the fuller '
      + 'roll’s form, replacing "Akorede" — is transliterated phonetically; it is '
      + 'Yoruba, with no institutional precedent under this exact spelling.',
  },
  'Imran Iremide Adegoke': {
    ar: 'عمران إيريميدي أدغكي',
    source: 'ruled by the Founder, 2026-08-22, adopting this pipeline’s proposal',
    note: 'Imran and Adegoke carry across unchanged from IBT-000035. Iremide is '
      + 'Yoruba, transliterated phonetically, with no institutional precedent.',
  },
  'Naheemah Ismail Seriki': {
    ar: 'نعيمة إسماعيل سركي',
    source: 'ruled by the Founder, 2026-08-22, adopting this pipeline’s proposal',
    note: 'All three components carry across unchanged: Naheemah and Ismail from '
      + 'IBT-000035, Seriki from IDD-000042’s already-approved table.',
  },
  'Yaseer Balogun': {
    ar: 'ياسر بالوغون',
    source: 'ruled by the Founder, 2026-08-22, adopting this pipeline’s proposal',
    note: 'Yaseer/Yasir is standard Arabic. Balogun is a Yoruba title (a war '
      + 'chief’s rank, also used as a surname), transliterated phonetically, '
      + 'with no institutional precedent.',
  },
};

// ── The Qur'an College awards ───────────────────────────────────────────────
// Which award each graduand earned. Stated, never defaulted.
const AWARD_VARIANT = {
  'Zaynab Zakariya Anofi': 'COMPLETE',
  'Baqi Olamiposi Anofi': 'COMPLETE',
  'Aisha Omoshalewa Anofi': 'JUZ10',
  // Sofiah Anofi — NOT RECORDED. She appears on the Registrar's Qur'an College
  // list; which of the two awards she earned is not stated anywhere, and the
  // renderer refuses a sheet that names no variant rather than choosing one.
};

/**
 * The Arabic name on file for a child, at the exact name to be engraved.
 *
 * Read out of a published register by exact string, or out of the small table
 * above. It is deliberately strict: a form approved for a shorter name is not
 * approved for a longer one, because the name printed on the sheet is hashed
 * into the number engraved beside it. Returning null is the correct answer far
 * more often than returning something close.
 */
export function arabicNameFor(name) {
  if (APPROVED_AR[name]) {
    const a = APPROVED_AR[name];
    return { ar: a.ar, source: a.source, ruling: a };
  }
  for (const key of Object.keys(REGISTERS)) {
    const hits = register(key).entries.filter((e) => e.studentEn === name && e.studentAr);
    if (hits.length === 1) {
      return { ar: hits[0].studentAr, source: `carried from the ${key} register`, ruling: null };
    }
  }
  return null;
}

/**
 * The rows to issue for one batch, in certificate-number order.
 *
 * Every identifier comes from the plan. The carried Student IDs are then
 * CROSS-CHECKED against the register they claim to come from — the plan says
 * which certificate a number was carried from, and this reads that certificate
 * and confirms the number matches. A plan file edited by hand, or regenerated
 * against a changed register, fails here rather than at the press.
 */
export function rollFor(code) {
  return PLAN.toMint.filter((r) => r.code === code).map((r) => {
    if (r.identityFrom) {
      const src = Object.entries(REGISTERS)
        .flatMap(([key, _]) => register(key).entries.map((e) => ({ ...e, key })))
        .filter((e) => e.serialNo === r.identityFrom);
      if (src.length !== 1) {
        throw new Error(`${r.name}: the plan carries a Student ID from ${r.identityFrom}, `
          + `which matches ${src.length} entries in the published registers`);
      }
      if (src[0].identityNo !== r.identity) {
        throw new Error(`${r.name}: the plan gives Student ID ${r.identity} carried from `
          + `${r.identityFrom}, but that certificate carries ${src[0].identityNo}`);
      }
    }
    const ar = arabicNameFor(r.name);
    const sex = SEX[r.name];
    return {
      en: r.name,
      sex: sex ? sex[0] : null,
      sexSource: sex ? sex[1] : null,
      identityNo: r.identity,
      identitySource: r.identitySource,
      certificateSeq: r.certificateSeq,
      replaces: r.replaces,
      carriedFrom: r.identityFrom,
      ar: ar ? ar.ar : null,
      arSource: ar ? ar.source : null,
      arRuling: ar ? ar.ruling : null,
      awardVariant: AWARD_VARIANT[r.name] || null,
    };
  });
}

/**
 * Hold the batch if any child's sex is not on record.
 *
 * The sheet's wording is gendered, so an unrecorded sex is not a blank field —
 * it is a sheet that would have to guess. This gate reads exactly like the
 * Arabic-name gate beside it, and for the same reason.
 */
export function assertSexOnRecord(roll, fail) {
  const missing = roll.filter((s) => !s.sex);
  if (!missing.length) return;
  console.error('\nBATCH HELD — the certificate wording is gendered and these graduands’');
  console.error('sex is not recorded in any SHRS register or approved roll:\n');
  for (const m of missing) console.error(`  ${m.en}`);
  console.error('\nThe Registrar’s Notice of 2 July 2026 lists names and stages and states');
  console.error('no sex. It is not inferred here from a name. Supply it and the batch');
  console.error('issues unchanged.\n');
  fail('sex not on record for every graduand');
}
