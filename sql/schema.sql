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
  -- choose or see a parent's password. A self-service registrant sets
  -- their own password immediately instead (see registration_source).
  password_hash       TEXT,
  password_salt       TEXT,
  failed_attempts     INTEGER NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  reset_token         TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Added for the self-service Account Creation Journey — see
  -- docs/account-creation-journey.md. phone is collected at signup per
  -- that directive; email_verified_at/verification_token* are a
  -- SEPARATE token pair from reset_token* on purpose (proving email
  -- ownership at signup and resetting a forgotten password are
  -- different security events and must never share a token). A
  -- self-registered guardian can sign in and use the portal before
  -- verifying — verification protects against email-address squatting/
  -- spam, not login, since only the real registrant knows the password
  -- they just chose.
  phone                       TEXT,
  registration_source         TEXT NOT NULL DEFAULT 'admin_created' CHECK (registration_source IN ('admin_created', 'self_service')),
  email_verified_at           TIMESTAMPTZ,
  verification_token          TEXT,
  verification_token_expires  TIMESTAMPTZ
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
  -- RSVP is a simple honest counter, not a guest list — no name/contact
  -- capture, so it carries no privacy-request/consent surface of its own.
  -- Incremented by the public rsvp endpoint; the per-visitor "have you
  -- already tapped it" guard lives client-side (localStorage), same trust
  -- level as the Adhkar family streak toggle elsewhere in this codebase.
  rsvp_count    INTEGER NOT NULL DEFAULT 0,
  -- Populated by staff after the event, once real photos exist — never
  -- auto-generated. A JSON array of {url, alt} objects (see
  -- docs/announcements-system.md). Null/empty means no gallery yet, and
  -- the frontend renders nothing rather than a placeholder grid.
  gallery_images JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcements_status_published ON announcements (status, published_at DESC);

-- SHRS Marketplace (Bookshop & Learning Store) — catalog architecture
-- only. Deliberately holds zero rows until real products, prices, and
-- photos exist; the storefront renders an honest per-category empty
-- state rather than fabricated products. There is NO payment/checkout
-- column here on purpose — "buy_now"/"add_to_cart" on the public site
-- link out to a WhatsApp order enquiry, not a cart, until the school has
-- a registered payment processor and the associated business/legal setup
-- (see docs/shrs-intelligent-campus-roadmap.md, Marketplace section, for
-- why online checkout is out of scope for this pass). Same staff-
-- mediated, token-gated admin pattern as announcements.
CREATE TABLE IF NOT EXISTS marketplace_products (
  id            SERIAL PRIMARY KEY,
  category      TEXT NOT NULL CHECK (category IN (
                   'textbooks', 'exercise_books', 'uniforms', 'bags', 'stationery',
                   'quran_materials', 'arabic_materials', 'islamic_studies_materials',
                   'digital_products', 'shrs_publications', 'grammar_books', 'curriculum_materials'
                 )),
  name          TEXT NOT NULL,
  description   TEXT,
  price_naira   NUMERIC(12,2), -- null means "price on enquiry"
  image_url     TEXT,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by    TEXT,
  -- Illustrative placeholder listings (name/category real, price/stock not
  -- yet confirmed by the Bookshop) so the storefront isn't empty before
  -- real inventory is entered — same is_sample_data convention as
  -- guardians/students/staff. Seeded once, unconditionally, by
  -- functions/api/portal/setup.js if the table is empty; a real product
  -- entered by staff never gets this flag.
  is_sample_data BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_status_category ON marketplace_products (status, category);

-- ============================================================
-- SHRS Identity & Access Platform (Staff Identity & Role System)
-- ============================================================
-- Implements docs/staff-identity-architecture.md, which itself
-- implements the already-accepted docs/role-permission-matrix.md and
-- docs/data-ownership-register.md. Read that architecture doc before
-- editing anything below — in particular the note on why this is an
-- ORGANISATIONAL DIRECTORY (who, where, reports-to, active/suspended/
-- archived), not an HR personnel file (salary, leave, discipline,
-- performance, contracts) — the latter stays out of scope until
-- HR-04 through HR-09 exist, per role-permission-matrix.md §4.3's
-- explicit "this entire area is ungoverned" flag.

-- Formalises the institution names already used as free text in
-- classes.institution (kept as-is, unchanged, to avoid touching live
-- student data) into a real reference table so offices/staff/roles can
-- scope against an id instead of repeating free text. Values below
-- MUST match classes.institution's existing strings exactly — see the
-- architecture doc's alignment note.
CREATE TABLE IF NOT EXISTS institutions (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Future-campus-ready per the directive's "Future Campuses" requirement
-- — one real row today (the only real campus), more added later without
-- any other table changing shape.
CREATE TABLE IF NOT EXISTS campuses (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  is_active  BOOLEAN NOT NULL DEFAULT true
);

-- The Organisational Directory. institution_id NULL = school-wide (the
-- Board, the Executive Management Team, ICT). parent_office_id is a
-- self-reference so the directory can express real reporting structure
-- (e.g. a future Admissions Office reporting through the Registrar's
-- Office) without a fixed-depth hierarchy.
CREATE TABLE IF NOT EXISTS offices (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  office_type      TEXT NOT NULL CHECK (office_type IN ('governance', 'executive', 'academic', 'support')),
  institution_id   INTEGER REFERENCES institutions(id),
  parent_office_id INTEGER REFERENCES offices(id),
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subunits within an institution/office — e.g. Royal College's academic
-- departments (the public site names "seven academic departments" but
-- does not name them individually anywhere, so none are fabricated
-- here; this table starts empty and is populated with real names once
-- the school supplies them).
CREATE TABLE IF NOT EXISTS departments (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  institution_id INTEGER REFERENCES institutions(id),
  office_id      INTEGER REFERENCES offices(id),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reference table for the 16 role codes defined in
-- role-permission-matrix.md §3 — a real, queryable representation of an
-- already-accepted governance document, not a value invented here.
-- status distinguishes a currently-documented role (Established) from
-- one the Matrix recommends building system support for ahead of a
-- formal Board appointment (Proposed) — see that document's §0 for why.
CREATE TABLE IF NOT EXISTS roles (
  code               TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('established', 'proposed')),
  scope_description  TEXT,
  source_note        TEXT
);

-- The Staff Data Model — an organisational identity record, not a
-- personnel file. reports_to_staff_id is a self-reference so the
-- directory can express real reporting relationships (Registrar Office
-- staff reporting to the Registrar, etc.). institution_id is a staff
-- member's PRIMARY institution for display purposes; staff_institutions
-- below is the authoritative multi-institution record, mirroring the
-- student_classes pattern already proven for dual-enrolled students.
CREATE TABLE IF NOT EXISTS staff (
  id                  SERIAL PRIMARY KEY,
  staff_no            TEXT NOT NULL UNIQUE,
  full_name           TEXT NOT NULL,
  preferred_name      TEXT,
  office_id           INTEGER REFERENCES offices(id),
  department_id       INTEGER REFERENCES departments(id),
  position_title      TEXT,
  reports_to_staff_id INTEGER REFERENCES staff(id),
  institution_id      INTEGER REFERENCES institutions(id),
  date_joined         DATE,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Multiple Institutional Assignments — same is_primary-flagged
-- many-to-many shape as student_classes, so a staff member who (for
-- example) teaches across both Royal College and Arabic & Islamic
-- Studies is representable without a schema change.
CREATE TABLE IF NOT EXISTS staff_institutions (
  staff_id       INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  institution_id INTEGER NOT NULL REFERENCES institutions(id),
  is_primary     BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (staff_id, institution_id)
);

-- The Role Assignment Engine's data — One User -> Many Roles, each
-- assignment independently scoped (institution_id/office_id) and
-- independently revocable, so "Principal + Arabic Studies Officer" or
-- "Registrar + Admissions Officer" needs zero redesign: it's just two
-- rows. Nothing here grants a permission directly — permissions are
-- derived at request time by functions/_lib/permissions.js from
-- role_code via the data-driven matrix in
-- functions/_lib/permission-matrix.js, which implements
-- role-permission-matrix.md exactly. This table only ever records WHO
-- holds WHICH role, WHERE, granted by WHOM, and WHEN revoked — it does
-- not itself decide what that role can do.
CREATE TABLE IF NOT EXISTS staff_roles (
  id             SERIAL PRIMARY KEY,
  staff_id       INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role_code      TEXT NOT NULL REFERENCES roles(code),
  institution_id INTEGER REFERENCES institutions(id), -- NULL = school-wide scope for this grant
  office_id      INTEGER REFERENCES offices(id),
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by     INTEGER REFERENCES staff(id),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  revoked_at     TIMESTAMPTZ,
  revoked_by     INTEGER REFERENCES staff(id)
);

-- Staff portal login credential — deliberately separate from `staff`
-- itself, same reason student_accounts is separate from students: staff
-- never choose their own account's existence, and this table's shape
-- can change without touching the directory record. Mirrors
-- guardian/student_accounts exactly (nullable password until
-- activation, lockout counters, reset token).
CREATE TABLE IF NOT EXISTS staff_accounts (
  staff_id            INTEGER PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  password_hash       TEXT,
  password_salt       TEXT,
  failed_attempts     INTEGER NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  reset_token         TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The Delegation System. A delegation grants the DELEGATE the
-- delegator's role_code, scoped exactly like a normal staff_roles grant,
-- for a bounded window only — ends_at is NOT NULL by design ("must
-- expire automatically" per the directive), and expiry is computed at
-- query time (now() BETWEEN starts_at AND ends_at AND revoked_at IS
-- NULL) rather than relying on a scheduled job to flip a status flag:
-- this project has no cron/background-worker infrastructure, and a
-- computed check is more robust than a flag that depends on a job
-- actually having run. reason is NOT NULL — every delegation must state
-- why, per the "Who did what? When? Why?" audit standard. revoked_at/
-- revoked_by make it reversible before its natural expiry.
CREATE TABLE IF NOT EXISTS delegations (
  id                 SERIAL PRIMARY KEY,
  delegator_staff_id INTEGER NOT NULL REFERENCES staff(id),
  delegate_staff_id  INTEGER NOT NULL REFERENCES staff(id),
  role_code          TEXT NOT NULL REFERENCES roles(code),
  institution_id     INTEGER REFERENCES institutions(id),
  office_id          INTEGER REFERENCES offices(id),
  reason             TEXT NOT NULL,
  starts_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at            TIMESTAMPTZ NOT NULL,
  created_by         INTEGER REFERENCES staff(id),
  revoked_at         TIMESTAMPTZ,
  revoked_by         INTEGER REFERENCES staff(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

-- The Audit System's governance-event log — logins/failed-logins reuse
-- the existing auth_audit_log with actor_type = 'staff' (no schema
-- change needed there, since actor_type was always free text); this
-- table covers everything auth_audit_log was never meant to: role
-- grants/revocations, delegation lifecycle, record exports, and other
-- sensitive actions the Permission Engine gates on the X (Export)
-- permission or above. actor_staff_id is who DID the action;
-- target_staff_id is who it was done TO, where applicable (a role grant,
-- a delegation) — both nullable since not every event has both.
CREATE TABLE IF NOT EXISTS staff_audit_log (
  id               SERIAL PRIMARY KEY,
  actor_staff_id   INTEGER REFERENCES staff(id),
  event_type       TEXT NOT NULL, -- role_granted | role_revoked | delegation_created | delegation_revoked | record_export | sensitive_action
  target_type      TEXT,          -- staff | staff_role | delegation | <system-area code>
  target_id        INTEGER,
  reason           TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_audit_log_actor ON staff_audit_log (actor_staff_id, created_at DESC);

-- ============================================================
-- Account Creation Journey — Admissions Applications
-- ============================================================
-- The self-service registration answer to "Admissions Applicant
-- Account": rather than a second, disconnected applicant identity, an
-- application is simply owned by a guardian account (the same
-- identity that later becomes real Parent Portal access once a child
-- is admitted and enrolled) — see docs/account-creation-journey.md for
-- why this was chosen over a parallel auth system. status values are
-- an honest subset of the site's own published 12-stage admissions
-- process (Enquiry/Application/Assessment/Offer/Enrolment/Begin
-- Classes) — this table tracks the FIRST few stages a guardian can
-- meaningfully self-report and a staff member can review; it does not
-- claim to model exam scheduling, document verification detail, or
-- payment, none of which exist as real systems yet.
CREATE TABLE IF NOT EXISTS admissions_applications (
  id                    SERIAL PRIMARY KEY,
  guardian_id           INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  applicant_child_name  TEXT NOT NULL,
  institution_id        INTEGER REFERENCES institutions(id),
  desired_class         TEXT,
  notes                 TEXT,
  status                TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
                           'submitted', 'under_review', 'waitlisted', 'offered', 'admitted', 'declined', 'withdrawn'
                         )),
  reviewed_by_staff_id  INTEGER REFERENCES staff(id),
  decision_note         TEXT,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admissions_applications_guardian ON admissions_applications (guardian_id);
CREATE INDEX IF NOT EXISTS idx_admissions_applications_status ON admissions_applications (status);

-- ============================================================
-- Registrar's Office — real academic-lifecycle events
-- ============================================================
-- Replaces students.status as the ONLY trace of promotion, transfer,
-- withdrawal, and graduation (a flag with no date, reason, or approving
-- officer, per digital-institution-blueprint.md's own honest gap
-- analysis: "Workflows with NO digital trace at all"). This table is
-- that trace. students.status stays as the current-state summary field
-- (cheap to filter/join on); this table is the append-only history that
-- explains how it got there — never edited after the fact, only
-- appended to, matching the Archive-over-Delete discipline used
-- throughout this schema.
--
-- One table for six related event types (initial enrolment, promotion,
-- transfer, withdrawal, graduation, reinstatement), not six separate
-- tables — they share the same real shape (a student moves from one
-- placement to another, or out of the institution entirely, with a
-- reason and a deciding officer) and querying "this student's full
-- academic history" across all of them is the actual, common use case.
--
-- students.admission_no (already unique, already required) IS the
-- Institutional Student Number — no redundant new identifier is
-- introduced here.
CREATE TABLE IF NOT EXISTS student_lifecycle_events (
  id                   SERIAL PRIMARY KEY,
  student_id           INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type           TEXT NOT NULL CHECK (event_type IN ('enrolment', 'promotion', 'transfer', 'withdrawal', 'graduation', 'reinstatement')),
  from_class_id        INTEGER REFERENCES classes(id),
  to_class_id          INTEGER REFERENCES classes(id),
  reason               TEXT,
  effective_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  decided_by_staff_id  INTEGER REFERENCES staff(id),
  -- Joint sign-off per AC-02 ("Registrar decides; Principal co-signs
  -- promotion/probation") — nullable because not every event type
  -- requires it and this project doesn't yet enforce the co-sign as a
  -- hard gate (that's a real future tightening, not assumed here).
  approved_by_staff_id INTEGER REFERENCES staff(id),
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_lifecycle_events_student ON student_lifecycle_events (student_id, effective_date DESC);

-- Certificates register — same permanence pattern as ijazah_register
-- (ON DELETE SET NULL, frozen student_full_name, revoke-never-delete):
-- a certificate is a credential someone may need to prove decades
-- later, independent of whatever later happens to the live student
-- record. "Create" here means recording that a certificate was
-- issued, NOT generating the physical/PDF document — no document-
-- generation system exists anywhere in this project; certificate_type
-- is free text since no fixed taxonomy is published (AC-05 Certificate
-- Policy is Missing per the policy index). Public verification (an
-- unauthenticated lookup by reference_no) is explicitly deferred, same
-- as IQ-02 §7.5's still-deferred Ijazah verification endpoint — this
-- table's reference_no is ready for that whenever it's built.
-- approved_by_staff_id: real second-party sign-off, filled only when a
-- staff_approvals row is actually decided by a distinct PRIN-holding
-- staff member (functions/_lib/approvals.js) — replaces the old
-- approvedByStaffNo request field, which was never persisted here and
-- never verified against a real role or a real second person. See
-- docs/approval-workflow-architecture.md.
CREATE TABLE IF NOT EXISTS certificates (
  id                   SERIAL PRIMARY KEY,
  student_id           INTEGER REFERENCES students(id) ON DELETE SET NULL,
  student_full_name    TEXT NOT NULL,
  certificate_type     TEXT NOT NULL,
  reference_no         TEXT NOT NULL UNIQUE,
  issued_at            DATE NOT NULL,
  issued_by_staff_id   INTEGER REFERENCES staff(id),
  approved_by_staff_id INTEGER REFERENCES staff(id),
  revoked_at           TIMESTAMPTZ,
  revocation_note      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generic Approval Workflow (docs/approval-workflow-architecture.md) — a
-- real second-party sign-off, not a free-text field an endpoint trusts
-- blindly. An action the Matrix documents as requiring joint sign-off
-- (e.g. certificates: REG 'C', PRIN 'A' jointly) creates a pending row
-- here instead of executing immediately; functions/_lib/approvals.js's
-- decideApproval() only performs the real side effect once a staff
-- member who (a) actually holds the required approving permission and
-- (b) is not the same person who requested it, decides on it.
CREATE TABLE IF NOT EXISTS staff_approvals (
  id                    SERIAL PRIMARY KEY,
  area_code             TEXT NOT NULL,      -- matches a permission-matrix.js area key, e.g. 'certificates'
  target_type           TEXT NOT NULL,      -- e.g. 'certificate_issue'
  payload               JSONB NOT NULL,     -- the action's own parameters, so approval can actually perform it
  requested_by_staff_id INTEGER NOT NULL REFERENCES staff(id),
  approver_role_code    TEXT NOT NULL REFERENCES roles(code),
  institution_id        INTEGER REFERENCES institutions(id), -- scope, when the approver role is institution-scoped
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by_staff_id   INTEGER REFERENCES staff(id),
  decision_note         TEXT,
  result_ref            TEXT,               -- e.g. the certificate's reference_no, once the approved action executes
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_staff_approvals_pending ON staff_approvals (area_code, status, institution_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates (student_id);

-- Teacher Identity & Academic Workforce Activation — the missing piece
-- Migration Phases A and B both surfaced independently
-- (docs/identity-migration-plan.md): the Matrix grants TCH "own class,
-- own period" on attendance and "own subject/class" on assessments, but
-- until now nothing in this schema could answer "which classes/subjects
-- does this teacher actually teach?" — so those scopes were unenforceable
-- by any endpoint, and no Teacher account has ever been provisioned.
--
-- One row per (staff, class[, subject]) grant, mirroring staff_roles's
-- revoke-never-delete pattern (revoked_at set, row kept for history).
-- Two distinct grant shapes, matching the Matrix's own split:
--   subject IS NULL, is_class_teacher = true  -> Class Teacher: whole-
--     class attendance authority (Create/Edit on attendance_summary).
--   subject IS NOT NULL, is_class_teacher = false -> Subject Teacher:
--     per-subject assessment authority (Create/Edit on term_results for
--     that subject only, within that class).
-- A person can hold both kinds of row for the same class (a Form
-- Teacher who also teaches Mathematics to their own form is one real,
-- common case), and multiple subject rows across different classes.
-- No UNIQUE constraint: Postgres treats each NULL subject as distinct,
-- so a naive UNIQUE(staff_id, class_id, subject) would not actually
-- prevent duplicate Class Teacher rows — the admin endpoint that writes
-- these checks for an existing active row itself instead.
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id                   SERIAL PRIMARY KEY,
  staff_id             INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  class_id             INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject              TEXT,
  is_class_teacher     BOOLEAN NOT NULL DEFAULT false,
  assigned_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by_staff_id INTEGER REFERENCES staff(id),
  revoked_at           TIMESTAMPTZ,
  revoked_by_staff_id  INTEGER REFERENCES staff(id)
);
CREATE INDEX IF NOT EXISTS idx_tca_staff_active ON teacher_class_assignments (staff_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tca_class_active ON teacher_class_assignments (class_id) WHERE revoked_at IS NULL;

-- Institutional Identity Profile (Phase 1A of the Imperial Digital
-- Identity & Onboarding Directive) — expands the four-field self-
-- service registration into a real, multi-section institutional
-- profile, per docs/imperial-identity-onboarding-reality-check.md's
-- Phase 1 scope: everything buildable without a KYC/OTP vendor
-- decision. Deliberately additive columns on `guardians` rather than a
-- side table — this is the same entity, just with more of it filled
-- in over time, and every field here is optional (profile_completion
-- is a read-time computation, not a gate on using the account).
--
-- `state_of_origin` (Personal Details) and `residential_state`
-- (Residential Profile) are kept as two distinct columns rather than
-- one shared `state` field — a guardian's state of origin and their
-- current residential state are frequently different in Nigeria, and
-- collapsing them would silently lose one. "Country of Residence"
-- covers the concept the directive separately listed as "Country"
-- under Residential Profile — one column, not two identical ones.
-- "Confirm Email"/"Confirm Password" are registration-form-only
-- client+server validations, never persisted as their own columns.
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS identity_type TEXT NOT NULL DEFAULT 'parent_guardian'
  CHECK (identity_type IN ('parent_guardian', 'applicant', 'sponsor', 'alumni', 'staff_member', 'educational_partner'));
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS secondary_email TEXT;
-- Mobile verification is a real, separate future gate (SMS/WhatsApp
-- OTP via a provider — Twilio is the concrete option named in the
-- reality-check doc) — this column exists now so the dashboard's
-- Verification Status Panel has something real to read, honestly
-- always NULL/unverified until that provider is actually wired up.
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS mobile_verified_at TIMESTAMPTZ;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS state_of_origin TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS local_government_area TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS country_of_residence TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS residential_city TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS residential_state TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS employer TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS position_title TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS number_of_children INTEGER;
-- Marks seeded sample/testing records so they can be excluded from
-- real institutional counts (Founder Dashboard) and flagged in staff-
-- facing search results, without any record's NAME or ID needing to
-- say "Demo" — see setup.js's seed block and founder/dashboard.js.
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS is_sample_data BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_sample_data BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_sample_data BOOLEAN NOT NULL DEFAULT false;

-- Two mandatory emergency contacts per the directive, modelled as a
-- table (not two pairs of columns) so a guardian can hold more than
-- two if the school later wants that, without another migration.
CREATE TABLE IF NOT EXISTS guardian_emergency_contacts (
  id            SERIAL PRIMARY KEY,
  guardian_id   INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  contact_order INTEGER NOT NULL DEFAULT 1,
  full_name     TEXT NOT NULL,
  relationship  TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guardian_emergency_contacts_guardian ON guardian_emergency_contacts (guardian_id);

-- Multi-select educational interests. institution_key is a fixed,
-- code-defined set (see functions/_lib/educational-interests.js) —
-- Online/Weekend/Summer Programmes are included as interest signals
-- per the directive, even though they are not yet real published
-- offerings (see the reality-check doc's Stage 8 note); this table
-- doesn't distinguish "real programme" from "expressed interest,"
-- which is honestly what it is either way.
CREATE TABLE IF NOT EXISTS guardian_educational_interests (
  guardian_id     INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  institution_key TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guardian_id, institution_key)
);

-- Email OTP (MFA). Guardians already have a mandatory email (self-
-- registration/admin creation both require one), so OTP applies to
-- every guardian login unconditionally. Students and staff are
-- institution-issued accounts with no email field at all until now —
-- these two columns are optional additions; OTP only activates for a
-- given student/staff account once ICT enters an email for them (see
-- login.js/student/login.js/staff/login.js's conditional branch). No
-- one is locked out by adding this: accounts without an email on file
-- keep signing in exactly as before.
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT;

-- One row per in-flight two-step login (password verified, code not
-- yet entered). login_token is a high-entropy random value (same
-- convention as reset_token/verification_token elsewhere in this
-- schema — plaintext is fine given the entropy), looked up directly;
-- code_hash protects the low-entropy 6-digit code specifically, since
-- that's the piece worth defending even against a DB-read-only
-- compromise. attempts enforces a hard cap independent of the code's
-- own entropy. actor_type/actor_id is the same polymorphic
-- soft-reference pattern as auth_audit_log — one shared table serving
-- all three login flows (guardian/student/staff) rather than three
-- near-identical ones, since the verification logic is identical.
CREATE TABLE IF NOT EXISTS login_otp_codes (
  id           SERIAL PRIMARY KEY,
  actor_type   TEXT NOT NULL CHECK (actor_type IN ('guardian', 'student', 'staff')),
  actor_id     INTEGER NOT NULL,
  login_token  TEXT NOT NULL UNIQUE,
  code_hash    TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk-based "trusted device" — a real, working slice of the
-- directive's 5-level identity model (Level 3), scoped honestly: this
-- is a signed cookie proving "this browser already completed OTP on
-- this account recently," NOT canvas/behavioral device fingerprinting
-- or a risk-scoring engine (both real future work, not built here).
-- trust_version is the revocation mechanism for a stateless cookie
-- token that can't otherwise be invalidated server-side: bumping it
-- (on password change — see set-password.js/change-password.js and
-- their student/staff equivalents) makes every previously-issued
-- trusted-device cookie for that account fail its version check on
-- next use, forcing a fresh OTP the next login — i.e. a real "security
-- event revokes trust" control, not just documentation of the gap.
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS trust_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE students ADD COLUMN IF NOT EXISTS trust_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS trust_version INTEGER NOT NULL DEFAULT 1;

-- Dual-method email verification: registration/resend-verification now
-- emails BOTH a one-click link (verification_token, existing) AND a
-- typed 6-digit code, sharing the same verification_token_expires
-- (they're generated together and expire together — one verification
-- event, two ways to complete it). code_hash mirrors login_otp_codes'
-- reasoning (protect the low-entropy code even against a DB-read-only
-- compromise); attempts caps guessing independently of the link, which
-- stays valid even if the code's attempts are exhausted.
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS verification_code_hash TEXT;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS verification_code_attempts INTEGER NOT NULL DEFAULT 0;

-- Institutional Onboarding Wizard: the 100%-completion celebration
-- screen fires once, the first time a guardian's profile reaches full
-- completion — this timestamp is the guard against replaying it on
-- every subsequent login. NULL = not shown yet.
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS onboarding_celebration_shown_at TIMESTAMPTZ;

-- Digital Identity System (Imperial Digital Campus Directive, Priority
-- 2): every student/guardian/staff record gets one public, QR-
-- verifiable identity number — SHR-STU-<year>-<seq>, SHR-PAR-...,
-- SHR-STF-... — generated lazily the first time that person's "My ID
-- Card" view is opened (functions/_lib/identity-no.js), not backfilled
-- in bulk here, so a school with years of existing records doesn't need
-- a migration script before this feature works. Nullable until then.
ALTER TABLE students ADD COLUMN IF NOT EXISTS identity_no TEXT UNIQUE;
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS identity_no TEXT UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS identity_no TEXT UNIQUE;

-- ============================================================
-- Finance Platform (Imperial Digital Campus Directive, Priority 3)
-- ============================================================
-- Replaces the single `fee_status` snapshot (kept above, unchanged, for
-- backward compatibility with three existing read-only dashboard
-- displays) with a real invoice/receipt ledger. Everything here is
-- gated by the SAME `finance` permission area FIN/EXE already hold in
-- functions/_lib/permission-matrix.js (added during Migration Phase C)
-- — no new role or permission grant is introduced. See
-- docs/finance-platform.md for what shipped vs. what's still deferred
-- (a real payment gateway; an EXE approval workflow for scholarships,
-- which the Matrix itself already flags as "no policy exists yet to
-- route this through"; a FIN staff account, which still has never been
-- assigned to a real person — a governance/HR action, not a code gap).

-- Per-institution (and optionally per-class) fee templates. A Finance
-- Officer builds an invoice by picking which of these apply, rather
-- than typing amounts from memory each time — the same "template, not
-- freeform" principle as certificate types.
-- class_label is free TEXT, not a foreign key to classes(id) — matching
-- the existing classes.institution convention (see the comment above
-- the classes table) — because a fee structure often needs to exist
-- before a matching class row does, and because a fee schedule
-- realistically applies to "SSS 1" across the school, not one specific
-- class instance. student_category exists because the four real fee
-- schedules used to seed this table below (supplied directly by the
-- school, Nov 2025) turned out to be two genuinely different bill
-- shapes — a comprehensive per-term "boarder" bill and a simpler
-- one-time "new_entrant" onboarding package — not one bill with
-- variables. More categories (e.g. a day-student recurring bill) can
-- be added the moment the school supplies that schedule; none is
-- invented here.
CREATE TABLE IF NOT EXISTS fee_structures (
  id                SERIAL PRIMARY KEY,
  institution_id    INTEGER NOT NULL REFERENCES institutions(id),
  class_label       TEXT NOT NULL DEFAULT '', -- '' = applies institution-wide; part of the uniqueness key below so it can't be left NULL (NULL wouldn't collide in a UNIQUE constraint)
  student_category  TEXT NOT NULL DEFAULT 'boarder' CHECK (student_category IN ('boarder', 'new_entrant')),
  fee_type          TEXT NOT NULL, -- registration | tuition | feeding_accommodation | first_aid | educational_resources | development_fee | school_uniform | sportwear | hostel_wear | friday_wear | textbooks | hijab | custom
  label             TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  applicable_gender TEXT, -- NULL = applies to all students; 'female' for female-only items (e.g. hijab)
  is_recurring      BOOLEAN NOT NULL DEFAULT true, -- true = billed most/every term (tuition, feeding); false = one-time onboarding cost (registration, uniforms, textbooks)
  is_active         BOOLEAN NOT NULL DEFAULT true,
  notes             TEXT,
  created_by_staff_id INTEGER REFERENCES staff(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, class_label, student_category, fee_type)
);

-- One invoice per student per term (a school may issue more than one
-- if a mid-term charge is needed — no UNIQUE constraint forces
-- one-per-term the way fee_status did, since a real ledger must allow
-- that). invoice_no is the public-facing, staff-quoted reference,
-- generated by functions/_lib/finance-no.js exactly like certificate
-- reference numbers — auto-generated, never staff-invented, so
-- numbering stays consistent school-wide.
CREATE TABLE IF NOT EXISTS invoices (
  id                  SERIAL PRIMARY KEY,
  invoice_no          TEXT NOT NULL UNIQUE,
  student_id          INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  institution_id      INTEGER NOT NULL REFERENCES institutions(id),
  term                TEXT NOT NULL,
  student_category    TEXT, -- informational: which fee_structures category this was built from, if any
  due_date            DATE,
  status              TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled')),
  subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
  scholarship_discount NUMERIC(12,2) NOT NULL DEFAULT 0, -- snapshot of the discount applied AT ISSUANCE — deliberately not recomputed later if the scholarship changes, so a printed invoice never silently disagrees with itself
  total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0, -- subtotal - scholarship_discount
  notes               TEXT,
  created_by_staff_id INTEGER REFERENCES staff(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at        TIMESTAMPTZ,
  cancellation_note   TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Line items on an invoice. source_fee_structure_id is nullable so a
-- Finance Officer can still add a genuinely custom one-off charge
-- (e.g. a damaged-textbook replacement) without needing a fee
-- structure template to exist for it first.
CREATE TABLE IF NOT EXISTS invoice_items (
  id                     SERIAL PRIMARY KEY,
  invoice_id             INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  fee_type               TEXT NOT NULL,
  label                  TEXT NOT NULL,
  amount                 NUMERIC(12,2) NOT NULL,
  source_fee_structure_id INTEGER REFERENCES fee_structures(id)
);

-- A payment recorded against an invoice. receipt_no doubles as the
-- public verification key — same reasoning as certificates'
-- reference_no: staff-assigned only, never self-service, so nothing
-- here lets a stranger register a fake receipt, and the fields a
-- receipt proves (amount, date, invoice reference, status) are exactly
-- what's meant to be shown to whoever is asking "is this receipt
-- real?". payment_method is deliberately limited to offline/manual
-- methods — no payment gateway integration exists yet (no processor
-- credentials are configured), so every receipt here records a payment
-- the school already received by another channel and is now logging,
-- not a live checkout.
CREATE TABLE IF NOT EXISTS receipts (
  id                  SERIAL PRIMARY KEY,
  receipt_no          TEXT NOT NULL UNIQUE,
  invoice_id          INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount              NUMERIC(12,2) NOT NULL,
  payment_method      TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'pos', 'other')),
  paid_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by_staff_id INTEGER REFERENCES staff(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at          TIMESTAMPTZ,
  revocation_note     TEXT
);

CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON receipts(invoice_id);

-- Scholarships/discounts. discount_percent and discount_amount are
-- both nullable and mutually exclusive in practice (the granting
-- endpoint requires exactly one) — percent for "50% off tuition",
-- fixed amount for "sponsor covers ₦200,000". term = NULL means the
-- scholarship applies to every future invoice until explicitly revoked
-- (a full/ongoing scholarship); a specific term value means it was
-- granted for that term only. Granting a scholarship does NOT
-- retroactively change any invoice already issued — it only affects
-- invoices created from this point on, since an invoice's discount is
-- a snapshot (see invoices.scholarship_discount above).
CREATE TABLE IF NOT EXISTS scholarships (
  id                  SERIAL PRIMARY KEY,
  student_id          INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  scholarship_type    TEXT NOT NULL CHECK (scholarship_type IN ('full', 'partial', 'sponsored')),
  discount_percent    NUMERIC(5,2),
  discount_amount     NUMERIC(12,2),
  sponsor_name        TEXT,
  term                TEXT, -- NULL = ongoing until revoked
  notes               TEXT,
  granted_by_staff_id INTEGER REFERENCES staff(id),
  granted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  revoked_at          TIMESTAMPTZ,
  revocation_note     TEXT
);

CREATE INDEX IF NOT EXISTS idx_scholarships_student ON scholarships(student_id);

-- One instalment plan per invoice. Recording a payment against an
-- instalment (via receipts, linked back through payment_plan_installments.paid_receipt_id)
-- is a manual Finance Officer action, not automatic reconciliation —
-- there is no payment gateway to auto-detect which instalment a
-- transfer was meant to cover.
CREATE TABLE IF NOT EXISTS payment_plans (
  id                  SERIAL PRIMARY KEY,
  invoice_id          INTEGER NOT NULL UNIQUE REFERENCES invoices(id) ON DELETE CASCADE,
  plan_type           TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'termly', 'custom')),
  installment_count   INTEGER NOT NULL,
  created_by_staff_id INTEGER REFERENCES staff(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id                SERIAL PRIMARY KEY,
  payment_plan_id   INTEGER NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  sequence          INTEGER NOT NULL,
  due_date          DATE NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_receipt_id   INTEGER REFERENCES receipts(id),
  UNIQUE (payment_plan_id, sequence)
);

-- Footer newsletter signup (Header & Footer Master Directive, Section 8).
-- Deliberately minimal: this school has no bulk-email sending system to
-- pair it with (Resend is wired for transactional auth/receipt emails
-- only, per docs/email-*.md) — this table exists so a real subscriber
-- list is being collected honestly from day one, not so an email goes
-- out; sending real newsletters is future work once that need is real.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
