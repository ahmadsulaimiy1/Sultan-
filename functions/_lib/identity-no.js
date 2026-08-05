// Institutional Identity Number Architecture Directive (Founder, Head of
// Schools & Chairman-approved correction of the original Digital Identity
// System pattern):
// every SHR- (missing the "S" for "Schools") number in this file has
// been replaced with an SHRS- one, and every COUNT(*)+1 sequence with a
// real, atomic PostgreSQL sequence — the same upgrade staff numbers
// already had under the "SHRS Master Identity Architecture Directive"
// below. See docs/digital-identity-system.md for the full rationale:
// letter/name-derived numbering (e.g. converting a person's initials
// into digits) was considered and explicitly declined — collision-
// prone, trivially reproducible, and not how real institutions,
// ministries, or banks build permanent identifiers. Every number here
// is institution code + division/role code + date + a real sequence.
//
// Same lazy-generate-and-persist pattern as certificate reference
// numbers (functions/api/portal/staff/registrar/certificates.js) —
// generated the first time that person's "My ID Card" view is
// requested, then stored so it never changes again.
//
// Neon's serverless `sql` tagged-template driver has no `.unsafe()`/
// raw-identifier escape hatch (checked: not present in
// @neondatabase/serverless), so table names can't be interpolated into
// one shared query the way a normal value can — this is separate
// functions per table instead of one parameterised helper, not a
// stylistic choice.

// ── Permanent Student Identity Number, v3 (Founder directive) ──────────
// A student's identity_no is their permanent Student Digital Identity
// Number: assigned once, never changed again — unlike admission_no
// (below), it does not vary if the student changes school, class, or
// campus.
//
// The two earlier shapes, SHRS-<YYMMDD>-<seq6> and then
// SHRS-STU-<YYYY>-NG-<seq6>, are both retired for NEW issuance: each
// published a date and an unpadded position in the intake queue, so
// anyone holding two cards could read cohort size and join order off
// them. Numbers already issued in those shapes stay exactly as issued
// and remain resolvable (permanence beats format uniformity —
// regeneration remains an explicit, admin-only bulk action).
//
// The new number is 15 digits, nothing else.
//
//   [2] institution   71, fixed — distinguishes SHRS from the staff series
//   [12] record body  a keyed permutation of the identity sequence
//   [1] check digit   Luhn
//
// The body is `(seq * MULT + OFFSET) mod 10^12`. MULT is coprime to 10^12
// and adding a constant is itself a bijection, so the map as a whole is a
// BIJECTION: distinct sequence values cannot collide, and the number is
// fully deterministic and reversible by the institution — the registrar can
// recover the record from the ID, which a hash would not allow. It is also
// non-adjacent: consecutive intakes land 324 billion apart, so two cards
// reveal nothing about order or volume.
//
// The OFFSET is not decoration, and the first multiplier was replaced
// because of what it did without one. A pure `seq * MULT` does not wrap
// until seq exceeds 10^12/MULT, so for the first thousand-odd students the
// body is simply a small multiple of the multiplier and inherits its digit
// structure wholesale. The retired multiplier, 617283945671, sits within a
// whisker of 5e13/81 — and 1/81 = 0.012345679… — so its small multiples
// reproduced that expansion: sequence 18 gave 711111110220782 and sequence
// 20 gave 713456789134204. Across the first hundred students, 47% of the
// numbers carried a visible run. Adding a large offset removes the
// small-multiple regime entirely; measured over the first 600 students the
// rate is 1.33%, against the 1.86% that genuinely random 12-digit numbers
// hit by chance. scripts/test-student-identity-no.mjs asserts this, because
// nothing about collisions or check digits could ever have caught it.
//
// Surname encoding was considered and declined, per the Founder's own
// recommendation: mixing a name into the body destroys the bijection and
// reintroduces the collision risk it was meant to remove, without adding
// uniqueness the sequence does not already guarantee.
const STUDENT_ID_INSTITUTION = '71';
const STUDENT_ID_MULT = 324_453_718_779n;   // coprime to 10^12
const STUDENT_ID_OFFSET = 118_468_187_279n;
const STUDENT_ID_MOD = 1_000_000_000_000n;  // 12-digit body

function luhnCheckDigit(digits) {
  let sum = 0;
  let dbl = true;                     // rightmost body digit is doubled
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return String((10 - (sum % 10)) % 10);
}

export function formatStudentIdentityNo(seq) {
  const body = String((BigInt(seq) * STUDENT_ID_MULT + STUDENT_ID_OFFSET) % STUDENT_ID_MOD).padStart(12, '0');
  const stem = STUDENT_ID_INSTITUTION + body;
  return stem + luhnCheckDigit(stem);
}

// Validate a number without a database round trip — used by the public
// verification endpoint to reject typos before querying.
export function isValidStudentIdentityNo(value) {
  const v = String(value || '');
  if (!/^\d{15}$/.test(v)) return false;
  return luhnCheckDigit(v.slice(0, 14)) === v[14];
}

export async function ensureStudentIdentityNo(sql, studentId) {
  const existing = await sql`SELECT identity_no, created_at FROM students WHERE id = ${studentId}`;
  const row = existing.rows[0];
  if (!row) return null;
  // Numbers already issued are never rewritten — a permanent identifier
  // that changes is not permanent. Existing SHRS-STU-… cards stay valid and
  // resolvable; only new students receive the 15-digit form.
  if (row.identity_no) return row.identity_no;
  const seqRes = await sql`SELECT nextval('student_identity_seq') AS seq`;
  const identityNo = formatStudentIdentityNo(seqRes.rows[0].seq);
  await sql`UPDATE students SET identity_no = ${identityNo} WHERE id = ${studentId}`;
  return identityNo;
}

// A guardian's identity_no: SHRS-PAR-<YYMMDD registered>-<seq6>.
export async function ensureGuardianIdentityNo(sql, guardianId) {
  const existing = await sql`SELECT identity_no, created_at FROM guardians WHERE id = ${guardianId}`;
  const row = existing.rows[0];
  if (!row) return null;
  if (row.identity_no) return row.identity_no;
  const dateStamp = formatYYMMDD(row.created_at) || formatYYMMDD(new Date());
  const seqRes = await sql`SELECT nextval('guardian_identity_seq') AS seq`;
  const seq = String(seqRes.rows[0].seq).padStart(6, '0');
  const identityNo = `SHRS-PAR-${dateStamp}-${seq}`;
  await sql`UPDATE guardians SET identity_no = ${identityNo} WHERE id = ${guardianId}`;
  return identityNo;
}

// Force-regenerates into the current format, same "knowingly breaks
// already-issued QR codes/links" trade-off as regenerateStaffIdentityNo
// below — used only by the bulk admin migration action.
export async function regenerateStudentIdentityNo(sql, studentId) {
  await sql`UPDATE students SET identity_no = NULL WHERE id = ${studentId}`;
  return ensureStudentIdentityNo(sql, studentId);
}
export async function regenerateGuardianIdentityNo(sql, guardianId) {
  await sql`UPDATE guardians SET identity_no = NULL WHERE id = ${guardianId}`;
  return ensureGuardianIdentityNo(sql, guardianId);
}

// students.admission_no — the Institutional Student Number, distinct
// from identity_no above: school-scoped and admission-year-scoped
// rather than permanent, e.g. SHRS-RC-26-000154 (Royal College, 2026
// admission cohort). SCHOOL is the same four-institution split used
// sitewide, coded to match this specific number's own directive rather
// than reusing the staff UNIT codes (which spell Nursery and Primary as
// "NPS", not "NP") — the two numbering families are independent by
// design. Sequence is scoped per school per admission year, matching
// the existing COUNT(*)+1 convention already used for certificate and
// finance numbers (see functions/_lib/finance-no.js) — admission volume
// is far too low for the race condition that justified a real sequence
// for staff/student/guardian numbers.
const SCHOOL_CODE_BY_INSTITUTION_NAME = {
  'Royal College': 'RC',
  'Nursery and Primary': 'NP',
  'Islamic and Arabic Studies': 'IAS',
  "Qur'an College": 'QC',
};

export async function generateAdmissionNo(sql, institutionName, admissionYear) {
  const school = SCHOOL_CODE_BY_INSTITUTION_NAME[institutionName] || 'GEN';
  const yy = String(admissionYear).slice(-2);
  const prefix = `SHRS-${school}-${yy}-`;
  const countRes = await sql`SELECT count(*)::int AS n FROM students WHERE admission_no LIKE ${prefix + '%'}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

// Calendar-digit date formatter shared by every identity number in this
// file — YYMMDD, no timezone math, so "31 July 2026" always becomes
// 260731 regardless of the server's local offset (same reasoning as
// formatJoinDate below, just a different digit order: YYMMDD reads as
// the internationally recognised ISO-8601 ordering an external auditor
// or ministry official would expect, vs. staff numbers' existing DDMMYY
// which predates this directive and is left unchanged to avoid
// re-migrating every already-issued staff card for a cosmetic reorder).
function formatYYMMDD(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return yy + mm + dd;
}

// --- Staff: SHRS Master Identity Architecture ------------------------
//
// Format: SHRS-[UNIT]-[OFFICE]-[JOINDATE]-[SEQUENCE]
//   e.g.  SHRS-HQ-CEO-130726-000001
//
// UNIT   — which of the four schools this staff member's real office/
//          institution places them in, or a school-wide body:
//            RC=Royal College, NPS=Nursery and Primary,
//            IAS=Islamic and Arabic Studies, QC=Qur'an College,
//            BOT=Board of Governors (incl. its standing committees),
//            MGT=Management Council, HQ=every other school-wide office
//          (Executive, Finance, HR, ICT, etc.)
// OFFICE — a 3-letter code for the staff member's real office (see
//          OFFICE_CODE_BY_SLUG below for the full mapping against this
//          project's actual seeded office slugs — sql/schema.sql). A
//          staff member with no office_id but a real department_id
//          (teaching staff) gets EDU; the Designated Safeguarding Lead
//          role (staff_roles.role_code = 'DSL') only overrides this when
//          that person has no formal office of their own to code from.
// JOINDATE — the person's real staff.date_joined, DDMMYY. A record with
//          no date_joined on file is left ungenerated rather than given
//          a fabricated date — see ensureStaffIdentityNo below.
// SEQUENCE — a real, atomic, never-reused PostgreSQL sequence
//          (staff_identity_seq — sql/schema.sql), not the previous
//          COUNT(*)+1 pattern, which had a genuine race condition under
//          concurrent requests.
// NOTE: the 'CEO' and 'BOT' values below are stable 3-letter identity-
// number codes, not display labels — already-issued numbers like
// SHRS-CEO-000001/SHRS-BOT-000001 depend on them and they are
// deliberately NOT renamed. The office they represent is now titled
// "Head of Schools / Administrator" (slug 'executive') and "Board of
// Governors" (slug 'board-of-trustees') respectively wherever a human
// sees the name.
const OFFICE_CODE_BY_SLUG = {
  'executive': 'CEO',
  'registrar': 'REG',
  'finance': 'FIN',
  'principal-royal-college': 'PRN',
  'head-teacher': 'HTM',
  'raees': 'RAE',
  'mudeer': 'MDR',
  'student-affairs': 'SAO',
  'digital-services': 'ICT', // ICT Office's real slug
  'board-of-trustees': 'BOT',
  'management-council': 'MGT',
  'strategic-planning': 'SPL',
  'quality-assurance': 'QAS',
  'legal-compliance': 'LGC',
  'public-affairs': 'PUB',
  'academic-affairs': 'AAF',
  'examinations': 'EXM',
  'admissions': 'ADM',
  'hr': 'HRO',
  'communications': 'COM',
  'digital-learning': 'DLI',
  'library': 'LIB',
  'alumni': 'ALM',
  'foundation': 'FDN',
  'certificates': 'CRT',
  'digital-identity': 'DID',
  'knowledge-base': 'KBS',
};

const UNIT_BY_INSTITUTION_NAME = {
  'Royal College': 'RC',
  'Nursery and Primary': 'NPS',
  'Islamic and Arabic Studies': 'IAS',
  "Qur'an College": 'QC',
};

function unitCodeFor(row) {
  const slug = row.office_slug;
  if (slug === 'board-of-trustees' || (slug && slug.startsWith('committee-'))) return 'BOT';
  if (slug === 'management-council') return 'MGT';
  if (row.institution_name && UNIT_BY_INSTITUTION_NAME[row.institution_name]) {
    return UNIT_BY_INSTITUTION_NAME[row.institution_name];
  }
  return 'HQ';
}

async function officeCodeFor(sql, staffId, row) {
  if (row.office_slug) {
    if (row.office_slug.startsWith('committee-')) return 'BOT';
    if (OFFICE_CODE_BY_SLUG[row.office_slug]) return OFFICE_CODE_BY_SLUG[row.office_slug];
  }
  if (row.department_id) return 'EDU';
  const dslRes = await sql`
    SELECT 1 FROM staff_roles
    WHERE staff_id = ${staffId} AND role_code = 'DSL' AND is_active = true AND revoked_at IS NULL LIMIT 1`;
  if (dslRes.rows.length) return 'DSL';
  return 'STF';
}

// staff.date_joined comes back from Neon as either a JS Date or an
// ISO-ish string depending on the driver path — handled explicitly
// rather than trusting one shape, and read as calendar digits (no
// timezone math) so "13 July 2026" always becomes 130726, never
// 120726/140726 depending on the server's local offset.
function formatJoinDate(dateJoined) {
  if (!dateJoined) return null;
  if (dateJoined instanceof Date) {
    const dd = String(dateJoined.getUTCDate()).padStart(2, '0');
    const mm = String(dateJoined.getUTCMonth() + 1).padStart(2, '0');
    const yy = String(dateJoined.getUTCFullYear()).slice(-2);
    return dd + mm + yy;
  }
  const m = String(dateJoined).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return m[3] + m[2] + m[1].slice(-2);
}

async function loadStaffIdentityRow(sql, staffId) {
  const res = await sql`
    SELECT s.identity_no, s.date_joined, s.office_id, s.department_id, s.institution_id,
           o.slug AS office_slug, i.name AS institution_name
    FROM staff s
    LEFT JOIN offices o ON o.id = s.office_id
    LEFT JOIN institutions i ON i.id = s.institution_id
    WHERE s.id = ${staffId}`;
  return res.rows[0] || null;
}

// Board of Governors & top executive reserved identity numbers ("BOARD &
// EXECUTIVE IDs" in the directive): SHRS-BOT-001 / SHRS-CEO-001 — no date
// segment, because these are permanently reserved seats, not join-dated
// staff records. Scoped to their own tiny 3-digit COUNT(*)+1 sequence
// (matching admission_no's low-volume convention above) rather than the
// shared staff_identity_seq, so the Board and the CEO office each get
// their own gapless 001, 002, ... run instead of borrowing numbers out of
// the general staff sequence.
const RESERVED_OFFICE_PREFIX = { BOT: 'SHRS-BOT-', CEO: 'SHRS-CEO-' };

async function generateReservedStaffIdentityNo(sql, prefix) {
  const countRes = await sql`SELECT count(*)::int AS n FROM staff WHERE identity_no LIKE ${prefix + '%'}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

async function generateAndStoreStaffIdentityNo(sql, staffId, row) {
  const unit = unitCodeFor(row);
  const office = await officeCodeFor(sql, staffId, row);
  const reservedPrefix = RESERVED_OFFICE_PREFIX[unit] || RESERVED_OFFICE_PREFIX[office];
  if (reservedPrefix) {
    const identityNo = await generateReservedStaffIdentityNo(sql, reservedPrefix);
    await sql`UPDATE staff SET identity_no = ${identityNo} WHERE id = ${staffId}`;
    return identityNo;
  }
  const joinDate = formatJoinDate(row.date_joined);
  if (!joinDate) return null;
  const seqRes = await sql`SELECT nextval('staff_identity_seq') AS seq`;
  const seq = String(seqRes.rows[0].seq).padStart(6, '0');
  const identityNo = `SHRS-${unit}-${office}-${joinDate}-${seq}`;
  await sql`UPDATE staff SET identity_no = ${identityNo} WHERE id = ${staffId}`;
  return identityNo;
}

// Lazy-generate-once, same contract as the student/guardian helpers
// above: if an identity_no already exists (any format), it is returned
// unchanged and never touched again. A staff record with no date_joined
// on file returns null — no card is shown until a real join date is
// recorded, rather than inventing one.
export async function ensureStaffIdentityNo(sql, staffId) {
  const row = await loadStaffIdentityRow(sql, staffId);
  if (!row) return null;
  if (row.identity_no) return row.identity_no;
  return generateAndStoreStaffIdentityNo(sql, staffId, row);
}

// Force-regenerates a staff identity number into the current SHRS-...
// format, overwriting whatever is already stored (including an existing
// SHRS-format one). Used only by the explicit, admin-triggered bulk
// migration action (functions/api/portal/admin/staff.js, action
// "regenerate-identity-numbers") — the Founder, Head of Schools &
// Administrator's chosen rollout ("migrate everyone now"), which
// knowingly breaks every already-issued
// QR code/verification link for a re-migrated person. Never called from
// an ordinary read path. Returns null (no change made) for a record with
// no date_joined on file.
export async function regenerateStaffIdentityNo(sql, staffId) {
  const row = await loadStaffIdentityRow(sql, staffId);
  if (!row) return null;
  const unit = unitCodeFor(row);
  const office = await officeCodeFor(sql, staffId, row);
  const isReserved = Boolean(RESERVED_OFFICE_PREFIX[unit] || RESERVED_OFFICE_PREFIX[office]);
  if (!isReserved && !row.date_joined) return null;
  return generateAndStoreStaffIdentityNo(sql, staffId, row);
}
