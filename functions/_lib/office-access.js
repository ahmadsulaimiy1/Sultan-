// Shared "which offices can this staff member act on" resolver. Reused
// anywhere a staff endpoint needs to gate an action by office rather than
// by the Permission Engine's institution-scoped role check (e.g. Institutional
// Messaging: a thread belongs to one office, and any staff member who
// currently holds that office — by a real appointment or a role/delegation
// grant scoped to it — can read and answer it, the same population the
// Office Switcher already shows on the topbar).
export async function staffOfficeIds(sql, staffId) {
  const [appointmentsRes, rolesRes, delegationsRes] = await Promise.all([
    sql`SELECT DISTINCT office_id FROM office_appointments WHERE staff_id = ${staffId} AND ended_at IS NULL`,
    sql`SELECT DISTINCT office_id FROM staff_roles WHERE staff_id = ${staffId} AND is_active = true AND revoked_at IS NULL AND office_id IS NOT NULL`,
    sql`SELECT DISTINCT office_id FROM delegations WHERE delegate_staff_id = ${staffId} AND revoked_at IS NULL AND now() BETWEEN starts_at AND ends_at AND office_id IS NOT NULL`,
  ]);
  const ids = new Set();
  for (const r of appointmentsRes.rows) ids.add(r.office_id);
  for (const r of rolesRes.rows) ids.add(r.office_id);
  for (const r of delegationsRes.rows) ids.add(r.office_id);
  return [...ids];
}

export async function staffCanActOnOffice(sql, staffId, officeId) {
  const ids = await staffOfficeIds(sql, staffId);
  return ids.includes(officeId);
}
