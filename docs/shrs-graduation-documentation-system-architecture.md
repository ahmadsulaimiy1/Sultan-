# SHRS GRADUATION DOCUMENTATION SYSTEM — ARCHITECTURE

*Prepared per the Graduation Documents Programme master directive, for the 8 August 2026 Graduation Ceremony. This is the design document required before building anything, per the directive's own "audit before producing" instruction. It states what already exists in the live portal codebase, what is genuinely new, and the staged build plan — the same discipline this governance-documentation engagement has applied throughout: check first, don't duplicate, don't fabricate.*

---

## 1. What already exists — checked, not assumed

A full investigation of the live portal codebase found real, working infrastructure that a "smart security system" for graduation documents should reuse, not reinvent:

- **`certificates` table** (`sql/schema.sql`) — a permanent, revoke-never-delete register: `student_id`, frozen `student_full_name`, free-text `certificate_type`, unique `reference_no`, `issued_by_staff_id`, `approved_by_staff_id`, `revoked_at`. **`certificate_type` is already free text** — meaning Graduation Certificate, Testimonial, Statement of Results, Character Certificate, and Graduation Clearance can all be issued through this one existing table, distinguished by type, without a schema change for the registry itself.
- **Generic approval workflow** (`functions/_lib/approvals.js`, `staff_approvals` table) — real second-party sign-off (a Registrar requests, a Principal approves; the same person cannot do both), already wired to certificate issuance. This is the joint-sign-off machinery the directive's "Graduation Approval" workflow step needs — it exists.
- **Reference-number scheme** — `SHRS-<TYPE>-<YEAR>-<sequence>`, auto-generated at approval time. Already the permanent verification ID the directive asks for.
- **Public verification** — `GET /api/certificates/verify?ref=...` (no-auth lookup, genuine/revoked/not-found states) and `GET /api/certificates/qr?ref=...` (real SVG QR code via `functions/_lib/qrcode.js`, encoding a link to `/verify-certificate/?ref=...`), plus the live public page at `/verify-certificate/`. This is a working, honest verification system today — an employer, university, or embassy can already verify a certificate by reference number or QR code. It has no rate limiting yet (a real, scoped hardening item, not a redesign).
- **Student/guardian data model** — `students`, `guardians`, `guardian_student`, `student_classes` (dual/multi-enrolment — already handles a student in both Royal College JSS3 and the School of Islamic & Arabic Studies, exactly the real case in this cohort), `term_results`, `student_lifecycle_events` (with `event_type = 'graduation'` already defined, though not yet gated by anything).
- **Ijazah register** (`ijazah_register` table) — a sibling credential register for Qur'an memorisation certification, already live with its own verification.
- **Permission Engine** (`functions/_lib/permission-matrix.js` + `permissions.js`) — role-scoped, auditable authority checks. A `transcripts` area is already defined in the matrix (Registrar: View/Create/Delete) but has zero endpoints — an orphaned area waiting to be wired up, not a gap to fill from scratch.

## 2. What is genuinely missing — the real new work

- **No document generation exists anywhere in this codebase.** Certificates today are a *record* that something was issued, not a generated PDF/printable document. This is the single largest genuinely new piece of engineering the directive asks for.
- **No `transcripts` table** — `term_results` holds raw per-subject scores, but nothing produces a locked, point-in-time transcript snapshot with its own verification reference.
- **No `alumni` table** — alumni status today is only a self-declared free-text field on a guardian's own profile, not an institutional record.
- **No graduation intake data** — the rich biographical/academic fields the directive's "Graduation Information Form" describes (photograph, date of birth, Arabic name, Qur'an memorisation level, awards, alumni contact intent) have no home in the schema today.
- **No file/photo upload exists anywhere in this codebase.** No storage backend (R2, S3, or otherwise) is wired up. This is stated plainly here because the directive asks for passport-photo and document upload, and promising that without the storage layer existing would be dishonest. It's a real, buildable, scoped piece of infrastructure — not present yet.
- **No graduation-specific approval gate.** `student_lifecycle_events` has a `'graduation'` event type, but nothing currently checks that a graduation event happened before a certificate can be issued for that student.

## 3. Document taxonomy — what's actually issued, per level

Checked against the real cohort (36 named students across four groups, several dual-enrolled between Royal College and the School of Islamic & Arabic Studies, per the existing `student_classes` model):

| Document | Nursery & Primary (BASIC) | Royal College JSS3 | Royal College SSS3 | School of Islamic & Arabic Studies (ISLAMIYYAH) |
|---|---|---|---|---|
| Certificate of Completion / Graduation Certificate | ✓ (Completion) | ✓ (Completion) | ✓ (full Graduation) | ✓ (Islamiyyah Completion) |
| Statement of Results | ✓ | ✓ | ✓ | ✓ (where assessed) |
| Testimonial | — | ✓ | ✓ | ✓ |
| Academic Transcript | — | — | ✓ | — |
| Character Certificate | — | — | ✓ | — |
| Graduation Clearance | — | ✓ | ✓ | ✓ |
| Ijazah (Qur'an memorisation) | — | — | — | where the student's own Hifz record supports it — issued via the *existing* `ijazah_register`, not duplicated here |

**Recommended addition, flagged rather than assumed:** a **Digital Graduate Record** — a single permanent portal-visible page per graduate (not a printable document) aggregating every document issued to them with live verification status, the natural home for "lifetime verification" the directive's workflow diagram describes. This is what the Alumni table + a public/portal profile page becomes.

## 4. Security & verification architecture

No new scheme is invented where the existing one already works:

- **Reference numbers**: extend the existing `SHRS-<TYPE>-<YEAR>-<seq>` pattern with new type codes (`CERT`, `TRAN`, `TEST`, `SOR`, `CHAR`, `CLR`) rather than a parallel numbering system.
- **QR codes**: reuse `functions/_lib/qrcode.js` (SVG, no external service, already produces a scannable code linking to the live verification page) for every new document type.
- **Verification page**: extend `/verify-certificate/` to also resolve `transcripts` by reference number (the only genuinely new table in the verification path), rather than building N separate verification pages.
- **Tamper detection / cryptographic hash**: the directive asks for a verification hash. The honest design is a **server-computed HMAC** (using a server-held secret, the same pattern `functions/_lib/session.js` already uses for signed session cookies) over each document's frozen fields (recipient name, document type, reference number, issue date) at issue time, stored alongside the record and re-checked on verification — catching any record tampered with after issuance. This is a real, buildable addition to the existing verify endpoint, not a new subsystem.
- **Digital seal**: rendered visually on the generated PDF (Stage 2, below) from the same brand assets already used in the Governance Charter's own flagship pipeline (`assets/images/`, the khatam-star mark) — not a new asset system.
- **What "invisible security features" honestly means here**: a repeating micro-pattern security background on the generated PDF (a real, standard security-printing technique, buildable in the same HTML→PDF pipeline) — not steganography or anything claiming forensic-grade anti-counterfeiting no institution this size actually deploys.

## 5. Data model — new tables (additive, following the codebase's own conventions exactly)

- **`graduation_records`** — one row per student per graduation session: the rich intake data (Arabic name, preferred certificate name, DOB, nationality, state/LGA, Qur'an memorisation level, Islamiyyah level, awards, alumni contact fields), a `status` lifecycle (`draft` → `submitted` → `under_review` → `verified` → `locked`), and audit fields (`submitted_by_guardian_id` or `submitted_by_student_id`, `reviewed_by_staff_id`, `locked_at`) — mirroring `admissions_applications`' own status-lifecycle pattern exactly.
- **`transcripts`** — locked snapshots: `student_id`, frozen `student_full_name`, `programme`, a JSONB `subjects` array (subject/CA/exam/total/grade, copied from `term_results` at lock time so a later `term_results` correction never silently changes an already-issued transcript), `reference_no`, issue/approval fields identical in shape to `certificates`.
- **`alumni`** — one row per graduated student, created automatically the moment a graduation record is locked: contact fields, `graduated_at`, `programme`, linking back to `student_id`.
- **`SYSTEM_AREAS`/`MATRIX`** additions: a new `graduation_records` permission area (Registrar Create/View, Principal Approve — the same joint pattern certificates already use), and the existing but orphaned `transcripts` area gets its first real endpoints.

Every new table is added to **both** `sql/schema.sql` and `functions/api/portal/setup.js`, matching the codebase's own established dual-file convention exactly (confirmed by inspection — these two files must be kept in sync for every table in this project).

## 6. Workflow (the directive's own diagram, mapped onto what's real)

```
Guardian/Student completes Graduation Information Form (NEW)
        │
        ▼
graduation_records row created, status = 'submitted'
        │
        ▼
Registry reviews (staff UI, NEW) — status → 'under_review', corrections requested if needed
        │
        ▼
Academic Office verifies results (reuses existing term_results — no new results system invented)
        │
        ▼
Finance confirms clearance (reuses existing fee_status table — already live)
        │
        ▼
Principal approves via the EXISTING staff_approvals joint-sign-off mechanism
        │
        ▼
Registry locks the record — status = 'locked'; triggers:
    • transcripts row created (SSS3 only) — reference_no assigned
    • certificates rows created per document type in Section 3's table — reference_no assigned
    • alumni row created automatically
        │
        ▼
QR codes + verification hashes generated for every issued document (reusing existing QR/verify infra)
        │
        ▼
Digital Graduate Record page live; documents available for download/print
```

This is the same shape as the directive's own workflow diagram, but every step after "Registry reviews" reuses infrastructure that already exists rather than inventing a parallel system.

## 7. Staged build plan

Building the entire ecosystem — intake form, staff dashboard, PDF generation for seven document types, hash/QR verification wiring, alumni system — in a single pass would mean shipping all of it unverified at once, which this engagement has consistently avoided. Staged instead, each stage delivered and checked before the next depends on it:

1. **Data model + Graduation Information Form** (this session) — the schema additions in Section 5, the guardian-facing intake form, and a basic staff review list. Nothing else can honestly proceed without real, validated student data — the directive's own "do not hardcode student information" instruction makes this the correct first stage, not an arbitrary one.
2. **Staff review dashboard + approval wiring** — full Registry → Academic → Finance → Principal flow using the existing `staff_approvals` engine, record locking.
3. **Document generation** — premium HTML→PDF pipeline (the same proven pattern as the Governance Charter's own flagship pipeline: `scripts/render-constitution-pdf.js`'s Playwright approach, adapted for certificate/transcript layouts) for every document type in Section 3, plus the hash/QR/seal security layer from Section 4.
4. **Alumni system + Digital Graduate Record** + verification-page extension for transcripts.
5. **File upload infrastructure** (photo/document upload) — a genuinely separate piece of infrastructure (storage backend decision, upload endpoint, virus/size validation) that the intake form can be built to accept gracefully without, and add once it exists, rather than blocking Stage 1 on it.

Stage 1 begins immediately below.

---

## 8. Stage 2 — the Graduation Approval Workflow

Per the Executive Directive of 1 August 2026 ("proceed to Stage 2, but elevate the system to flagship institutional standards"), Stage 2 replaces the placeholder Registry+Principal lock pair with the full multi-office chain the directive specified, plus a per-viewer dashboard, a real audit trail, and a first honest notification layer. This section records exactly what was built, what was reused, what is a documented interpretation rather than a fact, and what remains genuinely out of scope — the same audit discipline every prior stage in this programme has followed.

### 8.1 What was checked before building

Before writing any code, the codebase's real office/role/notification infrastructure was audited (not assumed):

- **Real offices exist today** for Academic Affairs (`academic-affairs`), Examinations (`examinations`), Finance (`finance`), Library (`library`), and ICT (`digital-services`) — each a genuine row in `offices`, each reachable via the existing generic Office Portal.
- **No office or role exists for "Vice Principal (Academic)", "Vice Principal (Administration)", or a dedicated "Disciplinary" body.** Only a single generic `VP` role exists (`proposed`, no current appointee), and disciplinary matters already live under the real `behaviour` permission area (owner: VP Administration in its own documentation, decided in practice by `VP` or `PRIN`).
- **No staff member is currently appointed** to Academic Affairs, Examinations, Library, or ICT in the seed data — these offices are real but vacant, the same "established, not yet appointed" situation this codebase already has a documented precedent for (the Designated Safeguarding Lead role).
- **`functions/_lib/approvals.js` is a single-step, two-party primitive** (one requester, one approver) with no concept of an ordered, multi-stage chain — it could not honestly be reused to build an 11-stage sequence without a new sequencing layer on top of it.
- **No staff notification feed existed anywhere.** The `notifications` table is guardian-only; the Office Portal's own "Notifications" tab said so in its own rendered text before this stage. Building one was genuinely new work, not a wiring exercise.
- **`functions/_lib/email.js` is a real, correctly-wired Resend integration that currently no-ops** (`{ sent: false, reason: 'not_configured' }`) because no `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` exists in this sandbox. Stage 2 extends its use but does not change this fact.
- **No SMS or WhatsApp Business API sending capability exists anywhere in the codebase** — confirmed by a full-repository search. The only WhatsApp-related code is the existing `wa.me` escalation-link widget, which sends nothing server-side.

### 8.2 The chain, as actually built

`functions/_lib/graduation-workflow.js`'s `STAGE_DEFINITIONS` is the single source of truth for the 11-stage sequence and who may decide each stage:

| # | Stage | Who decides | Mechanism | Blocking? |
|---|---|---|---|---|
| 1 | Registry | Registrar | Auto-cleared the moment `mark_verified` fires (Stage 1) | Yes |
| 2 | Academic Department | Anyone currently appointed to the Academic Affairs office | Office membership (`staffCanActOnOffice`) | Yes |
| 3 | Examinations & Records | Anyone currently appointed to the Examinations office | Office membership | Yes |
| 4 | Finance & Accounts | Finance Officer (`FIN`) | Permission Engine (`finance` area) — surfaces real outstanding invoices as a signal, does not block automatically | Yes |
| 5 | Disciplinary Clearance | `VP` or the student's own Principal | Permission Engine (`behaviour` area, already real) | Yes |
| 6 | Library Clearance | Anyone appointed to the Library office | Office membership | **No — future-ready.** No library catalogue system exists (confirmed in the Library office's own record); the stage exists and is decidable but never blocks completion. |
| 7 | ICT Clearance | Anyone appointed to the ICT office | Office membership | Yes |
| 8 | Principal | The student's own Principal/Head Teacher/Ra'ees/Mudeer | Permission Engine (`graduation_records` area — the same grant that used to run the old lock pair) | Yes |
| 9 | Vice Principal (Academic) | Holder of the new `VPAC` role | Permission Engine (new `graduation_clearances` area) — **no one holds this role today** | Yes |
| 10 | Vice Principal (Administration) | Holder of the new `VPAD` role | Permission Engine — **no one holds this role today** | Yes |
| 11 | Founder & CEO | `EXE` | Permission Engine — **only present when the record is flagged `requires_founder_review`** | Conditional |

Every stage is strictly sequential — a stage cannot be decided until every earlier *blocking* stage is `cleared` or `not_applicable`. This is a literal reading of the Directive's own top-to-bottom diagram and its "no shortcut should bypass mandatory approvals" instruction. The moment the last blocking stage clears, `graduation_records.status` flips to `locked` automatically — there is no separate manual "lock" step to forget or skip.

**Two new role codes were added** (`VPAC`, `VPAD`, both `proposed`, in `functions/api/portal/setup.js`'s roles seed) so the Directive's named authorities are real, checkable entries in the Permission Engine rather than hardcoded strings — consistent with this codebase's own rule that no permission decision is ever a bare `if (role === 'X')`. **No fabricated appointee was invented for either role** — until the school appoints someone via the existing Institutional Administration Centre, those two stages honestly show "no staff currently holds this authority," the same empty state this codebase already uses everywhere else a role is real but vacant.

### 8.3 Smart Approval Engine — what "smart" honestly means here

- **Approve / reject / return / correction**, not just approve/reject: `decideStage()` supports `clear`, `request_correction` (bounces the record back to the *guardian*, reusing Stage 1's own `correction_note` field so the guardian sees one consistent UI regardless of which office raised it), and `return_to_stage` (bounces the record back to a *specific earlier office*, resetting every stage from there forward to `pending`, with a mandatory reason). A `escalate_to_founder` action lets Registry or the Principal add the Founder stage to a record that wasn't originally flagged for it.
- **A real, not decorative, Finance signal**: the Finance stage queries the live `invoices` table for any unpaid/partial balance and shows it to the Finance Officer before they decide — a genuine automated check, not a rubber stamp. No equivalent automated check exists for Disciplinary Clearance because no behaviour-incident table exists in this codebase yet (confirmed by schema search) — that stage is an honest manual sign-off, not a fabricated "smart" feature.
- **"Digital signatures"**: implemented as an **Institutional Sign-Off Record**, not a cryptographic e-signature — the deciding staff member's identity, the exact decision, a mandatory or optional note, and a server-generated timestamp, captured automatically from their session and written to both `graduation_clearances` and the immutable `staff_audit_log`. This is named plainly rather than oversold as a PKI-grade signature scheme, which this project has no infrastructure for.
- **Immutable audit trail**: `staff_audit_log` (`functions/_lib/audit.js`) has exactly one write path — `INSERT`, never `UPDATE`/`DELETE` — confirmed by a full-repository grep before this stage was built. Every clear/reject/return/correction/escalation call it, so the full historical narrative of a record — even after a `return_to_stage` resets its *current* status — is always reconstructable from the audit log, filtered by `target_type = 'graduation_clearance'`.

### 8.4 Dashboards

- **Graduation Control Centre** (`/portal/staff/graduation-control/`) — the named dashboard the Directive asked for: a live "My Pending Actions" queue (self-filtering per viewer's real authority, whether that's Registry, Finance, or eventually a VP), a searchable/filterable full roster with progress bars, and a click-through Graduation Status Tracker (the ✓/⏳ timeline the Directive described) with inline decision controls. This is the single generic surface every office/role uses — adding a future institution or stage is a `STAGE_DEFINITIONS` entry, not a new page.
- **Per-office dashboards, deliberately not rebuilt from scratch**: rather than build seven new bespoke pages (Academic Affairs Dashboard, Finance Dashboard, ICT Dashboard, etc.) that would today show real data for zero appointed staff, the Graduation Control Centre's "My Pending Actions" queue is the honest per-office view — it already shows a Finance Officer only Finance items, an Examinations appointee only Examinations items, and so on, because the same generic endpoint filters by the signed-in staff member's real authority. Wiring this same queue into the *existing* generic Office Portal's Workflow Centre tab (already present on every office page) is a natural, low-risk follow-on, deliberately deferred rather than rushed, and noted here as the one incomplete item from item 2 of the Directive.
- The **Registrar's Office UI** was updated to drop the superseded two-step lock panel and link out to the Control Centre instead, so there is exactly one place a record's institutional clearance status lives — never two dashboards disagreeing with each other.

### 8.5 Notifications — built new, honestly scoped

- `staff_notifications` (new table) + `functions/_lib/notifications.js` give staff a real, first-class in-portal notification when a clearance becomes actionable for them — this did not exist before Stage 2 at all.
- Guardians are notified (via the existing guardian `notifications` table) on a correction request or on final lock, plus a best-effort email via the existing `sendEmail()` helper — which will genuinely send once the school configures `RESEND_API_KEY`, and safely no-ops until then.
- **SMS and WhatsApp are recorded as valid notification channels in the schema (`staff_notifications.channel` accepts `'sms'`/`'whatsapp'`) but nothing is sent through either today.** This is the honest meaning of "SMS-ready architecture" here: adding a real provider (e.g. Twilio) later requires no changes to any calling code, but no claim is made that a message goes anywhere today.

### 8.6 Security

- **Role-based permissions**: every stage decision is gated through the same Permission Engine (`hasPermissionFor`) or office-membership check (`staffCanActOnOffice`) every other privileged action in this codebase uses — never a bespoke check.
- **Approval history**: preserved in full in `staff_audit_log`, append-only by construction (no code path updates or deletes it).
- **Document locking**: automatic and irreversible through the normal chain — a locked record can only reopen via the explicit, logged `escalate_to_founder` path, never a silent update.
- **Complete action history / "every click traceable"**: every `clear`/`request_correction`/`return_to_stage`/`escalate_to_founder` call logs actor, target, reason, and a structured metadata payload.
- **Anti-tampering**: honestly scoped to what exists — database-level `UPDATE`/`DELETE` grants on `staff_audit_log` are not currently revoked at the Postgres role level (no code path uses them, but nothing enforces that at the database layer either); flagged here as a real hardening item for a future pass, not claimed as done.

### 8.7 Scalability

Every stage definition references an office **slug** or a **role code**, never a hardcoded institution or a specific person. Adding Sultan Hanafi's fifth institution, a new campus, or a new clearance stage in the future means adding one entry to `STAGE_DEFINITIONS` and (if needed) one office/role — no redesign of the chain engine, the Control Centre, or the notification layer.

### 8.8 Known gaps, stated plainly (per item 9 of the Directive)

1. **VPAC and VPAD have no appointee.** The two stages are real and will work the moment someone is appointed via the existing Institutional Administration Centre; until then they show an honest "vacant" state rather than a fabricated approval.
2. **The Founder-required rule is a documented interpretation, not a constitutional citation.** No specific Governance Charter article was found mandating Founder sign-off on an ordinary graduation. This project set the trigger to "any named award, or an explicit staff escalation" as a defensible default — the client should confirm or override this rule.
3. **No automated Disciplinary Clearance signal** — no behaviour-incident table exists yet in this codebase (confirmed by schema search), so this stage is manual sign-off only, unlike Finance's real invoice check.
4. **A `return_to_stage` or `request_correction` does not automatically invalidate stages that already cleared before it that lie outside the reset range** — e.g. if Finance returns a record to Academic, everything from Academic through Finance resets, but stages that already cleared *before* Academic (i.e. Registry) are not re-checked. This is a stated simplification, not an oversight.
5. **No terminal "ineligible/withdrawn" outcome exists.** The chain assumes every record eventually clears or is corrected — a permanent "this student will not graduate this cycle" state was out of scope for this pass and would need its own `graduation_records.status` value and policy owner.
6. **The generic per-office Workflow Centre tab (Academic Affairs/Examinations/Finance/Library/ICT office pages) does not yet surface this chain** — the Graduation Control Centre is the one working surface today; wiring the same data into those pages is a deferred, low-risk follow-on (see §8.4).
7. **Database-level anti-tampering** (revoking `UPDATE`/`DELETE` grants on the audit table at the Postgres role level) is not done — see §8.6.

None of the above blocks the chain from working correctly and honestly end-to-end for every stage that has a real, appointed decision-maker today (Registry, Finance, Disciplinary via VP/Principal, Principal, and Founder-when-flagged) — they are the specific, named limits of what exists, not silent gaps.

### 8.9 Verification performed

- `node --check` on every new/modified JavaScript file (all pass).
- HTML tag-balance checks on every new/modified page.
- `node scripts/build.js` — the public site build is unaffected (portal pages are hand-authored, outside the manifest pipeline).
- A Playwright, route-mocked pass covering: the Graduation Control Centre's queue, roster, search/filter, and 11-stage timeline rendering (including the non-blocking Library row and the conditional Founder row); a `clear` action round-trip confirming the correct payload reaches the endpoint and the UI re-renders without error; the Registrar's Office page confirming the superseded lock panel is gone and the new "Track institutional clearance" link is present.
- No live database exists in this sandbox, so the SQL itself (sequencing, auto-lock, correction reopening) has been read-reviewed line by line against the schema but not exercised against a real Postgres instance — the same honest limitation Stage 1 and every prior phase of this engagement has disclosed.

Stage 2 is complete for the items above. Per the Executive Directive's own instruction, Stage 3 (Document Generation & Verification System) does not begin until this section's gaps are reviewed and the client confirms readiness to proceed.

## 9. Stage 2.5 — Conditional Approval refinements

The client's Stage 2 review was a **Conditional Approval**: Stage 2 was accepted as substantially complete, but ten specific institutional refinements were required before Stage 3 could begin, framed explicitly as "institutional requirements, not optional" and governed by a standing instruction to optimise for permanence over speed. Each item below is reported the same way §8.8 reported Stage 2's gaps — what is real, what is reused, and what is honestly still missing — rather than declared complete as a whole.

### 9.1 Item 1 — Vice Principal Offices: vacancy as a first-class state

No individual was ever hard-coded. `canDecideStage()` and `recipientsForStage()` (`functions/_lib/graduation-workflow.js`) already resolved live `staff_roles`/`office_appointments` on every request — appointing someone to VPAC or VPAD via the existing Institutional Administration Centre activates their stage on the very next request, with no code change. What Stage 2 left silent was making that vacancy *visible*: `recipientsForStage()` is now exported, and `functions/api/portal/staff/graduation-clearances.js`'s `?recordId=` response now includes a per-stage `hasAppointee` boolean, rendered in the Graduation Control Centre's timeline as "Vacant — awaiting appointment" (`js/portal-graduation-control.js`). Done, front-to-back.

### 9.2 Item 2 — Graduation Approval Matrix: the Founder trigger is no longer hardcoded

Stage 2's award-based Founder trigger is removed entirely from `functions/api/portal/staff/registrar/graduation.js` — `mark_verified` no longer computes anything about awards. A new `graduation_approval_rules` table (schema + `setup.js`, both updated) holds admin-managed rows, each naming a `target_stage_code` and a `trigger_type` constrained to `constitution`, `governance_charter`, `board_resolution`, or `executive_directive` (`manual_escalation` is deliberately excluded — that per-student, one-off path remains the existing `escalate_to_founder` action, since an institution-wide standing rule and a one-off decision about one graduate are architecturally different things). `evaluateApprovalMatrix()` reads this table and is the *only* thing that can make the Founder stage globally required; `initializeClearanceChain()` calls it instead of any heuristic. `functions/api/portal/admin/approval-matrix.js` gives System Administrator/Founder authority to create and deactivate rules — checked by literal `SYSADMIN`/`EXE` role code via `effectiveGrants()`, not an area grant, because `system_settings:E` is also held by ICT for "operational settings only" and must not carry authority over a constitutional-level rule set. **Gap, stated plainly:** the admin CRUD endpoint exists but no admin screen has been built yet to drive it — an administrator can manage the Matrix today only via direct API calls, not a UI. This is the one incomplete half of item 2.

### 9.3 Items 3–5 — Disciplinary, Library, and ICT: real registers, not checkboxes

Three new tables were added (schema + `setup.js`), each with a real staff endpoint and a real signal function feeding the corresponding clearance stage:

- **Disciplinary Register** (`disciplinary_cases` — case type, severity, status, investigation state, final disposition; `functions/api/portal/staff/disciplinary-cases.js`; `disciplinarySignal()`). Reuses the existing `behaviour` permission area (VP Administration/Principal) rather than inventing a parallel authority for the same kind of record.
- **Library Loan Register** (`library_loans` — borrowed/due/returned dates, status, fines; `functions/api/portal/staff/library-loans.js`; `librarySignal()`), built ahead of any real library catalogue system, per the directive's own instruction not to wait.
- **ICT Register** (`issued_devices` — devices, ID cards, access credentials; `functions/api/portal/staff/issued-devices.js`) composed with the *existing, live* `students.identity_no`/`students.status` facts inside `ictSignal()`, rather than duplicating institutional email/portal-account state into a second table that could drift out of sync.

All three signals are now wired into `graduation-clearances.js`'s `?recordId=` response and rendered as warning chips in the Graduation Control Centre timeline (`renderSignals()` in `js/portal-graduation-control.js`) — every case entered today, even manually, immediately makes the corresponding clearance stage decision-with-information rather than a blind sign-off. **Gap, stated plainly:** no staff-facing UI exists yet to *enter* disciplinary cases, library loans, or issued devices (the endpoints exist and are callable, but nothing in the Office Portal template calls them yet) — every register is real and live-read, but data entry into any of the three is, today, an API-only capability. This mirrors Stage 2's own honesty about Finance being the one fully "smart" signal at the time; Disciplinary/Library/ICT are now equally smart to *read*, but not yet equally easy to *populate*.

### 9.4 Item 6 — Dashboard Integration

The generic Office Portal endpoint (`functions/api/portal/staff/office/[slug].js`) now computes a `graduationQueue` for any office that is a real decision point in `STAGE_DEFINITIONS` — Academic Affairs, Examinations, Finance, Library, Digital Services (ICT), and the Head Teacher/Principal/Ra'ees/Mudeer offices (via the `principal` stage) and the Executive office (via the `founder` stage) — reusing a new `queueForStageCodes()` helper in `graduation-workflow.js` that applies the exact same "currently-actionable stage" rule the central Control Centre's own queue uses, just pre-filtered to that office's stage(s). The Workflow Centre tab (`js/portal-office.js`'s `renderWorkflow()`) now renders this queue inline, with a direct link into the Graduation Control Centre for the actual decision, and the office header's pending-workflow count includes it. The stale "Graduation Readiness — no system exists yet" line in the Royal College Principal's `NOT_YET_TRACKED` list was removed, since it is no longer true. **Gap, stated plainly:** VPAC/VPAD have no dedicated office in this codebase (they are role appointments, not office seats) and the Registry stage is auto-cleared, not manually decided — so those two continue to surface only via the central Control Centre, honestly, rather than an office page that doesn't exist. Actually *deciding* a stage still happens on the Control Centre page (the office dashboard link opens it) — a fully inline decide-in-place control on the office page itself was judged unnecessary duplication of a working UI and was not built.

### 9.5 Item 7 — Digital Signatures: architecture, self-managed

`staff_signatures` (schema + `setup.js`) — one row per staff member, either a typed name in a script-style font or a small (≤200KB) base64 image, plus an optional title line, upserted via `functions/api/portal/staff/my-signature.js`. Deliberately self-service and self-scoped: `staff_id` is always read from the session, never a request body parameter, so no staff member can set or view another's signature through this endpoint. No signature image is hardcoded anywhere. **Gap, stated plainly:** no frontend screen exists yet for a staff member to actually set their own signature (e.g. on the My Identity page) — the endpoint is real and callable, but there is no button to reach it today. Whether/how a stored signature is eligible to actually appear on a Stage 3 document is explicitly left as a Stage 3 decision, not decided here.

### 9.6 Item 8 — Audit Trail hardening

`staff_audit_log` gained four columns (`ip_address`, `user_agent`, `previous_value` JSONB, `new_value` JSONB) in both schema and `setup.js`. `logStaffEvent()` accepts them (all optional, fully backward compatible with every existing call site). `requestAuditContext(request)` extracts `cf-connecting-ip`/`user-agent` from a request. Every new Stage 2.5 endpoint (`disciplinary-cases.js`, `library-loans.js`, `issued-devices.js`, `my-signature.js`, `approval-matrix.js`) calls it and logs `previousValue`/`newValue` on every state change. `graduation-workflow.js`'s own `decideStage()`/`bulkDecideStage()` now accept and thread an `auditContext` parameter through every one of their `logStaffEvent()` calls (`clear`, `request_correction`, `return_to_stage`, `escalate_to_founder`, and the nested `document_lock` event), and `graduation-clearances.js`'s POST handler now calls `requestAuditContext(request)` and passes it through on every decision made through that endpoint. Done, front-to-back, for every write path this stage touched. **Not done** (carried forward from §8.6 unchanged): database-level `UPDATE`/`DELETE` grants on `staff_audit_log` are still not revoked at the Postgres role level — no code path uses them, but nothing enforces that at the database layer either.

### 9.7 Item 9 — Batch Operations

`graduation_batches` (schema + `setup.js`) + a `batch_id` FK on `graduation_records`, for future document-batch numbering once Stage 3 exists. `bulkDecideStage()` in `graduation-workflow.js` loops the *same* `decideStage()` every individual decision uses — there is no separate "bulk" code path that could record a different, thinner audit trail; every record in a bulk action gets its own full `staff_audit_log` entry, individually traceable. `graduation-clearances.js`'s POST handler now accepts `{ action: 'bulk_decide', graduationRecordIds, stageCode, bulkAction, note }`. **Gap, stated plainly:** no bulk UI exists in the Control Centre yet (no multi-select checkboxes or a "clear all selected" button) — the bulk endpoint is real and callable, but reachable only via direct API calls today, the same honest gap as the Approval Matrix admin UI (§9.2) and the three new registers' data-entry UI (§9.3). Batch *numbering* itself (assigning records to a `graduation_batches` row) has no endpoint yet either — the table and FK exist, but nothing creates a batch or assigns records to one; this is deferred to Stage 3, where batch numbering has an actual purpose (numbering a print run of certificates). Bulk *printing* and bulk *verification* are Stage 3 concepts by definition — nothing exists yet to print or verify, so there is nothing to batch.

### 9.8 Item 10 — Stage 3 Document Specification

Delivered as a separate document, `docs/shrs-graduation-document-specification.md`, per the directive's own instruction that Stage 3 must not begin until this specification is written and reviewed. It does not generate any document — it specifies, for every graduation document this system will eventually produce, the security features, numbering scheme, verification architecture, QR/barcode implementation, digital-signature placement, seals, layout, and archival/print/paper/colour specifications, cross-referenced against what this codebase already has (the numbering/QR/verification patterns proven in the Certificate/Transcript, Finance receipt, and Digital Identity systems) versus what Stage 3 must newly build.

### 9.9 Verification performed (Stage 2.5)

- `node --check` on every new and modified JavaScript file (all pass).
- `node scripts/build.js` — the public site build is unaffected.
- No live database exists in this sandbox — every new table, query, and endpoint has been read-reviewed line by line against the schema and the existing Permission Engine/office-access patterns, consistent with the same disclosed limitation in §8.9, but not exercised against a real Postgres instance.
- The new/updated Graduation Control Centre UI (vacancy badges, the four-signal panel) and the new Office Portal Workflow Centre graduation section were reviewed against their data contracts but not re-run through a fresh Playwright pass in this session — flagged here rather than silently assumed equivalent to the §8.9 pass.

### 9.10 Honest summary — what Stage 2.5 actually closes

Every one of the ten items has real, working backend architecture: a genuine data model, a genuine endpoint, and (for items 1, 4/5/3's read side, 6, and 8) a genuine UI surface a staff member can use today. Four items have a real, callable backend with **no UI built yet** to drive them day-to-day: the Approval Matrix admin screen (§9.2), data entry into the three new registers (§9.3), staff signature self-management (§9.5), and bulk decision controls in the Control Centre (§9.7). None of these missing UI screens block Stage 3 architecturally — the data model and API surface they'd sit on top of are exactly what Stage 3 needs to be built against — but they are named here rather than folded into a claim of full completion, matching this engagement's standing discipline of never overstating a "done."

Stage 2.5 is complete for the items above, on the same honest terms Stage 2 was. Per the client's Final Executive Direction, Stage 3 (Document Generation & Intelligent Verification System) begins only once this section and `docs/shrs-graduation-document-specification.md` have been reviewed and the client confirms readiness to proceed.
