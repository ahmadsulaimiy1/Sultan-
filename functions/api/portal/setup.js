// One-time (idempotent) database setup for the Parent Portal. Gated by
// PORTAL_SETUP_TOKEN so it can't be triggered by a stranger who finds the
// URL. Safe to run again after an upgrade — every statement is additive
// (CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), so it never
// drops or rewrites existing data. See docs/parent-portal.md.
//
// Mirrors sql/schema.sql — keep the two in sync if either changes.
import { getSql } from '../../_lib/db.js';
import { hashPassword, timingSafeEqualString } from '../../_lib/session.js';
import { json } from '../../_lib/http.js';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS guardians (
    id                  SERIAL PRIMARY KEY,
    full_name           TEXT NOT NULL,
    email               TEXT NOT NULL UNIQUE,
    password_hash       TEXT,
    password_salt       TEXT,
    failed_attempts     INTEGER NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    reset_token         TEXT,
    reset_token_expires TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Additive upgrades for a database that already ran an earlier version
  // of this endpoint, before this audit's redesign.
  `ALTER TABLE guardians ALTER COLUMN password_hash DROP NOT NULL`,
  `ALTER TABLE guardians ALTER COLUMN password_salt DROP NOT NULL`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS reset_token TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`,

  `CREATE TABLE IF NOT EXISTS academic_terms (
    id         SERIAL PRIMARY KEY,
    label      TEXT NOT NULL UNIQUE,
    is_current BOOLEAN NOT NULL DEFAULT false
  )`,

  `CREATE TABLE IF NOT EXISTS classes (
    id          SERIAL PRIMARY KEY,
    institution TEXT NOT NULL,
    name        TEXT NOT NULL
  )`,
  `DO $$ BEGIN
    ALTER TABLE classes ADD CONSTRAINT classes_institution_name_key UNIQUE (institution, name);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,

  `CREATE TABLE IF NOT EXISTS students (
    id             SERIAL PRIMARY KEY,
    full_name      TEXT NOT NULL,
    admission_no   TEXT NOT NULL UNIQUE,
    class_id       INTEGER REFERENCES classes(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,

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
  `CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    guardian_id INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at     TIMESTAMPTZ
  )`,
];

async function handle({ request, env }) {
  const setupToken = env.PORTAL_SETUP_TOKEN;
  if (!setupToken) {
    return json({ error: 'Portal is not configured yet — PORTAL_SETUP_TOKEN is not set on this deployment.' }, 500);
  }
  if (!timingSafeEqualString(request.headers.get('x-setup-token'), setupToken)) {
    return json({ error: 'Invalid setup token.' }, 403);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet — add a Neon Postgres connection string as DATABASE_URL, then retry.' }, 500);
  }

  try {
    for (const statement of STATEMENTS) {
      await sql.query(statement);
    }

    let demoSeeded = false;
    if (env.PORTAL_DEMO_PASSWORD) {
      const existing = await sql`SELECT id FROM guardians WHERE email = 'demo@shroyalschools.ng'`;
      if (existing.rows.length === 0) {
        const { hash, salt } = hashPassword(env.PORTAL_DEMO_PASSWORD);
        const guardian = await sql`
          INSERT INTO guardians (full_name, email, password_hash, password_salt)
          VALUES ('Demo Guardian', 'demo@shroyalschools.ng', ${hash}, ${salt})
          RETURNING id`;
        const guardianId = guardian.rows[0].id;

        const cls = await sql`INSERT INTO classes (institution, name) VALUES ('Royal College', 'JSS 1') RETURNING id`;
        const classId = cls.rows[0].id;

        const student = await sql`
          INSERT INTO students (full_name, admission_no, class_id, status)
          VALUES ('Demo Student (sample data)', 'DEMO-0001', ${classId}, 'active')
          RETURNING id`;
        const studentId = student.rows[0].id;

        await sql`INSERT INTO guardian_student (guardian_id, student_id) VALUES (${guardianId}, ${studentId})`;
        await sql`INSERT INTO academic_terms (label, is_current) VALUES ('First Term 2025/2026', true) ON CONFLICT (label) DO NOTHING`;
        await sql`INSERT INTO attendance_summary (student_id, term, days_present, days_total) VALUES (${studentId}, 'First Term 2025/2026', 58, 62)`;
        await sql`
          INSERT INTO term_results (student_id, term, subject, ca_score, exam_score, total_score, teacher_comment)
          VALUES (${studentId}, 'First Term 2025/2026', 'Mathematics', 34, 52, 86, 'Sample data — replace via the admin API before real use.')`;
        await sql`INSERT INTO fee_status (student_id, term, amount_due, amount_paid) VALUES (${studentId}, 'First Term 2025/2026', 150000, 150000)`;
        await sql`INSERT INTO notifications (guardian_id, message) VALUES (${guardianId}, 'Welcome — this is a sample notification. New results or attendance updates will appear here.')`;
        demoSeeded = true;
      }
    }

    return json({ ok: true, tablesReady: true, demoSeeded });
  } catch (err) {
    console.error('portal setup error', err);
    return json({ error: 'Setup failed: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

export const onRequestGet = handle;
export const onRequestPost = handle;
