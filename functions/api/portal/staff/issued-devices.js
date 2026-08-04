// ICT-issued assets register — the missing piece of ICT Clearance's
// expanded scope (Conditional Approval directive item 5: "institutional
// email, portal account, issued devices, identity card, access
// credentials, digital assets"). Institutional email and portal
// account status are deliberately NOT tracked here — they are already
// real, live facts on `students`/`staff`/the auth system, and
// functions/_lib/graduation-workflow.js's ictSignal() reads them
// directly rather than risking a second, driftable copy. This table
// covers what genuinely has no home yet: physical devices, ID cards,
// and other issued access items. Gated by real office membership on
// the ICT office (`digital-services`), the same mechanism the
// Graduation Approval Workflow uses to decide ICT Clearance itself.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../_lib/office-access.js';
import { logStaffEvent, requestAuditContext } from '../../../_lib/audit.js';

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

async function requireIctOffice(sql, staffId) {
  const officeRes = await sql`SELECT id FROM offices WHERE slug = 'digital-services'`;
  const officeId = officeRes.rows[0] ? officeRes.rows[0].id : null;
  if (officeId == null) return false;
  return staffCanActOnOffice(sql, staffId, officeId);
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const studentId = Number(url.searchParams.get('studentId'));
  if (!Number.isInteger(studentId)) return json({ error: 'A valid numeric studentId is required.' }, 400);

  if (!(await requireIctOffice(sql, staffId))) {
    return json({ error: 'Your account does not currently hold the ICT office.' }, 403);
  }

  try {
    const res = await sql`SELECT * FROM issued_devices WHERE student_id = ${studentId} ORDER BY issued_at DESC`;
    return json({
      ok: true,
      assets: res.rows.map((r) => ({
        id: r.id, assetType: r.asset_type, description: r.description, serialOrRef: r.serial_or_ref,
        issuedAt: r.issued_at, returnedAt: r.returned_at, status: r.status,
      })),
    });
  } catch (err) {
    console.error('issued-devices GET error', err);
    return json({ error: 'Could not load issued assets right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  if (!(await requireIctOffice(sql, staffId))) {
    return json({ error: 'Your account does not currently hold the ICT office.' }, 403);
  }

  const body = await readJsonBody(request);
  const action = body && body.action;
  const auditCtx = requestAuditContext(request);

  try {
    if (action === 'issue') {
      const studentId = Number(body.studentId);
      const assetType = (body.assetType || '').trim();
      const description = (body.description || '').trim();
      if (!Number.isInteger(studentId) || !['device', 'id_card', 'access_credential', 'other'].includes(assetType) || !description || !body.issuedAt) {
        return json({ error: 'studentId, a valid assetType, description, and issuedAt are required.' }, 400);
      }
      const inserted = await sql`
        INSERT INTO issued_devices (student_id, asset_type, description, serial_or_ref, issued_at, recorded_by_staff_id)
        VALUES (${studentId}, ${assetType}, ${description}, ${body.serialOrRef || null}, ${body.issuedAt}, ${staffId})
        RETURNING id`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'issued_device', targetId: inserted.rows[0].id,
        reason: null, metadata: { action: 'issue', assetType, description },
        ipAddress: auditCtx.ipAddress, userAgent: auditCtx.userAgent, newValue: { assetType, status: 'issued' },
      });
      return json({ ok: true, assetId: inserted.rows[0].id });
    }

    if (action === 'update_status') {
      const assetId = Number(body.assetId);
      const status = (body.status || '').trim();
      if (!Number.isInteger(assetId) || !['issued', 'returned', 'lost', 'deactivated'].includes(status)) {
        return json({ error: 'A valid assetId and status are required.' }, 400);
      }
      const existingRes = await sql`SELECT status AS current_status FROM issued_devices WHERE id = ${assetId}`;
      if (!existingRes.rows[0]) return json({ error: 'No issued asset found with that id.' }, 404);

      await sql`
        UPDATE issued_devices SET
          status = ${status}, returned_at = ${status === 'returned' ? new Date().toISOString().slice(0, 10) : null}, updated_at = now()
        WHERE id = ${assetId}`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'issued_device', targetId: assetId,
        reason: null, metadata: { action: 'update_status', status },
        ipAddress: auditCtx.ipAddress, userAgent: auditCtx.userAgent,
        previousValue: { status: existingRes.rows[0].current_status }, newValue: { status },
      });
      return json({ ok: true, assetId, status });
    }

    return json({ error: 'Unknown action. Expected one of: issue, update_status.' }, 400);
  } catch (err) {
    console.error('issued-devices POST error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
