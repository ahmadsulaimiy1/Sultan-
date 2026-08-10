# The offline key-material decision

**Status:** RECOMMENDATION — awaiting the Founder's decision
**Raised by:** the portal offline layer, which is inert until this is settled
**Date:** 10 August 2026

---

## 1. The question, stated precisely

Every record the device holds is AES-GCM ciphertext. The key is derived from
session key material that `shrs-offline-policy.js` §7 says is **never
persisted** (`keyPersisted: false`). Nothing calls `openSession`, so the store
never unlocks, nothing is written, and the portal behaves exactly as it always
has — live or nothing.

To make it work, the key must be re-derivable **after a page reload, offline**,
for up to twelve hours. Four properties are wanted at once:

| # | Property | Why |
|---|---|---|
| 1 | Cached records readable offline across reloads and cold launches | A PWA opened from the home screen in a dead zone is always a cold start |
| 2 | Unreadable after twelve hours without reconnecting | Bounds what a lost device yields |
| 3 | Unreadable after logout or administrative revocation | `REVOCATION.onLogout: purge-all-portal-data-immediately` |
| 4 | Key bytes never exfiltrable — not to a cookie, a log, a bundle, or the wire | The standing rule on secrets |

## 2. The crux, which no design escapes

**No client-side design can cryptographically enforce a wall-clock expiry
offline, because offline the clock belongs to whoever holds the device.**

Today's model appears to enforce property 2 cryptographically. It does not — it
achieves it as a side effect of discarding the key on reload, which is the same
thing as not supporting property 1. The twelve-hour ceiling in `sessionValid()`
has always been a JavaScript comparison.

So the real choice is: **persist a key and accept procedural expiry, or refuse
to persist and accept no cold start.** Everything below is a way of taking one
of those two branches well.

## 3. The three options, measured

### Option A — material in the `me` response, held in memory only

The server returns per-session key material; JavaScript keeps it in a variable;
it dies with the page.

| | |
|---|---|
| Property 1 | ✗ — a reload or a home-screen launch cannot derive the key |
| Property 2 | ✓ cryptographically |
| Property 3 | ✓ cryptographically |
| Property 4 | ✓ (material transits TLS once per session and is never stored) |

Honest scope: this is not an *offline session*, it is **offline continuation** —
open the dashboard while online, walk out of coverage, keep using that same tab.
That is a real and common scenario for a phone, and it costs nothing to ship.
It is not what "twelve-hour offline session" describes.

### Option B — material in a script-readable cookie — **REJECTED**

Recommended against, and not merely as the least elegant option:

- **The compromise outlives the tab.** Any XSS, injected third-party script, or
  extension with content-script access reads the cookie once and can then
  decrypt the entire cache at leisure, including after the session ends. A
  key held in memory can only be abused while the attacker's script is running.
- **It travels on every request.** Cookies are sent with each same-origin
  request unless scoped with unusual care — so key material reaches server logs,
  any TLS-terminating proxy, and error-reporting pipelines. That directly
  contradicts the standing rule that no secret appears in logs.
- **It buys nothing Option C does not.** There is no property in the table that
  a cookie satisfies and a non-extractable key does not.

Rejected on the merits, not on convenience. If it is ever adopted anyway, this
paragraph is the trade-off it must be adopted against.

### Option C — a non-extractable device key in IndexedDB — **RECOMMENDED**

Generate an AES-GCM key on the device with `extractable: false` and store the
`CryptoKey` object itself in IndexedDB. The browser keeps the bytes in its own
key store; JavaScript receives a handle it can encrypt and decrypt with and
cannot read.

**Verified in the target browser, not assumed.** A probe against pinned
Chromium (the same build the suites run on) established all four claims:

```
after reload, decrypt: {"found":true,"text":"a child's admission number",
                        "type":"secret","extractable":false,"isCryptoKey":true}
exportKey:             {"exported":false,"error":"InvalidAccessError"}
what JS can read:      {} | keys=[]
after deletion:        {"found":false}
```

- The key survives a reload — **property 1 holds**, including a cold PWA launch.
- `exportKey` throws `InvalidAccessError` — **property 4 holds more strongly
  than today**, because the bytes never enter JavaScript at all, whereas
  session-derived material must pass through it.
- The stored object is opaque: `JSON.stringify` yields `{}` with no enumerable
  properties, so a script that dumps IndexedDB gets nothing.
- Deleting it makes every held record unreadable immediately — **property 3
  holds**, by deletion rather than by expiry.

## 4. What Option C costs, named plainly

**Property 2 becomes procedural.** Today, a device that reloads after the
session ends cannot read its cache, because the key is simply gone. Under
Option C the key is on disk until the application deletes it, so:

> A device seized *after a reload*, within the twelve-hour window, now yields
> the cached records. Today it would not — not because the ceiling was enforced,
> but because the feature did not work.

That is a real reduction against the *current behaviour*, and it is the reason
this is a decision rather than an implementation detail. It is not a reduction
against the *intended* design, which always meant those records to be readable
for twelve hours.

Four things bound it, and three already exist:

1. **`sessionValid()` still gates every read** and still refuses past twelve
   hours. Unchanged.
2. **The key is deleted** on logout, on an expired session detected at open
   time, and on a `trust_version` mismatch at reconnect. Existing triggers;
   deletion replaces "the key evaporated".
3. **`LIFETIMES.recordRetentionMs` sweeps the ciphertext** independently at
   seven days.
4. **New, and worth adding: rotate the device key on each successful online
   session open.** A key captured at one moment is then useless against every
   record synced after the next reconnect. Cheap, and it bounds the value of a
   captured handle.

And the protection that does most of the work is untouched: **the never-cached
field list.** A fully compromised cache still contains no safeguarding note, no
medical record, no address, no fee balance, no credential — because none of it
was ever written. That is the guarantee that survives every option on this page.

## 5. Recommendation

**Ship Option A now. Adopt Option C when the Founder accepts §4.**

- **Option A requires no decision and no security change.** It can be
  implemented in one endpoint and one call, and it makes offline *continuation*
  work today. Describe it as that, never as a twelve-hour offline session.
- **Option C is the right production architecture** if cold-start offline access
  is genuinely wanted — which the twelve-hour figure implies it is. It is
  stronger than the current design on key exfiltration and equal on revocation;
  it is weaker on one specific case, stated above, which is the Founder's to
  accept or refuse.
- **Option B stays rejected** unless someone documents a property it provides
  that Option C does not. There is none.

## 6. If Option C is adopted

Not implemented — the branch is frozen. Recorded so the work is unambiguous:

1. `shrs-local-store.js`: replace PBKDF2-from-session-secret with
   `generateKey({name:'AES-GCM', length:256}, false, ['encrypt','decrypt'])`,
   persisted in a dedicated `keys` store; `unlock()` becomes "fetch or mint".
2. Keep `sessionOpenedAt` in `meta` exactly as it is — the twelve-hour gate does
   not move.
3. `lock()` deletes the key rather than dropping a variable.
4. Add key rotation on each successful online session open (§4.4).
5. `shrs-portal-offline.js`: `openSession()` loses its `keyMaterial` argument.
6. Extend `test:portal-offline` with: the key survives a reload; `exportKey`
   refuses; logout deletes it and the cache becomes unreadable; rotation makes a
   prior handle useless. Then re-run every suite.

No issued certificate is touched by any of this.
