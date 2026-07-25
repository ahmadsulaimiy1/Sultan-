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

-- Personalisation Centre — Notifications tab. Records which delivery
-- channels and notification types a guardian *wants*, even though only
-- "website" (the notifications table above) actually delivers anything
-- today. Saving a preference for email/whatsapp/sms is intentional: it
-- lets a family opt in ahead of those channels existing, so nothing has
-- to be re-asked once a transactional email/SMS provider is added (see
-- docs/digital-campus-roadmap.md) — the portal UI must still label those
-- channels "coming soon" rather than implying they're live.
CREATE TABLE IF NOT EXISTS guardian_notification_preferences (
  guardian_id       INTEGER PRIMARY KEY REFERENCES guardians(id) ON DELETE CASCADE,
  channel_website    BOOLEAN NOT NULL DEFAULT true,
  channel_email      BOOLEAN NOT NULL DEFAULT false,
  channel_whatsapp   BOOLEAN NOT NULL DEFAULT false,
  channel_sms        BOOLEAN NOT NULL DEFAULT false,
  type_attendance    BOOLEAN NOT NULL DEFAULT true,
  type_results       BOOLEAN NOT NULL DEFAULT true,
  type_fees          BOOLEAN NOT NULL DEFAULT true,
  type_announcements BOOLEAN NOT NULL DEFAULT true,
  type_events        BOOLEAN NOT NULL DEFAULT true,
  type_emergency     BOOLEAN NOT NULL DEFAULT true,
  language           TEXT NOT NULL DEFAULT 'en',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Personalisation Centre — Privacy & Data Requests. A real, working
-- "contact the school about your data" channel under the Nigeria Data
-- Protection Act 2023 (see docs/parent-portal.md). Deliberately open to
-- anyone, not just signed-in guardians — a former guardian requesting
-- deletion may no longer have portal access. Reviewed and actioned by
-- staff directly against the database (same admin-mediated pattern as
-- password resets); no self-service automation yet.
CREATE TABLE IF NOT EXISTS privacy_requests (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  request_type  TEXT NOT NULL, -- access | correction | deletion | other
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'open', -- open | in_progress | resolved
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
