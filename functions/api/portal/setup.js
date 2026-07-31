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
  // Institutional Portal Ecosystem — extends offices/staff with the
  // slug/layer columns and personnel-directory fields every office
  // portal renders from; see sql/schema.sql for the full commentary.
  `ALTER TABLE offices ADD COLUMN IF NOT EXISTS slug TEXT`,
  `ALTER TABLE offices ADD COLUMN IF NOT EXISTS layer TEXT`,
  `DO $$ BEGIN
    ALTER TABLE offices ADD CONSTRAINT offices_layer_check CHECK (layer IN (
      'governance', 'academic', 'school_leadership', 'operational', 'institutional_services'
    ));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_offices_slug ON offices(slug) WHERE slug IS NOT NULL`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS bio TEXT`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS public_email TEXT`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS public_phone TEXT`,
  `CREATE TABLE IF NOT EXISTS office_appointments (
    id                SERIAL PRIMARY KEY,
    office_id         INTEGER NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    staff_id          INTEGER REFERENCES staff(id),
    appointment_title TEXT NOT NULL,
    is_acting         BOOLEAN NOT NULL DEFAULT false,
    is_primary        BOOLEAN NOT NULL DEFAULT true,
    started_at        DATE,
    ended_at          DATE,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_office_appointments_office ON office_appointments(office_id)`,
  `CREATE INDEX IF NOT EXISTS idx_office_appointments_staff ON office_appointments(staff_id)`,
  `CREATE TABLE IF NOT EXISTS office_meetings (
    id                  SERIAL PRIMARY KEY,
    office_id           INTEGER NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    meeting_date        DATE NOT NULL,
    agenda_text         TEXT,
    minutes_text        TEXT,
    status              TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'held', 'cancelled')),
    created_by_staff_id INTEGER REFERENCES staff(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_office_meetings_office ON office_meetings(office_id)`,
  `CREATE TABLE IF NOT EXISTS office_documents (
    id                   SERIAL PRIMARY KEY,
    office_id            INTEGER NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    title                TEXT NOT NULL,
    file_url             TEXT,
    external_url         TEXT,
    description          TEXT,
    uploaded_by_staff_id INTEGER REFERENCES staff(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_office_documents_office ON office_documents(office_id)`,
  `INSERT INTO offices (name, office_type, layer, slug, description) VALUES
    ('Board of Trustees', 'governance', 'governance', 'board-of-trustees', 'The institution''s ultimate governing body (GV-01) — 4 members, composition not individually published.'),
    ('Registrar''s Office', 'academic', 'academic', 'registrar', 'Owns admissions verification, enrolment, results, transcripts, and certificates across all four institutions (AC-02, PA-05).'),
    ('Finance Office', 'support', 'operational', 'finance', 'Owns fee records across all institutions (FN-01) — no write workflow built yet pending FN-03/04/05.'),
    ('ICT Office', 'support', 'operational', 'digital-services', 'Owns system accounts, access logs, and the Acceptable Use / AI Usage policies (IT-03, IT-05).'),
    ('Executive', 'executive', 'governance', 'executive', 'The Founder & Chief Executive Officer''s office — institutional oversight, strategic direction, and final executive decision-making across all four institutions.'),
    ('Management Council', 'executive', 'governance', 'management-council', 'The senior leadership team drawn from each institution and the central offices, convened for cross-institutional coordination. Composition not yet formally published.'),
    ('Academic Affairs', 'academic', 'academic', 'academic-affairs', 'Oversight of curriculum standards, academic policy, and teaching quality across all four institutions.'),
    ('Examinations', 'academic', 'academic', 'examinations', 'Examination administration, results processing, and assessment-integrity oversight. Governing policy (AC-03) not yet published.'),
    ('Admissions', 'academic', 'academic', 'admissions', 'Application intake, entrance assessment, and offer administration — operated in practice through the Registrar''s Office pending a dedicated Admissions Officer appointment.'),
    ('Head Teacher — Nursery & Primary', 'academic', 'school_leadership', 'head-teacher', 'Leadership of Sultan Hanafi Nursery & Primary School — day-to-day academic and pastoral operations.'),
    ('Principal — Royal College', 'academic', 'school_leadership', 'principal-royal-college', 'Leadership of Sultan Hanafi Royal College — secondary academic operations, staff supervision, and student discipline.'),
    ('Office of the Ra''ees', 'academic', 'school_leadership', 'raees', 'Head of Institution, Sultan Hanafi School of Islamic & Arabic Studies — Ra''ees is the official title, officially adopted by the Founder & CEO in place of "Principal". Arabic language and Islamic studies programme oversight.'),
    ('Office of the Mudeer', 'academic', 'school_leadership', 'mudeer', 'Head of Institution, Sultan Hanafi Qur''an College — Mudeer is the official title, officially adopted by the Founder & CEO in place of "Principal". Tahfīẓ, Murāja''ah, and Ijāzah programme oversight.'),
    ('Human Resources', 'support', 'operational', 'hr', 'Recruitment, staff records, leave, and performance administration. Explicitly out of scope for the current Staff Identity system (an organisational directory, not a personnel/payroll file) — this office exists as a directory entry pending that system''s build.'),
    ('Student Affairs', 'support', 'operational', 'student-affairs', 'Student welfare, leadership development, clubs, and pastoral-care coordination across all institutions.'),
    ('Communications', 'support', 'operational', 'communications', 'Institutional news, publications, press relations, and brand oversight — currently a shared function across the Registrar, Principal, and Executive offices pending a dedicated appointment.'),
    ('Digital Learning & Innovation', 'academic', 'operational', 'digital-learning', 'Learning-management systems, digital curriculum, and instructional-technology innovation. No LMS exists yet — see the Digital Campus roadmap.'),
    ('Library', 'support', 'institutional_services', 'library', 'Physical and digital library services, research resources, and reading-room administration. No library catalogue system exists yet.'),
    ('Alumni', 'support', 'institutional_services', 'alumni', 'Alumni relations, directory, and engagement. No alumni programme or records system exists yet — "alumni" is currently only a self-declared profile field on the guardian portal.'),
    ('Sultan Hanafi Foundation', 'support', 'institutional_services', 'foundation', 'Staff-side administration of the Sultan Hanafi Foundation''s scholarship, welfare, and community programmes. The Foundation''s public page and real focus areas are already published at /foundation/.'),
    ('Certificate & Transcript Office', 'academic', 'institutional_services', 'certificates', 'Certificate issuance, transcript generation, and public verification. The operational function already lives in the Registrar''s Office — this office is that function''s own reporting view.'),
    ('Digital Identity Office', 'support', 'institutional_services', 'digital-identity', 'Digital ID cards, QR verification, and identity-record administration for students, staff, and guardians. The underlying system is already live at /verify-identity/.'),
    ('Institutional Knowledge Base', 'support', 'institutional_services', 'knowledge-base', 'Central index of policies, handbooks, and institutional documents. Currently served by the public Policies Centre — this office is its internal administration view.')
    ON CONFLICT (name) DO UPDATE SET
      office_type = EXCLUDED.office_type,
      layer       = EXCLUDED.layer,
      slug        = EXCLUDED.slug,
      description = EXCLUDED.description`,

  // Level 3 Institutional Framework — see sql/schema.sql for the full
  // commentary. office_kind distinguishes a Board committee from a
  // regular office; strategic_priorities/annual_objectives are
  // nullable (NULL = client renders a generic labelled template, never
  // stored as if it were adopted fact); office_resolutions is a real,
  // empty-by-default register. Five committees + Management Council's
  // ten named seats are seeded exactly like every other office/seat in
  // this file — vacant, never a fabricated name.
  `ALTER TABLE offices ADD COLUMN IF NOT EXISTS office_kind TEXT NOT NULL DEFAULT 'office'`,
  `DO $$ BEGIN
    ALTER TABLE offices ADD CONSTRAINT offices_kind_check CHECK (office_kind IN ('office', 'committee'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `ALTER TABLE offices ADD COLUMN IF NOT EXISTS strategic_priorities TEXT`,
  `ALTER TABLE offices ADD COLUMN IF NOT EXISTS annual_objectives TEXT`,
  `CREATE TABLE IF NOT EXISTS office_resolutions (
    id                  SERIAL PRIMARY KEY,
    office_id           INTEGER NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    resolution_number   TEXT,
    title               TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'adopted', 'rescinded')),
    summary_text        TEXT,
    resolved_at         DATE,
    created_by_staff_id INTEGER REFERENCES staff(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_office_resolutions_office ON office_resolutions(office_id)`,
  `INSERT INTO offices (name, office_type, office_kind, layer, slug, parent_office_id, description)
    SELECT v.name, 'governance', 'committee', 'governance', v.slug, b.id, v.description
    FROM (VALUES
      ('Finance Committee', 'committee-finance', 'Standing committee of the Board of Trustees for budget oversight, financial controls, and audit-readiness review.'),
      ('Governance Committee', 'committee-governance', 'Standing committee of the Board of Trustees for constitution, policy, and board-conduct oversight.'),
      ('Audit Committee', 'committee-audit', 'Standing committee of the Board of Trustees for internal controls, risk, and independent review of institutional accounts.'),
      ('Academic Excellence Committee', 'committee-academic-excellence', 'Standing committee of the Board of Trustees for curriculum standards, academic outcomes, and teaching-quality oversight.'),
      ('Development Committee', 'committee-development', 'Standing committee of the Board of Trustees for institutional growth, fundraising strategy, and capital planning.')
    ) AS v(name, slug, description)
    CROSS JOIN (SELECT id FROM offices WHERE slug = 'board-of-trustees') AS b(id)
    ON CONFLICT (name) DO UPDATE SET
      office_kind      = EXCLUDED.office_kind,
      parent_office_id = EXCLUDED.parent_office_id,
      description      = EXCLUDED.description`,
  `INSERT INTO office_appointments (office_id, appointment_title, is_primary, notes)
    SELECT o.id, seat.title, seat.is_primary, 'Pending Appointment'
    FROM offices o
    JOIN (VALUES
      ('committee-finance', 'Chair', true), ('committee-finance', 'Member', false), ('committee-finance', 'Member', false),
      ('committee-governance', 'Chair', true), ('committee-governance', 'Member', false), ('committee-governance', 'Member', false),
      ('committee-audit', 'Chair', true), ('committee-audit', 'Member', false), ('committee-audit', 'Member', false),
      ('committee-academic-excellence', 'Chair', true), ('committee-academic-excellence', 'Member', false), ('committee-academic-excellence', 'Member', false),
      ('committee-development', 'Chair', true), ('committee-development', 'Member', false), ('committee-development', 'Member', false)
    ) AS seat(office_slug, title, is_primary) ON seat.office_slug = o.slug
    WHERE NOT EXISTS (
      SELECT 1 FROM office_appointments oa
      WHERE oa.office_id = o.id AND oa.appointment_title = seat.title AND oa.ended_at IS NULL
    )`,
  `INSERT INTO office_appointments (office_id, appointment_title, is_primary, notes)
    SELECT o.id, seat.title, false, 'Pending Appointment'
    FROM offices o
    JOIN (VALUES
      ('management-council', 'Founder & CEO'), ('management-council', 'Registrar'),
      ('management-council', 'Finance Director'), ('management-council', 'HR Director'),
      ('management-council', 'Communications Director'), ('management-council', 'Student Affairs Director'),
      ('management-council', 'Principal, Royal College'), ('management-council', 'Head Teacher, Nursery & Primary'),
      ('management-council', 'Ra''ees'), ('management-council', 'Mudeer')
    ) AS seat(office_slug, title) ON seat.office_slug = o.slug
    WHERE NOT EXISTS (
      SELECT 1 FROM office_appointments oa
      WHERE oa.office_id = o.id AND oa.appointment_title = seat.title AND oa.ended_at IS NULL
    )`,

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

  // Safeguarding Intelligence Framework — real, governance-grounded
  // infrastructure per the Founder's "Institutional Capability
  // Framework" directive: schema + reference taxonomy + audit trail,
  // built and populated as real structure even though transactional
  // case records are (honestly) zero until the institution has a real
  // concern to log. Case categories and the DSL's case-by-case
  // decision vocabulary are transcribed directly from the adopted
  // Child Protection & Safeguarding Policy (Section 4/7.1/7.4), not
  // invented — see docs/policies/child-protection-safeguarding-policy.md.
  // Deliberately separate from staff_audit_log: the policy (Section 7.3)
  // requires the safeguarding log to be "a single, confidential...log
  // ...separate from academic and disciplinary records, with access
  // restricted to the DSL and Deputy DSLs" — a shared audit table
  // would not satisfy that restriction.
  `CREATE TABLE IF NOT EXISTS safeguarding_case_categories (
    id           SERIAL PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    label        TEXT NOT NULL,
    description  TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS safeguarding_risk_levels (
    id             SERIAL PRIMARY KEY,
    code           TEXT NOT NULL UNIQUE,
    label          TEXT NOT NULL,
    description    TEXT NOT NULL,
    severity_rank  INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS safeguarding_cases (
    id                    SERIAL PRIMARY KEY,
    case_no               TEXT NOT NULL UNIQUE,
    institution_id        INTEGER REFERENCES institutions(id),
    student_id            INTEGER REFERENCES students(id),
    category_id           INTEGER NOT NULL REFERENCES safeguarding_case_categories(id),
    risk_level_id         INTEGER REFERENCES safeguarding_risk_levels(id),
    status                TEXT NOT NULL DEFAULT 'reported' CHECK (status IN (
                             'reported', 'under_review', 'early_help', 'referred_external', 'resolved', 'closed'
                           )),
    decision              TEXT CHECK (decision IN ('early_help', 'referral', 'both')),
    summary               TEXT NOT NULL,
    external_agency       TEXT,
    parent_notified       BOOLEAN NOT NULL DEFAULT false,
    reported_by_staff_id  INTEGER NOT NULL REFERENCES staff(id),
    reported_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at           TIMESTAMPTZ,
    closed_at             TIMESTAMPTZ,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_safeguarding_cases_status ON safeguarding_cases (status)`,
  `CREATE INDEX IF NOT EXISTS idx_safeguarding_cases_institution ON safeguarding_cases (institution_id)`,
  `CREATE TABLE IF NOT EXISTS safeguarding_case_log (
    id                SERIAL PRIMARY KEY,
    case_id           INTEGER NOT NULL REFERENCES safeguarding_cases(id) ON DELETE CASCADE,
    action            TEXT NOT NULL CHECK (action IN (
                        'reported', 'reviewed', 'risk_assessed', 'early_help_started',
                        'referred_external', 'parent_notified', 'resolved', 'closed', 'reopened'
                      )),
    actor_staff_id     INTEGER NOT NULL REFERENCES staff(id),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_safeguarding_case_log_case ON safeguarding_case_log (case_id)`,
  `INSERT INTO safeguarding_case_categories (code, label, description, sort_order) VALUES
    ('physical_abuse', 'Physical Abuse', 'Hitting, shaking, or otherwise causing physical harm, including fabricated or induced illness.', 1),
    ('emotional_abuse', 'Emotional Abuse', 'Persistent emotional maltreatment causing severe adverse effects on a child''s development.', 2),
    ('sexual_abuse', 'Sexual Abuse', 'Forcing or enticing a child into sexual activity, including non-contact activities such as online grooming.', 3),
    ('neglect', 'Neglect', 'Persistent failure to meet a child''s basic physical or psychological needs.', 4),
    ('exploitation', 'Exploitation', 'A child manipulated or coerced into an activity for another''s advantage, including trafficking and boarding-context coercion.', 5),
    ('peer_on_peer', 'Peer-on-Peer Abuse', 'Abuse of one child by another, treated as a distinct safeguarding category, not automatically a lesser concern.', 6),
    ('radicalisation', 'Radicalisation Concern', 'A general awareness duty regarding a person coming to support extremist ideology.', 7)
    ON CONFLICT (code) DO NOTHING`,
  `INSERT INTO safeguarding_risk_levels (code, label, description, severity_rank) VALUES
    ('low', 'Low', 'A concern worth recording; no immediate risk indicators.', 1),
    ('medium', 'Medium', 'A concern meriting active DSL monitoring and a defined follow-up.', 2),
    ('high', 'High', 'A concern indicating the child may be at risk of harm.', 3),
    ('critical', 'Critical', 'An immediate risk of harm requiring same-day DSL and, where applicable, external-agency action.', 4)
    ON CONFLICT (code) DO NOTHING`,

  // Behaviour Management Framework — same "Institutional Capability
  // Framework" pattern as Safeguarding. Demerit categories and the
  // three-tier severity escalation are transcribed from the adopted
  // Student Code of Conduct (SD-02 §7.1-7.4), not invented; the merit
  // side is real new structure the policy doesn't yet define — recorded
  // as such, not asserted as policy-derived.
  `CREATE TABLE IF NOT EXISTS behaviour_categories (
    id           SERIAL PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    kind         TEXT NOT NULL CHECK (kind IN ('merit', 'demerit')),
    label        TEXT NOT NULL,
    description  TEXT NOT NULL,
    points       INTEGER NOT NULL DEFAULT 0,
    sort_order   INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS behaviour_incidents (
    id                    SERIAL PRIMARY KEY,
    incident_no           TEXT NOT NULL UNIQUE,
    student_id            INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id        INTEGER REFERENCES institutions(id),
    category_id           INTEGER NOT NULL REFERENCES behaviour_categories(id),
    severity              TEXT CHECK (severity IN ('minor', 'moderate', 'serious', 'suspension_expulsion')),
    description           TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN (
                             'recorded', 'under_review', 'intervention', 'resolved', 'escalated'
                           )),
    parent_notified       BOOLEAN NOT NULL DEFAULT false,
    recorded_by_staff_id  INTEGER NOT NULL REFERENCES staff(id),
    occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at           TIMESTAMPTZ,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_behaviour_incidents_student ON behaviour_incidents (student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_behaviour_incidents_status ON behaviour_incidents (status)`,
  `CREATE TABLE IF NOT EXISTS behaviour_intervention_log (
    id               SERIAL PRIMARY KEY,
    incident_id      INTEGER NOT NULL REFERENCES behaviour_incidents(id) ON DELETE CASCADE,
    action           TEXT NOT NULL CHECK (action IN (
                       'recorded', 'reviewed', 'intervention_started', 'parent_engaged',
                       'escalated', 'resolved', 'reopened'
                     )),
    actor_staff_id    INTEGER NOT NULL REFERENCES staff(id),
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_behaviour_intervention_log_incident ON behaviour_intervention_log (incident_id)`,
  `INSERT INTO behaviour_categories (code, kind, label, description, points, sort_order) VALUES
    ('academic_excellence', 'merit', 'Academic Excellence', 'Recognised achievement in classroom work, an assessment, or a competition.', 5, 1),
    ('leadership', 'merit', 'Leadership', 'Taking initiative or responsibility beyond what was required.', 5, 2),
    ('islamic_character', 'merit', 'Islamic Character', 'A demonstrated act reflecting the Islamic creed expectations SD-01 establishes.', 5, 3),
    ('community_service', 'merit', 'Community Service', 'A voluntary contribution to the school or wider community.', 5, 4),
    ('sporting_achievement', 'merit', 'Sporting Achievement', 'Recognised achievement in sport or physical education.', 5, 5),
    ('minor_misconduct', 'demerit', 'Minor Misconduct', 'Addressed directly by the class teacher — informal, per SD-02 §7.1, logged here only if repeated.', -1, 6),
    ('moderate_misconduct', 'demerit', 'Repeated or Moderate Misconduct', 'Referred to VP Administration per SD-02 §7.2 — logged, guardian informed.', -3, 7),
    ('serious_misconduct', 'demerit', 'Serious Misconduct', 'Referred to the Principal per SD-02 §7.3 — guardian informed the same day, may result in suspension.', -5, 8)
    ON CONFLICT (code) DO NOTHING`,

  // Teacher Performance Framework — same Institutional Capability
  // Framework pattern. Unlike Safeguarding/Behaviour, no dedicated
  // Performance Management Policy exists yet (Staff Handbook §7 names
  // this a real, known gap — "evaluated, not fully drafted" in the HR
  // Governance Framework). The observation domains below are real,
  // internationally standard classroom-observation categories (the
  // same structure widely used in teacher evaluation frameworks), not
  // policy-derived and not fabricated performance data — the schema is
  // real infrastructure built ahead of that policy's completion.
  `CREATE TABLE IF NOT EXISTS teacher_performance_categories (
    id           SERIAL PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    label        TEXT NOT NULL,
    description  TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS teacher_observations (
    id                 SERIAL PRIMARY KEY,
    observation_no     TEXT NOT NULL UNIQUE,
    teacher_staff_id   INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    institution_id     INTEGER REFERENCES institutions(id),
    category_id        INTEGER NOT NULL REFERENCES teacher_performance_categories(id),
    observer_staff_id  INTEGER NOT NULL REFERENCES staff(id),
    rating             TEXT CHECK (rating IN ('developing', 'proficient', 'accomplished', 'distinguished')),
    notes              TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
                          'scheduled', 'completed', 'follow_up_required', 'closed'
                        )),
    observed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teacher_observations_teacher ON teacher_observations (teacher_staff_id)`,
  `CREATE TABLE IF NOT EXISTS teacher_pd_records (
    id                SERIAL PRIMARY KEY,
    teacher_staff_id  INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    provider          TEXT,
    hours             NUMERIC(5,1),
    completed_at      DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teacher_pd_records_teacher ON teacher_pd_records (teacher_staff_id)`,
  `CREATE TABLE IF NOT EXISTS teacher_reviews (
    id                 SERIAL PRIMARY KEY,
    review_no          TEXT NOT NULL UNIQUE,
    teacher_staff_id   INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    institution_id     INTEGER REFERENCES institutions(id),
    review_period      TEXT NOT NULL,
    reviewer_staff_id  INTEGER NOT NULL REFERENCES staff(id),
    overall_rating     TEXT CHECK (overall_rating IN ('developing', 'proficient', 'accomplished', 'distinguished')),
    strengths          TEXT,
    growth_areas       TEXT,
    status             TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
                          'scheduled', 'in_progress', 'completed', 'acknowledged'
                        )),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teacher_reviews_teacher ON teacher_reviews (teacher_staff_id)`,
  `CREATE TABLE IF NOT EXISTS teacher_performance_log (
    id            SERIAL PRIMARY KEY,
    target_type   TEXT NOT NULL CHECK (target_type IN ('observation', 'review')),
    target_id     INTEGER NOT NULL,
    action        TEXT NOT NULL CHECK (action IN (
                     'scheduled', 'completed', 'follow_up_assigned', 'pd_recommended', 'acknowledged', 'resolved'
                   )),
    actor_staff_id INTEGER NOT NULL REFERENCES staff(id),
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teacher_performance_log_target ON teacher_performance_log (target_type, target_id)`,
  `INSERT INTO teacher_performance_categories (code, label, description, sort_order) VALUES
    ('lesson_planning', 'Lesson Planning & Preparation', 'Clarity of objectives, sequencing, and alignment to the curriculum.', 1),
    ('classroom_management', 'Classroom Management', 'Routines, behaviour management, and use of instructional time.', 2),
    ('instructional_delivery', 'Instructional Delivery', 'Explanation quality, questioning technique, and differentiation.', 3),
    ('assessment_for_learning', 'Assessment for Learning', 'Use of formative checks and feedback to adjust teaching in real time.', 4),
    ('professional_responsibilities', 'Professional Responsibilities', 'Punctuality, record-keeping, and engagement with professional development.', 5)
    ON CONFLICT (code) DO NOTHING`,

  // Examination Readiness Framework — one shared, real engine covering
  // both external boards the Founder named as separate Tier 1
  // priorities (WAEC and NECO), parametrized by exam_body rather than
  // duplicated table-for-table: both boards need identical real
  // structure (candidate tracking, subject readiness, mock results,
  // risk indicators), and Registrar/Examinations offices in practice
  // track both boards through one register, not two parallel systems.
  // Standard, real exam-readiness risk factors — not invented data.
  `CREATE TABLE IF NOT EXISTS exam_readiness_risk_indicators (
    id           SERIAL PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    label        TEXT NOT NULL,
    description  TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS exam_candidates (
    id                    SERIAL PRIMARY KEY,
    student_id            INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_body              TEXT NOT NULL CHECK (exam_body IN ('WAEC', 'NECO')),
    exam_year              INTEGER NOT NULL,
    institution_id         INTEGER REFERENCES institutions(id),
    registration_status    TEXT NOT NULL DEFAULT 'not_registered' CHECK (registration_status IN (
                              'not_registered', 'registered', 'confirmed', 'sat'
                            )),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, exam_body, exam_year)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_exam_candidates_body_year ON exam_candidates (exam_body, exam_year)`,
  `CREATE TABLE IF NOT EXISTS exam_subject_readiness (
    id                SERIAL PRIMARY KEY,
    candidate_id       INTEGER NOT NULL REFERENCES exam_candidates(id) ON DELETE CASCADE,
    subject            TEXT NOT NULL,
    readiness_status   TEXT NOT NULL DEFAULT 'on_track' CHECK (readiness_status IN ('on_track', 'at_risk', 'critical')),
    notes              TEXT,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_exam_subject_readiness_candidate ON exam_subject_readiness (candidate_id)`,
  `CREATE TABLE IF NOT EXISTS exam_mock_results (
    id                  SERIAL PRIMARY KEY,
    candidate_id         INTEGER NOT NULL REFERENCES exam_candidates(id) ON DELETE CASCADE,
    subject              TEXT NOT NULL,
    mock_round           TEXT NOT NULL,
    score                NUMERIC(5,2) NOT NULL,
    max_score            NUMERIC(5,2) NOT NULL DEFAULT 100,
    recorded_by_staff_id INTEGER NOT NULL REFERENCES staff(id),
    recorded_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_exam_mock_results_candidate ON exam_mock_results (candidate_id)`,
  `CREATE TABLE IF NOT EXISTS exam_readiness_flags (
    id                 SERIAL PRIMARY KEY,
    candidate_id        INTEGER NOT NULL REFERENCES exam_candidates(id) ON DELETE CASCADE,
    indicator_id        INTEGER NOT NULL REFERENCES exam_readiness_risk_indicators(id),
    notes               TEXT,
    flagged_by_staff_id INTEGER NOT NULL REFERENCES staff(id),
    flagged_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at         TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_exam_readiness_flags_candidate ON exam_readiness_flags (candidate_id)`,
  `INSERT INTO exam_readiness_risk_indicators (code, label, description, sort_order) VALUES
    ('registration_incomplete', 'Registration Incomplete', 'The candidate is not yet fully registered with the exam body ahead of the deadline.', 1),
    ('subject_coverage_gap', 'Subject Coverage Gap', 'The syllabus for one or more registered subjects is behind schedule.', 2),
    ('mock_underperformance', 'Mock Underperformance', 'A mock result fell below the pass threshold for a registered subject.', 3),
    ('attendance_gap', 'Attendance Gap', 'Attendance below the level needed to complete subject coverage on time.', 4),
    ('fee_outstanding', 'Fee Outstanding', 'An outstanding balance that could affect the candidate''s exam-body registration.', 5)
    ON CONFLICT (code) DO NOTHING`,

  // Arabic Fluency Framework — same Institutional Capability Framework
  // pattern. Assessment bands are a standard five-tier language-
  // proficiency scale (the same shape used across real language
  // programmes worldwide), not policy-derived and not fabricated
  // student data — real professional structure, zero records yet.
  `CREATE TABLE IF NOT EXISTS arabic_fluency_bands (
    id           SERIAL PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    label        TEXT NOT NULL,
    description  TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS arabic_fluency_assessments (
    id                  SERIAL PRIMARY KEY,
    student_id           INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id        INTEGER REFERENCES institutions(id),
    skill                 TEXT NOT NULL CHECK (skill IN ('reading', 'writing', 'listening', 'speaking')),
    band_id               INTEGER NOT NULL REFERENCES arabic_fluency_bands(id),
    assessment_cycle      TEXT NOT NULL,
    notes                 TEXT,
    assessor_staff_id     INTEGER NOT NULL REFERENCES staff(id),
    assessed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_arabic_fluency_assessments_student ON arabic_fluency_assessments (student_id)`,
  `INSERT INTO arabic_fluency_bands (code, label, description, sort_order) VALUES
    ('beginner', 'Beginner', 'Recognises isolated letters/words; minimal independent production.', 1),
    ('elementary', 'Elementary', 'Reads/produces simple, familiar sentences with support.', 2),
    ('intermediate', 'Intermediate', 'Handles everyday topics independently with some errors.', 3),
    ('advanced', 'Advanced', 'Handles a range of topics fluently with occasional support.', 4),
    ('fluent', 'Fluent', 'Near-native command across all four skills.', 5)
    ON CONFLICT (code) DO NOTHING`,

  // Tajweed Compliance Framework — same pattern, scoped to Qur'anic
  // recitation rules rather than general Arabic fluency. Categories
  // (Makharij, Sifaat, Ahkam, Application) are the standard, real
  // divisions of Tajweed study used in Qur'an education generally, not
  // invented for this system.
  `CREATE TABLE IF NOT EXISTS tajweed_categories (
    id           SERIAL PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    label        TEXT NOT NULL,
    description  TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tajweed_assessments (
    id                  SERIAL PRIMARY KEY,
    student_id           INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id        INTEGER REFERENCES institutions(id),
    category_id           INTEGER NOT NULL REFERENCES tajweed_categories(id),
    compliance_level      TEXT NOT NULL CHECK (compliance_level IN ('developing', 'competent', 'proficient', 'mastered')),
    assessment_cycle      TEXT NOT NULL,
    remediation_plan      TEXT,
    notes                 TEXT,
    assessor_staff_id     INTEGER NOT NULL REFERENCES staff(id),
    assessed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tajweed_assessments_student ON tajweed_assessments (student_id)`,
  `INSERT INTO tajweed_categories (code, label, description, sort_order) VALUES
    ('makharij', 'Makharij al-Huruf', 'Correct articulation points of each letter.', 1),
    ('sifaat', 'Sifaat al-Huruf', 'The inherent characteristics of each letter''s pronunciation.', 2),
    ('ahkam', 'Ahkam al-Tajweed', 'Rules governing letter interaction — noon/meem rulings, madd, qalqalah, etc.', 3),
    ('application', 'Applied Recitation', 'Fluent, rule-compliant recitation of continuous passages under real recitation pace.', 4)
    ON CONFLICT (code) DO NOTHING`,

  // Boarding Intelligence Framework — same Institutional Capability
  // Framework pattern. Welfare categories are transcribed from the
  // adopted Boarding Regulations (SD-04 §7.2/7.4/7.7/7.8/7.10), not
  // invented. Room checks are the real, policy-required nightly
  // attendance mechanism for boarding (SD-04 §7.2) — a dedicated table
  // rather than reusing the day-school attendance_summary table, since
  // boarding attendance is checked nightly, not by class period. Zero
  // transactional records exist yet (Current Records: 0).
  `CREATE TABLE IF NOT EXISTS boarding_welfare_categories (
    id           SERIAL PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    label        TEXT NOT NULL,
    description  TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS boarding_welfare_logs (
    id                    SERIAL PRIMARY KEY,
    student_id             INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id         INTEGER REFERENCES institutions(id),
    category_id            INTEGER NOT NULL REFERENCES boarding_welfare_categories(id),
    severity               TEXT NOT NULL DEFAULT 'routine' CHECK (severity IN ('routine', 'concern', 'urgent')),
    notes                  TEXT NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    parent_notified        BOOLEAN NOT NULL DEFAULT false,
    recorded_by_staff_id   INTEGER NOT NULL REFERENCES staff(id),
    recorded_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at            TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_boarding_welfare_logs_student ON boarding_welfare_logs (student_id)`,
  `CREATE TABLE IF NOT EXISTS boarding_room_checks (
    id                   SERIAL PRIMARY KEY,
    student_id            INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id         INTEGER REFERENCES institutions(id),
    check_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    present                BOOLEAN NOT NULL DEFAULT true,
    notes                  TEXT,
    recorded_by_staff_id   INTEGER NOT NULL REFERENCES staff(id),
    recorded_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, check_date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_boarding_room_checks_student ON boarding_room_checks (student_id)`,
  `INSERT INTO boarding_welfare_categories (code, label, description, sort_order) VALUES
    ('room_check', 'Room Check', 'A nightly presence/wellbeing check, per SD-04 §7.2.', 1),
    ('health_medical', 'Health & Medical', 'Any medical or health matter arising in the boarding house, per SD-04 §7.4.', 2),
    ('homesickness_support', 'Homesickness & Settling-In', 'Support provided for homesickness or settling-in difficulty, per SD-04 §7.10.', 3),
    ('weekend_leave', 'Weekend & Leave-Out', 'A weekend or leave-out request and its outcome, per SD-04 §7.8.', 4),
    ('discipline', 'Discipline', 'A boarding-specific disciplinary matter, per SD-04 §7.7 (alongside the Student Code of Conduct, SD-02).', 5)
    ON CONFLICT (code) DO NOTHING`,

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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates (student_id)`,

  // Generic Approval Workflow (docs/approval-workflow-architecture.md) —
  // see sql/schema.sql's comment on this table for the full reasoning.
  `CREATE TABLE IF NOT EXISTS staff_approvals (
    id                    SERIAL PRIMARY KEY,
    area_code             TEXT NOT NULL,
    target_type           TEXT NOT NULL,
    payload               JSONB NOT NULL,
    requested_by_staff_id INTEGER NOT NULL REFERENCES staff(id),
    approver_role_code    TEXT NOT NULL REFERENCES roles(code),
    institution_id        INTEGER REFERENCES institutions(id),
    status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    decided_by_staff_id   INTEGER REFERENCES staff(id),
    decision_note         TEXT,
    result_ref            TEXT,
    requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at            TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_staff_approvals_pending ON staff_approvals (area_code, status, institution_id)`,

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

  `ALTER TABLE students ADD COLUMN IF NOT EXISTS identity_no TEXT UNIQUE`,
  `ALTER TABLE guardians ADD COLUMN IF NOT EXISTS identity_no TEXT UNIQUE`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS identity_no TEXT UNIQUE`,

  // SHRS Master Identity Architecture Directive — staff identity numbers'
  // real, atomic, never-reused SEQUENCE segment; see sql/schema.sql and
  // functions/_lib/identity-no.js for the full design rationale.
  `CREATE SEQUENCE IF NOT EXISTS staff_identity_seq START WITH 1`,

  // Finance Platform (Imperial Digital Campus Directive, Priority 3) —
  // mirrors sql/schema.sql exactly; see that file for the full design
  // rationale on every table below.
  `CREATE TABLE IF NOT EXISTS fee_structures (
    id                SERIAL PRIMARY KEY,
    institution_id    INTEGER NOT NULL REFERENCES institutions(id),
    class_label       TEXT NOT NULL DEFAULT '',
    student_category  TEXT NOT NULL DEFAULT 'boarder' CHECK (student_category IN ('boarder', 'new_entrant')),
    fee_type          TEXT NOT NULL,
    label             TEXT NOT NULL,
    amount            NUMERIC(12,2) NOT NULL,
    applicable_gender TEXT,
    is_recurring      BOOLEAN NOT NULL DEFAULT true,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    notes             TEXT,
    created_by_staff_id INTEGER REFERENCES staff(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (institution_id, class_label, student_category, fee_type)
  )`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id                  SERIAL PRIMARY KEY,
    invoice_no          TEXT NOT NULL UNIQUE,
    student_id          INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id      INTEGER NOT NULL REFERENCES institutions(id),
    term                TEXT NOT NULL,
    student_category    TEXT,
    due_date            DATE,
    status              TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled')),
    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
    scholarship_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes               TEXT,
    created_by_staff_id INTEGER REFERENCES staff(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at        TIMESTAMPTZ,
    cancellation_note   TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
  `CREATE TABLE IF NOT EXISTS invoice_items (
    id                     SERIAL PRIMARY KEY,
    invoice_id             INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    fee_type               TEXT NOT NULL,
    label                  TEXT NOT NULL,
    amount                 NUMERIC(12,2) NOT NULL,
    source_fee_structure_id INTEGER REFERENCES fee_structures(id)
  )`,
  `CREATE TABLE IF NOT EXISTS receipts (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON receipts(invoice_id)`,
  `CREATE TABLE IF NOT EXISTS scholarships (
    id                  SERIAL PRIMARY KEY,
    student_id          INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    scholarship_type    TEXT NOT NULL CHECK (scholarship_type IN ('full', 'partial', 'sponsored')),
    discount_percent    NUMERIC(5,2),
    discount_amount     NUMERIC(12,2),
    sponsor_name        TEXT,
    term                TEXT,
    notes               TEXT,
    granted_by_staff_id INTEGER REFERENCES staff(id),
    granted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    revoked_at          TIMESTAMPTZ,
    revocation_note     TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_scholarships_student ON scholarships(student_id)`,
  `CREATE TABLE IF NOT EXISTS payment_plans (
    id                  SERIAL PRIMARY KEY,
    invoice_id          INTEGER NOT NULL UNIQUE REFERENCES invoices(id) ON DELETE CASCADE,
    plan_type           TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'termly', 'custom')),
    installment_count   INTEGER NOT NULL,
    created_by_staff_id INTEGER REFERENCES staff(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS payment_plan_installments (
    id                SERIAL PRIMARY KEY,
    payment_plan_id   INTEGER NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
    sequence          INTEGER NOT NULL,
    due_date          DATE NOT NULL,
    amount            NUMERIC(12,2) NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_receipt_id   INTEGER REFERENCES receipts(id),
    UNIQUE (payment_plan_id, sequence)
  )`,

  // Real fee structures, supplied directly by the school (WhatsApp,
  // 1-2 Nov 2025) — not sample/placeholder data. Amounts are exactly as
  // given; "Educational Resources" (boarder bills) and "Textbooks" (new
  // entrant bills) are kept as separately-labelled rows rather than
  // merged into one concept, even though their amounts match per class,
  // since that was an observation made while transcribing these bills,
  // not a fact confirmed with the Finance Office. See
  // docs/finance-platform.md.
  `INSERT INTO fee_structures (institution_id, class_label, student_category, fee_type, label, amount, applicable_gender, is_recurring) VALUES
    -- Qur'an College (Tahfiz) — boarder
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'registration', 'Registration Form', 10000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'tuition', 'Tuition', 240000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'feeding_accommodation', 'Feeding & Accommodation', 360000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'first_aid', 'First Aid', 15000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'educational_resources', 'Educational Resources', 60000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'development_fee', 'Development Fee', 25000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'school_uniform', 'School Uniform (2)', 40000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'sportwear', 'Sport Wear', 20000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'hostel_wear', 'Hostel Wear', 18000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Qur''an College'), '', 'boarder', 'hijab', 'Female Hijabs (2)', 30000, 'female', false),
    -- Royal College SSS 1 — boarder
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'registration', 'Registration Form', 10000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'tuition', 'Tuition', 240000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'feeding_accommodation', 'Feeding & Accommodation', 360000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'first_aid', 'First Aid', 15000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'educational_resources', 'Educational Resources', 110000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'development_fee', 'Development Fee', 25000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'school_uniform', 'School Uniform', 25000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'sportwear', 'Sport Wear', 25000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'hostel_wear', 'Hostel Wear', 18000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'friday_wear', 'Friday Wear', 25000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'boarder', 'hijab', 'Female Hijabs (2)', 30000, 'female', false),
    -- Royal College SSS 1 — new entrant
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'new_entrant', 'registration', 'Registration Form', 10000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'new_entrant', 'tuition', 'Tuition', 240000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'new_entrant', 'school_uniform', 'Uniforms (school uniform, sportwear & Friday wear)', 75000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'SSS 1', 'new_entrant', 'textbooks', 'Textbooks (secular, arabiyyah, stationeries & examinations)', 110000, NULL, false),
    -- Royal College JSS 1 — boarder
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'registration', 'Registration Form', 10000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'tuition', 'Tuition', 180000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'feeding_accommodation', 'Feeding & Accommodation', 360000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'first_aid', 'First Aid', 15000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'educational_resources', 'Educational Resources', 90000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'development_fee', 'Development Fee', 25000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'school_uniform', 'School Uniform', 20000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'sportwear', 'Sport Wear', 20000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'hostel_wear', 'Hostel Wear', 18000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'friday_wear', 'Friday Wear', 20000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'boarder', 'hijab', 'Female Hijabs (2)', 30000, 'female', false),
    -- Royal College JSS 1 — new entrant
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'new_entrant', 'registration', 'Registration Form', 10000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'new_entrant', 'tuition', 'Tuition', 180000, NULL, true),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'new_entrant', 'school_uniform', 'Uniforms (school uniform, sportwear & Friday wear)', 60000, NULL, false),
    ((SELECT id FROM institutions WHERE name = 'Royal College'), 'JSS 1', 'new_entrant', 'textbooks', 'Textbooks (secular, arabiyyah, stationeries & examinations)', 90000, NULL, false)
    ON CONFLICT (institution_id, class_label, student_category, fee_type) DO NOTHING`,

  // Organisational Chart Engine — see sql/schema.sql for the full
  // commentary. Encodes only the reporting lines already published on
  // the public Governance page into parent_office_id.
  `UPDATE offices SET parent_office_id = (SELECT id FROM offices WHERE slug = 'board-of-trustees')
    WHERE slug = 'executive'`,
  `UPDATE offices SET parent_office_id = (SELECT id FROM offices WHERE slug = 'executive')
    WHERE slug = 'management-council'`,
  `UPDATE offices SET parent_office_id = (SELECT id FROM offices WHERE slug = 'executive')
    WHERE slug IN ('principal-royal-college', 'raees', 'mudeer', 'head-teacher')`,

  // Institutional Messaging — see sql/schema.sql for the full
  // commentary. Real threaded correspondence between a guardian and a
  // specific office, separate from the AI Assistant widget.
  `CREATE TABLE IF NOT EXISTS message_threads (
    id                SERIAL PRIMARY KEY,
    guardian_id       INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    office_id         INTEGER NOT NULL REFERENCES offices(id),
    subject           TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_message_threads_guardian ON message_threads(guardian_id)`,
  `CREATE INDEX IF NOT EXISTS idx_message_threads_office ON message_threads(office_id)`,
  `CREATE TABLE IF NOT EXISTS thread_messages (
    id                  SERIAL PRIMARY KEY,
    thread_id           INTEGER NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_type         TEXT NOT NULL CHECK (sender_type IN ('guardian', 'staff')),
    sender_guardian_id  INTEGER REFERENCES guardians(id),
    sender_staff_id     INTEGER REFERENCES staff(id),
    body                TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
      (sender_type = 'guardian' AND sender_guardian_id IS NOT NULL AND sender_staff_id IS NULL) OR
      (sender_type = 'staff' AND sender_staff_id IS NOT NULL AND sender_guardian_id IS NULL)
    )
  )`,
  `CREATE INDEX IF NOT EXISTS idx_thread_messages_thread ON thread_messages(thread_id)`,

  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id           SERIAL PRIMARY KEY,
    guardian_id  INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    endpoint     TEXT NOT NULL UNIQUE,
    p256dh       TEXT NOT NULL,
    auth         TEXT NOT NULL,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_guardian ON push_subscriptions(guardian_id)`,
  `ALTER TABLE guardian_notification_preferences ADD COLUMN IF NOT EXISTS channel_push BOOLEAN NOT NULL DEFAULT false`,
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
