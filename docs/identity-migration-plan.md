# SHRS Identity Migration Plan v1.0

*Required before any major new office is built, per the directive
following the Account Creation Journey. Audits every privileged route
in this codebase against the SHRS Identity & Access Platform (Staff
Identity & Role System, `docs/staff-identity-architecture.md`) and the
Permission Engine (`functions/_lib/permission-matrix.js`,
`functions/_lib/permissions.js`) built in that phase — most of which,
as the Institutional Readiness Review already found, nothing in this
codebase actually called yet except the one admissions-review endpoint
built alongside the Account Creation Journey.*

## Method

Every row below reflects the actual current code, read directly from
this repository, not an assumption. "Required Role"/"Required
Permission" map to `role-permission-matrix.md`'s existing role codes and
system areas — no new role or area is invented here; where the Matrix's
existing grant doesn't quite fit, that's named as a real gap, not
silently patched over.

## One necessary exception, named up front

`functions/api/portal/admin/staff.js` (the Staff Identity Platform's own
bootstrap endpoint — creates the first offices, departments, and staff
records) **cannot** be migrated to session-based auth, ever, by
construction: it exists specifically to create the accounts that a
session would need to already exist. This is the same "root credential"
problem every access-control system has at its base — it isn't a
migration gap, it's the foundation the rest of this plan's migrations
depend on. It stays `PORTAL_SYSADMIN_TOKEN`-gated permanently, held by
the narrowest possible group per `role-permission-matrix.md` §4.20.

## The audit

| Route | Current Authentication | Current Authorisation | Future Authentication | Future Authorisation | Required Role | Required Permission | Migration Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| **Announcements admin** (`admin/announcements.js`) | Bearer token, header `x-admin-token` | None beyond token possession — anyone holding `PORTAL_ADMIN_TOKEN` can publish/archive/feature any announcement | Staff session (`shr_staff_session`) | `hasPermissionFor(sql, staffId, 'communications', 'C'/'P', institutionId)` | REG (school-wide notices), PRIN (own institution), EXE (institution-wide) | C, P in `communications` | **Medium** — public-facing content, no PII, but a stale/shared token is a real defacement risk the longer it's reused | Low-Medium: content-only blast radius, but already explicitly flagged as a "temporary compromise" in `docs/announcements-system.md` since the phase it shipped in |
| **Founder Dashboard** (`founder/dashboard.js`) | Bearer token, header `x-founder-token` | None beyond token possession | Staff session | `hasPermissionFor(sql, staffId, 'analytics', 'V', null)` | EXE | V in `analytics` (aggregate-only, already enforced by the query shape) | **Low** — single real user (the CEO), read-only, no write path to secure | Low: read-only aggregates, no individual PII in the response shape by design |
| **Student/Guardian administration** (`admin/students.js`) | Bearer token, header `x-admin-token` | None beyond token possession — the single highest-blast-radius unmigrated route: full C/E on live student and guardian PII | Staff session | `hasPermissionFor(sql, staffId, 'student_records', 'C'/'E', institutionId)` + `guardian_records` equivalent | REG / AREG | C, E, Ar, X in `student_records` and `guardian_records` | **High** — this is the route the Registrar's Office phase directly replaces; migrating it is that phase's real work, not a side effect | **High**: live children's and families' real data; the current token is also how every existing guardian/student account was ever created, so migration must not break onboarding mid-flight |
| **Student login issuance** (`admin/create-student-login.js`) | Bearer token, header `x-admin-token` | None beyond token possession | Staff session | `hasPermissionFor(sql, staffId, 'student_records', 'C', institutionId)` (issuing a login is a facet of managing the student record) | REG / AREG | C in `student_records` | **High** — same reasoning as above, natural to migrate together | Medium: account-provisioning action, not a data-read, but still real PII exposure via the activation link it returns |
| **Guardian password reset** (`admin/reset-password.js`) | Bearer token, header `x-admin-token` | None beyond token possession | Staff session | `hasPermissionFor(sql, staffId, 'guardian_records', 'E', null)` | REG / AREG | E in `guardian_records` | **Medium** — lower-frequency action than the two above, but same trust boundary | Medium: an account-takeover-adjacent action (issues a working reset link) |
| **Hifz/Ijazah administration** (`admin/hifz-progress.js`) | Bearer token, header `x-quran-token` (deliberately separate token, narrower population) | None beyond token possession | Staff session | `hasPermissionFor(sql, staffId, 'hifz_records', 'C'/'E', institutionId)` + `ijazah_records` `A` for grant/revoke | MUH (own assigned students), QC-OFF (institution-wide + stage advancement), PRIN (Qur'an College, joint grant/revoke) | C, E in `hifz_records`; A in `ijazah_records` | **Medium** — smaller population than student admin, but Ijazah is a permanent credentialing record, so correctness matters more than urgency | Medium: real credentialing data (IQ-02 permanence), but already narrower-token-scoped than the general admin token |
| **Admissions review** (`staff/admissions-applications.js`) | **Already migrated** — staff session (`shr_staff_session`) | **Already migrated** — `hasPermissionFor`/`checkGrants` against `admissions`, institution-scoped for PRIN | *(target state — no further migration needed)* | *(target state)* | ADM, REG, PRIN | V, A in `admissions` | **Done** — shipped in the Account Creation Journey phase, the first real Permission Engine consumer | Low: already on the target architecture; kept here as the worked example the rest of this table follows |
| **Future Registrar's Office functions** (this phase) | N/A — being built now | N/A — being built now | Staff session, from day one | `hasPermissionFor` against `student_records`, `admissions`, `certificates`, `transcripts` per action | REG / AREG, PRIN (joint approvals) | Per §4.1/4.6/4.7/4.11/4.13/4.14 of the Matrix | **In progress — this phase** | Building session-gated from the start avoids adding a ninth bearer token to migrate later |

## Status update — after the Registrar's Office phase

The row above is now **partially done**, and the split matters more
than a single status word would convey. `functions/api/portal/staff/registrar/`
shipped four session + Permission-Engine-gated routes this phase:
`enrol.js` (student creation from an admitted application), `lifecycle-events.js`
(promotion/transfer/withdrawal/graduation/reinstatement), and
`certificates.js` (issue/revoke) — all against `student_records`/
`certificates` grants, none against a bearer token.

What did **not** move: `admin/students.js`'s attendance (`attendance_summary`),
assessment (`term_results`), and fee (`fee_status`) upserts are still
bearer-token-gated, and its direct student-create/update path remains
live and unmigrated alongside the new `enrol.js`. So "Student/Guardian
administration" in the table above is no longer accurately described by
a single row — read it as: **student lifecycle actions, migrated;
attendance/assessment/fee data entry, not migrated.** See
`docs/data-lifecycle-register.md`'s Attendance/Assessment Records rows
and its "What this register deliberately leaves open" section for the
full accounting, and `docs/registrar-office.md` for what the new
endpoints actually cover.

Guardian password reset (Priority 2) and Hifz/Ijazah administration
(Priority 3) are unchanged by this phase — still exactly as described
in the table above.

## Status update — Migration Phase A (Attendance)

Per the user's explicit "Identity Migration Execution" directive
following the Registrar's Office phase, attendance is now migrated:
`functions/api/portal/staff/registrar/attendance.js` is
session-authenticated and Permission-Engine-gated against the
`attendance` area, and `admin/students.js` now refuses any request
carrying a `body.attendance` payload (HTTP 410, pointing callers at the
new route) rather than silently accepting and dropping it.

**A real gap surfaced by doing this properly, not by taking a
shortcut**: the Matrix grants REG only Edit (`scope: 'correction'`) on
`attendance`, not Create — first-time entry for a term is a Class
Teacher (TCH) function. No Teacher account has ever been issued in this
project, and no staff-class-assignment table exists to enforce TCH's
"own class, own period" scope even if one were issued. The new endpoint
does not invent a provisional Create grant for REG to paper over this —
it checks Create when no row exists yet for a student/term and Edit
when one does, exactly per the Matrix, and returns a clear explanatory
403 on the Create path rather than a generic "forbidden." **Practical
consequence: until a Teacher Portal exists, staff can correct an
existing term's attendance through the new endpoint but cannot enter a
brand-new term's attendance for the first time anywhere in this
project** — `admin/students.js`'s old path is now closed too. This is a
real, temporary operational gap, named here rather than resolved by
guessing at a role grant the Board hasn't actually decided.

Assessment (Phase B) and Fees (Phase C) are unchanged by this update —
still on `admin/students.js`'s bearer token, still queued next.

## Status update — Migration Phase B (Assessment/Results)

Raw CA/exam score entry is migrated the same way attendance was:
`functions/api/portal/staff/registrar/assessments.js` is
session-authenticated and Permission-Engine-gated against the
`assessments` area, and `admin/students.js` now returns 410 for any
`body.results` payload.

**The same structural finding repeats, which makes it a pattern, not a
one-off**: the Matrix grants TCH/MUH/ARB Create+Edit on `assessments`
('own subject/class' scope) but REG only Edit ('correction only,
logged' scope) — exactly the Attendance/Class-Teacher split from Phase
A, mirrored for Subject Teacher/Muhaffiz/Arabic Instructor. None of
those three roles has an issued staff account, so first-time entry of a
new subject/term score has no working path anywhere in this project;
only corrections to a score already on file. Two migrations in a row
surfacing the identical dependency (mainstream academic operations
require a Teacher Portal that does not exist yet) is why a Teacher
Operating Model is now a named prerequisite — see
`docs/teacher-operating-model.md`.

**A separate, pre-existing gap this migration did not introduce or
resolve**: the Matrix's `results` area gives REG Approve/Publish/Export
and PRIN Approve('own institution') over the *finalised* aggregate,
distinct from raw `assessments` entry — but `term_results` has no
`approved_at`/`published_at` column anywhere in the schema, so a raw
score has always been visible on a guardian/student dashboard the
instant it's written, with no approval or publish gate ever enforced.
This migration moved *who may write the raw score*; it does not add a
publish gate that didn't exist before. See
`docs/academic-records-authority-map.md` for the full accounting, and
the Approval Workflow Architecture roadmap item for where an enforced
gate would eventually live.

Fees (Phase C) is unchanged — still on the bearer token, still queued.

## Status update — Migration Phase C (Fees)

`functions/api/portal/staff/finance/fees.js` is session-authenticated
and Permission-Engine-gated against the `finance` area;
`admin/students.js` now returns 410 for any `body.fees` payload.
Deliberately **no UI form exists for this endpoint** — see the reason
below.

**Per `docs/financial-authority-map.md`, produced before this
migration was finalised as directed: this is the most severe version
of the Attendance/Assessment finding, not another instance of the same
partial gap.** The Matrix's `finance` area grants Create/Edit to the
Finance Officer (`FIN`) role only — no Registrar, Principal, or
Executive grant exists at all. `FIN` is seeded `'proposed'` in
`setup.js`; no such account has ever been issued. Unlike Attendance and
Assessments, where Registrar could at least correct an existing
record, **fee entry has zero working path for anyone today** — every
staff member, including the Registrar, receives the identical 403 this
endpoint returns. This is enforced exactly as the Matrix specifies,
per the standing instruction not to invent a fallback grant for an
adjacent role to paper over a missing-role gap.

This is now the **third** migration in a row surfacing the same root
cause — an operational role the Matrix already anticipates but the
institution has never onboarded into the Staff Identity Platform
(Class Teacher/Subject Teacher/Muhaffiz/Arabic Instructor for
Attendance and Assessments; Finance Officer for Fees). See
`docs/teacher-operating-model.md` for the academic half of this and
`docs/financial-authority-map.md`'s closing section for why this is
recognised as one structural finding, not three independent ones. The
next major phase after Phase D (below) is Teacher Identity & Academic
Workforce Activation, not a fifth migration route or a new office.

## Recommended migration order

1. **Student/Guardian administration + student login issuance** — done
   *as* the Registrar's Office phase (§ below), not before it. These two
   routes are what that phase replaces; building a new office against
   the old route first would mean migrating it twice.
2. **Guardian password reset** — small, low-effort, natural to fold into
   the same phase since it shares a trust boundary with the above.
3. **Hifz/Ijazah administration** — real but smaller population;
   recommended right after the Registrar's Office phase closes, while
   the pattern is freshest, rather than left indefinitely on the old
   token.
4. **Announcements admin** — lowest content-sensitivity of the group;
   fine to defer until a Communications-role-holding office exists to
   assign it to (today, REG or EXE would hold it, per the table above).
5. **Founder Dashboard** — lowest urgency (single trusted user,
   read-only); migrate opportunistically, not on a deadline.

## What this plan is not

It is not a claim that every route above is migrated today — the table
states plainly which ones aren't. It is not a security incident report
— every unmigrated route still requires its own real, held bearer
token; nothing here is publicly exposed without a credential. It is the
honest map the next phases execute against, so migration happens
route-by-route, in the order real risk and real dependency say it
should, not all at once or arbitrarily.
