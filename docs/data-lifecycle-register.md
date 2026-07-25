# SHRS Data Lifecycle Register

*Companion to `docs/data-ownership-register.md`, required by the
Registrar's Office authorisation. That register answers a policy
question — which office owns a record type, how long governance says
it should be kept, who may approve/export/delete it — largely from
`docs/policies/records-retention-policy.md` (IT-04) and the Role &
Permission Matrix, independent of what code exists. This register
answers a systems question for the eight record types named in that
authorisation: **as the platform is actually built today**, what
creates each record, what can edit it, what approves/exports/archives
it, and whether its retention is enforced anywhere in code or is still
a policy statement with no technical backing. Where the two registers'
answers differ, that gap is named here rather than smoothed over.*

## How to read the columns

- **Creator** — the actual endpoint/actor that inserts the first row, today.
- **Owner** — the office accountable for the record's accuracy (matches the Ownership Register).
- **Editor** — what can change the record after creation, and how (a reasoned event vs. a raw field overwrite).
- **Approver** — who signs off, and whether that sign-off is *enforced by the system* or merely *recordable if supplied*.
- **Export Authority** — who/what can pull the record out (an API response, a report, a document).
- **Archive Authority** — who/what can move the record to a non-active state; distinguished from deletion, which this project avoids for anything a family may need to reference years later.
- **Retention Status** — the IT-04 period from the Ownership Register, plus whether anything in code actually enforces it (today: nothing does — no purge job exists anywhere in this project).

| Record Type | Creator | Owner | Editor | Approver | Export Authority | Archive Authority | Retention Status |
|---|---|---|---|---|---|---|---|
| **Student Records** | `registrar/enrol.js` (session + Permission Engine, `student_records`/Create) — converts an admitted admissions application into a `students` row, reusing the applying guardian's own account. `admin/students.js` (bearer `PORTAL_ADMIN_TOKEN`) can also create a student directly and remains live — flagged as an un-migrated parallel path in `identity-migration-plan.md`, not yet closed. | Registrar's Office | `registrar/lifecycle-events.js` — every change is a reasoned, timestamped event (promote/transfer/withdraw/graduate/reinstate), never a silent field overwrite; institution-scoped for Principal-tier grants. | Recordable via an optional `approvedByStaffNo` on each lifecycle event, but **not enforced** — a Registrar can record promotion/withdrawal/graduation alone; joint Registrar+Principal sign-off is a policy expectation (AC-02), not a system gate. | Registrar (individual); Executive/EXE (aggregate-only — enforced in `registrar/student.js` by rejecting any grant whose scope text matches "aggregate") | None — students are never deleted, only status-changed (`active`/`suspended`/`withdrawn`/`graduated`/`archived`) | Enrolment + 7 years post-graduation/withdrawal (IT-04 §7.1, **proposed, pending Board confirmation**). **Not enforced in code** — no scheduled purge exists anywhere in this project (confirmed: no cron trigger in `wrangler.toml`). |
| **Attendance Records** | `registrar/attendance.js` (session + Permission Engine, `attendance` area) — **as of Migration Phase A**, `admin/students.js`'s bearer-token path is closed (returns 410). Split by permission: Edit (correcting an existing term's row) is granted to REG/AREG (unscoped) and PRIN (own institution); Create (a term's first row) requires the Matrix's Class Teacher grant, which no issued staff account holds today. **Practical consequence: no working path exists anywhere in this project to enter a brand-new term's attendance for the first time**, only to correct one already on file — named plainly in `identity-migration-plan.md`'s Phase A update rather than patched by inventing a provisional grant. | Registrar / Academic Office | `registrar/attendance.js`'s upsert; still no reasoned-event trail for corrections — an upsert overwrites the prior value with no history kept, unlike `student_lifecycle_events`. | None enforced — Principal correction-oversight is a Matrix statement (§4.x), not a system check on this endpoint. | Registrar, via `registrar/student.js`'s read | None — overwritten in place, not archived | Bundled with the student record's retention (IT-04 §7.1). Not enforced in code. |
| **Assessment Records** *(raw CA/exam entry, `term_results`)* | `registrar/assessments.js` (session + Permission Engine, `assessments` area) — **as of Migration Phase B**, `admin/students.js`'s bearer-token path is closed (410). Same split as Attendance: Edit (correcting an existing student/term/subject row) is granted to REG (unscoped, 'correction only, logged'); Create (a subject's first row for a term) requires the Matrix's Subject Teacher/Muhaffiz/Arabic Instructor grant, none of which any issued staff account holds. **No working path exists to enter a brand-new subject/term score for the first time**, only to correct one already on file — the identical shape as Attendance's gap, now a confirmed pattern rather than a one-off. | Subject Teacher (once a Teacher role exists — not built), overseen by Registrar | `registrar/assessments.js`'s upsert; still no correction-history trail (matches the Ownership Register's note that corrections should stay visible — today they don't, an upsert replaces the row). | None enforced — see the separate Results row below for the Matrix's distinct, also-unenforced Approve/Publish step over the finalised aggregate. | Registrar; student/guardian for their own (`me.js`, `student/me.js`, already built) | None | Enrolment + 7 years (IT-04 §7.1). Not enforced in code. |
| **Results** *(finalised per-term aggregate — Matrix-distinct from Assessment Records above, though both live in the same `term_results` table today)* | Not separately created — a "result" is whatever raw assessment rows currently exist for a student/term; there is no distinct finalisation step or record. | Registrar, jointly with Principal | N/A — see Assessment Records | **Matrix says**: REG Approve/Publish/Export, PRIN Approve ('own institution'). **Code says**: no `approved_at`/`published_at` column exists anywhere in `term_results`; a raw score is visible on the guardian/student dashboard the instant it's written. This is the same "recordable, not enforced" pattern already found for lifecycle-event and certificate approvals, now confirmed for results too. | Registrar; student/guardian for their own | None | Enrolment + 7 years (IT-04 §7.1), same as Assessment Records since they share a table. Not enforced in code. |
| **Hifz Records** | `admin/hifz-progress.js` (bearer `PORTAL_QURAN_TOKEN`, narrower group than `PORTAL_ADMIN_TOKEN` by design) — upserts `hifz_progress`/`hifz_enrolment`, rejecting any student whose institution isn't Qur'an College before writing. | Qur'an College | Same token-gated endpoint; upsert-in-place, no history of prior Muhaffiz notes retained. | Qur'an College Officer + Principal for stage advancement (Matrix statement) — **not enforced**; the endpoint accepts a single Qur'an-College-staff token holder's write with no second sign-off. | Registrar sees the **snapshot only** (stage + verified-Juz' count) via `registrar/student.js`; full notes are Qur'an-College/student-facing only, by design (`me.js`'s comment: "not raw Muhaffiz notes"). | None — corrected in place | Not named in IT-04 at all (Ownership Register already flags this gap). No retention logic in code. |
| **Ijazah Records** | `admin/hifz-progress.js`'s `ijazah.grant` action (same `PORTAL_QURAN_TOKEN`) — grant fields are written once and treated as immutable at the application layer. | Qur'an College + Registrar | **Grant fields are never editable after creation** — the only permitted write afterward is `ijazah.revoke`, which sets `revoked_at`/`revocation_note` and nothing else. Enforced by omission (no update path exists for the grant fields), and structurally by `student_id ON DELETE SET NULL` with a frozen `student_full_name`, so the row survives even if the student record is later removed. | Same as Hifz Records — Principal+Qur'an College Officer expected jointly, not system-enforced. | Registrar, Qur'an College Officer; student/guardian for their own | **None, ever** — the one record type in this project where deletion is refused at the schema level, matching IQ-02 §7.6. | **Permanent** — the only record type in either register with an already-settled, non-negotiable answer. Enforced structurally (no delete path exists in any endpoint). |
| **Certificates** | `registrar/certificates.js`'s `issue` action (session + Permission Engine, `certificates`/Create) — the first certificate write path this project has built. | Registrar | No edit path for an issued certificate's core fields (type/reference/date) — only `revoke` exists, mirroring the Ijazah pattern deliberately. | Recordable via an optional `approvedByStaffNo` on issue, same non-enforced pattern as Student Records' lifecycle events. | Registrar; student/guardian for their own (`registrar/student.js`'s `certificates` array; guardian/student-facing surfacing not yet built — see "What this register leaves open" below) | None — `revoke` sets `revoked_at`/`revocation_note`, never deletes; `student_id ON DELETE SET NULL` mirrors Ijazah's permanence pattern | Open question, same reasoning as the Ownership Register's entry — arguably permanent given a certificate may be needed decades later. Not yet Board-confirmed. No code-level retention logic (matches the "no purge job" pattern across every record type in this register). |
| **Transcripts** | **Not a stored record.** No `transcripts` table exists anywhere in the schema. What every dashboard calls a "transcript" (`me.js`, `student/me.js`, `registrar/student.js`'s `results` array) is a live read of `term_results`, computed on request — there is nothing to create, so there is no creator. | Registrar (of the underlying `term_results` it's computed from) | N/A — editing `term_results` (see Assessment Records above) is the only way a transcript's contents change; there is no separate transcript row to edit. | N/A | Registrar; student/guardian for their own transcript preview (already built). **No document generation exists** — a transcript here means an on-screen table, never a PDF/signed document, matching this project's consistent "recording an outcome, not generating a document" convention (see Certificates/Ijazah's own header comments). | N/A — nothing stored to archive | N/A as its own record; inherits `term_results`' retention exactly. |
| **Admissions Records** | `admissions-applications.js` (guardian-facing, session-authenticated) — a self-submitted application tied to the submitting guardian's own account, per the Account Creation Journey's unification decision. | Proposed Admissions Officer, verified by Registrar (no Admissions Officer role exists yet — Registrar and Principal hold the `admissions` area's grants today, per the Permission Matrix) | `staff/admissions-applications.js`'s `update-status` action (session + Permission Engine, `admissions`/Approve, institution-scoped) — status transitions only (`submitted → under_review → waitlisted/offered/admitted/declined/withdrawn`), never a raw edit of the applicant's submitted details. | **Enforced** — the only record type in this register where approval is a real permission gate, not just a recordable field: `update-status` calls `checkGrants(grants, 'admissions', 'A', application.institution_id)` and refuses the write if it fails. | Registrar/Principal (institution-scoped); the submitting guardian sees their own application's status on their dashboard (already built) | None — a declined/withdrawn application is never deleted, only status-changed, so a family's admissions history remains traceable | 3 years from decision if not admitted; enrolment + 7 years if admitted (IT-04 §7.1). Not enforced in code — once `enrol.js` runs, the application row is marked `admitted` and simply persists; nothing purges the unsuccessful-applicant 3-year window. |

## What this register deliberately leaves open

- **Attendance (Phase A), Assessment/Results (Phase B), and Fees
  (Phase C) are all migrated now.** Financial records specifically —
  invoices, payments, waivers, refunds, arrears, statements — are
  covered in depth by the dedicated `docs/financial-authority-map.md`
  rather than duplicated in this register; only `fee_status` (a
  due/paid snapshot, not a ledger) exists as a real record today.
- **Migrating Attendance and Assessments surfaced the same real,
  previously-hidden operational gap twice, confirming it as a pattern
  rather than a one-off.** The Matrix grants REG only Edit/correction
  on both areas — Create belongs to Class Teacher / Subject Teacher /
  Muhaffiz / Arabic Instructor roles, none of which has an issued staff
  account. So as of Phase B, no working path exists anywhere in this
  project to enter a brand-new term's attendance or a brand-new
  subject/term score for the first time; only corrections to a record
  already on file are possible. This is named plainly rather than
  resolved by granting REG a Create permission the Matrix never
  assigned them — see `docs/teacher-operating-model.md` for the
  proposed structural fix.
- **The Matrix's Results Approve/Publish step has never been a real
  gate.** `term_results` carries no `approved_at`/`published_at`
  column; a raw score is visible to guardians/students the instant it's
  written. Migrating Phase B moved *who may write it*, not *whether it's
  gated before publication* — that is the Approval Workflow
  Architecture's job, still a roadmap item, not built here.
- **No approval step in this project is system-enforced except
  Admissions status changes.** Every other "joint sign-off" the Role &
  Permission Matrix describes (Registrar+Principal on promotions,
  withdrawals, graduations, certificates; Qur'an College Officer+
  Principal on Hifz stage advancement) is recordable as an optional
  field but not gated in code. That is a real gap between governance
  language and system behaviour, named here rather than implied away.
- **No retention period in this project is enforced by code.** Every
  row in this register inherits IT-04's proposed periods from the Data
  Ownership Register, and every one of them is currently "keep
  forever, nothing purges it" in practice, because no scheduled job
  exists anywhere in this repository. This is the honest current state,
  not a recommendation to build automatic deletion before the Board
  confirms the underlying periods.
- **Certificates and Transcripts have no guardian/student-facing
  surface yet.** `registrar/student.js` returns certificate data to
  staff; nothing renders a certificate list on the parent or student
  dashboard the way applications, Hifz, and Ijazah already are. Flagged
  as a real next increment for the Registrar's Office, not built this
  phase.
