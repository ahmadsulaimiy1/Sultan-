# SHRS Identity & Authentication Roadmap

## Why this document exists

A directive asked for the Identity Platform to be elevated toward a
risk-based, modern authentication model — comparable in spirit to
banking/enterprise identity systems, with OTP-on-every-login named
explicitly as the wrong target ("Security must feel intelligent,
modern, professional... not annoying, repetitive, obstructive").

That critique is correct and the request is answered honestly here,
the same way every other "go big" directive in this engagement has
been handled: a real, working, scoped slice ships now; the rest is
named as roadmap with the actual reason it isn't built tonight, not
silently dropped and not fabricated as done.

## The 5-level model, and what's real today

| Level | Description | Status |
|---|---|---|
| 1 | Email/Admission-No/Staff-ID + Password | **Real.** scrypt-hashed, salted, lockout after 5 failed attempts. Existed before this session. |
| 2 | + Email OTP (6-digit code, 10-minute expiry, 5 attempts) | **Real.** All three logins (guardian/student/staff). Guardians unconditionally; students/staff once ICT enters an email for that person. See `docs/parent-portal.md`'s MFA section. |
| 3 | + Risk-based trusted device (skip OTP on a recognised browser within 7 days; forced back to OTP otherwise) | **Real, in a scoped form** — see below. |
| 4 | Passkeys (WebAuthn/FIDO2 — Face ID, Touch ID, Windows Hello, Android biometric, hardware keys) | **Not built.** Named as the credible long-term default, per the directive's own framing. |
| 5 | Fully passwordless (magic links, or passkey-only accounts) | **Not built.** Roadmap. |

## Level 3 — what "trusted device" actually means here

Implemented as a signed, HttpOnly cookie (`shr_trust_guardian` /
`shr_trust_student` / `shr_trust_staff`, mirroring the existing session
cookie pattern in `functions/_lib/session.js`) issued the moment a
login completes OTP successfully (or, for student/staff accounts with
no email on file yet, the moment password verification succeeds — see
`student/login.js`/`staff/login.js`). Payload: `{ actorId,
trustVersion, exp }`, 7-day expiry, HMAC-signed with the same
`SESSION_SECRET` as every other cookie in this system.

At the next login, if that cookie is present, unexpired, and its
`trustVersion` still matches the account's current `trust_version`
column, the OTP step is skipped entirely and a session is issued
directly. The cookie is **reissued** on every trusted login, so the
7-day window slides forward with actual use — an active parent is
never interrupted, and 7+ days of inactivity naturally expires it and
brings back the OTP step. This is exactly "first login / new device or
browser / 7+ days inactive → OTP; otherwise frictionless" from the
directive, implemented with one mechanism.

**Revocation on a security event:** `trust_version` starts at 1 and is
incremented on password change or reset (`set-password.js`,
`change-password.js`, `staff/set-password.js`,
`student/set-password.js`). A stateless signed cookie can't otherwise
be invalidated server-side (the same limitation already documented for
session cookies) — bumping the version column is what makes every
previously-issued trusted-device cookie fail its check on the very
next login attempt, forcing a fresh OTP. This is a real, working
"security event revokes trust" control, not just a documented gap.

**What this is NOT**, named explicitly so it isn't mistaken for more
than it is:
- **Not device fingerprinting.** No canvas/WebGL/font/behavioral
  fingerprinting runs anywhere. "New device" is inferred purely from
  cookie absence (cleared cookies, different browser, different
  device all look the same: no cookie → OTP required). This is
  actually how most consumer "remember this device" features work
  under the hood, whatever their marketing copy implies.
- **Not a device registry.** There's no "your trusted devices" list a
  user can view and individually revoke, and no self-service "sign out
  all other devices." One cookie, one browser, no admin/self-service
  UI over it. A real registry needs its own table (device label, last
  seen, IP/UA snapshot) and a management UI in both the guardian
  dashboard and staff identity pages — scoped future work.
- **Not risk scoring.** No IP-geolocation anomaly detection, no
  "suspicious location" or "suspicious device" heuristics, no
  administrator-settable "always require OTP for this high-risk
  account" flag. All three need either a geo-IP data source (with real
  false-positive tuning) or a new admin-facing control that doesn't
  exist yet.

## Level 4/5 — Passkeys, magic links: why not tonight

**Passkeys (WebAuthn/FIDO2).** A real implementation needs: a
credential-storage schema (public key, credential ID, sign counter per
account per device), the registration ceremony (browser
`navigator.credentials.create()`, attestation handling) and the
authentication ceremony (`navigator.credentials.get()`, challenge
verification) on both the Cloudflare Pages Function side and three
frontend login flows, careful fallback UX for browsers/devices without
platform authenticator support, and testing against real hardware
(Face ID, Windows Hello, a physical security key) that doesn't exist
in this sandbox. This is a self-contained feature on the scale of the
email-OTP work just shipped — not a settings toggle — and deserves its
own dedicated build-and-test session rather than being bolted onto
tonight's changes without real device testing.

**Magic-link passwordless sign-in.** Technically closer (the
verification-link mechanism in `functions/_lib/email.js` already proves
the pattern works), but it's a distinct login mode with its own UX
decision to make first: does it replace passwords entirely, coexist as
an alternative, or replace them only for guardians? That's a product
decision worth its own confirmation, not something to silently bolt
onto three existing login pages.

Both remain the stated long-term target — this document exists so that
target is tracked, not forgotten, and so nobody mistakes "not built
yet" for "was considered and rejected."

## Related documents

- `docs/parent-portal.md` — MFA mechanics from the guardian side.
- `docs/student-portal.md` — student-specific OTP gating (no email on
  file yet = unaffected).
- `docs/staff-identity-architecture.md` §7a — staff-specific OTP
  gating.
- `docs/shrs-infrastructure-activation-register.md` — MFA infrastructure
  status entry.
