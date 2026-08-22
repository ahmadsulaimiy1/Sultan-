# Neon SQL Editor — the certificate import, step by step

**For:** the Founder, working directly in the Neon SQL Editor
**Subject:** getting the thirteen issued certificates on file so that
`shroyalschools.com/v/<serial>` answers for them

This is the operator's runbook for the two SQL pastes. It exists because the
pastes are large, because one of them writes to production, and because doing
them in the wrong order produces a confusing error rather than a clear one.

Nothing here changes a certificate. The thirteen documents are printed, signed
and in the graduands' hands; their numbers, names and hashes were fixed when
they were issued. This is the database catching up to paper.

---

## The two pastes, named

| # | What | File | Writes? |
|---|---|---|---|
| 1 | **The schema** — every table, column, index and sequence the portal needs | `sql/schema.sql` | Creates structure. No certificate rows. |
| 2 | **The register import** — the thirteen certificates | `docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql` | Yes. This is the one that puts the graduands on file. |

If you have already pasted one thing into Neon, it was almost certainly #1, and
#2 is what remains.

There is also a **preflight** — `docs/graduation-registers/00-PREFLIGHT.sql` —
which is read-only and answers "which of these have I already done?" without
you having to remember. Start there if you are unsure.

---

## Step 0 — Preflight (read-only, safe at any time)

Open the Neon SQL Editor, paste the whole of
`docs/graduation-registers/00-PREFLIGHT.sql`, and run it.

It writes nothing permanent, changes no row, and cannot fail on a database that
is missing the tables it asks about — a missing table is *reported*, not
raised. Run it as often as you like.

You get eight rows. Read the **verdict** column.

**If the schema has not been run**, every row says
`STOP — run sql/schema.sql first`. Do that (paste #1), then run the preflight
again.

**If the schema is there and the import is not**, the first five rows say
`ready` and you will see:

```
import — of the 13 issued certificates, on file   | 0  | not yet imported — run the import next
import — serial sequence stands at                | 1  | below 47 — the import raises it; issue no certificate until it has run
```

That is the state you go to Step 2 from.

**If the import has already run**, you will see `13` and
`already imported — the import is a no-op, safe to re-run`. Nothing further is
needed.

The last row — `linkage — graduands with a student record on file` — is
informational and blocks nothing. It is explained in Step 3.

---

## Step 1 — The schema (skip if the preflight says `ready`)

Paste the whole of `sql/schema.sql` and run it.

Every statement in it is `CREATE … IF NOT EXISTS` or
`ALTER TABLE … ADD COLUMN IF NOT EXISTS`, so running it on a live database
changes nothing that already exists and drops nothing at all. It is safe to
re-run, and re-running it is the correct fix if the preflight reports a missing
column.

---

## Step 2 — The register import (this is the second code)

Paste the whole of `docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql`
— all of it, from the first comment line to the final `COMMIT;` — and run it.

Copy the file *entire*. It is one transaction: it opens with `BEGIN;` and closes
with `COMMIT;`, and a partial paste either fails outright or, worse, leaves a
transaction open. If the editor seems to be waiting afterwards, you did not
include the `COMMIT;`.

### What it does

- Attaches the thirteen permanent Student IDs to the children's records, but
  only where the record has no ID yet — it will never overwrite a number that
  is already printed on a document.
- Inserts the thirteen certificates, verbatim from the sealed registers. No
  identifier and no hash is recomputed anywhere in the file.
- Moves the numbering counters forward to 47, so the next certificate the
  Registrar issues is 000048 and never a number a child is already holding.
- Reads all thirteen back and compares each one — serial, content hash, printed
  name, Student ID — against what is engraved on the sheet. **Any disagreement
  raises and the whole transaction rolls back.** You cannot end up half
  imported.

### What you should see

Two result grids at the end. The first:

```
AFTER   certificates on file          | 13
AFTER   highest engraved number       | 000047
AFTER   serial sequence stands at     | 47
AFTER   next certificate will be      | 48
AFTER   student id sequence stands at | 47
```

If `certificates on file` reads higher than 13, that is not a fault — it means
production already held other certificates, and yours were added alongside them.

The second grid lists any graduand whose **student record** could not be found.
See Step 3.

### If it fails

It fails loudly and completely, by design. An error beginning
`IMPORT ABORTED —` means a certificate on file disagrees with the document that
was issued; the transaction has rolled back and the database is exactly as it
was before you pasted. Send the message on rather than editing the file to make
it pass — the file is a copy of the sealed register, and a mismatch is a fact
worth knowing, not an obstacle.

### Running it twice is safe

Every insert carries `ON CONFLICT DO NOTHING`, and the counters can only move
forward. A second run leaves the database byte-for-byte unchanged. If you are
ever unsure whether it completed, run it again.

---

## Step 3 — The "student record not linked" list

The import prints a list of graduands whose row in `students` it could not find
by name. On a database whose student records are not yet loaded, that will be
all thirteen, and it is **not** a failure.

A certificate verifies from its own row. It carries the child's name, Student ID
and hash itself, so every one of the thirteen verifies correctly whether or not
the child has a student record. What is missing is only the link between the
certificate and the child's file in the Registrar's Office.

Give that list to the Registrar. The usual cause is a spelling difference
between the register and the student file. **Do not edit the import to force a
match** — correct the student record, then re-run the import, and the ID
attaches on the second pass.

---

## Step 4 — Verification will not work on the database alone

Getting the rows in is necessary and not sufficient. The public verifier
recomputes each certificate's hash on every lookup, and it needs the signing
key to do it. Three environment variables must be set on the hosting
environment, in **both Production and Preview**:

| Variable | Value |
|---|---|
| `DOCUMENT_HASH_SECRET` | the v2 key, held separately — never in this repository |
| `DOCUMENT_HASH_KEY_VERSION` | `2` |
| `DOCUMENT_HASH_SECRET_V1` | `batch-issuance-development-secret` |

The third looks unimportant and is not: it signed the seven Ibtidā'iyyah
certificates (000035–000041), and without it those seven cannot be verified.

Environment variables only take effect on a **new deployment** — add them, then
redeploy.

`docs/certificate-key-deployment.md` is the authority on these, including what
happens if the v2 key is lost. Read §3 of it before you touch the key.

A preview or production deployment missing the variables reports
`key_unavailable`, which is deliberately distinguished from a hash mismatch, so
a misconfigured environment can never be mistaken for evidence of tampering.

---

## Step 5 — Prove it

Take any one of the thirteen — say `SHRS-CERT-IDD-2026-000042-56798` — and open

```
https://shroyalschools.com/v/SHRS-CERT-IDD-2026-000042-56798
```

It should name Muhammad Ismail Seriki and report the certificate as genuine and
active. Then scan the QR on the printed sheet itself, which is the check that
matters: the QR carries that same URL, and scanning it is what an employer or
another school will actually do.

For all thirteen at once, against the live endpoint:

```bash
node scripts/verify-issued-certificates-live.mjs --full
```

---

## What was tested, and what was not

Steps 0–2 were rehearsed end to end against a real PostgreSQL 16 database
before this runbook was written: `sql/schema.sql`, then the production import,
on a database created from nothing. Result — 13 certificates on file, both
counters at 47, transaction committed.

Also confirmed by running them:

- **Re-running the import is a no-op.** Second run, identical after-state.
- **Order does not matter.** Importing the Ibtidā'iyyah register on its own
  first and then running the production import lands in exactly the same place.
- **The preflight is honest in all three states** — bare database, schema
  present with no import, and import already done. It reports each one
  correctly and raises no error on a database with no tables at all.

Not tested here, and worth saying plainly: none of this was run against your
actual Neon database, which I have no access to. And Steps 4 and 5 could not be
exercised at all, because the signing key is not in this environment — that
half is verified when you redeploy and open a verification URL.
