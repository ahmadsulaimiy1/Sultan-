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

  `CREATE TABLE IF NOT EXISTS student_classes (
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (student_id, class_id)
  )`,
  // Backfill for students created before this table existed — safe to
  // re-run (ON CONFLICT DO NOTHING), and a no-op once every student has
  // a matching row (admin/students.js writes one on every create/update
  // going forward).
  `INSERT INTO student_classes (student_id, class_id, is_primary)
    SELECT id, class_id, true FROM students WHERE class_id IS NOT NULL
    ON CONFLICT (student_id, class_id) DO NOTHING`,
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

  `CREATE TABLE IF NOT EXISTS guardian_notification_preferences (
    guardian_id        INTEGER PRIMARY KEY REFERENCES guardians(id) ON DELETE CASCADE,
    channel_website     BOOLEAN NOT NULL DEFAULT true,
    channel_email       BOOLEAN NOT NULL DEFAULT false,
    channel_whatsapp    BOOLEAN NOT NULL DEFAULT false,
    channel_sms         BOOLEAN NOT NULL DEFAULT false,
    type_attendance     BOOLEAN NOT NULL DEFAULT true,
    type_results        BOOLEAN NOT NULL DEFAULT true,
    type_fees           BOOLEAN NOT NULL DEFAULT true,
    type_announcements  BOOLEAN NOT NULL DEFAULT true,
    type_events         BOOLEAN NOT NULL DEFAULT true,
    type_emergency      BOOLEAN NOT NULL DEFAULT true,
    language            TEXT NOT NULL DEFAULT 'en',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS privacy_requests (
    id            SERIAL PRIMARY KEY,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL,
    request_type  TEXT NOT NULL,
    details       TEXT,
    status        TEXT NOT NULL DEFAULT 'open',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at   TIMESTAMPTZ
  )`,

  `CREATE TABLE IF NOT EXISTS adhkar_completions (
    id               SERIAL PRIMARY KEY,
    guardian_id      INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    period           TEXT NOT NULL,
    completion_date  DATE NOT NULL,
    completed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `DO $$ BEGIN
    ALTER TABLE adhkar_completions ADD CONSTRAINT adhkar_completions_guardian_period_date_key UNIQUE (guardian_id, period, completion_date);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,

  // Student Portal (Phase 2) — see sql/schema.sql for the commented
  // version of each of these tables.
  `CREATE TABLE IF NOT EXISTS student_accounts (
    student_id          INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    password_hash       TEXT,
    password_salt       TEXT,
    failed_attempts     INTEGER NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    reset_token         TEXT,
    reset_token_expires TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS hifz_progress (
    id             SERIAL PRIMARY KEY,
    student_id     INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    juz_number     INTEGER NOT NULL CHECK (juz_number BETWEEN 1 AND 30),
    status         TEXT NOT NULL DEFAULT 'not_started',
    murajaah_note  TEXT,
    tajweed_note   TEXT,
    muhaffiz_name  TEXT,
    assessed_at    DATE,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, juz_number)
  )`,

  `CREATE TABLE IF NOT EXISTS hifz_enrolment (
    student_id       INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    stage_number     INTEGER NOT NULL DEFAULT 1 CHECK (stage_number BETWEEN 1 AND 5),
    stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    enrolled_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS ijazah_register (
    id                 SERIAL PRIMARY KEY,
    student_id         INTEGER REFERENCES students(id) ON DELETE SET NULL,
    student_full_name  TEXT NOT NULL,
    granted_date       DATE NOT NULL,
    examining_scholars TEXT,
    certified_scope    TEXT,
    reference_no       TEXT NOT NULL UNIQUE,
    revoked_at         TIMESTAMPTZ,
    revocation_note    TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS auth_audit_log (
    id         SERIAL PRIMARY KEY,
    actor_type TEXT NOT NULL,
    actor_id   INTEGER,
    identifier TEXT,
    event      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS announcements (
    id            SERIAL PRIMARY KEY,
    category      TEXT NOT NULL CHECK (category IN (
                     'admissions', 'events', 'academic_notices', 'quran_college',
                     'arabic_studies', 'scholarships', 'parent_notices', 'general'
                   )),
    title         TEXT NOT NULL,
    summary       TEXT NOT NULL,
    body          TEXT,
    image_url     TEXT,
    venue         TEXT,
    event_date    DATE,
    event_time    TEXT,
    action_label  TEXT,
    action_url    TEXT,
    is_featured   BOOLEAN NOT NULL DEFAULT false,
    status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at  TIMESTAMPTZ,
    created_by    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_announcements_status_published ON announcements (status, published_at DESC)`,
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
        await sql`INSERT INTO student_classes (student_id, class_id, is_primary) VALUES (${studentId}, ${classId}, true)`;

        await sql`INSERT INTO guardian_student (guardian_id, student_id) VALUES (${guardianId}, ${studentId})`;
        await sql`INSERT INTO academic_terms (label, is_current) VALUES ('First Term 2025/2026', true) ON CONFLICT (label) DO NOTHING`;
        await sql`INSERT INTO attendance_summary (student_id, term, days_present, days_total) VALUES (${studentId}, 'First Term 2025/2026', 58, 62)`;
        await sql`
          INSERT INTO term_results (student_id, term, subject, ca_score, exam_score, total_score, teacher_comment)
          VALUES (${studentId}, 'First Term 2025/2026', 'Mathematics', 34, 52, 86, 'Sample data — replace via the admin API before real use.')`;
        await sql`INSERT INTO fee_status (student_id, term, amount_due, amount_paid) VALUES (${studentId}, 'First Term 2025/2026', 150000, 150000)`;
        await sql`INSERT INTO notifications (guardian_id, message) VALUES (${guardianId}, 'Welcome — this is a sample notification. New results or attendance updates will appear here.')`;

        // A second demo child, at Qur'an College, with a Student Portal
        // login and sample Hifz progress — so the new Student Portal +
        // Hifz Tracker can be tried end-to-end without hand-calling the
        // admin API. Linked to the same demo guardian so the guardian
        // dashboard also shows a Hifz snapshot alongside the first child.
        const qCls = await sql`INSERT INTO classes (institution, name) VALUES (${"Qur'an College"}, 'Hifz Year 2') RETURNING id`;
        const qClassId = qCls.rows[0].id;
        const qStudent = await sql`
          INSERT INTO students (full_name, admission_no, class_id, status)
          VALUES (${"Demo Student — Qur'an College (sample data)"}, 'DEMO-0002', ${qClassId}, 'active')
          RETURNING id`;
        const qStudentId = qStudent.rows[0].id;
        await sql`INSERT INTO student_classes (student_id, class_id, is_primary) VALUES (${qStudentId}, ${qClassId}, true)`;
        await sql`INSERT INTO guardian_student (guardian_id, student_id) VALUES (${guardianId}, ${qStudentId})`;

        // Dual enrolment demo: this same student is also enrolled in
        // Arabic & Islamic Studies, alongside their primary Qur'an
        // College programme — exactly the "belongs to more than one
        // programme at once" case the Student Portal needs to support.
        const arCls = await sql`INSERT INTO classes (institution, name) VALUES ('Arabic & Islamic Studies', 'Iʿdādiyyah 1') RETURNING id`;
        await sql`INSERT INTO student_classes (student_id, class_id, is_primary) VALUES (${qStudentId}, ${arCls.rows[0].id}, false)`;

        const { hash: qHash, salt: qSalt } = hashPassword(env.PORTAL_DEMO_PASSWORD);
        await sql`
          INSERT INTO student_accounts (student_id, password_hash, password_salt)
          VALUES (${qStudentId}, ${qHash}, ${qSalt})`;

        await sql`INSERT INTO hifz_enrolment (student_id, stage_number) VALUES (${qStudentId}, 2)`;
        const verifiedJuz = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        for (const juz of verifiedJuz) {
          await sql`
            INSERT INTO hifz_progress (student_id, juz_number, status, murajaah_note, tajweed_note, muhaffiz_name, assessed_at)
            VALUES (${qStudentId}, ${juz}, 'verified', 'Sample data — weekly retention check passed.', 'Sample data — Tajweed confirmed.', 'Sample Muhaffiz', CURRENT_DATE)`;
        }
        const memorisingJuz = [13, 14, 15];
        for (const juz of memorisingJuz) {
          await sql`
            INSERT INTO hifz_progress (student_id, juz_number, status, murajaah_note, muhaffiz_name)
            VALUES (${qStudentId}, ${juz}, 'memorising', 'Sample data — in progress this term.', 'Sample Muhaffiz')`;
        }
        await sql`INSERT INTO attendance_summary (student_id, term, days_present, days_total) VALUES (${qStudentId}, 'First Term 2025/2026', 60, 62)`;
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
