// Academic Stage Certificate issuance — the cohort-scale generation
// engine behind the Ibtida'iyyah certificate (Certificate Generation
// Directive, 2026-08-05). Mirrors registrar/graduation-documents.js's
// session/permission/audit shape, but is built for the roster workflow
// that family deliberately doesn't cover: the Registrar uploads a
// student list, the system finds-or-creates each student record,
// assigns every student their PERMANENT Student ID
// (SHRS-STU-<YYYY>-NG-<seq6> — functions/_lib/identity-no.js), and
// issues one uniquely serialled, QR-verifiable certificate per student
// (SHRS-CERT-<PROG>-<YYYY>-<seq6>-<SUFFIX5> —
// functions/_lib/certificate-serial.js) in a single batch.
//
// Authority model, stated plainly: single-step issuance by a holder of
// the `certificates` area's 'C' permission (Registrar), the same model
// as Alumni Registration / Clearance Certificate single-step issuance —
// NOT the per-certificate two-party approval certificates.js uses for
// one-off register entries, because a stage cohort is issued as one
// administrative act on the authority of published results, and forcing
// a Principal to click approve N hundred times would be ceremony, not
// control. The batch itself, every created student, and every serial
// are audit-logged; revocation remains per-certificate.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';
import { ensureStudentIdentityNo, generateAdmissionNo } from '../../../../_lib/identity-no.js';
import {
  PROGRAMMES, generateStageCertificateSerial, generateCertificateBatchNo,
  formatHijri, isoDateOnly,
} from '../../../../_lib/certificate-serial.js';
import { renderStageCertificate, renderStageCertificateBatch } from '../../../../_lib/stage-certificate-template.js';
import {
  RC_PROGRAMMES, renderRoyalCollegeCertificate, renderRoyalCollegeCertificateBatch,
} from '../../../../_lib/royal-college-certificate.js';
import { renderHtmlToPdf, renderHtmlToPng, PdfRenderUnavailableError } from '../../../../_lib/pdf-render.js';
import { qrSvgForPrint } from '../../../../_lib/qrcode.js';

// ── Which master renders which programme ────────────────────────────────────
// The v1.0 stage template throws on a programme code it has no award wording
// for, which is correct — printing the wrong award over a correct serial is the
// failure that guard exists for. Royal College awards are rendered by their own
// master (functions/_lib/royal-college-certificate.js, v1.1); everything else
// keeps the frozen v1.0 path, byte for byte.
//
// Note what this does NOT do: it does not let the Registrar's Office ISSUE a
// Royal College batch. Issuance here is scoped to one institution throughout
// (issuingInstitutionId, hasIssueAuthority, INSTITUTION_INTERNAL_NAME below),
// and widening that is a larger change to a live route than reprinting needs.
// Royal College batches are issued by scripts/issue-royal-college-batch.mjs,
// exactly as the Ibtida'iyyah and I'dadiyyah batches were. This is the reprint
// path: a JSS row that reaches it renders correctly instead of throwing.
function renderCertificateFor(cert, args) {
  return RC_PROGRAMMES[String(cert.programme_code || '').toUpperCase()]
    ? renderRoyalCollegeCertificate(args)
    : renderStageCertificate(args);
}
function renderCertificateBatch(title, items) {
  const royal = items.filter((it) => RC_PROGRAMMES[String(it.cert.programme_code || '').toUpperCase()]);
  if (royal.length && royal.length !== items.length) {
    // A batch is one programme by construction. A mixed one means the batch
    // table and the certificate rows disagree, and printing half of it under
    // each master would hide that rather than surface it.
    throw new Error('This batch mixes Royal College and Islamic-stage certificates; '
      + 'they are rendered by different masters and cannot share one print file.');
  }
  return royal.length
    ? renderRoyalCollegeCertificateBatch(title, items)
    : renderStageCertificateBatch(title, items);
}

// The issuing school for the Ibtida'iyyah certificate family. The
// institutions table's internal name vs. the certificate's formal
// display name (Official Institutional Nomenclature Directive,
// 2026-08-05) are different registers of the same school.
const INSTITUTION_INTERNAL_NAME = 'Islamic and Arabic Studies';
const INSTITUTION_DISPLAY_NAME = 'Sultan Hanafi School of Islamic and Arabic Studies';

const MAX_ROSTER_ROWS = 500;

function siteOrigin(env) {
  return (env.SITE_ORIGIN || 'https://www.shroyalschools.com').replace(/\/$/, '');
}

function verifyUrlFor(env, serialNo) {
  return `${siteOrigin(env)}/verify-certificate/?ref=${encodeURIComponent(serialNo)}`;
}

// The QR carries a shorter form of the same destination. At the size the
// code prints — 17.2mm, fixed by the certificate's approved layout — every
// character costs scan margin: the long URL needs a 53x53 symbol, which is
// 3.83 pixels per module at 300 DPI, and one certificate in seven failed to
// decode from a clean render at that density. /v/ takes the payload from 86
// characters to 60 and the symbol to 45x45, or 4.51 px per module, without
// touching the printed layout. _redirects maps /v/* onto the verify page.
function qrUrlFor(env, serialNo) {
  return `${siteOrigin(env).replace('://www.', '://')}/v/${encodeURIComponent(serialNo)}`;
}

function normaliseSex(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['female', 'f', 'أنثى', 'انثى'].includes(v)) return 'female';
  if (['male', 'm', 'ذكر'].includes(v)) return 'male';
  return null;
}

// One roster row, as the UI submits it. Nothing is fabricated: a row
// with no usable name is rejected, not guessed at.
function cleanRow(raw) {
  return {
    fullName: String((raw && raw.fullName) || '').replace(/\s+/g, ' ').trim(),
    fullNameAr: String((raw && raw.fullNameAr) || '').replace(/\s+/g, ' ').trim(),
    sex: normaliseSex(raw && raw.sex),
    gradeEn: String((raw && raw.gradeEn) || (raw && raw.grade) || '').trim(),
    gradeAr: String((raw && raw.gradeAr) || '').trim(),
    admissionNo: String((raw && raw.admissionNo) || '').trim(),
  };
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

// View authority: accept the certificates area's V grant where the
// matrix defines one, falling back to C (the issuing permission
// necessarily implies the ability to see what was issued).
async function hasViewAuthority(sql, staffId, institutionId) {
  const v = await hasPermissionFor(sql, staffId, 'certificates', 'V', institutionId);
  if (v.granted) return true;
  const c = await hasPermissionFor(sql, staffId, 'certificates', 'C', institutionId);
  return c.granted;
}

async function issuingInstitutionId(sql) {
  const res = await sql`SELECT id FROM institutions WHERE name = ${INSTITUTION_INTERNAL_NAME}`;
  return res.rows[0] ? res.rows[0].id : null;
}

// Matches one roster row against the real student register:
//   1. admission_no, when the roster provides one (exact, authoritative)
//   2. case-insensitive exact full-name match otherwise
// An ambiguous name (two students, one name) is surfaced as an error
// naming the admission numbers, never silently guessed.
async function matchStudent(sql, row) {
  if (row.admissionNo) {
    const res = await sql`SELECT id, full_name, full_name_ar, sex, identity_no, admission_no FROM students WHERE admission_no = ${row.admissionNo}`;
    if (!res.rows[0]) return { status: 'admission_no_not_found' };
    return { status: 'matched', student: res.rows[0] };
  }
  const res = await sql`
    SELECT id, full_name, full_name_ar, sex, identity_no, admission_no FROM students
    WHERE LOWER(full_name) = LOWER(${row.fullName})`;
  if (res.rows.length === 1) return { status: 'matched', student: res.rows[0] };
  if (res.rows.length > 1) {
    return { status: 'ambiguous', candidates: res.rows.map((r) => r.admission_no) };
  }
  return { status: 'new' };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const serial = (url.searchParams.get('serial') || '').trim();
  const batchNo = (url.searchParams.get('batch') || '').trim();
  if (!serial && !batchNo) return json({ error: 'Provide ?serial= or ?batch=.' }, 400);

  try {
    const institutionId = await issuingInstitutionId(sql);
    if (!(await hasViewAuthority(sql, staffId, institutionId))) {
      return json({ error: 'Your role does not have authority to view certificates.' }, 403);
    }

    let html;
    let filename;
    if (serial) {
      const res = await sql`SELECT * FROM stage_certificates WHERE serial_no = ${serial}`;
      const cert = res.rows[0];
      if (!cert) return json({ error: 'No certificate found with that serial number.' }, 404);
      const vUrl = verifyUrlFor(env, cert.serial_no);
      html = renderCertificateFor(cert, { cert, qrSvgMarkup: qrSvgForPrint(qrUrlFor(env, cert.serial_no), { errorCorrectionLevel: 'H', margin: 4 }), verifyUrl: vUrl });
      filename = `${cert.serial_no}.pdf`;
    } else {
      const batchRes = await sql`SELECT * FROM stage_certificate_batches WHERE batch_no = ${batchNo}`;
      const batch = batchRes.rows[0];
      if (!batch) return json({ error: 'No certificate batch found with that batch number.' }, 404);
      const certsRes = await sql`
        SELECT * FROM stage_certificates
        WHERE batch_id = ${batch.id} AND revoked_at IS NULL
        ORDER BY serial_no`;
      if (!certsRes.rows.length) return json({ error: 'That batch has no active certificates.' }, 404);
      html = renderCertificateBatch(
        `${batch.batch_no} — ${certsRes.rows.length} certificates`,
        certsRes.rows.map((cert) => {
          const vUrl = verifyUrlFor(env, cert.serial_no);
          return { cert, qrSvgMarkup: qrSvgForPrint(qrUrlFor(env, cert.serial_no), { errorCorrectionLevel: 'H', margin: 4 }), verifyUrl: vUrl };
        })
      );
      filename = `${batch.batch_no}.pdf`;
    }

    if (url.searchParams.get('format') === 'pdf') {
      try {
        const pdf = await renderHtmlToPdf(env, html);
        return new Response(pdf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
          },
        });
      } catch (pdfErr) {
        if (pdfErr instanceof PdfRenderUnavailableError) {
          return json({ error: pdfErr.message }, 503);
        }
        throw pdfErr;
      }
    }
    if (url.searchParams.get('format') === 'png') {
      // The archival raster of the exact approved template — single
      // certificates only; a multi-page batch has no single-image form.
      if (!serial) return json({ error: 'PNG output is per-certificate — provide ?serial=.' }, 400);
      // Output quality profiles, honestly stated: a Chromium raster's
      // one real quality axis is render resolution (device scale).
      // PDF output is vector at every profile and needs no scale.
      const QUALITY_SCALE = { draft: 1, standard: 1.5, high: 2, press: 3, archive: 4 };
      const scale = QUALITY_SCALE[(url.searchParams.get('quality') || 'high').toLowerCase()] || 2;
      try {
        const png = await renderHtmlToPng(env, html, { scale });
        return new Response(png, {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `inline; filename="${filename.replace(/\.pdf$/, '')}.png"`,
          },
        });
      } catch (pngErr) {
        if (pngErr instanceof PdfRenderUnavailableError) {
          return json({ error: pngErr.message }, 503);
        }
        throw pngErr;
      }
    }
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (err) {
    console.error('stage-certificates view error', err);
    return json({ error: 'Could not load that certificate right now — please try again shortly.' }, 500);
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
    // ── Roster preview: validate + match, change nothing ─────────────
    if (action === 'preview_roster') {
      const programmeCode = String((body && body.programmeCode) || '').toUpperCase();
      const academicYear = String((body && body.academicYear) || '').trim();
      if (!PROGRAMMES[programmeCode]) {
        return json({ error: `Unknown programme code "${programmeCode}". Known: ${Object.keys(PROGRAMMES).join(', ')}.` }, 400);
      }
      if (!Array.isArray(body.rows) || !body.rows.length) return json({ error: 'rows is required.' }, 400);
      if (body.rows.length > MAX_ROSTER_ROWS) {
        return json({ error: `A batch is capped at ${MAX_ROSTER_ROWS} rows — split larger cohorts into multiple batches.` }, 400);
      }

      const institutionId = await issuingInstitutionId(sql);
      const grant = await hasPermissionFor(sql, staffId, 'certificates', 'C', institutionId);
      if (!grant.granted) return json({ error: 'Your role does not have authority to issue certificates.' }, 403);

      const preview = [];
      for (const raw of body.rows) {
        const row = cleanRow(raw);
        if (!row.fullName) {
          preview.push({ ...row, matchStatus: 'invalid', problem: 'Full name (English) is required.' });
          continue;
        }
        const match = await matchStudent(sql, row);
        let existingSerial = null;
        if (match.status === 'matched' && academicYear) {
          const dup = await sql`
            SELECT serial_no FROM stage_certificates
            WHERE student_id = ${match.student.id} AND programme_code = ${programmeCode}
              AND academic_year = ${academicYear} AND revoked_at IS NULL`;
          existingSerial = dup.rows[0] ? dup.rows[0].serial_no : null;
        }
        preview.push({
          ...row,
          matchStatus: match.status,
          matchedAdmissionNo: match.student ? match.student.admission_no : null,
          matchedIdentityNo: match.student ? match.student.identity_no : null,
          ambiguousCandidates: match.candidates || null,
          existingSerial,
          problem: match.status === 'ambiguous'
            ? `Multiple students share this name (${(match.candidates || []).join(', ')}) — add the admission number to disambiguate.`
            : match.status === 'admission_no_not_found'
              ? 'No student holds that admission number.'
              : existingSerial
                ? `Already holds an active ${programmeCode} certificate for ${academicYear} (${existingSerial}) — will be skipped.`
                : null,
        });
      }
      return json({ ok: true, preview });
    }

    // ── Batch generation: the real issuing act ───────────────────────
    if (action === 'generate_batch') {
      const programmeCode = String((body && body.programmeCode) || '').toUpperCase();
      const programme = PROGRAMMES[programmeCode];
      const academicYear = String((body && body.academicYear) || '').trim();
      const issuedAt = String((body && body.issuedAt) || '').trim() || new Date().toISOString().slice(0, 10);
      const placeEn = String((body && body.placeEn) || '').trim() || null;
      const placeAr = String((body && body.placeAr) || '').trim() || null;
      const description = String((body && body.description) || '').trim() || null;

      if (!programme) {
        return json({ error: `Unknown programme code "${programmeCode}". Known: ${Object.keys(PROGRAMMES).join(', ')}.` }, 400);
      }
      if (!/^\d{4}\/\d{4}$/.test(academicYear)) {
        return json({ error: 'academicYear must look like 2025/2026.' }, 400);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedAt)) {
        return json({ error: 'issuedAt must be an ISO date (YYYY-MM-DD).' }, 400);
      }
      if (!Array.isArray(body.rows) || !body.rows.length) return json({ error: 'rows is required.' }, 400);
      if (body.rows.length > MAX_ROSTER_ROWS) {
        return json({ error: `A batch is capped at ${MAX_ROSTER_ROWS} rows — split larger cohorts into multiple batches.` }, 400);
      }
      if (!env.DOCUMENT_HASH_SECRET) {
        return json({ error: 'DOCUMENT_HASH_SECRET is not configured — certificates cannot be issued without the integrity-hash secret.' }, 500);
      }

      const institutionId = await issuingInstitutionId(sql);
      const grant = await hasPermissionFor(sql, staffId, 'certificates', 'C', institutionId);
      if (!grant.granted) return json({ error: 'Your role does not have authority to issue certificates.' }, 403);

      // Hijri snapshot, computed once per batch (all certificates in a
      // batch share one issue date) — see certificate-serial.js.
      const hijriEn = formatHijri(issuedAt, 'en');
      const hijriAr = formatHijri(issuedAt, 'ar');

      const batchNo = await generateCertificateBatchNo(sql, issuedAt);
      const batchRes = await sql`
        INSERT INTO stage_certificate_batches (batch_no, programme_code, academic_year, issued_at, description, created_by_staff_id)
        VALUES (${batchNo}, ${programmeCode}, ${academicYear}, ${issuedAt}, ${description}, ${staffId})
        RETURNING id`;
      const batchId = batchRes.rows[0].id;
      const admissionYear = new Date(issuedAt).getUTCFullYear();
      const totalRows = body.rows.length;

      // Streamed as newline-delimited JSON rather than one JSON object at
      // the end (Cinematic Certificate Generation Directive, 2026-08-16):
      // the loop below already issues one student at a time, so this
      // exposes that real per-row progress instead of making the client
      // wait — and, on the frontend, fabricate a fake progress bar against
      // it. Each line is one event; the client tells a row's own outcome
      // apart from every other row's by its own 'row' event rather than
      // waiting for a bulk array at the end. The shape of the final
      // 'batch_done' event is deliberately identical to what this endpoint
      // used to return as its one-shot JSON body, so anything upstream
      // that already reads batchNo/issued/results etc. keeps working.
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
          send({ type: 'batch_start', batchNo, batchId, total: totalRows });
          const results = [];
          let issued = 0; let created = 0; let skipped = 0; let failed = 0;
          try {
            for (let index = 0; index < body.rows.length; index += 1) {
              const raw = body.rows[index];
              const row = cleanRow(raw);
              let outcome;
              if (!row.fullName) {
                failed += 1;
                outcome = { ...row, status: 'failed', problem: 'Full name (English) is required.' };
              } else {
                try {
                  const match = await matchStudent(sql, row);
                  if (match.status === 'ambiguous') {
                    failed += 1;
                    outcome = { ...row, status: 'failed', problem: `Multiple students share this name (${(match.candidates || []).join(', ')}) — add the admission number.` };
                  } else if (match.status === 'admission_no_not_found') {
                    failed += 1;
                    outcome = { ...row, status: 'failed', problem: 'No student holds that admission number.' };
                  } else {
                    let student = match.student || null;
                    if (!student) {
                      const admissionNo = await generateAdmissionNo(sql, INSTITUTION_INTERNAL_NAME, admissionYear);
                      const ins = await sql`
                        INSERT INTO students (full_name, full_name_ar, sex, admission_no, status)
                        VALUES (${row.fullName}, ${row.fullNameAr || null}, ${row.sex}, ${admissionNo}, 'active')
                        RETURNING id, full_name, full_name_ar, sex, identity_no, admission_no`;
                      student = ins.rows[0];
                      created += 1;
                    } else if ((!student.full_name_ar && row.fullNameAr) || (!student.sex && row.sex)) {
                      // Enrich blanks only — an existing verified value is
                      // never overwritten by a roster upload.
                      await sql`
                        UPDATE students SET
                          full_name_ar = COALESCE(full_name_ar, ${row.fullNameAr || null}),
                          sex = COALESCE(sex, ${row.sex})
                        WHERE id = ${student.id}`;
                      student.full_name_ar = student.full_name_ar || row.fullNameAr || null;
                      student.sex = student.sex || row.sex;
                    }

                    const identityNo = await ensureStudentIdentityNo(sql, student.id);

                    const dup = await sql`
                      SELECT serial_no FROM stage_certificates
                      WHERE student_id = ${student.id} AND programme_code = ${programmeCode}
                        AND academic_year = ${academicYear} AND revoked_at IS NULL`;
                    if (dup.rows[0]) {
                      skipped += 1;
                      outcome = { ...row, status: 'skipped', serialNo: dup.rows[0].serial_no, problem: 'Already holds an active certificate for this programme and year.' };
                    } else {
                      const { serialNo, fullHash, keyVersion } = await generateStageCertificateSerial(sql, env, {
                        programmeCode, issuedAt,
                        studentIdentityNo: identityNo,
                        studentFullName: student.full_name,
                        academicYear,
                        gradeEn: row.gradeEn,
                      });

                      await sql`
                        INSERT INTO stage_certificates
                          (serial_no, batch_id, student_id, student_identity_no, student_full_name, student_full_name_ar,
                           student_sex, programme_code, programme_label_en, programme_label_ar, institution_name,
                           academic_year, grade_en, grade_ar, place_en, place_ar,
                           issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version, issued_by_staff_id)
                        VALUES
                          (${serialNo}, ${batchId}, ${student.id}, ${identityNo}, ${student.full_name}, ${student.full_name_ar || row.fullNameAr || null},
                           ${student.sex || row.sex}, ${programmeCode}, ${programme.labelEn}, ${programme.labelAr}, ${INSTITUTION_DISPLAY_NAME},
                           ${academicYear}, ${row.gradeEn || null}, ${row.gradeAr || null}, ${placeEn}, ${placeAr},
                           ${issuedAt}, ${hijriEn}, ${hijriAr}, ${fullHash}, ${keyVersion}, ${staffId})`;

                      issued += 1;
                      const encoded = encodeURIComponent(serialNo);
                      outcome = {
                        ...row, status: 'issued', serialNo, studentIdentityNo: identityNo,
                        admissionNo: student.admission_no, newStudent: match.status === 'new',
                        viewUrl: `/api/portal/staff/registrar/stage-certificates?serial=${encoded}`,
                        // Both artefacts of the record, straight from the
                        // registered row through the official template
                        // masters — the render is deterministic from the
                        // record, so the record IS the registration of both.
                        pdfUrl: `/api/portal/staff/registrar/stage-certificates?serial=${encoded}&format=pdf`,
                        pngUrl: `/api/portal/staff/registrar/stage-certificates?serial=${encoded}&format=png`,
                        verifyUrl: verifyUrlFor(env, serialNo),
                      };
                    }
                  }
                } catch (rowErr) {
                  failed += 1;
                  outcome = { ...row, status: 'failed', problem: rowErr && rowErr.message ? rowErr.message : 'unknown error' };
                }
              }
              results.push(outcome);
              send({ type: 'row', index, total: totalRows, ...outcome });
            }

            await logStaffEvent(sql, {
              actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'stage_certificate_batch', targetId: batchId,
              reason: description, metadata: { batchNo, programmeCode, academicYear, issuedAt, issued, created, skipped, failed },
            });

            send({
              type: 'batch_done', ok: true, batchNo, batchId, issued, studentsCreated: created, skipped, failed, results,
              batchPrintUrl: `/api/portal/staff/registrar/stage-certificates?batch=${encodeURIComponent(batchNo)}`,
            });
          } catch (streamErr) {
            // The outer try/catch below this action block cannot help once
            // headers have gone out for a streaming response — the error
            // has to travel as one more line of the stream itself, not a
            // change of HTTP status this far in.
            console.error('registrar stage-certificates generate_batch stream error', streamErr);
            send({ type: 'error', error: 'Could not complete the batch: ' + (streamErr && streamErr.message ? streamErr.message : 'unknown error') });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' },
      });
    }

    // ── Register listing ─────────────────────────────────────────────
    if (action === 'list_register') {
      const institutionId = await issuingInstitutionId(sql);
      if (!(await hasViewAuthority(sql, staffId, institutionId))) {
        return json({ error: 'Your role does not have authority to view the certificate register.' }, 403);
      }
      const search = String((body && body.search) || '').trim();
      const batchId = Number.isInteger(body && body.batchId) ? body.batchId : null;
      const like = `%${search}%`;
      const rows = batchId
        ? (await sql`
            SELECT sc.*, b.batch_no FROM stage_certificates sc
            LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
            WHERE sc.batch_id = ${batchId}
            ORDER BY sc.serial_no LIMIT 500`).rows
        : search
          ? (await sql`
              SELECT sc.*, b.batch_no FROM stage_certificates sc
              LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
              WHERE sc.serial_no ILIKE ${like} OR sc.student_full_name ILIKE ${like}
                 OR sc.student_identity_no ILIKE ${like}
              ORDER BY sc.created_at DESC LIMIT 200`).rows
          : (await sql`
              SELECT sc.*, b.batch_no FROM stage_certificates sc
              LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
              ORDER BY sc.created_at DESC LIMIT 200`).rows;
      return json({
        ok: true,
        certificates: rows.map((r) => ({
          serialNo: r.serial_no, batchNo: r.batch_no, studentFullName: r.student_full_name,
          studentFullNameAr: r.student_full_name_ar, studentIdentityNo: r.student_identity_no,
          programmeCode: r.programme_code, academicYear: r.academic_year, gradeEn: r.grade_en,
          issuedAt: isoDateOnly(r.issued_at), status: r.revoked_at ? 'revoked' : 'active',
          revokedAt: r.revoked_at, revocationNote: r.revoked_at ? r.revocation_note : null,
        })),
      });
    }

    if (action === 'list_batches') {
      const institutionId = await issuingInstitutionId(sql);
      if (!(await hasViewAuthority(sql, staffId, institutionId))) {
        return json({ error: 'Your role does not have authority to view certificate batches.' }, 403);
      }
      const rows = (await sql`
        SELECT b.*, COUNT(sc.id)::int AS certificate_count,
               COUNT(sc.id) FILTER (WHERE sc.revoked_at IS NULL)::int AS active_count
        FROM stage_certificate_batches b
        LEFT JOIN stage_certificates sc ON sc.batch_id = b.id
        GROUP BY b.id ORDER BY b.created_at DESC LIMIT 100`).rows;
      return json({
        ok: true,
        batches: rows.map((b) => ({
          id: b.id, batchNo: b.batch_no, programmeCode: b.programme_code, academicYear: b.academic_year,
          issuedAt: isoDateOnly(b.issued_at), description: b.description,
          certificateCount: b.certificate_count, activeCount: b.active_count,
          printUrl: `/api/portal/staff/registrar/stage-certificates?batch=${encodeURIComponent(b.batch_no)}`,
        })),
      });
    }

    // ── Revocation (per-certificate, never per-batch) ────────────────
    if (action === 'revoke') {
      const institutionId = await issuingInstitutionId(sql);
      const grant = await hasPermissionFor(sql, staffId, 'certificates', 'C', institutionId);
      if (!grant.granted) return json({ error: 'Your role does not have authority to revoke certificates.' }, 403);
      const serialNo = String((body && body.serialNo) || '').trim();
      const revocationNote = String((body && body.revocationNote) || '').trim();
      if (!serialNo || !revocationNote) {
        return json({ error: 'serialNo and revocationNote are both required to revoke a certificate.' }, 400);
      }
      const updated = await sql`
        UPDATE stage_certificates SET revoked_at = now(), revocation_note = ${revocationNote}
        WHERE serial_no = ${serialNo} AND revoked_at IS NULL
        RETURNING id`;
      if (!updated.rows.length) {
        return json({ error: 'No active certificate found with that serial number.' }, 404);
      }
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'stage_certificate', targetId: updated.rows[0].id,
        reason: revocationNote, metadata: { serialNo, revoked: true },
      });
      return json({ ok: true, certificateId: updated.rows[0].id });
    }

    return json({ error: 'Unknown action. Expected one of: preview_roster, generate_batch, list_register, list_batches, revoke.' }, 400);
  } catch (err) {
    console.error('registrar stage-certificates error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
