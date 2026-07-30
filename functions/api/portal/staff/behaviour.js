// Behaviour Management Framework — same "Institutional Capability
// Framework" pattern as Safeguarding (functions/api/portal/staff/
// safeguarding.js). Demerit categories and the severity escalation are
// transcribed from the adopted Student Code of Conduct (SD-02
// §7.1-7.4); merit categories are real new structure the policy
// doesn't yet define, recorded as such. Zero transactional incidents
// exist yet — reported honestly (currentRecords: 0).
//
// GET  — returns framework status + real (possibly empty) incident list,
//        scoped by the caller's institution grant.
// POST — { action: 'record-incident', ... } requires Create (C).
//        { action: 'update-incident', ... } requires Edit (E).
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants, checkGrants } from '../../../_lib/permissions.js';
import { hasPermission } from '../../../_lib/permission-matrix.js';

const SUB_CAPABILITIES = [
  { key: 'behaviour_categories', label: 'Behaviour Categories', description: 'A seeded merit/demerit taxonomy — demerit tiers transcribed from SD-02 §7.1-7.3, merit categories built as new recognition structure.' },
  { key: 'incident_recording', label: 'Incident Recording', description: 'Every merit and demerit event logged against the real student record, with the recording staff member on file.' },
  { key: 'merit_system', label: 'Merit System', description: 'Positive recognition — academic, leadership, Islamic character, community service, and sporting achievement.' },
  { key: 'demerit_system', label: 'Demerit System', description: 'Minor / Moderate / Serious tiers, matching SD-02’s real graded-response structure — no invented severity scale.' },
  { key: 'intervention_workflows', label: 'Intervention Workflows', description: 'Recorded → Under Review → Intervention → Resolved / Escalated, with every step logged.' },
  { key: 'parent_engagement_log', label: 'Parent Engagement Log', description: 'A recorded parent-notified flag on every demerit incident, matching SD-02 §7.12’s same-day communication standard.' },
  { key: 'escalation_path', label: 'Escalation Path', description: 'Class teacher → VP Administration → Principal, exactly as SD-02 §6 defines the real reporting line.' },
  { key: 'behaviour_analytics', label: 'Behaviour Analytics', description: 'Aggregate counts by category and status — real numbers, not placeholder charts, once incidents exist.' },
];

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

function toIncident(r) {
  return {
    id: r.id, incidentNo: r.incident_no, institution: r.institution_name,
    student: r.student_name ? { id: r.student_id, fullName: r.student_name } : null,
    category: { code: r.category_code, kind: r.category_kind, label: r.category_label, points: r.category_points },
    severity: r.severity, status: r.status, description: r.description, parentNotified: r.parent_notified,
    occurredAt: r.occurred_at, resolvedAt: r.resolved_at, updatedAt: r.updated_at,
  };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    const grants = await effectiveGrants(sql, staffId);
    const { granted } = checkGrants(grants, 'behaviour', 'V', null);
    if (!granted) return json({ error: 'Your role does not include behaviour-management visibility.' }, 403);
    const viewable = grants.filter((g) => hasPermission(g.roleCode, 'behaviour', 'V').granted);
    const unscoped = viewable.some((g) => g.institutionId == null);

    const categoriesRes = await sql`SELECT code, kind, label, description, points FROM behaviour_categories ORDER BY sort_order`;
    const framework = {
      status: 'Operational Framework Ready',
      subCapabilities: SUB_CAPABILITIES,
      categories: categoriesRes.rows.map((r) => ({ code: r.code, kind: r.kind, label: r.label, description: r.description, points: r.points })),
    };

    let rows;
    if (unscoped) {
      const res = await sql`
        SELECT bi.*, i.name AS institution_name, s.full_name AS student_name,
               cat.code AS category_code, cat.kind AS category_kind, cat.label AS category_label, cat.points AS category_points
        FROM behaviour_incidents bi
        LEFT JOIN institutions i ON i.id = bi.institution_id
        LEFT JOIN students s ON s.id = bi.student_id
        LEFT JOIN behaviour_categories cat ON cat.id = bi.category_id
        ORDER BY bi.occurred_at DESC`;
      rows = res.rows;
    } else {
      const institutionIds = [...new Set(viewable.map((g) => g.institutionId).filter((x) => x != null))];
      if (!institutionIds.length) rows = [];
      else {
        const placeholders = institutionIds.map((_, i) => `$${i + 1}`).join(', ');
        const res = await sql(
          `SELECT bi.*, i.name AS institution_name, s.full_name AS student_name,
                  cat.code AS category_code, cat.kind AS category_kind, cat.label AS category_label, cat.points AS category_points
           FROM behaviour_incidents bi
           LEFT JOIN institutions i ON i.id = bi.institution_id
           LEFT JOIN students s ON s.id = bi.student_id
           LEFT JOIN behaviour_categories cat ON cat.id = bi.category_id
           WHERE bi.institution_id IN (${placeholders})
           ORDER BY bi.occurred_at DESC`,
          institutionIds
        );
        rows = res.rows;
      }
    }

    const ids = rows.map((r) => r.id);
    let logByIncident = {};
    if (ids.length) {
      const logRes = await sql`
        SELECT l.incident_id, l.action, l.notes, l.created_at, s.full_name AS actor_name
        FROM behaviour_intervention_log l LEFT JOIN staff s ON s.id = l.actor_staff_id
        WHERE l.incident_id = ANY(${ids})
        ORDER BY l.created_at DESC`;
      logByIncident = logRes.rows.reduce((acc, r) => {
        (acc[r.incident_id] ||= []).push({ action: r.action, notes: r.notes, actorName: r.actor_name, occurredAt: r.created_at });
        return acc;
      }, {});
    }

    const byCategoryCount = rows.reduce((acc, r) => { acc[r.category_code] = (acc[r.category_code] || 0) + 1; return acc; }, {});

    return json({
      ok: true, framework, currentRecords: rows.length, byCategoryCount,
      incidents: rows.map((r) => ({ ...toIncident(r), log: logByIncident[r.id] || [] })),
    });
  } catch (err) {
    console.error('staff behaviour GET error', err);
    return json({ error: 'Could not load the Behaviour Management Framework right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);

  try {
    if (body.action === 'record-incident') {
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'behaviour', 'C', body.institutionId || null);
      if (!granted) return json({ error: 'Your role does not have authority to record a behaviour incident.' }, 403);
      if (!Number.isInteger(body.studentId) || !body.categoryCode || typeof body.description !== 'string' || !body.description.trim()) {
        return json({ error: 'studentId (number), categoryCode, and a non-empty description are required.' }, 400);
      }
      const catRes = await sql`SELECT id, kind FROM behaviour_categories WHERE code = ${body.categoryCode}`;
      if (!catRes.rows.length) return json({ error: 'Unknown category code.' }, 400);
      const category = catRes.rows[0];
      const severity = category.kind === 'demerit' && ['minor', 'moderate', 'serious', 'suspension_expulsion'].includes(body.severity) ? body.severity : null;

      const year = new Date().getFullYear();
      const countRes = await sql`SELECT COUNT(*)::int AS n FROM behaviour_incidents WHERE EXTRACT(YEAR FROM occurred_at) = ${year}`;
      const incidentNo = `SHR-BH-${year}-${String((countRes.rows[0].n || 0) + 1).padStart(5, '0')}`;

      const inserted = await sql`
        INSERT INTO behaviour_incidents (incident_no, student_id, institution_id, category_id, severity, description, recorded_by_staff_id)
        VALUES (${incidentNo}, ${body.studentId}, ${body.institutionId || null}, ${category.id}, ${severity}, ${body.description.trim()}, ${staffId})
        RETURNING id`;
      const incidentId = inserted.rows[0].id;
      await sql`
        INSERT INTO behaviour_intervention_log (incident_id, action, actor_staff_id, notes)
        VALUES (${incidentId}, 'recorded', ${staffId}, ${body.description.trim()})`;

      return json({ ok: true, incidentId, incidentNo });
    }

    if (body.action === 'update-incident') {
      if (!Number.isInteger(body.incidentId)) return json({ error: 'incidentId (number) is required.' }, 400);
      const incRes = await sql`SELECT id, institution_id, status FROM behaviour_incidents WHERE id = ${body.incidentId}`;
      const targetIncident = incRes.rows[0];
      if (!targetIncident) return json({ error: 'No behaviour incident found with that id.' }, 404);

      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'behaviour', 'E', targetIncident.institution_id);
      if (!granted) return json({ error: 'Your role does not have authority to update this incident.' }, 403);

      const VALID_STATUSES = ['recorded', 'under_review', 'intervention', 'resolved', 'escalated'];
      const VALID_ACTIONS = ['reviewed', 'intervention_started', 'parent_engaged', 'escalated', 'resolved', 'reopened'];
      if (!VALID_ACTIONS.includes(body.logAction)) {
        return json({ error: `logAction must be one of: ${VALID_ACTIONS.join(', ')}` }, 400);
      }
      const nextStatus = VALID_STATUSES.includes(body.status) ? body.status : targetIncident.status;

      await sql`
        UPDATE behaviour_incidents SET
          status = ${nextStatus},
          parent_notified = COALESCE(${body.parentNotified ?? null}, parent_notified),
          resolved_at = CASE WHEN ${nextStatus} = 'resolved' THEN now() ELSE resolved_at END,
          updated_at = now()
        WHERE id = ${body.incidentId}`;

      await sql`
        INSERT INTO behaviour_intervention_log (incident_id, action, actor_staff_id, notes)
        VALUES (${body.incidentId}, ${body.logAction}, ${staffId}, ${body.notes || null})`;

      return json({ ok: true, incidentId: body.incidentId, status: nextStatus });
    }

    return json({ error: 'Unknown action. Expected: record-incident or update-incident.' }, 400);
  } catch (err) {
    console.error('staff behaviour POST error', err);
    return json({ error: 'Could not save that behaviour action right now — please try again shortly.' }, 500);
  }
}
