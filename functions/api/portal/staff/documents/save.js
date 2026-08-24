// Institutional Writing & Document Intelligence Centre — save a draft.
// Creates a new draft row, or updates an existing one — only while it
// is still a draft; an issued document is a record, not a working
// copy, and this endpoint refuses to touch one (issue.js is a one-way
// door by design, matching the rest of this project's document
// lifecycles).
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../../_lib/office-access.js';
import { sanitizeCorrespondenceHtml } from '../../../../_lib/sanitize-html.js';

const DOCUMENT_TYPES = ['letter', 'memo', 'circular', 'notice'];

export async function onRequestPost({ request, env }) {
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

  const body = await readJsonBody(request);
  const id = Number(body.id);
  const officeId = Number(body.officeId);
  const documentType = DOCUMENT_TYPES.includes(body.documentType) ? body.documentType : null;
  const bodyHtml = sanitizeCorrespondenceHtml(typeof body.bodyHtml === 'string' ? body.bodyHtml : '');

  if (!Number.isInteger(officeId)) return json({ error: 'officeId is required.' }, 400);
  if (!documentType) return json({ error: 'documentType must be one of letter, memo, circular, notice.' }, 400);
  if (!bodyHtml.trim()) return json({ error: 'The document body is empty.' }, 400);

  const canAct = await staffCanActOnOffice(sql, session.staffId, officeId);
  if (!canAct) return json({ error: 'You do not currently hold this office.' }, 403);

  const fields = {
    tone: typeof body.tone === 'string' ? body.tone.slice(0, 40) : null,
    title: typeof body.title === 'string' ? body.title.slice(0, 300) : null,
    subject: typeof body.subject === 'string' ? body.subject.slice(0, 500) : null,
    recipientName: typeof body.recipientName === 'string' ? body.recipientName.slice(0, 200) : null,
    recipientRole: typeof body.recipientRole === 'string' ? body.recipientRole.slice(0, 200) : null,
    sourceNotes: typeof body.sourceNotes === 'string' ? body.sourceNotes.slice(0, 8000) : null,
    signatoryName: typeof body.signatoryName === 'string' ? body.signatoryName.slice(0, 200) : null,
    signatoryTitle: typeof body.signatoryTitle === 'string' ? body.signatoryTitle.slice(0, 200) : null,
  };

  try {
    if (Number.isInteger(id)) {
      const existingRes = await sql`SELECT office_id, status FROM office_correspondence WHERE id = ${id}`;
      const existing = existingRes.rows[0];
      if (!existing) return json({ error: 'Document not found.' }, 404);
      if (existing.status !== 'draft') return json({ error: 'This document has already been issued and can no longer be edited as a draft.' }, 409);
      const existingCanAct = await staffCanActOnOffice(sql, session.staffId, existing.office_id);
      if (!existingCanAct) return json({ error: 'You do not currently hold this office.' }, 403);

      await sql`
        UPDATE office_correspondence SET
          office_id = ${officeId}, document_type = ${documentType}, tone = ${fields.tone},
          title = ${fields.title}, subject = ${fields.subject},
          recipient_name = ${fields.recipientName}, recipient_role = ${fields.recipientRole},
          source_notes = ${fields.sourceNotes}, body_html = ${bodyHtml},
          signatory_name = ${fields.signatoryName}, signatory_title = ${fields.signatoryTitle},
          updated_at = now()
        WHERE id = ${id}`;
      return json({ id, status: 'draft' });
    }

    const institutionRes = await sql`SELECT institution_id FROM offices WHERE id = ${officeId}`;
    const institutionId = institutionRes.rows[0]?.institution_id ?? null;

    const inserted = await sql`
      INSERT INTO office_correspondence
        (office_id, institution_id, document_type, tone, title, subject, recipient_name, recipient_role,
         source_notes, body_html, signatory_name, signatory_title, status, drafted_by_staff_id)
      VALUES
        (${officeId}, ${institutionId}, ${documentType}, ${fields.tone}, ${fields.title}, ${fields.subject},
         ${fields.recipientName}, ${fields.recipientRole}, ${fields.sourceNotes}, ${bodyHtml},
         ${fields.signatoryName}, ${fields.signatoryTitle}, 'draft', ${session.staffId})
      RETURNING id`;
    return json({ id: inserted.rows[0].id, status: 'draft' });
  } catch (err) {
    console.error('writing centre save error', err);
    return json({ error: 'Could not save this document right now — please try again shortly.' }, 500);
  }
}
