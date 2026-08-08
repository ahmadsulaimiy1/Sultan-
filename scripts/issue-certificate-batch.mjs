/**
 * Issue a production batch of stage certificates and its graduation register.
 *
 *     node scripts/issue-certificate-batch.mjs
 *
 * This is not a mock-up generator. It drives the same code the Registrar's
 * Office runs in production — generateStageCertificateSerial for the serial
 * and content hash, formatStudentIdentityNo for the permanent student
 * number, qrSvg for the verification payload, renderStageCertificateBatch
 * for the artwork — against an in-memory sequence rather than Neon. Every
 * identifier it prints is therefore the identifier the live system would
 * have produced for the same inputs, which is what makes the register
 * importable instead of something to be reconciled later.
 *
 * Writes  dist/certificates/<batch>/  — one HTML sheet per student, the
 *                                       combined print file, the register in
 *                                       JSON and Markdown, and the SQL to
 *                                       seed the Registrar's tables.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PROGRAMMES, generateStageCertificateSerial, formatHijri,
} from '../functions/_lib/certificate-serial.js';
import {
  renderStageCertificate, renderStageCertificateBatch,
} from '../functions/_lib/stage-certificate-template.js';
import { formatStudentIdentityNo, isValidStudentIdentityNo } from '../functions/_lib/identity-no.js';
import { qrSvgForPrint } from '../functions/_lib/qrcode.js';
import { PLAN, assertSexOnRecord, rollFor } from './_lib/class-of-2026.mjs';

// ── Batch selection ─────────────────────────────────────────────────────
//     node scripts/issue-certificate-batch.mjs [IBT|IDD]
//
// Every batch the school has issued stays defined in this file, because the
// certificate sequence is GLOBAL — one number is issued once, ever, across
// every stage and every year — so a later batch cannot be numbered without
// knowing where the previous one ended. Keeping them together is also what
// makes each one reproducible on demand rather than only at the moment it
// was first run.
const BATCH_KEY = (process.argv[2] || 'IBT').toUpperCase();

const ACADEMIC_YEAR = '2025/2026';
const ISSUED_AT = '2026-08-08';
// institution_name is NOT NULL in stage_certificates. The renderer never
// reads it (the institution is set in the locked artwork), so it was
// missing here until the register SQL was checked against the schema.
const INSTITUTION_NAME = 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies';
const PLACE_EN = 'Ikorodu, Lagos, Nigeria';
const PLACE_AR = 'إكورودو، لاغوس، نيجيريا';
const ORIGIN = 'https://www.shroyalschools.com';

// ── The grade ───────────────────────────────────────────────────────────
// Never printed (Editorial Bible §1.5 — the certificate attests completion,
// not performance) but NOT optional data: certificateHashFields binds gradeEn
// into the content hash, and verifyStageCertificateIntegrity recomputes it
// from stage_certificates.grade_en on every public lookup. One constant feeds
// both the hash and the register INSERT because the two must be the same
// string or the certificate cannot verify.
//
// It is a constant here rather than an inline literal because the register
// SQL omitted grade_en entirely while the hash was taken over 'Excellent'.
// Importing that file would have loaded six rows whose grade_en is NULL,
// against which the verifier recomputes the '' hash
// (String(gradeEn || '') — certificate-serial.js:63) and gets
// 9bf2573b… instead of a775e194… : all six certificates would have told the
// public 'integrity check failed', with nothing wrong with the documents.
const GRADE_EN = 'Excellent';
// No Arabic grade wording has been approved by the Founder, and nothing hashes
// it. NULL is the honest value — the column is nullable and the Registrar's own
// endpoint writes NULL for a blank gradeAr (registrar/stage-certificates.js:378)
// — whereas any Arabic string put here would be this pipeline's invention
// sitting in a production record.
const GRADE_AR = null;

// ── The graduation registers ────────────────────────────────────────────
// THE ENGLISH NAMES ARE THE FOUNDER'S AND ARE AUTHORITATIVE in every batch.
//
// THE ARABIC IS NOT SUPPLIED. The directives give English only, so the Arabic
// here is this pipeline's rendering — but most of it is not a guess. Wherever
// the Founder has already approved a spelling, that string is carried across
// verbatim rather than re-derived, because the last time this file derived
// Arabic it "improved" seven approved spellings (عليو for علي, أوكوه for أكو,
// أديغوكي for أدغكي). A student's name is whatever their institution records,
// not what a transliteration scheme suggests.
//
// `approvedAr` is a second, independent transcription of `roll`, and the
// script refuses to run if the two disagree by one code point. أ and ا, ي and
// ى, ة and ه are separate characters that look near-identical at body size.
//
// Anything this pipeline can only propose is printed on the register as
// outstanding and put to the Founder before the batch goes to press. When he
// rules on it, the string does not change — only the record of its standing
// does, moving to `confirmedByFounder` with the date of his approval. That is
// the whole approval loop: propose in the open, print the caveat, wait, record.
// The I'dadiyyah roll's six Yoruba/Igbo spellings went through it and were
// approved on 2026-08-06.
//
// `withdrawnEn`/`withdrawnAr` are the names that must NOT appear in THIS
// batch's output. They are per-batch because a name withdrawn from one stage
// can be current in another — which is exactly what happened here.
const BATCHES = {
  // Third and authoritative Ibtida'iyyah roll (Founder, 2026-08-06), which
  // superseded an original seven and an interim six.
  IBT: {
    programme: 'IBT',
    // SEALED. These seven were issued on 2026-08-08 under key version 1 — the
    // development literal, now retired. They cannot be re-minted, because the
    // hash IS the printed serial suffix: a new key would change the number
    // engraved on documents that have already been issued. They keep verifying
    // under DOCUMENT_HASH_SECRET_V1, which is exactly what key versioning is
    // for. Their register INSERT omits hash_key_version and the column's
    // DEFAULT 1 is the correct value for them.
    sealedAtKeyVersion: 1,
    firstCertificateSeq: 35,
    firstIdentitySeq: 35,
    roll: [
      { en: 'Hameedah Adebimpe Ojewumi', ar: 'حميدة أدبيمبي أوجومي',  sex: 'female' },
      { en: 'Aisha Anofi',               ar: 'عائشة حنفي',            sex: 'female' },
      { en: 'Abdulbasit Adedokun',       ar: 'عبد الباسط أددوكن',     sex: 'male' },
      { en: 'Naheemah Ismail',           ar: 'نعيمة إسماعيل',         sex: 'female' },
      { en: 'Ashrof Akorede',            ar: 'أشرف أكوردي',           sex: 'male' },
      { en: 'Imran Adegoke',             ar: 'عمران أدغكي',           sex: 'male' },
      { en: 'Abdulateef Adedokun',       ar: 'عبد اللطيف أددوكن',     sex: 'male' },
    ],
    approvedAr: {
      'Hameedah Adebimpe Ojewumi': 'حميدة أدبيمبي أوجومي',
      'Aisha Anofi':               'عائشة حنفي',
      'Abdulbasit Adedokun':       'عبد الباسط أددوكن',
      'Naheemah Ismail':           'نعيمة إسماعيل',
      'Ashrof Akorede':            'أشرف أكوردي',
      'Imran Adegoke':             'عمران أدغكي',
      'Abdulateef Adedokun':       'عبد اللطيف أددوكن',
    },
    // The original seven, plus the interim six — who are NOT withdrawn
    // students at all: they are the I'dadiyyah roll below. They were on the
    // wrong stage, which is why they may not appear on an Ibtida'iyyah sheet.
    withdrawnEn: [
      'Naheemah Ismail Seriki', 'Ashraf Korede Ojewumi', 'Al-Ameen Okoh',
      'Al-Ameen Abidemi Jokomba', 'Aisha Lawal', 'Imran Iremide Adegoke', 'Daud Aliu',
      'Muhammad Ismail Seriki', 'Baqi Olamiposi Anofi', 'Faridah Ayomide Aliu',
      'Thoirah Makinde', 'Abdulbasit Amobi Jabarr', 'Abdullah Oladimeji Anofi',
      'Seriki', 'Jokomba', 'Lawal', 'Iremide', 'Aliu', 'Abidemi',
      'Olamiposi', 'Ayomide', 'Oladimeji', 'Amobi', 'Jabarr', 'Makinde',
    ],
    withdrawnAr: [
      'نعيمة إسماعيل سركي', 'أشرف كوردي أوجومي', 'الأمين أكو',
      'الأمين أبديمي جوكمبا', 'عائشة لوال', 'عمران إريمدي أدغكي', 'داود علي',
      'محمد إسماعيل سركي', 'باقي أولاميبوسي حنفي', 'فريدة أيومدي علي',
      'طاهرة مكيندي', 'عبد الباسط أموبي جبار', 'عبد الله أولاديميجي حنفي',
      // كوردي and أكو are deliberately absent — both are substrings of أكوردي
      // (Akorede), a current student. The assertion below proved that.
      'سركي', 'جوكمبا', 'لوال', 'إريمدي', 'داود', 'الأمين', 'محمد', 'باقي',
      'أولاميبوسي', 'فريدة', 'أيومدي', 'طاهرة', 'مكيندي', 'أموبي', 'جبار',
      'أولاديميجي', 'عبد الله',
    ],
    arabicNames: {
      status: 'MOSTLY APPROVED — TWO STRINGS AWAIT FOUNDER CONFIRMATION',
      approvedAndCarriedAcross: {
        Naheemah: 'نعيمة', Ismail: 'إسماعيل', Ojewumi: 'أوجومي', Aisha: 'عائشة',
        Imran: 'عمران', Adegoke: 'أدغكي', Ashrof: 'أشرف',
        Akorede: 'أكوردي — on the approved كوردي (Korede)',
        Anofi: 'حنفي — the school’s own name and the Chairman’s signature block',
      },
      standardArabicNoChoiceToMake: {
        Hameedah: 'حميدة', Abdulbasit: 'عبد الباسط', Abdulateef: 'عبد اللطيف',
      },
      awaitingConfirmation: {
        Adebimpe: 'أدبيمبي — Yoruba, no institutional precedent',
        Adedokun: 'أددوكن — Yoruba, no institutional precedent. Borne by two '
          + 'students, so a correction applies to both.',
      },
    },
  },

  // I'dadiyyah — Intermediate Stage (Founder production directive,
  // 2026-08-06). Numbering CONTINUES from the Ibtida'iyyah batch: that batch
  // ran 000035-000041, so this one starts at 000042. The certificate sequence
  // is global — one number is issued once, ever, across every stage — so this
  // is not a convention but the only correct value.
  IDD: {
    programme: 'IDD',
    firstCertificateSeq: 42,
    firstIdentitySeq: 42,
    roll: [
      { en: 'Muhammad Ismail Seriki',    ar: 'محمد إسماعيل سركي',        sex: 'male' },
      { en: 'Baqi Olamiposi Anofi',      ar: 'باقي أولاميبوسي حنفي',     sex: 'male' },
      { en: 'Faridah Ayomide Aliu',      ar: 'فريدة أيومدي علي',         sex: 'female' },
      { en: 'Thoirah Makinde',           ar: 'طاهرة مكيندي',             sex: 'female' },
      { en: 'Abdulbasit Amobi Jabarr',   ar: 'عبد الباسط أموبي جبار',    sex: 'male' },
      { en: 'Abdullah Oladimeji Anofi',  ar: 'عبد الله أولاديميجي حنفي', sex: 'male' },
    ],
    approvedAr: {
      'Muhammad Ismail Seriki':   'محمد إسماعيل سركي',
      'Baqi Olamiposi Anofi':     'باقي أولاميبوسي حنفي',
      'Faridah Ayomide Aliu':     'فريدة أيومدي علي',
      'Thoirah Makinde':          'طاهرة مكيندي',
      'Abdulbasit Amobi Jabarr':  'عبد الباسط أموبي جبار',
      'Abdullah Oladimeji Anofi': 'عبد الله أولاديميجي حنفي',
    },
    // The Ibtida'iyyah roll and the original withdrawn seven. An Ibtida'iyyah
    // student appearing on an I'dadiyyah sheet is the same class of error as
    // a withdrawn one: the wrong award over the right name.
    withdrawnEn: [
      'Hameedah Adebimpe Ojewumi', 'Aisha Anofi', 'Abdulbasit Adedokun',
      'Naheemah Ismail', 'Ashrof Akorede', 'Imran Adegoke', 'Abdulateef Adedokun',
      'Naheemah Ismail Seriki', 'Ashraf Korede Ojewumi', 'Al-Ameen Okoh',
      'Al-Ameen Abidemi Jokomba', 'Aisha Lawal', 'Imran Iremide Adegoke', 'Daud Aliu',
      'Hameedah', 'Adebimpe', 'Ojewumi', 'Aisha', 'Adedokun', 'Naheemah',
      'Ashrof', 'Akorede', 'Imran', 'Adegoke', 'Abdulateef',
      'Okoh', 'Jokomba', 'Lawal', 'Iremide', 'Korede', 'Abidemi', 'Al-Ameen',
    ],
    withdrawnAr: [
      'حميدة أدبيمبي أوجومي', 'عائشة حنفي', 'عبد الباسط أددوكن',
      'نعيمة إسماعيل', 'أشرف أكوردي', 'عمران أدغكي', 'عبد اللطيف أددوكن',
      'حميدة', 'أدبيمبي', 'أوجومي', 'عائشة', 'أددوكن', 'نعيمة', 'أشرف',
      'أكوردي', 'عمران', 'أدغكي', 'عبد اللطيف',
      'أكو', 'كوردي', 'جوكمبا', 'لوال', 'إريمدي', 'داود', 'الأمين', 'أبديمي',
    ],
    arabicNames: {
      status: 'APPROVED BY THE FOUNDER — 2026-08-06',
      approvedAndCarriedAcross: {
        Ismail: 'إسماعيل', Seriki: 'سركي', Aliu: 'علي — the approved form, NOT عليو',
        Anofi: 'حنفي — the school’s own name and the Chairman’s signature block',
      },
      standardArabicNoChoiceToMake: {
        Muhammad: 'محمد', Baqi: 'باقي', Faridah: 'فريدة',
        Abdulbasit: 'عبد الباسط', Abdullah: 'عبد الله', Jabarr: 'جبار',
      },
      // These six were raised as PROPOSED on the first run of this register and
      // were held out of print until the Founder ruled on them. He confirmed
      // all six on 2026-08-06: "I confirm those six Arabic spellings are
      // approved." The strings are unchanged from what was put to him — the
      // approval is recorded here, it does not re-derive anything.
      //
      // The rule that produced the original flag stands and is not softened by
      // this approval: Arabic names are never generated, transliterated or
      // guessed by this pipeline. A name with no approval on record stays off
      // the register.
      confirmedByFounder: {
        date: '2026-08-06',
        names: {
          Olamiposi: 'أولاميبوسي — Yoruba, on the approved أولانريوجو (Olanrewaju), '
            + 'the Chairman’s own middle name',
          Oladimeji: 'أولاديميجي — Yoruba, same pattern',
          // The -mide ending has an approved SHRS form, but its source is a
          // withdrawn student's name. Cited by pattern, never named: this
          // register is a production file, and no withdrawn student may appear
          // in one. The residue gate caught this exact leak on the first run.
          Ayomide: 'أيومدي — the -mide ending follows an approved SHRS precedent',
          Amobi: 'أموبي — Igbo, no institutional precedent',
          Makinde: 'مكيندي — Yoruba, no institutional precedent',
          Thoirah: 'طاهرة — Nigerian orthography also admits ثويرة',
        },
      },
      awaitingConfirmation: {},
    },
  },
};

// ── The rebuilt Class of 2026 stage batches ─────────────────────────────
// Everything above this line is the historical record: what was minted on
// 8 August 2026, reproducible byte for byte, and sealed. Nothing in it changes.
//
// What follows is what must be minted NOW. The Registrar's Notice of 2 July
// 2026 became authoritative later that same day; on it, Tamhidiyyah is a real
// stage of this institution, its graduands hold no Ibtida'iyyah entitlement,
// and every name stands at its fullest recorded form. Four of the seven
// Ibtida'iyyah sheets already minted therefore carry a name that is not the
// child's full name — and because the engraved name is hashed into the engraved
// number, none of them can be corrected in place.
//
// So these are not edits to the batches above. They are new batches, at new
// numbers, replacing sheets that must be revoked. The rolls, the certificate
// numbers and the permanent Student IDs all come from the Class of 2026 plan;
// what is declared here is only what the plan cannot compute — the Arabic.
//
// `approvedAr` stays a HAND-WRITTEN second transcription, as it has always
// been. It is not copied from the register the roll reads its Arabic out of;
// that is the entire point of it. أ and ا, ي and ى, ة and ه look near-identical
// at body size, and the only thing that catches a one-code-point slip is two
// independent transcriptions of the same name disagreeing.
function fromPlan(code, decl) {
  const roll = rollFor(code);
  const mine = roll.map((r) => r.en);
  // The residue guards — names that must NOT appear anywhere in this batch's
  // rendered output. They used to be hand-written per batch, which was workable
  // when there were two rolls and is not workable across seven. They are now
  // derived from the plan itself: every OTHER programme's graduands, by full
  // name and by name-part.
  //
  // A guard that matches a name legitimately on this roll is worse than no
  // guard at all — it rejects every correct batch — so colliding guards are
  // dropped. They are dropped VISIBLY, printed at run time, because a silently
  // shrinking guard list is a gate quietly turning itself off. ('Adegoke' has
  // to go on the Ibtida'iyyah roll for exactly this reason: Imran Iremide
  // Adegoke is on it.)
  const others = [...new Set(PLAN.toMint.filter((r) => r.code !== code).map((r) => r.name)
    .concat(PLAN.actions.filter((a) => a.code !== code).map((a) => a.name)))]
    .filter((n) => !mine.includes(n));
  const parts = [...new Set(others.flatMap((n) => n.split(/\s+/)).filter((w) => w.length > 3))];
  const collides = (g) => mine.some((n) => n.toLowerCase().includes(g.toLowerCase()));
  const dropped = [...others, ...parts].filter(collides);
  if (dropped.length) {
    console.log(`  ${code}: ${dropped.length} residue guard(s) dropped — they match a name `
      + `on this very roll: ${[...new Set(dropped)].join(', ')}`);
  }
  return {
    programme: code,
    firstCertificateSeq: roll[0].certificateSeq,
    // Not a first value plus an offset. The plan allocates a permanent Student
    // ID per CHILD, and a child holding two awards carries one number onto both.
    identityFromPlan: true,
    roll: roll.map((r) => ({
      en: r.en, ar: r.ar, sex: r.sex, identityNo: r.identityNo,
      replaces: r.replaces, carriedFrom: r.carriedFrom, arSource: r.arSource,
    })),
    withdrawnEn: [...others, ...parts].filter((g) => !collides(g)),
    // Arabic guards are only ever the strings this institution has actually
    // approved. Nothing is transliterated to build a guard, any more than to
    // build a name.
    withdrawnAr: [],
    ...decl,
  };
}

// The three name-parts below are the only ones on these rolls whose Arabic is
// already approved AT THE FULL NAME TO BE ENGRAVED. Seven names are not, and
// they are declared outstanding — see docs/shrs-arabic-names-for-ruling-2026.md.
// A form approved for "Naheemah Ismail" is not a form approved for "Naheemah
// Ismail Seriki", and this file will not treat it as one.
const OUTSTANDING = {
  Omoshalewa: 'أمشالوا was ruled for her Qur’an College sheet on 2026-08-07; '
    + 'whether that is the same child is the Founder’s to confirm',
  Abdulhafeez: 'عبد الحفيظ proposed on the عبد الباسط / عبد اللطيف pattern — awaiting confirmation',
  Ameerah: 'أميرة proposed as standard Arabic — awaiting confirmation',
  Korede: 'كوردي is on record; the assembled أشرف كوردي أوجومي awaits confirmation',
  Ashraf: 'أشرف is on record for him as “Ashrof”; the assembly awaits confirmation',
  Ojewumi: 'أوجومي is on record; the assembly awaits confirmation',
  Iremide: 'Yoruba, no institutional precedent — the Founder’s to give',
  Balogun: 'Yoruba, no institutional precedent — the Founder’s to give',
  Yaseer: 'ياسر proposed as standard Arabic — awaiting confirmation',
  Fatih: 'فاتح proposed as standard Arabic — awaiting confirmation',
  Muhammad: 'محمد is on record; “Muhammad Fatih” awaits confirmation as a whole',
  Seriki: 'سركي is on record; the assembled نعيمة إسماعيل سركي awaits confirmation',
  Naheemah: 'نعيمة is on record; the assembly awaits confirmation',
  Ismail: 'إسماعيل is on record; the assembly awaits confirmation',
  Imran: 'عمران is on record; the assembly awaits her middle name',
  Adegoke: 'أدغكي is on record; the assembly awaits his middle name',
  Aisha: 'عائشة is on record; the assembly awaits confirmation',
  Anofi: 'حنفي is the school’s own name; the assembly awaits confirmation',
};

BATCHES.TMH = fromPlan('TMH', {
  approvedAr: { 'Abdulbasit Adedokun': 'عبد الباسط أددوكن' },
  arabicNames: {
    status: 'HELD — one name of two is approved',
    approvedAndCarriedAcross: {
      Adedokun: 'أددوكن — approved on the Ibtidā’iyyah register',
      Abdulbasit: 'عبد الباسط — approved on the Ibtidā’iyyah register',
    },
    standardArabicNoChoiceToMake: {},
    awaitingConfirmation: { Muhammad: OUTSTANDING.Muhammad, Fatih: OUTSTANDING.Fatih },
  },
});

BATCHES.IBT2026 = fromPlan('IBT', {
  approvedAr: {
    'Faridah Ayomide Aliu': 'فريدة أيومدي علي',
    'Muhammad Ismail Seriki': 'محمد إسماعيل سركي',
  },
  arabicNames: {
    status: 'HELD — four of seven names have no approved form at their full length',
    approvedAndCarriedAcross: {
      Faridah: 'فريدة — approved on the I‘dādiyyah register',
      Ayomide: 'أيومدي — confirmed by the Founder, 2026-08-06',
      Aliu: 'علي — the approved form, NOT عليو',
    },
    standardArabicNoChoiceToMake: {},
    awaitingConfirmation: {
      Aisha: OUTSTANDING.Aisha, Omoshalewa: OUTSTANDING.Omoshalewa, Anofi: OUTSTANDING.Anofi,
      Ameerah: OUTSTANDING.Ameerah, Abdulhafeez: OUTSTANDING.Abdulhafeez,
      Ashraf: OUTSTANDING.Ashraf, Korede: OUTSTANDING.Korede, Ojewumi: OUTSTANDING.Ojewumi,
      Imran: OUTSTANDING.Imran, Iremide: OUTSTANDING.Iremide, Adegoke: OUTSTANDING.Adegoke,
      Muhammad: OUTSTANDING.Muhammad, Ismail: OUTSTANDING.Ismail, Seriki: OUTSTANDING.Seriki,
      Naheemah: OUTSTANDING.Naheemah,
    },
  },
});

BATCHES.IDD2026 = fromPlan('IDD', {
  approvedAr: {},
  arabicNames: {
    status: 'HELD — the single name on this roll has no approved Arabic form',
    approvedAndCarriedAcross: {},
    standardArabicNoChoiceToMake: {},
    awaitingConfirmation: { Yaseer: OUTSTANDING.Yaseer, Balogun: OUTSTANDING.Balogun },
  },
});

const BATCH = BATCHES[BATCH_KEY];
if (!BATCH) {
  console.error(`unknown batch "${BATCH_KEY}" — expected one of ${Object.keys(BATCHES).join(', ')}`);
  process.exit(1);
}
// A sealed batch has already been issued. Re-running the issuer for it would
// mint different serial suffixes under the current key and silently invalidate
// every printed copy, so refuse before anything is written. This is not a
// warning: there is no correct way to proceed.
if (BATCH.sealedAtKeyVersion) {
  console.error(`BATCH REJECTED — ${BATCH_KEY} is SEALED at hash key version `
    + `${BATCH.sealedAtKeyVersion} and has already been issued.\n`
    + '  Its content hashes, and therefore the serial suffixes printed on the\n'
    + '  certificates themselves, derive from that key. Re-minting would change\n'
    + '  the number engraved on documents already in circulation.\n'
    + '  It verifies under DOCUMENT_HASH_SECRET_V'
    + `${BATCH.sealedAtKeyVersion}; it is never re-issued.`);
  process.exit(1);
}

const PROGRAMME = BATCH.programme;
const FIRST_CERTIFICATE_SEQ = BATCH.firstCertificateSeq;
// The permanent student numbers are drawn from the same position in the
// register. The generator scatters them — consecutive sequence values land
// 324 billion apart — so a contiguous run here produces student IDs with no
// visible order, which is the point. On import these seed students.identity_no
// directly and student_identity_seq is set past them; never regenerated.
const FIRST_IDENTITY_SEQ = BATCH.firstIdentitySeq;
const CLASS_ROLL = BATCH.roll;
const APPROVED_AR = BATCH.approvedAr;
const WITHDRAWN_ROLL = BATCH.withdrawnEn;
const WITHDRAWN_AR = BATCH.withdrawnAr;

// No two batches may claim the same certificate number. Checked here rather
// than trusted, because the sequence is global and a copy-paste that left
// firstCertificateSeq unchanged would mint a second 000035 in a different
// stage — two real certificates with the same engraved number.
const spans = Object.values(BATCHES).map((b) => ({
  key: b.programme, lo: b.firstCertificateSeq, hi: b.firstCertificateSeq + b.roll.length - 1,
}));
for (const a of spans) {
  for (const b of spans) {
    if (a === b) continue;
    if (a.lo <= b.hi && b.lo <= a.hi) {
      console.error(`BATCH REJECTED — certificate numbers overlap: ${a.key} `
        + `${a.lo}-${a.hi} and ${b.key} ${b.lo}-${b.hi}`);
      process.exit(1);
    }
  }
}

// ── A bilingual award has no monolingual sheets ─────────────────────────
// A stage certificate carries the child's name in Arabic AND in English, on one
// baseline. If one graduand's Arabic name is missing, her sheet would fall back
// to a lone English line while her classmates carry a matched pair — and a
// graduating class whose certificates do not match is not a class.
//
// So the batch stops here, names everyone it is waiting on, and signs nothing.
// It is stated as a hold rather than a failure because nothing is wrong: the
// pipeline is doing the one thing it was built to do, which is refuse to invent
// a child's name.
{
  const missing = CLASS_ROLL.filter((r) => !r.ar);
  if (missing.length) {
    console.error(`\nBATCH HELD — ${BATCH_KEY} is a bilingual award and ${missing.length} of `
      + `${CLASS_ROLL.length} sheets have no approved Arabic name at the full length to be`);
    console.error('engraved. A form approved for a shorter name is NOT a form approved for a');
    console.error('longer one: the printed name is hashed into the printed number.\n');
    for (const m of missing) console.error(`  ${m.en}`);
    console.error('\nNo Arabic name is ever transliterated, generated or guessed here.');
    console.error('See docs/shrs-arabic-names-for-ruling-2026.md. Supply the forms and the');
    console.error('batch issues unchanged.\n');
    process.exit(1);
  }
}

// The certificate wording is gendered; an unrecorded sex is a sheet that would
// have to guess. Applies to the plan-driven rolls, whose graduands reach this
// pipeline for the first time on the Registrar's Notice.
if (BATCH.identityFromPlan) {
  assertSexOnRecord(CLASS_ROLL, (m) => { console.error(`BATCH REJECTED — ${m}`); process.exit(1); });
}

// A guard that matches a CURRENT student is a gate that can never pass; a
// missing guard is a gate that can never fail. This assertion is not
// ceremony — it caught أكو and كوردي inside أكوردي on the Ibtida'iyyah roll,
// which would have rejected every correct batch. English is compared
// case-insensitively, because "Akorede" contains "korede".
const guardFaults = [];
for (const g of [...WITHDRAWN_ROLL, ...WITHDRAWN_AR]) {
  for (const s of CLASS_ROLL) {
    if (s.en.toLowerCase().includes(g.toLowerCase())) {
      guardFaults.push(`guard "${g}" matches current student ${s.en}`);
    }
    if (s.ar.normalize('NFC').includes(g.normalize('NFC'))) {
      guardFaults.push(`guard "${g}" matches current Arabic name ${s.ar} (${s.en})`);
    }
  }
}
if (guardFaults.length) {
  console.error('BATCH REJECTED — withdrawn-roll guard collides with the current roll:\n  '
    + guardFaults.join('\n  '));
  process.exit(1);
}

// ── Every name must have its provenance on record ───────────────────────
// The never-generate rule is only worth as much as the record that proves it
// was kept, and that record is hand-maintained prose sitting next to a roll
// that changes. It had already drifted once: the six I'dadiyyah spellings were
// confirmed by the Founder on 2026-08-06 and the register went on printing them
// as "AWAITING FOUNDER CONFIRMATION", because approving a name and updating the
// block that describes it are two separate acts and only one of them happened.
//
// So it is asserted instead. Every name part on every roll must be accounted
// for in exactly one of the four provenance buckets — approved earlier, standard
// Arabic, confirmed by the Founder, or still outstanding. Exactly one: a name
// listed as both confirmed and awaiting is a contradiction about whether it may
// be printed, and that is the question the whole block exists to answer.
//
// This runs over EVERY batch, not just the one being issued, because the drift
// is silent in whichever batch is not currently rendering.
const provenanceFaults = [];
for (const b of Object.values(BATCHES)) {
  const buckets = {
    approvedAndCarriedAcross: b.arabicNames.approvedAndCarriedAcross || {},
    standardArabicNoChoiceToMake: b.arabicNames.standardArabicNoChoiceToMake || {},
    confirmedByFounder: b.arabicNames.confirmedByFounder?.names || {},
    awaitingConfirmation: b.arabicNames.awaitingConfirmation || {},
  };
  const homes = new Map();
  for (const [bucket, names] of Object.entries(buckets)) {
    for (const k of Object.keys(names)) {
      if (homes.has(k)) {
        provenanceFaults.push(`${b.programme}: "${k}" is in both ${homes.get(k)} `
          + `and ${bucket} — its approval state is ambiguous`);
      } else homes.set(k, bucket);
    }
  }
  for (const s of b.roll) {
    for (const part of s.en.split(/\s+/).filter(Boolean)) {
      if (!homes.has(part)) {
        provenanceFaults.push(`${b.programme}: "${part}" (${s.en}) has no Arabic `
          + 'provenance on record — it must be approved, standard, confirmed or '
          + 'declared outstanding before it can be issued');
      }
    }
  }
  if (b.arabicNames.confirmedByFounder
      && !/^\d{4}-\d{2}-\d{2}$/.test(b.arabicNames.confirmedByFounder.date || '')) {
    provenanceFaults.push(`${b.programme}: confirmedByFounder carries no approval date`);
  }
}
if (provenanceFaults.length) {
  console.error('BATCH REJECTED — Arabic name provenance is incomplete:\n  '
    + provenanceFaults.join('\n  '));
  process.exit(1);
}

// ── Sequence stub ───────────────────────────────────────────────────────
// The only thing the live database contributes to certificate issuance is
// nextval(). Standing in for it here is what lets this script produce real
// identifiers offline; every other value is computed by production code.
function sequenceStub(start) {
  let n = start - 1;
  return async (strings) => {
    const q = strings.join('?');
    if (q.includes('nextval')) return { rows: [{ seq: ++n }] };
    if (q.toLowerCase().includes('count')) return { rows: [{ n: 0 }] };
    throw new Error(`issue-certificate-batch: unexpected query ${q}`);
  };
}

// ── The signing key: fail closed ────────────────────────────────────────
// This line used to read `process.env.DOCUMENT_HASH_SECRET ||
// 'batch-issuance-development-secret'`, and that fallback is how six real
// certificates — now engraved, printed and in students' hands — came to be
// hashed under a development key. Nobody chose it and nobody was warned: the
// run simply succeeded. document-hash.js:26 already refuses an unset secret;
// the fallback was the single line that talked it out of refusing.
//
// Whether to re-mint those six under a real key is the Founder's decision, not
// this script's, so their hashes are reproduced exactly as issued by running
// with DOCUMENT_HASH_SECRET explicitly set to that same literal. What must
// never recur is a batch minted that way by DEFAULT, so the key is now an act.
if (!process.env.DOCUMENT_HASH_SECRET) {
  throw new Error('DOCUMENT_HASH_SECRET is not set — refusing to issue. This '
    + 'script mints production certificates; the key that signs them must be '
    + 'supplied deliberately, never defaulted. To reproduce the 2026-08-08 '
    + 'batches byte for byte, set it to the key they were issued under.');
}
// DOCUMENT_HASH_KEY_VERSION travels with the secret. Omitting it silently
// defaults to version 1 — which is RETIRED, so signing refuses outright rather
// than minting a batch stamped with the wrong key version. Passing it through
// explicitly is what lets the register record which key signed each row.
const env = {
  DOCUMENT_HASH_SECRET: process.env.DOCUMENT_HASH_SECRET,
  DOCUMENT_HASH_KEY_VERSION: process.env.DOCUMENT_HASH_KEY_VERSION,
};
const sql = sequenceStub(FIRST_CERTIFICATE_SEQ);

// ── Issue ───────────────────────────────────────────────────────────────
const issued = [];
for (const [i, student] of CLASS_ROLL.entries()) {
  // A plan-driven roll arrives with its permanent Student ID already resolved —
  // carried from the certificate that already holds it, or allocated once for
  // that child across every award. The sealed batches above still derive theirs
  // from their own first-value, which is how they were minted and must stay.
  const identityNo = student.identityNo || formatStudentIdentityNo(FIRST_IDENTITY_SEQ + i);
  if (!isValidStudentIdentityNo(identityNo)) {
    throw new Error(`invalid student identity number for ${student.en}: ${identityNo}`);
  }
  const gen = await generateStageCertificateSerial(sql, env, {
    programmeCode: PROGRAMME,
    issuedAt: ISSUED_AT,
    studentIdentityNo: identityNo,
    studentFullName: student.en,
    academicYear: ACADEMIC_YEAR,
    // The grade never appears on the certificate or on public verification;
    // it is hashed so the document is bound to the real record.
    gradeEn: GRADE_EN,
  });
  const certId = FIRST_CERTIFICATE_SEQ + i;
  issued.push({
    certId,
    // Which signing key produced contentHash. Stored on the row so this
    // certificate still verifies after the key rotates — see document-hash.js.
    hashKeyVersion: gen.keyVersion,
    studentEn: student.en,
    studentAr: student.ar,
    sex: student.sex,
    identityNo,
    // Recorded on the entry, not read back from the constant at write time, so
    // the register states the grade THIS certificate's hash was taken over.
    gradeEn: GRADE_EN,
    gradeAr: GRADE_AR,
    serialNo: gen.serialNo,
    contentHash: gen.fullHash,
    verifyCode: gen.fullHash.slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, '$1-'),
    documentId: `DID-${ISSUED_AT.slice(0, 4)}-${PROGRAMME}-${String(certId).padStart(7, '0')}`,
    archiveRef: `ARCH/${PROGRAMME}/${ISSUED_AT.slice(0, 4)}/${String(certId).padStart(6, '0')}`,
    verifyUrl: `${ORIGIN}/verify-certificate/?ref=${gen.serialNo}`,
    // What the QR actually carries — see qrUrlFor in the registrar
    // endpoint for why it is shorter than the human-facing URL.
    qrUrl: `${ORIGIN.replace('://www.', '://')}/v/${gen.serialNo}`,
  });
}

// ── Uniqueness gate ─────────────────────────────────────────────────────
// A duplicated identifier in a graduation register is not a cosmetic fault;
// it makes two students' records indistinguishable. Nothing is written
// until every field that must be unique demonstrably is.
const UNIQUE_FIELDS = ['identityNo', 'serialNo', 'contentHash', 'verifyCode',
                       'documentId', 'archiveRef', 'verifyUrl', 'qrUrl'];
const problems = [];
for (const f of UNIQUE_FIELDS) {
  const seen = new Map();
  for (const r of issued) {
    if (seen.has(r[f])) problems.push(`${f} duplicated between ${seen.get(r[f])} and ${r.studentEn}: ${r[f]}`);
    seen.set(r[f], r.studentEn);
  }
}
for (const r of issued) {
  if (!/^\d{15}$/.test(r.identityNo)) problems.push(`${r.studentEn}: student ID is not 15 digits`);
  if (/\b(19|20)\d{2}\b/.test(r.serialNo.split('-').slice(-1)[0])) problems.push(`${r.studentEn}: suffix looks like a year`);
}
if (problems.length) {
  console.error('BATCH REJECTED:\n  ' + problems.join('\n  '));
  process.exit(1);
}

// ── Render ──────────────────────────────────────────────────────────────
const stamp = `${ISSUED_AT}-${PROGRAMME}-${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}`;
const dir = join(process.cwd(), 'dist/certificates', stamp);
mkdirSync(dir, { recursive: true });

const toRow = (r) => ({
  id: r.certId,
  serial_no: r.serialNo,
  student_identity_no: r.identityNo,
  student_full_name: r.studentEn,
  student_full_name_ar: r.studentAr,
  student_sex: r.sex,
  programme_code: PROGRAMME,
  programme_label_en: PROGRAMMES[PROGRAMME].labelEn,
  programme_label_ar: PROGRAMMES[PROGRAMME].labelAr,
  academic_year: ACADEMIC_YEAR,
  place_en: PLACE_EN,
  place_ar: PLACE_AR,
  issued_at: ISSUED_AT,
  issued_at_hijri: formatHijri(ISSUED_AT, 'en'),
  issued_at_hijri_ar: formatHijri(ISSUED_AT, 'ar'),
  content_hash: r.contentHash,
});

const items = issued.map((r) => ({
  cert: toRow(r),
  qrSvgMarkup: qrSvgForPrint(r.qrUrl, { errorCorrectionLevel: 'H', margin: 4 }),
  verifyUrl: r.verifyUrl,
}));

for (const [i, item] of items.entries()) {
  writeFileSync(join(dir, `${String(issued[i].certId).padStart(6, '0')}-${issued[i].identityNo}.html`),
    renderStageCertificate(item));
}
writeFileSync(join(dir, 'batch-print.html'),
  renderStageCertificateBatch(`SHRS ${PROGRAMMES[PROGRAMME].labelEn} — ${stamp}`, items));

// ── Register ────────────────────────────────────────────────────────────
writeFileSync(join(dir, 'graduation-register.json'), JSON.stringify({
  programme: PROGRAMME,
  programmeLabelEn: PROGRAMMES[PROGRAMME].labelEn,
  programmeLabelAr: PROGRAMMES[PROGRAMME].labelAr,
  academicYear: ACADEMIC_YEAR,
  issuedAt: ISSUED_AT,
  issuedAtHijri: formatHijri(ISSUED_AT, 'en'),
  place: PLACE_EN,
  firstCertificateSeq: FIRST_CERTIFICATE_SEQ,
  count: issued.length,
  // Carried in the register rather than left as a code comment, because
  // this is the one fact a registrar must know before the batch is printed.
  arabicNames: {
    reason: 'The Founder\u2019s directive supplied English names only. English is '
      + 'authoritative. Where a spelling had already been approved on an earlier '
      + 'register it is carried across unchanged rather than re-derived. Anything '
      + 'this pipeline could only propose was put to the Founder before print: '
      + 'once ruled on it moves to confirmedByFounder with the date of his '
      + 'approval, and anything still outstanding stays under awaitingConfirmation. '
      + 'A name is never generated, transliterated or guessed here.',
    ...BATCH.arabicNames,
  },
  entries: issued,
}, null, 2) + '\n');

const md = [
  `# SHRS Graduation Register — ${PROGRAMMES[PROGRAMME].labelEn}`,
  '',
  `Academic session ${ACADEMIC_YEAR} · issued ${ISSUED_AT} (${formatHijri(ISSUED_AT, 'en')}) · ${PLACE_EN}`,
  '',
  `${issued.length} certificates, numbered from ${String(FIRST_CERTIFICATE_SEQ).padStart(6, '0')}.`,
  'Grades are recorded in the student record and bound into the content hash;',
  'they appear neither on the certificate nor on public verification.',
  '',
  // Generated from the batch's own arabicNames block rather than written by
  // hand, so the register can never disagree with the issuer about which
  // spellings are the Founder's and which are this pipeline's proposal.
  `> **Arabic names — ${BATCH.arabicNames.status}**`,
  '> The directive supplied English names only, and the English is authoritative.',
  ...(Object.keys(BATCH.arabicNames.approvedAndCarriedAcross || {}).length ? [
    '>',
    '> *Already approved by the Founder and carried across unchanged:* '
      + Object.entries(BATCH.arabicNames.approvedAndCarriedAcross)
        .map(([k, v]) => `${v.split(' — ')[0]} (${k})`).join(', ') + '.',
  ] : []),
  ...(Object.keys(BATCH.arabicNames.standardArabicNoChoiceToMake || {}).length ? [
    '>',
    '> *Standard Arabic, no transliteration choice to make:* '
      + Object.entries(BATCH.arabicNames.standardArabicNoChoiceToMake)
        .map(([k, v]) => `${v} (${k})`).join(', ') + '.',
  ] : []),
  // A spelling put to the Founder and ruled on, and a spelling still waiting on
  // him, are different facts about a name and a registrar must be able to tell
  // them apart. Both lists render from the batch's own block, and each header
  // is omitted when its list is empty — so a batch with nothing outstanding
  // does not print an empty "awaiting" heading that reads as an open item.
  ...(Object.keys(BATCH.arabicNames.confirmedByFounder?.names || {}).length ? [
    '>',
    `> *Raised as proposed on the first run and **confirmed by the Founder on `
      + `${BATCH.arabicNames.confirmedByFounder.date}**, unchanged from what was put to him:*`,
    ...Object.entries(BATCH.arabicNames.confirmedByFounder.names)
      .map(([k, v]) => `> · **${v.split(' — ')[0]}** (${k})${v.includes(' — ') ? ' — ' + v.split(' — ').slice(1).join(' — ') : ''}`),
  ] : []),
  ...(Object.keys(BATCH.arabicNames.awaitingConfirmation || {}).length ? [
    '>',
    '> **Awaiting the Founder\'s confirmation before print:**',
    ...Object.entries(BATCH.arabicNames.awaitingConfirmation)
      .map(([k, v]) => `> · **${v.split(' — ')[0]}** (${k})${v.includes(' — ') ? ' — ' + v.split(' — ').slice(1).join(' — ') : ''}`),
  ] : []),
  '',
  '| # | Student | الاسم | Student ID | Certificate Number | Document ID | Archive |',
  '|---|---------|-------|------------|--------------------|-------------|---------|',
  ...issued.map((r, i) => `| ${i + 1} | ${r.studentEn} | ${r.studentAr} | ${r.identityNo} | ${r.serialNo} | ${r.documentId} | ${r.archiveRef} |`),
  '',
  '## Verification codes',
  '',
  '| Student | Verification code | Verify URL |',
  '|---------|-------------------|------------|',
  ...issued.map((r) => `| ${r.studentEn} | ${r.verifyCode} | ${r.verifyUrl} |`),
  '',
].join('\n');
writeFileSync(join(dir, 'graduation-register.md'), md);

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
// A column with no approved value is NULL, never the empty string: '' and NULL
// are different facts ("blank" vs "not recorded"), and only one of them is what
// the Registrar's own endpoint writes for an unsupplied field.
const qOrNull = (v) => (v === null || v === undefined ? 'NULL' : q(v));
const sqlOut = [
  '-- SHRS graduation register import.',
  '-- Student numbers are permanent and already printed, so they are seeded',
  '-- rather than generated, and the sequence is advanced past them so the',
  '-- registrar never re-issues one of these values to a different student.',
  ...issued.map((r) => `UPDATE students SET identity_no = ${q(r.identityNo)} WHERE full_name = ${q(r.studentEn)} AND identity_no IS NULL;`),
  // For a plan-driven batch this is past the WHOLE Class of 2026 allocation, not
  // just this batch's slice: the plan allocates Student IDs per child across
  // every batch, so a value covering only this run would let the next issuance
  // mint a number already engraved on a sheet from a later batch in the plan.
  `SELECT setval('student_identity_seq', ${BATCH.identityFromPlan
    ? PLAN.identityAllocatedThrough : FIRST_IDENTITY_SEQ + issued.length - 1}, true);`,
  '',
  // Column list checked against sql/schema.sql, not written from memory.
  // The previous version named a `status` column that stage_certificates
  // has never had (it records revoked_at / revocation_note) and omitted
  // programme_label_en and institution_name, both NOT NULL — so this file
  // could not actually be imported. A register that cannot be imported is
  // not a register.
  //
  // grade_en is here for a harder reason than schema completeness: it is one
  // of the seven fields the content hash is taken over (certificateHashFields
  // — certificate-serial.js:56-66), and verifyStageCertificateIntegrity reads
  // it back off THIS ROW on every public lookup. The column list omitted it,
  // so importing this file would have left grade_en NULL, the verifier would
  // have recomputed the hash over '' instead of 'Excellent', and every one of
  // these certificates would have publicly reported 'integrity check failed'
  // — six correct documents called forgeries by their own registry.
  ...issued.map((r) => `INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (${r.certId}, ${q(r.serialNo)}, ${q(r.identityNo)}, ${q(r.studentEn)}, ${q(r.studentAr)}, ${q(r.sex)}, ${q(PROGRAMME)}, ${q(PROGRAMMES[PROGRAMME].labelEn)}, ${q(PROGRAMMES[PROGRAMME].labelAr)}, ${q(INSTITUTION_NAME)}, ${q(ACADEMIC_YEAR)}, ${q(r.gradeEn)}, ${qOrNull(r.gradeAr)}, ${q(PLACE_EN)}, ${q(PLACE_AR)}, ${q(ISSUED_AT)}, ${q(formatHijri(ISSUED_AT, 'en') || '')}, ${q(formatHijri(ISSUED_AT, 'ar') || '')}, ${q(r.contentHash)}, ${r.hashKeyVersion});`),
  '',
  '-- The sequence name is stage_certificate_serial_seq (sql/schema.sql).',
  '-- An earlier version of this file said stage_certificate_seq, which does',
  '-- not exist. That is not a cosmetic slip: if the sequence is not advanced',
  '-- past these certificates, the Registrar re-issues 000035 to a different',
  '-- student in a later year — and because the number PRINTED on the',
  '-- certificate is now SHRS-CERT-IBT-000035 with no year, those two',
  '-- documents would carry the identical printed number.',
  `SELECT setval('stage_certificate_serial_seq', ${FIRST_CERTIFICATE_SEQ + issued.length - 1}, true);`,
  '',
  '-- stage_certificates.id has a sequence of its own (id SERIAL PRIMARY KEY —',
  '-- sql/schema.sql), and an INSERT that supplies id explicitly, as every row',
  '-- above does, does NOT advance it. Advancing the serial sequence alone is',
  '-- therefore not enough, and the failure is silent rather than loud: every',
  '-- id below this batch is still free, so the next certificate issued through',
  '-- the Registrar UI inserts cleanly and gets id 1.',
  '--',
  '-- That decouples two numbers the certificate prints side by side. The',
  '-- archive reference and the Code 128 payload both derive from cert.id',
  '-- (stage-certificate-template.js:1240-1242 — ARCH/<PROG>/<year>/<id6> and',
  '-- <year><id6>), while the engraved certificate number derives from the',
  '-- serial sequence. A certificate numbered 000048 would carry archive',
  '-- reference ARCH/IDD/2026/000001 and scan as 2026000001 — a document whose',
  '-- barcode and whose number name two different records.',
  '--',
  '-- pg_get_serial_sequence resolves the sequence from the column rather than',
  '-- assuming its name, and MAX(id) makes the statement independent of the',
  '-- order the registers are imported in: importing IBT after IDD must not',
  '-- wind the sequence back to this batch\'s own last id.',
  `SELECT setval(pg_get_serial_sequence('stage_certificates', 'id'),`,
  `              GREATEST((SELECT MAX(id) FROM stage_certificates), ${FIRST_CERTIFICATE_SEQ + issued.length - 1}), true);`,
  '',
  '-- Make the PRINTED number unique in the database, not merely unique by',
  '-- convention. serial_no already has a UNIQUE constraint, but two rows',
  '-- differing only in year and hash suffix satisfy it while collapsing to',
  '-- the same engraved number. This index is what actually forbids that.',
  "CREATE UNIQUE INDEX IF NOT EXISTS stage_certificates_printed_no_uniq",
  "  ON stage_certificates ((split_part(serial_no, '-', 3) || '-' || split_part(serial_no, '-', 5)));",
  '',
].join('\n');
writeFileSync(join(dir, 'graduation-register.sql'), sqlOut);

console.log(`issued ${issued.length} certificates into dist/certificates/${stamp}`);
for (const r of issued) {
  console.log(`  ${String(r.certId).padStart(6, '0')}  ${r.identityNo}  ${r.serialNo}  ${r.studentEn}`);
}
console.log('uniqueness: all', UNIQUE_FIELDS.length, 'identifier fields distinct across the batch');

// ── Residue gate ────────────────────────────────────────────────────────
// "No information from the earlier list should remain in the final
// production files." A stale sheet left in the output directory from the
// withdrawn roll would still print, still scan and still resolve, and the
// old roll had SEVEN students to this one's six — so certificate 000041
// exists on disk from the previous run and belongs to nobody now. Reading
// every file that was just written is the only way to know it is gone;
// regenerating on top of a directory does not delete what it no longer
// produces.
const residue = [];
for (const f of readdirSync(dir)) {
  const body = readFileSync(join(dir, f), 'utf8');
  for (const name of WITHDRAWN_ROLL) {
    if (body.includes(name)) residue.push(`${f}: withdrawn student "${name}"`);
  }
  for (const frag of WITHDRAWN_AR) {
    if (body.includes(frag)) residue.push(`${f}: withdrawn Arabic name fragment "${frag}"`);
  }
}
// Anything numbered beyond this batch is a leftover sheet, by definition.
for (const f of readdirSync(dir)) {
  const m = f.match(/^(\d{6})-\d{15}\.html$/);
  if (m && +m[1] > FIRST_CERTIFICATE_SEQ + issued.length - 1) {
    residue.push(`${f}: sheet numbered past the end of this batch`);
  }
}
if (residue.length) {
  console.error('BATCH REJECTED — withdrawn roll still present in the output:\n  '
    + residue.join('\n  ')
    + `\n\nDelete dist/certificates/${stamp} and re-run. Regenerating over a stale`
    + '\ndirectory leaves sheets that still print, still scan and belong to nobody.');
  process.exit(1);
}
console.log(`residue: no trace of the withdrawn roll in any of the ${readdirSync(dir).length} output files`);
