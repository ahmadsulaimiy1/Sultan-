# 05 — The Rollback Plan

**SHRS Registrar Reconciliation Pack — document 5 of 7.**
**Authority:** the Founder's Registrar Reconciliation Preparation Directive, 15 August 2026.
**Status:** PREPARED — AWAITING THE REGISTRAR. No lifecycle action has been taken.

> **The freeze is in force.** Nothing in this document performs, or authorises anyone to
> perform, any action. No key is generated, no certificate is minted, no database record
> is created or modified, and no REISSUE or REVOKE is executed until the full sign-off
> chain of the SOP (`04-sop.md`) — **Registrar → Technical → Cryptographic → Founder** —
> has been completed for that action. This document describes how each *authorised*
> action, once executed during Stage 5 (Implementation), is reversed if an error is
> discovered **before publication**. While the freeze holds, nothing has been executed,
> so there is nothing to roll back.

---

## 1. Standing and purpose

Every action the implementation plan (`07-implementation-plan.md`) may eventually run is
one of the pack's terminal action codes: **A1, A2-R, A2-V, B1a, B2a, B2b, C0, C1** (see
`03-decision-tree.md` §6). This document specifies, for each of them:

1. what the forward action changes;
2. the **pre-written rollback artefact** — prepared at the same time as the forward
   artefact, before anything is executed;
3. the exact reversal steps;
4. how it is verified that the rollback restored the prior state; and
5. the log entries required.

A rollback is itself an institutional action. It is executed only within the
pre-publication window defined in Section 2, only on the written instruction of the
Founder (or the person `04-sop.md` names for this purpose), by the Technical reviewer,
with the Registrar witnessing, and it is logged exactly as the forward action was.

**The rule of pairs.** No forward artefact is signed off unless its rollback artefact is
attached to the same sign-off. The two are drafted together, reviewed together, and
approved together — so that at the moment an error is discovered, the reversal is
already written, already reviewed, and requires no improvisation under pressure.

---

## 2. The publication boundary

### 2.1 Definition

An executed action is **published** the moment ANY of the following has happened:

| # | Limb | Plain meaning |
|---|---|---|
| P-1 | **Announced** | The action's result has been communicated to a student or their family, by any channel — in person, by phone, by letter, by message. |
| P-2 | **Printed** | A physical document reflecting the action has been printed (whether or not yet handed over). |
| P-3 | **Relied on** | A third party — a parent, an employer, another school, a scholarship board, anyone outside the implementation team — has looked the affected number up on the public verification service and could have relied on the answer. |

Before any of these three: the action is **unpublished**, and full technical rollback
under this document is permitted. After any one of them: **rollback is FORBIDDEN**, and
the correction procedure of Section 2.3 applies instead. There is no discretion in this
test — it is a question of fact, answered from the record.

### 2.2 The operational test for limb P-3

Every public lookup is recorded in the `verification_log` table (the endpoint writes a
row for each verification — `functions/api/certificates/verify.js`, `logVerification`).
The test is therefore mechanical:

1. During Stage 5, every check the implementation team itself performs against the live
   service is logged in the implementation log **at the time it is made** (timestamp,
   reference queried, who queried).
2. Before any rollback is executed, the Technical reviewer reads `verification_log`
   (read-only) for the affected reference number(s), from the moment of execution to
   the present.
3. Every `verification_log` row for that reference must be matched to a recorded
   implementation-team check. **Any lookup that cannot be positively matched is treated
   as third-party reliance, and the action is treated as published.** When in doubt, the
   action is published — the boundary fails closed.

### 2.3 After the boundary: the correction procedure, never rollback

Once published, an erroneous action is corrected **forward**, in the open:

1. **Nothing is silently deleted or silently edited.** The erroneous record stays.
2. A **documented correcting entry** is made through the same sign-off chain as any
   other action: for an erroneous certificate record, that is the revoke-and-reissue
   pattern the schema itself mandates (`sql/schema.sql`, `stage_certificates` header:
   *"corrections are revoke + reissue, preserving the full audit trail"*) — the
   erroneous record is revoked with a `revocation_note` stating what was wrong and what
   replaces it, and any replacement is issued as a new, correctly gated action.
3. The error, its discovery, and the correcting entry are all logged (Section 3.4), and
   every affected family is told plainly what happened and what the corrected position
   is. The wording of that communication: [TO BE CONFIRMED BY REGISTRAR].

---

## 3. Rules common to every rollback

### 3.1 The paired-artefact rule

For every forward action that touches a database, the forward SQL and the rollback SQL
are written as a **pair, in the same file set, before execution**, and both are attached
to the sign-off. The rollback artefact must name the exact row(s) by primary key and by
the unique reference (serial or reference number) so it can never delete or alter the
wrong row.

### 3.2 Pinning the prior state

Immediately **before** any forward action is executed, the two read-only audits
(Section 3.3) are run and their run IDs recorded on the forward artefact. That fresh
pre-execution snapshot — not the 15 August 2026 baseline alone — is the "prior state" a
rollback must restore, because earlier authorised actions may already have changed the
counts legitimately.

### 3.3 Verifying a rollback: re-run the two read-only audits

Both instruments already exist in this repository and touch nothing:

| Instrument | What it is | Baseline (2026-08-15) |
|---|---|---|
| **Presence audit** | `.github/workflows/certificate-presence-audit.yml`, running `scripts/audit-certificate-presence.mjs`: read-only GET queries of sequence numbers 1–150 against `https://shroyalschools.com` | Run `31862779664`, 03:48–03:50 UTC, commit `afb80e87`: exactly 13 records (000035–000047), 137 not found, 0 errors |
| **Live acceptance** | `.github/workflows/certificate-verification.yml`: read-only verification of every printed identifier and QR payload of the issued certificates | Run `31857567994`, 01:50 UTC: all 13 verify, status active (7 IBT `intact`, 6 IDD `pending_signature`) |

After every rollback, both are re-run and compared with the pre-execution snapshot of
Section 3.2. Where the affected reference is not one the presence audit's sequence sweep
would see (Section 5.3), a direct read-only lookup of the exact reference is added. A
rollback is complete only when the post-rollback runs match the pre-execution snapshot
exactly; any difference is escalated to the Founder before anything else is done.

### 3.4 The log entry every rollback requires

Rollbacks are logged in the same implementation log as forward actions
(`07-implementation-plan.md`), with at least:

| Field | Content |
|---|---|
| Date/time (UTC) | When the rollback was executed |
| Action rolled back | The action code and the workbook row number(s) |
| Why | The error discovered, in plain words |
| Publication check | The Section 2 test result, including the `verification_log` review of Section 2.2 |
| Authorisation | Reference to the Founder's written rollback instruction |
| Forward artefact | File/reference of the forward artefact executed |
| Rollback artefact | File/reference of the pre-written rollback artefact executed |
| Rows affected | The exact count reported by the database (must match the artefact's expectation) |
| Verification | Run IDs of the post-rollback presence audit and acceptance runs, and the comparison result |
| Executed by / witnessed by | The Technical reviewer; the Registrar |

### 3.5 Transactions and the affected-row check

Every rollback SQL statement is run inside a transaction. Each statement declares, in a
comment, the exact number of rows it must affect (almost always **1**). If the database
reports any other count, the transaction is **rolled back un-committed** and the matter
escalated to the Founder — a wrong count means the database is not in the state the
artefact assumed, and nothing more is touched until that is understood.

---

## 4. Rollback by action type

### 4.1 A1 and C0 — closures on paper (reopening a closed row)

**What the forward action changes.** Nothing in any computer system. A1 closes a
workbook row "leave unchanged"; C0 closes a row "no award due". Both are register
entries and signatures only.

**Pre-written rollback artefact.** None is needed beyond the workbook itself — the
reversal is a register action.

**Reversal steps.**

1. The Founder authorises the reopening in writing, naming the row and the reason.
2. The row's closure is struck through in the register — never erased — with a dated,
   signed note: *"Reopened by authorisation of the Founder, [date], because […]."*
3. The row re-enters the decision tree (`03-decision-tree.md`) from Q1, with whatever
   corrected evidence prompted the reopening.

**Verification.** Not applicable — no system state changed in either direction. The two
audits are not re-run for a paper-only reversal.

**Log entries.** The reopening note itself, plus a Section 3.4 entry with "Rows
affected: none — register action only".

### 4.2 B1a and C1 — inserts into `stage_certificates`

**What the forward action changes.** One new row per certificate in the
`stage_certificates` table — for **B1a**, the printed document registered exactly as
printed with `hash_key_version = 1` and the recomputed `content_hash` (only after a
documented F1 MATCH); for **C1**, a fresh v3-signed certificate (only after every C1
gate in `03-decision-tree.md` §6). The forward artefact follows the pattern of the
existing sealed registers (e.g.
`docs/graduation-registers/2026-08-08-IDD-000042.sql`): explicit `INSERT INTO
stage_certificates (id, serial_no, …) VALUES (…)`, followed by the sequence
advancement statements that file documents.

**Pre-written rollback artefact.** Written in the same file set as the forward SQL,
before execution, in this form (placeholders filled with the approved values at drafting
time — never at execution time):

```sql
-- ROLLBACK for <forward artefact reference>.
-- Must affect EXACTLY 1 row; abort and escalate on any other count.
DELETE FROM stage_certificates
 WHERE id = <the exact id inserted>
   AND serial_no = '<the exact serial inserted>';
```

The double condition (`id` **and** `serial_no`) is deliberate: the statement can only
ever remove the precise row the forward artefact created, and affects zero rows — a
loud failure — if the database does not contain exactly what the artefact expects.

**Reversal steps.**

1. Confirm the Section 2 publication test: not announced, not printed (for C1, the new
   certificate must not yet have been printed; for B1a the *paper* already exists, but
   the registration result must not have been announced or relied on), and the
   `verification_log` review of Section 2.2 is clean.
2. Founder's written rollback instruction obtained (Section 1).
3. Execute the rollback artefact inside a transaction; confirm exactly 1 row affected;
   commit.
4. **Sequence numbers are not wound back.** If the forward artefact advanced
   `stage_certificate_serial_seq` (or the `id` sequence, per the `setval` statements the
   register files document), those advancements stand. A sequence number consumed by an
   erroneous insert is recorded as **spent and not reused**; any re-execution after
   correction takes a fresh number through the normal gates. This is the safe side of
   invariant I1 (`03-decision-tree.md` §7): a gap in the numbering costs nothing, while
   re-using a number that may meanwhile exist on any printed or shared artefact risks
   the exact two-documents-one-number ambiguity the suffix system exists to prevent.
   Exception: [TO BE CONFIRMED BY REGISTRAR] — the joint review may resolve, case by
   case and in writing, that a spent number is provably unprinted and may be reused;
   the default is that it is not.
5. Rollback restores **"no record"**: the state for that sequence number returns to
   exactly what the presence audit reported for it before execution — `found: false`.

**Verification.** Re-run both audits (Section 3.3) and compare with the pre-execution
snapshot: the presence count returns to its prior value, the affected sequence number
reports not found, and the acceptance run still passes unchanged for every certificate
that existed before. Additionally, a direct read-only
`GET /api/certificates/verify?ref=<the exact serial>` must return `found: false`.

**Log entries.** Section 3.4 entry, plus a note on the affected workbook row that the
action was executed and rolled back, with both artefact references — the row is then
re-opened for corrected classification if required (Section 4.1 pattern).

### 4.3 B2a — inserts into the legacy `certificates` register

**What the forward action changes.** One new row in the legacy `certificates` table
(the table `functions/api/certificates/verify.js` deliberately falls through to when a
well-formed stage number matches no stage record): the printed number recorded
**verbatim** as `reference_no`, with the student's name, credential type and issue date.
The row carries no cryptographic hash — stated honestly in `06-evidence-pack.md` — and
the paper is unchanged.

**Pre-written rollback artefact.** Same paired-SQL pattern as Section 4.2:

```sql
-- ROLLBACK for <forward artefact reference>.
-- Must affect EXACTLY 1 row; abort and escalate on any other count.
DELETE FROM certificates
 WHERE id = <the exact id inserted>
   AND reference_no = '<the exact printed number recorded>';
```

**Reversal steps.**

1. Section 2 publication test, including the `verification_log` review — note that for
   B2a the *printed document pre-exists and is already with the family*; what must not
   yet have happened is the **announcement of the registration** or any third-party
   lookup of the now-resolving number.
2. Founder's written rollback instruction.
3. Execute inside a transaction; confirm exactly 1 row; commit.
4. Rollback restores "no record": the printed number returns to resolving nothing,
   exactly as before execution. The paper in the family's hands is untouched in both
   directions — B2a never alters it.

**Verification.** Re-run both audits and compare with the pre-execution snapshot. The
presence audit's sequence sweep does not query free-form legacy reference numbers, so
add the direct read-only check: `GET /api/certificates/verify?ref=<the exact printed
number>` must return `found: false` again (with `referenceRecognised` reporting
whatever it reported before execution).

**Log entries.** Section 3.4 entry; workbook row annotated as in Section 4.2.

### 4.4 A2-V — executing a ratified revocation

**What the forward action changes.** Two fields — and only two — on an existing
`stage_certificates` row: `revoked_at` is set, and `revocation_note` is set to the
ratified reason from `reissue-plan-2026.json`. Nothing else on the row changes; the
serial, hash and student fields are untouched. The public verifier then answers
`status: revoked` for that certificate.

**Pre-written rollback artefact.**

```sql
-- ROLLBACK for <forward artefact reference>.
-- Must affect EXACTLY 1 row; abort and escalate on any other count.
UPDATE stage_certificates
   SET revoked_at = NULL,
       revocation_note = NULL
 WHERE id = <the exact id>
   AND serial_no = '<the exact serial>'
   AND revoked_at IS NOT NULL;
```

**Reversal steps.**

1. Section 2 publication test — in particular, the revocation must not have been
   announced to the family, and no third party may have seen the `revoked` answer
   (Section 2.2 review of `verification_log` for this serial and every identifier that
   resolves to it).
2. Founder's written rollback instruction.
3. Execute inside a transaction; confirm exactly 1 row; commit.
4. **The row itself is never deleted** — not by the forward action, and not by the
   rollback. Revocation in this system is annotation, not destruction (the schema's
   revoke-never-delete pattern), and its reversal is the clearing of that annotation,
   nothing more.

**Verification.** Re-run both audits. The acceptance run must show the certificate
`status: active` again, with the same integrity reading it had before (`intact` for a
v1 IBT certificate; `pending_signature` for a v2 IDD certificate — the honest
key-unavailable state, not a fault). The presence count is unchanged in both directions
by this action type.

**Log entries.** Section 3.4 entry. Note that the *institutional* record of the
attempted-and-reversed revocation is preserved by the log itself — the database row
returns to its prior state, but the pack's audit trail does not pretend the episode
never happened (Section 4.8).

### 4.5 A2-R and B2b — reissue with supersedure

**What the forward action changes.** Two linked changes, executed together:

1. a **new** `stage_certificates` row is inserted for the replacement certificate
   (itself gated as a C1-class mint, with all of that terminal's gates); and
2. the **old** row is marked superseded. In this system that marking is the schema's
   revoke-and-reissue pattern: `revoked_at` set, and `revocation_note` recording that
   the certificate is superseded by the replacement, naming the replacement serial so
   the two are cross-referenced.

For B2b there is additionally the physical step: the printed document is recalled or
stamped per the Registrar's procedure.

**Pre-written rollback artefact.** A pair of statements, prepared with the forward
artefact, executed in this order inside one transaction:

```sql
-- ROLLBACK for <forward artefact reference>, statement 1 of 2.
-- Must affect EXACTLY 1 row.
DELETE FROM stage_certificates
 WHERE id = <the exact id of the NEW replacement row>
   AND serial_no = '<the exact replacement serial>';

-- ROLLBACK for <forward artefact reference>, statement 2 of 2.
-- Must affect EXACTLY 1 row.
UPDATE stage_certificates
   SET revoked_at = NULL,
       revocation_note = NULL
 WHERE id = <the exact id of the OLD row>
   AND serial_no = '<the exact old serial>'
   AND revoked_at IS NOT NULL;
```

**Reversal steps.**

1. Section 2 publication test — neither the supersedure nor the replacement may have
   been announced; the replacement must not have been printed; the `verification_log`
   review must be clean for **both** serials.
2. Founder's written rollback instruction.
3. Execute both statements in one transaction; confirm exactly 1 row each; commit.
4. The replacement's sequence number is treated as spent, per Section 4.2 step 4.
5. **The physical recall is reversed by returning the document**: if the old printed
   certificate was recalled from the family under B2b, it is handed back, unaltered, and
   the return is recorded and signed for in the register. If it was already stamped as
   superseded before the error was found, the stamp cannot be un-inked — that document
   has crossed limb P-2 of the publication boundary, rollback is forbidden, and the
   Section 2.3 correction procedure applies instead.

**Verification.** Re-run both audits and compare with the pre-execution snapshot: the
presence count returns to its prior value; the replacement serial reports not found; the
old serial reports `status: active` with its prior integrity reading; every other
certificate is unchanged.

**Log entries.** Section 3.4 entry covering both statements and, for B2b, the signed
record of the document's return.

### 4.6 The v3 key rotation — reversible only while it has signed nothing

**What the forward action changes.** After the v3 custody decision, generation ceremony
and full sign-off chain (none of which has happened — **key v3 does not exist**), the
rotation per `docs/certificate-key-deployment.md` §4 sets the Cloudflare environment:
`DOCUMENT_HASH_SECRET` becomes the v3 key and `DOCUMENT_HASH_KEY_VERSION` becomes `3`,
in Production and Preview. No database row changes; no existing certificate's hash,
serial or verification outcome changes (proven structurally in the audit,
`docs/shrs-certificate-cryptographic-integrity-audit-2026-08-15.md` §5).

**THE ASYMMETRY — READ THIS TWICE.**

> **Before the first row is signed under v3, the rotation is fully reversible.
> After the first v3-signed row exists, the key is NEVER rolled back — not once,
> not ever.** A signed row's engraved suffix and stored hash derive from that key
> permanently; withdrawing the key would strand its certificates exactly as the loss
> of key v2 stranded the six I'dādiyyah certificates in `pending_signature`. From the
> first signature onward the only lawful path is **forward retirement** per
> `docs/certificate-key-deployment.md` §4: when v4 is someday needed, v3 moves to
> `DOCUMENT_HASH_SECRET_V3`, is kept **forever**, and is added to `RETIRED_KEYS` in
> `functions/_lib/document-hash.js` so it may verify but never sign again.

**Pre-written rollback artefact.** A one-page instruction, prepared with the rotation
artefact, recording: the prior value of `DOCUMENT_HASH_KEY_VERSION` (as of the 15 August
2026 baseline that value is `2` — audit §3 found no bump beyond 2 in the current
Cloudflare configuration); the environments touched; and the custody locations of the
unused v3 key copies.

**Reversal steps (permitted ONLY while zero rows carry `hash_key_version = 3`).**

1. Confirm, by read-only query, that nothing has been signed under v3:
   `SELECT COUNT(*) FROM stage_certificates WHERE hash_key_version = 3;` and
   `SELECT COUNT(*) FROM graduation_documents WHERE hash_key_version = 3;`
   (`hash_key_version` exists on both tables — `docs/certificate-key-deployment.md`
   §6). **Both counts must be exactly 0.** Any other result: stop — this section no
   longer applies, the key is live, and only forward retirement exists.
2. Founder's written rollback instruction.
3. In Cloudflare Pages (Production and Preview): **unset `DOCUMENT_HASH_SECRET`** and
   **restore `DOCUMENT_HASH_KEY_VERSION`** to the prior value recorded on the artefact.
   `DOCUMENT_HASH_SECRET_V1` is not touched in either direction — the seven
   Ibtida'iyyah certificates depend on it permanently.
4. The unused v3 key material is destroyed in **both** custody locations and each
   destruction is logged and witnessed — unless the Founder directs in writing that it
   be retained under the same custody arrangements for a later re-attempt. An
   unaccounted-for spare key copy is precisely the custody failure the v2 history
   teaches against.

**Verification.** Re-run the read-only Cloudflare environment-name audit
(`.github/workflows/cloudflare-env-audit.yml`) and confirm the environment matches the
pre-rotation state recorded on the artefact. Re-run both Section 3.3 audits and confirm
the certificate picture is byte-for-byte what it was: 7 IBT `intact`, 6 IDD
`pending_signature`, all active, presence counts unchanged — which is also the standing
proof that the rotation and its reversal touched no certificate.

**Log entries.** Section 3.4 entry, plus the witnessed destruction (or Founder-directed
retention) record for each key copy.

### 4.7 `PROGRAMMES` registry additions, and frontend / service-worker deploys

**What the forward action changes.** Repository code on `main`, then the deployed site:

- additions to the `PROGRAMMES` registry in `functions/_lib/certificate-serial.js`
  (with Founder-approved bilingual labels — see the programme-registry note in
  `03-decision-tree.md` §6), without which the affected stage certificates cannot be
  minted at all;
- any frontend or service-worker change deployed alongside the reconciliation.

**Pre-written rollback artefact.** The forward change is a commit (or commits) on
`main`; the rollback artefact is the identified list of those exact commit hashes,
recorded at merge time, together with the instruction below.

**Reversal steps.**

1. Section 2 publication test. Additionally: a registry entry under which **any
   certificate row has already been minted** is no longer a candidate for reversion —
   that entry now stands behind a live record and is corrected forward instead
   (Section 2.3).
2. Founder's written rollback instruction.
3. `git revert <commit>` on `main` for each listed commit — a revert, **never** a
   history rewrite: the erroneous commit remains visible in history and the reversal is
   itself a documented commit, in keeping with Section 4.8.
4. **Rebuild before deploying: run `node scripts/build.js`.** The build regenerates the
   service worker's `CACHE_VERSION` from a fingerprint of every css/js/i18n file and
   rewrites the `?v=` asset fingerprints across every built HTML page. This step is not
   optional, and the repository's own history shows why: on 15 August 2026, commit
   `c70ff72c` had to be shipped because `js/certificate-verify.js` had been edited
   outside the normal build step, leaving `CACHE_VERSION` in `sw.js` pointing at a
   fingerprint of the old file — so every browser with the PWA already installed would
   have kept serving the outdated script from cache indefinitely. A rollback that skips
   the rebuild "succeeds" in the repository while every installed device continues
   running the code that was supposed to be withdrawn.
5. Deploy, and confirm the deployment completed.

**Verification.** Confirm the live site serves the reverted files (fetch the affected
JS/CSS read-only and compare); confirm `sw.js` on the live site carries a new
`CACHE_VERSION`; re-run both Section 3.3 audits and confirm the certificate picture is
unchanged — registry and frontend changes must never move it in either direction.

**Log entries.** Section 3.4 entry, recording the reverted commit hashes, the revert
commit hashes, the build run, and the deployment reference.

### 4.8 What is NEVER rolled back

| # | Never rolled back | Why |
|---|---|---|
| 1 | **The 13 existing certificates' stored hashes and serials** (000035–000047: 7 IBT signed under v1, 6 IDD signed under v2) | These are issued, circulating documents whose engraved numbers derive from their stored hashes. No action in this pack — forward or rollback — may alter, re-sign or renumber them. The audit's §5 immutability proof is the standing guarantee, and any procedure that would touch these columns is outside this pack's authority entirely. |
| 2 | **Any published document or action** (Section 2) | Past the publication boundary only the Section 2.3 correction procedure exists: a documented correcting entry, in the open, never a silent deletion. |
| 3 | **The audit trail itself** | Every log — the implementation log, the workbook's sign-off record, `verification_log`, the git history — is **append-only**. An erroneous entry is corrected by a **new** entry that states the error and the correction; the original is never edited and never deleted. A rollback removes the erroneous *system state*; it never removes the *record that the erroneous state existed*. Anyone reading the trail afterwards must be able to see the mistake, the discovery, and the reversal, in order. |

---

## 5. The rollback drill — required before Stage 5 begins

Before Stage 5 (Implementation) of `04-sop.md` begins, the implementation team must have
**rehearsed** a rollback, once, end to end — so the first real rollback, if ever needed,
is the second one ever performed, not the first.

1. **Where.** Against a **non-production** database only: the Neon preview branch — the
   separate staging database serving the Preview deployment, never the production
   database (the staging/production separation is documented in
   `docs/shrs-portal-operational-audit-2026-07-30.md`). The exact connection used, and
   confirmation that it is not production, are recorded before the drill starts.
2. **What.** One **B1a-type insert** and its paired rollback, per Section 4.2: prepare
   the paired forward and rollback artefacts; execute the insert; verify the row
   resolves; execute the rollback; verify "no record" is restored.
3. **Drill data.** The rehearsal row must be unmistakably fictitious — a student name
   such as `DRILL — NOT A STUDENT`, clearly outside every real sequence allocation —
   and must be removed by the drill's own rollback. No real student's name, number or
   certificate data is used, and nothing from the drill may remain in the database
   afterwards.
4. **Success criteria.** The rollback statement affects exactly 1 row; the
   post-rollback state matches the pre-drill state; both facts are evidenced by
   before/after read-only queries kept with the drill record.
5. **Logged.** The drill is logged with the full Section 3.4 field set, marked
   **DRILL**, signed by the Technical reviewer and countersigned by the Registrar, and
   filed with the pack. Stage 5 does not begin until this record exists.

The drill changes nothing in production, mints nothing, signs nothing, and requires no
key — it is compatible with the freeze's terms provided it is executed only against the
non-production database and only with fictitious drill data. If the Founder prefers, it
may nevertheless be scheduled after sign-off and immediately before Stage 5:
[TO BE CONFIRMED BY REGISTRAR] with the Founder's office when Stage 5 is scheduled.

---

*End of document 5. The evidence for every certificate named above is indexed in
`06-evidence-pack.md`; the execution order for the forward actions is
`07-implementation-plan.md`, which runs nothing before the full sign-off chain —
Registrar → Technical → Cryptographic → Founder — is complete.*
