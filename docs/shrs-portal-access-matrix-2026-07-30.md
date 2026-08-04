# SHRS Portal Access Matrix & Founder Testing Runbook — 2026-07-30

Direct answer to the Founder Override Directive: exact URLs, exact login routes, exact steps, exact tokens, exact role codes, and exactly what needs to be true in Cloudflare and Neon — so you can personally register, log in, and operate every real portal today, without waiting on another development cycle.

**Repeating the one constraint that hasn't changed, stated once, plainly:** this coding session has no login to your Cloudflare or Neon accounts — confirmed by running `wrangler whoami`, which returns "not authenticated." There is no button here that creates your account for you. Every step below is something **you** click, using credentials **you** already hold (the infrastructure docs record the account owner as `Ahmadbinibrohim@gmail.com`). Where a step needs a token value, it's a value already sitting in your own Cloudflare Pages → Settings → Environment Variables — this document tells you exactly which variable name to copy, not the value itself, since this session cannot read your Cloudflare account either.

Two real environments exist, both reachable right now:

| Environment | URL | Database | Data |
|---|---|---|---|
| **Staging** (Preview, this branch) | `https://shroyalschools-web.pages.dev` | Separate Neon project, `PORTAL_DEMO_PASSWORD` set | Seeded demo Guardian/Student/Teacher accounts, proven live 2026-07-28 |
| **Production** | `https://shroyalschools.com` | Separate Neon project, no demo password | Correctly empty — zero real institutional records yet |

Use **Staging** to test freely without touching real data. Use **Production** only once you're ready to create real accounts for real people — anything you create there is real.

---

## Part 1 — Portal Access Matrix

| Portal | URL | Login Method | Required Role | How Access Is Granted | Status |
|---|---|---|---|---|---|
| Portal Chooser | `/portal/select/` | — | — | Public entry point | Live |
| Parent / Guardian | `/portal/login/` (register at `/portal/register/`) | Email + password, MFA (email OTP) | None — self-service | Self-registration, own account | **Live, proven** |
| Student | `/portal/student/login/` | Admission No. + password | None — issued, not self-registered | Registrar/admin issues login via Admin API | **Live, proven** |
| Teacher | `/portal/staff/teacher/` (via `/portal/staff/login/`) | Staff No. + password, MFA | `TCH` role grant | Administration Centre "New Staff + Login" | **Live, proven** |
| Staff (generic identity/org chart) | `/portal/staff/offices/`, `/portal/staff/org-chart/` (via `/portal/staff/login/`) | Staff No. + password, MFA | Any staff role | Administration Centre | **Live** |
| **Head of Schools / Administrator** | `/portal/founder/` | Token gate (fastest) **or** staff session with `EXE` role | `EXE` role, or `PORTAL_FOUNDER_TOKEN` | Token: read from Cloudflare env var. Session: Administration Centre grant | Token path **live, proven**; no personal `EXE` account created yet |
| **Registrar** | `/portal/staff/registrar/` (via `/portal/staff/login/`) | Staff No. + password, MFA | `REG` role grant | Administration Centre | Code complete; **not yet exercised live** (no seeded account) |
| **Finance Officer** | `/portal/staff/finance/` (via `/portal/staff/login/`) | Staff No. + password, MFA | `FIN` role grant | Administration Centre | Code complete; **not yet exercised live** |
| Principal (Secular College) | `/portal/office/principal-royal-college/` (via `/portal/staff/login/`) | Staff No. + password, MFA | `PRIN` role + office appointment | Administration Centre | Live (governance-layer content; no deep ops tool yet) |
| Head Teacher | `/portal/office/head-teacher/` (via `/portal/staff/login/`) | Staff No. + password, MFA | `PRIN` role + office appointment | Administration Centre | Live (same as above) |
| Ra'ees | `/portal/office/raees/` (via `/portal/staff/login/`) | Staff No. + password, MFA | `PRIN` role + office appointment | Administration Centre | Live (same as above) |
| Mudeer | `/portal/office/mudeer/` (via `/portal/staff/login/`) | Staff No. + password, MFA | `PRIN` role + office appointment | Administration Centre | Live (same as above) |
| Board of Governors | `/portal/office/board-of-trustees/` (via `/portal/staff/login/`) | Staff No. + password, MFA | Board office appointment | Administration Centre | Live (governance structure; no Board Papers Centre yet) |
| Administration Centre (ICT/sysadmin) | `/portal/admin/centre/` | `PORTAL_SYSADMIN_TOKEN` | — | Read from Cloudflare env var | **Live** — this is where every account below gets created |
| One-time DB Setup | `/portal/admin/setup/` | `PORTAL_SETUP_TOKEN` | — | Read from Cloudflare env var | Live — already run on both environments; safe to re-run, won't duplicate data |

---

## Part 2 — Exactly how you enter each one, right now

### Step 0 — Find your five tokens (2 minutes, once)

Open **Cloudflare dashboard → Pages → `shroyalschools-web` → Settings → Environment Variables**, pick the environment (Preview for staging, Production for production), and copy these values somewhere safe for this session:

- `PORTAL_SETUP_TOKEN`
- `PORTAL_SYSADMIN_TOKEN`
- `PORTAL_FOUNDER_TOKEN`
- `PORTAL_ADMIN_TOKEN`
- `PORTAL_QURAN_TOKEN`

If any of these are missing, add one (any strong random string) before continuing — the platform refuses to run the corresponding action without it, by design (fails closed, not open).

### Step 1 — Head of Schools / Administrator: enter right now with the token (30 seconds)

1. Go to `https://shroyalschools-web.pages.dev/portal/founder/` (staging, has real demo data) or `https://shroyalschools.com/portal/founder/` (production, real but currently empty).
2. Paste `PORTAL_FOUNDER_TOKEN` into the "Dashboard token" field.
3. You're in — Executive Overview, Four Schools Overview, Executive Alerts Centre, Strategic Progress Centre, and every detailed section all load immediately.
4. Institutional Messaging isn't inside the Founder Dashboard itself — it's per-office. To see it as an executive, open any office portal (e.g. `/portal/office/executive/`) once signed in as staff (Step 2) and use its **Messages** tab.

### Step 2 — Create your own real, individually-accountable Founder account (5 minutes)

The token above is a shared "break glass" credential, not a personal login. To sign in as **yourself**, with a named session (and to unlock Governance/Messaging, which need a staff session, not the token):

1. Go to `/portal/admin/centre/`, paste `PORTAL_SYSADMIN_TOKEN`.
2. Click **New Staff + Login**. Fill in your name, a Staff No. (any unique code, e.g. `SHR-STF-0001`), and a password you'll actually use.
3. On the same form (or immediately after, via the office/role assignment section), grant the role code **`EXE`** — this is the exact code from the Role & Permission Matrix that gates Founder Dashboard access via a real session (`functions/api/portal/founder/dashboard.js` checks `EXE` first, before falling back to the token).
4. Also give yourself an **office appointment** to the "Executive" office (slug `executive`) if you want it to show under your name in the Org Chart and Office Switcher.
5. Go to `/portal/staff/login/`, sign in with the Staff No. + password you just set.
6. Go to `/portal/founder/` again — it now loads via your real session (footer will say "Signed in as [your name]" instead of "Viewed via the legacy Founder token").

### Step 3 — Registrar: create the account, then do everything you asked to test

1. Same Administration Centre form as Step 2, new staff record, role code **`REG`**, office appointment to "Registrar's Office" (slug `registrar`).
2. Sign in at `/portal/staff/login/`, land at `/portal/staff/registrar/`.
3. **Issue certificates** — look up a student by Institutional Student Number, use the "Certificates" panel's "Request Certificate" form. (Note: certificate issuance requires a **Principal's approval** before it's final — see the honest note already on that form. To fully exercise this yourself, also create a second account with role `PRIN` and an office appointment, so you can approve your own Registrar-issued request as that second identity.)
4. **Verify certificates** — the public verification page is `/verify-certificate/` (no login needed — anyone with the reference number/QR can check a certificate's authenticity).
5. **View transcripts** — the student record's "Academic Standing" and "Latest Term Results" panels on the same Registrar page are the transcript view today; a dedicated print-formatted Transcript Centre module doesn't exist as a separate page yet (queued, task #440).
6. **Manage admissions** — now live at `/portal/staff/admissions/` (built 2026-07-30, Phase A of the operational-validation sequence): review queue, filter by status, Approve/Decline/Request-More-Info actions, and a full per-application audit-trail timeline. See `docs/shrs-portal-operational-verification-phase-a.md` for the tested verification report.

### Step 4 — Finance Officer: create the account, then test

1. Administration Centre → new staff, role code **`FIN`**, office appointment to "Finance Office" (slug `finance`).
2. Sign in, land at `/portal/staff/finance/`.
3. **Create invoices** — the Finance Officer UI's invoice-creation form, scoped to a real student.
4. **View receipts** — receipts list per invoice, each with a public QR verification link (`/verify-receipt/`).
5. **View debtors** — the Debtors panel (students/guardians with an outstanding balance).
6. **View reports** — real charts exist today inside the **Founder Dashboard's** Finance section (revenue by month/institution, collection funnel, collection gauge) — the Finance Officer's own UI shows its operational data (invoices/receipts/debtors/scholarships/payment plans) but the executive-style report charts currently live on the Founder side, not duplicated into the Finance Officer's own screen yet (queued, task #441).

### Step 5 — School Leadership (Principal, Head Teacher, Ra'ees, Mudeer)

1. Administration Centre → new staff per office, role code **`PRIN`**, office appointment to the matching office: `principal-royal-college`, `head-teacher`, `raees`, or `mudeer`.
2. Sign in at `/portal/staff/login/` — each lands at its generic Office Portal (`/portal/office/{slug}/`).
3. What's real today, honestly: your appointment record, your Overview/Description, your Committees (where applicable), Meetings, Documents, and now your office's **Messages inbox** (real parent correspondence). Strategic Priorities/Annual Objectives render as a clearly-labelled TEMPLATE until you set real content via the Administration Centre.
4. What's not built yet, honestly, and is the current top priority (task #442): a genuine daily-operations dashboard — your own students/staff/attendance/academic-performance rollup, the way the Founder Command Centre now has for the whole institution. Today these four offices work at the governance/reporting layer, not yet the daily-operations layer.

### Step 6 — Board of Governors

1. Administration Centre → new staff, role/appointment to `board-of-trustees` (or one of its five committees).
2. Sign in → `/portal/office/board-of-trustees/`. Real committees, real (mostly vacant "Pending Appointment") seats, a real (currently empty) Resolutions register, Messages inbox.
3. Not yet built: Board Papers Centre, Governance Calendar as its own view, Policy Library index, Risk Register (task #443).

---

## Part 3 — What must be true in Cloudflare (already is, confirmed 2026-07-27/28)

Per `docs/shrs-infrastructure-activation-register.md`, both Preview and Production have these environment variables already set: `DATABASE_URL`, `SESSION_SECRET`, `PORTAL_SETUP_TOKEN`, `PORTAL_SYSADMIN_TOKEN`, `PORTAL_ADMIN_TOKEN`, `PORTAL_QURAN_TOKEN`, `PORTAL_FOUNDER_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`. Preview additionally has `PORTAL_DEMO_PASSWORD` (deliberately absent from Production). If any Step above fails with "Portal is not configured yet," the missing piece is one of these — check that exact variable is set on that exact environment before assuming a code bug.

## Part 4 — What must be true in Neon (already is)

Two separate Neon projects (never the same project for both environments — that separation is load-bearing for the "staging never touches real data" guarantee), each connected via `DATABASE_URL` to its matching Cloudflare environment. Nothing further is needed here — no migration, no manual table creation. `/api/portal/setup` (Part 2, tokens) already created every table on both.

---

## Bottom line

Every login route above is real and already deployed. Three things are genuinely not testable today, named plainly rather than glossed over: (1) admissions review has an API but no staff page yet, (2) Finance's report charts live on the Founder side only, not yet mirrored into the Finance Officer's own screen, (3) School Leadership offices don't yet have a deep daily-operations dashboard, only the governance/reporting layer. Everything else in this matrix — including the entire Founder Command Centre just built — is real, and Steps 1-6 above are literally all it takes to be inside it as yourself, today, using only your own existing Cloudflare login.
