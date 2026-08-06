# SHRS Graduation Document Specification (superseded)

> **Superseded.** Following the client's Executive Authorization — Stage 3, this draft has been absorbed and substantially expanded into `docs/shrs-master-graduation-document-specification.md`, the governing standard as of that authorization. This file remains on disk as the original Stage 2.5 working note; do not treat it as current. All cross-references now point to the master specification.

**Status:** Draft for client review. Per the Stage 2 Conditional Approval directive's item 10 and the Final Executive Direction that followed it, **no Stage 3 code (document generation, PDF rendering, new verification endpoints) is written until this specification is reviewed and the client confirms readiness to proceed.** This document defines *what* every graduation document must be, not how it is coded — that is Stage 3's own build plan, to be written after this specification is approved.

This specification is written against what this codebase actually has today (confirmed by direct inspection of `functions/`, `sql/schema.sql`, and the public verification pages before drafting), not invented from scratch. Every section states plainly whether the mechanism already exists and is being reused, or is new work Stage 3 must build.

---

## 1. Document taxonomy — what is actually issued

Six document types, matching `docs/shrs-graduation-documentation-system-architecture.md` §3 and the real academic structure this system already models (five institutions, Hifz stages, Islamiyyah levels):

| # | Document | Who receives it | Data source |
|---|---|---|---|
| 1 | **Certificate of Graduation** | Every locked graduation record | `graduation_records` (frozen at lock) |
| 2 | **Academic Transcript** | Every locked graduation record with academic results | `graduation_records` + `term_results` (new locked snapshot — see §7) |
| 3 | **Testimonial / Character Reference** | On request, or automatically for records with conduct/behaviour data | `graduation_records` + `disciplinary_cases` (commendations only) |
| 4 | **Statement of Result** | Interim document, issued before full graduation clearance, for records still in the clearance chain | `graduation_records` + `term_results` (unlocked, watermarked "Interim") |
| 5 | **Ijazah (Qur'an College only)** | Hifz-track graduates who complete Ijazah requirements | `ijazah_register` (already exists — reused, not new) |
| 6 | **Graduation Ceremony Programme Entry** | Not a per-student document — a single, shared printed programme listing every graduate by institution | `graduation_records` roster query, no per-student numbering |

Document types 1, 2, 3, 4 are new. Document type 5 already has a working table, numbering, and public verification path (`ijazah_register`, verified through the same `functions/api/certificates/verify.js` endpoint that checks `certificates`) — Stage 3 only needs to confirm a graduating Hifz student's Ijazah record links to their `graduation_records` row, not rebuild anything. Document type 6 needs no per-document numbering or verification architecture at all; it is out of scope for the sections below.

---

## 2. Numbering scheme

**Reuse, not reinvent.** Two numbering families already exist and work: certificates (`SHRS-<TYPE>-<YEAR>-<seq6>`, `functions/api/portal/staff/registrar/certificates.js`) and finance documents (`SHRS-<TYPE>-<YYMMDD>-<seq6>`, `functions/_lib/finance-no.js`). Graduation documents extend the **certificate family**, since a Certificate of Graduation is a certificate in every sense this codebase already models one.

**New type-abbreviation codes**, added to the existing `generateReferenceNo()` abbreviation table (no schema change — it is a JS object literal):

| Document | Code | Example reference number |
|---|---|---|
| Certificate of Graduation | `CERT` | `SHRS-CERT-2026-000001` |
| Academic Transcript | `TRAN` | `SHRS-TRAN-2026-000001` |
| Testimonial | `TEST` | `SHRS-TEST-2026-000001` |
| Statement of Result | `SOR` | `SHRS-SOR-2026-000001` |

Sequence scope stays exactly as `generateReferenceNo()` already does it: `COUNT(*) + 1`, scoped by `certificate_type` and `EXTRACT(YEAR FROM issued_at)`. This is an accepted-race, non-atomic counter — correct for this school's volume (dozens, not thousands, of documents per year) and already the standing precedent; Stage 3 does not need a stricter (e.g. `SELECT ... FOR UPDATE`) scheme unless the client specifically wants one, which would be a deliberate hardening decision to make explicitly, not a silent default.

**Batch numbering** (Conditional Approval directive item 9): the `graduation_batches` table and `graduation_records.batch_id` FK already exist (Stage 2.5). Stage 3 adds a `batch_id` reference on the document record itself (or derives it via the linked `graduation_record_id` — no duplication needed) so a print run can be filtered and reprinted by batch without a new numbering concept.

---

## 3. Security features

Ranked by what already exists versus what is new:

### 3.1 Already real, reused as-is
- **QR code** — server-rendered SVG via `functions/_lib/qrcode.js` (the `qrcode` npm package's core + SVG renderer, chosen specifically because it runs in the Cloudflare Workers runtime with no canvas dependency). Every graduation document's QR encodes a URL to its own verification page, exactly as the existing Certificate/Ijazah, Receipt, and Identity Card QR codes already do.
- **Live lookup-by-reference verification** — the `/verify-certificate/`, `/verify-receipt/`, `/verify-identity/` pattern (static page + JS + no-auth GET-by-reference endpoint) is proven, live, and reused directly for the four new document types (see §5).
- **Reference number on the physical/PDF document** — printed in a fixed, predictable position (see §8), matching the existing certificate/receipt convention of the number being both human-readable and QR-encoded.

### 3.2 New work Stage 3 must build
- **Verification hash.** None of the three existing verification endpoints do cryptographic tamper-checking today — they are honest live database lookups, not hash-verified. A forged physical document with a real-looking but non-existent reference number is already caught (the lookup fails), but a forged document *claiming* a real reference number with altered visible data (e.g. a different grade) is not currently detectable by the verification page alone, since the page simply displays whatever the database holds for that reference. This is not a new gap Stage 3 introduces — it is the existing, honest limitation of every document type this codebase issues today (certificates, receipts, identity cards). **Recommendation:** add an HMAC-SHA256 hash of the document's core fields (student ID, document type, reference number, issue date, and — for transcripts — a hash of the locked result snapshot), computed server-side with a secret held only in Cloudflare environment variables, printed as a short truncated hash string beneath the QR code. The verification page recomputes the hash from the live database record and displays a clear "Content Verified" / "Content Mismatch" indicator distinct from "Reference Not Found." This is new work — no existing document type in this codebase does this today, so Stage 3 would be *improving* the standing security bar, not merely matching it.
- **Revocation state**, already modeled on `certificates` (`revoked_at`, `revocation_note`) — the same two columns extend to the new document types' table(s) with no new concept.

### 3.3 Explicitly out of scope for Stage 3's first pass
- Physical security paper (watermarked stock, holographic seals, micro-print) — a procurement/printing decision for the school's chosen print vendor, not a software concern. §9 states the paper specification this system assumes; sourcing the actual stock is outside this codebase's scope.
- Blockchain-anchored or third-party-notarized verification — not requested by the client and not proportionate to this institution's scale; the HMAC approach in §3.2 gives genuine tamper-evidence without external dependencies or ongoing third-party cost.

---

## 4. Digital signatures and seals

### 4.1 Digital signatures — architecture already built (Stage 2.5), placement is Stage 3's job
`staff_signatures` (schema, Stage 2.5) holds one row per staff member: either a typed name rendered in a script-style font, or a small uploaded image (≤200KB), plus an optional title line. `functions/api/portal/staff/my-signature.js` is self-service and already live. **What Stage 3 must decide and build:**
- **Eligibility** — which role(s) must have a signature on file before a document type can be generated (e.g. a Certificate of Graduation needs the signing Principal's and the Registrar's signatures on file; a document should not generate silently without one). Recommended: a small `DOCUMENT_SIGNATORIES` config map (document type → required role codes), checked at generation time, generating a clear "cannot generate: signature missing for [role]" error rather than silently omitting a signature block.
- **Placement** — where each signature renders on the document layout (see §8's per-document layout maps).
- **Vacancy handling** — if a required signatory's office is constitutionally vacant (same honest vacancy state Stage 2.5 built for VPAC/VPAD graduation clearance), the document generation must fail with a clear message, not render a blank or placeholder signature line. This directly extends the same vacancy-as-a-first-class-state principle from `docs/shrs-graduation-documentation-system-architecture.md` §9.1.

### 4.2 Institutional seal
No seal image exists in this codebase today (confirmed — no seal/crest asset beyond the general school crest already used in headers). **New work, and a content decision, not a code decision:** the client must supply (or commission) a genuine institutional seal image for embedding. Until supplied, Stage 3's layout reserves the seal's position but does not fabricate a placeholder graphic — consistent with this engagement's standing rule to never invent institutional imagery.

---

## 5. Verification architecture

Extends the existing `functions/api/certificates/verify.js` pattern rather than building four parallel new endpoints — that file already checks two tables (`certificates`, `ijazah_register`) behind one `?ref=` lookup; Stage 3 adds the new document type(s) as additional branches in the same lookup, keyed by the `SHRS-CERT-`/`SHRS-TRAN-`/`SHRS-TEST-`/`SHRS-SOR-` prefix, exactly as `functions/api/identity/verify.js` already routes by prefix shape across three different tables.

**Per-document-type verification response** (what the public `/verify-graduation-document/` page — a new, single page handling all four types by prefix, matching the existing one-page-per-family convention — displays):
- Document type, reference number, student's preferred/certificate name (never the guardian-submitted legal name, unless the document type is one where the legal name is the correct public-facing field — this must be confirmed per document type, not assumed)
- Institution, graduation session, issue date
- Active / Revoked status, with revocation note if applicable
- Content-verified / content-mismatch indicator (§3.2's hash check), once built
- **Never displayed publicly:** date of birth, home address, guardian contact details, disciplinary history, or any result breakdown beyond what the document type itself is meant to convey (a transcript verification confirms the transcript is genuine; it does not need to republish every grade on a public page — the physical/PDF document is where the full detail lives, gated by whoever is holding a copy of it, not by the public verification page).

---

## 6. Numbering, QR, and layout for each document type

### 6.1 Certificate of Graduation
- **Number:** `SHRS-CERT-<year>-<seq6>`
- **QR:** bottom-centre or bottom-right, linking to `/verify-graduation-document/?ref=SHRS-CERT-...`
- **Signatures:** Principal (or Head Teacher/Ra'ees/Mudeer as institution-appropriate) + Registrar, minimum. Vice Principal (Academic) and Founder & Head of Schools / Administrator signatures appear only when the underlying `graduation_clearances` record shows those stages as `cleared` (not `not_applicable`) — the certificate's signature block is a direct, honest reflection of who actually cleared the record, not a fixed template.
- **Layout:** portrait or landscape A4, institution crest top-centre, full ceremonial title, student's `preferred_certificate_name`, programme/level completed, graduation session, seal position bottom-centre between signature lines, reference number + QR in the bottom margin, security border.

### 6.2 Academic Transcript
- **Number:** `SHRS-TRAN-<year>-<seq6>`
- **QR + content hash:** bottom of final page, same as above.
- **Signatures:** Registrar (records custodian) + Examinations & Records officer, minimum.
- **Layout:** tabular, term-by-term or subject-by-subject depending on institution (Royal College: subject grades by term; Qur'an College: Hifz stage progression + Islamiyyah level in place of subject grades — the transcript format is not one-size-fits-all across the five institutions, matching how `graduation_records` itself already branches by institution-specific fields). Multi-page if needed, each page numbered and referenced, with the QR/hash only on the final page but every page carrying the reference number in a running header.

### 6.3 Testimonial / Character Reference
- **Number:** `SHRS-TEST-<year>-<seq6>`
- **Signatures:** Principal/Head Teacher/Ra'ees/Mudeer only (a testimonial is a leadership character reference, not a records document — Registrar's signature is not appropriate here).
- **Content source:** free-text, staff-authored per student — this is **not** auto-generated from `disciplinary_cases` data; a testimonial is a genuine written reference. The Disciplinary Register (Stage 2.5) informs whether a testimonial can honestly be issued at all (an open serious case should block issuance, mirroring how it already blocks the Disciplinary Clearance stage) but does not write the testimonial's prose.

### 6.4 Statement of Result (interim)
- **Number:** `SHRS-SOR-<year>-<seq6>`
- **Visual distinction:** a visible "INTERIM — Not a Certificate of Graduation" watermark/banner, since this document is issued to records still moving through the clearance chain, not locked ones. This distinction is a security feature in its own right — it prevents an interim statement from being mistaken for, or presented as, the final certificate.
- **Signatures:** Examinations & Records only — an interim document does not carry the full chain's authority.

---

## 7. New data model required

Consistent with this codebase's dual-file schema-sync convention (`sql/schema.sql` + `functions/api/portal/setup.js`, kept identical):

- **`graduation_documents`** — one row per issued document (any of the four new types): `id, graduation_record_id, document_type, reference_no (unique), batch_id, issued_at, issued_by_staff_id, signatories JSONB (which staff signed, snapshotted), content_hash, revoked_at, revocation_note, created_at`. Deliberately a *new* table rather than overloading the existing `certificates` table — `certificates` today models a narrower "Certificate" concept issued through its own approval chain (`functions/_lib/approvals.js` + `functions/api/portal/staff/certificates.js`); graduation documents have a different lifecycle (gated by the graduation clearance chain, not the generic two-party approval workflow) and mixing the two would blur an already-working, audited system. The Certificate of Graduation document type specifically may, on reflection during Stage 3's build, turn out to belong in `certificates` instead if the client wants a single unified certificate registry — this is a design decision to confirm with the client before Stage 3 writes the migration, not decided unilaterally here.
- **`transcript_snapshots`** — one row per generated transcript: `id, graduation_record_id, snapshot_data JSONB (locked copy of every term_results row used), generated_at`. A transcript must reflect results *as they stood at generation time*, immune to a later correction to `term_results` silently altering an already-issued transcript — the same "freeze at the moment of truth" principle `graduation_records` itself already uses for `full_legal_name`/`preferred_certificate_name`.

No changes are needed to `graduation_records` or `graduation_clearances` — both already carry everything Stage 3 needs to read.

---

## 8. Archival standards

- Every generated document's rendered PDF (once Stage 3 builds generation — see §9) should be retained, not just its database record, so a document can be reproduced identically on request years later. **New work:** this codebase has no file-storage backend today (confirmed — `staff_signatures.image_data` and every other "image" field in this codebase is a small base64 column, not a file store, precisely because none exists). Before Stage 3 builds PDF generation, the client must decide where generated PDFs are stored: Cloudflare R2 (the natural fit alongside Cloudflare Pages/Workers, and not yet provisioned in this project) is the recommended option, but this is an infrastructure decision requiring the client's sign-off before Stage 3 writes storage code, not a decision this specification makes unilaterally.
- Retention period: per **IT-04 Records Retention Policy** (already published), which already governs student academic records — graduation documents should follow whatever retention class that policy assigns to certificates/transcripts. Stage 3's build plan should cite the specific IT-04 clause rather than inventing a new retention rule.

## 9. Print and paper specifications

Software-side assumptions Stage 3's PDF templates should target, for the client/print-vendor to confirm before the first real print run:
- **Certificate of Graduation:** A4 landscape, security/watermarked certificate stock (procurement decision, not a code decision — see §3.3), full-colour (institutional gold/navy/crimson per `css/brand.css`'s existing palette).
- **Transcript, Testimonial, Statement of Result:** A4 portrait, standard letterhead stock, full-colour header/footer band with a plain-paper body permissible for internal record copies (a "for office use" black-and-white-safe rendering mode is a reasonable Stage 3 feature, not required for v1).
- **Colour specification:** reuse `css/brand.css`'s existing institutional palette variables exactly (gold `--gold`, navy, crimson, forest-green) rather than introducing a separate "print palette" that could drift from the site's real brand colours.

---

## 10. What Stage 3 must build (summary, for the client's review before authorizing work)

**Genuinely new:**
1. PDF generation pipeline — no on-demand PDF generation exists in any Cloudflare Pages Function today (the one prior PDF pipeline, `scripts/render-constitution-pdf.js`, is an offline Node/Playwright script, not deployed or callable from the portal — confirmed by inspection). This is the single largest piece of real new engineering Stage 3 requires.
2. `graduation_documents` and `transcript_snapshots` tables (§7).
3. Four new type-abbreviation codes on the existing certificate-numbering helper (§2) — small, low-risk.
4. Content-hash tamper-evidence (§3.2) — new work, and a genuine security improvement over every existing document type's current honest limitation.
5. A single new public verification page + endpoint extension, following the existing three-system pattern exactly (§5).
6. A file-storage decision and, once made, the storage integration itself (§8).
7. Signature-eligibility and seal-placement logic (§4).

**Already real and directly reusable, no new work:**
- Numbering scheme's underlying mechanism (§2).
- QR generation (`functions/_lib/qrcode.js`).
- The lookup-by-reference verification *pattern* (not the new document types' data, but the proven page/JS/endpoint shape).
- `staff_signatures` architecture (Stage 2.5).
- The full graduation intake and clearance chain's data (`graduation_records`, `graduation_clearances`) as the document generation's data source.
- Ijazah documents specifically — already fully working end-to-end.

This specification is the item 10 deliverable. Per the client's Final Executive Direction, Stage 3 work does not begin until this document and `docs/shrs-graduation-documentation-system-architecture.md`'s §9 are reviewed and the client confirms readiness to proceed.
