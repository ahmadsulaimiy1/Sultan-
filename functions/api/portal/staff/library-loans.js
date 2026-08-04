// Library Loan Register — built ahead of any real library catalogue
// system, per the Conditional Approval directive's item 4 ("do not
// wait until the Library module exists"): borrowed books, overdue
// books, lost books, fines, clearance status. Gated by real office
// membership on the Library office (functions/_lib/office-access.js),
// the same mechanism the Graduation Approval Workflow already uses to
// decide the Library Clearance stage — there is no dedicated
// permission-matrix role for library operations, and inventing one
// with no current appointee would be less honest than reusing the
// office-holder mechanism this codebase already built for exactly
// this. functions/_lib/graduation-workflow.js's librarySignal() reads
// this table live.
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

async function requireLibraryOffice(sql, staffId) {
  const officeRes = await sql`SELECT id FROM offices WHERE slug = 'library'`;
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

  if (!(await requireLibraryOffice(sql, staffId))) {
    return json({ error: 'Your account does not currently hold the Library office.' }, 403);
  }

  try {
    const res = await sql`SELECT * FROM library_loans WHERE student_id = ${studentId} ORDER BY borrowed_at DESC`;
    return json({
      ok: true,
      loans: res.rows.map((r) => ({
        id: r.id, itemTitle: r.item_title, itemRef: r.item_ref, borrowedAt: r.borrowed_at, dueAt: r.due_at,
        returnedAt: r.returned_at, status: r.status, fineAmount: r.fine_amount, finePaid: r.fine_paid,
      })),
    });
  } catch (err) {
    console.error('library-loans GET error', err);
    return json({ error: 'Could not load library loans right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  if (!(await requireLibraryOffice(sql, staffId))) {
    return json({ error: 'Your account does not currently hold the Library office.' }, 403);
  }

  const body = await readJsonBody(request);
  const action = body && body.action;
  const auditCtx = requestAuditContext(request);

  try {
    if (action === 'record_loan') {
      const studentId = Number(body.studentId);
      const itemTitle = (body.itemTitle || '').trim();
      if (!Number.isInteger(studentId) || !itemTitle || !body.borrowedAt) {
        return json({ error: 'studentId, itemTitle, and borrowedAt are required.' }, 400);
      }
      const inserted = await sql`
        INSERT INTO library_loans (student_id, item_title, item_ref, borrowed_at, due_at, recorded_by_staff_id)
        VALUES (${studentId}, ${itemTitle}, ${body.itemRef || null}, ${body.borrowedAt}, ${body.dueAt || null}, ${staffId})
        RETURNING id`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'library_loan', targetId: inserted.rows[0].id,
        reason: null, metadata: { action: 'record_loan', itemTitle },
        ipAddress: auditCtx.ipAddress, userAgent: auditCtx.userAgent, newValue: { itemTitle, status: 'on_loan' },
      });
      return json({ ok: true, loanId: inserted.rows[0].id });
    }

    if (action === 'update_loan') {
      const loanId = Number(body.loanId);
      const status = (body.status || '').trim();
      if (!Number.isInteger(loanId) || !['on_loan', 'returned', 'overdue', 'lost'].includes(status)) {
        return json({ error: 'A valid loanId and status are required.' }, 400);
      }
      const existingRes = await sql`SELECT status AS current_status FROM library_loans WHERE id = ${loanId}`;
      if (!existingRes.rows[0]) return json({ error: 'No loan found with that id.' }, 404);

      await sql`
        UPDATE library_loans SET
          status = ${status}, returned_at = ${status === 'returned' ? new Date().toISOString().slice(0, 10) : null},
          fine_amount = COALESCE(${body.fineAmount ?? null}, fine_amount), fine_paid = COALESCE(${body.finePaid ?? null}, fine_paid),
          updated_at = now()
        WHERE id = ${loanId}`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'library_loan', targetId: loanId,
        reason: null, metadata: { action: 'update_loan', status },
        ipAddress: auditCtx.ipAddress, userAgent: auditCtx.userAgent,
        previousValue: { status: existingRes.rows[0].current_status }, newValue: { status },
      });
      return json({ ok: true, loanId, status });
    }

    return json({ error: 'Unknown action. Expected one of: record_loan, update_loan.' }, 400);
  } catch (err) {
    console.error('library-loans POST error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
