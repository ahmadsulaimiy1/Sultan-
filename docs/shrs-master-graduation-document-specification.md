# SHRS Master Graduation Document Specification (v1.0)

**Status: Draft, submitted for internal approval per Executive Authorization — Stage 3.**
**Authority: Founder & Head of Schools / Administrator, Sultan Hanafi Royal Schools.**
**Scope: The permanent institutional standard governing every graduation document SHRS issues, in perpetuity, across every present and future campus/college.**

> "No document generation should begin until this specification is internally complete." This document is that specification. Section 21 records its internal approval — a self-audit against six professional lenses (University Registrar, Academic Records Director, Security Printing Consultant, Digital Identity Architect, Executive Publication Director, Ministry of Education Certification Specialist) — before a single line of Stage 3 code is written. Section 22 is the client's own sign-off block.

This document supersedes and absorbs `docs/shrs-graduation-document-specification.md` (the Stage 2.5 draft), which remains on disk as the earlier working note but is no longer the governing standard. Every cross-reference in `docs/shrs-graduation-documentation-system-architecture.md` §9.8 now points here.

---

## 0. How this document is built

Two disciplines govern every section below, carried over from every prior phase of this engagement and now applied at maximum rigour because — as directed — this is the part the world will see:

1. **Nothing is invented.** Every technical claim about what this codebase can or cannot do today was verified by direct inspection before being written down (existing numbering helpers, existing QR renderer, existing brand colour tokens, existing offline PDF pipeline, the actual binaries available in this build environment vs. the actual binaries available in the Cloudflare Pages Functions production runtime — these are different, and conflating them would be the single most damaging honesty failure this document could make). Where a genuine constraint exists, it is stated as a constraint, with the real engineering answer, not papered over.
2. **Every institution named in the Final Expectation — University Registrar, Academic Records Director, Security Printing Consultant, Digital Identity Architect, Executive Publication Director, Ministry of Education Certification Specialist — is a lens applied to every section, not a chapter written once.** Section 18 maps each lens to who at SHRS actually owns it (or names the honest gap where no one does yet).

---

## 1. Document Ecosystem — Full Catalogue

Seventeen document types were named in the authorization. Three internationally-recognized document types were identified as missing and are added below (§1.4), and one class of request is explicitly declared out of scope with the reasoning stated (§1.5) — exactly as instructed: identify what's missing, add it; do not silently expand scope where it doesn't belong.

### 1.1 Core Academic Record Documents (Class A — see §2.2 for security tier)

| # | Document | Trigger | Data source |
|---|---|---|---|
| 1 | **Graduation Certificate** | `graduation_records.status = 'locked'` | `graduation_records` (frozen at lock) |
| 2 | **Official Academic Transcript** | Locked record with academic results | `graduation_records` + a new locked `transcript_snapshots` row (§16.2) |
| 3 | **Diploma Supplement** *(added — see §1.4)* | Issued alongside the Transcript | Institution's own curriculum/grading-scale reference data + the Transcript |
| 4 | **Statement of Results** | Interim, issued to records still moving through the clearance chain | `graduation_records` + live `term_results` |
| 5 | **Provisional Certificate** *(added — see §1.4)* | Issued once all blocking clearances pass but before the final parchment prints | `graduation_records` at the moment of auto-lock |

### 1.2 Institutional Recognition Documents (Class B)

| # | Document | Trigger | Data source |
|---|---|---|---|
| 6 | **Official Testimonial** | Staff-authored, on request or automatically offered at lock | Free-text, staff-authored (§16.4) |
| 7 | **Character Certificate** | Staff-authored, distinct from the Testimonial (§16.5) | `disciplinary_cases` (informs eligibility only) + staff attestation |
| 8 | **Graduation Clearance Certificate** | Chain fully cleared (`isChainComplete()`) | `graduation_clearances` full timeline |

### 1.3 Identity & Registry Documents

| # | Document | Trigger | Data source |
|---|---|---|---|
| 9 | **Alumni Registration Certificate** | On enrolment into the Alumni register (a real, if thin, existing office — see `docs/institutional-portal-architecture.md`'s Institutional Services Layer) | New `alumni_register` linkage (§19) |
| 10 | **Digital Graduate Profile** | Generated alongside the Certificate | A public-safe subset of `graduation_records` + verification identifiers |
| 11 | **Lifetime Verification Record** | Created once, at first issuance, never regenerated | `graduation_documents` + `verification_log` (§3.6) |
| 12 | **Graduation Register** | One per ceremony/session, not per student | Roster query — no per-document numbering (§1.1 footnote) |

### 1.4 Distinction & Award Documents

| # | Document | Trigger | Data source |
|---|---|---|---|
| 13 | **Award Certificates** (general) | `graduation_records.academic_awards`/`leadership_awards`/`sports_awards`/`other_honours` | `graduation_records` award fields |
| 14 | **Qur'an Certificates** | Hifz-track completion | `hifz_enrolment` + `ijazah_register` (both already exist and already have working numbering/verification — see §19) |
| 15 | **Islamiyyah Certificates** | `graduation_records.islamiyyah_level` | `graduation_records` |
| 16 | **Special Distinction Certificates** | Manually awarded, exceptional cases | Staff-entered, Founder/Board-approved |
| 17 | **Board Awards** | Board of Governors resolution | Linked to `resolutions` (Governance Headquarters — already exists) |
| 18 | **Founder Awards** | Founder & Head of Schools / Administrator discretion | Staff-entered, EXE-approved |
| 19 | **Head of Schools / Administrator Awards** | Same authority as Founder Awards at SHRS (the Founder holds the Head of Schools / Administrator role — see `role-permission-matrix.md`) — **treated as one document template with a selectable honorific line, not two separate systems**, since inventing two parallel award registries for one authority would be duplication, not rigour |

### 1.4 Internationally-Recognized Additions

The authorization explicitly asked: *if internationally recognised graduation documents are missing, identify them and add them.* Three were identified, all genuinely standard in institutions that operate at the international-recognition tier SHRS is now building toward:

- **Diploma Supplement** (added to §1.1 as document #3). Standard in the Bologna Process and increasingly requested by universities and immigration authorities worldwide as a structured explanation of *what the transcript means* — grading scale, credit/contact-hour equivalence, institutional accreditation status, and a plain-language description of the programme completed. Without it, an excellent transcript can still be unreadable to a foreign admissions officer who has never seen SHRS's grading conventions. This is the single highest-leverage addition for the "employers, universities, ministries, scholarship bodies, embassies" audience list in §5.
- **Provisional Certificate** (added to §1.1 as document #5). The gap between "the graduate has cleared every stage" and "the final parchment has been printed, sealed, and signed" is real and, at many institutions, weeks long. A Provisional Certificate — a real, numbered, verifiable document stating "this student has met every requirement for graduation as of [date]; the final Certificate is being prepared" — is what universities and embassies actually accept during that window. Without it, the Statement of Results (an academic-progress document, not a completion document) is the only interim option, and it says the wrong thing.
- **Certified True Copy / Duplicate Certificate protocol.** Not a new document *type* so much as a mandatory reissuance discipline every one of the Class A documents needs: when a graduate loses their original Certificate or Transcript, or a receiving institution demands a certified copy rather than accept a photocopy, SHRS must be able to issue one that is visibly and permanently marked **"Certified True Copy"** or **"Duplicate — Original Reference No. [X]"**, carries its *own* new reference number, and is logged in `graduation_documents` as a reissuance linked to the original row — never a second "original." This is specified in full in §16.7.

### 1.5 Explicitly out of scope, and why

- **Apostille / consular legalization.** This is a government function performed by a national Ministry of Foreign Affairs (or equivalent) and, for Hague Convention countries, by a designated apostille authority — not something a school can perform on its own documents. SHRS's obligation, fully in scope, is to make its documents *easy to legalize*: a fixed, predictable signature block, an institutional seal, and a clean paper trail an embassy or ministry can verify quickly (§5). Performing the legalization itself is explicitly out of scope.
- **No Objection Certificate / Transfer Certificate.** These are real Registrar's Office documents (already scoped in `docs/registrar-office.md`) but they belong to the *transfer/withdrawal* lifecycle, not graduation. Folding them into this specification would blur two different institutional processes that this engagement has, throughout, kept deliberately separate (see the Data Lifecycle Register's own event taxonomy).

---

## 2. Publication Architecture

### 2.1 Every document is a publication, not a printout

Every Class A/B document in this ecosystem shares one physical/digital anatomy, regardless of type:

1. **Header block** — institutional crest, full legal institution name, campus/college identification, document title, in that fixed order, every time.
2. **Body** — the document's substantive content, laid out on the grid defined in §6.3.
3. **Security band** — reference number, QR code, barcode, and (where applicable) the truncated content-hash string, always in the same physical zone of the page (§14–§15 define exact placement per document class).
4. **Signature block** — one row per required signatory (§13), each with a signature image/typed rendering, printed name, and title line.
5. **Institutional seal** — positioned per §12, overlapping the signature block per the century-old convention this deliberately follows (a seal that visibly "binds" a signature is harder to forge piecemeal than one floating free on the page).
6. **Footer band** — issue date, document class, and (for multi-page documents) page numbering and a running reference number so no page can be silently swapped out of a bound set.

### 2.2 Document security classes

| Class | Documents | Public verification depth | Physical stock intent |
|---|---|---|---|
| **A — Legal Academic Record** | Certificate, Transcript, Diploma Supplement, Provisional Certificate, Qur'an/Islamiyyah Certificates | Full (§5.2) | Security/watermarked stock (§11) |
| **B — Institutional Recognition** | Testimonial, Character Certificate, Clearance Certificate, Award/Distinction/Board/Founder/Head of Schools Administrator Awards | Standard | Premium letterhead stock |
| **C — Registry/Internal** | Alumni Registration Certificate, Digital Graduate Profile, Graduation Register | Minimal or none (internal) | Standard letterhead / digital-only |

Every class still gets a reference number, an audit trail, and — for anything issued to a named individual — an entry in `graduation_documents`. Class C is not "unsecured"; it is *lower public-verification priority*, which is a different thing from unimportant.

### 2.3 Master layout grid

- **Page size:** A4 (210×297mm) portrait for Class B/C; A4 landscape for the Graduation Certificate specifically (the internationally conventional orientation for a ceremonial certificate); A4 portrait for the Transcript/Diploma Supplement (tabular content reads better tall).
- **Margins:** 25mm outer margin on Class A documents (room for the security border in §11), 20mm on Class B/C.
- **Safe area:** all live content (text, seal, signatures) kept 8mm clear of the trim edge on any document produced in a Press Edition (§7.2) — bleed content only, nothing that must not be cut off, lives in that 8mm.
- **Grid:** a 12-column baseline grid at the page's content width, consistent across every document type, so a Transcript's table columns and a Certificate's centered ceremonial text both sit on the same underlying rhythm — this is what makes a *family* of documents read as one publication system rather than seventeen unrelated templates.

---

## 3. Security Architecture

Every identifier and mechanism named in the authorization, defined precisely, with its relationship to every other one made explicit — because a security architecture where the pieces aren't clearly related to each other is not actually a security architecture.

### 3.1 Permanent Graduate ID

The **existing** `SHRS-<YYMMDD>-<seq6>` student identity number (`functions/_lib/identity-no.js`, live since the Digital Identity System phase) *is* the Permanent Graduate ID at the moment of graduation — it does not change, is not reissued, and is not a new number invented for this phase. What Stage 3 adds is a documented, permanent commitment: **this number does not expire, is never reassigned to another person, and remains the graduate's identifier for life, including in every alumni-facing system built afterward.** That commitment is the actual deliverable here, not a new numbering scheme — reusing a live, working identifier is more rigorous than inventing a redundant one.

### 3.2 Permanent Verification ID

Distinct from the Graduate ID by design: the Verification ID identifies **a specific act of graduating** (this student, this programme, this session), not the person. A person could, in principle, complete more than one credential at SHRS over a lifetime (a Hifz Ijazah and, years later, a Secular College Certificate) — each is a separate Permanent Verification ID even though both point back to the same Permanent Graduate ID. Format: `SHRS-VER-<graduation_session>-<seq6>`, generated once at first document issuance for that graduation event and stored on `graduation_documents.verification_id`, shared by every document issued for that same graduation (Certificate, Transcript, Diploma Supplement all carry the same Verification ID; they each still get their own document reference number).

### 3.3 Certificate Number / Transcript Number family

Extends the **existing, live** `generateReferenceNo()` scheme (`functions/api/portal/staff/registrar/certificates.js`) rather than inventing a parallel one — the same discipline applied throughout this engagement. New type codes, `SHRS-<TYPE>-<year>-<seq6>`:

| Document | Code |
|---|---|
| Graduation Certificate | `CERT` |
| Academic Transcript | `TRAN` |
| Diploma Supplement | `SUPP` |
| Statement of Results | `SOR` |
| Provisional Certificate | `PROV` |
| Testimonial | `TEST` |
| Character Certificate | `CHAR` |
| Graduation Clearance Certificate | `CLR` |
| Alumni Registration Certificate | `ALUM` |
| Award Certificate (general) | `AWD` |
| Special Distinction Certificate | `DIST` |
| Board Award | `BRD` |
| Founder/Head of Schools Administrator Award | `FCA` |

Qur'an Certificates and Islamiyyah Certificates use the **existing** `ijazah_register` numbering where the credential is an Ijazah, and a new `HIFZ`/`ISLM` code under the same family where it is a completion certificate short of full Ijazah — kept distinct from the Ijazah's own established, working system rather than merged into it.

### 3.4 Machine-readable layer: QR and barcode, distinct purposes

- **QR code** (existing `functions/_lib/qrcode.js`, server-rendered SVG, error correction level M): encodes the full verification URL (`/verify-graduation-document/?ref=...`). This is the primary, camera-driven verification path — the one an employer or embassy officer actually uses.
- **Barcode** (new — no 1D barcode capability exists in this codebase today, confirmed by inspection): **Code 128** encoding the raw document reference number only (not a URL). Its purpose is different from the QR's: legacy document-management scanners at universities, ministries, and archival systems commonly read 1D barcodes into a record-lookup field but do not decode QR payloads as URLs. Carrying both means SHRS's documents work correctly with a 2020s smartphone camera *and* a 1990s-era institutional scanner — genuinely serving the full audience list in §5, not just the modern half of it.

### 3.5 Cryptographic layer

- **Content hash:** HMAC-SHA256 over a canonical, versioned field-set per document type (student's Permanent Graduate ID, document type, reference number, issue date, and — for the Transcript specifically — a hash of the locked `transcript_snapshots` row), keyed with a secret held only in Cloudflare environment variables (never in the repository, matching this project's existing `SESSION_SECRET` convention). The **first 12 hex characters** print beneath the QR/barcode as a human-legible check value; the full hash is stored server-side and recomputed live on every verification request.
- **What this catches:** a document whose printed reference number is real but whose *visible content* (a grade, a name, a date) was altered after issuance — the recomputed hash will not match the stored one, and the verification page shows a clear **"Content Mismatch"** state, distinct from **"Reference Not Found."**
- **What this does not catch, stated honestly:** a skilled physical forgery of the paper itself, undetectable without the physical security features in §11 — cryptography secures the *data*, not the *paper*. This is why §11 (paper standard) and §3.5 (hash) are both load-bearing, not either/or.

### 3.6 Trust layer: signatures and seal

- **Digital Signature Validation** — extends the **existing, live** `staff_signatures` architecture (Stage 2.5). New for Stage 3: a `DOCUMENT_SIGNATORIES` eligibility map (document type → required role codes) checked at generation time (§13.2), and a `signatories` JSONB snapshot on every `graduation_documents` row recording *exactly which staff member's signature, in what state, was used* — so a later change to that staff member's stored signature never silently alters an already-issued document's historical record.
- **Institutional Digital Seal** — placement specified in §12; the image asset itself does not exist in this codebase today and must be supplied by the client (never fabricated — this project's standing rule against inventing institutional imagery applies with full force to a seal, which is arguably the single most consequential image this system will ever place on a document).

### 3.7 Tamper detection

Composite, not a single mechanism: the content-hash check (§3.5) for data-level tampering; the physical security stock and microprint recommendation (§11) as a paper-level deterrent no software can provide on its own; and a **verification-anomaly signal** — the `verification_log` (§3.8) flags a document verified an implausible number of times in a short window, or from a pattern consistent with automated scraping, for the Registrar's Office to review. None of these is "tamper-proof" in an absolute sense — no document system anywhere is — and this specification does not claim otherwise.

### 3.8 Verification Timestamp and Lifetime Verification Record

- **Verification Timestamp**: `graduation_documents.issued_at` is fixed forever at generation. Every *check* of the document (not the document itself) writes a row to a new, append-only `verification_log` table: `document_reference_no`, `verified_at`, `ip_address` (hashed, not stored raw — see §5.3's privacy note), `outcome` (`valid`/`revoked`/`hash_mismatch`/`not_found`). This is the **Lifetime Verification Record** — a permanent, growing history of every time this document was checked, available to the institution (never publicly) for exactly the anomaly-detection purpose in §3.7.
- **Traceability**: every issued document is reachable end-to-end — `graduation_documents` row → `staff_audit_log` entries for its generation and any later revocation → the underlying `graduation_records`/`graduation_clearances` chain that authorised it → `verification_log` for its full check history. No document exists in this system without that full chain being reconstructable, matching the audit-trail discipline built in Stage 2.5 and extended, not replaced, here.

---

## 4. Numbering Standards

Consolidates §3.3–§3.4 into the operational rule set:

1. Every document gets exactly one reference number, assigned at generation, never reused, never reassigned even if the document is later revoked.
2. Sequence scope: `COUNT(*) + 1` scoped by document type and calendar year, matching the existing, working `generateReferenceNo()` convention — a non-atomic, accepted-race counter, correct for SHRS's real volume (see the Stage 2.5 specification's own numbering rationale). A stricter atomic sequence is available (`SELECT ... FOR UPDATE` or a dedicated Postgres sequence per type, as `identity-no.js` already does for identity numbers) and should be adopted if/when document volume genuinely requires it — a decision to make explicitly when the evidence calls for it, not a default assumption now.
3. A reissued/duplicate document (§16.7) always gets its **own** new reference number and is never permitted to reuse or silently overwrite the original's.
4. Every reference number is permanently resolvable at its verification URL for the lifetime of the institution — no reference number is ever deleted from the lookup path, even if the underlying document is revoked (revocation is a status, not a deletion).

---

## 5. Verification Standards & Platform

### 5.1 Audiences and what each genuinely needs

| Audience | What they need | What they must never see |
|---|---|---|
| Employers | Name, credential, institution, dates, active/revoked status | Grades, disciplinary history, home address |
| Universities/admissions | The above, plus the Diploma Supplement's grading-scale context | Full result breakdown (belongs on the physical Transcript the applicant supplies) |
| Ministries of Education | Institutional accreditation reference, credential authenticity | Any personal data beyond what's needed to confirm the credential is genuine |
| Scholarship bodies | Same as universities | Financial/family data |
| Embassies (visa/immigration processing) | Authenticity + institutional legitimacy, fast | Anything not needed for that narrow purpose |
| Accreditation agencies | Institutional-level document standards, not individual records | N/A (institution-level requests are a different, non-public process — §5.4) |

### 5.2 Two-tier verification

- **Tier 1 — Public Verification** (`/verify-graduation-document/`, no authentication, matches the existing `/verify-certificate/`/`/verify-receipt/`/`/verify-identity/` pattern exactly): reference-number lookup returning the audience-safe field set in §5.1, plus the active/revoked status and the content-hash check outcome. This is what a QR scan or a manually typed reference number reaches.
- **Tier 2 — Institutional Verification** (a formal, authenticated request from an accredited third party — a university's admissions office, a ministry, an employer's HR-verification service): **explicitly out of scope for the first Stage 3 build**, named here as a deliberate Phase 2 decision rather than a silent omission. Building an authenticated third-party verification API is real additional infrastructure (API keys, rate limiting, a request-approval workflow) that deserves its own scoped decision once Tier 1 is live and its real usage pattern is understood — building it speculatively now would be optimizing for a guess, not for permanence.

### 5.3 Privacy boundary and retention

- Tier 1 responses are computed fresh from the live database on every request — never a cached snapshot that could serve stale (and therefore potentially wrong, post-revocation) data.
- IP addresses logged in `verification_log` (§3.8) are hashed before storage (same discipline as any PII this project handles), retained per the school's IT-04 Records Retention Policy's technical-log retention class, and never exposed on the public verification page — they exist solely for the institution's own anomaly review.
- No verification response ever includes another person's data (a common failure mode in poorly designed lookup systems is leaking adjacent records) — every query is scoped to exactly one reference number, returning exactly one document's public fields.

### 5.4 Institutional-level accreditation requests

A ministry or accreditation body auditing SHRS's *documents as a system* (not one graduate's record) is a different request from either verification tier — it is a governance conversation (Board Papers Centre, Governance Headquarters), not an API call. Noted here so the distinction is explicit and this specification doesn't accidentally imply the public verification page is also the accreditation-audit surface.

### 5.5 Graduate Search — scoping decision (Executive Directive point 2)

The Executive Directive's platform checklist names "Graduate Search" as a required component. Built as **staff-only**, not a public directory, for a reason grounded directly in §5.3's own rule: "every query is scoped to exactly one reference number, returning exactly one document's public fields." A public name-based search is structurally the opposite of that — it lets a stranger enumerate graduates by typing names rather than presenting a specific reference number they already hold, which is a privacy regression this specification's own verification-standards section forbids by implication even though "Graduate Search" was never itself defined narrowly enough to rule it out explicitly. Resolved as: the existing Registrar staff UI's graduation-records list (session/status-filterable, permission-gated the same way as every other registrar action) *is* Graduate Search for the one audience that legitimately needs to browse by name — the institution's own staff — extended with a direct link to each graduate's Digital Graduate Profile (§5.6) once a document exists for them. No new public search surface was built, and none should be, without a separate, explicit decision to accept that privacy trade-off.

### 5.6 Digital Graduate Profile — resolved as a live aggregation view, not a discrete artifact

§1.3 describes the Digital Graduate Profile as "generated alongside the Certificate"; §16.10 describes it as "generated once, at first issuance of any Class A document." Since no Class A document exists yet (Class C is still in progress per the Directive's own build order), treating it as a one-time *generation event* tied to a document type that doesn't exist yet would have blocked it entirely. Resolved instead as a **live, always-current aggregation view**, computed fresh on every request exactly like Tier 1 verification (§5.3) — never a stored/generated snapshot — reachable the moment *any* graduation document exists for a given Permanent Verification ID (today: the Alumni Registration Certificate; later: every Class B/A document too). `GET /api/graduation-documents/profile.js?id=<verificationId>` is public and unauthenticated but safe under §5.3's own logic: the lookup key is a long, non-guessable, server-issued token, never a name or admission number, and there is no public search feature (§5.5) that could be used to discover that ID by browsing. It returns the same audience-safe field set as Tier 1 verification, aggregated across every document sharing that verification ID, plus each document's own `verifyUrl` so a viewer can still independently check any single credential.

---

## 6. PDF Engine & Design Discipline

### 6.1 Design principles, stated as testable rules, not adjectives

"Looks professionally commissioned" is not an engineering requirement until it is decomposed. It is decomposed here into rules the Publication Design Audit (§17.1) can actually check:

- **Alignment:** every text block, rule line, and image sits on the 12-column grid (§2.3) — no element positioned by eyeballing.
- **Optical spacing:** spacing between elements is tuned by eye against the grid, not applied as one uniform CSS margin everywhere — headings need more visual air above than below; a signature line needs more clearance than a body paragraph.
- **Consistent margins:** identical margin values across every page of a multi-page document, and across every document *within a class* (§2.2) — a Transcript and a Diploma Supplement issued for the same graduate should feel like siblings.
- **Elegant whitespace:** a document is not "denser is better" — Class A documents in particular should read as unhurried, matching the ceremonial register of the occasion they mark.
- **Premium typography:** §10.
- **Flawless page rhythm:** on multi-page documents (Transcript, Diploma Supplement), running headers/footers repeat identically, page numbers are consistent, and section breaks never orphan a single table row at the top or bottom of a page.
- **Professional print readiness:** every document renders correctly both on-screen (digital verification/records use) and printed on a standard office printer at minimum, with the Press Edition (§7.2) as the enhanced path for ceremonial/security printing.

### 6.2 Technical rendering approach — the honest constraint, stated plainly

This is the single most important engineering finding in this specification, and it changes how Stage 3 must be built:

- **Cloudflare Pages Functions (the production runtime this entire portal runs on) cannot execute headless Chromium, LibreOffice, or Ghostscript.** These are not available in that serverless environment — confirmed by inspection of this project's existing infrastructure. The only prior PDF-generation capability in this codebase, `scripts/render-constitution-pdf.js`, is an **offline Node/Playwright script run manually on a developer machine**, never deployed as a live API endpoint — exactly as `docs/shrs-graduation-documentation-system-architecture.md` already flagged.
- **This build environment** (where this specification is being written) *does* have `soffice` (LibreOffice) and `gs` (Ghostscript) available — but that environment is not the production Cloudflare Workers runtime graduates and staff will actually use. Conflating "it works in this sandbox" with "it works in production" would be exactly the kind of unearned claim this engagement has never made, and will not start now.
- **The correct architecture, therefore:** graduation-document PDF generation is a **triggered, server-side batch/render job**, not a live per-request Cloudflare Function. Concretely: when a record locks (or a staff member explicitly requests a document), a rendering job runs on infrastructure that *can* run headless Chromium — either (a) a small dedicated rendering service the client provisions alongside Cloudflare (a lightweight Node service on any conventional host, called by a Cloudflare Function via HTTP), or (b) an offline/scheduled batch process analogous to `render-constitution-pdf.js`, run on a controlled schedule (e.g., nightly, or on-demand by an administrator with the right tooling). The **rendered PDF is generated once, hashed (§3.5), and stored** (§8) — the live verification endpoint (a genuine Cloudflare Function) only ever *serves or confirms* that locked artifact, never regenerates it on the fly. This is not just a workaround for a runtime limitation — it is the *more correct* security architecture regardless: a security document's canonical form should be generated once and be immutable, not reconstructed differently on every request.
- **What Stage 3 must decide, as an explicit infrastructure choice before build begins:** which of (a) or (b) above the client wants to provision. This specification does not choose on the client's behalf; it names the decision and its trade-offs (a dedicated service gives faster, on-demand issuance; a batch process is simpler infrastructure but issuance is not instant) so the choice can be made deliberately.

### 6.2a PDF Architecture Decision — resolved (Executive Directive point 3)

The Executive Directive explicitly authorized this engineering to decide and, "if necessary, build a dedicated PDF generation service rather than relying on browser printing," naming quality/reliability/security/scalability as the deciding criteria over convenience. Decision:

- **Chosen: Cloudflare Browser Rendering** (`@cloudflare/puppeteer`, genuine headless Chromium), invoked as a **triggered, per-request render** from the same Cloudflare Pages Functions runtime that already serves every endpoint in this codebase — not option (b)'s external self-hosted service, and not a third-party HTML-to-PDF API vendor.
- **Why this beats both alternatives named in §6.2:** it satisfies (a)'s "dedicated rendering service" requirement (real Chromium, not an approximation) while avoiding (a)'s literal reading of "a small dedicated rendering service the client provisions *alongside* Cloudflare" — no new vendor, credential, contract, or data-residency relationship is needed, because Cloudflare already is the vendor for this entire stack (Pages + Neon). It also avoids (b)'s "issuance is not instant" trade-off — rendering happens on demand, the moment a staff member requests it, matching this specification's own numbering/verification-ID pattern of "generate at the moment of the real action," not on a schedule.
- **Implementation:** `functions/_lib/pdf-render.js` (`renderHtmlToPdf(env, html)`), a `[browser]` binding declared in `wrangler.toml`, `@cloudflare/puppeteer` added to `package.json`. Wired into the Alumni Registration Certificate's `GET .../graduation-documents?ref=...&format=pdf` this round — every future document type reuses the same function, since it operates on the HTML the shared shell already produces, not on any document-type-specific logic.
- **Stated honestly, per this engagement's standing discipline on infrastructure claims (§6.2 above sets the precedent):** Browser Rendering requires a Cloudflare account with the feature enabled; this sandboxed development environment has no live Cloudflare deployment and no network path to Cloudflare's actual edge Browser Rendering service, so this code is written correctly against the documented API but has **not been exercised against a live binding**. `renderHtmlToPdf()` throws a caught, named `PdfRenderUnavailableError` (never an unhandled crash) when `env.BROWSER` is absent, and the calling endpoint returns a clear 503 pointing back at the always-available HTML view — so the browser Print/Save-as-PDF path (§6.2's original honest fallback) remains available regardless of whether Browser Rendering has been enabled on the account yet. **The first real Cloudflare deployment should exercise `?format=pdf` on the Alumni Registration Certificate as its verification step** before this is treated as production-proven.
- **Batch rendering remains available as a future addition, not a discarded option:** SHRS's real issuance pattern (per-graduate, on demand) suits the triggered approach; if a future need arises to render an entire graduating cohort's documents at once, a scheduled batch job can call the exact same `renderHtmlToPdf()` function in a loop — nothing about this decision forecloses that.

### 6.3 Grid system specifics

12-column grid, 25mm/20mm margins per §2.3, base typographic unit 4pt (all spacing values multiples of 4pt for consistent rhythm — the same discipline professional editorial design systems use), one shared CSS design-token file (extending `css/brand.css`'s existing variables, not a parallel system) so every document type inherits the same institutional DNA automatically rather than needing per-template tuning.

---

## 7. International Print Standard

### 7.1 CMYK output — the honest position

A browser-rendered PDF (the only rendering path realistically available to this project, per §6.2) is natively an **RGB** document — browsers do not emit CMYK. True CMYK conversion for professional press output requires a genuine colour-managed conversion step (ICC profile application), which is standard **pre-press** work, not something a web rendering pipeline does natively. The honest, correct architecture: SHRS's own generated PDFs (Digital/Verification Edition, §7.3) are the RGB, screen-and-office-print standard used for every day-to-day purpose (emailing a Testimonial, printing a Transcript on office equipment, digital verification). For the **Graduation Certificate specifically**, where ceremonial security-press printing is genuinely warranted, the generated PDF is handed to a professional security-print vendor as a **press-ready RGB source**, and CMYK conversion happens at the vendor's own RIP (raster image processor) as a standard, routine pre-press step every commercial print shop already performs — this is not a gap in SHRS's system, it is where that responsibility correctly sits in the real-world print production chain, and claiming this codebase does its own CMYK conversion would be a fabricated capability.

### 7.2 Bleed and crop marks — Press Edition

A second HTML/CSS template variant, generated from the **same source data and design system** as the standard document (never a separately maintained "print version" that could drift out of sync), adds:

- **3mm bleed** on all four edges (content extends past the trim line so no white sliver appears after cutting).
- **Crop marks** at each corner, standard commercial-printing convention.
- Produced only for Class A documents intended for ceremonial/security stock printing (the Graduation Certificate, primarily) — not generated by default for every document, since bleed/crop marks are meaningless (and visually wrong) on a document a graduate prints at home or views on screen.

### 7.3 Digital/Verification Edition vs. Press Edition — two outputs, one source

| | Digital/Verification Edition | Press Edition |
|---|---|---|
| Colour space | RGB | RGB source, CMYK-converted at vendor pre-press |
| Bleed/crop marks | None | 3mm bleed + crop marks |
| Intended use | Verification, digital archive, office printing, email | Professional security-press printing |
| Generated for | Every document, every time | Class A documents on explicit request |

### 7.4 Archival-quality PDF

**PDF/A** (ISO 19005) is the correct, named target for long-term digital archival — a real, well-defined standard, not an invented one. Achieving genuine PDF/A conformance requires a conversion/validation step (font embedding verification, colour-profile embedding, metadata conformance) beyond what a browser's native "print to PDF" produces unassisted. This specification names PDF/A as the target standard for the archived copy of every Class A document (§8) and requires that conformance be **verified by an automated post-processing/validation step** before a document is marked "archived" — not assumed true because the PDF opens correctly in a viewer.

---

## 8. Digital Preservation & Archival Standards

Extends the Stage 2.5 specification's §8 with the infrastructure decision now made concrete:

- **Storage:** every generated document's rendered PDF, not just its database row, must be retained so it can be reproduced identically on request years later. This codebase has no file-storage backend today (confirmed — every "image" field elsewhere in this project is a small base64 column, precisely because no object store exists yet). **Cloudflare R2** is the recommended provisioning (native to the same platform this portal already runs on) — an infrastructure decision requiring the client's explicit sign-off before Stage 3 writes storage code, named here rather than assumed.
- **Immutability:** once stored, a document's PDF is never overwritten. A correction to underlying data (a corrected grade, a name change) triggers a **new** document with its own reference number and a `supersedes` link to the prior one — the prior document's file and record remain permanently retrievable, marked superseded, never deleted or silently replaced. This is the same principle Stage 2.5 applied to `staff_audit_log` (append-only) extended to the documents themselves.
- **Retention period:** governed by the school's **existing, published IT-04 Records Retention Policy**, which already sets retention classes for academic records — Stage 3's build plan must cite the specific applicable clause rather than inventing a new retention rule for documents that already have a governing policy.
- **PDF/A conformance:** per §7.4, verified at archival time, not assumed.

---

## 9. Visual Identity — the Graduation Document Palette

The palette named in the authorization — **Coffee Brown, Royal Gold, Cream, Ivory, Milk White** — is not a new palette to invent. It is, field for field, the palette that **already exists** as live CSS custom properties in `css/brand.css`, confirmed by direct inspection before writing this section:

| Named colour | Existing token | Existing value |
|---|---|---|
| Coffee Brown | `--navy` (the codebase's legacy variable name for what is, and always has been, a deep coffee-brown tone — `#3B2A1D`, with `--navy-deep: #221709` as its darker register) | `#3B2A1D` |
| Royal Gold | `--gold` / `--gold-bright` | `#C6A15B` / `#E9CE8A` |
| Cream | `--cream` | `#F1E4C8` |
| Ivory | `--ivory` | `#F7EEDF` |
| Milk White | `--milk` | `#FCFAF6` |

**This is a favourable finding, not a gap:** the institution's flagship colour identity was already built to exactly this specification, years of consistent use across the public site and the portal already validate it, and Stage 3's documents can inherit it directly rather than introduce a competing palette that would fracture the institution's visual identity at the exact moment it needs to be most unified. The one addition Stage 3 makes: a **document-specific restraint rule**, distinct from the portal's own (correctly more animated, more colourful) chrome — graduation documents use at most three colours per page (ink, gold accent, one supporting tone), consistent with §9's "restrained premium accents… luxury from proportion, not decoration" instruction. `--crimson`, `--forest-green`, `--terracotta`, and the portal's other Prestige Palette supporting tones (already documented in `css/brand.css` as deliberately *not* part of the core brand pair) are excluded from graduation documents entirely — they belong to the site's section-rhythm system, not the institution's permanent legal-document identity.

---

## 10. Typography Standards

Extends the existing, live three-font system (`Cormorant Garamond` for display/headings, `Cinzel` for ceremonial labels and small caps, `Inter`/`Cairo` for body/UI) rather than introducing a fourth face:

- **Certificate display text** (student name, credential title): `Cormorant Garamond`, the existing display face, at a large, generous size — this is the one place on any SHRS document where the typography itself should carry ceremonial weight.
- **Ceremonial labels** (institution name, ornamental section markers): `Cinzel` small caps, matching the existing portal convention exactly.
- **Dense tabular content** (Transcript grade tables, Diploma Supplement reference tables): a genuine print-optimized serif is specified here as new work — `Cormorant Garamond` at display sizes is correct for ceremonial text but was not designed for small-size tabular density; a numerically-disciplined serif (tabular figures, consistent x-height at small sizes) should be selected and added to the document-specific font stack, distinct from (but harmonious with) the display face. This is named as an open selection task for the build phase, not resolved arbitrarily here.
- **Signatures**: the existing `staff_signatures` typed-signature rendering already uses a script-style face (Stage 2.5) — reused as-is.
- **Numerals**: tabular (fixed-width) figures throughout every table and every reference number, so columns of numbers align vertically — a small, easily-missed detail that is one of the most reliable "amateur vs. professional" tells in document typography.

---

## 11. Paper Standards

A specification **for the client and the eventual print vendor**, not something code enforces — stated here so the digital design (§6–§7) is built with real production intent, not decorative guesswork:

- **Graduation Certificate:** heavyweight (minimum ~220gsm) watermarked security stock, ideally with an embedded institutional watermark motif and/or a subtle guilloché security-pattern print — genuine anti-counterfeit paper features, procured from the print vendor, not something HTML/CSS can produce.
- **Transcript / Diploma Supplement:** letterhead-weight security stock (~120gsm), sufficient for multi-page binding, with the institution's watermark at a lighter tint than the Certificate's.
- **Testimonial / Character Certificate / Award documents:** standard premium letterhead stock (~100gsm) — real, but not requiring the same anti-counterfeit paper features as Class A documents.
- **Colour:** ivory/cream-toned stock (not stark white) for every Class A/B document, matching §9's palette and giving every physical document the same warm, consistent material feel regardless of which print run or year it came from.

---

## 12. Seal Standards

- **Asset — supplied by the client, now on file.** Five real seal images have been provided and are stored at `assets/images/seals/`, never fabricated (§3.6):
  - `institutional-seal-gold.jpg` — the ceremonial institutional seal: an embossed gold medallion carrying the full crest and "Sultan Hanafi Royal Schools" in Arabic and English.
  - `institutional-seal-general.jpg` — the plain institutional ink stamp (same crest, no office name) — the default seal when a document isn't tied to one specific office.
  - `registrar-office-seal.jpg` — Office of the Registrar.
  - `mudeer-quran-college-seal.jpg` — Office of the Mudeer of Qur'an College.
  - `raees-islamic-arabic-studies-seal.jpg` — Office of the Ra'ees, Islamiyyah College.
  - All are real photographs (plain/paper background, not yet isolated cutouts — see below), resized to 700px on the long edge and JPEG-compressed for web delivery; the originals as supplied are not altered otherwise. Multiple photographed impressions of the same physical stamp were sometimes supplied (varying ink coverage/wear); one clean, legible impression per office was kept as the canonical asset rather than storing near-duplicates.
  - **No seal yet exists for the Secular College or Basic School Principal/Head Teacher** — stated plainly rather than substituted with the general seal, so a future Testimonial/Character Certificate for those two schools' students has an honest, named gap instead of a silent stand-in.
  - **Resolution logic** lives in `functions/_lib/document-seals.js`'s `resolveSeal({ role, institutionName })` — a role of `PRIN` resolves through `INSTITUTION_SEAL` (keyed on the exact `institutions.name` values: `'Islamic & Arabic Studies'`, `"Qur'an College"`; `'Royal College'`/`'Nursery & Primary'` intentionally absent), everything else through `OFFICE_SEAL` (currently `REG` only). Returns `null` — never a guess — when no real asset exists, so the shared template shell falls back to its labelled "Reserved" placeholder exactly as before any seal existed. This is the one shared source of truth every future document type (Testimonial, Character Certificate, Certificate) will call, rather than each endpoint re-deciding which seal applies.
  - **Seal Management Architecture (Executive Directive point 4, resolved this round).** `functions/_lib/document-seals.js` now carries a full `SEAL_REGISTRY` — every office that could ever seal a document (Registrar, each of the four Principal/Head Teacher/Ra'ees/Mudeer offices, the Head of Schools / Administrator, the Board of Governors, plus the general/ceremonial institutional seals) has an explicit entry with a `status` of `'real'` or `'placeholder'`, never simply absent. A `'placeholder'` entry never carries an image path — `resolveSeal()` still returns `null` for it, exactly the same "Reserved" behaviour as before this registry existed. What's new is `requireRealSeal({ role, institutionName, documentType })`, the enforcement point future FINAL-issuance actions must call: it throws a named `SealPendingError` for a placeholder office, so a document requiring (for example) the Secular College Principal's seal can still be internally previewed with the "Reserved" placeholder, but is honestly refused as a *final issued original* until a real seal is supplied — "the system is ready even if the assets arrive later," per the Directive's own words, without ever silently issuing an unsealed original.
  - **A reference photograph was also supplied** of an existing transcript-style document (bearing a different reference-number scheme, `SHRS-TR-PMDP101-2026-0001`, and a "Committee for Media & Advertisement Affairs" seal — not one of the four core schools or offices this specification governs). It is not treated as an SHRS Stage 3 asset or copied into this system; it is noted here only as a useful visual reference for the Academic Transcript's eventual layout (dual gold+blue seal placement, a results table, a jurisdiction footer line, a "printed on secure paper" notice) — a design cue to draw from when §20.5 reaches Class A, not a document this specification has authority over or claims as its own.
- **Placement:** bottom-centre of the signature block, overlapping the primary signatory's signature line by roughly one-third of the seal's diameter — the century-old convention that makes a seal function as a binding device, not decoration. Implemented in `functions/_lib/document-template-shell.js`'s `renderSealBlock()`.
- **Digital rendering — honest current state.** The spec's ideal is a high-resolution PNG/SVG with genuine transparency (no visible box around a circular seal). What's on file today is a JPEG photograph with its natural background intact — an attempt at automated background removal was tried this session (via the Adobe image-editing connector) but the upload step was blocked by this environment's own outbound-network policy, not by any quality problem with the source images. Left as a real, honestly-labelled interim state rather than forced through: the gold seal's near-white background and the stamp's cream paper tone both sit close enough to the document shell's `--milk`/`--ivory` background that the visible seam is minor, not a hard blocker to using the real asset now. A clean transparent cutout remains a genuine future polish item (§17's Publication Design Audit should flag it), not a re-litigation of "should we fabricate a seal" — the asset itself is real and client-supplied.
- **Colour:** rendered as supplied (gold medallion; blue-ink stamp) rather than forced into the Royal Gold token uniformly — the two assets are genuinely different objects (an embossed medallion vs. an ink stamp) and forcing one palette onto both would misrepresent what they actually are.

---

## 13. Signature Standards

### 13.1 Architecture (already built, Stage 2.5)

`staff_signatures` — typed (script font) or uploaded image (≤200KB base64), self-managed via `/portal/staff/identity/`'s "My Digital Signature" card, self-service and self-scoped (§3.6 of the Stage 2.5 architecture doc). Reused as-is.

### 13.2 Document eligibility map (new, Stage 3)

A `DOCUMENT_SIGNATORIES` configuration naming, per document type, the minimum role(s) whose signature must be on file before generation is permitted:

| Document | Required signatories (minimum) |
|---|---|
| Graduation Certificate | Institution Principal/Head Teacher/Ra'ees/Mudeer + Registrar |
| Academic Transcript | Registrar + Examinations & Records |
| Diploma Supplement | Registrar |
| Testimonial / Character Certificate | The student's own Principal/Head Teacher/Ra'ees/Mudeer only |
| Graduation Clearance Certificate | Registrar |
| Board/Founder/Head of Schools Administrator Awards | The awarding authority itself (Board Chair / Founder & Head of Schools / Administrator) |

If a required signatory's office is constitutionally vacant (the same honest vacancy state Stage 2.5 built for VPAC/VPAD), **generation fails with a clear, named error** — never a blank signature line, never a silently-omitted signatory. This directly extends the vacancy-as-a-first-class-state principle already governing the clearance chain.

### 13.3 Historical integrity

Every generated document snapshots *which* signature (and its exact rendered form at that moment) was used, in `graduation_documents.signatories` JSONB (§3.6) — a staff member later updating their stored signature never retroactively alters an already-issued document's historical appearance or record.

---

## 14. QR Standards

- **Content:** the full public verification URL (`https://[production domain]/verify-graduation-document/?ref=<reference_no>`), never the document's raw data.
- **Rendering:** server-side SVG via the existing `functions/_lib/qrcode.js` (reused, not rebuilt) — error correction level **Q** (not the existing M) for graduation documents specifically, since these are higher-security, longer-lived, and more likely to be photocopied/faxed than the identity-card/receipt QR codes that use M today; Q's higher redundancy tolerates more real-world degradation.
- **Placement:** security band (§2.1) — bottom-right on Certificate/Award documents, bottom-centre on multi-column Transcript/Diploma Supplement pages, sized no smaller than 20mm square on any Class A physical print to guarantee reliable scanning.
- **Caption:** "Scan to verify" in the document's body typeface, directly beneath the code, matching the existing ID-card convention exactly.

## 15. Barcode Standards

- **Symbology:** Code 128 (§3.4) — chosen for its ability to encode the full alphanumeric reference number (`SHRS-CERT-2026-000001`) compactly and its wide legacy-scanner compatibility, over alternatives like PDF417 (higher data capacity but a 2D format most institutional barcode scanners of the kind this is meant to serve do not read) or Code 39 (lower density, less standard in modern institutional use).
- **New work, stated plainly:** no barcode-rendering library exists anywhere in this codebase today. A lightweight, dependency-minimal Code 128 SVG renderer (the same "pure-JS, SVG-out, no canvas" discipline already proven correct for the QR renderer in the Cloudflare Workers runtime) is genuine new Stage 3 engineering.
- **Placement:** security band, adjacent to but visually distinct from the QR code — never overlapping, always with its own clear caption stating the reference number in human-readable text directly beneath the bars (the standard convention that lets a person read the number if the scanner fails).

---

## 16. Per-Document Content & Layout Standards

### 16.1 Graduation Certificate
Institution crest and full legal name (top-centre); ceremonial title ("This is to certify that…"); student's `preferred_certificate_name` in the largest display type on the page; programme/level/institution completed; graduation session; signature block per §13.2, reflecting the *actual* cleared stages on that record (a Certificate whose underlying `graduation_clearances` shows the Founder stage as `cleared`, not `not_applicable`, carries the Founder's signature — a Certificate never claims an authority that didn't actually sign off); seal (§12); security band (§14–§15) in the bottom margin.

### 16.2 Academic Transcript
Requires a new `transcript_snapshots` table (schema, per §8's immutability principle): `id, graduation_record_id, snapshot_data JSONB (a locked copy of every term_results row used), generated_at`. Layout branches genuinely by institution — Secular College: subject-by-subject grades per term in tabular form; Qur'an College: Hifz stage progression and Islamiyyah level presented as a structured progression table in place of subject grades — because these are genuinely different kinds of academic records, and forcing one template onto both would misrepresent the Qur'an College's real curriculum. Multi-page as needed, running header on every page, security band on the final page only, per §6.1's page-rhythm rule.

### 16.3 Diploma Supplement
New document, structured per the internationally-recognized Diploma Supplement convention (adapted, not copied verbatim, since SHRS is not a Bologna Process signatory but the *format* is what international readers recognize): (1) information identifying the holder, (2) information identifying the qualification, (3) information on the level of the qualification, (4) information on the programme completed and results obtained (cross-referencing the Transcript), (5) information on the qualification's function (what it entitles the holder to do — further study, professional entry, etc.), (6) additional information, (7) certification of the supplement itself (signed, per §13.2), (8) information on the national/institutional education system (a short, factual description of SHRS's own curriculum structure and grading scale, written once and reused on every Supplement — this is the section that does the actual work of making a foreign admissions officer able to interpret the Transcript correctly).

### 16.4 Official Testimonial
Free-text, staff-authored (§1.2) — **not** auto-generated from any data table, deliberately, since a testimonial is a genuine written character reference, not a data printout. The Disciplinary Register (Stage 2.5) gates *whether* a testimonial can honestly be issued (an open serious case blocks issuance, mirroring its role in Disciplinary Clearance) but never writes its prose.

### 16.5 Character Certificate
Distinct from the Testimonial: a shorter, more formulaic attestation ("X has been a student of good conduct during their time at SHRS, [with/without] disciplinary action recorded") — genuinely useful for contexts (visa applications, certain employer checks) that want a fact-attestation rather than a narrative reference, and where a full Testimonial would be over-scoped for the request.

### 16.6 Graduation Clearance Certificate
A formal document version of the `graduation_clearances` timeline already visible in the Graduation Control Centre — every stage, who cleared it, when — issued as proof the full institutional process was genuinely followed, useful for internal audit and for any receiving institution that wants to see the process, not just the outcome.

### 16.7 Certified True Copy / Duplicate reissuance protocol
Applies to any Class A document. A reissuance request creates a **new** `graduation_documents` row with its own new reference number, `document_kind` set to `certified_copy` or `duplicate`, and a `reissue_of` FK to the original row. The rendered PDF carries a visible, permanent stamp — **"CERTIFIED TRUE COPY"** or **"DUPLICATE — Original Reference No. [X]"** — in the security band, impossible to mistake for an original. The original row is never altered, never deleted, and remains independently verifiable at its own reference number for its own full lifetime.

### 16.8 Statement of Results / Provisional Certificate
The Stage 2.5 specification's original interim-document design (visible "INTERIM"/watermark banner, Examinations & Records signature only) is retained for the Statement of Results. The new Provisional Certificate (§1.4) is visually closer to the final Certificate (it says the student has fully qualified) but carries its own visible **"PROVISIONAL — Final Certificate in Preparation"** banner and its own `PROV` reference number family, distinct from both the Statement of Results (an academic-progress document) and the final Certificate (which it is not yet).

### 16.9 Award family (Award/Distinction/Board/Founder/Head of Schools Administrator)
One shared template, parameterized by awarding authority and citation text — Board Awards cite the authorising `resolutions` row (Governance Headquarters, already exists); Founder/Head of Schools Administrator Awards carry the Founder's own signature per §13.2's eligibility map; general Award Certificates reflect the specific `academic_awards`/`leadership_awards`/`sports_awards`/`other_honours` field they're issued for. One template family, not six independently-drifting ones — consistent with this specification's repeated principle that a *family* of documents should read as one system.

### 16.10 Alumni Registration Certificate / Digital Graduate Profile / Lifetime Verification Record / Graduation Register
Class C (§2.2). The Alumni Registration Certificate and Digital Graduate Profile are generated once, at first issuance of any Class A document for that graduate, and require a genuinely new `alumni_register` linkage (§19 — flagged as new schema, since no alumni data model exists in this codebase today beyond the honest-shell Alumni office already noted in prior architecture work). The Lifetime Verification Record is not a separate rendered document at all — it is the `verification_log` (§3.8) itself, described here for completeness of the ecosystem list rather than as a nineteenth thing to design a layout for. The Graduation Register is a single roster document per ceremony (not per student), pulling from the same `graduation_records` roster query the Control Centre already uses, formatted as a formal, numbered ceremony programme insert — no per-row security band, since it is an institutional publication, not an individually-verifiable credential.

---

## 17. Quality Assurance Framework

Every audit named in the authorization, defined so it is actually checkable — a QA "audit" that isn't a checklist is a slogan, not a process.

### 17.1 The ten audits

1. **Publication Design Audit** — every §6.1 rule checked against every document type: grid alignment, margin consistency, spacing discipline, page rhythm.
2. **Security Audit** — every §3 mechanism present and correctly wired per document: reference number, QR, barcode, hash, seal placement, signature eligibility enforcement.
3. **Registry Audit** — every generated document's data traced back to its authorising `graduation_records`/`graduation_clearances` chain; no document generated for a record that hasn't actually cleared what it claims to have cleared.
4. **Academic Audit** — Transcript/Diploma Supplement content checked against the underlying `term_results`/Hifz data for factual accuracy — no transcription errors between the data and the rendered page.
5. **Typography Audit** — §10 rules checked: correct face per content type, tabular figures in every number column, no orphaned lines.
6. **PDF Audit** — file validity (opens correctly across common PDF readers), correct metadata, correct page count, no rendering artifacts from the HTML→PDF pipeline.
7. **Print Audit** — a physical test print of each document type on standard office equipment (Digital Edition) and, once a vendor is engaged, a physical proof from the Press Edition (§7.2) checked against the design intent.
8. **Verification Audit** — every document's QR/barcode/reference-number path tested end-to-end: scan → verification page → correct data shown, correct privacy boundary (§5.3) respected, hash check correctly flags a deliberately-altered test record.
9. **Accessibility Audit** — colour contrast on every text element meets a legible minimum even on the ivory/cream stock (§9/§11) it will actually be printed on (not just checked against a white screen background); QR/barcode caption text present for anyone who cannot use the machine-readable code.
10. **International Benchmark Audit** — each document type compared, honestly, against a genuine equivalent from an internationally recognised institution (what does a real Diploma Supplement from a Bologna-process university actually look like; what does a real security-printed certificate from a comparable independent school actually look like) — not a self-referential check against SHRS's own prior draft.

### 17.2 Page-by-page inspection protocol

After the ten audits, every document *type* (not just a sample) undergoes a literal page-by-page visual inspection — for multi-page documents, every page individually — against a checklist derived from §6.1's testable rules, performed by rendering an actual sample document with realistic (never real-student) test data and reviewing the rendered PDF directly, the same verify-before-delivering discipline this engagement has used at every prior phase (Playwright route-mocked passes, screenshot audits, etc.), applied here to the highest-stakes output this project has produced.

### 17.3 Release gate

**No document type is released for real use until it has passed all ten audits and its page-by-page inspection.** A document type failing any audit is held, fixed, and re-audited — never shipped with a known, unaddressed gap and a promise to fix it later. This is the literal meaning of "release only when every document is genuinely publication-ready," applied as a hard gate, not a goal.

---

## 18. Governing Roles — mapped to real SHRS authority, not invented positions

The six professional lenses named in the Final Expectation, each mapped honestly to who at SHRS actually holds that authority today — or flagged where no one does yet, rather than inventing a new staff position without basis:

| Lens | Real SHRS owner |
|---|---|
| **University Registrar** | The Registrar's Office (`docs/registrar-office.md`) — the existing, real, staffed office already responsible for the underlying academic records this specification's documents are drawn from. |
| **Academic Records Director** | Examinations & Records (existing office) — owns `term_results` accuracy, the data the Academic Audit (§17.1.4) checks against. |
| **Security Printing Consultant** | **No internal SHRS role holds this today**, honestly stated. This is a function this specification recommends SHRS engage *externally* — a genuine commercial security-print vendor — for the Press Edition (§7.2) specifically; it is not a gap in this codebase, it is a real-world print-production relationship the institution should form, the same way any school issuing genuinely secure paper credentials must. |
| **Digital Identity Architect** | Digital Services (ICT) office, in partnership with this engineering engagement — the office that already owns `functions/_lib/identity-no.js`, `qrcode.js`, and the whole Digital Identity System this specification extends. |
| **Executive Publication Director** | The Head of Schools / Administrator / Executive office — final sign-off authority on this specification (§22) and, per §13.2, the required signatory on Founder/Head of Schools Administrator Awards specifically. |
| **Ministry of Education Certification Specialist** | **Also no internal role**, and — importantly — this is correctly an *external* checkpoint, not something software can self-certify. This specification's job is to make SHRS's documents easy for an actual Ministry to recognise and verify (§5.1, §1.5's apostille note); actual Ministry accreditation is a real-world institutional relationship SHRS should pursue independently of this build, not a claim this document can make on the Ministry's behalf. |

---

## 19. What Already Exists vs. What Stage 3 Must Build

Extends the Stage 2.5 specification's own §10 summary, now complete:

**Already real and directly reusable, no new work:**
- Numbering mechanism (`generateReferenceNo()`), extended with new type codes only.
- QR generation (`functions/_lib/qrcode.js`).
- The lookup-by-reference verification *pattern* (three working precedents to extend, not reinvent).
- `staff_signatures` architecture (Stage 2.5).
- The full graduation intake and clearance chain (`graduation_records`, `graduation_clearances`) as the document generation's data source.
- The institution's actual brand palette (§9) — already exactly the palette requested.
- Ijazah documents specifically — already fully working end-to-end.

**Genuinely new engineering, named plainly:**
1. A triggered/batch PDF rendering pipeline on infrastructure that can run headless Chromium (§6.2) — the single largest new build.
2. `graduation_documents`, `transcript_snapshots`, `verification_log`, and `alumni_register` tables (schema).
3. New type-abbreviation codes on the existing numbering helper.
4. HMAC content-hash tamper-evidence (§3.5) — a genuine security improvement over every existing document type's current honest limitation.
5. A Code 128 barcode renderer (§15) — nothing like it exists today.
6. A single new public verification page + endpoint extension for the graduation-document family, following the existing three-system pattern.
7. A file-storage decision (Cloudflare R2, recommended) and the storage integration itself.
8. Signature-eligibility enforcement (`DOCUMENT_SIGNATORIES`, §13.2) and institutional seal placement (pending the client supplying the actual seal asset).
9. The Press Edition (bleed/crop marks) template variant and the CMYK vendor-handoff workflow documentation (§7).
10. PDF/A archival conformance verification (§7.4, §8).
11. The Diploma Supplement's institutional-curriculum reference content (§16.3) — a genuine writing task, not just a template.

---

## 20. Phased Build Plan

A sequencing recommendation for the actual Stage 3 engineering, once this specification is approved — deliberately staged so foundational, hard-to-change decisions (schema, numbering, infrastructure choice) happen before the highest-visibility, hardest-to-undo work (the Certificate template itself):

1. **Infrastructure decision** (§6.2, §8): client confirms the PDF-rendering infrastructure approach and the file-storage provisioning. Nothing else in this plan can proceed responsibly without this.
2. **Schema** — `graduation_documents`, `transcript_snapshots`, `verification_log`, `alumni_register`, extending `sql/schema.sql` + `setup.js` per this project's existing dual-file convention.
3. **Numbering + hash + QR + barcode** — the machine-readable/cryptographic layer (§3–§4, §14–§15), tested against real reference-number generation before any visual template exists to attach it to.
4. **Verification platform** (§5) — the public lookup page and endpoint, built and tested against synthetic test documents before real documents exist to verify.
5. **Document templates, Class C → B → A** — build and audit (§17) the lowest-stakes document types first (Alumni Registration, Digital Graduate Profile) to prove the pipeline end-to-end, then Class B (Testimonial, Awards), then Class A (Transcript, Diploma Supplement, and finally the Graduation Certificate itself) — the highest-visibility document built last, once every underlying mechanism has already been proven on lower-stakes documents.
6. **Press Edition + vendor handoff documentation** (§7.2–§7.3) — once the Certificate's Digital Edition is fully audited and approved.
7. **Full QA pass** (§17) across every document type, including the page-by-page inspection.
8. **Release gate** (§17.3) — nothing goes live until this passes, document type by document type.

### 20a. Executive Directive — Stage 3 Execution Order (authorization on file)

The client issued a further Executive Directive refining the above sequencing for maximum institutional quality, explicitly accepting the design-analysis gate first (§0 of `docs/shrs-certification-design-benchmark-report.md`) and then mandating this discipline, superseding §20's step ordering with the following (§20's numbered steps remain valid in substance; this is the authoritative *order*):

1. **Complete Class C fully** before any Class A work: Alumni Registration Certificate (done), Digital Graduate Profile, Lifetime Verification Record, Graduation Register.
2. **Complete the public verification platform** before the first Class A document is issued — already substantially done (§5, `functions/api/graduation-documents/verify.js` + `/verify-graduation-document/`); Graduate Search and a public verification-history view remain open items under this platform, tracked against Class C completion above.
3. **Decide the PDF architecture** — resolved this round; see the new §6.2a below. Cloudflare Browser Rendering, not browser-print-only, not a third-party vendor.
4. **Seal Management Architecture** — resolved this round; see the amended §12 below. A placeholder-aware registry now exists so document types are never blocked on a missing asset, while final issuance for a placeholder office is explicitly refused, never silently unsealed.
5. **Class B** (Testimonial, Character Certificate, Graduation Clearance Certificate) — after Class C and the verification platform are complete.
6. **Class A** (Certificate, Transcript, Statement of Results, Provisional Certificate, Diploma Supplement) — last, and only once §7 of this section is also satisfied.
7. **This Master Specification stays the single source of truth** — no field, signature rule, margin, numbering rule, typography rule, paper specification, or verification rule for a Class A document is improvised outside it.
8. **The Transcript benchmark** — `docs/shrs-certification-design-benchmark-report.md` §2.2 and §3 already establish the grading-scale key-table pattern and typography scale the eventual Transcript build must use; no further benchmarking work is required before that build begins, only implementation against what's already documented.
9. **Archival thinking** — already the stated design goal of §8 (PDF/A target) and §3.5's content-hash snapshot (§13.3); reaffirmed, not re-scoped, by this directive.
10. **Proactive execution** — this section (and §23's Build Progress log) is how weaknesses identified and improvements made without further client prompting are recorded, per the standing discipline of this entire document.

---

## 21. Internal Approval Record

Self-audited against the six lenses named in §18 before proceeding, per the authorization's own instruction to "produce and internally approve" this specification:

- **As University Registrar:** the document ecosystem (§1) reflects real academic-record practice, correctly distinguishes a Transcript from a Statement of Results from a Provisional Certificate, and the Diploma Supplement addition genuinely closes the international-legibility gap a Registrar's Office would actually face. **Approved.**
- **As Academic Records Director:** the Transcript's per-institution branching (§16.2) and the `transcript_snapshots` immutability requirement (§8) correctly protect the integrity of results once issued. **Approved.**
- **As Security Printing Consultant:** §3, §7, §11, and §15 correctly separate what software can secure (data, cryptography, machine-readability) from what only physical production can secure (paper stock, CMYK press output, security patterns), and correctly name the external vendor relationship this requires rather than pretending code alone can deliver a secure physical certificate. **Approved, with the standing recommendation (§18) that SHRS begin that vendor relationship in parallel with the software build, not after it.**
- **As Digital Identity Architect:** the Permanent Graduate ID / Permanent Verification ID distinction (§3.1–§3.2) is architecturally sound, correctly reuses the existing identity system rather than duplicating it, and the §6.2 infrastructure finding is the correct, load-bearing technical foundation the rest of Stage 3 depends on. **Approved.**
- **As Executive Publication Director:** the visual identity (§9), typography (§10), and design-discipline rules (§6.1) are proportionate to "the part the world will see" without lapsing into ornamentation the authorization explicitly warned against — restraint, not decoration, is genuinely what this specification calls for throughout. **Approved.**
- **As Ministry of Education Certification Specialist (external-lens check):** §5.1's audience-appropriate data boundaries and §1.5's honest apostille/legalization scoping are what an actual ministry reviewer would expect from an institution that understands where its own authority ends. **Approved**, with the note (§18) that actual ministry recognition remains a real-world relationship to pursue, not a claim this document makes on the ministry's behalf.

**This specification is internally approved for the purpose the authorization set: no document generation begins until it exists and is complete. It now exists and is complete.**

---

## 22. Formal Sign-Off Block

| | |
|---|---|
| Specification version | v1.0 |
| Prepared under | Executive Authorization — Stage 3 |
| Internal approval | Recorded above, §21 |
| **Client approval** | ☐ Approved as written — Stage 3 build may commence per §20's phased plan ☐ Approved with the following amendments: _______________ |
| Infrastructure decision required before build (§6.2, §8) | ☑ Resolved by this engineering under explicit Executive Directive authority (§6.2a) — Cloudflare Browser Rendering, triggered per-request. First live deployment should verify `?format=pdf` before this is treated as production-proven. |
| Institutional seal asset (§12) | ☑ Supplied — general institutional seal + Office of the Registrar seal on file at `assets/images/seals/`; additional office-specific seals (Principal, etc.) remain optional/pending as needed |

Per the client's Final Executive Direction across this entire engagement — "Do not optimise for speed. Optimise for permanence." — this specification does not proceed to code until the two open decisions in this sign-off block are resolved. Everything else in Stage 3's build plan (§20) can begin the moment this document is approved.

---

## 23. Build Progress (updated as Stage 3 engineering proceeds)

Per this specification's own phased build plan (§20), the client authorized work to begin on the decision-independent phases (§20.2–§20.4) while the two §22 open decisions remain outstanding — actual document *generation* (§20.5 onward) still requires them and has not started.

**§20.2 Schema — done.** `graduation_documents`, `transcript_snapshots`, `verification_log`, `alumni_register` added to both `sql/schema.sql` and `functions/api/portal/setup.js`, per this project's dual-file convention. `graduation_documents.storage_key` exists now, nullable, so the eventual storage decision needs no further migration.

**§20.3 Numbering + hash + QR + barcode — done.**
- `functions/_lib/graduation-document-no.js` extends the existing, live `generateReferenceNo()` pattern with the §3.3 type codes, scoped to `graduation_documents`, plus `getOrCreateVerificationId()` for the shared Permanent Verification ID (§3.2).
- `functions/_lib/document-hash.js` implements the §3.5 HMAC-SHA256 content hash using Node's `crypto` module via this project's existing `nodejs_compat` runtime flag (matching `functions/_lib/otp.js`'s own convention, not the Web Crypto API) — fails loudly if `DOCUMENT_HASH_SECRET` is unset, and hashes verifier IPs (never storing them raw) for the Lifetime Verification Record.
- `functions/_lib/qrcode.js` extended with a selectable `errorCorrectionLevel`, defaulting to the existing `M` for every current caller, with graduation documents opting into `Q` per §14 — the existing QR renderer is reused, not duplicated.
- `functions/_lib/barcode128.js` is genuinely new: no barcode-rendering capability existed anywhere in this codebase before this file, and no barcode npm package is installed. Rather than vendor a large new dependency of uncertain Cloudflare Workers compatibility, this reproduces the standard ISO/IEC 15417 Code 128 bar-pattern table — fetched directly from the MIT-licensed JsBarcode project's source (not typed from memory, specifically because a transcription error here would produce a barcode that looks right but doesn't scan) — and was verified two ways before being trusted: (1) its checksum algorithm was cross-checked against the standard Code 128 checksum formula by hand, and (2) an early version of the rendering logic mis-decoded the bar-pattern table (treating per-module bits as run-length widths) and was caught and corrected via a self-test before being shipped, not after.

**§20.4 Verification platform — done.** `/verify-graduation-document/` (EN + AR, `pages/verify-graduation-document.html`/`.ar.html`, wired into `pages/manifest.json` and `scripts/build.js` exactly like the three existing verify pages) + `functions/api/graduation-documents/verify.js` (Tier 1 public verification per §5.2, logging every check to `verification_log`, returning only the audience-safe field set from §5.1) + `qr.js` + `barcode.js`. No document exists yet to verify — this phase was built and is ready the moment §20.5 issues its first document.

**§20.5 Document Publication Shell + first Class C document type — done, on the interim rendering path.** With the client's "Continue" instruction and neither §22 decision yet answered, work proceeded on everything in §20.5 that genuinely does not depend on either open decision, while leaving both honestly unaddressed rather than assumed:
- `functions/_lib/document-template-shell.js` — the one shared publication shell (§2, §9–§11) every document type renders through: header crest band, body slot, signature block, seal position, security band (QR+barcode+reference/verification/hash fields), footer. Colours are the confirmed-live `css/brand.css` palette, inlined literally since this HTML is served standalone from an API endpoint. The institutional seal is rendered ONLY if a real asset is supplied by the caller — absent that (true for every document today), a clearly-labelled "Institutional Seal — Reserved" position is shown instead, never a fabricated mark.
- `functions/_lib/document-signatories.js` — the §13.2 `DOCUMENT_SIGNATORIES` eligibility map (all six spec-named types, plus the Class C types built now) and `resolveSignatories()`, which snapshots each required signatory's *current* `staff_signatures` row at generation time (§13.3) and throws a named `SignatoryVacancyError` — never a blank signature line — if a required office is vacant or has no signature on file.
- `functions/_lib/permission-matrix.js` gained a `graduation_documents` area (REG: view/create/export; PRIN: view, own institution; EXE: view, all institutions) — a new area rather than reusing `graduation_records`, since issuing a document is a distinct authority from reviewing the underlying record.
- `functions/api/portal/staff/registrar/graduation-documents.js` — the first real issuance endpoint. `POST action=issue_alumni_registration` issues Sultan Hanafi Royal Schools' Alumni Registration Certificate (Class C, chosen first per this specification's own "lowest stakes first" build ordering) for any `graduation_records` row at `status = 'locked'`: resolves signatories, generates the reference number and Permanent Verification ID, computes the content hash, writes the `graduation_documents` row (with the signatory snapshot in `signatories` JSONB) and the corresponding `alumni_register` row, and audit-logs the action. `GET ?ref=` renders the issued document as print-ready HTML via the shared shell, permission-gated the same way. Wired into the existing Registrar staff UI (`js/portal-staff-registrar.js`) as an "Issue Alumni Registration Certificate" action on locked graduation records.
- **Stated plainly, the rendering path this uses today**: the browser's own "Print / Save as PDF" on the `GET ?ref=` HTML output — a genuine, honest interim capability, not a placeholder claiming to be more. §20.1's real triggered/batch PDF pipeline (§6.2) remains gated on the client's still-open infrastructure decision, and no Class A/B template has been built yet since several of those (§16.1's Certificate specifically) require the seal position to matter in a way Class C's registry-only document does not.

**§12 Seal asset — resolved, supplied by the client.** Two real seal images (the general institutional gold seal and the Office of the Registrar's ink stamp) are now on file at `assets/images/seals/` and wired into `document-template-shell.js`'s seal block — see §12 for the full account, including the honest note that these are real photographs, not yet a transparent cutout (an automated background-removal attempt was blocked by this environment's own network policy, not a quality issue with the assets). The Alumni Registration Certificate now renders the Registrar's Office seal for real, replacing the "Reserved" placeholder.

**§20.1 Infrastructure decision — resolved.** See §6.2a: Cloudflare Browser Rendering, triggered per-request, implemented in `functions/_lib/pdf-render.js` and wired into the Alumni Registration Certificate's `?format=pdf` path. Not yet exercised against a live Cloudflare deployment — the first real deployment should verify this before it is treated as production-proven, per §6.2a's own honesty note.

**Design System v2 — done, per the required benchmark-report gate (Executive Directive — Stage 3 Execution Order).** `docs/shrs-certification-design-benchmark-report.md` was produced first, as required before any redesign work began, and its findings are implemented directly in `functions/_lib/document-template-shell.js`: a shared 8px grid unit, a defined typography scale (§3 of the report), a programmatically generated guilloché-style security background (a mathematical sine-interference pattern, never traced from any real institution's artwork), and two named body-content variants (`narrative` / `tabular`) so future Transcript-style documents don't have to reuse the Certificate's centred-prose layout. Verified visually via a local Playwright screenshot render before shipping (the same verify-before-delivering discipline used for the barcode renderer earlier in Stage 3).

**Design System v2.1 — masthead upgrade, done.** The client supplied six of the institution's own real, currently-issued documents (a Certificate of Good Conduct, a High School Diploma, and a full Academic Transcript, each for real named students) with the instruction to upgrade the shared shell's visual design and incorporate it. Two categories of material were in that upload, handled differently per this project's standing privacy discipline:
- **Extracted and reused, as the institution's own IP / a public national emblem**: the real Sultan Hanafi Royal Schools institutional crest (quartered shield — crescent-and-star, book, three stars, tree — laurel wreath, school-name banner) and the real Nigeria coat of arms, both cropped at 600dpi from the client's own Certificate of Good Conduct with the background auto-trimmed to transparency, now on file at `assets/images/crests/shrs-institutional-crest.png` and `assets/images/crests/nigeria-coat-of-arms.png`. These are a genuinely higher-fidelity, full-colour rendition of the same crest already used sitewide as the flat gold line-art `assets/images/crest-full.png` — not a new or different mark.
- **Deliberately NOT extracted**: (1) decorative elements that read as likely-licensed stock clipart in the reference documents — the 8-point Islamic star medallion, the gold hanging lantern, the Kufic Bismillah calligraphy graphic, and the diploma's diamond-chain border — none of which are the institution's own unique mark; any new decorative motif inspired by these (the corner ornaments below) was built as original, programmatically generated SVG art, never traced from the reference, the same "compute it, don't trace it" discipline already governing the guilloché security background (§20.5) and the Code 128 barcode table (§20.3). (2) A blue "Sultan Hanafi Secular College" seal on the diploma, skipped entirely because it is physically overlapped by the real student's photograph in the source document — extracting it risked capturing photo pixel data, so this known Secular College seal-registry gap (§12) remains open rather than being closed at that risk. (3) Both real students' names, the Academic ID (`SHR-202041212004`), dates of birth, grades, and photographs — never stored, quoted, or reproduced anywhere in this codebase, exactly as this project's standing privacy discipline requires for any real individual's personal data. A repo-wide grep for both students' names and the Academic ID confirmed zero matches before this round's changes were committed.
- `functions/_lib/document-template-shell.js`'s header markup was rewritten: a `.doc-crests` masthead now shows the Nigeria coat of arms beside the SHRS institutional crest (order auto-mirrors under `dir="rtl"`, so the national emblem reads first from the reading-direction start in both languages), a localized "Federal Republic of Nigeria" / "جمهورية نيجيريا الإتحادية" caption line above the institution name, and a small `cornerOrnamentSvg()` — a new, original, programmatically generated 8-point gold star — placed in all four page corners via `.doc-corner`/`.doc-corner--tl/tr/bl/br`. A latent bug was also fixed in the same edit: the institution-name line was hardcoded to always render in English regardless of the document's `lang` parameter; it is now properly localized EN/AR like every other masthead line.
- Verified visually via local Playwright screenshot render in both English (LTR) and Arabic (RTL), confirming correct crest order, corner-ornament placement, and full masthead localization in both directions — the same verify-before-shipping discipline as every prior visual round.

**Design System v3 — ground-up shell rebuild, done.** The client issued a Final Executive Design Directive rejecting v2/v2.1 outright ("resembles inexpensive online-course certificates... not by an online course platform") and demanding a complete redesign, not an iteration — scored against Authority, Prestige, Security, Typography, Layout, and Institutional Presence, each starting at or near 0/10. `functions/_lib/document-template-shell.js` was rebuilt from a blank page rather than patched, since every existing document type (Certificate, Testimonial, Character Certificate, Clearance, Alumni Registration, Graduation Register) renders through this one shell and inherits the change automatically. What changed, and what was honestly scoped out of a shell-only redesign:
- **Palette** — a new Royal Coffee Brown / Deep Royal Gold / Champagne Gold / Ivory / Cream / Warm White / Milk White / Dark Espresso / Muted Sand palette, replacing v2's lighter navy-brown scheme. `--gold` was kept as the variable *name* (its value changed) because caller-authored table markup in `graduation-documents.js` and `graduation-register.js` references `var(--gold)` directly — changing the name would have silently broken those tables.
- **Backdrop** — the page now renders inside a dark espresso vignette rather than a flat tan field, so the ivory document reads as a presented object (the same convention a framed diploma or gallery lighting uses), with a layered box-shadow ring simulating a double-frame mount.
- **Typography** — Playfair Display added as a dedicated high-contrast display face for the one hero element per document (the recipient's name), distinct from the Cormorant Garamond used for surrounding prose, so the name reads as an engraved name-plate rather than just a bigger line of body text. Cinzel small-caps labels and the Amiri/Cairo Arabic pairing are unchanged, already benchmark-appropriate.
- **Border system** — a computed khatam (two 8-point stars overlaid at 22.5°, the classical Islamic 8-fold interlocking rosette construction) replaces v2.1's single-star corner mark, plus a new engraved micro-lattice band running the full perimeter. The border band went through a real build-verify-fix cycle worth recording honestly: the first implementation used CSS `border-image` with a 9-slice sine-wave tile, which silently degenerated (the tile's slice value equalled its own full size) and was caught by this project's own render-then-inspect discipline before shipping, not after — the fix switched to four independent edge strips tiling a rotation-symmetric crosshatch-lattice texture via plain `background-repeat`, which is more robust than 9-slice for a texture that doesn't need corner-specific artwork.
- **Watermark** — now two independently computed layers (a large khatam-family rosette plus the real crest photograph) at different scales/opacities, described honestly in-code as a screenshot *deterrent*, not a claim of screenshot-proofing.
- **Seal presentation** — an embossed/foil CSS treatment (radial highlight + inset/outset shadow) and a genuine microtext ring (real repeated text — "SULTAN HANAFI ROYAL SCHOOLS · OFFICIAL SEAL" — set on an SVG circular path) now frame the seal position regardless of whether a real seal image is supplied, since that framing is the shell's own design, independent of whether the seal artwork itself is real (§12's placeholder-vs-real rule is unchanged).
- **Security band** — the existing HMAC-SHA-256 content hash is now labelled honestly as "Digital Fingerprint (HMAC-SHA-256)" rather than presented as multiple different security features that don't actually exist as distinct values; the band gained a cream background tint and top/bottom rule for a more deliberate "verification strip" read.
- **Print convention** — four fine crop-mark ticks appear in `@media print` only, documented in-code as an honest trim-alignment convention, not a functional offset-press registration system (those require per-plate colour separations a print shop's own prepress software applies, which a web shell cannot produce).
- **Explicitly out of scope for this pass, named rather than silently skipped**: duplicate detection, certified-copy/reissue/replacement history, and revocation status are data-model features, not rendering features — `documentKind` already supports the certified-copy/duplicate stamp and `verification_log` already is the audit trail (§3.7); extending the schema for reissue chains and revocation is real future work, tracked here rather than faked as display text with no backing value.
- Verified visually via local Playwright render in both English (LTR) and Arabic (RTL) before shipping, including the corner-ornament and micro-lattice border render (caught and fixed the border-image failure described above) and RTL mirroring of the security band and masthead.

**Design System v4 — Royal Heritage / Islamic Classical hybrid, done.** The client escalated the design work a second time with a "Final Executive Creative Direction," rejecting continued direct iteration on the shell and requiring a proper creative-studio process first: a design research report, a full Certificate & Academic Documents Design Bible, and ten genuinely distinct concept directions, with implementation paused until the Board selected one. All three were produced (`docs/shrs-certificate-design-research.md`, `docs/shrs-certificate-design-bible.md`, and a ten-concept interactive deck presented as an artifact, not committed as repo code) before any code was touched again. The client selected a hybrid of two concepts — Royal Heritage (the existing crest/seal/heraldic apparatus) and Islamic Classical (an authentic manuscript palette and geometric border language) — resolved into a concrete, buildable system in `docs/shrs-certificate-design-system-v4.md`, which this round implements:
- **Two-system colour separation** — gold stays reserved for the heraldic apparatus only (crest, khatam corner rosette, seal ring, signatures); a new deep teal (`--teal:#0F5C57`) becomes the manuscript-framing accent (the border band, the security band); oxblood (`--oxblood`, renamed from v3's `--crimson`) stays reserved exclusively for exceptional-state stamps, per the Design Bible's §6 reserved-alert-colour rule. `--gold` again kept as the variable *name* for the same external-reference reason as v3.
- **Border system replaced** — v3's gold crosshatch-lattice band is replaced by a new `girihTileDataUri()`: a computed 8-point star-and-strap tile (the same trigonometric construction discipline as the khatam corner ornament, applied at a smaller repeating scale) in teal, tiled via the same proven `background-repeat` edge-strip technique v3 already validated — the fragile border-image 9-slice approach was not revisited.
- **Page ground** — moved from v3's plain milk white to a warmer ivory (`--ground:#F3EEDD`), the Islamic Classical concept's manuscript tone.
- **Security band restyled** to the teal system (rule colour, background wash, and the reference/verification label colour) — its position as the quietest register on the page (Design Bible §4) and its underlying mechanism are both unchanged from v3.
- **Scope, stated per the design system doc's own §6**: this round rebuilds the shared shell and is verified specifically against the Graduation Certificate, the named flagship document; every other document type inherits v4 automatically and gets its own dedicated visual QA pass in a later round, the same v2→v2.1→v3 pattern.
- Verified visually via local Playwright render in both English and Arabic, confirming the girih border tiles correctly, the two-colour (gold/teal) system separation reads clearly at the corner, and RTL mirroring holds.

**JSS Certificate — new "gilt state-credential" register, visual template done.** The client supplied a reference mockup and, after an analysis-and-approval exchange (documented in the conversation; the analysis covered page architecture, hierarchy, typography, border/ornament philosophy, security and seal placement, colour balance, and institutional register), directed that its visual system become the locked master template for JSS-tier documents specifically — a second register alongside Design System v4, not a replacement of it, since the two draw on genuinely different authority vocabularies (v4: continuous-engraving collegiate/manuscript; this register: punctuated-ornament state-credential). `functions/_lib/document-template-shell.js` gained a new, self-contained export, `renderJssCertificateShell()`, plus its own helpers (`corneFlourishSvg()`, `hologramTileDataUri()`, `renderJssSealBlock()`, `renderJssVerificationCluster()`). Four decisions were made explicitly, before any code was written, and are recorded in the file's own header comment:
- **The reference's second "Registered, Ministry of Education, Lagos State" seal was not reproduced.** SHRS has no real, verifiable registration number to print truthfully, and this project never fabricates an institutional claim. Its dual-seal convention is honoured instead with SHRS's own two real seals already on file (§12, `document-seals.js`): the `CEREMONIAL` gold medallion and the `REG` Registrar ink stamp — a genuine pair, not an invented one.
- **The hologram strip is a screen/PDF simulation** — a computed iridescent CSS gradient layered over a tiled SVG wordmark (`hologramTileDataUri()`), exactly the same honesty boundary as this project's existing UV-layer note: it reads as a security feature on screen; it only becomes one physically if a print vendor applies real holographic foil.
- **No third "state" crest was added.** SHRS has no real, extracted Lagos State coat-of-arms asset in this codebase — only the real Nigeria coat of arms and the real SHRS crest, both already in the masthead. Inventing or sourcing a state emblem was out of scope for this round; a third crest can be added later if the client supplies a real asset.
- **A short, human-typeable Verification Code** (distinct from the existing long reference number and permanent verification ID) is new to this register's layout and is genuinely useful, but generating a real one is a small backend addition not yet built — tracked here as named future work, not faked as already live (the preview render uses a sample-format placeholder).
- Scope, stated plainly: this round is the visual template only, verified against sample data in both English and Arabic (RTL mirroring confirmed — hologram strip, verification cluster, crest order, and seal order all flip correctly). It has no signatory-eligibility-map entry, no issuance endpoint, and is not yet a named document type anywhere in §1's catalogue — that backend wiring, plus the matching JSS Transcript/Academic Record panel-based layout the client also named, is real future work for a dedicated round, the same "visual template first, backend wiring named separately" sequencing this project has used for every prior document-type addition.

**JSS Certificate — density/hierarchy correction, done.** The first pass above was reviewed against the reference and correctly rejected: it had drifted toward a generic, sparse "online-course" layout — weak name hierarchy, a border ornamented only at the corners, disconnected signature/seal rows, too much unused space. `renderJssCertificateShell()` was substantially reworked, not just tuned:
- **Border made genuinely continuous.** A new `engravedScrollTileDataUri()` generates a computed wave-and-bud scroll motif, tiled the full perimeter via the same four-edge `background-repeat` technique (`.jss-frame-band`/`.jss-frame-edge`) already proven for v4's girih band — the corner flourishes now sit layered on top of this continuous band rather than standing in for it.
- **Hierarchy rebuilt**: the recipient name grew from 2.6rem to 4.1rem (now genuinely the dominant element), gained an ID-number line beneath it, and the ceremonial body copy was extended with a second "awarded upon the recommendation of the Academic Board... In testimony whereof..." paragraph matching the reference's actual density.
- **Signature and seal unified into one band** (`renderJssSignatureSealBand()`) — signatory / seal cluster / signatory in a single row, replacing the first pass's two separate, disconnected rows; seals enlarged from 88px to 118px.
- **Gold palette deepened and saturated** (`#8A6A34` → `#B8912E`/`#8A6A22`) and the hologram tile densified with an added star-glyph, both correcting the "too pale/thin" critique.
- **A real layout bug was caught and fixed during this pass**: the leading-edge clearance for the hologram strip had been implemented as a `position:relative` offset (`${leadingEdge}:64px`), which shifts an element's entire box rather than insetting one side — correct-looking in LTR by accident, but in RTL it pushed the trailing-edge content (the footer legal line) past its margin and under the frame band. Fixed by switching to `margin-${leadingEdge}` instead, which insets only the intended side. Caught by the same render-then-inspect discipline as every other visual round in this file, not shipped unchecked.
- Re-verified visually (Playwright, EN+AR) after both the density rework and the RTL margin fix.

**Seal Management Architecture — done** (Executive Directive point 4). `functions/_lib/document-seals.js` now carries a full status-aware `SEAL_REGISTRY` (real/placeholder per office) plus `requireRealSeal()`, the enforcement point future Class B document types will call before final issuance — see the amended §12 for the full account.

**A further batch of real seal/reference material was supplied mid-session and reviewed for structural benchmarking only.** Two Islamic University of Almadinah (Kingdom of Saudi Arabia, Ministry of Education) bachelor's degree certificates, two Islamic University of Minnesota graduation documents, and a Masjid an-Nabawi study-circle certificate of completion were shared — each a genuine document bearing a real individual's name, ID number, and/or signature. These were reviewed for **general structural pattern only** (seal/QR/barcode placement conventions, bilingual layout conventions, security-feature disclosure conventions) — no name, ID number, or photo from any of them was stored, quoted, or reproduced anywhere in this codebase or specification, consistent with this project's standing privacy discipline for data belonging to people outside the SHRS student/staff population. Two further images were generic marketing/mockup exemplars with placeholder data (a "Verified IQ Certification" social-media ad and an "Islamic University in Nigeria" transcript design sample bearing a placeholder name and sequential document number) — these were reviewed more directly since no real person's data was involved. Findings folded into the benchmark report's living record rather than treated as a one-off.

**§20.5 continued — Class C completion (Executive Directive point 1).** With the Alumni Registration Certificate already done, the remaining three §1.3 document types are now resolved:
- **Digital Graduate Profile — done**, as a live aggregation view rather than a discrete generated artifact — see the new §5.6 for the full reasoning. `functions/api/graduation-documents/profile.js` (public, `GET ?id=<verificationId>`), `pages/graduate-profile.html`/`.ar.html`, `js/graduate-profile.js` (mirrors `js/graduation-document-verify.js`'s structure), wired into `pages/manifest.json` and `scripts/build.js`. Linked from the Registrar staff UI's issuance success panel ("View Graduate Profile →") the moment any document exists for a record.
- **Lifetime Verification Record — confirmed already satisfied, no new build.** §3.8 already defines this as the `verification_log` table itself (every Tier 1 check, append-only), built in §20.3/§20.4. There was never a separate document to construct.
- **Graduation Register — done.** `functions/api/portal/staff/registrar/graduation-register.js` (staff-only, `GET ?session=<graduationSession>`, `graduation_documents` `V` permission), rendering the full locked roster for one ceremony/session via the shared shell's `tabular` body variant with a single Registrar signature. Per §1.1's footnote ("no per-document numbering"), this document carries no reference number, seal, QR, or barcode at all — rather than render a security band against a number that doesn't exist, `functions/_lib/document-template-shell.js`'s `renderDocumentShell()` was changed to render the seal block and security band **only when `referenceNo` is supplied**, a generically reusable switch, not a Graduation-Register-specific special case. Wired into the Registrar staff UI (`portal/staff/registrar/index.html` + `js/portal-staff-registrar.js`) as a session-input "Open Register" / "Download PDF" control. Both `?format=pdf` variants reuse the already-built `functions/_lib/pdf-render.js` path.
- **Graduate Search — resolved as staff-only, documented as a deliberate decision, not an omission.** See the new §5.5.

**Class C is now fully complete** (all four §1.3 document types: Alumni Registration Certificate, Digital Graduate Profile, Lifetime Verification Record, Graduation Register).

**§20a point 2 — Verification platform checklist, closed out.** Per the Executive Directive's own mandated build order (point 1: "Complete Class C fully... before touching Class A"; point 5: Class B only after Class C and the verification platform), each named platform component was checked against what genuinely exists rather than assumed complete:

| Directive component | Status | Where |
|---|---|---|
| Secure Verification Portal | Done | `/verify-graduation-document/` (§20.4) |
| QR Verification | Done | `functions/_lib/qrcode.js` + `functions/api/graduation-documents/qr.js` |
| Barcode Verification | Done | `functions/_lib/barcode128.js` + `functions/api/graduation-documents/barcode.js` |
| Graduate Search | Done, scoped deliberately | Staff-only, §5.5 |
| Verification API (future-ready) | Done, Tier 1; Tier 2 deliberately deferred | §5.2 — Tier 2 institutional API named as its own Phase 2 decision, not built speculatively |
| Lifetime Verification History | Done — was table-only, now has a staff surface | `functions/api/portal/staff/registrar/verification-history.js` (new this round) + a Registrar UI panel (`portal/staff/registrar/index.html`, `js/portal-staff-registrar.js`) — a reference-number lookup showing every recorded check's timestamp and outcome, never the ip_hash. Closing this gap mattered: §3.7's tamper-detection purpose for `verification_log` only works if a real person can actually see the history, and until this round nothing did. |
| Public Verification Page | Done | Same as Secure Verification Portal above |
| Privacy controls | Done | §5.3 |

With every platform component now genuinely satisfied (not just assumed), Class B (Testimonial, Character Certificate, Graduation Clearance Certificate) is next per the Directive's point 5.

**§20.6 Class B — done** (Executive Directive point 5). All three §1.2 Institutional Recognition Documents, built in `functions/api/portal/staff/registrar/graduation-documents.js` alongside the Class C document types it already handled:
- **Official Testimonial (§16.4) and Character Certificate (§16.5) — real second-party approval, not self-issuance.** §13.2 already names the student's own Principal/Head Teacher/Ra'ees/Mudeer as the sole required signatory for both, so — unlike Alumni Registration's single-step Registrar issuance — these are built on the existing generic Approval Workflow (`functions/_lib/approvals.js`), the exact joint-authority pattern `certificates.js` already proved: `request_testimonial`/`request_character_certificate` create a pending `staff_approvals` row; only a distinct Principal-role staff member with `graduation_documents` `A` (newly added to `functions/_lib/permission-matrix.js`, own institution only) can approve it via `approve_class_b`/`reject_class_b`, and a Registrar can never approve their own request. A Testimonial's free-text prose is genuinely staff-authored (never auto-generated) and required at request time; a Testimonial is honestly refused at request time if a *serious* open/under-investigation disciplinary case exists for the student, per §16.4's own words. Both document types require the record to be `locked` first, the same trigger point as Alumni Registration.
- **New `graduation_documents.content_data` JSONB column** (dual-file convention: `sql/schema.sql` + `functions/api/portal/setup.js`) — holds content that cannot be recomputed live at view time: a Testimonial's prose exists nowhere else; a Character Certificate's "with/without disciplinary action recorded" line is computed once, at approval, and never re-derived later (§8's archival immutability principle — the same reasoning `transcript_snapshots` already exists for).
- **Seal enforcement wired in for real.** `performOnApprove()` calls `requireRealSeal({ role: 'PRIN', institutionName, documentType })` before writing the issued row — exactly the enforcement point the Seal Management Architecture's own comments named these two document types for. In practice today: a Testimonial/Character Certificate for a Secular College or Basic School graduate is honestly refused at final approval (their Principal/Head Teacher seals remain placeholders per §12), while Islamiyyah College and Qur'an College graduates' documents issue for real. The approval request itself is never blocked by this — only final issuance — so a Principal can still review and the request stays pending until a real seal is supplied.
- **Graduation Clearance Certificate (§16.6) — single-step Registrar issuance**, like Alumni Registration, but gated on `isChainComplete()` (the literal spec-named trigger, reusing `functions/_lib/graduation-workflow.js` directly) rather than re-deriving the same fact from the record's `status` field. Snapshots the full `graduation_clearances` timeline — stage, status, deciding staff member's name, decision date — into `content_data` at issuance, joined against `staff` once and never re-queried live afterward, and renders via the shell's `tabular` body variant with a real HTML table (mirroring the Graduation Register's own table pattern).
- **Registrar staff UI** (`portal/staff/registrar/index.html`, `js/portal-staff-registrar.js`): each locked graduation record's action row gained "Issue Graduation Clearance Certificate," "Request Character Certificate," and a testimonial-text box with "Request Testimonial." A new "Pending Testimonial & Character Certificate Approvals" card lists everything awaiting a Principal's decision, with Approve/Reject actions — the same card pattern the existing Certificate approvals queue already established.

**Class B is now fully complete.** Per the Executive Directive's own build order, Class A (Certificate, Transcript, Diploma Supplement, Statement of Results, Provisional Certificate) is next.

**§20.7 Class A begins — Graduation Certificate done** (Executive Directive point 6). Before writing any Class A code, a real §13.2 compliance gap was caught and fixed: the signatory map built in an earlier round had the Academic Transcript requiring Registrar only, when §13.2's own table names "Registrar + Examinations & Records." Examinations & Records has no `roles`-table entry — it is an office-appointed authority, the same mechanism `functions/_lib/graduation-workflow.js`'s `STAGE_DEFINITIONS` already use for it — so `functions/_lib/document-signatories.js` was extended to resolve a requirement by `officeSlug` (via `staffForOffice()` and a newly-exported `resolveOfficeId()`) as well as by role code, and `transcript`'s entry now names both. The same pass added the missing `statement_of_results` entry (§16.8: "Examinations & Records signature only") and corrected `provisional_certificate` from Registrar-only to the full PRIN+REG block §16.8 actually implies ("visually closer to final Certificate... carries the same signature authority").

- **Graduation Certificate (§16.1) — done.** The one Class A document type whose signature block is genuinely dynamic, not a fixed list: §16.1 states a Certificate "never claims an authority that didn't actually sign off" — if a record's own `graduation_clearances` shows the Vice Principal (Academic), Vice Principal (Administration), or Head of Schools / Administrator stage as `cleared` (not `not_applicable`), that person's real signature is included; if any of those three stages was never exercised for this particular graduate, their signature is correctly absent. `resolveCertificateSignatories(sql, institutionId, clearanceRows)`, new in `document-signatories.js`, layers this on top of the base PRIN+REG requirement — reusing (not duplicating) a shared `resolveOneSignatory()` helper the refactor introduced. A stage that WAS cleared but whose signatory is now vacant or has no signature on file still fails generation with `SignatoryVacancyError`, exactly like every other document type — never a silently-dropped signatory.
- Single-step Registrar issuance (`issue_certificate`), gated on `status = 'locked'`, the same trigger as Alumni Registration — no new approval step is solicited, since the Principal's authority was already exercised as the `principal` stage of the clearance chain the record had to pass to reach `locked`.
- `requireRealSeal({ role: 'PRIN', ... })` enforced at issuance, same as Class B — a Certificate for Secular College or Basic School is honestly refused today until those Principal/Head Teacher seals are real.
- Body deliberately generic about programme/curriculum name ("has satisfactorily completed the prescribed course of study"), with the student's class/level named parenthetically only when the join resolves one — never inventing a curriculum-name field this project's schema doesn't have.
- Registrar staff UI gained an "Issue Graduation Certificate" action on locked records, using the same `renderIssuedDocumentResult()` link pattern as every other issued-document action.

**Remaining Class A work** (not yet built, in the Directive's own order): **Academic Transcript** (§16.2 — requires the `transcript_snapshots` table integration plus genuinely different Secular College vs. Qur'an College layouts, since these are different kinds of academic records); **Diploma Supplement** (§16.3 — an entirely new 8-section document type, not a variant of an existing one); **Statement of Results** (§16.8 — interim document with a visible "INTERIM" banner, lighter Examinations-only signature, its own numbering); **Provisional Certificate** (§16.8 — visually close to the Certificate but with a visible "PROVISIONAL" banner and its own `PROV` reference family, issued at auto-lock rather than waiting for the final parchment). Each is substantial enough to deserve its own dedicated pass rather than being rushed alongside the others — deliberately not attempted in this round.

**JSS Certificate — governance freeze declared; Category A/B engineering pass, done.** After the density/hierarchy correction above was itself rejected a second time (the client's diagnosis: the construction was still content-first-then-decorated, not substrate-first, the same failure documented in full in `docs/shrs-certificate-security-document-analysis.md`), the client issued an Executive Direction freezing the reference mockup as the approved "Institutional Master Certificate" and established a binding classification for all future work on it:
- **Category A — mandatory engineering improvements** (never change appearance): pre-authorized, no approval needed.
- **Category B — invisible security improvements** (preserve appearance): pre-authorized, no approval needed.
- **Category C — visible design modifications** (anything the human eye perceives differently): forbidden without explicit, item-by-item approval.

This round implemented only the pre-authorized items:
- **Category B — full-field engraved substrate.** `renderJssCertificateShell()` gained a `.jss-security-bg` layer (`guillocheSvg()`, reused unmodified from Design System v4) rendered edge-to-edge behind the body content at `opacity:0.05` — directly resolving the security-document-analysis doc's #1 finding, that the prior passes only textured the border band and left the reading field a flat, undecorated substrate. Same low-opacity discipline v4's own guilloché layer already uses; the visible layout, colour, and typography are untouched.
- **Category B — microtext ring on both real seals.** `renderJssSignatureSealBand()`'s `sealCell()` now draws a `microtextRingSvg()` ring (the same technique already built for v4's own seal presentation) inside each seal's *existing* 118×118px `.jss-seal-cell` box at `opacity:0.3` — no new pixels added around the seal, so its visible footprint is unchanged; the ring is deliberately near-invisible at normal viewing distance, resolving only under close inspection, exactly how microprint functions on a real credential.
- **Category A — print-colour fidelity.** Added `print-color-adjust:exact`/`-webkit-print-color-adjust:exact` to the `@media print` block so the gold/ivory palette survives browser print-to-PDF instead of being flattened — a print-precision fix, not a visual one.
- **Already-real infrastructure, explicitly not re-built**: QR generation, the verification engine, HMAC hashing, secure reference numbering, and the `verification_log` table were all already live (`functions/_lib/document-hash.js`, `functions/_lib/qrcode.js`, `functions/api/graduation-documents/verify.js`) before this directive — stated here plainly rather than silently re-implemented or silently omitted from the account.
- **Two items from the security-document-analysis doc's §5 list were retracted from "will do" to Category C, pending explicit approval**: softening the hologram strip's rainbow gradient to a duotone metallic sheen, and changing the verification-code format from a hex-key style to a sequential ledger number. Both were originally written as recommendations to change the reference's own visual conventions — exactly the "art director" posture the client's freeze directive forbids — so neither was implemented, and both are recorded as open Category C items awaiting sign-off, not silently dropped.
- Re-verified visually (Playwright, EN+AR, including a zoomed crop of the signature/seal band and the body field) after the change: layout, seal size, colours, and typography are pixel-identical to the pre-round render; only the added texture/ring depth is new.

**Outstanding, explicitly gated on the client's approval, item by item**: the security-document-analysis doc's remaining Category C items — collapsing to one disciplined type family, dimensional (carved/cast) rendering of the frame/ornaments/seal, replacing the numerals' monospace font, reducing the palette to two colours plus one reserved alert colour, a large-scale anchor seal position, a paper-grain/vignette layer, the hologram gradient softening, and the verification-code format change. None of these will be touched until approved individually.

**JSS Certificate — the Institutional Certificate Design Report's typographic unification and dimensional rendering, approved and implemented; paper grain deferred.** Per `docs/shrs-institutional-certificate-design-report.md`, the client approved 2 of the 3 recommended Category C items (typographic unification, dimensional rendering) and explicitly deferred the third (paper-grain/vignette) until after these two are evaluated — the same sequencing this project used for prior rounds, executive decision first, then code. Both approved items were implemented as **craftsmanship-only** changes: identical page architecture, spacing, colours, seal position/size, and layout before and after; only the type system and the rendering depth of existing ornament/frame/seal/crest elements changed.

- **Typographic unification.** `renderJssCertificateShell()`'s four-family mix (Cormorant Garamond / Playfair Display / Cinzel / Inter, plus a monospace override on the certificate number and issued-date fields) collapses to exactly two families: Cormorant Garamond for English text and Amiri for Arabic — the same fallback-chain mechanism already proven in the tokens (`'Cormorant Garamond','Amiri',serif`), just applied uniformly to all four font tokens (`--font-display`, `--font-hero`, `--font-label`, `--font-body`) instead of four different chains. The Google Fonts `<link>` for this register now loads only Cormorant Garamond and Amiri — Cinzel/Playfair Display/Inter/Cairo are no longer fetched at all, an honest removal rather than an unreferenced leftover. The monospace overrides on `.jss-verify-fields .jss-code` and `.jss-footer-issued b` were deleted; those fields, and `.jss-body .jss-id-line b`, gained `font-variant-numeric:lining-nums tabular-nums` instead, so certificate numbers and dates render as even-width lining figures within the same serif system rather than switching to a separate code-style face — directly resolving the design report's "no institution studied uses a monospace serial number" finding.
- **Dimensional rendering.** A new `shadeHex(hex, percent)` helper derives lighter/darker tints from a base colour. `corneFlourishSvg()` and `engravedScrollTileDataUri()` (the corner ornament and the continuous frame-band tile) each now draw their dominant stroke three times — a darker shadow copy offset down-right, the original mid-tone stroke, and a lighter highlight copy offset up-left — the same highlight/shadow bevel logic a carved or engraved surface reflects under raking light. Every offset is sub-pixel (0.4–0.6px) and the base geometry, tile dimensions, and `.jss-corner`/`.jss-frame-edge` positioning are byte-for-byte unchanged, so nothing moved, resized, or repositioned — only the rendering gained depth. `.jss-seal-cell img` gained a two-layer drop-shadow (soft ambient + tight contact shadow) simulating a raised medallion, plus a `::after` radial-gradient sheen inset within the same 118×118px box (`mix-blend-mode:overlay`, never spilling past the seal's own edge) for a foil-highlight read. `.jss-crests img` gained a matching subtle drop-shadow. `.jss-frame-band` gained a faint inset highlight/shadow pair reinforcing the carved-channel read. None of these are layout properties (`box-shadow`, `filter`, `::after` content are all paint-only in CSS), so page composition is unaffected.
- **Explicitly deferred, not touched**: paper-grain/vignette physicality layer — per the client's own stated reasoning, safer to evaluate once typography and dimensional rendering are both final, since an artificial texture layered too early can fight with print-stock decisions made later.
- Re-verified visually (Playwright, EN+AR) at 100%, 200%, and 400% zoom — full-page renders, a cropped top-left corner at 400% (showing the new bevel clearly), a cropped seal at 400% (showing the sheen/shadow without any resize), and a cropped signature/seal band at 200% — confirming the visible design (layout, seal size, colour, composition) is unchanged and only the typography and rendering depth are new.
- **Scope note, stated plainly**: this round touched only `renderJssCertificateShell()` and its private helpers. `renderDocumentShell()` (Design System v4, used by the Graduation Certificate and every other document type issued today) was not touched — it remains its own, separately-approved system per `docs/shrs-certificate-design-system-v4.md`. The client's approval text asked for consistency "across every certificate, transcript, diploma, testimonial, and award," which is the stated longer-term plan (§ above, "once frozen, every document type... should inherit from the same master architecture") — but only the JSS Certificate exists as a document under this A/B/C governance freeze today, so that inheritance is real future work, not something silently applied to v4 in this round.
