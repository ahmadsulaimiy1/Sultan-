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

```
curl -X POST https://<your-domain>/api/portal/staff/registrar/certificates \
  -H "content-type: application/json" -b "shr_staff_session=<staff session cookie>" \
  -d '{
    "action": "issue", "admissionNo": "SHRS-2031",
    "certificateType": "Junior School Certificate", "referenceNo": "CERT-2024-009",
    "issuedAt": "2024-07-25"
  }'

curl -X POST https://<your-domain>/api/portal/staff/registrar/certificates \
  -H "content-type: application/json" -b "shr_staff_session=<staff session cookie>" \
  -d '{"action": "revoke", "referenceNo": "CERT-2024-009", "revocationNote": "Issued in error — duplicate reference."}'
```
Requires the `certificates` Create permission (REG holds it; PRIN's
joint approval is recordable via `approvedByStaffNo`, again not
system-enforced). "Issue" records that a certificate was granted — it
does not generate a PDF/physical document, since no document-generation
system exists in this project (same convention as the Ijazah register).

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

- **Attendance and assessment records still go through
  `admin/students.js`'s bearer token.** This phase built the
  Registrar's read view and four write actions (enrol, lifecycle
  events, certificates) but did not extend session+Permission-Engine
  writes to attendance/results. `identity-migration-plan.md`'s Priority
  1 remains half-finished, not silently marked done.
- **No approval step in this office is system-enforced.** The Matrix's
  "Registrar + Principal jointly" language for promotions, withdrawals,
  graduations, and certificates is recordable via an optional
  `approvedByStaffNo` field, not gated in code. A Registrar acting alone
  can currently record any of these actions. See
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
