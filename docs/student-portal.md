# Student Portal (Pilot) + Qur'an College Hifz & Ijazah Tracker

This is Phase 2 of the "Digital Campus" ambition — the honest next real
module after the Parent Portal (see `parent-portal.md` for that phase and
`digital-campus-roadmap.md` for why a full School Information System /
LMS is genuinely multi-phase work, not something built in one pass).

It adds a **second, independent authenticated role** — students, not
just guardians — plus the one part of the wider "Digital Campus"
ambition with real, already-published institutional grounding rather
than generic LMS ambition: the Qur'an College's own 5-stage Hifz Journey
(public `/academics/quran-college/` page), the Muhaffiz/Muhaffizah role
and per-Juz' assessment model, and the permanent Ijazah register (both
described in the draft `IQ-01` Hifz Regulations and `IQ-02` Ijazah
Governance Framework policies).

**What this phase deliberately does NOT include** — named plainly, not
silently skipped: a full LMS (courses, modules, lessons, assessments,
certificates, content authoring, video/PDF/slide hosting, discussion
boards, learning analytics); Teacher/Principal/Administrator/Admissions/
Finance logins; MFA or SSO (no real provider chosen for either — nothing
here claims to be "MFA-ready," because nothing gates on it); payment
integration; Arabic translation or Personalisation Centre wiring for the
portal (a pre-existing gap across the whole Parent + Student Portal, not
new to this phase); and IQ-02 §7.5's public third-party Ijazah
verification endpoint (a different, non-portal access-control model —
separate future work). "Assignments," "upcoming deadlines," and
"announcements" on the student dashboard show an honest empty state,
not fabricated placeholder data, because no course system exists yet to
generate real ones.

## Dual / multi-programme enrolment

A student can belong to more than one class at once — e.g. a Royal
College SS2 student who is also enrolled in Qur'an College and/or
Arabic & Islamic Studies. `student_classes` is the authoritative
enrolment record (each student's primary class from `admin/students.js`
is mirrored there with `is_primary = true`); both the guardian and
student dashboards render every enrolment as a chip, and the Hifz panel
triggers off *any* Qur'an College enrolment, not just the primary one.

To enrol a student in additional programmes beyond their primary class,
add `additionalPrograms` to the existing `admin/students` call:

```
curl -X POST https://<your-domain>/api/portal/admin/students \
  -H "x-admin-token: <the PORTAL_ADMIN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{
    "guardian": { "fullName": "...", "email": "parent@example.com" },
    "student": {
      "fullName": "...", "admissionNo": "SHR-2026-020",
      "institution": "Royal College", "className": "SS2",
      "additionalPrograms": [
        { "institution": "Qur'\''an College", "className": "Hifz Year 3" },
        { "institution": "Arabic & Islamic Studies", "className": "Thanawiyyah 1" }
      ]
    }
  }'
```

This is purely additive — re-calling the endpoint never removes an
existing enrolment, only adds or refreshes the ones named in that
request, same as how attendance/results/fees already behave.

## Setup

This shares the same Cloudflare Pages + Neon database as the Parent
Portal — if you've already completed `parent-portal.md`'s setup, you
only need the two new pieces below.

1. **Add one new environment variable**: `PORTAL_QURAN_TOKEN` — any long
   random string you choose, separate from `PORTAL_ADMIN_TOKEN`. This
   protects the endpoint used to enter Hifz progress and Ijazah records.
   Keep it held by a narrower group than the general admin token —
   Qur'an College staff entering memorisation/Tajweed data is a
   different trust boundary than whoever enters fees or attendance for
   the whole school.

2. **Redeploy**, then **re-run the setup endpoint** (safe to run again —
   every statement is additive):
   ```
   curl -X POST https://<your-domain>/api/portal/setup \
     -H "x-setup-token: <the PORTAL_SETUP_TOKEN you set>"
   ```
   This creates the six new tables (`student_accounts`, `hifz_progress`,
   `hifz_enrolment`, `ijazah_register`, `auth_audit_log`,
   `student_classes`) and, if `PORTAL_DEMO_PASSWORD` is set, also
   creates a second Sample Institutional Record child — `SHR-2026-902`
   ("Fatima Sani Bello"), a Qur'an College student (dual-enrolled in
   Arabic & Islamic Studies too, to demonstrate multi-programme support)
   with sample Hifz progress and a working Student Portal login —
   alongside the existing `SHR-2026-901` sample child, both linked to
   the same sample guardian and both flagged `is_sample_data = true` so
   they never appear in a real Founder Dashboard count.

3. **Try it.** Guardian side: sign in at `/portal/login/` with the
   sample guardian and you'll now see a Hifz snapshot on the
   `SHR-2026-902` child's card. Student side: go to
   `/portal/student/login/` and sign in with admission number
   `SHR-2026-902` and the same `PORTAL_DEMO_PASSWORD` — you should see
   the full per-Juz' progress grid, current stage, and
   attendance/results/fees for that student. (`SHR-2026-901` has no
   student login yet — issue one with the curl command below if you
   want to try a non-Qur'an-College student's dashboard, which correctly
   omits the Hifz section entirely.)

## Consent chain

Same principle as the guardian flow: staff never choose or see a
student's password. A student's login only comes into existence when
staff (holding `PORTAL_ADMIN_TOKEN`) explicitly issue one — see below —
and the activation link is relayed directly to the student (or, for
younger students, however the school judges appropriate — e.g. via a
form tutor or the linked guardian), the same way a guardian's activation
link is relayed via WhatsApp/email today. There is no self-service
"create your own student account" path.

## Issuing a student login

The student record must already exist (via the existing
`/api/portal/admin/students` endpoint — see `parent-portal.md`) before a
login can be issued for it:

```
curl -X POST https://<your-domain>/api/portal/admin/create-student-login \
  -H "x-admin-token: <the PORTAL_ADMIN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{ "admissionNo": "SHR-2026-001" }'
```

The response includes an `activationLink` (e.g.
`/portal/student/set-password/?token=...`) — share that with the
student. Calling this again for an already-activated student issues a
fresh activation link (useful if the first one expired or was lost) and
clears any lockout, exactly like `admin/reset-password.js` does for
guardians.

## Entering Hifz progress, stage, and Ijazah records

**Migrated (docs/identity-migration-plan.md, Phase D item #4):** a
signed-in staff session with the Qur'an College Officer (`QC-OFF`) or
Principal (`PRIN`) role is now the primary way to call this endpoint,
checked per-action against the Permission Engine — QC-OFF can enter
progress, advance the stage, and grant an Ijazah; only PRIN can revoke
one. `PORTAL_QURAN_TOKEN` remains a fallback, not `PORTAL_ADMIN_TOKEN`,
for as long as no real QC-OFF/PRIN account exists in a reachable
environment — the curl examples below still use it since that's what
this sandbox can exercise. Only accepts data for students recorded as
Qur'an College (via `institution` on their class) — this is checked
server-side regardless of auth method, so a fat-fingered admission
number can't silently attach Hifz rows to the wrong student. Send only
the parts that changed:

```
curl -X POST https://<your-domain>/api/portal/admin/hifz-progress \
  -H "x-quran-token: <the PORTAL_QURAN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{
    "admissionNo": "SHR-2026-014",
    "progress": [
      { "juzNumber": 5, "status": "verified", "murajaahNote": "Weekly check passed.", "tajweedNote": "Confirmed.", "muhaffizName": "Ustadh ...", "assessedAt": "2026-07-20" }
    ],
    "stage": { "stageNumber": 2 }
  }'
```

Granting an Ijazah is a separate, explicit action — once granted, the
`grantedDate`/`examiningScholars`/`certifiedScope` fields are immutable
(per `IQ-02` §7.6: the register is permanent, "never deleted, only
annotated"); only a later revocation can be recorded against it:

```
curl -X POST https://<your-domain>/api/portal/admin/hifz-progress \
  -H "x-quran-token: <the PORTAL_QURAN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{
    "admissionNo": "SHR-2026-014",
    "ijazah": {
      "action": "grant",
      "grantedDate": "2026-07-20",
      "examiningScholars": "Shaykh ...",
      "certifiedScope": "Full memorisation, 30 Juz’",
      "referenceNo": "SHRS-IJZ-2026-014"
    }
  }'
```

```
curl -X POST https://<your-domain>/api/portal/admin/hifz-progress \
  -H "x-quran-token: <the PORTAL_QURAN_TOKEN you set>" \
  -H "content-type: application/json" \
  -d '{ "admissionNo": "SHR-2026-014", "ijazah": { "action": "revoke", "referenceNo": "SHRS-IJZ-2026-014", "revocationNote": "..." } }'
```

The stage numbers (1–5) match the school's own published Hifz Journey:
1 Memorisation & Muraja'ah, 2 Progression Through the 30 Juz', 3
Completion Standard, 4 Ijazah Examination, 5 Ijazah Granted. Assessment
fields (`murajaahNote`, `tajweedNote`) are deliberately free text, not a
numeric score — the school hasn't published a graded rubric for this yet
(a "Tajweed Assessment Policy, IQ-04" is referenced in the draft
governance docs as not yet drafted); don't invent one client-side.

## Session model — what's the same, what's new

Students hold a completely separate session cookie
(`shr_student_session`) from guardians (`shr_portal_session`) — the two
can coexist in the same browser without conflict, and nothing about the
existing guardian login changed shape to make this work. Two limitations
already true of the guardian portal are worth restating now that the
login surface has doubled:

- **No CSRF token exists on any portal endpoint** (guardian or student)
  today — protection relies on `SameSite=Lax` cookies only. Real, but
  not new to this phase.
- **Sessions are stateless HMAC tokens, not server-side sessions.**
  "Sign Out" only clears the browser's copy of the cookie; a captured
  token stays valid until its 7-day expiry even after a password change.
  Also real, also not new.

**Status-gating is new and student-specific.** A guardian's login never
checks a linked child's `status` — correct, since a parent should still
see a graduated child's final records. A student logging in as
*themselves* is different: `suspended` and `withdrawn` are blocked
outright at login (generic "This account is currently restricted"
message), while `active` and `graduated` can sign in — so a graduate can
still view their own transcript and Ijazah entry, matching `IQ-02`'s
"verifiable years later" intent. This default is a real school-policy
call, not something fixed in stone — revisit if it doesn't match how the
school actually wants to treat withdrawn students.

## Multi-factor authentication (email OTP)

Password-verified student logins go through a second step — a 6-digit
code emailed to the student — before a session cookie is issued, using
the same `login_otp_codes`/`verify-otp.js` mechanism as the guardian
and staff portals (see `docs/parent-portal.md`'s MFA section for the
mechanics). The gating condition here is specific to students: the
`students` table had no email column at all until this change, so OTP
only activates once ICT enters an email for a given student (via
`admin/students.js`'s optional `student.email` field). Until then,
that student's login is unchanged — password only, exactly as before.

## Audit log

Every login attempt (guardian and student) now writes a row to
`auth_audit_log` — `login_success`, `login_failed`, `lockout`, or
`password_activated`, with the actor type and (where known) id. This is
a real, small answer to "audit logging" — it is not MFA or SSO, and
nothing in this codebase claims otherwise. There's no admin view for
this table yet (query it directly against the database); building a
reviewable audit UI is real future work if/when it's needed.

## Testing note

Same limitation as `parent-portal.md`: this sandbox has no internet
egress, so live database calls could not be exercised end-to-end from
here. The UI (login forms, dashboard rendering, the Juz' grid, error
states) was verified locally against a mocked API response using
Playwright driving real Chromium — not against a real Neon database.
Once you complete the setup above, sign in with the demo accounts
described in the Setup section and confirm you see real, correctly
scoped data before issuing any real student's login.
