# SHRS Registrar's Office — Setup & Usage

Companion to `docs/identity-migration-plan.md` (read that first for how
this office fits the broader migration off bearer tokens) and
`docs/data-lifecycle-register.md` (the record-by-record accountability
picture). This document is the *how*: no new environment variables,
curl examples for every endpoint, and an honest account of what this
phase did and did not close.

## What's different about this office

Every other admin surface in this project so far (`admin/students.js`,
`admin/hifz-progress.js`) is a bearer-token-gated raw API with no staff
UI. The Registrar's Office is the first office built **UI-first,
session-and-Permission-Engine-gated from day one** — no bootstrap
token, no legacy pattern to migrate away from later. It requires no
setup step beyond what the Staff Identity Platform already needs: a
signed-in staff session and a `student_records` (and, for certificates,
`certificates`) grant from the Permission Matrix (REG/AREG hold both by
default; PRIN holds `student_records` scoped to their own institution).

Two new tables were added to `sql/schema.sql` / `setup.js`'s idempotent
statement list — re-run `/api/portal/setup` as usual if you haven't
since this phase:

- **`student_lifecycle_events`** — one append-only row per promotion,
  transfer, withdrawal, graduation, reinstatement, or initial
  enrolment. Replaces `students.status` as the only trace of these
  decisions (previously a status flip left no record of *when*, *why*,
  or *who decided*).
- **`certificates`** — permanent register, same `ON DELETE SET NULL` +
  frozen `student_full_name` pattern as the existing `ijazah_register`,
  because a certificate is exactly the kind of record a family may need
  to reference decades later.

## Staff UI

`/portal/staff/registrar/` — sign in as staff with a `student_records`
grant, look up a student by Institutional Student Number (admission
no.), and see: profile, every current enrolment, the full lifecycle
timeline, academic standing (raw attendance % and term average — no
invented Good Standing/Probation label, since no numeric thresholds are
published anywhere in governance canon), latest term results, fee
status, certificates, and a Hifz/Ijazah snapshot when the student is
Qur'an College. Every action below is available as a reasoned form on
that same page, not a bare editable table.

## Enrolling a student from an admitted application

Closes the loop the Account Creation Journey promised: Enquiry →
Application → Admission → Parent Portal, all under the one guardian
account that submitted the enquiry.

```
curl -X POST https://<your-domain>/api/portal/staff/registrar/enrol \
  -H "content-type: application/json" -b "shr_staff_session=<staff session cookie>" \
  -d '{
    "applicationId": 12, "admissionNo": "SHRS-2031",
    "institution": "Sultan Hanafi Royal College", "className": "JSS 1"
  }'
```
Requires the `student_records` Create permission. Fails with 409 if the
admission number is already in use, 404 if the application doesn't
exist. Writes an `enrolment` lifecycle event automatically.

## Recording a lifecycle event

```
curl -X POST https://<your-domain>/api/portal/staff/registrar/lifecycle-events \
  -H "content-type: application/json" -b "shr_staff_session=<staff session cookie>" \
  -d '{
    "action": "promote", "admissionNo": "SHRS-2031",
    "toInstitution": "Sultan Hanafi Royal College", "toClassName": "JSS 2",
    "reason": "Completed JSS1 with satisfactory results.",
    "effectiveDate": "2024-07-20"
  }'
```
`action` is one of `promote`, `transfer`, `withdraw`, `graduate`,
`reinstate`. `reason` is required for every action except `graduate`.
`toInstitution`/`toClassName` are required only for `promote`/`transfer`.
An optional `approvedByStaffNo` records a second signer (e.g. the
Principal) on the event — **see the honesty note below: this is
recordable, not enforced**. Requires the `student_records` Edit
permission, checked against the student's own institution for
institution-scoped grants (e.g. PRIN).

## Issuing or revoking a certificate

Certificate issuance is now a real, enforced two-step approval
(`docs/approval-workflow-architecture.md`) — a Registrar requests, a
Principal approves, and the certificate does not exist until they do:

```
curl -X POST https://<your-domain>/api/portal/staff/registrar/certificates \
  -H "content-type: application/json" -b "shr_staff_session=<REG's staff session cookie>" \
  -d '{
    "action": "issue", "admissionNo": "SHRS-2031",
    "certificateType": "Junior School Certificate", "referenceNo": "CERT-2024-009",
    "issuedAt": "2024-07-25"
  }'
# -> { "ok": true, "approvalId": <id>, "status": "pending_approval" }

curl -X POST https://<your-domain>/api/portal/staff/registrar/certificates \
  -H "content-type: application/json" -b "shr_staff_session=<a DIFFERENT staff member's session, holding PRIN>" \
  -d '{"action": "approve", "approvalId": <id>}'
# -> { "ok": true, "status": "approved", "referenceNo": "...", "verifyUrl": "...", "qrUrl": "..." }
```
`list_pending` (`{"action": "list_pending"}`) returns the decider's own
queue. Requires `certificates` Create (REG) to request and `certificates`
Approve (PRIN) to decide — checked against the real Permission Engine,
and the decider cannot be the same person who requested it. "Issue"
records that a certificate was granted — it does not generate a
PDF/physical document, since no document-generation system exists in
this project (same convention as the Ijazah register).

```
curl -X POST https://<your-domain>/api/portal/staff/registrar/certificates \
  -H "content-type: application/json" -b "shr_staff_session=<staff session cookie>" \
  -d '{"action": "revoke", "referenceNo": "CERT-2024-009", "revocationNote": "Issued in error — duplicate reference."}'
```
`revoke` is unchanged — still a single REG-held action, since the
Matrix's §4.13 table never gave PRIN a joint grant over revocation, only
over issuance.

## Correcting attendance (Migration Phase A)

```
curl -X POST https://<your-domain>/api/portal/staff/registrar/attendance \
  -H "content-type: application/json" -b "shr_staff_session=<staff session cookie>" \
  -d '{"admissionNo": "SHRS-2031", "term": "2024/2025 Term 2", "daysPresent": 55, "daysTotal": 60}'
```
Replaces `admin/students.js`'s bearer-token attendance upsert entirely
— that route now returns 410 for any `attendance` payload. **Read this
carefully before relying on it**: the Matrix grants REG/AREG only Edit
('correction' scope) on `attendance`, not Create — first-time entry for
a term is a Class Teacher function, and no Teacher account has ever
been issued in this project. This endpoint enforces that split
precisely (Create when no row exists for the student/term, Edit when
one does), which means **there is currently no working path anywhere
in this project to record a brand-new term's attendance for the first
time** — only to correct a term already on file. This is a real,
temporary gap, not a bug: see `identity-migration-plan.md`'s Phase A
status update for the full reasoning and what would resolve it (a
Teacher Portal, or an explicit Board decision to grant REG a
provisional Create permission — a governance decision, not one this
code makes on its own).

## Correcting an assessment score (Migration Phase B)

```
curl -X POST https://<your-domain>/api/portal/staff/registrar/assessments \
  -H "content-type: application/json" -b "shr_staff_session=<staff session cookie>" \
  -d '{"admissionNo": "SHRS-2031", "term": "2024/2025 Term 2", "subject": "Mathematics", "caScore": 28, "examScore": 55}'
```
Replaces `admin/students.js`'s bearer-token results upsert entirely —
that route now returns 410 for any `results` payload. Same honest split
as attendance: the Matrix grants Subject Teacher/Muhaffiz/Arabic
Instructor Create on `assessments`, REG only Edit/correction. No such
Teacher account exists yet, so — same as attendance — **there is
currently no working path to enter a brand-new subject/term score for
the first time**, only to correct one already on file. See
`docs/teacher-operating-model.md` for the proposed structural fix and
`docs/academic-records-authority-map.md` for how this interacts with
the separate, still-unenforced Results Approve/Publish step.

## Looking up a student's full record

```
curl https://<your-domain>/api/portal/staff/registrar/student?admissionNo=SHRS-2031 \
  -b "shr_staff_session=<staff session cookie>"
```
Requires the `student_records` View permission. Executive's grant on
this area is explicitly "aggregate only" in the Permission Matrix —
this endpoint enforces that qualifier by rejecting any grant whose
scope text matches "aggregate," not just checking a boolean.

## What this phase honestly left open

- **Fee entry still goes through `admin/students.js`'s bearer token.**
  Attendance (Phase A) and assessments (Phase B) are migrated; fees are
  Phase C, queued next in `identity-migration-plan.md`.
- **Certificates now enforce a real two-person approval**
  (`docs/approval-workflow-architecture.md`) — see above. **Promotions,
  withdrawals, graduations, and transfers do not yet.** The Matrix's
  "Registrar + Principal jointly" language for those four is still
  recordable via an optional `approvedByStaffId` field
  (`lifecycle-events.js`), resolved to a real staff row but never
  verified as a PRIN, a real session, or a person distinct from the
  requester — a Registrar acting alone can still record any of these
  four. Migrating them to the same `staff_approvals` engine certificates
  now uses is the named next phase in
  `docs/approval-workflow-architecture.md` §6, not done yet because it
  needs `student_lifecycle_events` to gain a pending/draft state first
  (today it writes directly, with no such column). See
  `docs/data-lifecycle-register.md` for the full accounting of where
  this project's governance language and system behaviour diverge.
- **No certificate/transcript view exists yet on the parent or student
  dashboard.** Staff can see a student's certificates; nothing renders
  them for the family yet, unlike applications, Hifz, and Ijazah, which
  already have that surface.
- **No retention/purge logic exists for any record in this register** —
  see `docs/data-lifecycle-register.md`'s closing note. Every record
  this phase can create persists indefinitely; nothing in this project
  automatically archives or deletes on a schedule.

## Testing note

Same limitation as every other portal doc in this project: no internet
egress from this sandbox, so live database calls could not be
exercised end-to-end here. The staff UI was verified locally with
Playwright driving real Chromium against mocked
`GET /api/portal/staff/registrar/student` responses, covering: a
Qur'an-College-dual-enrolled active student with full history/results/
certificates, a graduated student with empty results/lifecycle/
certificates/guardians (confirming every empty state renders an honest
message rather than a blank section), the promote/transfer conditional
form fields toggling correctly, and a 404 "no student found" response
correctly clearing any previously displayed record. This pass also
caught and fixed a real, pre-existing contrast bug affecting **every**
page using `.portal-child-head` (including the already-shipped Staff
Identity page): the card-header `<h2>` relied on inheriting white
text-color from its parent, but `brand.css`'s global
`h1,h2,h3,h4{color:var(--navy)}` rule wins over any inherited value
regardless of specificity, rendering every card-header title
navy-on-navy and invisible. Fixed in `css/portal.css` by setting the
color explicitly on `.portal-child-head h2`, which also silently fixed
the same bug on the Staff Identity, Parent Portal, and Student Portal
dashboards. Once you complete setup, sign in with a real staff account
holding a `student_records` grant and confirm a real lookup renders
correctly before relying on it.
