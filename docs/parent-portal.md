# Parent Portal (Pilot) — what it is and how to turn it on

This is Phase 1 of the "Digital Campus" ambition, scoped honestly: a real,
database-backed Parent Portal where a guardian logs in and sees their own
child's attendance, term results, and fee status. Phase 2 added a real,
independent **Student Portal** login plus a Qur'an College Hifz & Ijazah
Tracker — see `student-portal.md`. Everything else from the original
brief (teacher/principal/admin portals, ID cards, exams beyond term
results, a full LMS, finance module, etc.) is still not built — see
`digital-campus-roadmap.md` for why, and for what a fuller build would
need.

It is a genuinely separate system from the rest of the site: real
database, real login, real session cookies. It is **not functional at all**
until you complete the setup below — every piece fails with a clear,
honest error message rather than pretending to work.

This site and its backend (the AI assistant and this portal) run on
**Cloudflare Pages** (static hosting + serverless Pages Functions) with a
**Neon** serverless Postgres database — both have a free tier, and neither
has Vercel's deployment-count rate limiting.

## Setup steps

1. **Create a Neon database.** Sign up free at
   [neon.tech](https://neon.tech), create a project, and copy its
   connection string (starts with `postgresql://...`, includes
   `?sslmode=require`).

2. **Create the Cloudflare Pages project.** Sign up free at
   [dash.cloudflare.com](https://dash.cloudflare.com) → *Workers & Pages* →
   *Create* → *Pages* → *Connect to Git* → pick this repository. Set:
   - Build command: `npm run build`
   - Build output directory: `.`
   - Under *Settings* → *Functions* → *Compatibility flags*, add
     `nodejs_compat` for both Production and Preview (the portal's crypto
     and the Neon driver need it).

3. **Add environment variables**, under *Settings* → *Environment
   Variables* (set for Production; add to Preview too if you want portal
   testing on preview deploys):
   - `DATABASE_URL` — the Neon connection string from step 1.
   - `SESSION_SECRET` — any long random string (e.g. generate one with
     `openssl rand -hex 32` on any computer, or ask a developer to). This
     signs login sessions; treat it like a password.
   - `ANTHROPIC_API_KEY` — your real Anthropic API key, for the AI
     assistant.
   - `PORTAL_SETUP_TOKEN` — any long random string you choose. This
     protects the one-time database setup endpoint so a stranger can't
     trigger it.
   - `PORTAL_ADMIN_TOKEN` — a different long random string. This protects
     the endpoint used to enter real student records.
   - Optional: `PORTAL_DEMO_PASSWORD` — if set, the setup step below also
     creates one demo guardian (`demo@shroyalschools.com`) with one sample
     student, clearly labelled "sample data" everywhere it appears, so you
     can see the portal working end-to-end before any real family is
     entered. Leave it unset to skip this.

4. **Redeploy** so the new environment variables take effect.

5. **Run the one-time database setup.** Send one request (from any
   computer, or ask a developer to — this is a single command, not
   something that needs to be repeated):
   ```
   curl -X POST https://<your-domain>/api/portal/setup \
     -H "x-setup-token: <the PORTAL_SETUP_TOKEN you set>"
   ```
   This creates the database tables (safe to run again later — it won't
   duplicate anything) and, if `PORTAL_DEMO_PASSWORD` is set, creates the
   demo login.

6. **Try it.** Go to `/portal/login/` and sign in with
   `demo@shroyalschools.com` and whatever you set `PORTAL_DEMO_PASSWORD`
   to. You should see one sample student's attendance, one result, and a
   fee status — all marked as sample data.

## Adding real students

There is deliberately no admin *page* yet — only a protected API
endpoint, so that entering real children's data is something the school
office does directly against the database, not something typed into a
chat conversation with an AI assistant. Whoever holds
`PORTAL_ADMIN_TOKEN` (should be limited to school staff you trust with
this) sends a request like:

```
curl -X POST https://<your-domain>/api/portal/admin/students \
  -H "x-admin-token: <the PORTAL_ADMIN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{
    "guardian": { "fullName": "...", "email": "parent@example.com" },
    "student": { "fullName": "...", "admissionNo": "SHR-2026-001", "institution": "Royal College", "className": "JSS 1", "status": "active" },
    "attendance": { "term": "First Term 2025/2026", "daysPresent": 58, "daysTotal": 62 },
    "results": [
      { "term": "First Term 2025/2026", "subject": "Mathematics", "caScore": 34, "examScore": 52, "teacherComment": "Good progress." }
    ],
    "fees": { "term": "First Term 2025/2026", "amountDue": 150000, "amountPaid": 100000 }
  }'
```

Note there is no `guardian.password` field — staff never choose or see a
parent's password. When the guardian's email is new, the response
includes an `activationLink` (e.g.
`/portal/set-password/?token=...`) — share that link with the parent
yourself, over WhatsApp or email (whichever they prefer). They open it
and choose their own password; that's what activates the account. The
link expires after 7 days — if it does, use `admin/reset-password.js`
below to generate a fresh one.

A student can also belong to more than one class at once (e.g. Royal
College *and* Qur'an College *and* Islamic and Arabic Studies) — see
`student-portal.md`'s `additionalPrograms` field for that.

Calling this endpoint again with the same `admissionNo` updates that
student's record rather than duplicating it — safe to re-run as
results/attendance/fees change through the term (each update also drops
a short in-portal notification for the family, e.g. "Updated for Yusuf
Bello: results"). A second child for the same guardian email just needs
a second call with a different `student.admissionNo` — an existing
guardian's email is recognised and the new child is linked to their
account automatically. `student.status` accepts `active` (default),
`graduated`, `withdrawn`, or `suspended` — non-active students still show
in the portal (families can still see a graduated child's final records)
but carry a visible status badge.

This is intentionally a raw API, not a friendly form — building an actual
admin UI (with its own login tier for staff) is real future work, listed
in `digital-campus-roadmap.md`.

## Family Adhkār tracking

The dashboard's "Family Adhkār" card (`adhkar_completions` table,
`/api/portal/adhkar`) lets a signed-in guardian mark the household's
Morning/Evening Adhkār as recited for the day and see a day-streak,
7/30/90-day activity windows, and a small set of computed (not stored)
achievement badges — 3/7/30-day consistency, 100 morning/evening
completions, a 90-cumulative-day "Scholar" badge, and a "Family Adhkār
Excellence" badge for 30 days where both periods were completed. No
extra setup is needed — the table is created by the same `setup.js` run
covered above, and the badges are computed from it on every request, not
a separate table. There is no separate student login in this schema, so
tracking is at the guardian/household level, not per individual child;
see `pages/adhkar.html` (the public Adhkar Centre, now a full Islamic
Spiritual Life app — categories, a Smart Tasbih Counter with prescribed
counts, Arabic TTS, session dashboard, quick 2/5/10-minute modes) for
the actual content this links to.

## Hifz snapshot on the guardian dashboard

If a linked child is recorded as a Qur'an College student (see
`student-portal.md`), their card on the guardian dashboard now also
shows a small Hifz snapshot — current stage (of the school's published
5-stage Hifz Journey) and how many of the 30 Juz' are verified. This is
a summary only; the full per-Juz' grid, Muhaffiz notes, and Ijazah
register are on the student's own dashboard once they have a Student
Portal login.

## Login audit log

Every login attempt (success, failure, or lockout) now writes a row to
a shared `auth_audit_log` table, covering both guardians and students.
See `student-portal.md` for what this does and doesn't cover — it's a
real, small audit trail, not a claim of MFA or SSO readiness.

## Password reset — staff-mediated by design, not a self-service link

There is deliberately **no public "forgot password" endpoint**. A public
endpoint that emails a reset link would need a real transactional email
service (its own signup/API key, same pattern as the Anthropic key or
the database) — and without one, the only place left to put the reset
link is directly in the API response to whoever submitted the request.
That would mean anyone who knows a parent's email address could reset
their password and log in as them. So instead: a parent who's locked out
contacts the school (the same WhatsApp/email already shown on the login
page), and a staff member holding `PORTAL_ADMIN_TOKEN` runs:

```
curl -X POST https://<your-domain>/api/portal/admin/reset-password \
  -H "x-admin-token: <the PORTAL_ADMIN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{ "email": "parent@example.com" }'
```

This returns a fresh `resetLink` (valid 24 hours) for staff to send the
parent directly — the same `/portal/set-password/` page used for first
activation. It also clears any lockout on the account. When a real email
service is added later, this is the natural place to wire up automatic
sending — see `digital-campus-roadmap.md`.

## Login protection

Five wrong password attempts locks an account for 15 minutes
(`failed_attempts`/`locked_until` on the guardian record) — a basic but
real defense against password-guessing on the public login endpoint.
There's no CAPTCHA or distributed rate limiting (that would need a
service like Upstash or Cloudflare KV, the same category of future work as
the assistant's abuse protection) — fine for this phase's expected traffic,
worth revisiting if the portal ever sees suspicious volume.

## Multi-factor authentication (email OTP)

Every guardian login now requires a second step after the password: a
6-digit code emailed via the Resend integration (see
`functions/_lib/otp.js`, `functions/api/portal/verify-otp.js`). No
session cookie is issued until the code is confirmed. The code expires
after 10 minutes, allows 5 wrong attempts before the login has to
restart, and is stored hashed (not plaintext) — only the opaque
`loginToken` that ties the two requests together is stored in the
clear, the same convention this codebase already uses for
activation/reset tokens (high entropy, short-lived, no reason to hash
a value nobody can guess anyway).

This applies unconditionally to guardians, since email is already a
mandatory field at registration. The same OTP mechanism protects
Student and Staff Portal logins too (see `docs/student-portal.md` and
`docs/staff-identity-architecture.md`), but only activates per-account
once an email is on file for that student/staff member — neither table
had an email column before this change.

OTP does not repeat on every login: a signed "trusted device" cookie
skips it for 7 days of active use on the same browser, and is revoked
automatically on a password change. New account registration also now
blocks dashboard content (not just the admissions-application action)
until the email is verified. See
`docs/identity-authentication-roadmap.md` for the full risk-based model
— what's real, what's roadmap (passkeys, magic links), and why.

## Data protection — read this before entering real students

This system holds children's names, attendance, academic results, and
family financial data. The Nigeria Data Protection Act 2023 applies
directly to processing this kind of data about minors. Before real
students go in:
- Decide who at the school is accountable for this data (a Data
  Protection Officer role, even informally).
- Make sure parents/guardians have given informed consent for their
  child's data to be stored this way — a line in the admission paperwork
  or a separate consent form both work; what matters is that it happens
  before entry, not after.
- Have a plan for what happens to a student's record when they graduate
  or leave (a retention/deletion policy) — this doesn't need to be
  complicated, but it needs to exist.

## Costs

Cloudflare Pages (hosting + Functions) and Neon (Postgres) both have free
tiers sufficient for a small pilot; Neon's free tier costs scale with
storage and compute as real usage grows — check current pricing at
[neon.tech/pricing](https://neon.tech/pricing) before scaling this to the
whole school. There is no other new cost from this phase (no SMS/WhatsApp
API, no payment gateway — those come with later phases, see the roadmap
doc).

## Testing note

This sandbox has no internet egress, so the live database calls could
not be exercised end-to-end from here — the UI (login form, dashboard
rendering, error states) was verified against a mocked API response. Once
you complete the setup above, sign in with the demo account and confirm
you see the sample student's data before entering any real records.
