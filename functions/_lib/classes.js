// The one place a class row is resolved-or-created. Three routes
// (registrar enrol, registrar lifecycle-events, admin students) each
// carried an identical inline copy of this get-or-create; consolidating
// them here is phase one of retiring the classes.institution free-text
// join (docs/institution-registry.md, open decision 2).
//
// Dual-write: alongside the free-text institution string (still the
// value every existing read path joins on), a new class row also gets
// institution_id resolved from the institutions table — and an existing
// row found with a NULL institution_id is healed in place when its
// string now matches a seeded institution. An unmatched string leaves
// institution_id NULL, which is exactly the scope today's LEFT JOIN
// yields for it; nothing degrades further than it already did.
//
// The catch-and-retry keeps this working on a pre-migration database:
// production's schema advances only when Setup runs or the CI psql step
// has DATABASE_URL, while Pages deploys this code immediately — so the
// modern shape must fall back to the legacy one, never error. Same
// pattern as stage-certificates' revoked_by_staff_id fallback.
export async function resolveClassId(sql, institution, className) {
  try {
    const existing = await sql`SELECT id, institution_id FROM classes WHERE institution = ${institution} AND name = ${className}`;
    if (existing.rows.length) {
      const row = existing.rows[0];
      if (row.institution_id == null) {
        await sql`UPDATE classes SET institution_id = i.id FROM institutions i
                   WHERE i.name = ${institution} AND classes.id = ${row.id}`;
      }
      return row.id;
    }
    const created = await sql`INSERT INTO classes (institution, name, institution_id)
      VALUES (${institution}, ${className}, (SELECT id FROM institutions WHERE name = ${institution}))
      RETURNING id`;
    return created.rows[0].id;
  } catch (err) {
    if (!/institution_id/.test(String(err && err.message))) throw err;
    const existing = await sql`SELECT id FROM classes WHERE institution = ${institution} AND name = ${className}`;
    if (existing.rows.length) return existing.rows[0].id;
    const created = await sql`INSERT INTO classes (institution, name) VALUES (${institution}, ${className}) RETURNING id`;
    return created.rows[0].id;
  }
}
