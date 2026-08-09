# Offline Search, Authorised Documents, Freshness and Eviction — Phase 5

**Status:** built and tested in a real browser, 28/28 checks passing.
**Date:** 9 August 2026
**Files:** `js/shrs-offline-search.js`, `js/shrs-local-store.js` (documents +
eviction + `listRecords`), `js/shrs-data-layer.js` (freshness in four
languages), `scripts/test-offline-search.mjs`.

---

## 1. Search: two corpora, kept apart

| Corpus | Source | Rule |
|---|---|---|
| **Public** | the pre-built `/search-index.<lang>.json` the site already ships, held by `sw.js` stale-while-revalidate | on the device after one visit, readable for ever after |
| **Personal** | the records this device was allowed to keep | cannot leak a field that was never cached |

The second point is the whole design. A safeguarding note is not *hidden from
search* — it is **absent from the device**, because the Phase 1 allowlist ran
at write time. The test seeds records that deliberately carry
`safeguarding_notes`, `medical_conditions`, `home_address` and `guardian_phone`,
confirms none of them reached the device, and then confirms that a query for
their contents returns nothing.

`searchableFields()` intersects the fields searched with the approved
allowlist, so if the allowlist ever narrows, a field disappears from search
rather than silently returning nothing and looking like "no results".

**Names are found the way people type them.** Yoruba tone marks and underdots
do not have to be typed (`olamide` finds *Ọlámidé*), and Arabic alef forms and
tā' marbūṭa are normalised (`عايشه` finds *عائشة*) — the two spelling
variations that actually break a name search in a Nigerian Islamic school.

Every result says where it came from. Personal results carry `live: false`
always, by construction. A public search that cannot reach its index says
`index-not-on-device` rather than reporting nothing found.

## 2. Authorised documents

A document is something the school **issued to this person** and they chose to
keep. Hence thirty days rather than seven, and only twenty slots: a person's
own small shelf, not a mirror of the school's filing cabinet.

Two things separate it from the record cache:

- **A document is opaque bytes**, so the field allowlist cannot inspect it.
  Authority is therefore established *before* it is stored: `putDocument`
  refuses outright without `ownedBy`. An unowned document on a shared device is
  precisely the leak this layer exists to prevent.
- **It is read back only by its owner.** `getDocument(key, readerId)` returns
  `null` — not a warning, not a redacted version — for a different reader, for
  an expired document, and for a locked session.

The twenty-document cap is enforced by least-recently-used eviction, verified,
not assumed.

## 3. Eviction, stated honestly

**IndexedDB gives no guarantee that a deleted value is overwritten on the
physical medium, and no browser API does.** Claiming a secure wipe here would
be a lie, so this document does not claim one.

What *is* guaranteed is the thing that protects the child: every value is
stored as AES-GCM ciphertext under a key derived from the session secret and
never persisted anywhere. Deletion removes the ciphertext **and its metadata
together**; `lock()` and `purgeAll()` drop the key from memory. Residue left
behind by the storage engine is unreadable without a key that no longer exists
on the device.

Under storage pressure, `evictUnderPressure()` frees **documents first** — a
document can be downloaded again from the school, whereas an evicted record is
a Registrar losing the working set they went somewhere with no signal in order
to use. Neither ever touches the outbound queue: a device that fills up must
not resolve it by discarding someone's unsent work. That is asserted.

## 4. Freshness, in four languages

`freshnessLabel()` now speaks English, Arabic, Yoruba and French. A freshness
stamp is the one label a reader must never have to guess at, so it does not
fall back to English on a Yoruba or French page. The test asserts all four are
**distinct** — a silent fallback would otherwise pass a naive check.

Tones are `live`, `cached`, `unavailable`, `locked`. A cached read is never
toned live.

## 5. The acceptance run

`npm run test:search` — real Chromium, real IndexedDB, real WebCrypto. **28/28.**

Search (9) · public index on and off the network (3) · authorised documents,
including the refusal to store an unowned one and the refusal to open someone
else's (5) · expiry destroying rather than warning (1) · the cap and its LRU
order (2) · pressure eviction sparing the queue (2) · freshness in four
distinct languages plus locked and live tones (4) · and locked meaning locked
for both search and documents (2).

Regression: the Phase 2 foundation suite and the Phase 4 sync suite both still
pass after the store changes.

## 6. Standing constraints honoured

- Nothing searchable that was never cacheable.
- No document readable by anyone but its owner.
- Nothing expired served with a warning — expiry is a refusal.
- No claim of secure erasure that the platform cannot support.
- The outbound queue is never sacrificed for space.
