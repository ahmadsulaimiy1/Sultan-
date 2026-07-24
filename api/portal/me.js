const { sql } = require('@vercel/postgres');
const { readSessionFromRequest } = require('../../lib/session');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let session;
  try {
    session = readSessionFromRequest(req);
  } catch (err) {
    res.status(500).json({ error: 'Portal is not configured yet.' });
    return;
  }
  if (!session) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }
  if (!process.env.POSTGRES_URL) {
    res.status(500).json({ error: 'Portal is not configured yet — no database is linked.' });
    return;
  }

  try {
    const guardianRes = await sql`SELECT full_name FROM guardians WHERE id = ${session.guardianId}`;
    const guardian = guardianRes.rows[0];
    if (!guardian) {
      res.status(401).json({ error: 'Not signed in.' });
      return;
    }

    const studentsRes = await sql`
      SELECT s.id, s.full_name, s.admission_no, c.institution, c.name AS class_name
      FROM students s
      JOIN guardian_student gs ON gs.student_id = s.id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE gs.guardian_id = ${session.guardianId}
      ORDER BY s.full_name`;

    const children = [];
    for (const student of studentsRes.rows) {
      const [attendance, results, fees] = await Promise.all([
        sql`SELECT term, days_present, days_total FROM attendance_summary WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
        sql`SELECT term, subject, ca_score, exam_score, total_score, teacher_comment FROM term_results WHERE student_id = ${student.id} ORDER BY updated_at DESC`,
        sql`SELECT term, amount_due, amount_paid FROM fee_status WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
      ]);
      children.push({
        id: student.id,
        fullName: student.full_name,
        admissionNo: student.admission_no,
        institution: student.institution,
        className: student.class_name,
        attendance: attendance.rows[0] || null,
        results: results.rows,
        fees: fees.rows[0] || null,
      });
    }

    res.status(200).json({ fullName: guardian.full_name, children });
  } catch (err) {
    console.error('portal me error', err);
    res.status(500).json({ error: 'Could not load your dashboard right now — please try again shortly.' });
  }
};
