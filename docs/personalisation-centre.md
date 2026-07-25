# Personalisation Centre — what it is and what's real today

A site-wide preferences layer, opened from the small "Personalise" control
in the top bar of every page (English and Arabic). It replaces the idea of
a technical "Settings" page with something scoped to what actually gives a
visitor, parent, student, or staff member genuine value. This document
tracks what's actually built and working versus deliberately deferred, so
nothing in the panel silently pretends to work when it doesn't.

## What's fully real today

- **Accessibility** — Text Size (Small/Medium/Large), Theme
  (Royal/Light/Dark), and Motion (Standard/Reduced) all apply instantly,
  site-wide, and persist per-device via `localStorage`. Text size scales
  the whole site because it's built on `rem` units. Reduced Motion kills
  CSS transitions/animations everywhere and is also read by the stat-band
  counter animation in `js/site.js`. Theme is real but deliberately scoped
  — see "Why Theme doesn't re-theme everything" below.
- **Islamic Preferences** — a live Hijri date (calculated locally via the
  standard tabular/"Kuwaiti algorithm" civil calendar) and prayer times
  (via the free Aladhan calculation API, Muslim World League method,
  defaulting to the school's own coordinates in Ikorodu, Lagos, with an
  opt-in "use my location" button for families anywhere — Riyadh, Jeddah,
  Doha, Dubai, Kuala Lumpur, Abuja, London, Paris, etc.). An "Upcoming"
  Islamic-event note appears when Ramadan, Eid al-Fitr, or Eid al-Adha is
  within ~45 days, from the same Hijri calculation. All of this is
  disclosed as a **calculated estimate** — moon-sighting-based dates can
  differ by a day, and the panel says so rather than implying religious
  authority.
- **AI Assistant office routing** — picking an office (Admissions, Parent
  Services, Student Affairs, Academic, Qur'an College) biases the same
  Digital Academic Assistant's opening focus and tone (see
  `OFFICE_PROFILES` in `functions/api/chat.js`) — it doesn't create five
  separate assistants or unlock new facts, and can still answer anything.
- **Quick Access** — a default landing page (redirects instantly from the
  homepage via an inline blocking script in `partials/head.html`, before
  first paint — no flash of the wrong page) and floating-action toggles
  (WhatsApp, AI Assistant, Apply Now, and a new **Call School** floating
  button added specifically to make this toggle honest — it didn't exist
  before this feature).
- **Privacy & Data Requests** — a real form (`functions/api/portal/privacy-request.js`)
  that records access/correction/deletion requests under the Nigeria Data
  Protection Act 2023, reviewed by staff — open to anyone, not just
  signed-in guardians.
- **Change Password** — for signed-in Parent Portal guardians, a real
  self-service change (`functions/api/portal/change-password.js`),
  requiring the current password for re-authentication.
- **Notifications preferences** — for signed-in guardians, real storage of
  channel and type preferences (`guardian_notification_preferences`
  table). **Only the "Website" channel actually delivers anything today**
  (the existing in-portal notification bell) — Email/WhatsApp/SMS are
  saved for when those channels exist, and the panel labels them
  accordingly rather than implying they're live.

## Phase 2 additions

A follow-up directive asked for a much larger "Prestige Personalisation &
Digital Campus Centre" — 14 accent colours, a full Voice Experience Centre
with named voice personas, online/busy/DND presence, Qiblah, Ramadan Mode,
9 AI offices, and more. That message also contained the requester's own
more disciplined counter-structure, explicitly warning against exactly
that kind of excess and citing Eton, Harrow, King's College, GEMS, and
Qatar Foundation as the right comparison. Phase 2 follows that restrained
structure. New real, working additions:

- **Accent Colour** — Royal Gold (default), Coffee Brown, Emerald, Navy,
  Burgundy. Deliberately scoped to what's precisely controllable: the
  Personalisation Centre panel itself, the sitewide primary button
  (`.btn-gold`), and the floating action buttons — **not** the crest,
  seal, ledger headings, or mega-menu gold treatments, which are brand
  identity and stay constant. `var(--gold)`/`var(--gold-bright)` appear
  149 times across `brand.css`; a blind global swap risked recolouring
  brand-constant elements alongside genuinely interactive ones, so this
  only touches the ~10 selectors that were already written this session
  and are known to be safe. Extending further needs the same kind of
  audit `--surface`/`--on-surface` got for Theme.
- **Reading Mode** — High Contrast (strengthens `--on-surface`/`--line`,
  underlines links) and Dyslexia-Friendly (swaps to Atkinson Hyperlegible,
  an openly-licensed accessibility typeface, loaded on demand rather than
  bundled into every visitor's page weight) — both real. "Screen Reader
  Support" and "Keyboard Navigation" were **not** added as toggles: proper
  accessibility semantics (ARIA roles, keyboard focus order, Escape-to-close)
  should always be on for everyone, not something to switch off — the panel
  already has them built in structurally.
- **Text Density** — Comfortable/Compact, scoped to the panel and the
  existing `.ledger-row` component, not claimed sitewide.
- **Date & Time Format** — Gregorian/Hijri/Both, 12h/24h — applied to the
  one place the site shows a live date/time, the topbar Islamic strip.
- **AI Communication Style** — Formal/Professional/Parent-Friendly, a real
  tone bias in `functions/api/chat.js` alongside Office.
- **Friday reminder** and an **expanded Islamic events check** — real,
  local-time-based, no push infrastructure needed.
- **Verse of the Day / Hadith of the Day** — a deliberately small, and
  english-translation-only, set (6 verses, 5 hadith — Bukhari & Muslim
  agreed-upon only). The Arabic Qur'anic text is **not** reproduced from
  memory here — the risk of a transcription error in sacred text
  outweighed the value of showing it, so only the translation and a
  checkable citation (Surah:Ayah / collection) are shown, in both
  language editions. **This set should be reviewed by the school's own
  Islamic scholars (Shaykh Ahmad Ibrahim, Shaykh Abubakr Solah) before
  being treated as final** — flagged, not blocking, since every item
  chosen is deliberately uncontroversial and independently verifiable.
- **Download My Data** — real self-service JSON export
  (`functions/api/portal/export-data.js`) for signed-in guardians, of
  exactly their own guardian and children's records.
- **Dashboard tab** — Favourite School (a quick link) and Recently
  Viewed (automatic page-visit history, `localStorage`-only, capped at 8,
  no new UI needed on any other page). Device-local only — doesn't sync
  across devices, an honest limitation rather than a bug.

### Explicitly not built in Phase 2, and why

- **Voice Experience Centre** (named voice personas — "Academic Male,"
  "Arabic Female," British/American English, etc.) — browsers expose
  generic system voices, not curated professional personas; promising
  named voices that don't exist would be exactly the kind of dishonest UI
  this project avoids. The assistant's existing "Read replies aloud"
  toggle already covers real text-to-speech.
- **Online/Busy/Do Not Disturb status** — no live chat-presence system
  exists behind it; would be a decorative toggle with nothing to control.
- **Cookie Preferences** — the site has no tracking/analytics cookies to
  opt out of, only the strictly-necessary Parent Portal session cookie. A
  toggle here would be consent theatre.
- **Region selector, 9 AI offices, Qiblah, Ramadan Experience Mode,
  Campus Experience section** (virtual tour, event calendar, transport
  updates) — nothing real exists behind these yet; building the control
  before the substance is the exact pattern the requester's own message
  warned against.

## Language

English and Arabic are fully real, immediate, and cover the whole site.
The panel lists all nine languages named in the original brief
(Français, Yorùbá, Hausa, Urdu, Türkçe, Chinese Simplified, Bahasa Melayu)
so the destination is visible, but the seven not yet translated are marked
**"In translation"** and aren't clickable — translating the full site,
including 31 published legal/governance policy documents, into seven more
languages is its own multi-phase project (~460,000 words), tracked
separately, not bundled into this feature's build. English remains the
governing text for any policy document until a translation is confirmed
complete.

## Deliberately deferred (marked "Coming soon" in the panel, not hidden)

- **Two-Factor Authentication** — no TOTP/backup-code infrastructure
  exists yet; a real implementation needs its own phase.
- **Active Sessions** — the portal's session model is a single stateless
  signed cookie, not a queryable session store; listing/revoking devices
  needs a schema change (a `sessions` table) before it can be real.

Both are shown in the Security & Privacy tab with a "Coming soon" badge
and a one-line explanation, the same honest-placeholder pattern used
throughout this project for anything not yet built.

## Why Theme doesn't re-theme everything

`css/brand.css` is a deliberately dark-luxury design — most editorial
sections use `background:var(--navy)` with light text
(`color:var(--ivory)` or hardcoded `#fff`), not a light page with a bolted-on
dark mode. Investigating before building this: `--ivory` alone is used as
**both** the light body/section-background color (14 places) **and** the
light-text-on-dark-navy-band color (19 places), plus another 24 places use
raw `#fff` for the same on-dark-band role. Blindly inverting `--ivory` for
a "Dark Theme" would have made that on-navy text invisible in ~40+ spots —
exactly the kind of half-broken toggle this project doesn't ship.

The fix: two new CSS variables, `--surface` and `--on-surface`, alias
specifically the light-reading-surface role (the default body background
and the ivory-banded content sections' text) and nothing else. Royal
(default) leaves them equal to the original `--ivory`/`--ink` — zero visual
change. Dark and Light theme only override `--surface`/`--on-surface`. The
navy/gold dramatic editorial bands (hero sections, governance quote
panels, boarding/facilities bands) keep their designed high-contrast
styling in every theme — a deliberate scope boundary, not an oversight.

## Files

- `partials/personalisation.html` / `.ar.html` — the panel markup, built
  into every manifest page via `scripts/build.js` (same per-locale suffix
  pattern as the assistant/search/topbar partials).
- `css/personalisation.css` — drawer, tabs, and all option-control styling.
- `js/personalisation.js` — all client-side logic: preferences
  load/save, Hijri/prayer calculation, drawer/tab wiring, and the
  Notifications/Security tabs' API calls.
- `functions/api/portal/notifications/preferences.js`,
  `change-password.js`, `privacy-request.js`, `export-data.js` — the
  backend endpoints, following the same Cloudflare Pages Functions
  pattern as the rest of the portal (see `docs/parent-portal.md`).
- `sql/schema.sql` / `functions/api/portal/setup.js` — the two new tables
  (`guardian_notification_preferences`, `privacy_requests`), additive and
  idempotent like the rest of the schema.
