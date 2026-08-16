# Institutional Announcement & Communication System

This is the "Priority 2" build authorised after the header/footer
prestige rebuild — a real, working announcement pipeline (admissions
notices, ceremonies, academic notices, category-specific communications
for the Qur'an College and Islamic and Arabic Studies) rather than a
mockup with sample content. **No announcement, event, date, or venue has
been fabricated anywhere in this build.** The system currently holds
zero rows and is designed to look deliberately, honestly complete in
that state — every surface below has a real, load-bearing empty state
defined server-side, not a placeholder that reads as broken or
unfinished.

## What ships

- **`announcements` table** — one row per notice, with a category, a
  status workflow (`draft` → `published` → `archived`, never deleted),
  an optional event date/time/venue, an optional image and action
  button, and a single `is_featured` flag that drives the homepage hero.
- **Public read API** — `GET /api/portal/announcements/list` — no
  authentication, since this is public communications content, not
  student/guardian data. Powers all three frontend surfaces below.
- **Staff write API** — `POST /api/portal/admin/announcements` — driven
  by the Newsroom at `/portal/staff/newsroom/`, and still callable
  directly with the same "protected raw API" convention as
  `admin/students.js`. Auth is now dual: a real staff session (Registrar,
  Principal, or Executive, via the Permission Engine) is the primary
  path, with `PORTAL_ADMIN_TOKEN` kept as a fallback — see the section
  below.
- **The Newsroom** — `/portal/staff/newsroom/`, the staff UI over that
  endpoint: compose, **edit**, publish, pull back, feature, archive.
  Every action is one explicit request and the list is re-read after each
  one, so the page shows what the database says rather than what it hoped
  happened.
- **The ribbon** — a thin strip between the header and page content on
  every page, site-wide, EN+AR. Shows the latest published
  announcements as a horizontally scrollable row of pills; shows "No
  active announcements." when there are none.
- **The homepage hero** — a flagship section on `/` and `/ar/` showing
  the single featured announcement (title, category, summary, image,
  venue, date/time, action button) in full; shows a real institutional
  placeholder message ("Nothing scheduled at present…") when nothing is
  featured, never a blank box.
- **The countdown** — inside the hero, counts down to the featured
  item's event date/time if it has one; shows "No upcoming scheduled
  events." otherwise. Recomputed client-side every 60 seconds.
- **The archive** — `/announcements/` and `/ar/announcements/`, a
  permanent, filterable (by category) record of every published and
  archived notice. Nothing here is ever hard-deleted — `archive` is a
  status, not a delete action.

## Why staff-mediated, not self-service — and the auth model today

This endpoint has been migrated (Migration Phase D item #4b,
`docs/identity-migration-plan.md`) off its original `PORTAL_ADMIN_TOKEN`-
only auth onto the Staff Identity Platform, mirroring the Founder
Dashboard and Hifz/Ijazah administration dual-auth pattern:

- **Primary path — staff session + Permission Engine.** A real staff
  session (REG, PRIN, or EXE) is checked against the `communications`
  area in `functions/_lib/permission-matrix.js`: C for `create`, E for
  `update`, P for `publish`/`unpublish`/`feature`/`unfeature`, Ar for
  `archive`. E and Ar were added to those three roles' rows specifically
  for this migration — see `docs/role-permission-matrix.md` §4.15 for the
  full reasoning, including the one gap this migration does not solve:
  PRIN's "own institution" scope can't be checked at the row level
  because `announcements` has no `institution_id` column.
- **Fallback — `PORTAL_ADMIN_TOKEN` bearer.** Kept only because no real
  REG/PRIN/EXE staff account is confirmed to exist in any reachable
  environment yet; removing the token now would lock the endpoint out
  entirely. Retire it once one does (same recommendation as the Founder
  Dashboard and Hifz/Ijazah items in `docs/identity-migration-register.md`).

## Category list

`admissions`, `events`, `academic_notices`, `quran_college`,
`arabic_studies`, `scholarships`, `parent_notices`, `general` — the
eight categories named in the Priority 2 brief. Category display labels
are bilingual (EN/AR) in `js/announcements.js`; announcement **content**
itself (title/summary/body) is free text in whichever single language
staff enter it, matching the same single-language-per-record convention
already used for every other piece of staff-entered portal data (student
names, Hifz notes, etc.) — there is no automatic translation, and
Arabic-language announcements need to be entered as their own separate
rows if wanted on the Arabic site.

## Setup

Shares the same Cloudflare Pages + Neon database as the rest of the
portal.

1. Redeploy, then re-run the setup endpoint (safe to run again — every
   statement is additive):
   ```
   curl -X POST https://<your-domain>/api/portal/setup \
     -H "x-setup-token: <the PORTAL_SETUP_TOKEN you set>"
   ```
   This creates the `announcements` table. No demo announcement is
   seeded — unlike the demo guardian/student, inventing a sample notice
   would violate the "no fabricated events" rule this whole system was
   built under, even as a fixture. Use the curl examples below against a
   real database (or the mocked responses in your own local testing) to
   see the populated states.

2. **No new environment variable** — the fallback path reuses
   `PORTAL_ADMIN_TOKEN` (see the auth model section above). The primary
   path needs no new variable either; it uses the same staff session
   cookie every Teacher/Registrar/Finance staff endpoint already reads.

## Publishing an announcement

Every request needs an `action`, and either a real staff session cookie
(sign in at `/portal/staff/login/` with a REG/PRIN/EXE account) or the
fallback header `x-admin-token: <PORTAL_ADMIN_TOKEN>`. The curl examples
below use the token header since that's what's scriptable outside a
browser — a signed-in staff session works identically, just via cookie
instead of header. One action per request, never an implicit upsert —
same pattern as the Ijazah grant/revoke calls in `admin/hifz-progress.js`.

**Create** (always starts as `draft`):
```
curl -X POST https://<your-domain>/api/portal/admin/announcements \
  -H "x-admin-token: <token>" -H "content-type: application/json" \
  -d '{
    "action": "create",
    "category": "admissions",
    "title": "2026/2027 Admission Now Open",
    "summary": "Applications for the next academic session are open across all four institutions.",
    "actionLabel": "Start Your Application",
    "actionUrl": "/admission/",
    "createdBy": "Admissions Office"
  }'
```

**Update** (send only the fields that changed):
```
curl -X POST https://<your-domain>/api/portal/admin/announcements \
  -H "x-admin-token: <token>" -H "content-type: application/json" \
  -d '{"action": "update", "id": 1, "summary": "Revised wording."}'
```

**Publish / unpublish / archive:**
```
curl -X POST .../api/portal/admin/announcements -H "x-admin-token: <token>" -H "content-type: application/json" -d '{"action": "publish", "id": 1}'
curl -X POST .../api/portal/admin/announcements -H "x-admin-token: <token>" -H "content-type: application/json" -d '{"action": "unpublish", "id": 1}'
curl -X POST .../api/portal/admin/announcements -H "x-admin-token: <token>" -H "content-type: application/json" -d '{"action": "archive", "id": 1}'
```

**Feature on the homepage hero** (must already be published; unfeatures
every other row first, so only one item is ever featured at once):
```
curl -X POST .../api/portal/admin/announcements -H "x-admin-token: <token>" -H "content-type: application/json" -d '{"action": "feature", "id": 1}'
curl -X POST .../api/portal/admin/announcements -H "x-admin-token: <token>" -H "content-type: application/json" -d '{"action": "unfeature", "id": 1}'
```

An **event** announcement additionally takes `eventDate` (`YYYY-MM-DD`),
`eventTime` (free text, e.g. `"10:00 AM"`), and `venue` — these drive the
hero's countdown and the meta row shown on both the hero and archive
cards. A non-event notice (e.g. a policy update) can omit all three.

### RSVP counter and post-event gallery

An event that's featured on the homepage hero automatically gets an
**RSVP button** ("I'll be there") and a **Share button** — no admin
action needed for either; they're driven by `eventDate` being present.
RSVP taps hit the public, unauthenticated `POST
/api/portal/announcements/rsvp` endpoint (`{"id": 1}`), which increments
`rsvp_count`. No name or contact info is collected — it's a headline
count, not a guest list. A visitor's own browser remembers they already
tapped it (localStorage) so the button doesn't double-count on a refresh;
this is an honest-count safeguard, not fraud-proofing, which matches the
trust level of the rest of this system.

Once the event has happened, archive it (`{"action": "archive", "id":
1}`) and, when real photos exist, attach them with `galleryImages` — an
array of `{"url": "...", "alt": "..."}` objects, set via `update`:
```
curl -X POST https://<your-domain>/api/portal/admin/announcements \
  -H "x-admin-token: <token>" -H "content-type: application/json" \
  -d '{
    "action": "update",
    "id": 1,
    "galleryImages": [
      {"url": "/assets/images/gallery/graduation-2026-1.jpg", "alt": "Graduating students receiving certificates on stage"},
      {"url": "/assets/images/gallery/graduation-2026-2.jpg", "alt": "Families seated in the Grand Hall"}
    ]
  }'
```
The gallery only ever shows real, uploaded photos — never a placeholder
grid — and only appears on the **archive** card once `status` is
`archived` (a featured/upcoming event never shows a gallery, since it
hasn't happened yet). Send `"galleryImages": null` to clear it.

### Worked example — Academic Graduation Ceremony, 8 August 2026

The exact sequence to make this specific event live end-to-end, ready to
run once `PORTAL_ADMIN_TOKEN` is configured in Cloudflare (this workspace
has no production database credentials, so these commands have not been
run against live data — they're ready for whoever holds the token to
run):
```
# 1. Create it (starts as draft)
curl -X POST https://<your-domain>/api/portal/admin/announcements \
  -H "x-admin-token: <token>" -H "content-type: application/json" \
  -d '{
    "action": "create",
    "category": "events",
    "title": "Academic Graduation Ceremony",
    "summary": "Celebrating the graduating cohorts of Ibtida'\''iyyah, I'\''dadiyyah, and Sultan Hanafi Qur'\''an College — the School Grand Hall, Saturday 8 August 2026.",
    "venue": "School Grand Hall",
    "eventDate": "2026-08-08",
    "eventTime": "10:00 AM",
    "actionLabel": "Plan Your Visit",
    "actionUrl": "/contact/",
    "createdBy": "Registrar & Communications Office"
  }'
# -> note the returned id, call it <id> below

# 2. Publish it, then feature it on the homepage hero
curl -X POST https://<your-domain>/api/portal/admin/announcements -H "x-admin-token: <token>" -H "content-type: application/json" -d '{"action": "publish", "id": <id>}'
curl -X POST https://<your-domain>/api/portal/admin/announcements -H "x-admin-token: <token>" -H "content-type: application/json" -d '{"action": "feature", "id": <id>}'

# 3. After 8 August 2026, once real ceremony photos exist:
curl -X POST https://<your-domain>/api/portal/admin/announcements -H "x-admin-token: <token>" -H "content-type: application/json" -d '{"action": "archive", "id": <id>}'
curl -X POST https://<your-domain>/api/portal/admin/announcements -H "x-admin-token: <token>" -H "content-type: application/json" -d '{"action": "update", "id": <id>, "galleryImages": [{"url": "...", "alt": "..."}]}'
```
Once step 2 runs, the homepage hero shows the full premium treatment
covered above: banner, countdown, RSVP counter, and Share — automatically,
with no further code changes.

## Reading announcements (public, no token)

```
GET /api/portal/announcements/list                         # latest 30 published, any category
GET /api/portal/announcements/list?category=events          # one category only
GET /api/portal/announcements/list?includeArchived=true     # archive page's full history
POST /api/portal/announcements/rsvp   {"id": 1}             # public — increments rsvp_count on a published row
```
Returns `{ ok, items: [...], featured: {...} | null }` — `featured` is
the single row with `is_featured = true`, independent of any category
filter, so the hero can render regardless of what the ribbon/archive are
currently showing. Each item also carries `rsvpCount` and
`galleryImages` (`null` until staff set one).

## Testing note

Same limitation as `parent-portal.md` and `student-portal.md`: this
sandbox has no internet egress, so live database calls could not be
exercised end-to-end from here. The ribbon, hero, countdown, and archive
were verified locally with Playwright driving real Chromium against
`GET /api/portal/announcements/list` mocked via `page.route()` — covering
the zero-announcements state, a populated ribbon, a featured hero item
with and without an event date, and archive filtering — not against a
real Neon database. Once you complete the setup above, publish a real
announcement and confirm it appears correctly across all four surfaces
before relying on this for a real event.

---

## Editing, and why clearing a field had to be possible

`update` existed from the day the endpoint was written and nothing ever
called it. The Newsroom could compose, publish, feature and archive — but
not correct. A typo in a live notice could only be met by archiving it
and writing it again, which starts a new row, abandons the RSVP count,
and leaves the wrong wording standing in a record that is **never
deleted**. The archive is permanent, so a mistake left in it is left
there for good. That is why **Edit is offered in every status, archived
included**.

The update is COALESCE-per-field, so a request naming three fields
changes three fields. That convention had one gap: a field could be
changed but never emptied. An editor needs both — a venue entered against
the wrong notice, or an event date on something that is not an event, has
to come off.

So the two shapes are now distinct:

| The editor sends | The endpoint does |
|---|---|
| field absent | leaves the stored value alone |
| field present, empty | **clears it to NULL** |
| field present, with a value | sets it |

`category`, `title` and `summary` are exempt: the schema declares them
NOT NULL, and an empty title is a mistake rather than an instruction, so
it is refused with a message saying so.

The composer sends the two shapes differently on purpose — on create an
empty field is simply not sent, so the column keeps its default; on
update an empty field is sent as `""`. One rule could not serve both.

**A failed save never empties the composer.** The request reports whether
it succeeded, and the form is only cleared once the work is safely
stored. Losing what someone has just written is the worst possible moment
to lose it.

## The image field

`image_url` has been on the table since the beginning and was reachable
from no screen — not at create, not after. The homepage hero is built
around a picture, so in practice the hero could never have one. The
composer now carries the field, and the editor can add a picture to a
notice already published.
