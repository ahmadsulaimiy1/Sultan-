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
import { generateWithRetryOnConflict } from '../../../../_lib/generate-with-retry.js';
import { computeDocumentHash } from '../../../../_lib/document-hash.js';
import { resolveSignatories, resolveCertificateSignatories, SignatoryVacancyError } from '../../../../_lib/document-signatories.js';
import { renderDocumentShell } from '../../../../_lib/document-template-shell.js';
import { resolveSeal, requireRealSeal, SealPendingError } from '../../../../_lib/document-seals.js';
import { renderHtmlToPdf, PdfRenderUnavailableError } from '../../../../_lib/pdf-render.js';
import { createApprovalRequest, listPendingApprovals, decideApproval } from '../../../../_lib/approvals.js';
import { isChainComplete, getClearances, STAGE_BY_CODE } from '../../../../_lib/graduation-workflow.js';

const DOCUMENT_TYPE_LABEL = {
  alumni_registration: { en: 'Alumni Registration Certificate', ar: 'شهادة تسجيل الخريجين' },
  testimonial: { en: 'Official Testimonial', ar: 'شهادة توصية رسمية' },
  character_certificate: { en: 'Character Certificate', ar: 'شهادة حسن سيرة وسلوك' },
  clearance_certificate: { en: 'Graduation Clearance Certificate', ar: 'شهادة إتمام إجراءات التخرج' },
  certificate: { en: 'Graduation Certificate', ar: 'شهادة التخرج' },
};

// The primary signatory role each document type's seal is keyed off —
// resolveSeal() (functions/_lib/document-seals.js) maps that role (and,
// for PRIN, the document's own institution) to a real seal asset, or
// returns null if none exists yet for that office.
const DOCUMENT_PRIMARY_SIGNATORY_ROLE = {
  alumni_registration: 'REG',
  testimonial: 'PRIN',
  character_certificate: 'PRIN',
  clearance_certificate: 'REG',
  certificate: 'PRIN',
};

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
    SELECT gr.*, s.full_name, s.admission_no, s.identity_no, c.institution AS institution_name, c.name AS class_name, ci.id AS institution_id
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

// Free-text, staff-authored (spec §16.4) — never auto-generated from any
// data table. testimonialText is rendered exactly as written; no
// translation is fabricated for the other language.
function testimonialBody(record, lang, testimonialText) {
  const name = record.preferred_certificate_name || record.full_legal_name || record.full_name;
  const eyebrow = lang === 'ar'
    ? `مدارس السلطان حنفي الملكية تقدم هذه الشهادة بخصوص`
    : `Sultan Hanafi Royal Schools provides this testimonial regarding`;
  return `<span class="doc-eyebrow">${eyebrow}</span>
    <span class="doc-recipient">${name}</span>
    <p style="white-space:pre-wrap;text-align:left;">${escapeHtml(testimonialText)}</p>`;
}

// Shorter, formulaic attestation, distinct from the Testimonial (spec
// §16.5) — a fact statement, not a narrative reference. hasDisciplinary
// Record is computed once at issuance and snapshotted, never
// recomputed live (spec §8).
function characterCertificateBody(record, lang, hasDisciplinaryRecord) {
  const name = record.preferred_certificate_name || record.full_legal_name || record.full_name;
  if (lang === 'ar') {
    const qualifier = hasDisciplinaryRecord
      ? 'مع وجود إجراء تأديبي مسجل بحقه/بحقها، كما هو مثبت في السجلات'
      : 'دون أي إجراء تأديبي مسجل بحقه/بحقها';
    return `<span class="doc-eyebrow">مدارس السلطان حنفي الملكية تشهد بأن</span>
      <span class="doc-recipient">${name}</span>
      <p>كان طالبًا/طالبة يتمتع بحسن السيرة والسلوك خلال فترة دراسته/دراستها بالمدرسة، ${qualifier}.</p>`;
  }
  const qualifier = hasDisciplinaryRecord
    ? 'with disciplinary action recorded against them, as held on file'
    : 'without any disciplinary action recorded against them';
  return `<span class="doc-eyebrow">Sultan Hanafi Royal Schools certifies that</span>
    <span class="doc-recipient">${name}</span>
    <p>has been a student of good conduct during their time at the institution, ${qualifier}.</p>`;
}

const CLEARANCE_STATUS_LABEL = {
  cleared: { en: 'Cleared', ar: 'مكتملة' },
  not_applicable: { en: 'N/A', ar: 'لا ينطبق' },
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  correction_requested: { en: 'Correction Requested', ar: 'طلب تصحيح' },
};

// A formal document version of the graduation_clearances timeline (spec
// §16.6) — every stage, who cleared it, when. clearanceRows here is
// always the immutable content_data snapshot taken at issuance, never
// a live re-query, so a later change to graduation_clearances can never
// retroactively alter an already-issued Clearance Certificate.
function clearanceCertificateBody(record, lang, clearanceRows) {
  const name = record.preferred_certificate_name || record.full_legal_name || record.full_name;
  const heading = lang === 'ar' ? `شهادة إتمام إجراءات التخرج — ${name}` : `Graduation Clearance Certificate — ${name}`;
  const cols = lang === 'ar'
    ? { stage: 'المرحلة', status: 'الحالة', by: 'اعتمدها', at: 'التاريخ' }
    : { stage: 'Stage', status: 'Status', by: 'Cleared By', at: 'Date' };
  const rows = (clearanceRows || []).map((r) => {
    const statusLabel = (CLEARANCE_STATUS_LABEL[r.status] && CLEARANCE_STATUS_LABEL[r.status][lang]) || r.status;
    return `<tr>
      <td>${escapeHtml(r.stageLabel)}</td>
      <td>${escapeHtml(statusLabel)}</td>
      <td>${escapeHtml(r.decidedByName || '—')}</td>
      <td>${r.decidedAt ? new Date(r.decidedAt).toISOString().slice(0, 10) : '—'}</td>
    </tr>`;
  }).join('');
  return `<span class="doc-recipient">${escapeHtml(heading)}</span>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead><tr style="border-bottom:1px solid var(--gold);">
        <th style="text-align:left;padding:6px 8px;">${cols.stage}</th>
        <th style="text-align:left;padding:6px 8px;">${cols.status}</th>
        <th style="text-align:left;padding:6px 8px;">${cols.by}</th>
        <th style="text-align:left;padding:6px 8px;">${cols.at}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// The flagship Class A document (spec §16.1). Deliberately generic
// about programme/level ("has satisfactorily completed the prescribed
// course of study") rather than inventing a specific curriculum-name
// field this project's schema doesn't have — class_name is included
// parenthetically only when the join actually resolves one, never
// fabricated. Signature block is resolved dynamically per record by
// resolveCertificateSignatories() in the issuing action below, not
// fixed here.
function certificateBody(record, lang) {
  const name = record.preferred_certificate_name || record.full_legal_name || record.full_name;
  const programme = record.class_name ? ` (${record.class_name})` : '';
  if (lang === 'ar') {
    return `<span class="doc-eyebrow">مدارس السلطان حنفي الملكية تشهد بأن</span>
      <span class="doc-recipient">${name}</span>
      <p>قد أتم/أتمت بنجاح البرنامج الدراسي المقرر لدى ${record.institution_name || 'المؤسسة'}${programme}
      عقب التخرج في دورة ${record.graduation_session}، وتُمنح هذه الشهادة تقديرًا لهذا الإنجاز.</p>`;
  }
  return `<span class="doc-eyebrow">Sultan Hanafi Royal Schools certifies that</span>
    <span class="doc-recipient">${name}</span>
    <p>has satisfactorily completed the prescribed course of study at
    ${record.institution_name || 'the institution'}${programme} in the ${record.graduation_session} session,
    and is awarded this Certificate in recognition of that achievement.</p>`;
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
             s.full_name, s.identity_no, c.institution AS institution_name, c.name AS class_name, ci.id AS institution_id
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
      class_name: row.class_name, graduation_session: row.graduation_session,
    };
    let bodyHtml = '';
    let bodyVariant = 'narrative';
    const contentData = row.content_data || {};
    if (row.document_type === 'alumni_registration') {
      bodyHtml = alumniRegistrationBody(record, lang);
    } else if (row.document_type === 'testimonial') {
      bodyHtml = testimonialBody(record, lang, contentData.testimonialText || '');
    } else if (row.document_type === 'character_certificate') {
      bodyHtml = characterCertificateBody(record, lang, !!contentData.hasDisciplinaryRecord);
    } else if (row.document_type === 'clearance_certificate') {
      bodyHtml = clearanceCertificateBody(record, lang, contentData.clearanceRows || []);
      bodyVariant = 'tabular';
    } else if (row.document_type === 'certificate') {
      bodyHtml = certificateBody(record, lang);
    }

    const html = renderDocumentShell({
      documentTitle: typeLabel[lang], documentTypeLabel: typeLabel[lang], lang, dir: lang === 'ar' ? 'rtl' : 'ltr',
      institutionName: row.institution_name, recipientName: record.preferred_certificate_name || record.full_legal_name || record.full_name,
      bodyHtml, bodyVariant, referenceNo: row.reference_no, verificationId: row.verification_id,
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
      const verificationId = await getOrCreateVerificationId(sql, recordId, record.graduation_session);
      // TD-2: candidate + INSERT retried together on a unique-violation
      // (docs/technical-debt-register.md) — the hash is recomputed per
      // attempt since it is derived from the candidate reference number.
      const docOutcome = await generateWithRetryOnConflict(
        sql,
        () => generateDocumentReferenceNo(sql, 'alumni_registration', issuedAt),
        (no) => {
          const { fullHash } = computeDocumentHash(env, { graduationRecordId: recordId, documentType: 'alumni_registration', referenceNo: no, issuedAt });
          return sql`
            INSERT INTO graduation_documents
              (graduation_record_id, document_type, document_kind, reference_no, verification_id,
               issued_at, issued_by_staff_id, signatories, content_hash)
            VALUES
              (${recordId}, 'alumni_registration', 'original', ${no}, ${verificationId},
               ${issuedAt}, ${staffId}, ${JSON.stringify(signatories)}, ${fullHash})
            RETURNING id`;
        }
      );
      const referenceNo = docOutcome.value;
      const inserted = docOutcome.result;

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
        profileUrl: `/graduate-profile/?id=${encodeURIComponent(verificationId)}`,
      });
    }

    // Graduation Certificate (spec §16.1) — Class A, the flagship
    // document. Single-step Registrar issuance like Alumni
    // Registration: unlike Class B, no NEW approval is solicited here —
    // the Principal's authority was already exercised as the 'principal'
    // stage of the graduation_clearances chain the record had to pass
    // to reach 'locked' in the first place. What IS new is that the
    // signature block is resolved dynamically per record
    // (resolveCertificateSignatories) so a Certificate only ever
    // carries the Vice Principal (Academic/Administration)/Founder
    // signatures a record's own clearance chain actually exercised —
    // never claims sign-off authority that never happened for THIS
    // graduate, per §16.1's own words.
    if (action === 'issue_certificate') {
      const recordId = Number(body && body.recordId);
      if (!Number.isInteger(recordId)) return json({ error: 'A valid numeric recordId is required.' }, 400);

      const record = await loadRecord(sql, recordId);
      if (!record) return json({ error: 'No graduation record found with that id.' }, 404);
      if (record.status !== 'locked') {
        return json({ error: 'This graduation record is not yet locked — a Graduation Certificate can only be issued once every required clearance stage has cleared.' }, 409);
      }

      const grant = await hasPermissionFor(sql, staffId, 'graduation_documents', 'C', record.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to issue graduation documents.' }, 403);
      }

      const existing = await sql`
        SELECT reference_no FROM graduation_documents
        WHERE graduation_record_id = ${recordId} AND document_type = 'certificate' AND revoked_at IS NULL`;
      if (existing.rows[0]) {
        return json({ error: 'A Graduation Certificate has already been issued for this record.', referenceNo: existing.rows[0].reference_no }, 409);
      }

      requireRealSeal({ role: 'PRIN', institutionName: record.institution_name, documentType: DOCUMENT_TYPE_LABEL.certificate.en });

      const clearanceRows = await getClearances(sql, recordId);
      let signatories;
      try {
        signatories = await resolveCertificateSignatories(sql, record.institution_id ?? null, clearanceRows);
      } catch (sigErr) {
        if (sigErr instanceof SignatoryVacancyError) return json({ error: sigErr.message }, 409);
        throw sigErr;
      }

      const issuedAt = new Date().toISOString();
      const verificationId = await getOrCreateVerificationId(sql, recordId, record.graduation_session);
      // TD-2: candidate + INSERT retried together on a unique-violation
      // (docs/technical-debt-register.md) — the hash is recomputed per
      // attempt since it is derived from the candidate reference number.
      const docOutcome = await generateWithRetryOnConflict(
        sql,
        () => generateDocumentReferenceNo(sql, 'certificate', issuedAt),
        (no) => {
          const { fullHash } = computeDocumentHash(env, { graduationRecordId: recordId, documentType: 'certificate', referenceNo: no, issuedAt });
          return sql`
            INSERT INTO graduation_documents
              (graduation_record_id, document_type, document_kind, reference_no, verification_id,
               issued_at, issued_by_staff_id, signatories, content_hash)
            VALUES
              (${recordId}, 'certificate', 'original', ${no}, ${verificationId},
               ${issuedAt}, ${staffId}, ${JSON.stringify(signatories)}, ${fullHash})
            RETURNING id`;
        }
      );
      const referenceNo = docOutcome.value;
      const inserted = docOutcome.result;

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_document', targetId: inserted.rows[0].id,
        reason: null, metadata: { documentType: 'certificate', referenceNo, recordId },
      });

      return json({
        ok: true, documentId: inserted.rows[0].id, referenceNo, verificationId,
        verifyUrl: `/verify-graduation-document/?ref=${encodeURIComponent(referenceNo)}`,
        viewUrl: `/api/portal/staff/registrar/graduation-documents?ref=${encodeURIComponent(referenceNo)}`,
        profileUrl: `/graduate-profile/?id=${encodeURIComponent(verificationId)}`,
      });
    }

    // Class B (spec §16.4-§16.5) — Testimonial and Character Certificate
    // both require the student's own Principal/Head Teacher/Ra'ees/
    // Mudeer to actually sign off (§13.2), so — unlike Alumni
    // Registration's single-step Registrar issuance — these go through
    // the existing Approval Workflow (functions/_lib/approvals.js),
    // exactly the way certificates.js's joint REG+PRIN authority already
    // does. Only a real, distinct Principal decision produces the
    // issued document; nothing here can self-approve.
    if (action === 'request_testimonial') {
      const recordId = Number(body && body.recordId);
      const testimonialText = ((body && body.testimonialText) || '').trim();
      if (!Number.isInteger(recordId)) return json({ error: 'A valid numeric recordId is required.' }, 400);
      if (!testimonialText) {
        return json({ error: 'testimonialText is required — a Testimonial is a genuine written character reference, never auto-generated (Master Spec §16.4).' }, 400);
      }

      const record = await loadRecord(sql, recordId);
      if (!record) return json({ error: 'No graduation record found with that id.' }, 404);
      if (record.status !== 'locked') {
        return json({ error: 'This graduation record is not yet locked — a Testimonial can only be requested once every required clearance stage has cleared.' }, 409);
      }

      const grant = await hasPermissionFor(sql, staffId, 'graduation_documents', 'C', record.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to request a Testimonial for this student.' }, 403);
      }

      const seriousCases = await sql`
        SELECT id FROM disciplinary_cases
        WHERE student_id = ${record.student_id} AND severity = 'serious' AND status IN ('open', 'under_investigation')`;
      if (seriousCases.rows.length) {
        return json({ error: 'A Testimonial cannot be honestly issued while a serious disciplinary case remains open for this student (Master Spec §16.4).' }, 409);
      }

      const approvalRequest = await createApprovalRequest(sql, {
        areaCode: 'graduation_documents', targetType: 'testimonial',
        payload: { recordId, testimonialText },
        requestedByStaffId: staffId, approverRoleCode: 'PRIN', institutionId: record.institution_id ?? null,
      });

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_document_request', targetId: approvalRequest.id,
        reason: body.reason || null, metadata: { documentType: 'testimonial', recordId },
      });

      return json({
        ok: true, approvalId: approvalRequest.id, status: 'pending_approval',
        message: "Submitted — the student's own Principal/Head Teacher/Ra'ees/Mudeer must approve this before the Testimonial is issued.",
      });
    }

    if (action === 'request_character_certificate') {
      const recordId = Number(body && body.recordId);
      if (!Number.isInteger(recordId)) return json({ error: 'A valid numeric recordId is required.' }, 400);

      const record = await loadRecord(sql, recordId);
      if (!record) return json({ error: 'No graduation record found with that id.' }, 404);
      if (record.status !== 'locked') {
        return json({ error: 'This graduation record is not yet locked — a Character Certificate can only be requested once every required clearance stage has cleared.' }, 409);
      }

      const grant = await hasPermissionFor(sql, staffId, 'graduation_documents', 'C', record.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to request a Character Certificate for this student.' }, 403);
      }

      const approvalRequest = await createApprovalRequest(sql, {
        areaCode: 'graduation_documents', targetType: 'character_certificate',
        payload: { recordId },
        requestedByStaffId: staffId, approverRoleCode: 'PRIN', institutionId: record.institution_id ?? null,
      });

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_document_request', targetId: approvalRequest.id,
        reason: body.reason || null, metadata: { documentType: 'character_certificate', recordId },
      });

      return json({
        ok: true, approvalId: approvalRequest.id, status: 'pending_approval',
        message: "Submitted — the student's own Principal/Head Teacher/Ra'ees/Mudeer must approve this before the Character Certificate is issued.",
      });
    }

    if (action === 'list_pending_class_b') {
      const grant = await hasPermissionFor(sql, staffId, 'graduation_documents', 'A', null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to decide Testimonial/Character Certificate requests.' }, 403);
      }
      const staffRes = await sql`SELECT institution_id FROM staff WHERE id = ${staffId}`;
      const pending = await listPendingApprovals(sql, {
        areaCode: 'graduation_documents', institutionId: staffRes.rows[0] ? staffRes.rows[0].institution_id : null,
      });
      const classB = pending.filter((p) => p.target_type === 'testimonial' || p.target_type === 'character_certificate');
      return json({
        ok: true,
        pending: classB.map((p) => ({
          id: p.id, targetType: p.target_type, requestedByName: p.requested_by_name, requestedAt: p.requested_at, ...p.payload,
        })),
      });
    }

    if (action === 'approve_class_b' || action === 'reject_class_b') {
      if (!Number.isInteger(body.approvalId)) return json({ error: 'A valid numeric approvalId is required.' }, 400);

      const result = await decideApproval(sql, {
        approvalId: body.approvalId, decidingStaffId: staffId, decision: action === 'approve_class_b' ? 'approve' : 'reject',
        note: body.note || null, areaCode: 'graduation_documents', permissionCode: 'A',
        performOnApprove: async ({ payload, approval }) => {
          const record = await loadRecord(sql, payload.recordId);
          if (!record) throw new Error('The underlying graduation record for this request no longer exists.');
          const documentType = approval.target_type;

          requireRealSeal({ role: 'PRIN', institutionName: record.institution_name, documentType: DOCUMENT_TYPE_LABEL[documentType].en });
          const signatories = await resolveSignatories(sql, documentType, record.institution_id ?? null);

          let contentData = null;
          if (documentType === 'testimonial') {
            contentData = { testimonialText: payload.testimonialText };
          } else if (documentType === 'character_certificate') {
            const activeCases = await sql`
              SELECT id FROM disciplinary_cases
              WHERE student_id = ${record.student_id} AND status != 'dismissed' AND case_type != 'commendation'`;
            contentData = { hasDisciplinaryRecord: activeCases.rows.length > 0 };
          }

          const issuedAt = new Date().toISOString();
          const verificationId = await getOrCreateVerificationId(sql, payload.recordId, record.graduation_session);
          // TD-2: candidate + INSERT retried together on a unique-violation
          // (docs/technical-debt-register.md) — the hash is recomputed per
          // attempt since it is derived from the candidate reference number.
          const docOutcome = await generateWithRetryOnConflict(
            sql,
            () => generateDocumentReferenceNo(sql, documentType, issuedAt),
            (no) => {
              const { fullHash } = computeDocumentHash(env, { graduationRecordId: payload.recordId, documentType, referenceNo: no, issuedAt });
              return sql`
                INSERT INTO graduation_documents
                  (graduation_record_id, document_type, document_kind, reference_no, verification_id,
                   issued_at, issued_by_staff_id, signatories, content_hash, content_data)
                VALUES
                  (${payload.recordId}, ${documentType}, 'original', ${no}, ${verificationId},
                   ${issuedAt}, ${approval.requested_by_staff_id}, ${JSON.stringify(signatories)}, ${fullHash}, ${JSON.stringify(contentData)})
                RETURNING id`;
            }
          );

          // result_ref (staff_approvals.result_ref) is a plain TEXT
          // column, the same "e.g. the certificate's reference_no"
          // contract certificates.js already established — return just
          // the string, not an object, so it stores correctly.
          return docOutcome.value;
        },
      });
      if (result.error) return json({ error: result.error }, 403);

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_document_request', targetId: body.approvalId,
        reason: body.note || null, metadata: { decision: result.status, resultRef: result.resultRef || null },
      });

      if (result.status === 'approved') {
        const referenceNo = result.resultRef;
        const docRes = await sql`SELECT verification_id, document_type FROM graduation_documents WHERE reference_no = ${referenceNo}`;
        const verificationId = docRes.rows[0] ? docRes.rows[0].verification_id : null;
        return json({
          ok: true, status: 'approved', documentType: docRes.rows[0] ? docRes.rows[0].document_type : result.approval.target_type,
          referenceNo, verificationId,
          verifyUrl: `/verify-graduation-document/?ref=${encodeURIComponent(referenceNo)}`,
          viewUrl: `/api/portal/staff/registrar/graduation-documents?ref=${encodeURIComponent(referenceNo)}`,
          profileUrl: verificationId ? `/graduate-profile/?id=${encodeURIComponent(verificationId)}` : null,
        });
      }
      return json({ ok: true, status: 'rejected' });
    }

    // Graduation Clearance Certificate (spec §16.6) — single-step,
    // Registrar-only issuance like Alumni Registration, but gated on
    // isChainComplete() (the literal spec-named trigger) rather than
    // the record's own `status` field, since the two are related but
    // not formally the same check.
    if (action === 'issue_clearance_certificate') {
      const recordId = Number(body && body.recordId);
      if (!Number.isInteger(recordId)) return json({ error: 'A valid numeric recordId is required.' }, 400);

      const record = await loadRecord(sql, recordId);
      if (!record) return json({ error: 'No graduation record found with that id.' }, 404);

      const grant = await hasPermissionFor(sql, staffId, 'graduation_documents', 'C', record.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to issue graduation documents.' }, 403);
      }

      const clearanceRows = await getClearances(sql, recordId);
      if (!clearanceRows.length || !isChainComplete(clearanceRows)) {
        return json({ error: 'The Graduation Approval Workflow chain is not yet fully cleared for this record — a Graduation Clearance Certificate can only be issued once every blocking stage has cleared.' }, 409);
      }

      const existing = await sql`
        SELECT reference_no FROM graduation_documents
        WHERE graduation_record_id = ${recordId} AND document_type = 'clearance_certificate' AND revoked_at IS NULL`;
      if (existing.rows[0]) {
        return json({ error: 'A Graduation Clearance Certificate has already been issued for this record.', referenceNo: existing.rows[0].reference_no }, 409);
      }

      requireRealSeal({ role: 'REG', institutionName: record.institution_name, documentType: DOCUMENT_TYPE_LABEL.clearance_certificate.en });

      let signatories;
      try {
        signatories = await resolveSignatories(sql, 'clearance_certificate', record.institution_id ?? null);
      } catch (sigErr) {
        if (sigErr instanceof SignatoryVacancyError) return json({ error: sigErr.message }, 409);
        throw sigErr;
      }

      // Snapshot the timeline with real staff names, exactly as it
      // stood at issuance (spec §8) — never a live re-query later.
      const staffIds = clearanceRows.map((r) => r.decided_by_staff_id).filter(Boolean);
      const staffNames = {};
      if (staffIds.length) {
        const staffRes = await sql`SELECT id, full_name FROM staff WHERE id = ANY(${staffIds})`;
        staffRes.rows.forEach((s) => { staffNames[s.id] = s.full_name; });
      }
      const clearanceSnapshot = clearanceRows.map((r) => ({
        stageCode: r.stage_code,
        stageLabel: (STAGE_BY_CODE[r.stage_code] && STAGE_BY_CODE[r.stage_code].label) || r.stage_code,
        status: r.status,
        decidedByName: r.decided_by_staff_id ? (staffNames[r.decided_by_staff_id] || null) : null,
        decidedAt: r.decided_at,
      }));

      const issuedAt = new Date().toISOString();
      const verificationId = await getOrCreateVerificationId(sql, recordId, record.graduation_session);
      // TD-2: candidate + INSERT retried together on a unique-violation
      // (docs/technical-debt-register.md) — the hash is recomputed per
      // attempt since it is derived from the candidate reference number.
      const docOutcome = await generateWithRetryOnConflict(
        sql,
        () => generateDocumentReferenceNo(sql, 'clearance_certificate', issuedAt),
        (no) => {
          const { fullHash } = computeDocumentHash(env, { graduationRecordId: recordId, documentType: 'clearance_certificate', referenceNo: no, issuedAt });
          return sql`
            INSERT INTO graduation_documents
              (graduation_record_id, document_type, document_kind, reference_no, verification_id,
               issued_at, issued_by_staff_id, signatories, content_hash, content_data)
            VALUES
              (${recordId}, 'clearance_certificate', 'original', ${no}, ${verificationId},
               ${issuedAt}, ${staffId}, ${JSON.stringify(signatories)}, ${fullHash}, ${JSON.stringify({ clearanceRows: clearanceSnapshot })})
            RETURNING id`;
        }
      );
      const referenceNo = docOutcome.value;
      const inserted = docOutcome.result;

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_document', targetId: inserted.rows[0].id,
        reason: null, metadata: { documentType: 'clearance_certificate', referenceNo, recordId },
      });

      return json({
        ok: true, documentId: inserted.rows[0].id, referenceNo, verificationId,
        verifyUrl: `/verify-graduation-document/?ref=${encodeURIComponent(referenceNo)}`,
        viewUrl: `/api/portal/staff/registrar/graduation-documents?ref=${encodeURIComponent(referenceNo)}`,
        profileUrl: `/graduate-profile/?id=${encodeURIComponent(verificationId)}`,
      });
    }

    return json({
      error: 'Unknown action. Expected one of: issue_alumni_registration, issue_certificate, request_testimonial, request_character_certificate, '
        + 'list_pending_class_b, approve_class_b, reject_class_b, issue_clearance_certificate.',
    }, 400);
  } catch (err) {
    if (err instanceof SignatoryVacancyError || err instanceof SealPendingError) {
      return json({ error: err.message }, 409);
    }
    console.error('registrar graduation-documents error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
