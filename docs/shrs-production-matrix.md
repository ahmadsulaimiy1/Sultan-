# SHRS Offline Ecosystem — Final Production Matrix

**Candidate release:** `ab1adbaf` — **FROZEN**. No further features or
architectural changes unless a real deployment test exposes a defect.
**Date:** 10 August 2026 (revised — the three NOT BUILT items are now built)
**Automated gates:** 277 checks across nine suites, plus a build gate over 219
pages. All green.

Four statuses, kept apart on purpose:

- **COMPLETE** — built, tested, and nothing further is needed from anyone.
- **READY FOR DEPLOYMENT** — finished and green, waiting only to be deployed.
- **REQUIRES EXTERNAL ACTION** — cannot proceed without something only the
  Founder or a third party can supply.
- **NOT BUILT** — does not exist. Kept as a status so that "we have not written
  it" is never quietly absorbed into "it is waiting to deploy".

"Live tested" means **it ran against the production environment**. Nothing is
marked so, because nothing has. "Real device tested" means **a physical
handset**. Nothing is marked so either.

---

## 1. The matrix

| Capability | Implemented | Automated test | Live tested | Real device tested | Status |
|---|---|---|---|---|---|
| Offline shell | ✅ | ✅ 46 | ❌ | ❌ | READY FOR DEPLOYMENT |
| Offline navigation | ✅ | ✅ (in the 46) | ❌ | ❌ | READY FOR DEPLOYMENT |
| Local-first records | ✅ | ✅ 26 | ❌ | ❌ | READY FOR DEPLOYMENT |
| Synchronisation | ✅ | ✅ 31 + 15 | ❌ | ❌ | READY FOR DEPLOYMENT¹ |
| Conflict handling | ✅ | ✅ (in the 31 + 15) | ❌ | ❌ | READY FOR DEPLOYMENT |
| Offline documents | ✅ | ✅ 28 | ❌ | ❌ | READY FOR DEPLOYMENT |
| Certificate verification (offline) | ✅ mechanism | ✅ 20 | ❌ | ❌ | **REQUIRES EXTERNAL ACTION** ² |
| QR scanning (offline) | ✅ | ✅ 32 | ❌ | ❌ | READY FOR DEPLOYMENT (logic) · **REQUIRES EXTERNAL ACTION** (optics) ³ |
| Multilingual offline | ✅ | ✅ (EN/AR/YO/FR) | ❌ | ❌ | READY FOR DEPLOYMENT — **YO/FR need linguistic review** |
| Parent Portal (offline layer) | ✅ client | ✅ 40 | ❌ | ❌ | **REQUIRES EXTERNAL ACTION** ⁴ |
| Student Portal (offline layer) | ✅ client | ✅ (in the 40) | ❌ | ❌ | **REQUIRES EXTERNAL ACTION** ⁴ |
| Registrar Portal (offline layer) | ✅ client | ✅ (in the 40) | ❌ | ❌ | **REQUIRES EXTERNAL ACTION** ⁴ |
| Sync operation registry | ✅ 3 operations | ✅ 39 | ❌ | ❌ | READY FOR DEPLOYMENT⁵ |
| Public-site build gate | ✅ | ✅ 219 pages | ❌ | n/a | READY FOR DEPLOYMENT |

¹ The engine is complete and proven end to end, including a real browser
restart. `start()` is still not called from a page — see §9.

² Blocked on two external things. See §2.

³ Built: `js/shrs-qr-scan.js` turns a photograph into a reference and hands it
to whichever checker is honest — the live endpoint online, the on-device
register offline, which cannot return `genuine` on any path. 32 checks, real
camera lifecycle with a real `MediaStream`. What is **not** proven is the
optics: a headless browser has no lens, so no real printed code has been read
by a real camera. That half is a device test.

⁴ The client half is complete and tested (`docs/shrs-portal-offline.md`): the
parent, student and Registrar surfaces read through the device store, the policy
names what each view may keep, and the interface distinguishes "not saved on
this device" from "not yet recorded". It is **inert in production**, and
correctly so: no endpoint issues per-session offline key material, so the store
never unlocks and the portal behaves exactly as before — live or nothing. That
is fail-closed by construction and the test proves it. Issuing the material is a
security decision with a real trade-off, set out in §10 for the Founder.

⁵ Three operations: `adhkar.complete`, `message.reply`, `emergency.contact.save`
— two additive, one a real edit with a real 409 and no last-writer-wins. The
server grew a replay guard (`sync_operations`) and optimistic-concurrency
checking to earn the last two. See `docs/shrs-sync-engine.md` §9.

## 2. What only the Founder can unblock

**A. The production Ed25519 key pair.** One `openssl` command on a trusted
machine; the private half becomes the GitHub secret
`CERT_REGISTER_PRIVATE_KEY`; the public half is pinned in
`js/shrs-certificate-offline.js`. Full procedure in
`docs/shrs-certificate-offline.md` §6. `TRUSTED_KEYS` ships **empty** and every
register is refused until then — fail-closed, by design.

**B. The certificate records in the live database.** The recovery workflow
(`.github/workflows/certificate-verification.yml`) applies the schema, imports
the thirteen issued certificates (IBT 000035–000041, IDD 000042–000047), and
proves each one resolves through the real public endpoint. It waits on five
GitHub secrets. The register builder refuses to publish an empty register,
because every device would read that as "no certificate is recorded".

**The order is fixed:** records first, then keys, then register, then deploy.

## 3. Deployment secrets

Six, all fail-closed — a missing secret stops the job rather than producing a
degraded artefact. None appears in source, logs, documentation, bundles, test
fixtures, build output, or chat.

| Secret | Used by | If missing |
|---|---|---|
| `DATABASE_URL` | import, acceptance, register | job stops |
| `DOCUMENT_HASH_SECRET` | live verification (v2) | job stops |
| `DOCUMENT_HASH_SECRET_V1` | verification of the seven IBT certificates | those seven fail integrity — **must be set** |
| `DOCUMENT_HASH_KEY_VERSION` | selects the current key | defaults to 1 — **must be set to 2** |
| `SITE_ORIGIN` | acceptance target | job stops |
| `CERT_REGISTER_PRIVATE_KEY` | register signing only | `build-certificate-register.mjs` refuses |

The third and fourth are the ones a reasonable person would omit. Omitting them
makes the public page accuse seven genuine certificates of not matching their
signature. They are not optional.

## 4. Real-device testing — NOT DONE

Everything above was tested in **desktop Chromium**, headless, on Linux. That
is browser-tested. It is **not** real-device-tested, and the two are not
interchangeable:

- iOS Safari evicts IndexedDB after ~7 days of non-use and caps storage
  differently. The 7-day retention window was chosen partly for this, but the
  behaviour has not been observed.
- Android Chrome's service-worker lifecycle under memory pressure is more
  aggressive than desktop.
- Installation, the home-screen launch, and camera/QR access exist only on a
  device.
- Nigerian mobile data — high latency, intermittent loss — is the actual
  network this was designed for, and it has not been used once.

**Required before anyone says "offline verification is live":** Android Chrome
and one desktop Chromium, covering installation, offline launch, reload,
navigation, language switching, IndexedDB persistence across a real restart, QR
scanning, synchronisation, session expiry and reconnection.

## 5. Translations

Every dictionary now carries a `_reviewStatus` key stating its position
(stripped at build time, so it never reaches a page):

| Locale | Status |
|---|---|
| English | Reviewed — the institution's own language |
| Arabic | Reviewed in development; a final read by the Ra'ees is advisable |
| **Yoruba** | **TECHNICALLY IMPLEMENTED — LINGUISTIC REVIEW REQUIRED** |
| **French** | **TECHNICALLY IMPLEMENTED — LINGUISTIC REVIEW REQUIRED** |

The Yoruba orthography is applied correctly and the self-hosted Charis SIL face
renders the underdotted letters and tone marks properly. What has *not* been
confirmed is register, idiom and institutional tone. Remove the key when a
named speaker has reviewed it.

## 6. The security rule, and where each state lives

Uncertainty is never turned into a positive assertion. Each of these has an
explicit, truthful representation in the interface:

| Rule | Where it is enforced |
|---|---|
| Unknown ≠ Genuine | `shrs-certificate-offline.js` — `genuine` is `false` on **every** path |
| Offline ≠ Live verification | "Recorded as issued" vs "Genuine"; separate wording, separate tone |
| Cached ≠ Current | `sw.js` stamps the copy; `shrs-connectivity.js` prints the date and offers the live page |
| Missing record ≠ Invalid certificate | `not-in-register`: "This does not mean the certificate is false" |
| Unverified ≠ Forged | `register-untrusted` / `register-stale`: a verdict on the register, not the document |
| Not-found online ≠ Not ours | `verify.js` returns `referenceRecognised`, and the page distinguishes the two |

## 7. Automated gates

```
npm run build                     219 pages   the public-site gate (fails the build)
npm run test:offline               26/26      device database, instant reads
npm run test:offline:shell         46/46      offline application shell
npm run test:sync                  31/31      sync engine, adversarial
npm run test:sync:lifecycle        15/15      the journey + a real browser restart
npm run test:search                28/28      search, documents, freshness, eviction
npm run test:certificate-offline   20/20      offline certificate register
npm run test:qr                    32/32      QR scanning, camera lifecycle, refusals
npm run test:portal-offline        40/40      portal views on the device, redaction, wording
npm run test:sync:operations       39/39      the expanded registry + the server half
```

**The certificate-register signing defect is permanently covered.** Two checks
in the certificate suite exist solely because of it: *an entry added after
signing invalidates the whole register*, and *a revocation cannot be quietly
reversed on the device*. The second is the one that caught it. Neither may be
removed.

The public-site gate is likewise permanent and runs inside `npm run build`: a
reintroduced merge conflict fails the build with a non-zero exit, verified by
deliberately reintroducing one.

## 8. Honest summary

| | |
|---|---|
| **COMPLETE** | Offline shell · offline navigation · local-first store · sync engine · conflict handling · offline documents · freshness · secure eviction · offline search · the certificate register **mechanism** · offline QR scanning **logic** · the portal offline **client** · the sync **registry and its server half** · the public-site build gate |
| **READY FOR DEPLOYMENT** | All of the above — green, committed, pushed. Nothing further is needed from anyone to deploy them. |
| **REQUIRES EXTERNAL ACTION** | Production Ed25519 key pair · certificate records in the live database · six GitHub secrets · **the offline key-material decision (§10)** · real-device testing on Android Chrome · a real printed QR code read by a real camera · Yoruba and French linguistic review |
| **NOT BUILT** | *(empty)* — the three items previously listed here are built and tested. Nothing has been moved into a lighter column without evidence: QR keeps a REQUIRES EXTERNAL ACTION half for its optics, and the portal layer keeps one for its key material. |

Nothing in the first two columns has touched production. The chain the Founder
named — live database → production keys → signed register → deployed verifier →
real QR scan → real device offline test — has **not** been run end to end, and
until it has, no one should announce that offline certificate verification is
live.


## 9. `start()` is still not called from a page

Unchanged, and deliberate. The engine can queue work; no surface yet shows a
person their pending, conflicted and failed operations. Queueing work with
nowhere to display it would breach rule 4 — *nothing is ever silently dropped* —
in spirit while honouring it in code. Wiring `start()` waits on that surface.

## 10. The offline key-material decision — for the Founder

Full analysis, with browser-verified evidence and a recommendation:
**`docs/shrs-offline-key-material-decision.md`**.

Short form: **ship Option A (in-memory only) now — it needs no decision and no
security change, and delivers offline *continuation* within a live session.
Adopt Option C (a non-extractable device key in IndexedDB) for cold-start
offline access, once the Founder accepts the one named trade-off.** A
script-readable cookie is **rejected on the merits**: the compromise outlives
the tab, the material travels on every request into logs and proxies, and it
buys nothing Option C does not.

Option C was verified against the pinned Chromium build rather than assumed —
the key survives a reload, `exportKey` throws `InvalidAccessError`, the stored
object is opaque to script, and deleting it makes the cache unreadable at once.

The crux, which no design escapes: **no client-side design can cryptographically
enforce a wall-clock expiry offline, because offline the clock belongs to
whoever holds the device.** Today's model appears to enforce it but achieves it
only by discarding the key on reload — which is the same thing as having no cold
start. The real choice is persist-with-procedural-expiry or don't-persist.

The original framing follows, for the record.

The device store encrypts everything under a key derived from a session secret
that is never persisted (`shrs-offline-policy.js` §7: `keyPersisted: false`).
The client cannot fix this itself — a key the browser generates and stores is
not a key, it is obfuscation, and the policy refuses it. So the server must
issue per-session offline key material, in one of two shapes:

1. **In the `me` response only**, held in memory. Safe. Dies on reload, which
   makes a cold offline start impossible — reducing the twelve-hour offline
   session to the lifetime of a single page, i.e. not an offline session at all.
2. **A script-readable cookie**, `Secure`, `SameSite=Strict`, expiring with the
   offline session. Survives a reload, which is the entire point of a
   twelve-hour window. The cost: script running on the page can read it. That is
   already true of anything the page can decrypt, but it widens the blast radius
   of an XSS from "this tab" to "the cache".

Until this is decided, the portal offline layer stays inert and the portal
behaves as it always has. Nothing degrades; nothing is claimed.

## 11. What changed on 10 August 2026

- **Offline QR scanning** built and tested (32 checks). Exact-host matching, so
  `shroyalschools.com.evil.example` is refused rather than looked up; a
  `javascript:` payload never treated as a reference; the browser's own
  `BarcodeDetector` rather than a third-party decoder in the trust path; the
  camera stopped in a `finally`; nothing about a frame retained.
- **Portal pages wired to the offline layer** (40 checks), with a per-view key
  allowlist in policy, recursive scrubbing of never-cached fields, and — the
  subtler fix — a separate sentence for "not saved on this device" so an empty
  panel stops making a claim about the school's records.
- **The sync registry expanded** to three operations (39 checks), with the
  server-side replay guard and optimistic-concurrency checking that the two new
  ones required. No last-writer-wins, proved against the real helper.

Nothing above has touched production. The chain the Founder named — live
database → production keys → signed register → deployed verifier → real QR scan
→ real device offline test — has still **not** been run end to end.


## 12. Deployment

The candidate is frozen at `ab1adbaf`. Feature development has stopped.

The operational document from here is
**`docs/shrs-production-deployment-runbook.md`**: the eight external
prerequisites (all UNMET), the six secrets, and the twelve-stage production
chain — production database → production Ed25519 key → signed manifest →
deployed verifier → real certificate QR → real Android camera → online
verification → disconnect → offline verification → reconnect → synchronisation →
live verification again — each recorded separately as PASS or FAIL, all
currently UNRUN.

The next report on this programme should be a **production deployment report**,
not a feature-development report.
