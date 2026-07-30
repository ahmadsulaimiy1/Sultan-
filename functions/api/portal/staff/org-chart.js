// Organisational Chart Engine — a single endpoint that turns the real
// offices/office_appointments data already powering the office portal
// ecosystem into a hierarchy tree, for js/portal-org-chart.js to
// render as an interactive, collapsible chart. Session-gated (any
// authenticated staff member), same as the office directory — this is
// internal-institution information, not published outside the staff
// portal. No node is invented: an office with no parent_office_id is
// a root; an office with no filled primary seat renders as "Vacant —
// Awaiting Appointment" exactly like everywhere else in this system.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json } from '../../../_lib/http.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  try {
    const officesRes = await sql`
      SELECT id, name, office_type, office_kind, layer, slug, parent_office_id
      FROM offices WHERE is_active = true ORDER BY name`;
    const appointmentsRes = await sql`
      SELECT oa.office_id, oa.appointment_title, oa.is_primary,
             s.preferred_name, s.full_name
      FROM office_appointments oa LEFT JOIN staff s ON s.id = oa.staff_id
      WHERE oa.ended_at IS NULL
      ORDER BY oa.office_id, oa.is_primary DESC`;
    const staffCountRes = await sql`
      SELECT office_id, COUNT(*)::int AS n FROM staff
      WHERE status = 'active' AND office_id IS NOT NULL GROUP BY office_id`;

    const primaryByOffice = {};
    for (const a of appointmentsRes.rows) {
      if (primaryByOffice[a.office_id]) continue; // first row per office = primary (ORDER BY is_primary DESC)
      primaryByOffice[a.office_id] = {
        title: a.appointment_title,
        holderName: a.full_name ? (a.preferred_name || a.full_name) : null,
      };
    }
    const staffCountByOffice = {};
    for (const r of staffCountRes.rows) staffCountByOffice[r.office_id] = r.n;

    const nodesById = {};
    officesRes.rows.forEach((o) => {
      nodesById[o.id] = {
        id: o.id, name: o.name, officeType: o.office_type, officeKind: o.office_kind,
        layer: o.layer, slug: o.slug, parentOfficeId: o.parent_office_id,
        primarySeat: primaryByOffice[o.id] || null,
        staffCount: staffCountByOffice[o.id] || 0,
        children: [],
      };
    });
    const roots = [];
    officesRes.rows.forEach((o) => {
      const node = nodesById[o.id];
      if (o.parent_office_id && nodesById[o.parent_office_id]) {
        nodesById[o.parent_office_id].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return json({ roots, totalOffices: officesRes.rows.length });
  } catch (err) {
    console.error('org-chart error', err);
    return json({ error: 'Could not load the organisational chart: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
