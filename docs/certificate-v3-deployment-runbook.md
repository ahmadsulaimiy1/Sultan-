# Deploying the Class of 2026 certificates — runbook

**Sultan Hanafi Royal Schools · 15 August 2026**

Everything below is done. Two acts remain, both requiring a person with
credentials this pipeline does not hold, and they are the whole content of this
document.

---

## Where things stand

| | |
|---|---|
| Version 3 signing key | **generated** — fingerprint `0bc874387474a85f`, delivered as a file, in no commit |
| Version 2 | **retired for signing** (`RETIRED_KEYS` in `functions/_lib/document-hash.js`); still verifies 000042–000047 forever |
| The 33 certificates | **minted**, numbers 000048–000080, contiguous, all at key version 3 |
| Sealed registers | **published** — seven files in `docs/graduation-registers/` |
| Production imports | **built** and byte-identical on regeneration |
| Readiness gate | **12/12 PASS** against the real minted output |
| Parser proof | **33/33 PASS**, negative control PASS |
| Staging suite | **120 pass, 0 fail**, 46 certificates in a real Postgres |
| Production database | **untouched** — still holds only the thirteen of 8 August |
| Cloudflare production | **unchanged** — still on key version 2 |

Nothing below can put a wrong number on a certificate. The numbers are already
fixed; what remains is making the records and the keys agree with them.

---

## Act one — install the V3 key

The key was delivered as a file. It is not in this repository and must never
be: version 1 was a literal committed here, and anyone with repository access
could compute a valid serial tail under it, which is why it is retired and why
the whole key-versioning apparatus exists.

**1. Store a copy where the Board's irreplaceable credentials live.**

Two copies must exist before the deployment runs. If every copy is lost, the
thirty-three certificates remain valid documents on the school's own register,
but the public page can only ever answer that it cannot confirm them
cryptographically — `key_unavailable`, which the code deliberately does not
present as a failed integrity check. No engineering recovers from that.

**2. Add it as a GitHub repository secret.**

*Settings → Secrets and variables → Actions → New repository secret*

| Name | Value |
|---|---|
| `DOCUMENT_HASH_SECRET_V3` | the file's contents, exactly — no quotes, no trailing newline |

**Leave `DOCUMENT_HASH_SECRET` alone.** It holds the version 2 key. The deploy
workflow reads it in order to write it to Cloudflare as
`DOCUMENT_HASH_SECRET_V2`, which is the only thing on earth that can verify the
six I'dādiyyah certificates 000042–000047.

**3. Confirm the value, without revealing it.**

```bash
printf %s "$(cat DOCUMENT_HASH_SECRET_V3.key)" | sha256sum | cut -c1-16
# expect: 0bc874387474a85f
```

**4. Delete the delivered file** from wherever it was downloaded and from
anywhere it was copied.

---

## Act two — put the workflow where it can be dispatched

GitHub only dispatches a `workflow_dispatch` workflow whose file exists on the
**default branch**. `.github/workflows/certificate-deployment.yml` is on
`claude/wec-institutional-design-kt3u0t`, so that branch must be merged to
`main` before the workflow appears or can be triggered by API.

---

## Then run it

*Actions → Certificate deployment → Run workflow*, with all three inputs left
at their defaults.

### What it does, in the authorised order

1. **Reports what it can and cannot do**, from secret presence alone. No secret
   value is printed anywhere in the workflow, including in error messages.
2. **Refuses a partial rotation.** With the version bumped and a retained key
   missing, the public page tells the holder of a genuine certificate that it
   cannot be confirmed. All four variables or none.
3. **Rotates Cloudflare production** — retained keys first, current key last, so
   a run that dies midway leaves an environment holding a key it does not yet
   use rather than six unverifiable certificates.
4. **Redeploys production and waits for it.** Pages binds environment variables
   at deployment time; a variable set without a redeploy is configuration that
   exists in the dashboard and not in production. That is the same shape of
   fault as minting a certificate without creating its record.
5. **Rebuilds both imports from the sealed registers** and refuses to continue
   unless they regenerate byte-identical to the committed files.
6. **Applies the schema and the four register files**, each in one transaction
   with its own end-of-file assertions.
7. **Asks the live public endpoint** about all 46 certificates — every printed
   identifier of every one, plus the QR payload. This step needs no secret,
   because it asks a public endpoint the questions a holder asks, so its
   verdict is the truth about production regardless of what the earlier steps
   did or skipped.
8. **Rolls back automatically on any failure**, running
   `sql/rollback-graduation-2026.sql` — the same file the readiness gate
   rehearsed against a staging clone, so the tested procedure and the executed
   procedure are the same text.

### Reading the result

The job summary carries a per-certificate table. Two failure words matter:

| | |
|---|---|
| `NOT RESOLVED` | the record is missing — the import did not apply |
| `NOT ATTESTED` | the record is right and a signing key is missing from the deployment — the rotation did not take effect |

A green run means 7 certificates verifying at key version 1, 6 at version 2 and
33 at version 3, all from the live public origin.

---

## After a green run

Three revocations remain, and they are the Registrar's act on the live system,
not this pipeline's: **000037, 000042, 000044**. They are recorded in
`docs/graduation-registers/reissue-plan-2026.json` and reported by
`scripts/preflight-graduation-coverage.mjs` on every run until executed.

Two children are omitted by ruling and are not gaps: **Sofiah Anofi**, for want
of a verified award and Arabic name, and **Muhammad Fatih**, by the Founder's
ruling of 15 August. Deleting either entry from
`scripts/build-canonical-roll.mjs` restores them the moment the institution
supplies what is missing. No certificate number has been spent on either.

---

## What is deliberately not in this repository

The signing key. Not this one, not any future one.

The five characters engraved on a certificate face are the head of an
HMAC-SHA256 over that certificate's own fields, keyed by this secret. That is
what makes the *printed* number self-authenticating: a forger can invent a
plausible sequence number but cannot compute a matching tail. Commit the key
and that property is gone for every certificate the school has ever issued and
every one it ever will — which is not a hypothetical, because it is precisely
what version 1 was, and why it may never sign again.

The repository holds the fingerprint (`0bc874387474a85f`), which proves a
pasted value is the right one without disclosing it. That is the correct thing
to keep here. The key belongs in Cloudflare, in the GitHub secret store, and in
the Board's credential store — three places, none of them a git history.
