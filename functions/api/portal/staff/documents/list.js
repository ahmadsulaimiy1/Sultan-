// Institutional Writing & Document Intelligence Centre — list & search.
// Mirrors messages/list.js's exact shape: every office this staff
// member currently holds, plus the correspondence rows scoped to it (or
// to a single office via ?officeId=). ?q= additionally full-text
// searches title/subject/recipient/reference number/body across
// whatever's already in scope — the "searched, referenced" governance
// requirement, implemented as a plain ILIKE query rather than a real
// search index, since this table's realistic row count doesn't need
// one and this needs no schema change to work.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { staffOfficeIds } from '../../../../_lib/office-access.js';

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

  try {
    const officeIds = await staffOfficeIds(sql, session.staffId);
    if (!officeIds.length) return json({ documents: [], offices: [] });

    const url = new URL(request.url);
    const officeIdParam = Number(url.searchParams.get('officeId'));
    const scopedIds = Number.isInteger(officeIdParam) && officeIds.includes(officeIdParam) ? [officeIdParam] : officeIds;
    const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
    const like = q ? `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%` : null;

    const res = like
      ? await sql`
          SELECT c.id, c.document_type, c.tone, c.title, c.subject, c.recipient_name, c.recipient_role,
                 c.reference_no, c.status, c.created_at, c.updated_at, c.issued_at,
                 o.id AS office_id, o.name AS office_name,
                 ds.full_name AS drafted_by_name, isf.full_name AS issued_by_name
          FROM office_correspondence c
          JOIN offices o ON o.id = c.office_id
          LEFT JOIN staff ds ON ds.id = c.drafted_by_staff_id
          LEFT JOIN staff isf ON isf.id = c.issued_by_staff_id
          WHERE c.office_id = ANY(${scopedIds}) AND (
            c.title ILIKE ${like} OR c.subject ILIKE ${like} OR c.recipient_name ILIKE ${like}
            OR c.reference_no ILIKE ${like} OR c.body_html ILIKE ${like}
          )
          ORDER BY c.updated_at DESC
          LIMIT 200`
      : await sql`
          SELECT c.id, c.document_type, c.tone, c.title, c.subject, c.recipient_name, c.recipient_role,
                 c.reference_no, c.status, c.created_at, c.updated_at, c.issued_at,
                 o.id AS office_id, o.name AS office_name,
                 ds.full_name AS drafted_by_name, isf.full_name AS issued_by_name
          FROM office_correspondence c
          JOIN offices o ON o.id = c.office_id
          LEFT JOIN staff ds ON ds.id = c.drafted_by_staff_id
          LEFT JOIN staff isf ON isf.id = c.issued_by_staff_id
          WHERE c.office_id = ANY(${scopedIds})
          ORDER BY c.updated_at DESC
          LIMIT 200`;

    const officesRes = await sql`SELECT id, name FROM offices WHERE id = ANY(${officeIds}) ORDER BY name`;

    return json({
      documents: res.rows.map((d) => ({
        id: d.id, documentType: d.document_type, tone: d.tone, title: d.title, subject: d.subject,
        recipientName: d.recipient_name, recipientRole: d.recipient_role, referenceNo: d.reference_no,
        status: d.status, createdAt: d.created_at, updatedAt: d.updated_at, issuedAt: d.issued_at,
        officeId: d.office_id, officeName: d.office_name,
        draftedByName: d.drafted_by_name, issuedByName: d.issued_by_name,
      })),
      offices: officesRes.rows.map((o) => ({ id: o.id, name: o.name })),
    });
  } catch (err) {
    console.error('writing centre list error', err);
    return json({ error: 'Could not load documents right now — please try again shortly.' }, 500);
  }
}
