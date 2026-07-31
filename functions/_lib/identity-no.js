// Digital Identity System — student/guardian numbers (Imperial Digital
// Campus Directive, Priority 2): SHR-STU-<year>-<seq>, SHR-PAR-<year>-<seq>.
// Staff numbers (below) were rebuilt under the Founder & CEO-approved
// "SHRS Master Identity Architecture Directive" — see
// docs/digital-identity-system.md. Same lazy-generate-and-persist pattern
// as certificate reference numbers (functions/api/portal/staff/registrar/
// certificates.js) — generated the first time that person's "My ID Card"
// view is requested, then stored so it never changes again.
//
// Neon's serverless `sql` tagged-template driver has no `.unsafe()`/
// raw-identifier escape hatch (checked: not present in
// @neondatabase/serverless), so table names can't be interpolated into
// one shared query the way a normal value can — this is separate
// functions per table instead of one parameterised helper, not a
// stylistic choice.
export async function ensureStudentIdentityNo(sql, studentId) {
  const existing = await sql`SELECT identity_no FROM students WHERE id = ${studentId}`;
  const row = existing.rows[0];
  if (!row) return null;
  if (row.identity_no) return row.identity_no;
  const year = new Date().getFullYear();
  const countRes = await sql`SELECT id FROM students WHERE identity_no LIKE ${'SHR-STU-' + year + '-%'}`;
  const identityNo = `SHR-STU-${year}-${String(countRes.rows.length + 1).padStart(6, '0')}`;
  await sql`UPDATE students SET identity_no = ${identityNo} WHERE id = ${studentId}`;
  return identityNo;
}

export async function ensureGuardianIdentityNo(sql, guardianId) {
  const existing = await sql`SELECT identity_no FROM guardians WHERE id = ${guardianId}`;
  const row = existing.rows[0];
  if (!row) return null;
  if (row.identity_no) return row.identity_no;
  const year = new Date().getFullYear();
  const countRes = await sql`SELECT id FROM guardians WHERE identity_no LIKE ${'SHR-PAR-' + year + '-%'}`;
  const identityNo = `SHR-PAR-${year}-${String(countRes.rows.length + 1).padStart(6, '0')}`;
  await sql`UPDATE guardians SET identity_no = ${identityNo} WHERE id = ${guardianId}`;
  return identityNo;
}

// --- Staff: SHRS Master Identity Architecture ------------------------
//
// Format: SHRS-[UNIT]-[OFFICE]-[JOINDATE]-[SEQUENCE]
//   e.g.  SHRS-HQ-CEO-130726-000001
//
// UNIT   — which of the four schools this staff member's real office/
//          institution places them in, or a school-wide body:
//            RC=Royal College, NPS=Nursery & Primary,
//            IAS=Islamic & Arabic Studies, QC=Qur'an College,
//            BOT=Board of Trustees (incl. its standing committees),
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
  'Nursery & Primary': 'NPS',
  'Islamic & Arabic Studies': 'IAS',
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

async function generateAndStoreStaffIdentityNo(sql, staffId, row) {
  const joinDate = formatJoinDate(row.date_joined);
  if (!joinDate) return null;
  const unit = unitCodeFor(row);
  const office = await officeCodeFor(sql, staffId, row);
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
// "regenerate-identity-numbers") — the Founder & CEO's chosen rollout
// ("migrate everyone now"), which knowingly breaks every already-issued
// QR code/verification link for a re-migrated person. Never called from
// an ordinary read path. Returns null (no change made) for a record with
// no date_joined on file.
export async function regenerateStaffIdentityNo(sql, staffId) {
  const row = await loadStaffIdentityRow(sql, staffId);
  if (!row || !row.date_joined) return null;
  return generateAndStoreStaffIdentityNo(sql, staffId, row);
}
