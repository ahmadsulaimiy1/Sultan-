# The SHRS Offline Application Shell — Phase 3

**Status:** built, tested offline in a real browser, and passing 46/46 acceptance checks.
**Date:** 9 August 2026
**Files:** `sw.js`, `js/shrs-connectivity.js`, `offline/index.html`,
`scripts/test-offline-shell.mjs`, `partials/head.html`, `scripts/build.js`.

Phase 1 built the device database and set the limits. Phase 2 built the read
path and proved it in a real browser. Phase 3 is the part a parent in Ikorodu
actually meets: what the application does when the signal goes.

---

## 1. The rule that shapes everything

Two of the Founder's standing instructions pull in opposite directions:

> Do not introduce stale caching for public content.

> Build a true offline-first institutional application architecture.

They are not reconciled by compromise. They are separated by **surface**:

| Surface | Strategy | Why |
|---|---|---|
| Public pages (HTML) | **Network-first**, cache is fallback only | A published policy, calendar or announcement must appear on the next view. A cached page is never a shortcut — only a last resort, and it is labelled. |
| Application shell (css, js, fonts, icons) | **Cache-first** | Every URL carries a `?v=<hash>` fingerprint and the whole cache is retired on the next build, so "stale" is not a state these can be in. |
| Dictionaries and search indexes (`/i18n/`, `/search-index.*.json`) | **Stale-while-revalidate** | Unfingerprinted, so they cannot be cache-first; every online view refreshes the stored copy. |
| Third-party webfonts | **Stale-while-revalidate** | Otherwise the institution's typography collapses to a system serif on every page with no signal. |
| `/api/` | **Never intercepted** | Live institutional data either reaches the server or fails honestly. |

## 2. Nothing fails open

A request for live data is never answered from a copy, never replayed, and
never "helpfully" satisfied. Offline, `fetch('/api/portal/me')` rejects. The
acceptance run asserts this explicitly, and asserts that no `/api/` response
is present in any cache after a live call.

## 3. A saved copy always says it is a saved copy

When `sw.js` serves a page from the cache it writes the moment it was stored
into the document before handing it over. `js/shrs-connectivity.js` reads that
back and shows, in the reader's own language:

> You are offline. This is the copy saved 15:37.

with a **Load the live page** action once the connection returns. There is no
path by which a cached page is presented as live: the stamp is written by the
worker, on the fallback branch only, and nothing else sets it.

## 4. Four states, four languages

`js/shrs-connectivity.js` renders exactly four states — **online** (shows
nothing; a working connection is not news), **offline**, **syncing**, and
**update available** — in English, Arabic, Yoruba and French, direction-aware
throughout (logical properties only, so the indicator sits bottom-left in
English and bottom-right in Arabic with no second rule).

Phase 4's outbound queue drives the syncing state through
`SHRS_CONNECTIVITY.setSync({syncing, pending})` or a `shrs:sync` event. This
file renders; it does not own the queue.

## 5. The offline document

`offline/index.html` is **one file in four languages**. It is never navigated
to — the worker hands it over in place of a page it could not reach, writing
the requested path and the language of that path into the document first. A
reader on `/ar/gallery/` is answered in Arabic, right to left, and offered the
Arabic homepage. It also enumerates the page cache and lists what the device
*can* still open, filtered to the reader's own language — a dead end turned
into a table of contents, with every entry verifiably openable at that moment.

When the connection returns, it carries the reader to the address they
originally asked for. No spinner, no second tap.

## 6. Updates are announced, not seized

The old worker called `skipWaiting()` on install — it could take over
mid-session and serve a page assets from a version it was not built with. It
now waits. The page announces *A newer version of this site is ready* with
**Update now** / **Later**, and only an accepted update sends `SKIP_WAITING`.

A `controllerchange` on a **first** install is not an update — it is
`clients.claim()` taking over a page that loaded without a worker — so it does
not reload. Getting this wrong produces a visible flash on a visitor's very
first arrival; the `hadController` flag is the whole difference.

## 7. Recovery

Two independent recoveries:

- **Damaged cache.** A same-origin stylesheet or script that fails to load
  while a worker controls the page *on a working connection* means the cache
  is lying about what it holds — and left alone that is permanent, because
  every reload re-reads the same broken entry. One `RESET_CACHES`, once per
  session (a `sessionStorage` flag stops a genuinely missing asset from
  becoming a reload loop), and the shell is rebuilt from the network.
- **Portal skeletons.** A portal page shimmers while it fetches its records.
  Offline that fetch can never land, so the shimmer becomes a lie told
  indefinitely. It is retired and replaced with a sentence that is true. The
  page's own error state is deliberately *not* reused — it says "try signing
  in again", and a missing connection is not a rejected session.

## 8. What the acceptance run actually proves

`npm run test:offline:shell` — real static server, real Chromium, real
service worker, network genuinely cut. **46/46.**

| Area | Checks |
|---|---|
| Install & precache | worker takes control; 22+ shell entries cached at install |
| Page cache | visited pages stored; **no `/api/` response cached, ever** |
| Fresh offline launch | real page renders; chrome survives; copy stamped and labelled |
| Reload & navigation offline | both work |
| Unvisited pages, 4 languages | EN/AR/YO/FR offline document, correct `dir`, correct homepage, requested path named |
| Offline table of contents | lists only pages that really are available, only in this language |
| Failing open | offline `/api/` **fails** |
| Dictionaries offline | 309 keys read from `/i18n/yo.json` with no signal |
| Reconnection | live page served, notice gone, indicator gone, reader returned to the page they asked for |
| Update lifecycle | announced, choice offered, worker waits, accepting activates and reloads |
| Recovery | shell deleted → reset → offline-capable again |
| Speed | cached shell asset in **6.6 ms** |

### Two defects the run found, and the fixes

1. **The dictionaries were unreadable offline.** They were precached into the
   shell cache, but `/i18n/` is unfingerprinted and so is *read* from the data
   cache. Every dictionary was present on the device and invisible to the
   code that needed it. They are now precached into `DATA_CACHE`.
2. **The harness itself was passing for the wrong reason.** Playwright's
   `context.setOffline()` only covers the targets the browser had when it was
   called; Chromium terminates an idle service worker after about thirty
   seconds, and the fresh one quietly regains the network. Halfway through the
   first run the worker was serving live pages while the test believed it was
   offline. The harness now refuses connections at the server as well, so the
   failure is genuine for every caller. Recorded here because the same trap
   will catch the next person who tests a service worker.

## 9. Also fixed in this phase

`partials/head.html` and `portal/select/index.html` carried **committed merge
conflict markers**, and the build had propagated them into 149 published
pages' `<head>`. Four stylesheets (`liveries`, `atelier`, `menu`, `regalia`)
were being dropped on every public page as a result. Resolved, and five source
pages under `pages/` that carried the same damage were resolved with them.

The Google Fonts stylesheet now requests CORS (`crossorigin="anonymous"`).
Without it the response is opaque, and an opaque response is indistinguishable
from a 404 — so the worker could not tell a cached font sheet from a cached
failure.

## 10. Standing constraints honoured

- No certificate was re-minted, renumbered or modified.
- No cryptographic secret is present in any client file.
- `/api/` is not cached, not replayed, and does not fail open.
- No unknown state is ever displayed as a known one.
- Public content is not served stale while the network is reachable.
