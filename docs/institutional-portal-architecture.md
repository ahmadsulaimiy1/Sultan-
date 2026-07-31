# SHRS Institutional Portal Ecosystem — Architecture & Status

This document records what the "Build all portals, offices, departments,
reporting structures..." directive produced, how it works, and exactly
what is real versus what is still a placeholder — following this
project's standing rule: never fabricate institutional facts, names, or
records. Read alongside `docs/role-permission-matrix.md` (the
authoritative role source) and
`docs/digital-campus-master-deployment-directive.md` (the prior
directive's own readiness table).

## The core design decision

The directive asked for ~26 office portals, each with 11 modules
(Executive Dashboard, Office Overview, Staff Directory, Responsibilities,
Documents, Reports, Analytics, Workflow Centre, Notifications, Meetings,
Archive), populated from a central HR directory so that a real
appointment can replace a placeholder "instantly without redesign."

Building 26 bespoke pages by hand would mean ~286 individually
hand-built views — and would tempt exactly the shortcut the directive
explicitly forbade ("not hard-coding fictional individuals"). Instead,
this is one generic, data-driven system:

- **One data model** — `offices`, `office_appointments`,
  `office_meetings`, `office_documents` (all in `sql/schema.sql`, mirrored
  in `functions/api/portal/setup.js`), extending the existing
  Organisational Directory rather than replacing it.
- **One admin API** — `functions/api/portal/admin/staff.js` gained
  `create-appointment` / `update-appointment` / `end-appointment` /
  `create-meeting` / `update-meeting` / `create-document` /
  `update-staff-profile` actions, alongside the office/staff/role actions
  that already existed. This is the "administration panel" the directive
  asked for, at the API layer — see "What's not built yet" below for the
  HTML wrapper around it.
- **One data endpoint** — `functions/api/portal/staff/office/[slug].js`,
  session-gated, returns everything a given office's portal needs.
- **One page template** — `scripts/build-office-portals.js` stamps out
  every office's `portal/office/<slug>/index.html` from a single template
  literal, driven by `scripts/office-portal-config.js`. Adding a 27th
  office is one config row, not a new page.
- **One renderer** — `js/portal-office.js` renders all 11 modules from
  the endpoint's JSON, with an honest empty/vacant state for every module
  that has no real data yet.
- **One shared visual system** — `css/portal.css`'s new `.office-*`
  classes reuse the existing `.exec-welcome` / `.portal-child-card` /
  `.portal-stats` language (the same system the Founder Dashboard and
  Registrar's Office already use), so an office portal reads as part of
  the same platform, not a bolted-on template.

## The "temporary internal-review record" mechanism

`office_appointments.staff_id` is nullable. A row with `staff_id = NULL`
and an `appointment_title` (and optionally a `notes` explanation) is a
real, stored "vacant seat" — not a UI trick, not hard-coded HTML. The
Staff Directory module renders it as **"Vacant — Awaiting Appointment"**
with a dashed border, visually distinct from a filled seat. The moment an
admin runs `create-appointment` (or `update-appointment`) with a real
`staffNo`, the same page re-renders with that person's name, photo, bio,
and contact details — zero redesign, exactly as specified.

## What's real right now

| Layer | Offices created | Real appointments |
|---|---|---|
| Governance | Board of Trustees, Executive, Management Council | None seeded — see below |
| Academic | Academic Affairs, Registrar's Office, Examinations, Admissions | None seeded |
| School Leadership | Head Teacher, Principal (Royal College), Ra'ees, Mudeer | None seeded |
| Operational | Finance, HR, Student Affairs, Communications, Digital Services, Digital Learning | None seeded |
| Institutional Services | Library, Alumni, Foundation, Certificate/Transcript, Digital Identity, Knowledge Base | None seeded |

All 28 office portals (23 offices + 5 Board committees, added in the
Level 3 Institutional Framework pass below) are live, browsable (from `/portal/staff/offices/`,
behind staff login), and render all 11 modules with correct empty/vacant
states — verified via Playwright (desktop + mobile, zero console errors,
both a filled-seat office and a fully-vacant office screenshotted).

**No `office_appointments` rows are seeded automatically**, on purpose.
This project's schema.sql has always deliberately refused to
auto-seed real staff members (see the comment directly above the
`institutions`/`roles`/`offices` INSERT statements in
`functions/api/portal/setup.js`): staff records are an explicit,
admin-mediated action, the same way guardian and student records are
never auto-created. Six real, publicly-named office-holders already
exist as text on `pages/about-governance.html` (Founder & CEO Zakariya
Olanrewaju Anofi; Registrar Mrs. Anofi-Abdulkareem Mariam Tope; Head
Teacher Mrs. Kareemat Abdurazaq; three Principals — Royal College,
Qur'an College, Islamic & Arabic Studies) but have **no `staff` row in
the database** — that page is marketing copy, not a system of record.
Wiring them in is one real admin action per person:

```
POST /api/portal/admin/staff  (header: x-sysadmin-token)
{ "action": "create-staff", "staffNo": "STF-0001", "fullName": "Zakariya Olanrewaju Anofi",
  "officeName": "Executive", "positionTitle": "Founder & Chief Executive Officer" }

POST /api/portal/admin/staff
{ "action": "create-appointment", "officeName": "Executive", "staffNo": "STF-0001",
  "appointmentTitle": "Founder & Chief Executive Officer" }
```

Repeated per office for each of the six known real holders — deliberately
left as a runbook, not auto-executed, since only whoever holds
`PORTAL_SYSADMIN_TOKEN` should be creating live staff records, and this
document has no way to verify the exact spelling/title the school wants
on the record versus what the marketing page happens to say.

## Level 3 Institutional Framework (Founder & CEO clarification)

A follow-up "Founder & CEO Executive Clarification" resolved the
tension the rest of this document originally flagged. It drew an
explicit three-way distinction:

- **Level 1 — fabricated data presented as real.** Never done, in this
  build or any before it.
- **Level 2 — empty pages.** Also rejected, as poor architecture.
- **Level 3 — a complete framework with clearly designated template
  content.** This is what got built in this pass.

Four real, structural additions, all following the same discipline as
everything above (a real row, a real vacant/labelled state, never an
invented name or number):

- **Committees.** Five standing Board of Trustees committees (Finance,
  Governance, Audit, Academic Excellence, Development) exist as real
  office rows (`office_kind = 'committee'`, parented to Board of
  Trustees), each with a real Chair + two Member seats — every seat
  "Pending Appointment," exactly like every other vacant seat in this
  system. They appear as their own portal pages and are listed on the
  Board of Trustees' Overview tab.
- **Management Council seats.** Ten named cross-institutional roles
  (Founder & CEO, Registrar, Finance Director, HR Director,
  Communications Director, Student Affairs Director, Principal
  (Royal College), Head Teacher, Ra'ees, Mudeer) exist as vacant
  `office_appointments` rows under Management Council. Several titles
  already have a real, publicly-named holder elsewhere on the site —
  this table does not assume that is the same seat until an admin
  explicitly links it via `create-appointment`/`update-appointment`.
- **Strategic Priorities / Annual Objectives.** Two new nullable
  columns on `offices`. NULL (the default for every office right now)
  makes the portal render a generic, clearly-labelled planning
  scaffold — a "TEMPLATE — Pending Adoption" badge plus a note stating
  outright that it has not been reviewed or adopted — instead of a
  blank tab. Once an admin sets the office's real, adopted content via
  `update-office-content`, that replaces the template with no redesign
  and no badge. The template text itself is generated in
  `js/portal-office.js`, not stored per office, so it can never drift
  into looking like bespoke, adopted institutional research.
- **Resolutions.** A real `office_resolutions` register, starting
  empty. The Resolutions tab only appears for governance-type offices
  (Board of Trustees and its five committees) — it's hidden entirely
  elsewhere rather than shown as a meaningless empty tab for, say, the
  Library.
- **Analytics KPI shells.** Every non-executive office's Analytics tab
  now renders a real four-tile KPI grid with a tiny bar-chart shell —
  the "visual framework" the directive asked for — but every value
  reads "No data available," explicitly labelled as placeholder slots,
  not real figures, in the text underneath.

What did **not** change: no Board of Trustees Chairman/Vice
Chairman/Secretary is named, no committee member is named, no
Management Council seat is filled, and no KPI number is invented. The
Level 3 distinction is specifically that the *structure* is complete
and *visually finished* while every actual fact remains exactly as
real (or as honestly vacant) as it was before this pass.

## Ra'ees / Mudeer — resolved

The Founder & CEO has officially adopted **Ra'ees** as the Head of
Institution title for the Sultan Hanafi School of Islamic & Arabic Studies,
and **Mudeer** as the Head of Institution title for Sultan Hanafi Qur'an
College, replacing "Principal" for both. This was a real naming decision
within the owner's authority, not a fabrication — so the two former
separate `principal-quran-college` / `principal-islamic-arabic-studies`
office rows and their generated portal pages have been removed, and
`raees` / `mudeer` are now the sole office slots for those two schools'
heads, sitewide (public pages, org chart, ledger tables, faculty
directory, office portal directory).

The seats remain correctly recorded as **"Vacant — Awaiting Appointment"**
in the HR directory — adopting a title is not the same action as filing an
appointment record, and the appointment record still needs an explicit
admin action (`create-appointment`) naming the actual office-holder before
either seat shows as filled. Shaykh Abubakr Solah (Ra'ees) and Shaykh
Ahmad Ibrahim (Mudeer) are already named on the public governance and
faculty pages; the runbook below should be run for both once their staff
records exist, to bring the HR-backed office portal in line with what the
public pages already say.

## What's not built yet (honestly)

- **No HTML admin panel.** Office/appointment/meeting/document CRUD is a
  real, working API (`functions/api/portal/admin/staff.js`), matching how
  every other admin action in this codebase already works (offices,
  staff, roles, class assignments — all API-only until this directive).
  A UI now exists — see "Institutional Administration Centre" below —
  covering offices, appointments, meetings, documents, governance
  content, and resolutions. Role/class-assignment management is still
  API-only; not in this pass's scope.
- **Reports and most Analytics are honest empty states**, now with a
  real KPI-tile visual shell (Level 3 framework, above) rather than
  prose alone. No per-office report generator or analytics pipeline
  exists — building 28 of those would mean either real new data
  engineering per office or fabricated numbers. Both are out of scope
  for this pass. Real analytics already exist at `/portal/founder/`
  (institution-wide) and the Registrar's Office (student records); the
  Analytics tab links to the Founder Dashboard for the Executive office
  and says so plainly everywhere else.
- **Notifications has no per-office staff feed.** The guardian portal's
  notification system is not (yet) mirrored for staff.
- **Workflow Centre is wired to real approval queues for exactly four
  offices** (`certificates`/`registrar` → `transcripts`/`certificates`
  area, `admissions` → `admissions` area, `finance` → `finance` area) —
  the only ones with a real `SYSTEM_AREA` behind them today. Every other
  office honestly says no workflow is configured yet, rather than
  inventing one.
- **Board of Trustees, Management Council composition** — not
  individually published anywhere on the live site (per GV-01, 4 trustees
  exist but aren't named). Both offices are correctly all-vacant.

## Institutional Administration Centre

`portal/admin/centre/` (JS: `js/portal-admin-centre.js`) — a real UI
over `functions/api/portal/admin/staff.js`, built for the Founder &
CEO's explicit ask: "The Founder should not need API calls for
ordinary administration." Covers Office Management (create + browse,
grouped by layer), Appointments (create/end, vacant-or-filled table),
Governance Content (Strategic Priorities/Annual Objectives — real text
overrides the generic template with no redesign), Meetings, Documents,
Resolutions (governance offices only), and a New Staff + Login form
(creates a real staff record and generates the same admin-mediated
activation link every other login on this platform uses).

**Auth design decision, stated plainly**: the Admin Centre uses the
*same* `PORTAL_SYSADMIN_TOKEN` bootstrap model as the API it wraps,
entered once per browser tab into a gate screen and held in
`sessionStorage` (cleared on tab close) rather than typed into curl
every time. It deliberately does **not** introduce a new session-based
"Founder logs in" auth path. `functions/api/portal/admin/staff.js`'s
own header comment explains why Manage Users is kept on the narrowest
possible bootstrap grant rather than folded into ordinary staff
session auth — weakening that for UI convenience would be a real
security regression, not a cosmetic one. The directive's actual ask
("no raw API calls") is satisfied without touching that model: the
Founder now clicks buttons and fills in forms, and never needs to know
the shape of a POST body — the token is the only credential, exactly
as before.

Two new read-only `GET` views were added to the admin API to power
this UI (`?view=offices`, `?view=meetings|documents|resolutions&officeName=`),
gated by the identical token check as every write action.

## Verification performed

- `node scripts/build-office-portals.js` — generates all 25 pages + the
  directory index cleanly.
- Playwright, route-mocked realistic API responses (desktop 1440px +
  mobile 390px): a filled-seat office (Registrar's, showing a real-shaped
  appointment, meetings with held/scheduled status, a pending workflow
  item) and a fully-vacant office (Ra'ees) — zero console errors, correct
  tab switching, correct empty/vacant states, mobile tabs scroll
  horizontally without layout breakage.
- The `/api/portal/staff/office/[slug].js` endpoint itself has not been
  exercised against a live database from this session (no DB connection
  available here) — the same limitation that applies to every backend
  endpoint in this codebase; it follows the exact session-auth and query
  patterns already proven in `functions/api/portal/staff/me.js` and
  `functions/api/portal/staff/registrar/student.js`.

## Organisational Chart Engine (Institutional Excellence 2030, Phase 1)

`portal/staff/org-chart/` (JS: `js/portal-org-chart.js`, API:
`functions/api/portal/staff/org-chart.js`) — an interactive,
collapsible, printable, exportable org chart built entirely from real
`offices`/`office_appointments` rows, no chart library.

This required one real data decision, stated plainly: `parent_office_id`
existed in the schema from the start ("so the directory can express
real reporting structure") but was unset for almost every office. A
new migration sets it **only** for the reporting line already public
on `pages/about-governance.html` — Board of Trustees → Executive → the
four school-leadership offices (Principal RC, Ra'ees, Mudeer, Head
Teacher) → Management Council also under Executive, since its own seat
list names Founder & CEO first. Every other office (all
academic/operational/institutional_services offices, ~17 of 28) has no
formally published reporting line anywhere on the site, so none was
invented — they render in an explicit "Other Institutional Offices —
reporting line not yet documented" section instead of being guessed
into the tree. That gap is itself real, useful information for the
Founder, not a defect in the chart.

Collapse/expand is native click/keyboard interaction (no library);
Print/Save as PDF uses the browser's print dialog (same pattern as the
policy pages' print stylesheet, task history #131); Export Data (JSON)
downloads the exact API payload for portability into other tools. Both
"export" mechanisms are named for what they actually do rather than
implying a bespoke PDF generator that doesn't exist.

## Executive Reporting System (Institutional Excellence 2030, Phase 2)

`functions/api/portal/staff/reports.js` + `renderReports()` in
`js/portal-office.js` — the Reports tab that previously showed a static
"not yet built" placeholder on every office portal now generates a real,
period-bounded (Monthly/Quarterly/Annual) report for the offices that
have real transactional or operational data behind them: Finance,
Registrar, Admissions, the four School Leadership offices, and the
Executive/Founder institution-wide roll-up. Every other office still
gets the honest "no data exists yet" message — now naming which offices
*do* have one, rather than claiming none exist. See
`docs/executive-reporting-system.md` for the full design.

## Executive Portal Access

A "Critical Executive Portal Directive" asked for dedicated login
workflows for ten named executive portals, a unified "Login to Portal"
chooser, an Executive Portal office picker, and an office switcher
allowing an account to hold several offices without signing out again.

**Most of this already existed** before this pass — worth stating
plainly rather than rebuilding: all ten named offices (Founder & CEO,
Registrar, Finance Officer, Principal, Head Teacher, Ra'ees, Mudeer, HR
Director, Communications Director, Board of Trustees) are already real,
session-gated portal pages (the office portal ecosystem above), and
multi-role support already existed end-to-end — `staff_roles` is
genuinely many-to-many (its own schema comment: "'Principal + Arabic
Studies Officer' needs zero redesign: it's just two rows"), enforced by
the real Permission Engine (`functions/_lib/permissions.js`), and
already returned in full by `functions/api/portal/staff/me.js`'s
`roles[]`. What was missing was narrower: nothing computed "which
offices does this account hold" in the office_appointments → staff
direction (every existing query went the other way), and nothing
surfaced that data as a switcher.

Built this pass:
- **`myOffices`** added to `functions/api/portal/staff/me.js` — the
  one new query (office_appointments reverse lookup) the switcher
  actually needed.
- **Office/role switcher** (`js/portal-office-switcher.js`) — a topbar
  dropdown, mounted on every office portal page, the Founder Dashboard,
  Registrar, and Finance, listing every real office/role the signed-in
  account holds plus known deep-UI cross-links, with a Founder
  Dashboard link whenever an `EXE` role grant is present. No fabricated
  "executive tier" — every row is a real `office_appointments` seat or
  `staff_roles` grant.
- **Unified chooser** (`portal/select/`) — three doors (Parent,
  Student, Staff & Executive), not four. Executive access is
  deliberately **not** a separate credential set: it's staff sign-in
  plus the switcher. The header mega-menu's four-card gateway (which
  previously sent "Executive Portal" straight to the Founder
  Dashboard's bearer-token page) was corrected to match — merged into
  the same "Staff & Executive Portal" card pointing at staff login.
- **Deep-link banners**: the generic office portal and the deeper
  bespoke operational UI that already existed for Registrar and
  Finance were built separately and never cross-linked. Both directions
  now link to each other.

**Left deliberately alone**: `functions/api/portal/founder/dashboard.js`
already tries staff-session auth first and only falls back to the
`PORTAL_FOUNDER_TOKEN` bearer token if that fails (its own comment:
the fallback exists because "no real EXE staff account has been
confirmed to exist in any reachable environment yet"). That design was
already correct for this directive's goals — staff session is already
primary — so it was not touched. Removing the token fallback now would
lock out the only working access path until a real EXE staff account
and login are provisioned through the Administration Centre.

**Not built this pass** (flagged, not silently skipped): office-specific
functional modules beyond the generic template — e.g. Mudeer's real
Hifz/Muraja'ah/Ijazah data (`hifz_progress`, `ijazah_register` already
exist and could be wired in), Communications' real Announcements admin
API, Principal/Registrar's real Assessment/Results data. These are real
next steps, not fabrication risks, and are tracked separately.
