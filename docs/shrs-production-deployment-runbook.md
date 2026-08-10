# SHRS — Production Deployment Runbook

**Candidate release:** `ab1adbaf` on `claude/wec-institutional-design-kt3u0t`
**Internal baseline:** 277 automated checks across nine suites + a build gate
over 219 pages, all passing.
**Status of this document:** NOT YET EXECUTED. Every stage below is UNRUN.

This is the operational document for taking the frozen candidate into
production. It is not a feature plan. Nothing in it may be marked PASS on the
strength of a local test — a stage passes when it happens **in the production
environment, on real hardware, against real data**.

---

## 0. The standing rule, before anything else

> **Do not re-mint, renumber, redesign, or alter any already-issued
> certificate during this process.**

The thirteen issued documents (IBT 000035–000041 at `hash_key_version = 1`,
IDD 000042–000047 at version 2) are the authoritative artefacts. The database
is brought into agreement with them. If at any stage a certificate fails to
verify, the defect is in the database, the key version, or the verifier — never
in the document. Stop and diagnose; do not regenerate.

## 1. External prerequisites — all eight are UNMET

None of these can be done from the build environment. Each stays UNMET until
someone performs it and records the date and the person.

| # | Prerequisite | Owner | Blocks stages | Status |
|---|---|---|---|---|
| 1 | Production Ed25519 key pair generated on a trusted machine | Founder | 2, 3, 9 | ☐ UNMET |
| 2 | Live certificate database records for all thirteen issued documents | Founder / DBA | 1, 7, 12 | ☐ UNMET |
| 3 | Six GitHub secrets configured (see §2) | Founder | 1, 3, 4 | ☐ UNMET |
| 4 | A real printed certificate QR code, physically to hand | School office | 5, 6 | ☐ UNMET |
| 5 | An Android device with Chrome, on Nigerian mobile data | Tester | 6, 8–12 | ☐ UNMET |
| 6 | Yoruba linguistic review by a named speaker | Founder to appoint | — (release note) | ☐ UNMET |
| 7 | French linguistic review by a named speaker | Founder to appoint | — (release note) | ☐ UNMET |
| 8 | The offline key-material decision (`docs/shrs-offline-key-material-decision.md`) | Founder | portal offline layer only | ☐ UNDECIDED |

Prerequisite 8 does **not** block the certificate chain below. The portal
offline layer stays inert until it is settled, and the portal continues to work
exactly as it does today. The chain in §3 can run without it.

## 2. The six secrets

Fail-closed, all of them: a missing secret stops the job rather than producing a
degraded artefact. None appears in source, logs, generated documentation,
bundles, test fixtures, build output, or chat.

| Secret | Used by | If missing |
|---|---|---|
| `DATABASE_URL` | import, acceptance, register | job stops |
| `DOCUMENT_HASH_SECRET` | live verification (v2) | job stops |
| `DOCUMENT_HASH_SECRET_V1` | the seven IBT certificates | those seven fail integrity — **must be set** |
| `DOCUMENT_HASH_KEY_VERSION` | selects the current key | defaults to 1 — **must be set to 2** |
| `SITE_ORIGIN` | acceptance target | job stops |
| `CERT_REGISTER_PRIVATE_KEY` | register signing only | `build-certificate-register.mjs` refuses |

The third and fourth are the ones a reasonable person omits. Omitting them makes
the public page accuse seven genuine certificates of not matching their
signature. They are not optional.

**The private signing key never reaches:** the browser, the PWA, IndexedDB,
localStorage, any JavaScript bundle, the repository, or a downloaded file. The
client receives only the public verification key, pinned in
`js/shrs-certificate-offline.js`. `TRUSTED_KEYS` ships **empty** and every
register is refused until the real public half is pinned.

## 3. The production test sequence

Run in this order. A stage that fails stops the chain — do not proceed past a
FAIL to "check the rest".

| # | Stage | What PASS means | Result | Date | By | Notes |
|---|---|---|---|---|---|---|
| 1 | **Production database** | All thirteen certificate records present in the live database, matching the issued documents exactly — no renumbering | ☐ UNRUN | | | |
| 2 | **Production Ed25519 key** | Key pair generated on a trusted machine; private half in `CERT_REGISTER_PRIVATE_KEY` only; public half pinned in `TRUSTED_KEYS` | ☐ UNRUN | | | |
| 3 | **Signed certificate manifest** | `build-certificate-register.mjs` produces a signed, non-empty register; signature verifies against the pinned public key | ☐ UNRUN | | | |
| 4 | **Deployed verifier** | The build reaches production with the public-site gate green; `/verify-certificate/` loads from the real origin | ☐ UNRUN | | | |
| 5 | **Real certificate QR** | A physically printed certificate's QR code is present and legible | ☐ UNRUN | | | |
| 6 | **Real Android camera** | Android Chrome opens the camera and `BarcodeDetector` decodes that printed code to a reference | ☐ UNRUN | | | |
| 7 | **Online verification** | The live endpoint returns a positive verdict for that reference, with the content hash matching | ☐ UNRUN | | | |
| 8 | **Disconnect Internet** | Aeroplane mode on the handset; the app is genuinely offline, not merely idle | ☐ UNRUN | | | |
| 9 | **Offline verification** | The on-device register answers **"Recorded as issued by the school"** — and **never** "Genuine" | ☐ UNRUN | | | |
| 10 | **Reconnect** | Connectivity returns; the interface moves from offline to online state without a manual reload | ☐ UNRUN | | | |
| 11 | **Synchronisation** | The outbound queue drains; every operation ends synced, conflict or failed — none silently dropped | ☐ UNRUN | | | |
| 12 | **Live verification again** | The same reference verifies live a second time, post-reconnect, with the same verdict as stage 7 | ☐ UNRUN | | | |

### Stage 9 is the one that matters most

It is the only stage where a wrong result is worse than a failure. The offline
answer must be **weaker** than the online one. If stage 9 ever produces the word
"Genuine", that is a critical defect, not a success — stop, and treat it as a
breach of the security rule in §5.

### Alongside the chain — Android Chrome coverage

Not part of the twelve, but required before anyone describes the PWA as
real-device tested. Record separately:

| Check | Result | Notes |
|---|---|---|
| Installation to the home screen | ☐ UNRUN | |
| Cold launch from the home screen, offline | ☐ UNRUN | |
| Reload while offline | ☐ UNRUN | |
| Navigation between cached pages, offline | ☐ UNRUN | |
| Language switching offline (EN / AR / YO / FR) | ☐ UNRUN | |
| RTL correctness in Arabic on a real screen | ☐ UNRUN | |
| IndexedDB persistence across a genuine app restart | ☐ UNRUN | |
| Session expiry at twelve hours | ☐ UNRUN | |
| Behaviour on Nigerian mobile data — high latency, intermittent loss | ☐ UNRUN | |

Desktop Chromium is already covered by the automated suites. That is
**browser-tested**. It is not **real-device-tested**, and the two are not
interchangeable: Android Chrome's service-worker lifecycle under memory pressure
is more aggressive than desktop, and installation, home-screen launch and camera
access exist only on a device.

## 4. If a stage fails

1. **Diagnose before changing anything.** Distinguish a defect in the candidate
   from a mis-set secret, a missing database record, or a harness artefact. All
   three have happened before in this programme, and "fixing" correct code
   because a harness lied is the expensive mistake.
2. **Fix the defect**, not the symptom, and not the certificate.
3. **Re-run the relevant regression suite in full** — not the single check that
   caught it:

   | Area touched | Re-run |
   |---|---|
   | Certificate register, signing, verification | `test:certificate-offline` + `build-certificate-register.mjs --selftest` |
   | QR scanning | `test:qr` |
   | Offline shell, service worker, navigation | `test:offline:shell` |
   | Device store, records, freshness, eviction | `test:offline` + `test:search` |
   | Sync engine, conflicts, registry, server half | `test:sync` + `test:sync:lifecycle` + `test:sync:operations` |
   | Portal offline layer, redaction, wording | `test:portal-offline` |
   | Anything touching a page, partial, or dictionary | `npm run build` (the gate) |

   When in doubt, run all nine and the build. It takes minutes.
4. **Re-freeze at the new commit** and record it here, replacing `ab1adbaf`.
5. Only then resume the chain **from the failed stage**.

Two permanent regression checks must never be removed, whatever else changes:

- *An entry added after signing invalidates the whole register.*
- *A revocation cannot be quietly reversed on the device.*

The second caught a real signing-scope defect that would have let a revoked
certificate be flipped back to valid on a handset. It stays.

The public-site build gate is likewise permanent and runs inside `npm run
build`: a reintroduced merge conflict fails the build with a non-zero exit.

## 5. The security rule, restated for the field test

Uncertainty is never turned into a positive assertion. During the chain above,
each of these must hold on the real device:

| Rule | Observable at |
|---|---|
| Unknown ≠ Genuine | stage 9 — `genuine` is `false` on every offline path |
| Offline ≠ Live verification | stages 7 vs 9 — different words, different tone |
| Cached ≠ Current | any offline page — the saved-copy stamp with a real date |
| Missing database record ≠ Invalid certificate | an unknown reference offline: *"This does not mean the certificate is false"* |
| Unverified ≠ Forged | an unpinned or stale register: a verdict on the register, not the document |

## 6. What may be said, and when

- **Now:** "offline-verification-**ready**". The mechanism is built and tested;
  no part of it has reached production.
- **After stages 1–4:** "deployed". Not "verified live" — deployment is not a
  verdict.
- **After stages 1–12 all PASS, plus the Android Chrome table:** "offline
  certificate verification is **live**, and has been tested end to end on a real
  device."

Until that entire chain succeeds, no one should announce the third.

## 7. Sign-off

| | Name | Date | Signature |
|---|---|---|---|
| Chain executed by | | | |
| Results verified by | | | |
| Release accepted by (Founder) | | | |
