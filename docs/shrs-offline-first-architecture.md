# SHRS Offline-First & Instant-Interaction Architecture

**Directive received:** 9 August 2026 — instant-interaction / zero-loading-feel,
and the master offline-first ecosystem directive (27 sections).

**Accepted in full**, with three findings that change the order and the shape of
the work. All three are recorded here before any code is written, because each
one, missed, produces something worse than the problem it was meant to solve.

---

## Finding 1 — This directive reverses an earlier one. Both were right.

`sw.js` opens with a design note recording a previous instruction:

> *"Pages must NEVER be served stale from cache when the network is available —
> a new policy, handbook, calendar, announcement, or admissions update must
> appear the moment it's published, with no reinstall and no app-store update."*

That is the exact opposite of stale-while-revalidate, and it was correct **for
what it governs**. If a safeguarding policy is amended, a parent must not read
last month's version out of a cache. If admissions dates move, a stale page is
a real-world harm.

The new directive is also correct — **for what it governs**. A Registrar
re-opening a student record they read ten minutes ago should not wait for a
server round-trip.

These are not in conflict once you notice they are about different things:

| Surface | Policy | Why |
|---|---|---|
| **Public website** — policies, handbooks, announcements, admissions, calendar, prospectus | **Network-first**, unchanged | Published institutional information. Stale is a harm. The earlier directive stands. |
| **Portal records** — student records, attendance, timetable, results, fees, messages, documents | **Local-first**, stale-while-revalidate, freshness-stamped | Data the user has already been authorised to see and has already seen. |
| **Certificate verification** | **Its own model** — see Finding 2 | An attestation, not a page and not a record. |
| **Application shell** — chrome, nav, CSS, JS, fonts, icons, translations | **Cache-first, permanently mounted** | Never changes between requests within a version. |

Adopting one philosophy for the whole estate would either make published
policy stale or leave the Registrar waiting. The split is the design.

---

## Finding 2 — Offline certificate verification cannot use the current crypto

This is the most important paragraph in this document.

Certificates are signed with **HMAC-SHA256** keyed by `DOCUMENT_HASH_SECRET`.
HMAC is **symmetric**: the key that verifies is the key that signs. Anyone who
can check a certificate offline can also mint one that checks out.

So there is no version of "ship the verification key to the browser" that is
safe. Not obfuscated, not in IndexedDB, not in a service-worker cache, not
split across sources. Putting that secret in a client turns every installed
copy of the app into a certificate forge. The directive already says this
(§6) and authorises the fix:

> *"If the existing cryptographic architecture cannot safely support offline
> verification, redesign that portion rather than weakening security."*

### The redesign — a server-signed verification manifest

Do not change how certificates are signed. Do not re-mint, renumber, or touch
a single issued document. Instead, add a **second, asymmetric layer over the
top**:

1. The server periodically emits a **verification manifest**: for every issued
   certificate, its serial, engraved number, holder name, programme, issue
   date, status (active / revoked), and the first 12 hex of its content hash.
   No secret is in it — every field is already printed on the sheet or already
   public on the verification page.
2. The server signs that manifest with an **Ed25519 private key** that never
   leaves the server.
3. The client holds only the **public key**, which is safe to publish.
4. Offline, the client verifies the manifest's signature, then looks the
   certificate up inside it.

The client can now prove *"this manifest genuinely came from Sultan Hanafi
Royal Schools, and this certificate was in it as of 14:32 on 9 August"* — and
still cannot forge a certificate, because it never had the HMAC secret and the
Ed25519 private key is not on the device either.

**What offline verification then honestly means**, and exactly what the UI must
say:

> **Verified against synchronised institutional records** — last synchronised
> 9 Aug 2026, 14:32. Not a live check.

And when connectivity returns it silently upgrades to:

> **Verified against the live institutional record.**

The revocation window is the residual risk and must be stated, not hidden: a
certificate revoked *after* the last sync will still appear active offline.
Mitigations, in order: short manifest lifetime (24h), a hard expiry after which
offline verification refuses rather than guesses, and a revocation list that
syncs more aggressively than the manifest. **An expired manifest must fail
closed** — "cannot verify offline, connect to check" — never "probably fine".

This satisfies §5, §6, §17 and §18 without weakening anything.

---

## Finding 3 — Sequencing: the cache cannot precede the source

The acceptance criterion (§27) begins: *"A previously synchronised authorised
user opens the SHRS application."* Everything downstream depends on that first
successful synchronisation.

As of today the production database **has no certificate tables** — the live
endpoint returns `relation "stage_certificates" does not exist`. The online
path for the certificate system has never run. Building a synchronisation
engine, a local mirror and an offline verification index on top of a source
that has never served a record would be building the cache before the thing it
caches.

This does not block the whole directive — the app shell, the instant-navigation
work, the local store, and the offline queue for *other* surfaces are all
independent. It blocks precisely one thing: **offline certificate verification
cannot be tested end to end until the certificate system works online.**

So certificate offline work is sequenced after the production database is
stood up (`docs/shrs-verification-setup-card.md`, five secrets, one run).
Everything else proceeds now.

---

## Delivery plan

Each phase ends in something demonstrable. Nothing is declared done on the
strength of a design.

### Phase 1 — Foundation *(no user-visible change; everything else needs it)*
- `js/shrs-local-store.js` — IndexedDB via a thin typed wrapper. Object stores
  for records, documents, the outbound queue, and sync metadata. **Not**
  localStorage, which stays only for UI preferences where it belongs.
- Sync metadata on every record: `syncedAt`, `syncState`, `recordVersion`,
  `deviceId`.
- Outbound queue schema: operation id, record id, user id, timestamp, device
  id, type, state (`pending|syncing|synced|failed|conflict`), retry count,
  server ack.
- Session-scoped encryption of portal data at rest, keyed from the session, so
  cached records do not outlive the session (§7).

### Phase 2 — Instant interaction
- Permanently-mounted app shell with client-side navigation for portal
  surfaces; no full-page reload, no remount, scroll and state preserved.
- Render-from-cache-then-revalidate on every portal read.
- Freshness stamp on every screen fed from cache.
- Prefetch on intent (hover/touchstart/viewport) for likely next screens.
- **Public pages keep full-page navigation and network-first.** (Finding 1.)

### Phase 3 — Offline shell and status
- Extend the service worker: cache-first for shell and translations, offline
  fallback that opens the real app rather than a browser error.
- Global connectivity indicator, four states, unobtrusive.
- Multilingual resources cached so EN/AR/YO/FR switching works offline (§23).

### Phase 4 — Synchronisation engine
- Reconnect → authenticate → pull → push → resolve → confirm, with no manual
  reload.
- Conflict detection on institutional records; conflicts are surfaced for
  review, never silently resolved (§10).
- Offline forms and queued actions, with irreversible and financial operations
  explicitly excluded from queueing (§12).

### Phase 5 — Offline search and documents
- Local index over synchronised records, role-scoped.
- Downloaded documents clearly distinguished from live records.

### Phase 6 — Offline certificate verification *(gated on Finding 3)*
- Ed25519 manifest signing, key generation and rotation.
- Manifest publication endpoint, expiry, revocation list.
- Offline QR scan against the local index, with honest status wording.

### Phase 7 — The test matrix
§24's thirteen tests and §25's fourteen failure tests, run as real automation —
fast, slow, intermittent, offline, Android, desktop. Not "I turned off Wi-Fi."

---

## Standing constraints

Carried from the existing certificate work and not negotiable here:

- Do not re-mint, renumber, or modify any issued certificate.
- `DOCUMENT_HASH_SECRET` never reaches a client, a cache, a log or this
  repository.
- Never present cached data as live authoritative data.
- No unknown or stale state may display as a valid credential.
- Role-based access applies to cached data exactly as it applies to live data:
  logging out, session expiry or revocation must make cached portal records
  inaccessible.
- Do not download the whole database to every device — synchronise only what
  the role permits.

---

## Status

Phase 1 in progress. Nothing in this document is claimed as delivered until
the phase that owns it has been demonstrated.
