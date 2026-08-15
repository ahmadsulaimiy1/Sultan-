# 07 — The Implementation Plan

**Nothing in this document runs before Stage 4 sign-off. This is an execution script, not a design document: no redesign, no reinterpretation, no assumptions — and if reality disagrees with the signed list at any point, execution STOPS and returns to the SOP; it does not improvise.**

**SHRS Registrar Reconciliation Pack — document 7 of 7.**
**Authority:** the Founder's Registrar Reconciliation Preparation Directive, 15 August 2026.
**Status:** PREPARED — AWAITING THE REGISTRAR. No lifecycle action has been taken.

> **The freeze is in force.** Until the full sign-off chain of `04-sop.md` —
> **Registrar → Technical → Cryptographic → Founder** — is complete, no signing key is
> generated, no certificate is minted, no record in the **production** database is
> created or modified, and no reissue or revocation is performed. Every step below is written in the future tense for
> a reason: each one happens only **after sign-off**, at Stage 5, executed by the
> Technical Reviewer with the Auditor observing and logging, exactly as `04-sop.md`
> Stage 5 directs. Everything this plan runs comes **verbatim from the Founder-signed
> approved-actions list**; anything not on that list does not exist to this plan.

---

## 1. Preconditions — every box ticked before the first action

Stage 5 does not open, and the first action of Section 4's batch order does not run,
until **every applicable line below is true and evidenced**. The Technical Reviewer and
the Auditor confirm the checklist together, in writing, in the implementation log.

| # | Precondition | Evidence required |
|---|---|---|
| P-01 | The **classified workbook** is complete and signed: all 51 rows carry `final_classification` and `recommended_action_code` — for a B-category row whose terminal depends on the Founder's P1/P2 selection, the valid Stage-2 classification is **"B2 — pending P1/P2"**, resolved to B2a or B2b only by the Stage 4 policy selection (P-03) — and both the `registrar_signoff` and `auditor_signoff` columns are complete (Stage 2 exit criteria). | The signed workbook itself |
| P-02 | The **Founder-signed approved-actions list** exists (Stage 4 exit criteria), and every action on it shows the full chain Registrar → Technical → Cryptographic → Founder. Rows the Founder did not sign are recorded as **frozen** and appear nowhere in this plan's batches. | The signed list; the frozen-rows record |
| P-03 | If any row on the signed list carries a **B2** action: the Founder's **P1/P2 policy selection** exists, once, in writing (`04-sop.md` Stage 4, the Founder Policy Gate), and every B2 row on the signed list already reads B2a (under P1) or B2b (under P2) accordingly. | The signed policy memorandum |
| P-04 | If any **C1 or B2b** action is on the signed list: key **v3 has been generated** at the Stage 3 ceremony (it does not exist at the evidence baseline — audit §3), the ceremony **witnessed by a second role-holder**, its SHA-256 **fingerprint (first 16 hex characters) recorded** in the ceremony record, the key **installed to its durable custody location** — the second copy named in the countersigned custody memorandum (`docs/certificate-key-deployment.md` §3) — and **fingerprint-checked there**, and the **ceremony record itself** — fingerprint, custody confirmation, verification checks — **countersigned by the Founder or another non-executing role-holder** (a Stage 3 exit criterion). The memorandum's *other* location, the Cloudflare Pages environment variable, is deliberately **not** filled at Stage 3: it comes into existence only at Stage 5's first item (P-05), where its own fingerprint check follows the rotation. Stage 3 places the key in custody only; production is not touched at Stage 3. | The ceremony record; the fingerprint check at the durable custody location (the Cloudflare check follows P-05) |
| P-05 | If any C1 or B2b action is on the signed list: the **installation of v3 into Cloudflare Pages** — **`DOCUMENT_HASH_SECRET` set to the v3 key and `DOCUMENT_HASH_KEY_VERSION` set to `3`, together in one save, in Production AND Preview** (setting one without the other would make the live verifier check the six v2 certificates against the wrong key) — is the **first item of Stage 5**, executed only under the Founder's signed approval; production is not touched at Stage 3. No C1 or B2b mint runs until that rotation is complete and **`DOCUMENT_HASH_SECRET_V1` is confirmed still present** — the seven Ibtidā'iyyah certificates (000035–000041) depend on it permanently. | The read-only environment-name audit (`.github/workflows/cloudflare-env-audit.yml`), re-run after the rotation |
| P-06 | If P-05 applies: the hard-coded Cloudflare-configuration step in `.github/workflows/certificate-verification.yml` — which at the evidence baseline writes `DOCUMENT_HASH_KEY_VERSION` as `2` (`put DOCUMENT_HASH_KEY_VERSION "2"`) — has been **updated or disabled by a reviewed commit on the signed list**, so that no scheduled or routine run of that workflow can silently revert the v3 rotation. | The commit hash, recorded in the log |
| P-07 | If P-05 applies: the post-rotation **baseline re-check is green** — the acceptance run answers exactly as at the 15 August 2026 baseline: 13 certificates, all active, 7 IBT `intact`, 6 IDD `pending_signature` (the structural proof that a v3 rotation cannot touch them is audit §5). | The run ID, recorded in the log |
| P-08 | For every programme code that any signed C1 or B2b action mints: the **`PROGRAMMES` registry addition is merged** into `functions/_lib/certificate-serial.js` with the **Founder-approved bilingual labels** from the Stage 3/Stage 4 registry-wording memorandum, deployed per `05-rollback-plan.md` §4.7 (including the mandatory `node scripts/build.js` rebuild). At the evidence baseline (main, `afb80e87`) the registry holds **four** programme codes — **IBT, IDD, THN and TMH**, the TMH entry Founder-confirmed on 8 August 2026 and locked in the file itself — so **new registry entries are required only for QUR, PRY, JSS and SS**. TMH needs no registry change: the file's own belt-and-braces note that the engraved wording "holds one confirmation before the first sheet is minted" is satisfied by the Founder's Stage 4 signature on the TMH mint action. One known discrepancy is recorded here: the file's TMH comment lines ("TMH has no roster and no serial range… continues after QUR's 000074, at 000075") predate the ratified plan (TMH = seq 52; QUR = 48–51) and are a **stale code comment** — corrected in the **same reviewed commit** as the QUR/PRY/JSS/SS registry additions, not before. | The merge commit hash(es); the Founder-signed wording |
| P-09 | The **allocation renumbering of Section 3 is complete and signed**: every sequence number found printed on any physical document at Stage 1 is reserved, the mint allocation (previously 48–85 in `reissue-plan-2026.json`) is recomputed around the reserved numbers, and the recomputed allocation bears the Founder's signature. | The signed recomputed-allocation artefact |
| P-10 | For **every** action on the signed list, the **pre-written rollback artefact exists** per the rule of pairs (`05-rollback-plan.md` §1 and §3.1) and is filed with its forward artefact. No forward artefact without its pair. | The paired artefact files, cross-referenced on the signed list |
| P-11 | The **rollback drill** has been performed, once, end to end, against the non-production database only, with unmistakably fictitious data, and its signed record is filed (`05-rollback-plan.md` §5). | The signed drill record |
| P-12 | The **implementation log** (`docs/registrar-reconciliation/08-implementation-log.md`) is open, empty but for its header, before the first action (`04-sop.md` Stage 6). | The log file |

If any line above cannot be evidenced, Stage 5 does not begin. There is no partial start.

---

## 2. Action-code execution matrix

One subsection per terminal action code. For each: the **exact mechanism**, the **inputs**
(taken **verbatim** from the signed workbook row — never retyped from memory, never
"corrected" in transit), the **paired rollback artefact**, and the **per-action
verification**. Two database mechanisms exist in this plan, and each signed batch
definition names which one it uses — nothing else is permitted:

- **The register-import path**: a sealed register SQL file in
  `docs/graduation-registers/` applied to the production database by
  `.github/workflows/certificate-verification.yml`'s import steps — the workflow rebuilds
  the production import from the sealed registers (`npm run certificates:import`, i.e.
  `scripts/build-production-import.mjs`) and applies it with `psql` in one transaction,
  every insert carrying `ON CONFLICT DO NOTHING`, exactly as the original 13 records were
  imported (`docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql`). Extending the
  import generator to cover a new sealed register is itself a reviewed commit on the
  signed list.
- **A reviewed SQL file applied through the Neon console** (or the same workflow `psql`
  path): used for the update-type actions (revocation, supersedure) and the legacy-table
  insert, always inside a transaction, each statement declaring in a comment the exact
  row count it must affect — any other count rolls back uncommitted and escalates
  (`05-rollback-plan.md` §3.5).

Before **any** forward action in any batch: run the two audits in their read-only form —
the presence audit, and the acceptance workflow dispatched with **`run_import: false` and
`configure_cloudflare: false`** (Section 4 item 1) — and record their run IDs on the
forward artefact — that fresh pre-execution snapshot is the state a rollback must
restore (`05-rollback-plan.md` §3.2).

### 2.1 A1 — leave unchanged

| | |
|---|---|
| **What runs** | **Nothing.** No system is touched. After sign-off, the determination "leave the certificate entirely unchanged" is recorded and the row is closed in the register. |
| **Mechanism** | Log entry only (`04-sop.md` Stage 6 entry format). |
| **Inputs from the signed row** | `row`, `known_certificate_no`, `student_full_name`, `final_classification`, `recommended_action_code`. |
| **Rollback artefact** | None needed — reopening a closed row is a register action (`05-rollback-plan.md` §4.1). |
| **Verification** | Covered by the batch's standing audits (Section 4): the certificate must answer exactly as at the pre-batch snapshot — for the six plan-KEEP certificates that is `active`, with `intact` (v1 IBT) or `pending_signature` (v2 IDD). |

### 2.2 A2-V — execute the ratified revocation

| | |
|---|---|
| **What runs** | After sign-off and the Founder's explicit confirmation: one `UPDATE stage_certificates SET revoked_at = …, revocation_note = …` for the exact row — two fields and only two; the serial, hash and student fields are untouched (`05-rollback-plan.md` §4.4). |
| **Mechanism** | Reviewed SQL file applied through the Neon console (or the workflow `psql` path), one transaction, declared row count 1. |
| **Inputs from the signed row** | `known_certificate_no` (the full stored serial, e.g. `SHRS-CERT-IBT-2026-000037-22C49`) and the row's database `id`; the `revocation_note` text is the ratified reason **verbatim from the `actions` entry in `reissue-plan-2026.json`** (e.g. "not on the Registrar's IDD roll"). |
| **Rollback artefact** | The paired `UPDATE … SET revoked_at = NULL, revocation_note = NULL` of `05-rollback-plan.md` §4.4, pre-written with the exact `id` and serial. |
| **Verification** | Direct read-only `GET /api/certificates/verify?ref=<the exact serial>` answers `status: revoked` with the ratified note; the acceptance run shows every other certificate unchanged; presence count unchanged (revocation is annotation, not deletion). |

### 2.3 A2-R — execute the ratified reissue

| | |
|---|---|
| **What runs** | After sign-off and the Founder's explicit confirmation, two linked changes in one batch (`05-rollback-plan.md` §4.5): (1) the **replacement certificate is minted** as a C1-class mint through the Section 5 pipeline, under key v3, under its **recomputed** allocation number (Section 3); (2) the **old row is marked superseded** — `revoked_at` set and `revocation_note` naming the replacement serial, so the two are cross-referenced. |
| **Mechanism** | The mint: Section 5 pipeline, then the register-import path. The supersedure: reviewed SQL, one transaction, declared row count 1. |
| **Inputs from the signed row** | Old certificate: `known_certificate_no` verbatim. Replacement: the corrected student name **verbatim from the `toMint`/`actions` entries of `reissue-plan-2026.json`** (e.g. `Aisha Anofi` → `Aisha Omoshalewa Anofi`), the carried identity number, and the recomputed sequence number from the signed allocation. |
| **Rollback artefact** | The two-statement pair of `05-rollback-plan.md` §4.5: `DELETE` of the exact new row, `UPDATE … NULL` of the exact old row, one transaction, row count 1 each. |
| **Verification** | The replacement serial answers `active` / `intact` under v3 on every printed identifier; the old serial answers `revoked` with the cross-reference; presence count has risen by exactly the batch's mint count. |

### 2.4 A2-V and A2-R common rule

Neither runs on the strength of the ratified plan alone. The plan of 8 August 2026 is
ratified but **unexecuted**; each of its KEEP/REISSUE/REVOKE entries acts only as the
classification input to the decision tree, and only the Founder's Stage 4 signature on
the specific workbook row authorises execution here.

### 2.5 B1a — register the printed document as-is under key v1

| | |
|---|---|
| **What runs** | After sign-off, and **only where the row carries a documented F1 MATCH** (the printed suffix cryptographically reproduced under v1 — `04-sop.md` Stage 2): one `INSERT INTO stage_certificates` registering the document **exactly as printed**, with `hash_key_version = 1` and the F1-recomputed `content_hash`, followed by the sequence-advancement statements the sealed registers document (`05-rollback-plan.md` §4.2). |
| **Mechanism** | A sealed-register-style SQL file in `docs/graduation-registers/`, following the pattern of `2026-08-08-IBT-000035.sql`, applied via the register-import path. |
| **Inputs from the signed row** | `printed_certificate_no_exact` (character for character), `student_full_name` **as printed**, `student_identity_no` as printed (empty if the paper carries none), `programme_code`, `printed_issue_date`, and the F1 worksheet's recomputed hash. Nothing is normalised, corrected, or reconciled — the paper governs. One matter of storage form, not substance: the stored **`serial_no` column is inserted in the full stored format `SHRS-CERT-<PROG>-<YYYY>-<seq6>-<SUFFIX5>`**, reconstructed on the F1 worksheet (the year taken from the ISO-converted printed issue date) — "exactly as printed" governs the **display form and the hashed fields**, not the stored `serial_no` column: a printed-form `serial_no` (which omits the year segment) would fail `parseStageCertificateSerial`, and the public verifier would answer `integrity_check_failed` for the genuine registered document. |
| **Rollback artefact** | The pre-written pair of `05-rollback-plan.md` §4.2: **both** the one-row `DELETE … WHERE id = <exact id> AND serial_no = '<exact serial>'` **and** the `git revert` of the sealed-register and import-generator commits, executed together — without the revert, `certificate-verification.yml`'s schedule/push import path would silently re-insert the deleted row on its next run. Sequence numbers consumed are spent and not reused. |
| **Verification** | Direct read-only `GET /api/certificates/verify?ref=<the exact printed number>` answers found, `active`, **`intact`** — the suffix now verifies end to end under `DOCUMENT_HASH_SECRET_V1`; the presence audit finds the new sequence number. |

**Mandatory pre-execution collision check (invariant I1, `03-decision-tree.md` §7).**
Before any B1a insert runs, its target number is checked — exactly as for C1 and B2b —
against **every printed number recorded anywhere in the workbook** and against the **live
database** (the presence audit). A printed number whose sequence already holds a live
record under a **different** tail is the pre-rotation-draft case of
`docs/certificate-key-deployment.md` §5 (proofs and drafts printed before 2026-08-06
carry the old v1-era tails for sequences 000042–000047: `A775E`, `B1092`, `11615`,
`09B22`, `20726`, `6AFD4`): such a document is **never registered** — the finding is
recorded, escalated under the I2/I4 pattern, and the paper handled per that document's
destroy-rather-than-file rule.

### 2.6 B2a — record the printed number in the legacy certificates register

| | |
|---|---|
| **What runs** | After sign-off, and only under a written **P1** selection: one `INSERT` into the legacy `certificates` table — the printed number recorded **verbatim** as `reference_no`, with the student's name, credential type, and issue date (`05-rollback-plan.md` §4.3). The public verifier then resolves it via its deliberate fall-through (`functions/api/certificates/verify.js`: a well-formed stage number matching no stage record is looked up in `certificates` by `reference_no`). The record carries **no cryptographic hash** — stated honestly in `06-evidence-pack.md` — and the paper is unchanged. |
| **Mechanism** | Reviewed SQL file applied through the Neon console (or the workflow `psql` path), one transaction, declared row count 1 per certificate. |
| **Inputs from the signed row** | `printed_certificate_no_exact` verbatim, `student_full_name` as printed, `programme_code` (as the credential type wording the signed list specifies), `printed_issue_date`. |
| **Rollback artefact** | The paired `DELETE FROM certificates WHERE id = <exact id> AND reference_no = '<exact printed number>'` of `05-rollback-plan.md` §4.3. |
| **Verification** | Direct read-only `GET /api/certificates/verify?ref=<the exact printed number>` now answers found and active. **The presence audit's sequence sweep does not query free-form legacy references**, so this direct lookup is mandatory for every B2a certificate and its response reference is logged. |

### 2.7 B2b — formal reissue under a new fully-signed number

| | |
|---|---|
| **What runs** | After sign-off, and only under a written **P2** selection: a new, fully v3-signed certificate is minted through the Section 5 pipeline under a **new** number from the recomputed allocation; the printed document is **formally superseded** — recalled or stamped per the Registrar's procedure — and both are cross-referenced in the register. Where the superseded printed number was also recorded anywhere in the database, the supersedure is annotated by reviewed SQL as for A2-R. |
| **Mechanism** | The mint: Section 5 pipeline, then the register-import path. Any supersedure annotation: reviewed SQL, one transaction, declared row counts. |
| **Inputs from the signed row** | `printed_certificate_no_exact` (the superseded number, verbatim), `student_full_name`, `student_identity_no`, `programme_code`, and the new sequence number from the signed recomputed allocation. |
| **Rollback artefact** | The two-part pattern of `05-rollback-plan.md` §4.5 (delete the exact new row; clear the exact supersedure annotation), plus the signed record of the physical document's return if it was recalled. |
| **Verification** | The new serial answers `active` / `intact` under v3 on every printed identifier; the superseded number answers exactly as the signed list specifies; the cross-reference appears in the register. |

### 2.8 C0 — no award due

| | |
|---|---|
| **What runs** | **Nothing.** After sign-off, the determination "no award due" is recorded, the Registrar signs it, and the row is closed. Nothing is minted and nothing is registered. |
| **Mechanism** | Log entry only, as A1. |
| **Inputs from the signed row** | `row`, `student_full_name`, `programme_code`, `final_classification`. |
| **Rollback artefact** | None needed — reopening is a register action (`05-rollback-plan.md` §4.1). |
| **Verification** | The batch's standing audits confirm the affected sequence numbers still answer "no record". |

### 2.9 C1 — mint fresh under key v3

| | |
|---|---|
| **What runs** | After **every** gate (P-04 to P-09 of Section 1, and the Founder's signature on the row): a fresh certificate is minted through the Section 5 pipeline — real serial from the atomic sequence, HMAC signed under v3, sealed register produced, imported via the register-import path, and only then printed from the generated artwork. |
| **Mechanism** | Section 5, in full, per signed batch definition; import via the register-import path. |
| **Inputs from the signed row** | `student_full_name`, `student_identity_no`, `programme_code`, `session`, and the sequence number assigned by the **signed recomputed allocation** (Section 3) — never the provisional `plan_seq` printed in the workbook's locked columns. |
| **Rollback artefact** | The pre-written pair of `05-rollback-plan.md` §4.2, drafted with the forward artefact: **both** the one-row `DELETE … WHERE id = <exact id> AND serial_no = '<exact serial>'` **and** the `git revert` of the sealed-register and import-generator commits, executed together — without the revert, `certificate-verification.yml`'s schedule/push import path would silently re-insert the deleted row on its next run. Rollback is available only until the certificate is printed or announced (the publication boundary, `05-rollback-plan.md` §2). |
| **Verification** | The new serial answers `active` / `intact` on every printed identifier and the QR payload; the presence audit finds it; the acceptance run — whose register set now includes the new sealed register — passes in full. |

---

## 3. The allocation renumbering rule

This section implements invariant **I1** of `03-decision-tree.md` §7 for the known
collision the charter records: the plan allocates sequence **48** to a QUR certificate
(Aisha Omoshalewa Anofi), while a physical certificate printed **`SHRS-CERT-JSS-000048`**
is Founder-reported, with a screenshot, in a student's hands (15 August 2026). A number
printed on paper in a child's hand outranks a number in a JSON file.

1. **Reservation.** After Stage 1, every sequence number appearing on **any** physical
   document recorded anywhere in the workbook (`printed_certificate_no_exact`, QR
   payloads, remarks) is **reserved for that document**, permanently, whatever else any
   plan says about it. The reserved list is compiled from the signed workbook — at the
   evidence baseline only number 48 is known reserved beyond the issued 35–47, but the
   Registrar's observations govern, and the list is whatever Stage 1 actually found.
2. **Recomputation.** The mint allocation — previously sequence numbers **48–85** in
   `reissue-plan-2026.json`'s `toMint` list — is recomputed to use **only unreserved
   numbers**, preserving the plan's ordering exactly: the first entry in plan order takes
   the first unreserved number at or after 48, the second the next, and so on. No entry
   is reordered, added, or dropped by renumbering; only the numbers move.
3. **The recomputed allocation is itself a signed artefact.** It is prepared at the joint
   Technical Review, checked against (a) every printed number in the workbook and (b) the
   live database (the presence audit), and Founder-signed at Stage 4. No C1 mint or B2b
   reissue runs against an unsigned recomputation. Invariant I1's mandatory pre-execution
   collision check covers **C1, B2b and B1a** target numbers alike, against every printed
   number in the workbook **and** the live database. A printed number whose sequence
   already holds a live record under a **different** tail is the pre-rotation-draft case
   of `docs/certificate-key-deployment.md` §5 (old v1-era tails for 000042–000047:
   `A775E`, `B1092`, `11615`, `09B22`, `20726`, `6AFD4`) — it is never registered and
   never assigned: it is recorded, escalated under the I2/I4 pattern, and the paper
   handled per that document's destroy-rather-than-file rule (Section 2.5).
4. **The old allocation is superseded, in the open.** The allocations 48–85 in
   `reissue-plan-2026.json` are provisional and, on the signing of the recomputed
   allocation, **superseded by it**. During implementation — as an action on the signed
   list, never silently — the file receives a **pointer note**: a documented plan update,
   committed to the repository, stating that the `toMint` sequence numbers are superseded
   by the signed recomputed allocation and naming that artefact. The original file
   content is not rewritten to pretend it always said something else; the pointer and the
   git history preserve both states.
5. **Numbers spent by rolled-back actions stay spent** (`05-rollback-plan.md` §4.2
   step 4). No exception, no case-by-case discretion. A gap in the numbering costs
   nothing; a reused number risks the exact two-documents-one-number ambiguity the
   suffix system exists to prevent.

---

## 4. Batch order and verification cadence

The signed actions are executed in the following batches, in this order, and in no other.
A batch does not open until the previous batch's verification is green and countersigned.

**One required corrective action precedes or accompanies batch (a).** At the evidence
baseline, `verification_log`'s outcome CHECK constraint (`sql/schema.sql`: `'valid'`,
`'revoked'`, `'hash_mismatch'`, `'not_found'`, `'ambiguous'`, `'multiple'`) does **not**
include the `key_unavailable` outcome the public endpoint reports for every v2-signed
certificate lookup — so those lookups currently leave **no log row at all**, and the
publication-boundary test of `05-rollback-plan.md` §2.2 depends on that log. **Extending
the CHECK constraint to include `key_unavailable`** is a required corrective action: a
reviewed schema commit on the Founder-signed approved-actions list, executed only through
the sign-off chain, at Stage 5, **before or alongside the first batch**. It is **not**
performed during the freeze.

| Batch | Contents | Why this position |
|---|---|---|
| **(a)** | **A1 and C0 rows** — nothing to run; log entries only | Closes the no-change rows first, so every later audit's expected picture is fully stated |
| **(b)** | **A2-V revocations** | Annotations to existing rows; no new numbers; simplest to verify and to roll back |
| **(c)** | **A2-R and B2b reissues** — each replacement mint plus its paired supersedure | Mints depend on the recomputed allocation; supersedures cross-reference the mints |
| **(d)** | **B1a registrations** — printed documents registered as-is under v1 | Inserts under numbers already fixed by the paper itself |
| **(e)** | **B2a legacy registrations** | Legacy-table inserts; verified by direct lookup, outside the sequence sweep |
| **(f)** | **C1 mints, last**, in category order **QUR, TMH, IBT, IDD, PRY, JSS, SS** | Fresh mints run only when every prior batch has settled the numbering landscape they depend on |

**After every batch, without exception:**

1. Re-run the **acceptance** workflow (`.github/workflows/certificate-verification.yml`)
   against production, dispatched with **`run_import: false` and `configure_cloudflare:
   false`, both set explicitly**. The workflow is read-only **only** with both inputs
   false: **both default to `true`**, and its Monday 06:00 UTC schedule and its push
   triggers run the import/configure steps unconditionally when the required secrets are
   present (at the baseline the stored GitHub secrets include neither `DATABASE_URL` nor
   `DOCUMENT_HASH_SECRET`, so those steps currently skip or fail closed on scheduled
   runs — this plan must not rely on that remaining true). An import is a forward action
   a signed batch definition orders by name, never a side effect of checking one.
2. Re-run the **presence audit** (`.github/workflows/certificate-presence-audit.yml`)
   against production, from sequence 1 to at least 150 — and always to at least 65
   numbers beyond the highest allocated number, matching the baseline method (the
   workflow's default upper bound is 120 and must be raised accordingly on dispatch).
3. **Both must be green before the next batch opens**, on the SOP Stage 5 step 5 test:
   every certificate acted on answers exactly as its signed action code specifies; every
   certificate not on the signed list answers exactly as at the 15 August 2026 baseline
   (presence run `31862779664`, acceptance run `31857567994`) as adjusted only by earlier
   logged batches; every sequence number found is either present at that baseline or
   created by a signed, logged action. B2a references, invisible to the sequence sweep,
   are each checked by direct lookup (Section 2.6).
4. **Both run IDs are recorded in the implementation log against the batch**, alongside
   the pre-batch snapshot run IDs of `05-rollback-plan.md` §3.2.

Any other result — an unexpected state, a number already occupied, an error, anything —
halts the batch: the staged rollback is invoked for any **partially applied** action —
pre-authorised by the Founder's Stage 4 signature on that action's paired
forward/rollback artefact; rolling back an action that had already **completed** requires
a fresh written instruction from the Founder (`05-rollback-plan.md` §1) — the deviation
is logged, and the matter returns through the chain to Stage 2 or Stage 4 as its nature
requires (`04-sop.md` Stage 5 step 4). Post-rollback verification runs are dispatched
with `run_import: false` and `configure_cloudflare: false`, and while any rollback is in
effect the workflow's schedule/push import path is gated or disabled by a reviewed
commit on the Founder's instruction (`05-rollback-plan.md` §3.3). Execution does not
resume on anyone's initiative at the keyboard.

---

## 5. New-certificate production for C1 and B2b — record first, paper second

Every new certificate this plan mints — the C1 mints and the B2b/A2-R replacements — is
produced through the **real issuance pipeline**, and in this order only:

1. **Mint.** The batch is issued through the `scripts/issue-certificate-batch.mjs`
   pattern, extended per the signed batch definition: real serial from the atomic
   sequence, canonical hash fields per `certificateHashFields`
   (`functions/_lib/certificate-serial.js`), HMAC-SHA256 signed under **key v3**
   (`DOCUMENT_HASH_SECRET` = v3, `DOCUMENT_HASH_KEY_VERSION` = 3 supplied to the run),
   suffix and verification code derived from that hash.
2. **Seal.** The run produces **sealed registers in `docs/graduation-registers/`**
   exactly like the 2026-08-08 pair (`2026-08-08-IBT-000035.{json,md,sql}` and
   `2026-08-08-IDD-000042.{json,md,sql}`): the JSON record, the human-readable register,
   and the SQL whose inserts are the batch, byte for byte. The registers are committed;
   the commit hash goes in the log.
3. **Import.** The records enter the production database via the register-import path
   (Section 2's first mechanism), and the batch's verification (Section 4) runs green.
4. **Print.** Only then is any paper produced — **printed from the generated artwork of
   the same run**, so the paper carries exactly the serial, suffix, QR payload and
   verification code the database already verifies. **Never printed first and recorded
   later** — that inversion is precisely the failure this whole reconciliation exists to
   repair.

**Standing guards, already in the code, that this plan relies on and must never be
bypassed:** the issuer **refuses to run when `DOCUMENT_HASH_SECRET` is unset** (it no
longer falls back to the development literal — `scripts/issue-certificate-batch.mjs`),
`document-hash.js` **refuses to sign under a retired key version**, and the issuer
**refuses to re-run sealed batches** (`sealedAtKeyVersion` — re-running would recompute
suffixes and change numbers engraved on documents already in circulation). A run stopped
by any of these guards is a halt under Section 4, not an obstacle to engineer around.

---

## 6. Completion — when implementation is done, and when the freeze lifts

Implementation is complete when, and only when, **all** of the following hold:

1. **Every workbook row's signed action is executed-and-verified, or formally deferred
   by the Founder in writing.** Frozen (unsigned) rows and formally aborted actions are
   recorded as such in the implementation log; none is quietly dropped.
2. **The final acceptance run covers every live certificate** — not only the original 13.
   The acceptance workflow works from the sealed registers, so its register set **grows
   with each sealed register added** in Section 5; the final run must exercise every
   printed identifier and QR payload of every certificate the reconciliation has left
   live, and be green. Both final run IDs (acceptance and presence) are recorded in the
   log.
3. **The Stage 6 closing log entry is signed.** The Auditor's closing entry confirms, for
   every certificate on the workbook, that the **five sources agree** — the Registrar's
   records; the printed certificate (or the confirmed absence of one); the verification
   database; the cryptographic records; and the public verification service's live answer
   — and it is signed by the **Registrar and the Founder** (`04-sop.md` Stage 6). Any
   certificate for which the five sources do not yet agree is listed, with the reason,
   and for that certificate the freeze does not lift.
4. **Only then does the freeze lift.** Until both closing signatures exist, every
   prohibition of the freeze remains in force, in full, however much of this plan has
   been executed.

---

*End of document 7. This plan executes the signed approved-actions list and nothing
else. Its authority begins where Stage 4 of `04-sop.md` ends, and it stops — returning
to the SOP, not improvising — the moment reality and the signed list disagree.*
