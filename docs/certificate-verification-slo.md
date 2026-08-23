# Certificate verification — lifetime service level (mandatory)

**Founder's mandatory production requirement, 2026-08-23.** Recorded here
verbatim as the standing policy, with the implementation that satisfies each
clause named directly beside it — so a future reader (human or AI) can check
the code against the policy, not just take the policy's word for it.

> Every legitimately issued SHRS certificate shall remain verifiable
> throughout its entire institutional lifetime.

This is the objective every clause below serves. It does not expire, does
not need restating per task, and applies to every certificate SHRS has ever
issued or will ever issue.

## The requirements, and what satisfies each one today

**1. Every certificate already issued and printed must verify successfully
through the public verification system.**
Satisfied for all 16 currently-issued stage certificates (000035–000050) as
of 2026-08-23: the seven Ibtida'iyyah certificates (v1) and three
individually-issued certificates (v2, live key) verify on the ordinary
cryptographic path; the six I'dadiyyah certificates (000042–000047) verify
through Institutional Recovery — see Requirement 5 below and Governance
Resolution Register 9.5 for the incident this closed.

**2. Historical certificates shall never become unverifiable because of key
rotation, software updates, infrastructure changes, database migrations, or
deployment changes.**
`functions/_lib/document-hash.js`'s key-versioning (`hash_key_version` on
every row; `DOCUMENT_HASH_SECRET_V<n>` for every retired key) already made
rotation safe *by design* — the 2026-08-06/16 incident happened because that
design was bypassed, not because it failed. `scripts/verify-key-continuity.mjs`
(§7 of `docs/certificate-key-deployment.md`) is the check that makes a bypass
loud instead of silent: run it after every deploy that could touch either
environment variable.

**3. The verification service shall automatically determine the correct
verification path for every certificate based on its immutable metadata.**
`functions/api/certificates/verify.js`'s `stageCertificateState()` already
does this: `hash_key_version` (on the row, immutable once written) selects
the verification key; nothing about *which path* a certificate takes is
chosen by a human at verification time, only by what the row itself records.

**4. Every historical signing key, key version, and verification method
shall remain available or be securely archived so legacy certificates
continue to verify correctly.**
Where a key genuinely survives (has a second custody copy, or is the
known-public v1 development literal), install it as `DOCUMENT_HASH_SECRET_V<n>`
— it verifies forever, never signs again. Where a key does NOT survive —
Cloudflare secrets are write-only by design (`stromex/editorial-bible/16-ai-operating-constitution.md`
§16.15) and cannot be archived after the fact if nobody kept a second copy
before overwriting them — Requirement 5 is what this institution has
instead of the key, and it is not a lesser guarantee of *genuineness*, only
of *independent cryptographic re-proof*.

**5. If a cryptographic key is permanently unavailable, implement an
institutional recovery verification mechanism that clearly identifies the
certificate as a genuine institutional record while preserving full
auditability. Never silently fail.**
`certificate_recovery_attestations` (`sql/schema.sql`). A row here is a
deliberate, audited human act — naming who attested, when, why, and which
governance record backs the call — never something the verification code
grants itself. **This is deliberately narrow**: an unattested hash mismatch
under an available key stays `invalid`, exactly as it should, until a human
with the authority to make that call does so on the record. Widening this
into an auto-attest on any mismatch would trade the one property
tamper-evidence exists to guarantee for the exact convenience that
guarantee is supposed to withstand — see the table's own comment in
`sql/schema.sql`.

An unconfigured *retired* key (a version genuinely never installed, not a
mismatch under an available one) needs no manual attestation at all — it
is categorically never a tamper signal, since nothing a forger does can
produce it, and `stageCertificateState()` already resolves it to
`verified_institutional_recovery` automatically.

**6. Every certificate shall have exactly one verification outcome:
Verified / Verified through Institutional Recovery / Revoked / Invalid.
There shall never be a state where a genuine certificate simply reports
"cannot verify."**
`stageCertificateState()`'s `verificationOutcome` field is exactly this
four-value enum — `verified` | `verified_institutional_recovery` | `revoked`
| `invalid` — and nothing else. `js/certificate-verify.js` renders each with
its own badge (`.ok` / `.recovery` / `.revoked` / same), in both languages;
`scripts/test-verify-page-badges.mjs` and `scripts/test-recovery-attestation.mjs`
assert the mapping directly, including that an unattested mismatch never
silently becomes `verified` by any path.

**7. Before any new certificate issuance, run a complete regression
verification of every previously issued certificate.**
`scripts/verify-issued-certificates-live.mjs --base https://shroyalschools.com --db <postgres-url>`.
`--db` reads every non-revoked serial straight from `stage_certificates` —
not only the ones with a sealed register file — so a certificate issued
one at a time through the live Certificate Generation Centre is covered
too. **Run this, and confirm `PASSED`, before running any `issue-*-batch.mjs`
script or submitting a `generate_batch` roster.** A failure here on an
EXISTING certificate is Requirement 8, not something to work around by
issuing anyway.

**8. Any failure affecting previously issued certificates shall be treated
as a Priority 1 institutional incident and resolved before further
certificate issuance whenever practicable.**
Operational rule, not code: an `invalid` outcome on a certificate nobody has
attested is the signal. Resolving it means either restoring correct
verification (the key was found — Requirement 4) or recording a
`certificate_recovery_attestations` row with the real reason (Requirement
5) — never silencing the symptom another way, and never proceeding to new
issuance with a known, unresolved `invalid` outcome on the register unless
the Founder has explicitly judged it safe to defer.

## What this document is not

It is not a claim that this session ran the full battery live — this
session cannot reach `shroyalschools.com` at all (a DNS/network restriction
of its own environment), so `scripts/verify-key-continuity.mjs` and
`scripts/verify-issued-certificates-live.mjs` are built and unit-tested
against synthetic and real-but-non-production keys, never run against the
production host from here. Whoever next has that access should run both,
per Requirement 7, before the first of the 37 outstanding Class of 2026
certificates is minted.
