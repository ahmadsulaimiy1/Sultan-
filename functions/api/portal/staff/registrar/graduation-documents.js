// Graduation Document issuance — Stage 3, Master Graduation Document
// Specification §20 Phase 5. First real document type: the Alumni
// Registration Certificate (Class C — Registry/Internal, the lowest-
// stakes type in the ecosystem, built first per the spec's own build
// ordering). Mirrors registrar/graduation.js and registrar/
// certificates.js's exact session/permission/audit shape.
//
// Trigger: a graduation_records row at status = 'locked' (the same
// "locked" state the Graduation Approval Workflow already produces once
// every required clearance stage clears) — issuing a document for a
// record that isn't locked yet would certify something not actually
// finished being verified.
//
// Rendering path, stated honestly: GET ?ref= returns print-ready HTML
// via functions/_lib/document-template-shell.js. Browser "Print / Save
// as PDF" is the only way to get a PDF today — the real triggered/batch
// PDF pipeline (spec §6.2) is gated on the client's still-open
// infrastructure decision (spec §22).
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';
import { generateDocumentReferenceNo, getOrCreateVerificationId } from '../../../../_lib/graduation-document-no.js';
import { computeDocumentHash } from '../../../../_lib/document-hash.js';
import { resolveSignatories, SignatoryVacancyError } from '../../../../_lib/document-signatories.js';
import { renderDocumentShell } from '../../../../_lib/document-template-shell.js';
import { resolveSeal } from '../../../../_lib/document-seals.js';
import { renderHtmlToPdf, PdfRenderUnavailableError } from '../../../../_lib/pdf-render.js';

const DOCUMENT_TYPE_LABEL = {
  alumni_registration: { en: 'Alumni Registration Certificate', ar: 'شهادة تسجيل الخريجين' },
};

// The primary signatory role each document type's seal is keyed off —
// resolveSeal() (functions/_lib/document-seals.js) maps that role (and,
// for PRIN, the document's own institution) to a real seal asset, or
// returns null if none exists yet for that office.
const DOCUMENT_PRIMARY_SIGNATORY_ROLE = {
  alumni_registration: 'REG',
};

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

async function loadRecord(sql, recordId) {
  const res = await sql`
    SELECT gr.*, s.full_name, s.admission_no, s.identity_no, c.institution AS institution_name, ci.id AS institution_id
    FROM graduation_records gr
    JOIN students s ON s.id = gr.student_id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN institutions ci ON ci.name = c.institution
    WHERE gr.id = ${recordId}`;
  return res.rows[0] || null;
}

function alumniRegistrationBody(record, lang) {
  const name = record.preferred_certificate_name || record.full_legal_name || record.full_name;
  if (lang === 'ar') {
    return `<span class="doc-eyebrow">مدارس السلطان حنفي الملكية تشهد بأن</span>
      <span class="doc-recipient">${name}</span>
      <p>قد تم تسجيله/تسجيلها رسميًا في سجل الخريجين لدى ${record.institution_name || 'المؤسسة'}
      عقب التخرج في دورة ${record.graduation_session}، ويحمل الرقم الدائم للخريج
      <strong>${record.identity_no || '—'}</strong>.</p>`;
  }
  return `<span class="doc-eyebrow">Sultan Hanafi Royal Schools certifies that</span>
    <span class="doc-recipient">${name}</span>
    <p>has been formally entered into the Alumni Register following graduation from
    ${record.institution_name || 'the institution'} in the ${record.graduation_session} session,
    bearing Permanent Graduate ID <strong>${record.identity_no || '—'}</strong>.</p>`;
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return json({ error: 'ref is required.' }, 400);

  try {
    const docRes = await sql`
      SELECT gd.*, gr.graduation_session, gr.preferred_certificate_name, gr.full_legal_name,
             s.full_name, s.identity_no, c.institution AS institution_name, ci.id AS institution_id
      FROM graduation_documents gd
      JOIN graduation_records gr ON gr.id = gd.graduation_record_id
      JOIN students s ON s.id = gr.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE gd.reference_no = ${ref}`;
    const row = docRes.rows[0];
    if (!row) return json({ error: 'No graduation document found with that reference number.' }, 404);

    const grant = await hasPermissionFor(sql, staffId, 'graduation_documents', 'V', row.institution_id ?? null);
    if (!grant.granted) {
      return json({ error: 'Your role does not have authority to view this document.' }, 403);
    }

    const lang = (url.searchParams.get('lang') === 'ar') ? 'ar' : 'en';
    const typeLabel = DOCUMENT_TYPE_LABEL[row.document_type];
    if (!typeLabel) return json({ error: `No printable template exists yet for document type "${row.document_type}".` }, 501);

    const record = {
      preferred_certificate_name: row.preferred_certificate_name, full_legal_name: row.full_legal_name,
      full_name: row.full_name, identity_no: row.identity_no, institution_name: row.institution_name,
      graduation_session: row.graduation_session,
    };
    const bodyHtml = row.document_type === 'alumni_registration' ? alumniRegistrationBody(record, lang) : '';

    const html = renderDocumentShell({
      documentTitle: typeLabel[lang], documentTypeLabel: typeLabel[lang], lang, dir: lang === 'ar' ? 'rtl' : 'ltr',
      institutionName: row.institution_name, recipientName: record.preferred_certificate_name || record.full_legal_name || record.full_name,
      bodyHtml, referenceNo: row.reference_no, verificationId: row.verification_id,
      displayHash: String(row.content_hash || '').slice(0, 12),
      issuedAtDisplay: new Date(row.issued_at).toISOString().slice(0, 10),
      signatories: Array.isArray(row.signatories) ? row.signatories : [],
      documentKind: row.document_kind,
      sealImage: resolveSeal({
        role: DOCUMENT_PRIMARY_SIGNATORY_ROLE[row.document_type] || null,
        institutionName: row.institution_name,
      }),
    });

    if (url.searchParams.get('format') === 'pdf') {
      try {
        const pdf = await renderHtmlToPdf(env, html);
        return new Response(pdf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${row.reference_no}.pdf"`,
          },
        });
      } catch (pdfErr) {
        if (pdfErr instanceof PdfRenderUnavailableError) {
          return json({ error: pdfErr.message, htmlViewUrl: `/api/portal/staff/registrar/graduation-documents?ref=${encodeURIComponent(ref)}` }, 503);
        }
        throw pdfErr;
      }
    }

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (err) {
    console.error('graduation-documents view error', err);
    return json({ error: 'Could not load that document right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const action = body && body.action;

  try {
    if (action === 'issue_alumni_registration') {
      const recordId = Number(body && body.recordId);
      if (!Number.isInteger(recordId)) return json({ error: 'A valid numeric recordId is required.' }, 400);

      const record = await loadRecord(sql, recordId);
      if (!record) return json({ error: 'No graduation record found with that id.' }, 404);
      if (record.status !== 'locked') {
        return json({ error: 'This graduation record is not yet locked — an Alumni Registration Certificate can only be issued once every required clearance stage has cleared.' }, 409);
      }

      const grant = await hasPermissionFor(sql, staffId, 'graduation_documents', 'C', record.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to issue graduation documents.' }, 403);
      }

      const existing = await sql`
        SELECT reference_no FROM graduation_documents
        WHERE graduation_record_id = ${recordId} AND document_type = 'alumni_registration' AND revoked_at IS NULL`;
      if (existing.rows[0]) {
        return json({ error: 'An Alumni Registration Certificate has already been issued for this record.', referenceNo: existing.rows[0].reference_no }, 409);
      }

      let signatories;
      try {
        signatories = await resolveSignatories(sql, 'alumni_registration', record.institution_id ?? null);
      } catch (sigErr) {
        if (sigErr instanceof SignatoryVacancyError) return json({ error: sigErr.message }, 409);
        throw sigErr;
      }

      const issuedAt = new Date().toISOString();
      const referenceNo = await generateDocumentReferenceNo(sql, 'alumni_registration', issuedAt);
      const verificationId = await getOrCreateVerificationId(sql, recordId, record.graduation_session);
      const hashFields = { graduationRecordId: recordId, documentType: 'alumni_registration', referenceNo, issuedAt };
      const { fullHash } = computeDocumentHash(env, hashFields);

      const inserted = await sql`
        INSERT INTO graduation_documents
          (graduation_record_id, document_type, document_kind, reference_no, verification_id,
           issued_at, issued_by_staff_id, signatories, content_hash)
        VALUES
          (${recordId}, 'alumni_registration', 'original', ${referenceNo}, ${verificationId},
           ${issuedAt}, ${staffId}, ${JSON.stringify(signatories)}, ${fullHash})
        RETURNING id`;

      await sql`
        INSERT INTO alumni_register (student_id, graduation_record_id, permanent_graduate_id)
        VALUES (${record.student_id}, ${recordId}, ${record.identity_no})
        ON CONFLICT (graduation_record_id) DO NOTHING`;

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_document', targetId: inserted.rows[0].id,
        reason: null, metadata: { documentType: 'alumni_registration', referenceNo, recordId },
      });

      return json({
        ok: true, documentId: inserted.rows[0].id, referenceNo, verificationId,
        verifyUrl: `/verify-graduation-document/?ref=${encodeURIComponent(referenceNo)}`,
        viewUrl: `/api/portal/staff/registrar/graduation-documents?ref=${encodeURIComponent(referenceNo)}`,
      });
    }

    return json({ error: 'Unknown action. Expected: issue_alumni_registration.' }, 400);
  } catch (err) {
    console.error('registrar graduation-documents error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
