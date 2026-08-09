# Registrar offline scope — limits proposed for approval

**Required by the Founder's directive §6:** *"This is the one area where I want
the limits explicitly proposed before they become architectural policy… Present
these limits before silently choosing them."*

Nothing here is locked. Every value lives in `js/shrs-offline-policy.js`, each
with its reasoning attached, so changing any of them is one line reviewed in
one place. The module is marked `PROPOSED` until you say otherwise.

**The bias, stated up front:** where a limit was arguable I set it at the
protective end. The cost of being wrong is asymmetric. Too little offline reach
inconveniences a Registrar for a few minutes; too much puts a child's home
address on a phone that can be lost in a Lagos market.

---

## 1. Data scope — what is reachable offline

**Cache on access. Never bulk-sync the registry.**

A record is available offline *because the Registrar actually opened it online*.
The alternative — mirroring the register to every device — would put every child
in the school on every staff phone to save a round-trip on the handful of records
anyone works with in a day. Your §21 says it directly: do not download the whole
database to every device.

| | Limit |
|---|---|
| Student records | **50** most recently accessed |
| Certificate records | **200** (small, read far more often) |
| Downloaded documents | **20** |
| Class rosters | **6** — names and IDs only, prefetched because the roster is the unit a Registrar actually works in |

Beyond the cap, the least recently accessed is **evicted**, not hidden.

---

## 2. Fields that are never written to a device

This list does more work than the encryption does. Encryption defeats a casual
finder; it does not defeat an unlocked device inside the session window. **The
only field that cannot leak is the field that was never written.**

Excluded — 28 fields, each because its exposure harms a *child*, not merely
because it is confidential:

- **Safeguarding** — notes, flags, DSL records, child-protection status
- **Medical** — conditions, allergies, medication, sick-bay notes
- **Disciplinary** — behaviour notes, incident reports
- **Location** — home address, pickup arrangements
- **Financial** — payment methods, balances, bank details
- **Credentials** — password hashes, session tokens, OTPs, recovery codes
- **Free-text staff notes** — unbounded content, unknowable sensitivity

None is needed to do Registrar work offline.

What a cached student record **may** hold is an **allowlist**, not a denylist:
name (EN/AR), Student ID, admission number, sex, date of birth, class,
programme, enrolment status, guardian name and phone, photo, updated-at. A new
column added upstream is therefore excluded **by default** rather than cached by
accident — that is the direction of failure that matters.

Certificates cache the same fields the public verification page already shows.
**The grade is excluded**, as it is from the public attestation. It does not
become cacheable by being useful.

---

## 3. Two clocks, deliberately

| Clock | Value | What it governs |
|---|---|---|
| **Offline session** | **12 hours** | How long cached data can be **read** without going back online |
| **Record retention** | **7 days** | How long the encrypted record **exists on disk** at all |
| Documents | 30 days | The user deliberately downloaded these; they are documents the school issued to them |

Data becomes **unreadable at 12 hours**. It is **destroyed at 7 days**.

Twelve hours covers a full working day including a power cut, and bounds what a
lost device yields to a single day rather than a week. Seven days means a
Registrar reconnecting on Monday doesn't re-download everything they read on
Friday.

---

## 4. Storage ceiling

25 MB records + 50 MB documents per device, hard-capped, least-recently-accessed
eviction, warning at 80%.

This is a **data-loss control**, not tidiness: a device that fills up gets its
whole origin silently evicted by the browser — taking the outbound queue with it.

---

## 5. Synchronisation cadence

On app open · on reconnect · on focus after 5 minutes idle · every 15 minutes
while active. Failure backoff 30s → 2m → 8m → 30m, four retries.

Frequent enough that a stale stamp is rare; sparse enough that a phone on
Nigerian mobile data isn't doing this constantly.

---

## 6. Revocation while the device is offline

**The honest position first: a device that never reconnects cannot learn it has
been revoked.** No client-side design changes that, and I won't pretend
otherwise. The real guarantee is the 12-hour ceiling.

What happens the moment it *is* reachable:

- `trust_version` (already in the schema from the identity work) is checked as
  the **first call on reconnect, before any data moves in either direction**.
- Mismatch → **immediate total purge**, including the outbound queue. A revoked
  user's pending edits are not records waiting to be saved; they are changes by
  someone whose authority was withdrawn.
- Logout → immediate purge.
- Session expired offline → **read denied**, reconnect required. Not "shown with
  a warning". **Fail closed, with no flag to turn it off.**

---

## 7. Device loss — the threat model, not a reassurance

What an attacker actually gets:

| Situation | Result |
|---|---|
| Locked device, or >12h since last authentication | **Nothing readable** — the key is memory-only and gone |
| Unlocked device within 12h | The allowlisted fields, up to 50 students. **No** safeguarding, medical, disciplinary, address or financial data — none was ever written |
| Administrator revokes | Purged on the device's next connection |

The residual risk is an unlocked device, in the hands of someone who knows what
to look for, inside the 12-hour window. That is precisely why §2 matters more
than the encryption does.

---

## 8. Operations never queued offline

Refused with a plain explanation rather than deferred: certificate issue,
certificate revoke, Student ID assignment, payment record/refund, password
change, role change, user revocation, record deletion.

Issuing a certificate consumes a permanent, never-reused number. It cannot be
replayed from a phone that has been in a drawer for two days.

---

## Decision requested

Approve as proposed, or name the values you want changed. The three most likely
to be worth your attention:

1. **50 student records** — raise if a Registrar routinely works a larger set
   offline.
2. **12-hour offline session** — the single most protective number here. Longer
   is more convenient and proportionally more exposed on a lost device.
3. **Guardian phone number cached** — operationally necessary for a Registrar
   who needs to reach a parent with no signal, but it is a parent's personal
   number sitting on a device. I included it; it is a reasonable one to remove.
