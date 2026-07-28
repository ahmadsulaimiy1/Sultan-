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

## Verification UX: dual method, full email, password usability

A follow-up directive asked for institutional-grade verification UX
(never force a single method, show the full email address, no
exceptions on password show/hide). Shipped the same night:

- **Dual verification method, every time.** A registration/resend
  verification email now contains BOTH a one-click link and a typed
  6-digit code (`verification_code_hash`/`verification_code_attempts`
  on `guardians`, new `verify-by-code.js` endpoint, a code-entry
  fallback added to `/portal/verify/`). A login OTP email now contains
  BOTH the 6-digit code and a one-click "Verify & Sign In" link (new
  `verify-login-link.js` GET endpoint, reusing the same
  `login_otp_codes` row `verify-otp.js` already uses — whichever method
  is used first wins, the row is consumed once). Exhausting one
  method's attempts never strands the other: a spent code still leaves
  the link valid, and vice versa.
- **Full email addresses, no masking.** Every place that used to show
  `a***@domain` now shows the real address in full. The reasoning:
  every place this appears in this codebase, the user already typed
  that exact email into a form seconds earlier (registration, login,
  the account's own signed-in resend-verification) — there is no
  scenario here where displaying it back reveals anything the user
  didn't already know, so masking added confusion without adding
  privacy. `maskEmail()` was removed rather than kept as dead code.
- **Password show/hide, everywhere, no exceptions.** One universal
  script (`js/portal-password-toggle.js`) wraps every `input[type=
  password]` site-wide — registration, all three logins, all three
  set-password pages, the founder/setup token fields, and the
  Personalisation Centre's change-password fields (added to the DOM
  after the panel opens, hence a `MutationObserver`, not a one-time
  scan). One script tag, no per-field JS wiring needed anywhere.
- **Live password strength meter.** `js/portal-password-strength.js`
  attaches to any field carrying `data-password-strength` — every
  "new password" field (registration, all three set-password pages,
  Personalisation's newPassword), deliberately NOT login's "type your
  existing password" fields, since strength only means something when
  choosing a new one. Checks the same five criteria the directive
  named (12+ chars, upper, lower, number, special) and labels
  Very Weak → Very Strong.
- **Password-manager compatibility.** Every password field already
  carried correct `autocomplete="new-password"` /
  `"current-password"` values from earlier work; this pass added the
  same to the two Personalisation Centre fields, which were missing
  them (plain `<input>`, no attribute) — the reason a password manager
  couldn't previously distinguish "log me in" from "here's a new one"
  on that specific form.

Not attempted here, and not silently implied by any of the above:
richer email **design** (illustrations, multi-column layouts) beyond
clear branding/structure — a graphic-design task, not a code task.

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
