// Graduation Register (spec §1.3 document #12, §16.10) — a single
// roster document per ceremony/session, not per student. Pulls from
// the same graduation_records roster query the Graduation Control
// Centre already uses (graduation-clearances.js's ?all=1 branch),
// scoped to one session and to records that are actually locked.
//
// No per-document numbering (spec §1.1 footnote) — this is an
// institutional publication, not an individually-verifiable
// credential, so functions/_lib/document-template-shell.js is called
// without a referenceNo, which skips the seal and security band
// entirely rather than rendering either against a number that
// doesn't exist.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { resolveSignatories, SignatoryVacancyError } from '../../../../_lib/document-signatories.js';
import { renderDocumentShell } from '../../../../_lib/document-template-shell.js';
import { renderHtmlToPdf, PdfRenderUnavailableError } from '../../../../_lib/pdf-render.js';

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

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function registerBody(rows, graduationSession, lang) {
  const heading = lang === 'ar'
    ? `سجل التخرج — دورة ${graduationSession}`
    : `Graduation Register — ${graduationSession} Session`;
  const cols = lang === 'ar'
    ? { seq: '#', name: 'الاسم', gid: 'الرقم الدائم للخريج', inst: 'المؤسسة' }
    : { seq: '#', name: 'Name', gid: 'Permanent Graduate ID', inst: 'Institution' };
  const tableRows = rows.map((r, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.identityNo || '—')}</td>
      <td>${escapeHtml(r.institutionName || '—')}</td>
    </tr>`).join('');
  return `<span class="doc-recipient">${escapeHtml(heading)}</span>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead><tr style="border-bottom:1px solid var(--gold);">
        <th style="text-align:left;padding:6px 8px;">${cols.seq}</th>
        <th style="text-align:left;padding:6px 8px;">${cols.name}</th>
        <th style="text-align:left;padding:6px 8px;">${cols.gid}</th>
        <th style="text-align:left;padding:6px 8px;">${cols.inst}</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>`;
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const graduationSession = (url.searchParams.get('session') || '').trim();
  if (!graduationSession) return json({ error: 'session is required (e.g. 2025/2026).' }, 400);
  const lang = (url.searchParams.get('lang') === 'ar') ? 'ar' : 'en';

  const grant = await hasPermissionFor(sql, staffId, 'graduation_documents', 'V', null);
  if (!grant.granted) {
    return json({ error: 'Your role does not have authority to generate the Graduation Register.' }, 403);
  }

  try {
    const rosterRes = await sql`
      SELECT gr.preferred_certificate_name, gr.full_legal_name, s.identity_no, c.institution AS institution_name
      FROM graduation_records gr
      JOIN students s ON s.id = gr.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE gr.graduation_session = ${graduationSession} AND gr.status = 'locked'
      ORDER BY c.institution ASC, gr.preferred_certificate_name ASC`;

    const rows = rosterRes.rows.map((r) => ({
      name: r.preferred_certificate_name || r.full_legal_name,
      identityNo: r.identity_no,
      institutionName: r.institution_name,
    }));

    let signatories;
    try {
      signatories = await resolveSignatories(sql, 'graduation_register', null);
    } catch (sigErr) {
      if (sigErr instanceof SignatoryVacancyError) return json({ error: sigErr.message }, 409);
      throw sigErr;
    }

    const typeLabel = lang === 'ar' ? 'سجل التخرج' : 'Graduation Register';
    const html = renderDocumentShell({
      documentTitle: typeLabel, documentTypeLabel: typeLabel, lang, dir: lang === 'ar' ? 'rtl' : 'ltr',
      institutionName: 'Sultan Hanafi Royal Schools', recipientName: graduationSession,
      bodyHtml: registerBody(rows, graduationSession, lang), signatories, bodyVariant: 'tabular',
    });

    if (url.searchParams.get('format') === 'pdf') {
      try {
        const pdf = await renderHtmlToPdf(env, html);
        return new Response(pdf, {
          headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="graduation-register-${graduationSession.replace(/\//g, '-')}.pdf"` },
        });
      } catch (pdfErr) {
        if (pdfErr instanceof PdfRenderUnavailableError) return json({ error: pdfErr.message }, 503);
        throw pdfErr;
      }
    }

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (err) {
    console.error('graduation-register error', err);
    return json({ error: 'Could not generate the Graduation Register right now — please try again shortly.' }, 500);
  }
}
