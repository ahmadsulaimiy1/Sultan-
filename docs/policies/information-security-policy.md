# Policy IT-01 — Information Security Policy

*Retrofitted to the full 13-section governance architecture and
substantially deepened, per the Tier 1 retrofit directive. Every
technical control and gap disclosure from v1.0 is preserved — none
weakened, removed, or quietly marked resolved without real
verification. New in v2.0: least-privilege access control, vulnerability
and dependency management, a baseline incident-response procedure
(pending the dedicated Incident Response Policy), and logging/
monitoring requirements.*

## 1. Policy Information

| Field | Value |
|---|---|
| Policy Code | IT-01 |
| Policy Title | Information Security Policy |
| Version | 2.0 (retrofitted from v1.0, Phase C) |
| Effective Date | Not yet effective — pending Board adoption |
| Policy Owner | ICT Head (Mr. Oguntade Adebola Aliu) |
| Approval Authority | CEO |
| Review Cycle | Annual |
| Next Review Date | Not yet set — to be fixed upon adoption |

> **Before this governs a real decision:** the technical controls
> described below are drawn directly from what the Parent Portal
> actually implements today, verified against `docs/parent-portal-
> audit.md` and the codebase, not invented for this policy. Anywhere
> this policy proposes something not yet implemented, it says so
> explicitly.

---

## 2. Purpose

To state, as governance rather than implementation detail, what
security standard SHRS's digital systems must meet — giving the
technical work already done in the Parent Portal (password hashing,
timing-safe comparisons, login lockout) a policy layer above it, so
future systems are held to the same standard rather than each developer
deciding security posture independently.

## 3. Scope

The Parent Portal, the website's AI assistant backend, and any future
digital system (Student Portal, Staff Portal) operating under the SHRS
name.

## 4. Definitions

- **Authentication** — verifying a user is who they claim to be (a
  guardian's login).
- **Authorisation** — verifying a user may access the specific data
  they're requesting (a guardian seeing only their own linked
  children).
- **Credential** — a password, session token, or API key.
- **Least privilege** — granting a user or system only the access
  necessary for its function, no more.
- **Dependency** — a third-party software package (e.g.
  `@vercel/postgres`) SHRS's systems rely on, which can itself carry
  vulnerabilities or be deprecated by its maintainer.

## 5. Policy Statement

Passwords are never stored in a recoverable form — the Parent Portal
already uses scrypt-based hashing (`lib/session.js`), not invented here
but formally required going forward for any new system. Security-
sensitive comparisons (tokens, credentials) use constant-time
comparison to prevent timing attacks — already implemented
(`timingSafeEqualString`) after being identified as a real gap during
the Parent Portal audit; required for any future system by the same
standard. Repeated failed authentication attempts are throttled —
already implemented (5-attempt lockout, 15 minutes) in the Portal's
login flow; required for any future authenticated system. No credential
is exposed in a public API response — e.g. the Portal's staff-mediated
password reset returns an activation link only to an admin-token-gated
endpoint, never a public one (Parent Portal audit, "naive public
forgot-password" finding). Every system and role is granted least
privilege by default, not broad access narrowed down after the fact.

## 6. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| ICT Head | Owns this policy; implements and verifies technical controls; first point of contact for a suspected security incident; maintains the dependency list (Section 7.3). |
| Any developer extending SHRS's digital systems | Applies the same standards (hashing, timing-safe comparison, rate limiting, least privilege) to new authentication surfaces, rather than each building security ad hoc. |
| Data Protection Owner *(Data Protection & Privacy Policy, IT-02)* | Coordinates with the ICT Head where a security control also has a data-protection dimension (e.g. a breach affecting personal data). |

## 7. Procedures

### 7.1 Technical controls (current state, verified against implementation)
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

### 7.2 Access control and least privilege
- A guardian's session grants access only to their own linked
  children's data — enforced in the Portal's access-control logic
  (Data Protection & Privacy Policy, IT-02, §5).
- Admin endpoints require a separate admin token; no guardian session
  can reach an admin endpoint regardless of the guardian's own
  permissions.
- **A future Student Portal or Staff Portal must define its own
  least-privilege access model before launch** — this policy states the
  principle; it does not pre-design a system that doesn't exist yet.

### 7.3 Vulnerability and dependency management
- `@vercel/postgres` (the Parent Portal's database driver) is
  officially deprecated by Vercel in favour of Neon's native SDK —
  flagged in the Parent Portal audit as low-urgency migration work,
  still open. This is the concrete example this section's requirement
  is written around: the ICT Head maintains awareness of dependency
  deprecation/vulnerability notices for every package SHRS's systems
  rely on, not just at the time of initial build.
- **No formal dependency-scanning process exists yet** — this section
  states the requirement; implementing an automated scan is an
  operational task for the ICT Head, not something this policy performs
  itself.

### 7.4 Incident response (baseline, pending the dedicated policy)
- A suspected security incident (unauthorised access, credential
  compromise, a vulnerability actively being exploited) is reported to
  the ICT Head immediately, who assesses scope and, where personal data
  is affected, coordinates with the Data Protection Owner under the
  Data Protection & Privacy Policy's (IT-02) §7.4 breach-response
  procedure.
- **This is a baseline, not a full incident-response runbook** — the
  dedicated Incident Response Policy (Governance Master Register,
  Technology & Digital Campus, recommended next by the Technology
  Governance Framework) will define severity classification, a formal
  containment/eradication/recovery procedure, and post-incident review
  in full; until it exists, this baseline is what governs.

### 7.5 Logging and monitoring
- Failed login attempts and account lockouts are already logged via
  the Portal's `failed_attempts`/`locked_until` fields — this is
  existing implementation, not a new requirement.
- **Broader security logging (admin actions, data access patterns)
  is not yet formalised** — a requirement this section states for
  future development, not a claim that comprehensive logging already
  exists today.

### 7.6 Gaps not yet closed (named, not hidden)
- No formal incident-response runbook exists yet (Section 7.4's
  baseline applies until the dedicated Incident Response Policy is
  drafted).
- `@vercel/postgres` migration to Neon's native SDK remains open
  (Section 7.3).
- No real production database or Anthropic API key has been
  provisioned yet — meaning the Parent Portal and AI assistant remain
  functionally inert in production until the school completes that
  setup (`docs/parent-portal.md`, `docs/digital-assistant.md`). This
  policy governs the system's design, which is sound; it does not
  change the fact that the system isn't live with real data yet.

## 8. Monitoring and Compliance

ICT Head reviews the technical controls in Section 7.1 against the
Parent Portal audit annually, and immediately after any new
authentication surface is added to any SHRS digital system.

## 9. Records and Documentation

Security-relevant logs (login lockouts, admin token usage) and any
incident report (Section 7.4) are retained per the Records Retention
Policy (IT-04) — a specific retention period for security logs
specifically is not yet set and should be added at that policy's next
review.

## 10. Related Policies

Data Protection & Privacy Policy (IT-02), Acceptable Use Policy (IT-03,
which cross-references this policy's technical controls at §7.1),
Records Retention Policy (IT-04), Technology Governance Framework
(which recommends the Incident Response Policy this document's §7.4
stands in for today).

## 11. Exceptions

None defined.

## 12. Appeals and Complaints

Not generally applicable; a technical dispute about implementation is
resolved by the ICT Head, escalating to the CEO if unresolved.

## 13. Review and Amendment

Annual, or immediately after any security incident or new system
launch.

## Version control

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | Draft | Initial draft, Phase C | Drafted per SHRS governance directive; not yet reviewed or adopted |
| 2.0 | Draft | Retrofitted to the full 13-section architecture, Phase F Tier 1 retrofit — added least-privilege access control, vulnerability/dependency management, a baseline incident-response procedure, and logging/monitoring requirements | Not yet reviewed or adopted |
