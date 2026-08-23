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

None currently open. TD-1 and TD-2 (below) were closed 2026-08-23, the
same day this register was opened.

## Closed items

### TD-1 — Client-supplied Staff ID has no unique-violation-specific handling
**Severity at discovery: Medium.** `functions/api/portal/admin/staff.js`,
`create-staff` action. Bulk staff import accepts a caller-supplied
`staffNo`, checked with a `SELECT ... WHERE staff_no = X` before `INSERT`
— a check-then-act race, not atomic. `staff.staff_no` is `TEXT NOT NULL
UNIQUE` (`sql/schema.sql`), so a genuine race surfaced as a raw database
error rather than a silent duplicate. **Closed same day.** The `INSERT`
now catches Postgres unique-violation (`23505`) specifically and returns
`"That Staff ID is already assigned — choose another or omit it to
auto-generate one."` instead of a raw database error. No schema change
needed, none made. See Governance Resolution Register 9.9.

### TD-2 — COUNT(*)+1 reference-number counters had no retry-on-conflict
**Severity at discovery: Low**, for all of the following (grouped — same
mechanism, same mitigation, same fix):
- Admission Number — `functions/_lib/identity-no.js` `generateAdmissionNo`; backstopped by `students.admission_no UNIQUE`. Called from `functions/api/portal/staff/registrar/enrol.js` and the bulk roster path in `functions/api/portal/staff/registrar/stage-certificates.js`.
- Invoice / Receipt No — `functions/_lib/finance-no.js`; backstopped by `invoices.invoice_no` / `receipts.receipt_no UNIQUE`. `receipt_no` also doubles as the public verification key (`functions/api/finance/verify-receipt.js`) — a collision there is rejected before it could ever be looked up, so the public-facing guarantee (§16.18) was never at risk, only the write path's resilience.
- Certificate reference No — `functions/api/portal/staff/registrar/certificates.js` `generateReferenceNo`, at the approval call site; backstopped by `certificates.reference_no UNIQUE`.
- Graduation document reference No — `functions/_lib/graduation-document-no.js` `generateDocumentReferenceNo` (distinct from `getOrCreateVerificationId` in the same file, fixed earlier the same day) — all four document types in `functions/api/portal/staff/registrar/graduation-documents.js`; backstopped by `graduation_documents.reference_no UNIQUE`.
- Teacher observation No — `functions/api/portal/staff/teacher-performance.js`; backstopped by `teacher_observations.observation_no UNIQUE`.
- Teacher review No — `teacher-performance.js`; backstopped by `teacher_reviews.review_no UNIQUE` (confirmed directly, `sql/schema.sql:803`).
- Behaviour incident No — `functions/api/portal/staff/behaviour.js`; backstopped by `behaviour_incidents.incident_no UNIQUE`.
- Safeguarding case No — `functions/api/portal/staff/safeguarding.js`; backstopped by `safeguarding_cases.case_no UNIQUE`.
- Certificate batch No — `functions/_lib/certificate-serial.js` `generateCertificateBatchNo`; backstopped by `stage_certificate_batches.batch_no UNIQUE`; the codebase's own comment already accepts this as a deliberate low-volume tradeoff.

**Rationale for Low, not Medium, at discovery:** every one of these is a
Registrar's Office / staff-initiated action, not a public or
high-frequency path; SHRS's real concurrency profile (one office,
sequential batch workflows) makes an actual collision rare in practice,
and every backstop meant the failure mode was "the request errors, the
user retries" — never a wrong or duplicated institutional record.

**Closed same day.** `functions/_lib/generate-with-retry.js` exports
`generateWithRetryOnConflict(sql, generate, insert, { attempts = 3 })`:
calls `generate()` for a candidate, attempts `insert(candidate)`, catches
`23505` specifically and retries with a freshly computed candidate up to
`attempts` times, rethrowing anything else unchanged. Applied to all nine
counters above, across their ten call sites, the same upgrade already
given to Student ID, Guardian ID, and Staff ID (`identity-no.js`) and to
the Permanent Verification ID (`graduation-document-no.js`,
`getOrCreateVerificationId`) earlier the same day. A staff-supplied
certificate reference number (`certificates.js`) and a staff-supplied
admission number (`enrol.js`) are still inserted directly, never silently
replaced by a fresh candidate — the retry only ever applies to a value
this codebase generated itself. Proven in
`scripts/test-generate-with-retry.mjs` (a lost race retries onto a fresh
candidate and returns the winner, never the raw error; a non-
unique-violation error is never swallowed or retried; every attempt
exhausted still fails loudly rather than fabricating a result; the
no-collision path costs exactly one generate and one insert), now in
`npm run test:certificates`. See Governance Resolution Register 9.9.

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
