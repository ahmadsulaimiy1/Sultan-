// Graduation Information Form — guardian-facing (docs/shrs-graduation-
// documentation-system-architecture.md, Stage 1). Session-authenticated,
// scoped to the signed-in guardian's own children only — a guardian can
// never read or write another family's graduation record, the same
// ownership discipline as admissions-applications.js.
//
// GET  — list the guardian's children, each with its graduation record
//        for the given session (or a fresh, unsaved draft shape if none
//        exists yet), so the frontend always has something to render a
//        form from without a separate "create" round-trip.
// POST — action 'save' (draft, editable any number of times while
//        status is 'draft' or the record has an open correction_note)
//        or 'submit' (locks the guardian's own editing — status moves
//        to 'submitted' and only Registry can change it from there).
//
// Photo/document upload is explicitly NOT built here — no file storage
// backend exists anywhere in this project yet (see the architecture
// doc, Section 7, Stage 5). Naming that plainly rather than shipping an
// upload control that goes nowhere.
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';

const DEFAULT_SESSION = '2025/2026';

const EDITABLE_FIELDS = [
  'fullLegalName', 'preferredCertificateName', 'gender', 'dateOfBirth', 'nationality',
  'stateOfOrigin', 'lgaOfOrigin', 'residentialAddress', 'contactEmail', 'contactPhone',
  'arabicName', 'quranMemorisationLevel', 'ijazahStatus', 'islamiyyahLevel', 'arabicProficiency',
  'preferredIslamicTitle', 'academicAwards', 'conductAwards', 'quranAwards', 'leadershipAwards',
  'sportsAwards', 'otherHonours', 'alumniWhatsapp', 'alumniLinkedin', 'alumniOccupation',
  'alumniUniversityApplyingTo', 'alumniCareerInterests', 'nameSpellingConfirmed',
];

const FIELD_COLUMN = {
  fullLegalName: 'full_legal_name', preferredCertificateName: 'preferred_certificate_name', gender: 'gender',
  dateOfBirth: 'date_of_birth', nationality: 'nationality', stateOfOrigin: 'state_of_origin', lgaOfOrigin: 'lga_of_origin',
  residentialAddress: 'residential_address', contactEmail: 'contact_email', contactPhone: 'contact_phone',
  arabicName: 'arabic_name', quranMemorisationLevel: 'quran_memorisation_level', ijazahStatus: 'ijazah_status',
  islamiyyahLevel: 'islamiyyah_level', arabicProficiency: 'arabic_proficiency', preferredIslamicTitle: 'preferred_islamic_title',
  academicAwards: 'academic_awards', conductAwards: 'conduct_awards', quranAwards: 'quran_awards',
  leadershipAwards: 'leadership_awards', sportsAwards: 'sports_awards', otherHonours: 'other_honours',
  alumniWhatsapp: 'alumni_whatsapp', alumniLinkedin: 'alumni_linkedin', alumniOccupation: 'alumni_occupation',
  alumniUniversityApplyingTo: 'alumni_university_applying_to', alumniCareerInterests: 'alumni_career_interests',
  nameSpellingConfirmed: 'name_spelling_confirmed',
};

function toRecord(r) {
  if (!r) return null;
  const out = { id: r.id, status: r.status, correctionNote: r.correction_note, submittedAt: r.submitted_at, updatedAt: r.updated_at };
  for (const field of EDITABLE_FIELDS) out[field] = r[FIELD_COLUMN[field]];
  return out;
}

async function requireGuardianSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { guardianId: session.guardianId };
}

export async function onRequestGet({ request, env }) {
  const { guardianId, error } = await requireGuardianSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const graduationSession = url.searchParams.get('session') || DEFAULT_SESSION;

  try {
    const res = await sql`
      SELECT s.id AS student_id, s.full_name, s.admission_no, c.name AS class_name, c.institution AS institution_name,
             gr.*
      FROM students s
      JOIN guardian_student gs ON gs.student_id = s.id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN graduation_records gr ON gr.student_id = s.id AND gr.graduation_session = ${graduationSession}
      WHERE gs.guardian_id = ${guardianId}
      ORDER BY s.full_name`;

    const children = res.rows.map((r) => ({
      studentId: r.student_id,
      fullName: r.full_name,
      admissionNo: r.admission_no,
      className: r.class_name,
      institutionName: r.institution_name,
      graduationSession,
      record: toRecord(r.id ? r : null),
    }));
    return json({ ok: true, session: graduationSession, children });
  } catch (err) {
    console.error('graduation-records list error', err);
    return json({ error: 'Could not load your graduation information right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { guardianId, error } = await requireGuardianSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const action = body && body.action;
  const studentId = Number(body && body.studentId);
  const graduationSession = (body && body.graduationSession) || DEFAULT_SESSION;
  if (!Number.isInteger(studentId) || (action !== 'save' && action !== 'submit')) {
    return json({ error: "A valid studentId and action ('save' or 'submit') are required." }, 400);
  }

  try {
    const ownershipRes = await sql`
      SELECT 1 FROM guardian_student WHERE guardian_id = ${guardianId} AND student_id = ${studentId}`;
    if (!ownershipRes.rows.length) {
      return json({ error: 'You do not have a graduation record to manage for that student.' }, 403);
    }

    const existingRes = await sql`
      SELECT id, status FROM graduation_records WHERE student_id = ${studentId} AND graduation_session = ${graduationSession}`;
    const existing = existingRes.rows[0];
    if (existing && !['draft', 'submitted'].includes(existing.status) && !(existing.status === 'under_review' && existing.correction_note)) {
      // Locked, verified, or under_review-without-a-correction-request records
      // are not guardian-editable — Registry owns them from here.
      return json({ error: `This graduation record is at "${existing.status}" and can no longer be edited from the portal. Contact the Registry for corrections.` }, 409);
    }

    if (action === 'submit' && !(body.nameSpellingConfirmed === true)) {
      return json({ error: 'Please confirm the name spelling is correct before submitting.' }, 400);
    }

    const values = {};
    for (const field of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) values[FIELD_COLUMN[field]] = body[field];
    }
    const newStatus = action === 'submit' ? 'submitted' : 'draft';

    let row;
    if (existing) {
      // Column-by-column COALESCE rather than string-concatenated SQL —
      // every value stays a bound parameter, and an omitted field in the
      // request body simply keeps the row's existing value.
      const updateRes = await sql`
        UPDATE graduation_records SET
          full_legal_name = COALESCE(${values.full_legal_name ?? null}, full_legal_name),
          preferred_certificate_name = COALESCE(${values.preferred_certificate_name ?? null}, preferred_certificate_name),
          gender = COALESCE(${values.gender ?? null}, gender),
          date_of_birth = COALESCE(${values.date_of_birth ?? null}, date_of_birth),
          nationality = COALESCE(${values.nationality ?? null}, nationality),
          state_of_origin = COALESCE(${values.state_of_origin ?? null}, state_of_origin),
          lga_of_origin = COALESCE(${values.lga_of_origin ?? null}, lga_of_origin),
          residential_address = COALESCE(${values.residential_address ?? null}, residential_address),
          contact_email = COALESCE(${values.contact_email ?? null}, contact_email),
          contact_phone = COALESCE(${values.contact_phone ?? null}, contact_phone),
          arabic_name = COALESCE(${values.arabic_name ?? null}, arabic_name),
          quran_memorisation_level = COALESCE(${values.quran_memorisation_level ?? null}, quran_memorisation_level),
          ijazah_status = COALESCE(${values.ijazah_status ?? null}, ijazah_status),
          islamiyyah_level = COALESCE(${values.islamiyyah_level ?? null}, islamiyyah_level),
          arabic_proficiency = COALESCE(${values.arabic_proficiency ?? null}, arabic_proficiency),
          preferred_islamic_title = COALESCE(${values.preferred_islamic_title ?? null}, preferred_islamic_title),
          academic_awards = COALESCE(${values.academic_awards ?? null}, academic_awards),
          conduct_awards = COALESCE(${values.conduct_awards ?? null}, conduct_awards),
          quran_awards = COALESCE(${values.quran_awards ?? null}, quran_awards),
          leadership_awards = COALESCE(${values.leadership_awards ?? null}, leadership_awards),
          sports_awards = COALESCE(${values.sports_awards ?? null}, sports_awards),
          other_honours = COALESCE(${values.other_honours ?? null}, other_honours),
          alumni_whatsapp = COALESCE(${values.alumni_whatsapp ?? null}, alumni_whatsapp),
          alumni_linkedin = COALESCE(${values.alumni_linkedin ?? null}, alumni_linkedin),
          alumni_occupation = COALESCE(${values.alumni_occupation ?? null}, alumni_occupation),
          alumni_university_applying_to = COALESCE(${values.alumni_university_applying_to ?? null}, alumni_university_applying_to),
          alumni_career_interests = COALESCE(${values.alumni_career_interests ?? null}, alumni_career_interests),
          name_spelling_confirmed = COALESCE(${values.name_spelling_confirmed ?? null}, name_spelling_confirmed),
          status = ${newStatus},
          correction_note = CASE WHEN ${newStatus} = 'submitted' THEN NULL ELSE correction_note END,
          submitted_at = CASE WHEN ${newStatus} = 'submitted' THEN now() ELSE submitted_at END,
          updated_at = now()
        WHERE id = ${existing.id}
        RETURNING id, status, submitted_at`;
      row = updateRes.rows[0];
    } else {
      const submittedAtParam = newStatus === 'submitted' ? new Date().toISOString() : null;
      const insertRes = await sql`
        INSERT INTO graduation_records (
          student_id, graduation_session, submitted_by_guardian_id,
          full_legal_name, preferred_certificate_name, gender, date_of_birth, nationality, state_of_origin, lga_of_origin,
          residential_address, contact_email, contact_phone, arabic_name, quran_memorisation_level, ijazah_status,
          islamiyyah_level, arabic_proficiency, preferred_islamic_title, academic_awards, conduct_awards, quran_awards,
          leadership_awards, sports_awards, other_honours, alumni_whatsapp, alumni_linkedin, alumni_occupation,
          alumni_university_applying_to, alumni_career_interests, name_spelling_confirmed, status, submitted_at
        ) VALUES (
          ${studentId}, ${graduationSession}, ${guardianId},
          ${values.full_legal_name ?? null}, ${values.preferred_certificate_name ?? null}, ${values.gender ?? null},
          ${values.date_of_birth ?? null}, ${values.nationality ?? null}, ${values.state_of_origin ?? null}, ${values.lga_of_origin ?? null},
          ${values.residential_address ?? null}, ${values.contact_email ?? null}, ${values.contact_phone ?? null},
          ${values.arabic_name ?? null}, ${values.quran_memorisation_level ?? null}, ${values.ijazah_status ?? null},
          ${values.islamiyyah_level ?? null}, ${values.arabic_proficiency ?? null}, ${values.preferred_islamic_title ?? null},
          ${values.academic_awards ?? null}, ${values.conduct_awards ?? null}, ${values.quran_awards ?? null},
          ${values.leadership_awards ?? null}, ${values.sports_awards ?? null}, ${values.other_honours ?? null},
          ${values.alumni_whatsapp ?? null}, ${values.alumni_linkedin ?? null}, ${values.alumni_occupation ?? null},
          ${values.alumni_university_applying_to ?? null}, ${values.alumni_career_interests ?? null},
          ${values.name_spelling_confirmed ?? false}, ${newStatus}, ${submittedAtParam}
        )
        RETURNING id, status, submitted_at`;
      row = insertRes.rows[0];
    }

    return json({ ok: true, recordId: row.id, status: row.status, submittedAt: row.submitted_at });
  } catch (err) {
    console.error('graduation-records save error', err);
    return json({ error: 'Could not save your graduation information right now — please try again shortly.' }, 500);
  }
}
