// One-time (idempotent) database setup for the Parent Portal. Gated by
// PORTAL_SETUP_TOKEN so it can't be triggered by a stranger who finds the
// URL. See docs/parent-portal.md for how to call this.
//
// Mirrors sql/schema.sql — keep the two in sync if either changes.
const { sql } = require('@vercel/postgres');
const { hashPassword } = require('../../lib/session');

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS guardians (
    id            SERIAL PRIMARY KEY,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS classes (
    id            SERIAL PRIMARY KEY,
    institution   TEXT NOT NULL,
    name          TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS students (
    id             SERIAL PRIMARY KEY,
    full_name      TEXT NOT NULL,
    admission_no   TEXT NOT NULL UNIQUE,
    class_id       INTEGER REFERENCES classes(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS guardian_student (
    guardian_id INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'parent/guardian',
    PRIMARY KEY (guardian_id, student_id)
  )`,
  `CREATE TABLE IF NOT EXISTS attendance_summary (
    id           SERIAL PRIMARY KEY,
    student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term         TEXT NOT NULL,
    days_present INTEGER NOT NULL DEFAULT 0,
    days_total   INTEGER NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, term)
  )`,
  `CREATE TABLE IF NOT EXISTS term_results (
    id           SERIAL PRIMARY KEY,
    student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term         TEXT NOT NULL,
    subject      TEXT NOT NULL,
    ca_score     NUMERIC(5,2),
    exam_score   NUMERIC(5,2),
    total_score  NUMERIC(5,2),
    teacher_comment TEXT,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, term, subject)
  )`,
  `CREATE TABLE IF NOT EXISTS fee_status (
    id           SERIAL PRIMARY KEY,
    student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term         TEXT NOT NULL,
    amount_due   NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid  NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, term)
  )`,
];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const setupToken = process.env.PORTAL_SETUP_TOKEN;
  if (!setupToken) {
    res.status(500).json({ error: 'Portal is not configured yet — PORTAL_SETUP_TOKEN is not set on this deployment.' });
    return;
  }
  if (req.headers['x-setup-token'] !== setupToken) {
    res.status(403).json({ error: 'Invalid setup token.' });
    return;
  }
  if (!process.env.POSTGRES_URL) {
    res.status(500).json({ error: 'No database is linked yet — add Vercel Postgres storage to this project first, then retry.' });
    return;
  }

  try {
    for (const statement of STATEMENTS) {
      await sql.query(statement);
    }

    let demoSeeded = false;
    if (process.env.PORTAL_DEMO_PASSWORD) {
      const existing = await sql`SELECT id FROM guardians WHERE email = 'demo@shroyalschools.ng'`;
      if (existing.rows.length === 0) {
        const { hash, salt } = hashPassword(process.env.PORTAL_DEMO_PASSWORD);
        const guardian = await sql`
          INSERT INTO guardians (full_name, email, password_hash, password_salt)
          VALUES ('Demo Guardian', 'demo@shroyalschools.ng', ${hash}, ${salt})
          RETURNING id`;
        const guardianId = guardian.rows[0].id;

        const cls = await sql`INSERT INTO classes (institution, name) VALUES ('Royal College', 'JSS 1') RETURNING id`;
        const classId = cls.rows[0].id;

        const student = await sql`
          INSERT INTO students (full_name, admission_no, class_id)
          VALUES ('Demo Student (sample data)', 'DEMO-0001', ${classId})
          RETURNING id`;
        const studentId = student.rows[0].id;

        await sql`INSERT INTO guardian_student (guardian_id, student_id) VALUES (${guardianId}, ${studentId})`;
        await sql`INSERT INTO attendance_summary (student_id, term, days_present, days_total) VALUES (${studentId}, 'First Term 2025/2026', 58, 62)`;
        await sql`
          INSERT INTO term_results (student_id, term, subject, ca_score, exam_score, total_score, teacher_comment)
          VALUES (${studentId}, 'First Term 2025/2026', 'Mathematics', 34, 52, 86, 'Sample data — replace via the admin API before real use.')`;
        await sql`INSERT INTO fee_status (student_id, term, amount_due, amount_paid) VALUES (${studentId}, 'First Term 2025/2026', 150000, 150000)`;
        demoSeeded = true;
      }
    }

    res.status(200).json({ ok: true, tablesReady: true, demoSeeded });
  } catch (err) {
    console.error('portal setup error', err);
    res.status(500).json({ error: 'Setup failed: ' + (err && err.message ? err.message : 'unknown error') });
  }
};
