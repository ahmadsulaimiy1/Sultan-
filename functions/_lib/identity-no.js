// Digital Identity System (Imperial Digital Campus Directive, Priority
// 2) — one public, QR-verifiable identity number per student, guardian,
// and staff record: SHR-STU-<year>-<seq>, SHR-PAR-<year>-<seq>,
// SHR-STF-<year>-<seq>. Same lazy-generate-and-persist pattern as
// certificate reference numbers (functions/api/portal/staff/registrar/
// certificates.js) — generated the first time that person's "My ID
// Card" view is requested, then stored so it never changes again.
//
// Neon's serverless `sql` tagged-template driver has no `.unsafe()`/
// raw-identifier escape hatch (checked: not present in
// @neondatabase/serverless), so table names can't be interpolated into
// one shared query the way a normal value can — this is three explicit
// branches instead of one parameterised helper, not a stylistic choice.
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

export async function ensureStaffIdentityNo(sql, staffId) {
  const existing = await sql`SELECT identity_no FROM staff WHERE id = ${staffId}`;
  const row = existing.rows[0];
  if (!row) return null;
  if (row.identity_no) return row.identity_no;
  const year = new Date().getFullYear();
  const countRes = await sql`SELECT id FROM staff WHERE identity_no LIKE ${'SHR-STF-' + year + '-%'}`;
  const identityNo = `SHR-STF-${year}-${String(countRes.rows.length + 1).padStart(6, '0')}`;
  await sql`UPDATE staff SET identity_no = ${identityNo} WHERE id = ${staffId}`;
  return identityNo;
}
