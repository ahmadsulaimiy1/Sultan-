// Token-protected admin endpoint for school staff to enter real student
// records. Deliberately API-only (no UI) for Phase 1 — see
// docs/parent-portal.md for the request shape and how to call it. This
// keeps children's real data out of any chat transcript: staff (or
// whoever holds PORTAL_ADMIN_TOKEN) call this directly, it is never
// something to paste into a conversation with an AI assistant.
//
// Guardians are never given a password by staff. A brand-new guardian
// gets an activation link (a reset_token) back in the response for
// staff to relay via WhatsApp/email; the parent chooses their own
// password at /portal/set-password/. See api/portal/set-password.js.
const { sql } = require('@vercel/postgres');
const { timingSafeEqualString, generateToken } = require('../../../lib/session');

const ACTIVATION_TOKEN_TTL_DAYS = 7;
const VALID_STATUSES = ['active', 'graduated', 'withdrawn', 'suspended'];

async function ensureTerm(rawTerm) {
  const term = String(rawTerm || '').trim();
  if (!term) return term;
  await sql`INSERT INTO academic_terms (label) VALUES (${term}) ON CONFLICT (label) DO NOTHING`;
  return term;
}

async function notifyGuardiansOfStudent(studentId, message) {
  const links = await sql`SELECT guardian_id FROM guardian_student WHERE student_id = ${studentId}`;
  for (const row of links.rows) {
    await sql`INSERT INTO notifications (guardian_id, message) VALUES (${row.guardian_id}, ${message})`;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const adminToken = process.env.PORTAL_ADMIN_TOKEN;
  if (!adminToken) {
    res.status(500).json({ error: 'Portal admin is not configured yet — PORTAL_ADMIN_TOKEN is not set.' });
    return;
  }
  if (!timingSafeEqualString(req.headers['x-admin-token'], adminToken)) {
    res.status(403).json({ error: 'Invalid admin token.' });
    return;
  }
  if (!process.env.POSTGRES_URL) {
    res.status(500).json({ error: 'No database is linked yet.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const guardianIn = body && body.guardian;
  const studentIn = body && body.student;
  if (!guardianIn || !guardianIn.email || !studentIn || !studentIn.fullName || !studentIn.admissionNo) {
    res.status(400).json({ error: 'guardian.email, student.fullName and student.admissionNo are required.' });
    return;
  }
  if (studentIn.status && !VALID_STATUSES.includes(studentIn.status)) {
    res.status(400).json({ error: 'student.status must be one of: ' + VALID_STATUSES.join(', ') });
    return;
  }

  try {
    const email = guardianIn.email.trim().toLowerCase();
    let guardianId;
    let activationLink = null;
    const existingGuardian = await sql`SELECT id FROM guardians WHERE email = ${email}`;
    if (existingGuardian.rows.length) {
      guardianId = existingGuardian.rows[0].id;
    } else {
      if (!guardianIn.fullName) {
        res.status(400).json({ error: 'New guardian requires guardian.fullName.' });
        return;
      }
      const token = generateToken();
      const created = await sql`
        INSERT INTO guardians (full_name, email, reset_token, reset_token_expires)
        VALUES (${guardianIn.fullName}, ${email}, ${token}, now() + make_interval(days => ${ACTIVATION_TOKEN_TTL_DAYS}))
        RETURNING id`;
      guardianId = created.rows[0].id;
      activationLink = '/portal/set-password/?token=' + token;
    }

    let classId = null;
    if (studentIn.institution && studentIn.className) {
      const existingClass = await sql`
        SELECT id FROM classes WHERE institution = ${studentIn.institution} AND name = ${studentIn.className}`;
      if (existingClass.rows.length) {
        classId = existingClass.rows[0].id;
      } else {
        const createdClass = await sql`
          INSERT INTO classes (institution, name) VALUES (${studentIn.institution}, ${studentIn.className}) RETURNING id`;
        classId = createdClass.rows[0].id;
      }
    }

    const admissionNo = studentIn.admissionNo.trim();
    const status = studentIn.status || 'active';
    let studentId;
    const existingStudent = await sql`SELECT id FROM students WHERE admission_no = ${admissionNo}`;
    if (existingStudent.rows.length) {
      studentId = existingStudent.rows[0].id;
      await sql`UPDATE students SET full_name = ${studentIn.fullName}, class_id = ${classId}, status = ${status} WHERE id = ${studentId}`;
    } else {
      const createdStudent = await sql`
        INSERT INTO students (full_name, admission_no, class_id, status)
        VALUES (${studentIn.fullName}, ${admissionNo}, ${classId}, ${status})
        RETURNING id`;
      studentId = createdStudent.rows[0].id;
    }

    await sql`
      INSERT INTO guardian_student (guardian_id, student_id, relationship)
      VALUES (${guardianId}, ${studentId}, ${body.relationship || 'parent/guardian'})
      ON CONFLICT (guardian_id, student_id) DO NOTHING`;

    const updatedParts = [];

    if (body.attendance && body.attendance.term) {
      const a = body.attendance;
      const term = await ensureTerm(a.term);
      await sql`
        INSERT INTO attendance_summary (student_id, term, days_present, days_total)
        VALUES (${studentId}, ${term}, ${a.daysPresent || 0}, ${a.daysTotal || 0})
        ON CONFLICT (student_id, term) DO UPDATE SET
          days_present = EXCLUDED.days_present, days_total = EXCLUDED.days_total, updated_at = now()`;
      updatedParts.push('attendance');
    }

    if (Array.isArray(body.results)) {
      for (const r of body.results) {
        if (!r.term || !r.subject) continue;
        const term = await ensureTerm(r.term);
        const total = r.totalScore != null ? r.totalScore : (Number(r.caScore || 0) + Number(r.examScore || 0));
        await sql`
          INSERT INTO term_results (student_id, term, subject, ca_score, exam_score, total_score, teacher_comment)
          VALUES (${studentId}, ${term}, ${r.subject}, ${r.caScore || null}, ${r.examScore || null}, ${total}, ${r.teacherComment || null})
          ON CONFLICT (student_id, term, subject) DO UPDATE SET
            ca_score = EXCLUDED.ca_score, exam_score = EXCLUDED.exam_score,
            total_score = EXCLUDED.total_score, teacher_comment = EXCLUDED.teacher_comment, updated_at = now()`;
      }
      if (body.results.length) updatedParts.push('results');
    }

    if (body.fees && body.fees.term) {
      const f = body.fees;
      const term = await ensureTerm(f.term);
      await sql`
        INSERT INTO fee_status (student_id, term, amount_due, amount_paid)
        VALUES (${studentId}, ${term}, ${f.amountDue || 0}, ${f.amountPaid || 0})
        ON CONFLICT (student_id, term) DO UPDATE SET
          amount_due = EXCLUDED.amount_due, amount_paid = EXCLUDED.amount_paid, updated_at = now()`;
      updatedParts.push('fee status');
    }

    if (updatedParts.length) {
      await notifyGuardiansOfStudent(studentId, `Updated for ${studentIn.fullName}: ${updatedParts.join(', ')}.`);
    }

    res.status(200).json({ ok: true, guardianId, studentId, activationLink });
  } catch (err) {
    console.error('portal admin students error', err);
    res.status(500).json({ error: 'Could not save that record: ' + (err && err.message ? err.message : 'unknown error') });
  }
};
