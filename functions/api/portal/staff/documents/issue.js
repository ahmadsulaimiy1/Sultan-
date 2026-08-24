// Institutional Writing & Document Intelligence Centre — issue. The
// one-way door: a draft becomes a numbered, hashed institutional
// record. Mirrors graduation-documents.js's own issuance shape
// (reference number, HMAC content hash with key version, audit log)
// scaled to correspondence's simpler lifecycle — no signatory-vacancy
// or seal-availability gating, because a letter/memo/circular is
// signed by whichever staff member is issuing it, not by a fixed
// institutional seal.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../../_lib/office-access.js';
import { logStaffEvent } from '../../../../_lib/audit.js';
import { generateCorrespondenceReferenceNo } from '../../../../_lib/correspondence-no.js';
import { computeDocumentHash } from '../../../../_lib/document-hash.js';

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
  if (!Number.isInteger(id)) return json({ error: 'id is required.' }, 400);

  try {
    const rowRes = await sql`SELECT * FROM office_correspondence WHERE id = ${id}`;
    const row = rowRes.rows[0];
    if (!row) return json({ error: 'Document not found.' }, 404);
    if (row.status !== 'draft') return json({ error: 'This document has already been issued.' }, 409);

    const canAct = await staffCanActOnOffice(sql, session.staffId, row.office_id);
    if (!canAct) return json({ error: 'You do not currently hold this office.' }, 403);

    if (!row.signatory_name) return json({ error: 'A signatory name is required before issuing.' }, 400);

    const issuedAt = new Date().toISOString();
    const referenceNo = await generateCorrespondenceReferenceNo(sql, row.document_type, issuedAt);
    const hashFields = {
      correspondenceId: row.id, officeId: row.office_id, documentType: row.document_type,
      referenceNo, issuedAt, bodyHtml: row.body_html,
    };
    const { fullHash, keyVersion } = computeDocumentHash(env, hashFields);

    await sql`
      UPDATE office_correspondence SET
        status = 'issued', reference_no = ${referenceNo}, content_hash = ${fullHash},
        hash_key_version = ${keyVersion}, issued_by_staff_id = ${session.staffId},
        issued_at = ${issuedAt}, updated_at = now()
      WHERE id = ${id}`;

    await logStaffEvent(sql, {
      actorStaffId: session.staffId, eventType: 'sensitive_action', targetType: 'office_correspondence',
      targetId: id, reason: null, metadata: { documentType: row.document_type, referenceNo, officeId: row.office_id },
    });

    return json({ id, status: 'issued', referenceNo });
  } catch (err) {
    console.error('writing centre issue error', err);
    return json({ error: 'Could not issue this document right now — please try again shortly.' }, 500);
  }
}
