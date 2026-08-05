# SHRS Identity & Access Platform — Architecture

*Implements the "Staff Identity & Role System" Phase 2 Authorisation.
Builds directly on the already-accepted `role-permission-matrix.md` and
`data-ownership-register.md` — nothing below invents a role, office, or
permission those documents didn't already establish or explicitly
propose. Read this document before touching
`functions/_lib/permission-matrix.js`, `sql/schema.sql`'s Staff Identity
section, or anything under `functions/api/portal/staff/` or
`functions/api/portal/admin/staff.js`.*

---

## 0. A governance inconsistency this document resolves, not silently overrides

`role-permission-matrix.md` §4.3 flagged Staff Records as "entirely
ungoverned" and recommended: **"do not build a staff personnel-record
system in Phase 2 — build the portal login identity only."**
`data-ownership-register.md` repeated this: *"Staff records (the
personnel file, not the portal login) should not be built as a system
in Phase 2 at all."*

The Phase 2 Authorisation then asked for a Staff Data Model carrying
Staff ID, Full Name, Preferred Name, Office, Department, Position,
Employment Status, Reporting Officer, Date Joined, Active/Suspended/
Archived, Multiple Roles, and Multiple Institutional Assignments. Read
literally against the Matrix's blanket "do not build a staff personnel-
record system," these two instructions look like they conflict.

They don't, once the distinction the Matrix itself was already drawing
is made explicit: **every field the Authorisation asked for is an
organisational-directory fact — who someone is, where they sit, who
they report to, whether their account is active — not an HR-personnel
fact.** None of it is salary, leave balance, disciplinary history,
performance review, or employment contract terms — the actual reasons
HR-01 through HR-09 being almost entirely Missing made that area
"ungoverned." The Matrix's own §4.20 already anticipated exactly this
directory layer ("this tier every environment variable/bearer token...
ultimately answers to"), and the Data Ownership Register's own next
sentence says as much: *"building a staff login is Phase 2's job."*
A Staff ID, an office, a reporting line, and an active/suspended/
archived status are precisely what a login identity needs to mean
anything beyond a bare password check.

**So: this build is the Organisational Directory + the portal login
identity, exactly as both documents already sanctioned — not the HR
personnel file, which stays out of scope pending HR-04 through HR-09,
unchanged from the Matrix's original position.** Nowhere in the schema
below is there a salary field, a leave-balance field, a disciplinary-
record field, a performance-review field, or a contract-terms field.
If a future phase needs any of those, it needs its own governance work
first, the same way Finance's write access is blocked on FN-03/04/05
today.

---

## 1. Organisational Directory Model

Four new reference/structural tables, seeded with real facts already
public in `constitution-governance-charter.md` and `about-governance.html`
— never fabricated:

- **`institutions`** — formalises the four institution names already
  used as free text in `classes.institution` (Basic School, Secular
  College, School of Islamic and Arabic Studies, Qur'an College) into a real
  reference table, so offices/staff/roles can scope against an id.
  `classes.institution` itself is left unchanged (a live table with real
  student data — retrofitting it to a foreign key is real future work,
  not touched here to avoid regression risk).
- **`campuses`** — the directive's "Future Campuses" requirement, seeded
  with the one real campus (Main Campus — Ikorodu, matching the footer's
  existing copy). Adding a second campus later is one INSERT, not a
  schema change.
- **`offices`** — self-referencing (`parent_office_id`) so real
  reporting structure is representable. Seeded conservatively with only
  offices `digital-institution-blueprint.md` already names as real:
  Board of Governors, Registrar's Office, Finance Office, ICT Office.
  Deliberately does NOT seed a "Student Affairs Office," "Boarding
  Office," or "Library" row — the Blueprint itself says those are
  ungoverned/don't formally exist yet, and creating directory rows for
  them would overstate their institutional reality.
- **`departments`** — subunits within an institution/office. Secular
  College's public page mentions "seven academic departments" but does
  not name them anywhere in this codebase's governance canon, so this
  table starts **empty** rather than inventing seven plausible-sounding
  names. Populate it via `admin/staff.js`'s `create-department` action
  once the school supplies the real names.

## 2. Staff Data Model

One table, `staff`, holding exactly the organisational-directory fields
from §0: `staff_no` (Staff ID), `full_name`, `preferred_name`,
`office_id`, `department_id`, `position_title` (free-text display label,
e.g. "Principal, Royal College" — cosmetic, not the RBAC role itself),
`reports_to_staff_id` (self-referencing), `institution_id` (primary
institution), `date_joined`, `status` (`active`/`suspended`/`archived`
— the same three-state vocabulary already used for students, Archive-
over-Delete throughout). `staff_institutions` mirrors the already-proven
`student_classes` shape for **Multiple Institutional Assignments** — a
staff member teaching across two institutions is two rows, no schema
change.

**Deliberately NOT auto-seeded with real people.** Unlike the sample
guardian/student seed (explicitly fake, flagged `is_sample_data = true`,
safe to create on every idempotent setup run), the real Management Team roster (Head of Schools / Administrator,
four Principals/Head Teacher, Registrar, ICT Head, Head R&D — all
already named publicly on `/about/governance/`) is **not** inserted
automatically by `POST /api/portal/setup`. Populating real people into a
live system is an explicit, deliberate admin action, the same
"admin enters real data on purpose" convention already used for every
other real (non-demo) record in this project. See
`docs/staff-identity-platform.md` for the actual curl commands to
onboard them.

## 3. Role Assignment Engine

`staff_roles` — One User → Many Roles, exactly as required: each row is
an independent, independently-revocable grant of one `role_code`
(referencing the 16-role reference table transcribed from
`role-permission-matrix.md` §3), scoped by `institution_id`/`office_id`.
"Principal + Arabic Studies Officer," "Registrar + Admissions Officer,"
"Muhaffiz + Subject Teacher" all need zero redesign — they're two rows
each. Grants are recorded with `granted_by` and can be revoked
(`revoked_at`/`revoked_by`), never deleted — the assignment history is
itself part of the audit trail.

**This table only ever records WHO holds WHICH role, WHERE, and WHEN —
it never decides what that role can do.** That decision belongs
entirely to §4.

## 4. Permission Engine — no hardcoded role checks

`functions/_lib/permission-matrix.js` is a direct, line-by-line data
transcription of `role-permission-matrix.md` §4.1 through §4.20 — every
grant in that document is a row in this file's `MATRIX` object, tagged
with the same permission codes (V/C/E/D/A/P/X/Vf/Ar/MU) and the same
scope qualifiers ("own institution," "own assigned classes only," etc.)
the Matrix itself uses. `functions/_lib/permissions.js` is the runtime
engine: `effectiveGrants()` resolves a staff member's CURRENT roles
(active `staff_roles` rows) plus any active delegation naming them as
delegate (§5); `checkGrants()`/`hasPermissionFor()` look up whether any
effective grant authorises a given area+permission, resolving
institution-level scope automatically where the Matrix names one.

**"No hardcoded role checks. No special-case shortcuts"** is
structural, not a style preference honoured by convention: there is
exactly one file (`permission-matrix.js`) that encodes "who can do
what," and exactly one function (`hasPermission()`) that every
permission decision in this codebase must route through. A future
endpoint that wrote `if (role === 'REG') { ... }` instead of calling
this engine would be a code-review-catchable regression, not a shape
the architecture allows by default.

**Honest limit:** the engine resolves role- and institution-level scope
generically. Anything finer that the Matrix itself only expresses in
prose — "own assigned classes," "own subject," "own assigned Hifz
students" — still needs the calling endpoint's own data-aware check
(exactly as `admin/hifz-progress.js` already validates a target
student's institution before writing, today, independent of this
engine). The Permission Engine proves role+institution authorisation;
row-level scoping within that stays with the endpoint that has the
actual row in front of it.

## 5. Delegation System

`delegations` — a bounded-window, auditable, reversible grant of one
role from a delegator to a named delegate:

- **Expires automatically.** `ends_at` is `NOT NULL` at the schema
  level — an open-ended delegation cannot be created. Expiry is
  **computed at query time** (`now() BETWEEN starts_at AND ends_at`) by
  `functions/_lib/permissions.js`, not flipped by a scheduled job —
  **this project has no cron or background-worker infrastructure**
  (confirmed: no `wrangler.toml` cron trigger exists anywhere in this
  repo). A computed check can't silently fall out of date the way a
  flag waiting on a job that might not have run could. This is a
  deliberate, documented choice, not an oversight.
- **Auditable.** `reason` is `NOT NULL` — a delegation without a stated
  reason cannot be created, directly answering the "Who did what? When?
  Why?" standard. Every create/revoke writes a `staff_audit_log` row
  (§6).
- **Reversible.** `revoked_at`/`revoked_by` let the delegator (only the
  delegator — see below) end it early.
- **Self-service, session-authenticated, not bearer-token-gated.**
  `functions/api/portal/staff/delegations.js` requires the caller's own
  active staff session, not `PORTAL_SYSADMIN_TOKEN` — a real "Registrar
  absent 14 days" delegation should be attributable to the actual
  logged-in Registrar, not to "whoever holds a shared bootstrap token."
  A staff member can only delegate a role **they currently, actively
  hold** — least privilege applies to delegation itself, not only to
  direct grants; nobody can hand away authority they don't have. Capped
  at 90 days per delegation (create a new one to extend coverage,
  rather than one open-ended grant masquerading as temporary).

## 6. Audit System

"The institution should know: Who did what? When? Why?" is answered by
two tables, deliberately not one new duplicate system:

- **`auth_audit_log`** (already existed for guardian/student login
  events) now also carries `actor_type = 'staff'` rows —
  `login_success`/`login_failed`/`lockout`/`password_activated` — for
  staff sign-ins. No schema change needed; `actor_type` was always free
  text.
- **`staff_audit_log`** (new) — everything `auth_audit_log` was never
  meant to carry: `role_granted`, `role_revoked`, `delegation_created`,
  `delegation_revoked`, `record_export`, `sensitive_action`. Every write
  records `actor_staff_id` (who), `created_at` (when, DB default),
  `reason` (why, required wherever an action can meaningfully have one),
  and a `metadata` JSON blob for event-specific detail (which role,
  which institution, which delegation). `functions/_lib/audit.js`'s
  `logStaffEvent()` is the single write path — `admin/staff.js` and
  `staff/delegations.js` both call it, nothing writes to this table any
  other way.

**Honest limit:** "record access" (a plain View) is not logged —
logging every read would be a real performance and storage cost for a
project this size, and no endpoint currently needs that granularity.
What IS logged is every action the Permission Engine gates on Export
(X) or above, and every governance-shaping action (role/delegation
changes) — the actions with real accountability weight, not every GET.

## 7. Security Standard — Least Privilege

**Default access is none, structurally, not by convention:**
`effectiveGrants()` for a staff member with zero `staff_roles` rows and
zero active delegations returns an empty array; `checkGrants()` over an
empty array returns `{ granted: false }` for every single permission in
every single area. Nothing is granted by a role's mere existence in the
`roles` reference table — a role has to be explicitly assigned via
`staff_roles` (or delegated) before it authorises anything at all. The
same "every permission had to be justified against a real
responsibility" discipline `role-permission-matrix.md` §2 established
carries through unchanged into the runtime engine.

## 7a. Multi-factor authentication (email OTP)

A password-verified staff login does not receive a session cookie
immediately — it goes through a second step, a 6-digit code emailed via
Resend, using the same `login_otp_codes`/`verify-otp.js` mechanism
shared with the guardian and student portals (see
`docs/parent-portal.md`'s MFA section for the shared mechanics). The
`staff` table had no email column before this change; OTP activates
per staff member only once ICT enters one for them (via
`admin/staff.js`'s `create-staff` action's optional `email` field).
Staff without an email on file keep signing in with password only,
unchanged.

OTP doesn't repeat every login: a signed "trusted device" cookie
(`shr_trust_staff`) skips it for 7 days of active use on the same
browser, revoked automatically if the staff member's password changes.
See `docs/identity-authentication-roadmap.md` for the full risk-based
model and what's deliberately deferred (passkeys, magic links, a real
device registry, risk scoring).

## 8. User Experience Standard — what was deliberately NOT built

Per the Phase 2 Authorisation's explicit instruction, this phase does
**not** ship a staff login page framed as the deliverable, an admin
panel, or a teacher dashboard. What exists instead:

- `/portal/staff/login/` and `/portal/staff/set-password/` — necessary
  plumbing (the "Staff Identity Layer" the Expected Outcome names has to
  mean staff can actually authenticate), styled identically to the
  existing guardian/student login pages — premium, not developer-y, but
  intentionally unremarkable, because authenticating isn't the point.
- `/portal/staff/identity/` — **an identity card, not a dashboard.** It
  shows who you are, where you sit, who you report to, every role you
  hold and its source (direct grant or delegation, with expiry), and
  any delegations you've given away. It has **zero task tools, zero
  per-role controls, zero admin actions** — nothing here lets a
  Registrar do Registrar things or a Principal do Principal things.
  Those belong to whichever future office module actually needs them
  (Registrar's Office was next — see the Institutional Readiness Review
  — and a Teacher Portal followed it: `/portal/staff/teacher/`, per
  `docs/teacher-portal.md`, is exactly the kind of task-tool-bearing
  module this identity card deliberately excludes).

## 9. Bootstrap token

`PORTAL_SYSADMIN_TOKEN` — new, narrow, separate from
`PORTAL_ADMIN_TOKEN` and `PORTAL_QURAN_TOKEN`, gating
`functions/api/portal/admin/staff.js` (office/department/staff creation,
login issuance, role grant/revoke). Per `role-permission-matrix.md`
§4.20, Manage Users is "restricted to exactly one operational role
system-wide" — the narrowest-held grant in the entire Matrix — and Staff
Identity is this project's stated security and governance foundation,
so it gets the narrowest possible bootstrap credential rather than
reusing a token already used for lower-stakes data entry. See
`docs/staff-identity-platform.md` for setup and curl examples.

## 10. Founder Authority Framework — the Authority Register

`GET /api/portal/admin/authority-register` (same auth model as
admin/staff.js: staff session with `staff_records` MU, falling back to
`PORTAL_SYSADMIN_TOKEN`) merges three existing, previously-separate
tables — `office_appointments`, `staff_roles`, `delegations` — into one
chronological "who did what, when, why" feed, surfaced in the
Institutional Administration Centre (`portal/admin/centre/`) via a new
"Authority Register" button. No new schema, no new write path, and no
change to who can actually appoint or delegate: `staff.js`'s
`requireExeToTouchExe` still means only an existing Executive can grant
or revoke `EXE` itself, and `staff/delegations.js` still means nobody
can delegate a role they don't hold. This endpoint answers the
traceability half of "Founder & Head of Schools / Administrator remains the Supreme Appointing
Authority... every appointment, removal, and delegation traceable" —
`EXE` grants/revocations are flagged in their own `executive_authority`
category so they're never lost in a general role-change list.
