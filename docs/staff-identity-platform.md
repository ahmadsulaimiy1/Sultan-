# SHRS Identity & Access Platform — Setup & Usage

Companion to `docs/staff-identity-architecture.md` (read that first for
the *why* — the HR-vs-directory distinction, the permission engine
design, the delegation/audit rationale). This document is the *how*:
environment variables, setup steps, and curl examples, in the same style
as `parent-portal.md`, `student-portal.md`, and `announcements-system.md`.

## Setup

1. **Add one new environment variable**: `PORTAL_SYSADMIN_TOKEN` — any
   long random string, held by the narrowest possible group (ideally one
   person, per the Matrix's own Manage Users guidance). Separate from
   every other portal token.

2. **Redeploy**, then **re-run the setup endpoint** (safe to run again —
   every statement is additive):
   ```
   curl -X POST https://<your-domain>/api/portal/setup \
     -H "x-setup-token: <the PORTAL_SETUP_TOKEN you set>"
   ```
   This creates the Staff Identity tables and seeds real, already-public
   reference data only: the four institutions, the one real campus, the
   16 roles from `role-permission-matrix.md` §3, and four real offices
   (Board of Governors, Registrar's Office, Finance Office, ICT Office).
   **No `staff` rows are auto-created** — see below.

## Onboarding the real Management Team

These curl calls use names already public on `/about/governance/` —
nothing here is invented. Run once per person, in this order (Principals
before anyone who reports to them, if you want `reportsToStaffNo` to
resolve correctly on first pass — otherwise call `create-staff` again
later to backfill it).

```
curl -X POST https://<your-domain>/api/portal/admin/staff \
  -H "x-sysadmin-token: <token>" -H "content-type: application/json" \
  -d '{
    "action": "create-staff", "staffNo": "SHR-STF-0001",
    "fullName": "Zakariya Olanrewaju Anofi", "positionTitle": "Head of Schools / Administrator",
    "dateJoined": "2017-12-01"
  }'

curl -X POST https://<your-domain>/api/portal/admin/staff \
  -H "x-sysadmin-token: <token>" -H "content-type: application/json" \
  -d '{
    "action": "create-staff", "staffNo": "SHR-STF-0002",
    "fullName": "Dr. Adegoke Musa Olatunji", "positionTitle": "Principal, Royal College",
    "institutionName": "Royal College", "reportsToStaffNo": "SHR-STF-0001"
  }'

curl -X POST https://<your-domain>/api/portal/admin/staff \
  -H "x-sysadmin-token: <token>" -H "content-type: application/json" \
  -d '{
    "action": "create-staff", "staffNo": "SHR-STF-0003",
    "fullName": "Mrs. Anofi-Abdulkareem Mariam Tope", "positionTitle": "Registrar",
    "officeName": "Registrar'\''s Office", "reportsToStaffNo": "SHR-STF-0001"
  }'
```

Repeat the pattern for the remaining named Management Team members (Shaykh Ahmad
Ibrahim — Principal, Qur'an College; Shaykh Abubakr Solah — Principal,
School of Islamic and Arabic Studies; Mrs. Kareemat Abdurazaq — Head
Teacher, Basic School; Mr. Oguntade Adebola Aliu — ICT Head, office
`ICT Office`; Mr. Oladele Abdulwasiu Adebayo — Head, Research &
Development).

## Granting roles

A `create-staff` call alone gives someone a directory record, not any
permission — that's a separate, explicit act:

```
curl -X POST https://<your-domain>/api/portal/admin/staff \
  -H "x-sysadmin-token: <token>" -H "content-type: application/json" \
  -d '{
    "action": "grant-role", "staffNo": "SHR-STF-0003", "roleCode": "REG",
    "grantedByStaffNo": "SHR-STF-0001", "reason": "Registrar appointment per GV-01/AC-02"
  }'

curl -X POST https://<your-domain>/api/portal/admin/staff \
  -H "x-sysadmin-token: <token>" -H "content-type: application/json" \
  -d '{
    "action": "grant-role", "staffNo": "SHR-STF-0002", "roleCode": "PRIN",
    "institutionName": "Royal College", "grantedByStaffNo": "SHR-STF-0001"
  }'
```

`roleCode` must already exist in the `roles` reference table (seeded
from `role-permission-matrix.md` §3 by setup — EXE, PRIN, VP, REG, AREG,
ADM, FIN, TCH, MUH, ARB, QC-OFF, SA, BRD, ICT, SYSADMIN, DSL). Revoke
with `{"action": "revoke-role", "staffRoleId": <id>, "reason": "..."}`.

## Issuing a staff login

Same admin-mediated model as guardians/students — staff never choose
their own password:

```
curl -X POST https://<your-domain>/api/portal/admin/staff \
  -H "x-sysadmin-token: <token>" -H "content-type: application/json" \
  -d '{"action": "create-login", "staffNo": "SHR-STF-0003"}'
```
Returns `{ "activationLink": "/portal/staff/set-password/?token=..." }`
— relay this to the staff member (WhatsApp/email), same as every other
activation link in this project.

## Creating a delegation (self-service, once signed in)

Unlike everything above, this is **not** token-gated — it uses the
delegator's own staff session, since it should be attributable to the
actual person delegating, not to a bearer token. A signed-in Registrar
going on 14 days' leave:

```
curl -X POST https://<your-domain>/api/portal/staff/delegations \
  -H "content-type: application/json" -b "shr_staff_session=<their session cookie>" \
  -d '{
    "action": "create", "delegateStaffNo": "SHR-STF-0099",
    "roleCode": "REG", "reason": "Annual leave, 3-17 August",
    "endsAt": "2026-08-17T23:59:00Z"
  }'
```
Fails with 403 if the caller doesn't currently hold `REG` themselves —
you can only delegate authority you actually have.

## Testing note

Same limitation as every other portal doc in this project: this sandbox
has no internet egress, so live database calls could not be exercised
end-to-end from here. The login/identity pages were verified locally
with Playwright driving real Chromium against a mocked
`GET /api/portal/staff/me` response — covering a staff member with
multiple roles, an active delegation held, a delegation given, and the
zero-roles empty state — not against a real Neon database. Once you
complete the setup above, sign in with a real activated staff account
and confirm the identity record renders correctly before relying on it.
