# SHRS Registrar Reconciliation Pack

**Authority:** the Founder's Registrar Reconciliation Preparation Directive, 15 August 2026.
**Status:** PREPARED — AWAITING THE REGISTRAR. No lifecycle action has been taken.

---

## The freeze (in force throughout)

Until the reconciliation in this pack is complete and signed off:

- **No signing key is generated** — save the single, fully gated
  generation-and-custody ceremony inside Stage 3 of `04-sop.md`, which occurs
  only if the draft approved-actions list requires it, is witnessed by a second
  role-holder, has its ceremony record countersigned, and touches no live
  system: the key's installation into Cloudflare is itself a signed Stage 5
  action.
- **No certificate is minted.**
- **No record is created or modified in the production database, and no
  institutional record is altered.**
- **No verification data changes.**
- **No REISSUE or REVOKE action is performed** — including the Founder-ratified
  plan of 8 August 2026 (`docs/graduation-registers/reissue-plan-2026.json`),
  which remains ratified but unexecuted.
- **Production is not altered.**

One rehearsal is expressly permitted before Stage 5: the witnessed rollback
drill of `05-rollback-plan.md` section 5, run exclusively against a
non-production staging branch with fictitious data. It is the only rehearsal
the freeze permits; it touches no production record and no institutional
record.

**Standing-automation note.** The Monday 06:00 UTC schedule of
`certificate-verification.yml` attempts that workflow's import/configure
steps automatically. At the evidence baseline those steps skip or fail closed
because the required secrets (`DATABASE_URL`, `DOCUMENT_HASH_SECRET`) are
absent from the stored GitHub secrets — but this pack does not rely on that
remaining true. Every manual dispatch of that workflow during the freeze must
set `run_import: false` and `configure_cloudflare: false` explicitly (both
inputs default to true).

Every document in this pack *describes* future actions; none *performs* one, and
none authorises anyone to perform one outside the sign-off chain in the SOP.

## The final principle (single source of truth)

No certificate lifecycle action is taken until, for that certificate, **five
sources agree**:

1. the Registrar's records,
2. the printed certificate (or the confirmed absence of one),
3. the verification database,
4. the cryptographic records (key version, content hash, printed suffix),
5. the public verification service's live answer.

The workbook is where the five sources are brought face to face, one row per
certificate. The decision tree turns each completed row into exactly one
documented institutional action. The SOP says who does what, in what order,
and who signs. The rollback plan says how each action is reversed if an error
is found before publication. The evidence pack is the citation trail. The
implementation plan is the execution script for AFTER sign-off — and nothing
in it runs before.

## Contents

| File | What it is |
|---|---|
| `01-README.md` | This charter |
| `02-workbook.csv` | The Registrar Reconciliation Workbook — 51 rows, one per certificate (13 issued + 38 planned), known facts pre-filled, Registrar fields blank |
| `02-workbook-guide.md` | Field-by-field completion instructions for the Registrar |
| `03-decision-tree.md` | The formal decision tree — deterministic, every branch ends in a documented action |
| `04-sop.md` | The operating procedure: Registrar review → Technical review → Cryptographic review → Founder approval → Implementation → Audit logging |
| `05-rollback-plan.md` | Reversal procedure for every authorised action type |
| `06-evidence-pack.md` | Per-certificate evidence index: register, database, repository, workflow, production |
| `07-implementation-plan.md` | Execution-only plan for after reconciliation — no redesign, no reinterpretation, no assumptions |

## Why the workbook has 51 rows, not 44

The Registrar's canonical roll (`canonical-roll-2026.json`) records **44 awards**
for 31 children. But 51 certificate *lifecycles* must be reconciled, because the
13 certificates issued on 8 August 2026 include **3 the ratified plan marks
REVOKE** (awards not on the Registrar's roll) and **4 it marks REISSUE** (whose
replacements appear again among the 38 planned mints). 44 roll awards + 4
old reissue-superseded certificates + 3 revocation-marked certificates = 51.
Nothing physical or planned is left off the sheet.

## A known numbering collision the Registrar must resolve

The reissue plan allocates sequence **48** to a **Qur'an College** certificate
(Aisha Omoshalewa Anofi). But on 15 August 2026 the Founder reported — with a
screenshot of the live verification page — a physical certificate already in a
student's hands printed **`SHRS-CERT-JSS-000048`** (a JSS certificate). The
plan's numbering and at least one printed document therefore **disagree about
who holds number 48**. This is exactly why the workbook asks for the printed
number *exactly as it appears* on every physical document: the plan's
allocations (48–85) are provisional and must be renumbered around whatever is
actually in circulation (implementation plan, allocation rule) — never the
other way round. A number printed on paper in a child's hand outranks a number
in a JSON file.

## Evidence baseline this pack is pinned to

- Live-database presence audit: sequence numbers 1–150 queried against
  `https://shroyalschools.com` on 2026-08-15T03:48–03:50 UTC; exactly 13 rows
  found (000035–000047). GitHub Actions run `31862779664`, repository commit
  `afb80e87`.
- Live acceptance run (all 13 verify, every printed identifier + QR): run
  `31857567994`, 2026-08-15T01:50 UTC.
- Full audit: `docs/shrs-certificate-cryptographic-integrity-audit-2026-08-15.md`.
