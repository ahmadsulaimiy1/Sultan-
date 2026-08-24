// Institutional Writing & Document Intelligence Centre — fetch one
// document's full editable fields (used to reopen a saved draft in the
// Writing Centre; list.js deliberately omits bodyHtml/sourceNotes to
// keep the list payload small).
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../../_lib/office-access.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: 'Portal is not configured yet.' }, 500);
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) return json({ error: 'Not signed in.' }, 401);

  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id)) return json({ error: 'id is required.' }, 400);

  try {
    const rowRes = await sql`SELECT * FROM office_correspondence WHERE id = ${id}`;
    const row = rowRes.rows[0];
    if (!row) return json({ error: 'Document not found.' }, 404);

    const canAct = await staffCanActOnOffice(sql, session.staffId, row.office_id);
    if (!canAct) return json({ error: 'You do not currently hold this office.' }, 403);

    return json({
      id: row.id, officeId: row.office_id, documentType: row.document_type, tone: row.tone,
      title: row.title, subject: row.subject, recipientName: row.recipient_name, recipientRole: row.recipient_role,
      sourceNotes: row.source_notes, bodyHtml: row.body_html,
      signatoryName: row.signatory_name, signatoryTitle: row.signatory_title,
      status: row.status, referenceNo: row.reference_no,
    });
  } catch (err) {
    console.error('writing centre get error', err);
    return json({ error: 'Could not load this document right now — please try again shortly.' }, 500);
  }
}
