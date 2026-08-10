# Portal pages on the offline data layer

**Status:** client half COMPLETE and tested · server half REQUIRES EXTERNAL ACTION
**Test:** `npm run test:portal-offline` — 40/40, real Chromium, real IndexedDB,
real WebCrypto, network genuinely severed.

---

## What this is

Three portal surfaces now read through the offline store instead of straight
from `fetch`:

| Page | View name | Endpoint |
|---|---|---|
| Parent / Guardian dashboard | `portal.guardian.dashboard` | `/api/portal/me` |
| Student dashboard | `portal.student.dashboard` | `/api/portal/student/me` |
| Registrar student lookup | `portal.registrar.student` | `/api/portal/staff/registrar/student` |

The change at each call site is about four lines. `js/shrs-portal-offline.js`
is a bridge, not a framework: it publishes one global that the existing
classic-script dashboards can call. **If it fails to load, nothing breaks** —
the global is absent and each page falls through to the plain `fetch` it used
before. That is why the call sites read `window.SHRSPortalOffline ? … : fetch()`
rather than importing anything.

Eleven working dashboards were not rewritten to ES modules to achieve this. The
directive was to wire the pages in *where their existing architecture permits*,
and their architecture is classic scripts.

## What a device is allowed to keep

`js/shrs-offline-policy.js` §9 names each view with a **top-level key
allowlist**. Sections 1–2 of that file govern rows; a dashboard is not a row,
it is an assembled answer — identity plus enrolments plus attendance plus marks
plus money — and the temptation is to cache the whole envelope because it
arrived as one object. That is precisely how a fee balance ends up on a phone
without anyone deciding it should.

Kept, per view:

- **Guardian** — name, title, identity number, verification flags, profile
  completion, the `sections` booleans and the next-step sentence, child counts,
  and per child: name, admission number, status, relationship, enrolments,
  attendance.
- **Student** — name, admission number, identity number, admission date,
  academic session, status, institution, class, enrolments, attendance.
- **Registrar** — the student summary block, enrolments, certificates.

Refused, and why:

| Field | Why not |
|---|---|
| `email`, guardian contact | A way to reach a person. Same objection as `guardian_phone`, which the Founder already struck from the student allowlist. |
| `notifications` | Unbounded staff-authored prose — `internal_remarks` arriving by another route. |
| `guardians` (registrar) | Parents' names and addresses on a staff device. |
| `lifecycleEvents` (registrar) | Carries the written *reason* for a withdrawal. |
| `results`, `fees`, `finance`, `hifz` | Listed in `PORTAL_VIEW_EXTENSIONS` — see below. |

Everything is scrubbed against `NEVER_CACHED_FIELDS` **recursively**, because a
forbidden field does not become permitted by sitting one level deeper than
anyone looked. The test asserts exactly this: a `home_address` and a
`medical_notes` nested two levels inside a child object do not survive.

An undeclared key is dropped rather than kept. A new column added upstream is
excluded by default, in the same direction of failure as the row allowlists.

### Proposed, not approved

`PORTAL_VIEW_EXTENSIONS` names four things that would obviously be useful
offline and are switched off, each with its price written next to it:

- **`results`** — a student could read their own marks with no signal. A lost
  unlocked phone would show a child's marks and a teacher's written comment.
- **`fees`** / **`finance`** — money owed. `NEVER_CACHED_FIELDS` already refuses
  `outstanding_balance`; caching the fee row is the same data by another name.
- **`hifz`** — genuinely the thing a Qur'an College student checks most. The
  Juz' grid alone might be defensible; it currently travels with muhaffiz notes
  and assessment commentary, so separating them is a change to the endpoint, not
  a flag flip here.

Turning any of these on is a single `approved: false → true` in that list. The
code reads it, so there is no second place to forget.

## What the screen is not allowed to say

The subtle failure in this work is not a leak — it is a sentence.

Offline, a fee panel with no data used to render **"Not yet recorded."** That is
a claim about the school's records, made by a device that simply was not allowed
to keep the number. The two sentences look alike and mean opposite things.

So every panel that can be empty for two different reasons is told which one it
is facing:

- Parent card: `Not available offline` vs `Not yet recorded`.
- Results: *"Results are not saved on this device. Reconnect to see them."*
- Student Hifz card: shown, not hidden — hiding it would read as *"you are not
  a Qur'an College student."* It says *"Not saved on this device."*
- Student Hifz stat: `—` offline, not `N/A`, because `N/A` is a claim about
  enrolment.
- Registrar, record never opened here: *"It is not a statement about whether the
  student exists."*

A saved copy is stamped as one in words (`Last synchronised: 3 h`), not only in
a colour — a colour is not a sentence and is not readable to everyone.

## The Registrar is treated differently, on purpose

The Registrar's office is a workbench: below the summary, every panel is either
something the device was never allowed to keep or an action that needs a live
server to be safe. So a saved lookup does **not** render into the live record
UI. It renders as a separate, clearly-labelled, read-only card —

> **Saved copy on this device — not the live register**

— listing name, admission number, enrolments, certificates, and stating plainly
that attendance, results, fees, guardians and the lifecycle history are not held
and that no registry action can be taken from it. A half-filled record with
live-looking buttons would invite a Registrar to work from it.

## The blocker: nobody issues the key

**This layer is inert in production today, and that is the correct state.**

The device store encrypts every record under a key derived from a session secret
that is never persisted (`shrs-offline-policy.js` §7: `keyPersisted: false`).
Nothing calls `openSession`, so `sessionValid()` is false, nothing is written,
and the portal behaves exactly as it did before — live or nothing. The test
proves this directly: *"with no key material… nothing is written to the device."*

The client cannot fix this itself. A key the browser generates and stores is not
a key, it is obfuscation, and the policy refuses it. The server must issue
per-session offline key material, and there are two shapes with a real trade-off
between them:

1. **In the `me` response only**, held in memory. Safe; dies on reload; makes a
   cold offline start impossible, which would reduce the twelve-hour offline
   session to the lifetime of one page — i.e. it would not be an offline
   session at all.
2. **A script-readable cookie**, `Secure`, `SameSite=Strict`, expiring with the
   offline session. Survives a reload, which is the entire point of a
   twelve-hour window. The cost is that script running on the page can read it.
   That is already true of anything the page can decrypt, but it widens the
   blast radius of an XSS from "this tab" to "the cache".

**This is the Founder's decision, not the code's.** It is recorded here and in
the header of `js/shrs-portal-offline.js`. Until it is made, this item stays
**REQUIRES EXTERNAL ACTION** and must not be described as offline portal access
being live.

## Files

- `js/shrs-portal-offline.js` — the bridge, `openSession`/`closeSession`, the
  freshness stamp, and the two "there is nothing here" sentences in four
  languages.
- `js/shrs-offline-policy.js` §9 — `PORTAL_VIEWS`, `PORTAL_VIEW_EXTENSIONS`,
  `isViewKeyCacheable`, `redactViewForCache`.
- `js/portal-dashboard.js`, `js/portal-student-dashboard.js`,
  `js/portal-staff-registrar.js` — the call sites.
- `css/portal.css` — `.portal-freshness`, `.registrar-held-record`.
- `scripts/test-portal-offline.mjs` — 40 checks.
