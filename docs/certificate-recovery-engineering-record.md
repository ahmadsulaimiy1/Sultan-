# Certificate verification: what failed, why, and what now prevents it

**Sultan Hanafi Royal Schools — engineering record, August 2026**

This is written for whoever maintains this system next. It is not a governance
document and it assigns no blame; it records a class of failure that is easy to
reproduce and expensive to notice, and the specific machinery now standing
between this repository and a repeat.

---

## 1. The failure

On 8 August 2026 thirteen certificates were minted, printed, signed and handed
to children at a graduation ceremony. Every one of them carried a number, a
verification code and a QR code pointing at `shroyalschools.com/v/<serial>`.

None of them resolved. A parent scanning the QR on their child's certificate
was told the number was not on file.

The certificates were genuine. The documents were correct. What did not exist
was any **record** of them in the production database.

### Root cause

**Minting a document and creating its record were two separate acts, and only
the first was wired to anything.** `scripts/issue-certificate-batch.mjs` wrote
the certificate HTML, the print sheet and a register `.sql` file to `dist/`.
Applying that `.sql` to production was a manual step in a runbook. It was not
performed, and nothing anywhere failed when it wasn't.

That is the whole root cause. Everything below is why it stayed invisible.

### Why nobody noticed

Four independent reasons, and they compound:

1. **`dist/certificates/` is gitignored.** The register SQL was written to a
   directory that never enters version control, so there was no artefact whose
   absence from production could be spotted in a diff or a review.

2. **The success path printed a success message.** The issuer ended with a
   summary table of everything it had produced. It had produced all of it. The
   only thing wrong was that producing it was not the finish line, and nothing
   in the output said so.

3. **No end-to-end test existed against the live origin.** Every test in the
   repository ran against local data structures. A test that asks a real
   deployed URL a real question is a different category of test, and there
   wasn't one.

4. **The failure mode was silent on both sides.** The database had no rows to
   complain about. The endpoint answered "no record on file", which is the
   correct answer to a lookup for a certificate that has no record — it just
   happened to be the wrong answer about the world.

Later investigation found the fault was in fact deeper than a missed step: the
certificate **schema had never been applied to the production database at
all**. The table did not exist. Running the import by hand would have failed on
`relation "stage_certificates" does not exist`. So the manual step was not
merely skipped — it could not have succeeded.

---

## 2. Why repository forensics worked

The recovery reconstructed thirteen certificates that existed only as paper,
and it worked because of a property the system had by accident rather than by
design: **every value printed on a certificate is either in the repository or
derivable from something that is.**

- The **roll of names** was in the Registrar's Notice and the ceremony
  programme, both committed.
- The **numbers** came from a global sequence whose allocation was recorded in
  the issuing scripts' own roll data.
- The **content hashes** were recomputable, because `certificateHashFields()`
  in `functions/_lib/certificate-serial.js` is one function used by both
  issuance and verification. Had those been two implementations, the
  reconstruction would have produced hashes that disagreed with the paper and
  there would have been no way to tell which was right.
- The **printed tails** are the first five hex characters of that hash, so a
  correct reconstruction proves itself: if the recomputed tail matches the
  five characters engraved on the sheet, the reconstruction is right about
  every hashed field simultaneously.

That last point is the one worth internalising. The certificate is
**self-checking against the repository**. Recovery was possible because a
wrong reconstruction would have been loudly wrong rather than quietly
plausible.

The one thing forensics could **not** settle was whether a given physical sheet
had left the building. That question was answered separately, by asking
production which sequence numbers resolve (GitHub Actions run 31877681128:
34 and 48–90 NOT FOUND, only 35–47 present) — and one residual uncertainty was
recorded rather than argued away, because no amount of evidence in a repository
can prove what happened in a room.

---

## 3. What changed architecturally

### 3.1 Key versioning, and rotation on issuance

`DOCUMENT_HASH_SECRET` was originally a literal committed in the repository.
Anyone with repository access could compute a valid tail for an invented
number, so the self-authenticating property existed on paper and not in fact.

Rotating a secret with no version recorded would have made every
already-issued certificate report `integrity_check_failed` — the school
publicly branding its own genuine documents as forgeries. So each row records
the version that signed it, and verification dispatches on **that** version:

```js
function verificationKey(env, version) {
  const current = currentKeyVersion(env);
  if (version === current) return env.DOCUMENT_HASH_SECRET || null;
  return env[`DOCUMENT_HASH_SECRET_V${version}`] || null;
}
```

Those four lines are the structural guarantee that a rotation can never
invalidate history. `RETIRED_KEYS` makes the guarantee bidirectional: a retired
version may verify forever and **throws** if anything tries to sign with it.

The policy on top is to **rotate on issuance, not on a calendar**. v1 covers 7
certificates, v2 covers 6, v3 covers 33. No key spans two ceremonies, so the
blast radius of any future exposure is one batch rather than the institution's
entire history.

### 3.2 `{ ok, reason }`, not a boolean

`verifyDocumentHash` returns a reason, and two of them must never be conflated:

| reason | means | who must act |
|---|---|---|
| `mismatch` | the record does not match its signature | a real tamper signal |
| `key_unavailable` | the key for this row's era is not configured here | an operator |

A boolean would have collapsed a misconfigured preview deployment into
"tampering". The public page renders them differently and the audit log
records them separately.

### 3.3 The database is brought into agreement with the certificates

`scripts/build-production-import.mjs` lifts INSERT statements **verbatim** out
of the sealed registers as text and asserts the copy is byte-identical before
writing. It does not import the issuing code and does not know how a serial or
a hash is formed, specifically so that it *cannot* produce a value that
contradicts a printed document.

This is the direction the arrow has to point. A generator that recomputes is a
generator that can disagree with paper, and paper wins.

### 3.4 The Institution Credential ID

Every other identifier on a certificate row is unusable as a permanent internal
reference: the serial is engraved (so immutable, but it encodes a programme
code and a year and formats evolve), `id` is a database sequence that any
rebuild re-assigns, and `content_hash` is a function of a key that rotates.

The ICID is a UUIDv5 over the stored serial under a fixed namespace
(`functions/_lib/credential-id.js`). Derived, not random — a random UUID would
belong to whichever database inserted the row first, and the first
restore-from-registers would mint new ones while the audit log went on
referring to the old. It is written into the sealed registers at issuance, so
the repository is its authority; `verification_log.credential_id` is the first
consumer.

### 3.5 Effective-dated identity

One student is one student regardless of abbreviated, ceremonial, corrected or
Arabic names. `student_identity_names` holds every name an identity has carried
with the date each took effect — **and applies none of them to a certificate**.
An issued certificate keeps its engraved name forever; verification explains a
legitimate historical difference rather than rewriting it.

---

## 4. The safeguards, and what each one actually catches

| Safeguard | Catches |
|---|---|
| `.github/workflows/certificate-verification.yml` — weekly, asks the public endpoint | The original failure. It needs no secret, so it cannot be disabled by a missing credential, and it runs forever whether or not anyone remembers it. |
| `scripts/verify-certificate-acceptance.mjs` | Every printed identifier of every certificate, against the live origin. Reports **NOT VERIFIED LIVE** for a local run, so a rehearsal can never be mistaken for acceptance. |
| `scripts/staging/run.sh` — real Postgres, real endpoint code | Defects invisible in source. Two on its first run (below). |
| `scripts/staging/readiness-gate.mjs` — 12 checks | Uniqueness, immutability, rollback, key isolation — each **executed**, not asserted. |
| `sql/rollback-graduation-2026.sql` | One file, run by both the gate and the deploy workflow, so the rehearsed procedure is the executed one. |
| `.github/workflows/certificate-deployment.yml` | Partial key rotation (refuses); un-redeployed Cloudflare variables (redeploys and waits); a failed acceptance (rolls back automatically). |
| `scripts/preflight-graduation-coverage.mjs` | Everything the issuing pipeline checks, minus the signing — runnable without the key, so coverage questions are answered before anyone reaches for a credential. |

### What staging found that source review had not

Both were found by running the real endpoint against a real database on
15 August 2026, and neither was visible in the code:

1. **`verification_log`'s CHECK constraint omitted `key_unavailable`.** Every
   such lookup violated the constraint; `logVerification` catches and logs, so
   the write failed silently. Certificates checked by the public were leaving
   **no audit trail at all**.

2. **The same-child test was exact string equality.** No Student ID was shared
   among the thirteen, so it passed. After deployment eleven would be shared —
   three under name variants — and a parent scanning a genuine certificate
   would have got HTTP 409: *"That number matches more than one record."*

A third arrived while writing this document: a foreign key added to
`verification_log` referenced `stage_certificates`, defined ~900 lines later in
`sql/schema.sql`. `CREATE TABLE` failed, the harness had `2>&1 >/dev/null` on
the schema load, and staging came up reporting a healthy database with no audit
table in it. The harness now shows schema errors and hard-stops on a missing
table.

That is three defects from one habit: **run the real code against real rows.**

---

## 5. Rules that came out of this

1. **Producing a document is not issuing it.** The record and the document are
   created together or the operation has not happened. Any pipeline that ends
   at `dist/` is unfinished.
2. **Only a live HTTP request against the public origin counts as acceptance.**
   A passing local test proves the code is right given correct data. It proves
   nothing about production's data, secrets, or deployment.
3. **A number that has entered the real world is immutable.** The software
   adapts to history, not the other way round. Where the plan and a printed
   sheet disagree, the sheet is right.
4. **Never conflate an operator gap with a tamper signal.**
5. **Configuration that has not been deployed is not configuration.**
   Cloudflare Pages binds environment variables at deployment time; setting one
   without redeploying is the same shape of fault as minting without importing.
6. **A gate whose verdict depends on getting a regex right is testing the
   regex.** Check 9 was rewritten twice for this: it now signs, rotates, and
   asserts the *reasons* returned.
7. **State what a check did not prove, in its own output.** Check 9 says the
   V1/V2 hash recomputation is not proved in staging, because those keys are in
   the credential store. A PASS that quietly covers an untested thing is worse
   than a FAIL.
8. **Never hide the output of a step that can fail.** `>/dev/null 2>&1` on a
   schema load cost a day.

---

## 6. Where things live

| | |
|---|---|
| Hash fields, serial generation, printed-vs-stored | `functions/_lib/certificate-serial.js` |
| Key versioning, retirement, `{ok, reason}` | `functions/_lib/document-hash.js` |
| ICID derivation | `functions/_lib/credential-id.js` |
| Public verification endpoint | `functions/api/certificates/verify.js` |
| Sealed registers, imports, identity names, ICIDs | `docs/graduation-registers/` |
| Key custody and rotation procedure | `docs/certificate-key-deployment.md` |
| Staging harness, readiness gate, parser proof | `scripts/staging/` |
| Rollback | `sql/rollback-graduation-2026.sql` |
