# Teacher Portal — Teacher Identity & Academic Workforce Activation

## What this is

A real, working login for the `TCH` (Teacher) role on the SHRS Identity
& Access Platform, and the classroom workflow that role was granted in
`docs/role-permission-matrix.md` but had never actually been given a way
to do: taking attendance and entering CA/exam scores for the classes a
teacher actually teaches.

This closes the gap `docs/identity-migration-plan.md`'s Migration Phases
A and B both surfaced independently — the Matrix grants `TCH` "own
class, own period" attendance authority and "own subject/class"
assessment authority, but until now nothing in this schema could answer
"which classes/subjects does this teacher teach?", so no Teacher account
had ever been provisioned and no endpoint could enforce that scope even
if one had been.

**What this phase built:**
- `teacher_class_assignments` (`sql/schema.sql`) — one row per (staff,
  class[, subject]). No subject = Class Teacher (whole-class attendance
  authority). A subject = Subject Teacher for that subject (assessment
  authority). A person can hold both kinds of row for the same class.
- Two new `admin/staff.js` actions — `assign-class` /
  `revoke-class-assignment` — to write those rows, same bootstrap-token
  model as `grant-role`/`revoke-role`.
- Four new session-authenticated, Permission-Engine-gated endpoints
  under `functions/api/portal/staff/teacher/`: `classes.js` (my
  classes), `roster.js` (one class's students + current-term data
  already on file), `attendance.js` and `assessments.js` (bulk,
  whole-class Create/Edit).
- `/portal/staff/teacher/` — a real page: "My Classes" → pick a class →
  a roster table with attendance and per-subject score columns you edit
  inline and save.
- A closed loophole in the existing single-student Registrar endpoints
  (`staff/registrar/attendance.js`, `assessments.js`): they now check
  `teacher_class_assignments` when the acting grant is `TCH`, not just
  the Permission Engine's institution-level check, which cannot resolve
  "own class" on its own (see `functions/_lib/permissions.js`).

**What this phase deliberately did not build**, named rather than
silently dropped:
- `MUH` (Muhaffiz) and `ARB` (Arabic & Islamic Studies Instructor)
  remain `'proposed'` roles with no issued account. `teacher_class_assignments`
  is schema-ready for them — nothing about it is TCH-specific — but
  onboarding either role and building their portal views is separate
  future work.
- `FIN` (Finance Officer) and the fee-entry gap from Migration Phase C
  are entirely unaffected.
- Teacher-to-guardian communications (Matrix §4.15, "own class only ...
  not yet built — Teacher Portal item") is still not built. This phase
  activated attendance and assessments — the two areas with a genuine
  record-writing gap — not a messaging feature.
- A **Results approve/publish gate** — `term_results` has no
  `approved_at`/`published_at` column anywhere in this schema (pre-
  existing, not introduced here). A score a teacher saves through this
  portal is visible on the guardian/student dashboard the instant it's
  written, exactly as it already was for Registrar-entered scores. See
  `docs/academic-records-authority-map.md` and the Approval Workflow
  Architecture roadmap item.
- The richer Class Teacher / Subject Teacher / Head of Subject /
  Department Head hierarchy `docs/teacher-operating-model.md` proposes
  is still **proposed, pending Board adoption** — this phase uses only
  the single `TCH` code that already exists in `roles`/`permission-matrix.js`,
  and does not adopt that richer model on its own authority.

## Setup

Shares the same Cloudflare Pages + Neon database and `PORTAL_SYSADMIN_TOKEN`
as the rest of the Staff Identity Platform — see
`docs/staff-identity-architecture.md` if you haven't set that up yet.

1. **Redeploy**, then **re-run the setup endpoint** (safe to run again —
   every statement is additive):
   ```
   curl -X POST https://<your-domain>/api/portal/setup \
     -H "x-setup-token: <the PORTAL_SETUP_TOKEN you set>"
   ```
   This creates `teacher_class_assignments` and, if `PORTAL_DEMO_PASSWORD`
   is set, also provisions a demo Teacher — staff number `DEMO-TCH-0001`,
   assigned as Class Teacher and Mathematics Subject Teacher for the
   same `JSS 1` class the existing `DEMO-0001` demo student belongs to,
   so the Teacher Portal can be tried end-to-end without hand-calling
   the admin API.

2. **Try it.** Sign in at `/portal/staff/login/` with staff number
   `DEMO-TCH-0001` and your `PORTAL_DEMO_PASSWORD`, then go to
   `/portal/staff/teacher/`. You should see "JSS 1" under My Classes,
   tagged Class Teacher with a Mathematics chip. Opening it shows the
   roster with `DEMO-0001`'s existing attendance and Mathematics score
   already filled in (seeded by `setup.js`) — editing and re-saving
   either confirms the Edit path; adding a second student's numbers for
   the first time confirms Create.

## Assigning a real teacher to a class

The staff member must already have a `staff` record, a login, and the
`TCH` role granted (`admin/staff.js`'s `create-staff` → `create-login` →
`grant-role` sequence — see `docs/staff-identity-architecture.md`).
Then assign them to a class:

```
# Class Teacher (whole-class attendance authority) — omit "subject"
curl -X POST https://<your-domain>/api/portal/admin/staff \
  -H "x-sysadmin-token: <the PORTAL_SYSADMIN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{ "action": "assign-class", "staffNo": "STF-0042",
        "institutionName": "Royal College", "className": "JSS 1" }'

# Subject Teacher (per-subject assessment authority) — include "subject"
curl -X POST https://<your-domain>/api/portal/admin/staff \
  -H "x-sysadmin-token: <the PORTAL_SYSADMIN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{ "action": "assign-class", "staffNo": "STF-0042",
        "institutionName": "Royal College", "className": "JSS 1",
        "subject": "Mathematics" }'
```

A teacher can hold both kinds of row for the same class (a Form Teacher
who also teaches a subject to their own form), and multiple subject
rows across different classes. To remove an assignment:

```
curl -X POST https://<your-domain>/api/portal/admin/staff \
  -H "x-sysadmin-token: <the PORTAL_SYSADMIN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{ "action": "revoke-class-assignment", "assignmentId": 7, "reason": "Reassigned for Second Term" }'
```

Rows are revoked, never deleted — `revoked_at`/`revoked_by_staff_id` are
set, the row and its history stay on file, same pattern as `staff_roles`.

## What the roster/attendance/assessments endpoints actually enforce

Every write goes through two checks, not one:

1. **The Permission Engine** (`hasPermissionFor` — role holds Create or
   Edit on the `attendance`/`assessments` area at all, institution-
   checked where the Matrix's scope string says so).
2. **The assignment table** — an active `teacher_class_assignments` row
   naming this exact class (and, for assessments, this exact subject).
   This is the "own class, own period" / "own subject/class" scope
   the Permission Engine's generic institution check cannot resolve on
   its own (see the comment in `functions/_lib/permissions.js`) — it's
   the piece this phase actually added.

A bulk submission can be a genuine mix of first-time entries and
corrections within the same class (some students already have a row
this term, some don't) — both endpoints check Create and Edit
separately and only require whichever permission the submission
actually needs.

## Audit log

Every attendance/score save writes one `staff_audit_log` row per bulk
submission (not one per student) — `event_type: 'sensitive_action'`,
`target_type: 'attendance_summary'` or `'term_results'`, `target_id` the
class id, `metadata` carrying the term/subject and how many students'
records were saved. Role grants and class assignments write their own
rows the same way `grant-role`/`revoke-role` already do.

## Testing note

This sandbox has no egress to Neon (confirmed via direct curl to
`neon.tech`/`console.neon.tech` returning 403) — the same pre-existing
limitation every other portal doc in this project documents. The new
endpoints, the roster table's Create-vs-Edit rendering, and the class
list's badge/chip rendering were verified with Playwright driving real
Chromium against a local server with `/api/portal/staff/*` routes
intercepted via fixture JSON (a Class Teacher with one subject, a
Subject-only Teacher, and an empty "no classes assigned" state) — the
same discipline used for the Student Portal's Tier 1 verification.
Running the full flow against a real Neon project — grant `TCH`, assign
a class, sign in, take attendance for a brand-new term, enter a score
for a brand-new subject, confirm both appear instantly on the linked
guardian/student dashboards — is Tier 2, to be run by whoever completes
setup against a real database.
