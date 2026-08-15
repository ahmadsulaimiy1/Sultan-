# The Operating Procedure — From Observation to the Lifting of the Freeze

**Pack document 04. The definitive operating procedure for the reconciliation.**
**Authority:** the Founder's Registrar Reconciliation Preparation Directive, 15 August 2026.
**Status:** PREPARED — AWAITING THE REGISTRAR. This document describes future actions; it performs none.

> **The freeze is in force throughout.** Until the closing entry of Stage 6 is signed by both
> the Registrar and the Founder: no signing key is generated (save the single, fully gated
> generation-and-custody ceremony inside Stage 3, which touches no live system, and only on
> the condition stated there — the key's installation into Cloudflare is itself a signed
> Stage 5 action), no certificate is minted, no record is created or modified in the
> production database, no
> reissue or revocation is performed, and production is not altered. Every action named in
> this procedure happens only **after sign-off**, at its own stage, in its own order — never
> before, and never out of order.

---

## 1. The six stages at a glance

| Stage | Name | Who leads | Principal output | Nobody proceeds to the next stage until |
|---|---|---|---|---|
| 1 | Registrar Review | Registrar | Completed, signed observation workbook + photograph set | The Registrar has signed and dated the completed workbook (checklist in `02-workbook-guide.md` §7 fully ticked) |
| 2 | Technical Review (joint) | Technical Reviewer, with the Registrar | Classified workbook (every row has `final_classification` + `recommended_action_code`) + draft approved-actions list | The `registrar_signoff` and `auditor_signoff` columns are complete for all 51 rows; Registrar and Technical Reviewer have both signed |
| 3 | Cryptographic Review | Cryptographic Reviewer | Written custody decision; v3 generation ceremony record (only if the stated condition is met); registry-wording memorandum | The Cryptographic Reviewer has signed the Stage 3 record; the Founder has countersigned the custody memorandum; and, where the ceremony was held, the ceremony record is countersigned by the Founder or another non-executing role-holder |
| 4 | Founder Approval | Founder | Signed approved-actions list; written P1/P2 policy selection; signed registry wording | The Founder has signed every document; unsigned rows are formally recorded as frozen |
| 5 | Implementation | Technical Reviewer (executor), Auditor observing | Every signed action executed exactly per `07-implementation-plan.md`, verified batch by batch | Every signed action is executed or formally aborted with its rollback; the final verification runs are green and countersigned |
| 6 | Audit Logging | Auditor | Complete implementation log + closing five-sources-agree entry | The closing entry is signed by the Registrar **and** the Founder — only then does the freeze lift |

No stage may open until the previous stage's exit criteria are met **and signed**. No stage
may be skipped, merged, or run in parallel with another, with one exception: Stage 6's log is
written in real time *during* Stage 5 (Section "Stage 6" explains how the two interlock).

---

## 2. Roles

| Role | Held by | Responsibility in this procedure |
|---|---|---|
| **Registrar** | The school Registrar | Owner of the institutional facts: completes the workbook observations, gathers the registers and student records, signs Stages 1, 2, and the closing entry of Stage 6 |
| **Technical Reviewer** | [TO BE CONFIRMED BY REGISTRAR] | Verifies workbook entries against the live database and the repository; runs forensic test F1; applies the decision tree jointly with the Registrar; executes Stage 5 |
| **Cryptographic Reviewer** | [TO BE CONFIRMED BY REGISTRAR] | Custody decision for key v3; conducts the generation ceremony if and only if the Stage 3 condition is met; drafts the registry-wording memorandum |
| **Founder** | The Founder | Selects the P1/P2 policy; signs or withholds signature on every proposed action; countersigns the custody memorandum (and, where held, the v3 ceremony record, unless another non-executing role-holder countersigns it) and the closing entry |
| **Auditor** | [TO BE CONFIRMED BY REGISTRAR] | Keeps the implementation log; countersigns the `auditor_signoff` column at Stage 2; observes Stage 5; prepares the Stage 6 closing entry |

**Dual-role rule.** One person may hold two of these roles. But **no action may be signed off
by its own executor alone**: every sign-off in this procedure requires at least one signatory
who did not personally execute the thing being signed. Where the same person holds, say,
Technical Reviewer and Auditor, the countersignature for that person's work must come from
another role-holder (Registrar or Founder).

---

## 3. The communications rule (applies at every stage)

1. **No secret value — no signing key, in whole or in part — is ever written into an email, a
   chat message, a ticket, a shared or syncing document, or this repository.** This is the
   standing custody rule of `docs/certificate-key-deployment.md` §3 ("Do not email it. Do not
   put it in the repository. Do not paste it into a chat, a ticket, or a document that
   syncs."), and it binds every role in this procedure without exception.
2. The **only** key-related value that may travel in writing is a SHA-256 **fingerprint**
   (first 16 hex characters), which reveals nothing about the key itself — exactly as
   `24bb0f683233486a` was recorded for key v2.
3. Photographs and the completed workbook travel only by the transfer channel agreed with the
   Founder's office before Stage 1 begins (`02-workbook-guide.md` §5): [TO BE CONFIRMED BY
   REGISTRAR].
4. Sign-offs are physical signatures on paper, or an equivalent the Founder approves in
   writing before Stage 1 begins.

---

## Stage 1 — Registrar Review

**Purpose.** Establish the physical and institutional facts — what paper exists, what is
printed on it, and who holds it — for all 51 rows, before anyone reasons about any of it.
This is observation only: nothing is decided, classified, or corrected at this stage.

**Who leads.** The Registrar, alone. No technical involvement is required or permitted.

**Inputs.**

1. `02-workbook.csv` (the 51-row workbook) and `02-workbook-guide.md` (field-by-field instructions).
2. Every physical certificate that can be located — from students, families, and the school's own files.
3. The graduation register, any print archive or production logs, and the students' records.
4. A camera or phone for evidence photographs.

**Steps.**

1. Before starting, agree the photograph and workbook transfer channel with the Founder's
   office (Section 3, rule 3). Do not begin until it is agreed.
2. Gather the graduation register, print archive/production logs, and student records, and
   keep them to hand — they are Stage 2 inputs as well.
3. Locate every physical certificate that exists, for any row, wherever it is held.
4. Complete the observation columns (columns 12–23) for all 51 rows, exactly per
   `02-workbook-guide.md` §3. In particular: copy every printed number **character for
   character**; never correct, reconcile, or copy a number from `plan_seq`; record every
   document on the row of the student and programme it names; write `Unknown` (with a remark)
   rather than leaving any cell blank.
5. Photograph every physical certificate per `02-workbook-guide.md` §5 (`row<NN>-front.jpg`
   at minimum; every printed number legible) and list the filenames in
   `supporting_evidence_ref`.
6. Note in `registrar_remarks` every discrepancy between the paper and the locked columns,
   and describe any physical certificate that matches no row at all.
7. Work through the completion checklist in `02-workbook-guide.md` §7 and tick every box.
8. Sign and date the completed workbook (a dated signature on the workbook's cover or
   accompanying sheet, attesting the observation columns). The `registrar_signoff` **column**
   stays empty — it is completed at Stage 2's formal sign-off step, after classification.

**Outputs.** The completed, signed observation workbook; the photograph set; the gathered
register, print logs, and student records.

**Exit criteria — before Stage 2 may begin.**

- Every observation cell of all 51 rows is filled (no blanks; `Unknown` only with a reason).
- Every physical certificate has at least a front photograph with all numbers legible.
- The §7 checklist is fully ticked.
- **Signed by:** the Registrar (dated signature on the completed workbook).

**FORBIDDEN during Stage 1.**

- Any technical or database action of any kind — no queries the Registrar runs personally, no
  scripts, no instructions to anyone else to touch any system.
- Editing the locked columns (1–11) or the review columns (24–27).
- "Correcting" any printed number, name, or date to match a plan or an expectation.

---

## Stage 2 — Technical Review (joint)

**Purpose.** Bring the Registrar's observations face to face with the verification database,
the repository, and the cryptographic records; test each row through the decision tree; and
produce the classified workbook and the draft approved-actions list. Everything here is
reading, computing, and classifying — nothing is changed anywhere.

**Who leads.** The Technical Reviewer — **jointly with the Registrar present throughout**.
Neither works on the classification columns alone.

**Inputs.**

1. The signed Stage 1 workbook and photograph set.
2. `03-decision-tree.md` (the deterministic classification rules) and `06-evidence-pack.md`
   (the per-certificate citation index).
3. The audit: `docs/shrs-certificate-cryptographic-integrity-audit-2026-08-15.md`, pinned to
   commit `afb80e87` and the two live runs (`31862779664` presence, `31857567994` acceptance).
4. Read-only access to the public verification endpoint
   (`https://shroyalschools.com/api/certificates/verify`) and to the repository.

**Steps.**

1. Confirm the baseline still holds: if desired, re-run the two GitHub Actions verification
   workflows against production. **Only `certificate-presence-audit.yml` is read-only by
   construction.** `certificate-verification.yml` is read-only **only** when dispatched with
   `run_import: false` **and** `configure_cloudflare: false` — **both inputs default to
   true**, and on its Monday 06:00 UTC schedule and its push triggers the import/configure
   steps run unconditionally whenever the required secrets are present. **Every
   freeze-period run of `certificate-verification.yml` must therefore be dispatched with
   both inputs explicitly set to false.** (At the baseline the stored GitHub secrets include
   neither `DATABASE_URL` nor `DOCUMENT_HASH_SECRET`, so the mutating steps currently skip
   or fail closed on scheduled runs — but this procedure must not rely on that remaining
   true.) Expected at baseline: exactly 13 records (000035–000047); 7 IBT `intact`; 6 IDD
   `pending_signature`; nothing else found.
2. Verify every workbook entry against the live database and the repository: for each of the
   13 issued rows, that the stored serial, student, programme, and live status match the
   locked columns; for each of the 38 planned rows, that no record exists; for every printed
   number transcribed by the Registrar, what the live endpoint answers when it is queried.
3. Run **forensic test F1** (defined below) on every row where the decision tree calls for it
   — a physical document exists carrying a printed number with a 5-character tail, but no
   matching database record. Record the result (reproduced / not reproduced) on the row.
4. Walk every one of the 51 rows through `03-decision-tree.md`, in row order, and record the
   outcome in `final_classification` and `recommended_action_code`. A B-category row whose
   terminal depends on the Founder's P1/P2 selection is recorded as **"B2 — pending P1/P2"**
   — a valid Stage 2 classification; the Founder's Stage 4 selection then resolves every
   such row mechanically to B2a (under P1) or B2b (under P2). The tree is applied
   mechanically — no per-row improvisation, no "special cases" invented at the table.
5. Raise and minute any physical certificate that matches no row at all, and any row where
   the observations and the systems cannot be reconciled by the tree; such rows are marked
   [TO BE CONFIRMED BY REGISTRAR] and carry **no** action code until resolved.
6. Produce the **draft approved-actions list**: every row, its classification, its
   recommended action code, and a cross-reference to the matching rollback entry in
   `05-rollback-plan.md`. Recording a code is a recommendation only — nothing on this list is
   authorised until Stage 4.
7. Formal sign-off step: the Registrar completes the `registrar_signoff` column and the
   Auditor (the technical/audit reviewer) completes the `auditor_signoff` column, row by row.

> **Forensic test F1 — read-only HMAC recomputation under key v1.**
> Rebuild the canonical field set (`certificateHashFields` in
> `functions/_lib/certificate-serial.js`: `serialBase`, `studentIdentityNo`,
> `studentFullName`, `programmeCode`, `academicYear`, `gradeEn`, `issuedAt`) from the paper
> as transcribed in the workbook, applying the defined normalisations: the printed issue
> date is converted to the ISO `YYYY-MM-DD` (Gregorian) form before hashing — matching
> `isoDateOnly()` and the sealed registers (`"issuedAt": "2026-08-08"`) — and `gradeEn` is
> tried both exactly as printed and as the batch convention `Excellent`. The reviewer
> records exactly which combination, if any, reproduced the suffix. Compute the HMAC-SHA256
> keyed with the retired v1 key — the value held in Cloudflare Production as
> `DOCUMENT_HASH_SECRET_V1`, recorded in `docs/certificate-key-deployment.md` §2; the key
> value itself is never written into this pack (Section 3) — and compare the first **five**
> hex characters, uppercased, against the printed tail, and — where a printed verification
> code exists — the first **twelve** against it. If the 5-character tail matches but the
> printed 12-character verification code does not (or vice versa), the result is **NO
> MATCH**; record both values on the worksheet.
> **Reproduced** → the printed number was genuinely derived under v1 and the row is a B1a
> candidate. **Not reproduced** → record the finding plainly and only as: **"not
> reproducible under v1 with the recorded fields."** A negative F1 is **not** proof of
> forgery — a one-character difference in the recorded name, identity number, or date
> breaks the HMAC completely. The row falls to the B2 family.
> F1 computes and compares only. It writes nothing, anywhere, ever.

**Outputs.** The classified workbook (all 51 rows carrying `final_classification` and
`recommended_action_code`, both sign-off columns complete); the draft approved-actions list;
the F1 results record; minutes of any unresolved rows.

**Exit criteria — before Stage 3 may begin.**

- Every row is classified — **"B2 — pending P1/P2" is a valid classification** for
  B-category rows whose terminal awaits the Founder's Stage 4 selection — or explicitly
  marked unresolved with no action code.
- F1 has been run and recorded wherever the tree required it.
- The draft approved-actions list exists and cross-references `05-rollback-plan.md`.
- **Signed by:** the Registrar (`registrar_signoff` column plus dated signature) and the
  Technical Reviewer/Auditor (`auditor_signoff` column plus dated signature).

**FORBIDDEN during Stage 2.**

- **Any write to any live system** — no database record created or modified, no Cloudflare
  environment change, no key generated, no production deployment, no change to any student
  record. The only things this stage writes are the pack's own paperwork.
- Executing, "trialling", or partially performing any action code — including for rows whose
  outcome seems obvious.
- Classifying any row other than by the decision tree.

---

## Stage 3 — Cryptographic Review

**Purpose.** Settle key v3 custody before any key exists; conduct the v3 generation ceremony
**only** if the reconciliation actually requires a new key; and put the programme-registry
wording in front of the Founder in final form. This stage prepares cryptographic material and
paperwork — it signs nothing, mints nothing, and touches no live system: the generated key's
installation into Cloudflare is the **first item of Stage 5**, executed only under the
Founder's signed approval.

**Who leads.** The Cryptographic Reviewer.

**Inputs.** The classified workbook and draft approved-actions list (Stage 2 outputs);
`docs/certificate-key-deployment.md` (especially §3, custody, and §4, rotation);
`functions/_lib/document-hash.js` and `functions/_lib/certificate-serial.js`.

**Steps.**

1. Confirm the Stage 1 and Stage 2 exit sign-offs are in hand. Stage 3 does not open without
   them.
2. **Custody decision (always performed, whether or not a key is generated).** Record in
   writing the two custody locations required by `docs/certificate-key-deployment.md` §3:
   - the Cloudflare Pages environment variable, marked **Encrypt**, and
   - **one durable second copy** in whatever the school uses for its most sensitive
     credentials — the same place the Board's own irreplaceable documents live. The named
     store is decided by the Founder, in writing, at this step.
   The key value is **never** emailed, never placed in a chat, ticket, or syncing document,
   and never committed to the repository (Section 3). This memorandum exists because key v2
   had exactly one copy and is now lost, permanently, with the six I'dādiyyah certificates
   left unverifiable by mathematics as a result — the failure this decision exists to make
   impossible for v3.
3. The Founder countersigns the custody memorandum. No generation happens before that
   countersignature.
4. **The v3 generation ceremony — conducted IF AND ONLY IF the draft approved-actions list
   contains at least one C1 row, OR any "B2 — pending P1/P2" row is outstanding, OR the
   Founder's P1/P2 selection is P2.** (The selection is made at Stage 4; if Stage 4 selects
   P2 and no ceremony was held, the procedure returns to this stage for the ceremony before
   Stage 4 concludes — see Stage 4 step 2.) If none of these conditions holds, record in
   writing that no new key is required, and continue at step 6. When the condition is met
   and the custody memorandum is countersigned, the ceremony is authorised. It is conducted
   by the Cryptographic Reviewer **in the presence of a second role-holder as witness**, and
   proceeds as follows:
   1. Generate **64 bytes from the operating-system CSPRNG** (the same specification as key
      v2, per `docs/certificate-key-deployment.md` §5).
   2. Compute the key's SHA-256 fingerprint and **record its first 16 hex characters in
      writing** in the ceremony record — the same way `24bb0f683233486a` was recorded for
      v2. The fingerprint, and only the fingerprint, may be written down and circulated.
   3. Place the key in the durable custody location named in the memorandum (the store that
      holds the Board's own irreplaceable documents). **The key is NOT installed into
      Cloudflare at this stage** — production is not touched at Stage 3. The Cloudflare
      installation is the **first item of Stage 5**, executed only under the Founder's
      signed approval.
   4. **Warning — governing the Stage 5 installation: the two Cloudflare variables must
      change together, in one save.** When the
      key is installed to Cloudflare at Stage 5, `DOCUMENT_HASH_SECRET` (the new value) and
      `DOCUMENT_HASH_KEY_VERSION` (set to `3`) must be updated in the same change. Setting
      the secret while the version variable still reads `2` would cause the live verifier to
      check the six v2 certificates (000042–000047) against the new key
      (`functions/_lib/document-hash.js`, `verificationKey`: when a row's version equals the
      current version, the current secret is used) — publicly reporting genuine certificates
      as failed, the exact harm key versioning exists to prevent. Set both, in Production
      and Preview, per `docs/certificate-key-deployment.md` §2.
   5. Verify the custody copy **by fingerprint**, without revealing the value
      (`docs/certificate-key-deployment.md` §3):
      `printf %s "$DOCUMENT_HASH_SECRET" | sha256sum | cut -c1-16` — the output must equal
      the fingerprint recorded at step 4.2. The same fingerprint check is repeated against
      the installed Cloudflare value at Stage 5, immediately after the installation.
   6. Re-run the acceptance workflow (`certificate-verification.yml`) against production —
      **dispatched with `run_import: false` and `configure_cloudflare: false`** (Stage 2
      step 1) — and confirm the 13 existing certificates answer **exactly as at the
      baseline** — 7 `intact`, 6 `pending_signature` (the structural proof that a v3
      rotation cannot touch them is §5 of the audit). Nothing in this ceremony has touched
      production, so any other result halts the stage.
   7. The ceremony record — the fingerprint, the custody confirmation, the fingerprint
      verification check, and the baseline re-check — names the witness and is
      countersigned by the Founder or another non-executing role-holder.
5. Destroy every transient copy of the key made during the ceremony (terminal history,
   downloaded file, clipboard), so that exactly the copies held in custody per the
   memorandum remain — at this stage the durable custody copy; the Cloudflare copy comes
   into existence only at its Stage 5 installation.
6. **Registry-wording memorandum.** For every programme code that appears on the draft
   approved-actions list under a minting code (C1 or B2b), document the proposed
   `PROGRAMMES` registry entry in `functions/_lib/certificate-serial.js` — the bilingual
   labels (`labelEn`, `labelAr`, `stageEn`, `stageAr`) in the house pattern the file itself
   documents. At the evidence baseline (main, `afb80e87`) the registry holds **four**
   programme codes — IBT, IDD, THN, and TMH — the TMH entry Founder-confirmed on
   8 August 2026 and locked in the file itself. New registry entries are therefore required
   **only for QUR, PRY, JSS, and SS**. TMH needs **no registry change**: the file's own
   belt-and-braces note that the engraved wording holds one confirmation before the first
   sheet is minted is satisfied by the Founder's Stage 4 signature on the TMH mint action.
   Nothing is added to the code at
   this stage — the memorandum's wording, once Founder-signed at Stage 4, is applied as a
   Stage 5 implementation action. No QUR, PRY, JSS, or SS certificate can be minted
   before its registry entry exists with Founder-approved wording.
7. Prepare the **P1/P2 policy decision memorandum** for the Founder (jointly with the
   Registrar): a one-page statement of the choice the Founder must make once, in writing,
   before any B2 action — **P1** (legacy registration suffices for already-printed unsigned
   documents: every B2 row resolves to B2a) or **P2** (every circulating credential must be
   cryptographically signed: every B2 row resolves to B2b) — with the list of the specific
   rows the choice will govern. The chosen policy applies mechanically to every B2
   certificate; there is no per-certificate discretion.
8. Assemble the Stage 3 record: custody memorandum, ceremony record (or the written
   statement that no key was required), registry-wording memorandum, policy memorandum.
9. The Cryptographic Reviewer signs the Stage 3 record.

**Outputs.** The countersigned custody memorandum; the ceremony record with the v3
fingerprint (or the formal no-key-required record); the registry-wording memorandum; the
P1/P2 policy memorandum.

**Exit criteria — before Stage 4 may begin.**

- The custody memorandum is signed by the Cryptographic Reviewer and countersigned by the
  Founder.
- If the ceremony was held: it was witnessed by a second role-holder; the fingerprint is
  recorded; the custody copy verifies by fingerprint; the baseline re-check (step 4.6) is
  green; and the ceremony record is countersigned by the Founder or another non-executing
  role-holder (step 4.7). If not held: the no-key-required record is signed.
- The registry-wording and P1/P2 memoranda are complete.
- **Signed by:** the Cryptographic Reviewer (Stage 3 record), the Founder (custody
  memorandum countersignature), and — where the ceremony was held — the Founder or another
  non-executing role-holder (ceremony record countersignature).

**FORBIDDEN during Stage 3.**

- **Signing anything with the new key.** The v3 key, if generated, signs nothing — not a
  test certificate, not a sample, not a "dry run" — until the Founder has signed at Stage 4
  and the action appears on the signed list executed at Stage 5.
- Minting any certificate; creating or modifying any database record.
- **Installing the key into Cloudflare** — Production or Preview — or changing any live
  environment variable. The installation is the first item of Stage 5, executed only under
  the Founder's signed approval.
- Adding the registry entries to the code (that is a Stage 5 action on the signed list).
- Writing the key value into any written channel whatsoever (Section 3).

---

## Stage 4 — Founder Approval

**Purpose.** The single point at which recommendations become authority. The Founder reviews
everything the first three stages produced and signs — or declines to sign — each element.
Nothing unsigned may ever be implemented.

**Who leads.** The Founder.

**Inputs (the Founder receives all five).**

1. The classified workbook (Stage 2).
2. The draft approved-actions list (Stage 2).
3. The P1/P2 policy decision memorandum (Stage 3).
4. The registry-additions wording (Stage 3).
5. The Stage 3 record (custody memorandum; ceremony record or no-key-required record).

**Steps.**

1. The Founder reviews the classified workbook row by row against the draft approved-actions
   list.
2. **The Founder Policy Gate.** If any row carries a B2 classification (recorded at Stage 2
   as "B2 — pending P1/P2"), the Founder selects
   **once, in writing**, between **P1** and **P2** (as defined in the memorandum and in
   `02-workbook-guide.md` §4). The selection then applies mechanically to every B2 row —
   under P1 each becomes B2a; under P2 each becomes B2b — and the approved-actions list is
   finalised accordingly. If the selection is **P2** and no v3 generation ceremony was held
   at Stage 3, the procedure **returns to Stage 3** for the ceremony before Stage 4
   concludes — the finalised list is not signed until the ceremony record exists. There is
   no per-certificate discretion, for anyone, at any later
   point.
3. The Founder signs each document: the finalised approved-actions list (each row
   individually signed or covered by a signed row-list), the policy selection, and the
   registry-additions wording.
4. **Any row the Founder does not sign stays frozen** — the certificate, record, and paper
   for that row remain exactly as they are, under the freeze, and the row is recorded as
   frozen in the implementation log at Stage 6. Withholding a signature is a legitimate
   outcome, not an error state.
5. If the Founder disagrees with a classification, the row is **returned to Stage 2 for
   joint re-review** through the decision tree. A classification is never amended by pen at
   the approval table.
6. The signed set is returned to the Registrar for custody, with working copies to the
   Technical Reviewer and Auditor.

**Outputs.** The signed approved-actions list; the written P1/P2 selection; the signed
registry wording; the recorded list of frozen (unsigned) rows.

**Exit criteria — before Stage 5 may begin.**

- The finalised approved-actions list bears the Founder's signature, and every action on it
  can show the full chain: Registrar (Stages 1–2) → Technical (Stage 2) → Cryptographic
  (Stage 3) → Founder (Stage 4).
- If any B2 action is on the list, the written P1/P2 selection exists.
- If any C1 or B2b action is on the list: the v3 ceremony record exists (Stage 3, including
  the return path of step 2 where P2 was selected without a ceremony), and the registry
  wording for every affected programme either already stands Founder-confirmed in the file
  (TMH, confirmed 8 August 2026) or is Founder-signed in the memorandum (QUR, PRY, JSS, SS).
- **Signed by:** the Founder.

**FORBIDDEN during Stage 4.**

- **Implementation of anything, signed or unsigned.** Stage 4 produces signatures, not
  actions; even a fully signed action waits for Stage 5.
- Amending classifications, action codes, or workbook observations at the approval table.
- Any per-certificate exception to the P1/P2 selection.

---

## Stage 5 — Implementation

**Purpose.** Execute the signed approved-actions list — exactly, completely, and nothing
else. This is the only stage of the six in which any live system is changed — the v3 key's
installation into Cloudflare included — and every change
it makes was written down, classified, reviewed, and signed before the stage opened.

**Who leads.** The Technical Reviewer, as executor, with the Auditor observing and logging
(Stage 6) in real time.

**Inputs.** The Founder-signed approved-actions list; `07-implementation-plan.md` (the
execution script — order, batching, exact steps per action code);
`05-rollback-plan.md` (the pre-written reversal for every action type); the implementation
log (opened per Stage 6 before the first action).

**Steps.**

1. Confirm the Stage 4 exit criteria in full, and that the implementation log is open.
2. Execute the signed actions **only in the order and batches set by
   `07-implementation-plan.md`**. The plan is an execution script: no redesign, no
   reinterpretation, no assumptions.
   **The first item, whenever the signed list contains any C1 or B2b action, is the
   installation of key v3 into Cloudflare.** Under the Founder's signed approval, the
   executor sets `DOCUMENT_HASH_SECRET` (the v3 value, from the Stage 3 custody copy) and
   `DOCUMENT_HASH_KEY_VERSION` (set to `3`) **together, in one save**, in Production and
   Preview, per `docs/certificate-key-deployment.md` §2 and the Stage 3 step 4.4 warning;
   verifies the installed value by fingerprint against the ceremony record; and re-runs the
   acceptance workflow (dispatched with `run_import: false` and
   `configure_cloudflare: false`) to confirm the 13 baseline certificates still answer
   7 `intact`, 6 `pending_signature` before any minting action runs. No v3-signed action
   may precede this installation.
3. Before each action is executed, stage its pre-written rollback from
   `05-rollback-plan.md` alongside it — the rollback artefact must exist and be to hand
   *before* the forward action runs, and its reference is recorded in the log entry.
4. Execute each action exactly as written. If reality deviates from the plan in any way —
   an unexpected database state, a number already occupied, an error, anything — **halt the
   batch**, invoke the staged rollback for any partially applied action, record the
   deviation in the log, and escalate to the Founder. A mid-batch rollback of a
   **partially applied** action under this halt rule is pre-authorised by the Founder's
   Stage 4 signature on that action's paired forward/rollback artefact; any
   **post-completion** rollback — an error discovered after an action completed — requires
   a fresh written instruction from the Founder. Execution does not resume until the
   deviation is resolved through the chain (back to Stage 2 or 4 as its nature requires).
5. **Verify after every batch:** re-run the acceptance workflow
   (`certificate-verification.yml`) and the presence audit
   (`certificate-presence-audit.yml`) against production. Every verification run of
   `certificate-verification.yml` is dispatched with `run_import: false` and
   `configure_cloudflare: false`; its mutating inputs are set to true only where the signed
   batch definition in `07-implementation-plan.md` explicitly requires that batch's import
   or configure step. The batch passes only if:
   - every certificate acted on in the batch now answers exactly as its signed action code
     specifies; and
   - every certificate **not** on the signed list answers exactly as at the 15 August 2026
     baseline (runs `31862779664` and `31857567994`); and
   - every sequence number the presence audit finds is either present at that baseline or
     created by a signed action already recorded in the log. Anything else halts
     implementation as in step 4.
   Record both run IDs in the log against the batch.
6. Each executed action is logged at the moment of execution, per Stage 6's entry format.
7. When the last signed action is executed (or formally aborted with its rollback and the
   Founder informed), run the two workflows once more as the final verification (dispatched
   per step 5), and record the run IDs.

**Outputs.** Every signed action executed (or formally aborted and rolled back, with the
Founder informed); per-batch and final green verification runs, with run IDs logged; a
complete real-time implementation log.

**Exit criteria — before Stage 6 may close.**

- Every action on the signed list is either executed and verified, or formally aborted with
  its rollback applied and the abort recorded and reported to the Founder.
- The final runs of both workflows are green and their run IDs are in the log.
- **Signed by:** the Technical Reviewer (executor) and the Auditor, on the final batch
  verification record.

**FORBIDDEN during Stage 5.**

- **Any action not on the Founder-signed list** — including actions that were classified and
  recommended but not signed, and including anything for a frozen row.
- **Any "while we're here" change**, however small, however obviously right it seems — a
  spelling fix, a tidy-up, an extra record, an unplanned renumbering. If it is worth doing,
  it is worth its own pass through Stages 2–4.
- Proceeding past a failed or ambiguous batch verification.
- Executing any action whose rollback artefact is not staged.

---

## Stage 6 — Audit Logging

**Purpose.** The permanent institutional record of what was done, by whom, and with what
proof — and the formal mechanism by which the freeze is lifted. Stage 6 opens alongside
Stage 5 (entries are appended in real time as actions execute) and closes after it, with the
closing entry.

**Who leads.** The Auditor.

**The log.** `docs/registrar-reconciliation/08-implementation-log.md`, created (empty, with
the header below) before the first Stage 5 action. The log is **append-only**: an entry,
once written, is never edited or deleted; a correction is a new entry that names the entry
it corrects.

**Every action receives one entry, at the moment of execution, with all of:**

| Field | Content |
|---|---|
| Timestamp | Date and time, UTC |
| Actor | The person who executed the action (by name and role) |
| Action code | A1 / A2-R / A2-V / B1a / B2a / B2b / C0 / C1 (Annex A) |
| Row | The workbook row number (1–51) and the certificate or student it concerns |
| Forward artefact | What was produced or changed (file, record, register entry), by exact reference |
| Rollback artefact | The staged reversal's exact reference in `05-rollback-plan.md` terms |
| GitHub run IDs | The verification/presence runs covering this action's batch |
| Commit SHAs | Any repository commit the action produced or relied on |

Frozen (unsigned) rows and formally aborted actions receive entries too, stating that fact.

**The closing entry.** After the last Stage 5 action and the final green verification runs,
the Auditor prepares the closing entry: for **every certificate on the workbook**, one line
confirming the pack's final principle — that the **five sources agree**:

1. the Registrar's records;
2. the printed certificate (or the confirmed absence of one);
3. the verification database;
4. the cryptographic records (key version, content hash, printed suffix);
5. the public verification service's live answer.

Any certificate for which the five sources do **not** yet agree is listed as such, with the
reason — and for that certificate the freeze does not lift.

**The lifting of the freeze.** The freeze formally lifts **only** when the closing entry is
signed by the **Registrar** and the **Founder**. Until both signatures are on it, every
prohibition in the freeze remains in force, in full, regardless of how much of Stage 5 has
been completed.

**Exit criteria — the procedure is complete when:**

- Every Stage 5 action, abort, and frozen row has its log entry.
- The closing entry's five-sources-agree confirmation covers every certificate.
- **Signed by:** the Registrar and the Founder, on the closing entry.

**FORBIDDEN during Stage 6.**

- Editing or deleting any earlier log entry (corrections are new entries).
- Declaring, treating, or acting as though the freeze is lifted before both closing
  signatures exist.
- Any further certificate lifecycle action after the closing entry without a new written
  directive from the Founder.

---

## Annex A — Terminal action codes (as used across the pack)

These are the only action codes this procedure recognises. All are recommendations until
Founder-signed at Stage 4, and none is performed before Stage 5. The table matches
`02-workbook-guide.md` §4.

| Code | Meaning (executed only after full sign-off) |
|---|---|
| **A1** | Leave the certificate unchanged. |
| **A2-R** | Execute the ratified reissue for this certificate. |
| **A2-V** | Execute the ratified revocation for this certificate. |
| **B1a** | Register the printed document as-is under key v1 — only where forensic test F1 showed the printed tail is cryptographically reproduced under v1. |
| **B2a** | Record the printed number in the legacy certificates register. It then resolves publicly, with no cryptographic self-check; the paper is unchanged. |
| **B2b** | Formal reissue under a new, fully-signed number; the printed document is formally superseded. |
| **C0** | No award due — record and close. |
| **C1** | Mint fresh under key v3, after all gates (including v3 generation at Stage 3 and its Cloudflare installation as the first Stage 5 item — v3 does not yet exist). |

**Why B2a works without a key.** The public verifier
(`functions/api/certificates/verify.js`) deliberately lets a well-formed stage-certificate
number that matches no stage record **fall through** to the older `certificates` table,
which is looked up by a free-form, staff-assigned `reference_no` and carries no
cryptographic hash. A printed number recorded there therefore answers publicly as a genuine
institutional record — honestly, without pretending to a mathematical self-check it does
not have. Whether that is sufficient for a circulating credential is precisely the P1/P2
policy question the Founder answers once, at Stage 4.

**The B2 policy gate, restated.** Before any B2 action: the Founder selects once, in
writing, P1 (B2 rows → B2a) or P2 (B2 rows → B2b). The selection applies mechanically to
every B2 certificate. No one exercises per-certificate discretion — at any stage.
