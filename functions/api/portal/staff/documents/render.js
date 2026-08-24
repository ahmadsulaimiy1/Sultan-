// Institutional Writing & Document Intelligence Centre — render. Turns
// a saved row (draft or issued) into the actual letterhead, as HTML or
// (?format=pdf) a real PDF via the same Cloudflare Browser Rendering
// path graduation-documents.js uses, with the same graceful fallback
// when the BROWSER binding isn't configured on this environment.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../../_lib/office-access.js';
import { renderCorrespondenceShell } from '../../../../_lib/correspondence-shell.js';
import { renderHtmlToPdf, PdfRenderUnavailableError } from '../../../../_lib/pdf-render.js';

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
    const rowRes = await sql`
      SELECT c.*, o.name AS office_name, i.name AS institution_name
      FROM office_correspondence c
      JOIN offices o ON o.id = c.office_id
      LEFT JOIN institutions i ON i.id = c.institution_id
      WHERE c.id = ${id}`;
    const row = rowRes.rows[0];
    if (!row) return json({ error: 'Document not found.' }, 404);

    const canAct = await staffCanActOnOffice(sql, session.staffId, row.office_id);
    if (!canAct) return json({ error: 'You do not currently hold this office.' }, 403);

    const dateDisplay = new Date(row.issued_at || row.created_at).toISOString().slice(0, 10);
    const html = renderCorrespondenceShell({
      officeName: row.office_name,
      institutionName: row.institution_name || 'Sultan Hanafi Royal Schools',
      documentType: row.document_type,
      dateDisplay,
      referenceNo: row.reference_no,
      status: row.status,
      recipientName: row.recipient_name,
      recipientRole: row.recipient_role,
      subject: row.subject,
      bodyHtml: row.body_html,
      signatoryName: row.signatory_name,
      signatoryTitle: row.signatory_title,
    });

    if (url.searchParams.get('format') === 'pdf') {
      try {
        const pdf = await renderHtmlToPdf(env, html);
        return new Response(pdf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${row.reference_no || `draft-${row.id}`}.pdf"`,
          },
        });
      } catch (pdfErr) {
        if (pdfErr instanceof PdfRenderUnavailableError) {
          return json({ error: pdfErr.message, htmlViewUrl: `/api/portal/staff/documents/render?id=${id}` }, 503);
        }
        throw pdfErr;
      }
    }

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (err) {
    console.error('writing centre render error', err);
    return json({ error: 'Could not render this document right now — please try again shortly.' }, 500);
  }
}
