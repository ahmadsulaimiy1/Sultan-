-- Sultan Hanafi Parent Portal — Phase 1 schema.
-- Idempotent: safe to run against a fresh or already-migrated database.
-- Applied by api/portal/setup.js (token-gated), not run automatically.

CREATE TABLE IF NOT EXISTS guardians (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id            SERIAL PRIMARY KEY,
  institution   TEXT NOT NULL, -- e.g. 'Royal College', 'Nursery & Primary'
  name          TEXT NOT NULL  -- e.g. 'JSS 1', 'Basic 4'
);

CREATE TABLE IF NOT EXISTS students (
  id             SERIAL PRIMARY KEY,
  full_name      TEXT NOT NULL,
  admission_no   TEXT NOT NULL UNIQUE,
  class_id       INTEGER REFERENCES classes(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guardian_student (
  guardian_id INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'parent/guardian',
  PRIMARY KEY (guardian_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_summary (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term         TEXT NOT NULL, -- e.g. 'First Term 2025/2026'
  days_present INTEGER NOT NULL DEFAULT 0,
  days_total   INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term)
);

CREATE TABLE IF NOT EXISTS term_results (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term         TEXT NOT NULL,
  subject      TEXT NOT NULL,
  ca_score     NUMERIC(5,2), -- out of 40
  exam_score   NUMERIC(5,2), -- out of 60
  total_score  NUMERIC(5,2),
  teacher_comment TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term, subject)
);

CREATE TABLE IF NOT EXISTS fee_status (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term         TEXT NOT NULL,
  amount_due   NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid  NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term)
);
