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

-- Multi-programme (dual) enrolment. students.class_id remains each
-- student's single "primary" class for backward compatibility with
-- existing code and data, but a student can additionally belong to any
-- number of other classes at once — e.g. Royal College SS2 *and* Qur'an
-- College Hifz *and* Arabic & Islamic Studies simultaneously. Every
-- student's primary class is also mirrored here (is_primary = true) so
-- this table is the single, authoritative source of "everything this
-- student is enrolled in."
CREATE TABLE IF NOT EXISTS student_classes (
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (student_id, class_id)
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

-- Family Adhkar tracking (Parent Portal). There is no separate student
-- login in this schema — guardians are the only authenticated portal
-- users — so this tracks "did the family complete this period today" at
-- the guardian/household level, not per individual child. One row per
-- guardian per period per day; used to compute a simple day-streak.
CREATE TABLE IF NOT EXISTS adhkar_completions (
  id               SERIAL PRIMARY KEY,
  guardian_id      INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  period           TEXT NOT NULL, -- morning | evening
  completion_date  DATE NOT NULL,
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guardian_id, period, completion_date)
);

-- Student Portal (Phase 2). A second, independent authenticated role —
-- guardians and students hold separate sessions (see functions/_lib/
-- session.js's parallel cookie helpers), not a unified role+id payload,
-- so nothing about the existing guardian login changes shape. A student
-- only gets a row here once staff issue an activation link via
-- POST /api/portal/admin/create-student-login (same admin-mediated,
-- no-self-serve-signup model as guardians — see docs/student-portal.md).
CREATE TABLE IF NOT EXISTS student_accounts (
  student_id          INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  password_hash       TEXT,
  password_salt       TEXT,
  failed_attempts     INTEGER NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  reset_token         TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Qur'an College Hifz tracking. Assessment is per-Juz' (memorisation
-- accuracy, retention, and Tajweed together — not separate scored
-- tracks), matching how the school's own draft Hifz Regulations (IQ-01)
-- and public Qur'an College page describe the process. Entered by
-- Qur'an College staff via the token-gated POST /api/portal/admin/
-- hifz-progress (no admin UI yet — same convention as
-- admin/students.js). Free-text note fields deliberately, not a numeric
-- rubric: the school hasn't published a graded scale for this yet.
CREATE TABLE IF NOT EXISTS hifz_progress (
  id             SERIAL PRIMARY KEY,
  student_id     INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  juz_number     INTEGER NOT NULL CHECK (juz_number BETWEEN 1 AND 30),
  status         TEXT NOT NULL DEFAULT 'not_started', -- not_started | memorising | completed_pending_review | verified
  murajaah_note  TEXT,
  tajweed_note   TEXT,
  muhaffiz_name  TEXT,
  assessed_at    DATE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, juz_number)
);

-- Current stage of the school's own published 5-stage Hifz Journey:
-- 1 Memorisation & Muraja'ah, 2 Progression Through the 30 Juz',
-- 3 Completion Standard, 4 Ijazah Examination, 5 Ijazah Granted. Stored
-- as a number (not text mirroring the marketing page's exact wording)
-- so the DB doesn't need editing if that copy changes — the labels live
-- in one shared lookup used by both the student and guardian dashboards.
CREATE TABLE IF NOT EXISTS hifz_enrolment (
  student_id       INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  stage_number     INTEGER NOT NULL DEFAULT 1 CHECK (stage_number BETWEEN 1 AND 5),
  stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permanent Ijazah register (IQ-02 §7.4/§7.6: never deleted, only
-- annotated) — this phase is internal display-only (student/guardian
-- dashboards); IQ-02 §7.5's public third-party verification endpoint is
-- separate future work with its own access-control model. student_id is
-- ON DELETE SET NULL rather than CASCADE, and student_full_name is
-- frozen at grant time, so a certification record survives independent
-- of whatever later happens to the live students row. Grant fields
-- (granted_date/examining_scholars/certified_scope) are treated as
-- immutable by the application layer once created; only revoked_at/
-- revocation_note are ever set afterward. No UNIQUE(student_id) — IQ-02
-- §7.3 allows partial/juz'-level credentials, so more than one row per
-- student can be legitimate.
CREATE TABLE IF NOT EXISTS ijazah_register (
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
);

-- Small, real audit trail of login attempts across both roles — actor_id
-- is intentionally polymorphic (a guardian id or a student id depending
-- on actor_type) with no FK, the same soft-reference approach already
-- used above for academic_terms, to avoid two nullable FK columns for
-- what's a read-seldom log table.
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id         SERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL, -- guardian | student
  actor_id   INTEGER,
  identifier TEXT, -- email or admission_no, whichever was submitted
  event      TEXT NOT NULL, -- login_success | login_failed | lockout | password_activated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Institutional announcements — admissions notices, events, academic
-- notices, and category-specific communications for the Qur'an College
-- and Arabic & Islamic Studies. Deliberately holds zero rows until real
-- content exists; every public-facing surface (ribbon, homepage hero,
-- countdown, archive) is built to render an honest, deliberate empty
-- state rather than assume a row exists. Entered by staff via the
-- token-gated POST /api/portal/admin/announcements (no admin UI yet —
-- same "protected raw API" convention as admin/students.js and
-- admin/hifz-progress.js). Re-gate this to a proper Communications/
-- Front-Office role once the Staff Identity & Role System's permission
-- engine exists — PORTAL_ADMIN_TOKEN is reused for now only because no
-- narrower role boundary is implementable yet.
CREATE TABLE IF NOT EXISTS announcements (
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
  event_date    DATE,       -- null for notices that aren't tied to a single date
  event_time    TEXT,       -- free text ("10:00 AM"), not every notice has a precise time
  action_label  TEXT,
  action_url    TEXT,
  -- At most one row should be featured at a time in practice (the hero
  -- picks the most recently featured), but this isn't DB-enforced —
  -- the admin endpoint unsets any prior featured row on each feature
  -- action so the application layer keeps it to one.
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at  TIMESTAMPTZ,
  created_by    TEXT, -- staff name/identifier, free text until Staff Identity exists
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcements_status_published ON announcements (status, published_at DESC);
