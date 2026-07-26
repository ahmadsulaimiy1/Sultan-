# SHRS Executive Identity Design v1.0

**Design only, per the directive that produced this document — no code
changes are made here.**

The Master Deployment Directive correctly identified that Executive
Identity does not yet exist as a real, individually-accountable account
type. This document designs the fix — and identifies that the fix is
**smaller than it looks**, because the Permission Engine already
anticipated it and was simply never wired up to the one endpoint that
needed it.

## 1. The actual gap, precisely stated

`functions/_lib/permission-matrix.js` already contains an `EXE` role
with real, specific grants — including, verbatim, at line 142:

```
{ role: 'EXE', permissions: ['V'], scope: 'all institutions, aggregate (Founder Dashboard, live)' }
```

This means the Role & Permission Matrix's own design **already models
the Founder Dashboard as something an authenticated EXE-role staff
member views**, exactly the "no shared bearer tokens, every executive
action attributable to a named identity" principle this directive asks
for.

But `functions/api/portal/founder/dashboard.js`, as actually built,
does not check this grant at all. It authenticates with a single shared
secret (`PORTAL_FOUNDER_TOKEN`) compared via `timingSafeEqualString` —
**bypassing the staff session system and the Permission Engine
entirely.** Whoever holds that one string can view the dashboard;
nothing distinguishes the CEO from anyone else who was handed the
token, and nothing is logged about *which* holder used it on a given
request.

So: **the design for Executive Identity already exists.** The gap is a
single endpoint that was built against a bearer token instead of the
identity system that was designed to serve it. The same applies, by
extension, to the other roles the directive names.

## 2. Design: Executive identities as real staff accounts, not a new system

No new identity system should be built. `staff` + `staff_accounts` +
`staff_roles` + `staff_institutions` — the system already proven for
Teachers and Registrar's Office staff — already supports everything an
executive identity needs:

| Directive's requested identity | Maps to | Status |
|---|---|---|
| Founder Identity | `staff` row with `staff_roles.role_code = 'EXE'`, `institution_id = NULL` (all institutions) | Role exists (`EXE`, established, real named individual per GV-01). No real `staff` row exists for this person yet. |
| CEO Identity | Same as Founder — GV-01 does not separate these into two roles (see `docs/role-permission-matrix.md` §0's explicit correction on this point). | Not a separate identity to design. |
| Principal Identity | `staff` row with `staff_roles.role_code = 'PRIN'`, `institution_id` = that Principal's institution | Role exists (established, per-institution). No real `staff` rows exist yet. |
| Vice Principal Identity | `staff_roles.role_code = 'VP'` | Role exists but is **proposed**, not established — `docs/role-permission-matrix.md` marks it "Not yet documented." A real VP identity should wait for the Board to formally adopt the role, same discipline already applied to every other proposed role in this project. |
| Registrar Identity | `staff_roles.role_code = 'REG'` | Role exists (established, real named individual per AC-02/PA-05). No real `staff` row exists yet — the Registrar's Office has only ever been exercised with test staff accounts in this engagement. |

**No shared bearer tokens** in this design: every executive/principal/
registrar action is a request from a signed-in `shr_staff_session`
cookie, resolved to a specific `staff.id`, checked against that
person's real `staff_roles`/`staff_institutions` rows by the Permission
Engine — identical to how Teacher and Registrar's Office access already
work. Nothing new to invent; only real people need to be onboarded
through the existing `admin/staff.js` sequence
(`create-staff` → `create-login` → `grant-role`).

## 3. What changes when this is implemented (future work, not done here)

1. `founder/dashboard.js` is rewritten to authenticate via
   `readStaffSessionFromRequest` (already exists, used by every other
   staff endpoint) instead of `PORTAL_FOUNDER_TOKEN`, and to call
   `hasPermissionFor(sql, session.staffId, 'X', null)` against whatever
   permission key the Matrix assigns the Founder Dashboard's aggregate
   view (line 142's grant already names the scope: "all institutions,
   aggregate").
2. `PORTAL_FOUNDER_TOKEN` is retired as an auth mechanism once at least
   one real EXE staff account exists and is confirmed working — not
   before, to avoid locking out the only current access path
   prematurely.
3. `auth_audit_log`/`staff_audit_log` then records *which specific
   staff member* viewed the dashboard on each request, closing the
   accountability gap the directive named. This is the concrete meaning
   of "every executive action must be attributable to a named
   institutional identity" — an audit-log row with a real `staff_id`,
   not a boolean "the token was correct."
4. The same pattern applies to any future Principal- or Registrar-only
   view that today might be tempted to reuse a bearer token instead of
   a staff session + Permission Engine check — this design should be
   read as the standing rule for all of them, not a one-off fix.

## 4. What this design does not do

It does not create a sixth identity type, a new table, or a parallel
session system. It does not claim any of this has been implemented —
per the governing terminology policy, this document's status is
**Designed**, nothing more, until the code changes in §3 are actually
written, tested locally, and merged.
