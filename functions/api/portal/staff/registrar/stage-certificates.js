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
import { logStaffEvent, requestAuditContext } from '../../../../_lib/audit.js';
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
// What this does and does not let the Registrar's Office ISSUE (as opposed to
// just reprint, which every programme code below supports either way): NUR
// and PRY — Nursery and Primary's own Royal-College-family awards — issue
// through this route's roster workflow now, exactly like the Islamic stages
// (see the note on INSTITUTIONS_BY_PROGRAMME below for why those two and not
// the others). JSS, SS and QUR remain reprint-only here — they belong to a
// different school with its own Principal approval chain, and are issued by
// scripts/issue-royal-college-batch.mjs, exactly as before. A JSS/SS/QUR row
// that reaches this GET path renders correctly instead of throwing either way.
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

// Two issuing schools now sit behind this one route. The institutions
// table's internal name vs. the certificate's formal display name
// (Official Institutional Nomenclature Directive, 2026-08-05) are
// different registers of the same school, for each of them.
//
// Nursery and Primary was added alongside NUR/PRY joining RC_PROGRAMMES
// (functions/_lib/royal-college-certificate.js). It is issued through
// THIS roster workflow — unlike JSS/SS/QUR, which stay on the
// scripts/issue-royal-college-batch.mjs path described below — because
// it is the Registrar's Office's own day-to-day authority the same way
// the Islamic stages are: schema.sql's own Registrar's Office entry
// describes certificate authority "across all four institutions", and
// Nursery and Primary is one of the four. JSS/SS/QUR belong to a
// different school with its own Principal approval chain, which is a
// materially different authority question this change does not decide.
const INSTITUTIONS_BY_PROGRAMME = {
  TMH: { internalName: 'Islamic and Arabic Studies', displayName: 'Sultan Hanafi School of Islamic and Arabic Studies' },
  IBT: { internalName: 'Islamic and Arabic Studies', displayName: 'Sultan Hanafi School of Islamic and Arabic Studies' },
  IDD: { internalName: 'Islamic and Arabic Studies', displayName: 'Sultan Hanafi School of Islamic and Arabic Studies' },
  THN: { internalName: 'Islamic and Arabic Studies', displayName: 'Sultan Hanafi School of Islamic and Arabic Studies' },
  NUR: { internalName: 'Nursery and Primary', displayName: 'Sultan Hanafi Nursery and Primary School' },
  PRY: { internalName: 'Nursery and Primary', displayName: 'Sultan Hanafi Nursery and Primary School' },
};
// The Royal College codes this route (not the script) is authorised to
// issue. RC_PROGRAMMES also holds JSS, SS and QUR — deliberately absent
// here; see the comment above.
const PORTAL_ROYAL_COLLEGE_CODES = ['NUR', 'PRY'];

// Looks up a programme's wording from whichever registry defines it —
// the Islamic-stage PROGRAMMES, or the two Royal College codes this
// route is authorised to issue — or null if this route does not know it
// (which covers JSS/SS/QUR, on purpose).
function issuableProgramme(programmeCode) {
  if (PROGRAMMES[programmeCode]) return PROGRAMMES[programmeCode];
  if (PORTAL_ROYAL_COLLEGE_CODES.includes(programmeCode)) return RC_PROGRAMMES[programmeCode];
  return null;
}
const ISSUABLE_PROGRAMME_CODES = [...Object.keys(PROGRAMMES), ...PORTAL_ROYAL_COLLEGE_CODES];

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

async function issuingInstitutionId(sql, programmeCode) {
  const internalName = INSTITUTIONS_BY_PROGRAMME[programmeCode]?.internalName;
  if (!internalName) return null;
  const res = await sql`SELECT id FROM institutions WHERE name = ${internalName}`;
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
    // Not scoped to one institution: a serial or batch number can name a
    // certificate from either issuing school this route now serves, and the
    // Registrar's Office authority over 'certificates' is not institution-
    // scoped in the first place (permission-matrix.js: no "own institution"
    // qualifier on its 'V'/'C' grant) — see the fuller note on
    // INSTITUTIONS_BY_PROGRAMME above.
    if (!(await hasViewAuthority(sql, staffId, null))) {
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
      if (!issuableProgramme(programmeCode)) {
        return json({ error: `Unknown programme code "${programmeCode}". Known: ${ISSUABLE_PROGRAMME_CODES.join(', ')}.` }, 400);
      }
      if (!Array.isArray(body.rows) || !body.rows.length) return json({ error: 'rows is required.' }, 400);
      if (body.rows.length > MAX_ROSTER_ROWS) {
        return json({ error: `A batch is capped at ${MAX_ROSTER_ROWS} rows — split larger cohorts into multiple batches.` }, 400);
      }

      const institutionId = await issuingInstitutionId(sql, programmeCode);
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
      const programme = issuableProgramme(programmeCode);
      const academicYear = String((body && body.academicYear) || '').trim();
      const issuedAt = String((body && body.issuedAt) || '').trim() || new Date().toISOString().slice(0, 10);
      const placeEn = String((body && body.placeEn) || '').trim() || null;
      const placeAr = String((body && body.placeAr) || '').trim() || null;
      const description = String((body && body.description) || '').trim() || null;

      if (!programme) {
        return json({ error: `Unknown programme code "${programmeCode}". Known: ${ISSUABLE_PROGRAMME_CODES.join(', ')}.` }, 400);
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

      const institutionId = await issuingInstitutionId(sql, programmeCode);
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
                      const admissionNo = await generateAdmissionNo(sql, INSTITUTIONS_BY_PROGRAMME[programmeCode].internalName, admissionYear);
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
                           ${student.sex || row.sex}, ${programmeCode}, ${programme.labelEn}, ${programme.labelAr || null}, ${INSTITUTIONS_BY_PROGRAMME[programmeCode].displayName},
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
      // Cross-institution by construction — the query below has no
      // institution filter, and neither does the Registrar's authority
      // over it (see the note on INSTITUTIONS_BY_PROGRAMME above).
      if (!(await hasViewAuthority(sql, staffId, null))) {
        return json({ error: 'Your role does not have authority to view the certificate register.' }, 403);
      }
      const search = String((body && body.search) || '').trim();
      const batchId = Number.isInteger(body && body.batchId) ? body.batchId : null;
      const like = `%${search}%`;
      // The successor join names the certificate that replaced each
      // revoked serial. A database that has not yet applied the reissue
      // schema upgrade lacks the column — the register must still
      // answer, so the query falls back to the pre-reissue shape
      // instead of turning the whole listing into a 500.
      const listQuery = (withSuccessor) => {
        const succSelect = withSuccessor ? 'succ.serial_no AS superseded_by_serial_no' : 'NULL AS superseded_by_serial_no';
        const succJoin = withSuccessor ? 'LEFT JOIN stage_certificates succ ON succ.replaces_serial_no = sc.serial_no' : '';
        if (batchId) {
          return sql(`
            SELECT sc.*, b.batch_no, ${succSelect} FROM stage_certificates sc
            LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
            ${succJoin}
            WHERE sc.batch_id = $1
            ORDER BY sc.serial_no LIMIT 500`, [batchId]);
        }
        if (search) {
          return sql(`
            SELECT sc.*, b.batch_no, ${succSelect} FROM stage_certificates sc
            LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
            ${succJoin}
            WHERE sc.serial_no ILIKE $1 OR sc.student_full_name ILIKE $1
               OR sc.student_identity_no ILIKE $1
            ORDER BY sc.created_at DESC LIMIT 200`, [like]);
        }
        return sql(`
          SELECT sc.*, b.batch_no, ${succSelect} FROM stage_certificates sc
          LEFT JOIN stage_certificate_batches b ON b.id = sc.batch_id
          ${succJoin}
          ORDER BY sc.created_at DESC LIMIT 200`);
      };
      let rows;
      try {
        rows = (await listQuery(true)).rows;
      } catch (colErr) {
        if (!/replaces_serial_no/.test((colErr && colErr.message) || '')) throw colErr;
        rows = (await listQuery(false)).rows;
      }
      return json({
        ok: true,
        certificates: rows.map((r) => ({
          serialNo: r.serial_no, batchNo: r.batch_no, studentFullName: r.student_full_name,
          studentFullNameAr: r.student_full_name_ar, studentIdentityNo: r.student_identity_no,
          studentSex: r.student_sex || null,
          programmeCode: r.programme_code, academicYear: r.academic_year, gradeEn: r.grade_en,
          issuedAt: isoDateOnly(r.issued_at), status: r.revoked_at ? 'revoked' : 'active',
          revokedAt: r.revoked_at, revocationNote: r.revoked_at ? r.revocation_note : null,
          replacesSerialNo: r.replaces_serial_no || null,
          supersededBySerialNo: r.superseded_by_serial_no || null,
        })),
      });
    }

    if (action === 'list_batches') {
      if (!(await hasViewAuthority(sql, staffId, null))) {
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
      // Revocation is by serial number, not by programme — the same
      // cross-institution authority as list_register/list_batches above.
      const grant = await hasPermissionFor(sql, staffId, 'certificates', 'C', null);
      if (!grant.granted) return json({ error: 'Your role does not have authority to revoke certificates.' }, 403);
      const serialNo = String((body && body.serialNo) || '').trim();
      const revocationNote = String((body && body.revocationNote) || '').trim();
      if (!serialNo || !revocationNote) {
        return json({ error: 'serialNo and revocationNote are both required to revoke a certificate.' }, 400);
      }
      // The revoking officer is recorded on the row itself, not only in
      // the audit log — with a fallback for a database that has not yet
      // applied the reissue schema upgrade.
      let updated;
      try {
        updated = await sql`
          UPDATE stage_certificates
          SET revoked_at = now(), revocation_note = ${revocationNote}, revoked_by_staff_id = ${staffId}
          WHERE serial_no = ${serialNo} AND revoked_at IS NULL
          RETURNING id`;
      } catch (colErr) {
        if (!/revoked_by_staff_id/.test((colErr && colErr.message) || '')) throw colErr;
        updated = await sql`
          UPDATE stage_certificates SET revoked_at = now(), revocation_note = ${revocationNote}
          WHERE serial_no = ${serialNo} AND revoked_at IS NULL
          RETURNING id`;
      }
      if (!updated.rows.length) {
        return json({ error: 'No active certificate found with that serial number.' }, 404);
      }
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'stage_certificate', targetId: updated.rows[0].id,
        reason: revocationNote, metadata: { serialNo, revoked: true },
        ...requestAuditContext(request),
      });
      return json({ ok: true, certificateId: updated.rows[0].id });
    }

    // ── Reissue (revoke + replace as ONE administrative act) ─────────
    // The schema's own doctrine: a certificate row is a snapshot, and
    // corrections are revoke + reissue with the full audit trail. The
    // new certificate carries replaces_serial_no; the old serial is
    // revoked naming its successor; the public verifier reports both
    // sides honestly. Only stage programmes reissue here — a Royal
    // College certificate is issued by its own batch pipeline
    // (scripts/issue-royal-college-batch.mjs) and must be reissued
    // there, under the same controls that issued it.
    if (action === 'reissue') {
      const institutionId = await issuingInstitutionId(sql);
      const grant = await hasPermissionFor(sql, staffId, 'certificates', 'C', institutionId);
      if (!grant.granted) return json({ error: 'Your role does not have authority to reissue certificates.' }, 403);
      const serialNo = String((body && body.serialNo) || '').trim();
      const reason = String((body && body.reason) || '').trim();
      if (!serialNo || !reason) {
        return json({ error: 'serialNo and reason are both required to reissue a certificate.' }, 400);
      }
      // Same deterministic pre-check as generate_batch: without the
      // integrity-hash secret no serial can be minted, and failing HERE
      // means failing before anything has been touched.
      if (!env.DOCUMENT_HASH_SECRET) {
        return json({ error: 'DOCUMENT_HASH_SECRET is not configured — certificates cannot be reissued without the integrity-hash secret.' }, 500);
      }
      const corrections = (body && typeof body.corrections === 'object' && body.corrections) || {};
      const corrFullName = corrections.fullName != null ? String(corrections.fullName).trim() : null;
      const corrFullNameAr = corrections.fullNameAr != null ? String(corrections.fullNameAr).trim() : null;
      const corrSex = corrections.sex != null ? String(corrections.sex).trim().toLowerCase() : null;
      if (corrFullName === '') return json({ error: 'A corrected full name cannot be empty.' }, 400);
      if (corrSex && corrSex !== 'male' && corrSex !== 'female') {
        return json({ error: "A corrected sex must be 'male' or 'female'." }, 400);
      }

      const oldRes = await sql`
        SELECT * FROM stage_certificates WHERE serial_no = ${serialNo}`;
      const old = oldRes.rows[0];
      if (!old) return json({ error: 'No certificate found with that serial number.' }, 404);
      if (!PROGRAMMES[old.programme_code]) {
        return json({ error: `${old.programme_code} certificates are issued by the Royal College batch pipeline and must be reissued there — this route reissues stage certificates only.` }, 400);
      }
      if (!old.student_id) {
        return json({ error: 'The student record behind this certificate no longer exists — a reissue must snapshot a real student record.' }, 409);
      }
      let successor;
      try {
        successor = await sql`
          SELECT serial_no FROM stage_certificates WHERE replaces_serial_no = ${serialNo} LIMIT 1`;
      } catch (colErr) {
        if (!/replaces_serial_no/.test((colErr && colErr.message) || '')) throw colErr;
        return json({ error: 'The reissue schema upgrade has not been applied to this database yet — run Portal Setup once (/portal/admin/setup/), then retry.' }, 503);
      }
      if (successor.rows[0]) {
        return json({ error: `This certificate was already reissued as ${successor.rows[0].serial_no}.` }, 409);
      }

      // Corrections land on the STUDENT RECORD first — the register is
      // the source of truth and the new certificate snapshots it.
      const studentRes = await sql`
        SELECT id, full_name, full_name_ar, sex, identity_no FROM students WHERE id = ${old.student_id}`;
      const student = studentRes.rows[0];
      if (!student) {
        return json({ error: 'The student record behind this certificate no longer exists — a reissue must snapshot a real student record.' }, 409);
      }
      const before = { fullName: student.full_name, fullNameAr: student.full_name_ar, sex: student.sex };
      // A field counts as a CORRECTION only when the registrar actually
      // edited it away from what the form prefilled — the OLD
      // CERTIFICATE's snapshot. A field left as prefilled means "no
      // opinion", and the current student record (which may be newer
      // than the snapshot) stands. This is what stops an untouched
      // form from silently reverting or erasing later student updates.
      const editedName = corrFullName !== null && corrFullName !== old.student_full_name;
      const editedNameAr = corrFullNameAr !== null && corrFullNameAr !== (old.student_full_name_ar || '');
      const editedSex = corrSex !== null && corrSex !== '' && corrSex !== (old.student_sex || '');
      const nextFullName = editedName ? corrFullName : student.full_name;
      const nextFullNameAr = editedNameAr ? (corrFullNameAr || null) : student.full_name_ar;
      const nextSex = editedSex ? corrSex : student.sex;
      const studentChanged = nextFullName !== student.full_name
        || (nextFullNameAr || null) !== (student.full_name_ar || null)
        || (nextSex || null) !== (student.sex || null);
      const identityNo = old.student_identity_no || await ensureStudentIdentityNo(sql, student.id);

      // One student, one programme, one year, one ACTIVE certificate —
      // the same guard issuance enforces.
      const dup = await sql`
        SELECT serial_no FROM stage_certificates
        WHERE student_id = ${student.id} AND programme_code = ${old.programme_code}
          AND academic_year = ${old.academic_year} AND revoked_at IS NULL
          AND serial_no <> ${serialNo}`;
      if (dup.rows[0]) {
        return json({ error: `This student already holds another active ${old.programme_code} certificate for ${old.academic_year} (${dup.rows[0].serial_no}).` }, 409);
      }

      const issuedAtIso = isoDateOnly(old.issued_at);
      const { serialNo: newSerialNo, fullHash, keyVersion } = await generateStageCertificateSerial(sql, env, {
        programmeCode: old.programme_code,
        issuedAt: issuedAtIso,
        studentIdentityNo: identityNo,
        studentFullName: nextFullName,
        academicYear: old.academic_year,
        gradeEn: old.grade_en,
      });

      // EVERY mutation commits or fails together — the student
      // correction, the replacement's registration, and the old
      // serial's retirement are one transaction. No half-applied
      // correction, never both serials active, never a revoked serial
      // whose replacement vanished. The UNIQUE index on
      // replaces_serial_no makes a concurrent double-reissue fail
      // loudly here instead of minting two replacements. (Residual,
      // accepted: a plain revoke landing in the instant between the
      // guards above and this commit leaves the replacement active
      // over an independently-revoked original — coherent, auditable,
      // and visible in the register.)
      const supersedeNote = `Superseded by reissue ${newSerialNo} — ${reason}`;
      const mutations = [];
      if (studentChanged) {
        mutations.push(sql`
          UPDATE students SET full_name = ${nextFullName}, full_name_ar = ${nextFullNameAr}, sex = ${nextSex}
          WHERE id = ${student.id}`);
      }
      const insertAt = mutations.length;
      mutations.push(sql`
        INSERT INTO stage_certificates
          (serial_no, batch_id, student_id, student_identity_no, student_full_name, student_full_name_ar,
           student_sex, programme_code, programme_label_en, programme_label_ar, institution_name,
           academic_year, grade_en, grade_ar, place_en, place_ar,
           issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version,
           issued_by_staff_id, replaces_serial_no)
        VALUES
          (${newSerialNo}, ${old.batch_id}, ${student.id}, ${identityNo}, ${nextFullName}, ${nextFullNameAr},
           ${nextSex}, ${old.programme_code}, ${old.programme_label_en}, ${old.programme_label_ar}, ${old.institution_name},
           ${old.academic_year}, ${old.grade_en}, ${old.grade_ar}, ${old.place_en}, ${old.place_ar},
           ${issuedAtIso}, ${old.issued_at_hijri}, ${old.issued_at_hijri_ar}, ${fullHash}, ${keyVersion},
           ${staffId}, ${serialNo})
        RETURNING id`);
      if (!old.revoked_at) {
        mutations.push(sql`
          UPDATE stage_certificates
          SET revoked_at = now(), revocation_note = ${supersedeNote}, revoked_by_staff_id = ${staffId}
          WHERE serial_no = ${serialNo} AND revoked_at IS NULL`);
      }
      let txResults;
      try {
        txResults = await sql.transaction(mutations);
      } catch (txErr) {
        const msg = (txErr && txErr.message) || '';
        if (/idx_stage_certificates_replaces|duplicate key/.test(msg)) {
          return json({ error: 'This certificate was reissued by another session a moment ago — refresh the register to see its replacement.' }, 409);
        }
        throw txErr;
      }
      const newId = txResults[insertAt].rows[0].id;

      if (studentChanged) {
        await logStaffEvent(sql, {
          actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'student', targetId: student.id,
          reason: `Correction applied during certificate reissue of ${serialNo}: ${reason}`,
          previousValue: before,
          newValue: { fullName: nextFullName, fullNameAr: nextFullNameAr, sex: nextSex },
          ...requestAuditContext(request),
        });
      }
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'stage_certificate', targetId: newId,
        reason,
        metadata: {
          reissued: true, serialNo: newSerialNo, replacesSerialNo: serialNo,
          correctionsApplied: studentChanged,
        },
        ...requestAuditContext(request),
      });

      const encoded = encodeURIComponent(newSerialNo);
      return json({
        ok: true,
        serialNo: newSerialNo,
        replacesSerialNo: serialNo,
        studentFullName: nextFullName,
        studentIdentityNo: identityNo,
        viewUrl: `/api/portal/staff/registrar/stage-certificates?serial=${encoded}`,
        pdfUrl: `/api/portal/staff/registrar/stage-certificates?serial=${encoded}&format=pdf`,
        pngUrl: `/api/portal/staff/registrar/stage-certificates?serial=${encoded}&format=png`,
        verifyUrl: verifyUrlFor(env, newSerialNo),
      });
    }

    return json({ error: 'Unknown action. Expected one of: preview_roster, generate_batch, list_register, list_batches, revoke, reissue.' }, 400);
  } catch (err) {
    console.error('registrar stage-certificates error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
