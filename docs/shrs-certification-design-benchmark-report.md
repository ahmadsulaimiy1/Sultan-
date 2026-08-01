# SHRS Certification System — Comparative Design & Security Benchmark Report

**Status:** Required gate, per the Executive Directive — Stage 3 Execution Order, before any Class B/A document redesign begins.
**Prepared by:** Digital Services engineering, acting as University Registrar / Security Printing Architect / Executive Publication Director for this review.
**Governs:** All future revisions to `docs/shrs-master-graduation-document-specification.md`'s Publication, Security, and Typography standards (§2, §6, §9–§15).

---

## 0. Scope and an honest starting note

This report was commissioned to analyse "uploaded samples" and benchmark against named institutions (Oxford, Cambridge, Harvard, King Saud University, Islamic University of Madinah, the Saudi Ministry of Education, NEOM, Saudi Aramco). Two things need to be stated plainly before the analysis, because the rest of this engagement has held to exactly this discipline and this report does not depart from it:

1. **Only one real reference document exists in this engagement's record** — a partial photograph of a transcript bearing the reference `SHRS-TR-PMDP101-2026-0001` and a "Committee for Media & Advertisement Affairs" seal, supplied earlier in this session. It is analysed in full below (§1). No other sample files — from Oxford, Cambridge, Harvard, or any of the other named institutions — were ever uploaded to this engagement.
2. **This report does not, and will not, reproduce, trace, or reverse-engineer any named institution's actual protected artwork, crest, seal, or layout file**, because none exists in this engagement to analyse, and doing so from memory would risk exactly the IP infringement the Directive explicitly warns against. What follows instead is a benchmark against **publicly documented, generic conventions of elite academic and security-document publishing** — the kind of practice described in public sources on diploma security, international transcript standards (e.g. the Bologna Diploma Supplement framework, U.S. AACRAO transcript guidelines), and typographic/editorial design principles that are industry-general, not any one institution's proprietary property. Every named institution below is referenced only as a *category* of practice ("the Oxbridge convention of X," "the security-printing convention of Y"), never as a claim of having examined their actual documents.

This is the correct way to satisfy the Directive's own instruction — *"Take inspiration... Do not reproduce any institution's protected layout, artwork, or branding"* — rather than a shortfall of it. A benchmark built on general, publicly known design theory is exactly what stays "legally safe" while still being rigorous.

---

## 1. Analysis of the one real reference sample

**Document:** transcript fragment, reference `SHRS-TR-PMDP101-2026-0001`, "Sultan Hanafi Royal Schools — Committee for Media & Advertisement Affairs," a Professional Media Development Programme (photography) transcript.

| Dimension | Observation | Verdict |
|---|---|---|
| **Grid** | Two-column results/criteria layout, framed boxes with rounded corner caps ("bracket" cell corners) | A real, usable idea — bracket-cornered boxes read as "official form" without needing heavy rules. Worth adapting, not copying verbatim. |
| **Results table** | "Grade Interpretation" (Classification key: Distinction/Excellent/Merit/Pass/Incomplete) sitting beside a "Final Result" table (Credit Hours, Contact Hours, Overall Score, Final Grade, Final Classification, Completion Status) | Strong structural idea — a *key* table and a *result* table side by side lets a foreign reader interpret the grade without hunting elsewhere on the page. Directly reusable pattern for the Diploma Supplement's own grading-scale requirement (spec §1.4). |
| **Learning outcomes block** | A boxed "Learning Outcomes Achieved" list in plain prose bullets | Good for a skills-based/vocational transcript; less suited to SHRS's academic subject-by-subject transcript, but the *pattern* (a named, boxed callout distinct from the tabular data) is worth keeping for the Diploma Supplement's "programme description" section. |
| **Dual seal** | A gold sunburst-edge medallion seal *and* a separate blue circular ink-stamp seal, placed side by side | This is the single most important convention in the sample: **two seals, two different visual registers (raised/ceremonial gold vs. flat/administrative ink), placed together** — not one seal trying to do both jobs. SHRS's own five real seal assets (§12 of the Master Spec) already map naturally onto this pattern: the ceremonial gold medallion for institutional/ceremonial authority, the office-specific ink stamp for the issuing office. |
| **Footer legal line** | "PRINTED ON SECURE PAPER AND IS VALID ONLY WITH OFFICIAL [seal/signature]" + a jurisdiction line ("Republic of Nigeria · Lagos State · Sultan Hanaf[i]...") | A real, useful convention — a plain-language tamper notice plus a jurisdiction anchor is common on security-printed academic documents and costs nothing to include. Recommended for adoption (§16.1 of the design system below). |
| **Weakness** | The reference number scheme (`SHRS-TR-PMDP101-2026-0001`) and the issuing authority ("Committee for Media & Advertisement Affairs") sit **outside** the four-school, Registrar-governed structure this engagement has built everything else around. If this document is genuinely still in circulation, it is a structural inconsistency worth the client's attention — a second, parallel numbering/authority scheme undermines the "one verification platform, one numbering standard" principle this whole Stage 3 build exists to establish. | Flagged for the client's awareness, not silently absorbed into Stage 3's own numbering scheme. |

---

## 2. General benchmark: elite academic publication conventions

Structured by the Directive's own four analysis categories. Each row states the *general, industry-known* convention (never a specific institution's proprietary file), what SHRS already does relative to it, and the gap.

### 2.1 Publication Architecture

| Convention | General practice | SHRS today | Gap / recommendation |
|---|---|---|---|
| Page proportions | A4 or US Letter with generous outer margins (25–30mm), never edge-to-edge content | `document-template-shell.js` uses fixed padding (`64px 72px 56px`), not a proportional/print-safe margin | v2: convert to `mm`-based margins matching §2.3 of the Master Spec (25mm Class A, 20mm Class B/C), so screen and print render identically |
| Whitespace | Generous, deliberate — "unhurried" is a stated goal of prestige publishing; dense documents read as bureaucratic, not distinguished | Current shell is reasonably spacious but uniform across all document weights | v2: scale vertical rhythm by document class — Class A gets more breathing room than Class C |
| Grid system | An underlying modular grid (commonly a 12-column or golden-ratio-derived grid) that every element — header, body, security band — snaps to, even when the visible design looks free-flowing | Shell uses flexbox/ad-hoc spacing, not a named grid | v2: introduce CSS custom-property-driven grid units (`--doc-unit: 8px`) so every margin/gap is a multiple of one base unit — the actual mechanism that produces "everything lines up" without hand-tuning each value |
| Visual hierarchy | Three-tier hierarchy is near-universal: (1) institutional identity, (2) document identity/recipient, (3) supporting data — each tier gets a distinct type treatment, never just a size bump | Present but underdeveloped: `doc-institution`/`doc-doctype`/`doc-recipient` exist but share one weight/spacing logic | v2: distinct letter-spacing and color-weight per tier (see §3 below) |
| Typography | A serif display face for ceremonial text, a humanist sans or slab for data/tabular content, and a distinct small-caps/label face for section headers — three-typeface systems, not two | SHRS already runs exactly this three-font system (Cormorant Garamond / Cinzel / Inter) — a genuine strength, confirmed favourably in the original Master Spec (§9–§10) | Keep as-is; extend the *scale* (see §3) |
| Reading flow | Top-to-bottom, single continuous narrative for ceremonial documents (Certificate); left-to-right tabular scan for data documents (Transcript) — the two should not share one layout template | SHRS's shared shell today treats every document type identically | v2: the shell keeps one *system* (header/body/signature/security/seal/footer) but the *body* region gets two named content patterns — `doc-body--narrative` (Certificate/Testimonial) and `doc-body--tabular` (Transcript/Statement of Results) |

### 2.2 Academic Architecture

| Convention | General practice | SHRS today | Gap / recommendation |
|---|---|---|---|
| Certificate wording | Formal, third-person, minimal — "This is to certify that [Name] has satisfied all requirements for the degree/certificate of [X]" — resists marketing language entirely | Alumni Registration Certificate's current wording ("Sultan Hanafi Royal Schools certifies that... has been formally entered into the Alumni Register") already follows this register | Keep; extend the same register to the Certificate/Testimonial when built |
| Transcript structure | Subject/course rows grouped by term or year, each row carrying: code, title, credit/contact hours, grade, grade points — a repeating, scannable row unit | Not yet built | Design now, build in Class A phase: reuse the PMDP101 sample's "key table + result table" pairing per term, not per whole transcript |
| Grade presentation | A published grading scale is shown *on the document itself* (not assumed known) — this is the entire reason the Diploma Supplement exists as a document type | Diploma Supplement scoped in Master Spec §1.1 but not yet built | Priority: build the grading-scale key table as a shared component, reused by both the Transcript and the Diploma Supplement |
| Authentication sections | Signature block + seal + numbering, positioned identically on every page of a multi-page document, not just the last page | Shell currently assumes single-page documents | v2: add a running footer (reference number + page X of Y) for future multi-page Transcripts, per Master Spec §2.1's own footer-band requirement — this was specified but not yet implemented in the shell |

### 2.3 Security Architecture

| Convention | General practice | SHRS today | Gap / recommendation |
|---|---|---|---|
| QR implementation | Points to a live verification endpoint, never encodes the document's data directly | Already correct (`functions/_lib/qrcode.js`, error-correction level Q for graduation documents) | No change needed |
| Barcode implementation | Code 128 or PDF417 for the raw reference number, positioned near but visually distinct from the QR | Already correct, genuinely built this session (`functions/_lib/barcode128.js`) | No change needed |
| Certificate numbering | Sequential, typed, non-guessable in isolation (i.e. knowing one number doesn't let you enumerate others usefully because verification is server-side, not offline-checkable) | Already correct (`SHRS-<TYPE>-<year>-<seq6>`, server-verified) | No change needed |
| Verification IDs | A *document* number and a *person/event* verification number are usually kept distinct, so a lost certificate can be reissued under a new document number while the person's underlying verification identity stays constant | Already correct — this is exactly what the Permanent Verification ID (§3.2) vs. per-document reference number split already does | No change needed |
| Security backgrounds | A fine engraved-line pattern (guilloché) or microtext field behind the body text — the classic banknote/diploma security background — makes photocopying degrade visibly and scanning-for-forgery harder | Not present in the shell at all today | **v2 addition**: an SVG guilloché-style line pattern as a low-opacity background layer, generated programmatically (mathematical interference pattern, not traced from any real security printer's proprietary pattern), see §4 below |
| Anti-copy features | "VOID" or similar latent text that appears only when photocopied (a real, physical-print-only feature) is out of scope for a CSS/HTML document; the *digital* equivalent is a content hash + live verification, which SHRS already has | Already correct in spirit — the honest position (Master Spec §7.1, §6.2) is that physical anti-copy features belong to the print vendor, not this system | No change needed; correctly scoped as out of this system's authority already |
| Digital verification methods | A public verification page + a described-but-not-exposed cryptographic layer (HMAC/hash) is the modern standard; full public-key signature chains (X.509-style) are typically reserved for national/government-issued documents, not school certificates | SHRS already implements HMAC-SHA256 content hashing + a public verification page — appropriately scoped for an institution of this kind | No change needed |
| Tamper-resistant ideas | Composite detection (digital hash + physical paper features + anomaly logging), never a single silver-bullet claim | Already the explicit position in Master Spec §3.7 | No change needed |

### 2.4 Executive Design (elegance, prestige, authority, balance, professionalism, timelessness)

The general convention across elite institutional publishing is **restraint**: fewer ornamental elements, deployed with more precision, rather than more elements deployed loosely. Three concrete, implementable principles follow from this, all applied in §4:

1. **A single accent colour, used sparingly** — SHRS's Royal Gold already fills this role; the risk is over-using it (gold text everywhere reads as gaudy, not premium). v2 rule: gold is reserved for rules, small labels, and the seal/security band — never body text.
2. **Consistent optical alignment, not just numeric alignment** — text baselines and rule lines should share a true grid; the current shell's ad-hoc spacing occasionally leaves the security band slightly mis-aligned with the signature block above it. v2 fixes this with the shared grid unit described in §2.1.
3. **One hero moment per document, not several competing ones** — currently the shell gives roughly equal visual weight to the recipient name, the QR code, and the seal. v2 makes the recipient name the unambiguous single largest, boldest element on the page (per the certificate-wording convention above), and reduces the security band and seal to a supporting register.

---

## 3. Typography scale (v2)

Derived directly from §2.4's "one hero moment" principle — a defined type scale, not ad-hoc `font-size` values per element:

| Role | Face | Size | Weight/style |
|---|---|---|---|
| Recipient name (the hero) | Cormorant Garamond | 2.4rem | 600, no letter-spacing |
| Ceremonial body text | Cormorant Garamond | 1.15rem | 400/500, line-height 1.9 |
| Institution name | Cinzel | 0.85rem | 500, +0.18em tracking, uppercase |
| Document type label | Cinzel | 0.68rem | 600, +0.22em tracking, uppercase, gold |
| Section/field labels | Cinzel | 0.58–0.62rem | 600, +0.08–0.16em tracking, uppercase |
| Data/tabular values | Inter | 0.78–0.85rem | 400–500 |
| Signature typed name | Cormorant Garamond (italic) | 1.5rem | 500 italic |
| Footer/legal line | Inter | 0.62rem | 400, muted colour |

---

## 4. Security background (v2)

A programmatically generated, low-opacity guilloché-style line field — concentric/interference sine-wave paths rendered as an inline SVG `<pattern>`, tiled behind the document body at ~4% opacity in Royal Gold. This is a **mathematical pattern generated from a formula**, not a traced or copied image from any real security printer or institution — the same discipline already applied to the barcode renderer (built from the published Code 128 standard, not copied from any vendor's proprietary artwork). Implemented in `document-template-shell.js` §4 below.

---

## 5. Strengths to preserve (do not touch)

- The three-font typography system (Cormorant Garamond / Cinzel / Inter) — already benchmark-appropriate.
- The confirmed-live Coffee Brown / Royal Gold / Cream / Ivory / Milk White palette — a real, already-favourable finding from the original Master Spec.
- The security/verification architecture (QR, barcode, hash, verification log, Permanent Verification ID) — already at or above the general industry standard for an institution of this kind; no named institution's practice exceeds what's already built here in substance, only in visual polish.
- The seal-never-fabricated discipline — this is, if anything, *more* rigorous than typical practice (many institutions' digital certificate systems use a low-resolution scanned seal without much scrutiny of its provenance).

## 6. Weaknesses to fix (this report's mandate)

1. No security background pattern — fixed in §4.
2. No defined type scale — fixed in §3.
3. Ad-hoc, non-grid-based spacing — fixed via the `--doc-unit` system in §2.1.
4. One template body treated identically for narrative and tabular documents — fixed via `doc-body--narrative` / `doc-body--tabular` variants.
5. No running footer for multi-page documents — fixed ahead of the Transcript build.
6. No jurisdiction/legal footer line — adopted from the one real reference sample (§1).

## 7. How SHRS will exceed the benchmark, not just match it

- **Security**: a live, server-verified HMAC content hash plus a public verification platform is already stronger than a purely visual/print security feature — most institutions' physical security features cannot be checked by a receiving party without specialist equipment; SHRS's can be checked by anyone with a phone camera, instantly, for free. This is stated as SHRS's genuine structural advantage, not a marketing claim.
- **Archival honesty**: the explicit content-hash snapshot on every `graduation_documents` row (§3.5, §13.3) means a document issued today remains provably unaltered decades from now even if the visual design system evolves — most institutions cannot make this claim about documents older than their current design system.
- **Seal governance**: the seal-status model introduced in §12 of the Master Spec (real / placeholder / unset, never fabricated) is more disciplined than the common practice of a single shared scanned-seal image used indiscriminately across every office and document type.

---

## 8. Second reference batch (supplied mid-session) — a privacy note first, then the findings

Six further reference images were supplied after this report's first version was written. A privacy note has to come before any design content, because it governs how this section was written:

- **Four of the six are genuine government/university-issued academic documents belonging to real, named individuals** — two Islamic University of Almadinah (Kingdom of Saudi Arabia, Ministry of Education) bachelor's degree certificates, and two Islamic University of Minnesota graduation documents, each bearing a real person's full name, a national ID or academic ID number, and in some cases a photo. A fifth, a Masjid an-Nabawi study-circle certificate of completion, is the same category — a real name and signature. **None of that personal data — no name, no ID number, no photo — is reproduced, stored, or quoted anywhere in this report, the Master Specification, or this codebase.** These individuals are not part of SHRS and did not consent to their credentials being used as a design reference in a third party's system; the only thing taken from these five images is *structural pattern* (where a seal sits, how a bilingual layout is mirrored, what a security-feature disclosure looks like) — the same category of general, non-proprietary observation this entire report has been built on since §0.
- **The sixth — a "Verified IQ Certification" social-media advertisement** — carries no real person's data (a marketing mockup) and is discussed directly below.
- **A seventh image, an "Islamic University in Nigeria" official-transcript design exemplar**, uses a placeholder name and a sequential document number (`000001`) in a way consistent with a template/demo asset rather than a real graduate's record — discussed directly below on that basis. If this is in fact a real issued document, the same redaction discipline as the other five applies retroactively: nothing about the named individual is repeated here, only the structural pattern.

### 8.1 Structural findings (institution-level, never person-level)

| Source (institution named, no personal data) | Pattern observed | Verdict for SHRS |
|---|---|---|
| Islamic University of Almadinah (Saudi Ministry of Education) bachelor's certificates | A religious invocation opening line before the certifying sentence ("All praise is due to Allah..."); GPA/classification stated in flowing prose, not a table, on the *certificate* specifically (a separate transcript would carry the tabular form); vertical barcode running down the left margin rather than horizontal in the security band; two seals (Ministry crest + University seal) at opposite top corners, not stacked together. | The devotional opening line is directly appropriate for SHRS's own Islamic character and already implicit in this project's tone elsewhere (see the site's Adhkār/Islamic content) — worth considering for the Certificate's own body text once built (§16.1). The vertical-barcode-in-margin placement is a genuine alternative worth noting but not adopted — SHRS's existing security-band convention (§2.1, §14–15) already places QR+barcode together for one-glance scanning, which serves the verification audiences named in §5 better than separating them to opposite margins. |
| Islamic University of Minnesota graduation documents | Teal/gold colour system (confirms, by contrast, that SHRS's own Coffee Brown/Royal Gold palette reads as distinct, not derivative); a student photograph included directly on the Graduation Certificate; decorative graduation-cap-and-confetti border art on a supplementary certificate variant; dual seal treatment (a small embossed institutional mark plus a separate circular "University Seal" medallion) exactly matching the two-seal convention already identified from the very first reference sample in §1. | The confetti/graduation-cap clip-art border is a useful **negative** reference: it reads as a template rather than a bespoke institutional publication, which is precisely the gap the Executive Directive is asking SHRS to close — restrained heraldic ornamentation (already SHRS's direction) over generic celebratory clip-art. A student photograph on the Certificate itself is **not recommended** for SHRS: it adds a real data-protection burden (consent, image quality control, a photo pipeline that doesn't exist) for a feature that isn't required by any of §5's stated verification audiences, who authenticate identity through other means (passport, national ID) when it matters — the photo is better placed on the Digital Graduate Profile (§1.3) as an opt-in, not the permanent Certificate of record. |
| Masjid an-Nabawi study-circle certificate of completion | Side-by-side bilingual columns (Arabic dominant, English secondary) rather than stacked; a grade expressed both as a descriptive word ("Good") and a numeric percentage together; minimal ornamentation — one seal, one signature, one QR code. | The dual word+number grade presentation is a strong, low-cost idea worth adopting in the Diploma Supplement's grading-scale key table (§16, per this report's §2.2 finding on grade presentation) — it's exactly the "don't make the reader guess what 76% means" instinct that document already exists to serve. |
| "Verified IQ Certification" (marketing exemplar, no real person) | Oversized sans-serif hero numeral; a holographic sticker graphic; a wax-seal-style circular badge; a barcode; a certificate ID. | A clear **negative** reference for an academic institution: the treatment is built for a consumer marketing funnel (an "Ad" in a social feed), not institutional trust — the typography is too casual, the "holographic" effect is a flat graphic simulating a physical security feature the document doesn't actually have, which is precisely the kind of unearned security claim this project's own discipline (§6.2, §3.7 of the Master Spec) has consistently refused to make. Noted here explicitly as what SHRS should NOT do, not as inspiration. |
| "Islamic University in Nigeria" transcript design exemplar | A printed checklist of the document's own security features directly on the page ("Original Registrar's Signature ✓, Official University Seal ✓, QR Code Verification ✓..." etc., including several — UV fluorescent fibers, holographic security strip, chemical reactivity protection — that only apply to physical print production, not a digital record); three distinct reference numbers on one document (Transcript Number, Academic Archive Reference, Verification Reference); a "Blockchain Verification ID" field; page-numbering footer ("PAGE 1 OF 4"). | **Adopt:** the page-numbering footer — already added to `document-template-shell.js` v2 this round (§2.2 of this report's original findings). **Consider, not yet adopted:** an on-document plain-language list of *which* security features apply to *this specific* document (SHRS's own hash/QR/barcode/seal set, not a copied checklist) — genuinely useful consumer education for a verifier who doesn't know what to look for, and cheap to add once the Certificate template exists. **Explicitly rejected:** a "Blockchain Verification ID" field — SHRS has no blockchain infrastructure, and this project's standing rule (stated repeatedly throughout the Master Specification, most explicitly in §3.7 and §6.2) is to only claim security capabilities that are actually built and supportable; printing a blockchain-sounding field with nothing real behind it would be exactly the unearned claim this engagement exists to avoid. The three-tier reference-number idea is **already substantially satisfied** by SHRS's own reference-number/verification-ID split (§3.1–§3.3) — a third tier was judged unnecessary complexity for the volume and audience SHRS actually serves. |

### 8.2 What changes as a result

Nothing in `functions/_lib/document-template-shell.js` v2 needed revision after this second batch — the page-numbering footer it already added anticipated the one adoptable idea (§8.1 above) before this batch arrived. The dual word+number grade presentation is logged here as a requirement for the Diploma Supplement build (§20's Class A phase), not implemented now, since no grading-scale key table exists yet to apply it to.

---

*This report is the required design-analysis gate under the Executive Directive — Stage 3 Execution Order. Implementation follows in the Master Specification's amended §2, §6, §9–§12 and in `functions/_lib/document-template-shell.js` v2.*
