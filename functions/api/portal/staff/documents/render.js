// Institutional Writing & Document Intelligence Centre — render. Turns
// a saved row (draft or issued) into the actual letterhead, as HTML or
// (?format=pdf) a real PDF via the same Cloudflare Browser Rendering
// path graduation-documents.js uses, with the same graceful fallback
// when the BROWSER binding isn't configured on this environment.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../../_lib/office-access.js';
import { renderCorrespondenceShell, correspondenceTypeLabel } from '../../../../_lib/correspondence-shell.js';
import { renderHtmlToPdf, PdfRenderUnavailableError } from '../../../../_lib/pdf-render.js';
import { institutionByDbName } from '../../../../_lib/institutions.js';
import { htmlToMarkdown, htmlToPlainText } from '../../../../_lib/html-to-text.js';

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
    const specificInstitution = institutionByDbName(row.institution_name);
    const filenameBase = row.reference_no || `draft-${row.id}`;
    const format = url.searchParams.get('format');

    if (format === 'markdown' || format === 'text') {
      const header = [
        `${correspondenceTypeLabel(row.document_type)} — ${row.office_name}`,
        specificInstitution ? specificInstitution.displayName : 'Sultan Hanafi Royal Schools',
        `Date: ${dateDisplay}`,
        row.reference_no ? `Ref: ${row.reference_no}` : 'No reference yet (draft)',
        row.recipient_name ? `To: ${row.recipient_name}${row.recipient_role ? ` (${row.recipient_role})` : ''}` : null,
        row.subject ? `Subject: ${row.subject}` : null,
      ].filter(Boolean).join('\n');
      const converted = format === 'markdown' ? htmlToMarkdown(row.body_html) : htmlToPlainText(row.body_html);
      const sig = row.signatory_name
        ? `\n\n${row.signatory_name}${row.signatory_title ? `\n${row.signatory_title}` : ''}`
        : '';
      const body = `${header}\n\n---\n\n${converted}${sig}`;
      return new Response(body, {
        headers: {
          'Content-Type': format === 'markdown' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8',
          'Content-Disposition': `inline; filename="${filenameBase}.${format === 'markdown' ? 'md' : 'txt'}"`,
        },
      });
    }

    const html = renderCorrespondenceShell({
      officeName: row.office_name,
      institutionName: 'Sultan Hanafi Royal Schools',
      specificInstitutionName: specificInstitution ? specificInstitution.displayName : null,
      accentInstitution: row.institution_name,
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

    if (format === 'pdf') {
      try {
        const pdf = await renderHtmlToPdf(env, html);
        return new Response(pdf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filenameBase}.pdf"`,
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
