# Tamhīdiyyah 2026 — issuance instruction

**Award:** Certificate of Tamhīdiyyah · شهادة إتمام المرحلة التمهيدية
**Graduand:** one — **Abdulbasit Adedokun** · عبد الباسط أددوكن
**Approved by the Founder:** 8 August 2026 — *"Only Abdul Basit Adedokun is now
in Tamhīdiyyah. Issue out his certificate now."*
**Status:** every gate passes. Two routes below — **Route A issues it on the
live system today, with nobody handling the key.**

---

## Why the certificate is not simply attached to this document

It is not a gap in the work. It is the control the whole system is built around.

The five characters engraved on a certificate's face are the head of an
HMAC-SHA256 over the certificate's own fields, keyed by `DOCUMENT_HASH_SECRET`.
That is what makes the printed number self-checking: a forger can invent a
plausible sequence number, but cannot compute a tail that matches it without the
key. The key lives in Cloudflare Pages (encrypted) and in the Board's credential
store. **It is not in this repository or this environment, and it must not be.**

This repository has already produced real certificates signed by a development
literal — not because anyone chose it, but because a convenience default let a
run succeed. That fallback is gone; both issuing scripts now refuse to start
without the key. Substituting any other value would mint a certificate whose
engraved number cannot be verified against the record, which is worse than no
certificate at all.

There are therefore two ways to issue it, and neither involves a substitute
key. **Route A runs it inside production, which already holds the key** — the
Registrar's Office signs it there, so nobody fetches or carries anything. Route B
is one command for whoever holds the key file directly.

---

## Route A — issue it on the live system (no key handling by anyone)

**This is the route to a printed certificate today.** Production already holds
the signing key in its own environment, so nobody has to fetch it, paste it or
carry it: the Registrar's Office mints the certificate inside the environment
that has it.

The screen is **Certificate Generation Centre**, `/portal/staff/certificate-centre/`.
It issues, prints, registers and revokes — all of it already built.

### Prerequisite: deploy this branch

Two things this route needs are on `claude/wec-institutional-design-kt3u0t` and
not yet in production:

1. **`PROGRAMMES.TMH`** — without it the endpoint answers *"Unknown programme
   code TMH"* and nothing is issued.
2. **The Tamhīdiyyah title wording and regalia** in the sheet template —
   without them the certificate would print under the wrong stage name.

A third thing was found while checking this route and is fixed on the same
branch: **Tamhīdiyyah was missing from the programme picker entirely**, and
I'dādiyyah was mislabelled *"Preparatory Stage"* when it is the **Intermediate**
stage. A registrar looking for the preparatory award would have found that line,
selected it, and conferred the wrong award — with every downstream gate passing,
because the numbering and the hash would have been correct for the programme
actually chosen. `scripts/verify-certificate-centre-programmes.mjs` now checks
the picker against the engine on both code and label.

### The steps

| | |
|---|---|
| 1 | **Check the student record first** — see the warning below. This is the one step that can go wrong silently. |
| 2 | Sign in to `/portal/staff/certificate-centre/` as the Registrar (or any role holding `certificates` **C**). |
| 3 | **Programme:** Tamhīdiyyah — Preparatory Stage (TMH). **Academic Year:** 2025/2026. **Issue Date:** 2026-08-08. |
| 4 | Roster: one row — full name **Abdulbasit Adedokun**, Arabic **عبد الباسط أددوكن**, sex **male**. Give his **admission number** if he has one: it matches exactly, where a name match does not. |
| 5 | **Preview Roster.** It must report him **matched**, not *new*. If it says new, stop — see the warning. |
| 6 | **Generate Batch.** Production signs it. |
| 7 | **Open Full Batch for Printing**, or open the certificate from the Certificate Register. Both give print-ready HTML and PDF. |
| 8 | Scan the QR on the printed sheet and confirm the public page reports it genuine, with the right name and award. |

### ⚠ The one thing that can go wrong quietly

If the roster row does **not** match an existing student, the endpoint **creates
a new student and mints a new permanent Student ID**. That would give Abdulbasit
a second permanent number — the single worst outcome this whole pipeline exists
to prevent.

Where he already exists as a student, `ensureStudentIdentityNo` returns the
number he holds and never rewrites it, so **711232557821021** carries onto the
new certificate by itself. Confirm before issuing:

```sql
SELECT id, full_name, admission_no, identity_no
  FROM students
 WHERE LOWER(full_name) = LOWER('Abdulbasit Adedokun');
```

- **One row, `identity_no = 711232557821021`** → proceed. Step 5 will say matched.
- **One row, `identity_no` empty** → set it to `711232557821021` before issuing.
  It is his, from certificate 000037.
- **No row** → create his student record first, with that identity number. Do not
  let the batch create him.
- **More than one row** → the endpoint refuses as ambiguous and names the
  admission numbers. Use the admission number in the roster.

### The number will not be 000052

The live system takes the next value from `stage_certificate_serial_seq`, not
from the plan's ordering. Issuing Tamhīdiyyah first means it takes the first free
number — **000048** if the published batches were imported and the sequence set
past 47.

That is correct, not a fault. The only inviolable rule is that a number is issued
**once, ever**; which stage happens to take 48 is a convenience. Afterwards,
re-run:

```bash
node scripts/plan-certificate-reissue.mjs --write
node scripts/preflight-graduation-coverage.mjs
```

so the remaining thirty-seven are re-based on what was actually consumed. Do that
before minting anything else, or two certificates will be allocated one number.

---

## Route B — issue it from this repository

For whoever holds the key file and would rather not go through the portal. Same
certificate, same engine; this route also writes the register and the import SQL.

### The one command

```bash
DOCUMENT_HASH_SECRET='<the v2 key from the Board’s credential store>' \
DOCUMENT_HASH_KEY_VERSION=2 \
  node scripts/issue-certificate-batch.mjs TMH
```

Run it from the repository root. It takes a few seconds and prints the engraved
number when it is done.

### What it writes

`dist/certificates/2026-08-08-TMH-000052/`

| File | What it is |
|---|---|
| `000052-711232557821021.html` | the certificate sheet |
| `batch-print.html` | the combined print file (one sheet, in this batch) |
| `graduation-register.json` | the register, importable |
| `graduation-register.md` | the register, readable |
| `graduation-register.sql` | the `INSERT` for `stage_certificates`, plus the sequence `setval`s |

### Then the press artefacts

```bash
node scripts/render-certificate-batch.mjs dist/certificates/2026-08-08-TMH-000052
```

Writes the press PDF and a 600 DPI proof beside the HTML.

### Then check the sheet that was actually produced

```bash
node scripts/verify-certificate-batch.mjs dist/certificates/2026-08-08-TMH-000052
```

This reads the **rendered** sheet rather than the source that made it — the
engraved number, the barcodes, the QR payload, the microtext rail. Do not send
anything to a printer that has not passed it.

---

## What will be engraved

Every value below is already fixed. The run computes only the serial tail, the
content hash and the verification code, which is the whole reason it needs the
key.

| | |
|---|---|
| Name (English) | **Abdulbasit Adedokun** |
| Name (Arabic) | **عبد الباسط أددوكن** |
| Award | Certificate of Tamhīdiyyah — Preparatory Stage Completion |
| Arabic award | شهادة إتمام المرحلة التمهيدية |
| Certificate number | **SHRS-CERT-TMH-000052-⟨tail⟩** |
| Permanent Student ID | **711232557821021** |
| Document ID | `DID-2026-TMH-0000052` |
| Archive reference | `ARCH/TMH/2026/000052` |
| Academic session | 2025/2026 |
| Date of issue | 8 August 2026 · ٢٥ صفر ١٤٤٨هـ |
| Place | Ikorodu, Lagos, Nigeria · إكورودو، لاغوس، نيجيريا |
| Signing key version | 2 |

### Nothing here was derived

His Arabic name was approved for the **Ibtidā'iyyah** register and is carried
across as the identical string; his sex is on that same register. No name was
transliterated, assembled or guessed for this sheet — which is why it is the one
stage batch not held on an outstanding ruling.

### The Student ID is his own, not a new one

`711232557821021` is the number already engraved on the Ibtidā'iyyah certificate
being revoked. He is one child and holds one number for life; only the award
changes. The issuer reads it out of the published register at run time and
refuses the batch if it does not match the plan.

---

## Revoking the old certificate

**Deferred by the Founder, 8 August 2026: print the new one first, revoke later.**
That is his call and it is recorded here rather than argued with. One consequence
belongs on the record, in one sentence: **until it is revoked, 000037 still
reports genuine**, so for that period the boy holds two live awards — the
Ibtidā'iyyah one the ruling says is not his, and the Tamhīdiyyah one that is.
Nothing about the new certificate is affected.

It takes about a minute whenever you want it, on the same screen:

> Certificate Register → search `SHRS-CERT-IBT-2026-000037-22C49` → **Revoke**.
> The note is mandatory; use:
> *"Founder's ruling, 8 August 2026 — Tamhīdī graduand, no Ibtidā'iyyah
> entitlement. Replaced by the Tamhīdiyyah certificate. R-2026-001."*

Public verification then shows revoked immediately, and the serial is never
reused. Full record: `docs/shrs-certificate-revocations.md`, **R-2026-001**.

## What must follow if you took Route B

Route A does all of this inside the live system already. These apply only to a
batch minted from the repository.

### 1 · Recover the printed sheet of `SHRS-CERT-IBT-2026-000037-22C49`

His Ibtidā'iyyah certificate, minted on 8 August before the two stages were
distinguished in this system at all. On the ruling that a Tamhīdī graduand has
no Ibtidā'iyyah entitlement, it confers an award that is not his.

If it has been handed over, recover it before the replacement is given.

### 2 · Import the register and link the student record

Run `graduation-register.sql`. It inserts the certificate row, moves both
sequences past what this batch consumed, and then attempts to link
`stage_certificates.student_id` to the `students` row — but **only** where
exactly one active student carries that exact full name. The audit query beneath
it prints any row still unlinked. A row showing `NOT LINKED` is a link a human
must make: the batch was minted from a roll of names, not from student rows, and
guessing a foreign key from a name is how one graduate's certificate ends up
filed under another.

### Then confirm it in public

Open `https://shroyalschools.com/verify-certificate/?ref=<the full serial>` and
confirm it reports genuine, with the right name and the right award. If it
reports `key_unavailable`, the environment is missing the key — that is a
configuration fault, not a fault in the document, and the code distinguishes the
two deliberately so nobody reads a misconfigured host as evidence of tampering.

---

## Before the run — everything already checked

```
node scripts/preflight-graduation-coverage.mjs
```

Passing now, with Tamhīdiyyah carrying no hold:

- the ceremony programme and the certificate roll agree, award by award
- `000052` is claimed once in the global sequence, by this certificate and
  nothing else
- one child, one permanent Student ID — proved in both directions across the
  minted certificates and the plan
- his carried number resolves against the exact certificate it claims
- his Arabic name is on record at the full length to be engraved
- his sex is on record
- Tamhīdiyyah and Ibtidā'iyyah share no student

And the artwork, which cannot be judged from source:

```
node scripts/proof-certificate-design.mjs TMH          # render it and look
node scripts/verify-stage-sheet-isolation.mjs          # prove no other stage moved
```

The second matters as much as the first. The Tamhīdiyyah sheet carries regalia
no other stage has, and the check renders the Ibtidā'iyyah and I'dādiyyah sheets
from the working tree and from a git ref and compares them byte for byte. All
eight identical.

---

## If the run refuses

It is designed to. Each refusal is a specific fact, not a generic error.

| It says | It means |
|---|---|
| `DOCUMENT_HASH_SECRET is not set` | the key was not supplied. Supply it; never default it. |
| `BATCH HELD — … no approved Arabic name` | a name would have to be invented. Not applicable to this batch. |
| `BATCH REJECTED — a permanent Student ID would be held by two different people` | stop entirely and read the message. This is the fault the pipeline exists to prevent. |
| `certificate number … is already engraved on …` | the plan and the minted registers disagree. Re-run `plan-certificate-reissue.mjs --write` and read the diff before doing anything else. |

None of these is worked around. Each one is answered.
