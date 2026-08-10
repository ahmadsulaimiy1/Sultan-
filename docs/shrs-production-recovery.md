# SHRS — Production Recovery

**Candidate:** `ab1adbaf` — frozen, unmodified, not on `main`.
**Blocker:** deployment configuration. Not application code.
**Date:** 10 August 2026

This document exists so nobody has to reconstruct the procedure from the
repository. Everything below was read out of the workflow, the schema and the
import file — not from memory.

---

## 1. A correction to the earlier "six secrets"

The production matrix listed six secrets as though they all belonged in GitHub
Actions. Reading `.github/workflows/certificate-verification.yml` line by line,
that is wrong in three ways, and the difference matters because it changes what
the Founder actually has to type:

- **GitHub Actions needs five secrets, not six.**
- **Three of the "six" are Cloudflare Pages runtime variables**, and the workflow
  **sets them for you** once `CLOUDFLARE_API_TOKEN` exists. They are not things
  to enter by hand.
- **`SITE_ORIGIN` is not used by this workflow at all.** The acceptance target is
  the literal `https://shroyalschools.com` at line 236. It is not a secret and
  needs no entry.

## 2. The five GitHub Actions secrets

Entered at **GitHub → repository `ahmadsulaimiy1/Sultan-` → Settings → Secrets and
variables → Actions → New repository secret**.

| # | Secret name | What it is for | Where it belongs | When used | Can it be auto-generated? | Founder must provide? |
|---|---|---|---|---|---|---|
| 1 | `DATABASE_URL` | Applying `sql/schema.sql` and importing the thirteen certificate records | GitHub Actions | CI time | **No** — it names a specific existing database | **Yes** |
| 2 | `CLOUDFLARE_API_TOKEN` | Lets the workflow set the three Pages runtime variables | GitHub Actions | CI time | No — an account credential | **Yes** |
| 3 | `CLOUDFLARE_ACCOUNT_ID` | Identifies the Cloudflare account | GitHub Actions | CI time | No | **Yes** |
| 4 | `CLOUDFLARE_PAGES_PROJECT` | Names the Pages project. Per `wrangler.toml`, `shroyalschools-web` | GitHub Actions | CI time | No — but the value is already known | **Yes** (confirm) |
| 5 | `DOCUMENT_HASH_SECRET` | The **production v2 HMAC key** that signed IDD 000042–000047 | GitHub Actions → copied to Cloudflare | Runtime | **NO — SEE §3** | **Yes** |

**`DATABASE_URL` already exists in Cloudflare.** We know because the live endpoint
returns `relation "stage_certificates" does not exist` — a *Postgres* error, which
means the site connects to its database successfully and the table is simply
absent. The same connection string needs copying into GitHub Actions so the
workflow can apply the schema.

## 3. The one item that cannot be regenerated — read before anything else

`DOCUMENT_HASH_SECRET` is **not a new secret to invent.** It is the exact key
that was used to sign the six I'dādiyyah certificates (IDD 000042–000047) at
issuance. Generating a fresh one would not "fix" anything — it would make those
six genuine documents fail their integrity check, and the public page would tell
six real children their certificates do not match their signature.

- **If the Founder still has that key:** enter it verbatim. Nothing else needed.
- **If it has been lost:** stop and say so. The remedy is a governance decision,
  not a technical one, and it is **not** re-minting. Do not substitute a
  development key, and do not generate a replacement.

The v1 key is a different matter: `batch-issuance-development-secret` is the
**retired development literal**, already public in this repository. That is
precisely why it is retired and may never sign again. It is not a secret, needs
no protection, and must stay configured forever or the seven Ibtidā'iyyah
certificates stop verifying permanently. The workflow sets it automatically.

## 4. The three Cloudflare Pages variables — set automatically

Once `CLOUDFLARE_API_TOKEN` exists, the workflow step *"Configure Cloudflare Pages
production variables"* sets all three via `wrangler pages secret put`:

| Variable | Value | Why |
|---|---|---|
| `DOCUMENT_HASH_SECRET` | the production v2 key | verifies IDD 000042–000047 |
| `DOCUMENT_HASH_SECRET_V1` | `batch-issuance-development-secret` | verifies IBT 000035–000041 |
| `DOCUMENT_HASH_KEY_VERSION` | `2` | selects the current key |

**All three, or none.** The workflow refuses a partial state, and the reason is
written where it is done: with `DOCUMENT_HASH_SECRET` set but
`DOCUMENT_HASH_KEY_VERSION` unset, the version defaults to `1`, the seven v1
certificates get checked against the v2 key, and the page accuses seven genuine
documents of not matching their signature.

## 5. Database migration — already correct, verified

**The schema step already exists and already runs before the import.** It was
added after the first live run discovered the missing relation. No change needed.

Verified against the repository:

- `sql/schema.sql` line 1984: `CREATE TABLE IF NOT EXISTS stage_certificates (…)`
  — the exact relation the live verifier reported missing. Confirmed present.
- Every one of the 69 `CREATE TABLE` statements is `IF NOT EXISTS`; seed inserts
  carry `ON CONFLICT` or a `NOT EXISTS` guard. Applying it adds what is missing
  and leaves what is present alone.
- The workflow orders them correctly: **schema, then import.**

The exact commands the workflow runs:

```bash
# 1. Apply the schema (idempotent — creates only what is missing)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/schema.sql

# 2. Rebuild the import from the sealed registers, then apply it
npm run certificates:import
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql
```

## 6. The import is verbatim, idempotent, and cannot renumber — verified

Regenerated the file and inspected it directly:

| Property | Evidence |
|---|---|
| **Verbatim** | Generator output: *"13 certificate(s), lifted verbatim from 2 sealed register(s) … every value tuple asserted byte-identical to its source"* |
| **Reproducible** | Regenerated file is **byte-identical** to the committed one (`git diff` empty) |
| **Transactional** | Wrapped in `BEGIN; … COMMIT;` — a failed check rolls the whole thing back |
| **Idempotent inserts** | 15 × `ON CONFLICT … DO NOTHING` |
| **Non-destructive** | Zero `DELETE`, `TRUNCATE` or `DROP` |
| **Cannot overwrite an identity** | All 13 `UPDATE students SET identity_no = …` are guarded `AND identity_no IS NULL` — they attach a number only where none exists |
| **Sequences only move forward** | `setval(…, GREATEST(…))` in all three places, not a bare `setval` — order-independent and never rewinds |
| **Numbers preserved** | 000035–000047 present exactly; sequence lands at 47; next issue 000048 |

Safe to run repeatedly. Running it twice changes nothing the second time.

## 7. Ed25519 production key — procedure

**Not required for live verification.** This key signs the *offline* register
only. Stages 1, 7 and 12 (live verification) do not need it. Do this after live
verification passes, or in parallel — it blocks only the offline half.

On a trusted machine, not in CI, not in this environment:

```bash
# Generate. Two files: private stays with you, public gets pinned in the code.
openssl genpkey -algorithm ed25519 -out shrs-register-private.pem
openssl pkey -in shrs-register-private.pem -pubout -out shrs-register-public.pem

# The value for the GitHub secret (base64 PKCS#8, single line):
openssl pkey -in shrs-register-private.pem -outform DER \
  | base64 -w0 ; echo

# The value to pin in the client (base64 SPKI):
openssl pkey -in shrs-register-private.pem -pubout -outform DER \
  | base64 -w0 ; echo
```

- The **private** half becomes GitHub secret `CERT_REGISTER_PRIVATE_KEY`.
  `scripts/build-certificate-register.mjs` reads it as base64 PKCS#8 and refuses
  to run without it.
- The **public** half is pinned into `TRUSTED_KEYS` in
  `js/shrs-certificate-offline.js`.
- Make **two secure backups of the private key before deleting the working
  file.** Never paste it into chat, a commit, or a build log.

**`TRUSTED_KEYS` stays fail-closed until then.** It currently reads
`Object.freeze({})`, and `verifyRegister()` returns `{trusted:false, reason:
'key-not-pinned'}` for any register whose key is not in it. Every register is
refused until the genuine production public key is installed. Nothing is
weakened in the meantime.

## 8. Deployment — how the candidate reaches production

There is **no deploy step in the workflow.** Cloudflare Pages is Git-integrated
(`wrangler.toml`: `pages_build_output_dir = "."`) and builds from **`main`**.

So deploying the candidate means exactly one thing: **merging `ab1adbaf` into
`main`.** Pages picks it up automatically.

`main` is at `7e8dbfea`; 13 candidate commits are unmerged. **This must not
happen until §2 and §5 are done** — deploying the candidate into an environment
whose database has no certificate schema changes nothing except which code
returns the same 500.

## 9. The final live-verification command

```bash
npm run certificates:accept -- --base https://shroyalschools.com
```

Tests all thirteen issued numbers through the real public API, in nine forms
each — full serial, engraved number, engraved without check tail, document id,
archive reference, verification code (as printed and ungrouped), archive barcode,
and the QR payload — plus the failure states (unknown reference, wrong check
tail, altered code, injection, malformed input). Exits non-zero unless every one
passes. This is the command that decides whether verification is live.

It runs in the workflow automatically. It can also be run by hand from any
machine with network access to the site.

## 10. The dependency graph, honestly

The runbook's stage order is safe but stricter than the real dependencies. What
actually blocks what:

```
DATABASE_URL ─────────────► schema ──► import ──► live verification (stages 1, 7, 12)
                                                        │
CLOUDFLARE_API_TOKEN ──► 3 Pages vars ──────────────────┘
   (+ ACCOUNT_ID, PAGES_PROJECT, DOCUMENT_HASH_SECRET)

merge to main ──► candidate deployed (stage 4)

CERT_REGISTER_PRIVATE_KEY ──► signed register ──► TRUSTED_KEYS pinned
                                                        │
                        printed QR + Android handset ───┴──► offline (stages 5, 6, 8–11)
```

**Live certificate verification needs only the five secrets in §2.** The Ed25519
key, the printed certificate and the handset block the offline half only.

---

## FOUNDER CHECKLIST — only what you personally must do

**Step 1 — Retrieve one value before anything else.**

☐ Find the **production v2 HMAC key** used to sign IDD 000042–000047. This
cannot be generated; a new one would make six genuine certificates fail. **If it
is lost, tell me and stop here** — the remedy is a governance decision, not a
re-mint.

**Step 2 — Enter five secrets.**
At **github.com/ahmadsulaimiy1/Sultan- → Settings → Secrets and variables →
Actions → New repository secret**:

☐ `DATABASE_URL` — the Neon production connection string (the same one already
configured in Cloudflare Pages; copy it across)
☐ `CLOUDFLARE_API_TOKEN` — create at **Cloudflare dashboard → My Profile → API
Tokens**, with Pages edit permission
☐ `CLOUDFLARE_ACCOUNT_ID` — **Cloudflare dashboard → Workers & Pages**, right-hand
sidebar
☐ `CLOUDFLARE_PAGES_PROJECT` — value is `shroyalschools-web` (confirm it matches
your Pages project name)
☐ `DOCUMENT_HASH_SECRET` — the v2 key from Step 1

**Step 3 — Tell me they are set.** I take it from there: schema → import → Pages
variables → live verification, and I report the acceptance table.

---

**Later, and only for the offline half — not needed for live verification:**

☐ Generate the Ed25519 pair with the two `openssl` commands in §7, on a trusted
machine. Add the private half as GitHub secret `CERT_REGISTER_PRIVATE_KEY`. Send
me the **public** half to pin. Back the private key up twice before deleting it.
☐ A physically printed certificate with its QR code
☐ An Android handset with Chrome, on Nigerian mobile data
☐ Name a Yoruba reviewer and a French reviewer

**Do not enter these anywhere** — the workflow sets them for you:
`DOCUMENT_HASH_SECRET_V1`, `DOCUMENT_HASH_KEY_VERSION`, and `SITE_ORIGIN`
(unused).
