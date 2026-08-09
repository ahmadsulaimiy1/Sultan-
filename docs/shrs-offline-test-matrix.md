# The Offline Test Matrix — Phase 7

**Date:** 9 August 2026
**Total: 144 checks across five suites, all passing, all in a real browser
with the network genuinely severed.**

```
npm run test:offline              26/26   the device database and instant reads
npm run test:offline:shell        46/46   the offline application shell
npm run test:sync                 31/31   the outbound sync engine
npm run test:search               28/28   search, documents, freshness, eviction
npm run test:certificate-offline  20/20   the offline certificate register
```

Nothing here is mocked at the fetch layer. Every suite runs real Chromium
against a real HTTP server, uses real IndexedDB and real WebCrypto, and cuts
the network **at the server** as well as at the browser — because Playwright's
`setOffline` stops covering a service worker once Chromium restarts it, which
this project learned the hard way (see `docs/shrs-offline-shell.md` §8).

---

## The thirteen offline behaviours

| # | Behaviour | Covered by | Result |
|---|---|---|---|
| 1 | Fresh launch with no signal renders the institution's shell | shell | ✅ |
| 2 | Reload offline | shell | ✅ |
| 3 | Navigation between saved pages offline | shell | ✅ |
| 4 | A page never visited answers in the language of the URL | shell (EN/AR/YO/FR) | ✅ |
| 5 | RTL correctness offline | shell (`dir` + computed) | ✅ |
| 6 | Multilingual resources on the device | shell (309 keys from `yo.json` offline) | ✅ |
| 7 | Cached vs live is always distinguishable | shell (dated notice) + search (labels) | ✅ |
| 8 | Records readable offline, instantly | foundation (1.0 ms second read) | ✅ |
| 9 | Search works offline, over both corpora | search | ✅ |
| 10 | Authorised documents readable offline | search | ✅ |
| 11 | Work done offline is queued and delivered | sync | ✅ |
| 12 | Recovery after reconnection | shell (auto-return) + sync (drain) | ✅ |
| 13 | Certificate status checkable offline | certificate | ⚠️ mechanism proven, **activation blocked** (see §6 of its doc) |

## The fourteen failure and security behaviours

| # | Must not happen | Covered by | Result |
|---|---|---|---|
| 1 | A saved copy passing for live | shell | ✅ |
| 2 | Public content served stale while online | shell | ✅ |
| 3 | `/api/` cached or replayed | shell (no `/api/` in any cache) | ✅ |
| 4 | Live data answered offline — failing open | shell + sync | ✅ |
| 5 | A forbidden field reaching the device | foundation + search | ✅ |
| 6 | Expired data read | foundation + search | ✅ |
| 7 | Data readable without the session | foundation + search | ✅ |
| 8 | A revoked device keeping its data | sync (trust-version purge) | ✅ |
| 9 | A dropped signal mistaken for revocation | sync (probe unreachable ≠ purge) | ✅ |
| 10 | A duplicate institutional write | sync (one key, one row) | ✅ |
| 11 | An offline edit silently overwriting a record | sync (409 terminal) | ✅ |
| 12 | A queued operation silently lost | sync (closing accounting) | ✅ |
| 13 | Unsent work discarded to free space | search (pressure eviction) | ✅ |
| 14 | An unknown certificate state shown as "Genuine" | certificate | ✅ |

## Defects these suites found — and they are the point

A test that only confirms what you already believe has not earned its runtime.
Each of these was a real defect in code that looked correct:

1. **The four dictionaries were unreadable offline.** Precached into the shell
   cache but read from the data cache. Present on every device, invisible to
   the code that needed them.
2. **The certificate register's signature covered almost nothing.**
   `JSON.stringify` with an array replacer filters keys *recursively*, so every
   entry serialised as `{}` — a revocation could have been flipped back to
   valid on a device and still verified.
3. **The offline shell harness was passing for the wrong reason.** Playwright's
   offline emulation stopped covering the service worker after Chromium
   restarted it; the worker regained the network and served live pages while
   the test believed it was offline.
4. **A merge conflict was live on the public site.** Not found by a suite but
   by reading the file a suite made me open: `partials/head.html` had committed
   conflict markers, propagated into 149 published pages' `<head>`, dropping
   four stylesheets from every public page.

## What is not covered, stated plainly

- **The certificate register is not active.** The mechanism is proven; it needs
  a production key pair and the certificate records to exist in the live
  database. Both are described in `docs/shrs-certificate-offline.md` §6.
- **The sync engine's registry holds one operation.** That is rule 1 working,
  not the engine being unfinished — each addition needs its endpoint's replay
  and conflict semantics established first.
- **`SHRS_SYNC.start()` is not yet called from a page.** Wiring it needs a
  surface that shows a person their pending, conflicted and failed operations;
  queueing work with nowhere to display it would breach the engine's fourth
  rule in spirit while honouring it in code.
- **No real-device testing.** Everything here is desktop Chromium. Behaviour on
  a low-end Android handset on Nigerian mobile data is a different question,
  and the honest answer is that it has not been measured.
- **Yoruba and French UI strings are mine, not a native speaker's.** They are
  written carefully and consistently with the existing `yo.json`/`fr.json`
  corpus, but they have not been reviewed by a speaker. Worth a pass before the
  school leans on them publicly.

## Running the whole matrix

```
npm run test:offline && npm run test:offline:shell && npm run test:sync \
  && npm run test:search && npm run test:certificate-offline
```

Each suite exits non-zero on any failure and prints the failing checks by name.
