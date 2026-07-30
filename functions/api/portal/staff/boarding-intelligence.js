// Boarding Intelligence Framework — same Institutional Capability
// Framework pattern. Welfare categories are transcribed from the
// adopted Boarding Regulations (SD-04 §7.2/7.4/7.7/7.8/7.10). Room
// checks are the real, policy-required nightly boarding-attendance
// mechanism (SD-04 §7.2), kept separate from the day-school
// attendance_summary table since boarding attendance is checked
// nightly, not by class period. Zero transactional records exist yet
// (Current Records: 0).
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants, checkGrants } from '../../../_lib/permissions.js';
import { hasPermission } from '../../../_lib/permission-matrix.js';

const SUB_CAPABILITIES = [
  { key: 'dormitory', label: 'Dormitory Management', description: 'Nightly room checks per student, per SD-04 §7.2 — the real boarding-attendance mechanism.' },
  { key: 'welfare', label: 'Welfare Monitoring', description: 'Real welfare entries across health, homesickness/settling-in, and weekend/leave-out matters.' },
  { key: 'attendance', label: 'Attendance', description: 'Present/absent recorded nightly per student, distinct from day-school period attendance.' },
  { key: 'health', label: 'Health', description: 'Health and medical entries logged per SD-04 §7.4, cross-referencing the First Aid Policy (SW-06).' },
  { key: 'discipline', label: 'Discipline', description: 'Boarding-specific disciplinary matters per SD-04 §7.7, alongside the Student Code of Conduct.' },
  { key: 'boarding_analytics', label: 'Boarding Analytics', description: 'Aggregate open-welfare-entry and room-check-completion counts, computed from real data as it accumulates.' },
];

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try { session = readStaffSessionFromRequest(request, env.SESSION_SECRET); }
  catch (err) { return { error: json({ error: 'Portal is not configured yet.' }, 500) }; }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    const grants = await effectiveGrants(sql, staffId);
    const { granted } = checkGrants(grants, 'boarding_intelligence', 'V', null);
    if (!granted) return json({ error: 'Your role does not include boarding-intelligence visibility.' }, 403);
    const viewable = grants.filter((g) => hasPermission(g.roleCode, 'boarding_intelligence', 'V').granted);
    const unscoped = viewable.some((g) => g.institutionId == null);

    const catsRes = await sql`SELECT code, label, description FROM boarding_welfare_categories ORDER BY sort_order`;
    const framework = { status: 'Operational Framework Ready', subCapabilities: SUB_CAPABILITIES, welfareCategories: catsRes.rows.map((r) => ({ code: r.code, label: r.label, description: r.description })) };

    let welfareRows, roomCheckRows;
    if (unscoped) {
      [welfareRows, roomCheckRows] = (await Promise.all([
        sql`SELECT w.*, s.full_name AS student_name, cat.label AS category_label FROM boarding_welfare_logs w
            LEFT JOIN students s ON s.id = w.student_id LEFT JOIN boarding_welfare_categories cat ON cat.id = w.category_id
            ORDER BY w.recorded_at DESC`,
        sql`SELECT rc.*, s.full_name AS student_name FROM boarding_room_checks rc LEFT JOIN students s ON s.id = rc.student_id ORDER BY rc.check_date DESC`,
      ])).map((r) => r.rows);
    } else {
      const institutionIds = [...new Set(viewable.map((g) => g.institutionId).filter((x) => x != null))];
      if (!institutionIds.length) { welfareRows = []; roomCheckRows = []; }
      else {
        [welfareRows, roomCheckRows] = (await Promise.all([
          sql`SELECT w.*, s.full_name AS student_name, cat.label AS category_label FROM boarding_welfare_logs w
              LEFT JOIN students s ON s.id = w.student_id LEFT JOIN boarding_welfare_categories cat ON cat.id = w.category_id
              WHERE w.institution_id = ANY(${institutionIds}) ORDER BY w.recorded_at DESC`,
          sql`SELECT rc.*, s.full_name AS student_name FROM boarding_room_checks rc LEFT JOIN students s ON s.id = rc.student_id
              WHERE rc.institution_id = ANY(${institutionIds}) ORDER BY rc.check_date DESC`,
        ])).map((r) => r.rows);
      }
    }

    return json({
      ok: true, framework, currentRecords: welfareRows.length + roomCheckRows.length,
      welfareLogs: welfareRows.map((r) => ({
        id: r.id, student: r.student_name, category: r.category_label, severity: r.severity, status: r.status,
        notes: r.notes, parentNotified: r.parent_notified, recordedAt: r.recorded_at, resolvedAt: r.resolved_at,
      })),
      roomChecks: roomCheckRows.map((r) => ({ id: r.id, student: r.student_name, checkDate: r.check_date, present: r.present, notes: r.notes })),
    });
  } catch (err) {
    console.error('staff boarding-intelligence GET error', err);
    return json({ error: 'Could not load the Boarding Intelligence Framework right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);

  try {
    if (body.action === 'record-welfare-entry') {
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'boarding_intelligence', 'C', body.institutionId || null);
      if (!granted) return json({ error: 'Your role does not have authority to record a boarding welfare entry.' }, 403);
      if (!Number.isInteger(body.studentId) || !body.categoryCode || typeof body.notes !== 'string' || !body.notes.trim()) {
        return json({ error: 'studentId (number), categoryCode, and non-empty notes are required.' }, 400);
      }
      const catRes = await sql`SELECT id FROM boarding_welfare_categories WHERE code = ${body.categoryCode}`;
      if (!catRes.rows.length) return json({ error: 'Unknown welfare category code.' }, 400);
      const severity = ['routine', 'concern', 'urgent'].includes(body.severity) ? body.severity : 'routine';

      const inserted = await sql`
        INSERT INTO boarding_welfare_logs (student_id, institution_id, category_id, severity, notes, recorded_by_staff_id)
        VALUES (${body.studentId}, ${body.institutionId || null}, ${catRes.rows[0].id}, ${severity}, ${body.notes.trim()}, ${staffId})
        RETURNING id`;
      return json({ ok: true, welfareLogId: inserted.rows[0].id });
    }

    if (body.action === 'update-welfare-entry') {
      if (!Number.isInteger(body.welfareLogId)) return json({ error: 'welfareLogId (number) is required.' }, 400);
      const logRes = await sql`SELECT id, institution_id FROM boarding_welfare_logs WHERE id = ${body.welfareLogId}`;
      if (!logRes.rows.length) return json({ error: 'No welfare entry found with that id.' }, 404);
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'boarding_intelligence', 'E', logRes.rows[0].institution_id);
      if (!granted) return json({ error: 'Your role does not have authority to update this welfare entry.' }, 403);
      const status = ['open', 'resolved'].includes(body.status) ? body.status : 'open';
      await sql`
        UPDATE boarding_welfare_logs SET status = ${status}, parent_notified = COALESCE(${body.parentNotified ?? null}, parent_notified),
          resolved_at = CASE WHEN ${status} = 'resolved' THEN now() ELSE resolved_at END
        WHERE id = ${body.welfareLogId}`;
      return json({ ok: true, welfareLogId: body.welfareLogId, status });
    }

    if (body.action === 'record-room-check') {
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'boarding_intelligence', 'C', body.institutionId || null);
      if (!granted) return json({ error: 'Your role does not have authority to record a room check.' }, 403);
      if (!Number.isInteger(body.studentId)) return json({ error: 'studentId (number) is required.' }, 400);
      const inserted = await sql`
        INSERT INTO boarding_room_checks (student_id, institution_id, check_date, present, notes, recorded_by_staff_id)
        VALUES (${body.studentId}, ${body.institutionId || null}, ${body.checkDate || new Date().toISOString().slice(0, 10)}, ${body.present !== false}, ${body.notes || null}, ${staffId})
        ON CONFLICT (student_id, check_date) DO UPDATE SET present = EXCLUDED.present, notes = EXCLUDED.notes
        RETURNING id`;
      return json({ ok: true, roomCheckId: inserted.rows[0].id });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('staff boarding-intelligence POST error', err);
    return json({ error: 'Could not save that action right now — please try again shortly.' }, 500);
  }
}
