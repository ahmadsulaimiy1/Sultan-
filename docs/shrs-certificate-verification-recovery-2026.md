# Live verification recovery — the thirteen issued certificates

**Founder's directive, 9 August 2026:** *"The issued certificates are the
authoritative documents. Do not regenerate, renumber, re-mint, modify, or
replace any already-issued certificate… The live database must be brought into
agreement with the certificates — not the certificates brought into agreement
with the database."*

Nothing in this procedure alters a certificate. No identifier is recalculated,
no cryptographic field is recomputed, and no number is re-issued. The thirteen
sheets in circulation are the authority; this brings the live system up to them.

---

## 0. The finding that changes the order of work

Running the real verification endpoint against a real database — not a
simulation of it — turned up a second requirement that the SQL import does not
satisfy and that would otherwise have produced a **worse** public answer than
the one being fixed.

The certificates were signed under **two different key versions**. The seven
Ibtidā'iyyah certificates (000035–000041) carry `hash_key_version = 1`; the six
I'dādiyyah certificates (000042–000047) carry version 2. The endpoint verifies
each row under **the key that signed it** — that is the whole point of key
versioning — and it resolves which key that is from the deployment's
environment.

Three configurations were tested against the real code. What the public page
would say differs completely:

| Cloudflare configuration | IBT 000035–000041 | IDD 000042–000047 | What a graduand sees |
|---|---|---|---|
| No key variables set | `key_unavailable` | `key_unavailable` | "Integrity check failed" on all thirteen |
| `DOCUMENT_HASH_SECRET` set, `DOCUMENT_HASH_KEY_VERSION` **not** set | **`mismatch`** | `key_unavailable` | Seven genuine certificates publicly reported as **not matching their signature** |
| `DOCUMENT_HASH_KEY_VERSION=2` + both keys set | **intact** | **intact** | "Genuine — active credential" |

The middle row is the dangerous one. With the version left unset it defaults to
1, so the endpoint checks the v1 Ibtidā'iyyah certificates against the *v2* key
and gets a mismatch — which the public page renders as *"Integrity check
failed — this record does not match its cryptographic signature."* That is an
accusation of forgery levelled at seven real children's documents, and it is
reached by a configuration that looks complete.

**Production therefore needs three variables, not one:**

| Variable | Value | Why |
|---|---|---|
| `DOCUMENT_HASH_KEY_VERSION` | `2` | Names the current signing version. Unset ⇒ defaults to 1 ⇒ the table's middle row. |
| `DOCUMENT_HASH_SECRET` | the production v2 key | Signs new certificates; verifies the six I'dādiyyah ones. |
| `DOCUMENT_HASH_SECRET_V1` | `batch-issuance-development-secret` | The **retired** key the Ibtidā'iyyah batch was signed under. It must never sign again — it is already public in this repository — but it must remain configured or those seven certificates never verify again. |

`DOCUMENT_HASH_SECRET_V1` is not a secret and does not need protecting: it is
the development literal already committed in plaintext, which is exactly why it
is retired. The production v2 key is a real secret and the standing rule holds —
never in the repository, never in chat, never in a log.

**Do the import and the key configuration in the same maintenance window.** The
import alone moves the public answer from "no such certificate" to "this
certificate does not match its signature", which is not an improvement.

---

## 1. The import

One file, generated from the two sealed registers and safe to run repeatedly:

```
docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql
```

Regenerate it any time with `npm run certificates:import`. The generator
(`scripts/build-production-import.mjs`) lifts each `INSERT` out of the sealed
register **as text** and asserts the copy is byte-identical before writing, so
it is structurally incapable of producing a value that differs from what is
printed on a sheet. It never imports the signing code and never recomputes a
serial, a hash, a document id or an archive reference.

What it adds around those untouched statements:

- **Idempotency.** `ON CONFLICT DO NOTHING` on every insert. The Student ID
  attachments are guarded by `identity_no IS NULL`, so they neither duplicate
  nor overwrite. Proven by running it three times against a real PostgreSQL 16
  and diffing a full data dump: **byte-identical, sequences included.**
- **A sequence repair that cannot go backwards.** Driven from
  `GREATEST(what is in the table, where the counter already stands)` rather
  than a bare `setval`.
- **One transaction**, so a failed run leaves nothing behind.
- **A verification block that makes `DO NOTHING` honest.** It re-reads all
  thirteen rows and aborts unless each one's serial, content hash, printed name
  **and** Student ID agree with the certificate. Tested by planting a row that
  occupies a real serial with the wrong child behind it: the import raised
  `IMPORT ABORTED — record content hash disagrees with the certificate` and
  rolled back.

### Numbering — the specific hazard

The two sealed register files each end with a plain `setval` to their own last
number. Run in the order IDD-then-IBT, that leaves the counter at **41**, and
the next certificate the Registrar issues is **000042** — a number already
engraved on Muhammad Ismail Seriki's document. This was reproduced, not
theorised:

```
SEALED files, IDD then IBT   -> sequence at 41  (next 42)   ← collision
PRODUCTION import, any order -> sequence at 47  (next 48)
PRODUCTION import onto a sequence already at 91 -> stays 91 ← never wound back
```

After the import the counter stands at **47** and the next certificate issued
is **000048**, as directed.

One honest note: PostgreSQL sequence operations are **not** transactional. If
the verification block aborts, the rows roll back but the counter stays where
`GREATEST` put it. That fails safe — a counter at 47 with nothing imported
still cannot re-issue 000035–000047.

### Running it

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql
```

It prints the before-state, the after-state, and a list headed
**`student record not linked`**. Any child on that list holds a certificate
that verifies correctly — the certificate row carries their Student ID — but
has no matching row in `students`, or is filed there under a different
spelling. Give that list to the Registrar's Office. **Do not edit the SQL to
force a match.**

---

## 2. Acceptance

A successful import is not acceptance. Acceptance is the public endpoint
answering correctly to what a holder actually asks it:

```bash
npm run certificates:accept -- --base https://shroyalschools.com
```

For all thirteen certificates it checks **nine identifiers each** — the full
serial, the engraved number with and without its check tail, the document id,
the archive reference, the verification code both as printed and ungrouped, the
Code 128-C archive barcode, and **the QR payload itself**, resolved through the
`/v/` route a phone camera follows. Each resolution is cross-checked against the
sheet: right serial, right engraved number, right child in English and Arabic,
right Student ID, right programme, right status, and **no grade** (the public
attestation must never carry one).

Then the failure battery, all of which must fail closed:

- nonexistent but well-formed SHRS number
- malformed / not an SHRS number at all
- empty reference
- correct number with the **wrong** anti-forgery check tail
- SQL-injection-shaped reference
- verification code one hex digit off
- a 15-digit number that is not a valid Student ID
- a Student ID naming several certificates → an index, never a verdict
- a tampered record → never an active credential *(scratch database only)*
- a revoked certificate → reports revoked *(scratch database only)*

The rule under test is single and absolute: **no unknown or ambiguous state may
present as a valid credential.** The public page prints "Genuine — active
credential" on exactly one condition, `status === 'active'`, so that is the
field asserted.

It sends only numbers already printed on documents in circulation, and against
`--base` it writes nothing.

---

## 3. What has been proved, and what has not

### Proved — against a real PostgreSQL 16, running the real endpoint

The rehearsal loads the actual `sql/schema.sql`, runs the actual import, and
calls `functions/api/certificates/verify.js` **unmodified** — a resolver hook
swaps only the database driver, because Neon's HTTP client cannot address a
local server. No test hooks, no re-implementation.

| | Result |
|---|---|
| Schema loads | 69 tables, no errors |
| Import, first run | 13 certificates, sequence 47, next 000048 |
| Import, runs 2 and 3 | database byte-identical — **idempotent** |
| Import onto a pre-wound sequence | counter never moved backwards |
| Import with a planted conflicting row | **aborted and rolled back** |
| Identifier resolution | **13/13 certificates, 9/9 identifiers each, including QR** |
| Cross-checks (name, Arabic name, Student ID, programme, engraved number) | all correct; no grade leaked |
| Failure battery | **10/10 fail closed** |
| Integrity attestation, key version 1 (IBT) | **7/7 intact → "active"** |
| Integrity attestation, key version 2 (IDD) | not exercisable here — the production key is not in this environment, and none was invented |

### Acceptance table — local rehearsal, 9 August 2026

| Certificate | Student | QR | Number Lookup | Record | Status |
|---|---|---|---|---|---|
| 000035 | Hameedah Adebimpe Ojewumi | PASS | PASS | PASS | active |
| 000036 | Aisha Anofi | PASS | PASS | PASS | active |
| 000037 | Abdulbasit Adedokun | PASS | PASS | PASS | active |
| 000038 | Naheemah Ismail | PASS | PASS | PASS | active |
| 000039 | Ashrof Akorede | PASS | PASS | PASS | active |
| 000040 | Imran Adegoke | PASS | PASS | PASS | active |
| 000041 | Abdulateef Adedokun | PASS | PASS | PASS | active |
| 000042 | Muhammad Ismail Seriki | PASS | PASS | PASS | NOT ATTESTED (v2 key absent here) |
| 000043 | Baqi Olamiposi Anofi | PASS | PASS | PASS | NOT ATTESTED (v2 key absent here) |
| 000044 | Faridah Ayomide Aliu | PASS | PASS | PASS | NOT ATTESTED (v2 key absent here) |
| 000045 | Thoirah Makinde | PASS | PASS | PASS | NOT ATTESTED (v2 key absent here) |
| 000046 | Abdulbasit Amobi Jabarr | PASS | PASS | PASS | NOT ATTESTED (v2 key absent here) |
| 000047 | Abdullah Oladimeji Anofi | PASS | PASS | PASS | NOT ATTESTED (v2 key absent here) |

The six I'dādiyyah rows resolve on every identifier and cross-check correctly
against their sheets. Only the final attestation is unavailable, because the v2
production key is not in this environment and **no substitute was fabricated** —
a rehearsal that invented a key would have reported all thirteen intact and
proved the opposite of what it claimed.

### NOT VERIFIED LIVE

**The live database was never queried and the live endpoint was never called.**
Outbound access to `shroyalschools.com` is refused by this environment's proxy
(`403 — Host not in allowlist`). That is the sandbox, not a fault on the site.

Everything above proves the **code and the procedure**. It proves nothing about
production: not its data, not its secrets, not its deployment. The status of
live verification is **NOT VERIFIED LIVE** until §2 has been run from a machine
that can reach the site and returns `ACCEPTED`.

---

## 4. The order of operations

1. Set the three variables in §0 on the Cloudflare Pages **production**
   environment. Redeploy so they take effect.
2. Run the import in §1 against the live database. Read the `student record not
   linked` list and pass it to the Registrar's Office.
3. Run the acceptance in §2 against `https://shroyalschools.com`.
4. Scan the QR code on one physical printed sheet with a phone, and confirm it
   lands on the same record. The harness resolves the QR *payload*; only a
   camera proves the printed code carries it.
5. Only then is verification fixed. Until step 3 returns `ACCEPTED`, the honest
   status is NOT VERIFIED LIVE.

**Do not release any further certificate that has not passed step 3.** A holder
whose number returns nothing — or worse, returns "does not match its
signature" — has been handed a document the school itself cannot confirm.

---

## 5. On the production key

The Founder's standing instruction stands and is reinforced here: never
hard-code it, never print it in chat or logs, deliver it as a secure deployment
file, and no production artefact may reference the development secret.

Two further points, both agreed:

- **Make at least two secure backups before deleting the delivered file.** Do
  not leave the only copy in a downloads folder or on a single device. If the
  v2 key is lost, the six I'dādiyyah certificates can never be attested again —
  they would resolve forever as "integrity check failed", and the only remedy
  would be revoking and re-issuing six documents already in children's hands.
- **`DOCUMENT_HASH_SECRET_V1` is the opposite case.** It is already public and
  needs no protection; it needs only to stay configured, permanently, for as
  long as any version-1 certificate exists. Removing it from the deployment
  would silently un-verify the seven Ibtidā'iyyah certificates.

Installing these in Cloudflare is the school's to do — that access is not
available from here, and the system is not live merely because the code is
correct.
