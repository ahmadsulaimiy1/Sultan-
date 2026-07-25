// Guardian-facing admissions applications — the concrete answer to
// "the account should become the foundation for enquiries, admissions
// applications, application tracking, future student onboarding"
// rather than a disconnected applicant login. Session-authenticated
// (the existing guardian session cookie), scoped to the caller's own
// applications only. See docs/account-creation-journey.md.
//
// GET  — list the signed-in guardian's own applications.
// POST — submit a new one. Requires a VERIFIED email (see register.js's
// header comment on why verification gates this specific action rather
// than login) — an application carries real institutional weight
// (someone will act on it), unlike simply browsing the portal.
//
// Document upload is explicitly NOT built here — no file storage
// backend (R2/S3/etc.) exists anywhere in this project yet. Naming
// that plainly rather than faking an upload button that goes nowhere.
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';

function toApplication(r) {
  return {
    id: r.id,
    applicantChildName: r.applicant_child_name,
    institution: r.institution_name,
    desiredClass: r.desired_class,
    notes: r.notes,
    status: r.status,
    decisionNote: r.decision_note,
    submittedAt: r.submitted_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  try {
    const res = await sql`
      SELECT aa.*, i.name AS institution_name
      FROM admissions_applications aa
      LEFT JOIN institutions i ON i.id = aa.institution_id
      WHERE aa.guardian_id = ${session.guardianId}
      ORDER BY aa.submitted_at DESC`;
    return json({ ok: true, applications: res.rows.map(toApplication) });
  } catch (err) {
    console.error('admissions-applications list error', err);
    return json({ error: 'Could not load your applications right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const applicantChildName = ((body && body.applicantChildName) || '').trim();
  const institutionName = (body && body.institutionName) || null;
  const desiredClass = (body && body.desiredClass) || null;
  const notes = (body && body.notes) || null;
  if (!applicantChildName) {
    return json({ error: "The prospective student's name is required." }, 400);
  }

  try {
    const guardianRes = await sql`SELECT id, email_verified_at FROM guardians WHERE id = ${session.guardianId}`;
    const guardian = guardianRes.rows[0];
    if (!guardian) {
      return json({ error: 'Not signed in.' }, 401);
    }
    if (!guardian.email_verified_at) {
      return json({ error: 'Please verify your email address before submitting an application — check your inbox, or resend the verification email from your account.' }, 403);
    }

    let institutionId = null;
    if (institutionName) {
      const instRes = await sql`SELECT id FROM institutions WHERE name = ${institutionName}`;
      institutionId = instRes.rows[0] ? instRes.rows[0].id : null;
    }

    const created = await sql`
      INSERT INTO admissions_applications (guardian_id, applicant_child_name, institution_id, desired_class, notes)
      VALUES (${session.guardianId}, ${applicantChildName}, ${institutionId}, ${desiredClass}, ${notes})
      RETURNING id, submitted_at`;

    return json({ ok: true, applicationId: created.rows[0].id, submittedAt: created.rows[0].submitted_at });
  } catch (err) {
    console.error('admissions-applications create error', err);
    return json({ error: 'Could not submit your application right now — please try again shortly.' }, 500);
  }
}
