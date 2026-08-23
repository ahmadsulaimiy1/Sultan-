# Technical Debt Register

**Founder's ruling, 2026-08-23** (`stromex/editorial-bible/16-ai-operating-constitution.md`
§16.19, Proactive Architecture Assurance): a lower-priority finding is
never simply noted and left — it is entered here, severity-classified,
with rationale and a remediation plan, alongside its entry in
`docs/governance-resolution-register.md`. This register is that home.

**How to read severity here**, specific to identifier-generation risk
(§16.19.4): the deciding question is not "could this fail" but **"does a
failure corrupt data silently, or fail loudly and safely."** Every item
below is backstopped by a database `UNIQUE` constraint, so a genuine
collision is rejected as a failed request — annoying, never silent, never
a duplicate or misassigned identifier in the data itself. That is why
none of these are Critical or High: the one finding that lacked a
backstop (the Permanent Verification ID) was fixed the same day it was
found, not filed here — see Governance Resolution Register 9.7.

## Open items

### TD-1 — Client-supplied Staff ID has no unique-violation-specific handling
**Severity: Medium.** `functions/api/portal/admin/staff.js`, `create-staff`
action (~line 520). Bulk staff import accepts a caller-supplied `staffNo`,
checked with a `SELECT ... WHERE staff_no = X` before `INSERT` — a
check-then-act race, not atomic. `staff.staff_no` is `TEXT NOT NULL UNIQUE`
(`sql/schema.sql`), so a genuine race surfaces as a raw database error
rather than a silent duplicate. Medium rather than Low because this is an
administrative HR path (staff records, not a student-facing counter) where
a confusing raw error is a worse experience for the ICT Head running an
import than for an ordinary user.
**Remediation plan:** catch the unique-violation (Postgres code `23505`)
specifically and return `"That Staff ID is already assigned — choose
another or omit it to auto-generate one."` No schema change needed.

### TD-2 — COUNT(*)+1 reference-number counters have no retry-on-conflict
**Severity: Low**, for all of the following (grouped — same mechanism,
same mitigation, same fix):
- Admission Number — `functions/_lib/identity-no.js:161` `generateAdmissionNo`; backstopped by `students.admission_no UNIQUE`.
- Invoice / Receipt No — `functions/_lib/finance-no.js:23,32`; backstopped by `invoices.invoice_no` / `receipts.receipt_no UNIQUE`. `receipt_no` also doubles as the public verification key (`functions/api/finance/verify-receipt.js`) — a collision there is rejected before it could ever be looked up, so the public-facing guarantee (§16.18) is not at risk, only the write path's resilience.
- Certificate reference No — `functions/api/portal/staff/registrar/certificates.js:45` `generateReferenceNo`, no catch/retry at the approval call site (~line 145); backstopped by `certificates.reference_no UNIQUE`.
- Graduation document reference No — `functions/_lib/graduation-document-no.js:22` `generateDocumentReferenceNo` (distinct from `getOrCreateVerificationId` in the same file, already fixed 2026-08-23); backstopped by `graduation_documents.reference_no UNIQUE`.
- Teacher observation No — `functions/api/portal/staff/teacher-performance.js:129`; backstopped by `teacher_observations.observation_no UNIQUE`.
- Teacher review No — `teacher-performance.js:160`; backstopped by `teacher_reviews.review_no UNIQUE` (confirmed directly, `sql/schema.sql:803`).
- Behaviour incident No — `functions/api/portal/staff/behaviour.js:150`; backstopped by `behaviour_incidents.incident_no UNIQUE`.
- Safeguarding case No — `functions/api/portal/staff/safeguarding.js:140`; backstopped by `safeguarding_cases.case_no UNIQUE`.
- Certificate batch No — `functions/_lib/certificate-serial.js:414` `generateCertificateBatchNo`; backstopped by `stage_certificate_batches.batch_no UNIQUE`; the codebase's own comment already accepts this as a deliberate low-volume tradeoff.

**Rationale for Low, not Medium:** every one of these is a Registrar's
Office / staff-initiated action, not a public or high-frequency path;
SHRS's real concurrency profile (one office, sequential batch workflows)
makes an actual collision rare in practice, and every backstop means the
failure mode is "the request errors, the user retries" — never a wrong or
duplicated institutional record.

**Remediation plan:** one shared `generateWithRetryOnConflict(sql, fn,
{ attempts = 3 })` helper — call `fn()` to compute a candidate, attempt
the insert, catch `23505` specifically, and retry with a freshly computed
candidate up to `attempts` times before surfacing a clear error. Apply it
to all nine call sites above in one pass, the same upgrade already given
to Student ID, Guardian ID, and Staff ID (`identity-no.js`) and to the
Permanent Verification ID (`graduation-document-no.js`,
`getOrCreateVerificationId`) on 2026-08-23. Not yet built — this is the
next natural piece of identifier-trust work, not an emergency.

## Closed items

### TD-0 — Permanent Verification ID had no collision backstop at all
**Severity at discovery: Critical** (the one item in the 2026-08-23 audit
with no `UNIQUE` constraint behind it — a genuine silent-collision risk,
not merely a loud-failure inconvenience). **Closed same day.** See
Governance Resolution Register 9.7 and
`scripts/test-graduation-verification-id.mjs` for the full account and
the concurrency proof.

## How to close an item

Move it to "Closed items" with the severity it was found at, the fix, and
where it's proven (a test, a live check, or both) — never just delete the
row. Add the corresponding governance register entry number. An item
half-fixed (code shipped, no test; a schema change with no code using it
yet) stays open until both exist.
