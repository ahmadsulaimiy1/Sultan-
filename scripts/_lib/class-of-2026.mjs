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
  // The Founder ruled this the authoritative institutional name on 15 August
  // 2026 and the canonical roll now carries it on both her awards, so the
  // longer variant it used to carry is gone from every roll. Her sex is not an
  // inference either way: the published Ibtida'iyyah register records her under
  // exactly this name, female, at
  // docs/graduation-registers/2026-08-08-IBT-000035.json.
  'Naheemah Ismail': ['female', 'IBT register'],
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
  // RULED BY THE FOUNDER, 15 August 2026, for the certificate recovery. These
  // three reached this pipeline on the Registrar's Notice of 2 July 2026, which
  // states no sex, and the batches held rather than infer one from a name. The
  // Founder has now stated each. Recorded here — in the canonical data source,
  // not in a batch script — so the answer is given once and every future run,
  // for every certificate type, reads the same fact.
  'Allison Ganiyah': ['female', 'ruled by the Founder, 2026-08-15'],
  'Jubril Lawal': ['male', 'ruled by the Founder, 2026-08-15'],
  'Sofiah Anofi': ['female', 'ruled by the Founder, 2026-08-15'],
  // The last fact this recovery was waiting on. His I‘dādiyyah sheet is the
  // only one still held, and it was held here — the certificate wording is
  // gendered, so an unrecorded sex is not a blank field but a sheet that would
  // have to guess. Confirmed by the Founder rather than read off the name,
  // which is the whole point of this table.
  'Yaseer Balogun': ['male', 'confirmed by the Founder, 2026-08-15'],
  // STILL NOT RECORDED — no ruling covers him, and he is on no roll this
  // recovery issues, so nothing is waiting on it.
  //   Muhammad Fatih
};

// ── Arabic names approved outside the published registers ───────────────────
// Names the institution holds in Arabic that are not on a published register —
// because they were ruled for a sheet not yet minted, or, for the last two,
// written here under the Founder's authorisation.
//
// Every entry carries its `source`, and the sources are not interchangeable.
// "Supplied by the Founder" and "written by this pipeline under his
// authorisation" are different kinds of fact about a child's name, and the
// difference is the whole reason this field exists.
const APPROVED_AR = {
  // Supplied by the Founder on 7 August 2026 for the Qur'an College sheet, and
  // marked LOCKED by him after he corrected it twice himself — "Zainab Anofi",
  // then "Zaynab Omobolanle Anofi", then this. It was carried on the Qur'an
  // College roll before that roll moved into this file, and was dropped in the
  // move; the batch then held for want of a name the institution already had.
  // Restored verbatim from the roll he ruled on, not re-derived: this pipeline
  // never transliterates a child's name.
  'Zaynab Zakariya Anofi': {
    ar: 'زينب زكريا حنفي',
    source: 'supplied by the Founder, 2026-08-07, and marked LOCKED',
  },
  // ── Written under the Founder's authorisation of 15 August 2026 ──────────
  // "You can issue Arabic name transcription where correct and careful to
  // understand." Until that ruling this file held no name the institution had
  // not itself written down. These two are the exception, and they are marked
  // as such so a reader can always tell which spellings the school ruled and
  // which it authorised this pipeline to render.
  //
  // Neither is a hard case, and the two are not the same kind of thing:
  //
  //   أميرة عبد الحفيظ  is not a transcription at all. Both parts are Arabic
  //     names. عبد الحفيظ is the theophoric on al-Ḥafīẓ — the Preserver, one of
  //     the Divine Names — and the school's own Ibtidā'iyyah register already
  //     carries the identical construction twice, in عبد الباسط for Abdulbasit
  //     and عبد اللطيف for Abdulateef. أميرة is Amīrah. Nothing is invented;
  //     the name is simply written in the script it comes from.
  //
  //   ياسر بالوغون  is half and half, and the half that matters is stated
  //     plainly. ياسر is Yāsir, an Arabic name. بالوغون is Yoruba and this
  //     institution has never written it in Arabic — so it is a real
  //     transcription, and it follows the conventions of the school's OWN
  //     published registers rather than any general scheme: they render a
  //     Yoruba g with غ and a j with ج, and give the long vowels their letters.
  //     Ba-lo-gun therefore comes out با-لو-غون.
  //
  // بالوغون is the only spelling on any roll this school received from its
  // software rather than the other way round. One line replaces it if the
  // Founder or the family prefers another form; nothing is minted yet.
  'Ameerah Abdulhafeez': {
    ar: 'أميرة عبد الحفيظ',
    source: 'written under the Founder’s authorisation, 2026-08-15 — an Arabic '
      + 'name in its own script, on the عبد الباسط / عبد اللطيف pattern this '
      + 'register already carries',
  },
  'Yaseer Balogun': {
    ar: 'ياسر بالوغون',
    source: 'ياسر is the Arabic name Yāsir; بالوغون is TRANSCRIBED by this '
      + 'pipeline under the Founder’s authorisation, 2026-08-15, on the '
      + 'convention of the published registers — غ for a Yoruba g, and letters '
      + 'for the long vowels',
  },
  'Aisha Omoshalewa Anofi': {
    ar: 'عائشة أمشالوا حنفي',
    source: 'ruled by the Founder, 2026-08-07, for the Qur’an College roll',
    pipelineProposed: 'عائشة أوموشاليوا حنفي',
    note: 'The Founder’s form differs from the proposal and governs. A family’s '
      + 'own spelling of its own name is not a pattern to be extrapolated.',
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

// ── Engraved names are NOT ruled on here ────────────────────────────────────
// A ruling that changes the name a certificate is engraved with belongs in
// scripts/build-canonical-roll.mjs (RULED_FORM), beside the Registrar's own
// transcription and the fullest-form rule it overrides — not here, and not in
// the generated plan, which is rebuilt from the roll on every run.
//
// The reason is not tidiness. The engraved name is hashed into the certificate
// number, so the name has to be settled before the roll is built, or the plan
// allocates a sequence against a name that is about to change. A ruling applied
// downstream of the plan renumbers nothing and silently disagrees with it.

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
    // The name is taken from the plan as it stands. It is not adjusted here:
    // the plan was allocated against this exact string, and the string is
    // hashed into the certificate number, so a correction made at this point
    // would produce a number the plan does not know about. Corrections belong
    // in build-canonical-roll.mjs, upstream of the allocation.
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
