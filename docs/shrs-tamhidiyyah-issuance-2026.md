# Tamhīdiyyah 2026 — issuance instruction

**Award:** Certificate of Tamhīdiyyah · شهادة إتمام المرحلة التمهيدية
**Graduand:** one — **Abdulbasit Adedokun** · عبد الباسط أددوكن
**Approved by the Founder:** 8 August 2026 — *"Only Abdul Basit Adedokun is now
in Tamhīdiyyah. Issue out his certificate now."*
**Status:** every gate passes. **Waits on the signing key alone.**

---

## Why this document exists rather than a finished certificate

The certificate is not minted here, and that is not a gap in the work — it is
the control the whole system is built around.

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

So the approval is executed by one command, run by someone holding the key.

---

## The one command

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

## Two things that must follow, on the live system

These are acts of the **Office of the Registrar**, not build steps. Neither is
done by the command above.

### 1 · Revoke `SHRS-CERT-IBT-2026-000037-22C49`

His Ibtidā'iyyah certificate, minted on 8 August before the two stages were
distinguished in this system at all. On the ruling that a Tamhīdī graduand has
no Ibtidā'iyyah entitlement, it confers an award that is not his.

Revoke it through the Registrar's Office (`revoke` action, with a note citing
this ruling). Public verification must then return **revoked** — never
*genuine*. The sheet has not been handed over; recover it if it has.

Full record: `docs/shrs-certificate-revocations.md`, entry **R-2026-001**.

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
