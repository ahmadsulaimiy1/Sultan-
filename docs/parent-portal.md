# Parent Portal (Pilot) — what it is and how to turn it on

This is Phase 1 of the "Digital Campus" ambition, scoped honestly: a real,
database-backed Parent Portal where a guardian logs in and sees their own
child's attendance, term results, and fee status. Nothing else from the
original brief (student/teacher portals, ID cards, exams, Qur'an tracking,
finance module, etc.) is built yet — see `digital-campus-roadmap.md` for
why, and for what a fuller build would need.

It is a genuinely separate system from the rest of the site: real
database, real login, real session cookies. It is **not functional at all**
until you complete the setup below — every piece fails with a clear,
honest error message rather than pretending to work.

## Setup steps

1. **Create a database.** In your Vercel project dashboard → *Storage* →
   *Create Database* → choose **Postgres** (this provisions a Neon
   Postgres database and automatically adds `POSTGRES_URL` and related
   environment variables to your project — you don't need to copy
   anything by hand).

2. **Add three more environment variables**, under *Settings* →
   *Environment Variables*:
   - `SESSION_SECRET` — any long random string (e.g. generate one with
     `openssl rand -hex 32` on any computer, or ask a developer to). This
     signs login sessions; treat it like a password.
   - `PORTAL_SETUP_TOKEN` — any long random string you choose. This
     protects the one-time database setup endpoint so a stranger can't
     trigger it.
   - `PORTAL_ADMIN_TOKEN` — a different long random string. This protects
     the endpoint used to enter real student records.
   - Optional: `PORTAL_DEMO_PASSWORD` — if set, the setup step below also
     creates one demo guardian (`demo@shroyalschools.ng`) with one sample
     student, clearly labelled "sample data" everywhere it appears, so you
     can see the portal working end-to-end before any real family is
     entered. Leave it unset to skip this.

3. **Redeploy** so the new environment variables take effect.

4. **Run the one-time database setup.** Send one request (from any
   computer, or ask a developer to — this is a single command, not
   something that needs to be repeated):
   ```
   curl -X POST https://<your-domain>/api/portal/setup \
     -H "x-setup-token: <the PORTAL_SETUP_TOKEN you set>"
   ```
   This creates the database tables (safe to run again later — it won't
   duplicate anything) and, if `PORTAL_DEMO_PASSWORD` is set, creates the
   demo login.

5. **Try it.** Go to `/portal/login/` and sign in with
   `demo@shroyalschools.ng` and whatever you set `PORTAL_DEMO_PASSWORD`
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
    "guardian": { "fullName": "...", "email": "parent@example.com", "password": "..." },
    "student": { "fullName": "...", "admissionNo": "SHR-2026-001", "institution": "Royal College", "className": "JSS 1" },
    "attendance": { "term": "First Term 2025/2026", "daysPresent": 58, "daysTotal": 62 },
    "results": [
      { "term": "First Term 2025/2026", "subject": "Mathematics", "caScore": 34, "examScore": 52, "teacherComment": "Good progress." }
    ],
    "fees": { "term": "First Term 2025/2026", "amountDue": 150000, "amountPaid": 100000 }
  }'
```

Calling it again with the same `admissionNo` updates that student's
record rather than duplicating it — safe to re-run as results/attendance/
fees change through the term. A second child for the same guardian email
just needs a second call with a different `student.admissionNo` — an
existing guardian's email is recognised and the new child is linked to
their account without needing the password again.

This is intentionally a raw API, not a friendly form — building an actual
admin UI (with its own login tier for staff) is real future work, listed
in `digital-campus-roadmap.md`.

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

Vercel Postgres (Neon) has a free tier sufficient for a small pilot; costs
scale with storage and compute as real usage grows — check current
pricing on the Vercel dashboard before scaling this to the whole school.
There is no other new cost from this phase (no SMS/WhatsApp API, no
payment gateway — those come with later phases, see the roadmap doc).

## Testing note

This sandbox has no internet egress, so the live database calls could
not be exercised end-to-end from here — the UI (login form, dashboard
rendering, error states) was verified against a mocked API response. Once
you complete the setup above, sign in with the demo account and confirm
you see the sample student's data before entering any real records.
