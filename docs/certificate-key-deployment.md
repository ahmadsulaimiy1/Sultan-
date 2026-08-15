# Certificate signing keys — deployment

**Sultan Hanafi Royal Schools — Official I'dadiyyah Certificate System**
**Production Release v1.0 Master Locked**

This is the operational half of the freeze declaration. The declaration records
what the master *is*; this records the one input the manifest cannot cover — the
signing key — and what happens if it is lost.

---

## 1. What a certificate's hash proves

Every stage certificate carries an HMAC-SHA256 over its own canonical fields,
keyed by a secret that lives only in the environment. Two things derive from it:

- `content_hash`, stored on the row and recomputed on every public lookup.
- **the five characters engraved on the certificate itself** — the serial's tail
  (`SHRS-CERT-IDD-2026-000042-56798`) and the printed verification code
  (`5679-8B4D-…`) are the head of that same digest.

So the key is not an implementation detail behind the verification page. It is
the thing that makes the *printed number* self-checking: a forger can invent a
plausible sequence number, but cannot compute a tail that matches it without the
key.

That is exactly why the previous key was a problem. It was a literal committed
in the repository, so anyone with repository access could compute a valid tail
for an invented number. The property existed on paper and not in fact.

## 2. The variables

| Variable | Value | Where |
|---|---|---|
| `DOCUMENT_HASH_SECRET` | the v2 key, delivered separately as a file | Cloudflare Pages → Settings → Environment variables → **Production**, marked **Encrypt** |
| `DOCUMENT_HASH_KEY_VERSION` | `2` | same place, plaintext is fine — it is a version number, not a secret |
| `DOCUMENT_HASH_SECRET_V1` | `batch-issuance-development-secret` | same place. Not sensitive — it is already public in git history — but it must be **present**, or the seven Ibtida'iyyah certificates cannot be verified |

Set all three in **Production and Preview**. A preview deployment missing them
does not fail loudly; it reports `key_unavailable`, which the code deliberately
distinguishes from a hash mismatch so nobody reads a misconfigured preview as
evidence of tampering.

### Why v1 is kept

Version 1 signed the seven Ibtida'iyyah certificates (000035–000041) on
2026-08-08. Those documents are issued. Their engraved numbers derive from that
key, so they can never be re-signed — re-minting would change a number already
in circulation.

Version 1 is therefore **retired, not deleted**: it may verify forever, and
`document-hash.js` throws if anything tries to sign with it. `scripts/issue-certificate-batch.mjs`
refuses to re-run the Ibtida'iyyah batch at all, before writing anything.

This is the whole point of key versioning. Rotating a secret with no version
recorded would have made every pre-rotation certificate report
`integrity_check_failed` — the school publicly branding its own genuine
documents as forgeries.

## 3. Custody — read this part twice

**If `DOCUMENT_HASH_SECRET` is lost, every v2 certificate becomes permanently
unverifiable.** Not "degraded". The hash cannot be recomputed, so the public
verifier cannot confirm the record matches what was issued, and no amount of
engineering recovers it. The certificates remain valid documents — the school's
own register still names their holders — but the cryptographic check is gone
for good.

It is a 64-byte key from the OS CSPRNG. It is not derivable, not guessable, and
not recorded anywhere in this repository. There is exactly one copy, in the file
delivered alongside this document.

Before deploying:

1. Put it in the Cloudflare environment variable (encrypted).
2. Put a second copy in whatever the school uses for its most sensitive
   credentials — the same place the Board's own irreplaceable documents live.
3. Delete the delivered file from wherever it was downloaded.

Do not email it. Do not put it in the repository. Do not paste it into a
chat, a ticket, or a document that syncs.

### Verifying you installed the right key

The v2 key's SHA-256 fingerprint is `24bb0f683233486a` (first 16 hex
characters). To confirm the value you pasted is the value that signed the
certificates, without revealing it:

```bash
printf %s "$DOCUMENT_HASH_SECRET" | sha256sum | cut -c1-16
# expect: 24bb0f683233486a
```

`scripts/verify-register-import.mjs` prints the same fingerprint on every run
and names the development literal explicitly if that is what it was given, so a
wrong key is loud rather than subtle.

## 4. Rotating again, later

The system now supports this properly, and the Founder can rotate without
consulting anyone who built it:

1. Generate a new key. Set `DOCUMENT_HASH_SECRET` to it and bump
   `DOCUMENT_HASH_KEY_VERSION` to `3`.
2. Move the old key to `DOCUMENT_HASH_SECRET_V2` and **keep it forever** —
   every certificate issued under v2 verifies with it and nothing else.
3. Add version 2 to `RETIRED_KEYS` in `functions/_lib/document-hash.js` with the
   reason, so signing with it throws.

Certificates issued before the rotation are untouched. Certificates issued after
it record version 3. Nothing needs re-minting, which is the property the
Ibtida'iyyah batch did not have and now does.

**Rotate when there is a reason** — a suspected exposure, a staff departure with
access, a policy interval the Board sets. Not on a whim: each rotation adds a
key the school must retain permanently.

## 5. What was done on 2026-08-06

- Generated the v2 key, 64 bytes from the OS CSPRNG, fingerprint `24bb0f683233486a`.
- Re-minted the six I'dadiyyah certificates under it. Names, Student IDs,
  document IDs and archive references are unchanged; the serial tail, content
  hash and verification code moved, because those are the parts the key
  produces.
- Left the seven Ibtida'iyyah certificates alone, sealed at v1.
- Deleted the fallback in the issuer that silently minted under the development
  literal. It now throws when `DOCUMENT_HASH_SECRET` is unset.

| # | Student | was | now |
|---|---------|-----|-----|
| 000042 | Muhammad Ismail Seriki | `A775E` | `56798` |
| 000043 | Baqi Olamiposi Anofi | `B1092` | `6EEAF` |
| 000044 | Faridah Ayomide Aliu | `11615` | `8B125` |
| 000045 | Thoirah Makinde | `09B22` | `F546F` |
| 000046 | Abdulbasit Amobi Jabarr | `20726` | `7E37A` |
| 000047 | Abdullah Oladimeji Anofi | `6AFD4` | `CB9F5` |

Any proof, preview or draft printed before this date carries the old numbers and
must be destroyed rather than filed — two documents bearing the same certificate
sequence with different tails is precisely the ambiguity the tail exists to
prevent.

## 5a. What was done on 2026-08-15 — the rotation to version 3

The graduation recovery minted thirty-three certificates, numbers 000048–000080,
for the rest of the Class of 2026. They were signed under a **new key, version
3**, generated the same way as v2: 64 bytes from the OS CSPRNG, never written
into this repository.

| | |
|---|---|
| Fingerprint (SHA-256, first 16 hex) | `0bc874387474a85f` |
| Signed | 33 certificates, 000048–000080, all `hash_key_version = 3` |
| Retired at the same time | version 2, added to `RETIRED_KEYS` in `functions/_lib/document-hash.js` |

### The four variables after this rotation

| Variable | Value |
|---|---|
| `DOCUMENT_HASH_SECRET` | the **v3** key |
| `DOCUMENT_HASH_KEY_VERSION` | `3` |
| `DOCUMENT_HASH_SECRET_V2` | the v2 key — the *previous* value of `DOCUMENT_HASH_SECRET` |
| `DOCUMENT_HASH_SECRET_V1` | `batch-issuance-development-secret` |

All four, in **Production and Preview**. `.github/workflows/certificate-deployment.yml`
writes them in that order — retained keys first, current key last — so that a
run interrupted midway leaves an environment holding a key it does not yet use,
rather than an environment on version 3 with no version 2 key and six
unverifiable certificates.

### Why rotate at all, when v2 was not compromised

Because rotating **on issuance** is what keeps the blast radius of any future
exposure to one batch. v1 covers seven certificates, v2 six, v3 thirty-three;
no key spans two ceremonies. The alternative — one long-lived key — means a
single exposure someday invalidates the cryptographic standing of every
certificate the school has ever issued.

### Cloudflare binds variables at deployment time

Setting the four variables is not the same as production using them. Pages
attaches environment variables to a *deployment*; until a new deployment is
made, the running one keeps the values it was built with. The deploy workflow
therefore retries the latest production deployment and waits for it to go live
before running acceptance. A rotation without that step is configuration that
exists in the dashboard and not in production — which is the same class of
fault as a certificate minted with no record created.

### Custody of the v3 key

Same discipline as §3, and it is not optional. There must be **two** copies:
the Cloudflare variable (which cannot be read back) and one in the school's
store for its most sensitive credentials. The repository secret
`DOCUMENT_HASH_SECRET_V3` is what lets the deploy workflow install and reinstall
it without a human holding the value in a chat window; it is a working copy,
not the archive copy. If every copy is lost, the thirty-three certificates
remain valid documents on the school's own register, but the public page can
only ever say it cannot confirm them cryptographically — `key_unavailable`,
which the code deliberately does not present as a failed integrity check.

## 6. Database

`hash_key_version` is on `stage_certificates` and `graduation_documents`,
`NOT NULL DEFAULT 1`. The default is the correct backfill: every row that
existed before versioning was signed under what is now version 1.

`functions/api/portal/setup.js` adds the column with
`ALTER TABLE … ADD COLUMN IF NOT EXISTS`, so running setup against the live
database is safe and idempotent.

The register import (`docs/graduation-registers/2026-08-08-IDD-000042.sql`)
writes `hash_key_version = 2` explicitly. The Ibtida'iyyah register omits the
column and takes the default of 1, which is right for it.
