# SHRS Information Security Policy

**Status:** DRAFT v0.1 — not yet adopted.
**Owner (proposed):** ICT Head (Mr. Oguntade Adebola Aliu).
**Review cycle:** Annual.
**Depends on:** Data Protection & Privacy Policy (Phase A);
`docs/parent-portal-audit.md` (the real technical implementation this
policy governs at the governance level, without re-deriving it).

> **Before this governs a real decision:** the technical controls
> described below are drawn directly from what the Parent Portal
> actually implements today, verified against `docs/parent-portal-
> audit.md` and the codebase, not invented for this policy. Anywhere
> this policy proposes something not yet implemented, it says so
> explicitly.

---

## 1. Purpose

To state, as governance rather than implementation detail, what
security standard SHRS's digital systems must meet — giving the
technical work already done in the Parent Portal (password hashing,
timing-safe comparisons, login lockout) a policy layer above it, so
future systems are held to the same standard rather than each developer
deciding security posture independently.

## 2. Scope

The Parent Portal, the website's AI assistant backend, and any future
digital system (Student Portal, Staff Portal) operating under the SHRS
name.

## 3. Definitions

- **Authentication** — verifying a user is who they claim to be (a
  guardian's login).
- **Authorisation** — verifying a user may access the specific data
  they're requesting (a guardian seeing only their own linked
  children).
- **Credential** — a password, session token, or API key.

## 4. Principles

1. Passwords are never stored in a recoverable form — the Parent
   Portal already uses scrypt-based hashing (`lib/session.js`), not
   invented here but formally required going forward for any new
   system.
2. Security-sensitive comparisons (tokens, credentials) use constant-
   time comparison to prevent timing attacks — already implemented
   (`timingSafeEqualString`) after being identified as a real gap
   during the Parent Portal audit; required for any future system by
   the same standard.
3. Repeated failed authentication attempts are throttled — already
   implemented (5-attempt lockout, 15 minutes) in the Portal's login
   flow; required for any future authenticated system.
4. No credential is exposed in a public API response — e.g. the
   Portal's staff-mediated password reset returns an activation link
   only to an admin-token-gated endpoint, never a public one (Parent
   Portal audit, "naive public forgot-password" finding).

## 5. Responsibilities

| Role | Responsibility |
|---|---|
| ICT Head | Owns this policy; implements and verifies technical controls; first point of contact for a suspected security incident. |
| Any developer extending SHRS's digital systems | Applies the same standards (hashing, timing-safe comparison, rate limiting) to new authentication surfaces, rather than each building security ad hoc. |

## 6. Technical controls (current state, verified against implementation)

- Password hashing: scrypt (`lib/session.js`).
- Token comparison: constant-time (`timingSafeEqualString`), covering
  setup tokens, admin tokens, and password-reset tokens.
- Account lockout: 5 failed attempts → 15-minute lock
  (`guardians.failed_attempts`, `locked_until`).
- Password strength: minimum length enforced (`isPasswordStrongEnough`,
  `MIN_PASSWORD_LENGTH`), NIST-aligned length-over-complexity approach.
- Admin functions gated by a separate admin token, distinct from a
  guardian's session cookie.
- Platform-level protection: Vercel Deployment Protection (SSO) on
  preview deployments — noted here as an existing operational control,
  not something this policy needs to configure.

## 7. Gaps not yet closed (named, not hidden)

- No formal incident-response runbook exists yet (an Incident Response
  Policy is evaluated, not drafted, in the Technology Governance
  Framework).
- `@vercel/postgres` (the Parent Portal's database driver) is officially
  deprecated by Vercel in favour of Neon's native SDK — flagged in the
  Parent Portal audit as low-urgency migration work, still open.
- No real production database or Anthropic API key has been
  provisioned yet — meaning the Parent Portal and AI assistant remain
  functionally inert in production until the school completes that
  setup (`docs/parent-portal.md`, `docs/digital-assistant.md`). This
  policy governs the system's design, which is sound; it does not
  change the fact that the system isn't live with real data yet.

## 8. Monitoring & compliance

ICT Head reviews the technical controls in Section 6 against the
Parent Portal audit annually, and immediately after any new
authentication surface is added to any SHRS digital system.

## 9. Appeals

Not generally applicable; a technical dispute about implementation is
resolved by the ICT Head, escalating to the CEO if unresolved.

## 10. Exceptions

None defined.

## 11. Review cycle

Annual, or immediately after any security incident or new system
launch.

## 12. Version control

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | Draft | Initial draft from Governance Master Register, Phase C | Drafted per SHRS governance directive; not yet reviewed or adopted |
