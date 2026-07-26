# SHRS Identity Migration Register v1.0

Every component in this project still dependent on a bearer token,
a hard-coded permission bypass, or a direct admin action, listed with
its target authentication method and a real effort/risk estimate. The
objective this register serves: every action in the system attributable
to a real institutional identity, not a shared secret.

**Method note:** "Current: bearer token" below always means a single
shared secret compared via `timingSafeEqualString`, read from one
environment variable, held by whoever was given it — not a
per-request-attributable login. "Target: staff session + Permission
Engine" means `readStaffSessionFromRequest` (already built, already
used by every Teacher/Registrar/Finance endpoint) resolving to a real
`staff.id`, checked against `hasPermissionFor()`.

| # | Component | Current auth | Target auth | Migration complexity | Dependencies | Est. effort | Risk |
|---|---|---|---|---|---|---|---|
| 1 | Founder Dashboard (`founder/dashboard.js`) | `PORTAL_FOUNDER_TOKEN` bearer | Staff session + `EXE` role, `hasPermissionFor` against the grant already defined at `permission-matrix.js:142` | **Low** — the grant already exists; this is a rewrite of one file's auth check, not a new permission design. | At least one real `staff` row with `staff_roles.role_code = 'EXE'` and a working login (via `admin/staff.js`). | Small (single-file endpoint rewrite + one real staff onboarding) | Low — read-only aggregate endpoint; worst case of a bug is a display error, not a data-integrity issue. |
| 2 | `/api/portal/setup` | `PORTAL_SETUP_TOKEN` bearer | **No realistic target — keep as bearer.** This endpoint runs *before* any staff account can exist (it creates the tables staff accounts live in). A chicken-and-egg problem no identity system can resolve. | N/A | N/A | N/A | Low, provided the token is rotated after initial setup and never reused across environments (see the Account Creation Playbook). |
| 3 | `admin/students.js`, `admin/staff.js`, `admin/announcements.js`, `admin/reset-password.js`, `admin/create-student-login.js` | `PORTAL_ADMIN_TOKEN` / `PORTAL_SYSADMIN_TOKEN` bearer | Staff session + a real `SYSADMIN`-tier role, once real ICT/Registrar staff accounts exist | **Medium** — these are legitimately bootstrap/back-office actions (creating the *first* students, the *first* staff). A real identity-gated version still needs a bootstrap path for the very first SYSADMIN account, which reintroduces the same chicken-and-egg problem as #2 at a smaller scale. | A real SYSADMIN-tier staff account, itself needing to be created by *something* — recommend keeping one narrowly-held bearer token specifically for first-SYSADMIN-account creation, then migrating everything else. | Medium (several endpoints, careful sequencing to avoid a lockout) | Medium — getting the bootstrap sequencing wrong could lock out legitimate admin access; test the full sequence in staging (see Playbook) before touching production. |
| 4 | `admin/hifz-progress.js` | `PORTAL_QURAN_TOKEN` bearer | Staff session + `MUH`/`QC-OFF` role, institution-scoped to Qur'an College | **Low-Medium** — the Permission Engine already has a `hifz_records` system area; wiring this endpoint to it is analogous to #1. | Real Muhaffiz/Qur'an College Officer staff accounts. | Small–Medium | Low-Medium — Hifz/Ijazah data is permanent-record-sensitive (IQ-02), so migrate carefully, but the blast radius of a bug is one institution's data, not system-wide. |
| 5 | Delegation System (`staff/delegations.js`) | Staff session (already identity-based) | No migration needed | None | None | None | None — already correctly built. |
| 6 | Teacher/Registrar/Finance staff endpoints | Staff session + Permission Engine (already identity-based) | No migration needed | None | None | None | None — already correctly built; this is the pattern everything above should converge toward. |
| 7 | Guardian/Student self-service endpoints | Guardian/Student session (already identity-based) | No migration needed | None | None | None | None — already correctly built. |

## Hard-coded permission bypasses

One is worth naming explicitly, distinct from the bearer-token list
above: `docs/role-permission-matrix.md`'s own note that **EXE's
`student_records` grant is "aggregate only (no individual PII)"** is
enforced *in code* today (`registrar/student.js` checks
`/aggregate/i.test(grant.scope)` and refuses if it doesn't match) —
this is a positive example, not a gap: a qualifier from the governance
document is actually enforced, not just documented. No other Permission
Engine grant in this codebase currently has an equivalent code-level
qualifier check; a full pass confirming every grant's stated scope
(institution-scoped, own-class-only, aggregate-only, etc.) is actually
enforced — not just checked for role membership — is recommended as
future work, tracked here rather than assumed complete.

## Sequencing recommendation

Migrate in the order listed above (#1 → #4), because each one's
complexity depends on the previous one's real staff account existing.
#1 (Founder Dashboard) can start immediately once one real EXE staff
account is created via the existing `admin/staff.js` sequence — it does
not need #3's harder bootstrap problem solved first.
