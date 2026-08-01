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
