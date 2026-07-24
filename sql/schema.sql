-- Sultan Hanafi Parent Portal — schema (post pre-production audit).
-- Idempotent: safe to run against a fresh database, or one that already
-- ran an earlier version of this file. Applied by api/portal/setup.js
-- (token-gated), not run automatically. Keep the two in sync.

CREATE TABLE IF NOT EXISTS guardians (
  id                  SERIAL PRIMARY KEY,
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  -- Nullable: a guardian created by the admin API has no password until
  -- they activate their own account via a reset_token — staff never
  -- choose or see a parent's password.
  password_hash       TEXT,
  password_salt       TEXT,
  failed_attempts     INTEGER NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  reset_token         TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Canonical term registry. Attendance/results/fees still store the term
-- as normalized text (see below) rather than a foreign key, to avoid a
-- riskier schema migration before any real data exists — but every write
-- path registers/normalizes against this table, closing most of the
-- typo/duplicate-term risk without that migration.
CREATE TABLE IF NOT EXISTS academic_terms (
  id         SERIAL PRIMARY KEY,
  label      TEXT NOT NULL UNIQUE,
  is_current BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS classes (
  id          SERIAL PRIMARY KEY,
  institution TEXT NOT NULL,
  name        TEXT NOT NULL,
  UNIQUE (institution, name)
);

CREATE TABLE IF NOT EXISTS students (
  id             SERIAL PRIMARY KEY,
  full_name      TEXT NOT NULL,
  admission_no   TEXT NOT NULL UNIQUE,
  class_id       INTEGER REFERENCES classes(id),
  status         TEXT NOT NULL DEFAULT 'active', -- active | graduated | withdrawn | suspended
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guardian_student (
  guardian_id  INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'parent/guardian',
  PRIMARY KEY (guardian_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_summary (
  id           SERIAL PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term         TEXT NOT NULL,
  days_present INTEGER NOT NULL DEFAULT 0,
  days_total   INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term)
);

CREATE TABLE IF NOT EXISTS term_results (
  id              SERIAL PRIMARY KEY,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term            TEXT NOT NULL,
  subject         TEXT NOT NULL,
  ca_score        NUMERIC(5,2),
  exam_score      NUMERIC(5,2),
  total_score     NUMERIC(5,2),
  teacher_comment TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term, subject)
);

CREATE TABLE IF NOT EXISTS fee_status (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term        TEXT NOT NULL,
  amount_due  NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term)
);

-- Lightweight in-portal notifications. Not a substitute for real
-- email/SMS/WhatsApp push (see docs/digital-campus-roadmap.md) — this
-- is what's buildable with zero new paid infrastructure: a guardian
-- sees "New result posted for Yusuf" the next time they sign in.
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  guardian_id INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ
);
