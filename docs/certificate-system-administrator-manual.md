# Certificate System — Administrator Manual

**Sultan Hanafi Royal Schools Certificate Management & Verification System**
**Production Release v1.0 · Design Frozen · Verification Standard Locked**

---

## How to read this

This manual exists so that an administrator who has never met anyone who built
this system can operate it correctly. Everything here is derived from the code
that actually runs, with file and line references, so it can be checked rather
than believed. Where a procedure has a failure mode, the failure mode is stated
rather than omitted.

It does not repeat what other documents already hold:

| For | Read |
|---|---|
| What is frozen, and what a freeze does and does not promise | `shrs-certificate-master-freeze-declaration.md` |
| Installing and rotating the signing key | `certificate-key-deployment.md` |
| Printing: trim, bleed, inks, ICC | `certificate-press-specification.md` |
| Typography and layout law | `shrs-certificate-editorial-bible.md` |
| Registrar's Office generally | `registrar-office.md` |

**One rule governs everything below.** The certificate is a permanent document.
Anything that changes a number already engraved on paper is not a fix — it is
the creation of a second document bearing the same claim. When in doubt, do not
re-issue; investigate.

---

## 1. Certificate numbering

There are **two forms of the same number**, and the difference matters.

```
stored    SHRS-CERT-IDD-2026-000042-56798
printed   SHRS-CERT-IDD-000042-56798
```

Exactly one segment is removed for print: the issue year. The Editorial Bible
asks the document to read as timeless. Everything else is retained.

| Segment | Meaning |
|---|---|
| `SHRS-CERT` | fixed prefix |
| `IDD` | programme code (`IBT` Ibtida'iyyah, `IDD` I'dadiyyah) |
| `2026` | issue year — **stored only, never printed** |
| `000042` | position in the global certificate sequence |
| `56798` | anti-forgery tail |

**The sequence is global.** `stage_certificate_serial_seq` issues one number
once, ever, across every programme and every year. Number 000042 exists exactly
once in the institution's history. This is why dropping the year from the
printed form is safe, and why a new cohort continues from where the last one
ended rather than restarting.

**The tail is not decoration.** It is the first five hex characters of that
certificate's own HMAC-SHA256 over its canonical fields
(`certificate-serial.js`, `suffixFromHash`). A forger can invent a plausible
sequence number; they cannot compute a matching tail without the signing key.
A verifier holding the paper can compare the tail against the verification
plate's printed code — whose first five characters *are* this tail — with no
database at all.

An earlier revision printed `SHRS-CERT-IBT-000035`, dropping the tail along with
the year because a worked example in a directive happened to omit it. That
mistook the example for the specification and removed the number's only
self-checking property. Do not "simplify" the format back.

**Typing it back in.** `resolveStageCertificateRef` accepts the full stored
serial, or the printed form with or without the tail — someone reading a worn
document should still reach the record. But a *supplied* tail is treated as a
constraint that must match, never as a hint: a wrong tail finds nothing. That is
the anti-forgery property working at lookup time.

## 2. Student ID generation

Fifteen digits, nothing else. `identity-no.js`, `formatStudentIdentityNo`.

```
71 │ 745524375997 │ 4
▲       ▲           ▲
│       │           └ Luhn check digit
│       └ keyed permutation of the identity sequence
└ institution code, fixed — distinguishes students from the staff series
```

The body is `(seq × 324453718779 + 118468187279) mod 10¹²`.

The multiplier is coprime to 10¹² and adding a constant is itself a bijection,
so the whole map is a **bijection**: distinct sequence values cannot collide,
and the institution can reverse it to recover the record from the ID. A hash
would not allow that.

It is also **non-adjacent**: consecutive intakes land about 324 billion apart,
so two cards side by side reveal nothing about cohort size or join order. That
is deliberate. The two earlier formats — `SHRS-<YYMMDD>-<seq6>` and
`SHRS-STU-<YYYY>-NG-<seq6>` — both published a date and an unpadded queue
position, which is exactly what this replaced.

The offset is not cosmetic. A pure `seq × MULT` does not wrap until `seq`
exceeds `10¹²/MULT`, so early students would inherit the multiplier's digit
structure wholesale.

**Permanence.** A student's ID is assigned once and never changes — not on a
change of school, class or campus. Numbers already issued in the two retired
formats stay exactly as issued and remain resolvable. Permanence beats format
uniformity. Regeneration exists only as an explicit, admin-only bulk action and
should be treated as a last resort.

Letter- or name-derived numbering was considered and **declined**: collision-prone,
trivially reproducible, and not how ministries or banks build permanent
identifiers.

## 3. Document identifiers

Four further identifiers are printed on every sheet. All derive from the
certificate row's own `id`, which is why they cannot drift apart.

| Identifier | Shape | Example |
|---|---|---|
| Document ID | `DID-<YYYY>-<PROG>-<id7>` | `DID-2026-IDD-0000042` |
| Archive reference | `ARCH/<PROG>/<YYYY>/<id6>` | `ARCH/IDD/2026/000042` |
| Code 128-C barcode | `<YYYY><id6>` | `2026000042` |
| Verification code | first 12 hex of `content_hash`, in fours | `5679-8B4D-…` |

The barcode and the archive reference deliberately share one 6-digit run. They
did not always: the eye read `ARCH/IBT/2026/0000001` (padded to 7) while the
scanner read `202600000001` (padded to 8) — one record, two identifiers. Both
now derive from the same run, which also gives the even-length numeric payload
Code 128-C requires.

**The `id` sequence therefore matters operationally.** If
`stage_certificates.id`'s sequence is not advanced past an imported batch, the
next certificate issued through the Registrar UI gets an id already in use, and
its barcode and archive reference decouple from its certificate number. The
register SQL emits the `setval` for this, and
`scripts/verify-register-import.mjs` asserts it.

## 4. Verification architecture

### What the public can submit

Five identifiers are printed on the sheet, and **all five resolve to the same
single row**:

1. Certificate number — stored or printed form, with or without the tail
2. Student ID — 15 digits
3. Verification code — dashed or undashed
4. QR code — encodes `https://shroyalschools.com/v/<serial>`
5. Code 128-C barcode — 10 digits

Plus the Document ID and archive reference, which are also printed.

The QR uses the short `/v/` path and the apex host on purpose. At the fixed
17.2 mm printed size, the long form pushed the symbol to a 53×53 grid — 3.83 px
per module at 300 DPI, below what a phone camera needs, and measured, one
certificate in seven failed to decode. `/v/` drops the payload from 86 to 60
characters and the symbol to 45×45, giving 4.51 px per module. `_redirects`
maps `/v/*` onto the verification page. **This is load-bearing. Do not
"tidy" it.**

### Behaviour that must not be softened

- **Fail closed on multiplicity.** Two rows matching one document identifier is
  a data-integrity fault, not a UX problem. The endpoint returns HTTP 409 rather
  than guessing.
- **A Student ID is different.** It identifies a *person*, and a student may
  legitimately hold both an Ibtida'iyyah and an I'dadiyyah certificate. That
  returns an index of credentials, each with its own status — never a verdict on
  any one of them.
- **The badge is a whitelist.** Only `status === 'active'` renders green. Any
  status the page has not been taught renders as unrecognised. This was once a
  blacklist, and adding one status to the API was enough to make an unverified
  record display as "Genuine — active credential" to the public.
  `scripts/test-verify-page-badges.mjs` guards it, including a status that does
  not exist — the case that catches the next one added.
- **The grade is never public.** `grade_en` is stored and hashed; it is returned
  by no public code path. Performance belongs to the Transcript, not the
  certificate. `scripts/verify-register-import.mjs` asserts it on every run.
- **`key_unavailable` is not `mismatch`.** A retired key missing from the
  environment is an operator's problem. Reporting it as an integrity failure
  would publicly accuse genuine documents over an unset variable.

### Integrity

On every lookup the system recomputes the HMAC from the row as stored and
compares it to `content_hash`, timing-safely, **using the key recorded on that
row** (`hash_key_version`). It also checks that the serial's printed tail
derives from that hash. Either failing means the document or the record changed
after issuance.

## 5. Key rotation

Full procedure: `certificate-key-deployment.md` §4. In short:

1. Generate a new key. Set `DOCUMENT_HASH_SECRET` to it; bump
   `DOCUMENT_HASH_KEY_VERSION`.
2. Move the old key to `DOCUMENT_HASH_SECRET_V<old>` and **keep it forever**.
3. Add the old version to `RETIRED_KEYS` in `document-hash.js` with the reason.

Certificates issued before the rotation are untouched and keep verifying.
Nothing is re-minted. Signing with a retired version throws.

Rotate for a reason — suspected exposure, a departure with access, a Board
interval — not on a schedule for its own sake. Each rotation adds a key the
school must retain permanently.

## 6. Secret recovery

**There is none. Read this section before you need it.**

If `DOCUMENT_HASH_SECRET` for a version is lost, every certificate signed under
that version becomes permanently unverifiable. The hash cannot be recomputed.
No amount of engineering recovers it, because the key is 64 bytes of CSPRNG
output with no derivation and no escrow.

The certificates remain valid *documents* — the school's own register still
names their holders, and the Registrar's record is unaffected. What is lost is
the cryptographic check: the system can no longer prove the record matches what
was issued, and the printed tail can no longer be validated.

Because there is no recovery, there is only prevention:

- Every key version lives in **two** places: the Cloudflare environment, and the
  school's secure archival store alongside the Board's irreplaceable documents.
- Verify the installed key by fingerprint rather than by eye — see §5 of the
  deployment document. The current v2 fingerprint is `24bb0f683233486a`.
- **Never delete a retired key.** Retirement means "may not sign", not "may be
  discarded".

If a key is believed lost, do not rotate in the hope of fixing it — rotating
does not restore the old key, and the certificates signed under it stay
unverifiable. Establish first whether any copy survives.

## 7. Emergency revocation

Revocation is per-certificate. There is no bulk revoke, deliberately.

**Who.** A staff member holding permission `certificates` level `C` at the
issuing institution. Anyone else receives 403.

**How.** Registrar's Office → certificate register → revoke. The action requires
**both** the serial number and a revocation note; the endpoint refuses without
the note. It only affects a certificate that is currently active, so a second
revocation of the same document returns 404 rather than silently rewriting the
timestamp.

**What it does.** Sets `revoked_at = now()` and stores the note, and writes a
`sensitive_action` entry to the staff audit log carrying the actor, the target
and the reason.

**What the public then sees.** Status `revoked`, the badge in the revoked
treatment, and the revocation note itself. The record is *not* hidden. A
verifier asking about a revoked certificate gets a clear answer, which is the
entire purpose — silently returning "not found" would be indistinguishable from
a forgery and would leave the holder unable to learn what happened.

**What it does not do.** It does not delete anything, does not free the
certificate number for re-use, and does not alter the hash. The document remains
in the register permanently.

**Emergency sequence.** If a certificate must be withdrawn urgently:

1. Revoke it, with a note that will still make sense to a stranger in ten years.
   Cite the authority for the decision.
2. Record the decision in the Governance Resolution Register.
3. Do **not** issue a replacement under the same number. If a corrected
   certificate is required, it is a new issuance taking the next sequence
   number, and the revocation note on the old one should name the replacement.

## 8. Backup and restoration

Three categories, with genuinely different requirements.

**Irreplaceable — back up, verify the backup, never rely on one copy.**

| What | Why |
|---|---|
| `DOCUMENT_HASH_SECRET` (all versions) | §6. No recovery exists. |
| The live database | Holds every issued certificate. The register files can re-seed a batch but not subsequent live issuance, revocations or the verification log. |
| The Founder's original artwork | `official-background-master.jpg`. The supplied source; everything else derives from it. |

**Reproducible — from the repository, exactly.**

The press PDF, the 600 DPI previews, the per-student HTML, and the register in
all three formats regenerate byte-identically from
`scripts/issue-certificate-batch.mjs` **given the same signing key**. The key is
what makes this reproducible rather than approximate. Without it, a regenerated
batch has different numbers and is a different batch.

`dist/certificates/` is gitignored — deliberately, since the artefact set runs
to roughly 245 MB. Do not attempt to commit it. Archive it to the school's
storage and keep the SHA-256 manifest with it.

**Recoverable from version control alone.** All source, all documentation, the
frozen master, every gate.

**Restoration drill.** Test the restore path before you need it: take the
archived register SQL, import it into a scratch database, and run
`scripts/verify-register-import.mjs` with the production key set. If it reports
all checks passed, the backup is genuinely restorable. A backup that has never
been restored is a hypothesis.

## 9. Release workflow

**Before anything is issued or shipped**, every gate must pass:

```bash
node scripts/verify-certificate-master.mjs --strict      # the frozen master is intact
node scripts/verify-certificate-batch.mjs <batch-dir>    # the batch is internally correct
node scripts/verify-register-import.mjs                  # the register is importable
node scripts/test-verify-identifiers.mjs                 # all printed identifiers resolve
node scripts/test-verify-page-badges.mjs                 # no unknown state reads as genuine
node scripts/verify-certificate-ground.mjs               # vector paint and stroke floors
node scripts/verify-certificate-plate.mjs                # plate geometry
python3 scripts/verify-plate-single-seal.py              # exactly one seal on the sheet
python3 scripts/verify-certificate-codes.py <pdf> <json> # QR + barcode decode from the real PDF
```

`verify-register-import.mjs` needs `DOCUMENT_HASH_SECRET`,
`DOCUMENT_HASH_KEY_VERSION` and every `DOCUMENT_HASH_SECRET_V<n>`. It prints the
key's fingerprint and names the retired development literal explicitly if that
is what it was given.

The gates answer two different questions and both are needed. `verify-certificate-*`
asks *is this batch correct?* — and would still pass on a redesigned sheet.
`verify-certificate-master.mjs` asks *is this the same master?* That gap is the
one the freeze closes.

**Branch and merge.** Work on a feature branch, never directly on `main`.
`main` is what deploys. Merge with `--no-ff` so the release is a single
identifiable commit, tag it, and push the tag.

**Versioning policy — binding from v1.0.**

Do not modify, in v1.0: the certificate layout, the numbering algorithms, the
verification logic, or the document identifier shapes.

Any enhancement is a **new version** — v1.1 or v2.0 — with a documented
migration procedure and its own freeze declaration. Certificates already issued
must continue to verify exactly as issued, which is what key versioning and the
sealed-batch rule already provide the machinery for.

Re-baselining the freeze manifest is an editorial act, not a command. The gate
has no `--update` flag for this reason. Amend §2 of the declaration, record the
reason in the amendments table, and do it in the same commit as the change.

## 10. Registrar operating procedures

### Issuing a new graduating cohort

1. **Confirm the roll with the Founder in writing.** English names are
   authoritative.
2. **Confirm the Arabic spellings.** Arabic is never generated, transliterated
   or guessed by this system. Where a spelling has been approved before, it is
   carried across verbatim rather than re-derived — the last time the pipeline
   re-derived Arabic it "improved" seven approved spellings. A name with no
   approval on record stays off the register and is printed as outstanding until
   the Founder rules on it.
3. **Add the batch** to `BATCHES` in `scripts/issue-certificate-batch.mjs`.
   `firstCertificateSeq` continues the global sequence — it does not restart.
   The script refuses to run if two batches claim overlapping numbers.
4. **List the withdrawn roll**, including students on other stages. A student
   appearing on the wrong stage's sheet is the same class of error as a
   withdrawn one: the wrong award over the right name. The script refuses if a
   guard collides with a current student.
5. **Issue** with the production key set in the environment. The script fails
   closed if it is not.
6. **Run every gate** in §9.
7. **Print proof** on production stock before the run. Some things no gate can
   check: the latent image under a photocopier, whether 0.07 mm hairlines fill
   in on this paper, the gold foil's serifs at reading distance.
8. **Import the register**, then verify at least one certificate by all five
   identifiers against the live site.

### Do not

- Re-run the issuer for a batch that has already been issued. Batches carry
  `sealedAtKeyVersion` once issued and the script refuses — but understand *why*
  rather than relying on the guard: the hash is the printed serial tail, so
  re-minting changes a number already in circulation.
- Edit a generated register by hand. Change the issuer and regenerate; the gate
  asserts the published copy is byte-identical to the issuer's output.
- Print anything from a draft or superseded batch. If numbers have moved,
  destroy the old proofs rather than filing them. Two documents bearing the same
  sequence number with different tails is precisely the ambiguity the tail
  exists to prevent.

### Answering a verification query

Anyone may verify without an account, at `/verify-certificate/`. Staff should
know how to read the four outcomes:

| Result | Means |
|---|---|
| Genuine — active credential | The record exists, the hash matches, the tail derives from it. |
| This credential has been revoked | Genuine, and withdrawn. The note explains why. |
| Integrity check failed | The record does not match its signature. **Escalate — do not explain it away.** Either the record was altered, or the wrong key is configured. |
| No certificate found | Nothing matched. Check for a transcription error before concluding anything. |

If a holder reports a genuine certificate showing as not found, check first
whether the identifier was mistyped, then whether the batch was imported, and
only then treat it as a fault.

---

## Appendix — the standing rules

These have been reaffirmed by the Founder across the project and are not
engineering preferences:

- The **grade** appears neither on the certificate nor on public verification.
- Arabic is right-aligned, never clipped, never forced left-to-right.
- No fictional logos, names, slogans or institutional claims. Nothing appears on
  a certificate that has not been officially approved.
- Arabic names are never generated. Unapproved spellings stay pending.
- The v1.0 master is frozen. Only student data changes.

## Appendix — honest limits of this release

Stated so that no future administrator mistakes an untested path for a verified
one:

- **No live end-to-end test has been run.** Every result in this manual was
  obtained offline against fixtures, the real register files, and the real press
  PDF. The deployed system has not been exercised against a live database from
  the build environment.
- **PDF/X conversion is not complete.** It requires the printer's ICC profile.
  `scripts/make-pdfx.py` is parameterised on it and refuses clearly without it.
  Ask the printer specifically about **PDF/X-4** — the artwork uses live
  transparency that X-1a and X-3 forbid and that flattening visibly destroys.
- **The v1.0 tag could not be pushed from the build environment** (HTTP 403 on
  tag push). The annotated tag must be created from a machine with tag
  permissions, against the release merge commit on `main`.
- **The locked background artwork is 92 DPI.** This is the supplied source
  file's own resolution, not something the pipeline degraded, and it cannot be
  raised without the original layered artwork. Everything else on the sheet —
  the paper, the guilloché, the microtext, the frame — is true vector.
