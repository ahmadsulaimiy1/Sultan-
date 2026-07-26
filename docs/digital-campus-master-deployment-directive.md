# SHRS Digital Campus Master Deployment Directive

**Status of this document itself: Developed. Not a claim of anything
being live.**

This is the response to the "IMPERIAL SHRS DIGITAL CAMPUS MASTER
DEPLOYMENT DIRECTIVE" — an infrastructure audit, production
architecture, staging plan, email infrastructure plan, module-by-module
readiness review, and roadmap, produced under one governing rule stated
in the directive itself and repeated here because it is the whole point
of this document:

> Never use "Live," "Production," "Deployed," or "Available" unless
> there is direct evidence. Use only: **Not Started, Designed,
> Developed, Tested Locally, Merged, Staging Verified, Production
> Verified** — with precision.

Every status label in this document was checked against actual
evidence found in this repository or, where an outbound check was
attempted, against what a live network request actually returned. Where
no evidence exists either way, this document says so explicitly rather
than estimating.

## Vocabulary used throughout (defined once, applied consistently)

| Status | Meaning |
|---|---|
| **Not Started** | No design decision or code exists for this. |
| **Designed** | A decision or plan is documented; no code written yet. |
| **Developed** | Code exists in this repository implementing it. |
| **Tested Locally** | Exercised against a local dev server and/or a local database in this sandbox — never against a public URL. |
| **Merged** | Present in the `main` branch of `ahmadsulaimiy1/Sultan-`. |
| **Staging Verified** | Confirmed reachable and working at a public, non-production staging URL. **Nothing in this project has reached this status yet — no staging URL exists.** |
| **Production Verified** | Confirmed reachable and working at the real production domain, checked by an actual outbound request in this session. **Nothing in this project has reached this status — see the evidence in Phase 1.** |

---

## PHASE 1 — INFRASTRUCTURE AUDIT

### What exists (verified by reading this repository directly)

**Git / branch structure**
- One repository: `ahmadsulaimiy1/Sultan-`.
- Two branches only: `main` and `claude/wec-institutional-design-kt3u0t`. As of this document, both point to the same commit (`3f8410d`) — there is no divergent staging or release branch.
- No `.github/workflows/` directory exists anywhere in this repo's history (checked: `find . -iname "*.yml" -o -iname "*.yaml"` returns nothing). **No CI/CD pipeline is defined in this repository.**
- No `wrangler.toml` exists anywhere in this repo's history. **No Cloudflare Pages/Workers project configuration is committed to this repository.**

**Database structure**
- 36 tables defined in `sql/schema.sql`, mirrored idempotently in `functions/api/portal/setup.js`'s `STATEMENTS` array (the script that actually creates them against a real database when run): `guardians`, `students`, `staff`, `classes`, `institutions`, `campuses`, `offices`, `departments`, `roles`, `staff_roles`, `staff_institutions`, `student_classes`, `guardian_student`, `guardian_emergency_contacts`, `guardian_educational_interests`, `guardian_notification_preferences`, `academic_terms`, `attendance_summary`, `term_results`, `fee_status`, `notifications`, `announcements`, `admissions_applications`, `student_lifecycle_events`, `certificates`, `hifz_progress`, `hifz_enrolment`, `ijazah_register`, `student_accounts`, `staff_accounts`, `auth_audit_log`, `staff_audit_log`, `delegations`, `adhkar_completions`, `privacy_requests`.
- Driver: `@neondatabase/serverless` (the only runtime dependency in `package.json`), targeting Neon Postgres over HTTP.
- **No evidence a real Neon project exists or is provisioned.** `DATABASE_URL` is read from an environment variable (`functions/_lib/db.js`); nothing in this repo sets one for any real environment. Every verification this engagement has ever run against this schema was against a **local PostgreSQL 16 instance in this sandbox**, never a real Neon database.

**Authentication / identity systems**
- Three independent, parallel session-cookie systems (`functions/_lib/session.js`): `shr_portal_session` (guardian), `shr_student_session` (student), `shr_staff_session` (staff) — HMAC-SHA256-signed, stateless, `SameSite=Lax` only (no CSRF token exists anywhere in this project).
- Password hashing: `scrypt` (Node's `crypto.scryptSync`, salted), not bcrypt/argon2.
- Five bearer-token-gated admin surfaces, each a **separate, non-rotating shared secret read from an env var**, not a real account system: `PORTAL_SETUP_TOKEN`, `PORTAL_ADMIN_TOKEN`, `PORTAL_SYSADMIN_TOKEN`, `PORTAL_QURAN_TOKEN`, `PORTAL_FOUNDER_TOKEN`.
- Rate limiting: 5 failed attempts / 15-minute lockout on guardian, student, and staff login, each writing to `auth_audit_log` / `staff_audit_log`.
- No MFA exists anywhere in this project. No SSO exists anywhere in this project.

**Existing APIs** — 42 Pages Functions route files under `functions/api/`, spanning guardian self-service (register/login/profile/emergency-contacts/educational-interests/admissions-applications/adhkar), student self-service, staff self-service across five offices (Registrar, Teacher, Finance, Admissions review, Delegations), and five admin/bearer-token surfaces (setup, students, staff, announcements, reset-password, create-student-login, hifz-progress). Full list verified by direct directory listing, not summarized from memory.

**Existing portals (hand-authored static HTML pages, outside `scripts/build.js`'s templating)** — 17 pages: guardian (register, login, forgot-password, set-password, verify, dashboard, apply, profile), student (login, set-password, dashboard), staff (login, set-password, identity, registrar, teacher), and founder (a single token-gated dashboard page).

**Existing dashboards** — Parent/Guardian Dashboard, Student Dashboard, Teacher Portal, Registrar's Office, Founder Dashboard (which is also, and only, the Executive Dashboard — see Phase 5 for why "Executive Dashboard" is not a separate module).

**Email infrastructure (code)** — `functions/_lib/email.js` calls Resend's REST API, gated on `RESEND_API_KEY` + `EMAIL_FROM_ADDRESS`. **Neither variable is set anywhere in this project.** `sendEmail()` is written to fail safely (`{ sent: false, reason: 'not_configured' }`) rather than throw, and every caller already has a documented fallback path for that. The code is Developed; the account is Not Started.

**Governance / policy documentation** — a genuinely large, real corpus already exists in `docs/`: a full policy coding standard, Constitution & Governance Charter, Staff/Parent/Student Handbooks, a Role & Permission Matrix, a Data Ownership Register, a Data Lifecycle Register, a Staff Identity Architecture, an Identity Migration Plan, and several honesty-first assessment documents (`imperial-identity-onboarding-reality-check.md`, `public-website-maturity-assessment.md`, `institutional-readiness-review.md`). This document does not repeat their content — it cites them where relevant.

### What does not exist, or cannot be confirmed to exist

- **Domain.** `https://shroyalschools.ng` is hardcoded as a constant (`SITE_ORIGIN` in `functions/_lib/email.js`, mirrored in `scripts/build.js`) for building absolute links inside emails and canonical tags. **A hardcoded string is not evidence of a registered, resolvable, hosted domain.** This session attempted to verify it directly — see the evidence box below.
- **Production environment.** No Cloudflare Pages project, no Neon project, no environment variables for either, are confirmed to exist anywhere reachable from this session.
- **Cloudflare Pages project.** Not confirmed. No `wrangler.toml`, no CI workflow, no Cloudflare account/API access available to this session.
- **Production database.** Not confirmed. `DATABASE_URL` has never been observed set to a real Neon connection string in this engagement — every real database interaction this engagement has ever performed was against a local Postgres instance in a sandbox, torn down after each session.
- **Email infrastructure.** Not confirmed. No Resend account, no verified sending domain, no DNS (SPF/DKIM/DMARC) records — none of this is checkable from here, and the code explicitly reports "not configured" until it is.
- **Backup infrastructure.** Not Started. No backup policy, schedule, or tooling exists in this project. (IT-04 Records Retention Policy defines retention/destruction *authority and rules*, but that is a governance policy, not a running backup system.)
- **Monitoring infrastructure.** Not Started. No uptime monitoring, error tracking, or log aggregation exists in this project.
- **Disaster recovery infrastructure.** Not Started. No DR plan, no tested restore procedure, no RTO/RPO targets are documented anywhere.
- **Security audit framework.** Partial. Individual security fixes have been made and documented over this engagement (timing-safe token comparisons, rate limiting/lockout, password strength minimums, `Cache-Control: no-store` on session-bearing responses, a real CSS-hides-a-real-verification-banner bug found and fixed this session) — but no recurring audit *process* (e.g., scheduled dependency scanning, penetration test, log review cadence) exists.

### Direct evidence: attempted production verification, this session

This session ran an actual outbound check against `https://shroyalschools.ng` and `https://www.shroyalschools.ng` (via `curl` and via the web-fetch tool). Both attempts returned a **403 from this sandbox's own outbound network gateway**, confirmed via the gateway's own status endpoint:

```
"recentRelayFailures": [
  { "kind": "connect_rejected",
    "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
    "host": "shroyalschools.ng:443" },
  { "kind": "connect_rejected",
    "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
    "host": "www.shroyalschools.ng:443" }
]
```

This means: **this sandbox's network policy blocked the connection attempt before it reached the internet.** This is not evidence the domain is down, unregistered, or broken — it is evidence only that *this session cannot check*. It is the same class of restriction already documented elsewhere in this engagement for Neon/`console.neon.tech` access. Anyone with unrestricted network access (a normal browser, a phone) is the only way to actually answer "is `shroyalschools.ng` live" — this document does not claim an answer either way.

---

## PHASE 2 — PRODUCTION ARCHITECTURE

### Domain layer

Recommended future structure, **not yet implemented, not yet purchased,
purely a design proposal**:

| Subdomain | Purpose | Status |
|---|---|---|
| `shroyalschools.ng` (or `.com`, if repurchased) | Public marketing site | Domain ownership: unconfirmed from this session |
| `portal.shroyalschools.ng` | Guardian/Student/Staff portals | Not Started |
| `admissions.shroyalschools.ng` | Admissions-specific funnel | Not Started |
| `lms.shroyalschools.ng` | Future LMS | Not Started (LMS itself Not Started) |
| `staff.shroyalschools.ng` | Staff-only surfaces | Not Started |
| `registry.shroyalschools.ng` | Registrar's Office | Not Started |

Today, every portal path (`/portal/...`) is served from the **same
origin** as the public marketing site — there is no subdomain
separation at all in the current codebase. Introducing subdomains later
is a real, non-trivial migration (cookie domain scoping, CORS, DNS,
TLS) — it should be scoped as its own project, not assumed as a
byproduct of buying a domain.

### Cloud layer

| Option | What it is | Fit for this project | Migration cost from today |
|---|---|---|---|
| **Cloudflare Pages + Pages Functions** | Static hosting + edge functions (Workers runtime) | **Already the target runtime.** Every function in `functions/api/` is written against the Pages Functions request shape (`onRequestGet`/`onRequestPost({ request, env })`) and verified this engagement to actually run under `wrangler pages dev`. | None — this is what exists today. |
| **Neon Postgres (HTTP driver)** | Serverless Postgres reachable over HTTPS, not raw TCP | **Already the integrated database**, and for a concrete, tested reason: this session confirmed empirically that a persistent `pg.Pool` (plain TCP) **hangs the Workers isolate** on a second request — the runtime kills it. Neon's HTTP driver exists specifically to avoid this. Any TCP-based Postgres (self-hosted, RDS, a bare Supabase Postgres connection) would hit the same wall inside Pages Functions. | None — already integrated. Provisioning a real project is the only remaining step. |
| **Cloudflare D1** | Cloudflare's native SQLite, runs in-process with Workers (no cold-TCP problem at all) | Would remove the "must use an HTTP-shaped driver" constraint entirely — but it is **SQLite, not Postgres**. This schema uses `SERIAL`, Postgres-specific `CHECK` constraints, `RETURNING`, `ON CONFLICT DO NOTHING/UPDATE`, and `DISTINCT ON` (used in `founder/dashboard.js` and `me.js`) — none of which map 1:1 to SQLite. | High — a genuine rewrite of the schema and every non-trivial query, not a drop-in swap. |
| **Cloudflare R2** | S3-compatible object storage | Not a database alternative — relevant only for **file storage**, specifically the KYC Document Centre / biometric selfie storage that `docs/imperial-identity-onboarding-reality-check.md` already flagged as pending a Board decision (verify-and-discard vs. retain). Nothing in this codebase uses object storage today. | N/A — additive, not a replacement. |
| **Supabase** | Postgres + a REST/Realtime layer (PostgREST), hosted | A real alternative to Neon for the *database* — it also offers an HTTP-reachable interface (PostgREST), so it would also avoid the TCP problem. But every query in this codebase is written as tagged-template SQL (`` sql`...` ``) or `sql.query(text, params)`, matching Neon's driver shape exactly — moving to Supabase means rewriting every single query call site to PostgREST's filter syntax, or running its own Postgres via a TCP connection pooler (reintroducing the cold-start/connection-limit problem this session already confirmed breaks Pages Functions). | High — full query-layer rewrite, or accept the same TCP constraint Neon was chosen to avoid. |

**Recommendation:** stay on Cloudflare Pages + Pages Functions + Neon.
It is already fully integrated and empirically proven to work inside
this runtime. The only real gap is that **no actual Neon project has
ever been provisioned** — that is a five-minute account action, not an
architecture decision. Add R2 later, specifically and only when the
KYC Document Centre is Board-approved (see Phase 6).

### Identity layer

Five identity types exist in the schema today, **not six** — "Executive
Identity" as a distinct account type does not exist:

| Identity | Table(s) | Login? | Notes |
|---|---|---|---|
| Parent/Guardian | `guardians`, `guardian_student`, `guardian_emergency_contacts`, `guardian_educational_interests` | Yes — self-registered | The only self-service registration path in the whole system. Identity Type field (`identity_type`) lets a guardian self-describe as Applicant/Sponsor/Alumni/Staff Member/Educational Partner — **these are labels on a guardian account, not separate real identities or Permission Engine grants.** |
| Student | `students`, `student_accounts`, `student_classes` | Yes — institution-issued only, never self-registered | A student can be linked to one or more guardians (`guardian_student`) and enrolled in one or more classes (`student_classes`, supporting genuine dual/multi-institution enrolment). |
| Staff | `staff`, `staff_accounts`, `staff_roles`, `staff_institutions` | Yes — institution-issued only | Role-based access via the Permission Engine (`functions/_lib/permissions.js` + `permission-matrix.js`), driven by `docs/role-permission-matrix.md`. A staff member can hold multiple roles and be assigned to multiple institutions. |
| "Executive"/Founder | *(none — bearer token only)* | No — not an account at all | The Founder Dashboard is gated by a single shared secret (`PORTAL_FOUNDER_TOKEN`) compared with a timing-safe check. There is no `executives` table, no login, no session, no audit trail of *who* used the token — only that *a* holder of it did. **This is a real gap if "Executive Identity" is meant to be a first-class, individually-accountable identity** — today it is an undifferentiated shared password. |
| Applicant (pre-enrolment) | `admissions_applications` | No dedicated login | An applicant is represented as a row linked to the guardian who submitted it, not as its own identity. |

Relationships, as they actually exist in the schema today:
`guardian` 1—* `guardian_student` *—1 `student` 1—* `student_classes`
*—1 `class` *—1 `institution`; `staff` 1—* `staff_roles` *—1 `role`,
and `staff` 1—* `staff_institutions` *—1 `institution`. These are
documented in full, with worked examples, in
`docs/data-ownership-register.md` and `docs/identity-migration-plan.md`
— this section summarizes rather than duplicates them.

### Security layer

| Control | Status | Evidence |
|---|---|---|
| Session security | Developed | HMAC-SHA256-signed, stateless cookies; `SameSite=Lax`; **no CSRF token exists anywhere in this project** — documented as an accepted, inherited limitation in `docs/student-portal.md`. |
| MFA readiness | Not Started | No provider evaluated, no TOTP/SMS/WebAuthn code exists. Twilio (SMS/WhatsApp OTP) was named as a candidate provider in the onboarding reality-check doc; not integrated. |
| Password recovery | Developed | `forgot-password.js` (guardian) and admin-mediated reset for student/staff, deliberately never emailing a reset link to an unauthenticated requester who merely typed in an email address — see the security rationale documented directly in `functions/_lib/email.js`'s header comment. |
| Role-based access | Developed | The Permission Engine (`functions/_lib/permissions.js`) is data-driven from `docs/role-permission-matrix.md`, checked per-request against `staff_roles` + `staff_institutions` (institution-scoped, not just role-scoped). |
| Audit logging | Developed (partial) | `auth_audit_log` (guardian + student login events) and `staff_audit_log` exist and are written to on login success/failure/lockout. **No audit log exists for data *changes*** (who edited a term result, who revoked a certificate) — only authentication events. |
| Data retention | Designed | IT-04 Records Retention Policy defines archival-vs-deletion and destruction authority — a governance document, not enforced by any running code (nothing currently auto-purges or auto-archives on a schedule). |
| Backup strategy | Not Started | No backup policy or tooling exists. |

---

## PHASE 3 — STAGING ENVIRONMENT

**Current status: Not Started. No staging environment exists.**

Proposal, to be executed *before* any domain purchase, exactly as the
directive requests:

1. Create a real Cloudflare Pages project connected to this GitHub
   repository (`ahmadsulaimiy1/Sultan-`), building from `main`. This is
   a Cloudflare *account* action — it cannot be performed from inside
   this coding session; it requires whoever holds (or creates) the
   Cloudflare account to click through the Cloudflare dashboard's "Connect
   to Git" flow.
2. Cloudflare Pages will then assign a real `*.pages.dev` URL
   automatically (its exact name depends on the project name chosen at
   creation time — this document does not guess one, since guessing a
   URL is exactly the kind of unearned claim this directive prohibits).
3. Provision one real Neon project and set `DATABASE_URL` as a Pages
   environment variable, scoped to Preview (staging) deployments —
   **kept separate from whatever variable eventually holds a production
   `DATABASE_URL`**, so staging data (including the "Sample Institutional
   Records" seeded by `/api/portal/setup`) never touches a real
   institutional database.
4. Set `SESSION_SECRET`, `PORTAL_SETUP_TOKEN`, `PORTAL_ADMIN_TOKEN`,
   `PORTAL_SYSADMIN_TOKEN`, `PORTAL_QURAN_TOKEN`, `PORTAL_FOUNDER_TOKEN`
   to real, staging-only random values (never reused from any local
   `.dev.vars` file — those are for local development only and already
   git-ignored).
5. Run `POST /api/portal/setup` once against the staging URL to create
   tables and the sample-data seed.
6. At that point — and only at that point — real registration, login,
   and dashboards become checkable at a public URL, and this document's
   Phase 5 statuses can start moving from "Merged" to "Staging Verified"
   with actual evidence (a URL, a screenshot, an HTTP response), not
   before.

Nothing above requires a purchased domain. It requires a Cloudflare
account action and a Neon account action, both outside this session's
reach.

---

## PHASE 4 — EMAIL INFRASTRUCTURE

**Current status: Designed and partially Developed (the sending code
exists); the account and domain do not.**

Proposed institutional mailbox structure (naming only — none of these
exist as real mailboxes today):

| Address | Purpose |
|---|---|
| `info@` | General enquiries |
| `admissions@` | Admissions correspondence |
| `registrar@` | Registrar's Office |
| `accounts@` | Finance/fees |
| `ict@` | ICT Office / technical support |
| `support@` | Portal/technical user support |
| `principal@` | Per-institution principal correspondence |
| `ceo@` | Executive correspondence |

Two genuinely separate concerns are being conflated in the original
directive's phrasing, worth stating precisely:

- **Transactional email** (verification links, password resets,
  notifications) is what `functions/_lib/email.js` already sends —
  this needs exactly one sending identity (e.g. `noreply@` or
  `EMAIL_FROM_ADDRESS` itself) via Resend, plus that domain's SPF/DKIM
  records pointed at Resend. This is the only email requirement Phase
  1A / this codebase actually has a dependency on.
- **Institutional mailboxes** (`admissions@`, `registrar@`, etc., for
  humans to receive and read mail) is a **separate Google
  Workspace/Microsoft 365/other mailbox-hosting decision**, unrelated
  to Resend and unrelated to this codebase. No code in this project
  reads incoming mail at any address.

Both require the domain to exist and have its DNS delegated before
either can be configured — this genuinely cannot be done before a
domain is confirmed owned and controlled.

---

## PHASE 5 — PRODUCTION READINESS REVIEW

Every module, status only as evidenced above. **"Deployed" and
"Production Verified" columns are blank throughout this table — not
because work is missing, but because this session has zero ability to
confirm either, per Phase 1's evidence.**

### Public Systems

| Module | Designed | Developed | Tested Locally | Merged | Staging Verified | Production Verified |
|---|---|---|---|---|---|---|
| Main marketing website (EN+AR) | ✓ | ✓ | ✓ | ✓ | — | — |
| Admissions / Apply flow | ✓ | ✓ | ✓ | ✓ | — | — |
| Announcement Centre | ✓ | ✓ | ✓ | ✓ | — | — |
| Adhkār Centre | ✓ | ✓ | ✓ | ✓ | — | — |
| Digital Prospectus (brochure series) | ✓ | ✓ (delivered as DOCX/PDF documents, not a web module) | N/A | N/A | N/A | N/A |
| Event Centre | — | — | — | — | — | — |

### Academic Systems

| Module | Designed | Developed | Tested Locally | Merged | Staging Verified | Production Verified |
|---|---|---|---|---|---|---|
| Student Portal | ✓ | ✓ | ✓ | ✓ | — | — |
| Parent Portal | ✓ | ✓ | ✓ | ✓ | — | — |
| Teacher Portal | ✓ | ✓ | ✓ | ✓ | — | — |
| Registrar Portal | ✓ | ✓ | ✓ | ✓ | — | — |
| Founder / Executive Dashboard *(one module, not two — see Phase 2)* | ✓ | ✓ | ✓ | ✓ | — | — |
| Academic Records | ✓ (distributed: attendance, results, fees recorded across Registrar/Teacher modules, not a standalone system) | ✓ | ✓ | ✓ | — | — |
| Digital Certificates (issue/revoke record) | ✓ | ✓ | ✓ | ✓ | — | — |
| Digital Transcripts (formal generated document/PDF) | — | — | — | — | — | — |
| LMS (courses/modules/lessons/assessments/content authoring) | — (explicitly deferred, named, in `docs/digital-campus-roadmap.md`) | — | — | — | — | — |

### Institutional Systems

| Module | Designed | Developed | Tested Locally | Merged | Staging Verified | Production Verified |
|---|---|---|---|---|---|---|
| Finance Office (fee status recording only — not a ledger/invoicing system) | ✓ | ✓ | ✓ | ✓ | — | — |
| Human Resources Office (leave/payroll/performance — beyond staff directory) | — | — | — | — | — | — |
| Registry Office | *(= Registrar Portal, above)* | | | | | |
| ICT Office (as a dedicated portal/dashboard) | — | — | — | — | — | — |
| Governance Office (as software) | — (governance is real, but expressed as documents, not a software module) | | | | | |
| Quality Assurance Office | — | — | — | — | — | — |

### Cross-cutting infrastructure

| Item | Status |
|---|---|
| Cloudflare Pages project | Not confirmed to exist |
| Neon production database | Not confirmed to exist |
| Domain (`shroyalschools.ng`) | Ownership/hosting not confirmed from this session (network policy blocked the check — see Phase 1) |
| Email sending (Resend account) | Not Started (code Developed, account not configured) |
| Institutional mailboxes | Not Started |
| CI/CD pipeline | Not Started (no workflow files exist) |
| Backup / monitoring / DR | Not Started |

---

## PHASE 6 — SHRS DIGITAL CAMPUS MASTER ROADMAP

### Immediate (infrastructure, before further large module builds)

1. Confirm domain ownership/status for `shroyalschools.ng` (or decide
   on an alternative) — a human, outside this session, with an
   unrestricted network connection, needs to actually check this.
2. Create a Cloudflare account (if one doesn't already exist) and
   connect a Cloudflare Pages project to `main`.
3. Provision one real Neon project for **staging** use.
4. Run `/api/portal/setup` once against staging; confirm every
   existing module (Phase 5's "Merged" rows) actually renders and
   functions at the staging URL — this is the step that would move
   entries from "Merged" to genuinely evidenced "Staging Verified."
5. Create a Resend account, verify a sending domain, set
   `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` in staging — confirm a real
   verification email arrives.
6. Only after 1–5 are genuinely done: provision a **separate** Neon
   project for production, a **separate** set of admin/setup tokens,
   and repeat the same setup call against it — never reusing staging
   credentials or staging data in production.

### Medium-term

- Full Admissions System (beyond the current honest-subset
  `admissions_applications` flow): document upload (needs R2), a
  staff-facing review UI beyond curl/API access, exam-scheduling
  support.
- LMS: courses/modules/lessons/assessments/content storage — needs a
  real content-authoring and hosting budget decision before any code
  is written, per `docs/digital-campus-roadmap.md`'s own conclusion.
- Mobile App: not evaluated in this document — would need its own
  architecture decision (native vs. wrapped web) once the web portals
  are genuinely production-stable.
- Digital Library: not started; would likely reuse R2 for content
  storage once that's provisioned for KYC.

### Long-term

- AI Learning Platform, SHRS University Readiness Platform, Alumni
  Network, International Student Portal — all Not Started, all
  reasonable long-term ambitions, none scoped in enough detail yet to
  produce honest module-level status for.

---

## Governing principle, restated as a standing instruction

From this point forward in this engagement: a feature being **Merged**
to `main` is not a claim that it is **Deployed**, and being **Tested
Locally** is not a claim of being **Staging Verified** or **Production
Verified**. Every future status update on any SHRS digital module
should use the exact vocabulary defined at the top of this document —
and if a status can't be evidenced by something checkable (a URL, a
screenshot, a log line, an HTTP response, a psql result), it should be
reported as unconfirmed rather than assumed.
