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
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS phone TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS registration_source TEXT NOT NULL DEFAULT 'admin_created'`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS verification_token TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ`,
  `DO $$ BEGIN
    ALTER TABLE guardians ADD CONSTRAINT guardians_registration_source_check CHECK (registration_source IN ('admin_created', 'self_service'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,

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
  // A UNIQUE constraint's auto-generated backing index can collide
  // under either duplicate_object (42710) or duplicate_table (42P07)
  // depending on Postgres's internal check order — confirmed by actually
  // re-running this endpoint against an already-set-up database, which
  // raised duplicate_table and was NOT caught by `WHEN duplicate_object`
  // alone, breaking the "safe to run again" guarantee this file's header
  // comment makes. Both must be caught.
  `DO $$ BEGIN
    ALTER TABLE classes ADD CONSTRAINT classes_institution_name_key UNIQUE (institution, name);
  EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
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
  EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
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
  // Premium event card additive upgrade (RSVP counter + post-event
  // gallery) — see the Intelligent Campus Directive follow-up.
  `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS rsvp_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS gallery_images JSONB`,

  // SHRS Marketplace catalog architecture — see
  // docs/shrs-intelligent-campus-roadmap.md for why there's no
  // payment/checkout column.
  `CREATE TABLE IF NOT EXISTS marketplace_products (
    id            SERIAL PRIMARY KEY,
    category      TEXT NOT NULL CHECK (category IN (
                     'textbooks', 'exercise_books', 'uniforms', 'bags', 'stationery',
                     'quran_materials', 'arabic_materials', 'islamic_studies_materials',
                     'digital_products', 'shrs_publications', 'grammar_books', 'curriculum_materials'
                   )),
    name          TEXT NOT NULL,
    description   TEXT,
    price_naira   NUMERIC(12,2),
    image_url     TEXT,
    is_available  BOOLEAN NOT NULL DEFAULT true,
    status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_products_status_category ON marketplace_products (status, category)`,

  // SHRS Identity & Access Platform — see docs/staff-identity-architecture.md.
  `CREATE TABLE IF NOT EXISTS institutions (
    id        SERIAL PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS campuses (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    is_active  BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS offices (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL UNIQUE,
    office_type      TEXT NOT NULL CHECK (office_type IN ('governance', 'executive', 'academic', 'support')),
    institution_id   INTEGER REFERENCES institutions(id),
    parent_office_id INTEGER REFERENCES offices(id),
    description      TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS departments (
    id             SERIAL PRIMARY KEY,
    name           TEXT NOT NULL,
    institution_id INTEGER REFERENCES institutions(id),
    office_id      INTEGER REFERENCES offices(id),
    is_active      BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS roles (
    code               TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    status             TEXT NOT NULL CHECK (status IN ('established', 'proposed')),
    scope_description  TEXT,
    source_note        TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS staff (
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
  )`,
  `CREATE TABLE IF NOT EXISTS staff_institutions (
    staff_id       INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL REFERENCES institutions(id),
    is_primary     BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (staff_id, institution_id)
  )`,
  `CREATE TABLE IF NOT EXISTS staff_roles (
    id             SERIAL PRIMARY KEY,
    staff_id       INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    role_code      TEXT NOT NULL REFERENCES roles(code),
    institution_id INTEGER REFERENCES institutions(id),
    office_id      INTEGER REFERENCES offices(id),
    granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by     INTEGER REFERENCES staff(id),
    is_active      BOOLEAN NOT NULL DEFAULT true,
    revoked_at     TIMESTAMPTZ,
    revoked_by     INTEGER REFERENCES staff(id)
  )`,
  `CREATE TABLE IF NOT EXISTS staff_accounts (
    staff_id            INTEGER PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
    password_hash       TEXT,
    password_salt       TEXT,
    failed_attempts     INTEGER NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    reset_token         TEXT,
    reset_token_expires TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS delegations (
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
  )`,
  `CREATE TABLE IF NOT EXISTS staff_audit_log (
    id               SERIAL PRIMARY KEY,
    actor_staff_id   INTEGER REFERENCES staff(id),
    event_type       TEXT NOT NULL,
    target_type      TEXT,
    target_id        INTEGER,
    reason           TEXT,
    metadata         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_staff_audit_log_actor ON staff_audit_log (actor_staff_id, created_at DESC)`,

  // Reference/structural data only — real institution and role facts
  // already public in governance docs and on the live site, safe to
  // seed idempotently like academic_terms/classes. Deliberately NOT
  // seeding `staff` rows for real named individuals here — that's an
  // explicit admin action (see docs/staff-identity-architecture.md),
  // the same "admin enters real data on purpose" convention already
  // used for guardians/students, never auto-created by this endpoint.
  `INSERT INTO institutions (name) VALUES
    ('Nursery & Primary'), ('Royal College'), ('Islamic & Arabic Studies'), ('Qur''an College')
    ON CONFLICT (name) DO NOTHING`,
  `INSERT INTO campuses (name, is_primary) VALUES ('Main Campus — Ikorodu', true) ON CONFLICT (name) DO NOTHING`,
  `INSERT INTO roles (code, name, status, scope_description, source_note) VALUES
    ('EXE', 'CEO / Executive Leadership', 'established', 'All institutions', 'GV-01; Founder/CEO Zakariya Olanrewaju Anofi'),
    ('PRIN', 'Principal / Head Teacher', 'established', 'Own institution', 'GV-01 (per-institution)'),
    ('VP', 'Vice Principal', 'proposed', 'Own institution, mirrors Principal minus final approval authority', 'Not yet documented'),
    ('REG', 'Registrar', 'established', 'All institutions (academic records are institution-wide)', 'AC-02, PA-05; Mrs. Anofi-Abdulkareem Mariam Tope'),
    ('AREG', 'Assistant Registrar', 'proposed', 'Delegated subset of Registrar''s scope', 'Not yet documented'),
    ('ADM', 'Admissions Officer', 'proposed', 'All institutions, pre-enrolment only', 'PA-05 describes the process; no standing officer role documented yet'),
    ('FIN', 'Finance Officer', 'proposed', 'All institutions', 'FN-01 establishes the principle; no officer role documented'),
    ('TCH', 'Teacher', 'proposed', 'Own assigned classes/subjects only', 'Institution-agnostic'),
    ('MUH', 'Muhaffiz / Muhaffizah', 'proposed', 'Own assigned Hifz students only', 'IQ-01, IQ-02'),
    ('ARB', 'Islamic & Arabic Studies Instructor', 'proposed', 'Own assigned classes, School of Islamic & Arabic Studies', 'Mirrors TCH scope for that division'),
    ('QC-OFF', 'Qur''an College Officer', 'proposed', 'Qur''an College institution-wide', 'Institution-level oversight above individual Muhaffiz assignments'),
    ('SA', 'Student Affairs Officer', 'proposed', 'All institutions', 'SD-05/06/07 Missing/Partial — role and governing policy should arrive together'),
    ('BRD', 'Boarding Officer', 'proposed', 'Boarding students only', 'SD-04 published; no digital officer role yet'),
    ('ICT', 'ICT Administrator', 'proposed', 'All institutions, system-level', 'IT-06 names an ICT Head EMT member — this is that person''s operational tier'),
    ('SYSADMIN', 'System Administrator', 'proposed', 'Everything, technical only — one account, tightly held', 'The single highest-privilege technical role'),
    ('DSL', 'Designated Safeguarding Lead', 'established', 'All institutions, safeguarding-relevant fields only', 'SW-02 — role defined, not yet appointed')
    ON CONFLICT (code) DO NOTHING`,
  `INSERT INTO offices (name, office_type, description) VALUES
    ('Board of Trustees', 'governance', 'The institution''s ultimate governing body (GV-01) — 4 members, composition not individually published.'),
    ('Registrar''s Office', 'academic', 'Owns admissions verification, enrolment, results, transcripts, and certificates across all four institutions (AC-02, PA-05).'),
    ('Finance Office', 'support', 'Owns fee records across all institutions (FN-01) — no write workflow built yet pending FN-03/04/05.'),
    ('ICT Office', 'support', 'Owns system accounts, access logs, and the Acceptable Use / AI Usage policies (IT-03, IT-05).')
    ON CONFLICT (name) DO NOTHING`,

  // Account Creation Journey — Admissions Applications
  `CREATE TABLE IF NOT EXISTS admissions_applications (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_admissions_applications_guardian ON admissions_applications (guardian_id)`,
  `CREATE INDEX IF NOT EXISTS idx_admissions_applications_status ON admissions_applications (status)`,

  // Registrar's Office — real academic-lifecycle events
  `CREATE TABLE IF NOT EXISTS student_lifecycle_events (
    id                   SERIAL PRIMARY KEY,
    student_id           INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    event_type           TEXT NOT NULL CHECK (event_type IN ('enrolment', 'promotion', 'transfer', 'withdrawal', 'graduation', 'reinstatement')),
    from_class_id        INTEGER REFERENCES classes(id),
    to_class_id          INTEGER REFERENCES classes(id),
    reason               TEXT,
    effective_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    decided_by_staff_id  INTEGER REFERENCES staff(id),
    approved_by_staff_id INTEGER REFERENCES staff(id),
    metadata             JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_student_lifecycle_events_student ON student_lifecycle_events (student_id, effective_date DESC)`,
  `CREATE TABLE IF NOT EXISTS certificates (
    id                 SERIAL PRIMARY KEY,
    student_id         INTEGER REFERENCES students(id) ON DELETE SET NULL,
    student_full_name  TEXT NOT NULL,
    certificate_type   TEXT NOT NULL,
    reference_no       TEXT NOT NULL UNIQUE,
    issued_at          DATE NOT NULL,
    issued_by_staff_id INTEGER REFERENCES staff(id),
    revoked_at         TIMESTAMPTZ,
    revocation_note    TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates (student_id)`,

  // Teacher Identity & Academic Workforce Activation — see the commented
  // version of this table in sql/schema.sql for why it exists (the
  // "which classes/subjects does this teacher teach" gap Migration
  // Phases A and B both surfaced).
  `CREATE TABLE IF NOT EXISTS teacher_class_assignments (
    id                   SERIAL PRIMARY KEY,
    staff_id             INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    class_id             INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject              TEXT,
    is_class_teacher     BOOLEAN NOT NULL DEFAULT false,
    assigned_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by_staff_id INTEGER REFERENCES staff(id),
    revoked_at           TIMESTAMPTZ,
    revoked_by_staff_id  INTEGER REFERENCES staff(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tca_staff_active ON teacher_class_assignments (staff_id) WHERE revoked_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_tca_class_active ON teacher_class_assignments (class_id) WHERE revoked_at IS NULL`,

  // Institutional Identity Profile (Phase 1A) — see the commented
  // version of these statements in sql/schema.sql for why each exists.
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS identity_type TEXT NOT NULL DEFAULT 'parent_guardian'`,
  `DO $$ BEGIN
    ALTER TABLE guardians ADD CONSTRAINT guardians_identity_type_check CHECK (identity_type IN ('parent_guardian', 'applicant', 'sponsor', 'alumni', 'staff_member', 'educational_partner'));
  EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
  END $$`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS whatsapp_number TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS secondary_phone TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS secondary_email TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS mobile_verified_at TIMESTAMPTZ`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS title TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS preferred_name TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS gender TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS date_of_birth DATE`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS nationality TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS state_of_origin TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS local_government_area TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS country_of_residence TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS residential_address TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS residential_city TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS residential_state TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS postal_code TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS occupation TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS employer TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS position_title TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS business_name TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS industry TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS marital_status TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS number_of_children INTEGER`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS is_sample_data BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS is_sample_data BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_sample_data BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS is_sample_data BOOLEAN NOT NULL DEFAULT false`,

  `CREATE TABLE IF NOT EXISTS guardian_emergency_contacts (
    id            SERIAL PRIMARY KEY,
    guardian_id   INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    contact_order INTEGER NOT NULL DEFAULT 1,
    full_name     TEXT NOT NULL,
    relationship  TEXT NOT NULL,
    phone         TEXT NOT NULL,
    email         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_guardian_emergency_contacts_guardian ON guardian_emergency_contacts (guardian_id)`,

  `CREATE TABLE IF NOT EXISTS guardian_educational_interests (
    guardian_id     INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    institution_key TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (guardian_id, institution_key)
  )`,

  `ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT`,
  `CREATE TABLE IF NOT EXISTS login_otp_codes (
    id           SERIAL PRIMARY KEY,
    actor_type   TEXT NOT NULL CHECK (actor_type IN ('guardian', 'student', 'staff')),
    actor_id     INTEGER NOT NULL,
    login_token  TEXT NOT NULL UNIQUE,
    code_hash    TEXT NOT NULL,
    attempts     INTEGER NOT NULL DEFAULT 0,
    expires_at   TIMESTAMPTZ NOT NULL,
    consumed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS trust_version INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS trust_version INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS trust_version INTEGER NOT NULL DEFAULT 1`,

  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS verification_code_hash TEXT`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS verification_code_attempts INTEGER NOT NULL DEFAULT 0`,

  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS onboarding_celebration_shown_at TIMESTAMPTZ`,
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
    // Batched via sql.transaction(), not one sql() call per statement: Neon's
    // HTTP driver fires one fetch (one Cloudflare Worker subrequest) per
    // query, and STATEMENTS is long enough (~90 entries) to exceed the
    // platform's per-invocation subrequest limit if run one at a time.
    // transaction() bundles a whole batch into a single fetch/subrequest,
    // and — since every statement here is transactional DDL (CREATE TABLE/
    // INDEX IF NOT EXISTS) — batching is also strictly safer than the old
    // one-by-one loop: a batch either fully applies or fully rolls back.
    const BATCH_SIZE = 25;
    for (let i = 0; i < STATEMENTS.length; i += BATCH_SIZE) {
      const batch = STATEMENTS.slice(i, i + BATCH_SIZE);
      await sql.transaction(batch.map((s) => sql(s)));
    }

    let demoSeeded = false;
    if (env.PORTAL_DEMO_PASSWORD) {
      const existing = await sql`SELECT id FROM guardians WHERE email = 'demo@shroyalschools.ng'`;
      if (existing.rows.length === 0) {
        // Sample Institutional Records: this login credential
        // (demo@shroyalschools.ng) is an admin-configured operational
        // account for trying the portal end-to-end — it is not itself a
        // rendered institutional record. The NAMES and IDs below are,
        // though, so they read like real SHRS records (not "Demo ...")
        // and are marked via is_sample_data = true rather than by
        // embedding "sample"/"demo" in the display string. Every table
        // this block writes to filters is_sample_data = false on the
        // Founder Dashboard and elsewhere real institutional numbers are
        // reported, so these rows never inflate a real count.
        const { hash, salt } = hashPassword(env.PORTAL_DEMO_PASSWORD);
        const guardian = await sql`
          INSERT INTO guardians (full_name, email, password_hash, password_salt, is_sample_data)
          VALUES ('Amina Sani Bello', 'demo@shroyalschools.ng', ${hash}, ${salt}, true)
          RETURNING id`;
        const guardianId = guardian.rows[0].id;

        const cls = await sql`INSERT INTO classes (institution, name) VALUES ('Royal College', 'JSS 1') RETURNING id`;
        const classId = cls.rows[0].id;

        const student = await sql`
          INSERT INTO students (full_name, admission_no, class_id, status, is_sample_data)
          VALUES ('Abdullahi Sani Bello', 'SHR-2026-901', ${classId}, 'active', true)
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

        // A second sample child, at Qur'an College, with a Student Portal
        // login and sample Hifz progress — so the Student Portal + Hifz
        // Tracker can be tried end-to-end without hand-calling the admin
        // API. Linked to the same sample guardian so the guardian
        // dashboard also shows a Hifz snapshot alongside the first child.
        const qCls = await sql`INSERT INTO classes (institution, name) VALUES (${"Qur'an College"}, 'Hifz Year 2') RETURNING id`;
        const qClassId = qCls.rows[0].id;
        const qStudent = await sql`
          INSERT INTO students (full_name, admission_no, class_id, status, is_sample_data)
          VALUES ('Fatima Sani Bello', 'SHR-2026-902', ${qClassId}, 'active', true)
          RETURNING id`;
        const qStudentId = qStudent.rows[0].id;
        await sql`INSERT INTO student_classes (student_id, class_id, is_primary) VALUES (${qStudentId}, ${qClassId}, true)`;
        await sql`INSERT INTO guardian_student (guardian_id, student_id) VALUES (${guardianId}, ${qStudentId})`;

        // Dual enrolment demo: this same student is also enrolled in
        // Islamic & Arabic Studies, alongside their primary Qur'an
        // College programme — exactly the "belongs to more than one
        // programme at once" case the Student Portal needs to support.
        const arCls = await sql`INSERT INTO classes (institution, name) VALUES ('Islamic & Arabic Studies', 'Iʿdādiyyah 1') RETURNING id`;
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

        // Sample Teacher (Teacher Identity & Academic Workforce Activation)
        // — a real, working TCH account so the Teacher Portal can be
        // tried end-to-end without hand-calling admin/staff.js. Assigned
        // as Class Teacher (attendance) and Mathematics Subject Teacher
        // for the same 'JSS 1' class the first sample student
        // (Abdullahi Sani Bello, SHR-2026-901) belongs to, so logging in
        // as this teacher shows a real roster with the attendance/result
        // rows already seeded above.
        const royalCollegeId = (await sql`SELECT id FROM institutions WHERE name = 'Royal College'`).rows[0].id;
        const demoStaff = await sql`
          INSERT INTO staff (staff_no, full_name, position_title, institution_id, status, is_sample_data)
          VALUES ('SHR-STF-0901', 'Ibrahim Yusuf Garba', 'Class Teacher, JSS 1', ${royalCollegeId}, 'active', true)
          RETURNING id`;
        const demoStaffId = demoStaff.rows[0].id;
        await sql`INSERT INTO staff_institutions (staff_id, institution_id, is_primary) VALUES (${demoStaffId}, ${royalCollegeId}, true)`;
        const { hash: tHash, salt: tSalt } = hashPassword(env.PORTAL_DEMO_PASSWORD);
        await sql`INSERT INTO staff_accounts (staff_id, password_hash, password_salt) VALUES (${demoStaffId}, ${tHash}, ${tSalt})`;
        await sql`INSERT INTO staff_roles (staff_id, role_code, institution_id) VALUES (${demoStaffId}, 'TCH', ${royalCollegeId})`;
        await sql`
          INSERT INTO teacher_class_assignments (staff_id, class_id, subject, is_class_teacher)
          VALUES (${demoStaffId}, ${classId}, NULL, true)`;
        await sql`
          INSERT INTO teacher_class_assignments (staff_id, class_id, subject, is_class_teacher)
          VALUES (${demoStaffId}, ${classId}, 'Mathematics', false)`;

        demoSeeded = true;
      }
    }

    // Marketplace sample listings — unconditional (not gated behind
    // PORTAL_DEMO_PASSWORD like the guardian/student fixtures above),
    // because the point is a non-empty *public* storefront, not an
    // internal demo login. Only seeds once: if any row already exists
    // (real or sample), this is skipped entirely so it never overwrites
    // what staff have since entered. Prices are illustrative and marked
    // is_sample_data = true — the Bookshop should confirm real pricing
    // and stock, then either edit these in place or archive them and add
    // real listings alongside.
    let marketplaceSeeded = false;
    const existingProducts = await sql`SELECT id FROM marketplace_products LIMIT 1`;
    if (existingProducts.rows.length === 0) {
      const sampleProducts = [
        ['textbooks', 'Nigerian Primary Mathematics — Basic 4', 'Core mathematics textbook aligned with the Nigerian primary curriculum.', 3500],
        ['exercise_books', 'A5 Exercise Book (Pack of 5)', '40-leaf ruled exercise books, school-standard size.', 1500],
        ['uniforms', 'Royal College Uniform Set (Junior)', 'Shirt, trousers/pinafore, and tie in the school colours.', 15000],
        ['bags', 'SHRS Backpack (Standard)', 'Durable school backpack with the SHRS crest.', 8000],
        ['stationery', 'Geometry Set', 'Ruler, compass, protractor, and set squares in a case.', 1200],
        ['quran_materials', "Tajweed Mushaf — Pocket Size", 'Uthmani-script Mushaf with colour-coded tajweed rules.', 4500],
        ['islamic_studies_materials', 'Islamic Studies Workbook — Junior Level', 'Structured workbook covering the basics of aqidah, fiqh, and seerah.', 2800],
        ['shrs_publications', 'Sultan Hanafi Royal Schools Prospectus (Print Edition)', 'The full institutional prospectus in print.', 2000],
      ];
      for (const [category, name, description, priceNaira] of sampleProducts) {
        await sql`
          INSERT INTO marketplace_products (category, name, description, price_naira, status, is_sample_data, created_by)
          VALUES (${category}, ${name}, ${description}, ${priceNaira}, 'published', true, 'Setup — sample listing')`;
      }
      marketplaceSeeded = true;
    }

    return json({ ok: true, tablesReady: true, demoSeeded, marketplaceSeeded });
  } catch (err) {
    console.error('portal setup error', err);
    return json({ error: 'Setup failed: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

export const onRequestGet = handle;
export const onRequestPost = handle;
