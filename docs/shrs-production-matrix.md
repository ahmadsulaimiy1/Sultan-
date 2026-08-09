# SHRS Offline Ecosystem — Final Production Matrix

**Date:** 9 August 2026
**Automated gates:** 159 checks across six suites, plus a build gate over 219
pages. All green.

Three statuses, kept apart on purpose:

- **COMPLETE** — built, tested, and nothing further is needed from anyone.
- **READY FOR DEPLOYMENT** — finished and green, waiting only to be deployed.
- **REQUIRES EXTERNAL ACTION** — cannot proceed without something only the
  Founder or a third party can supply.

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
| QR verification (offline) | ❌ not built | ❌ | ❌ | ❌ | **NOT BUILT** ³ |
| Multilingual offline | ✅ | ✅ (EN/AR/YO/FR) | ❌ | ❌ | READY FOR DEPLOYMENT — **YO/FR need linguistic review** |
| Registrar Portal (offline layer) | ⚠️ partial | ✅ store + search | ❌ | ❌ | **NOT WIRED** ⁴ |
| Student Portal (offline layer) | ⚠️ partial | ✅ store + search | ❌ | ❌ | **NOT WIRED** ⁴ |
| Public-site build gate | ✅ | ✅ 219 pages | ❌ | n/a | READY FOR DEPLOYMENT |

¹ The engine is complete and proven end to end, including a real browser
restart. Its registry holds **one** verified operation (`adhkar.complete`), and
`start()` is not yet called from a page — see §4.

² Blocked on two external things. See §2.

³ The **online** QR path already exists and is live (the verification page
accepts the QR payload). Offline QR *scanning* — camera access, decode, then a
register lookup — is not built. It is a genuine gap, not a mislabelled one.

⁴ The offline record store, read path, search and sync engine are all built and
tested, but no portal page yet calls them. Those pages still fetch live and show
the Phase 3 offline notice rather than reading from the device.

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
| **COMPLETE** | Offline shell · offline navigation · local-first store · sync engine · conflict handling · offline documents · freshness · secure eviction · offline search · the certificate register **mechanism** · the public-site build gate |
| **READY FOR DEPLOYMENT** | All of the above — green, committed, pushed. Nothing further is needed from anyone to deploy them. |
| **REQUIRES EXTERNAL ACTION** | Production Ed25519 key pair · certificate records in the live database · six GitHub secrets · real-device testing on Android Chrome · Yoruba and French linguistic review |
| **NOT BUILT** | Offline QR scanning · portal pages wired to the offline layer · sync registry beyond one operation |

Nothing in the first two columns has touched production. The chain the Founder
named — live database → production keys → signed register → deployed verifier →
real QR scan → real device offline test — has **not** been run end to end, and
until it has, no one should announce that offline certificate verification is
live.
